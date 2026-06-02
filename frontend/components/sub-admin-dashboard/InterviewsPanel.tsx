"use client";

import { useCallback, useEffect, useState } from "react";
import { listSubAdminInterviews } from "../../lib/api";
import type { CompanyInterview } from "../../lib/api/company-interviews";

type Props = {
  district: string;
  onError: (msg: string) => void;
};

export function SubAdminInterviewsPanel({ district, onError }: Props) {
  const [interviews, setInterviews] = useState<CompanyInterview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listSubAdminInterviews();
      setInterviews(data as CompanyInterview[]);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load interviews.");
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  useEffect(() => { void load(); }, [load]);

  function formatDt(iso: string) {
    try {
      return new Date(iso).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  }

  function statusClass(status: string) {
    if (status === "Scheduled") return "active";
    if (status === "Completed") return "draft";
    return "closed";
  }

  if (isLoading) {
    return <div className="sub-admin-loading"><div className="sub-admin-spinner" /><span>Loading interviews…</span></div>;
  }

  return (
    <div className="sub-admin-panel">
      <div className="sub-admin-panel-header">
        <div>
          <h2 className="sub-admin-panel-title">Scheduled Interviews</h2>
          <p className="sub-admin-panel-sub">Interviews for students from <strong>{district}</strong></p>
        </div>
        <span className="sub-admin-count-chip">{interviews.length} interview{interviews.length !== 1 ? "s" : ""}</span>
      </div>

      {interviews.length === 0 ? (
        <div className="sub-admin-empty-state">
          <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" fill="none" strokeWidth="1.2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p>No interviews scheduled yet.</p>
          <p>Go to <strong>District Applicants</strong> to schedule an interview.</p>
        </div>
      ) : (
        <div className="company-table-wrap">
          <table className="company-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Job</th>
                <th>Type</th>
                <th>Scheduled For</th>
                <th>Interviewer</th>
                <th>Status</th>
                <th>Link / Location</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((iv) => (
                <tr key={iv.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="sub-admin-avatar">{(iv.studentName || "?").charAt(0).toUpperCase()}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{iv.studentName}</div>
                        <div style={{ fontSize: "0.72rem", opacity: 0.6 }}>{iv.studentEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td>{iv.jobTitle}</td>
                  <td>
                    <span className="sub-admin-district-chip">{iv.interviewType}</span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDt(iv.startDatetime)}</td>
                  <td>{iv.interviewerName || <span style={{ opacity: 0.4 }}>—</span>}</td>
                  <td>
                    <span className={`status-pill ${statusClass(iv.status)}`}>{iv.status}</span>
                  </td>
                  <td>
                    {iv.meetingLink ? (
                      <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer" className="sub-admin-link">
                        Join Meeting ↗
                      </a>
                    ) : iv.location ? (
                      <span style={{ fontSize: "0.8rem" }}>{iv.location}</span>
                    ) : (
                      <span style={{ opacity: 0.4 }}>—</span>
                    )}
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
