import express from "express";
import authRoutes from "./routes/authRoutes.js";
import planRoutes from "./routes/planRoutes.js";
import generatePlanHandler from "./generate-plan.mjs"; // Adjust path if it's in another folder

const app = express();

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

// POST /api/auth/login (+ POST /api/auth/register helper)
app.use("/api/auth", authRoutes);

// Per-user plan store (requireAuth + token-derived owner inside planRoutes)
app.use("/api/plans", planRoutes);

app.post("/api/generate-plan", generatePlanHandler);

export default app;
