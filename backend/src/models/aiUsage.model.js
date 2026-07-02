import mongoose, { Schema } from "mongoose";

export const aiUsageFeatures = [
  "job_description_parse",
  "resume_suggestions",
  "resume_suggestions_stream",
  "resume_analyzer",
  "resume_job_match",
  "resume_optimizer",
  "cover_letter_generator",
  "interview_generator",
  "interview_answer_evaluation",
  "ai_chat",
];

export const aiUsageStatuses = ["success", "fallback", "error"];

const aiUsageSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    feature: {
      type: String,
      enum: aiUsageFeatures,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      default: "openai",
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: aiUsageStatuses,
      required: true,
      index: true,
    },
    promptTokens: {
      type: Number,
      default: 0,
      min: 0,
    },
    completionTokens: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
      min: 0,
    },
    estimatedCostUsd: {
      type: Number,
      default: 0,
      min: 0,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

aiUsageSchema.index({ userId: 1, createdAt: -1 });

export const AiUsage = mongoose.model("AiUsage", aiUsageSchema);
