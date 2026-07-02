const activeStatuses = ["Applied", "Phone Screen", "Interview"];

const daysSince = (value) =>
  Math.floor((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24));

export default function NotificationsPanel({ applications, onOpen }) {
  const notifications = applications
    .filter((application) => activeStatuses.includes(application.status))
    .map((application) => {
      const idleDays = daysSince(application.updatedAt || application.dateApplied);

      if (idleDays >= 7) {
        return {
          id: application._id,
          application,
          title: `${application.company} follow-up`,
          message: `${application.role} has been idle for ${idleDays} days.`,
          tone: "urgent",
        };
      }

      if (application.status === "Interview" && idleDays >= 3) {
        return {
          id: application._id,
          application,
          title: `${application.company} interview prep`,
          message: "Refresh interview questions and follow-up notes.",
          tone: "info",
        };
      }

      return null;
    })
    .filter(Boolean)
    .slice(0, 5);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <section className="notifications-panel">
      <p className="eyebrow eyebrow--compact">Smart Reminders</p>
      <div className="notification-list">
        {notifications.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`notification-item notification-item--${item.tone}`}
            onClick={() => onOpen(item.application)}
          >
            <strong>{item.title}</strong>
            <span>{item.message}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
