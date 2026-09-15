import test from 'node:test';
import assert from 'node:assert/strict';
import { getProviderConfig, getCandidateModels } from '../api/generate-plan.mjs';

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

test('getProviderConfig defaults the primary model to gemini-2.5-flash-lite', () => {
  withoutEnvVar('GEMINI_MODEL', () => {
    assert.equal(getProviderConfig().model, 'gemini-2.5-flash-lite');
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

test('getCandidateModels leads with gemini-2.5-flash-lite then ordered fallbacks', () => {
  withoutEnvVar('GEMINI_MODEL', () => {
    const models = getCandidateModels({});
    assert.deepEqual(models, ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.1-flash-lite']);
  });
});

test('getCandidateModels dedupes an env override matching a fallback', () => {
  const saved = process.env.GEMINI_MODEL;
  process.env.GEMINI_MODEL = 'gemini-2.5-flash';
  try {
    const models = getCandidateModels({});
    assert.equal(models[0], 'gemini-2.5-flash');
    assert.equal(new Set(models).size, models.length);
  } finally {
    if (saved === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = saved;
  }
});
