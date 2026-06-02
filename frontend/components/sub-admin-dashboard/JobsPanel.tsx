"use client";

import { useCallback, useEffect, useState } from "react";
import { listSubAdminCompanyJobs, type SubAdminJobItem } from "../../lib/api";

type Props = {
  companyName: string;
  district: string;
  onViewApplicants: (jobId: string, jobTitle: string) => void;
  onError: (msg: string) => void;
};

export function SubAdminJobsPanel({ companyName, district, onViewApplicants, onError }: Props) {
  const [jobs, setJobs] = useState<SubAdminJobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listSubAdminCompanyJobs();
      setJobs(result.jobs);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load jobs.");
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  useEffect(() => { void load(); }, [load]);

  function statusClass(status: string) {
    if (status === "Open") return "active";
    if (status === "Closed") return "closed";
    return "draft";
  }

  if (isLoading) {
    return <div className="sub-admin-loading"><div className="sub-admin-spinner" /><span>Loading jobs…</span></div>;
  }

  return (
    <div className="sub-admin-panel">
      <div className="sub-admin-panel-header">
        <div>
          <h2 className="sub-admin-panel-title">Company Jobs</h2>
          <p className="sub-admin-panel-sub">
            Jobs posted by <strong>{companyName}</strong> · Your district: <strong>{district}</strong>
          </p>
        </div>
        <span className="sub-admin-count-chip">{jobs.length} job{jobs.length !== 1 ? "s" : ""}</span>
      </div>

      {jobs.length === 0 ? (
        <div className="sub-admin-empty-state">
          <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" fill="none" strokeWidth="1.2">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          </svg>
          <p>No jobs posted yet.</p>
        </div>
      ) : (
        <div className="company-table-wrap">
          <table className="company-table">
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Total Apps</th>
                <th>Your District</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{job.title}</div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{job.locationType} · {job.workType}</div>
                  </td>
                  <td>{job.opportunityType}</td>
                  <td>
                    <span className={`status-pill ${statusClass(job.status)}`}>{job.status}</span>
                  </td>
                  <td>{job.totalApplications}</td>
                  <td>
                    {job.districtApplications > 0 ? (
                      <span className="sub-admin-district-chip">{job.districtApplications} from {district}</span>
                    ) : (
                      <span style={{ opacity: 0.4, fontSize: "0.8rem" }}>None</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="table-btn"
                      disabled={job.districtApplications === 0}
                      onClick={() => onViewApplicants(job.id, job.title)}
                    >
                      View Applicants
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
