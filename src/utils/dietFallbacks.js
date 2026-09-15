/**
 * Deterministic diet-violation fallbacks: auto-sanitize layer.
 *
 * Pure string substitution — no AI call, so it is instant and cannot fail
 * from a bad model response. The caller re-runs validatePlanAgainstProfile()
 * once on the sanitized clone; if it passes, the sanitized plan is served.
 *
 * Substitutes were reviewed for cultural/medical sense (Sep 2026):
 * - Vegan fish uses lentils+flaxseed (Syria-accessible), NOT algae.
 * - Vegetarian meat/fish uses boiled egg / grilled halloumi (regional staples).
 * - Keto substitutes NEVER contain the banned substring itself (validator is
 *   plain includes(), so "أرز القرنبيط" or "خبز اللوز" would re-fail).
 * - Generic fallback is mixed seasonal vegetables (safe across all diets).
 */

import { getForbiddenTermsForProfile } from "./therapeuticGuidance.js";

/** Safe across every diet; used for arbitrary allergy/custom terms. */
export const GENERIC_SUBSTITUTE = "خضار موسمية مشكلة";

/**
 * Last-resort neutral wording when even the generic substitute collides
 * with a forbidden term (e.g. user allergic to "خضار" itself).
 */
export const ULTIMATE_SAFE_SUBSTITUTE = "مكوّن آمن بديل";

/**
 * Vegan map: every DIET_GUIDANCE.vegan forbiddenKeyword → safe substitute.
 * Each substitute is verified to pass textContainsForbiddenTerm() for a
 * vegan profile (plant-milk forms rely on the existing VEGAN_REGEX mask).
 */
export const VEGAN_SUBSTITUTIONS = {
	"لحم": "بروتين نباتي (توفو متبّل)",
	"دجاج": "قطع الصويا مع الخضار",
	"سمك": "عدس مع بذور الكتان",
	"بيض": "خليط بذور الكتان",
	"حليب": "حليب الشوفان",
	"لبن": "مشروب الشوفان النباتي المخمّر",
	"زبادي": "زبادي الصويا",
	"جبن": "جبن نباتي (توفو)",
	"سمن": "زيت الزيتون",
};

/**
 * Vegetarian map: meat/fish only (dairy+egg stay). Regional staples —
 * boiled egg / grilled halloumi — preferred over tofu for non-vegans.
 */
export const VEGETARIAN_SUBSTITUTIONS = {
	"لحم": "جبنة حلوم مشوية",
	"دجاج": "بيض مسلوق",
	"سمك": "بيض مسلوق",
	"تونة": "جبنة حلوم مشوية",
	"سلمون": "جبنة حلوم مشوية",
};

/**
 * Keto map: each forbiddenKeyword → low-carb substitute that does NOT
 * contain the banned substring (see module note about includes() traps).
 * Recipes must likewise say "شرائح الليمون", never "عصير ليمون".
 */
export const KETO_SUBSTITUTIONS = {
	"أرز": "قرنبيط مبشور مطهو",
	"خبز": "أقراص بذور الكتان واللوز",
	"مكرونة": "نودلز الكوسا بزيت الزيتون",
	"معكرونة": "نودلز الكوسا بزيت الزيتون",
	"باستا": "نودلز الكوسا بزيت الزيتون",
	"بطاطا": "قرنبيط مشوي",
	"بطاطس": "قرنبيط مشوي",
	"سكر": "رشة ستيفيا",
	"حلويات": "مكعبات الكاكاو الخام مع ستيفيا",
	"عصير": "ماء مع شرائح الليمون والنعناع",
};

/**
 * Condition-term map for DIET_GUIDANCE-adjacent clinical bans
 * (diabetes / hypertension / heart / hyperthyroidism). Anything without an
 * explicit entry falls back to GENERIC_SUBSTITUTE.
 */
export const CONDITION_SUBSTITUTIONS = {
	"مشروب محلى": "ماء مع شرائح الليمون",
	"مشروبات محلاة": "ماء مع شرائح الليمون",
	"مشروبات الطاقة": "ماء مع شرائح الليمون",
	"شوكولاتة محلاة": "مكسرات غير مملحة",
	"حلويات": "مكسرات غير مملحة",
	"كيك": "مكسرات غير مملحة",
	"بسكويت": "مكسرات غير مملحة",
	"لانشون": "بروتين طازج",
	"نقانق": "بروتين طازج",
	"مرتديلا": "بروتين طازج",
	"لحوم مصنعة": "بروتين طازج",
	"معلبات": "خضار طازجة مشوية",
	"شيبس": "خضار طازجة مشوية",
	"وجبات سريعة": "خضار طازجة مشوية",
	"مقالي": "خضار مشوية بزيت الزيتون",
	"دهون متحولة": "زيت الزيتون",
};

const DIET_MAPS = {
	vegan: VEGAN_SUBSTITUTIONS,
	vegetarian: VEGETARIAN_SUBSTITUTIONS,
	keto: KETO_SUBSTITUTIONS,
};

/**
 * Builds the term → substitute map for a specific profile: diet map first,
 * then condition map, then the generic substitute for any remaining
 * forbidden term (allergies / custom forbiddenFoods / unmapped conditions).
 * @param {import("./therapeuticGuidance.js").UserProfile | any} userProfile
 * @returns {Record<string, string>}
 */
export function getSubstitutionMapForProfile(userProfile) {
	const dietType = userProfile?.foodPreferences?.dietType;
	const dietMap = DIET_MAPS[dietType] ?? {};
	const forbiddenTerms = getForbiddenTermsForProfile(userProfile);
	const map = {};
	for (const term of forbiddenTerms) {
		if (!term) continue;
		if (dietMap[term]) {
			map[term] = dietMap[term];
		} else if (CONDITION_SUBSTITUTIONS[term]) {
			map[term] = CONDITION_SUBSTITUTIONS[term];
		} else {
			// Generic must not itself contain the forbidden term; if it
			// does (e.g. allergy to "خضار"), use the ultimate neutral.
			map[term] = String(GENERIC_SUBSTITUTE).includes(term) || String(term).includes(GENERIC_SUBSTITUTE)
				? ULTIMATE_SAFE_SUBSTITUTE
				: GENERIC_SUBSTITUTE;
		}
	}
	return map;
}

/**
 * Replaces a literal substring everywhere (no regex escaping hazards).
 * @param {string} text
 * @param {string} term
 * @param {string} substitute
 * @returns {{ text: string, count: number }}
 */
function replaceAllLiteral(text, term, substitute) {
	if (!term) return { text, count: 0 };
	const parts = String(text).split(term);
	if (parts.length <= 1) return { text, count: 0 };
	return { text: parts.join(substitute), count: parts.length - 1 };
}

function sanitizeTextField(value, orderedEntries) {
	let text = String(value ?? "");
	let count = 0;
	for (const [term, substitute] of orderedEntries) {
		const result = replaceAllLiteral(text, term, substitute);
		text = result.text;
		count += result.count;
	}
	return { text, count };
}

/**
 * Deterministic auto-sanitize: clones the plan and replaces every
 * occurrence of each forbidden term inside the validator-scanned fields
 * (nutritionPlan.meals + weeklyPlan meals: name / recipe / ingredients).
 * Profile-echo fields (userProfile.forbiddenFoods/allergies) are
 * deliberately untouched — they legitimately name the banned foods.
 *
 * Never throws on malformed input: returns the best-effort clone.
 *
 * @param {object} plan Parsed plan object (validation.data).
 * @param {import("./therapeuticGuidance.js").UserProfile | any} userProfile
 * @returns {{ plan: object, replacedCount: number, replacements: Array<{ term: string, substitute: string, count: number }> }}
 */
export function sanitizePlanForProfile(plan, userProfile) {
	const substitutionMap = getSubstitutionMapForProfile(userProfile);
	// Longest terms first so multi-word bans ("لحوم مصنعة") win over
	// their substrings.
	const orderedEntries = Object.entries(substitutionMap).sort((a, b) => b[0].length - a[0].length);

	let clone;
	try {
		clone = JSON.parse(JSON.stringify(plan ?? {}));
	} catch {
		return { plan, replacedCount: 0, replacements: [] };
	}

	const perTermCounts = new Map();
	const applyToField = (value) => {
		if (typeof value !== "string" || !value) return { value, changed: false };
		const { text, count } = sanitizeTextField(value, orderedEntries);
		// Attribute counts per term with a second pass (cheap: few terms).
		if (count > 0) {
			let remaining = String(value);
			for (const [term, substitute] of orderedEntries) {
				const before = remaining.split(term).length - 1;
				if (before > 0) {
					perTermCounts.set(term, (perTermCounts.get(term) ?? 0) + before);
					remaining = remaining.split(term).join(substitute);
				}
			}
		}
		return { value: text, changed: count > 0 };
	};

	const sanitizeMeal = (meal) => {
		if (!meal || typeof meal !== "object") return;
		if (typeof meal.name === "string") meal.name = applyToField(meal.name).value;
		if (typeof meal.recipe === "string") meal.recipe = applyToField(meal.recipe).value;
		if (Array.isArray(meal.ingredients)) {
			meal.ingredients = meal.ingredients.map((item) =>
				typeof item === "string" ? applyToField(item).value : item,
			);
		}
	};

	try {
		const meals = clone?.nutritionPlan?.meals;
		if (Array.isArray(meals)) meals.forEach(sanitizeMeal);
		const weeklyPlan = clone?.nutritionPlan?.weeklyPlan;
		if (Array.isArray(weeklyPlan)) {
			for (const day of weeklyPlan) {
				if (Array.isArray(day?.meals)) day.meals.forEach(sanitizeMeal);
			}
		}
	} catch {
		// Best effort: return whatever the clone holds.
	}

	const replacements = [...perTermCounts.entries()].map(([term, count]) => ({
		term,
		substitute: substitutionMap[term],
		count,
	}));
	const replacedCount = replacements.reduce((sum, entry) => sum + entry.count, 0);
	return { plan: clone, replacedCount, replacements };
}
