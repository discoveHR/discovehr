import type { MenuKey } from "../types";

const NAV_ICONS: Record<MenuKey, React.ReactNode> = {
  "dashboard": (
    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  ),
  "post-job": (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
  ),
  "job-listings": (
    <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
  ),
  "job-journey": (
    <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  ),
  "view-applicants": (
    <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  "interview-scheduler": (
    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  ),
  "freelancer-interviewers": (
    <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
  ),
  "credit-purchase": (
    <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
  ),
  "assessments": (
    <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  ),
  "sub-admins": (
    <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
  ),
};

const NAV_SECTIONS: { label: string; items: MenuKey[] }[] = [
  { label: "Overview", items: ["dashboard"] },
  { label: "Jobs", items: ["post-job", "job-listings", "job-journey"] },
  { label: "Talent", items: ["view-applicants", "interview-scheduler", "freelancer-interviewers"] },
  { label: "Tools", items: ["assessments", "credit-purchase", "sub-admins"] },
];

const SUB_ADMIN_VISIBLE: MenuKey[] = ["dashboard", "job-listings", "view-applicants"];

type SidebarProps = {
  userName: string;
  activeMenu: MenuKey;
  onMenuChange: (key: MenuKey) => void;
  onLogout: () => void;
  menuItems: { key: MenuKey; label: string }[];
  isSubAdmin?: boolean;
  assignedDistrict?: string;
  isOpen?: boolean;
  onClose?: () => void;
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

export function Sidebar({ userName, activeMenu, onMenuChange, onLogout, menuItems, isSubAdmin, assignedDistrict, isOpen, onClose }: SidebarProps) {
  const itemMap = Object.fromEntries(menuItems.map((m) => [m.key, m.label])) as Record<MenuKey, string>;

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((key) => {
      if (!itemMap[key]) return false;
      if (isSubAdmin) return SUB_ADMIN_VISIBLE.includes(key);
      return true;
    }),
  })).filter((s) => s.items.length > 0);

  return (
    <aside className={`company-sidebar${isOpen ? " sidebar--open" : ""}`}>
      {onClose && (
        <button type="button" className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
      {/* Brand */}
      <div className="company-brand">
        <div className="company-brand-logo">
          <span className="company-brand-mark">
            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="11" stroke="rgba(255,255,255,0.9)" strokeWidth="2" fill="none" />
              <circle cx="16" cy="16" r="4" fill="#ffffff" />
              <circle cx="24" cy="9" r="2" fill="rgba(255,255,255,0.55)" />
            </svg>
          </span>
          <span className="company-brand-name">Discove<b>HR</b></span>
        </div>
        <h2>{isSubAdmin ? "Sub Admin" : "Company Portal"}</h2>
      </div>

      {/* Nav sections */}
      <nav className="company-nav">
        {visibleSections.map((section) => (
          <div key={section.label} className="company-nav-group">
            <span className="company-nav-section">{section.label}</span>
            {section.items.map((key) => (
              <button
                key={key}
                type="button"
                className={`company-nav-item ${activeMenu === key ? "active" : ""}`}
                onClick={() => onMenuChange(key)}
              >
                {NAV_ICONS[key]}
                <span>{itemMap[key]}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="company-sidebar-footer">
        <div className="company-sidebar-user">
          <div className="company-sidebar-avatar">{initials(userName)}</div>
          <div className="company-sidebar-user-info">
            <span className="company-sidebar-user-name">{userName}</span>
            {isSubAdmin && assignedDistrict && (
              <span className="company-sidebar-user-role">{assignedDistrict}</span>
            )}
            {!isSubAdmin && (
              <span className="company-sidebar-user-role">Company Admin</span>
            )}
          </div>
        </div>
        <button className="company-logout" onClick={onLogout} type="button" aria-label="Sign out">
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.8">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}

