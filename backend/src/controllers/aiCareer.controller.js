import { z } from "zod";
import {
  analyzeResume,
  evaluateInterviewAnswer,
  generateCoverLetters,
  generateInterviewPrep,
  matchResumeToJob,
  optimizeResume,
} from "../services/aiCareer.service.js";
import { parseJobDescription } from "../services/ai.service.js";
import { recordAiUsage } from "../services/aiUsage.service.js";
import { extractResumeText } from "../services/resumeText.service.js";
import { Application } from "../models/application.model.js";

const optionalTextSchema = z.string().trim().max(40000).optional();

const resumeToolSchema = z.object({
  resumeText: optionalTextSchema,
  jobDescription: optionalTextSchema,
  targetRole: z.string().trim().max(160).optional(),
  company: z.string().trim().max(160).optional(),
  role: z.string().trim().max(160).optional(),
});

const answerEvaluationSchema = z.object({
  question: z.string().trim().min(5).max(1000),
  answer: z.string().trim().min(5).max(6000),
  jobDescription: optionalTextSchema,
});

const createUsageRecorder = (req) => (usagePayload) =>
  recordAiUsage(req.user?.id, usagePayload);

const handleCareerError = (error, res, fallbackMessage) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: error.issues[0]?.message ?? "Invalid input",
    });
  }

  if (error instanceof Error) {
    if (
      error.message === "Resume file or resume text is required" ||
      error.message === "Only PDF and TXT resumes are supported"
    ) {
      return res.status(400).json({ message: error.message });
    }
  }

  return res.status(500).json({ message: fallbackMessage });
};

const buildResumePayload = async (req) => {
  const body = resumeToolSchema.parse(req.body);
  const resumeText = await extractResumeText({
    file: req.file,
    resumeText: body.resumeText,
  });

  return {
    ...body,
    resumeText,
  };
};

export const analyzeResumeController = async (req, res) => {
  try {
    const payload = await buildResumePayload(req);
    const analysis = await analyzeResume(payload, {
      onUsage: createUsageRecorder(req),
    });

    return res.json({ analysis });
  } catch (error) {
    return handleCareerError(error, res, "Resume analysis failed");
  }
};

export const matchResumeController = async (req, res) => {
  try {
    const payload = await buildResumePayload(req);
    const match = await matchResumeToJob(payload, {
      onUsage: createUsageRecorder(req),
    });

    return res.json({ match });
  } catch (error) {
    return handleCareerError(error, res, "Resume match failed");
  }
};

export const optimizeResumeController = async (req, res) => {
  try {
    const payload = await buildResumePayload(req);
    const optimization = await optimizeResume(payload, {
      onUsage: createUsageRecorder(req),
    });

    return res.json({ optimization });
  } catch (error) {
    return handleCareerError(error, res, "Resume optimization failed");
  }
};

export const generateCoverLettersController = async (req, res) => {
  try {
    const payload = await buildResumePayload(req);
    const coverLetters = await generateCoverLetters(payload, {
      onUsage: createUsageRecorder(req),
    });

    return res.json({ coverLetters });
  } catch (error) {
    return handleCareerError(error, res, "Cover letter generation failed");
  }
};

export const generateInterviewPrepController = async (req, res) => {
  try {
    const payload = await buildResumePayload(req);
    const interviewPrep = await generateInterviewPrep(payload, {
      onUsage: createUsageRecorder(req),
    });

    return res.json({ interviewPrep });
  } catch (error) {
    return handleCareerError(error, res, "Interview preparation failed");
  }
};

export const evaluateInterviewAnswerController = async (req, res) => {
  try {
    const payload = answerEvaluationSchema.parse(req.body);
    const evaluation = await evaluateInterviewAnswer(payload, {
      onUsage: createUsageRecorder(req),
    });

    return res.json({ evaluation });
  } catch (error) {
    return handleCareerError(error, res, "Interview answer evaluation failed");
  }
};

export const analyzeJobAgentController = async (req, res) => {
  try {
    const payload = await buildResumePayload(req);

    if (!payload.jobDescription?.trim()) {
      return res.status(400).json({ message: "Job description is required" });
    }

    const onUsage = createUsageRecorder(req);
    const parsedJob = await parseJobDescription(payload.jobDescription, { onUsage });
    const match = await matchResumeToJob(payload, { onUsage });
    const optimization = await optimizeResume(payload, { onUsage });
    const coverLetters = await generateCoverLetters(
      {
        ...payload,
        company: payload.company || parsedJob.company,
        role: payload.role || parsedJob.role,
      },
      { onUsage }
    );
    const interviewPrep = await generateInterviewPrep(
      {
        ...payload,
        company: payload.company || parsedJob.company,
        role: payload.role || parsedJob.role,
      },
      { onUsage }
    );

    const applicationPayload = {
      userId: req.user.id,
      company:
        parsedJob.company && parsedJob.company !== "Unknown company"
          ? parsedJob.company
          : payload.company || "Unknown company",
      role:
        parsedJob.role && parsedJob.role !== "Unknown role"
          ? parsedJob.role
          : payload.role || "Unknown role",
      status: "Applied",
      dateApplied: new Date(),
      jobDescription: payload.jobDescription,
      salaryRange:
        parsedJob.salaryRange !== "Not specified" ? parsedJob.salaryRange : undefined,
      jdLink:
        parsedJob.jdLink && /^https?:\/\//i.test(parsedJob.jdLink)
          ? parsedJob.jdLink
          : undefined,
      requiredSkills: parsedJob.requiredSkills ?? [],
      niceToHaveSkills: parsedJob.niceToHaveSkills ?? [],
      seniority:
        parsedJob.seniority !== "Not specified" ? parsedJob.seniority : undefined,
      experience:
        parsedJob.experience !== "Not specified" ? parsedJob.experience : undefined,
      location:
        parsedJob.location !== "Not specified" ? parsedJob.location : undefined,
      responsibilities: parsedJob.responsibilities ?? [],
      benefits: parsedJob.benefits ?? [],
      resumeSuggestions: optimization.betterAchievements?.slice(0, 5) ?? [],
    };

    const application = await Application.create(applicationPayload);

    return res.status(201).json({
      agentResult: {
        application,
        parsedJob,
        match,
        optimization,
        coverLetters,
        interviewPrep,
        followUpChecklist: [
          "Tailor the resume summary to this role.",
          "Add missing skills only where you have real experience.",
          "Prepare one project story for the top responsibility.",
          "Send a follow-up reminder if there is no response in 7 days.",
        ],
      },
    });
  } catch (error) {
    return handleCareerError(error, res, "Analyze Job agent failed");
  }
};
