"use client";

import { useEffect, useState } from "react";
import { approveTpoRegistration, listPendingTpos, rejectTpoRegistration, type AdminPendingTpo } from "../../lib/api";

export function AdminTpoApprovalsPanel() {
  const [pending, setPending] = useState<AdminPendingTpo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState("");

  async function load() {
    setIsLoading(true);
    setError("");
    try {
      setPending(await listPendingTpos());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load pending TPOs.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleApprove(profileId: string) {
    setActingId(profileId);
    try {
      await approveTpoRegistration(profileId);
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
      await rejectTpoRegistration(profileId, reason);
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
        <h3>TPO registrations</h3>
        <span className="table-caption">
          On approval, the TPO becomes a college manager under category His College and can complete college profile
          setup.
        </span>
      </div>

      {isLoading ? <p>Loading pending registrations…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!isLoading && pending.length === 0 ? (
        <p className="table-caption">No pending TPO registrations.</p>
      ) : null}

      {pending.length > 0 ? (
        <div className="company-table-wrap">
          <table className="company-table">
            <thead>
              <tr>
                <th>TPO</th>
                <th>College</th>
                <th>Location</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((row) => (
                <tr key={row.profileId}>
                  <td>
                    <strong>{row.tpoName}</strong>
                    <br />
                    <span className="table-caption">{row.email}</span>
                  </td>
                  <td>{row.collegeName}</td>
                  <td>
                    {row.collegeLocation}
                    {row.state ? `, ${row.state}` : ""}
                  </td>
                  <td>{row.registeredAt ? new Date(row.registeredAt).toLocaleDateString() : "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn"
                      disabled={actingId === row.profileId}
                      onClick={() => void handleApprove(row.profileId)}
                    >
                      Approve
                    </button>{" "}
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={actingId === row.profileId}
                      onClick={() => void handleReject(row.profileId)}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
