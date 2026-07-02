import mongoose, { Schema } from "mongoose";

export const applicationStatuses = [
  "Applied",
  "Phone Screen",
  "Interview",
  "Offer",
  "Rejected",
];

const applicationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: applicationStatuses,
      default: "Applied",
    },
    dateApplied: {
      type: Date,
      default: Date.now,
    },
    jdLink: {
      type: String,
      trim: true,
    },
    jobDescription: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    salaryRange: {
      type: String,
      trim: true,
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    niceToHaveSkills: {
      type: [String],
      default: [],
    },
    seniority: {
      type: String,
      trim: true,
    },
    experience: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    responsibilities: {
      type: [String],
      default: [],
    },
    benefits: {
      type: [String],
      default: [],
    },
    resumeSuggestions: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export const Application = mongoose.model(
  "Application",
  applicationSchema
);
