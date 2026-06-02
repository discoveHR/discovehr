"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listAllReferrals,
  listReferralRecruiters,
  updateReferralStatus,
  exportAllReferrals,
  downloadCsvBlob,
  type AdminReferralRow,
} from "../../lib/api/freelancer-referrals";

const STATUS_OPTIONS = ["Pending", "Contacted", "Applied", "Rejected"] as const;
type ReferralStatus = typeof STATUS_OPTIONS[number];

const STATUS_COLOR: Record<string, string> = {
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

export function AdminReferralsPanel() {
  const [referrals, setReferrals] = useState<AdminReferralRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filterJobId, setFilterJobId] = useState("");
  const [filterRecruiter, setFilterRecruiter] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [recruiters, setRecruiters] = useState<{ userId: string; name: string }[]>([]);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const load = useCallback(async (p = 1) => {
    setIsLoading(true);
    setError("");
    try {
      const result = await listAllReferrals({
        page: p,
        pageSize: 50,
        jobId: filterJobId || undefined,
        freelancerUser: filterRecruiter || undefined,
        status: filterStatus || undefined,
      });
      setReferrals(result.referrals);
      setPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load referrals.");
    } finally {
      setIsLoading(false);
    }
  }, [filterJobId, filterRecruiter, filterStatus]);

  useEffect(() => { void load(1); }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const list = await listReferralRecruiters();
        setRecruiters(list);
      } catch {
        /* non-critical */
      }
    })();
  }, []);

  async function handleDownload() {
    setIsDownloading(true);
    setError("");
    try {
      const rows = await exportAllReferrals({
        jobId: filterJobId || undefined,
        freelancerUser: filterRecruiter || undefined,
        status: filterStatus || undefined,
      });
      if (rows.length === 0) { setError("No referrals to download."); return; }
      const header = ["Referral ID", "Job ID", "Job Title", "Referred By", "Recruiter Email", "Candidate Name", "Email", "Phone", "Status", "Notes", "Referred On"];
      const data = rows.map((r) => [r.referralId, r.jobId, r.jobTitle, r.referredByName, r.referredByUser, r.candidateName, r.candidateEmail, r.candidatePhone, r.status, r.notes, r.uploadedAt]);
      const label = filterRecruiter ? `recruiter-${filterRecruiter}` : "all";
      downloadCsvBlob([header, ...data], `referrals-${label}-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleStatusChange(referralId: string, status: ReferralStatus) {
    setUpdatingId(referralId);
    setError("");
    setSuccess("");
    try {
      const msg = await updateReferralStatus(referralId, status);
      setSuccess(msg);
      setReferrals((prev) =>
        prev.map((r) => r.referralId === referralId ? { ...r, status } : r)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="sub-admin-panel">
      <div className="sub-admin-panel-header">
        <div>
          <h2 className="sub-admin-panel-title">Candidate Referrals</h2>
          <p className="sub-admin-panel-sub">
            Candidates referred by freelancer recruiters via CSV upload. Each entry is tagged with the recruiter who submitted it.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span className="sub-admin-count-chip">{total} referral{total !== 1 ? "s" : ""}</span>
          {total > 0 && (
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
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", opacity: 0.65, marginBottom: 3 }}>Recruiter</label>
          <select
            style={{ padding: "0.4rem 0.65rem", borderRadius: 7, border: "1px solid var(--border)", fontSize: "0.82rem", background: "var(--surface)", color: "var(--text)", minWidth: 160 }}
            value={filterRecruiter}
            onChange={(e) => { setFilterRecruiter(e.target.value); }}
          >
            <option value="">All recruiters</option>
            {recruiters.map((r) => (
              <option key={r.userId} value={r.userId}>{r.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.75rem", opacity: 0.65, marginBottom: 3 }}>Status</label>
          <select
            style={{ padding: "0.4rem 0.65rem", borderRadius: 7, border: "1px solid var(--border)", fontSize: "0.82rem", background: "var(--surface)", color: "var(--text)", minWidth: 130 }}
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); }}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {(filterRecruiter || filterStatus) && (
          <button
            type="button"
            className="table-btn secondary"
            onClick={() => { setFilterRecruiter(""); setFilterStatus(""); setFilterJobId(""); }}
          >
            ✕ Clear filters
          </button>
        )}
      </div>

      {error ? <p className="error" style={{ marginBottom: "0.75rem" }}>{error}</p> : null}
      {success ? (
        <p style={{ color: "var(--success, #22c55e)", fontSize: "0.83rem", marginBottom: "0.75rem" }}>{success}</p>
      ) : null}

      {isLoading ? (
        <div className="sub-admin-loading"><div className="sub-admin-spinner" /><span>Loading referrals…</span></div>
      ) : referrals.length === 0 ? (
        <div className="sub-admin-empty-state">
          <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" fill="none" strokeWidth="1.2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p>No referrals found{filterRecruiter || filterStatus ? " matching the current filters" : ""}.</p>
        </div>
      ) : (
        <>
          <div className="company-table-wrap">
            <table className="company-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Job</th>
                  <th>Referred By</th>
                  <th>Status</th>
                  <th>Referred On</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.referralId}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.candidateName}</div>
                      <div style={{ fontSize: "0.73rem", opacity: 0.6 }}>{r.candidateEmail}</div>
                      {r.candidatePhone && (
                        <div style={{ fontSize: "0.71rem", opacity: 0.5 }}>{r.candidatePhone}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.jobTitle || r.jobId}</div>
                      <div style={{ fontSize: "0.71rem", opacity: 0.5 }}>{r.jobId}</div>
                    </td>
                    <td>
                      <div className="sub-admin-district-chip">{r.referredByName || r.referredByUser}</div>
                      <div style={{ fontSize: "0.71rem", opacity: 0.5 }}>{r.referredByUser}</div>
                    </td>
                    <td>
                      <span className={`status-pill ${STATUS_COLOR[r.status] || "draft"}`}>{r.status}</span>
                      {r.notes && (
                        <div style={{ fontSize: "0.71rem", opacity: 0.55, marginTop: "0.2rem", maxWidth: 160, wordBreak: "break-word" }}>{r.notes}</div>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(r.uploadedAt)}</td>
                    <td>
                      <select
                        style={{ padding: "0.3rem 0.5rem", borderRadius: 6, border: "1px solid var(--border)", fontSize: "0.8rem", background: "var(--surface)", color: "var(--text)", cursor: "pointer" }}
                        value={r.status}
                        disabled={updatingId === r.referralId}
                        onChange={(e) => void handleStatusChange(r.referralId, e.target.value as ReferralStatus)}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="sub-admin-pagination">
              <button type="button" className="table-btn secondary" disabled={page <= 1} onClick={() => void load(page - 1)}>← Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button type="button" className="table-btn secondary" disabled={page >= totalPages} onClick={() => void load(page + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
