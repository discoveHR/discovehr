"use client";

import { useCallback, useEffect, useState } from "react";
import { createTpoChallenge, listTpoChallenges, updateChallengeApplicationStatus, type TpoChallenge } from "../../lib/api";

type Props = { onError: (m: string) => void; onSuccess: (m: string) => void };

export function TpoChallengesPanel({ onError, onSuccess }: Props) {
  const [challenges, setChallenges] = useState<TpoChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTpoChallenges();
      setChallenges(data.challenges);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to load challenges.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createTpoChallenge({ title: String(fd.get("title")), description: String(fd.get("description") || ""), status: "Active" });
      onSuccess("Challenge published.");
      e.currentTarget.reset();
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to create challenge.");
    }
  }

  return (
    <section className="company-table-wrap">
      <div className="company-table-head">
        <h3>Challenges hub</h3>
        <span className="table-caption">Campus challenges and applicant pipeline</span>
      </div>
      <form className="tpo-panel job-form-grid" onSubmit={(e) => void handleCreate(e)}>
        <input name="title" placeholder="Challenge title" required />
        <textarea name="description" rows={2} placeholder="Description" />
        <button type="submit" className="table-btn">
          Publish challenge
        </button>
      </form>
      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : (
        challenges.map((ch) => (
          <div key={ch.id} className="tpo-journey-setup-card">
            <h4>
              {ch.title} · {ch.applicantCount} applicants · {ch.status}
            </h4>
            <p>{ch.description}</p>
            <table className="company-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {ch.applicants.map((a) => (
                  <tr key={a.name}>
                    <td>
                      {a.studentName}
                      <br />
                      <span className="table-caption">{a.studentEmail}</span>
                    </td>
                    <td>—</td>
                    <td>{a.status}</td>
                    <td>
                      <select
                        defaultValue={a.status}
                        onChange={(e) =>
                          void updateChallengeApplicationStatus(a.name, e.target.value).then(() => load()).catch((err) =>
                            onError(err instanceof Error ? err.message : "Update failed."),
                          )
                        }
                      >
                        <option>Submitted</option>
                        <option>In Review</option>
                        <option>Shortlisted</option>
                        <option>Rejected</option>
                        <option>Selected</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </section>
  );
}

