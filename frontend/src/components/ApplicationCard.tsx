import type { Application } from "../types/job-tracker";
import { formatDateLabel, statusToClassName } from "../utils/job-tracker";

interface ApplicationCardProps {
  application: Application;
  isDragging: boolean;
  isOverdue?: boolean;
  onOpen: (application: Application) => void;
  onDragStart: (applicationId: string) => void;
  onDragEnd: () => void;
}

export default function ApplicationCard({
  application,
  isDragging,
  isOverdue = false,
  onOpen,
  onDragStart,
  onDragEnd,
}: ApplicationCardProps) {
  return (
    <button
      type="button"
      className={`application-card ${isDragging ? "application-card--dragging" : ""} ${
        isOverdue ? "application-card--overdue" : ""
      }`}
      draggable
      onClick={() => onOpen(application)}
      onDragStart={() => onDragStart(application._id)}
      onDragEnd={onDragEnd}
    >
      <div className="application-card__topline">
        <span className={`status-pill status-pill--${statusToClassName(application.status)}`}>
          {application.status}
        </span>
        <span className="application-card__date">
          {formatDateLabel(application.dateApplied)}
        </span>
      </div>

      <div className="application-card__body">
        <h3>{application.company}</h3>
        <p>{application.role}</p>
      </div>

      <div className="application-card__meta">
        <span>{application.location || "Location TBD"}</span>
        <span>{application.requiredSkills.slice(0, 2).join(" • ") || "Skills pending"}</span>
      </div>

      {isOverdue ? (
        <div className="reminder-flag">Follow-up reminder overdue</div>
      ) : null}
    </button>
  );
}
