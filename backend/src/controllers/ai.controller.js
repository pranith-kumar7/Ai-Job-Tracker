import { z } from "zod";
import {
  parseJobDescription,
  generateResumeSuggestions,
  streamResumeSuggestions,
} from "../services/ai.service.js";
import {
  getAiUsageSummary,
  recordAiUsage,
} from "../services/aiUsage.service.js";

const parseRequestSchema = z.object({
  jdText: z
    .string()
    .trim()
    .min(20, "Paste a fuller job description to parse.")
    .max(20000, "Job description is too long. Keep it under 20,000 characters."),
});

const suggestionsRequestSchema = z.object({
  company: z.string().trim().max(160).optional(),
  role: z.string().trim().min(1, "Role is required").max(160),
  requiredSkills: z.array(z.string().trim().max(80)).max(20).optional(),
  niceToHaveSkills: z.array(z.string().trim().max(80)).max(20).optional(),
  seniority: z.string().trim().max(80).optional(),
  experience: z.string().trim().max(120).optional(),
  location: z.string().trim().max(160).optional(),
  jobDescription: z.string().trim().max(20000).optional(),
});

const getValidationMessage = (error) =>
  error.issues[0]?.message ?? "Invalid input";

const handleAiError = (error, res, message) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: getValidationMessage(error) });
  }

  return res.status(500).json({ message });
};

const createUsageRecorder = (req) => (usagePayload) =>
  recordAiUsage(req.user?.id, usagePayload);

export const parseJD = async (req, res) => {
  try {
    const { jdText } = parseRequestSchema.parse(req.body);
    const parsed = await parseJobDescription(jdText, {
      onUsage: createUsageRecorder(req),
    });

    return res.json({ parsed });
  } catch (error) {
    return handleAiError(error, res, "AI parsing failed");
  }
};

export const getSuggestions = async (req, res) => {
  try {
    const payload = suggestionsRequestSchema.parse(req.body);
    const suggestions = await generateResumeSuggestions(payload, {
      onUsage: createUsageRecorder(req),
    });

    return res.json({ suggestions });
  } catch (error) {
    return handleAiError(error, res, "AI suggestion failed");
  }
};

export const streamSuggestions = async (req, res) => {
  try {
    const payload = suggestionsRequestSchema.parse(req.body);

    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const suggestions = await streamResumeSuggestions(
      payload,
      (chunk) => {
        res.write(`${JSON.stringify({ type: "chunk", content: chunk })}\n`);
      },
      {
        onUsage: createUsageRecorder(req),
      }
    );

    res.write(`${JSON.stringify({ type: "done", suggestions })}\n`);
    return res.end();
  } catch (error) {
    if (res.headersSent) {
      res.write(`${JSON.stringify({ type: "done", suggestions: [] })}\n`);
      return res.end();
    }

    return handleAiError(error, res, "AI suggestion streaming failed");
  }
};

export const getUsageSummary = async (req, res) => {
  try {
    const summary = await getAiUsageSummary(req.user?.id);

    return res.json({ summary });
  } catch {
    return res.status(500).json({ message: "AI usage summary failed" });
  }
};
