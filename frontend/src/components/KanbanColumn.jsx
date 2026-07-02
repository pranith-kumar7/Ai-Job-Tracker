import { useState } from "react";
import { statusToClassName } from "../utils/job-tracker";
import ApplicationCard from "./ApplicationCard";

export default function KanbanColumn({
  status,
  applications,
  draggedApplicationId,
  overdueApplicationIds,
  onOpen,
  onDragStart,
  onDragEnd,
  onDropApplication,
}) {
  const [isActiveDropZone, setIsActiveDropZone] = useState(false);

  return (
    <section
      className={`kanban-column kanban-column--${statusToClassName(status)} ${
        isActiveDropZone ? "kanban-column--active" : ""
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsActiveDropZone(true);
      }}
      onDragLeave={() => setIsActiveDropZone(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsActiveDropZone(false);
        onDropApplication(status);
      }}
    >
      <header className="kanban-column__header">
        <div>
          <p className="eyebrow eyebrow--compact">{status}</p>
          <h2>{applications.length} role{applications.length === 1 ? "" : "s"}</h2>
        </div>
      </header>

      <div className="kanban-column__stack">
        {applications.length === 0 ? (
          <div className="empty-column">Drop a card here when it reaches this stage.</div>
        ) : (
          applications.map((application) => (
            <ApplicationCard
              key={application._id}
              application={application}
              isDragging={draggedApplicationId === application._id}
              isOverdue={overdueApplicationIds.includes(application._id)}
              onOpen={onOpen}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </section>
  );
}
