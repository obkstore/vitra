import { Router } from "express";
import { login, register, forgotPassword, resetPassword } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = Router();

// POST /api/auth/login — verify credentials, return { token, assignedPage }
router.post("/login", login);

// POST /api/auth/register — create a user (password hashed by the User model)
router.post("/register", register);

// POST /api/auth/forgot-password — send a password reset link
router.post("/forgot-password", forgotPassword);

// POST /api/auth/reset-password/:token — reset password with a valid token
router.post("/reset-password/:token", resetPassword);

// GET /api/auth/me — validate the session, return identity + assignedPage.
// Lets the client verify a stored token (and powers future token-expiry
// handling) without trusting localStorage alone.
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }
    return res.status(200).json({
      ok: true,
      username: user.username,
      assignedPage: user.assignedPage,
      role: user.role ?? "user",
    });
  } catch (err) {
    console.error("Me error:", err?.message ?? err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// Future per-user data routes MUST follow this contract (not just the
// client-side RequireAuth check, which localStorage edits bypass):
//   router.get("/plans/:username", requireAuth, (req, res) => {
//     if (!isOwner(req.user, req.params.username)) {
//       return res.status(403).json({ ok: false, error: "Forbidden" });
//     }
//     ...
//   });

export default router;
