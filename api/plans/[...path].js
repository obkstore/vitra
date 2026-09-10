import "dotenv/config";
import app from "../app.js";
import { connectDB } from "../config/db.js";

/**
 * Vercel serverless catch-all for /api/plans/* (mine, save).
 * Mirrors api/auth/[...path].js: ensures a MongoDB connection, then hands
 * the request to the Express app, whose router is mounted at /api/plans
 * in app.js. Local dev uses the repo-root server.js instead.
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
