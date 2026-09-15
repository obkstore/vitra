import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAIResponse, validatePlanAgainstProfile, buildUserPrompt } from '../src/utils/promptBuilder.js';
import { textContainsForbiddenTerm, getForbiddenTermsForProfile } from '../src/utils/therapeuticGuidance.js';

function buildValidPayload() {
  return {
    userProfile: {
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
    },
    nutritionPlan: {
      dailyCalories: 2000,
      proteinGrams: 140,
      carbsGrams: 220,
      fatGrams: 60,
      hydrationLiters: 2.5,
      meals: [
        { name: 'فطور', time: '08:00', ingredients: ['شوفان'], calories: 400, prepTimeMinutes: 10, recipe: 'اخلط' },
        { name: 'غداء', time: '13:00', ingredients: ['حمص'], calories: 600, prepTimeMinutes: 20, recipe: 'جهز' },
        { name: 'عشاء', time: '20:00', ingredients: ['سمك'], calories: 700, prepTimeMinutes: 15, recipe: 'اطبخ' },
        { name: 'سناك', time: '17:00', ingredients: ['لوز'], calories: 300, prepTimeMinutes: 5, recipe: 'تناول' },
      ],
      weeklyPlan: Array.from({ length: 7 }, (_, index) => ({
        day: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'][index],
        meals: [
          { mealType: 'breakfast', name: 'فطور', time: '08:00', ingredients: ['شوفان'], calories: 400, prepTimeMinutes: 10, recipe: 'اخلط' },
          { mealType: 'lunch', name: 'غداء', time: '13:00', ingredients: ['حمص'], calories: 600, prepTimeMinutes: 20, recipe: 'جهز' },
          { mealType: 'dinner', name: 'عشاء', time: '20:00', ingredients: ['سمك'], calories: 700, prepTimeMinutes: 15, recipe: 'اطبخ' },
          { mealType: 'snack', name: 'سناك', time: '17:00', ingredients: ['لوز'], calories: 300, prepTimeMinutes: 5, recipe: 'تناول' },
        ],
        totalCalories: 2000,
      })),
    },
    exercisePlan: {
      weeklyWorkouts: [
        { day: 'السبت', type: 'قوة', durationMinutes: 35, caloriesBurned: 220, exercises: [{ name: 'تمرين', sets: 3, reps: '10', restSeconds: 60, description: 'مثال', difficulty: 'beginner' }] },
        { day: 'الأحد', type: 'كارديو', durationMinutes: 30, caloriesBurned: 180, exercises: [{ name: 'تمرين', sets: 3, reps: '10', restSeconds: 60, description: 'مثال', difficulty: 'beginner' }] },
        { day: 'الاثنين', type: 'مرونة', durationMinutes: 25, caloriesBurned: 140, exercises: [{ name: 'تمرين', sets: 3, reps: '10', restSeconds: 60, description: 'مثال', difficulty: 'beginner' }] },
        { day: 'الثلاثاء', type: 'قوة', durationMinutes: 35, caloriesBurned: 220, exercises: [{ name: 'تمرين', sets: 3, reps: '10', restSeconds: 60, description: 'مثال', difficulty: 'beginner' }] },
        { day: 'الأربعاء', type: 'كارديو', durationMinutes: 30, caloriesBurned: 180, exercises: [{ name: 'تمرين', sets: 3, reps: '10', restSeconds: 60, description: 'مثال', difficulty: 'beginner' }] },
      ],
      dailyStepsGoal: 8000,
      activeMinutesGoal: 30,
    },
    balanceIndex: { score: 72, insights: ['a'], recommendations: ['b'] },
    generatedAt: '2026-01-01T00:00:00.000Z',
    planDurationWeeks: 4,
  };
}

test('validateAIResponse rejects incomplete meal entries', () => {
  const payload = buildValidPayload();
  payload.nutritionPlan.weeklyPlan[0].meals[0] = {
    mealType: 'breakfast',
    name: 'فطور',
    time: '08:00',
    ingredients: ['شوفان'],
    calories: 400,
  };

  const result = validateAIResponse(JSON.stringify(payload));
  assert.equal(result.isValid, false);
  assert.match(result.error, /weeklyPlan|prepTimeMinutes|recipe/i);
});

test('validateAIResponse accepts fully shaped plan data', () => {
  const result = validateAIResponse(JSON.stringify(buildValidPayload()));
  assert.equal(result.isValid, true);
  assert.equal(result.error, null);
});

test('validatePlanAgainstProfile rejects forbidden ingredients for diabetes', () => {
  const payload = buildValidPayload();
  payload.userProfile.healthConditions = ['diabetes'];
  payload.nutritionPlan.meals[0].ingredients = ['سكر'];

  const result = validatePlanAgainstProfile(payload, payload.userProfile);
  assert.equal(result.isValid, false);
  assert.match(result.error, /محظور|forbidden|سكر/i);
});

function buildVeganProfile() {
  const payload = buildValidPayload();
  payload.userProfile.foodPreferences.dietType = 'vegan';
  payload.userProfile.foodPreferences.allergies = [];
  payload.userProfile.foodPreferences.forbiddenFoods = [];
  return payload.userProfile;
}

// Base fixture uses سمك (fish) for dinner — correctly non-vegan. Sanitize the
// whole payload to vegan-safe ingredients so milk assertions are isolated.
function buildVeganPayload() {
  const payload = buildValidPayload();
  payload.userProfile = buildVeganProfile();
  for (const meal of payload.nutritionPlan.meals) {
    meal.ingredients = meal.ingredients.map((item) => (item === 'سمك' ? 'عدس' : item));
    if (meal.recipe.includes('سمك')) meal.recipe = meal.recipe.replace(/سمك/g, 'عدس');
  }
  for (const day of payload.nutritionPlan.weeklyPlan) {
    for (const meal of day.meals) {
      meal.ingredients = meal.ingredients.map((item) => (item === 'سمك' ? 'عدس' : item));
      if (meal.recipe.includes('سمك')) meal.recipe = meal.recipe.replace(/سمك/g, 'عدس');
    }
  }
  return payload;
}

test('vegan profile still forbids dairy via diet rules with empty allergies', () => {
  const terms = getForbiddenTermsForProfile(buildVeganProfile());
  assert.ok(terms.includes('حليب'));
});

test('plant-based milks pass vegan validation', () => {
  for (const milk of ['حليب الشوفان', 'حليب اللوز', 'حليب الصويا', 'حليب جوز الهند', 'حليب نباتي']) {
    const payload = buildVeganPayload();
    payload.nutritionPlan.meals[0].ingredients = [milk];
    payload.nutritionPlan.meals[0].name = `وجبة مع ${milk}`;
    payload.nutritionPlan.meals[0].recipe = `اخلط ${milk} مع الشوفان`;

    const result = validatePlanAgainstProfile(payload, payload.userProfile);
    assert.equal(result.isValid, true, `expected ${milk} to pass vegan validation`);
  }
});

test('plain and bovine milk fail vegan validation', () => {
  for (const milk of ['حليب', 'حليب بقري']) {
    const payload = buildVeganPayload();
    payload.nutritionPlan.meals[0].ingredients = [milk];

    const result = validatePlanAgainstProfile(payload, payload.userProfile);
    assert.equal(result.isValid, false, `expected ${milk} to fail vegan validation`);
    assert.equal(result.offendingTerm, 'حليب');
  }
});

test('plant milk mixed with real dairy still fails', () => {
  const payload = buildVeganPayload();
  payload.nutritionPlan.meals[0].ingredients = ['حليب الشوفان', 'جبن'];

  const result = validatePlanAgainstProfile(payload, payload.userProfile);
  assert.equal(result.isValid, false);
  assert.equal(result.offendingTerm, 'جبن');
});

test('textContainsForbiddenTerm exempts plant milks but not plain milk', () => {
  const terms = ['حليب'];
  assert.equal(textContainsForbiddenTerm('حليب الشوفان', terms), null);
  assert.equal(textContainsForbiddenTerm('حليب', terms), 'حليب');
  assert.equal(textContainsForbiddenTerm('حليب بقري', terms), 'حليب');
});

function buildVegetarianProfile() {
  const payload = buildValidPayload();
  payload.userProfile.foodPreferences.dietType = 'vegetarian';
  payload.userProfile.foodPreferences.allergies = [];
  payload.userProfile.foodPreferences.forbiddenFoods = [];
  return payload.userProfile;
}

function buildVegetarianPayload() {
  const payload = buildValidPayload();
  payload.userProfile = buildVegetarianProfile();
  for (const meal of payload.nutritionPlan.meals) {
    meal.ingredients = meal.ingredients.map((item) => (item === 'سمك' ? 'عدس' : item));
    if (meal.recipe.includes('سمك')) meal.recipe = meal.recipe.replace(/سمك/g, 'عدس');
  }
  for (const day of payload.nutritionPlan.weeklyPlan) {
    for (const meal of day.meals) {
      meal.ingredients = meal.ingredients.map((item) => (item === 'سمك' ? 'عدس' : item));
      if (meal.recipe.includes('سمك')) meal.recipe = meal.recipe.replace(/سمك/g, 'عدس');
    }
  }
  return payload;
}

test('universal vegan alternatives pass vegan validation', () => {
  const alternatives = [
    'جبن نباتي',
    'لحم نباتي',
    'زبادي الصويا',
    'حليب الكاجو',
    'زبدة الفول السوداني',
    'الحليب النباتي',
    'الجبن النباتي',
    'دجاج الصويا',
    'جبنة نباتية',
  ];
  for (const item of alternatives) {
    const payload = buildVeganPayload();
    payload.nutritionPlan.meals[0].ingredients = [item];
    payload.nutritionPlan.meals[0].name = `وجبة مع ${item}`;
    payload.nutritionPlan.meals[0].recipe = `اخلط ${item} مع الخضار`;

    const result = validatePlanAgainstProfile(payload, payload.userProfile);
    assert.equal(result.isValid, true, `expected ${item} to pass vegan validation`);
  }
});

test('vegan alternatives pass vegetarian validation while plain meat fails', () => {
  const passing = buildVegetarianPayload();
  passing.nutritionPlan.meals[0].ingredients = ['لحم نباتي'];
  passing.nutritionPlan.meals[0].name = 'وجبة مع لحم نباتي';
  passing.nutritionPlan.meals[0].recipe = 'اخلط لحم نباتي مع الخضار';
  assert.equal(validatePlanAgainstProfile(passing, passing.userProfile).isValid, true);

  const failing = buildVegetarianPayload();
  failing.nutritionPlan.meals[0].ingredients = ['لحم بقري'];
  const result = validatePlanAgainstProfile(failing, failing.userProfile);
  assert.equal(result.isValid, false);
  assert.equal(result.offendingTerm, 'لحم');
});

test('non-plant animal terms still fail vegan validation', () => {
  const cases = [
    { item: 'جبن قريش', term: 'جبن' },
    { item: 'لحم بقري', term: 'لحم' },
    { item: 'سمن بلدي', term: 'سمن' },
    { item: 'لبن رائب', term: 'لبن' },
  ];
  for (const { item, term } of cases) {
    const payload = buildVeganPayload();
    payload.nutritionPlan.meals[0].ingredients = [item];

    const result = validatePlanAgainstProfile(payload, payload.userProfile);
    assert.equal(result.isValid, false, `expected ${item} to fail vegan validation`);
    assert.equal(result.offendingTerm, term);
  }
});

test('textContainsForbiddenTerm masks any animal+plant combo', () => {
  const dairy = ['حليب', 'جبن', 'لبن', 'زبادي'];
  const meat = ['لحم', 'دجاج', 'سمك'];
  for (const item of ['جبن نباتي', 'الجبن النباتي', 'زبادي الصويا', 'حليب الكاجو', 'زبدة الفول السوداني']) {
    assert.equal(textContainsForbiddenTerm(item, dairy), null, `expected ${item} to be masked`);
  }
  for (const item of ['لحم نباتي', 'دجاج الصويا', 'الحليب النباتي']) {
    assert.equal(textContainsForbiddenTerm(item, [...dairy, ...meat]) , null, `expected ${item} to be masked`);
  }
  assert.equal(textContainsForbiddenTerm('جبن نباتي مع حليب بقري', dairy), 'حليب');
  assert.equal(textContainsForbiddenTerm('جبن قريش', dairy), 'جبن');
});

function buildPromptFixtures() {
  const payload = buildValidPayload();
  const nutritionSummary = {
    bmi: { value: 22.5, categoryAr: 'طبيعي' },
    dailyCalories: 2000,
    macros: { proteinGrams: 140, carbsGrams: 220, fatGrams: 60 },
    hydration: 2.5,
  };
  return { userProfile: payload.userProfile, nutritionSummary };
}

test('buildUserPrompt injects therapeutic guide section when guide text supplied', () => {
  const { userProfile, nutritionSummary } = buildPromptFixtures();
  const prompt = buildUserPrompt(userProfile, nutritionSummary, 'قاعدة تجريبية: Low-FODMAP مؤقت');

  assert.ok(prompt.includes('=== دليل الأنظمة الغذائية العلاجية المعتمد (قواعد صارمة واجبة الاتباع) ==='));
  assert.ok(prompt.includes('You must strictly follow the therapeutic rules'));
  assert.ok(prompt.includes('قاعدة تجريبية: Low-FODMAP مؤقت'));
});

test('buildUserPrompt omits guide section when guide text is empty', () => {
  const { userProfile, nutritionSummary } = buildPromptFixtures();

  for (const empty of ['', '   ', undefined]) {
    const prompt = buildUserPrompt(userProfile, nutritionSummary, empty);
    assert.equal(prompt.includes('دليل الأنظمة الغذائية العلاجية المعتمد'), false);
  }
});

test('buildUserPrompt stays backward compatible without guide argument', () => {
  const { userProfile, nutritionSummary } = buildPromptFixtures();
  const prompt = buildUserPrompt(userProfile, nutritionSummary);

  assert.equal(prompt.includes('دليل الأنظمة الغذائية العلاجية المعتمد'), false);
  assert.ok(prompt.includes('=== بيانات المستخدم ==='));
});
