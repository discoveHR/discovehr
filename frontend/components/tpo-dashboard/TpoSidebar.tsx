import { NAV_ITEMS } from "./constants";
import type { TpoDashboardState } from "./hooks/useTpoDashboard";

type Props = Pick<TpoDashboardState, "activeMenu" | "setActiveMenu" | "handleLogout"> & {
  isOpen?: boolean;
  onClose?: () => void;
};

export function TpoSidebar({ activeMenu, setActiveMenu, handleLogout, isOpen, onClose }: Props) {
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
        <span className="tpo-brand-suite">Placement Suite</span>
      </div>
      <div className="tpo-dashboard-nav-label">Menu</div>
      <nav className="tpo-dashboard-nav" aria-label="TPO sections">
        {NAV_ITEMS.map(({ key, label, Icon }) => (
          <button key={key} type="button" className={`tpo-nav-item ${activeMenu === key ? "active" : ""}`} onClick={() => { setActiveMenu(key); onClose?.(); }}>
            <Icon />
            {label}
          </button>
        ))}
      </nav>
      <button className="tpo-sidebar-logout" onClick={handleLogout} type="button">
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
