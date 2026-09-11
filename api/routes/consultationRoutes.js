import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { createConsultationRequest } from "../controllers/consultationController.js";

const router = Router();

/**
 * POST /api/consultation — submit a consultation request.
 * Requires login (requireAuth); owner is derived from the verified JWT.
 */
router.post("/", requireAuth, createConsultationRequest);

export default router;
