"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type AuthHeaderProps = {
  title: string;
  subtitle: string;
  userName: string;
  roleLabel: string;
  userEmail: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  notificationCount?: number;
  notificationItems?: string[];
  extraActions?: ReactNode;
  onSidebarToggle?: () => void;
};

export function AuthHeader({
  title,
  subtitle,
  userName,
  roleLabel,
  userEmail,
  theme,
  onToggleTheme,
  notificationCount = 0,
  notificationItems = [],
  extraActions,
  onSidebarToggle,
}: AuthHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const items =
    notificationItems.length > 0
      ? notificationItems
      : ["New update available in your dashboard.", "Your recent activity has been synced."];

  return (
    <header className="auth-header">
      <div className="auth-header-left">
        {onSidebarToggle && (
          <button type="button" className="sidebar-hamburger" onClick={onSidebarToggle} aria-label="Open navigation menu">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        )}
        <div className="auth-brand">
          <div className="auth-brand-logo" aria-hidden="true">
            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
              <circle cx="16" cy="16" r="14" stroke="#ffffff" strokeWidth="2.5" fill="none" />
              <circle cx="16" cy="16" r="5" fill="#ffffff" />
              <circle cx="26" cy="9" r="2.6" fill="rgba(255,255,255,0.5)" />
            </svg>
          </div>
          <div className="auth-brand-text">
            <strong>Discove<span style={{ color: "#6f9bff" }}>HR</span></strong>
            <span>Platform</span>
          </div>
        </div>
        <div className="auth-header-title-wrap">
          <h1 className="company-title">{title}</h1>
          <p className="company-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="company-header-actions">
        {extraActions}
        <div className="notification-wrap">
          <button
            type="button"
            className="notification-btn"
            aria-label="Notifications"
            title="Notifications"
            onClick={() => setShowNotifications((prev) => !prev)}
          >
          <span aria-hidden="true">🔔</span>
          {notificationCount > 0 ? <span className="notification-badge">{notificationCount}</span> : null}
          </button>
          {showNotifications ? (
            <div className="notification-panel">
              <p className="notification-title">Notifications</p>
              {items.map((item) => (
                <p key={item} className="notification-item">
                  {item}
                </p>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span className="theme-toggle-symbol" aria-hidden="true">
            {theme === "dark" ? "☀" : "☾"}
          </span>
        </button>
        <div className="company-user-chip">
          <strong>{userName}</strong>
          <span>
            {roleLabel} - {userEmail}
          </span>
        </div>
      </div>
    </header>
  );
}
