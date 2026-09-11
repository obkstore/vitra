import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../api/models/User.js";
import ConsultationRequest, { CONSULTATION_STATUSES } from "../api/models/ConsultationRequest.js";

test("User role defaults to user and only allows user/admin", () => {
  const rolePath = User.schema.path("role");
  assert.equal(rolePath.options.default, "user");
  assert.deepEqual([...rolePath.enumValues].sort(), ["admin", "user"]);

  const okUser = new User({ username: "alice", password: "secret1", assignedPage: "/dashboard/alice" });
  assert.equal(okUser.role, "user");

  const badRole = new User({
    username: "bob",
    password: "secret1",
    assignedPage: "/dashboard/bob",
    role: "superadmin",
  });
  const err = badRole.validateSync();
  assert.ok(err?.errors?.role, "invalid role should fail validation");
});

test("CONSULTATION_STATUSES covers the required lifecycle", () => {
  assert.deepEqual([...CONSULTATION_STATUSES].sort(), ["forwarded_to_trainer", "pending", "resolved"].sort());
});

test("ConsultationRequest requires email + message and defaults to pending", () => {
  const userId = new mongoose.Types.ObjectId();

  const missing = new ConsultationRequest({ userId });
  const missingErr = missing.validateSync();
  assert.ok(missingErr?.errors?.email, "email is required");
  assert.ok(missingErr?.errors?.message, "message is required");

  const badEmail = new ConsultationRequest({ userId, email: "not-an-email", message: "a valid long message" });
  assert.ok(badEmail.validateSync()?.errors?.email, "invalid email should fail");

  const shortMsg = new ConsultationRequest({ userId, email: "a@b.co", message: "short" });
  assert.ok(shortMsg.validateSync()?.errors?.message, "short message should fail");

  const badStatus = new ConsultationRequest({
    userId,
    email: "a@b.co",
    message: "a valid long message",
    status: "archived",
  });
  assert.ok(badStatus.validateSync()?.errors?.status, "unknown status should fail");

  const valid = new ConsultationRequest({
    userId,
    email: "User@Example.COM",
    message: "I need help planning meals for diabetes management.",
  });
  const validErr = valid.validateSync();
  assert.equal(validErr, undefined);
  assert.equal(valid.status, "pending");
  assert.equal(valid.email, "user@example.com");
});

test("ConsultationRequest schema has userId ref, status index, and timestamps", () => {
  assert.equal(ConsultationRequest.schema.path("userId").options.ref, "User");
  assert.ok(ConsultationRequest.schema.path("status").options.index, "status should be indexed");
  assert.ok(ConsultationRequest.schema.path("userId").options.index, "userId should be indexed");
  const paths = Object.keys(ConsultationRequest.schema.paths);
  assert.ok(paths.includes("createdAt"), "timestamps should provide createdAt");
  assert.ok(paths.includes("updatedAt"), "timestamps should provide updatedAt");
});
