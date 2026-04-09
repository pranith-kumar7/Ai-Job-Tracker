export const APPLICATION_STATUSES = [
  "Applied",
  "Phone Screen",
  "Interview",
  "Offer",
  "Rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface User {
  id: string;
  email: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ParsedJobDetails {
  company: string;
  role: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniority: string;
  location: string;
  salaryRange: string;
  jdLink: string;
}

export interface ResumeSuggestionRequest {
  company?: string;
  role: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniority?: string;
  location?: string;
  jobDescription?: string;
}

export interface Application {
  _id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  dateApplied: string;
  jdLink?: string;
  jobDescription?: string;
  notes?: string;
  salaryRange?: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniority?: string;
  location?: string;
  resumeSuggestions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationPayload {
  company: string;
  role: string;
  status: ApplicationStatus;
  dateApplied: string;
  jdLink?: string;
  jobDescription?: string;
  notes?: string;
  salaryRange?: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniority?: string;
  location?: string;
  resumeSuggestions: string[];
}
