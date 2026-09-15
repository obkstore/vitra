/**
 * Guaranteed static fallback plans — absolute last resort.
 *
 * One pre-written, manually-verified template per diet type
 * (vegan / vegetarian / keto / omnivore). Each template matches the plan
 * schema enforced by validateAIResponse() and is free of its own diet's
 * forbidden terms (verified by tests). Before serving, the handler runs
 * sanitizePlanForProfile() over the template so allergies / custom
 * forbiddenFoods / condition terms are covered too.
 *
 * Food choices follow the therapeutic guide's Syria-local affordable foods
 * (lentils, chickpeas, foul, bulgur, seasonal veg, olive oil, eggs, dairy,
 * halloumi, chicken liver for keto). Keto text never uses the banned
 * substrings themselves ("شرائح الليمون", never "عصير ليمون").
 */

import { formatNutritionSummary } from "./nutritionCalculator.js";

export const STATIC_BASE_CALORIES = 2000;

const WEEKDAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

function meal(mealType, name, time, ingredients, calories, prepTimeMinutes, recipe) {
	return { mealType, name, time, ingredients, calories, prepTimeMinutes, recipe };
}

const VEGAN_POOLS = {
	breakfast: [
		meal("breakfast", "شوفان بحليب الشوفان مع اللوز وبذور الشيا", "08:00", ["شوفان", "حليب الشوفان", "لوز", "بذور الشيا", "قرفة"], 450, 10, "اطهُ الشوفان مع حليب الشوفان حتى يتماسك القوام. أضف اللوز وبذور الشيا والقرفة وقدّم دافئاً."),
		meal("breakfast", "فول مدمس بزيت الزيتون مع الخضار", "08:00", ["فول", "زيت الزيتون", "ليمون طازج", "خيار", "طماطم", "خبز قمح كامل"], 450, 15, "سخّن الفول واهرسه خفيفاً مع زيت الزيتون وشرائح الليمون. قدّم مع الخيار والطماطم وخبز القمح الكامل."),
		meal("breakfast", "حمص مهروس بالطحينة", "08:00", ["حمص", "طحينة", "ليمون طازج", "خبز قمح كامل", "خيار"], 450, 12, "اخلط الحمص مع الطحينة وشرائح الليمون حتى يصبح كريمياً. قدّم مع خبز القمح الكامل والخيار."),
	],
	lunch: [
		meal("lunch", "مجدرة العدس مع السلطة", "13:30", ["عدس", "برغل", "بصل", "زيت الزيتون", "سلطة خضراء"], 650, 30, "اطهُ العدس مع البرغل والبصل حتى النضج. قدّم مع السلطة الخضراء وزيت الزيتون."),
		meal("lunch", "يخنة الحمص مع الكوسا والباذنجان", "13:30", ["حمص", "كوسا", "باذنجان", "طماطم", "زيت الزيتون"], 650, 35, "اطهُ الحمص مع الكوسا والباذنجان والطماطم على نار هادئة. قدّم ساخناً مع الليمون الطازج."),
		meal("lunch", "فاصوليا مع الأرز الكامل", "13:30", ["فاصوليا", "أرز كامل", "طماطم", "ثوم", "زيت الزيتون"], 650, 35, "اطهُ الفاصوليا مع الطماطم والثوم حتى تتسبك. قدّم فوق الأرز الكامل مع زيت الزيتون."),
	],
	dinner: [
		meal("dinner", "شوربة العدس الأحمر", "20:00", ["عدس أحمر", "جزر", "كوسا", "كمون", "ليمون طازج"], 600, 25, "اسلق العدس مع الجزر والكوسا ثم اخلط ناعماً. تبّل بالكمون وقدّم مع شرائح الليمون."),
		meal("dinner", "متبل الباذنجان المشوي", "20:00", ["باذنجان مشوي", "طحينة", "ليمون طازج", "ثوم", "خيار", "خبز قمح كامل"], 600, 25, "اشوِ الباذنجان واخلطه مع الطحينة والثوم وشرائح الليمون. قدّم مع الخيار وخبز القمح الكامل."),
		meal("dinner", "فول مع الفتوش", "20:00", ["فول", "خضار ورقية", "طماطم", "خيار", "زيت الزيتون"], 600, 15, "اخلط الفول الدافئ مع الخضار الورقية والطماطم والخيار. تبّل بزيت الزيتون وشرائح الليمون."),
	],
	snack: [
		meal("snack", "حمص مهروس مع خضار مقطعة", "17:00", ["حمص", "طحينة", "جزر", "خيار", "ليمون طازج"], 300, 10, "اخلط الحمص مع الطحينة وشرائح الليمون. قدّم مع الجزر والخيار المقطع."),
		meal("snack", "مكسرات مع التمر", "17:00", ["لوز", "جوز", "تمر", "بذور الشيا"], 300, 5, "اخلط اللوز والجوز مع التمر وبذور الشيا. قدّم كوجبة خفيفة مشبعة."),
	],
};

const VEGETARIAN_POOLS = {
	breakfast: [
		meal("breakfast", "بيض مسلوق مع سلطة اللبن بالخيار", "08:00", ["بيض مسلوق", "لبن بالخيار", "نعناع مجفف", "خبز قمح كامل", "زيت الزيتون"], 450, 12, "اسلق البيض وقدّم مع سلطة اللبن بالخيار والنعناع. أضف خبز القمح الكامل وزيت الزيتون."),
		meal("breakfast", "شوفان بالحليب والزبادي", "08:00", ["شوفان", "حليب", "زبادي", "لوز", "عسل"], 450, 10, "اطهُ الشوفان مع الحليب ثم أضف الزبادي والعسل. زيّن باللوز وقدّم دافئاً."),
		meal("breakfast", "جبنة حلوم مشوية مع الخضار", "08:00", ["جبنة حلوم", "زيت الزيتون", "خيار", "طماطم", "خبز قمح كامل"], 450, 12, "اشوِ الحلوم حتى يتحمّر وقدّم مع الخيار والطماطم. أضف زيت الزيتون وخبز القمح الكامل."),
	],
	lunch: [
		meal("lunch", "متبل الباذنجان مع الحلوم", "13:30", ["باذنجان مشوي", "طحينة", "جبنة حلوم", "سلطة خضراء", "زيت الزيتون"], 650, 25, "اخلط الباذنجان المشوي مع الطحينة وشرائح الليمون. قدّم مع الحلوم المشوية والسلطة."),
		meal("lunch", "مجدرة العدس مع البيض", "13:30", ["عدس", "برغل", "بيض مسلوق", "سلطة خضراء", "ليمون طازج"], 650, 30, "اطهُ العدس مع البرغل حتى النضج. قدّم مع البيض المسلوق والسلطة وشرائح الليمون."),
		meal("lunch", "شكشوكة البيض", "13:30", ["بيض", "طماطم", "فلفل ملون", "زيت الزيتون", "خبز قمح كامل"], 650, 20, "اطهُ الطماطم والفلفل ثم أضف البيض حتى ينضج. قدّم ساخناً مع خبز القمح الكامل."),
	],
	dinner: [
		meal("dinner", "شوربة العدس مع الشنكليش", "20:00", ["عدس أحمر", "شنكليش", "جزر", "ليمون طازج", "زيت الزيتون"], 600, 25, "اسلق العدس مع الجزر واخلط ناعماً. قدّم مع الشنكليش وشرائح الليمون وزيت الزيتون."),
		meal("dinner", "فتة الحمص باللبن", "20:00", ["حمص", "لبن", "خبز محمص", "صنوبر", "زيت الزيتون"], 600, 20, "اخلط الحمص الدافئ مع اللبن واسكب فوق الخبز المحمص. زيّن بالصنوبر وزيت الزيتون."),
		meal("dinner", "عجة البيض بالسبانخ", "20:00", ["بيض", "سبانخ", "طماطم", "بصل", "زيت الزيتون"], 600, 15, "اخفق البيض مع السبانخ والطماطم والبصل. اطهُ بزيت الزيتون على نار هادئة وقدّم ساخناً."),
	],
	snack: [
		meal("snack", "زبادي باللوز والعسل", "17:00", ["زبادي", "لوز", "عسل", "قرفة"], 300, 5, "اخلط الزبادي مع العسل والقرفة. زيّن باللوز وقدّم بارداً."),
		meal("snack", "جبن قريش مع الخضار", "17:00", ["جبن قريش", "خيار", "طماطم", "زيت الزيتون"], 300, 5, "قدّم الجبن القريش مع الخيار والطماطم. أضف زيت الزيتون وقدّم طازجاً."),
	],
};

const KETO_POOLS = {
	breakfast: [
		meal("breakfast", "بيض بزيت الزيتون مع الأفوكادو", "08:00", ["بيض", "زيت الزيتون", "أفوكادو", "سبانخ", "خيار"], 500, 12, "اطهُ البيض بزيت الزيتون على نار متوسطة. قدّم مع الأفوكادو والسبانخ والخيار."),
		meal("breakfast", "عجة السبانخ بالحلوم", "08:00", ["بيض", "سبانخ", "جبنة حلوم", "زيت الزيتون", "طماطم"], 500, 15, "اخفق البيض مع السبانخ واطهُ مع الحلوم بزيت الزيتون. قدّم ساخناً مع الطماطم."),
		meal("breakfast", "لبن يوناني كامل الدسم بالمكسرات", "08:00", ["لبن يوناني", "لوز", "جوز", "بذور الشيا", "قرفة"], 500, 5, "اخلط اللبن اليوناني مع اللوز والجوز وبذور الشيا. أضف القرفة وقدّم بارداً."),
	],
	lunch: [
		meal("lunch", "سودة الدجاج مع السلطة", "13:30", ["سودة الدجاج", "خضار ورقية", "زيت الزيتون", "ليمون طازج", "خيار"], 650, 20, "اطهُ سودة الدجاج مع التوابل حتى النضج. قدّم فوق الخضار الورقية مع زيت الزيتون وشرائح الليمون."),
		meal("lunch", "سمك مشوي مع الخضار", "13:30", ["سمك مشوي", "كوسا", "سبانخ", "زيت الزيتون", "ليمون طازج"], 650, 25, "اشوِ السمك مع التوابل حتى ينضج. قدّم مع الكوسا والسبانخ وشرائح الليمون."),
		meal("lunch", "دجاج مشوي مع القرنبيط", "13:30", ["صدر دجاج مشوي", "قرنبيط مبشور مطهو", "كوسا", "زيت الزيتون", "ثوم"], 650, 30, "اشوِ الدجاج واطهُ القرنبيط المبشور مع الكوسا والثوم. قدّم مع زيت الزيتون."),
	],
	dinner: [
		meal("dinner", "متبل الباذنجان بالحلوم والشنكليش", "20:00", ["باذنجان مشوي", "طحينة", "جبنة حلوم", "شنكليش", "زيت الزيتون"], 550, 20, "اخلط الباذنجان المشوي مع الطحينة وشرائح الليمون. قدّم مع الحلوم والشنكليش وزيت الزيتون."),
		meal("dinner", "شوربة الخضار بالبيض", "20:00", ["كوسا", "سبانخ", "قرنبيط", "بيض", "زيت الزيتون"], 550, 20, "اسلق الكوسا والسبانخ والقرنبيط ثم أضف البيض المخفوق. قدّم ساخناً مع زيت الزيتون."),
		meal("dinner", "سلطة التونة بالأفوكادو", "20:00", ["تونة", "أفوكادو", "خيار", "زيت الزيتون", "ليمون طازج"], 550, 10, "اخلط التونة مع الأفوكادو والخيار. تبّل بزيت الزيتون وشرائح الليمون."),
	],
	snack: [
		meal("snack", "مكسرات غير مملحة مع الخيار", "17:00", ["لوز", "جوز", "خيار", "بذور الشيا"], 300, 5, "اخلط اللوز والجوز مع بذور الشيا. قدّم مع الخيار كوجبة خفيفة."),
		meal("snack", "أقراص بذور الكتان مع اللبن", "17:00", ["بذور الكتان", "لبن يوناني", "خيار", "زيت الزيتون"], 300, 10, "اخلط بذور الكتان مع اللبن اليوناني. قدّم مع الخيار وزيت الزيتون."),
	],
};

const OMNIVORE_POOLS = {
	breakfast: [
		meal("breakfast", "شوفان بالحليب والموز", "08:00", ["شوفان", "حليب", "موز", "لوز", "عسل"], 450, 10, "اطهُ الشوفان مع الحليب حتى يتماسك. أضف الموز واللوز والعسل وقدّم دافئاً."),
		meal("breakfast", "بيض مسلوق مع الجبن والخبز", "08:00", ["بيض مسلوق", "جبن", "خبز قمح كامل", "خيار", "زيت الزيتون"], 450, 12, "اسلق البيض وقدّم مع الجبن وخبز القمح الكامل. أضف الخيار وزيت الزيتون."),
		meal("breakfast", "فول مدمس باللبن", "08:00", ["فول", "لبن", "زيت الزيتون", "ليمون طازج", "خضار ورقية"], 450, 15, "سخّن الفول وقدّم مع اللبن وزيت الزيتون. أضف شرائح الليمون والخضار الورقية."),
	],
	lunch: [
		meal("lunch", "صدر دجاج مشوي مع الأرز الكامل", "13:30", ["صدر دجاج مشوي", "أرز كامل", "سلطة خضراء", "زيت الزيتون", "ليمون طازج"], 650, 30, "اشوِ الدجاج مع التوابل حتى ينضج. قدّم مع الأرز الكامل والسلطة وشرائح الليمون."),
		meal("lunch", "سمك مشوي مع البرغل", "13:30", ["سمك مشوي", "برغل", "طماطم", "خيار", "زيت الزيتون"], 650, 25, "اشوِ السمك حتى ينضج وقدّم مع البرغل. أضف الطماطم والخيار وزيت الزيتون."),
		meal("lunch", "يخنة اللحم مع الخضار", "13:30", ["لحم بقري قليل الدهن", "كوسا", "باذنجان", "طماطم", "برغل"], 650, 40, "اطهُ اللحم مع الكوسا والباذنجان والطماطم على نار هادئة. قدّم مع البرغل."),
	],
	dinner: [
		meal("dinner", "شوربة العدس بالدجاج", "20:00", ["عدس أحمر", "صدر دجاج", "جزر", "كمون", "ليمون طازج"], 600, 30, "اسلق العدس مع الجزر والدجاج ثم قدّم ساخناً. تبّل بالكمون وشرائح الليمون."),
		meal("dinner", "متبل الباذنجان بالحلوم", "20:00", ["باذنجان مشوي", "طحينة", "جبنة حلوم", "سلطة خضراء", "زيت الزيتون"], 600, 20, "اخلط الباذنجان المشوي مع الطحينة وشرائح الليمون. قدّم مع الحلوم والسلطة."),
		meal("dinner", "فتة الحمص باللحم", "20:00", ["حمص", "لحم مفروم", "لبن", "خبز محمص", "صنوبر"], 600, 30, "اطهُ اللحم المفروم واسكبه مع الحمص واللبن فوق الخبز المحمص. زيّن بالصنوبر."),
	],
	snack: [
		meal("snack", "زبادي بالفواكه", "17:00", ["زبادي", "تفاح", "لوز", "قرفة"], 300, 5, "اخلط الزبادي مع التفاح والقرفة. زيّن باللوز وقدّم بارداً."),
		meal("snack", "ساندويش التونة", "17:00", ["تونة", "خبز قمح كامل", "خيار", "طماطم", "زيت الزيتون"], 300, 10, "اخلط التونة مع الخيار والطماطم وزيت الزيتون. قدّم في خبز القمح الكامل."),
	],
};

const POOLS_BY_DIET = {
	vegan: VEGAN_POOLS,
	vegetarian: VEGETARIAN_POOLS,
	keto: KETO_POOLS,
	omnivore: OMNIVORE_POOLS,
};

const BASE_MACROS_BY_DIET = {
	vegan: { proteinGrams: 90, carbsGrams: 280, fatGrams: 65, hydrationLiters: 2.5 },
	vegetarian: { proteinGrams: 100, carbsGrams: 260, fatGrams: 70, hydrationLiters: 2.5 },
	keto: { proteinGrams: 110, carbsGrams: 50, fatGrams: 150, hydrationLiters: 2.5 },
	omnivore: { proteinGrams: 120, carbsGrams: 230, fatGrams: 65, hydrationLiters: 2.5 },
};

/**
 * Resolves which static template serves a profile. Unknown / omnivore →
 * omnivore (balanced). Never throws: defaults to omnivore.
 * @param {any} userProfile
 * @returns {"vegan" | "vegetarian" | "keto" | "omnivore"}
 */
export function getStaticFallbackDietKey(userProfile) {
	const dietType = userProfile?.foodPreferences?.dietType;
	if (dietType === "vegan" || dietType === "vegetarian" || dietType === "keto") return dietType;
	return "omnivore";
}

function scaleCalories(baseCalories, factor) {
	return Math.max(50, Math.round(baseCalories * factor));
}

function buildExercisePlan() {
	const workout = (day, type, durationMinutes, caloriesBurned, exercises) => ({
		day,
		type,
		durationMinutes,
		caloriesBurned,
		exercises,
	});
	const ex = (name, sets, reps, restSeconds, description, difficulty = "beginner") => ({
		name,
		sets,
		reps,
		restSeconds,
		description,
		difficulty,
	});
	return {
		weeklyWorkouts: [
			workout("السبت", "مشي", 30, 150, [
				ex("مشي بوتيرة مريحة", 1, "25 دقيقة", 30, "حافظ على وتيرة ثابتة وتنفس منتظم."),
				ex("تمدد خفيف للساقين", 2, "5 دقائق", 30, "مدد عضلات الساقين بلطف بعد المشي."),
			]),
			workout("الأحد", "قوة", 35, 200, [
				ex("سكوات وزن الجسم", 3, "12", 60, "حافظ على الظهر مستقيماً والركبتين بمحاذاة القدمين."),
				ex("ضغط على الحائط", 3, "10", 60, "شد عضلات البطن وحافظ على استقامة الجسم."),
				ex("جسر الحوض", 3, "12", 60, "ارفع الحوض ببطء مع شد عضلات الأرداف."),
			]),
			workout("الاثنين", "مرونة", 25, 120, [
				ex("تمدد للجزء العلوي", 2, "6 دقائق", 30, "حرّك الكتفين والرقبة بلطف مع التنفس العميق."),
				ex("يوغا خفيفة", 2, "8 دقائق", 30, "حافظ على استقرار الجذع مع تمديدات مريحة."),
			]),
			workout("الثلاثاء", "قوة", 35, 200, [
				ex("اندفاع خلفي", 3, "10 لكل ساق", 60, "حافظ على التوازن والجذع مشدوداً."),
				ex("سحب بالمطاط", 3, "10", 60, "اسحب ببطء مع إبقاء الكتفين للخلف."),
				ex("بلانك", 3, "30 ثانية", 60, "حافظ على استقامة الجسم من الرأس حتى الكعبين."),
			]),
			workout("الأربعاء", "مشي", 30, 150, [
				ex("مشي سريع", 1, "20 دقيقة", 45, "ارفع الوتيرة تدريجياً مع الحفاظ على التنفس المنتظم."),
				ex("تنفس وتمدد هادئ", 2, "8 دقائق", 30, "ركز على التنفس العميق وتمديد العضلات بدون إجهاد."),
			]),
		],
		dailyStepsGoal: 8000,
		activeMinutesGoal: 30,
	};
}

function buildBalanceIndex(dietKey) {
	const dietLabel = dietKey === "vegan" ? "النباتية الصرفة" : dietKey === "vegetarian" ? "النباتية" : dietKey === "keto" ? "الكيتو" : "المتوازنة";
	return {
		score: 75,
		insights: [
			`خطة احتياطية ${dietLabel} متوازنة تغطي احتياجك اليومي من السعرات.`,
			"وجبات متنوعة على مدار الأسبوع من أطعمة محلية متاحة.",
			"نشاط بدني خفيف ومنتظم يدعم الالتزام بالخطة.",
		],
		recommendations: [
			"التزم بأوقات الوجبات واشرب الماء بانتظام.",
			"راجع مختص تغذية عند وجود حالة مزمنة أو دواء يتأثر بالغذاء.",
			"زد خطواتك اليومية تدريجياً حسب قدرتك.",
		],
	};
}

function resolveTargets(userProfile, nutritionSummary) {
	let computed = null;
	try {
		computed = formatNutritionSummary(userProfile);
	} catch {
		computed = null;
	}
	const pick = (candidate, fallback) => (Number.isFinite(Number(candidate)) && Number(candidate) > 0 ? Number(candidate) : fallback);
	const base = BASE_MACROS_BY_DIET[getStaticFallbackDietKey(userProfile)] ?? BASE_MACROS_BY_DIET.omnivore;
	return {
		dailyCalories: Math.round(pick(nutritionSummary?.dailyCalories, computed?.dailyCalories ?? STATIC_BASE_CALORIES)),
		proteinGrams: Math.round(pick(nutritionSummary?.macros?.proteinGrams, computed?.macros?.proteinGrams ?? base.proteinGrams)),
		carbsGrams: Math.round(pick(nutritionSummary?.macros?.carbsGrams, computed?.macros?.carbsGrams ?? base.carbsGrams)),
		fatGrams: Math.round(pick(nutritionSummary?.macros?.fatGrams, computed?.macros?.fatGrams ?? base.fatGrams)),
		hydrationLiters: Number(pick(nutritionSummary?.hydration, computed?.hydration ?? base.hydrationLiters).toFixed(1)),
	};
}

/**
 * Builds a complete, schema-valid fallback plan scaled to the user's
 * calorie/macro targets. Echoes the request's userProfile so the UI and
 * validators see a coherent payload.
 * @param {any} userProfile Validated user profile from the request.
 * @param {any} nutritionSummary Request nutritionSummary (may be undefined).
 * @returns {object} Full GeneratedPlan-shaped object.
 */
export function buildStaticFallbackPlan(userProfile, nutritionSummary) {
	const dietKey = getStaticFallbackDietKey(userProfile);
	const pools = POOLS_BY_DIET[dietKey] ?? POOLS_BY_DIET.omnivore;
	const targets = resolveTargets(userProfile, nutritionSummary);
	const factor = targets.dailyCalories / STATIC_BASE_CALORIES;

	const scaleMeal = (source) => ({
		...source,
		ingredients: [...source.ingredients],
		calories: scaleCalories(source.calories, factor),
	});

	// Base 4 meals use the first variant of each type (without mealType
	// duplication: strip mealType to match the nutritionPlan.meals contract
	// which carries no mealType field).
	const baseMeals = [
		scaleMeal(pools.breakfast[0]),
		scaleMeal(pools.lunch[0]),
		scaleMeal(pools.dinner[0]),
		scaleMeal(pools.snack[0]),
	].map(({ mealType: _MEAL_TYPE, ...rest }) => rest);

	const weeklyPlan = WEEKDAYS.map((day, index) => {
		const dayMeals = [
			scaleMeal(pools.breakfast[index % pools.breakfast.length]),
			scaleMeal(pools.lunch[index % pools.lunch.length]),
			scaleMeal(pools.dinner[index % pools.dinner.length]),
			scaleMeal(pools.snack[index % pools.snack.length]),
		];
		return {
			day,
			meals: dayMeals,
			totalCalories: dayMeals.reduce((sum, m) => sum + m.calories, 0),
		};
	});

	let profileEcho;
	try {
		profileEcho = JSON.parse(JSON.stringify(userProfile ?? {}));
	} catch {
		profileEcho = userProfile ?? {};
	}

	return {
		userProfile: profileEcho,
		nutritionPlan: {
			dailyCalories: targets.dailyCalories,
			proteinGrams: targets.proteinGrams,
			carbsGrams: targets.carbsGrams,
			fatGrams: targets.fatGrams,
			hydrationLiters: targets.hydrationLiters,
			meals: baseMeals,
			weeklyPlan,
		},
		exercisePlan: buildExercisePlan(),
		balanceIndex: buildBalanceIndex(dietKey),
		generatedAt: new Date().toISOString(),
		planDurationWeeks: 4,
	};
}
