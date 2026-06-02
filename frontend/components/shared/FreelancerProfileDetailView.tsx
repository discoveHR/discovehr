"use client";

import type { AdminFreelancerProfileDetail } from "../../lib/api/types";
import { frappeAssetUrl } from "../../lib/api/client";

type Props = {
  profile: AdminFreelancerProfileDetail;
  showAdminMeta?: boolean;
};

function formatWhen(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="freelancer-detail-row">
      <span className="freelancer-detail-label">{label}</span>
      <span className="freelancer-detail-value">{value}</span>
    </div>
  );
}

function FileLink({ label, file }: { label: string; file?: string }) {
  if (!file) return null;
  return (
    <p>
      <strong>{label}:</strong>{" "}
      <a href={frappeAssetUrl(file)} target="_blank" rel="noreferrer">
        View / download
      </a>
    </p>
  );
}

export function FreelancerProfileDetailView({ profile, showAdminMeta = false }: Props) {
  const status = profile.approvalStatus || "Pending";
  const statusClass =
    status === "Approved" ? "active" : status === "Rejected" ? "draft" : "pending";

  return (
    <div className="freelancer-profile-detail">
      <div className="freelancer-profile-detail-head">
        {profile.profilePhoto ? (
          <img
            src={frappeAssetUrl(profile.profilePhoto)}
            alt=""
            className="freelancer-profile-photo"
            width={80}
            height={80}
          />
        ) : null}
        <div>
          <h4>{profile.fullName || profile.freelancerUser}</h4>
          <p className="table-caption">
            {profile.email} · {profile.phone || "No phone"}
          </p>
          <span className={`status-pill ${statusClass}`}>{status}</span>
          {profile.profileComplete === false ? (
            <span className="status-pill draft" style={{ marginLeft: "0.5rem" }}>
              Incomplete
            </span>
          ) : null}
        </div>
      </div>

      {showAdminMeta ? (
        <section className="freelancer-detail-section">
          <h5>Registration</h5>
          <DetailRow label="Profile ID" value={profile.profileId} />
          <DetailRow label="User ID" value={profile.freelancerUser} />
          <DetailRow label="Registered" value={formatWhen(profile.registeredAt)} />
          <DetailRow label="Submitted" value={formatWhen(profile.submittedAt)} />
          <DetailRow label="Profile complete" value={profile.profileComplete ? "Yes" : "No"} />
          <DetailRow label="Consent given" value={profile.profileConsent ? "Yes" : "No"} />
          {profile.approvedAt ? <DetailRow label="Approved at" value={formatWhen(profile.approvedAt)} /> : null}
          {profile.approvedBy ? <DetailRow label="Approved by" value={profile.approvedBy} /> : null}
          {profile.rejectionReason ? <DetailRow label="Rejection reason" value={profile.rejectionReason} /> : null}
        </section>
      ) : null}

      <section className="freelancer-detail-section">
        <h5>Personal</h5>
        <DetailRow label="Date of birth" value={profile.dateOfBirth} />
        <DetailRow label="Gender" value={profile.gender} />
      </section>

      <section className="freelancer-detail-section">
        <h5>Address</h5>
        <DetailRow label="Address" value={profile.address} />
        <DetailRow
          label="City / State"
          value={[profile.city, profile.district, profile.state, profile.country].filter(Boolean).join(", ")}
        />
        <DetailRow label="PIN code" value={profile.pinCode} />
      </section>

      <section className="freelancer-detail-section">
        <h5>Professional</h5>
        <DetailRow label="Primary service" value={profile.primaryService} />
        <DetailRow label="Years of experience" value={profile.yearsOfExperience} />
        <DetailRow label="Hourly rate" value={profile.hourlyRate} />
        <DetailRow label="Availability" value={profile.availability} />
        <DetailRow label="Skills" value={profile.skills} />
        {profile.professionalSummary ? (
          <div className="freelancer-detail-row">
            <span className="freelancer-detail-label">Summary</span>
            <p className="freelancer-detail-value">{profile.professionalSummary}</p>
          </div>
        ) : null}
        {profile.workExperience ? (
          <div className="freelancer-detail-row">
            <span className="freelancer-detail-label">Work experience</span>
            <p className="freelancer-detail-value" style={{ whiteSpace: "pre-wrap" }}>
              {profile.workExperience}
            </p>
          </div>
        ) : null}
      </section>

      <section className="freelancer-detail-section">
        <h5>Online profiles</h5>
        {profile.linkedinProfile ? (
          <p>
            <strong>LinkedIn:</strong>{" "}
            <a href={profile.linkedinProfile} target="_blank" rel="noreferrer">
              {profile.linkedinProfile}
            </a>
          </p>
        ) : null}
        {profile.githubProfile ? (
          <p>
            <strong>GitHub:</strong>{" "}
            <a href={profile.githubProfile} target="_blank" rel="noreferrer">
              {profile.githubProfile}
            </a>
          </p>
        ) : null}
        {profile.portfolioWebsite ? (
          <p>
            <strong>Portfolio:</strong>{" "}
            <a href={profile.portfolioWebsite} target="_blank" rel="noreferrer">
              {profile.portfolioWebsite}
            </a>
          </p>
        ) : null}
        {!profile.linkedinProfile && !profile.githubProfile && !profile.portfolioWebsite ? (
          <p className="table-caption">No links provided.</p>
        ) : null}
      </section>

      <section className="freelancer-detail-section">
        <h5>Documents</h5>
        <FileLink label="Resume" file={profile.resumeFile} />
        <FileLink label="ID proof" file={profile.idProofFile} />
        {profile.documents && profile.documents.length > 0 ? (
          <table className="company-table" style={{ marginTop: "0.75rem" }}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {profile.documents.map((doc, i) => (
                <tr key={doc.name || i}>
                  <td>{doc.documentType}</td>
                  <td>{doc.description || "—"}</td>
                  <td>
                    {doc.file ? (
                      <a href={frappeAssetUrl(doc.file)} target="_blank" rel="noreferrer">
                        View file
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="table-caption">No additional documents uploaded.</p>
        )}
      </section>
    </div>
  );
}
