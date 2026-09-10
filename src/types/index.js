/**
 * User onboarding profile data used to personalize plans.
 * @typedef {Object} UserProfile
 * @property {number} age User age in years.
 * @property {('male'|'female')} gender User gender value selected during onboarding.
 * @property {number} weight User body weight in kilograms.
 * @property {number} height User height in centimeters.
 * @property {Array<('diabetes'|'hypertension'|'heart_disease'|'hypotension'|'hypothyroidism'|'hyperthyroidism'|'ibs'|'none'|'other')>} healthConditions Selected health conditions.
 * @property {('lose_weight'|'gain_weight'|'improve_mood'|'maintain')} goal Primary wellness goal.
 * @property {Object} mentalState Mental wellness metrics used by the recommendation engine.
 * @property {number} mentalState.stressLevel Stress level score from 1 to 5.
 * @property {number} mentalState.sleepQuality Sleep quality score from 1 to 5.
 * @property {number} mentalState.energyLevel Energy level score from 1 to 5.
 * @property {Object} foodPreferences Food preference settings and restrictions.
 * @property {string[]} foodPreferences.favoriteFoods Preferred foods the user enjoys.
 * @property {string[]} foodPreferences.forbiddenFoods Foods the user avoids.
 * @property {string[]} foodPreferences.allergies Allergens reported by the user.
 * @property {('omnivore'|'vegetarian'|'vegan'|'keto')} foodPreferences.dietType Preferred dietary pattern.
 * @property {('sedentary'|'lightly_active'|'moderately_active'|'very_active')} activityLevel Baseline activity level.
 * @property {Array<('home'|'gym'|'outdoor'|'none')>} availableEquipment Available workout environment or equipment.
 */

/**
 * A single meal entry inside a daily or weekly nutrition plan.
 * @typedef {Object} Meal
 * @property {('breakfast'|'lunch'|'dinner'|'snack')} [mealType] Meal type key used for section mapping.
 * @property {string} name Meal name.
 * @property {string} time Recommended meal time.
 * @property {string[]} ingredients Ingredient list used for the meal.
 * @property {number} calories Calories for the meal.
 * @property {number} prepTimeMinutes Preparation time in minutes.
 * @property {string} recipe Recipe or preparation instructions.
 */

/**
 * Nutrition details for a single day.
 * @typedef {Object} DayPlan
 * @property {string} day Weekday name or day identifier.
 * @property {Meal[]} meals Meals scheduled for the day.
 * @property {number} totalCalories Total daily calories from all meals.
 */

/**
 * Generated nutrition targets and meal schedule.
 * @typedef {Object} NutritionPlan
 * @property {number} dailyCalories Recommended calories per day.
 * @property {number} proteinGrams Daily protein target in grams.
 * @property {number} carbsGrams Daily carbohydrates target in grams.
 * @property {number} fatGrams Daily fat target in grams.
 * @property {Meal[]} meals Core meal suggestions.
 * @property {DayPlan[]} weeklyPlan Day-by-day nutrition breakdown.
 * @property {number} hydrationLiters Daily hydration target in liters.
 */

/**
 * A single exercise item within a workout.
 * @typedef {Object} Exercise
 * @property {string} name Exercise name.
 * @property {number} sets Number of sets.
 * @property {string} reps Repetition prescription (for example "10-12" or "30 sec").
 * @property {number} restSeconds Rest duration between sets in seconds.
 * @property {string} description Exercise form or guidance text.
 * @property {('beginner'|'intermediate'|'advanced')} difficulty Difficulty level.
 */

/**
 * One workout session in the weekly exercise plan.
 * @typedef {Object} Workout
 * @property {string} day Weekday assigned for the workout.
 * @property {string} type Workout category (for example strength, cardio, mobility).
 * @property {Exercise[]} exercises Ordered exercise list.
 * @property {number} durationMinutes Estimated session duration in minutes.
 * @property {number} caloriesBurned Estimated calories burned.
 */

/**
 * Generated exercise recommendations and movement targets.
 * @typedef {Object} ExercisePlan
 * @property {Workout[]} weeklyWorkouts Planned workouts for the week.
 * @property {number} dailyStepsGoal Target number of steps per day.
 * @property {number} activeMinutesGoal Target active minutes per day.
 */

/**
 * Composite wellness score derived from nutrition, mental health, and activity.
 * @typedef {Object} BalanceIndex
 * @property {number} score Overall balance score from 0 to 100.
 * @property {number} nutritionScore Nutrition-specific score.
 * @property {number} mentalScore Mental wellness score.
 * @property {number} activityScore Activity and fitness score.
 * @property {string[]} insights Key observations generated for the user.
 * @property {string[]} recommendations Actionable recommendations to improve balance.
 */

/**
 * Full generated AI plan payload returned to the application.
 * @typedef {Object} GeneratedPlan
 * @property {UserProfile} userProfile Original onboarding profile used for generation.
 * @property {NutritionPlan} nutritionPlan Generated nutrition plan details.
 * @property {ExercisePlan} exercisePlan Generated exercise plan details.
 * @property {BalanceIndex} balanceIndex Computed health balance index and guidance.
 * @property {string} generatedAt ISO date-time string for when the plan was generated.
 * @property {number} planDurationWeeks Number of weeks covered by the plan.
 */

/**
 * Generic API response state wrapper used by UI data-fetching flows.
 * @typedef {Object} ApiResponse
 * @property {*} data Response payload of any shape.
 * @property {boolean} loading Whether the request is currently loading.
 * @property {(string|null)} error Error message when a request fails, otherwise null.
 */

/**
 * Shared platform constants for form options, labels, and display metadata.
 */
export const CONSTANTS = {
	GOALS: [
		{
			value: "lose_weight",
			labelAr: "خسارة الوزن",
			labelEn: "Lose Weight",
			icon: "scale",
		},
		{
			value: "gain_weight",
			labelAr: "زيادة الوزن",
			labelEn: "Gain Weight",
			icon: "trending-up",
		},
		{
			value: "improve_mood",
			labelAr: "تحسين المزاج",
			labelEn: "Improve Mood",
			icon: "smile",
		},
		{
			value: "maintain",
			labelAr: "الحفاظ على التوازن",
			labelEn: "Maintain",
			icon: "shield",
		},
	],

	ACTIVITY_LEVELS: [
		{
			value: "sedentary",
			labelAr: "خامل",
			labelEn: "Sedentary",
			icon: "sofa",
		},
		{
			value: "lightly_active",
			labelAr: "نشاط خفيف",
			labelEn: "Lightly Active",
			icon: "footprints",
		},
		{
			value: "moderately_active",
			labelAr: "نشاط متوسط",
			labelEn: "Moderately Active",
			icon: "bike",
		},
		{
			value: "very_active",
			labelAr: "نشاط عالٍ",
			labelEn: "Very Active",
			icon: "dumbbell",
		},
	],

	DIET_TYPES: [
		{
			value: "omnivore",
			labelAr: "متنوع",
			labelEn: "Omnivore",
			icon: "utensils",
		},
		{
			value: "vegetarian",
			labelAr: "نباتي",
			labelEn: "Vegetarian",
			icon: "leaf",
		},
		{
			value: "vegan",
			labelAr: "نباتي صرف",
			labelEn: "Vegan",
			icon: "sprout",
		},
		{
			value: "keto",
			labelAr: "كيتو",
			labelEn: "Keto",
			icon: "flame",
		},
	],

	HEALTH_CONDITIONS: [
		{
			value: "diabetes",
			labelAr: "السكري",
			labelEn: "Diabetes",
			icon: "activity",
		},
		{
			value: "hypertension",
			labelAr: "ضغط الدم",
			labelEn: "Hypertension",
			icon: "heart-pulse",
		},
		{
			value: "heart_disease",
			labelAr: "أمراض القلب",
			labelEn: "Heart disease",
			icon: "heart-pulse",
		},
		{
			value: "hypotension",
			labelAr: "انخفاض ضغط الدم",
			labelEn: "Hypotension",
			icon: "heart",
		},
		{
			value: "hypothyroidism",
			labelAr: "قصور الغدة الدرقية",
			labelEn: "Hypothyroidism",
			icon: "activity",
		},
		{
			value: "hyperthyroidism",
			labelAr: "فرط نشاط الغدة الدرقية",
			labelEn: "Hyperthyroidism",
			icon: "activity",
		},
		{
			value: "ibs",
			labelAr: "القولون العصبي",
			labelEn: "IBS",
			icon: "activity",
		},
		{
			value: "none",
			labelAr: "لا يوجد",
			labelEn: "None",
			icon: "check-circle",
		},
		{
			value: "other",
			labelAr: "أخرى",
			labelEn: "Other",
			icon: "plus-circle",
		},
	],

	STRESS_LABELS: ["مريح جداً", "مريح", "متوازن", "متوتر", "متوتر جداً"],

	SLEEP_LABELS: ["ممتاز", "جيد جداً", "جيد", "ضعيف", "سيء جداً"],

	ENERGY_LABELS: [
		"طاقة عالية جداً",
		"طاقة عالية",
		"طاقة متوسطة",
		"طاقة منخفضة",
		"إرهاق شديد",
	],
};
