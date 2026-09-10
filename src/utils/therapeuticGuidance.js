/**
 * Structured therapeutic diet guidance used by the prompt builder and plan validation.
 *
 * The data here is intentionally server-side only. It should be used to constrain
 * generation, flag unsafe combinations, and keep the AI aligned with clinical rules.
 */

const CONDITION_GUIDANCE = {
	diabetes: {
		labelAr: "السكري",
		forbiddenKeywords: [
			"سكر",
			"عصير",
			"مشروب محلى",
			"حلويات",
			"كيك",
			"بسكويت",
			"شوكولاتة محلاة",
		],
		requiredPatterns: ["توزيع الكربوهيدرات", "خضار غير نشوية", "بروتين مناسب", "ألياف تدريجية"],
		recommendedFoods: ["الشوفان", "العدس", "الحمص", "الخضار الورقية", "الحبوب الكاملة بحصة محسوبة"],
		notes: ["تجنب المشروبات المحلاة", "قسّم الكربوهيدرات على الوجبات", "راقب السكر حسب خطة الطبيب"],
	},
	hypertension: {
		labelAr: "ارتفاع ضغط الدم",
		forbiddenKeywords: [
			"لانشون",
			"نقانق",
			"مرتديلا",
			"معلبات",
			"شيبس",
			"وجبات سريعة",
		],
		requiredPatterns: ["DASH", "صوديوم أقل", "بوتاسيوم من الطعام", "خضار طازجة"],
		recommendedFoods: ["الموز", "السبانخ", "الزبادي قليل الدسم", "البقول", "الطماطم"],
		notes: ["تجنب الأطعمة فائقة التصنيع", "لا ترفع أو تخفض الملح علاجياً دون الطبيب", "راقب الكافيين"],
	},
	heart_disease: {
		labelAr: "أمراض القلب والأوعية",
		forbiddenKeywords: ["لحوم مصنعة", "دهون متحولة", "مقالي", "مشروبات محلاة"],
		requiredPatterns: ["نمط البحر المتوسط", "دهون غير مشبعة", "ألياف", "صوديوم معتدل"],
		recommendedFoods: ["الخضار", "البقول", "الأسماك", "زيت الزيتون", "المكسرات غير المملحة"],
		notes: ["تجنب الكيتو عالي الدهون دون موافقة الطبيب", "اضبط السوائل والصوديوم وفق الحالة والأدوية"],
	},
	hypotension: {
		labelAr: "انخفاض ضغط الدم",
		forbiddenKeywords: [],
		requiredPatterns: ["سوائل كافية", "وجبات صغيرة", "تدرج في الوقوف"],
		recommendedFoods: ["وجبات متوازنة", "سوائل بين الوجبات", "مصادر بروتين مناسبة"],
		notes: ["لا تُزاد كمية الملح إلا بتوجيه طبي", "يجب تقييم الدوخة أو الإغماء طبياً"],
	},
	hypothyroidism: {
		labelAr: "قصور الغدة الدرقية",
		forbiddenKeywords: [],
		requiredPatterns: ["سعرات محسوبة", "بروتين كاف", "ألياف تدريجية"],
		recommendedFoods: ["السمك", "البيض", "البقول", "الخضار", "الحبوب الكاملة"],
		notes: ["لا تمنع الخضار الصليبية أو الصويا منعاً مطلقاً", "افصل دواء الغدة عن الحديد والكالسيوم حسب تعليمات الطبيب"],
	},
	hyperthyroidism: {
		labelAr: "فرط نشاط الغدة الدرقية",
		forbiddenKeywords: ["مشروبات الطاقة"],
		requiredPatterns: ["طاقة وبروتين كافيان", "كالسيوم", "فيتامين د"],
		recommendedFoods: ["الألبان المناسبة", "البقول", "البيض", "الخضار", "الفواكه الكاملة"],
		notes: ["لا تُقيّد اليود إلا بخطة الطبيب", "تجنب الإفراط في الكافيين ومراقِب الأعراض"],
	},
	ibs: {
		labelAr: "متلازمة القولون العصبي",
		forbiddenKeywords: [],
		requiredPatterns: ["تسجيل المحفزات", "ألياف ذائبة تدريجية", "وجبات منتظمة"],
		recommendedFoods: ["الشوفان", "الأرز", "الجزر", "الخيار", "الكوسا"],
		notes: ["حمية Low-FODMAP مؤقتة وتحت إشراف مختص ثم إعادة إدخال", "لا تمنع البصل أو القمح للجميع دون تجربة فردية"],
	},
};

const DIET_GUIDANCE = {
	omnivore: {
		labelAr: "متنوع",
		forbiddenKeywords: [],
		requiredPatterns: ["تنوع البروتين", "خضار", "حبوب كاملة"],
		notes: ["وازن بين البروتين النباتي والحيواني"],
	},
	vegetarian: {
		labelAr: "نباتي",
		forbiddenKeywords: ["لحم", "دجاج", "سمك", "تونة", "سلمون"],
		requiredPatterns: ["بقول", "بيض", "ألبان"],
		notes: ["اعتمد على البقول والبيض والألبان عند الحاجة"],
	},
	vegan: {
		labelAr: "نباتي صرف",
		forbiddenKeywords: ["لحم", "دجاج", "سمك", "بيض", "حليب", "لبن", "زبادي", "جبن", "سمن"],
		requiredPatterns: ["بقول", "بذور", "مكسرات", "حبوب كاملة"],
		notes: ["استبدل مصادر البروتين الحيوانية بالبقول والتوفو والبذور"],
	},
	keto: {
		labelAr: "كيتو",
		forbiddenKeywords: ["أرز", "خبز", "مكرونة", "معكرونة", "باستا", "بطاطا", "بطاطس", "سكر", "حلويات", "عصير"],
		requiredPatterns: ["دهون صحية", "بروتين", "خضار منخفضة النشويات"],
		notes: ["لا تُستخدم مع السكري أو أمراض القلب دون موافقة الطبيب", "تجنب الاعتماد على الدهون المشبعة"],
	},
};

const GOAL_GUIDANCE = {
	lose_weight: {
		labelAr: "خسارة الوزن",
		requiredPatterns: ["عجز حراري تدريجي", "بروتين كاف", "ألياف حسب التحمل", "نشاط مناسب"],
		notes: ["لا تقلل السعرات بشكل حاد", "اجعل الماء متاحاً وتجنب استخدامه كبديل للغذاء"],
	},
	gain_weight: {
		labelAr: "زيادة الوزن",
		requiredPatterns: ["فائض حراري تدريجي", "بروتين كاف", "وجبات صغيرة كثيفة غذائياً"],
		notes: ["لا تمنع الماء أثناء الوجبة", "زد السعرات من أطعمة كاملة لا من السكريات"],
	},
	improve_mood: {
		labelAr: "تحسين المزاج",
		requiredPatterns: ["وجبات منتظمة", "أوميغا-3 من الطعام", "نوم ونشاط"],
		notes: ["لا تعد بعلاج الاكتئاب أو القلق بالطعام", "وجّه الأعراض الشديدة لمختص"],
	},
	maintain: {
		labelAr: "الحفاظ على التوازن",
		requiredPatterns: ["سعرات قريبة من الاحتياج", "تنوع غذائي", "نشاط منتظم"],
		notes: ["راجع الخطة مع تغير الوزن أو النشاط"],
	},
};

const GENERAL_CLINICAL_RULES = [
	"لا تقدم أي مكوّن موجود في قائمة الأطعمة الممنوعة أو الحساسية.",
	"اكتب جميع المخرجات النهائية بالعربية فقط.",
	"إذا ظهر تعارض بين حمية المستخدم والحالة الصحية، اختر الأكثر تحفظًا وأمانًا.",
	"فضّل المكونات الطبيعية الطازجة على المنتجات الصناعية أو عالية المعالجة.",
	"هذه إرشادات عامة وليست تشخيصاً أو بديلاً عن الطبيب؛ الحالات والأدوية تتطلب مراجعة مختص.",
	"لا ترفع أو تخفض الملح أو السوائل أو اليود علاجياً دون تقييم طبي.",
	"لا تفرض حمية إقصائية طويلة؛ أي استبعاد علاجي يجب أن يكون مؤقتاً ومصحوباً بإعادة تقييم.",
];

function toUniqueList(items) {
	return Array.from(
		new Set(
			(items ?? [])
				.map((item) => String(item ?? "").trim())
				.filter(Boolean),
		),
	);
}

function collectProfileTerms(userProfile) {
	const healthConditions = Array.isArray(userProfile?.healthConditions) ? userProfile.healthConditions : [];
	const foodPreferences = userProfile?.foodPreferences ?? {};
	const forbiddenFoods = Array.isArray(foodPreferences.forbiddenFoods) ? foodPreferences.forbiddenFoods : [];
	const allergies = Array.isArray(foodPreferences.allergies) ? foodPreferences.allergies : [];
	const dietType = typeof foodPreferences.dietType === "string" ? foodPreferences.dietType : "omnivore";

	const conditionRules = healthConditions.flatMap((condition) => CONDITION_GUIDANCE[condition]?.forbiddenKeywords ?? []);
	const dietRules = DIET_GUIDANCE[dietType]?.forbiddenKeywords ?? [];
	const profileTerms = [...conditionRules, ...dietRules, ...forbiddenFoods, ...allergies];

	return toUniqueList(profileTerms);
}

function formatArabicList(values, fallback = "لا يوجد") {
	const uniqueValues = toUniqueList(values);
	return uniqueValues.length > 0 ? uniqueValues.join("، ") : fallback;
}

export function getTherapeuticGuidance(userProfile) {
	const healthConditions = Array.isArray(userProfile?.healthConditions) ? userProfile.healthConditions : [];
	const foodPreferences = userProfile?.foodPreferences ?? {};
	const dietType = typeof foodPreferences.dietType === "string" ? foodPreferences.dietType : "omnivore";

	const conditionGuidance = healthConditions
		.filter((condition) => CONDITION_GUIDANCE[condition])
		.map((condition) => ({
			key: condition,
			...CONDITION_GUIDANCE[condition],
		}));

	const dietGuidance = DIET_GUIDANCE[dietType] ?? DIET_GUIDANCE.omnivore;
	const goal = typeof userProfile?.goal === "string" ? userProfile.goal : "maintain";
	const goalGuidance = GOAL_GUIDANCE[goal] ?? GOAL_GUIDANCE.maintain;

	return {
		generalRules: GENERAL_CLINICAL_RULES,
		conditions: conditionGuidance,
		goal: {
			key: goal,
			...goalGuidance,
		},
		diet: {
			key: dietType,
			...dietGuidance,
		},
		forbiddenTerms: collectProfileTerms(userProfile),
	};
}

export function formatTherapeuticGuidanceSummary(userProfile) {
	const guidance = getTherapeuticGuidance(userProfile);
	const conditionLines = guidance.conditions.map((condition) => {
		return `- ${condition.labelAr}: ${formatArabicList(condition.requiredPatterns)} | ممنوع: ${formatArabicList(condition.forbiddenKeywords)} | موصى به: ${formatArabicList(condition.recommendedFoods, "غير محدد")}`;
	});

	return [
		"=== قاعدة المعرفة العلاجية ===",
		...guidance.generalRules.map((rule) => `- ${rule}`),
		`- النظام الغذائي الأساسي: ${guidance.diet.labelAr}`,
		`- ممنوعات الحمية: ${formatArabicList(guidance.diet.forbiddenKeywords)}`,
		`- مطلوبات الحمية: ${formatArabicList(guidance.diet.requiredPatterns, "غير محدد")}`,
		`- هدف الخطة: ${guidance.goal.labelAr}`,
		`- متطلبات الهدف: ${formatArabicList(guidance.goal.requiredPatterns, "غير محدد")}`,
		...guidance.goal.notes.map((note) => `- ملاحظة الهدف: ${note}`),
		...conditionLines,
	].join("\n");
}

export function getForbiddenTermsForProfile(userProfile) {
	return getTherapeuticGuidance(userProfile).forbiddenTerms;
}

export function textContainsForbiddenTerm(text, forbiddenTerms) {
	const normalizedText = String(text ?? "").toLowerCase();
	const terms = toUniqueList(forbiddenTerms).map((term) => term.toLowerCase());

	return terms.find((term) => term && normalizedText.includes(term)) ?? null;
}
