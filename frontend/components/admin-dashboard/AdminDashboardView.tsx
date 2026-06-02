"use client";

import { useState } from "react";
import { AdminCollegesPanel } from "./AdminCollegesPanel";
import { AdminCompaniesPanel } from "./AdminCompaniesPanel";
import { AdminHomePanel } from "./AdminHomePanel";
import { AdminAptitudePanel } from "./AdminAptitudePanel";
import { AdminPsychometricPanel } from "./AdminPsychometricPanel";
import { AdminFreelancerApprovalsPanel } from "./AdminFreelancerApprovalsPanel";
import { AdminReferralsPanel } from "./AdminReferralsPanel";
// RELEASE: import when TPO approvals panel is re-enabled
// import { AdminTpoApprovalsPanel } from "./AdminTpoApprovalsPanel";
import { PortalDashboardLoader } from "../auth/PortalDashboardLoader";
import { AdminSidebar } from "./AdminSidebar";
import { useAdminDashboard } from "./hooks/useAdminDashboard";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AdminDashboardView() {
  const d = useAdminDashboard();
  const displayName = d.user?.full_name || d.user?.email || "Admin";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const topbarTitle =
    d.activeMenu === "colleges"
      ? "Colleges & TPOs"
      : d.activeMenu === "companies"
        ? "Registered companies"
        : d.activeMenu === "freelancer-approvals"
          ? "Freelancer interviewer approvals"
          : d.activeMenu === "psychometric"
            ? "Psychometric tests"
            : d.activeMenu === "aptitude"
              ? "Aptitude tests"
              : d.activeMenu === "referrals"
                ? "Candidate referrals"
                : "Platform overview";

  if (d.isLoading) {
    return <PortalDashboardLoader portal="admin" />;
  }

  return (
    <main className="tpo-dashboard">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <AdminSidebar activeMenu={d.activeMenu} onMenuChange={d.setActiveMenu} onLogout={() => void d.handleLogout()} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="tpo-dashboard-main">
        <header className="tpo-topbar">
          <div className="tpo-topbar-left">
            <button type="button" className="sidebar-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <h1>{topbarTitle}</h1>
            <p>Scout Express · Platform administration</p>
          </div>
          <div className="tpo-topbar-right">
            <div className="tpo-topbar-actions">
              <div className="tpo-user-avatar" aria-hidden>
                {initialsFromName(displayName)}
              </div>
              <div className="tpo-user-meta">
                <strong>{displayName}</strong>
                <span>Administrator</span>
              </div>
            </div>
          </div>
        </header>
        <div className="tpo-dashboard-body">
          {d.error ? <p className="error">{d.error}</p> : null}
          {d.activeMenu === "overview" && d.overview ? <AdminHomePanel overview={d.overview} onNavigate={d.setActiveMenu} /> : null}
          {d.activeMenu === "colleges" ? <AdminCollegesPanel /> : null}
          {d.activeMenu === "companies" ? <AdminCompaniesPanel /> : null}
          {d.activeMenu === "freelancer-approvals" ? <AdminFreelancerApprovalsPanel /> : null}
          {/* RELEASE: re-enable TPO approvals panel */}
          {/* {d.activeMenu === "tpo-approvals" ? <AdminTpoApprovalsPanel /> : null} */}
          {d.activeMenu === "psychometric" ? <AdminPsychometricPanel /> : null}
          {d.activeMenu === "aptitude" ? <AdminAptitudePanel /> : null}
          {d.activeMenu === "referrals" ? <AdminReferralsPanel /> : null}
        </div>
      </div>
    </main>
  );
}
