import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPlanRequest, stableStringify } from '../api/utils/planCache.js';
import PlanCache from '../api/models/PlanCache.js';

test('stableStringify ignores key order but respects values and arrays', () => {
  const a = stableStringify({ b: 1, a: { y: 2, x: 1 } });
  const b = stableStringify({ a: { x: 1, y: 2 }, b: 1 });
  assert.equal(a, b);
  assert.notEqual(stableStringify({ a: 1 }), stableStringify({ a: 2 }));
  assert.notEqual(stableStringify([1, 2]), stableStringify([2, 1]));
});

test('hashPlanRequest is stable, sensitive, and model-scoped', () => {
  const base = { userProfile: { age: 30 }, nutritionSummary: { kcal: 2000 }, model: 'gemini-2.0-flash' };
  assert.equal(hashPlanRequest(base), hashPlanRequest(structuredClone(base)));
  assert.match(hashPlanRequest(base), /^[0-9a-f]{64}$/);

  const reordered = { model: 'gemini-2.0-flash', nutritionSummary: { kcal: 2000 }, userProfile: { age: 30 } };
  assert.equal(hashPlanRequest(base), hashPlanRequest(reordered));

  assert.notEqual(hashPlanRequest(base), hashPlanRequest({ ...base, userProfile: { age: 31 } }));
  assert.notEqual(hashPlanRequest(base), hashPlanRequest({ ...base, model: 'other-model' }));
});

test('PlanCache model requires key and payload (no DB needed)', async () => {
  await assert.rejects(new PlanCache({}).validate(), (err) => {
    assert.ok(err.errors?.key);
    assert.ok(err.errors?.payload);
    return true;
  });

  await new PlanCache({ key: 'abc123', payload: { ok: true } }).validate();
});
