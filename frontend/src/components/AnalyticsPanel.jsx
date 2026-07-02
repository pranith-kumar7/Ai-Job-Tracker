import { useMemo } from "react";

const statusLabels = ["Applied", "Phone Screen", "Interview", "Offer", "Rejected"];

const monthLabel = (value) =>
  new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
    new Date(value)
  );

export default function AnalyticsPanel({ applications, aiUsage }) {
  const statusCounts = useMemo(
    () =>
      statusLabels.map((status) => ({
        status,
        count: applications.filter((item) => item.status === status).length,
      })),
    [applications]
  );

  const monthlyCounts = useMemo(() => {
    const counts = new Map();

    applications.forEach((application) => {
      const label = monthLabel(application.dateApplied);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([month, count]) => ({ month, count }))
      .slice(-6);
  }, [applications]);

  const maxStatusCount = Math.max(...statusCounts.map((item) => item.count), 1);
  const maxMonthlyCount = Math.max(...monthlyCounts.map((item) => item.count), 1);

  return (
    <section className="analytics-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow eyebrow--compact">Analytics</p>
          <h2>Pipeline and AI usage</h2>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Status Breakdown</h3>
          <div className="bar-list">
            {statusCounts.map((item) => (
              <div key={item.status} className="bar-row">
                <span>{item.status}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(item.count / maxStatusCount) * 100}%` }}
                  />
                </div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-card">
          <h3>Monthly Applications</h3>
          <div className="bar-list">
            {monthlyCounts.length === 0 ? (
              <p className="section-copy">No applications yet.</p>
            ) : (
              monthlyCounts.map((item) => (
                <div key={item.month} className="bar-row">
                  <span>{item.month}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill bar-fill--orange"
                      style={{ width: `${(item.count / maxMonthlyCount) * 100}%` }}
                    />
                  </div>
                  <strong>{item.count}</strong>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="analytics-card">
          <h3>AI Usage</h3>
          <div className="ai-usage-grid">
            <div>
              <span>Requests</span>
              <strong>{aiUsage?.requestCount ?? 0}</strong>
            </div>
            <div>
              <span>Tokens</span>
              <strong>{aiUsage?.totalTokens ?? 0}</strong>
            </div>
            <div>
              <span>Cost</span>
              <strong>${(aiUsage?.estimatedCostUsd ?? 0).toFixed(4)}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
