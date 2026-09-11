import { z } from "zod";

/**
 * Consultation form rules mirroring backend Mongoose requirements
 * (api/models/ConsultationRequest.js): valid email, strict international
 * phone (+ then 8–15 digits), message 10–5000 chars.
 * The owner (userId) is token-derived server-side — the client never sends it.
 */

export const consultationSchema = z.object({
  email: z
    .string({ required_error: "البريد الإلكتروني مطلوب." })
    .trim()
    .min(1, "البريد الإلكتروني مطلوب.")
    .email("يرجى إدخال بريد إلكتروني صالح."),
  phone: z
    .string({ required_error: "رقم الهاتف مطلوب." })
    .trim()
    .min(1, "رقم الهاتف مطلوب.")
    .regex(/^\+[1-9]\d{7,14}$/, "أدخل الرقم بالصيغة الدولية مثل +201012345678."),
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
