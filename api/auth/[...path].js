import "dotenv/config";
import app from "../app.js";
import { connectDB } from "../config/db.js";

/**
 * Vercel serverless catch-all for /api/auth/* (login, register).
 *
 * The [...path] filename makes Vercel route any request under /api/auth/
 * directly to this function — no rewrite rule needed. The full request URL
 * (/api/auth/login, …) reaches the Express app, whose router is mounted at
 * /api/auth in app.js, so /login and /register match normally. Each
 * invocation ensures a MongoDB connection first, because serverless
 * functions have no persistent process (app.listen() cannot work here —
 * local dev uses the repo-root server.js instead).
 */
export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error("MongoDB connection failed:", err?.message ?? err);
    res.status(500).json({ ok: false, error: "Database unavailable" });
    return;
  }
  return app(req, res);
}
