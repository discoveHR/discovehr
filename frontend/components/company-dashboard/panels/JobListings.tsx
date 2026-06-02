import { useState } from "react";
import type { CompanyCollegeInviteItem, JobItem } from "../../../lib/api";
import { ModalCloseButton } from "../../common/ModalCloseButton";

type JobListingsProps = {
  jobs: JobItem[];
  onViewApplicants: (job: JobItem) => void;
  onUpdateStatus: (jobId: string, status: JobItem["status"]) => void;
  onRequestClose: (job: JobItem) => void;
  onInviteCollege: (job: JobItem, collegeEmails: string[], note?: string) => Promise<void>;
  onResendInvite: (invite: CompanyCollegeInviteItem) => Promise<void>;
  inviteHistory: CompanyCollegeInviteItem[];
  statusUpdatingJobId?: string | null;
};

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

const LOCATION_ICONS: Record<string, string> = {
  "Remote":    "🌐",
  "Hybrid":    "🏠",
  "In office": "🏢",
};

const TPO_META: Record<string, { color: string; bg: string }> = {
  "Pending":  { color: "#d97706", bg: "#fffbeb" },
  "Accepted": { color: "#16a34a", bg: "#f0fdf4" },
  "Declined": { color: "#dc2626", bg: "#fef2f2" },
};

const EMAIL_META: Record<string, { color: string; bg: string }> = {
  "Sent":   { color: "#16a34a", bg: "#f0fdf4" },
  "Failed": { color: "#dc2626", bg: "#fef2f2" },
};

export function JobListings({
  jobs,
  onViewApplicants,
  onUpdateStatus,
  onRequestClose,
  onInviteCollege,
  onResendInvite,
  inviteHistory,
  statusUpdatingJobId,
}: JobListingsProps) {
  const [inviteModalJob, setInviteModalJob] = useState<JobItem | null>(null);
  const [inviteCollegeName, setInviteCollegeName] = useState("");
  const [inviteCollegeEmail, setInviteCollegeEmail] = useState("");
  const [invitingJobId, setInvitingJobId] = useState<string | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [inviteFilter, setInviteFilter] = useState<"all" | "sent" | "failed">("all");
  const [tpoFilter, setTpoFilter] = useState<"all" | "pending" | "accepted" | "declined">("all");

  function openInviteModal(job: JobItem) {
    setInviteModalJob(job);
    setInviteCollegeName("");
    setInviteCollegeEmail("");
  }

  function closeInviteModal() {
    if (invitingJobId) return;
    setInviteModalJob(null);
  }

  async function handleInviteSubmit() {
    if (!inviteModalJob) return;
    const collegeName = inviteCollegeName.trim();
    const collegeEmail = inviteCollegeEmail.trim().toLowerCase();
    if (!collegeName || !collegeEmail) return;
    setInvitingJobId(inviteModalJob.id);
    try {
      await onInviteCollege(inviteModalJob, [collegeEmail], `College Name: ${collegeName}`);
      closeInviteModal();
    } finally {
      setInvitingJobId(null);
    }
  }

  async function handleResend(invite: CompanyCollegeInviteItem) {
    setResendingInviteId(invite.id);
    try {
      await onResendInvite(invite);
    } finally {
      setResendingInviteId(null);
    }
  }

  const filteredInviteHistory = inviteHistory.filter((item) => {
    if (inviteFilter === "sent" && item.status !== "Sent") return false;
    if (inviteFilter === "failed" && item.status !== "Failed") return false;
    const tpo = item.tpoResponse || "Pending";
    if (tpoFilter === "pending" && tpo !== "Pending") return false;
    if (tpoFilter === "accepted" && tpo !== "Accepted") return false;
    if (tpoFilter === "declined" && tpo !== "Declined") return false;
    return true;
  });

  return (
    <>
      {/* ── Job Listings ── */}
      <section className="company-table-wrap">
        <div className="company-table-head jl-head-row">
          <div>
            <h3>Job Listings</h3>
            <span className="table-caption">Internships and jobs posted by your company</span>
          </div>
          <span className="jl-total-badge">{jobs.length} posting{jobs.length !== 1 ? "s" : ""}</span>
        </div>

        {jobs.length === 0 ? (
          <div className="jl-empty">
            <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#cbd5e1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
            <p>No job postings yet</p>
            <span>Post your first job to start receiving applications.</span>
          </div>
        ) : (
          <div className="jl-cards">
            {jobs.map((job) => {
              const isUpdating = statusUpdatingJobId === job.id;
              return (
                <div key={job.id} className={`jl-card${isUpdating ? " jl-card--updating" : ""}`}>
                  {/* Left: info */}
                  <div className="jl-card-info">
                    <div className="jl-card-title-row">
                      <span className="jl-card-title">{job.title}</span>
                      <span className={`jl-status-pill jl-status-pill--${job.status.toLowerCase()}`}>{job.status}</span>
                    </div>
                    <div className="jl-card-meta">
                      <span className="jl-tag jl-tag--type">
                        {job.opportunityType === "Internship" ? "🎓" : "💼"} {job.opportunityType}
                      </span>
                      <span className="jl-tag jl-tag--location">
                        {LOCATION_ICONS[job.locationType] ?? "📍"} {job.locationType}
                      </span>
                      {job.openings > 0 && (
                        <span className="jl-tag jl-tag--openings">
                          {job.openings} opening{job.openings !== 1 ? "s" : ""}
                        </span>
                      )}
                      <span className="jl-date">Posted {formatDate(job.createdAt)}</span>
                    </div>
                  </div>

                  {/* Center: stats */}
                  <div className="jl-card-stats">
                    <div className="jl-stat">
                      <span className="jl-stat-value">{job.totalViews.toLocaleString()}</span>
                      <span className="jl-stat-label">views</span>
                    </div>
                    <div className="jl-stat-divider" />
                    <div className="jl-stat">
                      <span className="jl-stat-value jl-stat-value--blue">{job.applications}</span>
                      <span className="jl-stat-label">applicants</span>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="jl-card-actions">
                    <button
                      type="button"
                      className="jl-btn jl-btn--primary"
                      onClick={() => onViewApplicants(job)}
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      Applications ({job.applications})
                    </button>
                    <button
                      type="button"
                      className="jl-btn jl-btn--invite"
                      onClick={() => openInviteModal(job)}
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      Invite College
                    </button>
                    {job.status === "Draft" && (
                      <button
                        type="button"
                        className="jl-btn jl-btn--publish"
                        onClick={() => onUpdateStatus(job.id, "Active")}
                        disabled={isUpdating}
                      >
                        {isUpdating ? "Publishing…" : "Publish"}
                      </button>
                    )}
                    {job.status === "Active" && (
                      <button
                        type="button"
                        className="jl-btn jl-btn--close"
                        onClick={() => onRequestClose(job)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? "Closing…" : "Close"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── College Invite History ── */}
      <section className="company-table-wrap" style={{ marginTop: 16 }}>
        <div className="company-table-head">
          <div className="jl-head-row">
            <div>
              <h3>College Invite History</h3>
              <span className="table-caption">Recent college invitations sent for your jobs</span>
            </div>
            <span className="jl-total-badge">{filteredInviteHistory.length} record{filteredInviteHistory.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="jl-filter-row">
            <div className="jl-filter-group">
              {(["all", "sent", "failed"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`jl-filter-chip${inviteFilter === v ? " jl-filter-chip--active" : ""}`}
                  onClick={() => setInviteFilter(v)}
                >
                  {v === "all" ? "All emails" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <div className="jl-filter-group">
              {(["all", "pending", "accepted", "declined"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`jl-filter-chip${tpoFilter === v ? " jl-filter-chip--active" : ""}`}
                  onClick={() => setTpoFilter(v)}
                >
                  TPO: {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredInviteHistory.length === 0 ? (
          <div className="jl-empty">
            <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#cbd5e1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <p>No invites in this filter</p>
            <span>Try a different filter or invite a college to get started.</span>
          </div>
        ) : (
          <div className="jl-invite-table-wrap">
            <table className="jl-invite-table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>College Email</th>
                  <th>Email Status</th>
                  <th>TPO Response</th>
                  <th>Stage</th>
                  <th>Deadline</th>
                  <th>Sent At</th>
                  <th>Decline Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInviteHistory.map((item) => {
                  const emailMeta = EMAIL_META[item.status] ?? EMAIL_META["Sent"];
                  const tpoKey = item.tpoResponse || "Pending";
                  const tpoMeta = TPO_META[tpoKey] ?? TPO_META["Pending"];
                  return (
                    <tr key={item.id}>
                      <td className="jl-invite-td jl-invite-td--job">
                        <span className="jl-invite-job">{item.jobTitle || item.jobId}</span>
                      </td>
                      <td className="jl-invite-td">
                        <span className="jl-invite-email">{item.collegeEmail}</span>
                      </td>
                      <td className="jl-invite-td">
                        <span className="jl-pill" style={{ color: emailMeta.color, background: emailMeta.bg }}>
                          {item.status}
                        </span>
                      </td>
                      <td className="jl-invite-td">
                        <span className="jl-pill" style={{ color: tpoMeta.color, background: tpoMeta.bg }}>
                          {tpoKey}
                        </span>
                      </td>
                      <td className="jl-invite-td jl-invite-td--muted">{item.recruitmentStage || "—"}</td>
                      <td className="jl-invite-td jl-invite-td--muted">{formatDate(item.applicationDeadline)}</td>
                      <td className="jl-invite-td jl-invite-td--muted">{formatDate(item.sentAt)}</td>
                      <td className="jl-invite-td jl-invite-td--muted jl-invite-td--decline">
                        {item.tpoResponse === "Declined" ? (item.declineReason || "—") : "—"}
                      </td>
                      <td className="jl-invite-td">
                        {item.status === "Failed" ? (
                          <button
                            type="button"
                            className="jl-btn jl-btn--resend"
                            onClick={() => void handleResend(item)}
                            disabled={resendingInviteId === item.id}
                          >
                            {resendingInviteId === item.id ? "Resending…" : "Resend"}
                          </button>
                        ) : (
                          <span className="jl-invite-td--muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Invite Modal ── */}
      {inviteModalJob ? (
        <div className="company-modal-backdrop" role="presentation" onClick={closeInviteModal}>
          <div className="jl-invite-modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="jl-invite-modal-head">
              <div>
                <h3 className="jl-invite-modal-title">Invite a College</h3>
                <p className="jl-invite-modal-sub">Sending for: <strong>{inviteModalJob.title}</strong></p>
              </div>
              <ModalCloseButton onClick={closeInviteModal} disabled={Boolean(invitingJobId)} />
            </div>
            <div className="jl-invite-modal-body">
              <label className="jl-invite-field">
                <span className="jl-invite-label">College name</span>
                <input
                  className="jl-invite-input"
                  type="text"
                  placeholder="e.g. IIT Delhi"
                  value={inviteCollegeName}
                  onChange={(e) => setInviteCollegeName(e.target.value)}
                />
              </label>
              <label className="jl-invite-field">
                <span className="jl-invite-label">TPO email address</span>
                <input
                  className="jl-invite-input"
                  type="email"
                  placeholder="tpo@college.edu"
                  value={inviteCollegeEmail}
                  onChange={(e) => setInviteCollegeEmail(e.target.value)}
                />
              </label>
            </div>
            <div className="jl-invite-modal-footer">
              <button
                type="button"
                className="jl-btn jl-btn--cancel"
                onClick={closeInviteModal}
                disabled={Boolean(invitingJobId)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="jl-btn jl-btn--primary"
                onClick={() => void handleInviteSubmit()}
                disabled={!inviteCollegeName.trim() || !inviteCollegeEmail.trim() || Boolean(invitingJobId)}
              >
                {invitingJobId ? "Sending…" : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

