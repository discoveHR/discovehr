import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AuthHeader } from "../common/AuthHeader";
import { Toast } from "../common/Toast";
import { listMyDocumentRequests } from "../../lib/api/student-documents";
import type { StudentDashboardModel } from "./hooks/useStudentDashboard";
import { PriCapModal } from "./PriCapModal";
import { ProfileRequiredModal } from "./ProfileRequiredModal";
import { UpgradeProModal } from "./UpgradeProModal";
// Light always-visible panels — loaded eagerly
import { StudentApplicationsPanel } from "./StudentApplicationsPanel";
import { StudentInternalPostings } from "./StudentInternalPostings";
import { StudentJobsFilters } from "./StudentJobsFilters";
import { StudentJobsTable } from "./StudentJobsTable";
import { StudentSidebar } from "./StudentSidebar";
import { StudentPlaceholderPanel } from "./StudentPlaceholderPanel";

// Heavy panels — loaded only when their tab is first opened.
const PanelLoading = () => <p className="empty-state">Loading…</p>;
const StudentProfileSection   = dynamic(() => import("./StudentProfileSection").then(m => m.StudentProfileSection),   { loading: PanelLoading });
const StudentDocumentsPanel   = dynamic(() => import("./StudentDocumentsPanel").then(m => m.StudentDocumentsPanel),   { loading: PanelLoading });
const StudentCalendarsPanel   = dynamic(() => import("./StudentCalendarsPanel").then(m => m.StudentCalendarsPanel),   { loading: PanelLoading });
const StudentLmsPanel         = dynamic(() => import("./StudentLmsPanel").then(m => m.StudentLmsPanel),               { loading: PanelLoading });
const StudentTestsAssessmentsPanel = dynamic(() => import("./StudentTestsAssessmentsPanel").then(m => m.StudentTestsAssessmentsPanel), { loading: PanelLoading });
const StudentCreditsPanel     = dynamic(() => import("./StudentCreditsPanel").then(m => m.StudentCreditsPanel),       { loading: PanelLoading });
const StudentPriPanel         = dynamic(() => import("./StudentPriPanel").then(m => m.StudentPriPanel),               { loading: PanelLoading });
const StudentWalletPanel      = dynamic(() => import("./StudentWalletPanel").then(m => m.StudentWalletPanel),         { loading: PanelLoading });

type StudentDashboardViewProps = {
  dashboard: StudentDashboardModel;
};

export function StudentDashboardView({ dashboard: d }: StudentDashboardViewProps) {
  const [docPendingCount, setDocPendingCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    listMyDocumentRequests()
      .then(({ pendingCount }) => setDocPendingCount(pendingCount))
      .catch(() => {/* non-critical */});
  }, []);

  return (
    <main className={`company-page ${d.theme === "dark" ? "dark" : ""}`}>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <section className="company-shell">
        <StudentSidebar
          student={d.student}
          activeMenu={d.activeMenu}
          onMenuChange={(menu) => { d.setActiveMenu(menu); setSidebarOpen(false); }}
          onLogout={() => void d.handleLogout()}
          documentPendingCount={docPendingCount}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isPro={d.isPro}
          coinBalance={d.coinBalance}
        />

        <div className="company-main">
          <AuthHeader
            title="Student hub"
            subtitle="Dashboard, jobs, LMS, PRI, calendars, and profile — all in one place."
            userName={d.student?.full_name || "Student User"}
            roleLabel="Candidate"
            userEmail={d.student?.email || ""}
            theme={d.theme}
            onToggleTheme={d.toggleTheme}
            notificationCount={1}
            onSidebarToggle={() => setSidebarOpen(true)}
          />

          {d.activeMenu === "all-jobs" ? <StudentInternalPostings internalPostings={d.internalPostings} /> : null}

          {d.activeMenu === "all-jobs" || d.activeMenu === "suggested-jobs" ? (
            <StudentJobsFilters
              searchText={d.searchText}
              onSearchTextChange={d.setSearchText}
              locationFilter={d.locationFilter}
              onLocationFilterChange={d.setLocationFilter}
              experienceFilter={d.experienceFilter}
              onExperienceFilterChange={d.setExperienceFilter}
              typeFilter={d.typeFilter}
              onTypeFilterChange={d.setTypeFilter}
              onResetFilters={d.resetFilters}
              profileFlags={d.profileFlags}
            />
          ) : null}

          {d.activeMenu === "suggested-jobs" ? (
            <StudentJobsTable
              jobs={d.filteredSuggestedJobs}
              title="Suggested jobs board"
              caption={`${d.filteredSuggestedJobs.length} job(s) found`}
              variant="suggested"
              colSpan={4}
              emptyMessage="No suggestions yet."
              applyingJobId={d.applyingJobId}
              expandedJobId={d.expandedJobId}
              onApplyJobClick={d.onApplyJobClick}
              onToggleDetails={d.toggleDetails}
              isPro={d.isPro}
              onUpgradeClick={d.openUpgradeProModal}
            />
          ) : null}

          {d.activeMenu === "all-jobs" ? (
            <>
              <StudentJobsTable
                jobs={d.jobBoardJobs}
                title="Open jobs board"
                caption={
                  d.isJobsLoading
                    ? "Loading jobs…"
                    : `${d.jobsPagination.total.toLocaleString()} job(s) found — page ${d.jobsPagination.page} of ${d.jobsPagination.totalPages}`
                }
                variant="all"
                colSpan={6}
                emptyMessage={d.isJobsLoading ? "Loading…" : "No active jobs match your filters."}
                applyingJobId={d.applyingJobId}
                expandedJobId={d.expandedJobId}
                onApplyJobClick={d.onApplyJobClick}
                onToggleDetails={d.toggleDetails}
                isPro={d.isPro}
                onUpgradeClick={d.openUpgradeProModal}
              />
              {d.jobsPagination.totalPages > 1 ? (
                <div className="table-pagination" style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={d.isJobsLoading || d.jobsPagination.page <= 1}
                    onClick={() => d.goToJobsPage(d.jobsPagination.page - 1)}
                  >
                    Previous
                  </button>
                  <span className="table-caption">
                    Page {d.jobsPagination.page} of {d.jobsPagination.totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={d.isJobsLoading || d.jobsPagination.page >= d.jobsPagination.totalPages}
                    onClick={() => d.goToJobsPage(d.jobsPagination.page + 1)}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {d.activeMenu === "applications" ? <StudentApplicationsPanel applicationStatus={d.applicationStatus} applicationsTruncated={d.applicationsTruncated} /> : null}

          {d.activeMenu === "mock-interviews" ? (
            <StudentPlaceholderPanel
              title="Mock Interviews"
              caption="Practice interviews with expert panelists — designed to sharpen your skills and boost your PRI score."
            >
              <p className="sph-desc">
                Mock interview booking and package checkout will appear here once connected to payments and scheduling.
              </p>
              <div className="sph-list">
                <div className="sph-list-item"><span className="sph-list-dot" />Browse role-specific packages across difficulty tiers.</div>
                <div className="sph-list-item"><span className="sph-list-dot" />Pick a slot and join via calendar link or video room.</div>
                <div className="sph-list-item"><span className="sph-list-dot" />Feedback summary posts to your PRI profile when enabled.</div>
              </div>
            </StudentPlaceholderPanel>
          ) : null}

          {d.activeMenu === "tests-assessments" ? <StudentTestsAssessmentsPanel /> : null}

          {d.activeMenu === "pri-score" ? <StudentPriPanel profileFlags={d.profileFlags} /> : null}

          {d.activeMenu === "interviews-calendar" ? (
            <StudentCalendarsPanel
              studentEmail={d.student?.email}
              onError={(m) => {
                d.setError(m);
              }}
              onSuccess={(m) => {
                d.showToast(m, "success");
              }}
            />
          ) : null}

          {d.activeMenu === "messages" ? (
            <StudentPlaceholderPanel
              title="Messages &amp; Notifications"
              caption="Alerts for applications, interviews, assessments, and college broadcasts."
            >
              <p className="sph-desc">
                In-app messaging is not enabled yet. Time-sensitive updates will appear here and optionally by email when your college turns that on.
              </p>
            </StudentPlaceholderPanel>
          ) : null}

          {d.activeMenu === "documents" ? <StudentDocumentsPanel /> : null}

          {d.activeMenu === "purchase-courses" ? (
            <StudentCreditsPanel
              onError={(m) => {
                d.setError(m);
              }}
            />
          ) : null}

          {d.activeMenu === "wallet" ? (
            <StudentWalletPanel
              isPro={d.isPro}
              coinBalance={d.coinBalance}
              onError={(m) => d.setError(m)}
              onSuccess={(m) => d.showToast(m, "success")}
              onProUpgrade={() => d.setIsPro(true)}
              onBalanceChange={(bal, pro) => { d.setCoinBalance(bal); if (pro) d.setIsPro(true); }}
            />
          ) : null}

          {d.activeMenu === "lms" ? <StudentLmsPanel lmsContext={d.lmsContext} isLmsLoading={d.isLmsLoading} onOpenLms={d.openLms} /> : null}

          {d.activeMenu === "profile" ? <StudentProfileSection dashboard={d} /> : null}

          <UpgradeProModal
            open={d.upgradeProModalOpen}
            coinBalance={d.coinBalance}
            onClose={d.closeUpgradeProModal}
            onUpgradeSuccess={(newBal) => { d.setCoinBalance(newBal); d.setIsPro(true); }}
            onGoToWallet={() => { d.closeUpgradeProModal(); d.setActiveMenu("wallet"); }}
          />

          <ProfileRequiredModal
            open={d.profileApplyModalOpen}
            onClose={() => d.setProfileApplyModalOpen(false)}
            onGoToProfile={() => {
              d.setProfileApplyModalOpen(false);
              d.setActiveMenu("profile");
            }}
          />

          <PriCapModal
            open={d.priCapModalOpen}
            onClose={() => d.setPriCapModalOpen(false)}
            onOpenLms={() => {
              d.setPriCapModalOpen(false);
              d.setActiveMenu("lms");
            }}
            onOpenPriScore={() => {
              d.setPriCapModalOpen(false);
              d.setActiveMenu("pri-score");
            }}
          />

          {d.error ? <p className="error">{d.error}</p> : null}
        </div>
      </section>

      {d.toast ? <Toast message={d.toast.message} type={d.toast.type} onClose={d.dismissToast} /> : null}
    </main>
  );
}
