import type { TpoDashboardState } from "./hooks/useTpoDashboard";
import type { TpoMenuKey } from "./types";

type Props = Pick<
  TpoDashboardState,
  | "studentDirectoryCount"
  | "studentCountCapped"
  | "dashboardRollup"
  | "isRollupLoading"
  | "tpoProfile"
  | "activePostingsCount"
  | "pendingInvitesCount"
  | "setActiveMenu"
>;

type StatCardProps = {
  label: string;
  value: string | number;
  note: string;
  accent: string;
  icon: React.ReactNode;
  trend?: { value: string; positive?: boolean };
};

function StatCard({ label, value, note, accent, icon, trend }: StatCardProps) {
  return (
    <div className="tpo-stat-card" style={{ "--card-accent": accent } as React.CSSProperties}>
      <div className="tpo-stat-card-top">
        <div className="tpo-stat-card-icon-wrap">{icon}</div>
        {trend && (
          <span className={`tpo-stat-trend ${trend.positive === false ? "tpo-stat-trend--down" : "tpo-stat-trend--up"}`}>
            {trend.positive === false ? "↓" : "↑"} {trend.value}
          </span>
        )}
      </div>
      <p className="tpo-stat-value">{value}</p>
      <p className="tpo-stat-label">{label}</p>
      <p className="tpo-stat-note">{note}</p>
    </div>
  );
}

const QUICK_ACTIONS = [
  {
    key: "placements",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
    label: "Post a Drive",
    desc: "Add a new company placement drive",
    color: "#3b82f6",
    bg: "#eff6ff",
  },
  {
    key: "students",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    label: "Manage Students",
    desc: "Invite, search, or bulk upload students",
    color: "#16a34a",
    bg: "#f0fdf4",
  },
  {
    key: "reports",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    label: "View Reports",
    desc: "Placement and training analytics",
    color: "#9333ea",
    bg: "#faf5ff",
  },
  {
    key: "candidate-progress",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>,
    label: "Pipeline View",
    desc: "Track candidate stage-by-stage",
    color: "#d97706",
    bg: "#fffbeb",
  },
];

export function TpoHomePanel({
  studentDirectoryCount,
  studentCountCapped,
  dashboardRollup,
  isRollupLoading,
  tpoProfile,
  activePostingsCount,
  pendingInvitesCount,
  setActiveMenu,
}: Props) {
  const loading = isRollupLoading;
  const students = dashboardRollup?.studentCount ?? studentDirectoryCount;
  const applications = dashboardRollup?.applicationCount ?? 0;
  const trainingDone = dashboardRollup?.trainingAllCompletedCount ?? 0;
  const pendingInvites = dashboardRollup?.pendingInviteCount ?? pendingInvitesCount;

  return (
    <div className="tpo-home-wrap">
      {/* Greeting banner */}
      <div className="tpo-home-banner">
        <div className="tpo-home-banner-left">
          <p className="tpo-home-greeting">Welcome back</p>
          <h2 className="tpo-home-college">
            {tpoProfile.collegeName?.trim() || "Your College"}
          </h2>
          <p className="tpo-home-sub">
            {tpoProfile.collegeLocation ? `${tpoProfile.collegeLocation} · ` : ""}
            {tpoProfile.state ? `${tpoProfile.state}, ` : ""}
            {tpoProfile.country || "India"} · Training &amp; Placement Unit
          </p>
        </div>
        <div className="tpo-home-banner-icon" aria-hidden>
          <svg viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="38" stroke="#6f9bff" strokeWidth="1.5" opacity="0.3"/>
            <circle cx="40" cy="40" r="26" stroke="#6f9bff" strokeWidth="1.5" opacity="0.2"/>
            <circle cx="40" cy="40" r="12" fill="#6f9bff" opacity="0.15"/>
            <circle cx="40" cy="40" r="6" fill="#6f9bff" opacity="0.4"/>
            <circle cx="62" cy="22" r="5" fill="#fff" opacity="0.6"/>
          </svg>
        </div>
      </div>

      {/* Stat cards */}
      <div className="tpo-home-grid">
        <StatCard
          label="Total Students"
          value={loading ? "—" : students}
          note={studentCountCapped ? "Export for full list" : "In your college scope"}
          accent="#3b82f6"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          label="Applications"
          value={loading ? "—" : applications}
          note="Job applications submitted"
          accent="#16a34a"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
        />
        <StatCard
          label="Training Complete"
          value={loading ? "—" : trainingDone}
          note="Finished all readiness assessments"
          accent="#9333ea"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>}
        />
        <StatCard
          label="Active Drives"
          value={activePostingsCount}
          note="Company postings live now"
          accent="#d97706"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>}
        />
        <StatCard
          label="Pending Invites"
          value={loading ? "—" : pendingInvites}
          note="Awaiting student acceptance"
          accent="#0891b2"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.38a2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}
        />
        <StatCard
          label="College"
          value={tpoProfile.collegeName?.trim() || "—"}
          note="Update under College Profile"
          accent="#6366f1"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6"/></svg>}
        />
      </div>

      {/* Quick actions */}
      <div className="tpo-home-section">
        <h3 className="tpo-home-section-title">Quick Actions</h3>
        <div className="tpo-quick-actions">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.key}
              type="button"
              className="tpo-quick-action-card"
              style={{ "--qa-color": a.color, "--qa-bg": a.bg } as React.CSSProperties}
              onClick={() => setActiveMenu(a.key as TpoMenuKey)}
            >
              <div className="tpo-qa-icon">{a.icon}</div>
              <div>
                <p className="tpo-qa-label">{a.label}</p>
                <p className="tpo-qa-desc">{a.desc}</p>
              </div>
              <svg className="tpo-qa-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}
        </div>
      </div>

      {/* Module guide */}
      <div className="tpo-home-section">
        <h3 className="tpo-home-section-title">Module Guide</h3>
        <div className="tpo-module-guide">
          {[
            { color: "#3b82f6", title: "Placements", desc: "Manage company drives and send magic links to shortlisted students." },
            { color: "#16a34a", title: "Internal Jobs", desc: "Publish college-only listings with batch and branch targeting." },
            { color: "#d97706", title: "Students", desc: "Invite, search, bulk-upload and manage profile edit approvals." },
            { color: "#9333ea", title: "Applicants", desc: "Review stage-wise progress for each posting." },
            { color: "#0891b2", title: "Reports", desc: "Download placement data and filtered student lists." },
            { color: "#6366f1", title: "Admin", desc: "Platform settings and account configuration." },
          ].map((m) => (
            <div key={m.title} className="tpo-module-item">
              <span className="tpo-module-dot" style={{ background: m.color }} />
              <div>
                <strong>{m.title}</strong>
                <p>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
