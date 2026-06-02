"use client";

import { useEffect, useRef, useState } from "react";
import {
  getCompanyFreelancerInterviewerDetail,
  type CompanyFreelancerInterviewerDetail,
} from "../../../lib/api";
import { frappeAssetUrl } from "../../../lib/api/client";
import { useCompanyFreelancerInterviewers } from "../../../lib/hooks/useCompanyFreelancerInterviewers";

type Props = {
  onError: (message: string) => void;
  onScheduleWithInterviewer?: (freelancerUser: string) => void;
};

export function FreelancerInterviewersPanel({ onError, onScheduleWithInterviewer }: Props) {
  const { interviewers, isLoading, error } = useCompanyFreelancerInterviewers(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [detail, setDetail] = useState<CompanyFreelancerInterviewerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (error) {
      onErrorRef.current(error);
    }
  }, [error]);

  async function openDetail(freelancerUser: string) {
    setSelectedUser(freelancerUser);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await getCompanyFreelancerInterviewerDetail(freelancerUser));
    } catch (err) {
      onErrorRef.current(err instanceof Error ? err.message : "Unable to load details.");
      setSelectedUser(null);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <section className="company-table-wrap">
      <div className="company-table-head">
        <div>
          <h3>Freelancer interviewers</h3>
          <span className="table-caption">
            Admin-approved freelancer interviewers. View profiles and assign them to candidates in Interview Scheduler.
          </span>
        </div>
      </div>

      {isLoading ? <p className="empty-state">Loading approved interviewers…</p> : null}
      {!isLoading && interviewers.length === 0 ? (
        <p className="empty-state">No approved freelancer interviewers yet.</p>
      ) : null}

      {!isLoading && interviewers.length > 0 ? (
        <div className="company-table-wrap">
          <table className="company-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Primary service</th>
                <th>Experience</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {interviewers.map((row) => (
                <tr key={row.freelancerUser}>
                  <td>
                    <strong>{row.fullName}</strong>
                    <br />
                    <span className="table-caption">{row.email}</span>
                  </td>
                  <td>{row.primaryService || "—"}</td>
                  <td>{row.yearsOfExperience || "—"}</td>
                  <td>{row.availability || "—"}</td>
                  <td>
                    <button type="button" className="table-btn secondary" onClick={() => void openDetail(row.freelancerUser)}>
                      View details
                    </button>
                    {onScheduleWithInterviewer ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="table-btn"
                          onClick={() => onScheduleWithInterviewer(row.freelancerUser)}
                        >
                          Assign interview
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selectedUser ? (
        <div className="tpo-panel" style={{ marginTop: "1.5rem" }}>
          <h4>Interviewer profile</h4>
          {detailLoading ? <p>Loading details…</p> : null}
          {detail ? (
            <>
              <p>
                <strong>{detail.fullName}</strong> · {detail.primaryService}
                <br />
                <span className="table-caption">
                  {detail.city}
                  {detail.state ? `, ${detail.state}` : ""} · {detail.phone}
                </span>
              </p>
              <p>{detail.professionalSummary}</p>
              <p className="table-caption">
                Skills: {detail.skills || "—"} · Experience: {detail.yearsOfExperience || "—"}
              </p>
              {detail.workExperience ? (
                <p>
                  <strong>Work experience</strong>
                  <br />
                  {detail.workExperience}
                </p>
              ) : null}
              {detail.resumeFile ? (
                <p>
                  <a href={frappeAssetUrl(detail.resumeFile)} target="_blank" rel="noreferrer">
                    View resume
                  </a>
                </p>
              ) : null}
              {detail.documents && detail.documents.length > 0 ? (
                <ul>
                  {detail.documents.map((doc, i) => (
                    <li key={i}>
                      {doc.documentType}:{" "}
                      {doc.file ? (
                        <a href={frappeAssetUrl(doc.file)} target="_blank" rel="noreferrer">
                          View file
                        </a>
                      ) : (
                        "—"
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

