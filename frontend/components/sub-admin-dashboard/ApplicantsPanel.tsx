"use client";

import { useCallback, useEffect, useState } from "react";
import { listSubAdminDistrictApplicants, type SubAdminApplicantItem } from "../../lib/api";
import { ScheduleModal } from "./ScheduleModal";

type Props = {
  district: string;
  companyName: string;
  filterJobId?: string;
  filterJobTitle?: string;
  onClearFilter?: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
};

export function SubAdminApplicantsPanel({
  district,
  companyName,
  filterJobId,
  filterJobTitle,
  onClearFilter,
  onError,
  onSuccess,
}: Props) {
  const [applicants, setApplicants] = useState<SubAdminApplicantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleTarget, setScheduleTarget] = useState<SubAdminApplicantItem | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async (p = 1) => {
    setIsLoading(true);
    try {
      const result = await listSubAdminDistrictApplicants({ jobId: filterJobId, page: p, pageSize: 50 });
      setApplicants(result.applicants);
      setTotal(result.pagination?.total || 0);
      setTotalPages(result.pagination?.totalPages || 1);
      setPage(p);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load applicants.");
    } finally {
      setIsLoading(false);
    }
  }, [filterJobId, onError]);

  useEffect(() => { void load(1); }, [load]);

  function statusClass(status: string) {
    if (status === "Shortlisted" || status === "Selected") return "active";
    if (status === "Rejected") return "closed";
    return "draft";
  }

  function formatDate(iso: string) {
    try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return iso; }
  }

  return (
    <div className="sub-admin-panel">
      <div className="sub-admin-panel-header">
        <div>
          <h2 className="sub-admin-panel-title">
            {filterJobTitle ? `Applicants for "${filterJobTitle}"` : "District Applicants"}
          </h2>
          <p className="sub-admin-panel-sub">
            Students from <strong>{district}</strong> who applied to <strong>{companyName}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          {filterJobId && onClearFilter && (
            <button type="button" className="table-btn secondary" onClick={onClearFilter}>
              ✕ Clear Filter
            </button>
          )}
          <span className="sub-admin-count-chip">{total} applicant{total !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="sub-admin-loading"><div className="sub-admin-spinner" /><span>Loading applicants…</span></div>
      ) : applicants.length === 0 ? (
        <div className="sub-admin-empty-state">
          <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" fill="none" strokeWidth="1.2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p>No applicants from {district} yet.</p>
        </div>
      ) : (
        <>
          <div className="company-table-wrap">
            <table className="company-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Location</th>
                  <th>Job Applied</th>
                  <th>Academic Year</th>
                  <th>Status</th>
                  <th>Applied On</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((app) => (
                  <tr key={app.applicationId}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span className="sub-admin-avatar">{(app.fullName || "?").charAt(0).toUpperCase()}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{app.fullName}</div>
                          <div style={{ fontSize: "0.73rem", opacity: 0.6 }}>{app.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="sub-admin-district-chip">{app.district}</span>
                      {app.city && <div style={{ fontSize: "0.72rem", opacity: 0.6, marginTop: "0.2rem" }}>{app.city}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{app.jobTitle}</div>
                    </td>
                    <td>{app.academicYear || "—"}</td>
                    <td>
                      <span className={`status-pill ${statusClass(app.status)}`}>{app.status}</span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(app.appliedOn)}</td>
                    <td>
                      <button
                        type="button"
                        className="table-btn"
                        onClick={() => setScheduleTarget(app)}
                      >
                        Schedule Interview
                      </button>
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

      {scheduleTarget && (
        <ScheduleModal
          applicant={scheduleTarget}
          onClose={() => setScheduleTarget(null)}
          onSuccess={(msg) => { onSuccess(msg); setScheduleTarget(null); void load(page); }}
          onError={onError}
        />
      )}
    </div>
  );
}
