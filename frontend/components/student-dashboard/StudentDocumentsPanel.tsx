"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StudentDocumentRequest } from "../../lib/api/student-documents";
import { listMyDocumentRequests, submitDocumentUpload } from "../../lib/api/student-documents";
import { uploadDocumentFile } from "../../lib/api/uploads";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  Pending:  { label: "Pending",  color: "#d97706", bg: "#fffbeb" },
  Partial:  { label: "Partial",  color: "#2563eb", bg: "#eff6ff" },
  Complete: { label: "Complete", color: "#16a34a", bg: "#f0fdf4" },
};

function DocStatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.Pending;
  return (
    <span className="sdoc-status-pill" style={{ color: m.color, background: m.bg }}>
      <span className="sdoc-status-dot" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

type DocRowProps = {
  requestId: string;
  docType: string;
  label: string;
  uploaded: boolean;
  fileUrl: string;
  onUploaded: (docType: string, fileUrl: string) => void;
};

function DocRow({ requestId, docType, label, uploaded, fileUrl, onUploaded }: DocRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localError, setLocalError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setLocalError("");
    try {
      const url = await uploadDocumentFile(file, requestId);
      await submitDocumentUpload({ requestId, docType, fileUrl: url });
      onUploaded(docType, url);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={`sdoc-doc-row${uploaded ? " sdoc-doc-row--done" : ""}`}>
      <div className="sdoc-doc-row-info">
        {uploaded ? (
          <span className="sdoc-doc-check sdoc-doc-check--done">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
        ) : (
          <span className="sdoc-doc-check sdoc-doc-check--pending">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </span>
        )}
        <span className="sdoc-doc-label">{label}</span>
      </div>

      <div className="sdoc-doc-row-action">
        {uploaded && fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sdoc-view-link"
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Uploaded
          </a>
        ) : null}
        <label className={`sdoc-upload-btn${isUploading ? " sdoc-upload-btn--loading" : ""}`}>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={handleFileChange}
            disabled={isUploading}
            style={{ display: "none" }}
          />
          {isUploading ? (
            <>
              <span className="sdoc-spinner" />
              Uploading…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {uploaded ? "Re-upload" : "Upload"}
            </>
          )}
        </label>
        {localError && <span className="sdoc-row-error">{localError}</span>}
      </div>
    </div>
  );
}

export function StudentDocumentsPanel() {
  const [requests, setRequests] = useState<StudentDocumentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const { requests: data } = await listMyDocumentRequests();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document requests.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  function handleDocUploaded(requestId: string, docType: string, fileUrl: string) {
    setRequests((prev) =>
      prev.map((req) => {
        if (req.requestId !== requestId) return req;
        const updatedDocs = req.documents.map((d) =>
          d.docType === docType ? { ...d, uploaded: true, fileUrl } : d,
        );
        const allDone = updatedDocs.every((d) => d.uploaded);
        const anyDone = updatedDocs.some((d) => d.uploaded);
        return {
          ...req,
          documents: updatedDocs,
          status: allDone ? "Complete" : anyDone ? "Partial" : "Pending",
        };
      }),
    );
  }

  if (isLoading) {
    return (
      <section className="company-table-wrap">
        <div className="sdoc-empty-state">
          <div className="sdoc-spinner sdoc-spinner--lg" />
          <p>Loading document requests…</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="company-table-wrap">
        <div className="sdoc-empty-state">
          <p className="sdoc-error">{error}</p>
          <button type="button" className="sdoc-reload-btn" onClick={() => void loadRequests()}>Try again</button>
        </div>
      </section>
    );
  }

  const pending = requests.filter((r) => r.status !== "Complete");
  const complete = requests.filter((r) => r.status === "Complete");

  return (
    <section className="company-table-wrap">
      <div className="sdoc-header">
        <div>
          <h3 className="sdoc-title">Document Uploads</h3>
          <p className="sdoc-subtitle">
            Companies you've been selected for may request specific documents before joining.
          </p>
        </div>
        {pending.length > 0 && (
          <span className="sdoc-pending-badge">{pending.length} pending</span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="sdoc-empty-state">
          <svg viewBox="0 0 64 64" width="52" height="52" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round">
            <rect x="10" y="8" width="44" height="52" rx="5"/>
            <line x1="20" y1="22" x2="44" y2="22"/>
            <line x1="20" y1="32" x2="44" y2="32"/>
            <line x1="20" y1="42" x2="36" y2="42"/>
          </svg>
          <p>No document requests yet</p>
          <span>When a company requests documents from you, they'll appear here.</span>
        </div>
      ) : (
        <div className="sdoc-request-list">
          {pending.length > 0 && (
            <>
              <div className="sdoc-section-label">Pending uploads</div>
              {pending.map((req) => (
                <RequestCard
                  key={req.requestId}
                  req={req}
                  onDocUploaded={(docType, url) => handleDocUploaded(req.requestId, docType, url)}
                />
              ))}
            </>
          )}

          {complete.length > 0 && (
            <>
              <div className="sdoc-section-label sdoc-section-label--done">Completed</div>
              {complete.map((req) => (
                <RequestCard
                  key={req.requestId}
                  req={req}
                  onDocUploaded={(docType, url) => handleDocUploaded(req.requestId, docType, url)}
                />
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function RequestCard({
  req,
  onDocUploaded,
}: {
  req: StudentDocumentRequest;
  onDocUploaded: (docType: string, url: string) => void;
}) {
  const doneCount = req.documents.filter((d) => d.uploaded).length;
  const totalCount = req.documents.length;

  return (
    <div className="sdoc-request-card">
      <div className="sdoc-request-card-header">
        <div className="sdoc-request-card-meta">
          <span className="sdoc-company-name">{req.companyName}</span>
          <span className="sdoc-job-title">{req.jobTitle}</span>
          {req.sentAt && (
            <span className="sdoc-sent-at">
              Requested {new Date(req.sentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
        <div className="sdoc-request-card-right">
          <DocStatusPill status={req.status} />
          <span className="sdoc-count">{doneCount}/{totalCount} uploaded</span>
        </div>
      </div>

      {req.note && (
        <div className="sdoc-note">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {req.note}
        </div>
      )}

      {/* Progress bar */}
      <div className="sdoc-progress-bar">
        <div
          className="sdoc-progress-fill"
          style={{ width: `${totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}%` }}
        />
      </div>

      <div className="sdoc-doc-list">
        {req.documents.map((doc) => (
          <DocRow
            key={doc.docType}
            requestId={req.requestId}
            docType={doc.docType}
            label={doc.label}
            uploaded={doc.uploaded}
            fileUrl={doc.fileUrl}
            onUploaded={onDocUploaded}
          />
        ))}
      </div>
    </div>
  );
}
