import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import authRoutes from "./routes/authRoutes.js";
import planRoutes from "./routes/planRoutes.js";
import consultationRoutes from "./routes/consultationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import generatePlanHandler from "../generate-plan.mjs"; // Adjust path if it's in another folder

const app = express();

// Trust the Railway proxy hop so express-rate-limit reads the real client
// IP from X-Forwarded-For instead of throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set('trust proxy', 1);

app.use(cors({ origin: true, credentials: true }));

// Security headers (CSP defaults would break the Vite SPA shell, so the
// rest of helmet's headers apply; revisit contentSecurityPolicy when the
// threat model needs inline-script lockdown).
app.use(helmet());

// 1mb comfortably covers a full 7-day plan save (/api/plans) while still
// bounding body-parser abuse. generate-plan enforces its own tighter 64KB
// cap inside the handler.
app.use(express.json({ limit: "1mb" }));

// Strict gate on auth: brute-force protection for login/register.
// Conservative classroom-safe defaults (unknown concurrent load by design).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { ok: false, error: "Too many attempts — try again later" },
});

// Generation is the expensive route (billed Gemini quota): per-minute,
// per-IP cap (IPv6-safe via ipKeyGenerator, as the library mandates).
// Keyed by IP only — the limiter runs before the handler, so the
// optional-auth identity (req.user) is not attached yet by design.
const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  // Honestly per-IP: this limiter precedes auth, so req.user is never
  // attached here (a req.user?.id key would silently be undefined for all).
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: { ok: false, error: "Too many generations — try again in a minute" },
});

// Consultation submissions are authenticated writes: per-minute, per-IP cap
// against spam while staying generous for legitimate use.
const consultationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests — try again in a minute" },
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

// POST /api/auth/login (+ POST /api/auth/register helper)
app.use("/api/auth", authLimiter, authRoutes);

// Per-user plan store (requireAuth + token-derived owner inside planRoutes)
app.use("/api/plans", planRoutes);

// Consultation requests (POST requires login; owner from JWT)
app.use("/api/consultation", consultationLimiter, consultationRoutes);

// Admin-only request management (requireAuth + requireAdmin inside adminRoutes)
app.use("/api/admin", adminRoutes);

app.post("/api/generate-plan", generateLimiter, generatePlanHandler);

export default app;
