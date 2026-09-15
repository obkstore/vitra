import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GENERIC_SUBSTITUTE,
  ULTIMATE_SAFE_SUBSTITUTE,
  VEGAN_SUBSTITUTIONS,
  VEGETARIAN_SUBSTITUTIONS,
  KETO_SUBSTITUTIONS,
  getSubstitutionMapForProfile,
  sanitizePlanForProfile,
} from '../src/utils/dietFallbacks.js';
import {
  STATIC_BASE_CALORIES,
  buildStaticFallbackPlan,
  getStaticFallbackDietKey,
} from '../src/utils/staticFallbackPlans.js';
import { validateAIResponse, validatePlanAgainstProfile } from '../src/utils/promptBuilder.js';
import { getForbiddenTermsForProfile, textContainsForbiddenTerm } from '../src/utils/therapeuticGuidance.js';

function baseProfile(overrides = {}) {
  return {
    age: 32,
    gender: 'female',
    weight: 68,
    height: 165,
    healthConditions: ['none'],
    goal: 'maintain',
    mentalState: { stressLevel: 3, sleepQuality: 4, energyLevel: 3 },
    foodPreferences: {
      favoriteFoods: ['سلطة'],
      forbiddenFoods: [],
      allergies: [],
      dietType: 'omnivore',
    },
    activityLevel: 'lightly_active',
    availableEquipment: ['home'],
    ...overrides,
  };
}

function mealEntry(name, ingredients, recipe) {
  return { name, time: '08:00', ingredients, calories: 400, prepTimeMinutes: 10, recipe };
}

function buildPlanWithMeal(profile, name, ingredients, recipe) {
  const dayMeals = (mealType) => ({ mealType, name, time: '08:00', ingredients: [...ingredients], calories: 400, prepTimeMinutes: 10, recipe });
  return {
    userProfile: profile,
    nutritionPlan: {
      dailyCalories: 2000,
      proteinGrams: 100,
      carbsGrams: 250,
      fatGrams: 65,
      hydrationLiters: 2.5,
      meals: [
        mealEntry('فطور', ['شوفان'], 'اخلط الشوفان'),
        mealEntry(name, [...ingredients], recipe),
        mealEntry('عشاء', ['خضار'], 'جهز الخضار'),
        mealEntry('سناك', ['لوز'], 'تناول اللوز'),
      ],
      weeklyPlan: Array.from({ length: 7 }, (_, index) => ({
        day: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'][index],
        meals: [
          dayMeals('breakfast'),
          { mealType: 'lunch', name: 'غداء', time: '13:00', ingredients: ['حمص'], calories: 600, prepTimeMinutes: 20, recipe: 'جهز الحمص' },
          { mealType: 'dinner', name: 'عشاء', time: '20:00', ingredients: ['خضار'], calories: 500, prepTimeMinutes: 15, recipe: 'اطبخ الخضار' },
          { mealType: 'snack', name: 'سناك', time: '17:00', ingredients: ['لوز'], calories: 300, prepTimeMinutes: 5, recipe: 'تناول اللوز' },
        ],
        totalCalories: 2000,
      })),
    },
    exercisePlan: {
      weeklyWorkouts: Array.from({ length: 5 }, (_, i) => ({
        day: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء'][i],
        type: 'قوة',
        durationMinutes: 30,
        caloriesBurned: 180,
        exercises: [{ name: 'تمرين', sets: 3, reps: '10', restSeconds: 60, description: 'مثال', difficulty: 'beginner' }],
      })),
      dailyStepsGoal: 8000,
      activeMinutesGoal: 30,
    },
    balanceIndex: { score: 72, insights: ['a'], recommendations: ['b'] },
    generatedAt: '2026-01-01T00:00:00.000Z',
    planDurationWeeks: 4,
  };
}

test('vegan sanitize fixes every diet term and revalidates', () => {
  const profile = baseProfile({ foodPreferences: { favoriteFoods: [], forbiddenFoods: [], allergies: [], dietType: 'vegan' } });
  const plan = buildPlanWithMeal(profile, 'وجبة لحم بالدجاج والسمك', ['لحم', 'دجاج', 'سمك', 'بيض', 'حليب', 'جبن'], 'اطهُ اللحم مع الدجاج والسمك والبيض والحليب والجبن');
  assert.equal(validatePlanAgainstProfile(plan, profile).isValid, false);

  const { plan: sanitized, replacedCount } = sanitizePlanForProfile(plan, profile);
  assert.ok(replacedCount > 0);
  const recheck = validatePlanAgainstProfile(sanitized, profile);
  assert.equal(recheck.isValid, true);
  assert.equal(validateAIResponse(JSON.stringify(sanitized)).isValid, true);
});

test('chickpea prose passes vegan validation but a chickpea allergy still fails', () => {
  const vegan = baseProfile({ foodPreferences: { favoriteFoods: [], forbiddenFoods: [], allergies: [], dietType: 'vegan' } });
  for (const item of ['الحمص', 'بالحمص', 'فتة الحمص', 'اخلط الحمص مع الطحينة']) {
    assert.equal(textContainsForbiddenTerm(item, getForbiddenTermsForProfile(vegan)), null, `expected ${item} to pass`);
  }
  const allergic = baseProfile({ foodPreferences: { favoriteFoods: [], forbiddenFoods: [], allergies: ['حمص'], dietType: 'vegan' } });
  // Must still reject (exact winning term is ordering-dependent: لحم precedes
  // the allergy in the merged term list, and both correctly reject).
  assert.notEqual(textContainsForbiddenTerm('الحمص', getForbiddenTermsForProfile(allergic)), null);
  const plan = buildPlanWithMeal(allergic, 'فتة الحمص', ['الحمص'], 'اخلط الحمص');
  assert.equal(validatePlanAgainstProfile(plan, allergic).isValid, false);
});

test('vegan substitutes use lentils/flaxseed for fish, never algae', () => {
  assert.equal(VEGAN_SUBSTITUTIONS['سمك'], 'عدس مع بذور الكتان');
  assert.ok(!Object.values(VEGAN_SUBSTITUTIONS).some((item) => item.includes('طحالب')));
});

test('vegetarian sanitize prefers egg and halloumi over tofu', () => {
  assert.equal(VEGETARIAN_SUBSTITUTIONS['دجاج'], 'بيض مسلوق');
  assert.equal(VEGETARIAN_SUBSTITUTIONS['لحم'], 'جبنة حلوم مشوية');
  assert.equal(VEGETARIAN_SUBSTITUTIONS['سلمون'], 'جبنة حلوم مشوية');
  assert.ok(!Object.values(VEGETARIAN_SUBSTITUTIONS).some((item) => item.includes('توفو')));

  const profile = baseProfile({ foodPreferences: { favoriteFoods: [], forbiddenFoods: [], allergies: [], dietType: 'vegetarian' } });
  const plan = buildPlanWithMeal(profile, 'لحم مع سمك', ['لحم بقري', 'سمك'], 'اطهُ اللحم مع السمك');
  const { plan: sanitized } = sanitizePlanForProfile(plan, profile);
  assert.equal(validatePlanAgainstProfile(sanitized, profile).isValid, true);
});

test('keto substitutes never contain the banned substring itself', () => {
  for (const [term, substitute] of Object.entries(KETO_SUBSTITUTIONS)) {
    assert.ok(!substitute.includes(term), `keto substitute for ${term} re-contains the ban: ${substitute}`);
  }
  const profile = baseProfile({ foodPreferences: { favoriteFoods: [], forbiddenFoods: [], allergies: [], dietType: 'keto' } });
  const plan = buildPlanWithMeal(profile, 'أرز مع خبز', ['أرز', 'خبز', 'سكر'], 'اسكب عصير مع الأرز والخبز والسكر');
  assert.equal(validatePlanAgainstProfile(plan, profile).isValid, false);
  const { plan: sanitized } = sanitizePlanForProfile(plan, profile);
  const recheck = validatePlanAgainstProfile(sanitized, profile);
  assert.equal(recheck.isValid, true, `still offending: ${recheck.offendingTerm}`);
});

test('arbitrary allergy terms map to the generic seasonal-vegetables substitute', () => {
  assert.equal(GENERIC_SUBSTITUTE, 'خضار موسمية مشكلة');
  const profile = baseProfile({ foodPreferences: { favoriteFoods: [], forbiddenFoods: [], allergies: ['فراولة'], dietType: 'omnivore' } });
  const map = getSubstitutionMapForProfile(profile);
  assert.equal(map['فراولة'], GENERIC_SUBSTITUTE);

  const plan = buildPlanWithMeal(profile, 'سلطة فراولة', ['فراولة', 'خضار'], 'اخلط الفراولة مع الخضار');
  assert.equal(validatePlanAgainstProfile(plan, profile).isValid, false);
  const { plan: sanitized } = sanitizePlanForProfile(plan, profile);
  assert.equal(validatePlanAgainstProfile(sanitized, profile).isValid, true);
});

test('generic collision degrades to the ultimate neutral wording', () => {
  const profile = baseProfile({ foodPreferences: { favoriteFoods: [], forbiddenFoods: [], allergies: ['خضار'], dietType: 'omnivore' } });
  const map = getSubstitutionMapForProfile(profile);
  assert.equal(map['خضار'], ULTIMATE_SAFE_SUBSTITUTE);
});

test('sanitize leaves the userProfile echo untouched', () => {
  const profile = baseProfile({ foodPreferences: { favoriteFoods: [], forbiddenFoods: ['لحم'], allergies: [], dietType: 'vegan' } });
  const plan = buildPlanWithMeal(profile, 'يخنة لحم', ['لحم'], 'اطهُ اللحم');
  const { plan: sanitized } = sanitizePlanForProfile(plan, profile);
  assert.deepEqual(sanitized.userProfile.foodPreferences.forbiddenFoods, ['لحم']);
  assert.ok(!sanitized.nutritionPlan.meals[1].ingredients.includes('لحم'));
});

test('sanitize is a pure clone and counts replacements', () => {
  const profile = baseProfile({ foodPreferences: { favoriteFoods: [], forbiddenFoods: [], allergies: [], dietType: 'vegan' } });
  const plan = buildPlanWithMeal(profile, 'لحم', ['لحم'], 'اطهُ اللحم مع اللحم');
  const { plan: sanitized, replacedCount, replacements } = sanitizePlanForProfile(plan, profile);
  assert.equal(plan.nutritionPlan.meals[1].ingredients[0], 'لحم');
  assert.ok(replacedCount >= 3);
  assert.ok(replacements.some((entry) => entry.term === 'لحم'));
  assert.equal(sanitized.nutritionPlan.meals[1].ingredients[0], VEGAN_SUBSTITUTIONS['لحم']);
});

for (const dietType of ['vegan', 'vegetarian', 'keto', 'omnivore']) {
  test(`static ${dietType} template passes structural and semantic validation`, () => {
    const profile = baseProfile({ foodPreferences: { favoriteFoods: [], forbiddenFoods: [], allergies: [], dietType } });
    const plan = buildStaticFallbackPlan(profile, {
      dailyCalories: 2000,
      macros: { proteinGrams: 100, carbsGrams: 250, fatGrams: 65 },
      hydration: 2.5,
    });
    assert.equal(validateAIResponse(JSON.stringify(plan)).isValid, true);
    const semantic = validatePlanAgainstProfile(plan, profile);
    assert.equal(semantic.isValid, true, `static ${dietType} offending: ${semantic.offendingTerm}`);
  });
}

test('static fallback scales calories to the user target', () => {
  const profile = baseProfile({ foodPreferences: { favoriteFoods: [], forbiddenFoods: [], allergies: [], dietType: 'vegan' } });
  const plan = buildStaticFallbackPlan(profile, {
    dailyCalories: 2500,
    macros: { proteinGrams: 120, carbsGrams: 300, fatGrams: 80 },
    hydration: 3,
  });
  assert.equal(plan.nutritionPlan.dailyCalories, 2500);
  assert.equal(plan.nutritionPlan.proteinGrams, 120);
  assert.equal(plan.nutritionPlan.hydrationLiters, 3);
  const dayTotal = plan.nutritionPlan.weeklyPlan[0].meals.reduce((sum, m) => sum + m.calories, 0);
  assert.equal(plan.nutritionPlan.weeklyPlan[0].totalCalories, dayTotal);
  const factor = 2500 / STATIC_BASE_CALORIES;
  assert.ok(Math.abs(dayTotal - 2500) <= 7, `expected ~2500, got ${dayTotal} (factor ${factor})`);
});

test('static omnivore template sanitized for a fish allergy still passes', () => {
  const profile = baseProfile({ foodPreferences: { favoriteFoods: [], forbiddenFoods: [], allergies: ['سمك'], dietType: 'omnivore' } });
  const plan = buildStaticFallbackPlan(profile, {
    dailyCalories: 2000,
    macros: { proteinGrams: 120, carbsGrams: 230, fatGrams: 65 },
    hydration: 2.5,
  });
  const { plan: sanitized } = sanitizePlanForProfile(plan, profile);
  const semantic = validatePlanAgainstProfile(sanitized, profile);
  assert.equal(semantic.isValid, true, `still offending: ${semantic.offendingTerm}`);
});

test('static templates avoid clinical trigger words where possible', () => {
  const clinicalTerms = ['سكر', 'عصير', 'لانشون', 'نقانق', 'مرتديلا', 'معلبات', 'شيبس', 'مقالي', 'دهون متحولة', 'مشروبات محلاة', 'كيك', 'بسكويت'];
  for (const dietType of ['vegan', 'vegetarian', 'keto', 'omnivore']) {
    const profile = baseProfile({ foodPreferences: { favoriteFoods: [], forbiddenFoods: [], allergies: [], dietType } });
    const plan = buildStaticFallbackPlan(profile, undefined);
    const texts = [];
    for (const m of plan.nutritionPlan.meals) texts.push(m.name, m.recipe, ...m.ingredients);
    for (const day of plan.nutritionPlan.weeklyPlan) for (const m of day.meals) texts.push(m.name, m.recipe, ...m.ingredients);
    for (const term of clinicalTerms) {
      const hit = texts.find((item) => textContainsForbiddenTerm(item, [term]) !== null);
      assert.equal(hit, undefined, `static ${dietType} contains clinical term ${term} in: ${hit}`);
    }
  }
});

test('getStaticFallbackDietKey defaults unknown diets to omnivore', () => {
  assert.equal(getStaticFallbackDietKey(baseProfile()), 'omnivore');
  assert.equal(getStaticFallbackDietKey(baseProfile({ foodPreferences: { dietType: 'keto', forbiddenFoods: [], allergies: [] } })), 'keto');
  assert.equal(getStaticFallbackDietKey(null), 'omnivore');
  const forbidden = getForbiddenTermsForProfile(baseProfile({ foodPreferences: { dietType: 'vegan', forbiddenFoods: [], allergies: [] } }));
  assert.ok(forbidden.includes('لحم'));
});
