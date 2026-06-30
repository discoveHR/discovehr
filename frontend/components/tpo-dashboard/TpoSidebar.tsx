import type { TpoDashboardState } from "./hooks/useTpoDashboard";
import type { TpoMenuKey } from "./types";
import { initialsFromName } from "./utils";

type Props = Pick<TpoDashboardState, "activeMenu" | "setActiveMenu" | "handleLogout"> & {
  isOpen?: boolean;
  onClose?: () => void;
  displayName?: string;
  userEmail?: string;
};

type NavSection = {
  label: string;
  items: { key: TpoMenuKey; label: string; icon: React.ReactNode }[];
};

function IconHome() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function IconBuilding() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>;
}
function IconBriefcase() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
}
function IconEdit() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
function IconUsers() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function IconInbox() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>;
}
function IconKanban() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>;
}
function IconFileText() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}
function IconCalendar() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function IconZap() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
}
function IconHeart() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
}
function IconClipboard() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>;
}
function IconSettings() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { key: "home", label: "Dashboard", icon: <IconHome /> },
      { key: "college-profile", label: "College Profile", icon: <IconBuilding /> },
    ],
  },
  {
    label: "Placements",
    items: [
      { key: "placements", label: "Company Drives", icon: <IconBriefcase /> },
      { key: "internal-jobs", label: "Internal Jobs", icon: <IconEdit /> },
      { key: "applicants", label: "Applicants", icon: <IconClipboard /> },
      { key: "inbound-jobs", label: "Inbound Jobs", icon: <IconInbox /> },
      { key: "candidate-progress", label: "Candidate Pipeline", icon: <IconKanban /> },
    ],
  },
  {
    label: "Students",
    items: [
      { key: "students", label: "Students", icon: <IconUsers /> },
    ],
  },
  {
    label: "Tools",
    items: [
      { key: "reports", label: "Reports", icon: <IconFileText /> },
      { key: "calendars", label: "Calendars", icon: <IconCalendar /> },
      { key: "challenges", label: "Challenges", icon: <IconZap /> },
      { key: "aptitude", label: "Aptitude Tests", icon: <IconClipboard /> },
    ],
  },
  {
    label: "Community",
    items: [
      { key: "engagement", label: "Engagement", icon: <IconHeart /> },
    ],
  },
  {
    label: "System",
    items: [
      { key: "admin", label: "Admin Settings", icon: <IconSettings /> },
    ],
  },
];


export function TpoSidebar({ activeMenu, setActiveMenu, handleLogout, isOpen, onClose, displayName, userEmail }: Props) {
  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} aria-hidden />}
      <aside className={`tpo-dashboard-sidebar${isOpen ? " sidebar--open" : ""}`} aria-label="TPO navigation">
        {onClose && (
          <button type="button" className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}

        {/* Brand */}
        <div className="tpo-dashboard-brand">
          <div className="tpo-brand-logo">
            <span className="tpo-brand-mark">
              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" stroke="#6f9bff" strokeWidth="2" fill="none" />
                <circle cx="16" cy="16" r="5" fill="#6f9bff" />
                <circle cx="26" cy="9" r="2.6" fill="#ffffff" />
              </svg>
            </span>
            <span className="tpo-brand-name">Discove<b>HR</b></span>
          </div>
          <span className="tpo-brand-suite">Placement Suite</span>
        </div>

        {/* Navigation */}
        <nav className="tpo-dashboard-nav" aria-label="TPO sections">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="tpo-nav-section">
              <p className="tpo-nav-section-label">{section.label}</p>
              {section.items.map(({ key, label, icon }) => (
                <button
                  key={key}
                  type="button"
                  className={`tpo-nav-item${activeMenu === key ? " active" : ""}`}
                  onClick={() => { setActiveMenu(key); onClose?.(); }}
                  aria-current={activeMenu === key ? "page" : undefined}
                >
                  <span className="tpo-nav-icon">{icon}</span>
                  <span className="tpo-nav-label">{label}</span>
                  {activeMenu === key && <span className="tpo-nav-active-dot" aria-hidden />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Institution Dashboard link */}
        <div className="tpo-sidebar-inst-link-wrap">
          <a href="/institution/dashboard" className="tpo-sidebar-inst-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="14" height="14"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Institution Dashboard
          </a>
        </div>

        {/* User + Logout */}
        <div className="tpo-sidebar-footer">
          {displayName && (
            <div className="tpo-sidebar-user">
              <div className="tpo-sidebar-user-avatar">{initialsFromName(displayName)}</div>
              <div className="tpo-sidebar-user-info">
                <strong>{displayName}</strong>
                {userEmail && <span>{userEmail}</span>}
              </div>
            </div>
          )}
          <button className="tpo-sidebar-logout" onClick={handleLogout} type="button">
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
