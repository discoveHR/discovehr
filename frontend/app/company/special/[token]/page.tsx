"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getCompanyMagicDashboard, replicatePostingFromMagic, type CompanyMagicDashboard } from "../../../../lib/api";

export default function CompanySpecialDashboardPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || "";
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<CompanyMagicDashboard | null>(null);
  const [replicateMsg, setReplicateMsg] = useState("");
  const [replicateErr, setReplicateErr] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const result = await getCompanyMagicDashboard(token);
        setData(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load dashboard.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }
    if (token) {
      void load();
    } else {
      setError("Invalid link.");
      setIsLoading(false);
    }
  }, [token]);

  return (
    <main className="company-page">
      <section className="company-shell" style={{ gridTemplateColumns: "1fr" }}>
        <div className="company-main">
          <h1 className="company-title">Company Special Dashboard</h1>
          {isLoading ? <p className="company-subtitle">Loading...</p> : null}
          {error ? <p className="error">{error}</p> : null}
          {data ? (
            <>
              <section className="company-table-wrap">
                <div className="company-table-head">
                  <h3>{data.posting.title || "TPO Posting"}</h3>
                  <span className="table-caption">Company: {data.companyEmail}</span>
                </div>
                <div className="job-form-grid">
                  <p>
                    <strong>Branch:</strong> {data.posting.branch}
                  </p>
                  <p>
                    <strong>Batch:</strong> {data.posting.batch}
                  </p>
                  <p>
                    <strong>Eligibility:</strong> {data.posting.eligibilityCriteria || "N/A"}
                  </p>
                  <p>
                    <strong>Description:</strong> {data.posting.description || "N/A"}
                  </p>
                  {data.posting.posterFile ? (
                    <p>
                      <a href={data.posting.posterFile} className="auth-link">
                        View poster
                      </a>
                    </p>
                  ) : null}
                  {data.posting.applicationLink ? (
                    <p>
                      <a href={data.posting.applicationLink} className="auth-link">
                        Open application link
                      </a>
                    </p>
                  ) : null}
                </div>
              </section>
              <section className="company-table-wrap">
                <div className="company-table-head">
                  <h3>Replicate to other colleges</h3>
                  <span className="table-caption">Creates a Scout job from this posting and sends college invites</span>
                </div>
                <form
                  className="job-form-grid"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setReplicateErr("");
                    setReplicateMsg("");
                    const fd = new FormData(e.currentTarget);
                    const emails = String(fd.get("colleges") || "")
                      .split(/[,;\n]/)
                      .map((x) => x.trim())
                      .filter(Boolean);
                    try {
                      const res = await replicatePostingFromMagic(token, emails);
                      setReplicateMsg(res.message || "Done.");
                    } catch (err) {
                      setReplicateErr(err instanceof Error ? err.message : "Replication failed.");
                    }
                  }}
                >
                  <label style={{ gridColumn: "1 / -1" }}>
                    College TPO emails (comma or newline separated)
                    <textarea name="colleges" rows={3} required placeholder="tpo@college1.edu, tpo@college2.edu" />
                  </label>
                  <button type="submit" className="table-btn">
                    Replicate job & invite colleges
                  </button>
                </form>
                {replicateMsg ? <p className="company-subtitle">{replicateMsg}</p> : null}
                {replicateErr ? <p className="error">{replicateErr}</p> : null}
              </section>
              <section className="company-table-wrap">
                <div className="company-table-head">
                  <h3>Applicants</h3>
                  <span className="table-caption">{data.applicants.length} record(s)</span>
                </div>
                <table className="company-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Branch</th>
                      <th>Batch</th>
                      <th>Resume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.applicants.length === 0 ? (
                      <tr>
                        <td colSpan={5}>No applicants found.</td>
                      </tr>
                    ) : (
                      data.applicants.map((item) => (
                        <tr key={`${item.studentId}-${item.studentEmail}`}>
                          <td>{item.studentName}</td>
                          <td>{item.studentEmail}</td>
                          <td>{item.branch}</td>
                          <td>{item.batch}</td>
                          <td>{item.resumeFile ? <a href={item.resumeFile}>View Resume</a> : "N/A"}</td>
                        </tr>
                      ))
                    )}
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
