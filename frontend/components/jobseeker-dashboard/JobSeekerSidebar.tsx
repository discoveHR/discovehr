import type { JsMenuKey, JobSeekerDashboardState } from "./types";

type Props = Pick<JobSeekerDashboardState, "activeMenu" | "setActiveMenu" | "handleLogout" | "displayName" | "user"> & {
  isOpen?: boolean;
  onClose?: () => void;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

type NavItem = { key: JsMenuKey; label: string; icon: React.ReactNode; badge?: number };

const NAV_ITEMS: NavItem[] = [
  {
    key: "home",
    label: "Dashboard",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="16" height="16"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  },
  {
    key: "profile",
    label: "My Profile",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
  {
    key: "resume",
    label: "Resume",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  },
  {
    key: "jobs",
    label: "Jobs",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="16" height="16"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  },
  {
    key: "applied",
    label: "Applied Jobs",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="16" height="16"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  },
  {
    key: "saved",
    label: "Saved Jobs",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="16" height="16"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    key: "recommended",
    label: "Recommended Jobs",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="16" height="16"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  },
  {
    key: "interviews",
    label: "Interview Schedule",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    key: "notifications",
    label: "Notifications",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="16" height="16"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  },
  {
    key: "settings",
    label: "Settings",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
];

export function JobSeekerSidebar({ activeMenu, setActiveMenu, handleLogout, displayName, user, isOpen, onClose }: Props) {
  return (
    <>
      {isOpen && <div className="js-sidebar-backdrop" onClick={onClose} aria-hidden />}
      <aside className={`js-sidebar${isOpen ? " js-sidebar--open" : ""}`} aria-label="Job Seeker navigation">
        {onClose && (
          <button type="button" className="js-sidebar-close" onClick={onClose} aria-label="Close menu">✕</button>
        )}

        {/* Brand */}
        <div className="js-sidebar-brand">
          <div className="js-brand-logo">
            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
              <circle cx="16" cy="16" r="14" stroke="#818cf8" strokeWidth="2" fill="none" />
              <circle cx="16" cy="16" r="5" fill="#818cf8" />
              <circle cx="26" cy="9" r="2.6" fill="#ffffff" />
            </svg>
            <span className="js-brand-name">Discove<b>HR</b></span>
          </div>
          <span className="js-brand-suite">Job Seeker</span>
        </div>

        {/* Nav */}
        <nav className="js-sidebar-nav" aria-label="Job Seeker sections">
          {NAV_ITEMS.map(({ key, label, icon, badge }) => (
            <button
              key={key}
              type="button"
              className={`js-nav-item${activeMenu === key ? " active" : ""}`}
              onClick={() => { setActiveMenu(key); onClose?.(); }}
              aria-current={activeMenu === key ? "page" : undefined}
            >
              {icon}
              {label}
              {badge !== undefined && badge > 0 && (
                <span className="js-nav-badge">{badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="js-sidebar-footer">
          <div className="js-sidebar-user">
            <div className="js-user-avatar">{initials(displayName || user?.email || "U")}</div>
            <div className="js-user-meta">
              <span className="js-user-name">{displayName || user?.email || "Job Seeker"}</span>
              <span className="js-user-role">Job Seeker</span>
            </div>
          </div>
          <button type="button" className="js-logout-btn" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
