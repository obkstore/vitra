/**
 * Prompt engineering utilities for stable AI plan generation.
 *
 * Why this matters:
 * A well-specified prompt reduces ambiguity, improves structure adherence,
 * and increases the probability that the model returns valid JSON matching
 * the application's expected schema on the first attempt.
 */

/** @typedef {import("../types/index.js").UserProfile} UserProfile */
/** @typedef {import("../types/index.js").GeneratedPlan} GeneratedPlan */

import { formatTherapeuticGuidanceSummary, getForbiddenTermsForProfile, textContainsForbiddenTerm } from "./therapeuticGuidance.js";

const GOAL_AR = {
	lose_weight: "خسارة الوزن",
	gain_weight: "زيادة الوزن",
	improve_mood: "تحسين المزاج",
	maintain: "الحفاظ على التوازن",
};

const ACTIVITY_LEVEL_AR = {
	sedentary: "خامل",
	lightly_active: "نشاط خفيف",
	moderately_active: "نشاط متوسط",
	very_active: "نشاط عالٍ",
};

const DIET_TYPE_AR = {
	omnivore: "متنوع",
	vegetarian: "نباتي",
	vegan: "نباتي صرف",
	keto: "كيتو",
};

const HEALTH_CONDITION_AR = {
	diabetes: "السكري",
	hypertension: "ارتفاع ضغط الدم",
	heart_disease: "أمراض القلب والأوعية",
	hypotension: "انخفاض ضغط الدم",
	hypothyroidism: "قصور الغدة الدرقية",
	hyperthyroidism: "فرط نشاط الغدة الدرقية",
	ibs: "متلازمة القولون العصبي",
	none: "لا توجد حالات مزمنة",
	other: "حالة صحية أخرى",
};

/**
 * Returns the system prompt used to constrain AI behavior.
 * @returns {string} Strict system instructions for JSON-only Arabic output.
 */
export function buildSystemPrompt() {
	return [
		"You are a certified clinical nutritionist and fitness coach specializing in the relationship between nutrition and mental health. You create personalized, scientifically-grounded health plans.",
		"You must respond ONLY with a valid JSON object - no markdown, no explanation, no extra text.",
		"Keep all descriptive text fields concise (2-3 sentences max per field: recipes, descriptions, insights, recommendations) so the JSON stays structurally complete and compact.",
		"The JSON must follow the exact structure provided in the user message.",
		"All text content inside the JSON (meal names, exercise names, insights, recipes) must be in Arabic.",
		"Base all recommendations on established nutritional science and consider the user's health conditions carefully.",
		"CRITICAL HEALTH RULES — MUST FOLLOW:\n- For diabetes: avoid sugary drinks and sweets, distribute measured carbohydrate portions, and prefer fiber-rich foods; do not claim that all fruit or all grains are forbidden.\n- For hypertension or heart disease: prefer DASH/Mediterranean patterns, reduce ultra-processed foods and sodium, and never prescribe deliberate salt or fluid changes without clinician guidance.\n- For hypotension: keep hydration individualized and never prescribe high salt as a universal treatment.\n- For thyroid disorders: do not impose blanket bans on cruciferous vegetables, soy, iodine, or dairy; mention medication timing only as a clinician-directed precaution.\n- For IBS: treat Low-FODMAP as a short, supervised elimination and reintroduction process, not a permanent diet.\n- If keto conflicts with diabetes, heart disease, pregnancy, medication, or other risk, state that clinician review is required and prefer a safer pattern.\n- If user has food allergies listed: NEVER include those ingredients in ANY meal.\n- If user has forbidden foods listed: NEVER include them under any circumstance.\n- Never diagnose, change medication, or present estimates as medical certainty.",
	].join("\n");
}

/**
 * Translates a goal code to Arabic.
 * @param {UserProfile["goal"]} goal Goal key.
 * @returns {string} Arabic goal label.
 */
function getGoalAr(goal) {
	return GOAL_AR[goal] ?? "غير محدد";
}

/**
 * Translates an activity level code to Arabic.
 * @param {UserProfile["activityLevel"]} activityLevel Activity level key.
 * @returns {string} Arabic activity label.
 */
function getActivityLevelAr(activityLevel) {
	return ACTIVITY_LEVEL_AR[activityLevel] ?? "غير محدد";
}

/**
 * Translates diet type to Arabic.
 * @param {UserProfile["foodPreferences"]["dietType"]} dietType Diet type key.
 * @returns {string} Arabic diet label.
 */
function getDietTypeAr(dietType) {
	return DIET_TYPE_AR[dietType] ?? "غير محدد";
}

/**
 * Converts health conditions into a readable Arabic label list.
 * @param {UserProfile["healthConditions"]} healthConditions Condition keys.
 * @returns {string} Joined Arabic conditions or default no-condition text.
 */
function formatHealthConditionsAr(healthConditions) {
	if (!Array.isArray(healthConditions) || healthConditions.length === 0) {
		return "لا توجد حالات مزمنة";
	}

	const nonNoneConditions = healthConditions.filter((condition) => condition !== "none");
	if (nonNoneConditions.length === 0) {
		return "لا توجد حالات مزمنة";
	}

	return nonNoneConditions
		.map((condition) => HEALTH_CONDITION_AR[condition] ?? condition)
		.join("، ");
}

/**
 * Formats an array as Arabic comma-separated list with a fallback value.
 * @param {string[] | undefined} values Input list.
 * @param {string} fallback Fallback text when list is empty.
 * @returns {string} Joined list or fallback.
 */
function formatListOrFallback(values, fallback) {
	if (!Array.isArray(values) || values.length === 0) {
		return fallback;
	}

	const filtered = values
		.map((value) => String(value).trim())
		.filter((value) => value.length > 0);

	if (filtered.length === 0) {
		return fallback;
	}

	return filtered.join("، ");
}

/**
 * Builds the user prompt containing profile summary and strict JSON template.
 * @param {UserProfile} userProfile Full user profile.
 * @param {{
 * 	bmi: { value: number, categoryAr: string },
 * 	dailyCalories: number,
 * 	macros: { proteinGrams: number, carbsGrams: number, fatGrams: number },
 * 	hydration: number
 * }} nutritionSummary Nutrition summary from formatNutritionSummary.
 * @param {string} [guideText] Optional therapeutic guide body (server-loaded
 * .md). Empty string omits the guide section without affecting the rest.
 * @returns {string} Structured user prompt for AI plan generation.
 */
export function buildUserPrompt(userProfile, nutritionSummary, guideText = "") {
	const genderAr = userProfile.gender === "male" ? "ذكر" : "أنثى";
	const goalAr = getGoalAr(userProfile.goal);
	const healthConditionsAr = formatHealthConditionsAr(userProfile.healthConditions);
	const activityLevelAr = getActivityLevelAr(userProfile.activityLevel);
	const stressLevel = userProfile.mentalState?.stressLevel ?? "-";
	const sleepQuality = userProfile.mentalState?.sleepQuality ?? "-";
	const energyLevel = userProfile.mentalState?.energyLevel ?? "-";
	const dietTypeAr = getDietTypeAr(userProfile.foodPreferences?.dietType);
	const safeHealthConditions = Array.isArray(userProfile.healthConditions)
		? userProfile.healthConditions
		: [];
	const forbiddenFoods = Array.isArray(userProfile.foodPreferences?.forbiddenFoods)
		? userProfile.foodPreferences.forbiddenFoods
		: [];
	const allergies = Array.isArray(userProfile.foodPreferences?.allergies)
		? userProfile.foodPreferences.allergies
		: [];
	const forbiddenFoodsText = formatListOrFallback(forbiddenFoods, "لا يوجد");
	const allergiesText = formatListOrFallback(allergies, "لا يوجد");
	const therapeuticGuidance = formatTherapeuticGuidanceSummary(userProfile);

	const healthWarnings = [];
	if (safeHealthConditions.includes("diabetes"))
		healthWarnings.push("⚠️ المستخدم مصاب بالسكري — يمنع منعاً باتاً استخدام الأطعمة عالية المؤشر الجلايسيمي");
	if (safeHealthConditions.includes("hypertension"))
		healthWarnings.push("⚠️ المستخدم مصاب بضغط الدم المرتفع — يمنع منعاً باتاً إضافة الملح أو الأطعمة المعالجة");
	if (safeHealthConditions.includes("heart_disease"))
		healthWarnings.push("⚠️ أمراض القلب — استخدم نمط البحر المتوسط وتجنب أي تغيير علاجي في الصوديوم أو السوائل دون الطبيب");
	if (safeHealthConditions.includes("hypotension"))
		healthWarnings.push("⚠️ انخفاض الضغط — لا توصف زيادة الملح أو السوائل كعلاج عام، ويجب التنبيه لأعراض الدوخة أو الإغماء");
	if (forbiddenFoods.length > 0)
		healthWarnings.push(`🚫 أطعمة محظورة تماماً: ${forbiddenFoods.join("، ")}`);
	if (allergies.length > 0)
		healthWarnings.push(`🚨 حساسية طعام خطيرة من: ${allergies.join("، ")}`);
	if (userProfile.foodPreferences?.dietType === "vegan")
		healthWarnings.push("🌱 النظام نباتي صرف — استخدم بدائل الحليب النباتية (مثل حليب الشوفان، حليب اللوز) ويُمنع منعاً باتاً استخدام منتجات الألبان الحيوانية (حليب بقري، لبن، جبن، زبادي).");

	const warningsBlock = healthWarnings.length > 0
		? `\n=== تحذيرات صحية حرجة — يجب الالتزام بها ===\n${healthWarnings.join("\n")}\n`
		: "\n=== لا توجد قيود صحية خاصة ===\n";

	const profileSection = [
		"=== بيانات المستخدم ===",
		`العمر: ${userProfile.age} سنة | الجنس: ${genderAr}`,
		`الوزن: ${userProfile.weight}كغ | الطول: ${userProfile.height}سم`,
		`مؤشر كتلة الجسم: ${nutritionSummary.bmi.value} (${nutritionSummary.bmi.categoryAr})`,
		`الهدف: ${goalAr}`,
		`الحالة الصحية: ${healthConditionsAr}`,
		`النشاط البدني: ${activityLevelAr}`,
		`الحالة النفسية: التوتر ${stressLevel}/5 | النوم ${sleepQuality}/5 | الطاقة ${energyLevel}/5`,
		`نوع الغذاء: ${dietTypeAr}`,
		`الأطعمة الممنوعة: ${forbiddenFoodsText}`,
		`الحساسية: ${allergiesText}`,
		`السعرات المطلوبة: ${nutritionSummary.dailyCalories} سعرة/يوم`,
		`البروتين: ${nutritionSummary.macros.proteinGrams}غ | الكربوهيدرات: ${nutritionSummary.macros.carbsGrams}غ | الدهون: ${nutritionSummary.macros.fatGrams}غ`,
		`الماء اليومي: ${nutritionSummary.hydration} لتر`,
	].join("\n");

	const jsonTemplateSection = [
		"=== هيكل JSON المطلوب (التزم به حرفياً) ===",
		"{",
		'  "userProfile": {',
		'    "age": 0,',
		'    "gender": "male أو female",',
		'    "weight": 0,',
		'    "height": 0,',
		'    "healthConditions": ["..."],',
		'    "goal": "lose_weight أو gain_weight أو improve_mood أو maintain",',
		'    "mentalState": { "stressLevel": 0, "sleepQuality": 0, "energyLevel": 0 },',
		'    "foodPreferences": {',
		'      "favoriteFoods": ["..."],',
		'      "forbiddenFoods": ["..."],',
		'      "allergies": ["..."],',
		'      "dietType": "omnivore أو vegetarian أو vegan أو keto"',
		"    },",
		'    "activityLevel": "sedentary أو lightly_active أو moderately_active أو very_active",',
		'    "availableEquipment": ["..."]',
		"  },",
		'  "nutritionPlan": {',
		'    "dailyCalories": 0,',
		'    "proteinGrams": 0,',
		'    "carbsGrams": 0,',
		'    "fatGrams": 0,',
		'    "hydrationLiters": 0,',
		'    "meals": [',
		"      {",
		'        "name": "...",',
		'        "time": "...",',
		'        "ingredients": ["..."],',
		'        "calories": 0,',
		'        "prepTimeMinutes": 0,',
		'        "recipe": "..."',
		"      },",
		"      {",
		'        "name": "...",',
		'        "time": "...",',
		'        "ingredients": ["..."],',
		'        "calories": 0,',
		'        "prepTimeMinutes": 0,',
		'        "recipe": "..."',
		"      },",
		"      {",
		'        "name": "...",',
		'        "time": "...",',
		'        "ingredients": ["..."],',
		'        "calories": 0,',
		'        "prepTimeMinutes": 0,',
		'        "recipe": "..."',
		"      },",
		"      {",
		'        "name": "...",',
		'        "time": "...",',
		'        "ingredients": ["..."],',
		'        "calories": 0,',
		'        "prepTimeMinutes": 0,',
		'        "recipe": "..."',
		"      }",
		"    ],",
		'    "weeklyPlan": [',
		"      {",
		'        "day": "السبت",',
		'        "meals": [{ "mealType": "breakfast", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "lunch", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "dinner", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "snack", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }],',
		'        "totalCalories": 0',
		"      },",
		"      {",
		'        "day": "الأحد",',
		'        "meals": [{ "mealType": "breakfast", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "lunch", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "dinner", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "snack", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }],',
		'        "totalCalories": 0',
		"      },",
		"      {",
		'        "day": "الاثنين",',
		'        "meals": [{ "mealType": "breakfast", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "lunch", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "dinner", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "snack", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }],',
		'        "totalCalories": 0',
		"      },",
		"      {",
		'        "day": "الثلاثاء",',
		'        "meals": [{ "mealType": "breakfast", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "lunch", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "dinner", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "snack", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }],',
		'        "totalCalories": 0',
		"      },",
		"      {",
		'        "day": "الأربعاء",',
		'        "meals": [{ "mealType": "breakfast", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "lunch", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "dinner", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "snack", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }],',
		'        "totalCalories": 0',
		"      },",
		"      {",
		'        "day": "الخميس",',
		'        "meals": [{ "mealType": "breakfast", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "lunch", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "dinner", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "snack", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }],',
		'        "totalCalories": 0',
		"      },",
		"      {",
		'        "day": "الجمعة",',
		'        "meals": [{ "mealType": "breakfast", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "lunch", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "dinner", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }, { "mealType": "snack", "name": "...", "time": "...", "ingredients": ["..."], "calories": 0, "prepTimeMinutes": 0, "recipe": "..." }],',
		'        "totalCalories": 0',
		"      }",
		"    ]",
		"  },",
		'  "exercisePlan": {',
		'    "weeklyWorkouts": [',
		"      {",
		'        "day": "السبت",',
		'        "type": "قوة",',
		'        "durationMinutes": 0,',
		'        "caloriesBurned": 0,',
		'        "exercises": [',
		"          {",
		'            "name": "...",',
		'            "sets": 0,',
		'            "reps": "...",',
		'            "restSeconds": 0,',
		'            "description": "...",',
		'            "difficulty": "beginner أو intermediate أو advanced"',
		"          },",
		"          {",
		'            "name": "...",',
		'            "sets": 0,',
		'            "reps": "...",',
		'            "restSeconds": 0,',
		'            "description": "...",',
		'            "difficulty": "beginner أو intermediate أو advanced"',
		"          },",
		"          {",
		'            "name": "...",',
		'            "sets": 0,',
		'            "reps": "...",',
		'            "restSeconds": 0,',
		'            "description": "...",',
		'            "difficulty": "beginner أو intermediate أو advanced"',
		"          }",
		"        ]",
		"      },",
		"      {",
		'        "day": "الأحد",',
		'        "type": "كارديو",',
		'        "durationMinutes": 0,',
		'        "caloriesBurned": 0,',
		'        "exercises": [{ "name": "...", "sets": 0, "reps": "...", "restSeconds": 0, "description": "...", "difficulty": "beginner" }, { "name": "...", "sets": 0, "reps": "...", "restSeconds": 0, "description": "...", "difficulty": "intermediate" }, { "name": "...", "sets": 0, "reps": "...", "restSeconds": 0, "description": "...", "difficulty": "intermediate" }]',
		"      },",
		"      {",
		'        "day": "الاثنين",',
		'        "type": "مرونة",',
		'        "durationMinutes": 0,',
		'        "caloriesBurned": 0,',
		'        "exercises": [{ "name": "...", "sets": 0, "reps": "...", "restSeconds": 0, "description": "...", "difficulty": "beginner" }, { "name": "...", "sets": 0, "reps": "...", "restSeconds": 0, "description": "...", "difficulty": "intermediate" }, { "name": "...", "sets": 0, "reps": "...", "restSeconds": 0, "description": "...", "difficulty": "intermediate" }]',
		"      },",
		"      {",
		'        "day": "الثلاثاء",',
		'        "type": "قوة",',
		'        "durationMinutes": 0,',
		'        "caloriesBurned": 0,',
		'        "exercises": [{ "name": "...", "sets": 0, "reps": "...", "restSeconds": 0, "description": "...", "difficulty": "beginner" }, { "name": "...", "sets": 0, "reps": "...", "restSeconds": 0, "description": "...", "difficulty": "intermediate" }, { "name": "...", "sets": 0, "reps": "...", "restSeconds": 0, "description": "...", "difficulty": "advanced" }]',
		"      },",
		"      {",
		'        "day": "الأربعاء",',
		'        "type": "كارديو",',
		'        "durationMinutes": 0,',
		'        "caloriesBurned": 0,',
		'        "exercises": [{ "name": "...", "sets": 0, "reps": "...", "restSeconds": 0, "description": "...", "difficulty": "beginner" }, { "name": "...", "sets": 0, "reps": "...", "restSeconds": 0, "description": "...", "difficulty": "intermediate" }, { "name": "...", "sets": 0, "reps": "...", "restSeconds": 0, "description": "...", "difficulty": "intermediate" }]',
		"      }",
		"    ],",
		'    "dailyStepsGoal": 0,',
		'    "activeMinutesGoal": 0',
		"  },",
		'  "balanceIndex": {',
		'    "score": 0,',
		'    "insights": ["...", "...", "..."],',
		'    "recommendations": ["...", "...", "..."]',
		"  },",
		'  "generatedAt": "ISO-8601 datetime",',
		'  "planDurationWeeks": 4',
		"}",
	].join("\n");

	return [
		warningsBlock,
		therapeuticGuidance,
		String(guideText ?? "").trim()
			? [
					"=== دليل الأنظمة الغذائية العلاجية المعتمد (قواعد صارمة واجبة الاتباع) ===",
					"You must strictly follow the therapeutic rules, restrictions, and food choices detailed in this guide for the user's specific health condition and diet type.",
					String(guideText).trim(),
				].join("\n")
			: "",
		"",
		profileSection,
		"",
		jsonTemplateSection,
		"",
		"ملاحظات إلزامية:",
		"- كل النصوص داخل JSON يجب أن تكون باللغة العربية (ما عدا مفاتيح JSON).",
		"- nutritionPlan.meals يجب أن تحتوي 4 وجبات أساسية مفصلة (name,time,ingredients,calories,prepTimeMinutes,recipe).",
		"- weeklyPlan لكل يوم يجب أن يحتوي 4 وجبات مفصلة مع mealType (breakfast,lunch,dinner,snack) وليس أسماء عامة فقط.",
		"- يجب تنويع الوجبات بين أيام الأسبوع مع الحفاظ على السعرات المستهدفة.",
		"- weeklyPlan يجب أن تحتوي 7 أيام.",
		"- weeklyWorkouts يجب أن تحتوي 5 أيام.",
		"- كل يوم تدريب يجب أن يحتوي 3 إلى 4 تمارين.",
		"",
		"أعد الآن خطة كاملة لهذا المستخدم بصيغة JSON فقط، بدون أي نص إضافي.",
		"تذكّر: أي وجبة تحتوي على طعام ممنوع أو غير مناسب للحالة الصحية ستُعتبر إجابة خاطئة كاملاً.",
	].join("\n");
}

/**
 * Performs semantic safety checks against the generated plan and the user's therapeutic constraints.
 * @param {GeneratedPlan | null | undefined} plan Candidate plan data.
 * @param {UserProfile} userProfile User profile that defines the restrictions.
 * @returns {{ isValid: boolean, error: string | null, offendingTerm?: string | null }} Semantic validation result.
 */
export function validatePlanAgainstProfile(plan, userProfile) {
	const forbiddenTerms = getForbiddenTermsForProfile(userProfile);
	const nutritionPlan = plan?.nutritionPlan;

	if (!nutritionPlan || typeof nutritionPlan !== "object" || Array.isArray(nutritionPlan)) {
		return {
			isValid: false,
			error: "القسم nutritionPlan غير صالح",
		};
	}

	const entriesToScan = [];
	for (const meal of Array.isArray(nutritionPlan.meals) ? nutritionPlan.meals : []) {
		entriesToScan.push(meal?.name, meal?.recipe, ...(Array.isArray(meal?.ingredients) ? meal.ingredients : []));
	}

	for (const day of Array.isArray(nutritionPlan.weeklyPlan) ? nutritionPlan.weeklyPlan : []) {
		for (const meal of Array.isArray(day?.meals) ? day.meals : []) {
			entriesToScan.push(meal?.name, meal?.recipe, ...(Array.isArray(meal?.ingredients) ? meal.ingredients : []));
		}
	}

	for (const entry of entriesToScan) {
		const offendingTerm = textContainsForbiddenTerm(entry, forbiddenTerms);
		if (offendingTerm) {
			return {
				isValid: false,
				error: `تم العثور على مكوّن أو مصطلح محظور في الخطة: ${offendingTerm}`,
				offendingTerm,
			};
		}
	}

	return {
		isValid: true,
		error: null,
	};
}

/**
 * Builds a correction suffix for a single regeneration attempt after a
 * semantic rejection. Names the exact violated constraint so the model can
 * repair it. The caller caps usage at one retry to bound quota cost.
 * @param {UserProfile} userProfile User profile that defines the restrictions.
 * @param {string} offendingTerm Forbidden term found in the rejected plan.
 * @returns {string} Correction block to append to the user prompt.
 */
export function buildSemanticRetryNote(userProfile, offendingTerm) {
	const dietType = userProfile?.foodPreferences?.dietType;
	const allergies = Array.isArray(userProfile?.foodPreferences?.allergies)
		? userProfile.foodPreferences.allergies.filter((item) => String(item ?? "").trim())
		: [];
	const forbiddenFoods = Array.isArray(userProfile?.foodPreferences?.forbiddenFoods)
		? userProfile.foodPreferences.forbiddenFoods.filter((item) => String(item ?? "").trim())
		: [];
	const healthConditions = Array.isArray(userProfile?.healthConditions)
		? userProfile.healthConditions.filter((item) => item && item !== "none")
		: [];
	const lines = [
		"=== تصحيح إلزامي — أعد توليد الخطة كاملة ===",
		`المحاولة السابقة رُفضت لأنها احتوت على مكوّن محظور: "${offendingTerm}".`,
	];
	if (dietType === "vegan") {
		lines.push("هذا المستخدم نباتي صرف (vegan): يُمنع منعاً باتاً أي لحم أو دواجن أو سمك أو ألبان أو بيض — استخدم بدائل نباتية فقط.");
	} else if (dietType === "vegetarian") {
		lines.push("هذا المستخدم نباتي (vegetarian): يُمنع منعاً باتاً أي لحم أو دواجن أو سمك.");
	} else if (dietType === "keto") {
		lines.push("هذا المستخدم على حمية الكيتو: تجنب الأرز والخبز والمعكرونة والبطاطا والسكريات.");
	}
	if (allergies.length > 0) {
		lines.push(`حساسية غذائية خطيرة من: ${allergies.join("، ")} — لا تستخدمها أبداً في أي وجبة.`);
	}
	if (forbiddenFoods.length > 0) {
		lines.push(`أطعمة محظورة تماماً: ${forbiddenFoods.join("، ")} — لا تستخدمها تحت أي ظرف.`);
	}
	if (healthConditions.length > 0) {
		lines.push(`الحالات الصحية للمستخدم: ${healthConditions.join("، ")} — راعِ قيودها الغذائية بدقة.`);
	}
	lines.push("أعد الآن الخطة كاملة بصيغة JSON فقط، بدون أي نص إضافي، مع الالتزام الحرفي بهذا التصحيح.");
	return `\n${lines.join("\n")}`;
}

/**
 * Removes optional markdown code fences from a model response.
 * @param {string} text Raw model response.
 * @returns {string} Cleaned JSON candidate text.
 */
function stripMarkdownFences(text) {
	const trimmed = String(text ?? "").trim();
	const fencedBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

	if (fencedBlockMatch?.[1]) {
		return fencedBlockMatch[1].trim();
	}

	if (!trimmed.startsWith("```")) {
		return trimmed;
	}

	return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

/**
 * Extracts the JSON candidate from a model response that may wrap the
 * object in prose. Returns the trimmed input unchanged when it already
 * starts with "{"; otherwise returns the first balanced "{...}" span, or
 * the trimmed input unchanged when no balanced span exists (so the
 * existing parse-error path fires instead of a new behavior).
 * @param {string} text Raw (fence-stripped) model response.
 * @returns {string} JSON candidate text.
 */
export function extractJsonCandidate(text) {
	const trimmed = String(text ?? "").trim();
	if (!trimmed || trimmed.startsWith("{")) return trimmed;
	const start = trimmed.indexOf("{");
	if (start === -1) return trimmed;
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let i = start; i < trimmed.length; i++) {
		const ch = trimmed[i];
		if (inString) {
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === '"') inString = false;
		} else if (ch === '"') {
			inString = true;
		} else if (ch === "{") {
			depth++;
		} else if (ch === "}") {
			depth--;
			if (depth === 0) return trimmed.slice(start, i + 1);
		}
	}
	return trimmed;
}

/**
 * Validates that AI output is parseable JSON and conforms to the required plan contract.
 * @param {string} responseText Raw AI response text.
 * @returns {{ isValid: boolean, data: object | null, error: string | null }} Validation result.
 */
export function validateAIResponse(responseText) {
	const cleaned = extractJsonCandidate(stripMarkdownFences(responseText));

	let parsed;
	try {
		parsed = JSON.parse(cleaned);
	} catch {
		return {
			isValid: false,
			data: null,
			error: "تعذر تحليل الاستجابة كـ JSON صالح",
		};
	}

	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		return {
			isValid: false,
			data: null,
			error: "الاستجابة ليست كائناً JSON صالحاً",
		};
	}

	const requiredKeys = ["userProfile", "nutritionPlan", "exercisePlan", "balanceIndex", "generatedAt", "planDurationWeeks"];
	const missingKey = requiredKeys.find((key) => !(key in parsed));

	if (missingKey) {
		return {
			isValid: false,
			data: null,
			error: `مفتاح مطلوب مفقود في الاستجابة: ${missingKey}`,
		};
	}

	const nutritionPlan = parsed.nutritionPlan;
	if (!nutritionPlan || typeof nutritionPlan !== "object" || Array.isArray(nutritionPlan)) {
		return {
			isValid: false,
			data: null,
			error: "القسم nutritionPlan غير صالح",
		};
	}

	const meals = nutritionPlan.meals;
	if (!Array.isArray(meals) || meals.length !== 4) {
		return {
			isValid: false,
			data: null,
			error: "يجب أن يحتوي nutritionPlan.meals على 4 وجبات",
		};
	}

	for (const [index, meal] of meals.entries()) {
		if (!meal || typeof meal !== "object" || Array.isArray(meal)) {
			return {
				isValid: false,
				data: null,
				error: `الوجبة ${index + 1} في nutritionPlan.meals غير صالحة`,
			};
		}

		const requiredMealFields = ["name", "time", "ingredients", "calories", "prepTimeMinutes", "recipe"];
		const missingMealField = requiredMealFields.find((field) => !(field in meal));
		if (missingMealField) {
			return {
				isValid: false,
				data: null,
				error: `الوجبة ${index + 1} في nutritionPlan.meals تفتقد الحقل ${missingMealField}`,
			};
		}
	}

	const weeklyPlan = nutritionPlan.weeklyPlan;
	if (!Array.isArray(weeklyPlan) || weeklyPlan.length !== 7) {
		return {
			isValid: false,
			data: null,
			error: "يجب أن يحتوي nutritionPlan.weeklyPlan على 7 أيام",
		};
	}

	for (const [dayIndex, dayPlan] of weeklyPlan.entries()) {
		if (!dayPlan || typeof dayPlan !== "object" || Array.isArray(dayPlan)) {
			return {
				isValid: false,
				data: null,
				error: `اليوم ${dayIndex + 1} في nutritionPlan.weeklyPlan غير صالح`,
			};
		}

		if (!Array.isArray(dayPlan.meals) || dayPlan.meals.length !== 4) {
			return {
				isValid: false,
				data: null,
				error: `اليوم ${dayIndex + 1} في nutritionPlan.weeklyPlan يجب أن يحتوي 4 وجبات`,
			};
		}

		for (const [mealIndex, meal] of dayPlan.meals.entries()) {
			if (!meal || typeof meal !== "object" || Array.isArray(meal)) {
				return {
					isValid: false,
					data: null,
					error: `الوجبة ${mealIndex + 1} في اليوم ${dayIndex + 1} في nutritionPlan.weeklyPlan غير صالحة`,
				};
			}

			const requiredDayMealFields = ["mealType", "name", "time", "ingredients", "calories", "prepTimeMinutes", "recipe"];
			const missingDayMealField = requiredDayMealFields.find((field) => !(field in meal));
			if (missingDayMealField) {
				return {
					isValid: false,
					data: null,
					error: `الوجبة ${mealIndex + 1} في اليوم ${dayIndex + 1} في nutritionPlan.weeklyPlan تفتقد الحقل ${missingDayMealField}`,
				};
			}
		}
	}

	const exercisePlan = parsed.exercisePlan;
	if (!exercisePlan || typeof exercisePlan !== "object" || Array.isArray(exercisePlan)) {
		return {
			isValid: false,
			data: null,
			error: "القسم exercisePlan غير صالح",
		};
	}

	const weeklyWorkouts = exercisePlan.weeklyWorkouts;
	if (!Array.isArray(weeklyWorkouts) || weeklyWorkouts.length < 5) {
		return {
			isValid: false,
			data: null,
			error: "يجب أن يحتوي exercisePlan.weeklyWorkouts على 5 أيام تدريب على الأقل",
		};
	}

	for (const [index, workout] of weeklyWorkouts.entries()) {
		if (!workout || typeof workout !== "object" || Array.isArray(workout)) {
			return {
				isValid: false,
				data: null,
				error: `التدريب ${index + 1} في exercisePlan.weeklyWorkouts غير صالح`,
			};
		}

		const requiredWorkoutFields = ["day", "type", "durationMinutes", "caloriesBurned", "exercises"];
		const missingWorkoutField = requiredWorkoutFields.find((field) => !(field in workout));
		if (missingWorkoutField) {
			return {
				isValid: false,
				data: null,
				error: `التدريب ${index + 1} في exercisePlan.weeklyWorkouts تفتقد الحقل ${missingWorkoutField}`,
			};
		}

		if (!Array.isArray(workout.exercises) || workout.exercises.length === 0) {
			return {
				isValid: false,
				data: null,
				error: `التدريب ${index + 1} في exercisePlan.weeklyWorkouts يجب أن يحتوي على تمارين`,
			};
		}
	}

	const balanceIndex = parsed.balanceIndex;
	if (!balanceIndex || typeof balanceIndex !== "object" || Array.isArray(balanceIndex)) {
		return {
			isValid: false,
			data: null,
			error: "القسم balanceIndex غير صالح",
		};
	}

	if (typeof balanceIndex.score !== "number") {
		return {
			isValid: false,
			data: null,
			error: "القيمة balanceIndex.score مطلوبة ويجب أن تكون رقمية",
		};
	}

	return {
		isValid: true,
		data: parsed,
		error: null,
	};
}
