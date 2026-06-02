import type { JobItem } from "../../../lib/api";

type Props = {
  jobs: JobItem[];
  userName: string;
  onPostJob: () => void;
  onViewApplicants: (job?: JobItem) => void;
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDate() {
  return new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

function formatRelative(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return iso; }
}

export function DashboardPanel({ jobs, userName, onPostJob, onViewApplicants }: Props) {
  const activeJobs = jobs.filter((j) => j.status === "Active");
  const readyToHire = activeJobs.filter((j) => j.applications > 0).length;
  const activeListings = activeJobs.length;
  const totalViews = jobs.reduce((sum, j) => sum + j.totalViews, 0);
  const newApplicants = jobs.reduce((sum, j) => sum + j.applications, 0);
  const firstName = userName.split(" ")[0] || "there";

  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const topJobs = [...jobs].sort((a, b) => b.applications - a.applications).slice(0, 3);

  return (
    <div className="dash-panel">

      {/* Hero greeting */}
      <div className="dash-hero">
        <div className="dash-hero-left">
          <div className="dash-hero-avatar">{initials(userName)}</div>
          <div className="dash-hero-text">
            <p className="dash-hero-greeting">{getGreeting()},</p>
            <h2 className="dash-hero-name">{firstName}</h2>
            <p className="dash-hero-date">{getDate()}</p>
          </div>
        </div>
        <div className="dash-hero-actions">
          <button type="button" className="dash-hero-btn-secondary" onClick={() => onViewApplicants()}>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            View Applicants
          </button>
          <button type="button" className="dash-hero-btn-primary" onClick={onPostJob}>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Post a Job
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="dash-stats-grid">
        <article className="dash-stat-card dash-stat-blue">
          <div className="dash-stat-top">
            <div className="dash-stat-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="1.8">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <span className="dash-stat-badge dash-stat-badge-blue">Hiring</span>
          </div>
          <strong className="dash-stat-value">{readyToHire}</strong>
          <span className="dash-stat-label">Ready to Hire</span>
          <span className="dash-stat-hint">Active jobs with applicants</span>
        </article>

        <article className="dash-stat-card dash-stat-green">
          <div className="dash-stat-top">
            <div className="dash-stat-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="1.8">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
            </div>
            <span className="dash-stat-badge dash-stat-badge-green">Live</span>
          </div>
          <strong className="dash-stat-value">{activeListings}</strong>
          <span className="dash-stat-label">Active Listings</span>
          <span className="dash-stat-hint">Currently published jobs</span>
        </article>

        <article className="dash-stat-card dash-stat-amber">
          <div className="dash-stat-top">
            <div className="dash-stat-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="1.8">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
          </div>
          <strong className="dash-stat-value">{totalViews.toLocaleString()}</strong>
          <span className="dash-stat-label">Total Views</span>
          <span className="dash-stat-hint">Across all job listings</span>
        </article>

        <article className="dash-stat-card dash-stat-purple">
          <div className="dash-stat-top">
            <div className="dash-stat-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="1.8">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
          </div>
          <strong className="dash-stat-value">{newApplicants}</strong>
          <span className="dash-stat-label">New Applicants</span>
          <span className="dash-stat-hint">Total applications received</span>
        </article>
      </div>

      {jobs.length > 0 && (
        <div className="dash-bottom-grid">
          {/* Recent jobs */}
          <div className="dash-card">
            <div className="dash-card-head">
              <div>
                <h3 className="dash-card-title">Recent Listings</h3>
                <p className="dash-card-sub">{jobs.length} job{jobs.length !== 1 ? "s" : ""} posted</p>
              </div>
            </div>
            <div className="dash-jobs-list">
              {recentJobs.map((job) => (
                <div key={job.id} className="dash-job-item">
                  <div className="dash-job-icon-wrap">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="1.8">
                      <rect x="2" y="7" width="20" height="14" rx="2"/>
                      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                    </svg>
                  </div>
                  <div className="dash-job-item-info">
                    <span className="dash-job-item-title">{job.title}</span>
                    <span className="dash-job-item-meta">{job.opportunityType} · {formatRelative(job.createdAt)}</span>
                  </div>
                  <div className="dash-job-item-right">
                    <span className={`dash-job-pill ${job.status === "Active" ? "pill-active" : job.status === "Draft" ? "pill-draft" : "pill-closed"}`}>
                      {job.status}
                    </span>
                    {job.applications > 0 && (
                      <button type="button" className="dash-job-item-btn" onClick={() => onViewApplicants(job)}>
                        {job.applications} apps
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="dash-right-col">
            {/* Top positions */}
            {topJobs.length > 0 && topJobs[0].applications > 0 && (
              <div className="dash-card dash-card-top-jobs">
                <div className="dash-card-head">
                  <div>
                    <h3 className="dash-card-title">Top Positions</h3>
                    <p className="dash-card-sub">By applications</p>
                  </div>
                </div>
                <div className="dash-top-jobs">
                  {topJobs.filter((j) => j.applications > 0).map((job, i) => (
                    <div key={job.id} className="dash-top-job-row">
                      <span className="dash-top-job-rank">{i + 1}</span>
                      <div className="dash-top-job-info">
                        <span className="dash-top-job-name">{job.title}</span>
                        <div className="dash-top-job-bar-wrap">
                          <div
                            className="dash-top-job-bar"
                            style={{ width: `${Math.min(100, (job.applications / Math.max(...topJobs.map((j) => j.applications))) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="dash-top-job-count">{job.applications}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="dash-card dash-quick-actions">
              <h3 className="dash-card-title">Quick Actions</h3>
              <div className="dash-actions-list">
                <button type="button" className="dash-action-item" onClick={onPostJob}>
                  <span className="dash-action-icon dash-action-icon-blue">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </span>
                  <div className="dash-action-text">
                    <span className="dash-action-name">Post a new job</span>
                    <span className="dash-action-hint">Free · published instantly</span>
                  </div>
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" className="dash-action-arrow">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
                <button type="button" className="dash-action-item" onClick={() => onViewApplicants()}>
                  <span className="dash-action-icon dash-action-icon-purple">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    </svg>
                  </span>
                  <div className="dash-action-text">
                    <span className="dash-action-name">Review applicants</span>
                    <span className="dash-action-hint">{newApplicants} pending review</span>
                  </div>
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" className="dash-action-arrow">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {jobs.length === 0 && (
        <div className="dash-empty">
          <div className="dash-empty-icon">
            <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" fill="none" strokeWidth="1.3">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
            </svg>
          </div>
          <p className="dash-empty-title">No jobs posted yet</p>
          <p className="dash-empty-sub">Post your first job to start receiving applications from students.</p>
          <button type="button" className="dash-hero-btn-primary" style={{ marginTop: "0.5rem" }} onClick={onPostJob}>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Post a Job — It&apos;s Free
          </button>
        </div>
      )}
    </div>
  );
}

