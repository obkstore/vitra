import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import handler, { getProviderConfig, getCandidateModels } from '../api/generate-plan.mjs';
import { validateAIResponse, validatePlanAgainstProfile } from '../src/utils/promptBuilder.js';

function withoutEnvVar(name, fn) {
  const had = Object.hasOwn(process.env, name);
  const saved = process.env[name];
  delete process.env[name];
  try {
    fn();
  } finally {
    if (had) process.env[name] = saved;
  }
}

test('getProviderConfig defaults the primary model to gemini-3.5-flash-lite', () => {
  withoutEnvVar('GEMINI_MODEL', () => {
    assert.equal(getProviderConfig().model, 'gemini-3.5-flash-lite');
  });
});

test('getProviderConfig respects the GEMINI_MODEL override', () => {
  const saved = process.env.GEMINI_MODEL;
  process.env.GEMINI_MODEL = 'custom-model';
  try {
    assert.equal(getProviderConfig().model, 'custom-model');
  } finally {
    if (saved === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = saved;
  }
});

test('getCandidateModels leads with gemini-3.5-flash-lite then ordered fallbacks', () => {
  withoutEnvVar('GEMINI_MODEL', () => {
    const models = getCandidateModels({});
    assert.deepEqual(models, ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.1-flash-lite']);
  });
});

test('getCandidateModels dedupes an env override matching a fallback', () => {
  const saved = process.env.GEMINI_MODEL;
  process.env.GEMINI_MODEL = 'gemini-3.6-flash';
  try {
    const models = getCandidateModels({});
    assert.equal(models[0], 'gemini-3.6-flash');
    assert.equal(new Set(models).size, models.length);
  } finally {
    if (saved === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = saved;
  }
});

// Provider-outage coverage: with no MongoDB running, the plan cache is
// fail-open but mongoose buffers the lookup, so shrink the buffer timeout
// to keep these tests fast (per-file process isolation: no cross-file impact).
mongoose.set('bufferTimeoutMS', 50);

function veganRequestBody() {
  const userProfile = {
    age: 32,
    gender: 'female',
    weight: 68,
    height: 165,
    healthConditions: ['none'],
    goal: 'maintain',
    mentalState: { stressLevel: 3, sleepQuality: 4, energyLevel: 3 },
    foodPreferences: { favoriteFoods: [], forbiddenFoods: [], allergies: [], dietType: 'vegan' },
    activityLevel: 'lightly_active',
    availableEquipment: ['home'],
  };
  return {
    userProfile,
    nutritionSummary: {
      bmi: { value: 22.5, categoryAr: 'طبيعي' },
      dailyCalories: 2100,
      macros: { proteinGrams: 110, carbsGrams: 260, fatGrams: 60 },
      hydration: 2.5,
    },
  };
}

function mockRes() {
  return {
    statusCode: null,
    body: null,
    headersSent: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
  };
}

async function withStubbedFetch(stub, fn) {
  const savedFetch = globalThis.fetch;
  const savedKey = globalThis.process.env.GEMINI_API_KEY;
  globalThis.fetch = stub;
  globalThis.process.env.GEMINI_API_KEY = 'test-key';
  try {
    await fn();
  } finally {
    globalThis.fetch = savedFetch;
    if (savedKey === undefined) delete globalThis.process.env.GEMINI_API_KEY;
    else globalThis.process.env.GEMINI_API_KEY = savedKey;
  }
}

function quotaExceededStub() {
  return async () => ({
    ok: false,
    status: 429,
    headers: { get: () => null },
    json: async () => ({ error: { message: 'Quota exceeded' } }),
  });
}

test('provider 429 quota errors serve scaled static fallback with 200', async () => {
  await withStubbedFetch(quotaExceededStub(), async () => {
    const body = veganRequestBody();
    const res = mockRes();
    await handler({ method: 'POST', headers: {}, body }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.fallback, 'static');
    assert.equal(res.body.cached, false);
    assert.equal(res.body.data.nutritionPlan.dailyCalories, 2100);
    assert.equal(validateAIResponse(JSON.stringify(res.body.data)).isValid, true);
    assert.equal(validatePlanAgainstProfile(res.body.data, body.userProfile).isValid, true);
  });
});

test('provider network failure serves scaled static fallback with 200', async () => {
  await withStubbedFetch(async () => { throw new TypeError('fetch failed'); }, async () => {
    const body = veganRequestBody();
    const res = mockRes();
    await handler({ method: 'POST', headers: {}, body }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.fallback, 'static');
    assert.equal(validateAIResponse(JSON.stringify(res.body.data)).isValid, true);
    assert.equal(validatePlanAgainstProfile(res.body.data, body.userProfile).isValid, true);
  });
});
