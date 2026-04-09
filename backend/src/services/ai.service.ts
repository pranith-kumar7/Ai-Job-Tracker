import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const parsedJobSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  requiredSkills: z.array(z.string()).max(10),
  niceToHaveSkills: z.array(z.string()).max(10),
  seniority: z.string().min(1),
  location: z.string().min(1),
  salaryRange: z.string().min(1),
  jdLink: z.string().min(1),
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
  location: z.string().trim().optional(),
  jobDescription: z.string().trim().optional(),
});

export type ParsedJobDetails = z.infer<typeof parsedJobSchema>;
export type ResumeSuggestionInput = z.infer<typeof suggestionInputSchema>;
type SuggestionStreamHandler = (chunk: string) => void;

const skillCatalog = [
  "TypeScript",
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

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

const getOpenAIModel = () => process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const normalizeText = (value: string) =>
  value.replace(/\r/g, "").replace(/\t/g, " ").replace(/\u2022/g, "-").trim();

const uniqueStrings = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const linesFromText = (value: string) =>
  normalizeText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const findFirstMatch = (text: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].trim().replace(/[.,;:]$/, "");
    }
  }

  return undefined;
};

const getSectionText = (text: string, headings: string[]) => {
  const lines = linesFromText(text);
  const lowerHeadings = headings.map((heading) => heading.toLowerCase());
  const collected: string[] = [];
  let collecting = false;

  for (const line of lines) {
    const normalizedLine = line.toLowerCase().replace(/[:\-]$/, "");

    if (lowerHeadings.includes(normalizedLine)) {
      collecting = true;
      continue;
    }

    if (collecting && /^[a-z][a-z\s/&]+[:]?$/i.test(line)) {
      break;
    }

    if (collecting) {
      collected.push(line);
    }
  }

  return collected.join("\n");
};

const collectSkills = (text: string) => {
  const lowerText = text.toLowerCase();

  return skillCatalog.filter((skill) => lowerText.includes(skill.toLowerCase()));
};

const detectSeniority = (text: string) => {
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

const detectLocation = (text: string) => {
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

const detectSalaryRange = (text: string) => {
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

const detectJdLink = (text: string) => {
  const urlMatch = text.match(/https?:\/\/[^\s)>"']+/i);
  return urlMatch?.[0] ?? "Not specified";
};

const extractCompany = (text: string) => {
  const company = findFirstMatch(text, [
    /company\s*[:\-]\s*([^\n]+)/i,
    /join\s+([A-Z][A-Za-z0-9&.,'()\- ]{1,60})\s+as/i,
    /at\s+([A-Z][A-Za-z0-9&.,'()\- ]{1,60})/i,
  ]);

  return company ?? "Unknown company";
};

const looksLikeRole = (line: string) => {
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

const extractRole = (text: string) => {
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

const buildFallbackParse = (jdText: string): ParsedJobDetails => {
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
    location: detectLocation(normalized),
    salaryRange: detectSalaryRange(normalized),
    jdLink: detectJdLink(normalized),
  };
};

const buildFallbackSuggestions = (input: ResumeSuggestionInput) => {
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

const buildSuggestionPrompt = (input: ResumeSuggestionInput) =>
  JSON.stringify({
    company: input.company ?? "Not specified",
    role: input.role,
    requiredSkills: input.requiredSkills ?? [],
    niceToHaveSkills: input.niceToHaveSkills ?? [],
    seniority: input.seniority ?? "Not specified",
    location: input.location ?? "Not specified",
    jobDescription: input.jobDescription ?? "Not provided",
  });

const extractSuggestionsFromText = (content: string) => {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s*/, "").replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  return uniqueStrings(lines).slice(0, 5);
};

export const parseJobDescription = async (jdText: string): Promise<ParsedJobDetails> => {
  const client = getOpenAIClient();

  if (!client) {
    return buildFallbackParse(jdText);
  }

  try {
    const completion = await client.chat.completions.parse({
      model: getOpenAIModel(),
      messages: [
        {
          role: "system",
          content:
            "Extract structured job details from the pasted job description. Include company, role, required skills, nice-to-have skills, seniority, location, salary range, and JD link. If any field is missing, use 'Not specified' for strings and [] for arrays. Only return a real URL for jdLink when one is present in the pasted text.",
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

    return {
      ...parsed,
      seniority:
        parsed.seniority !== "Not specified" ? parsed.seniority : fallbackParsed.seniority,
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
    };
  } catch {
    return buildFallbackParse(jdText);
  }
};

export const generateResumeSuggestions = async (
  rawInput: ResumeSuggestionInput
): Promise<string[]> => {
  const input = suggestionInputSchema.parse(rawInput);
  const client = getOpenAIClient();

  if (!client) {
    return buildFallbackSuggestions(input);
  }

  try {
    const completion = await client.chat.completions.parse({
      model: getOpenAIModel(),
      messages: [
        {
          role: "system",
          content:
            "Generate 3 to 5 concise resume bullet suggestions tailored to the target role. Make them specific to the role, required skills, and context provided. Avoid generic filler.",
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

    return uniqueStrings(parsed.suggestions).slice(0, 5);
  } catch {
    return buildFallbackSuggestions(input);
  }
};

export const streamResumeSuggestions = async (
  rawInput: ResumeSuggestionInput,
  onChunk: SuggestionStreamHandler
): Promise<string[]> => {
  const input = suggestionInputSchema.parse(rawInput);
  const client = getOpenAIClient();

  if (!client) {
    const fallback = buildFallbackSuggestions(input);
    const fallbackText = fallback.map((item) => `- ${item}`).join("\n");

    for (const character of fallbackText) {
      onChunk(character);
      await new Promise((resolve) => setTimeout(resolve, 3));
    }

    return fallback;
  }

  try {
    const stream = await client.chat.completions.create({
      model: getOpenAIModel(),
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "Generate 3 to 5 concise resume bullet suggestions tailored to the target role. Return plain text bullets only, each on its own line. Avoid generic filler.",
        },
        {
          role: "user",
          content: buildSuggestionPrompt(input),
        },
      ],
    });

    let combinedText = "";

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content;

      if (!delta) {
        continue;
      }

      combinedText += delta;
      onChunk(delta);
    }

    const parsedSuggestions = extractSuggestionsFromText(combinedText);

    if (parsedSuggestions.length >= 3) {
      return parsedSuggestions;
    }

    return buildFallbackSuggestions(input);
  } catch {
    const fallback = buildFallbackSuggestions(input);
    fallback.forEach((item, index) => {
      onChunk(`${index === 0 ? "" : "\n"}- ${item}`);
    });
    return fallback;
  }
};
