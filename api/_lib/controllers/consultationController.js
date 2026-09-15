import ConsultationRequest from "../models/ConsultationRequest.js";

/**
 * POST /api/consultation — submit a consultation request (login required).
 * Owner comes from req.user (verified JWT); email + phone + message from
 * the body. New requests always start as "pending" — clients cannot set status.
 */
export async function createConsultationRequest(req, res) {
  try {
    const email = String(req.body?.email ?? "").trim();
    const phone = String(req.body?.phone ?? "").trim();
    const message = String(req.body?.message ?? "").trim();

    if (!email || !phone || !message) {
      return res.status(400).json({ ok: false, error: "email, phone and message are required" });
    }

    const doc = await ConsultationRequest.create({
      userId: req.user.id,
      email,
      phone,
      message,
    });

    return res.status(201).json({ ok: true, request: doc });
  } catch (err) {
    console.error("Create consultation error:", err?.message ?? err);
    if (err?.name === "ValidationError") {
      return res.status(400).json({ ok: false, error: err.message });
    }
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}
