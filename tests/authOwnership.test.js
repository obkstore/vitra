import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { authenticateRequest, isOwner, requireAuth } from '../api/middleware/authMiddleware.js';
import Plan from '../api/models/Plan.js';

const TEST_SECRET = 'test-only-secret-for-ownership-tests';

function withSecret(secret, fn) {
  const previous = process.env.JWT_SECRET;
  if (secret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = secret;
  }
  try {
    return fn();
  } finally {
    if (previous === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previous;
    }
  }
}

function silenceConsole(fn) {
  const previous = console.error;
  console.error = () => {};
  try {
    return fn();
  } finally {
    console.error = previous;
  }
}

function reqWithAuth(headerValue) {
  return { headers: { authorization: headerValue } };
}

test('isOwner accepts an exact username match', () => {
  assert.equal(isOwner({ id: '1', username: 'user3' }, 'user3'), true);
});

test('isOwner rejects a different user', () => {
  assert.equal(isOwner({ id: '1', username: 'user1' }, 'user3'), false);
});

test('isOwner rejects empty, missing, and non-string inputs', () => {
  assert.equal(isOwner({ id: '1', username: 'user3' }, ''), false);
  assert.equal(isOwner({ id: '1', username: '' }, 'user3'), false);
  assert.equal(isOwner({ id: '1', username: 'user3' }, undefined), false);
  assert.equal(isOwner(null, 'user3'), false);
  assert.equal(isOwner(undefined, 'user3'), false);
  assert.equal(isOwner({ id: '1', username: 42 }, 'user3'), false);
  assert.equal(isOwner({ id: '1', username: 'user3' }, 42), false);
});

test('isOwner is case-sensitive (no lowercasing rule)', () => {
  assert.equal(isOwner({ id: '1', username: 'User9' }, 'user9'), false);
});

test('authenticateRequest returns the payload for a valid Bearer token', () => {
  const token = jwt.sign({ id: 'abc', username: 'user3' }, TEST_SECRET);
  const user = withSecret(TEST_SECRET, () => authenticateRequest(reqWithAuth(`Bearer ${token}`)));
  assert.equal(user?.id, 'abc');
  assert.equal(user?.username, 'user3');
});

test('authenticateRequest returns null for missing or malformed headers', () => {
  withSecret(TEST_SECRET, () => silenceConsole(() => {
    assert.equal(authenticateRequest({ headers: {} }), null);
    assert.equal(authenticateRequest(reqWithAuth('Token abc.def.ghi')), null);
    assert.equal(authenticateRequest(reqWithAuth('Bearer')), null);
    assert.equal(authenticateRequest(reqWithAuth('')), null);
  }));
});

test('authenticateRequest returns null for tampered and expired tokens', () => {
  const valid = jwt.sign({ id: 'abc', username: 'user3' }, TEST_SECRET);
  const expired = jwt.sign(
    { id: 'abc', username: 'user3', exp: Math.floor(Date.now() / 1000) - 10 },
    TEST_SECRET,
  );
  withSecret(TEST_SECRET, () => silenceConsole(() => {
    assert.equal(authenticateRequest(reqWithAuth(`Bearer ${valid.slice(0, -2)}xx`)), null);
    assert.equal(authenticateRequest(reqWithAuth(`Bearer ${expired}`)), null);
  }));
});

test('authenticateRequest returns null when JWT_SECRET is not configured', () => {
  const token = jwt.sign({ id: 'abc', username: 'user3' }, TEST_SECRET);
  const user = withSecret(undefined, () => silenceConsole(
    () => authenticateRequest(reqWithAuth(`Bearer ${token}`)),
  ));
  assert.equal(user, null);
});

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

test('requireAuth attaches req.user and calls next for a valid token', () => {
  const token = jwt.sign({ id: 'abc', username: 'user3' }, TEST_SECRET);
  const req = reqWithAuth(`Bearer ${token}`);
  let nextCalled = false;
  withSecret(TEST_SECRET, () => {
    requireAuth(req, mockRes(), () => {
      nextCalled = true;
    });
  });
  assert.equal(nextCalled, true);
  assert.equal(req.user?.username, 'user3');
});

test('requireAuth rejects missing header with the malformed-header message', () => {
  const res = mockRes();
  let nextCalled = false;
  withSecret(TEST_SECRET, () => silenceConsole(() => {
    requireAuth({ headers: {} }, res, () => {
      nextCalled = true;
    });
  }));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body?.ok, false);
  assert.match(res.body?.error ?? '', /malformed/i);
});

test('requireAuth rejects tampered tokens as invalid', () => {
  const valid = jwt.sign({ id: 'abc', username: 'user3' }, TEST_SECRET);
  const res = mockRes();
  let nextCalled = false;
  withSecret(TEST_SECRET, () => silenceConsole(() => {
    requireAuth(reqWithAuth(`Bearer ${valid.slice(0, -2)}xx`), res, () => {
      nextCalled = true;
    });
  }));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body?.error, 'Invalid or expired token');
});

test('Plan model requires userId, username, and plan (no DB needed)', async () => {
  await assert.rejects(new Plan({}).validate(), (err) => {
    assert.ok(err.errors?.userId);
    assert.ok(err.errors?.username);
    assert.ok(err.errors?.plan);
    return true;
  });

  await new Plan({
    userId: new mongoose.Types.ObjectId(),
    username: 'user3',
    plan: { nutritionPlan: {} },
  }).validate();
});
