import type { StudentApplicationStatus } from "../../lib/api";

type StudentApplicationsPanelProps = {
  applicationStatus: StudentApplicationStatus[];
};

function statusClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("hired") || s.includes("selected") || s.includes("offer")) return "sapp-status sapp-status--hired";
  if (s.includes("interview") || s.includes("scheduled")) return "sapp-status sapp-status--interview";
  if (s.includes("shortlist")) return "sapp-status sapp-status--shortlisted";
  if (s.includes("reject") || s.includes("decline")) return "sapp-status sapp-status--rejected";
  if (s.includes("applied") || s.includes("submit") || s.includes("pending")) return "sapp-status sapp-status--applied";
  return "sapp-status sapp-status--default";
}

function jobInitial(title: string): string {
  return (title || "J").trim().charAt(0).toUpperCase();
}

export function StudentApplicationsPanel({ applicationStatus }: StudentApplicationsPanelProps) {
  return (
    <section className="company-table-wrap">
      <div className="company-table-head">
        <h3>My Applications</h3>
        <span className="table-caption">
          {applicationStatus.length > 0
            ? `${applicationStatus.length} application${applicationStatus.length === 1 ? "" : "s"} tracked`
            : "Track applications you have submitted to open roles."}
        </span>
      </div>

      {applicationStatus.length === 0 ? (
        <div className="sp-empty">
          <div className="sp-empty-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <p>No applications yet</p>
          <span>Browse the jobs board and hit Apply to get started.</span>
        </div>
      ) : (
        <div className="sapp-list">
          {applicationStatus.map((item) => (
            <div key={item.applicationId} className="sapp-card">
              <div className="sapp-avatar">{jobInitial(item.jobTitle)}</div>
              <div className="sapp-body">
                <span className="sapp-job-title">{item.jobTitle}</span>
                {item.appliedOn ? (
                  <span className="sapp-date">Applied {item.appliedOn}</span>
                ) : null}
              </div>
              <span className={statusClass(item.status)}>{item.status}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
