import test from 'node:test';
import assert from 'node:assert/strict';
import { readScoped, removeScoped, scopedKey, writeScoped } from '../src/utils/userScopedStorage.js';

/** In-memory localStorage stand-in (node has no DOM). */
function fakeStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      data.set(key, String(value));
    },
    removeItem: (key) => {
      data.delete(key);
    },
    has: (key) => data.has(key),
  };
}

test('scopedKey namespaces signed-in users and keeps the legacy guest key', () => {
  assert.equal(scopedKey('healthplan_generated_plan', 'user3'), 'healthplan_generated_plan:user3');
  assert.equal(scopedKey('healthplan_generated_plan', null), 'healthplan_generated_plan');
  assert.equal(scopedKey('healthplan_generated_plan', ''), 'healthplan_generated_plan');
  assert.equal(scopedKey('healthplan_generated_plan', undefined), 'healthplan_generated_plan');
});

test('write/read round-trips isolated slots per user', () => {
  const store = fakeStore();
  writeScoped('healthplan_generated_plan', 'userA', { plan: 'A' }, store);
  writeScoped('healthplan_generated_plan', 'userB', { plan: 'B' }, store);
  writeScoped('healthplan_generated_plan', null, { plan: 'guest' }, store);

  assert.deepEqual(readScoped('healthplan_generated_plan', 'userA', store), { plan: 'A' });
  assert.deepEqual(readScoped('healthplan_generated_plan', 'userB', store), { plan: 'B' });
  assert.deepEqual(readScoped('healthplan_generated_plan', null, store), { plan: 'guest' });
});

test('a fresh account finds nothing when no legacy slot exists', () => {
  // No legacy global key here, so there is nothing to adopt — the leak fix.
  assert.equal(readScoped('healthplan_generated_plan', 'brandNewUser', fakeStore()), null);
});

test('signed-in users one-time adopt the legacy global slot, then it is gone', () => {
  const store = fakeStore({ healthplan_generated_plan: JSON.stringify({ plan: 'legacy' }) });

  assert.deepEqual(readScoped('healthplan_generated_plan', 'userA', store), { plan: 'legacy' });
  assert.equal(store.has('healthplan_generated_plan'), false);
  assert.equal(store.has('healthplan_generated_plan:userA'), true);

  // The next account must NOT inherit it.
  assert.equal(readScoped('healthplan_generated_plan', 'userB', store), null);
});

test('guests read the legacy slot as-is without adopting it', () => {
  const store = fakeStore({ healthplan_generated_plan: JSON.stringify({ plan: 'guest' }) });
  assert.deepEqual(readScoped('healthplan_generated_plan', null, store), { plan: 'guest' });
  assert.equal(store.has('healthplan_generated_plan'), true);
});

test('corrupt JSON resolves to null and clears the slot', () => {
  const store = fakeStore({ 'healthplan_generated_plan:userA': 'not-json{{{' });
  assert.equal(readScoped('healthplan_generated_plan', 'userA', store), null);
  assert.equal(store.has('healthplan_generated_plan:userA'), false);
});

test('removeScoped deletes only the targeted slot', () => {
  const store = fakeStore();
  writeScoped('healthplan_generated_plan', 'userA', { plan: 'A' }, store);
  writeScoped('healthplan_generated_plan', 'userB', { plan: 'B' }, store);

  removeScoped('healthplan_generated_plan', 'userA', store);
  assert.equal(readScoped('healthplan_generated_plan', 'userA', store), null);
  assert.deepEqual(readScoped('healthplan_generated_plan', 'userB', store), { plan: 'B' });
});
