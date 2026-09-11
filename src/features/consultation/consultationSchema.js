import { z } from "zod";

/**
 * Consultation form rules mirroring backend Mongoose requirements
 * (api/models/ConsultationRequest.js): valid email, message 10–5000 chars.
 * The owner (userId) is token-derived server-side — the client never sends it.
 */

export const consultationSchema = z.object({
  email: z
    .string({ required_error: "البريد الإلكتروني مطلوب." })
    .trim()
    .min(1, "البريد الإلكتروني مطلوب.")
    .email("يرجى إدخال بريد إلكتروني صالح."),
  message: z
    .string({ required_error: "الرسالة مطلوبة." })
    .trim()
    .min(1, "الرسالة مطلوبة.")
    .min(10, "الرسالة 10 أحرف على الأقل.")
    .max(5000, "الرسالة طويلة جداً (5000 حرف كحد أقصى)."),
});

/**
 * @typedef {z.infer<typeof consultationSchema>} ConsultationInput
 */
