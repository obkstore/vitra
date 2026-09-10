/**
 * Server-side AI provider gateway. API keys must never use VITE_* variables.
 */
import {
	buildSystemPrompt,
	buildUserPrompt,
	validateAIResponse,
	validatePlanAgainstProfile,
} from "../src/utils/promptBuilder.js";
import { authenticateRequest } from "./middleware/authMiddleware.js";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_OUTPUT_TOKENS = 4000;
const MAX_BODY_BYTES = 64 * 1024;
const UPSTREAM_TIMEOUT_MS = 55_000;

function sendError(res, statusCode, message) {
	res.status(statusCode).json({ ok: false, error: { message, statusCode } });
}

function getProviderConfig() {
	return {
		provider: "gemini",
		apiKey: process.env.GEMINI_API_KEY,
		model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
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
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

	try {
		const url = `${GEMINI_API_URL}/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
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

		const upstream = await fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify(requestBody),
			signal: controller.signal,
		});
		const data = await upstream.json();

		if (!upstream.ok) {
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
	} finally {
		clearTimeout(timeout);
	}
}

export default async function handler(req, res) {
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

		res.status(200).json({ ok: true, data: validation.data });
	} catch (error) {
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
