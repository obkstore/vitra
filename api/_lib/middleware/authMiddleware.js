import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Verifies the Bearer JWT on a request without depending on Express.
 * Works in every runtime: Express middleware chains (local dev via
 * server.js) AND direct Vercel function invocations (which bypass app.js,
 * so Express-chain middleware silently never runs there).
 * @param {{ headers?: Record<string, unknown> }} req Request with headers.
 * @returns {{ id: string, username: string, role?: string } | null} Token payload or null.
 */
export function authenticateRequest(req) {
  const header = req?.headers?.authorization ?? "";
  const [scheme, token] = String(header).split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not defined");
    return jwt.verify(token, secret);
  } catch (err) {
    if (!process.env.JWT_SECRET) {
      // Server misconfiguration — must not look like a routine bad-token 401.
      console.error("[auth] JWT_SECRET is not configured; rejecting request as 401");
    } else {
      console.error("[auth] token verification failed:", err?.message ?? err);
    }
    return null;
  }
}

/**
 * Server-side ownership check: does this token belong to this route user?
 * Exact case-sensitive compare — the same rule as the login lookup
 * (findOne({ username })), the derived assignedPage, and RequireAuth.
 * Never lowercase either side, or `/dashboard/User9` mismatches `user9`.
 * @param {{ username?: unknown } | null | undefined} reqUser Verified token payload.
 * @param {unknown} routeUsername URL param (e.g. :username).
 * @returns {boolean} True only on an exact non-empty match.
 */
export function isOwner(reqUser, routeUsername) {
  const tokenUsername = reqUser?.username;
  return (
    typeof tokenUsername === "string" &&
    tokenUsername.length > 0 &&
    typeof routeUsername === "string" &&
    routeUsername.length > 0 &&
    tokenUsername === routeUsername
  );
}

/**
 * Express middleware that verifies the Bearer JWT set by POST /login.
 * On success attaches `req.user = { id, username, role }`.
 */
export function requireAuth(req, res, next) {
  const user = authenticateRequest(req);

  if (!user) {
    const header = req.headers.authorization ?? "";
    const [scheme, token] = header.split(" ");
    const reason =
      scheme !== "Bearer" || !token ? "Missing or malformed Authorization header" : "Invalid or expired token";
    return res.status(401).json({ ok: false, error: reason });
  }

  req.user = user;
  return next();
}

/**
 * Admin-only guard. MUST be chained after `requireAuth`:
 *   router.get("/requests", requireAuth, requireAdmin, handler)
 *
 * JWT + DB re-check: the token role is a fast-path hint, but the database
 * is the source of truth so demotions take effect without forcing re-login.
 * Returns 401 when unauthenticated, 403 when authenticated but not admin.
 */
export async function requireAdmin(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: "Missing or malformed Authorization header" });
  }

  try {
    const dbUser = await User.findById(req.user.id).select("role");
    if (!dbUser) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }
    if (dbUser.role !== "admin") {
      return res.status(403).json({ ok: false, error: "Forbidden: admin access required" });
    }
    // Refresh role from DB so downstream handlers see the current value.
    req.user.role = dbUser.role;
    return next();
  } catch (err) {
    console.error("[auth] requireAdmin lookup failed:", err?.message ?? err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}

export default requireAuth;
