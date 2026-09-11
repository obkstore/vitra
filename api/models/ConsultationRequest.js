import mongoose from "mongoose";

/**
 * Consultation request submitted by a logged-in user.
 * Owner (userId) is ALWAYS taken from the verified JWT (req.user), never
 * from the request body, so no account can file requests as someone else.
 * `timestamps: true` provides createdAt (+ updatedAt) automatically.
 */
export const CONSULTATION_STATUSES = ["pending", "forwarded_to_trainer", "resolved"];

const consultationRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "valid email is required"],
    },
    message: {
      type: String,
      required: [true, "message is required"],
      trim: true,
      minlength: [10, "message must be at least 10 characters"],
      maxlength: [5000, "message must be at most 5000 characters"],
    },
    status: {
      type: String,
      enum: CONSULTATION_STATUSES,
      default: "pending",
      index: true,
    },
  },
  { timestamps: true },
);

const ConsultationRequest =
  mongoose.models.ConsultationRequest ??
  mongoose.model("ConsultationRequest", consultationRequestSchema);

export default ConsultationRequest;
