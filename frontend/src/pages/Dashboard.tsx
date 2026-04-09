import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import ApplicationModal from "../components/ApplicationModal";
import KanbanColumn from "../components/KanbanColumn";
import { useAuth } from "../hooks/useAuth";
import {
  aiApi,
  applicationsApi,
  getErrorMessage,
} from "../services/api";
import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationPayload,
  type ApplicationStatus,
  type ParsedJobDetails,
  type ResumeSuggestionRequest,
} from "../types/job-tracker";

const applicationsQueryKey = ["applications"] as const;
const themeStorageKey = "job-tracker-theme";
type DashboardTheme = "light" | "dark";

const activeReminderStatuses: ApplicationStatus[] = [
  "Applied",
  "Phone Screen",
  "Interview",
];

const isOverdueApplication = (application: Application) => {
  if (!activeReminderStatuses.includes(application.status)) {
    return false;
  }

  const referenceDate = new Date(application.updatedAt || application.dateApplied);
  const ageInDays =
    (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);

  return ageInDays >= 7;
};

const downloadCsv = (applications: Application[]) => {
  const headers = [
    "Company",
    "Role",
    "Status",
    "Date Applied",
    "Location",
    "Seniority",
    "Salary Range",
    "JD Link",
    "Required Skills",
    "Nice To Have Skills",
    "Notes",
  ];

  const escapeCsvValue = (value: string) => `"${value.replace(/"/g, "\"\"")}"`;
  const rows = applications.map((application) =>
    [
      application.company,
      application.role,
      application.status,
      application.dateApplied,
      application.location ?? "",
      application.seniority ?? "",
      application.salaryRange ?? "",
      application.jdLink ?? "",
      application.requiredSkills.join(", "),
      application.niceToHaveSkills.join(", "),
      application.notes ?? "",
    ]
      .map((value) => escapeCsvValue(value))
      .join(",")
  );

  const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "job-applications.csv";
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [activeApplication, setActiveApplication] = useState<Application | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedApplicationId, setDraggedApplicationId] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ApplicationStatus>("All");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [theme, setTheme] = useState<DashboardTheme>(() => {
    const savedTheme = localStorage.getItem(themeStorageKey);
    return savedTheme === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  const applicationsQuery = useQuery({
    queryKey: applicationsQueryKey,
    queryFn: applicationsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: applicationsApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: applicationsQueryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ApplicationPayload }) =>
      applicationsApi.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: applicationsQueryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: applicationsApi.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: applicationsQueryKey });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      applicationsApi.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: applicationsQueryKey });
      const previousApplications =
        queryClient.getQueryData<Application[]>(applicationsQueryKey) ?? [];

      queryClient.setQueryData<Application[]>(applicationsQueryKey, (current) =>
        current?.map((application) =>
          application._id === id ? { ...application, status } : application
        ) ?? []
      );

      return { previousApplications };
    },
    onError: (error, _variables, context) => {
      if (context?.previousApplications) {
        queryClient.setQueryData(applicationsQueryKey, context.previousApplications);
      }

      setBoardError(getErrorMessage(error, "The card could not be moved."));
    },
    onSuccess: () => {
      setBoardError(null);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: applicationsQueryKey });
    },
  });

  const applications = useMemo(
    () => applicationsQuery.data ?? [],
    [applicationsQuery.data]
  );
  const overdueApplications = useMemo(
    () => applications.filter(isOverdueApplication),
    [applications]
  );
  const overdueApplicationIds = useMemo(
    () => overdueApplications.map((application) => application._id),
    [overdueApplications]
  );
  const filteredApplications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesStatus =
        statusFilter === "All" ? true : application.status === statusFilter;
      const matchesOverdue = showOverdueOnly ? isOverdueApplication(application) : true;
      const matchesSearch = normalizedSearch
        ? [
            application.company,
            application.role,
            application.location ?? "",
            application.status,
            application.requiredSkills.join(" "),
            application.niceToHaveSkills.join(" "),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch)
        : true;

      return matchesStatus && matchesOverdue && matchesSearch;
    });
  }, [applications, searchTerm, showOverdueOnly, statusFilter]);
  const interviewsInPipeline = useMemo(
    () =>
      applications.filter((application) =>
        ["Phone Screen", "Interview"].includes(application.status)
      ).length,
    [applications]
  );
  const successRate = useMemo(() => {
    if (applications.length === 0) {
      return 0;
    }

    return Math.round((applications.filter((item) => item.status === "Offer").length / applications.length) * 100);
  }, [applications]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const openCreateModal = () => {
    setActiveApplication(null);
    setBoardError(null);
    setIsModalOpen(true);
  };

  const openDetailsModal = (application: Application) => {
    setActiveApplication(application);
    setBoardError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveApplication(null);
  };

  const handleSaveApplication = async (
    payload: ApplicationPayload,
    applicationId?: string
  ) => {
    setBoardError(null);

    if (applicationId) {
      await updateMutation.mutateAsync({ id: applicationId, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  const handleDeleteApplication = async (applicationId: string) => {
    setBoardError(null);
    await deleteMutation.mutateAsync(applicationId);
  };

  const handleDropApplication = async (status: ApplicationStatus) => {
    if (!draggedApplicationId) {
      return;
    }

    const draggedApplication = applications.find(
      (application) => application._id === draggedApplicationId
    );

    setDraggedApplicationId(null);

    if (!draggedApplication || draggedApplication.status === status) {
      return;
    }

    await statusMutation.mutateAsync({ id: draggedApplication._id, status });
  };

  const statusCount = (status: ApplicationStatus) =>
    applications.filter((application) => application.status === status).length;

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">AI Job Application Tracker</p>
          <h1 className="dashboard-title">Keep every role moving forward.</h1>
          <p className="dashboard-copy">
            Paste a job description, let AI prefill the details, and drag each
            application across your pipeline as interviews progress.
          </p>
        </div>

        <div className="dashboard-actions">
          <div className="welcome-chip">{user?.email}</div>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
          >
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => downloadCsv(filteredApplications)}
            disabled={filteredApplications.length === 0}
          >
            Export CSV
          </button>
          <button type="button" className="button button--ghost" onClick={handleLogout}>
            Log Out
          </button>
          <button type="button" className="button button--primary" onClick={openCreateModal}>
            Add Application
          </button>
        </div>
      </header>

      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">Total</span>
          <strong>{applications.length}</strong>
          <p>All tracked applications on your board.</p>
        </article>
        <article className="stat-card">
          <span className="stat-label">In Motion</span>
          <strong>{interviewsInPipeline}</strong>
          <p>Roles currently in conversations.</p>
        </article>
        <article className="stat-card">
          <span className="stat-label">Offers</span>
          <strong>{statusCount("Offer")}</strong>
          <p>Applications that made it to the final stage.</p>
        </article>
        <article className="stat-card">
          <span className="stat-label">Overdue</span>
          <strong>{overdueApplications.length}</strong>
          <p>Active roles that have been idle for 7+ days.</p>
        </article>
        <article className="stat-card">
          <span className="stat-label">Success Rate</span>
          <strong>{successRate}%</strong>
          <p>Offers as a share of tracked applications.</p>
        </article>
        <article className="stat-card">
          <span className="stat-label">Filtered View</span>
          <strong>{filteredApplications.length}</strong>
          <p>Applications currently visible after filters.</p>
        </article>
      </section>

      <section className="toolbar-card">
        <div className="toolbar-grid">
          <label className="field-group">
            <span>Search</span>
            <input
              className="input"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search company, role, skills, location..."
            />
          </label>

          <label className="field-group">
            <span>Status</span>
            <select
              className="input"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "All" | ApplicationStatus)
              }
            >
              <option value="All">All statuses</option>
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={showOverdueOnly}
              onChange={(event) => setShowOverdueOnly(event.target.checked)}
            />
            <span>Show only overdue follow-ups</span>
          </label>
        </div>

        {overdueApplications.length > 0 ? (
          <div className="reminder-strip">
            <span className="reminder-strip__label">Follow-up reminders</span>
            <div className="reminder-strip__list">
              {overdueApplications.slice(0, 4).map((application) => (
                <button
                  key={application._id}
                  type="button"
                  className="reminder-pill"
                  onClick={() => openDetailsModal(application)}
                >
                  {application.company} · {application.role}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {boardError ? <div className="notice notice--error">{boardError}</div> : null}
      {applicationsQuery.error ? (
        <div className="notice notice--error">
          {getErrorMessage(applicationsQuery.error, "Applications could not be loaded.")}
        </div>
      ) : null}

      {applicationsQuery.isLoading ? (
        <div className="empty-panel">Loading your application board...</div>
      ) : applications.length === 0 ? (
        <div className="empty-panel">
          <p className="eyebrow eyebrow--compact">Board Empty</p>
          <h2>Add your first application</h2>
          <p>
            Start with a pasted job description and the tracker will help fill the role details.
          </p>
          <button type="button" className="button button--primary" onClick={openCreateModal}>
            Add Application
          </button>
        </div>
      ) : (
        <div className="kanban-grid">
          {APPLICATION_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              applications={filteredApplications.filter((application) => application.status === status)}
              draggedApplicationId={draggedApplicationId}
              overdueApplicationIds={overdueApplicationIds}
              onOpen={openDetailsModal}
              onDragStart={setDraggedApplicationId}
              onDragEnd={() => setDraggedApplicationId(null)}
              onDropApplication={handleDropApplication}
            />
          ))}
        </div>
      )}

      <ApplicationModal
        isOpen={isModalOpen}
        application={activeApplication}
        isSaving={createMutation.isPending || updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        onClose={closeModal}
        onSave={handleSaveApplication}
        onDelete={handleDeleteApplication}
        parseJobDescription={async (jdText: string): Promise<ParsedJobDetails> =>
          aiApi.parseJobDescription(jdText)
        }
        generateResumeSuggestions={(
          payload: ResumeSuggestionRequest
        ): Promise<string[]> => aiApi.generateResumeSuggestions(payload)}
        streamResumeSuggestions={(
          payload: ResumeSuggestionRequest,
          onChunk: (chunk: string) => void
        ): Promise<string[]> => aiApi.generateResumeSuggestionsStream(payload, onChunk)}
      />
    </div>
  );
}
