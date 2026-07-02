import type { StudentMenuKey, StudentUser } from "./types";

type StudentSidebarProps = {
  student: StudentUser | null;
  activeMenu: StudentMenuKey;
  onMenuChange: (menu: StudentMenuKey) => void;
  onLogout: () => void;
  documentPendingCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
  isPro?: boolean;
  coinBalance?: number;
};

export function StudentSidebar({ student, activeMenu, onMenuChange, onLogout, documentPendingCount = 0, isOpen, onClose, isPro = false, coinBalance = 0 }: StudentSidebarProps) {
  return (
    <aside className={`company-sidebar${isOpen ? " sidebar--open" : ""}`}>
      {onClose && (
        <button type="button" className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
      <div className="company-brand">
        <div className="company-brand-logo">
          <span className="company-brand-mark">
            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" stroke="#6f9bff" strokeWidth="2" fill="none" />
              <circle cx="16" cy="16" r="5" fill="#6f9bff" />
              <circle cx="26" cy="9" r="2.6" fill="#ffffff" />
            </svg>
          </span>
          <span className="company-brand-name">Discove<b>HR</b></span>
        </div>
        <h2>Student Hub</h2>
        <p>{student?.full_name || "Student User"}</p>
        <div className="sidebar-pro-row">
          <span className={`sidebar-pro-badge${isPro ? " sidebar-pro-badge--pro" : " sidebar-pro-badge--normal"}`}>
            {isPro ? "⭐ Pro" : "Normal"}
          </span>
          <span className="sidebar-coin-count">{coinBalance} coins</span>
        </div>
      </div>
      <nav className="company-nav">
        <div className="company-nav-section" role="presentation">Dashboard</div>

        <button type="button" className={`company-nav-item ${activeMenu === "applications" ? "active" : ""}`} onClick={() => onMenuChange("applications")}>
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Applications
        </button>
        <button type="button" className={`company-nav-item ${activeMenu === "mock-interviews" ? "active" : ""}`} onClick={() => onMenuChange("mock-interviews")}>
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Mock interviews
        </button>
        <button type="button" className={`company-nav-item ${activeMenu === "tests-assessments" ? "active" : ""}`} onClick={() => onMenuChange("tests-assessments")}>
          <svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>
          Tests & assessments
        </button>

        <div className="company-nav-section" role="presentation">Jobs</div>

        <button type="button" className={`company-nav-item ${activeMenu === "all-jobs" ? "active" : ""}`} onClick={() => onMenuChange("all-jobs")}>
          <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          Open jobs board
        </button>
        <button type="button" className={`company-nav-item ${activeMenu === "suggested-jobs" ? "active" : ""}`} onClick={() => onMenuChange("suggested-jobs")}>
          <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Suggested jobs
        </button>
        <button type="button" className={`company-nav-item ${activeMenu === "lms" ? "active" : ""}`} onClick={() => onMenuChange("lms")}>
          <svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          LMS
        </button>
        <button type="button" className={`company-nav-item ${activeMenu === "pri-score" ? "active" : ""}`} onClick={() => onMenuChange("pri-score")}>
          <svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          PRI score
        </button>
        <button type="button" className={`company-nav-item ${activeMenu === "interviews-calendar" ? "active" : ""}`} onClick={() => onMenuChange("interviews-calendar")}>
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Calendars
        </button>
        <button type="button" className={`company-nav-item ${activeMenu === "messages" ? "active" : ""}`} onClick={() => onMenuChange("messages")}>
          <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Messages
        </button>
        <button type="button" className={`company-nav-item ${activeMenu === "documents" ? "active" : ""}`} onClick={() => onMenuChange("documents")} style={{ position: "relative" }}>
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          Documents
          {documentPendingCount > 0 && (
            <span className="sdoc-nav-badge">{documentPendingCount}</span>
          )}
        </button>
        <button type="button" className={`company-nav-item ${activeMenu === "profile" ? "active" : ""}`} onClick={() => onMenuChange("profile")}>
          <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profile
        </button>
        <button type="button" className={`company-nav-item ${activeMenu === "purchase-courses" ? "active" : ""}`} onClick={() => onMenuChange("purchase-courses")}>
          <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          Courses & account
        </button>
        <button type="button" className={`company-nav-item ${activeMenu === "wallet" ? "active" : ""}`} onClick={() => onMenuChange("wallet")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
          </svg>
          Wallet & Pro
          {!isPro && <span className="sidebar-upgrade-dot" />}
        </button>
      </nav>
      <button className="company-logout" onClick={onLogout} type="button">
        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.8">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign out
      </button>
    </aside>
  );
}
