import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAIResponse, validatePlanAgainstProfile } from '../src/utils/promptBuilder.js';

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
