/**
 * Server-side AI provider gateway. API keys must never use VITE_* variables.
 */
import {
	buildSystemPrompt,
	buildUserPrompt,
	validateAIResponse,
	validatePlanAgainstProfile,
} from "../src/utils/promptBuilder.js";
import { authenticateRequest } from "./_lib/middleware/authMiddleware.js";
import { getCachedPlan, hashPlanRequest, setCachedPlan, shouldPersistCache } from "./_lib/utils/planCache.js";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_OUTPUT_TOKENS = 4000;
const MAX_BODY_BYTES = 64 * 1024;
// Fail fast per attempt: each upstream call gets a fresh AbortController, so a
// slow attempt never steals time from the next retry. AbortError → 504 below.
const UPSTREAM_TIMEOUT_MS = 15_000;
// Transient upstream failures (overloaded / internal) are retried once after
// a short backoff before surfacing to the caller.
const RETRY_DELAY_MS = 1000;
const RETRYABLE_UPSTREAM_STATUSES = [500, 503];
// Ordered fallback chain: primary first, then cheaper lite models that are
// less likely to be saturated during demand spikes.
const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Candidate models for this request: configured primary first, then fallbacks,
// deduplicated so an env override matching a fallback is tried only once.
function getCandidateModels(config) {
	const seen = new Set();
	return [config?.model || process.env.GEMINI_MODEL || "gemini-3.5-flash", ...FALLBACK_MODELS].filter(
		(model) => typeof model === "string" && model && !seen.has(model) && (seen.add(model), true),
	);
}

function sendError(res, statusCode, message) {
	res.status(statusCode).json({ ok: false, error: { message, statusCode } });
}

function getProviderConfig() {
	return {
		provider: "gemini",
		apiKey: process.env.GEMINI_API_KEY,
		model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
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
			temperature: 0.7,
			responseMimeType: "application/json",
		},
	};
	const models = getCandidateModels(config);

	for (let attempt = 1; attempt <= models.length; attempt++) {
		const model = models[attempt - 1];
		const url = `${GEMINI_API_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
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
					error: data?.error ?? data,
				});
				if (RETRYABLE_UPSTREAM_STATUSES.includes(upstream.status) && attempt < models.length) {
					console.log("generate-plan retrying with fallback model", { attempt: attempt + 1, model: models[attempt] });
					await sleep(RETRY_DELAY_MS);
					continue;
				}
				const error = new Error("خطأ من مزود الذكاء الاصطناعي");
				error.statusCode = upstream.status;
				throw error;
			}

			const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
			if (typeof content !== "string" || !content.trim()) {
				const error = new Error("استجابة فارغة من مزود الذكاء الاصطناعي");
				error.statusCode = 502;
				throw error;
			}

			return content;
		} catch (err) {
			// Intentional provider errors already carry statusCode — pass through untouched.
			if (err?.statusCode !== undefined) throw err;
			// Timeout (AbortError), network failure, or unparsable body on this attempt.
			console.error("generate-plan attempt failed", {
				attempt,
				model,
				status: err?.statusCode,
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
		const content = await callProvider(config, buildSystemPrompt(), buildUserPrompt(userProfile, nutritionSummary));
		const validation = validateAIResponse(content);
		if (!validation.isValid || !validation.data) {
			sendError(res, 502, validation.error ?? "استجابة غير صالحة من مزود الذكاء الاصطناعي");
			return;
		}

		const semanticValidation = validatePlanAgainstProfile(validation.data, userProfile);
		if (!semanticValidation.isValid) {
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
