"use client";

import { useMemo, useState } from "react";
import type { ApplicationStatus, CompanyApplicantItem, PaginationMeta } from "../../../lib/api";
import { API_URL } from "../../../lib/api/client";
import { ModalCloseButton } from "../../common/ModalCloseButton";
import { DocumentRequestModal } from "../modals/DocumentRequestModal";
import { StudentProfileModal } from "../modals/StudentProfileModal";

type ApplicantsPanelProps = {
  applicants: CompanyApplicantItem[];
  jobs?: { id: string; title: string }[];
  selectedJobId?: string;
  selectedJobTitle?: string;
  isLoading?: boolean;
  updatingApplicationId?: string | null;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onJobChange?: (jobId: string | undefined) => void;
  onStatusChange: (applicationId: string, status: ApplicationStatus, feedback?: string) => void | Promise<void>;
};

const STATUS_OPTIONS: ApplicationStatus[] = ["In Review", "Shortlisted", "Rejected", "Selected"];

const STATUS_META: Record<string, { color: string; bg: string; dot: string }> = {
  "Submitted":   { color: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
  "In Review":   { color: "#d97706", bg: "#fffbeb", dot: "#f59e0b" },
  "Shortlisted": { color: "#2563eb", bg: "#eff6ff", dot: "#3b82f6" },
  "Rejected":    { color: "#dc2626", bg: "#fef2f2", dot: "#ef4444" },
  "Selected":    { color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
};

const AVATAR_COLORS = [
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#dcfce7", color: "#15803d" },
  { bg: "#fce7f3", color: "#be185d" },
  { bg: "#fef3c7", color: "#b45309" },
  { bg: "#ede9fe", color: "#6d28d9" },
  { bg: "#e0f2fe", color: "#0369a1" },
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function resumeViewerUrl(resumeFile: string) {
  if (!resumeFile) return "";
  if (resumeFile.startsWith("http")) return resumeFile;
  return `${API_URL}${resumeFile.startsWith("/") ? "" : "/"}${resumeFile}`;
}

function isPdfResume(url: string) {
  return url.toLowerCase().includes(".pdf");
}

function formatAppliedOn(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

const APPLICATION_STATUSES = ["Submitted", "In Review", "Shortlisted", "Rejected", "Selected"] as const;

export function ApplicantsPanel({
  applicants,
  jobs,
  selectedJobId,
  selectedJobTitle,
  isLoading,
  updatingApplicationId,
  pagination,
  onPageChange,
  onJobChange,
  onStatusChange,
}: ApplicantsPanelProps) {
  const [profileTarget, setProfileTarget] = useState<CompanyApplicantItem | null>(null);
  const [resumeTarget, setResumeTarget] = useState<CompanyApplicantItem | null>(null);
  const [docRequestTarget, setDocRequestTarget] = useState<CompanyApplicantItem | null>(null);
  const [docRequestToast, setDocRequestToast] = useState("");
  const [feedbackByApp, setFeedbackByApp] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState("");

  const rankedApplicants = useMemo(() => {
    let list = [...applicants].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    if (statusFilter) list = list.filter((a) => a.status === statusFilter);
    return list;
  }, [applicants, statusFilter]);

  const resumeUrl = resumeTarget?.resumeFile ? resumeViewerUrl(resumeTarget.resumeFile) : "";

  return (
    <section className="company-table-wrap">
      {/* Header */}
      <div className="company-table-head">
        <div className="applicants-head-row">
          <div>
            <h3>Applicants</h3>
            <span className="table-caption">
              {selectedJobTitle
                ? `Showing applicants for "${selectedJobTitle}"`
                : "All applicants ranked by score"}
              {statusFilter ? ` · status: ${statusFilter}` : ""}
              {pagination && pagination.total > 0
                ? ` · ${pagination.total.toLocaleString()} total, page ${pagination.page} of ${pagination.totalPages}`
                : ""}
            </span>
          </div>
          {rankedApplicants.length > 0 && (
            <span className="applicant-count-badge">{rankedApplicants.length} applicant{rankedApplicants.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {/* Filter bar */}
        <div className="applicants-filter-bar">
          {jobs && jobs.length > 0 && (
            <select
              className="applicants-filter-select"
              value={selectedJobId || ""}
              onChange={(e) => { onJobChange?.(e.target.value || undefined); }}
            >
              <option value="">All jobs</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          )}
          <select
            className="applicants-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {(selectedJobId || statusFilter) && (
            <button
              type="button"
              className="applicants-filter-clear"
              onClick={() => { onJobChange?.(undefined); setStatusFilter(""); }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* States */}
      {isLoading ? (
        <div className="applicants-loading">
          <div className="applicants-loading-spinner" />
          <span>Loading applicants…</span>
        </div>
      ) : rankedApplicants.length === 0 ? (
        <div className="applicants-empty">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#cbd5e1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p>No applicants yet</p>
          <span>Candidates who apply to your job postings will appear here.</span>
        </div>
      ) : (
        <>
          {/* Column header row */}
          <div className="applicant-col-header">
            <span style={{ minWidth: 36 }} />
            <span style={{ width: 40 }} />
            <span className="applicant-col-label" style={{ flex: 1 }}>Candidate</span>
            <span className="applicant-col-label" style={{ minWidth: 110 }}>Status</span>
            <span className="applicant-col-label" style={{ minWidth: 180, maxWidth: 220 }}>Notes / Feedback</span>
            <span className="applicant-col-label" style={{ minWidth: 120 }}>Decision</span>
          </div>

          {/* Cards */}
          <div className="applicant-cards">
            {rankedApplicants.map((item) => {
              const statusMeta = STATUS_META[item.status] ?? STATUS_META["Submitted"];
              const av = avatarColor(item.studentName ?? "?");
              const isUpdating = updatingApplicationId === item.applicationId;

              return (
                <div key={item.applicationId} className={`applicant-card${isUpdating ? " applicant-card--updating" : ""}`}>
                  {/* Rank */}
                  <div className="applicant-rank">
                    <span className="applicant-rank-num">#{item.rank ?? "—"}</span>
                  </div>

                  {/* Avatar */}
                  <div className="applicant-avatar" style={{ background: av.bg, color: av.color }}>
                    {getInitials(item.studentName ?? "?")}
                  </div>

                  {/* Info */}
                  <div className="applicant-info">
                    <div className="applicant-name">{item.studentName}</div>
                    <div className="applicant-email">{item.studentEmail}</div>
                    <div className="applicant-meta-row">
                      {item.jobTitle && (
                        <span className="applicant-job-tag">{item.jobTitle}</span>
                      )}
                      <span className="applicant-date">
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {formatAppliedOn(item.appliedOn)}
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="applicant-status-col">
                    <span className="applicant-status-badge" style={{ background: statusMeta.bg, color: statusMeta.color }}>
                      <span className="applicant-status-dot" style={{ background: statusMeta.dot }} />
                      {item.status}
                    </span>
                  </div>

                  {/* Feedback */}
                  <div className="applicant-feedback-col">
                    <textarea
                      rows={2}
                      className="applicant-feedback-input"
                      value={feedbackByApp[item.applicationId] ?? item.companyFeedback ?? ""}
                      onChange={(e) =>
                        setFeedbackByApp((prev) => ({ ...prev, [item.applicationId]: e.target.value }))
                      }
                      placeholder="Add notes or feedback…"
                    />
                  </div>

                  {/* Actions */}
                  <div className="applicant-actions">
                    <div className="applicant-action-btns">
                      <button
                        type="button"
                        className="applicant-btn applicant-btn--profile"
                        onClick={() => setProfileTarget(item)}
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                        </svg>
                        Profile
                      </button>
                      {item.resumeFile ? (
                        <button
                          type="button"
                          className="applicant-btn applicant-btn--resume"
                          onClick={() => setResumeTarget(item)}
                        >
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          Resume
                        </button>
                      ) : (
                        <span className="applicant-no-resume">No resume</span>
                      )}
                      {(item.status === "Selected" || item.status === "Shortlisted") && (
                        <button
                          type="button"
                          className="applicant-btn applicant-btn--docs"
                          onClick={() => setDocRequestTarget(item)}
                          title="Request documents from this candidate"
                        >
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                          </svg>
                          Request Docs
                        </button>
                      )}
                    </div>
                    <select
                      className="applicant-decision-select"
                      value={item.status}
                      disabled={isUpdating}
                      onChange={(e) =>
                        void onStatusChange(
                          item.applicationId,
                          e.target.value as ApplicationStatus,
                          feedbackByApp[item.applicationId] ?? item.companyFeedback,
                        )
                      }
                      style={{ borderColor: statusMeta.dot + "88", color: statusMeta.color }}
                    >
                      <option value="Submitted">Submitted</option>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && onPageChange ? (
        <div className="applicants-pagination">
          <button
            type="button"
            className="applicant-page-btn"
            disabled={(isLoading ?? false) || pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            ← Previous
          </button>
          <span className="applicants-page-info">Page {pagination.page} of {pagination.totalPages}</span>
          <button
            type="button"
            className="applicant-page-btn"
            disabled={(isLoading ?? false) || pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next →
          </button>
        </div>
      ) : null}

      {/* Modals */}
      {docRequestTarget ? (
        <DocumentRequestModal
          applicationId={docRequestTarget.applicationId}
          studentName={docRequestTarget.studentName}
          onClose={() => setDocRequestTarget(null)}
          onSuccess={(msg) => { setDocRequestToast(msg); window.setTimeout(() => setDocRequestToast(""), 4000); }}
        />
      ) : null}

      {docRequestToast ? (
        <div className="doc-req-toast">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {docRequestToast}
        </div>
      ) : null}

      {profileTarget ? (
        <StudentProfileModal applicant={profileTarget} onClose={() => setProfileTarget(null)} />
      ) : null}

      {resumeTarget && resumeUrl ? (
        <div className="company-modal-backdrop" role="presentation" onClick={() => setResumeTarget(null)}>
          <div className="company-modal company-modal-wide" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="company-modal-head">
              <h4>Resume — {resumeTarget.studentName}</h4>
              <ModalCloseButton onClick={() => setResumeTarget(null)} variant="inline" ariaLabel="Close resume preview" />
            </div>
            <p className="table-caption">In-app preview only. Download is disabled for recruiters.</p>
            {isPdfResume(resumeUrl) ? (
              <iframe title={`Resume ${resumeTarget.studentName}`} className="resume-preview-frame" src={resumeUrl} />
            ) : (
              <p className="empty-state">Preview available for PDF resumes. Ask the candidate for an updated PDF upload.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

