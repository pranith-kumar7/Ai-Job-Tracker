import { useEffect, useState } from "react";
import type {
  Application,
  ApplicationPayload,
  ParsedJobDetails,
  ResumeSuggestionRequest,
} from "../types/job-tracker";
import { APPLICATION_STATUSES } from "../types/job-tracker";
import { getErrorMessage } from "../services/api";
import {
  buildApplicationPayload,
  buildSuggestionRequest,
  createEmptyFormState,
  mapApplicationToFormState,
  mergeParsedDetailsIntoForm,
  type ApplicationFormState,
} from "../utils/job-tracker";

interface ApplicationModalProps {
  isOpen: boolean;
  application: Application | null;
  isSaving: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onSave: (payload: ApplicationPayload, applicationId?: string) => Promise<void>;
  onDelete: (applicationId: string) => Promise<void>;
  parseJobDescription: (jdText: string) => Promise<ParsedJobDetails>;
  generateResumeSuggestions: (
    payload: ResumeSuggestionRequest
  ) => Promise<string[]>;
  streamResumeSuggestions: (
    payload: ResumeSuggestionRequest,
    onChunk: (chunk: string) => void
  ) => Promise<string[]>;
}

export default function ApplicationModal({
  isOpen,
  application,
  isSaving,
  isDeleting,
  onClose,
  onSave,
  onDelete,
  parseJobDescription,
  generateResumeSuggestions,
  streamResumeSuggestions,
}: ApplicationModalProps) {
  const [form, setForm] = useState<ApplicationFormState>(createEmptyFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedSuggestionText, setStreamedSuggestionText] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm(mapApplicationToFormState(application));
    setFormError(null);
    setCopyMessage(null);
    setStreamedSuggestionText("");
  }, [application, isOpen]);

  if (!isOpen) {
    return null;
  }

  const updateField = <Key extends keyof ApplicationFormState>(
    field: Key,
    value: ApplicationFormState[Key]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleParse = async () => {
    if (!form.jobDescription.trim()) {
      setFormError("Paste a job description before running the parser.");
      return;
    }

    setFormError(null);
    setCopyMessage(null);
    setIsParsing(true);

    try {
      const parsed = await parseJobDescription(form.jobDescription);
      const mergedForm = mergeParsedDetailsIntoForm(form, parsed);
      setForm(mergedForm);

      if (mergedForm.role.trim()) {
        const suggestions = await generateResumeSuggestions(
          buildSuggestionRequest(mergedForm)
        );
        setForm((current) => ({
          ...current,
          resumeSuggestions: suggestions,
        }));
        setStreamedSuggestionText(suggestions.map((item) => `- ${item}`).join("\n"));
      }
    } catch (error) {
      setFormError(
        getErrorMessage(error, "The job description could not be parsed right now.")
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    if (!form.role.trim()) {
      setFormError("Add the role first so the resume suggestions can be tailored.");
      return;
    }

    setFormError(null);
    setCopyMessage(null);
    setIsGenerating(true);
    setStreamedSuggestionText("");

    try {
      const suggestions = await streamResumeSuggestions(buildSuggestionRequest(form), (chunk) =>
        setStreamedSuggestionText((current) => current + chunk)
      );

      setForm((current) => ({
        ...current,
        resumeSuggestions: suggestions,
      }));
    } catch (error) {
      setFormError(
        getErrorMessage(error, "Resume suggestions are unavailable at the moment.")
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    try {
      await onSave(buildApplicationPayload(form), application?._id);
      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error, "The application could not be saved."));
    }
  };

  const handleDelete = async () => {
    if (!application?._id) {
      return;
    }

    if (!window.confirm(`Delete ${application.company} - ${application.role}?`)) {
      return;
    }

    setFormError(null);

    try {
      await onDelete(application._id);
      onClose();
    } catch (error) {
      setFormError(
        getErrorMessage(error, "The application could not be deleted.")
      );
    }
  };

  const handleCopySuggestion = async (suggestion: string) => {
    try {
      await navigator.clipboard.writeText(suggestion);
      setCopyMessage("Suggestion copied.");
    } catch {
      setCopyMessage("Clipboard access is unavailable here.");
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={application ? "Application details" : "Add application"}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow eyebrow--compact">
              {application ? "Application Details" : "Add Application"}
            </p>
            <h2>{application ? "Edit job application" : "Capture a new role"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            Close
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="field-group field-group--full">
            <label htmlFor="jobDescription">Job description</label>
            <textarea
              id="jobDescription"
              className="input input--textarea"
              value={form.jobDescription}
              onChange={(event) => updateField("jobDescription", event.target.value)}
              placeholder="Paste the job description here before parsing."
              rows={7}
            />
            <div className="action-row">
              <button
                type="button"
                className="button button--secondary"
                onClick={handleParse}
                disabled={isParsing}
              >
                {isParsing ? "Parsing..." : "Parse JD"}
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={handleGenerateSuggestions}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Refresh Suggestions"}
              </button>
            </div>
          </div>

          <div className="modal-grid">
            <div className="field-group">
              <label htmlFor="company">Company</label>
              <input
                id="company"
                className="input"
                value={form.company}
                onChange={(event) => updateField("company", event.target.value)}
                placeholder="Acme"
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="role">Role</label>
              <input
                id="role"
                className="input"
                value={form.role}
                onChange={(event) => updateField("role", event.target.value)}
                placeholder="Frontend Engineer"
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                className="input"
                value={form.status}
                onChange={(event) =>
                  updateField("status", event.target.value as Application["status"])
                }
              >
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="dateApplied">Date applied</label>
              <input
                id="dateApplied"
                type="date"
                className="input"
                value={form.dateApplied}
                onChange={(event) => updateField("dateApplied", event.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                className="input"
                value={form.location}
                onChange={(event) => updateField("location", event.target.value)}
                placeholder="Remote / Bengaluru / Hybrid"
              />
            </div>

            <div className="field-group">
              <label htmlFor="seniority">Seniority</label>
              <input
                id="seniority"
                className="input"
                value={form.seniority}
                onChange={(event) => updateField("seniority", event.target.value)}
                placeholder="Junior / Senior / Lead"
              />
            </div>

            <div className="field-group">
              <label htmlFor="jdLink">JD link</label>
              <input
                id="jdLink"
                className="input"
                value={form.jdLink}
                onChange={(event) => updateField("jdLink", event.target.value)}
                placeholder="https://company.com/jobs/..."
              />
            </div>

            <div className="field-group">
              <label htmlFor="salaryRange">Salary range</label>
              <input
                id="salaryRange"
                className="input"
                value={form.salaryRange}
                onChange={(event) => updateField("salaryRange", event.target.value)}
                placeholder="$90k - $120k"
              />
            </div>

            <div className="field-group field-group--full">
              <label htmlFor="requiredSkills">Required skills</label>
              <input
                id="requiredSkills"
                className="input"
                value={form.requiredSkillsText}
                onChange={(event) =>
                  updateField("requiredSkillsText", event.target.value)
                }
                placeholder="React, TypeScript, Node.js"
              />
            </div>

            <div className="field-group field-group--full">
              <label htmlFor="niceToHaveSkills">Nice-to-have skills</label>
              <input
                id="niceToHaveSkills"
                className="input"
                value={form.niceToHaveSkillsText}
                onChange={(event) =>
                  updateField("niceToHaveSkillsText", event.target.value)
                }
                placeholder="AWS, Docker, GraphQL"
              />
            </div>

            <div className="field-group field-group--full">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                className="input input--textarea"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Interview notes, recruiter context, follow-up ideas..."
                rows={4}
              />
            </div>
          </div>

          <div className="field-group field-group--full">
            <div className="section-heading">
              <div>
                <label>Resume suggestions</label>
                <p className="section-copy">
                  Tailored bullets generated for this role. Copy any line as a starting point.
                </p>
              </div>
              {copyMessage ? <span className="mini-note">{copyMessage}</span> : null}
            </div>

            {isGenerating && streamedSuggestionText ? (
              <div className="stream-preview">
                <span className="stream-label">Streaming draft</span>
                <pre>{streamedSuggestionText}</pre>
              </div>
            ) : null}

            <div className="suggestions-list">
              {form.resumeSuggestions.length === 0 ? (
                <div className="empty-suggestions">
                  Generate suggestions after parsing the JD or filling in the role details.
                </div>
              ) : (
                form.resumeSuggestions.map((suggestion) => (
                  <article key={suggestion} className="suggestion-card">
                    <p>{suggestion}</p>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => handleCopySuggestion(suggestion)}
                    >
                      Copy
                    </button>
                  </article>
                ))
              )}
            </div>
          </div>

          {formError ? <div className="form-error">{formError}</div> : null}

          <div className="modal-actions">
            <button type="button" className="button button--ghost" onClick={onClose}>
              Cancel
            </button>

            {application ? (
              <button
                type="button"
                className="button button--danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            ) : null}

            <button
              type="submit"
              className="button button--primary"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : application ? "Save Changes" : "Save Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
