import mongoose from "mongoose";

/**
 * Server-side per-user plan store. One latest plan per account: the owner
 * is ALWAYS taken from the verified JWT (req.user), never from the request
 * body or URL, so no account can read or overwrite another's plan.
 */
const planSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
      unique: true,
    },
    username: {
      type: String,
      required: [true, "username is required"],
      trim: true,
    },
    plan: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "plan is required"],
    },
  },
  { timestamps: true },
);

const Plan = mongoose.models.Plan ?? mongoose.model("Plan", planSchema);

export default Plan;
