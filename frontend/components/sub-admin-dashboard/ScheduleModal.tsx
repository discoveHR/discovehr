"use client";

import { type FormEvent, useState } from "react";
import { scheduleInterviewAsSubAdmin, type SubAdminApplicantItem, type ScheduleSubAdminInterviewPayload } from "../../lib/api";

type Props = {
  applicant: SubAdminApplicantItem;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
};

const INTERVIEW_TYPES = ["Video", "In-person", "Phone"] as const;

export function ScheduleModal({ applicant, onClose, onSuccess, onError }: Props) {
  const [form, setForm] = useState({
    interviewType: "Video" as "Video" | "In-person" | "Phone",
    startDatetime: "",
    endDatetime: "",
    meetingLink: "",
    location: "",
    interviewerName: "",
    interviewerEmail: "",
    hrNotifyEmails: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.startDatetime) { setFormError("Start date/time is required."); return; }
    if (form.interviewType === "Video" && !form.meetingLink) { setFormError("Meeting link is required for video interviews."); return; }
    if (form.interviewType === "In-person" && !form.location) { setFormError("Location is required for in-person interviews."); return; }

    setIsSubmitting(true);
    try {
      const payload: ScheduleSubAdminInterviewPayload = {
        applicationId: applicant.applicationId,
        interviewType: form.interviewType,
        startDatetime: form.startDatetime,
        endDatetime: form.endDatetime || undefined,
        meetingLink: form.meetingLink || undefined,
        location: form.location || undefined,
        interviewerName: form.interviewerName || undefined,
        interviewerEmail: form.interviewerEmail || undefined,
        hrNotifyEmails: form.hrNotifyEmails || undefined,
        notes: form.notes || undefined,
      };
      const msg = await scheduleInterviewAsSubAdmin(payload);
      onSuccess(msg);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to schedule interview.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="sub-admin-modal-backdrop" onClick={onClose}>
      <div className="sub-admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sub-admin-modal-header">
          <div>
            <h3>Schedule Interview</h3>
            <p className="sub-admin-modal-sub">
              {applicant.fullName} · {applicant.jobTitle}
            </p>
          </div>
          <button type="button" className="sub-admin-modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="sub-admin-schedule-form">
          <div className="sub-admin-form-grid">
            <div className="sub-admin-field">
              <label className="sub-admin-label">Interview Type</label>
              <select
                className="sub-admin-input"
                value={form.interviewType}
                onChange={(e) => setField("interviewType", e.target.value as typeof form.interviewType)}
              >
                {INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="sub-admin-field">
              <label className="sub-admin-label">Start Date & Time</label>
              <input
                className="sub-admin-input"
                type="datetime-local"
                value={form.startDatetime}
                onChange={(e) => setField("startDatetime", e.target.value)}
                required
              />
            </div>

            <div className="sub-admin-field">
              <label className="sub-admin-label">End Date & Time</label>
              <input
                className="sub-admin-input"
                type="datetime-local"
                value={form.endDatetime}
                onChange={(e) => setField("endDatetime", e.target.value)}
              />
            </div>

            {form.interviewType === "Video" && (
              <div className="sub-admin-field">
                <label className="sub-admin-label">Meeting Link</label>
                <input
                  className="sub-admin-input"
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={form.meetingLink}
                  onChange={(e) => setField("meetingLink", e.target.value)}
                  required
                />
              </div>
            )}

            {form.interviewType === "In-person" && (
              <div className="sub-admin-field">
                <label className="sub-admin-label">Location / Venue</label>
                <input
                  className="sub-admin-input"
                  type="text"
                  placeholder="e.g. Office, 3rd Floor, Pune"
                  value={form.location}
                  onChange={(e) => setField("location", e.target.value)}
                  required
                />
              </div>
            )}

            <div className="sub-admin-field">
              <label className="sub-admin-label">Interviewer Name</label>
              <input
                className="sub-admin-input"
                type="text"
                placeholder="Optional"
                value={form.interviewerName}
                onChange={(e) => setField("interviewerName", e.target.value)}
              />
            </div>

            <div className="sub-admin-field">
              <label className="sub-admin-label">Interviewer Email</label>
              <input
                className="sub-admin-input"
                type="email"
                placeholder="Optional"
                value={form.interviewerEmail}
                onChange={(e) => setField("interviewerEmail", e.target.value)}
              />
            </div>

            <div className="sub-admin-field" style={{ gridColumn: "1 / -1" }}>
              <label className="sub-admin-label">Notes / Instructions</label>
              <textarea
                className="sub-admin-input sub-admin-textarea"
                placeholder="Optional: round details, preparation tips…"
                rows={3}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </div>
          </div>

          {formError && <p className="sub-admin-error">{formError}</p>}

          <div className="sub-admin-form-actions">
            <button type="button" className="table-btn secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="table-btn" disabled={isSubmitting}>
              {isSubmitting ? "Scheduling…" : "Schedule Interview"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
