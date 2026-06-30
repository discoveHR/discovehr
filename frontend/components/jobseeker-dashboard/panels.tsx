"use client";

import type { FreelancerProfileData, JobItem } from "../../lib/api";
import { FreelancerProfilePanel } from "../freelancer-dashboard/FreelancerProfilePanel";
import type { JsMenuKey } from "./types";
import { frappeAssetUrl } from "../../lib/api/client";

// ── Home Panel ───────────────────────────────────────────────────────────────

type HomePanelProps = {
  user: { id: string; full_name: string; email: string } | null;
  profile: FreelancerProfileData | null;
  setActiveMenu: (key: JsMenuKey) => void;
};

export function JsHomePanel({ user, profile, setActiveMenu }: HomePanelProps) {
  const approvalStatus = profile?.approvalStatus || "Not Submitted";
  const statusDotClass =
    approvalStatus === "Approved"
      ? "approved"
      : approvalStatus === "Rejected"
        ? "rejected"
        : approvalStatus === "Pending"
          ? "pending"
          : "none";

  const quickActions = [
    { key: "jobs" as JsMenuKey, icon: "💼", label: "Browse Jobs" },
    { key: "profile" as JsMenuKey, icon: "👤", label: "Complete Profile" },
    { key: "resume" as JsMenuKey, icon: "📄", label: "Upload Resume" },
    { key: "applied" as JsMenuKey, icon: "✅", label: "My Applications" },
    { key: "interviews" as JsMenuKey, icon: "📅", label: "Interviews" },
    { key: "saved" as JsMenuKey, icon: "🔖", label: "Saved Jobs" },
  ];

  return (
    <div className="js-panel">
      <h2 className="js-panel-title">Welcome back, {user?.full_name?.split(" ")[0] || "there"}</h2>
      <p className="js-panel-sub">Here's a snapshot of your job search activity.</p>

      {/* Profile status */}
      <div className="js-home-status-card">
        <p className="js-home-status-title">Profile Status</p>
        <div className="js-status-row">
          <div className={`js-status-dot js-status-dot--${statusDotClass}`} />
          <span className="js-status-text">
            {approvalStatus === "Approved"
              ? "Your profile is approved. You can apply to jobs."
              : approvalStatus === "Pending"
                ? "Your profile is under review. We'll notify you once approved."
                : approvalStatus === "Rejected"
                  ? "Your profile was not approved. Please update and resubmit."
                  : "Profile not submitted yet. Complete your profile to start applying."}
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="js-quick-actions">
        {quickActions.map((a) => (
          <button
            key={a.key}
            type="button"
            className="js-quick-action"
            onClick={() => setActiveMenu(a.key)}
          >
            <div className="js-quick-action-icon">{a.icon}</div>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Profile Panel ────────────────────────────────────────────────────────────

type ProfilePanelProps = {
  user: { id: string; full_name: string; email: string } | null;
  profile: FreelancerProfileData | null;
  onProfileSaved: (p: FreelancerProfileData) => void;
};

export function JsProfilePanel({ user, profile, onProfileSaved }: ProfilePanelProps) {
  if (!user || !profile) return <div className="js-loading"><span className="js-spinner" />Loading profile…</div>;
  return (
    <div className="js-panel">
      <h2 className="js-panel-title">My Profile</h2>
      <p className="js-panel-sub">Complete your profile to unlock job applications.</p>
      <FreelancerProfilePanel userId={user.id} profile={profile} onSaved={onProfileSaved} />
    </div>
  );
}

// ── Resume Panel ─────────────────────────────────────────────────────────────

type ResumePanelProps = { profile: FreelancerProfileData | null };

export function JsResumePanel({ profile }: ResumePanelProps) {
  const resumeUrl = profile?.resumeFile ? frappeAssetUrl(profile.resumeFile) : null;
  return (
    <div className="js-panel">
      <h2 className="js-panel-title">Resume</h2>
      <p className="js-panel-sub">Upload and manage your resume for job applications.</p>
      <div className="js-resume-card">
        {resumeUrl ? (
          <div className="js-resume-existing">
            <span style={{ fontSize: 22 }}>📄</span>
            <span className="js-resume-existing-name">resume.pdf</span>
            <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="js-resume-link">View</a>
            <a href={resumeUrl} download className="js-resume-link">Download</a>
          </div>
        ) : null}
        <p style={{ fontSize: 13, color: "#6b7280", margin: resumeUrl ? "12px 0 0" : "0 0 12px" }}>
          {resumeUrl
            ? "To replace your resume, update it from My Profile → Resume section."
            : "No resume uploaded yet. Add your resume from My Profile."}
        </p>
      </div>
    </div>
  );
}

// ── Jobs Panel ───────────────────────────────────────────────────────────────

type JobsPanelProps = {
  jobs: JobItem[];
  jobsLoading: boolean;
  jobPage: number;
  jobTotalPages: number;
  goToJobPage: (page: number) => void;
  applyingJobId: string | null;
  handleApply: (jobId: string) => Promise<void>;
  canApply: boolean;
};

export function JsJobsPanel({ jobs, jobsLoading, jobPage, jobTotalPages, goToJobPage, applyingJobId, handleApply, canApply }: JobsPanelProps) {
  return (
    <div className="js-panel">
      <h2 className="js-panel-title">Jobs</h2>
      <p className="js-panel-sub">Browse and apply to open positions.</p>

      {!canApply && (
        <div className="js-error-banner">
          Your profile needs admin approval before you can apply to jobs.
        </div>
      )}

      {jobsLoading ? (
        <div className="js-loading"><span className="js-spinner" />Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <div className="js-empty-state">No open jobs right now. Check back soon.</div>
      ) : (
        <>
          <div className="js-job-list">
            {jobs.map((job) => {
              const companyInitial = (job.companyName || "J")[0].toUpperCase();
              return (
                <div key={job.id} className="js-job-card">
                  <div className="js-job-logo">{companyInitial}</div>
                  <div className="js-job-body">
                    <p className="js-job-title">{job.title}</p>
                    <p className="js-job-company">{job.companyName}</p>
                    <div className="js-job-meta">
                      {typeof (job as unknown as Record<string, unknown>).locationType === "string" && (
                        <span className="js-job-tag">{(job as unknown as Record<string, string>).locationType}</span>
                      )}
                      {typeof (job as unknown as Record<string, unknown>).opportunityType === "string" && (
                        <span className="js-job-tag">{(job as unknown as Record<string, string>).opportunityType}</span>
                      )}
                    </div>
                  </div>
                  {canApply && (
                    <button
                      type="button"
                      className={`js-apply-btn${job.isApplied ? " js-apply-btn--applied" : ""}`}
                      disabled={applyingJobId === job.id || job.isApplied}
                      onClick={() => void handleApply(job.id)}
                    >
                      {job.isApplied ? "Applied" : applyingJobId === job.id ? "Applying…" : "Apply"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {jobTotalPages > 1 && (
            <div className="js-pagination">
              <button className="js-page-btn" disabled={jobPage <= 1} onClick={() => goToJobPage(jobPage - 1)}>← Prev</button>
              <span className="js-page-info">Page {jobPage} of {jobTotalPages}</span>
              <button className="js-page-btn" disabled={jobPage >= jobTotalPages} onClick={() => goToJobPage(jobPage + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Applied Jobs Panel ───────────────────────────────────────────────────────

export function JsAppliedPanel() {
  return (
    <div className="js-panel">
      <h2 className="js-panel-title">Applied Jobs</h2>
      <p className="js-panel-sub">Track all the jobs you have applied to.</p>
      <div className="js-coming-soon">
        <div className="js-coming-soon-icon">📋</div>
        <p className="js-coming-soon-title">Application Tracker Coming Soon</p>
        <p className="js-coming-soon-sub">You'll be able to track the status of every application you've submitted here.</p>
      </div>
    </div>
  );
}

// ── Saved Jobs Panel ─────────────────────────────────────────────────────────

export function JsSavedPanel() {
  return (
    <div className="js-panel">
      <h2 className="js-panel-title">Saved Jobs</h2>
      <p className="js-panel-sub">Jobs you've bookmarked for later.</p>
      <div className="js-coming-soon">
        <div className="js-coming-soon-icon">🔖</div>
        <p className="js-coming-soon-title">Saved Jobs Coming Soon</p>
        <p className="js-coming-soon-sub">Bookmark interesting jobs and return to apply when you're ready.</p>
      </div>
    </div>
  );
}

// ── Recommended Jobs Panel ───────────────────────────────────────────────────

export function JsRecommendedPanel() {
  return (
    <div className="js-panel">
      <h2 className="js-panel-title">Recommended Jobs</h2>
      <p className="js-panel-sub">Jobs matched to your profile and skills.</p>
      <div className="js-coming-soon">
        <div className="js-coming-soon-icon">⭐</div>
        <p className="js-coming-soon-title">Recommendations Coming Soon</p>
        <p className="js-coming-soon-sub">Complete your profile and our AI will surface the best-fit opportunities for you.</p>
      </div>
    </div>
  );
}

// ── Interview Schedule Panel ─────────────────────────────────────────────────

export function JsInterviewsPanel() {
  return (
    <div className="js-panel">
      <h2 className="js-panel-title">Interview Schedule</h2>
      <p className="js-panel-sub">Upcoming and past interviews.</p>
      <div className="js-coming-soon">
        <div className="js-coming-soon-icon">📅</div>
        <p className="js-coming-soon-title">No interviews scheduled</p>
        <p className="js-coming-soon-sub">Interview invitations from employers will appear here once you start applying.</p>
      </div>
    </div>
  );
}

// ── Notifications Panel ──────────────────────────────────────────────────────

export function JsNotificationsPanel() {
  return (
    <div className="js-panel">
      <h2 className="js-panel-title">Notifications</h2>
      <p className="js-panel-sub">Status updates and alerts.</p>
      <div className="js-coming-soon">
        <div className="js-coming-soon-icon">🔔</div>
        <p className="js-coming-soon-title">No notifications</p>
        <p className="js-coming-soon-sub">Updates about your applications, profile review, and interviews will appear here.</p>
      </div>
    </div>
  );
}

// ── Settings Panel ───────────────────────────────────────────────────────────

type SettingsPanelProps = {
  user: { id: string; full_name: string; email: string } | null;
};

export function JsSettingsPanel({ user }: SettingsPanelProps) {
  return (
    <div className="js-panel">
      <h2 className="js-panel-title">Settings</h2>
      <p className="js-panel-sub">Account and notification preferences.</p>
      <div style={{ background: "#fff", border: "1px solid #e8ecf1", borderRadius: 12, padding: 24 }}>
        <p style={{ fontSize: 13.5, color: "#374151", margin: "0 0 8px" }}>
          <strong>Email:</strong> {user?.email || "—"}
        </p>
        <p style={{ fontSize: 13.5, color: "#374151", margin: "0 0 16px" }}>
          <strong>Role:</strong> Job Seeker
        </p>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          Additional settings such as password change and notification preferences will be available soon.
        </p>
      </div>
    </div>
  );
}
