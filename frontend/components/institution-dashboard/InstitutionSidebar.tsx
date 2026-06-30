import type { InstitutionDashboardState } from "./types";
import type { InstitutionTpo } from "../../lib/api/institution";

type Props = Pick<InstitutionDashboardState,
  | "overview"
  | "activeMenu"
  | "setActiveMenu"
  | "handleLogout"
  | "displayName"
  | "userEmail"
> & {
  isOpen?: boolean;
  onClose?: () => void;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function TpoCard({ tpo }: { tpo: InstitutionTpo }) {
  return (
    <div className={`inst-tpo-card${tpo.isCurrent ? " inst-tpo-card--current" : ""}`}>
      <div className="inst-tpo-avatar">{initials(tpo.tpoName || tpo.email || "T")}</div>
      <div className="inst-tpo-info">
        <span className="inst-tpo-name">{tpo.tpoName || "—"}</span>
        <span className="inst-tpo-email">{tpo.email}</span>
        {tpo.isCurrent && <span className="inst-tpo-badge">You</span>}
      </div>
    </div>
  );
}

export function InstitutionSidebar({
  overview,
  activeMenu,
  setActiveMenu,
  handleLogout,
  displayName,
  userEmail,
  isOpen,
  onClose,
}: Props) {
  const college = overview?.college;
  const tpos = overview?.tpos ?? [];
  const stats = overview
    ? [
        { label: "Total Students", value: overview.totalStudents },
        { label: "Batches", value: overview.batches.length },
        { label: "Branches", value: overview.branches.length },
      ]
    : [];

  return (
    <>
      {isOpen && <div className="inst-sidebar-backdrop" onClick={onClose} aria-hidden />}
      <aside className={`inst-sidebar${isOpen ? " inst-sidebar--open" : ""}`}>
        {/* Header */}
        <div className="inst-sidebar-header">
          <div className="inst-college-avatar">{initials(college?.collegeName || displayName || "I")}</div>
          <div className="inst-college-meta">
            <h2 className="inst-college-name">{college?.collegeName || "Institution"}</h2>
            {college?.collegeLocation && (
              <p className="inst-college-location">
                {college.collegeLocation}
                {college.state ? `, ${college.state}` : ""}
              </p>
            )}
            {college?.websiteLink && (
              <a
                href={college.websiteLink.startsWith("http") ? college.websiteLink : `https://${college.websiteLink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inst-college-website"
              >
                {college.websiteLink.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
          {onClose && (
            <button type="button" className="inst-sidebar-close" onClick={onClose} aria-label="Close sidebar">
              ✕
            </button>
          )}
        </div>

        {/* Quick stats */}
        {stats.length > 0 && (
          <div className="inst-sidebar-stats">
            {stats.map((s) => (
              <div key={s.label} className="inst-stat-chip">
                <span className="inst-stat-value">{s.value}</span>
                <span className="inst-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <nav className="inst-sidebar-nav">
          <button
            type="button"
            className={`inst-nav-item${activeMenu === "overview" ? " inst-nav-item--active" : ""}`}
            onClick={() => { setActiveMenu("overview"); onClose?.(); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="16" height="16"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Overview
          </button>
          <button
            type="button"
            className={`inst-nav-item${activeMenu === "students" ? " inst-nav-item--active" : ""}`}
            onClick={() => { setActiveMenu("students"); onClose?.(); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Students by Batch
          </button>
        </nav>

        {/* TPO list */}
        <div className="inst-sidebar-tpos">
          <h3 className="inst-sidebar-section-title">TPO Officers</h3>
          {tpos.length === 0 ? (
            <p className="inst-sidebar-empty">No TPO profiles found.</p>
          ) : (
            tpos.map((t) => <TpoCard key={t.tpoUser} tpo={t} />)
          )}
        </div>

        {/* Footer */}
        <div className="inst-sidebar-footer">
          <div className="inst-sidebar-user">
            <div className="inst-sidebar-user-avatar">{initials(displayName || userEmail || "U")}</div>
            <div className="inst-sidebar-user-meta">
              <span className="inst-sidebar-user-name">{displayName || "—"}</span>
              <span className="inst-sidebar-user-email">{userEmail}</span>
            </div>
          </div>
          <button type="button" className="inst-logout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
