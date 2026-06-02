"use client";

import { useEffect, useState } from "react";
import {
  getAdminCollegesDirectory,
  getAdminCollegeStudents,
  getAdminStudentDetail,
  type AdminCollegeRow,
  type AdminCollegeStudent,
  type AdminCollegesDirectory,
  type AdminStudentDetail,
  type AdminStudentStatusCounts,
} from "../../lib/api";
import { ModalCloseButton } from "../common/ModalCloseButton";
import { AdminPsychometricAssignModal } from "./AdminPsychometricAssignModal";

const STATUS_ORDER = ["Complete", "Submitted", "In progress", "Invite pending"];

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function statusClass(status: string) {
  const key = status.toLowerCase().replace(/\s+/g, "-");
  return `admin-status-pill admin-status-pill--${key}`;
}

function StatusPills({ counts }: { counts: AdminStudentStatusCounts }) {
  const entries = STATUS_ORDER.filter((s) => (counts[s] ?? 0) > 0).map((status) => ({
    status,
    count: counts[status] ?? 0,
  }));
  Object.entries(counts).forEach(([status, count]) => {
    if (!STATUS_ORDER.includes(status) && count > 0) {
      entries.push({ status, count });
    }
  });
  if (entries.length === 0) {
    return <span className="table-caption">No students</span>;
  }
  return (
    <div className="admin-status-pills">
      {entries.map(({ status, count }) => (
        <span key={status} className={statusClass(status)}>
          {status}: {count}
        </span>
      ))}
    </div>
  );
}

function StudentDetailModal({
  studentId,
  onClose,
}: {
  studentId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AdminStudentDetail | null>(null);
  const [applicationCount, setApplicationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getAdminStudentDetail(studentId);
        setDetail(data.student);
        setApplicationCount(data.applicationCount ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load student.");
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  const detailRows: { label: string; value: string }[] = detail
    ? [
        { label: "Name", value: String(detail.fullName || "—") },
        { label: "Email", value: String(detail.email || studentId) },
        { label: "Phone", value: String(detail.phone || "—") },
        { label: "Status", value: String(detail.profileStatus || "—") },
        { label: "College", value: String(detail.college || detail.scoutCollegeName || "—") },
        { label: "Branch", value: String(detail.departmentStream ?? detail.branch ?? "—") },
        { label: "Batch / year", value: String(detail.academicYear || "—") },
        { label: "Course", value: String(detail.courseClassGrade || "—") },
        { label: "State", value: String(detail.state || "—") },
        { label: "Country", value: String(detail.country || "—") },
        { label: "Candidate type", value: String(detail.candidateType || "—") },
        { label: "Profile complete", value: detail.profileComplete ? "Yes" : "No" },
        { label: "Applications", value: String(applicationCount) },
        { label: "PRI score", value: String(detail.priScore ?? "—") },
        { label: "Skills", value: String(detail.skills || "—") },
        { label: "Preferred role", value: String(detail.preferredJobRole || "—") },
      ]
    : [];

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-labelledby="admin-student-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-head">
          <h3 id="admin-student-detail-title">Student details</h3>
          <ModalCloseButton onClick={onClose} variant="inline" />
        </div>
        {loading ? <p>Loading…</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!loading && !error && detail ? (
          <dl className="admin-detail-grid">
            {detailRows.map((row) => (
              <div key={row.label} className="admin-detail-row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </div>
  );
}

function CollegeStudentsSection({ college }: { college: AdminCollegeRow }) {
  const [students, setStudents] = useState<AdminCollegeStudent[]>([]);
  const [statusCounts, setStatusCounts] = useState<AdminStudentStatusCounts>({});
  const [studentPage, setStudentPage] = useState(1);
  const [studentPagination, setStudentPagination] = useState<{ page: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);

  async function loadStudents(page = 1) {
    setLoading(true);
    setError("");
    try {
      const payload = await getAdminCollegeStudents({
        collegeId: college.collegeId || undefined,
        collegeName: college.collegeName,
        page,
        pageSize: 50,
      });
      setStudents(payload.students);
      setStatusCounts(payload.studentStatusCounts);
      setStudentPage(payload.pagination?.page ?? page);
      setStudentPagination(
        payload.pagination ? { page: payload.pagination.page, totalPages: payload.pagination.totalPages } : null,
      );
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load students.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-college-section">
      <div className="admin-college-section-head">
        <strong>Students ({college.studentCount ?? 0})</strong>
        <StatusPills counts={loaded ? statusCounts : college.studentStatusCounts} />
      </div>
      {!loaded ? (
        <button type="button" className="btn-secondary" onClick={() => void loadStudents(1)} disabled={loading}>
          {loading ? "Loading students…" : "Load student list"}
        </button>
      ) : null}
      {loaded && studentPagination && studentPagination.totalPages > 1 ? (
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            disabled={loading || studentPage <= 1}
            onClick={() => void loadStudents(studentPage - 1)}
          >
            Previous
          </button>
          <span className="table-caption">
            Page {studentPage} of {studentPagination.totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={loading || studentPage >= studentPagination.totalPages}
            onClick={() => void loadStudents(studentPage + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      {loaded && students.length === 0 ? <p className="table-caption">No students for this college.</p> : null}
      {loaded && students.length > 0 ? (
        <div className="company-table-wrap">
          <table className="company-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Branch</th>
                <th>Batch</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.studentId}>
                  <td>{student.fullName}</td>
                  <td>{student.email}</td>
                  <td>
                    <span className={statusClass(student.profileStatus)}>{student.profileStatus}</span>
                  </td>
                  <td>{student.branch || "—"}</td>
                  <td>{student.batch || "—"}</td>
                  <td>
                    <button type="button" className="btn-link" onClick={() => setDetailStudentId(student.studentId)}>
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {detailStudentId ? (
        <StudentDetailModal studentId={detailStudentId} onClose={() => setDetailStudentId(null)} />
      ) : null}
    </div>
  );
}

export function AdminCollegesPanel() {
  const [data, setData] = useState<AdminCollegesDirectory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [collegesPage, setCollegesPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [assignCollege, setAssignCollege] = useState<AdminCollegeRow | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      setError("");
      try {
        setData(await getAdminCollegesDirectory({ page: collegesPage, pageSize: 50 }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load colleges.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [collegesPage]);

  if (isLoading) {
    return (
      <div className="tpo-panel">
        <p>Loading colleges and TPOs…</p>
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

  const colleges = data?.colleges ?? [];

  return (
    <>
      {successMessage ? <p className="success">{successMessage}</p> : null}

      <div className="tpo-panel">
        <h2 className="company-title" style={{ fontSize: "18px", margin: "0 0 8px" }}>
          Colleges & TPOs
        </h2>
        <p className="company-subtitle" style={{ margin: 0 }}>
          <strong>{data?.totalColleges ?? 0}</strong> colleges · <strong>{data?.totalTpos ?? 0}</strong> TPOs ·{" "}
          <strong>{data?.totalStudents ?? colleges.reduce((n, c) => n + (c.studentCount ?? 0), 0)}</strong> students
          {data?.pagination && data.pagination.totalPages > 1
            ? ` — page ${data.pagination.page} of ${data.pagination.totalPages}`
            : ""}
        </p>
        {data?.pagination && data.pagination.totalPages > 1 ? (
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={collegesPage <= 1 || isLoading}
              onClick={() => setCollegesPage((p) => Math.max(1, p - 1))}
            >
              Previous colleges
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={collegesPage >= data.pagination.totalPages || isLoading}
              onClick={() => setCollegesPage((p) => p + 1)}
            >
              Next colleges
            </button>
          </div>
        ) : null}
      </div>

      {colleges.length === 0 ? (
        <div className="tpo-panel">
          <p className="table-caption">No colleges registered yet.</p>
        </div>
      ) : (
        <div className="tpo-panel admin-colleges-list">
          {colleges.map((college) => {
            const key = college.collegeId || college.collegeName;
            const isOpen = expanded === key;
            const location = [college.district, college.state, college.country].filter(Boolean).join(", ");

            return (
              <div key={key} className="admin-college-card">
                <div className="admin-college-card-head">
                  <div>
                    <h3 className="admin-college-name">{college.collegeName}</h3>
                    {college.collegeId ? (
                      <p className="table-caption" style={{ margin: "4px 0 0" }}>
                        ID: {college.collegeId}
                      </p>
                    ) : null}
                    {location ? (
                      <p className="table-caption" style={{ margin: "4px 0 0" }}>
                        {location}
                      </p>
                    ) : null}
                    {college.primaryTpoName ? (
                      <p className="table-caption" style={{ margin: "4px 0 0" }}>
                        Primary TPO: {college.primaryTpoName} ({college.primaryTpoEmail})
                      </p>
                    ) : null}
                    <div style={{ marginTop: "10px" }}>
                      <StatusPills counts={college.studentStatusCounts ?? {}} />
                    </div>
                  </div>
                  <div className="admin-college-metrics">
                    <div>
                      <p className="tpo-stat-value">{college.studentCount ?? 0}</p>
                      <span className="table-caption">Students</span>
                    </div>
                    <div>
                      <p className="tpo-stat-value">{college.tpoCount}</p>
                      <span className="table-caption">TPOs</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setExpanded(isOpen ? null : key)}
                  >
                    {isOpen ? "Collapse" : "Expand college"}
                  </button>
                  {(college.studentCount ?? 0) > 0 ? (
                    <button type="button" className="table-btn" onClick={() => setAssignCollege(college)}>
                      Assign psychometric test
                    </button>
                  ) : null}
                </div>
                {isOpen ? (
                  <>
                    {college.tpos.length > 0 ? (
                      <div className="admin-college-section">
                        <strong>TPO accounts</strong>
                        <div className="company-table-wrap" style={{ marginTop: "8px" }}>
                          <table className="company-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Setup</th>
                                <th>Registered</th>
                              </tr>
                            </thead>
                            <tbody>
                              {college.tpos.map((tpo) => (
                                <tr key={tpo.profileId}>
                                  <td>{tpo.tpoName}</td>
                                  <td>{tpo.email}</td>
                                  <td>{tpo.approvalStatus || "—"}</td>
                                  <td>{tpo.collegeSetupComplete ? "Complete" : "Pending"}</td>
                                  <td>{formatDate(tpo.registeredAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="table-caption">No TPO accounts linked.</p>
                    )}
                    <CollegeStudentsSection college={college} />
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {assignCollege ? (
        <AdminPsychometricAssignModal
          college={assignCollege}
          onClose={() => setAssignCollege(null)}
          onSuccess={(msg) => setSuccessMessage(msg)}
        />
      ) : null}
    </>
  );
}
