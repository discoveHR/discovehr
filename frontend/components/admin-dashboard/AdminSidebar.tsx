type AdminMenuKey =
  | "overview"
  | "colleges"
  | "companies"
  | "freelancer-approvals"
  | "tpo-approvals"
  | "psychometric"
  | "aptitude"
  | "referrals";

const ADMIN_ICONS: Record<AdminMenuKey, React.ReactNode> = {
  overview: (
    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  colleges: (
    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.8">
      <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6"/>
    </svg>
  ),
  companies: (
    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.8">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  ),
  "freelancer-approvals": (
    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.8">
      <path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>
    </svg>
  ),
  "tpo-approvals": (
    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  psychometric: (
    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.8">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  aptitude: (
    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  referrals: (
    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="19" y1="8" x2="19" y2="14"/>
      <line x1="22" y1="11" x2="16" y2="11"/>
    </svg>
  ),
};

type AdminSidebarProps = {
  activeMenu: AdminMenuKey;
  onMenuChange: (menu: AdminMenuKey) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
};

export function AdminSidebar({ activeMenu, onMenuChange, onLogout, isOpen, onClose }: AdminSidebarProps) {
  return (
    <aside className={`tpo-dashboard-sidebar${isOpen ? " sidebar--open" : ""}`}>
      {onClose && (
        <button type="button" className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
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
        <span className="tpo-brand-suite">Admin Console</span>
      </div>
      <div className="tpo-dashboard-nav-label">Menu</div>
      <nav className="tpo-dashboard-nav" aria-label="Admin sections">
        <button type="button" className={`tpo-nav-item ${activeMenu === "overview" ? "active" : ""}`} onClick={() => { onMenuChange("overview"); onClose?.(); }}>
          {ADMIN_ICONS.overview} Overview
        </button>
        <button type="button" className={`tpo-nav-item ${activeMenu === "colleges" ? "active" : ""}`} onClick={() => { onMenuChange("colleges"); onClose?.(); }}>
          {ADMIN_ICONS.colleges} Colleges & TPOs
        </button>
        <button type="button" className={`tpo-nav-item ${activeMenu === "companies" ? "active" : ""}`} onClick={() => { onMenuChange("companies"); onClose?.(); }}>
          {ADMIN_ICONS.companies} Companies
        </button>
        <button
          type="button"
          className={`tpo-nav-item ${activeMenu === "freelancer-approvals" ? "active" : ""}`}
          onClick={() => { onMenuChange("freelancer-approvals"); onClose?.(); }}
        >
          {ADMIN_ICONS["freelancer-approvals"]} Freelancer approvals
        </button>
        {/* RELEASE: re-enable TPO admin approvals menu
        <button type="button" className={`tpo-nav-item ${activeMenu === "tpo-approvals" ? "active" : ""}`} onClick={() => onMenuChange("tpo-approvals")}>
          {ADMIN_ICONS["tpo-approvals"]} TPO approvals
        </button>
        */}
        <button type="button" className={`tpo-nav-item ${activeMenu === "psychometric" ? "active" : ""}`} onClick={() => { onMenuChange("psychometric"); onClose?.(); }}>
          {ADMIN_ICONS.psychometric} Psychometric tests
        </button>
        <button type="button" className={`tpo-nav-item ${activeMenu === "aptitude" ? "active" : ""}`} onClick={() => { onMenuChange("aptitude"); onClose?.(); }}>
          {ADMIN_ICONS.aptitude} Aptitude tests
        </button>
        <button type="button" className={`tpo-nav-item ${activeMenu === "referrals" ? "active" : ""}`} onClick={() => { onMenuChange("referrals"); onClose?.(); }}>
          {ADMIN_ICONS.referrals} Candidate referrals
        </button>
      </nav>
      <button className="tpo-sidebar-logout" onClick={onLogout} type="button">
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
