import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  JOB_DESCRIPTION_PARSE_SYSTEM_PROMPT,
  RESUME_SUGGESTIONS_STREAM_SYSTEM_PROMPT,
  RESUME_SUGGESTIONS_SYSTEM_PROMPT,
} from "./ai.prompts.js";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_OPENAI_TIMEOUT_MS = 30000;
const DEFAULT_OPENAI_MAX_RETRIES = 1;

const AI_FEATURES = {
  JOB_DESCRIPTION_PARSE: "job_description_parse",
  RESUME_SUGGESTIONS: "resume_suggestions",
  RESUME_SUGGESTIONS_STREAM: "resume_suggestions_stream",
};

const parsedJobSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  requiredSkills: z.array(z.string()).max(10),
  niceToHaveSkills: z.array(z.string()).max(10),
  seniority: z.string().min(1),
  experience: z.string().min(1),
  location: z.string().min(1),
  salaryRange: z.string().min(1),
  jdLink: z.string().min(1),
  responsibilities: z.array(z.string()).max(12),
  benefits: z.array(z.string()).max(10),
});

const resumeSuggestionsSchema = z.object({
  suggestions: z.array(z.string().min(1)).min(3).max(5),
});

const suggestionInputSchema = z.object({
  company: z.string().trim().optional(),
  role: z.string().trim().min(1),
  requiredSkills: z.array(z.string()).optional(),
  niceToHaveSkills: z.array(z.string()).optional(),
  seniority: z.string().trim().optional(),
  experience: z.string().trim().optional(),
  location: z.string().trim().optional(),
  jobDescription: z.string().trim().optional(),
});

const skillCatalog = [
  "JavaScript",
  "React",
  "Next.js",
  "Node.js",
  "Express",
  "MongoDB",
  "Mongoose",
  "PostgreSQL",
  "MySQL",
  "Tailwind CSS",
  "HTML",
  "CSS",
  "REST APIs",
  "GraphQL",
  "Redux",
  "React Query",
  "Python",
  "Java",
  "C#",
  "Go",
  "AWS",
  "Docker",
  "Kubernetes",
  "CI/CD",
  "Git",
  "Figma",
  "Testing",
  "Jest",
  "Cypress",
  "Playwright",
  "Agile",
];

const sectionBoundaryHeadings = new Set([
  "about",
  "about us",
  "benefits",
  "bonus points",
  "compensation",
  "compensation and benefits",
  "duties",
  "experience",
  "minimum qualifications",
  "nice to have",
  "overview",
  "perks",
  "preferred",
  "preferred qualifications",
  "qualifications",
  "requirements",
  "responsibilities",
  "role",
  "role responsibilities",
  "salary",
  "skills",
  "what we offer",
  "what you bring",
  "what you will do",
  "what you'll bring",
  "what you'll do",
]);

const getIntegerEnv = (key, fallback, min, max) => {
  const value = Number.parseInt(process.env[key] ?? "", 10);

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, min), max);
};

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: getIntegerEnv(
      "OPENAI_TIMEOUT_MS",
      DEFAULT_OPENAI_TIMEOUT_MS,
      5000,
      120000
    ),
    maxRetries: getIntegerEnv(
      "OPENAI_MAX_RETRIES",
      DEFAULT_OPENAI_MAX_RETRIES,
      0,
      5
    ),
  });
};

const getOpenAIModel = () => process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;

const logAiFallback = (operation, error) => {
  const reason =
    error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error";

  console.warn(`[AI] ${operation} failed; using fallback. ${reason}`);
};

const reportUsage = async (onUsage, usagePayload) => {
  if (typeof onUsage !== "function") {
    return;
  }

  try {
    await onUsage({
      provider: "openai",
      model: getOpenAIModel(),
      ...usagePayload,
    });
  } catch (error) {
    console.warn(
      `[AI] Usage callback failed. ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

const normalizeText = (value) =>
  value.replace(/\r/g, "").replace(/\t/g, " ").replace(/\u2022/g, "-").trim();

const uniqueStrings = (values) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const linesFromText = (value) =>
  normalizeText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const findFirstMatch = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].trim().replace(/[.,;:]$/, "");
    }
  }

  return undefined;
};

const getSectionText = (text, headings) => {
  const lines = linesFromText(text);
  const lowerHeadings = headings.map((heading) => heading.toLowerCase());
  const collected = [];
  let collecting = false;

  for (const line of lines) {
    const normalizedLine = line.toLowerCase().replace(/[:\-]$/, "").trim();

    if (lowerHeadings.includes(normalizedLine)) {
      collecting = true;
      continue;
    }

    if (collecting && sectionBoundaryHeadings.has(normalizedLine)) {
      break;
    }

    if (collecting) {
      collected.push(line);
    }
  }

  return collected.join("\n");
};

const collectSkills = (text) => {
  const lowerText = text.toLowerCase();

  return skillCatalog.filter((skill) => lowerText.includes(skill.toLowerCase()));
};

const cleanListItem = (value) =>
  value
    .replace(/^[-*•]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim()
    .replace(/[.;]$/, "");

const itemsFromSection = (text, headings, maxItems) => {
  const section = getSectionText(text, headings);

  if (!section) {
    return [];
  }

  return uniqueStrings(linesFromText(section).map(cleanListItem)).slice(0, maxItems);
};

const detectSeniority = (text) => {
  const lower = text.toLowerCase();

  if (lower.includes("intern")) {
    return "Intern";
  }
  if (lower.includes("entry level") || lower.includes("junior")) {
    return "Junior";
  }
  if (lower.includes("staff")) {
    return "Staff";
  }
  if (lower.includes("principal")) {
    return "Principal";
  }
  if (lower.includes("lead")) {
    return "Lead";
  }
  if (lower.includes("senior")) {
    return "Senior";
  }
  if (lower.includes("manager")) {
    return "Manager";
  }
  if (/0\s*[-–]\s*2\s+years|0 to 2 years|1 to 2 years|1-2 years/i.test(text)) {
    return "Junior";
  }
  if (/2\s*[-–]\s*4\s+years|2 to 4 years|3 to 5 years|mid-level|mid level/i.test(text)) {
    return "Mid-level";
  }
  if (/5\s*\+\s*years|5 to 7 years|6 to 8 years|experienced/i.test(text)) {
    return "Senior";
  }

  return "Not specified";
};

const detectExperience = (text) => {
  const explicitExperience = findFirstMatch(text, [
    /experience\s*[:\-]\s*([^\n]+)/i,
    /years? of experience\s*[:\-]?\s*([^\n]+)/i,
    /([0-9]+\s*\+?\s*(?:to|-|â€“)?\s*[0-9]*\s*\+?\s*years?[^\n.,;]*)/i,
  ]);

  return explicitExperience ?? detectSeniority(text);
};

const detectLocation = (text) => {
  const location = findFirstMatch(text, [
    /location\s*[:\-]\s*([^\n]+)/i,
    /based in\s+([^\n.,]+)/i,
  ]);

  if (location) {
    return location;
  }

  const lower = text.toLowerCase();

  if (lower.includes("remote")) {
    return "Remote";
  }
  if (lower.includes("hybrid")) {
    return "Hybrid";
  }
  if (lower.includes("on-site") || lower.includes("onsite")) {
    return "On-site";
  }

  return "Not specified";
};

const detectSalaryRange = (text) => {
  const salaryMatch = findFirstMatch(text, [
    /salary(?:\s+range)?\s*[:\-]\s*([^\n]+)/i,
    /compensation\s*[:\-]\s*([^\n]+)/i,
    /ctc\s*[:\-]\s*([^\n]+)/i,
    /package\s*[:\-]\s*([^\n]+)/i,
  ]);

  if (salaryMatch) {
    return salaryMatch;
  }

  const lineMatch = linesFromText(text).find((line) =>
    /(\$|usd|eur|gbp|inr|lpa|lakhs?|crore|per year|per annum|annually)/i.test(line)
  );

  return lineMatch ?? "Not specified";
};

const detectJdLink = (text) => {
  const urlMatch = text.match(/https?:\/\/[^\s)>"']+/i);
  return urlMatch?.[0] ?? "Not specified";
};

const extractCompany = (text) => {
  const company = findFirstMatch(text, [
    /company\s*[:\-]\s*([^\n]+)/i,
    /join\s+([A-Z][A-Za-z0-9&.,'()\- ]{1,60})\s+as/i,
    /at\s+([A-Z][A-Za-z0-9&.,'()\- ]{1,60})/i,
  ]);

  return company ?? "Unknown company";
};

const looksLikeRole = (line) => {
  const lower = line.toLowerCase();

  return [
    "engineer",
    "developer",
    "designer",
    "manager",
    "analyst",
    "architect",
    "specialist",
    "coordinator",
    "consultant",
    "scientist",
  ].some((keyword) => lower.includes(keyword));
};

const extractRole = (text) => {
  const explicitRole = findFirstMatch(text, [
    /role\s*[:\-]\s*([^\n]+)/i,
    /title\s*[:\-]\s*([^\n]+)/i,
    /position\s*[:\-]\s*([^\n]+)/i,
  ]);

  if (explicitRole) {
    return explicitRole;
  }

  const inferredRole = linesFromText(text).find(looksLikeRole);
  return inferredRole ?? "Unknown role";
};

const buildFallbackParse = (jdText) => {
  const normalized = normalizeText(jdText);
  const requiredSection = getSectionText(normalized, [
    "requirements",
    "qualifications",
    "what you'll bring",
    "what you bring",
    "minimum qualifications",
    "responsibilities",
  ]);
  const preferredSection = getSectionText(normalized, [
    "preferred qualifications",
    "nice to have",
    "bonus points",
    "preferred",
  ]);
  const responsibilities = itemsFromSection(
    normalized,
    [
      "responsibilities",
      "what you'll do",
      "what you will do",
      "role responsibilities",
      "duties",
    ],
    8
  );
  const benefits = itemsFromSection(
    normalized,
    [
      "benefits",
      "perks",
      "what we offer",
      "compensation and benefits",
    ],
    8
  );

  const requiredSkills = uniqueStrings(
    collectSkills(requiredSection || normalized).slice(0, 8)
  );
  const niceToHaveSkills = uniqueStrings(
    collectSkills(preferredSection)
      .filter((skill) => !requiredSkills.includes(skill))
      .slice(0, 6)
  );

  return {
    company: extractCompany(normalized),
    role: extractRole(normalized),
    requiredSkills,
    niceToHaveSkills,
    seniority: detectSeniority(normalized),
    experience: detectExperience(normalized),
    location: detectLocation(normalized),
    salaryRange: detectSalaryRange(normalized),
    jdLink: detectJdLink(normalized),
    responsibilities,
    benefits,
  };
};

const buildFallbackSuggestions = (input) => {
  const primarySkills = uniqueStrings(input.requiredSkills ?? []).slice(0, 4);
  const bonusSkills = uniqueStrings(input.niceToHaveSkills ?? []).slice(0, 2);
  const company = input.company ? ` for ${input.company}` : "";
  const skillList =
    primarySkills.length > 0 ? primarySkills.join(", ") : "modern product engineering tools";
  const locationContext = input.location
    ? ` across ${input.location} stakeholders`
    : " across cross-functional stakeholders";
  const bonusSkillText =
    bonusSkills.length > 0 ? `, with bonus exposure to ${bonusSkills.join(" and ")}` : "";

  return [
    `Delivered ${input.role} initiatives${company} using ${skillList}, translating business requirements into polished, production-ready features.`,
    `Built and iterated on user-facing workflows with strong ownership of code quality, performance, and maintainability${bonusSkillText}.`,
    `Partnered with product, design, and engineering teams${locationContext} to scope features, ship on time, and resolve release blockers quickly.`,
    `Improved reliability by documenting implementation decisions, testing critical flows, and refining handoffs around ${input.role.toLowerCase()} work.`,
  ].slice(0, 4);
};

const buildSuggestionPrompt = (input) =>
  JSON.stringify({
    company: input.company ?? "Not specified",
    role: input.role,
    requiredSkills: input.requiredSkills ?? [],
    niceToHaveSkills: input.niceToHaveSkills ?? [],
    seniority: input.seniority ?? "Not specified",
    experience: input.experience ?? "Not specified",
    location: input.location ?? "Not specified",
    jobDescription: input.jobDescription ?? "Not provided",
  });

const extractSuggestionsFromText = (content) => {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s*/, "").replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  return uniqueStrings(lines).slice(0, 5);
};

export const parseJobDescription = async (jdText, options = {}) => {
  const { onUsage } = options;
  const client = getOpenAIClient();

  if (!client) {
    await reportUsage(onUsage, {
      feature: AI_FEATURES.JOB_DESCRIPTION_PARSE,
      provider: "fallback",
      status: "fallback",
    });
    return buildFallbackParse(jdText);
  }

  const model = getOpenAIModel();

  try {
    const completion = await client.chat.completions.parse({
      model,
      messages: [
        {
          role: "system",
          content: JOB_DESCRIPTION_PARSE_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: jdText,
        },
      ],
      response_format: zodResponseFormat(parsedJobSchema, "job_description_parse"),
    });

    const parsed = completion.choices[0]?.message.parsed;

    if (!parsed) {
      throw new Error("The model did not return parsed job details.");
    }

    const fallbackParsed = buildFallbackParse(jdText);
    const result = {
      ...parsed,
      seniority:
        parsed.seniority !== "Not specified" ? parsed.seniority : fallbackParsed.seniority,
      experience:
        parsed.experience !== "Not specified" ? parsed.experience : fallbackParsed.experience,
      location:
        parsed.location !== "Not specified" ? parsed.location : fallbackParsed.location,
      salaryRange:
        parsed.salaryRange !== "Not specified"
          ? parsed.salaryRange
          : fallbackParsed.salaryRange,
      jdLink: parsed.jdLink !== "Not specified" ? parsed.jdLink : fallbackParsed.jdLink,
      requiredSkills: uniqueStrings(parsed.requiredSkills),
      niceToHaveSkills: uniqueStrings(parsed.niceToHaveSkills).filter(
        (skill) => !parsed.requiredSkills.includes(skill)
      ),
      responsibilities: uniqueStrings(parsed.responsibilities),
      benefits: uniqueStrings(parsed.benefits),
    };

    await reportUsage(onUsage, {
      feature: AI_FEATURES.JOB_DESCRIPTION_PARSE,
      model,
      status: "success",
      usage: completion.usage,
    });

    return result;
  } catch (error) {
    logAiFallback("Job description parsing", error);
    await reportUsage(onUsage, {
      feature: AI_FEATURES.JOB_DESCRIPTION_PARSE,
      model,
      status: "fallback",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return buildFallbackParse(jdText);
  }
};

export const generateResumeSuggestions = async (rawInput, options = {}) => {
  const { onUsage } = options;
  const input = suggestionInputSchema.parse(rawInput);
  const client = getOpenAIClient();

  if (!client) {
    await reportUsage(onUsage, {
      feature: AI_FEATURES.RESUME_SUGGESTIONS,
      provider: "fallback",
      status: "fallback",
    });
    return buildFallbackSuggestions(input);
  }

  const model = getOpenAIModel();

  try {
    const completion = await client.chat.completions.parse({
      model,
      messages: [
        {
          role: "system",
          content: RESUME_SUGGESTIONS_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildSuggestionPrompt(input),
        },
      ],
      response_format: zodResponseFormat(
        resumeSuggestionsSchema,
        "resume_suggestions"
      ),
    });

    const parsed = completion.choices[0]?.message.parsed;

    if (!parsed) {
      throw new Error("The model did not return resume suggestions.");
    }

    const suggestions = uniqueStrings(parsed.suggestions).slice(0, 5);

    await reportUsage(onUsage, {
      feature: AI_FEATURES.RESUME_SUGGESTIONS,
      model,
      status: "success",
      usage: completion.usage,
    });

    return suggestions;
  } catch (error) {
    logAiFallback("Resume suggestion generation", error);
    await reportUsage(onUsage, {
      feature: AI_FEATURES.RESUME_SUGGESTIONS,
      model,
      status: "fallback",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return buildFallbackSuggestions(input);
  }
};

export const streamResumeSuggestions = async (rawInput, onChunk, options = {}) => {
  const { onUsage } = options;
  const input = suggestionInputSchema.parse(rawInput);
  const client = getOpenAIClient();

  if (!client) {
    const fallback = buildFallbackSuggestions(input);
    const fallbackText = fallback.map((item) => `- ${item}`).join("\n");

    await reportUsage(onUsage, {
      feature: AI_FEATURES.RESUME_SUGGESTIONS_STREAM,
      provider: "fallback",
      status: "fallback",
    });

    for (const character of fallbackText) {
      onChunk(character);
      await new Promise((resolve) => setTimeout(resolve, 3));
    }

    return fallback;
  }

  const model = getOpenAIModel();

  try {
    const stream = await client.chat.completions.create({
      model,
      stream: true,
      stream_options: {
        include_usage: true,
      },
      messages: [
        {
          role: "system",
          content: RESUME_SUGGESTIONS_STREAM_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildSuggestionPrompt(input),
        },
      ],
    });

    let combinedText = "";
    let usage;

    for await (const part of stream) {
      if (part.usage) {
        usage = part.usage;
      }

      const delta = part.choices?.[0]?.delta?.content;

      if (!delta) {
        continue;
      }

      combinedText += delta;
      onChunk(delta);
    }

    const parsedSuggestions = extractSuggestionsFromText(combinedText);

    if (parsedSuggestions.length >= 3) {
      await reportUsage(onUsage, {
        feature: AI_FEATURES.RESUME_SUGGESTIONS_STREAM,
        model,
        status: "success",
        usage,
      });

      return parsedSuggestions;
    }

    await reportUsage(onUsage, {
      feature: AI_FEATURES.RESUME_SUGGESTIONS_STREAM,
      model,
      status: "fallback",
      usage,
      errorMessage: "The model returned too few parseable suggestions.",
    });

    return buildFallbackSuggestions(input);
  } catch (error) {
    logAiFallback("Resume suggestion streaming", error);
    await reportUsage(onUsage, {
      feature: AI_FEATURES.RESUME_SUGGESTIONS_STREAM,
      model,
      status: "fallback",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    const fallback = buildFallbackSuggestions(input);
    fallback.forEach((item, index) => {
      onChunk(`${index === 0 ? "" : "\n"}- ${item}`);
    });
    return fallback;
  }
};
