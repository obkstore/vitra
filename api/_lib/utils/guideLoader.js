/**
 * Server-only loader for the therapeutic diet guide markdown.
 *
 * Must stay under api/ (never src/): src/ files are bundled by Vite for the
 * browser, where node:fs does not exist. api/ runs on Node only (local
 * Express, Railway, Vercel serverless), so fs is safe here.
 *
 * The guide filename is Arabic with possible invisible RTL marks, so it is
 * located by scanning directories for "*.md containing marker text" instead
 * of hardcoding the exact literal. Fail-open by design: a missing or
 * unreadable file logs a warning and yields empty text so plan generation
 * proceeds on the hardcoded JS guidance alone.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Stable substring of the guide filename, free of RTL control characters.
const GUIDE_MARKER = "الأنظمة الغذائية العلاجية";

/** @type {{ text: string, source: string } | undefined} Cached guide (read once). */
let cached;

/**
 * Searches candidate root directories for the guide markdown.
 * @returns {string | null} Absolute file path, or null when not found.
 */
function findGuideFile() {
	const candidates = [];
	try {
		if (typeof process?.cwd === "function") candidates.push(process.cwd());
	} catch {
		// Non-Node runtime: no cwd available.
	}
	try {
		const here = path.dirname(fileURLToPath(import.meta.url));
		// api/_lib/utils -> repo root, plus api/ as a deployment-layout fallback.
		candidates.push(path.join(here, "..", "..", ".."), path.join(here, "..", ".."));
	} catch {
		// import.meta.url unavailable: cwd candidates only.
	}
	for (const dir of candidates) {
		let entries;
		try {
			entries = readdirSync(dir);
		} catch {
			continue;
		}
		const match = entries.find((name) => name.endsWith(".md") && name.includes(GUIDE_MARKER));
		if (match) return path.join(dir, match);
	}
	return null;
}

/**
 * Loads the therapeutic guide text (cached after first call).
 * @returns {{ text: string, source: string }} Guide body ("" when missing) and source path or miss reason.
 */
export function loadTherapeuticGuide() {
	if (cached) return cached;
	const file = findGuideFile();
	if (!file) {
		console.warn("guideLoader: therapeutic guide .md not found, proceeding without it");
		cached = { text: "", source: "missing" };
		return cached;
	}
	try {
		const text = readFileSync(file, "utf8").trim();
		if (!text) {
			console.warn("guideLoader: therapeutic guide .md is empty, proceeding without it", { source: file });
			cached = { text: "", source: "empty" };
			return cached;
		}
		cached = { text, source: file };
		return cached;
	} catch (err) {
		console.warn("guideLoader: failed to read therapeutic guide, proceeding without it", {
			source: file,
			error: err?.message ?? err,
		});
		cached = { text: "", source: "unreadable" };
		return cached;
	}
}

/**
 * Clears the cached guide. Test-only hook.
 * @returns {void}
 */
export function _resetGuideCacheForTests() {
	cached = undefined;
}
