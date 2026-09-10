import { z } from "zod";

/**
 * Shared field rules mirroring backend Mongoose requirements
 * (api/models/User.js): username min 3, password min 6.
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

/** Login payload: username + password. */
export const loginSchema = z.object({
  username: usernameField,
  password: passwordField,
});

/**
 * Register payload: username + password (assignedPage is backend-derived).
 * Kept as a separate export so AuthForm's mode switch needs no logic change.
 */
export const registerSchema = z.object({
  username: usernameField,
  password: passwordField,
});

/**
 * @typedef {z.infer<typeof loginSchema>} LoginInput
 * @typedef {z.infer<typeof registerSchema>} RegisterInput
 */
