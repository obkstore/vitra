/**
 * Balance Index engine for composite wellness scoring.
 *
 * This module combines three dimensions:
 * - Mental state quality (stress inversion + sleep + energy)
 * - Physical activity readiness (activity baseline + equipment bonus)
 * - Nutrition readiness (diet awareness + food behavior + health context)
 *
 * The final Balance Index is normalized to 0-100 and enriched with
 * dynamic Arabic insights and recommendations for the UI.
 */

/** @typedef {import("../types/index.js").UserProfile} UserProfile */
/** @typedef {import("../types/index.js").BalanceIndex} BaseBalanceIndex */

/**
 * @typedef {BaseBalanceIndex & {
 * 	level: "critical"|"low"|"moderate"|"good"|"excellent",
 * 	levelAr: string,
 * 	color: string
 * }} BalanceIndexResult
 */

const ARABIC_CUISINE_STAPLES = new Set([
	"rice",
	"bread",
	"lentils",
	"chickpeas",
	"olive oil",
	"dates",
	"yogurt",
	"arroz",
	"khubz",
	"أرز",
	"ارز",
	"خبز",
	"عدس",
	"حمص",
	"زيت الزيتون",
	"تمر",
	"لبن",
]);

const ACTIVITY_BASE_SCORES = {
	sedentary: 20,
	lightly_active: 45,
	moderately_active: 70,
	very_active: 95,
};

/**
 * Clamps and rounds any score to the range 0-100.
 * @param {number} value Raw score value.
 * @returns {number} Rounded bounded score.
 */
function clampScore(value) {
	return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Normalizes a 1-5 input to a valid range.
 * @param {number} value Raw Likert value.
 * @returns {number} Safe value between 1 and 5.
 */
function normalizeLikert(value) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return 3;
	return Math.max(1, Math.min(5, numeric));
}

/**
 * Builds dynamic Arabic insights and guarantees a concise 3-5 item list.
 * @param {UserProfile} userProfile Full onboarding profile.
 * @param {number} score Composite balance score.
 * @param {number} mentalScore Mental dimension score.
 * @param {number} activityScore Activity dimension score.
 * @param {number} nutritionScore Nutrition readiness score.
 * @returns {string[]} Insight statements in Arabic.
 */
function buildInsights(userProfile, score, mentalScore, activityScore, nutritionScore) {
	const mentalState = userProfile?.mentalState ?? {};
	const stressLevel = normalizeLikert(mentalState.stressLevel);
	const sleepQuality = normalizeLikert(mentalState.sleepQuality);
	const energyLevel = normalizeLikert(mentalState.energyLevel);
	const activityLevel = userProfile?.activityLevel;
	const insights = [];

	if (stressLevel >= 4) {
		insights.push(
			"مستوى التوتر لديك مرتفع - الأطعمة الغنية بالمغنيسيوم كالمكسرات والسبانخ ستساعدك",
		);
	}

	if (sleepQuality <= 2) {
		insights.push(
			"جودة نومك تحتاج تحسيناً - تجنب الكافيين بعد الساعة 2 ظهراً وجرّب شاي البابونج",
		);
	}

	if (energyLevel <= 2) {
		insights.push("طاقتك منخفضة - تناول وجبات صغيرة كل 3 ساعات وزد شرب الماء");
	}

	if (activityLevel === "sedentary") {
		insights.push(
			"النشاط البدني شبه معدوم - حتى 20 دقيقة مشي يومياً ستغيّر مزاجك بشكل ملحوظ",
		);
	}

	if (score >= 70) {
		insights.push("أنت على الطريق الصحيح! استمر في هذا النمط الصحي");
	}

	const weakestDimension = [
		{ key: "mental", label: "المحور النفسي", value: mentalScore },
		{ key: "activity", label: "محور النشاط", value: activityScore },
		{ key: "nutrition", label: "المحور الغذائي", value: nutritionScore },
	].sort((a, b) => a.value - b.value)[0];

	const dynamicFallbacks = [
		score < 55
			? "المؤشر العام منخفض حالياً، لكن التحسن التدريجي الأسبوعي سيصنع فرقاً واضحاً"
			: "التوازن الحالي قابل للتطوير بخطوات بسيطة وثابتة خلال الأسابيع القادمة",
		mentalScore >= 70
			? "استقرارك النفسي الحالي يدعم قدرتك على الالتزام بالعادات الصحية"
			: "تحسين إدارة التوتر والنوم سيمنحك دفعة كبيرة في المؤشر العام",
		activityScore >= 70
			? "مستوى نشاطك البدني الحالي نقطة قوة واضحة في نمطك الصحي"
			: "زيادة الحركة اليومية تدريجياً سترفع طاقتك ومؤشرك بسرعة",
		nutritionScore >= 70
			? "اختياراتك الغذائية متوازنة نسبياً وتخدم أهدافك الصحية"
			: "تنظيم تفضيلاتك الغذائية سيجعل خطتك أسهل وأكثر واقعية",
		`أولوية التحسين القادمة لديك هي ${weakestDimension.label} لرفع التوازن العام`,
	];

	for (const fallback of dynamicFallbacks) {
		if (insights.length >= 5) break;
		if (!insights.includes(fallback)) {
			insights.push(fallback);
		}
	}

	if (insights.length < 3) {
		insights.push("الاستمرارية اليومية أهم من الكمال - التزم بخطوات صغيرة وثابتة");
	}

	return insights.slice(0, 5);
}

/**
 * Builds dynamic Arabic recommendations and keeps output between 2-3 items.
 * @param {number} mentalScore Mental dimension score.
 * @param {number} activityScore Activity dimension score.
 * @param {number} nutritionScore Nutrition readiness score.
 * @returns {string[]} Recommendation statements in Arabic.
 */
function buildRecommendations(mentalScore, activityScore, nutritionScore) {
	const conditionals = [];

	if (mentalScore < 50) {
		conditionals.push({
			key: "mental",
			score: mentalScore,
			message: "ابدأ بتمارين التنفس العميق 5 دقائق صباحاً",
		});
	}

	if (activityScore < 45) {
		conditionals.push({
			key: "activity",
			score: activityScore,
			message: "اهدف لـ 7000 خطوة يومية كحد أدنى",
		});
	}

	if (nutritionScore < 50) {
		conditionals.push({
			key: "nutrition",
			score: nutritionScore,
			message: "أضف خضاراً ورقياً لكل وجبة رئيسية",
		});
	}

	const prioritized = conditionals.sort((a, b) => a.score - b.score).slice(0, 2);
	const recommendations = prioritized.map((item) => item.message);

	if (recommendations.length === 0) {
		const weakest = [
			{ key: "mental", score: mentalScore },
			{ key: "activity", score: activityScore },
			{ key: "nutrition", score: nutritionScore },
		].sort((a, b) => a.score - b.score)[0];

		if (weakest.key === "mental") {
			recommendations.push("حافظ على روتين نوم ثابت لتثبيت مزاجك خلال اليوم");
		} else if (weakest.key === "activity") {
			recommendations.push("أضف 15-20 دقيقة مشي يومياً للحفاظ على اتزان نشاطك");
		} else {
			recommendations.push("حافظ على طبق متوازن يجمع البروتين والخضار في كل وجبة");
		}
	}

	recommendations.push("اشرب كوب ماء فور الاستيقاظ قبل أي شيء آخر");

	return recommendations.slice(0, 3);
}

/**
 * Calculates mental-state score from stress, sleep quality, and energy levels.
 * Stress is inverted so higher stress lowers the score contribution.
 * @param {{ stressLevel: number, sleepQuality: number, energyLevel: number }} mentalState Mental-state inputs (1-5 each).
 * @returns {number} Mental score in range 0-100, rounded.
 */
export function calculateMentalScore(mentalState) {
	const stressLevel = normalizeLikert(mentalState?.stressLevel);
	const sleepQuality = normalizeLikert(mentalState?.sleepQuality);
	const energyLevel = normalizeLikert(mentalState?.energyLevel);

	const rawScore = ((6 - stressLevel + sleepQuality + energyLevel) / 15) * 100;
	return clampScore(rawScore);
}

/**
 * Calculates activity score from activity level and available equipment.
 * @param {"sedentary"|"lightly_active"|"moderately_active"|"very_active"} activityLevel Baseline activity level.
 * @param {string[]} availableEquipment Available equipment/environment list.
 * @returns {number} Activity score in range 0-100, capped and rounded.
 */
export function calculateActivityScore(activityLevel, availableEquipment) {
	const baseScore = ACTIVITY_BASE_SCORES[activityLevel] ?? ACTIVITY_BASE_SCORES.sedentary;
	const equipmentCount = Array.isArray(availableEquipment)
		? availableEquipment.filter((item) => Boolean(item) && item !== "none").length
		: 0;
	const equipmentBonus = Math.min(equipmentCount * 2, 8);

	return clampScore(baseScore + equipmentBonus);
}

/**
 * Calculates nutrition-readiness score using dietary behavior and health context.
 * @param {UserProfile} userProfile Full onboarding profile.
 * @returns {number} Nutrition readiness score in range 0-100, capped and rounded.
 */
export function calculateNutritionReadinessScore(userProfile) {
	const foodPreferences = userProfile?.foodPreferences ?? {};
	const forbiddenFoods = Array.isArray(foodPreferences.forbiddenFoods)
		? foodPreferences.forbiddenFoods
		: [];
	const favoriteFoods = Array.isArray(foodPreferences.favoriteFoods)
		? foodPreferences.favoriteFoods
		: [];
	const allergies = foodPreferences.allergies;
	const healthConditions = Array.isArray(userProfile?.healthConditions)
		? userProfile.healthConditions
		: [];

	let score = 0;

	const forbiddenNormalized = forbiddenFoods.map((item) => String(item).trim().toLowerCase());
	const hasStaplesOverlap = forbiddenNormalized.some((item) => ARABIC_CUISINE_STAPLES.has(item));
	if (!hasStaplesOverlap) {
		score += 20;
	}

	if (foodPreferences.dietType && foodPreferences.dietType !== "omnivore") {
		score += 15;
	}

	if (favoriteFoods.length > 0) {
		score += 20;
	}

	const nonNoneConditions = healthConditions.filter((condition) => condition !== "none");
	const hasNoConditions =
		healthConditions.includes("none") && nonNoneConditions.length === 0;

	if (hasNoConditions) {
		score += 25;
	} else if (nonNoneConditions.length === 1) {
		score += 10;
	}

	if (Array.isArray(allergies)) {
		score += 20;
	}

	return clampScore(score);
}

/**
 * Calculates the composite Balance Index and derived UX metadata.
 *
 * Weights:
 * - Mental score: 40%
 * - Activity score: 35%
 * - Nutrition readiness score: 25%
 *
 * @param {UserProfile} userProfile Full onboarding profile.
 * @returns {BalanceIndexResult} Composite Balance Index object with score, labels, and guidance.
 */
export function calculateBalanceIndex(userProfile) {
	const mentalScore = calculateMentalScore(userProfile?.mentalState ?? {});
	const activityScore = calculateActivityScore(
		userProfile?.activityLevel,
		userProfile?.availableEquipment,
	);
	const nutritionScore = calculateNutritionReadinessScore(userProfile);
	const score = clampScore(
		mentalScore * 0.4 + activityScore * 0.35 + nutritionScore * 0.25,
	);

	let level = "critical";
	let levelAr = "يحتاج اهتمام عاجل";
	let color = "#ef4444";

	if (score >= 85) {
		level = "excellent";
		levelAr = "ممتاز";
		color = "#10b981";
	} else if (score >= 70) {
		level = "good";
		levelAr = "جيد";
		color = "#22c55e";
	} else if (score >= 55) {
		level = "moderate";
		levelAr = "متوسط";
		color = "#f59e0b";
	} else if (score >= 40) {
		level = "low";
		levelAr = "منخفض";
		color = "#f97316";
	}

	const insights = buildInsights(
		userProfile,
		score,
		mentalScore,
		activityScore,
		nutritionScore,
	);
	const recommendations = buildRecommendations(
		mentalScore,
		activityScore,
		nutritionScore,
	);

	return {
		score,
		nutritionScore,
		mentalScore,
		activityScore,
		level,
		levelAr,
		color,
		insights,
		recommendations,
	};
}

export default calculateBalanceIndex;
