import type { TpoDashboardState } from "./hooks/useTpoDashboard";

type Props = Pick<
  TpoDashboardState,
  | "studentDirectoryCount"
  | "studentCountCapped"
  | "dashboardRollup"
  | "isRollupLoading"
  | "tpoProfile"
  | "activePostingsCount"
  | "pendingInvitesCount"
>;

type StatCardProps = {
  label: string;
  value: string | number;
  note: string;
  iconClass: string;
  icon: React.ReactNode;
};

function StatCard({ label, value, note, iconClass, icon }: StatCardProps) {
  return (
    <div className="tpo-stat-card">
      <div className={`tpo-stat-card-icon ${iconClass}`}>{icon}</div>
      <h3>{label}</h3>
      <p className="tpo-stat-value">{value}</p>
      <p className="tpo-stat-note">{note}</p>
    </div>
  );
}

const TIPS = [
  { dot: "#818cf8", title: "Placements", desc: "Manage company drives and send magic links to shortlisted students." },
  { dot: "#34d399", title: "Internal jobs", desc: "Publish college-only listings with batch and branch targeting." },
  { dot: "#f59e0b", title: "Students", desc: "Invite, search, export, and manage profile edit approvals." },
  { dot: "#60a5fa", title: "Applicants", desc: "Review stage-wise progress for each posting." },
  { dot: "#a78bfa", title: "Reports", desc: "Download placement data and filtered student lists." },
  { dot: "#f87171", title: "Admin", desc: "Bulk-upload students and configure platform settings." },
];

export function TpoHomePanel({
  studentDirectoryCount,
  studentCountCapped,
  dashboardRollup,
  isRollupLoading,
  tpoProfile,
  activePostingsCount,
  pendingInvitesCount,
}: Props) {
  const loading = isRollupLoading;
  const students = dashboardRollup?.studentCount ?? studentDirectoryCount;
  const applications = dashboardRollup?.applicationCount ?? 0;
  const trainingDone = dashboardRollup?.trainingAllCompletedCount ?? 0;
  const pendingInvites = dashboardRollup?.pendingInviteCount ?? pendingInvitesCount;

  return (
    <>
      <div className="tpo-home-grid">
        <StatCard
          label="Total students"
          value={loading ? "…" : students}
          note={studentCountCapped ? "Directory may be capped — export for the full list." : "Students in your college scope."}
          iconClass="tpo-stat-card-icon--blue"
          icon={<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          label="Applications"
          value={loading ? "…" : applications}
          note="Job applications submitted by your students."
          iconClass="tpo-stat-card-icon--green"
          icon={<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
        />
        <StatCard
          label="Training complete"
          value={loading ? "…" : trainingDone}
          note="Students who finished all assigned readiness assessments."
          iconClass="tpo-stat-card-icon--purple"
          icon={<svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>}
        />
        <StatCard
          label="College"
          value={tpoProfile.collegeName?.trim() || "—"}
          note="Set or update under College profile in the sidebar."
          iconClass="tpo-stat-card-icon--indigo"
          icon={<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6"/></svg>}
        />
        <StatCard
          label="Active drives"
          value={activePostingsCount}
          note="Company placement postings currently marked Active."
          iconClass="tpo-stat-card-icon--amber"
          icon={<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>}
        />
        <StatCard
          label="Pending invites"
          value={loading ? "…" : pendingInvites}
          note="Student email invites awaiting acceptance."
          iconClass="tpo-stat-card-icon--sky"
          icon={<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.38a2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}
        />
      </div>

      {/* Quick-reference panel */}
      <div className="tpo-welcome">
        <p className="tpo-welcome-title">Quick reference</p>
        <div className="tpo-welcome-grid">
          {TIPS.map((t) => (
            <div key={t.title} className="tpo-welcome-tip">
              <span className="tpo-welcome-tip-dot" style={{ background: t.dot }} />
              <span><strong>{t.title}</strong> — {t.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
