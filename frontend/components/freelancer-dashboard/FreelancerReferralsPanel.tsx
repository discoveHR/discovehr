"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listOpenJobsForReferral,
  listMyReferrals,
  submitCsvReferrals,
  exportMyReferrals,
  downloadCsvBlob,
  parseCsvCandidates,
  type ReferralJobOption,
  type FreelancerReferralRow,
  type CsvCandidate,
} from "../../lib/api/freelancer-referrals";

const STATUS_COLORS: Record<string, string> = {
  Pending: "draft",
  Contacted: "active",
  Applied: "active",
  Rejected: "closed",
};

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

const CSV_TEMPLATE = "name,email,phone\nJohn Doe,john@example.com,9000000001\nJane Smith,jane@example.com,9000000002\n";

export function FreelancerReferralsPanel() {
  const [jobs, setJobs] = useState<ReferralJobOption[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [csvError, setCsvError] = useState("");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<CsvCandidate[]>([]);
  const [fileName, setFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [referrals, setReferrals] = useState<FreelancerReferralRow[]>([]);
  const [referralPage, setReferralPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingReferrals, setLoadingReferrals] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const jobList = await listOpenJobsForReferral();
        setJobs(jobList);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load jobs.");
      } finally {
        setLoadingJobs(false);
      }
    })();
  }, []);

  const loadReferrals = useCallback(async (p = 1) => {
    setLoadingReferrals(true);
    try {
      const result = await listMyReferrals({ page: p, pageSize: 50 });
      setReferrals(result.referrals);
      setReferralPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
      setTotalReferrals(result.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load referrals.");
    } finally {
      setLoadingReferrals(false);
    }
  }, []);

  useEffect(() => { void loadReferrals(1); }, [loadReferrals]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setCsvError("");
    setParseErrors([]);
    setCandidates([]);
    setSubmitResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { candidates: parsed, errors } = parseCsvCandidates(text);
      if (errors.length > 0 && parsed.length === 0) {
        setCsvError(errors[0]);
        return;
      }
      setCandidates(parsed);
      setParseErrors(errors.slice(0, 5));
    };
    reader.readAsText(file);
  }

  async function handleSubmit() {
    if (!selectedJobId) { setCsvError("Please select a job first."); return; }
    if (candidates.length === 0) { setCsvError("No valid candidates to upload."); return; }

    setIsSubmitting(true);
    setSubmitResult(null);
    setCsvError("");
    try {
      const result = await submitCsvReferrals(selectedJobId, candidates);
      setSubmitResult(result);
      setCandidates([]);
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      void loadReferrals(1);
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "referral_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const rows = await exportMyReferrals();
      if (rows.length === 0) { setError("No referrals to download."); return; }
      const header = ["Referral ID", "Job ID", "Job Title", "Candidate Name", "Email", "Phone", "Status", "Notes", "Referred On"];
      const data = rows.map((r) => [r.referralId, r.jobId, r.jobTitle, r.candidateName, r.candidateEmail, r.candidatePhone, r.status, r.notes, r.uploadedAt]);
      downloadCsvBlob([header, ...data], `my-referrals-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="sub-admin-panel">
      <div className="sub-admin-panel-header">
        <div>
          <h2 className="sub-admin-panel-title">Refer Candidates</h2>
          <p className="sub-admin-panel-sub">Upload a CSV of candidates for a job posting. Each candidate will be tagged as referred by you.</p>
        </div>
        <span className="sub-admin-count-chip">{totalReferrals} total referred</span>
      </div>

      {error ? <p className="error" style={{ marginBottom: "1rem" }}>{error}</p> : null}

      {/* Upload form */}
      <div className="tpo-panel" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "1rem", fontSize: "0.95rem", fontWeight: 600 }}>Upload CSV</h3>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "1rem" }}>
          <div style={{ flex: "1 1 260px" }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, marginBottom: "0.35rem", opacity: 0.7 }}>
              Select Job *
            </label>
            {loadingJobs ? (
              <div className="sub-admin-loading" style={{ height: 38 }}><div className="sub-admin-spinner" /></div>
            ) : (
              <select
                className="company-table-wrap"
                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: 8, border: "1px solid var(--border)", fontSize: "0.85rem", background: "var(--surface)", color: "var(--text)" }}
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
              >
                <option value="">— Choose a job —</option>
                {jobs.map((j) => (
                  <option key={j.jobId} value={j.jobId}>{j.title} {j.companyName ? `(${j.companyName})` : ""}</option>
                ))}
              </select>
            )}
          </div>

          <div style={{ flex: "1 1 260px" }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, marginBottom: "0.35rem", opacity: 0.7 }}>
              CSV File * (columns: name, email, phone)
            </label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                style={{ display: "none" }}
                id="referral-csv-input"
              />
              <label htmlFor="referral-csv-input" className="table-btn secondary" style={{ cursor: "pointer", margin: 0 }}>
                {fileName ? `📄 ${fileName}` : "Choose CSV file"}
              </label>
              <button type="button" className="table-btn secondary" onClick={downloadTemplate} title="Download template CSV">
                ↓ Template
              </button>
            </div>
          </div>
        </div>

        {csvError ? <p className="error" style={{ marginBottom: "0.75rem" }}>{csvError}</p> : null}

        {parseErrors.length > 0 && (
          <div style={{ background: "rgba(255,160,0,0.08)", border: "1px solid rgba(255,160,0,0.3)", borderRadius: 8, padding: "0.6rem 0.9rem", marginBottom: "0.75rem", fontSize: "0.78rem" }}>
            <strong>Parse warnings ({parseErrors.length} row{parseErrors.length !== 1 ? "s" : ""} skipped):</strong>
            <ul style={{ margin: "0.25rem 0 0 1rem", padding: 0 }}>
              {parseErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* Preview */}
        {candidates.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.8rem", opacity: 0.7, marginBottom: "0.5rem" }}>
              Preview — {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} ready to submit:
            </p>
            <div className="company-table-wrap" style={{ maxHeight: 220, overflowY: "auto" }}>
              <table className="company-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Phone</th></tr>
                </thead>
                <tbody>
                  {candidates.slice(0, 50).map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td style={{ fontSize: "0.78rem", opacity: 0.75 }}>{c.email}</td>
                      <td style={{ fontSize: "0.78rem", opacity: 0.75 }}>{c.phone || "—"}</td>
                    </tr>
                  ))}
                  {candidates.length > 50 && (
                    <tr><td colSpan={3} style={{ textAlign: "center", opacity: 0.5, fontSize: "0.75rem" }}>...and {candidates.length - 50} more</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {submitResult && (
          <div style={{ background: "rgba(0,200,100,0.08)", border: "1px solid rgba(0,200,100,0.25)", borderRadius: 8, padding: "0.7rem 1rem", marginBottom: "0.75rem", fontSize: "0.83rem" }}>
            <strong style={{ color: "var(--success, #22c55e)" }}>
              {submitResult.created} candidate{submitResult.created !== 1 ? "s" : ""} referred successfully.
            </strong>
            {submitResult.skipped > 0 && <span style={{ opacity: 0.65 }}> {submitResult.skipped} skipped (duplicates or missing fields).</span>}
            {submitResult.errors.length > 0 && (
              <ul style={{ margin: "0.25rem 0 0 1rem", padding: 0, opacity: 0.7 }}>
                {submitResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}

        <button
          type="button"
          className="table-btn"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || candidates.length === 0 || !selectedJobId}
          style={{ minWidth: 150 }}
        >
          {isSubmitting ? "Submitting…" : `Submit ${candidates.length > 0 ? candidates.length : ""} Referrals`}
        </button>
      </div>

      {/* Past referrals */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>
            My Referrals
            <span className="sub-admin-count-chip" style={{ marginLeft: "0.5rem" }}>{totalReferrals}</span>
          </h3>
          {totalReferrals > 0 && (
            <button
              type="button"
              className="table-btn secondary"
              onClick={() => void handleDownload()}
              disabled={isDownloading}
              style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {isDownloading ? "Downloading…" : "Download CSV"}
            </button>
          )}
        </div>

        {loadingReferrals ? (
          <div className="sub-admin-loading"><div className="sub-admin-spinner" /><span>Loading referrals…</span></div>
        ) : referrals.length === 0 ? (
          <div className="sub-admin-empty-state">
            <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" fill="none" strokeWidth="1.2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p>No referrals yet. Upload a CSV above to get started.</p>
          </div>
        ) : (
          <>
            <div className="company-table-wrap">
              <table className="company-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Job</th>
                    <th>Status</th>
                    <th>Referred On</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.referralId}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.candidateName}</div>
                        <div style={{ fontSize: "0.73rem", opacity: 0.6 }}>{r.candidateEmail}</div>
                        {r.candidatePhone && <div style={{ fontSize: "0.72rem", opacity: 0.5 }}>{r.candidatePhone}</div>}
                      </td>
                      <td style={{ fontWeight: 500 }}>{r.jobTitle || r.jobId}</td>
                      <td>
                        <span className={`status-pill ${STATUS_COLORS[r.status] || "draft"}`}>{r.status}</span>
                        {r.notes && <div style={{ fontSize: "0.71rem", opacity: 0.55, marginTop: "0.2rem" }}>{r.notes}</div>}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{formatDate(r.uploadedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="sub-admin-pagination">
                <button type="button" className="table-btn secondary" disabled={referralPage <= 1} onClick={() => void loadReferrals(referralPage - 1)}>← Prev</button>
                <span>Page {referralPage} of {totalPages}</span>
                <button type="button" className="table-btn secondary" disabled={referralPage >= totalPages} onClick={() => void loadReferrals(referralPage + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
