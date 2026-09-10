/**
 * Nutrition and body-composition calculation utilities.
 *
 * Formula sources:
 * - BMR uses the Mifflin-St Jeor equation for daily basal energy expenditure.
 * - Ideal body weight uses the Devine formula and returns an operational range of +/- 5 kg.
 *
 * These functions are pure and deterministic: they do not mutate inputs
 * or rely on external state.
 */

/** @typedef {import("../types/index.js").UserProfile} UserProfile */

/**
 * Calculates Body Mass Index and classification metadata.
 * @param {number} weight Body weight in kilograms.
 * @param {number} height Body height in centimeters.
 * @returns {{ value: number, category: string, categoryAr: string, color: string }} BMI summary.
 */
export function calculateBMI(weight, height) {
	const heightInMeters = height / 100;
	const bmiValue = weight / (heightInMeters * heightInMeters);
	const value = Number(bmiValue.toFixed(2));

	if (value < 18.5) {
		return {
			value,
			category: "Underweight",
			categoryAr: "نقص الوزن",
			color: "#3b82f6",
		};
	}

	if (value < 25) {
		return {
			value,
			category: "Normal",
			categoryAr: "وزن طبيعي",
			color: "#10b981",
		};
	}

	if (value < 30) {
		return {
			value,
			category: "Overweight",
			categoryAr: "زيادة الوزن",
			color: "#f59e0b",
		};
	}

	return {
		value,
		category: "Obese",
		categoryAr: "سمنة",
		color: "#ef4444",
	};
}

/**
 * Calculates Basal Metabolic Rate using the Mifflin-St Jeor equation.
 * @param {number} weight Body weight in kilograms.
 * @param {number} height Body height in centimeters.
 * @param {number} age Age in years.
 * @param {"male"|"female"} gender Biological sex used by the equation.
 * @returns {number} BMR in kcal/day, rounded to nearest integer.
 */
export function calculateBMR(weight, height, age, gender) {
	const base = 10 * weight + 6.25 * height - 5 * age;
	const bmr = gender === "male" ? base + 5 : base - 161;
	return Math.round(bmr);
}

/**
 * Calculates Total Daily Energy Expenditure from BMR and activity level.
 * @param {number} bmr Basal Metabolic Rate in kcal/day.
 * @param {"sedentary"|"lightly_active"|"moderately_active"|"very_active"} activityLevel Activity category.
 * @returns {number} TDEE in kcal/day, rounded to nearest integer.
 */
export function calculateTDEE(bmr, activityLevel) {
	const multipliers = {
		sedentary: 1.2,
		lightly_active: 1.375,
		moderately_active: 1.55,
		very_active: 1.725,
	};

	const multiplier = multipliers[activityLevel] ?? 1.2;
	return Math.round(bmr * multiplier);
}

/**
 * Calculates recommended daily calories based on goal.
 * @param {number} tdee Total Daily Energy Expenditure in kcal/day.
 * @param {"lose_weight"|"gain_weight"|"improve_mood"|"maintain"} goal User goal.
 * @returns {number} Daily calorie target with a safety floor of 1200 kcal.
 */
export function calculateDailyCalories(tdee, goal) {
	let calories = tdee;

	if (goal === "lose_weight") {
		calories = tdee - 500;
	} else if (goal === "gain_weight") {
		calories = tdee + 400;
	}

	return Math.max(1200, Math.round(calories));
}

/**
 * Calculates macro distribution in grams for protein, carbs, and fat.
 * @param {number} dailyCalories Daily calorie target in kcal.
 * @param {"lose_weight"|"gain_weight"|"improve_mood"|"maintain"} goal User goal.
 * @param {number} weight Body weight in kilograms.
 * @returns {{ proteinGrams: number, carbsGrams: number, fatGrams: number }} Rounded macro gram targets.
 */
export function calculateMacros(dailyCalories, goal, weight) {
	const proteinPerKg =
		goal === "lose_weight" ? 2.2 : goal === "gain_weight" ? 2.0 : 1.6;
	const proteinGramsRaw = proteinPerKg * weight;
	const fatGramsRaw = (dailyCalories * 0.25) / 9;

	const proteinCalories = proteinGramsRaw * 4;
	const fatCalories = fatGramsRaw * 9;
	const carbsCalories = Math.max(dailyCalories - proteinCalories - fatCalories, 0);
	const carbsGramsRaw = carbsCalories / 4;

	return {
		proteinGrams: Math.round(proteinGramsRaw),
		carbsGrams: Math.round(carbsGramsRaw),
		fatGrams: Math.round(fatGramsRaw),
	};
}

/**
 * Calculates daily hydration target in liters.
 * @param {number} weight Body weight in kilograms.
 * @param {"sedentary"|"lightly_active"|"moderately_active"|"very_active"} activityLevel Activity category.
 * @returns {number} Hydration target in liters, rounded to 1 decimal place.
 */
export function calculateHydration(weight, activityLevel) {
	let hydrationLiters = weight * 0.033;

	if (activityLevel === "moderately_active") {
		hydrationLiters += 0.5;
	} else if (activityLevel === "very_active") {
		hydrationLiters += 1.0;
	}

	return Number(hydrationLiters.toFixed(1));
}

/**
 * Calculates ideal body-weight range using the Devine formula.
 * @param {number} height Body height in centimeters.
 * @param {"male"|"female"} gender Biological sex used by the formula.
 * @returns {{ min: number, max: number }} Ideal range in kilograms, rounded.
 */
export function calculateIdealWeightRange(height, gender) {
	const heightInInches = height / 2.54;
	const idealWeight =
		gender === "male"
			? 50 + 2.3 * (heightInInches - 60)
			: 45.5 + 2.3 * (heightInInches - 60);

	return {
		min: Math.round(idealWeight - 5),
		max: Math.round(idealWeight + 5),
	};
}

/**
 * Suggests a target body weight based on goal and ideal range limits.
 * @param {number} currentWeight Current body weight in kilograms.
 * @param {"lose_weight"|"gain_weight"|"improve_mood"|"maintain"} goal User goal.
 * @param {number} height Body height in centimeters.
 * @param {"male"|"female"} gender Biological sex used by the formula.
 * @returns {number} Suggested target weight in kilograms, rounded.
 */
export function getWeightGoalKg(currentWeight, goal, height, gender) {
	const idealRange = calculateIdealWeightRange(height, gender);

	if (goal === "lose_weight") {
		return Math.round(Math.max(currentWeight - 10, idealRange.min));
	}

	if (goal === "gain_weight") {
		return Math.round(Math.min(currentWeight + 10, idealRange.max));
	}

	return Math.round((idealRange.min + idealRange.max) / 2);
}

/**
 * Builds a complete nutrition summary from onboarding profile values.
 * This is the primary orchestrator for onboarding nutrition calculations.
 * @param {UserProfile} userProfile Full user profile payload.
 * @returns {{
 * 	bmi: { value: number, category: string, categoryAr: string, color: string },
 * 	bmr: number,
 * 	tdee: number,
 * 	dailyCalories: number,
 * 	macros: { proteinGrams: number, carbsGrams: number, fatGrams: number },
 * 	hydration: number,
 * 	idealWeightRange: { min: number, max: number },
 * 	targetWeight: number
 * }} Complete nutrition output object.
 */
export function formatNutritionSummary(userProfile) {
	const bmi = calculateBMI(userProfile.weight, userProfile.height);
	const bmr = calculateBMR(
		userProfile.weight,
		userProfile.height,
		userProfile.age,
		userProfile.gender,
	);
	const tdee = calculateTDEE(bmr, userProfile.activityLevel);
	const dailyCalories = calculateDailyCalories(tdee, userProfile.goal);
	const macros = calculateMacros(dailyCalories, userProfile.goal, userProfile.weight);
	const hydration = calculateHydration(userProfile.weight, userProfile.activityLevel);
	const idealWeightRange = calculateIdealWeightRange(userProfile.height, userProfile.gender);
	const targetWeight = getWeightGoalKg(
		userProfile.weight,
		userProfile.goal,
		userProfile.height,
		userProfile.gender,
	);

	return {
		bmi,
		bmr,
		tdee,
		dailyCalories,
		macros,
		hydration,
		idealWeightRange,
		targetWeight,
	};
}

export default formatNutritionSummary;
