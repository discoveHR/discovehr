"use client";

import { useEffect, useState } from "react";
import {
  approveFreelancerRegistration,
  getAdminFreelancerDetail,
  listPendingFreelancers,
  rejectFreelancerRegistration,
  type AdminFreelancerProfileDetail,
  type AdminPendingFreelancer,
} from "../../lib/api";
import { ModalCloseButton } from "../common/ModalCloseButton";
import { FreelancerProfileDetailView } from "../shared/FreelancerProfileDetailView";

export function AdminFreelancerApprovalsPanel() {
  const [pending, setPending] = useState<AdminPendingFreelancer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminFreelancerProfileDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState("");

  async function load() {
    setIsLoading(true);
    setError("");
    try {
      setPending(await listPendingFreelancers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load pending freelancer interviewers.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function openDetail(profileId: string) {
    setSelectedId(profileId);
    setDetail(null);
    setDetailLoading(true);
    setError("");
    try {
      const data = await getAdminFreelancerDetail(profileId);
      setDetail(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load profile.");
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
  }

  async function handleApprove(profileId: string) {
    setActingId(profileId);
    try {
      await approveFreelancerRegistration(profileId);
      closeDetail();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setActingId("");
    }
  }

  async function handleReject(profileId: string) {
    const reason = window.prompt("Rejection reason (optional):") || undefined;
    setActingId(profileId);
    try {
      await rejectFreelancerRegistration(profileId, reason);
      closeDetail();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed.");
    } finally {
      setActingId("");
    }
  }

  return (
    <div className="tpo-panel">
      <div className="company-table-head">
        <h3>Freelancer interviewer registrations</h3>
        <span className="table-caption">
          Review full submitted profiles (personal details, address, experience, resume, ID, and certificates) before
          approving.
        </span>
      </div>

      {isLoading ? <p>Loading pending registrations…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!isLoading && pending.length === 0 ? (
        <p className="table-caption">No pending freelancer interviewer registrations.</p>
      ) : null}

      {pending.length > 0 ? (
        <div className="company-table-wrap">
          <table className="company-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Service</th>
                <th>Experience</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((row) => (
                <tr key={row.profileId} className={selectedId === row.profileId ? "selected-row" : undefined}>
                  <td>
                    <strong>{row.fullName}</strong>
                    <br />
                    <span className="table-caption">{row.email}</span>
                  </td>
                  <td>{row.primaryService || "—"}</td>
                  <td>{row.yearsOfExperience || "—"}</td>
                  <td>{row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : "—"}</td>
                  <td>
                    <button type="button" className="btn secondary" onClick={() => void openDetail(row.profileId)}>
                      View all details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selectedId ? (
        <div className="tpo-panel freelancer-admin-detail-panel" style={{ marginTop: "1.5rem" }}>
          <div className="company-table-head">
            <h4>Full profile review</h4>
            <ModalCloseButton onClick={closeDetail} variant="inline" />
          </div>

          {detailLoading ? <p>Loading full profile…</p> : null}

          {detail && !detailLoading ? (
            <>
              <FreelancerProfileDetailView profile={detail} showAdminMeta />
              <div className="freelancer-admin-detail-actions">
                <button
                  type="button"
                  className="btn"
                  disabled={actingId === selectedId}
                  onClick={() => void handleApprove(selectedId)}
                >
                  Approve registration
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={actingId === selectedId}
                  onClick={() => void handleReject(selectedId)}
                >
                  Reject (unlock profile for edits)
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
