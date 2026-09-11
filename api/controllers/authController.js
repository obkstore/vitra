import jwt from "jsonwebtoken";
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
 */
export async function login(req, res) {
  try {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: "username and password are required" });
    }

    // password has `select: false`, so explicitly include it for verification.
    const user = await User.findOne({ username }).select("+password");
    if (!user) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const token = signToken(user);

    return res.status(200).json({
      ok: true,
      token,
      assignedPage: user.assignedPage,
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
    const password = req.body?.password;

    if (!username || !password) {
      return res
        .status(400)
        .json({ ok: false, error: "username and password are required" });
    }

    // NOTE: `role` is intentionally never read from req.body. Every
    // self-registration creates a plain "user"; admins are promoted via a
    // one-off DB update (see DEPLOY/admin bootstrap notes). Accepting a
    // client-supplied role would allow privilege escalation.
    // The admin branch below doesn't trigger for new signups yet — it
    // prepares for admin creation flows (step 5).
    const role = "user";
    const assignedPage = role === "admin" ? "/admin/home" : `/dashboard/${username}`;

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ ok: false, error: "username already exists" });
    }

    const user = await User.create({ username, password, assignedPage, role });
    const token = signToken(user);

    return res.status(201).json({
      ok: true,
      token,
      assignedPage: user.assignedPage,
      username: user.username,
      role: user.role ?? "user",
    });
  } catch (err) {
    // Message only: Mongoose ValidationError objects embed the rejected
    // field values — including the submitted password — which must never
    // reach logs.
    console.error("Register error:", err?.message ?? err);
    if (err?.code === 11000) {
      // Real MongoDB unique-index violation on username (race with the
      // findOne pre-check above, or pre-existing duplicate).
      return res.status(409).json({ ok: false, error: "username already exists" });
    }
    if (err?.name === "ValidationError") {
      return res.status(400).json({ ok: false, error: err.message });
    }
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}
