import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/authMiddleware.js";
import {
  listConsultationRequests,
  updateConsultationRequestStatus,
} from "../controllers/adminController.js";

const router = Router();

// All admin routes require a valid session AND role === "admin"
// (requireAdmin re-checks the DB so demotions apply immediately).
router.get("/requests", requireAuth, requireAdmin, listConsultationRequests);
router.patch("/requests/:id", requireAuth, requireAdmin, updateConsultationRequestStatus);

export default router;
