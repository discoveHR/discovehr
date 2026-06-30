"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { PortalDashboardLoader } from "../../../components/auth/PortalDashboardLoader";
import { Toast } from "../../../components/common/Toast";
import { useCompanyDashboard } from "../../../components/company-dashboard/hooks/useCompanyDashboard";
import { menuItems, initialJobForm, initialAssessmentForm } from "../../../components/company-dashboard/types";
import { Header, Sidebar } from "../../../components/company-dashboard/layout";
import { DashboardPanel } from "../../../components/company-dashboard/panels";
import {
  ConfirmModal,
  ShortlistScheduleModal,
} from "../../../components/company-dashboard/modals";

// Heavy panels — loaded only when the matching menu tab is first opened.
const PanelLoading = () => <p className="empty-state">Loading…</p>;

const JobForm = dynamic(() => import("../../../components/company-dashboard/panels/JobForm").then(m => m.JobForm), { loading: PanelLoading });
const JobListings = dynamic(() => import("../../../components/company-dashboard/panels/JobListings").then(m => m.JobListings), { loading: PanelLoading });
const JobRecruitmentJourneyPanel = dynamic(() => import("../../../components/company-dashboard/panels/JobRecruitmentJourneyPanel").then(m => m.JobRecruitmentJourneyPanel), { loading: PanelLoading });
const ApplicantsPanel = dynamic(() => import("../../../components/company-dashboard/panels/ApplicantsPanel").then(m => m.ApplicantsPanel), { loading: PanelLoading });
const AssessmentsPanel = dynamic(() => import("../../../components/company-dashboard/panels/AssessmentsPanel").then(m => m.AssessmentsPanel), { loading: PanelLoading });
const FreelancerInterviewersPanel = dynamic(() => import("../../../components/company-dashboard/panels/FreelancerInterviewersPanel").then(m => m.FreelancerInterviewersPanel), { loading: PanelLoading });
const InterviewSchedulerPanel = dynamic(() => import("../../../components/company-dashboard/panels/InterviewSchedulerPanel").then(m => m.InterviewSchedulerPanel), { loading: PanelLoading });
const CompanyCreditsPanel = dynamic(() => import("../../../components/company-dashboard/panels/CompanyCreditsPanel").then(m => m.CompanyCreditsPanel), { loading: PanelLoading });
const SubAdminsPanel = dynamic(() => import("../../../components/company-dashboard/panels/SubAdminsPanel").then(m => m.SubAdminsPanel), { loading: PanelLoading });
const CompanyHrmsPanel = dynamic(() => import("../../../components/company-dashboard/panels/CompanyHrmsPanel").then(m => m.CompanyHrmsPanel), { loading: PanelLoading });

export default function CompanyDashboardPage() {
  const d = useCompanyDashboard();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (d.isLoading) return <PortalDashboardLoader portal="company" />;

  return (
    <main className={`company-page ${d.theme === "dark" ? "dark" : ""}`}>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <section className="company-shell">
        <Sidebar
          userName={d.user?.full_name || "Company User"}
          activeMenu={d.activeMenu}
          onMenuChange={(key) => { d.handleMenuChange(key); setSidebarOpen(false); }}
          onLogout={() => void d.handleLogout()}
          menuItems={menuItems}
          isSubAdmin={d.user?.isSubAdmin}
          assignedDistrict={d.user?.assignedDistrict}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="company-main">
          <Header
            userName={d.user?.full_name || "Company User"}
            userEmail={d.user?.email || ""}
            activeMenu={d.activeMenu}
            onPostJobClick={d.openPostJob}
            theme={d.theme}
            onToggleTheme={d.toggleTheme}
            balanceCredits={d.creditWallet?.balanceCredits ?? null}
            coinPriceInr={d.creditWallet?.coinPriceInr}
            walletLoading={d.walletLoading}
            onWalletRefresh={() => d.refreshCreditWallet(true)}
            onWalletPurchaseSuccess={(msg) => {
              d.setToast({ type: "success", message: msg });
              void d.refreshCreditWallet();
            }}
            onWalletPurchaseError={(msg) => d.setToast({ type: "error", message: msg })}
            onOpenCreditPurchase={() => d.setActiveMenu("credit-purchase")}
            onSidebarToggle={() => setSidebarOpen(true)}
          />

          {d.user?.isSubAdmin && (
            <div className="sub-admin-view-banner">
              <div className="sub-admin-view-banner-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="1.8">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
              </div>
              <div className="sub-admin-view-banner-text">
                <h3>Sub Admin — {d.user.assignedDistrict}, {d.user.assignedState}</h3>
                <p>You can view applicants from your assigned district. Contact your company admin for full access.</p>
              </div>
            </div>
          )}

          {d.activeMenu === "dashboard" && (
            <DashboardPanel
              jobs={d.jobs}
              userName={d.user?.full_name || ""}
              onPostJob={d.openPostJob}
              onViewApplicants={d.handleViewApplicants}
            />
          )}

          {d.activeMenu === "post-job" && (
            <JobForm
              value={d.jobForm}
              error={d.formError}
              onChange={d.updateJobForm}
              onSubmit={d.handleJobSubmit}
              onReset={() => d.setJobForm(initialJobForm)}
              focusTrigger={d.postJobFocusTick}
            />
          )}

          {d.activeMenu === "job-journey" && (
            <JobRecruitmentJourneyPanel
              jobs={d.jobs}
              onError={(msg) => d.setToast({ message: msg, type: "error" })}
              onSuccess={(msg) => d.setToast({ message: msg, type: "success" })}
              onInvitesChanged={() => void d.loadCollegeInvites(true)}
            />
          )}

          {d.activeMenu === "job-listings" && (
            <JobListings
              jobs={d.jobs}
              onViewApplicants={d.handleViewApplicants}
              onUpdateStatus={d.handleUpdateJobStatus}
              onRequestClose={d.setCloseTarget}
              onInviteCollege={d.handleInviteCollege}
              onResendInvite={d.handleResendCollegeInvite}
              onJobUpdated={d.handleJobUpdated}
              inviteHistory={d.collegeInviteHistory}
              statusUpdatingJobId={d.statusUpdatingJobId}
              userEmail={d.user?.email}
            />
          )}

          {d.activeMenu === "view-applicants" && (
            <ApplicantsPanel
              applicants={d.applicants}
              jobs={d.jobs.map((j) => ({ id: j.id, title: j.title }))}
              selectedJobId={d.selectedApplicantJob?.id}
              selectedJobTitle={d.selectedApplicantJob?.title}
              isLoading={d.isApplicantsLoading}
              updatingApplicationId={d.updatingApplicationId}
              pagination={d.applicantsPagination}
              onPageChange={(page) => void d.refreshApplicants(d.selectedApplicantJob, page)}
              onJobChange={d.handleJobChange}
              onStatusChange={d.handleApplicantStatusChange}
            />
          )}

          {d.activeMenu === "freelancer-interviewers" && (
            <FreelancerInterviewersPanel
              onError={(msg) => d.setToast({ message: msg, type: "error" })}
              onScheduleWithInterviewer={(freelancerUser) => {
                d.setSchedulerFreelancerUser(freelancerUser);
                d.setActiveMenu("interview-scheduler");
              }}
            />
          )}

          {d.activeMenu === "interview-scheduler" && (
            <InterviewSchedulerPanel
              jobs={d.jobs}
              preselectedFreelancerUser={d.schedulerFreelancerUser}
              onError={(msg) => d.setToast({ message: msg, type: "error" })}
              onSuccess={(msg) => d.setToast({ message: msg, type: "success" })}
            />
          )}

          {d.activeMenu === "credit-purchase" && (
            <CompanyCreditsPanel
              prefillEmail={d.user?.email || ""}
              onError={(msg) => d.setToast({ message: msg, type: "error" })}
              onSuccess={async (msg) => {
                d.setToast({ message: msg, type: "success" });
                await d.refreshCreditWallet(true);
              }}
            />
          )}

          {d.activeMenu === "assessments" && (
            <>
              {d.isAssessmentsLoading && d.assessments.length === 0 ? (
                <p className="empty-state">Loading assessments…</p>
              ) : null}
              <AssessmentsPanel
                value={d.assessmentForm}
                items={d.assessments}
                walletRates={d.creditWallet?.rates}
                error={d.formError}
                publishingId={d.publishingAssessmentId}
                onChange={d.updateAssessmentForm}
                onSubmit={d.handleAssessmentSubmit}
                onReset={() => d.setAssessmentForm(initialAssessmentForm)}
                onPublish={d.handlePublishAssessment}
              />
            </>
          )}

          {d.activeMenu === "sub-admins" && (
            <SubAdminsPanel
              onError={(msg) => d.setToast({ message: msg, type: "error" })}
              onSuccess={(msg) => d.setToast({ message: msg, type: "success" })}
            />
          )}

          {d.activeMenu === "hrms" && (
            <CompanyHrmsPanel
              onError={(msg) => d.setToast({ message: msg, type: "error" })}
              onSuccess={(msg) => d.setToast({ message: msg, type: "success" })}
            />
          )}

          {d.error ? <p className="error">{d.error}</p> : null}
        </div>
      </section>

      <ConfirmModal
        open={Boolean(d.closeTarget)}
        title="Close Job Posting?"
        message={`Are you sure you want to close "${d.closeTarget?.title || "this job"}"? You won't be able to move it back to Active.`}
        confirmLabel="Yes, close job"
        loading={Boolean(d.closeTarget && d.statusUpdatingJobId === d.closeTarget.id)}
        onCancel={() => d.setCloseTarget(null)}
        onConfirm={() => void d.handleConfirmClose()}
      />
      <ShortlistScheduleModal
        open={Boolean(d.shortlistTarget)}
        applicantName={d.shortlistTarget?.applicantName}
        loading={Boolean(d.shortlistTarget && d.updatingApplicationId === d.shortlistTarget.applicationId)}
        onCancel={() => d.setShortlistTarget(null)}
        onConfirm={d.handleShortlistConfirm}
      />

      {d.toast ? <Toast message={d.toast.message} type={d.toast.type} onClose={() => d.setToast(null)} /> : null}
    </main>
  );
}
