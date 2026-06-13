import { useCallback, useEffect, useState } from "react";
import { searchTpoStudents, type TpoListedStudent, type TpoStudentSearchHit } from "../../lib/api";
import type { TpoDashboardState } from "./hooks/useTpoDashboard";
import { MailerStatusBanner } from "../common/MailerStatusBanner";
import { StudentViewLink } from "./StudentViewLink";

function searchHitToRow(hit: TpoStudentSearchHit): TpoListedStudent {
  return {
    studentId: hit.studentId,
    fullName: hit.fullName,
    email: hit.email,
    branch: hit.branch,
    batch: hit.batch,
    college: hit.college,
    phone: "",
    state: "",
    country: "",
    areaOfStudy: "",
    courseClassGrade: "",
    resumeFile: "",
    inviteStatus: "",
    isPendingInvite: false,
  };
}

type Props = Pick<
  TpoDashboardState,
  | "activeStudentTab"
  | "setActiveStudentTab"
  | "isStudentsLoading"
  | "studentRows"
  | "studentPagination"
  | "goToStudentPage"
  | "batchFilter"
  | "setBatchFilter"
  | "addStudentForm"
  | "setAddStudentForm"
  | "handleAddStudent"
  | "isAddingStudent"
  | "studentInvites"
  | "downloadFilters"
  | "setDownloadFilters"
  | "handleDownloadFilteredStudents"
  | "isProfileEditsLoading"
  | "profileEditRequests"
  | "loadProfileEditRequests"
  | "handleApproveProfileEdit"
  | "approvingStudentId"
>;

export function TpoStudentsPanel(props: Props) {
  const {
    activeStudentTab,
    setActiveStudentTab,
    isStudentsLoading,
    studentRows,
    studentPagination,
    goToStudentPage,
    batchFilter,
    setBatchFilter,
    addStudentForm,
    setAddStudentForm,
    handleAddStudent,
    isAddingStudent,
    studentInvites,
    downloadFilters,
    setDownloadFilters,
    handleDownloadFilteredStudents,
    isProfileEditsLoading,
    profileEditRequests,
    loadProfileEditRequests,
    handleApproveProfileEdit,
    approvingStudentId,
  } = props;

  const [studentSearch, setStudentSearch] = useState("");
  const [searchRows, setSearchRows] = useState<TpoListedStudent[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchRows(null);
      return;
    }
    setIsSearching(true);
    try {
      const hits = await searchTpoStudents(q.trim());
      setSearchRows(hits.map(searchHitToRow));
    } catch {
      setSearchRows([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void runSearch(studentSearch), 350);
    return () => window.clearTimeout(t);
  }, [studentSearch, runSearch]);

  const pageStart =
    studentPagination.total === 0 ? 0 : (studentPagination.page - 1) * studentPagination.pageSize + 1;
  const pageEnd = Math.min(studentPagination.page * studentPagination.pageSize, studentPagination.total);
  const displayRows = searchRows ?? studentRows;

  return (
    <div className="company-table-wrap">
      <div className="company-table-head">
        <h3>Students</h3>
        <span className="table-caption">Manage student data and invites through tabs.</span>
        <StudentTabBar activeStudentTab={activeStudentTab} setActiveStudentTab={setActiveStudentTab} />
      </div>
      <MailerStatusBanner />

      {activeStudentTab === "all" ? (
        <>
          <div className="tpo-student-search-wrap">
            <span className="tpo-student-search-icon">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input className="tpo-student-search-input" type="search" placeholder="Search by name, email, branch, or roll no…" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} aria-label="Search students" />
            {studentSearch && (
              <button type="button" className="tpo-student-search-clear" aria-label="Clear search" onClick={() => setStudentSearch("")}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
          {isStudentsLoading || isSearching ? (
            <div className="tpo-panel-loading">{isSearching ? "Searching…" : "Loading students…"}</div>
          ) : (
            <>
              <StudentsTable rows={displayRows} />
              {searchRows ? (
                <p className="table-caption">{searchRows.length} result{searchRows.length !== 1 ? "s" : ""} — clear search to restore paginated list.</p>
              ) : (
                <StudentPaginationBar
                  pagination={studentPagination}
                  pageStart={pageStart}
                  pageEnd={pageEnd}
                  onPrev={() => goToStudentPage(studentPagination.page - 1)}
                  onNext={() => goToStudentPage(studentPagination.page + 1)}
                />
              )}
            </>
          )}
        </>
      ) : null}

      {activeStudentTab === "batch" ? (
        <div className="tpo-student-form">
          <div className="tpo-student-form-row">
            <label>Batch filter</label>
            <input value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} placeholder="Type batch (e.g., 2025)" />
          </div>
          {isStudentsLoading ? (
            <p className="empty-state">Loading students...</p>
          ) : (
            <>
              <StudentsTable rows={studentRows} batchMode />
              <StudentPaginationBar
                pagination={studentPagination}
                pageStart={pageStart}
                pageEnd={pageEnd}
                onPrev={() => goToStudentPage(studentPagination.page - 1)}
                onNext={() => goToStudentPage(studentPagination.page + 1)}
              />
            </>
          )}
        </div>
      ) : null}

      {activeStudentTab === "add" ? (
        <form className="tpo-student-form" onSubmit={handleAddStudent}>
          <div className="tpo-student-form-dual">
            <div className="tpo-student-form-row">
              <label>Email</label>
              <input type="email" value={addStudentForm.email} onChange={(e) => setAddStudentForm((p) => ({ ...p, email: e.target.value }))} required />
            </div>
          </div>
          <div className="tpo-student-form-dual">
            <div className="tpo-student-form-row">
              <label>Batch</label>
              <input value={addStudentForm.batch} onChange={(e) => setAddStudentForm((p) => ({ ...p, batch: e.target.value }))} />
            </div>
            <div className="tpo-student-form-row">
              <label>Branch</label>
              <input value={addStudentForm.branch} onChange={(e) => setAddStudentForm((p) => ({ ...p, branch: e.target.value }))} />
            </div>
          </div>
          <div className="tpo-student-form-row">
            <label>Year</label>
            <input value={addStudentForm.year} onChange={(e) => setAddStudentForm((p) => ({ ...p, year: e.target.value }))} required />
          </div>
          <div className="tpo-student-form-actions">
            <button className="tpo-form-btn" type="submit" disabled={isAddingStudent}>
              {isAddingStudent ? "Sending..." : "Send invite"}
            </button>
          </div>
        </form>
      ) : null}

      {activeStudentTab === "invites" ? (
        <div className="tpo-table-scroll">
        <table className="company-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Branch</th>
              <th>Batch</th>
              <th>Year</th>
              <th>Status</th>
              <th>Expires</th>
              <th>Accepted At</th>
            </tr>
          </thead>
          <tbody>
            {studentInvites.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="tpo-empty">
                    <div className="tpo-empty-icon">
                      <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12"/><path d="M1.6 3.38a2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9"/></svg>
                    </div>
                    <div>
                      <strong>No invites sent yet</strong>
                      <p>Add a student via the &ldquo;Add Student&rdquo; tab to send an invite.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              studentInvites.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.email}</td>
                  <td>{invite.branch}</td>
                  <td>{invite.batch}</td>
                  <td>{invite.year}</td>
                  <td><span className={`tpo-invite-status tpo-invite-status--${invite.status.toLowerCase()}`}>{invite.status}</span></td>
                  <td>{invite.expiresAt || "—"}</td>
                  <td>{invite.acceptedAt || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      ) : null}

      {activeStudentTab === "download" ? (
        <div className="tpo-student-form">
          <div className="tpo-student-form-dual">
            <div className="tpo-student-form-row">
              <label>Branch</label>
              <input value={downloadFilters.branch} onChange={(e) => setDownloadFilters((p) => ({ ...p, branch: e.target.value }))} />
            </div>
            <div className="tpo-student-form-row">
              <label>Batch</label>
              <input value={downloadFilters.batch} onChange={(e) => setDownloadFilters((p) => ({ ...p, batch: e.target.value }))} />
            </div>
          </div>
          <div className="tpo-student-form-dual">
            <div className="tpo-student-form-row">
              <label>State</label>
              <input value={downloadFilters.state} onChange={(e) => setDownloadFilters((p) => ({ ...p, state: e.target.value }))} />
            </div>
            <div className="tpo-student-form-row">
              <label>Country</label>
              <input value={downloadFilters.country} onChange={(e) => setDownloadFilters((p) => ({ ...p, country: e.target.value }))} />
            </div>
          </div>
          <div className="tpo-student-form-row">
            <label>Area Of Study</label>
            <input value={downloadFilters.areaOfStudy} onChange={(e) => setDownloadFilters((p) => ({ ...p, areaOfStudy: e.target.value }))} />
          </div>
          <div className="tpo-student-form-actions">
            <button type="button" className="tpo-form-btn" onClick={handleDownloadFilteredStudents}>
              Download CSV
            </button>
          </div>
        </div>
      ) : null}

      {activeStudentTab === "profile-edits" ? (
        isProfileEditsLoading ? (
          <p className="empty-state">Loading profile edit requests...</p>
        ) : (
          <>
            <p className="tpo-edit-hint">
              Students who submitted their profile and asked to edit again. Approving unlocks their form until they save; applying to jobs does not require approval.
            </p>
            <div className="tpo-student-form-actions">
              <button type="button" className="tpo-form-btn tpo-form-btn--secondary" onClick={() => void loadProfileEditRequests()} disabled={isProfileEditsLoading}>
                Refresh list
              </button>
            </div>
            <table className="company-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>College</th>
                  <th>Batch</th>
                  <th>Branch</th>
                  <th>Profile complete</th>
                  <th>Action</th>
                  <th aria-label="View profile">View</th>
                </tr>
              </thead>
              <tbody>
                {profileEditRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8}>No pending profile edit requests.</td>
                  </tr>
                ) : (
                  profileEditRequests.map((row) => (
                    <tr key={row.studentId}>
                      <td>{row.fullName || "—"}</td>
                      <td>{row.email || "—"}</td>
                      <td>{row.college || "—"}</td>
                      <td>{row.batch || "—"}</td>
                      <td>{row.branch || "—"}</td>
                      <td>{row.profileComplete ? "Yes" : "No"}</td>
                      <td>
                        <button
                          type="button"
                          className="table-btn"
                          disabled={approvingStudentId === row.studentId}
                          onClick={() => void handleApproveProfileEdit(row.studentId)}
                        >
                          {approvingStudentId === row.studentId ? "Approving…" : "Approve edit"}
                        </button>
                      </td>
                      <td>
                        <StudentViewLink studentId={row.studentId} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )
      ) : null}
    </div>
  );
}

function StudentsTable({ rows, batchMode = false }: { rows: Props["studentRows"]; batchMode?: boolean }) {
  if (rows.length === 0) {
    return (
      <div className="tpo-empty">
        <div className="tpo-empty-icon">
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        </div>
        <div>
          <strong>No students found</strong>
          <p>Try a different search term or adjust the batch filter.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="tpo-table-scroll">
      <table className="company-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            {!batchMode ? <th>Branch</th> : null}
            <th>Batch</th>
            {batchMode ? <th>Branch</th> : null}
            {!batchMode ? <th>College</th> : null}
            {!batchMode ? <th>Status</th> : null}
            <th aria-label="View profile">View</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId || row.email}>
              <td>{row.fullName || "—"}</td>
              <td>{row.email || "—"}</td>
              {!batchMode ? <td>{row.branch || "—"}</td> : null}
              <td>{row.batch || "—"}</td>
              {batchMode ? <td>{row.branch || "—"}</td> : null}
              {!batchMode ? <td>{row.college || "—"}</td> : null}
              {!batchMode ? (
                <td>
                  {row.isPendingInvite ? (
                    <span className="tpo-invite-status tpo-invite-status--pending">{row.inviteStatus || "Invited"}</span>
                  ) : (
                    <span className="tpo-invite-status tpo-invite-status--accepted">Registered</span>
                  )}
                </td>
              ) : null}
              <td>
                {row.isPendingInvite ? <span className="tpo-cell-muted">—</span> : <StudentViewLink studentId={row.studentId || row.email} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentPaginationBar({
  pagination,
  pageStart,
  pageEnd,
  onPrev,
  onNext,
}: {
  pagination: Props["studentPagination"];
  pageStart: number;
  pageEnd: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (pagination.total === 0) {
    return null;
  }
  return (
    <div className="tpo-stud-page" role="navigation" aria-label="Students pagination">
      <span className="tpo-stud-page-info">Showing {pageStart}–{pageEnd} of {pagination.total}</span>
      <div className="tpo-stud-page-btns">
        <button type="button" className="tpo-page-btn" disabled={!pagination.hasPrev} onClick={onPrev}>← Prev</button>
        <span className="tpo-page-num">Page {pagination.page} of {pagination.totalPages}</span>
        <button type="button" className="tpo-page-btn" disabled={!pagination.hasNext} onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}

function StudentTabBar({ activeStudentTab, setActiveStudentTab }: Pick<Props, "activeStudentTab" | "setActiveStudentTab">) {
  const tabs: { key: Props["activeStudentTab"]; label: string }[] = [
    { key: "all", label: "All Students" },
    { key: "batch", label: "Batch-wise Students" },
    { key: "add", label: "Add Student" },
    { key: "invites", label: "Student Invites" },
    { key: "download", label: "Download Student Data" },
    { key: "profile-edits", label: "Profile edit requests" },
  ];
  return (
    <div className="tpo-stab-bar">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={`tpo-stab${activeStudentTab === key ? " tpo-stab--active" : ""}`}
          onClick={() => setActiveStudentTab(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
