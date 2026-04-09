import mongoose from "mongoose";
import { Response } from "express";
import { z } from "zod";
import { Application, applicationStatuses } from "../models/application.model";
import { AuthRequest } from "../middleware/auth.middleware";

const trimString = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const requiredStringSchema = z.preprocess(trimString, z.string().min(1));
const optionalStringSchema = z.preprocess(trimString, z.string().optional());
const optionalUrlSchema = z.preprocess(trimString, z.string().url().optional());
const optionalDateSchema = z.preprocess(
  (value) => (value === null || value === "" ? undefined : value),
  z.coerce.date().optional()
);
const stringArraySchema = z.preprocess((value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.string()));
const resumeSuggestionsSchema = z.preprocess((value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.string()).max(5));

const baseApplicationSchema = z.object({
  company: requiredStringSchema,
  role: requiredStringSchema,
  status: z.enum(applicationStatuses).optional(),
  dateApplied: optionalDateSchema,
  jdLink: optionalUrlSchema,
  jobDescription: optionalStringSchema,
  notes: optionalStringSchema,
  salaryRange: optionalStringSchema,
  requiredSkills: stringArraySchema.optional(),
  niceToHaveSkills: stringArraySchema.optional(),
  seniority: optionalStringSchema,
  location: optionalStringSchema,
  resumeSuggestions: resumeSuggestionsSchema.optional(),
});

const createApplicationSchema = baseApplicationSchema;
const updateApplicationSchema = baseApplicationSchema.partial();
const statusUpdateSchema = z.object({
  status: z.enum(applicationStatuses),
});

const ensureUserId = (req: AuthRequest) => {
  if (!req.user?.id) {
    throw new Error("User not authenticated");
  }

  return req.user.id;
};

const validateApplicationId = (id: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new Error("Invalid application id");
  }
};

const handleControllerError = (error: unknown, res: Response, defaultMessage: string) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: error.issues[0]?.message ?? "Invalid input" });
  }

  if (error instanceof Error) {
    if (error.message === "User not authenticated") {
      return res.status(401).json({ message: error.message });
    }

    if (error.message === "Invalid application id") {
      return res.status(400).json({ message: error.message });
    }
  }

  return res.status(500).json({ message: defaultMessage });
};

export const createApplication = async (req: AuthRequest, res: Response) => {
  try {
    const userId = ensureUserId(req);
    const payload = createApplicationSchema.parse(req.body);

    const application = await Application.create({
      userId,
      ...payload,
      status: payload.status ?? "Applied",
      dateApplied: payload.dateApplied ?? new Date(),
      requiredSkills: payload.requiredSkills ?? [],
      niceToHaveSkills: payload.niceToHaveSkills ?? [],
      resumeSuggestions: payload.resumeSuggestions ?? [],
    });

    return res.status(201).json({ application });
  } catch (error) {
    return handleControllerError(error, res, "Error creating application");
  }
};

export const getApplications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = ensureUserId(req);
    const applications = await Application.find({ userId }).sort({ updatedAt: -1 });

    return res.json({ applications });
  } catch (error) {
    return handleControllerError(error, res, "Error fetching applications");
  }
};

export const getApplicationById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = ensureUserId(req);
    const id = String(req.params.id);
    validateApplicationId(id);

    const application = await Application.findOne({ _id: id, userId });
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    return res.json({ application });
  } catch (error) {
    return handleControllerError(error, res, "Error fetching application");
  }
};

export const updateApplication = async (req: AuthRequest, res: Response) => {
  try {
    const userId = ensureUserId(req);
    const id = String(req.params.id);
    validateApplicationId(id);
    const payload = updateApplicationSchema.parse(req.body);

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ message: "At least one field is required" });
    }

    const application = await Application.findOneAndUpdate(
      { _id: id, userId },
      payload,
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    return res.json({ application });
  } catch (error) {
    return handleControllerError(error, res, "Error updating application");
  }
};

export const updateStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = ensureUserId(req);
    const id = String(req.params.id);
    validateApplicationId(id);
    const { status } = statusUpdateSchema.parse(req.body);

    const application = await Application.findOneAndUpdate(
      { _id: id, userId },
      { status },
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    return res.json({ application });
  } catch (error) {
    return handleControllerError(error, res, "Error updating status");
  }
};

export const deleteApplication = async (req: AuthRequest, res: Response) => {
  try {
    const userId = ensureUserId(req);
    const id = String(req.params.id);
    validateApplicationId(id);

    const deleted = await Application.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return res.status(404).json({ message: "Application not found" });
    }

    return res.json({ message: "Deleted successfully" });
  } catch (error) {
    return handleControllerError(error, res, "Error deleting application");
  }
};
