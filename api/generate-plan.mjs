/**
 * Server-side AI provider gateway. API keys must never use VITE_* variables.
 */
import {
	buildSemanticRetryNote,
	buildSystemPrompt,
	buildUserPrompt,
	validateAIResponse,
	validatePlanAgainstProfile,
} from "../src/utils/promptBuilder.js";
import { getForbiddenTermsForProfile } from "../src/utils/therapeuticGuidance.js";
import { loadTherapeuticGuide } from "./_lib/utils/guideLoader.js";
import { authenticateRequest } from "./_lib/middleware/authMiddleware.js";
import { getCachedPlan, hashPlanRequest, setCachedPlan, shouldPersistCache } from "./_lib/utils/planCache.js";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
// Sizing note (measured Sep 2026): a minimal valid plan serializes to ~17KB,
// and Arabic-heavy JSON tokenizes at ~2-4 bytes/token, so a 4000-token cap cut
// output mid-JSON at ~12,078 chars (finishReason MAX_TOKENS) and every request
// failed parse with a silent 502. 16384 gives ~2x headroom over the measured
// floor; the model supports up to 65k output, so this is safely inside limits.
const MAX_OUTPUT_TOKENS = 16384;
const MAX_BODY_BYTES = 64 * 1024;
// Per-attempt budget: each upstream call gets a fresh AbortController, so a
// slow attempt never steals time from the next retry. AbortError → 504 below.
// Kept generous (45s) because a full 7-day structured plan (up to 4000 output
// tokens) can legitimately take tens of seconds under load — a tight budget
// aborts requests that would have succeeded.
const UPSTREAM_TIMEOUT_MS = 45_000;
// Transient upstream failures (rate-limited / overloaded / internal) fall
// through to the next candidate model after a backoff before surfacing to
// the caller. 429 honors the provider's Retry-After (capped so serverless
// functions are never held past their own timeout); other statuses use a
// flat backoff. Lite fallbacks carry roomier quota, so moving down the
// chain after waiting is the best shot at surviving a burst.
const RETRY_DELAY_MS = 1000;
const RETRYABLE_UPSTREAM_STATUSES = [429, 500, 503];
// Longest we will ever sleep for a 429 Retry-After: serverless platforms
// kill long-lived invocations, so waiting out a 60s quota window inside one
// request is worse than failing fast with a 429 the client can retry.
const MAX_RETRY_AFTER_MS = 15_000;
// Ordered fallback chain: primary first, then cheaper lite models that are
// less likely to be saturated during demand spikes.
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-3.1-flash-lite"];

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parses a Retry-After header (delay-seconds or HTTP date) into milliseconds.
 * @param {unknown} value Raw header value.
 * @returns {number | null} Wait time in ms, or null when absent/unparseable.
 */
function parseRetryAfterMs(value) {
	if (value == null || value === "") return null;
	const seconds = Number(value);
	if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
	const dateMs = Date.parse(String(value));
	if (!Number.isNaN(dateMs)) return Math.max(dateMs - Date.now(), 0);
	return null;
}

// Candidate models for this request: configured primary first, then fallbacks,
// deduplicated so an env override matching a fallback is tried only once.
export function getCandidateModels(config) {
	const seen = new Set();
	return [config?.model || process.env.GEMINI_MODEL || "gemini-2.5-flash-lite", ...FALLBACK_MODELS].filter(
		(model) => typeof model === "string" && model && !seen.has(model) && (seen.add(model), true),
	);
}

function sendError(res, statusCode, message) {
	res.status(statusCode).json({ ok: false, error: { message, statusCode } });
}

export function getProviderConfig() {
	return {
		provider: "gemini",
		apiKey: process.env.GEMINI_API_KEY,
		model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite",
	};
}

function isValidProfile(profile) {
	return (
		Number.isFinite(profile.age) &&
		profile.age >= 10 &&
		profile.age <= 100 &&
		Number.isFinite(profile.weight) &&
		profile.weight >= 20 &&
		profile.weight <= 300 &&
		Number.isFinite(profile.height) &&
		profile.height >= 100 &&
		profile.height <= 250 &&
		(profile.gender === "male" || profile.gender === "female") &&
		Array.isArray(profile.healthConditions) &&
		typeof profile.goal === "string" &&
		profile.foodPreferences &&
		typeof profile.foodPreferences === "object" &&
		typeof profile.foodPreferences.dietType === "string" &&
		typeof profile.activityLevel === "string"
	);
}

async function callProvider(config, systemPrompt, userPrompt) {
	const headers = { "Content-Type": "application/json" };
	const requestBody = {
		systemInstruction: { parts: [{ text: systemPrompt }] },
		contents: [{ role: "user", parts: [{ text: userPrompt }] }],
		generationConfig: {
			maxOutputTokens: MAX_OUTPUT_TOKENS,
			temperature: 0.2,
			responseMimeType: "application/json",
		},
	};
	const models = getCandidateModels(config);

	for (let attempt = 1; attempt <= models.length; attempt++) {
		const model = models[attempt - 1];
		const url = `${GEMINI_API_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
		const startedAt = Date.now();
		try {
			const upstream = await fetch(url, {
				method: "POST",
				headers,
				body: JSON.stringify(requestBody),
				signal: controller.signal,
			});
			const data = await upstream.json();

			if (!upstream.ok) {
				console.error("generate-plan upstream error", {
					attempt,
					model,
					status: upstream.status,
					elapsedMs: Date.now() - startedAt,
					error: data?.error ?? data,
				});
				if (RETRYABLE_UPSTREAM_STATUSES.includes(upstream.status) && attempt < models.length) {
					const backoffMs = upstream.status === 429
						? (parseRetryAfterMs(upstream.headers?.get?.("retry-after")) ?? RETRY_DELAY_MS * attempt)
						: RETRY_DELAY_MS;
					const waitMs = Math.min(Math.max(backoffMs, RETRY_DELAY_MS), MAX_RETRY_AFTER_MS);
					console.log("generate-plan retrying with fallback model", { attempt: attempt + 1, model: models[attempt], status: upstream.status, waitMs });
					await sleep(waitMs);
					continue;
				}
				const error = new Error("خطأ من مزود الذكاء الاصطناعي");
				error.statusCode = upstream.status;
				throw error;
			}

			const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
			const finishReason = data?.candidates?.[0]?.finishReason;
			if (finishReason === "MAX_TOKENS") {
				console.warn("generate-plan output truncated by MAX_TOKENS");
			}
			if (typeof content !== "string" || !content.trim()) {
				const error = new Error("استجابة فارغة من مزود الذكاء الاصطناعي");
				error.statusCode = 502;
				throw error;
			}

			console.log("generate-plan upstream success", {
				attempt,
				model,
				elapsedMs: Date.now() - startedAt,
				finishReason,
				usage: data?.usageMetadata,
			});
			return content;
		} catch (err) {
			// Intentional provider errors already carry statusCode — pass through untouched.
			if (err?.statusCode !== undefined) throw err;
			// Timeout (AbortError), network failure, or unparsable body on this attempt.
			console.error("generate-plan attempt failed", {
				attempt,
				model,
				status: err?.statusCode,
				elapsedMs: Date.now() - startedAt,
				error: err?.message ?? err,
			});
			if (attempt < models.length) {
				console.log("generate-plan retrying with fallback model", { attempt: attempt + 1, model: models[attempt] });
				await sleep(RETRY_DELAY_MS);
				continue;
			}
			if (err?.name === "AbortError") throw err;
			err.statusCode = 502;
			throw err;
		} finally {
			clearTimeout(timeout);
		}
	}
}

export default async function handler(req, res) {
	console.log("generate-plan request received", new Date().toISOString());
	if (req.method !== "POST") {
		sendError(res, 405, "Method not allowed");
		return;
	}

	// Optional auth (deliberately non-blocking): guests keep working, and
	// quota-abuse posture is unchanged. The check lives INSIDE the handler
	// — not in the Express chain — because Vercel invokes this file's
	// default export directly and bypasses app.js middleware entirely.
	// Attach the identity when a valid Bearer token is present so future
	// per-user persistence can trust req.user instead of client input.
	req.user = authenticateRequest(req) ?? undefined;

	const config = getProviderConfig();
	if (!config.apiKey) {
		sendError(
			res,
			500,
			"مفتاح GEMINI_API_KEY غير معرّف على الخادم",
		);
		return;
	}

	let body;
	try {
		body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});
	} catch {
		sendError(res, 400, "بيانات الطلب غير صالحة");
		return;
	}

	if (Buffer.byteLength(JSON.stringify(body), "utf8") > MAX_BODY_BYTES) {
		sendError(res, 413, "حجم الطلب أكبر من الحد المسموح");
		return;
	}

	const { userProfile, nutritionSummary } = body;
	if (!userProfile || typeof userProfile !== "object" || Array.isArray(userProfile) || !isValidProfile(userProfile)) {
		sendError(res, 400, "بيانات الملف الشخصي خارج الحدود أو غير مكتملة");
		return;
	}

	// Fingerprinted cache (P1): identical inputs deterministically yield the
	// requester's own plan, so a hit skips the billed Gemini call entirely.
	// Fail-open by design — lookup/write failures fall through to generation.
	const cacheKey = hashPlanRequest({ userProfile, nutritionSummary, model: config.model });
	const cached = await getCachedPlan(cacheKey);
	if (cached) {
		res.status(200).json({ ok: true, data: cached, cached: true });
		return;
	}

	try {
		// Fail-open: a missing/unreadable guide logs a warning inside the
		// loader and yields "" so generation proceeds on hardcoded guidance.
		const { text: guideText, source: guideSource } = loadTherapeuticGuide();
		console.log("generate-plan therapeutic guide", {
			source: guideSource,
			chars: guideText.length,
			injected: guideText.length > 0,
		});
		const content = await callProvider(config, buildSystemPrompt(), buildUserPrompt(userProfile, nutritionSummary, guideText));
		let validation = validateAIResponse(content);
		if (!validation.isValid || !validation.data) {
			// Never log the full plan: length + tail are enough to distinguish
			// a mid-JSON cutoff (truncation) from a non-JSON wrapper.
			console.error("generate-plan validation failed", {
				contentLength: typeof content === "string" ? content.length : 0,
				head: String(content ?? "").slice(0, 200),
				tail: String(content ?? "").slice(-200),
				error: validation.error,
			});
			sendError(res, 502, validation.error ?? "استجابة غير صالحة من مزود الذكاء الاصطناعي");
			return;
		}

		const resolvedTerms = getForbiddenTermsForProfile(userProfile);
		console.log("generate-plan resolved restrictions:", {
			dietType: userProfile?.foodPreferences?.dietType,
			allergies: userProfile?.foodPreferences?.allergies,
			forbiddenFoods: userProfile?.foodPreferences?.forbiddenFoods,
			healthConditions: userProfile?.healthConditions,
			prohibitedTerms: resolvedTerms,
		});
		let semanticValidation = validatePlanAgainstProfile(validation.data, userProfile);
		// Single repair attempt: regeneration is capped at ONE retry to bound
		// quota cost. Only offending-term rejections qualify — structural
		// failures without a term surface immediately as today.
		if (!semanticValidation.isValid && semanticValidation.offendingTerm) {
			console.log("generate-plan semantic retry", {
				offendingTerm: semanticValidation.offendingTerm,
				dietType: userProfile?.foodPreferences?.dietType,
			});
			const retryContent = await callProvider(
				config,
				buildSystemPrompt(),
				buildUserPrompt(userProfile, nutritionSummary, guideText) +
					buildSemanticRetryNote(userProfile, semanticValidation.offendingTerm),
			);
			const retryValidation = validateAIResponse(retryContent);
			if (retryValidation.isValid) {
				validation = retryValidation;
				semanticValidation = validatePlanAgainstProfile(validation.data, userProfile);
			} else {
				console.error("generate-plan semantic retry unparseable", {
					contentLength: typeof retryContent === "string" ? retryContent.length : 0,
					tail: String(retryContent ?? "").slice(-200),
					error: retryValidation.error,
				});
			}
		}
		if (!semanticValidation.isValid) {
			console.error("generate-plan semantic rejection", {
				error: semanticValidation.error,
				offendingTerm: semanticValidation.offendingTerm,
				dietType: userProfile?.foodPreferences?.dietType,
			});
			sendError(res, 502, semanticValidation.error ?? "تم رفض الخطة لمخالفتها القيود العلاجية");
			return;
		}

		// Guests read but never write: no MongoDB trace without a JWT.
		if (shouldPersistCache(req)) {
			await setCachedPlan(cacheKey, validation.data);
		}
		res.status(200).json({ ok: true, data: validation.data, cached: false });
	} catch (error) {
		console.error("generate-plan provider call failed", {
			message: error?.message,
			code: error?.code ?? error?.cause?.code,
			name: error?.name,
			statusCode: error?.statusCode,
		});
		const statusCode = error?.name === "AbortError"
			? 504
			: error?.statusCode === 429
				? 429
				: 502;
		const message = error?.name === "AbortError"
			? "انتهت مهلة مزود الذكاء الاصطناعي"
			: "تعذر توليد الخطة من مزود الذكاء الاصطناعي";
		sendError(res, statusCode, message);
	}
}
