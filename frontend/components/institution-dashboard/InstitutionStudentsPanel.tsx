"use client";

import { useCallback, useEffect, useState } from "react";
import type { InstitutionBatchStat } from "../../lib/api/institution";
import type { TpoListedStudent, TpoStudentsPagination } from "../../lib/api/types";
import { API_URL, scoutJsonHeaders, readScoutApiJson } from "../../lib/api/client";

type StudentPage = { students: TpoListedStudent[]; pagination: TpoStudentsPagination };

type Props = {
  batches: InstitutionBatchStat[];
  selectedBatch: string;
  setSelectedBatch: (batch: string) => void;
};

async function fetchStudents(batch: string, page: number): Promise<StudentPage> {
  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (batch && batch !== "all") params.set("batch", batch);
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.list_students_by_parameters?${params}`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body } = await readScoutApiJson<StudentPage>(response);
  if (!body.ok || !body.data) throw new Error(body.message || "Failed to load students.");
  return body.data;
}

export function InstitutionStudentsPanel({ batches, selectedBatch, setSelectedBatch }: Props) {
  const [students, setStudents] = useState<TpoListedStudent[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (batch: string, page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchStudents(batch, page);
      setStudents(result.students);
      const p = result.pagination;
      setPagination({
        page: p.page,
        total: p.total,
        totalPages: p.totalPages,
        hasNext: p.hasNext,
        hasPrev: p.hasPrev,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load students.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(selectedBatch, 1);
  }, [selectedBatch, load]);

  const allBatches: InstitutionBatchStat[] = [
    { batch: "all", studentCount: batches.reduce((s, b) => s + b.studentCount, 0) },
    ...batches,
  ];

  return (
    <div className="inst-students-panel">
      <div className="inst-students-header">
        <h2 className="inst-panel-title">Students by Batch</h2>
        {pagination.total > 0 && (
          <span className="inst-students-total">{pagination.total} student{pagination.total !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Batch tabs */}
      <div className="inst-batch-tabs" role="tablist">
        {allBatches.map((b) => (
          <button
            key={b.batch}
            type="button"
            role="tab"
            aria-selected={selectedBatch === b.batch}
            className={`inst-batch-tab${selectedBatch === b.batch ? " inst-batch-tab--active" : ""}`}
            onClick={() => setSelectedBatch(b.batch)}
          >
            {b.batch === "all" ? "All Batches" : b.batch}
            <span className="inst-batch-count">{b.studentCount}</span>
          </button>
        ))}
      </div>

      {/* Student table */}
      {isLoading ? (
        <div className="inst-loading"><span className="inst-spinner" />Loading students…</div>
      ) : error ? (
        <div className="inst-error">{error}</div>
      ) : students.length === 0 ? (
        <div className="inst-empty">No students found{selectedBatch !== "all" ? ` for batch ${selectedBatch}` : ""}.</div>
      ) : (
        <>
          <div className="inst-table-wrap">
            <table className="inst-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Batch</th>
                  <th>Branch</th>
                  <th>Roll No.</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.studentId}>
                    <td>
                      <span className="inst-student-name">{s.fullName || "—"}</span>
                    </td>
                    <td className="inst-student-email">{s.email}</td>
                    <td>{s.batch || "—"}</td>
                    <td>{s.branch || "—"}</td>
                    <td>{(s as Record<string, unknown>).rollNumber as string || "—"}</td>
                    <td>
                      <span className={`inst-status-chip inst-status-chip--${s.isPendingInvite ? "invited" : "registered"}`}>
                        {s.isPendingInvite ? "Invited" : "Registered"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="inst-pagination">
              <button
                type="button"
                className="inst-page-btn"
                disabled={!pagination.hasPrev}
                onClick={() => void load(selectedBatch, pagination.page - 1)}
              >
                ← Prev
              </button>
              <span className="inst-page-info">Page {pagination.page} of {pagination.totalPages}</span>
              <button
                type="button"
                className="inst-page-btn"
                disabled={!pagination.hasNext}
                onClick={() => void load(selectedBatch, pagination.page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
