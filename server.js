// Local development entry point ONLY — this file is never deployed to Vercel.
// Every file under /api becomes a serverless route on Vercel, where a
// persistent app.listen() server cannot work. Vercel uses the catch-all
// wrappers api/auth/[...path].js and api/plans/[...path].js (which export
// the Express app as request handlers) instead.
// Run locally with: npm run api
import "dotenv/config";
import app from "./api/app.js";
import { connectDB } from "./api/config/db.js";

const PORT = process.env.PORT || 5000;

try {
  await connectDB();
  console.log("MongoDB connected");
} catch (err) {
  console.error("MongoDB connection failed:", err.message);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
const path = require('path');

// --- Your API routes should be defined ABOVE this line ---

// 1. Serve static files from your frontend build folder
// (Change 'client/dist' to match your actual frontend folder structure, e.g., 'client/build' or 'public')
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// 2. Catch-all route to serve your frontend's index.html for any unknown routes (crucial for SPAs)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});
