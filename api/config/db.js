import mongoose from "mongoose";

/**
 * Shared MongoDB connection helper for the Express API.
 * Caches the connection so hot-reloads / serverless invocations
 * don't open a new socket on every request.
 */
let cachedConnection = null;

export async function connectDB(uri) {
  if (cachedConnection) return cachedConnection;

  const mongoUri = uri ?? process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined. Set it in your .env file.");
  }

  cachedConnection = await mongoose.connect(mongoUri);
  return cachedConnection;
}

export default connectDB;
