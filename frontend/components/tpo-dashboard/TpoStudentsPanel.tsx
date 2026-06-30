import { type DragEvent, useCallback, useEffect, useRef, useState } from "react";
import { searchTpoStudents, type TpoListedStudent, type TpoStudentSearchHit } from "../../lib/api";
import type { TpoDashboardState } from "./hooks/useTpoDashboard";
import { MailerStatusBanner } from "../common/MailerStatusBanner";
import { StudentViewLink } from "./StudentViewLink";
import type { StudentTabKey } from "./types";

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
  | "bulkUploadForm"
  | "setBulkUploadForm"
  | "bulkUploadFile"
  | "setBulkUploadFile"
  | "isBulkUploading"
  | "handleBulkStudentUpload"
>;

const TABS: { key: StudentTabKey; label: string; icon: React.ReactNode }[] = [
  {
    key: "all",
    label: "All Students",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
  },
  {
    key: "batch",
    label: "By Batch",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="14" height="14"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    key: "add",
    label: "Add Student",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="14" height="14"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
  },
  {
    key: "bulk-upload",
    label: "Bulk Upload",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="14" height="14"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  },
  {
    key: "invites",
    label: "Invites",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="14" height="14"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12"/></svg>,
  },
  {
    key: "download",
    label: "Export",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  },
  {
    key: "profile-edits",
    label: "Profile Edits",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  },
];

function downloadSampleTemplate() {
  const csv = [
    "Full Name,Email,Branch,Batch,Year,Phone,Roll Number",
    "Priya Sharma,priya.sharma@example.com,Computer Science,2025,3,9876543210,CS21001",
    "Arjun Mehta,arjun.mehta@example.com,Electronics,2025,3,9876543211,EC21002",
    "Kavya Reddy,kavya.reddy@example.com,Mechanical,2026,2,9876543212,ME22003",
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "student_upload_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

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
    bulkUploadForm,
    setBulkUploadForm,
    bulkUploadFile,
    setBulkUploadFile,
    isBulkUploading,
    handleBulkStudentUpload,
  } = props;

  const [studentSearch, setStudentSearch] = useState("");
  const [searchRows, setSearchRows] = useState<TpoListedStudent[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchRows(null);
      setSearchError(null);
      return;
    }
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setIsSearching(true);
    setSearchError(null);
    try {
      const hits = await searchTpoStudents(q.trim(), 25, controller.signal);
      if (!controller.signal.aborted) {
        setSearchRows(hits.map(searchHitToRow));
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setSearchError(err instanceof Error ? err.message : "Search failed.");
        setSearchRows([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void runSearch(studentSearch), 350);
    return () => window.clearTimeout(t);
  }, [studentSearch, runSearch]);

  const pageStart = studentPagination.total === 0 ? 0 : (studentPagination.page - 1) * studentPagination.pageSize + 1;
  const pageEnd = Math.min(studentPagination.page * studentPagination.pageSize, studentPagination.total);
  const displayRows = searchRows ?? studentRows;

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".xlsx"))) {
      setBulkUploadFile(file);
    }
  }

  return (
    <div className="tpo-students-panel">
      {/* Panel header */}
      <div className="tpo-panel-header">
        <div className="tpo-panel-header-left">
          <h2 className="tpo-panel-title">Students</h2>
          <p className="tpo-panel-subtitle">
            {studentPagination.total > 0 ? `${studentPagination.total} students enrolled` : "Manage student data and invites"}
          </p>
        </div>
      </div>

      <MailerStatusBanner />

      {/* Tab bar */}
      <div className="tpo-stab-bar" role="tablist" aria-label="Student sections">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={activeStudentTab === key}
            className={`tpo-stab${activeStudentTab === key ? " tpo-stab--active" : ""}`}
            onClick={() => setActiveStudentTab(key)}
          >
            {icon}
            <span>{label}</span>
            {key === "bulk-upload" && <span className="tpo-stab-badge">New</span>}
          </button>
        ))}
      </div>

      {/* ===== ALL STUDENTS ===== */}
      {activeStudentTab === "all" && (
        <div className="tpo-tab-body">
          <div className="tpo-search-bar">
            <span className="tpo-search-icon">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              className="tpo-search-input"
              type="search"
              placeholder="Search by name, email, branch or roll no…"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              aria-label="Search students"
            />
            {studentSearch && (
              <button type="button" className="tpo-search-clear" onClick={() => setStudentSearch("")} aria-label="Clear search">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>

          {isStudentsLoading || isSearching ? (
            <LoadingState label={isSearching ? "Searching…" : "Loading students…"} />
          ) : searchError ? (
            <div className="tpo-search-error" role="alert">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>Search failed: {searchError}</span>
            </div>
          ) : (
            <>
              <StudentsTable rows={displayRows} />
              {searchRows ? (
                <p className="tpo-result-note">{searchRows.length} result{searchRows.length !== 1 ? "s" : ""} — clear search to restore paginated list.</p>
              ) : (
                <StudentPaginationBar pagination={studentPagination} pageStart={pageStart} pageEnd={pageEnd}
                  onPrev={() => goToStudentPage(studentPagination.page - 1)}
                  onNext={() => goToStudentPage(studentPagination.page + 1)}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* ===== BATCH ===== */}
      {activeStudentTab === "batch" && (
        <div className="tpo-tab-body">
          <div className="tpo-filter-row">
            <label className="tpo-filter-label">Filter by batch</label>
            <input
              className="tpo-filter-input"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              placeholder="e.g. 2025"
            />
          </div>
          {isStudentsLoading ? <LoadingState label="Loading students…" /> : (
            <>
              <StudentsTable rows={studentRows} batchMode />
              <StudentPaginationBar pagination={studentPagination} pageStart={pageStart} pageEnd={pageEnd}
                onPrev={() => goToStudentPage(studentPagination.page - 1)}
                onNext={() => goToStudentPage(studentPagination.page + 1)}
              />
            </>
          )}
        </div>
      )}

      {/* ===== ADD STUDENT ===== */}
      {activeStudentTab === "add" && (
        <div className="tpo-tab-body">
          <div className="tpo-form-card">
            <div className="tpo-form-card-header">
              <div className="tpo-form-card-icon tpo-form-card-icon--green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="18" height="18"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              </div>
              <div>
                <h3>Invite a Student</h3>
                <p>Send an email invite to a student to join the placement portal.</p>
              </div>
            </div>
            <form className="tpo-form-body" onSubmit={handleAddStudent}>
              <div className="tpo-form-field tpo-form-field--full">
                <label className="tpo-label">Student Email *</label>
                <input
                  className="tpo-input"
                  type="email"
                  placeholder="student@college.edu"
                  value={addStudentForm.email}
                  onChange={(e) => setAddStudentForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div className="tpo-form-grid-2">
                <div className="tpo-form-field">
                  <label className="tpo-label">Batch</label>
                  <input className="tpo-input" placeholder="e.g. 2025" value={addStudentForm.batch} onChange={(e) => setAddStudentForm((p) => ({ ...p, batch: e.target.value }))} />
                </div>
                <div className="tpo-form-field">
                  <label className="tpo-label">Branch</label>
                  <input className="tpo-input" placeholder="e.g. Computer Science" value={addStudentForm.branch} onChange={(e) => setAddStudentForm((p) => ({ ...p, branch: e.target.value }))} />
                </div>
              </div>
              <div className="tpo-form-field">
                <label className="tpo-label">Year *</label>
                <input className="tpo-input" placeholder="e.g. 3" value={addStudentForm.year} onChange={(e) => setAddStudentForm((p) => ({ ...p, year: e.target.value }))} required />
              </div>
              <div className="tpo-form-actions">
                <button className="tpo-btn tpo-btn--primary" type="submit" disabled={isAddingStudent}>
                  {isAddingStudent ? (
                    <><span className="tpo-btn-spinner" />Sending…</>
                  ) : (
                    <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>Send Invite</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== BULK UPLOAD ===== */}
      {activeStudentTab === "bulk-upload" && (
        <div className="tpo-tab-body">
          <div className="tpo-bulk-wrap">
            {/* Info banner */}
            <div className="tpo-bulk-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div>
                <strong>Bulk Student Upload</strong>
                <p>Upload a <code>.csv</code> or <code>.xlsx</code> file to import multiple students at once. The system will update existing students and optionally create invite links for new ones. Required column: <strong>Email</strong>.</p>
              </div>
              <button type="button" className="tpo-btn tpo-btn--outline" onClick={downloadSampleTemplate}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Sample Template
              </button>
            </div>

            <form onSubmit={handleBulkStudentUpload} className="tpo-bulk-form">
              {/* Drop zone */}
              <div
                className={`tpo-dropzone${isDragOver ? " tpo-dropzone--active" : ""}${bulkUploadFile ? " tpo-dropzone--filled" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Upload file area"
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  className="tpo-dropzone-input"
                  onChange={(e) => setBulkUploadFile(e.target.files?.[0] ?? null)}
                />
                {bulkUploadFile ? (
                  <div className="tpo-dropzone-filled">
                    <div className="tpo-dropzone-file-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="28" height="28"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div>
                      <p className="tpo-dropzone-filename">{bulkUploadFile.name}</p>
                      <p className="tpo-dropzone-filesize">{(bulkUploadFile.size / 1024).toFixed(1)} KB — click to change</p>
                    </div>
                    <button
                      type="button"
                      className="tpo-dropzone-remove"
                      onClick={(e) => { e.stopPropagation(); setBulkUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      aria-label="Remove file"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ) : (
                  <div className="tpo-dropzone-empty">
                    <div className="tpo-dropzone-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="36" height="36"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                    </div>
                    <p className="tpo-dropzone-title">Drag &amp; drop your file here</p>
                    <p className="tpo-dropzone-hint">or <span>browse to upload</span> — .csv or .xlsx, up to 10 MB</p>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="tpo-bulk-options">
                <h4 className="tpo-bulk-options-title">Default Values (optional)</h4>
                <p className="tpo-bulk-options-hint">These will be applied to rows that don't have the field filled in.</p>
                <div className="tpo-form-grid-3">
                  <div className="tpo-form-field">
                    <label className="tpo-label">Default Batch</label>
                    <input className="tpo-input" placeholder="e.g. 2025" value={bulkUploadForm.defaultBatch} onChange={(e) => setBulkUploadForm((p) => ({ ...p, defaultBatch: e.target.value }))} />
                  </div>
                  <div className="tpo-form-field">
                    <label className="tpo-label">Default Department</label>
                    <input className="tpo-input" placeholder="e.g. Engineering" value={bulkUploadForm.defaultDepartment} onChange={(e) => setBulkUploadForm((p) => ({ ...p, defaultDepartment: e.target.value }))} />
                  </div>
                  <div className="tpo-form-field">
                    <label className="tpo-label">Default Year</label>
                    <input className="tpo-input" placeholder="e.g. 3" value={bulkUploadForm.defaultYear} onChange={(e) => setBulkUploadForm((p) => ({ ...p, defaultYear: e.target.value }))} />
                  </div>
                </div>

                <label className="tpo-checkbox-label">
                  <input
                    type="checkbox"
                    className="tpo-checkbox"
                    checked={bulkUploadForm.createInviteForMissing}
                    onChange={(e) => setBulkUploadForm((p) => ({ ...p, createInviteForMissing: e.target.checked }))}
                  />
                  <span className="tpo-checkbox-text">
                    <strong>Create invite links for new students</strong>
                    <span>Students not yet in Scout will receive an email invitation.</span>
                  </span>
                </label>
              </div>

              {/* Submit */}
              <div className="tpo-bulk-submit">
                <button
                  type="submit"
                  className="tpo-btn tpo-btn--primary tpo-btn--lg"
                  disabled={!bulkUploadFile || isBulkUploading}
                >
                  {isBulkUploading ? (
                    <><span className="tpo-btn-spinner" />Processing upload…</>
                  ) : (
                    <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>Upload Students</>
                  )}
                </button>
                {isBulkUploading && (
                  <div className="tpo-bulk-progress">
                    <div className="tpo-bulk-progress-bar">
                      <div className="tpo-bulk-progress-fill" />
                    </div>
                    <p>Importing records — this may take a moment…</p>
                  </div>
                )}
              </div>
            </form>

            {/* How it works */}
            <div className="tpo-bulk-guide">
              <h4>How it works</h4>
              <ol className="tpo-bulk-steps">
                <li><span>1</span>Download the sample template to see the expected column headers.</li>
                <li><span>2</span>Fill in student data. Only <strong>Email</strong> is required per row.</li>
                <li><span>3</span>Upload the file. The system validates and shows any errors before importing.</li>
                <li><span>4</span>Existing students are updated. New students can be auto-invited.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ===== INVITES ===== */}
      {activeStudentTab === "invites" && (
        <div className="tpo-tab-body">
          {studentInvites.length === 0 ? (
            <EmptyState
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12"/></svg>}
              title="No invites sent yet"
              desc={`Add a student via the "Add Student" tab to send an invite.`}
            />
          ) : (
            <div className="tpo-table-wrap">
              <table className="tpo-table">
                <thead>
                  <tr>
                    <th>Email</th><th>Branch</th><th>Batch</th><th>Year</th><th>Status</th><th>Expires</th><th>Accepted At</th>
                  </tr>
                </thead>
                <tbody>
                  {studentInvites.map((invite) => (
                    <tr key={invite.id}>
                      <td className="tpo-td-primary">{invite.email}</td>
                      <td>{invite.branch || "—"}</td>
                      <td>{invite.batch || "—"}</td>
                      <td>{invite.year || "—"}</td>
                      <td><InviteBadge status={invite.status} /></td>
                      <td className="tpo-td-muted">{invite.expiresAt || "—"}</td>
                      <td className="tpo-td-muted">{invite.acceptedAt || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== DOWNLOAD ===== */}
      {activeStudentTab === "download" && (
        <div className="tpo-tab-body">
          <div className="tpo-form-card">
            <div className="tpo-form-card-header">
              <div className="tpo-form-card-icon tpo-form-card-icon--blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="18" height="18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </div>
              <div>
                <h3>Export Student Data</h3>
                <p>Filter by any combination of fields and download as CSV.</p>
              </div>
            </div>
            <div className="tpo-form-body">
              <div className="tpo-form-grid-2">
                <div className="tpo-form-field">
                  <label className="tpo-label">Branch</label>
                  <input className="tpo-input" placeholder="e.g. Computer Science" value={downloadFilters.branch} onChange={(e) => setDownloadFilters((p) => ({ ...p, branch: e.target.value }))} />
                </div>
                <div className="tpo-form-field">
                  <label className="tpo-label">Batch</label>
                  <input className="tpo-input" placeholder="e.g. 2025" value={downloadFilters.batch} onChange={(e) => setDownloadFilters((p) => ({ ...p, batch: e.target.value }))} />
                </div>
                <div className="tpo-form-field">
                  <label className="tpo-label">State</label>
                  <input className="tpo-input" placeholder="e.g. Maharashtra" value={downloadFilters.state} onChange={(e) => setDownloadFilters((p) => ({ ...p, state: e.target.value }))} />
                </div>
                <div className="tpo-form-field">
                  <label className="tpo-label">Country</label>
                  <input className="tpo-input" placeholder="e.g. India" value={downloadFilters.country} onChange={(e) => setDownloadFilters((p) => ({ ...p, country: e.target.value }))} />
                </div>
              </div>
              <div className="tpo-form-field">
                <label className="tpo-label">Area of Study</label>
                <input className="tpo-input" placeholder="e.g. Engineering" value={downloadFilters.areaOfStudy} onChange={(e) => setDownloadFilters((p) => ({ ...p, areaOfStudy: e.target.value }))} />
              </div>
              <div className="tpo-form-actions">
                <button type="button" className="tpo-btn tpo-btn--primary" onClick={handleDownloadFilteredStudents}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== PROFILE EDITS ===== */}
      {activeStudentTab === "profile-edits" && (
        <div className="tpo-tab-body">
          {isProfileEditsLoading ? (
            <LoadingState label="Loading profile edit requests…" />
          ) : (
            <>
              <div className="tpo-section-toolbar">
                <p className="tpo-section-hint">
                  Students who asked to re-edit their submitted profile. Approving unlocks their form temporarily.
                </p>
                <button type="button" className="tpo-btn tpo-btn--outline" onClick={() => void loadProfileEditRequests()} disabled={isProfileEditsLoading}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="13" height="13"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  Refresh
                </button>
              </div>
              {profileEditRequests.length === 0 ? (
                <EmptyState
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
                  title="No pending requests"
                  desc="No students have requested a profile edit."
                />
              ) : (
                <div className="tpo-table-wrap">
                  <table className="tpo-table">
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>College</th><th>Batch</th><th>Branch</th><th>Profile</th><th>Action</th><th>View</th></tr>
                    </thead>
                    <tbody>
                      {profileEditRequests.map((row) => (
                        <tr key={row.studentId}>
                          <td className="tpo-td-primary">{row.fullName || "—"}</td>
                          <td className="tpo-td-muted">{row.email || "—"}</td>
                          <td>{row.college || "—"}</td>
                          <td>{row.batch || "—"}</td>
                          <td>{row.branch || "—"}</td>
                          <td>
                            <span className={`tpo-badge ${row.profileComplete ? "tpo-badge--green" : "tpo-badge--amber"}`}>
                              {row.profileComplete ? "Complete" : "Incomplete"}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="tpo-btn tpo-btn--sm tpo-btn--primary"
                              disabled={approvingStudentId === row.studentId}
                              onClick={() => void handleApproveProfileEdit(row.studentId)}
                            >
                              {approvingStudentId === row.studentId ? "…" : "Approve"}
                            </button>
                          </td>
                          <td><StudentViewLink studentId={row.studentId} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Sub-components ---- */

function StudentsTable({ rows, batchMode = false }: { rows: Props["studentRows"]; batchMode?: boolean }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
        title="No students found"
        desc="Try a different search term or adjust the batch filter."
      />
    );
  }
  return (
    <div className="tpo-table-wrap">
      <table className="tpo-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            {!batchMode && <th>Branch</th>}
            <th>Batch</th>
            {batchMode && <th>Branch</th>}
            {!batchMode && <th>College</th>}
            {!batchMode && <th>Status</th>}
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId || row.email}>
              <td className="tpo-td-primary tpo-td-name">
                <span className="tpo-avatar-sm">{(row.fullName || "?")[0]?.toUpperCase()}</span>
                {row.fullName || "—"}
              </td>
              <td className="tpo-td-muted">{row.email || "—"}</td>
              {!batchMode && <td>{row.branch || "—"}</td>}
              <td>{row.batch || "—"}</td>
              {batchMode && <td>{row.branch || "—"}</td>}
              {!batchMode && <td>{row.college || "—"}</td>}
              {!batchMode && (
                <td>
                  {row.isPendingInvite ? (
                    <span className="tpo-badge tpo-badge--amber">{row.inviteStatus || "Invited"}</span>
                  ) : (
                    <span className="tpo-badge tpo-badge--green">Registered</span>
                  )}
                </td>
              )}
              <td>
                {row.isPendingInvite ? <span className="tpo-td-muted">—</span> : <StudentViewLink studentId={row.studentId || row.email} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentPaginationBar({ pagination, pageStart, pageEnd, onPrev, onNext }: {
  pagination: Props["studentPagination"];
  pageStart: number; pageEnd: number;
  onPrev: () => void; onNext: () => void;
}) {
  if (pagination.total === 0) return null;
  return (
    <div className="tpo-pagination">
      <span className="tpo-pagination-info">Showing {pageStart}–{pageEnd} of {pagination.total}</span>
      <div className="tpo-pagination-btns">
        <button type="button" className="tpo-page-btn" disabled={!pagination.hasPrev} onClick={onPrev}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
          Prev
        </button>
        <span className="tpo-page-indicator">Page {pagination.page} of {pagination.totalPages}</span>
        <button type="button" className="tpo-page-btn" disabled={!pagination.hasNext} onClick={onNext}>
          Next
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  );
}

function InviteBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pending: "tpo-badge--amber",
    Accepted: "tpo-badge--green",
    Expired: "tpo-badge--grey",
  };
  return <span className={`tpo-badge ${map[status] ?? "tpo-badge--grey"}`}>{status}</span>;
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="tpo-empty">
      <div className="tpo-empty-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{desc}</p>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="tpo-loading-state">
      <span className="tpo-loading-spinner" />
      <span>{label}</span>
    </div>
  );
}
