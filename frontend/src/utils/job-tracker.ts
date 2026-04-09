import type {
  Application,
  ApplicationPayload,
  ApplicationStatus,
  ParsedJobDetails,
  ResumeSuggestionRequest,
} from "../types/job-tracker";

export interface ApplicationFormState {
  company: string;
  role: string;
  status: ApplicationStatus;
  dateApplied: string;
  jdLink: string;
  jobDescription: string;
  notes: string;
  salaryRange: string;
  requiredSkillsText: string;
  niceToHaveSkillsText: string;
  seniority: string;
  location: string;
  resumeSuggestions: string[];
}

export const parseCommaSeparated = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const toDateInputValue = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const formatDateLabel = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

export const statusToClassName = (status: ApplicationStatus) =>
  status.toLowerCase().replace(/\s+/g, "-");

export const createEmptyFormState = (): ApplicationFormState => ({
  company: "",
  role: "",
  status: "Applied",
  dateApplied: toDateInputValue(),
  jdLink: "",
  jobDescription: "",
  notes: "",
  salaryRange: "",
  requiredSkillsText: "",
  niceToHaveSkillsText: "",
  seniority: "",
  location: "",
  resumeSuggestions: [],
});

export const mapApplicationToFormState = (
  application: Application | null
): ApplicationFormState => {
  if (!application) {
    return createEmptyFormState();
  }

  return {
    company: application.company,
    role: application.role,
    status: application.status,
    dateApplied: toDateInputValue(application.dateApplied),
    jdLink: application.jdLink ?? "",
    jobDescription: application.jobDescription ?? "",
    notes: application.notes ?? "",
    salaryRange: application.salaryRange ?? "",
    requiredSkillsText: application.requiredSkills.join(", "),
    niceToHaveSkillsText: application.niceToHaveSkills.join(", "),
    seniority: application.seniority ?? "",
    location: application.location ?? "",
    resumeSuggestions: application.resumeSuggestions,
  };
};

export const buildApplicationPayload = (
  form: ApplicationFormState
): ApplicationPayload => ({
  company: form.company.trim(),
  role: form.role.trim(),
  status: form.status,
  dateApplied: form.dateApplied,
  jdLink: form.jdLink.trim() || undefined,
  jobDescription: form.jobDescription.trim() || undefined,
  notes: form.notes.trim() || undefined,
  salaryRange: form.salaryRange.trim() || undefined,
  requiredSkills: parseCommaSeparated(form.requiredSkillsText),
  niceToHaveSkills: parseCommaSeparated(form.niceToHaveSkillsText),
  seniority: form.seniority.trim() || undefined,
  location: form.location.trim() || undefined,
  resumeSuggestions: form.resumeSuggestions,
});

export const mergeParsedDetailsIntoForm = (
  form: ApplicationFormState,
  parsed: ParsedJobDetails
): ApplicationFormState => ({
  ...form,
  company:
    parsed.company && parsed.company !== "Unknown company"
      ? parsed.company
      : form.company,
  role: parsed.role && parsed.role !== "Unknown role" ? parsed.role : form.role,
  requiredSkillsText: parsed.requiredSkills.join(", "),
  niceToHaveSkillsText: parsed.niceToHaveSkills.join(", "),
  seniority:
    parsed.seniority && parsed.seniority !== "Not specified"
      ? parsed.seniority
      : form.seniority,
  location:
    parsed.location && parsed.location !== "Not specified"
      ? parsed.location
      : form.location,
  salaryRange:
    parsed.salaryRange && parsed.salaryRange !== "Not specified"
      ? parsed.salaryRange
      : form.salaryRange,
  jdLink:
    parsed.jdLink &&
    parsed.jdLink !== "Not specified" &&
    /^https?:\/\//i.test(parsed.jdLink)
      ? parsed.jdLink
      : form.jdLink,
});

export const buildSuggestionRequest = (
  form: ApplicationFormState
): ResumeSuggestionRequest => ({
  company: form.company.trim() || undefined,
  role: form.role.trim(),
  requiredSkills: parseCommaSeparated(form.requiredSkillsText),
  niceToHaveSkills: parseCommaSeparated(form.niceToHaveSkillsText),
  seniority: form.seniority.trim() || undefined,
  location: form.location.trim() || undefined,
  jobDescription: form.jobDescription.trim() || undefined,
});
