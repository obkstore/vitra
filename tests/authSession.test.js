import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { isTokenExpired } from '../src/services/authService.js';

function unsignedToken(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode(payload)}.sig`;
}

test('isTokenExpired accepts a token expiring in the future', () => {
  const token = unsignedToken({ id: '1', exp: Math.floor(Date.now() / 1000) + 3600 });
  assert.equal(isTokenExpired(token), false);
});

test('isTokenExpired rejects past, missing, and malformed tokens', () => {
  assert.equal(
    isTokenExpired(unsignedToken({ id: '1', exp: Math.floor(Date.now() / 1000) - 10 })),
    true,
  );
  assert.equal(isTokenExpired(unsignedToken({ id: '1' })), true);
  assert.equal(isTokenExpired('not.a.token'), true);
  assert.equal(isTokenExpired(''), true);
  assert.equal(isTokenExpired(null), true);
  assert.equal(isTokenExpired(undefined), true);
});
