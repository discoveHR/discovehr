"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { PortalDashboardLoader } from "../auth/PortalDashboardLoader";
import { Toast } from "../common/Toast";
import { BulkUploadAlertModal } from "./BulkUploadAlertModal";
import type { TpoDashboardState } from "./hooks/useTpoDashboard";
import { TpoAdminPanel } from "./TpoAdminPanel";
import { TpoAptitudePanel } from "./TpoAptitudePanel";
import { TpoApplicantsPanel } from "./TpoApplicantsPanel";
import { TpoHomePanel } from "./TpoHomePanel";
import { TpoInternalJobsPanel } from "./TpoInternalJobsPanel";
import { TpoPlacementsPanel } from "./TpoPlacementsPanel";
import { TpoCollegeSetupPanel } from "./TpoCollegeSetupPanel";
import { TpoSidebar } from "./TpoSidebar";
import { TpoStudentsPanel } from "./TpoStudentsPanel";
import { initialsFromName } from "./utils";

const TpoCalendarsPanel = dynamic(() => import("./TpoCalendarsPanel").then((m) => m.TpoCalendarsPanel), {
  loading: () => <PanelLoading label="Calendars" />,
});
const TpoCandidateProgressPanel = dynamic(
  () => import("./TpoCandidateProgressPanel").then((m) => m.TpoCandidateProgressPanel),
  { loading: () => <PanelLoading label="Candidate progress" /> },
);
const TpoChallengesPanel = dynamic(() => import("./TpoChallengesPanel").then((m) => m.TpoChallengesPanel), {
  loading: () => <PanelLoading label="Challenges" />,
});
const TpoEngagementPanel = dynamic(() => import("./TpoEngagementPanel").then((m) => m.TpoEngagementPanel), {
  loading: () => <PanelLoading label="Engagement" />,
});
const TpoInboundJobsPanel = dynamic(() => import("./TpoInboundJobsPanel").then((m) => m.TpoInboundJobsPanel), {
  loading: () => <PanelLoading label="Inbound jobs" />,
});
const TpoReportsPanel = dynamic(() => import("./TpoReportsPanel").then((m) => m.TpoReportsPanel), {
  loading: () => <PanelLoading label="Reports" />,
});

type Props = {
  dashboard: TpoDashboardState;
};

export function TpoDashboardView({ dashboard }: Props) {
  const d = dashboard;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (d.isLoading) {
    return <PortalDashboardLoader portal="tpo" />;
  }

  return (
    <main className={`tpo-dashboard ${d.theme === "dark" ? "tpo-dashboard--dark" : ""}`}>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <TpoSidebar activeMenu={d.activeMenu} setActiveMenu={d.setActiveMenu} handleLogout={d.handleLogout} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="tpo-dashboard-main">
        <header className="tpo-topbar">
          <div className="tpo-topbar-left">
            <button type="button" className="sidebar-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <h1>{d.institutionTitle}</h1>
            <p>
              {d.tpoProfile.collegeLocation ? `${d.tpoProfile.collegeLocation} · ` : null}
              {d.tpoProfile.state ? `${d.tpoProfile.state}, ` : null}
              {d.tpoProfile.country || "India"} · Training & Placement Unit
            </p>
          </div>
          <TpoTopbarRight d={d} />
        </header>

        <div className="tpo-dashboard-body">
          {d.activeMenu === "college-profile" && (
            <TpoCollegeSetupPanel displayName={d.displayName} onProfileSaved={() => void d.reloadAfterCollegeSetup()} />
          )}
          {d.activeMenu === "home" && (
            <TpoHomePanel
              studentDirectoryCount={d.studentDirectoryCount}
              studentCountCapped={d.studentCountCapped}
              dashboardRollup={d.dashboardRollup}
              isRollupLoading={d.isRollupLoading}
              tpoProfile={d.tpoProfile}
              activePostingsCount={d.activePostingsCount}
              pendingInvitesCount={d.pendingInvitesCount}
            />
          )}
          {d.activeMenu === "placements" && (
            <TpoPlacementsPanel postings={d.postings} handleLoadApplicants={d.handleLoadApplicants} handleSendMagicLink={d.handleSendMagicLink} sendingPostingId={d.sendingPostingId} />
          )}
          {d.activeMenu === "internal-jobs" && (
            <TpoInternalJobsPanel
              internalJobForm={d.internalJobForm}
              setInternalJobForm={d.setInternalJobForm}
              handleCreateInternalPosting={d.handleCreateInternalPosting}
              isCreatingInternal={d.isCreatingInternal}
              internalPostings={d.internalPostings}
              handleLoadApplicants={d.handleLoadApplicants}
            />
          )}
          {d.activeMenu === "applicants" && <TpoApplicantsPanel selectedPostingId={d.selectedPostingId} isApplicantsLoading={d.isApplicantsLoading} applicants={d.applicants} />}
          {d.activeMenu === "students" && (
            <TpoStudentsPanel
              activeStudentTab={d.activeStudentTab}
              setActiveStudentTab={d.setActiveStudentTab}
              isStudentsLoading={d.isStudentsLoading}
              studentRows={d.studentRows}
              studentPagination={d.studentPagination}
              goToStudentPage={d.goToStudentPage}
              batchFilter={d.batchFilter}
              setBatchFilter={d.setBatchFilter}
              addStudentForm={d.addStudentForm}
              setAddStudentForm={d.setAddStudentForm}
              handleAddStudent={d.handleAddStudent}
              isAddingStudent={d.isAddingStudent}
              studentInvites={d.studentInvites}
              downloadFilters={d.downloadFilters}
              setDownloadFilters={d.setDownloadFilters}
              handleDownloadFilteredStudents={d.handleDownloadFilteredStudents}
              isProfileEditsLoading={d.isProfileEditsLoading}
              profileEditRequests={d.profileEditRequests}
              loadProfileEditRequests={d.loadProfileEditRequests}
              handleApproveProfileEdit={d.handleApproveProfileEdit}
              approvingStudentId={d.approvingStudentId}
            />
          )}
          {d.activeMenu === "reports" && <TpoReportsPanel onError={(msg) => d.showToast(msg, "error")} />}
          {d.activeMenu === "inbound-jobs" && (
            <TpoInboundJobsPanel
              onError={(msg) => d.showToast(msg, "error")}
              onSuccess={(msg) => d.showToast(msg, "success")}
            />
          )}
          {d.activeMenu === "calendars" && (
            <TpoCalendarsPanel onError={(msg) => d.showToast(msg, "error")} onSuccess={(msg) => d.showToast(msg, "success")} />
          )}
          {d.activeMenu === "candidate-progress" && <TpoCandidateProgressPanel onError={(msg) => d.showToast(msg, "error")} />}
          {d.activeMenu === "challenges" && (
            <TpoChallengesPanel onError={(msg) => d.showToast(msg, "error")} onSuccess={(msg) => d.showToast(msg, "success")} />
          )}
          {d.activeMenu === "engagement" && (
            <TpoEngagementPanel onError={(msg) => d.showToast(msg, "error")} onSuccess={(msg) => d.showToast(msg, "success")} />
          )}
          {d.activeMenu === "aptitude" && <TpoAptitudePanel />}
          {d.activeMenu === "admin" && (
            <TpoAdminPanel
              bulkUploadForm={d.bulkUploadForm}
              setBulkUploadForm={d.setBulkUploadForm}
              bulkUploadFile={d.bulkUploadFile}
              setBulkUploadFile={d.setBulkUploadFile}
              isBulkUploading={d.isBulkUploading}
              handleBulkStudentUpload={d.handleBulkStudentUpload}
            />
          )}
        </div>
      </div>

      {d.toast ? <Toast message={d.toast.message} type={d.toast.type} onClose={d.dismissToast} /> : null}
      {d.bulkUploadAlert ? <BulkUploadAlertModal message={d.bulkUploadAlert} onClose={() => d.setBulkUploadAlert(null)} /> : null}
    </main>
  );
}

function TpoTopbarRight({ d }: { d: TpoDashboardState }) {
  return (
    <div className="tpo-topbar-right">
      <input className="tpo-topbar-search" type="search" placeholder="Search students" aria-label="Search students (coming soon)" title="Coming soon" readOnly />
      <div className="tpo-topbar-actions">
        <div className="notification-wrap">
          <button type="button" className="notification-btn" aria-label="Notifications" title="Notifications" onClick={() => d.setShowNotifications((p) => !p)}>
            <span aria-hidden>🔔</span>
            <span className="notification-badge">1</span>
          </button>
          {d.showNotifications ? (
            <div className="notification-panel">
              <p className="notification-title">Notifications</p>
              <p className="notification-item">Placement updates will appear here.</p>
            </div>
          ) : null}
        </div>
        <button type="button" className="theme-toggle" onClick={d.toggleTheme} aria-label={d.theme === "dark" ? "Light mode" : "Dark mode"} title="Theme">
          <span className="theme-toggle-symbol" aria-hidden>
            {d.theme === "dark" ? "☀" : "☾"}
          </span>
        </button>
        <div className="tpo-user-avatar" aria-hidden>
          {initialsFromName(d.displayName)}
        </div>
        <div className="tpo-user-meta">
          <strong>{d.displayName}</strong>
          <span>
            TPO{d.userEmail ? ` · ${d.userEmail}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

function PanelLoading({ label }: { label: string }) {
  return <p className="tpo-panel-loading">Loading {label}…</p>;
}
