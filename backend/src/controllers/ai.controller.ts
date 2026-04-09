import { Request, Response } from "express";
import { z } from "zod";
import {
  parseJobDescription,
  generateResumeSuggestions,
  streamResumeSuggestions,
} from "../services/ai.service";

const parseRequestSchema = z.object({
  jdText: z.string().trim().min(20, "Paste a fuller job description to parse."),
});

const suggestionsRequestSchema = z.object({
  company: z.string().trim().optional(),
  role: z.string().trim().min(1, "Role is required"),
  requiredSkills: z.array(z.string().trim()).optional(),
  niceToHaveSkills: z.array(z.string().trim()).optional(),
  seniority: z.string().trim().optional(),
  location: z.string().trim().optional(),
  jobDescription: z.string().trim().optional(),
});

export const parseJD = async (req: Request, res: Response) => {
  try {
    const { jdText } = parseRequestSchema.parse(req.body);
    const parsed = await parseJobDescription(jdText);

    return res.json({ parsed });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message ?? "Invalid input" });
    }

    return res.status(500).json({ message: "AI parsing failed" });
  }
};

export const getSuggestions = async (req: Request, res: Response) => {
  try {
    const payload = suggestionsRequestSchema.parse(req.body);
    const suggestions = await generateResumeSuggestions(payload);

    return res.json({ suggestions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message ?? "Invalid input" });
    }

    return res.status(500).json({ message: "AI suggestion failed" });
  }
};

export const streamSuggestions = async (req: Request, res: Response) => {
  try {
    const payload = suggestionsRequestSchema.parse(req.body);

    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const suggestions = await streamResumeSuggestions(payload, (chunk) => {
      res.write(`${JSON.stringify({ type: "chunk", content: chunk })}\n`);
    });

    res.write(`${JSON.stringify({ type: "done", suggestions })}\n`);
    return res.end();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message ?? "Invalid input" });
    }

    return res.status(500).json({ message: "AI suggestion streaming failed" });
  }
};
