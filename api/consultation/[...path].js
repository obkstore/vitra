import "dotenv/config";
import app from "../_lib/app.js";
import { connectDB } from "../_lib/config/db.js";

/**
 * Vercel serverless catch-all for /api/consultation/* (submit request).
 * Mirrors api/plans/[...path].js: ensures a MongoDB connection, then hands
 * the request to the Express app, whose router is mounted at
 * /api/consultation in app.js. Local dev uses the repo-root server.js instead.
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
