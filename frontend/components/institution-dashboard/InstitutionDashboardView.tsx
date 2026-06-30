"use client";

import { useState } from "react";
import { PortalDashboardLoader } from "../auth/PortalDashboardLoader";
import type { InstitutionDashboardState } from "./types";
import { InstitutionSidebar } from "./InstitutionSidebar";
import { InstitutionOverviewPanel } from "./InstitutionOverviewPanel";
import { InstitutionStudentsPanel } from "./InstitutionStudentsPanel";

type Props = { dashboard: InstitutionDashboardState };

export function InstitutionDashboardView({ dashboard: d }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (d.isLoading) return <PortalDashboardLoader portal="tpo" />;

  if (d.error) {
    return (
      <div className="inst-error-page">
        <h1>Unable to load institution dashboard</h1>
        <p>{d.error}</p>
        <a href="/tpo/dashboard" className="inst-error-link">Go to TPO dashboard</a>
      </div>
    );
  }

  return (
    <main className="inst-dashboard">
      <InstitutionSidebar
        overview={d.overview}
        activeMenu={d.activeMenu}
        setActiveMenu={d.setActiveMenu}
        handleLogout={d.handleLogout}
        displayName={d.displayName}
        userEmail={d.userEmail}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="inst-dashboard-main">
        {/* Top bar */}
        <header className="inst-topbar">
          <div className="inst-topbar-left">
            <button
              type="button"
              className="inst-hamburger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div>
              <h1 className="inst-topbar-title">{d.overview?.college.collegeName || "Institution Dashboard"}</h1>
              <p className="inst-topbar-sub">
                {d.overview?.college.state ? `${d.overview.college.state}, ` : ""}
                {d.overview?.college.country || "India"} · Institution Management
              </p>
            </div>
          </div>
          <div className="inst-topbar-right">
            <a href="/tpo/dashboard" className="inst-topbar-link">TPO Dashboard →</a>
          </div>
        </header>

        {/* Body */}
        <div className="inst-dashboard-body">
          {d.activeMenu === "overview" && d.overview && (
            <InstitutionOverviewPanel
              overview={d.overview}
              setActiveMenu={d.setActiveMenu}
              setSelectedBatch={d.setSelectedBatch}
            />
          )}
          {d.activeMenu === "students" && d.overview && (
            <InstitutionStudentsPanel
              batches={d.overview.batches}
              selectedBatch={d.selectedBatch}
              setSelectedBatch={d.setSelectedBatch}
            />
          )}
        </div>
      </div>
    </main>
  );
}
