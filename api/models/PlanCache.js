import mongoose from "mongoose";

/**
 * Server-side cache of validated AI plans, keyed by request fingerprint.
 * Identical inputs deterministically yield identical plans, so a cache hit
 * for the same fingerprint returns the requester's own plan — never another
 * user's data beyond what they already supplied. Entries auto-expire.
 */
const planCacheSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "key is required"],
      unique: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "payload is required"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      // Auto-evict stale entries; a month keeps the collection bounded
      // while staying useful for repeat generations.
      expires: 30 * 24 * 60 * 60,
    },
  },
  { timestamps: false },
);

const PlanCache = mongoose.models.PlanCache ?? mongoose.model("PlanCache", planCacheSchema);

export default PlanCache;
