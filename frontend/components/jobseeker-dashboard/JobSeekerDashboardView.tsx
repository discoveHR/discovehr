"use client";

import { useState } from "react";
import { PortalDashboardLoader } from "../auth/PortalDashboardLoader";
import type { JobSeekerDashboardState } from "./types";
import { JobSeekerSidebar } from "./JobSeekerSidebar";
import {
  JsHomePanel,
  JsProfilePanel,
  JsResumePanel,
  JsJobsPanel,
  JsAppliedPanel,
  JsSavedPanel,
  JsRecommendedPanel,
  JsInterviewsPanel,
  JsNotificationsPanel,
  JsSettingsPanel,
} from "./panels";

const PANEL_TITLES: Record<string, string> = {
  home: "Dashboard",
  profile: "My Profile",
  resume: "Resume",
  jobs: "Jobs",
  applied: "Applied Jobs",
  saved: "Saved Jobs",
  recommended: "Recommended Jobs",
  interviews: "Interview Schedule",
  notifications: "Notifications",
  settings: "Settings",
};

type Props = { dashboard: JobSeekerDashboardState };

export function JobSeekerDashboardView({ dashboard: d }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (d.isLoading) return <PortalDashboardLoader portal="jobseeker" />;

  const approvalStatus = d.profile?.approvalStatus;
  const approvalBadgeClass =
    approvalStatus === "Approved"
      ? "js-approval-badge--approved"
      : approvalStatus === "Rejected"
        ? "js-approval-badge--rejected"
        : "js-approval-badge--pending";

  return (
    <main className="js-dashboard">
      <JobSeekerSidebar
        activeMenu={d.activeMenu}
        setActiveMenu={d.setActiveMenu}
        handleLogout={d.handleLogout}
        displayName={d.displayName}
        user={d.user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="js-dashboard-main">
        {/* Top bar */}
        <header className="js-topbar">
          <div className="js-topbar-left">
            <button
              type="button"
              className="js-hamburger"
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
              <h1 className="js-topbar-title">{PANEL_TITLES[d.activeMenu] || "Dashboard"}</h1>
              <p className="js-topbar-sub">{d.user?.email || "Job Seeker Dashboard"}</p>
            </div>
          </div>
          <div className="js-topbar-right">
            {approvalStatus && (
              <span className={`js-approval-badge ${approvalBadgeClass}`}>
                {approvalStatus}
              </span>
            )}
          </div>
        </header>

        {/* Error banner */}
        {d.error && <div className="js-error-banner" style={{ margin: "0 24px" }}>{d.error}</div>}

        {/* Body */}
        <div className="js-dashboard-body">
          {d.activeMenu === "home" && (
            <JsHomePanel user={d.user} profile={d.profile} setActiveMenu={d.setActiveMenu} />
          )}
          {d.activeMenu === "profile" && (
            <JsProfilePanel user={d.user} profile={d.profile} onProfileSaved={(p) => { void p; }} />
          )}
          {d.activeMenu === "resume" && (
            <JsResumePanel profile={d.profile} />
          )}
          {d.activeMenu === "jobs" && (
            <JsJobsPanel
              jobs={d.jobs}
              jobsLoading={d.jobsLoading}
              jobPage={d.jobPage}
              jobTotalPages={d.jobTotalPages}
              goToJobPage={d.goToJobPage}
              applyingJobId={d.applyingJobId}
              handleApply={d.handleApply}
              canApply={d.profile?.canApplyToJobs ?? false}
            />
          )}
          {d.activeMenu === "applied" && <JsAppliedPanel />}
          {d.activeMenu === "saved" && <JsSavedPanel />}
          {d.activeMenu === "recommended" && <JsRecommendedPanel />}
          {d.activeMenu === "interviews" && <JsInterviewsPanel />}
          {d.activeMenu === "notifications" && <JsNotificationsPanel />}
          {d.activeMenu === "settings" && <JsSettingsPanel user={d.user} />}
        </div>
      </div>
    </main>
  );
}
