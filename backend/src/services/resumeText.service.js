import { PDFParse } from "pdf-parse";

const MAX_RESUME_TEXT_LENGTH = 40000;

const normalizeResumeText = (value) =>
  String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\u2022/g, "-")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_RESUME_TEXT_LENGTH);

const extractPdfText = async (buffer) => {
  const parser = new PDFParse({ data: buffer });

  try {
    const parsed = await parser.getText();
    return parsed.text;
  } finally {
    await parser.destroy();
  }
};

export const extractResumeText = async ({ file, resumeText }) => {
  if (resumeText?.trim()) {
    return normalizeResumeText(resumeText);
  }

  if (!file?.buffer) {
    throw new Error("Resume file or resume text is required");
  }

  if (file.mimetype === "application/pdf") {
    return normalizeResumeText(await extractPdfText(file.buffer));
  }

  if (
    file.mimetype === "text/plain" ||
    file.originalname?.toLowerCase().endsWith(".txt")
  ) {
    return normalizeResumeText(file.buffer.toString("utf8"));
  }

  throw new Error("Only PDF and TXT resumes are supported");
};
