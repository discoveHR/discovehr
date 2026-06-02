"use client";

import { useState } from "react";
import { requestDocuments } from "../../../lib/api";

export const DOCUMENT_TYPES = [
  { id: "internship_certificate", label: "Internship Certificate",  icon: "📋" },
  { id: "aadhar_card",            label: "Aadhar Card",              icon: "🪪" },
  { id: "10th_certificate",       label: "10th Certificate (SSC)",   icon: "📄" },
  { id: "12th_certificate",       label: "12th Certificate (+2/HSC)", icon: "📄" },
  { id: "degree_certificate",     label: "Degree Certificate",       icon: "🎓" },
  { id: "resume",                 label: "Resume / CV",              icon: "📝" },
  { id: "passport_photo",         label: "Passport Size Photo",      icon: "🖼️" },
  { id: "experience_letter",      label: "Experience Letter",        icon: "💼" },
  { id: "bank_passbook",          label: "Bank Passbook / Cancelled Cheque", icon: "🏦" },
];

type DocumentRequestModalProps = {
  applicationId: string;
  studentName: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
};

export function DocumentRequestModal({
  applicationId,
  studentName,
  onClose,
  onSuccess,
}: DocumentRequestModalProps) {
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [note, setNote]           = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState("");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSend() {
    if (selected.size === 0) {
      setError("Please select at least one document.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const result = await requestDocuments({
        applicationId,
        requiredDocuments: Array.from(selected),
        note: note.trim(),
      });
      onSuccess(result.message || "Document request sent successfully.");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send document request.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="company-modal-backdrop" onClick={onClose}>
      <div className="doc-req-modal" onClick={(e) => e.stopPropagation()}>

        <div className="doc-req-modal-header">
          <div className="doc-req-modal-title">
            <span className="doc-req-modal-icon">📤</span>
            <div>
              <h3>Request Documents</h3>
              <p>Select documents required from <strong>{studentName}</strong></p>
            </div>
          </div>
          <button type="button" className="doc-req-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="doc-req-modal-body">
          <p className="doc-req-modal-caption">
            The student will be notified by email and in their portal. They must upload the checked documents before joining.
          </p>

          <div className="doc-req-checklist">
            {DOCUMENT_TYPES.map((doc) => {
              const checked = selected.has(doc.id);
              return (
                <label key={doc.id} className={`doc-req-item${checked ? " doc-req-item--checked" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(doc.id)}
                    className="doc-req-checkbox"
                  />
                  <span className="doc-req-item-icon">{doc.icon}</span>
                  <span className="doc-req-item-label">{doc.label}</span>
                  {checked && (
                    <span className="doc-req-item-tick">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <div className="doc-req-selected-count">
            {selected.size} document{selected.size !== 1 ? "s" : ""} selected
          </div>

          <div className="doc-req-note-wrap">
            <label className="doc-req-note-label">Additional note for student (optional)</label>
            <textarea
              className="doc-req-note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Please upload clear, legible scans. Aadhar must show both sides."
              rows={2}
            />
          </div>

          {error && <p className="doc-req-error">{error}</p>}
        </div>

        <div className="doc-req-modal-footer">
          <button type="button" className="doc-req-btn-cancel" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            type="button"
            className="doc-req-btn-send"
            onClick={handleSend}
            disabled={isLoading || selected.size === 0}
          >
            {isLoading ? "Sending…" : (
              <>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Send Request
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

