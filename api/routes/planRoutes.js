import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import Plan from "../models/Plan.js";

const router = Router();

/**
 * Per-user plan persistence. Both routes are token-derived: the owner comes
 * from req.user (verified JWT), so there is no :username param to mismatch
 * and no body field to forge. Guests have no userId and never reach here.
 */

// POST /api/plans — upsert the caller's latest plan.
router.post("/", requireAuth, async (req, res) => {
  try {
    const { plan } = req.body ?? {};
    if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
      return res.status(400).json({ ok: false, error: "plan object is required" });
    }

    await Plan.findOneAndUpdate(
      { userId: req.user.id },
      { userId: req.user.id, username: req.user.username, plan },
      { upsert: true, new: true, runValidators: true },
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Save plan error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// GET /api/plans/mine — read the caller's latest plan (404 when none yet).
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const saved = await Plan.findOne({ userId: req.user.id });
    if (!saved) {
      return res.status(404).json({ ok: false, error: "No saved plan" });
    }
    return res.status(200).json({ ok: true, plan: saved.plan });
  } catch (err) {
    console.error("Load plan error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default router;
