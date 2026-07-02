export const parseCommaSeparated = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const toDateInputValue = (value) => {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const formatDateLabel = (value) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

export const statusToClassName = (status) =>
  status.toLowerCase().replace(/\s+/g, "-");

export const createEmptyFormState = () => ({
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
  experience: "",
  location: "",
  responsibilitiesText: "",
  benefitsText: "",
  resumeSuggestions: [],
});

export const mapApplicationToFormState = (application) => {
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
    experience: application.experience ?? "",
    location: application.location ?? "",
    responsibilitiesText: (application.responsibilities ?? []).join("\n"),
    benefitsText: (application.benefits ?? []).join("\n"),
    resumeSuggestions: application.resumeSuggestions,
  };
};

export const buildApplicationPayload = (form) => ({
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
  experience: form.experience.trim() || undefined,
  location: form.location.trim() || undefined,
  responsibilities: form.responsibilitiesText
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean),
  benefits: form.benefitsText
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean),
  resumeSuggestions: form.resumeSuggestions,
});

export const mergeParsedDetailsIntoForm = (form, parsed) => ({
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
  experience:
    parsed.experience && parsed.experience !== "Not specified"
      ? parsed.experience
      : form.experience,
  location:
    parsed.location && parsed.location !== "Not specified"
      ? parsed.location
      : form.location,
  responsibilitiesText:
    parsed.responsibilities?.length > 0
      ? parsed.responsibilities.join("\n")
      : form.responsibilitiesText,
  benefitsText:
    parsed.benefits?.length > 0 ? parsed.benefits.join("\n") : form.benefitsText,
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

export const buildSuggestionRequest = (form) => ({
  company: form.company.trim() || undefined,
  role: form.role.trim(),
  requiredSkills: parseCommaSeparated(form.requiredSkillsText),
  niceToHaveSkills: parseCommaSeparated(form.niceToHaveSkillsText),
  seniority: form.seniority.trim() || undefined,
  experience: form.experience.trim() || undefined,
  location: form.location.trim() || undefined,
  jobDescription: form.jobDescription.trim() || undefined,
});
