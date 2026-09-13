import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined. Set it in your .env file.");
  }
  return jwt.sign(
    { id: user._id.toString(), username: user.username, role: user.role ?? "user" },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "1d" },
  );
}

/**
 * POST /login
 * Verifies credentials and returns a JWT plus the user's assignedPage.
 * Self-heals stale pages: an admin promoted via manual DB update keeps
 * their old `/dashboard/<username>` page until fixed — so when the stored
 * role is admin but assignedPage isn't `/admin/home`, the corrected value
 * is persisted before responding and the next login lands correctly.
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "email and password are required" });
    }

    // password has `select: false`, so explicitly include it for verification.
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    if (user.role === "admin" && user.assignedPage !== "/admin/home") {
      user.assignedPage = "/admin/home";
      await user.save();
    }

    const jwtToken = signToken(user);

    return res.status(200).json({
      ok: true,
      token: jwtToken,
      assignedPage: user.assignedPage,
      email: user.email,
      username: user.username,
      role: user.role ?? "user",
    });
  } catch (err) {
    // Message only: full error objects can embed submitted field values.
    console.error("Login error:", err?.message ?? err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}

/**
 * POST /register (helper for creating users; password is hashed by the model).
 * assignedPage is derived server-side and role-aware: regular users get
 * `/dashboard/<username>`, admins get `/admin/home` — so a client can never
 * create a mismatched user (page belonging to someone else) — the exact
 * class of bug that froze the dashboard on a blank page.
 */
export async function register(req, res) {
  try {
    // Trim like the User schema (trim: true) and the frontend do. Lookups
    // elsewhere are exact case-sensitive findOne({ username }), and the
    // model has no lowercase rule — so trim but NEVER lowercase here, or
    // `/dashboard/User9` would mismatch a login expecting `user9`.
    const username = String(req.body?.username ?? "").trim();
    const email = String(req.body?.email ?? "").trim();
    const password = req.body?.password;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ ok: false, error: "username, email and password are required" });
    }

    // NOTE: `role` is intentionally never read from req.body. Every
    // self-registration creates a plain "user"; admins are promoted via a
    // one-off DB update (see DEPLOY/admin bootstrap notes). Accepting a
    // client-supplied role would allow privilege escalation.
    // The admin branch below doesn't trigger for new signups yet — it
    // prepares for admin creation flows (step 5).
    const role = "user";
    const assignedPage = role === "admin" ? "/admin/home" : `/dashboard/${username}`;

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ ok: false, error: "email already exists" });
    }

    // Check if username already exists
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ ok: false, error: "username already exists" });
    }

    const user = await User.create({ username, email, password, assignedPage, role });
    const token = signToken(user);

    return res.status(201).json({
      ok: true,
      token,
      assignedPage: user.assignedPage,
      email: user.email,
      username: user.username,
      role: user.role ?? "user",
    });
  } catch (err) {
    // Message only: Mongoose ValidationError objects embed the rejected
    // field values — including the submitted password — must never
    // reach logs.
    console.error("Register error:", err?.message ?? err);
    if (err?.code === 11000) {
      // Duplicate key: distinguish email vs username via keyPattern/keyValue/message.
      // The old code returned "username already exists" for every 11000,
      // making the email check below unreachable dead code.
      const isEmail =
        err?.keyPattern?.email || err?.keyValue?.email || String(err?.message ?? "").includes("email");
      if (isEmail) {
        return res.status(409).json({ ok: false, error: "email already exists" });
      }
      return res.status(409).json({ ok: false, error: "username already exists" });
    }
    if (err?.name === "ValidationError") {
      return res.status(400).json({ ok: false, error: err.message });
    }
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}

/**
 * POST /forgot-password
 * Sends a password reset token/link to the user's email.
 */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body ?? {};

    if (!email) {
      return res.status(400).json({ ok: false, error: "email is required" });
    }

    console.log("Attempting to send email to:", email);

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether user exists or not for security
      return res.status(200).json({ ok: true, message: "If an account with that email exists, a reset link has been sent." });
    }

    // Generate a reset token
    const resetToken = user.createResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL (fall back to local Vite dev URL when not configured)
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
    if (!process.env.FRONTEND_URL) {
      console.warn("FRONTEND_URL is not set, falling back to http://localhost:5173");
    }
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    // Send email using Nodemailer (dynamic SMTP via env, safe Gmail defaults)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      connectionTimeout: 10000,
      socketTimeout: 10000
    });

    try {
      await transporter.verify();
    } catch (error) {
      console.error("Nodemailer SMTP Error:", error);
      return res.status(500).json({ ok: false, error: `SMTP verify failed: ${error.message}` });
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: user.email,
      subject: "VITRA - Password Reset Request",
      text: `VITRA Password Reset\n\nYou are receiving this email because you (or someone else) has requested a password reset for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process:\n\n${resetUrl}\n\nThis reset link will expire in 1 hour.\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("Nodemailer SMTP Error:", error);
      return res.status(500).json({ ok: false, error: `Send failed: ${error.message}` });
    }

    return res.status(200).json({
      ok: true,
      success: true,
      message: "Password reset link sent successfully."
    });
  } catch (err) {
    console.error("Forgot password error:", err?.message ?? err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}

/**
 * POST /reset-password/:token
 * Resets the user's password using a valid reset token.
 */
export async function resetPassword(req, res) {
  try {
    const { token } = req.params;
    const { password } = req.body ?? {};

    if (!password) {
      return res.status(400).json({ ok: false, error: "password is required" });
    }

    // Hash the reset token to find it in the database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ ok: false, error: "Reset token is invalid or has expired" });
    }

    // Set the new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const jwtToken = signToken(user);

    return res.status(200).json({
      ok: true,
      token: jwtToken,
      assignedPage: user.assignedPage,
      email: user.email,
      username: user.username,
      role: user.role ?? "user",
    });
  } catch (err) {
    console.error("Reset password error:", err?.message ?? err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}