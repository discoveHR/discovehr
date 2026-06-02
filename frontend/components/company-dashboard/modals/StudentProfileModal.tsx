"use client";

import type { ReactNode } from "react";
import type { CompanyApplicantItem } from "../../../lib/api";
import { ModalCloseButton } from "../../common/ModalCloseButton";

type StudentProfileModalProps = {
  applicant: CompanyApplicantItem;
  onClose: () => void;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function parseSkills(raw?: string) {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function statusTone(status: CompanyApplicantItem["status"]) {
  switch (status) {
    case "Shortlisted":
      return "shortlisted";
    case "Selected":
      return "selected";
    case "Rejected":
      return "rejected";
    case "In Review":
      return "review";
    default:
      return "submitted";
  }
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="student-profile-detail">
      <span className="student-profile-detail-label">{label}</span>
      <span className="student-profile-detail-value">{value}</span>
    </div>
  );
}

export function StudentProfileModal({ applicant, onClose }: StudentProfileModalProps) {
  const skills = parseSkills(applicant.skills);
  const tone = statusTone(applicant.status);

  return (
    <div
      className="company-modal-backdrop student-profile-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="student-profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-profile-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="student-profile-hero">
          <ModalCloseButton onClick={onClose} ariaLabel="Close profile" variant="light" />
          <div className="student-profile-hero-main">
            <div className="student-profile-avatar" aria-hidden>
              {initials(applicant.studentName)}
            </div>
            <div className="student-profile-identity">
              <h4 id="student-profile-title">{applicant.studentName}</h4>
              <p className="student-profile-email">{applicant.studentEmail}</p>
              <div className="student-profile-badges">
                <span className={`student-profile-status student-profile-status--${tone}`}>
                  {applicant.status}
                </span>
                {applicant.rank != null ? (
                  <span className="student-profile-rank">Rank #{applicant.rank}</span>
                ) : null}
              </div>
            </div>
          </div>
          <p className="student-profile-job">
            Applied for <strong>{applicant.jobTitle}</strong>
            {applicant.appliedOn ? <span> · {applicant.appliedOn}</span> : null}
          </p>
        </header>

        <div className="student-profile-metrics">
          <div className="student-profile-metric">
            <span className="student-profile-metric-value">
              {applicant.priScore != null ? applicant.priScore.toFixed(0) : "—"}
            </span>
            <span className="student-profile-metric-label">PRI score</span>
          </div>
          <div className="student-profile-metric">
            <span className="student-profile-metric-value">
              {applicant.psychometricScore != null ? applicant.psychometricScore.toFixed(0) : "—"}
            </span>
            <span className="student-profile-metric-label">Psychometric</span>
            {applicant.psychometricTitle ? (
              <span className="student-profile-metric-sub">{applicant.psychometricTitle}</span>
            ) : null}
          </div>
          <div className="student-profile-metric">
            <span className="student-profile-metric-value">{applicant.branch || "—"}</span>
            <span className="student-profile-metric-label">Branch</span>
            {applicant.batch ? (
              <span className="student-profile-metric-sub">Batch {applicant.batch}</span>
            ) : null}
          </div>
        </div>

        <div className="student-profile-body">
          <section className="student-profile-section">
            <h5>Contact</h5>
            <div className="student-profile-grid">
              <DetailItem label="Email" value={applicant.studentEmail} />
              <DetailItem label="Phone" value={applicant.phone || "Not provided"} />
            </div>
          </section>

          <section className="student-profile-section">
            <h5>Academic</h5>
            <div className="student-profile-grid">
              <DetailItem label="Branch" value={applicant.branch || "—"} />
              <DetailItem label="Batch" value={applicant.batch || "—"} />
            </div>
          </section>

          <section className="student-profile-section student-profile-section--full">
            <h5>Skills</h5>
            {skills.length > 0 ? (
              <ul className="student-profile-skills">
                {skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            ) : (
              <p className="student-profile-empty">No skills listed on profile.</p>
            )}
          </section>
        </div>

      </div>
    </div>
  );
}

