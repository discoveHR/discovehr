"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  assignPsychometricToStudents,
  createAdminPsychometricAssessment,
  getAdminCollegesDirectory,
  getAdminCollegeStudents,
  getPsychometricModuleConfig,
  listAdminPsychometricAssessments,
  listAdminPsychometricAssignments,
  simulatePsychometricWebhook,
  type AdminCollegeRow,
  type AdminCollegeStudent,
  type PsychometricAssessment,
  type PsychometricAssignment,
  type PsychometricModuleConfig,
} from "../../lib/api";

export function AdminPsychometricPanel() {
  const [assessments, setAssessments] = useState<PsychometricAssessment[]>([]);
  const [assignments, setAssignments] = useState<PsychometricAssignment[]>([]);
  const [config, setConfig] = useState<PsychometricModuleConfig | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [taoTestId, setTaoTestId] = useState("");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [studentEmailsText, setStudentEmailsText] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [colleges, setColleges] = useState<AdminCollegeRow[]>([]);
  const [collegeAssignId, setCollegeAssignId] = useState("");
  const [collegeStudents, setCollegeStudents] = useState<AdminCollegeStudent[]>([]);
  const [collegeSelectedIds, setCollegeSelectedIds] = useState<Set<string>>(new Set());
  const [collegeAssignAll, setCollegeAssignAll] = useState(true);
  const [loadingCollegeStudents, setLoadingCollegeStudents] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [simulatingId, setSimulatingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh(assessmentId?: string) {
    setIsLoading(true);
    setError("");
    try {
      const [assessmentRows, assignmentRows, moduleConfig] = await Promise.all([
        listAdminPsychometricAssessments(),
        listAdminPsychometricAssignments(assessmentId),
        getPsychometricModuleConfig(),
      ]);
      setAssessments(assessmentRows);
      setAssignments(assignmentRows);
      setConfig(moduleConfig);
      if (!selectedAssessmentId && assessmentRows.length > 0) {
        setSelectedAssessmentId(assessmentRows[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load psychometric data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh(selectedAssessmentId || undefined);
  }, [selectedAssessmentId]);

  useEffect(() => {
    void (async () => {
      try {
        const dir = await getAdminCollegesDirectory();
        setColleges(dir.colleges);
      } catch { /* non-critical */ }
    })();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const created = await createAdminPsychometricAssessment({
        title: title.trim(),
        description: description.trim(),
        durationMinutes,
        status: "Published",
        taoTestId: taoTestId.trim() || undefined,
      });
      setTitle("");
      setDescription("");
      setTaoTestId("");
      setSelectedAssessmentId(created.id);
      setMessage(
        created.taoTestId
          ? `Assessment created. TAO id: ${created.taoTestId}`
          : "Assessment created. Check TAO sync status in the table.",
      );
      await refresh(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAssign(event: FormEvent) {
    event.preventDefault();
    if (!selectedAssessmentId) {
      setError("Select an assessment first.");
      return;
    }
    const emails = studentEmailsText
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (emails.length === 0) {
      setError("Enter at least one student email, or use Assign from college below.");
      return;
    }
    setIsAssigning(true);
    setError("");
    setMessage("");
    try {
      const result = await assignPsychometricToStudents({
        assessmentId: selectedAssessmentId,
        studentEmails: emails,
        dueAt: dueAt || undefined,
      });
      setStudentEmailsText("");
      const skippedNote =
        result.skipped?.length > 0
          ? ` Skipped: ${result.skipped.map((s) => `${s.email} (${s.reason})`).join("; ")}`
          : "";
      setMessage(`Assigned ${result.created?.length || 0} student(s).${skippedNote}`);
      await refresh(selectedAssessmentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed.");
    } finally {
      setIsAssigning(false);
    }
  }

  async function loadCollegeStudents(collegeKey: string) {
    const college = colleges.find((c) => (c.collegeId || c.collegeName) === collegeKey);
    if (!college) return;
    setLoadingCollegeStudents(true);
    setError("");
    try {
      const payload = await getAdminCollegeStudents({
        collegeId: college.collegeId || undefined,
        collegeName: college.collegeName,
      });
      setCollegeStudents(payload.students);
      setCollegeSelectedIds(new Set(payload.students.map((s) => s.studentId)));
      setCollegeAssignAll(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load college students.");
      setCollegeStudents([]);
    } finally {
      setLoadingCollegeStudents(false);
    }
  }

  async function handleCollegeAssign(event: FormEvent) {
    event.preventDefault();
    if (!selectedAssessmentId) {
      setError("Select an assessment first.");
      return;
    }
    const college = colleges.find((c) => (c.collegeId || c.collegeName) === collegeAssignId);
    if (!college) {
      setError("Select a college.");
      return;
    }
    if (!collegeAssignAll && collegeSelectedIds.size === 0) {
      setError("Select at least one student.");
      return;
    }
    setIsAssigning(true);
    setError("");
    setMessage("");
    try {
      const result = await assignPsychometricToStudents({
        assessmentId: selectedAssessmentId,
        collegeId: college.collegeId || undefined,
        collegeName: college.collegeName,
        assignAllCollegeStudents: collegeAssignAll,
        studentIds: collegeAssignAll ? undefined : Array.from(collegeSelectedIds),
        dueAt: dueAt || undefined,
      });
      const skippedNote =
        result.skipped?.length > 0
          ? ` Skipped: ${result.skipped.map((s) => `${s.email} (${s.reason})`).join("; ")}`
          : "";
      setMessage(`Assigned ${result.created?.length || 0} student(s) from ${college.collegeName}.${skippedNote}`);
      await refresh(selectedAssessmentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "College assign failed.");
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleSimulate(assignmentId: string) {
    setSimulatingId(assignmentId);
    setError("");
    try {
      const res = await simulatePsychometricWebhook(assignmentId);
      setMessage(res.message || "Simulated result saved.");
      await refresh(selectedAssessmentId || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulate failed.");
    } finally {
      setSimulatingId("");
    }
  }

  return (
    <>
      <div className="tpo-panel" style={{ marginBottom: 14 }}>
        <p className="table-caption" style={{ margin: 0 }}>
          {config?.taoConfigured ? "TAO connected." : "TAO not configured — dev mode uses local test ids."}
          {config?.devMode ? " Dev mode ON: students can submit sample results." : ""}
          {config?.webhookConfigured ? " Webhook secret set." : " Set SCOUT_TAO_WEBHOOK_SECRET for production webhooks."}
        </p>
      </div>

      <div className="tpo-panel">
        <h2 className="company-title" style={{ fontSize: "17px", margin: "0 0 8px" }}>
          Create psychometric assessment
        </h2>
        <p className="company-subtitle" style={{ margin: "0 0 14px" }}>
          Leave TAO test id empty to auto-create in TAO, or paste an existing test id from TAO admin.
        </p>
        <form className="job-form-grid" onSubmit={handleCreate}>
          <div className="job-form-row">
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Campus psychometric — 2026" required />
          </div>
          <div className="job-form-row">
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="job-form-dual">
            <div className="job-form-row">
              <label>Duration (minutes)</label>
              <input
                type="number"
                min={5}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                required
              />
            </div>
            <div className="job-form-row">
              <label>TAO test id (optional)</label>
              <input value={taoTestId} onChange={(e) => setTaoTestId(e.target.value)} placeholder="Paste from TAO or leave blank" />
            </div>
          </div>
          <div className="job-form-actions">
            <button type="submit" className="table-btn" disabled={isSaving}>
              {isSaving ? "Creating…" : "Create & publish"}
            </button>
          </div>
        </form>
      </div>

      <div className="tpo-panel">
        <h2 className="company-title" style={{ fontSize: "17px", margin: "0 0 8px" }}>
          Assign to students
        </h2>
        <form className="job-form-grid" onSubmit={handleAssign}>
          <div className="job-form-row">
            <label>Assessment</label>
            <select value={selectedAssessmentId} onChange={(e) => setSelectedAssessmentId(e.target.value)} required>
              <option value="">Select assessment</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.status}) — TAO: {a.taoSyncStatus}
                </option>
              ))}
            </select>
          </div>
          <div className="job-form-row">
            <label>Student emails (comma or newline separated)</label>
            <textarea
              value={studentEmailsText}
              onChange={(e) => setStudentEmailsText(e.target.value)}
              rows={4}
              placeholder="student1@college.edu&#10;student2@college.edu"
            />
          </div>
          <div className="job-form-row">
            <label>Due date (optional)</label>
            <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
          <div className="job-form-actions">
            <button type="submit" className="table-btn" disabled={isAssigning}>
              {isAssigning ? "Assigning…" : "Assign students"}
            </button>
          </div>
        </form>
      </div>

      <div className="tpo-panel">
        <h2 className="company-title" style={{ fontSize: "17px", margin: "0 0 8px" }}>
          Assign from college
        </h2>
        <p className="company-subtitle" style={{ margin: "0 0 14px" }}>
          Pick a college, select students, and assign the assessment chosen above.
        </p>
        <form className="job-form-grid" onSubmit={handleCollegeAssign}>
          <div className="job-form-row">
            <label>College</label>
            <select
              value={collegeAssignId}
              onChange={(e) => {
                setCollegeAssignId(e.target.value);
                void loadCollegeStudents(e.target.value);
              }}
            >
              <option value="">Select college</option>
              {colleges.map((c) => (
                <option key={c.collegeId || c.collegeName} value={c.collegeId || c.collegeName}>
                  {c.collegeName} ({c.studentCount} students)
                </option>
              ))}
            </select>
          </div>
          {loadingCollegeStudents ? <p className="table-caption">Loading students…</p> : null}
          {collegeStudents.length > 0 ? (
            <div className="job-form-row">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ margin: 0 }}>Students</label>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => {
                    setCollegeAssignAll(true);
                    setCollegeSelectedIds(new Set(collegeStudents.map((s) => s.studentId)));
                  }}
                >
                  Select all
                </button>
              </div>
              <div className="admin-student-picker">
                {collegeStudents.map((s) => (
                  <label key={s.studentId} className="admin-student-picker-row">
                    <input
                      type="checkbox"
                      checked={collegeAssignAll || collegeSelectedIds.has(s.studentId)}
                      onChange={() => {
                        setCollegeAssignAll(false);
                        setCollegeSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.studentId)) next.delete(s.studentId);
                          else next.add(s.studentId);
                          return next;
                        });
                      }}
                    />
                    <span>
                      {s.fullName} — {s.email} ({s.profileStatus})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <div className="job-form-actions">
            <button type="submit" className="table-btn" disabled={isAssigning || !collegeAssignId}>
              {isAssigning ? "Assigning…" : "Assign selected college students"}
            </button>
          </div>
        </form>
      </div>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <div className="company-table-wrap">
        <div className="company-table-head">
          <h3>Assessments</h3>
          <span className="table-caption">{isLoading ? "Loading…" : `${assessments.length} assessment(s)`}</span>
        </div>
        <table className="company-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>TAO</th>
              <th>Assigned</th>
            </tr>
          </thead>
          <tbody>
            {assessments.length === 0 ? (
              <tr>
                <td colSpan={4}>No psychometric assessments yet.</td>
              </tr>
            ) : (
              assessments.map((a) => (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td>{a.status}</td>
                  <td>
                    {a.taoSyncStatus}
                    {a.taoTestId ? ` · ${a.taoTestId}` : ""}
                  </td>
                  <td>{a.assignmentCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="company-table-wrap" style={{ marginTop: 18 }}>
        <div className="company-table-head">
          <h3>Assignments</h3>
          <span className="table-caption">{assignments.length} row(s) for selected assessment</span>
        </div>
        <table className="company-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Status</th>
              <th>Due</th>
              <th>Result</th>
              {config?.devMode ? <th>Dev</th> : null}
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={config?.devMode ? 5 : 4}>No assignments for this filter.</td>
              </tr>
            ) : (
              assignments.map((row) => (
                <tr key={row.id}>
                  <td>{row.studentName || row.studentEmail || row.studentUser}</td>
                  <td>{row.status}</td>
                  <td>{row.dueAt ? row.dueAt.slice(0, 10) : "—"}</td>
                  <td>{row.hasResult ? "Yes" : "—"}</td>
                  {config?.devMode ? (
                    <td>
                      {!row.hasResult ? (
                        <button
                          type="button"
                          className="table-btn secondary"
                          disabled={simulatingId === row.id}
                          onClick={() => void handleSimulate(row.id)}
                        >
                          {simulatingId === row.id ? "…" : "Simulate result"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
