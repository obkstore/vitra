import { z } from "zod";

/**
 * Shared field rules mirroring backend Mongoose requirements
 * (api/models/User.js): username min 3, password min 6, email required and valid.
 * assignedPage is derived server-side as `/dashboard/<username>`,
 * so the client never validates or sends it.
 */

const usernameField = z
  .string({ required_error: "اسم المستخدم مطلوب." })
  .trim()
  .min(1, "اسم المستخدم مطلوب.")
  .min(3, "اسم المستخدم 3 أحرف على الأقل.");

const passwordField = z
  .string({ required_error: "كلمة المرور مطلوبة." })
  .min(1, "كلمة المرور مطلوبة.")
  .min(6, "كلمة المرور 6 أحرف على الأقل.");

const emailField = z
  .string({ required_error: "البريد الإلكتروني مطلوب." })
  .trim()
  .email("البريد الإلكتروني غير صالح");

 /** Login payload: email + password. */
export const loginSchema = z.object({
  email: emailField,
  password: passwordField,
});

/**
 * Register payload: username, email, and password (assignedPage is backend-derived).
 * Kept as a separate export so AuthForm's mode switch needs no logic change.
 */
export const registerSchema = z.object({
  email: emailField,
  username: usernameField,
  password: passwordField,
});

/**
 * @typedef {z.infer<typeof loginSchema>} LoginInput
 * @typedef {z.infer<typeof registerSchema>} RegisterInput
 */
