import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "username is required"],
      // Real MongoDB unique index (not just validation): Mongoose translates
      // this into db.users.createIndex({ username: 1 }, { unique: true })
      // via ensureIndexes when the model initializes on first connect
      // (see api/config/db.js -> mongoose.connect). Duplicate inserts fail
      // at the DATABASE level with error code 11000, which
      // api/controllers/authController.js maps to HTTP 409 — even under
      // races that slip past the findOne pre-check.
      unique: true,
      trim: true,
      minlength: [3, "username must be at least 3 characters"],
    },
    email: {
      type: String,
      required: [true, "email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "email is invalid"],
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    password: {
      type: String,
      required: [true, "password is required"],
      minlength: [6, "password must be at least 6 characters"],
      select: false,
    },
    assignedPage: {
      type: String,
      // No default: every user must be explicitly assigned their own diet
      // plan page (e.g. '/dashboard/user1'). Omitting it fails validation
      // (Mongoose) and the register controller rejects it with 400 first.
      required: [true, "assignedPage is required"],
      trim: true,
      match: [/^\/[A-Za-z0-9/_-]*$/, "assignedPage must be a route like '/dashboard/user1'"],
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
  },
  { timestamps: true },
);

// Hash password with bcrypt before saving, only when it was modified.
// NOTE: no `next` parameter — Mongoose 9 (kareem) does not pass `next` to
// async pre hooks, so declaring it yields `next is not a function` and every
// save fails. Errors propagate by rejecting the promise instead.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare a plain-text candidate password with the stored hash.
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate a reset password token.
userSchema.methods.createResetPasswordToken = function () {
  const resetToken = Math.random().toString(36).substring(2, 16) + Math.random().toString(36).substring(2, 16);

  // Hash token and set resetPasswordToken and resetPasswordExpires
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour

  return resetToken;
};

// Hide password hash when serializing.
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.models.User ?? mongoose.model("User", userSchema);

export default User;
