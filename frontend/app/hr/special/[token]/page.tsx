"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getHrMagicDashboard } from "../../../../lib/api";

export default function HrSpecialDashboardPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || "";
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<Awaited<ReturnType<typeof getHrMagicDashboard>> | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setData(await getHrMagicDashboard(token));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load dashboard.");
      } finally {
        setIsLoading(false);
      }
    }
    if (token) void load();
    else {
      setError("Invalid link.");
      setIsLoading(false);
    }
  }, [token]);

  return (
    <main className="company-page">
      <section className="company-shell" style={{ gridTemplateColumns: "1fr" }}>
        <div className="company-main">
          <h1 className="company-title">HR campus drive access</h1>
          {isLoading ? <p className="company-subtitle">Loading…</p> : null}
          {error ? <p className="error">{error}</p> : null}
          {data ? (
            <>
              <p className="company-subtitle">
                {data.campusDriveTitle} — {data.collegeName} ({data.tpoName})
              </p>
              {data.posting ? (
                <section className="company-table-wrap">
                  <div className="company-table-head">
                    <h3>{data.posting.title}</h3>
                  </div>
                  <p>{data.posting.description}</p>
                  <p>
                    <strong>Branch:</strong> {data.posting.branch} · <strong>Batch:</strong> {data.posting.batch}
                  </p>
                </section>
              ) : null}
              <section className="company-table-wrap">
                <div className="company-table-head">
                  <h3>Eligible applicants</h3>
                  <span className="table-caption">{data.applicants.length} student(s)</span>
                </div>
                <table className="company-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Branch</th>
                      <th>Batch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.applicants.map((a) => (
                      <tr key={a.studentEmail}>
                        <td>{a.studentName}</td>
                        <td>{a.studentEmail}</td>
                        <td>{a.branch}</td>
                        <td>{a.batch}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
