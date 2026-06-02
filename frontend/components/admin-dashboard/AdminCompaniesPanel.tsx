"use client";

import { useEffect, useState } from "react";
import { getAdminCompaniesDirectory, type AdminCompaniesDirectory } from "../../lib/api";

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function AdminCompaniesPanel() {
  const [data, setData] = useState<AdminCompaniesDirectory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      setError("");
      try {
        setData(await getAdminCompaniesDirectory({ page, pageSize: 50 }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load companies.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [page]);

  if (isLoading) {
    return (
      <div className="tpo-panel">
        <p>Loading registered companies…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tpo-panel">
        <p className="error">{error}</p>
      </div>
    );
  }

  const companies = data?.companies ?? [];

  return (
    <>
      <div className="tpo-panel">
        <h2 className="company-title" style={{ fontSize: "18px", margin: "0 0 8px" }}>
          Registered companies
        </h2>
        <p className="company-subtitle" style={{ margin: 0 }}>
          <strong>{data?.totalCompanies ?? 0}</strong> company accounts on the platform
          {data?.pagination && data.pagination.totalPages > 1
            ? ` — page ${data.pagination.page} of ${data.pagination.totalPages}`
            : ""}
        </p>
        {data?.pagination && data.pagination.totalPages > 1 ? (
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button type="button" className="btn-secondary" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button type="button" className="btn-secondary" disabled={page >= data.pagination.totalPages || isLoading} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        ) : null}
      </div>

      <div className="tpo-panel">
        {companies.length === 0 ? (
          <p className="table-caption">No company accounts registered yet.</p>
        ) : (
          <div className="company-table-wrap">
            <table className="company-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Registered</th>
                  <th>Jobs</th>
                  <th>Assessments</th>
                  <th>Applications</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.userId}>
                    <td>
                      <strong>{company.companyName}</strong>
                      {company.bio ? (
                        <p className="table-caption" style={{ margin: "4px 0 0", maxWidth: "280px" }}>
                          {company.bio}
                        </p>
                      ) : null}
                    </td>
                    <td>{company.email}</td>
                    <td>{company.phone || "—"}</td>
                    <td>{formatDate(company.registeredAt)}</td>
                    <td>{company.jobCount}</td>
                    <td>{company.assessmentCount}</td>
                    <td>{company.applicationCount}</td>
                    <td>{company.enabled ? "Active" : "Disabled"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
