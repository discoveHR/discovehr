import type { InstitutionOverview } from "../../lib/api/institution";
import type { InstitutionDashboardState } from "./types";

type Props = {
  overview: InstitutionOverview;
  setActiveMenu: InstitutionDashboardState["setActiveMenu"];
  setSelectedBatch: InstitutionDashboardState["setSelectedBatch"];
};

export function InstitutionOverviewPanel({ overview, setActiveMenu, setSelectedBatch }: Props) {
  const { college, batches, branches, totalStudents, tpos } = overview;

  return (
    <div className="inst-overview-panel">
      {/* College info card */}
      <div className="inst-college-card">
        <div className="inst-college-card-header">
          <div className="inst-college-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="24" height="24">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <h3 className="inst-college-card-name">{college.collegeName || "—"}</h3>
            <p className="inst-college-card-loc">
              {[college.collegeLocation, college.district, college.state, college.country]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        </div>
        <div className="inst-college-card-links">
          {college.websiteLink && (
            <a
              href={college.websiteLink.startsWith("http") ? college.websiteLink : `https://${college.websiteLink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inst-college-link"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              Website
            </a>
          )}
          {college.linkedinUrl && (
            <a
              href={college.linkedinUrl.startsWith("http") ? college.linkedinUrl : `https://${college.linkedinUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inst-college-link"
            >
              LinkedIn
            </a>
          )}
          {college.address && (
            <span className="inst-college-address">{college.address}{college.pincode ? ` – ${college.pincode}` : ""}</span>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="inst-overview-stats">
        <div className="inst-overview-stat-card" onClick={() => setActiveMenu("students")}>
          <span className="inst-overview-stat-value">{totalStudents}</span>
          <span className="inst-overview-stat-label">Total Students</span>
        </div>
        <div className="inst-overview-stat-card" onClick={() => setActiveMenu("students")}>
          <span className="inst-overview-stat-value">{batches.length}</span>
          <span className="inst-overview-stat-label">Batches</span>
        </div>
        <div className="inst-overview-stat-card">
          <span className="inst-overview-stat-value">{branches.length}</span>
          <span className="inst-overview-stat-label">Branches</span>
        </div>
        <div className="inst-overview-stat-card">
          <span className="inst-overview-stat-value">{tpos.length}</span>
          <span className="inst-overview-stat-label">TPO Officers</span>
        </div>
      </div>

      {/* Batch breakdown */}
      {batches.length > 0 && (
        <div className="inst-overview-section">
          <h3 className="inst-overview-section-title">Batch Breakdown</h3>
          <div className="inst-batch-grid">
            {batches.map((b) => (
              <button
                key={b.batch}
                type="button"
                className="inst-batch-cell"
                onClick={() => { setSelectedBatch(b.batch); setActiveMenu("students"); }}
              >
                <span className="inst-batch-cell-year">{b.batch}</span>
                <span className="inst-batch-cell-count">{b.studentCount} student{b.studentCount !== 1 ? "s" : ""}</span>
                <span className="inst-batch-cell-arrow">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Branch breakdown */}
      {branches.length > 0 && (
        <div className="inst-overview-section">
          <h3 className="inst-overview-section-title">Branch Breakdown</h3>
          <div className="inst-branch-list">
            {branches.map((b) => (
              <div key={b.branch} className="inst-branch-row">
                <span className="inst-branch-name">{b.branch}</span>
                <div className="inst-branch-bar-wrap">
                  <div
                    className="inst-branch-bar"
                    style={{
                      width: `${Math.round((b.studentCount / Math.max(1, totalStudents)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="inst-branch-count">{b.studentCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
