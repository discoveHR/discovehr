type MenuKey = "company-jobs" | "district-applicants" | "interviews";

const NAV_ICONS: Record<MenuKey, React.ReactNode> = {
  "company-jobs": (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.8">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  ),
  "district-applicants": (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  "interviews": (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
};

const MENU_ITEMS: { key: MenuKey; label: string }[] = [
  { key: "company-jobs", label: "Company Jobs" },
  { key: "district-applicants", label: "District Applicants" },
  { key: "interviews", label: "Scheduled Interviews" },
];

type Props = {
  userName: string;
  companyName: string;
  district: string;
  state: string;
  activeMenu: MenuKey;
  onMenuChange: (key: MenuKey) => void;
  onLogout: () => void;
};

export function SubAdminSidebar({ userName, companyName, district, state, activeMenu, onMenuChange, onLogout }: Props) {
  return (
    <aside className="company-sidebar">
      <div className="company-brand">
        <div className="company-brand-logo">
          <span className="company-brand-mark">
            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="11" stroke="rgba(255,255,255,0.9)" strokeWidth="2" fill="none"/>
              <circle cx="16" cy="16" r="4" fill="#ffffff"/>
              <circle cx="24" cy="9" r="2" fill="rgba(255,255,255,0.55)"/>
            </svg>
          </span>
          <span className="company-brand-name">Discove<b>HR</b></span>
        </div>
        <h2>Sub Admin Portal</h2>
        <p className="sub-admin-sidebar-company">{companyName}</p>
        <p className="sub-admin-sidebar-user">{userName}</p>
        {district && (
          <p className="sub-admin-sidebar-district">
            {district}
            {state ? `, ${state}` : ""}
          </p>
        )}
      </div>
      <nav className="company-nav">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`company-nav-item ${activeMenu === item.key ? "active" : ""}`}
            onClick={() => onMenuChange(item.key)}
          >
            {NAV_ICONS[item.key]}
            {item.label}
          </button>
        ))}
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

export type { MenuKey as SubAdminMenuKey };
