import axios from "axios";
import apiClient from "./apiClient.js";
import toast from "react-hot-toast";
import { calculateBalanceIndex } from "../utils/balanceIndex.js";
import { formatNutritionSummary } from "../utils/nutritionCalculator.js";

/**
 * The client talks ONLY to the Vercel serverless proxy (/api/generate-plan).
 * The Gemini key never reaches the browser bundle — it lives on the server
 * as GEMINI_API_KEY.
 */
const AI_CONFIG = {
	apiUrl: "/api/generate-plan",
};

const MEAL_TYPE_LABELS = {
	breakfast: "فطور",
	lunch: "غداء",
	dinner: "عشاء",
	snack: "سناك",
};

const DEFAULT_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const DEFAULT_WEEKDAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

/**
 * Normalizes a single meal object into the shared UI contract.
 * @param {unknown} meal Meal payload from AI or mock data.
 * @param {string} fallbackMealType Meal type fallback.
 * @param {string} fallbackName Fallback name for empty values.
 * @returns {import("../types/index.js").Meal}
 */
function normalizeMealShape(meal, fallbackMealType, fallbackName) {
	const resolvedMealType = DEFAULT_MEAL_TYPES.includes(fallbackMealType)
		? fallbackMealType
		: "snack";

	if (typeof meal === "string") {
		return {
			mealType: resolvedMealType,
			name: meal,
			time: "--:--",
			ingredients: [],
			calories: 0,
			prepTimeMinutes: 0,
			recipe: "لا تتوفر طريقة تحضير لهذه الوجبة حالياً.",
		};
	}

	const normalized = meal && typeof meal === "object" ? meal : {};
	const ingredients = Array.isArray(normalized.ingredients)
		? normalized.ingredients.map((item) => String(item)).filter(Boolean)
		: [];

	return {
		mealType: typeof normalized.mealType === "string" && DEFAULT_MEAL_TYPES.includes(normalized.mealType)
			? normalized.mealType
			: resolvedMealType,
		name: typeof normalized.name === "string" && normalized.name.trim()
			? normalized.name
			: fallbackName,
		time: typeof normalized.time === "string" && normalized.time.trim()
			? normalized.time
			: "--:--",
		ingredients,
		calories: Number.isFinite(Number(normalized.calories)) ? Number(normalized.calories) : 0,
		prepTimeMinutes: Number.isFinite(Number(normalized.prepTimeMinutes))
			? Number(normalized.prepTimeMinutes)
			: 0,
		recipe: typeof normalized.recipe === "string" && normalized.recipe.trim()
			? normalized.recipe
			: "لا تتوفر طريقة تحضير لهذه الوجبة حالياً.",
	};
}

/**
 * Normalizes a generated plan into the same contract expected by the UI and validators.
 * @param {Partial<import("../types/index.js").GeneratedPlan> & { nutritionPlan?: any, exercisePlan?: any }} plan
 * @param {import("../types/index.js").UserProfile} fallbackUserProfile
 * @returns {import("../types/index.js").GeneratedPlan}
 */
function normalizeGeneratedPlanShape(plan, fallbackUserProfile) {
	const nutritionPlan = plan?.nutritionPlan && typeof plan.nutritionPlan === "object"
		? plan.nutritionPlan
		: {};
	const exercisePlan = plan?.exercisePlan && typeof plan.exercisePlan === "object"
		? plan.exercisePlan
		: {};

	const normalizedMeals = DEFAULT_MEAL_TYPES.map((mealType, index) => {
		const sourceMeal = Array.isArray(nutritionPlan.meals) ? nutritionPlan.meals[index] : null;
		return normalizeMealShape(
			sourceMeal,
			mealType,
			`${MEAL_TYPE_LABELS[mealType] ?? "وجبة"} أساسية`,
		);
	});

	const normalizedWeeklyPlan = DEFAULT_WEEKDAYS.map((dayLabel, index) => {
		const sourceDay = Array.isArray(nutritionPlan.weeklyPlan)
			? nutritionPlan.weeklyPlan[index]
			: null;
		const sourceMeals = Array.isArray(sourceDay?.meals) ? sourceDay.meals : [];
		const meals = DEFAULT_MEAL_TYPES.map((mealType, mealIndex) => {
			const matchingMeal = sourceMeals.find((candidate) => candidate?.mealType === mealType)
				?? sourceMeals[mealIndex]
				?? normalizedMeals[mealIndex];
			return normalizeMealShape(
				matchingMeal,
				mealType,
				`${MEAL_TYPE_LABELS[mealType] ?? "وجبة"} ${dayLabel}`,
			);
		});

		return {
			day: typeof sourceDay?.day === "string" && sourceDay.day.trim() ? sourceDay.day : dayLabel,
			meals,
			totalCalories: Number.isFinite(Number(sourceDay?.totalCalories))
				? Number(sourceDay.totalCalories)
				: Number(nutritionPlan.dailyCalories ?? 0),
		};
	});

	const normalizedWorkoutEntries = Array.isArray(exercisePlan.weeklyWorkouts)
		? exercisePlan.weeklyWorkouts.map((workout, index) => ({
			day: typeof workout?.day === "string" && workout.day.trim() ? workout.day : DEFAULT_WEEKDAYS[index] ?? "السبت",
			type: typeof workout?.type === "string" && workout.type.trim() ? workout.type : "تمرين",
			durationMinutes: Number.isFinite(Number(workout?.durationMinutes)) ? Number(workout.durationMinutes) : 30,
			caloriesBurned: Number.isFinite(Number(workout?.caloriesBurned)) ? Number(workout.caloriesBurned) : 180,
			exercises: Array.isArray(workout?.exercises) ? workout.exercises.map((exercise) => ({
				name: typeof exercise?.name === "string" ? exercise.name : "تمرين",
				sets: Number.isFinite(Number(exercise?.sets)) ? Number(exercise.sets) : 1,
				reps: typeof exercise?.reps === "string" && exercise.reps.trim() ? exercise.reps : "10",
				restSeconds: Number.isFinite(Number(exercise?.restSeconds)) ? Number(exercise.restSeconds) : 30,
				description: typeof exercise?.description === "string" && exercise.description.trim()
					? exercise.description
					: "تمرين متوازن ومناسب لخطتك الصحية.",
				difficulty: typeof exercise?.difficulty === "string" && exercise.difficulty.trim()
					? exercise.difficulty
					: "beginner",
			})) : [],
		}))
		: [
			{
				day: "السبت",
				type: "تمرين",
				durationMinutes: 30,
				caloriesBurned: 180,
				exercises: [
					{
						name: "مشي خفيف",
						sets: 1,
						reps: "20 دقيقة",
						restSeconds: 30,
						description: "تمرين لطيف يناسب بداية الخطة.",
						difficulty: "beginner",
					},
				],
			},
		];

	return {
		userProfile: fallbackUserProfile ?? plan?.userProfile ?? null,
		nutritionPlan: {
			dailyCalories: Number(nutritionPlan.dailyCalories ?? 0),
			proteinGrams: Number(nutritionPlan.proteinGrams ?? 0),
			carbsGrams: Number(nutritionPlan.carbsGrams ?? 0),
			fatGrams: Number(nutritionPlan.fatGrams ?? 0),
			hydrationLiters: Number(nutritionPlan.hydrationLiters ?? 0),
			meals: normalizedMeals,
			weeklyPlan: normalizedWeeklyPlan,
		},
		exercisePlan: {
			weeklyWorkouts: normalizedWorkoutEntries,
			dailyStepsGoal: Number(exercisePlan.dailyStepsGoal ?? 0),
			activeMinutesGoal: Number(exercisePlan.activeMinutesGoal ?? 0),
		},
		balanceIndex: plan?.balanceIndex ?? null,
		generatedAt: typeof plan?.generatedAt === "string" ? plan.generatedAt : new Date().toISOString(),
		planDurationWeeks: Number.isFinite(Number(plan?.planDurationWeeks))
			? Number(plan.planDurationWeeks)
			: 4,
	};
}

/**
 * Builds an Error object enriched with optional HTTP status code metadata.
 * @param {string} message User-facing Arabic error message.
 * @param {number} [statusCode] HTTP status code when available.
 * @returns {Error & { statusCode?: number }}
 */
function createServiceError(message, statusCode) {
	const error = /** @type {Error & { statusCode?: number }} */ (new Error(message));

	if (typeof statusCode === "number") {
		error.statusCode = statusCode;
	}

	return error;
}

/**
 * Generates a personalized health plan by calling the Vercel serverless proxy,
 * which forwards the request to Gemini with the server-side API key.
 * @param {import("../types/index.js").UserProfile} userProfile
 * @param {{
 * 	bmi: { value: number, categoryAr: string },
 * 	dailyCalories: number,
 * 	macros: { proteinGrams: number, carbsGrams: number, fatGrams: number },
 * 	hydration: number
 * }} nutritionSummary
 * @returns {Promise<import("../types/index.js").GeneratedPlan>}
 */
export async function generateHealthPlan(userProfile, nutritionSummary) {
	const resolvedNutritionSummary = nutritionSummary ?? formatNutritionSummary(userProfile);

	try {
		const response = await apiClient.post(
			AI_CONFIG.apiUrl,
			{
				userProfile,
				nutritionSummary: resolvedNutritionSummary,
			},
			{
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		const payload = response.data;

		if (!payload || payload.ok !== true || !payload.data) {
			const statusCode = Number(payload?.error?.statusCode);
			throw createServiceError(
				payload?.error?.message ?? "استجابة غير صالحة من الخادم",
				Number.isFinite(statusCode) && statusCode > 0 ? statusCode : undefined,
			);
		}

		const parsedData = payload.data;
		const localBalanceIndex = calculateBalanceIndex(userProfile);
		const fullPlan = normalizeGeneratedPlanShape(
			{
				...parsedData,
				balanceIndex: localBalanceIndex,
				generatedAt: new Date().toISOString(),
				planDurationWeeks: 4,
				userProfile,
			},
			userProfile,
		);
		return fullPlan;
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const statusCode = error.response?.status;

			if (!error.response) {
				throw createServiceError("لا يوجد اتصال بالإنترنت — تحقق من شبكتك");
			}

			if (statusCode === 401 || statusCode === 403) {
				// Provider-scoped on purpose: this endpoint authenticates the
				// user optionally and never emits 401 itself, so a 401/403
				// here means the AI provider rejected the server key — NOT
				// an expired user session. Never clear the session here.
				throw createServiceError("فشل التحقق من مزود الذكاء الاصطناعي — تحقق من إعدادات الخادم", statusCode);
			}

			if (statusCode === 400) {
				throw createServiceError(
					"تم رفض الطلب — تحقق من البيانات المُرسلة",
					statusCode,
				);
			}

			if (statusCode === 429) {
				if (import.meta.env.DEV) {
					console.warn("⚠️ Rate limit reached — switching to mock service");
					// استخدام Mock Service تلقائياً مع إشعار واضح (بيئة تطوير فقط)
					toast("جاري استخدام البيانات التجريبية مؤقتاً", {
						icon: "⚠️",
						style: { background: "#fef3c7", color: "#92400e" },
					});
					return generateHealthPlanMock(userProfile, nutritionSummary);
				}

				throw createServiceError("تم تجاوز حد الطلبات — حاول لاحقاً", statusCode);
			}

			if (typeof statusCode === "number" && statusCode >= 500) {
				throw createServiceError("خطأ في خادم الذكاء الاصطناعي — حاول لاحقاً", statusCode);
			}

			throw createServiceError(error.message, statusCode);
		}

		if (error instanceof Error && "statusCode" in error) {
			throw error;
		}

		if (error instanceof Error) {
			throw createServiceError(error.message);
		}

		throw createServiceError(String(error));
	}
}

/**
 * Development mock that simulates AI output when no API key is configured.
 * @param {import("../types/index.js").UserProfile} userProfile
 * @param {{
 * 	bmi: { value: number, categoryAr: string },
 * 	dailyCalories: number,
 * 	macros: { proteinGrams: number, carbsGrams: number, fatGrams: number },
 * 	hydration: number
 * }} nutritionSummary
 * @returns {Promise<import("../types/index.js").GeneratedPlan>}
 */
export const generateHealthPlanMock = async (userProfile, nutritionSummary) => {
	await new Promise((resolve) => {
		setTimeout(resolve, 1800);
	});
	console.warn("⚠️ Using DYNAMIC Mock — personalized to userProfile");

	const {
		dailyCalories: rawDailyCalories,
		macros = {},
		hydration: rawHydration,
	} = nutritionSummary ?? {};
	const {
		goal,
		healthConditions,
		foodPreferences,
		activityLevel,
		mentalState,
	} = userProfile ?? {};

	const dailyCaloriesValue = Number(rawDailyCalories);
	const dailyCalories = Number.isFinite(dailyCaloriesValue)
		? Math.round(dailyCaloriesValue)
		: 2100;
	const hydrationValue = Number(rawHydration);
	const hydration = Number.isFinite(hydrationValue) ? hydrationValue : 2.5;
	const safeHealthConditions = Array.isArray(healthConditions) ? healthConditions : [];
	const safeFoodPreferences = foodPreferences ?? {};
	const safeMentalState = mentalState ?? {};
	const safeGoal = goal ?? "maintain";
	const safeActivityLevel = activityLevel ?? "lightly_active";

	const hasDiabetes = safeHealthConditions.includes("diabetes");
	const hasHypertension = safeHealthConditions.includes("hypertension");
	const hasHeartDisease = safeHealthConditions.includes("heart_disease");
	const hasHypotension = safeHealthConditions.includes("hypotension");
	const hasIbs = safeHealthConditions.includes("ibs");
	const dietType = safeFoodPreferences.dietType ?? "omnivore";
	const isVegetarian = ["vegetarian", "vegan"].includes(dietType);
	const isVegan = dietType === "vegan";
	const isKeto = dietType === "keto";
	const stressLevel = Number(safeMentalState?.stressLevel);
	const energyLevel = Number(safeMentalState?.energyLevel);
	const isHighStress = Number.isFinite(stressLevel) ? stressLevel >= 4 : false;
	const isLowEnergy = Number.isFinite(energyLevel) ? energyLevel <= 2 : false;

	const forbiddenFoods = Array.isArray(safeFoodPreferences?.forbiddenFoods)
		? safeFoodPreferences.forbiddenFoods
		: [];
	const allergies = Array.isArray(safeFoodPreferences?.allergies)
		? safeFoodPreferences.allergies
		: [];
	const favoriteFoods = Array.isArray(safeFoodPreferences?.favoriteFoods)
		? safeFoodPreferences.favoriteFoods
		: [];
	const forbiddenNormalized = [...forbiddenFoods, ...allergies]
		.map((item) => String(item ?? "").trim().toLowerCase())
		.filter(Boolean);
	const disallowedKeywords = [];

	if (isVegetarian) {
		disallowedKeywords.push("دجاج", "لحم", "سمك", "تونة", "سلمون");
	}

	if (isVegan) {
		disallowedKeywords.push("بيض", "جبن", "لبن", "حليب", "زبادي");
	}

	if (isKeto) {
		disallowedKeywords.push(
			"أرز",
			"خبز",
			"مكرونة",
			"معكرونة",
			"باستا",
			"شوفان",
			"فواكه",
			"موز",
			"تفاح",
			"عنب",
			"برتقال",
			"بطاطا",
		);
	}

	if (hasDiabetes) {
		disallowedKeywords.push("أرز أبيض", "خبز أبيض", "سكر", "عصير");
	}

	if (hasHypertension) {
		disallowedKeywords.push("لانشون", "نقانق", "مرتديلا", "معلبات", "معلب", "ملح");
	}

	if (hasHeartDisease) {
	  disallowedKeywords.push("لحوم مصنعة", "دهون متحولة", "مقالي", "مشروبات محلاة");
	}

	if (hasIbs) {
	  disallowedKeywords.push("بصل", "ثوم", "فطر", "قرنبيط");
	}

	const normalizedDisallowed = disallowedKeywords.map((item) => item.toLowerCase());
	const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

	const isAllowedItem = (item) => {
		const normalized = normalizeText(item);

		if (!normalized) {
			return false;
		}

		if (forbiddenNormalized.some((forbidden) => normalized.includes(forbidden))) {
			return false;
		}

		return !normalizedDisallowed.some((keyword) => normalized.includes(keyword));
	};

	const basePool = [
		"خضار ورقية",
		"سبانخ",
		"بروكلي",
		"كوسا",
		"فلفل ملون",
		"خيار",
		"طماطم",
		"جزر",
		"زيت زيتون",
		"ليمون",
		"أعشاب طازجة",
		"حمص",
		"عدس",
		"فاصوليا",
		"توفو",
	];

	favoriteFoods.forEach((food) => {
	  if (typeof food === "string" && food.trim()) {
	    basePool.unshift(food.trim());
	  }
	});

	if (!isVegan) {
		basePool.push("بيض", "لبن يوناني", "جبن قريش");
	}

	if (!isVegetarian) {
		basePool.push("صدر دجاج مشوي", "سمك مشوي", "تونة");
	}

	if (!isKeto) {
		basePool.push("أرز بني", "خبز قمح كامل", "شوفان", "بطاطا حلوة", "برغل");
	}

	if (hasHypertension) {
		if (!isKeto) {
			basePool.push("موز");
		}

		basePool.push("سبانخ", "بطاطا حلوة");
	}

	if (hasDiabetes) {
		basePool.push("خضار غير نشوية", "عدس", "حمص");
	}

	if (isHighStress) {
		basePool.push("لوز", "شوكولاتة داكنة 85%");
	}

	if (isLowEnergy) {
		basePool.push("سبانخ", "عدس");
		basePool.push(isVegan ? "حبوب مدعمة بفيتامين B12" : "بيض");
		if (!isVegetarian) {
			basePool.push("كبدة دجاج");
		}
	}

	if (safeGoal === "gain_weight") {
		basePool.push("أفوكادو", "مكسرات", "زبدة الفول السوداني");
	}

	if (safeGoal === "lose_weight") {
		basePool.push("بذور شيا", "خضار غير نشوية");
	}

	const pickFirstAllowed = (options) => options.find((item) => isAllowedItem(item)) ?? null;
	const magnesiumFoods = ["سبانخ", "لوز", "شوكولاتة داكنة 85%"];
	const energyFoods = [];

	energyFoods.push("عدس", "سبانخ");

	if (!isVegan) {
		energyFoods.push("بيض");
	}

	if (!isVegetarian) {
		energyFoods.push("كبدة دجاج");
	}

	if (isVegan) {
		energyFoods.push("حبوب مدعمة بفيتامين B12");
	}

	const ensureSpecialItem = (ingredients, candidates) => {
		if (!candidates.length) {
			return;
		}

		const hasCandidate = ingredients.some((item) =>
			candidates.some((candidate) => normalizeText(item).includes(normalizeText(candidate))),
		);

		if (hasCandidate) {
			return;
		}

		const candidate = candidates.find((item) => isAllowedItem(item));

		if (!candidate) {
			return;
		}

		if (ingredients.length < 6) {
			ingredients.push(candidate);
			return;
		}

		ingredients[ingredients.length - 1] = candidate;
	};

	const buildIngredients = (baseIngredients) => {
		const unique = [];

		const addItem = (item) => {
			if (!item || !isAllowedItem(item)) {
				return;
			}

			if (!unique.includes(item)) {
				unique.push(item);
			}
		};

		baseIngredients.forEach(addItem);
		basePool.forEach(addItem);

		if (isHighStress) {
			ensureSpecialItem(unique, magnesiumFoods);
		}

		if (isLowEnergy) {
			ensureSpecialItem(unique, energyFoods);
		}

		while (unique.length < 5) {
			addItem("خضار ورقية");
			addItem("زيت زيتون");
			addItem("خيار");
		}

		return unique.slice(0, 6);
	};

	const recipeNotes = [];

	if (hasDiabetes) {
		recipeNotes.push("(مناسب لمرضى السكري — منخفض المؤشر الجلايسيمي)");
	}

	if (hasHypertension) {
		recipeNotes.push("(مناسب لضغط الدم — منخفض الصوديوم)");
	}

	if (isHighStress) {
		recipeNotes.push("(غني بالمغنيسيوم — يساعد في تخفيف التوتر)");
	}

	if (isLowEnergy) {
		recipeNotes.push("(يرفع الطاقة)");
	}

	const MEAL_LABELS = {
		breakfast: "فطور",
		lunch: "غداء",
		dinner: "عشاء",
		snack: "سناك",
	};

	const buildRecipe = (mealType, ingredients) => {
		const [first, second, third, fourth, fifth] = ingredients;
		let firstSentence = "";
		let secondSentence = "";

		if (mealType === "breakfast") {
			firstSentence = `حضّر ${first} مع ${second} و${third} حتى تتجانس النكهات.`;
			secondSentence = `قدّم الوجبة مع ${fourth} و${fifth} لبداية متوازنة لليوم.`;
		} else if (mealType === "lunch") {
			firstSentence = `اطهُ ${first} مع ${second} وأضف ${third} لتعزيز الألياف.`;
			secondSentence = `استخدم ${fourth} و${fifth} لرفع الجودة الغذائية دون دهون زائدة.`;
		} else if (mealType === "dinner") {
			firstSentence = `حضّر ${first} مع ${second} و${third} بكمية زيت قليلة.`;
			secondSentence = `قدّم الوجبة مع ${fourth} و${fifth} لعشاء خفيف ومشبع.`;
		} else {
			firstSentence = `اجمع ${first} مع ${second} و${third} لوجبة خفيفة متوازنة.`;
			secondSentence = `أضف ${fourth} و${fifth} لتعزيز الشبع والطاقة.`;
		}

		let recipe = `${firstSentence} ${secondSentence}`.trim();

		if (recipeNotes.length) {
			recipe = `${recipe} ${recipeNotes.join(" ")}`;
		}

		return recipe;
	};

	const calorieSplit = {
		breakfast: 0.25,
		lunch: 0.35,
		dinner: 0.3,
		snack: 0.1,
	};

	const buildMeal = (mealType, time, baseIngredients, prepTimeMinutes) => {
		const ingredients = buildIngredients(baseIngredients);
		const calories = Math.round(dailyCalories * (calorieSplit[mealType] ?? 0.25));
		const nameBase = `${MEAL_LABELS[mealType] ?? "وجبة"} ${ingredients[0]} مع ${ingredients[1]}`;

		return {
			mealType,
			name: nameBase,
			time,
			ingredients,
			calories,
			prepTimeMinutes,
			recipe: buildRecipe(mealType, ingredients),
		};
	};

	const breakfastA = buildMeal(
		"breakfast",
		"08:00",
		[
			pickFirstAllowed(isKeto ? ["بيض", "توفو"] : ["شوفان", "خبز قمح كامل", "توفو"]),
			pickFirstAllowed(
				isVegan ? ["حليب نباتي مدعم", "توفو"] : ["لبن يوناني", "بيض", "جبن قريش"],
			),
			pickFirstAllowed(["لوز", "جوز", "بذور شيا"]),
			pickFirstAllowed(isKeto ? ["أفوكادو", "سبانخ"] : ["توت", "تفاح", "سبانخ"]),
			pickFirstAllowed(["قرفة", "بذور كتان", "زيت زيتون"]),
		],
		12,
	);

	const breakfastB = buildMeal(
		"breakfast",
		"09:00",
		[
			pickFirstAllowed(isKeto ? ["بيض", "توفو"] : ["بيض", "خبز قمح كامل", "توفو"]),
			pickFirstAllowed(isKeto ? ["أفوكادو", "سبانخ"] : ["أفوكادو", "طماطم"]),
			pickFirstAllowed(["خيار", "فلفل ملون", "سبانخ"]),
			pickFirstAllowed(isVegan ? ["زيت زيتون", "بذور كتان"] : ["زيت زيتون", "جبن قريش"]),
			pickFirstAllowed(["أعشاب طازجة", "ليمون"]),
		],
		10,
	);

	const breakfastC = buildMeal(
		"breakfast",
		"07:30",
		[
			pickFirstAllowed(isVegan ? ["توفو"] : ["بيض", "توفو"]),
			pickFirstAllowed(["فطر", "سبانخ"]),
			pickFirstAllowed(["طماطم", "فلفل ملون"]),
			pickFirstAllowed(isVegan ? ["زيت زيتون"] : ["جبن قريش", "زيت زيتون"]),
			pickFirstAllowed(["خيار", "أعشاب طازجة"]),
		],
		15,
	);

	const lunchA = buildMeal(
		"lunch",
		"14:00",
		[
			pickFirstAllowed(
				isVegetarian
					? ["حمص", "عدس", "توفو"]
					: ["صدر دجاج مشوي", "سمك مشوي", "تونة"],
			),
			pickFirstAllowed(isKeto ? ["خضار ورقية", "أفوكادو"] : ["أرز بني", "برغل", "بطاطا حلوة"]),
			pickFirstAllowed(["سلطة خضراء", "بروكلي", "سبانخ"]),
			pickFirstAllowed(["زيت زيتون", "ليمون"]),
			pickFirstAllowed(["خيار", "طماطم"]),
		],
		25,
	);

	const lunchB = buildMeal(
		"lunch",
		"15:00",
		[
			pickFirstAllowed(isVegetarian ? ["عدس مطهو", "حمص"] : ["سمك مشوي", "صدر دجاج مشوي"]),
			pickFirstAllowed(isKeto ? ["كوسا", "فلفل ملون"] : ["بطاطا حلوة", "أرز بني"]),
			pickFirstAllowed(["سبانخ", "طماطم"]),
			pickFirstAllowed(["زيت زيتون", "ليمون"]),
			pickFirstAllowed(["أعشاب طازجة", "خضار ورقية"]),
		],
		30,
	);

	const lunchC = buildMeal(
		"lunch",
		"13:30",
		[
			pickFirstAllowed(
				isVegetarian
					? ["فاصوليا", "حمص", "توفو"]
					: ["سمك مشوي", "صدر دجاج مشوي"],
			),
			pickFirstAllowed(isKeto ? ["قرنبيط", "خضار ورقية"] : ["برغل", "أرز بني"]),
			pickFirstAllowed(["كوسا", "جزر", "بروكلي"]),
			pickFirstAllowed(["زيت زيتون", "ليمون"]),
			pickFirstAllowed(["أعشاب طازجة", "خيار"]),
		],
		28,
	);

	const dinnerA = buildMeal(
		"dinner",
		"20:00",
		[
			pickFirstAllowed(["شوربة خضار", "خضار ورقية"]),
			pickFirstAllowed(
				isVegetarian ? ["حمص", "توفو"] : ["صدر دجاج مشوي", "سمك مشوي", "تونة"],
			),
			pickFirstAllowed(["سبانخ", "خضار ورقية"]),
			pickFirstAllowed(isKeto ? ["أفوكادو", "زيت زيتون"] : ["زيت زيتون", "ليمون"]),
			pickFirstAllowed(["خيار", "طماطم"]),
		],
		18,
	);

	const dinnerB = buildMeal(
		"dinner",
		"21:00",
		[
			pickFirstAllowed(isVegetarian ? ["توفو", "حمص"] : ["تونة", "سمك مشوي"]),
			pickFirstAllowed(["أفوكادو", "سلطة خس"]),
			pickFirstAllowed(["خيار", "طماطم"]),
			pickFirstAllowed(["زيت زيتون", "ليمون"]),
			pickFirstAllowed(["بقدونس", "أعشاب طازجة"]),
		],
		20,
	);

	const dinnerC = buildMeal(
		"dinner",
		"19:30",
		[
			pickFirstAllowed(isVegan ? ["توفو"] : ["بيض", "توفو"]),
			pickFirstAllowed(["فطر", "سبانخ"]),
			pickFirstAllowed(["طماطم", "فلفل ملون"]),
			pickFirstAllowed(isVegan ? ["زيت زيتون"] : ["جبن قريش", "زيت زيتون"]),
			pickFirstAllowed(["خيار", "أعشاب طازجة"]),
		],
		15,
	);

	const snackA = buildMeal(
		"snack",
		"17:30",
		[
			pickFirstAllowed(
				isVegan ? ["حليب نباتي مدعم", "مكسرات مشكلة"] : ["لبن رائب", "مكسرات مشكلة"],
			),
			pickFirstAllowed(isKeto ? ["أفوكادو", "لوز"] : ["تفاح", "توت"]),
			pickFirstAllowed(["بذور شيا", "قرفة"]),
			pickFirstAllowed(["جوز", "لوز"]),
			pickFirstAllowed(["خيار", "جزر"]),
		],
		8,
	);

	const snackB = buildMeal(
		"snack",
		"10:30",
		[
			pickFirstAllowed(isKeto ? ["جبن قريش", "توفو"] : ["حمص مهروس", "لبن يوناني"]),
			pickFirstAllowed(["خضار مقطعة", "خيار", "جزر"]),
			pickFirstAllowed(["زيت زيتون", "ليمون"]),
			pickFirstAllowed(["فلفل ملون", "طماطم"]),
			pickFirstAllowed(["أعشاب طازجة", "سمسم"]),
		],
		7,
	);

	const mealVariants = {
		breakfast: [breakfastA, breakfastB, breakfastC],
		lunch: [lunchA, lunchB, lunchC],
		dinner: [dinnerA, dinnerB, dinnerC],
		snack: [snackA, snackB],
	};

	const days = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
	const weeklyPlan = days.map((day, index) => ({
		day,
		meals: [
			mealVariants.breakfast[index % 3],
			mealVariants.lunch[index % 3],
			mealVariants.dinner[index % 3],
			mealVariants.snack[index % 2],
		],
		totalCalories: dailyCalories,
	}));

	const getMeals = () => [
		mealVariants.breakfast[0],
		mealVariants.lunch[0],
		mealVariants.dinner[0],
		mealVariants.snack[0],
	];

	const buildExercisePlan = () => {
		const stepsGoals = {
			sedentary: 6000,
			lightly_active: 8000,
			moderately_active: 10000,
			very_active: 12000,
		};
		const minutesGoals = {
			sedentary: 20,
			lightly_active: 30,
			moderately_active: 40,
			very_active: 60,
		};

		const isSedentary = safeActivityLevel === "sedentary";
		const isVeryActive = safeActivityLevel === "very_active";
		const isModerate = safeActivityLevel === "moderately_active";
		const difficulty = hasHypertension || hasHypotension || isSedentary
			? "beginner"
			: isVeryActive
				? "advanced"
				: isModerate
					? "intermediate"
					: "beginner";

		const durationBase = isSedentary ? 25 : isVeryActive ? 60 : isModerate ? 45 : 35;
		const intensityFactor = hasHypertension || hasHypotension || isSedentary
			? 5
			: isVeryActive
				? 10
				: isModerate
					? 8
					: 6;

		const workoutDays = ["السبت", "الأحد", "الثلاثاء", "الأربعاء", "الخميس"];
		let weeklyTypes;

		if (hasHypertension || hasHypotension || isSedentary) {
			weeklyTypes = workoutDays.map(() => "مشي خفيف");
		} else if (safeGoal === "lose_weight") {
			weeklyTypes = ["كارديو", "كارديو", "قوة", "كارديو", "كارديو"];
		} else if (safeGoal === "gain_weight") {
			weeklyTypes = ["قوة", "قوة", "قوة", "كارديو", "قوة"];
		} else {
			weeklyTypes = ["كارديو", "قوة", "مرونة", "كارديو", "قوة"];
		}

		const buildExercises = (type, dayIndex) => {
			const exercises = [];
			const pick = (items) => items[dayIndex % items.length];

			if (hasHypertension || isSedentary) {
				exercises.push(
					{
						name: pick(["مشي هادئ", "مشي بوتيرة مريحة", "مشي خفيف متدرج", "مشي تنشيطي"]),
						sets: 1,
						reps: "20-30 دقيقة",
						restSeconds: 30,
						description: "حافظ على وتيرة مريحة وتجنب تسارع التنفس المفرط.",
						difficulty: "beginner",
					},
					{
						name: pick(["يوغا وتمدد خفيف", "تمدد واقف لطيف", "تنفس وتمدد هادئ", "حركة مرونة خفيفة"]),
						sets: 2,
						reps: "8-10 دقائق",
						restSeconds: 30,
						description: "ركز على التنفس العميق وتمديد العضلات بدون إجهاد.",
						difficulty: "beginner",
					},
				);
			} else if (type.includes("قوة")) {
				const sets = isVeryActive ? 4 : isModerate ? 3 : 2;
				exercises.push(
					{
						name: pick(["سكوات وزن الجسم", "اندفاع خلفي", "جسر الحوض", "جلوس ووقوف من كرسي"]),
						sets,
						reps: isVeryActive ? "10-12" : "12",
						restSeconds: 60,
						description: "حافظ على الظهر مستقيماً والركبتين بمحاذاة القدمين.",
						difficulty,
					},
					{
						name: pick(["تمرين ضغط", "ضغط على الحائط", "ضغط مائل", "دفع الكتفين بالمطاط"]),
						sets,
						reps: isVeryActive ? "8-12" : "10-12",
						restSeconds: 60,
						description: "شد عضلات البطن وحافظ على استقامة الجسم.",
						difficulty,
					},
					{
						name: pick(["تمرين سحب بالمطاط", "سحب دمبل خفيف", "سحب منشفة ثابت", "فتح الذراعين بالمطاط"]),
						sets,
						reps: "10-12",
						restSeconds: 60,
						description: "اسحب ببطء مع إبقاء الكتفين للخلف.",
						difficulty,
					},
				);
			} else if (type.includes("كارديو")) {
				exercises.push(
					{
						name: isVeryActive
							? pick(["جري متقطع", "صعود درج متدرج", "هرولة خفيفة", "جري بإيقاع ثابت"])
							: pick(["مشي سريع", "دراجة هوائية", "صعود درج خفيف", "مشي على ميل بسيط"]),
						sets: 1,
						reps: isVeryActive ? "25 دقيقة" : "20 دقيقة",
						restSeconds: 45,
						description: "حافظ على وتيرة ثابتة تسمح بالتنفس المنتظم.",
						difficulty,
					},
					{
						name: pick(["دراجة ثابتة", "جهاز إليبتيكال", "حبل خفيف", "خطوات جانبية"]),
						sets: 1,
						reps: "15 دقيقة",
						restSeconds: 45,
						description: "اضبط المقاومة على مستوى متوسط لتجنب الإجهاد.",
						difficulty,
					},
				);
			} else {
				exercises.push(
					{
						name: pick(["إطالة ديناميكية", "تحريك المفاصل", "تمدد للجزء العلوي", "تمدد للساقين"]),
						sets: 2,
						reps: "6-8 دقائق",
						restSeconds: 30,
						description: "حرّك المفاصل بلطف مع التركيز على التنفس.",
						difficulty,
					},
					{
						name: pick(["يوغا خفيفة", "توازن ومرونة", "تمدد قط-جمل", "تنفس مع حركة"]),
						sets: 2,
						reps: "8 دقائق",
						restSeconds: 30,
						description: "حافظ على استقرار الجذع مع تمديدات مريحة.",
						difficulty,
					},
				);
			}

			if (hasDiabetes) {
				exercises.push({
					name: pick(["مشي بعد الوجبات", "خطوات خفيفة بعد الغداء", "مشي قصير بعد العشاء", "جولة خفيفة بعد الطعام"]),
					sets: 1,
					reps: "15 دقيقة",
					restSeconds: 30,
					description: "مشي خفيف بعد الوجبة الرئيسية (المشي بعد الوجبات يساعد في ضبط السكر).",
					difficulty: "beginner",
				});
			}

			return exercises;
		};

		const weeklyWorkouts = workoutDays.map((day, index) => {
			const type = weeklyTypes[index] ?? "تمرين";
			const exercises = buildExercises(type, index);
			const durationMinutes = type.includes("قوة")
				? durationBase + 5
				: type.includes("مرونة")
					? Math.max(durationBase - 10, 20)
					: durationBase;
			const caloriesBurned = Math.round(durationMinutes * intensityFactor);

			return {
				day,
				type,
				exercises,
				durationMinutes,
				caloriesBurned,
			};
		});

		let dailyStepsGoal = stepsGoals[safeActivityLevel] ?? 8000;
		let activeMinutesGoal = minutesGoals[safeActivityLevel] ?? 30;

		if (hasHypertension) {
			dailyStepsGoal = Math.min(dailyStepsGoal, 9000);
			activeMinutesGoal = Math.min(activeMinutesGoal, 35);
		}

		return {
			weeklyWorkouts,
			dailyStepsGoal,
			activeMinutesGoal,
		};
	};

	const proteinGrams = Number(macros?.proteinGrams ?? 0);
	const carbsGrams = Number(macros?.carbsGrams ?? 0);
	const fatGrams = Number(macros?.fatGrams ?? 0);
	const exercisePlan = buildExercisePlan();
	const mockData = {
		nutritionPlan: {
			dailyCalories,
			proteinGrams,
			carbsGrams,
			fatGrams,
			hydrationLiters: hydration,
			meals: getMeals(),
			weeklyPlan,
		},
		exercisePlan,
		generatedAt: new Date().toISOString(),
		planDurationWeeks: 4,
	};
	const { calculateBalanceIndex: calculateBalanceIndexAsync } = await import(
		"../utils/balanceIndex.js"
	);
	const localBalanceIndex = calculateBalanceIndexAsync(userProfile);

	return normalizeGeneratedPlanShape(
		{
			...mockData,
			balanceIndex: localBalanceIndex,
			userProfile,
		},
		userProfile,
	);
};

// Use mock if no API key is configured
/**
 * Main generation entrypoint with graceful fallback on transient failures.
 * - Dev only: recoverable API errors (network, 429, 5xx) fall back to mock.
 * - Production: mock is NEVER used — errors propagate so users see real status.
 * @param {import("../types/index.js").UserProfile} userProfile
 * @param {{
 * 	bmi: { value: number, categoryAr: string },
 * 	dailyCalories: number,
 * 	macros: { proteinGrams: number, carbsGrams: number, fatGrams: number },
 * 	hydration: number
 * }} nutritionSummary
 * @returns {Promise<import("../types/index.js").GeneratedPlan>}
 */
async function generatePlan(userProfile, nutritionSummary) {
	const isDev = import.meta.env.DEV === true;

	try {
		return await generateHealthPlan(userProfile, nutritionSummary);
	} catch (error) {
		const statusCode =
			error && typeof error === "object" && "statusCode" in error
				? Number(error.statusCode)
				: undefined;

		const isRecoverable =
			statusCode === undefined || statusCode === 429 || statusCode >= 500;

		if (isDev && isRecoverable) {
			console.warn(
				"⚠️ Backend unavailable in dev. Falling back to mock generation.",
			);
			return generateHealthPlanMock(userProfile, nutritionSummary);
		}

		throw error;
	}
}

export const planService = {
	generate: generatePlan,
};

export default planService;
