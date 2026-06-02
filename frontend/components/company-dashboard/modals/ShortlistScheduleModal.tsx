import { type FormEvent, useRef, useState } from "react";
import { ModalCloseButton } from "../../common/ModalCloseButton";

export type ShortlistScheduleFormPayload = {
  gmeetLink: string;
  scheduleAt: string;
  interviewerName: string;
  interviewerEmail: string;
  hrNotifyEmails: string;
  notes: string;
};

type ShortlistScheduleModalProps = {
  open: boolean;
  applicantName?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (payload: ShortlistScheduleFormPayload) => void | Promise<void>;
};

export function ShortlistScheduleModal({ open, applicantName, loading = false, onCancel, onConfirm }: ShortlistScheduleModalProps) {
  const [gmeetLink, setGmeetLink] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [interviewerName, setInterviewerName] = useState("");
  const [interviewerEmail, setInterviewerEmail] = useState("");
  const [hrNotifyEmails, setHrNotifyEmails] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const scheduleRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const link = gmeetLink.trim();
    if (!link || !scheduleAt) {
      setError("Please enter meeting link and interview date/time.");
      return;
    }
    onConfirm({
      gmeetLink: link,
      scheduleAt,
      interviewerName: interviewerName.trim(),
      interviewerEmail: interviewerEmail.trim(),
      hrNotifyEmails: hrNotifyEmails.trim(),
      notes: notes.trim(),
    });
  }

  function handleCancel() {
    setError("");
    setGmeetLink("");
    setScheduleAt("");
    setInterviewerName("");
    setInterviewerEmail("");
    setHrNotifyEmails("");
    setNotes("");
    onCancel();
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card modal-card--with-close interview-quick-schedule">
        <ModalCloseButton onClick={handleCancel} disabled={loading} />
        <h3>Schedule interview</h3>
        <p>Notify candidate, interviewer, and HR for {applicantName || "this applicant"}.</p>
        <form className="job-form-grid" onSubmit={handleSubmit}>
          <div className="job-form-row">
            <label>Google Meet / video link</label>
            <input value={gmeetLink} onChange={(event) => setGmeetLink(event.target.value)} placeholder="https://meet.google.com/..." />
          </div>
          <div className="job-form-row">
            <label>Interview date & time</label>
            <input
              ref={scheduleRef}
              type="datetime-local"
              value={scheduleAt}
              onChange={(event) => setScheduleAt(event.target.value)}
              onClick={() => scheduleRef.current?.showPicker?.()}
            />
          </div>
          <div className="job-form-dual">
            <div className="job-form-row">
              <label>Interviewer name</label>
              <input value={interviewerName} onChange={(e) => setInterviewerName(e.target.value)} placeholder="Optional" />
            </div>
            <div className="job-form-row">
              <label>Interviewer email</label>
              <input
                type="email"
                value={interviewerEmail}
                onChange={(e) => setInterviewerEmail(e.target.value)}
                placeholder="interviewer@company.com"
              />
            </div>
          </div>
          <div className="job-form-row">
            <label>HR team emails (comma-separated)</label>
            <input
              value={hrNotifyEmails}
              onChange={(e) => setHrNotifyEmails(e.target.value)}
              placeholder="hr@company.com, talent@company.com"
            />
          </div>
          <div className="job-form-row">
            <label>Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Round, panel, documents to bring…" />
          </div>
          {error ? <p className="error form-error">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="table-btn secondary" onClick={handleCancel} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="table-btn" disabled={loading}>
              {loading ? "Scheduling…" : "Schedule & notify"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

