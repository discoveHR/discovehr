"use client";

import { FormEvent, useState } from "react";
import {
  updateFreelancerProfile,
  uploadFreelancerFile,
  uploadFreelancerPhoto,
  uploadFreelancerResume,
  type FreelancerDocumentRow,
  type FreelancerProfileData,
} from "../../lib/api";

const DOCUMENT_TYPES = [
  "Experience Certificate",
  "Education Certificate",
  "Portfolio",
  "Other",
] as const;

type Props = {
  userId: string;
  profile: FreelancerProfileData;
  onSaved: (profile: FreelancerProfileData) => void;
};

export function FreelancerProfilePanel({ userId, profile, onSaved }: Props) {
  const locked = Boolean(profile.profileLocked || profile.profileSubmitted);
  const [form, setForm] = useState<FreelancerProfileData>(profile);
  const [documents, setDocuments] = useState<FreelancerDocumentRow[]>(profile.documents || []);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState("");

  function patch<K extends keyof FreelancerProfileData>(key: K, value: FreelancerProfileData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleUpload(
    kind: "resume" | "id" | "photo" | "doc",
    file: File,
    docIndex?: number,
  ) {
    setUploading(kind);
    setError("");
    try {
      let url: string;
      if (kind === "resume") {
        url = await uploadFreelancerResume(file, userId);
        patch("resumeFile", url);
      } else if (kind === "photo") {
        url = await uploadFreelancerPhoto(file, userId);
        patch("profilePhoto", url);
      } else if (kind === "id") {
        url = await uploadFreelancerFile(file, userId);
        patch("idProofFile", url);
      } else {
        url = await uploadFreelancerFile(file, userId);
        if (docIndex === undefined) return;
        setDocuments((rows) =>
          rows.map((row, i) => (i === docIndex ? { ...row, file: url } : row)),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading("");
    }
  }

  function addDocumentRow() {
    setDocuments((rows) => [...rows, { documentType: "Experience Certificate", file: "", description: "" }]);
  }

  async function save(finalize: boolean) {
    setError("");
    setSuccess("");
    if (finalize) setIsSubmitting(true);
    else setIsSaving(true);
    try {
      const payload: FreelancerProfileData = {
        ...form,
        documents,
        profileConsent: Boolean(form.profileConsent),
      };
      const updated = await updateFreelancerProfile(payload, finalize);
      onSaved(updated);
      setForm(updated);
      setDocuments(updated.documents || []);
      setSuccess(finalize ? "Profile submitted. An administrator will review your application." : "Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void save(false);
  }

  const statusLabel = profile.profileSubmitted
    ? profile.approvalStatus === "Approved"
      ? "Approved — you can apply to jobs."
      : profile.approvalStatus === "Rejected"
        ? `Rejected${profile.rejectionReason ? `: ${profile.rejectionReason}` : ""}`
        : "Submitted — pending admin approval."
    : "Draft — complete all sections and submit when ready.";

  return (
    <div className="tpo-panel">
      <div className="company-table-head">
        <h3>Freelancer interviewer profile</h3>
        <span className="table-caption">{statusLabel}</span>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}
      {locked ? (
        <p className="table-caption">
          Your profile is locked after submission. You cannot edit it unless an administrator rejects it and asks you
          to resubmit.
        </p>
      ) : null}

      <form className="student-profile-form" onSubmit={onSubmit}>
        <fieldset disabled={locked}>
          <h4>Personal details</h4>
          <div className="form-grid">
            <label>
              Full name *
              <input value={form.fullName || ""} onChange={(e) => patch("fullName", e.target.value)} required />
            </label>
            <label>
              Email
              <input value={form.email || ""} readOnly />
            </label>
            <label>
              Phone *
              <input value={form.phone || ""} onChange={(e) => patch("phone", e.target.value)} required />
            </label>
            <label>
              Date of birth *
              <input type="date" value={form.dateOfBirth || ""} onChange={(e) => patch("dateOfBirth", e.target.value)} />
            </label>
            <label>
              Gender *
              <select value={form.gender || ""} onChange={(e) => patch("gender", e.target.value)}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </label>
            <label>
              Profile photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={!!uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload("photo", file);
                }}
              />
              {form.profilePhoto ? <span className="table-caption">Uploaded</span> : null}
            </label>
          </div>

          <h4>Address</h4>
          <div className="form-grid">
            <label className="full-width">
              Address *
              <textarea value={form.address || ""} onChange={(e) => patch("address", e.target.value)} rows={2} />
            </label>
            <label>
              City *
              <input value={form.city || ""} onChange={(e) => patch("city", e.target.value)} />
            </label>
            <label>
              District
              <input value={form.district || ""} onChange={(e) => patch("district", e.target.value)} />
            </label>
            <label>
              State *
              <input value={form.state || ""} onChange={(e) => patch("state", e.target.value)} />
            </label>
            <label>
              Country *
              <input value={form.country || "India"} onChange={(e) => patch("country", e.target.value)} />
            </label>
            <label>
              PIN code *
              <input value={form.pinCode || ""} onChange={(e) => patch("pinCode", e.target.value)} />
            </label>
          </div>

          <h4>Professional</h4>
          <div className="form-grid">
            <label className="full-width">
              Professional summary *
              <textarea
                value={form.professionalSummary || ""}
                onChange={(e) => patch("professionalSummary", e.target.value)}
                rows={3}
              />
            </label>
            <label>
              Skills *
              <input value={form.skills || ""} onChange={(e) => patch("skills", e.target.value)} />
            </label>
            <label>
              Years of experience *
              <input
                value={form.yearsOfExperience || ""}
                onChange={(e) => patch("yearsOfExperience", e.target.value)}
              />
            </label>
            <label>
              Primary service / role *
              <input value={form.primaryService || ""} onChange={(e) => patch("primaryService", e.target.value)} />
            </label>
            <label>
              Expected rate
              <input value={form.hourlyRate || ""} onChange={(e) => patch("hourlyRate", e.target.value)} />
            </label>
            <label>
              Availability
              <select value={form.availability || ""} onChange={(e) => patch("availability", e.target.value)}>
                <option value="">Select</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Project-based">Project-based</option>
                <option value="Flexible">Flexible</option>
              </select>
            </label>
            <label>
              LinkedIn
              <input value={form.linkedinProfile || ""} onChange={(e) => patch("linkedinProfile", e.target.value)} />
            </label>
            <label>
              GitHub
              <input value={form.githubProfile || ""} onChange={(e) => patch("githubProfile", e.target.value)} />
            </label>
            <label>
              Portfolio website
              <input value={form.portfolioWebsite || ""} onChange={(e) => patch("portfolioWebsite", e.target.value)} />
            </label>
          </div>

          <h4>Work experience</h4>
          <label className="full-width">
            Describe your experience *
            <textarea
              value={form.workExperience || ""}
              onChange={(e) => patch("workExperience", e.target.value)}
              rows={4}
            />
          </label>

          <h4>Documents</h4>
          <div className="form-grid">
            <label>
              Resume (PDF/DOC) *
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                disabled={!!uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload("resume", file);
                }}
              />
              {form.resumeFile ? <span className="table-caption">Uploaded</span> : null}
            </label>
            <label>
              ID proof *
              <input
                type="file"
                disabled={!!uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload("id", file);
                }}
              />
              {form.idProofFile ? <span className="table-caption">Uploaded</span> : null}
            </label>
          </div>

          <div className="company-table-head">
            <h4>Certificates & other documents</h4>
            <span className="table-caption">At least one experience certificate is required before submit.</span>
          </div>
          {documents.map((doc, index) => (
            <div key={index} className="form-grid document-row">
              <label>
                Type
                <select
                  value={doc.documentType}
                  onChange={(e) =>
                    setDocuments((rows) =>
                      rows.map((r, i) => (i === index ? { ...r, documentType: e.target.value } : r)),
                    )
                  }
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <input
                  value={doc.description || ""}
                  onChange={(e) =>
                    setDocuments((rows) =>
                      rows.map((r, i) => (i === index ? { ...r, description: e.target.value } : r)),
                    )
                  }
                />
              </label>
              <label>
                File *
                <input
                  type="file"
                  disabled={!!uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload("doc", file, index);
                  }}
                />
                {doc.file ? <span className="table-caption">Uploaded</span> : null}
              </label>
              {!locked ? (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setDocuments((rows) => rows.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          {!locked ? (
            <button type="button" className="btn secondary" onClick={addDocumentRow}>
              Add document
            </button>
          ) : null}

          <label className="consent-row">
            <input
              type="checkbox"
              checked={Boolean(form.profileConsent)}
              onChange={(e) => patch("profileConsent", e.target.checked)}
            />
            I confirm that the information and documents provided are accurate. *
          </label>
        </fieldset>

        {!locked ? (
          <div className="form-actions">
            <button type="submit" className="btn secondary" disabled={isSaving || isSubmitting}>
              {isSaving ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={isSaving || isSubmitting}
              onClick={() => void save(true)}
            >
              {isSubmitting ? "Submitting…" : "Submit profile (lock editing)"}
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
