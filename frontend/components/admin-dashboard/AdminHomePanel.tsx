import type { AdminOverview } from "../../lib/api";

type AdminHomePanelProps = {
  overview: AdminOverview;
  onNavigate?: (menu: "colleges" | "companies") => void;
};

export function AdminHomePanel({ overview, onNavigate }: AdminHomePanelProps) {
  const { admin, stats } = overview;
  const cards = [
    { label: "Students", value: stats.students },
    { label: "Colleges", value: stats.colleges ?? 0, menu: "colleges" as const },
    { label: "Companies", value: stats.companies, menu: "companies" as const },
    { label: "TPOs", value: stats.tpos },
    { label: "Jobs", value: stats.jobs },
    { label: "Applications", value: stats.applications },
    { label: "TPO postings", value: stats.tpoPostings },
    { label: "Student invites", value: stats.studentInvites },
    { label: "Assessments", value: stats.assessments },
    { label: "Psychometric tests", value: stats.psychometricAssessments ?? 0 },
    { label: "Psychometric assigned", value: stats.psychometricAssignments ?? 0 },
    { label: "Psychometric completed", value: stats.psychometricCompleted ?? 0 },
    { label: "Aptitude tests", value: stats.aptitudeAssessments ?? 0 },
    { label: "Aptitude assigned", value: stats.aptitudeAssignments ?? 0 },
    { label: "Aptitude completed", value: stats.aptitudeCompleted ?? 0 },
  ];

  return (
    <>
      <div className="tpo-panel">
        <h2 className="company-title" style={{ fontSize: "18px", margin: "0 0 8px" }}>
          Welcome, {admin.full_name || admin.email}
        </h2>
        <p className="company-subtitle" style={{ margin: 0 }}>
          Signed in as <strong>{admin.primaryRole}</strong>. Platform-wide metrics below.
        </p>
      </div>

      <div className="tpo-home-grid">
        {cards.map((card) => {
          const content = (
            <>
              <h3>{card.label}</h3>
              <p className="tpo-stat-value">{card.value}</p>
            </>
          );
          if ("menu" in card && card.menu && onNavigate) {
            return (
              <button
                type="button"
                className="tpo-stat-card"
                key={card.label}
                style={{ cursor: "pointer", border: "none", textAlign: "left", width: "100%" }}
                onClick={() => onNavigate(card.menu)}
              >
                {content}
              </button>
            );
          }
          return (
            <div className="tpo-stat-card" key={card.label}>
              {content}
            </div>
          );
        })}
      </div>

      <div className="tpo-panel">
        <h3 className="company-title" style={{ fontSize: "16px", margin: "0 0 10px" }}>
          Quick links
        </h3>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#5a6684", lineHeight: 1.7 }}>
          <li>
            <a href="http://172.29.250.163:8000/app" target="_blank" rel="noreferrer" className="auth-link">
              Open Frappe Desk (full backend)
            </a>
          </li>
          <li>
            <a href="/login" className="auth-link">
              Main portal login (Company / Student / TPO)
            </a>
          </li>
        </ul>
      </div>
    </>
  );
}
