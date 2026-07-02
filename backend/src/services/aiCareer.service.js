import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  COVER_LETTER_SYSTEM_PROMPT,
  INTERVIEW_EVALUATION_SYSTEM_PROMPT,
  INTERVIEW_PREP_SYSTEM_PROMPT,
  RESUME_ANALYZER_SYSTEM_PROMPT,
  RESUME_JOB_MATCH_SYSTEM_PROMPT,
  RESUME_OPTIMIZER_SYSTEM_PROMPT,
} from "./ai.prompts.js";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

const resumeAnalysisSchema = z.object({
  atsScore: z.number().min(0).max(100),
  resumeSummary: z.string().min(1),
  missingKeywords: z.array(z.string()).max(20),
  missingSkills: z.array(z.string()).max(20),
  weakSections: z.array(z.string()).max(10),
  strongSections: z.array(z.string()).max(10),
  improvementSuggestions: z.array(z.string()).max(12),
});

const resumeMatchSchema = z.object({
  matchPercentage: z.number().min(0).max(100),
  matchingSkills: z.array(z.string()).max(20),
  missingSkills: z.array(z.string()).max(20),
  recommendations: z.array(z.string()).max(12),
  hiringProbability: z.string().min(1),
});

const resumeOptimizerSchema = z.object({
  betterSummary: z.string().min(1),
  betterProjectDescriptions: z.array(z.string()).max(8),
  betterSkills: z.array(z.string()).max(20),
  betterAchievements: z.array(z.string()).max(10),
});

const coverLetterSchema = z.object({
  professional: z.string().min(1),
  startup: z.string().min(1),
  corporate: z.string().min(1),
  friendly: z.string().min(1),
});

const interviewPrepSchema = z.object({
  hrQuestions: z.array(z.string()).max(8),
  technicalQuestions: z.array(z.string()).max(10),
  behavioralQuestions: z.array(z.string()).max(8),
  companySpecificQuestions: z.array(z.string()).max(8),
});

const interviewEvaluationSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.array(z.string()).max(8),
  improvedAnswer: z.string().min(1),
});

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: Number.parseInt(process.env.OPENAI_TIMEOUT_MS ?? "30000", 10),
    maxRetries: Number.parseInt(process.env.OPENAI_MAX_RETRIES ?? "1", 10),
  });
};

const getOpenAIModel = () => process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;

const uniqueStrings = (values) =>
  Array.from(new Set(values.map((value) => String(value).trim()).filter(Boolean)));

const metadataKeywords = new Set([
  "about",
  "analytics",
  "benefits",
  "bengaluru",
  "brightmetrics",
  "company",
  "compensation",
  "experience",
  "hybrid",
  "india",
  "junior",
  "location",
  "lpa",
  "remote",
  "role",
  "salary",
  "skills",
  "year",
  "years",
]);

const extractKeywords = (text) => {
  const words = String(text)
    .toLowerCase()
    .match(/[a-z][a-z0-9+#.-]{2,}/g);

  if (!words) {
    return [];
  }

  const stopWords = new Set([
    "and",
    "the",
    "for",
    "with",
    "you",
    "our",
    "will",
    "are",
    "this",
    "that",
    "from",
    "have",
    "your",
    "job",
    "role",
    "company",
    "location",
    "salary",
    "benefits",
    "experience",
    "responsibilities",
    "required",
    "preferred",
  ]);

  return uniqueStrings(
    words.filter((word) => !stopWords.has(word) && !metadataKeywords.has(word))
  ).slice(0, 30);
};

const commonSkills = [
  { name: "JavaScript", terms: ["javascript", "js"] },
  { name: "TypeScript", terms: ["typescript"] },
  { name: "React", terms: ["react", "react.js"] },
  { name: "Node.js", terms: ["node.js", "nodejs", "node"] },
  { name: "Express", terms: ["express", "express.js"] },
  { name: "MongoDB", terms: ["mongodb", "mongo"] },
  { name: "Mongoose", terms: ["mongoose"] },
  { name: "JWT", terms: ["jwt", "json web token"] },
  { name: "REST APIs", terms: ["rest api", "rest apis", "api", "apis"] },
  { name: "Testing", terms: ["unit testing", "automated testing", "test cases", "jest", "cypress", "playwright"] },
  { name: "AWS", terms: ["aws", "amazon web services"] },
  { name: "Docker", terms: ["docker"] },
  { name: "SQL", terms: ["sql", "mysql", "postgresql", "postgres"] },
  { name: "Python", terms: ["python"] },
  { name: "Java", terms: ["java"] },
  { name: "CSS", terms: ["css"] },
  { name: "HTML", terms: ["html"] },
  { name: "Excel", terms: ["excel", "spreadsheets"] },
  { name: "Pandas", terms: ["pandas"] },
  { name: "Power BI", terms: ["power bi", "powerbi"] },
  { name: "Tableau", terms: ["tableau"] },
  { name: "Statistics", terms: ["statistics", "statistical"] },
  { name: "A/B Testing", terms: ["a/b testing", "ab testing"] },
  { name: "Google Analytics", terms: ["google analytics", "ga4"] },
  { name: "Data Cleaning", terms: ["data cleaning", "clean raw data"] },
  { name: "Data Visualization", terms: ["data visualization", "visualization", "dashboards"] },
  { name: "Figma", terms: ["figma"] },
  { name: "Wireframing", terms: ["wireframing", "wireframes"] },
  { name: "Prototyping", terms: ["prototyping", "prototype"] },
  { name: "User Research", terms: ["user research"] },
  { name: "Linux", terms: ["linux"] },
  { name: "CI/CD", terms: ["ci/cd", "ci cd", "github actions"] },
  { name: "Kubernetes", terms: ["kubernetes", "k8s"] },
  { name: "Terraform", terms: ["terraform"] },
  { name: "Machine Learning", terms: ["machine learning", "ml"] },
  { name: "TensorFlow", terms: ["tensorflow"] },
  { name: "Scikit-learn", terms: ["scikit-learn", "sklearn"] },
  { name: "NLP", terms: ["nlp", "natural language processing"] },
  { name: "RAG", terms: ["rag", "retrieval augmented generation"] },
];

const detectSkills = (text) => {
  const lower = String(text).toLowerCase();
  return commonSkills
    .filter((skill) => skill.terms.some((term) => lower.includes(term)))
    .map((skill) => skill.name);
};

const calculateKeywordCoverage = (resumeText, jobDescription) => {
  const resumeLower = String(resumeText).toLowerCase();
  const keywords = extractKeywords(jobDescription).slice(0, 12);
  const matchedKeywords = keywords.filter((keyword) => resumeLower.includes(keyword));

  return {
    keywords,
    matchedKeywords,
    ratio: keywords.length ? matchedKeywords.length / keywords.length : 0,
  };
};

const detectRoleFamily = (text) => {
  const lower = String(text).toLowerCase();

  if (/(data analyst|business analyst|analytics|power bi|tableau|pandas|excel|sql)/i.test(lower)) {
    return "data";
  }
  if (/(frontend|backend|full stack|full-stack|mern|react|node|express|mongodb|developer|engineer)/i.test(lower)) {
    return "software";
  }
  if (/(designer|ui\/ux|ux|figma|wireframe|prototype)/i.test(lower)) {
    return "design";
  }
  if (/(devops|docker|kubernetes|terraform|ci\/cd|aws|linux)/i.test(lower)) {
    return "devops";
  }
  if (/(machine learning|ml engineer|ai engineer|tensorflow|scikit|nlp|rag)/i.test(lower)) {
    return "ai-ml";
  }

  return "general";
};

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

const makeUsageReporter = (feature, onUsage) => async (status, usage, errorMessage) => {
  if (typeof onUsage !== "function") {
    return;
  }

  await onUsage({
    feature,
    provider: status === "fallback" ? "fallback" : "openai",
    model: getOpenAIModel(),
    status,
    usage,
    errorMessage,
  });
};

const runStructuredAI = async ({
  feature,
  systemPrompt,
  userPayload,
  schema,
  fallback,
  onUsage,
}) => {
  const report = makeUsageReporter(feature, onUsage);
  const client = getOpenAIClient();

  if (!client) {
    await report("fallback");
    return fallback();
  }

  try {
    const completion = await client.chat.completions.parse({
      model: getOpenAIModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      response_format: zodResponseFormat(schema, feature),
    });

    const parsed = completion.choices[0]?.message.parsed;

    if (!parsed) {
      throw new Error("The model did not return structured output.");
    }

    await report("success", completion.usage);
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(`[AI] ${feature} failed; using fallback. ${message}`);
    await report("fallback", undefined, message);
    return fallback();
  }
};

export const analyzeResume = async ({ resumeText, targetRole, jobDescription }, options = {}) =>
  runStructuredAI({
    feature: "resume_analyzer",
    systemPrompt: RESUME_ANALYZER_SYSTEM_PROMPT,
    userPayload: { resumeText, targetRole, jobDescription },
    schema: resumeAnalysisSchema,
    onUsage: options.onUsage,
    fallback: () => {
      const resumeSkills = detectSkills(resumeText);
      const jobSkills = detectSkills(jobDescription || targetRole || "");
      const keywordCoverage = calculateKeywordCoverage(
        resumeText,
        jobDescription || targetRole || ""
      );
      const missingSkills = jobSkills
        .filter((skill) => !resumeSkills.includes(skill))
        .slice(0, 8);
      const missingKeywords = keywordCoverage.keywords
        .filter((keyword) => !resumeText.toLowerCase().includes(keyword))
        .slice(0, 8);
      const skillCoverage = jobSkills.length
        ? (jobSkills.length - missingSkills.length) / jobSkills.length
        : Math.min(resumeSkills.length / 8, 1);
      const atsScore = clampScore(
        35 + skillCoverage * 35 + keywordCoverage.ratio * 20 + Math.min(resumeSkills.length, 8)
      );

      return {
        atsScore,
        resumeSummary: "Resume analyzed with local heuristics. Add a target job description for sharper recommendations.",
        missingKeywords,
        missingSkills,
        weakSections: resumeText.length < 1200 ? ["Detail and impact depth"] : ["Role-specific keyword alignment"],
        strongSections: resumeSkills.length > 0 ? ["Technical skills"] : ["Baseline professional experience"],
        improvementSuggestions: [
          "Add measurable outcomes to recent projects.",
          "Mirror important keywords from the job description.",
          "Use concise bullets with action, scope, and result.",
        ],
      };
    },
  });

export const matchResumeToJob = async ({ resumeText, jobDescription }, options = {}) =>
  runStructuredAI({
    feature: "resume_job_match",
    systemPrompt: RESUME_JOB_MATCH_SYSTEM_PROMPT,
    userPayload: { resumeText, jobDescription },
    schema: resumeMatchSchema,
    onUsage: options.onUsage,
    fallback: () => {
      const resumeSkills = detectSkills(resumeText);
      const jobSkills = detectSkills(jobDescription);
      const matchingSkills = jobSkills.filter((skill) => resumeSkills.includes(skill));
      const missingSkills = jobSkills.filter((skill) => !resumeSkills.includes(skill));
      const keywordCoverage = calculateKeywordCoverage(resumeText, jobDescription);
      const resumeFamily = detectRoleFamily(resumeText);
      const jobFamily = detectRoleFamily(jobDescription);
      const skillCoverage = jobSkills.length ? matchingSkills.length / jobSkills.length : 0;
      const roleAlignment =
        resumeFamily === "general" || jobFamily === "general"
          ? 0.5
          : resumeFamily === jobFamily
            ? 1
            : 0.25;
      const baseScore =
        skillCoverage * 65 + keywordCoverage.ratio * 20 + roleAlignment * 15;
      const matchPercentage = clampScore(baseScore);

      return {
        matchPercentage,
        matchingSkills,
        missingSkills,
        recommendations: [
          "Add missing job-critical skills where you have real experience.",
          "Tailor the summary to the target role.",
          roleAlignment < 0.5
            ? "This role appears to be in a different domain, so add only truthful transferable experience."
            : "Move the most relevant projects higher on the resume.",
        ],
        hiringProbability:
          matchPercentage >= 75 ? "Strong" : matchPercentage >= 50 ? "Moderate" : "Low",
      };
    },
  });

export const optimizeResume = async ({ resumeText, jobDescription }, options = {}) =>
  runStructuredAI({
    feature: "resume_optimizer",
    systemPrompt: RESUME_OPTIMIZER_SYSTEM_PROMPT,
    userPayload: { resumeText, jobDescription },
    schema: resumeOptimizerSchema,
    onUsage: options.onUsage,
    fallback: () => ({
      betterSummary:
        "Results-driven developer with experience building user-focused web applications, APIs, and data-backed workflows.",
      betterProjectDescriptions: [
        "Built production-ready features across frontend and backend layers, improving workflow clarity and delivery speed.",
      ],
      betterSkills: uniqueStrings([...detectSkills(resumeText), ...detectSkills(jobDescription || "")]),
      betterAchievements: [
        "Improved reliability by adding validation, error handling, and reusable service patterns.",
      ],
    }),
  });

export const generateCoverLetters = async (
  { resumeText, jobDescription, company, role },
  options = {}
) =>
  runStructuredAI({
    feature: "cover_letter_generator",
    systemPrompt: COVER_LETTER_SYSTEM_PROMPT,
    userPayload: { resumeText, jobDescription, company, role },
    schema: coverLetterSchema,
    onUsage: options.onUsage,
    fallback: () => {
      const target = [role, company].filter(Boolean).join(" at ") || "this opportunity";
      const base = `I am excited to apply for ${target}. My background building full-stack applications, translating requirements into shipped features, and improving product workflows aligns well with this role. I would welcome the chance to bring strong ownership, clear communication, and practical engineering judgment to your team.`;

      return {
        professional: base,
        startup: `${base} I am especially drawn to fast-moving teams where I can take initiative and contribute across product and engineering decisions.`,
        corporate: `${base} I value structured collaboration, dependable delivery, and building maintainable systems at scale.`,
        friendly: `${base} I would be thrilled to learn more about the team and discuss how I can help.`,
      };
    },
  });

export const generateInterviewPrep = async (
  { resumeText, jobDescription, company, role },
  options = {}
) =>
  runStructuredAI({
    feature: "interview_generator",
    systemPrompt: INTERVIEW_PREP_SYSTEM_PROMPT,
    userPayload: { resumeText, jobDescription, company, role },
    schema: interviewPrepSchema,
    onUsage: options.onUsage,
    fallback: () => ({
      hrQuestions: [
        "Tell me about yourself.",
        "Why are you interested in this role?",
        "What kind of team environment helps you do your best work?",
      ],
      technicalQuestions: [
        "How would you design a secure REST API for this product?",
        "How do you handle authentication and authorization?",
        "How would you debug a slow database query?",
      ],
      behavioralQuestions: [
        "Tell me about a time you handled ambiguity.",
        "Describe a time you improved an existing system.",
        "Tell me about a conflict you resolved with a teammate.",
      ],
      companySpecificQuestions: [
        `What interests you about ${company || "this company"}?`,
        `How would your experience help you succeed as ${role || "this role"}?`,
      ],
    }),
  });

export const evaluateInterviewAnswer = async (
  { question, answer, jobDescription },
  options = {}
) =>
  runStructuredAI({
    feature: "interview_answer_evaluation",
    systemPrompt: INTERVIEW_EVALUATION_SYSTEM_PROMPT,
    userPayload: { question, answer, jobDescription },
    schema: interviewEvaluationSchema,
    onUsage: options.onUsage,
    fallback: () => ({
      score: answer?.length > 180 ? 72 : 55,
      feedback: [
        "Add a clearer situation, action, and result structure.",
        "Include a measurable outcome where possible.",
      ],
      improvedAnswer: `${answer || "My answer"} I would strengthen this by adding the context, the specific action I took, and the business or user impact.`,
    }),
  });
