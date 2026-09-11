import mongoose from "mongoose";
import ConsultationRequest, { CONSULTATION_STATUSES } from "../models/ConsultationRequest.js";

/**
 * GET /api/admin/requests — list consultation requests (admin only).
 * Supports ?status=pending&forwarded_to_trainer filter and ?page/?limit
 * pagination (limit capped at 100). Newest first.
 */
export async function listConsultationRequests(req, res) {
  try {
    const { status, page = "1", limit = "50" } = req.query ?? {};

    const filter = {};
    if (status !== undefined) {
      if (!CONSULTATION_STATUSES.includes(String(status))) {
        return res.status(400).json({
          ok: false,
          error: `status must be one of: ${CONSULTATION_STATUSES.join(", ")}`,
        });
      }
      filter.status = status;
    }

    const pageNum = Math.max(1, Number.parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, Number.parseInt(String(limit), 10) || 50));

    const [requests, total] = await Promise.all([
      ConsultationRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate("userId", "username")
        .lean(),
      ConsultationRequest.countDocuments(filter),
    ]);

    return res.status(200).json({ ok: true, requests, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error("List consultation requests error:", err?.message ?? err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}

/**
 * PATCH /api/admin/requests/:id — update a request's status (admin only).
 * Body: { status: "pending" | "forwarded_to_trainer" | "resolved" }.
 */
export async function updateConsultationRequestStatus(req, res) {
  try {
    const { id } = req.params ?? {};
    const { status } = req.body ?? {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ ok: false, error: "Consultation request not found" });
    }
    if (!CONSULTATION_STATUSES.includes(status)) {
      return res.status(400).json({
        ok: false,
        error: `status must be one of: ${CONSULTATION_STATUSES.join(", ")}`,
      });
    }

    const updated = await ConsultationRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    ).populate("userId", "username");

    if (!updated) {
      return res.status(404).json({ ok: false, error: "Consultation request not found" });
    }

    return res.status(200).json({ ok: true, request: updated });
  } catch (err) {
    console.error("Update consultation request error:", err?.message ?? err);
    if (err?.name === "ValidationError" || err?.name === "CastError") {
      return res.status(400).json({ ok: false, error: err.message });
    }
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}
