"use client";

import { FormEvent, useEffect, useState } from "react";
import { ModalCloseButton } from "../common/ModalCloseButton";
import {
  assignPsychometricToStudents,
  getAdminCollegeStudents,
  listAdminPsychometricAssessments,
  type AdminCollegeRow,
  type AdminCollegeStudent,
  type PsychometricAssessment,
} from "../../lib/api";

type AdminPsychometricAssignModalProps = {
  college: AdminCollegeRow;
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

export function AdminPsychometricAssignModal({ college, onClose, onSuccess }: AdminPsychometricAssignModalProps) {
  const [assessments, setAssessments] = useState<PsychometricAssessment[]>([]);
  const [students, setStudents] = useState<AdminCollegeStudent[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dueAt, setDueAt] = useState("");
  const [assignAll, setAssignAll] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const [assessmentRows, studentPayload] = await Promise.all([
          listAdminPsychometricAssessments(),
          getAdminCollegeStudents({
            collegeId: college.collegeId || undefined,
            collegeName: college.collegeName,
          }),
        ]);
        const published = assessmentRows.filter((a) => a.status === "Published");
        setAssessments(published);
        setStudents(studentPayload.students);
        if (published.length > 0) {
          setSelectedAssessmentId(published[0].id);
        }
        setSelectedIds(new Set(studentPayload.students.map((s) => s.studentId)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [college.collegeId, college.collegeName]);

  function toggleStudent(id: string) {
    setAssignAll(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setAssignAll(true);
    setSelectedIds(new Set(students.map((s) => s.studentId)));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedAssessmentId) {
      setError("Select an assessment.");
      return;
    }
    if (!assignAll && selectedIds.size === 0) {
      setError("Select at least one student.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await assignPsychometricToStudents({
        assessmentId: selectedAssessmentId,
        collegeId: college.collegeId || undefined,
        collegeName: college.collegeName,
        assignAllCollegeStudents: assignAll,
        studentIds: assignAll ? undefined : Array.from(selectedIds),
        dueAt: dueAt || undefined,
      });
      const skippedNote =
        result.skipped?.length > 0
          ? ` Skipped: ${result.skipped.map((s) => `${s.email} (${s.reason})`).join("; ")}`
          : "";
      const msg = `Assigned ${result.created?.length || 0} student(s) at ${college.collegeName}.${skippedNote}`;
      onSuccess?.(msg);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assign failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="admin-modal admin-modal--wide" role="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-head">
          <h3>Assign psychometric test</h3>
          <ModalCloseButton onClick={onClose} variant="inline" />
        </div>
        <p className="company-subtitle" style={{ margin: "0 0 12px" }}>
          College: <strong className="admin-college-name">{college.collegeName}</strong>
        </p>

        {loading ? <p>Loading…</p> : null}
        {error ? <p className="error">{error}</p> : null}

        {!loading ? (
          <form className="job-form-grid" onSubmit={handleSubmit}>
            <div className="job-form-row">
              <label>Assessment</label>
              <select value={selectedAssessmentId} onChange={(e) => setSelectedAssessmentId(e.target.value)} required>
                <option value="">Select published assessment</option>
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
              {assessments.length === 0 ? (
                <p className="table-caption">Create a Published assessment under Psychometric tests first.</p>
              ) : null}
            </div>
            <div className="job-form-row">
              <label>Due date (optional)</label>
              <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
            <div className="job-form-row">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ margin: 0 }}>Students ({students.length})</label>
                <button type="button" className="btn-link" onClick={selectAll}>
                  Select all
                </button>
              </div>
              {students.length === 0 ? (
                <p className="table-caption">No students linked to this college.</p>
              ) : (
                <div className="admin-student-picker">
                  {students.map((s) => (
                    <label key={s.studentId} className="admin-student-picker-row">
                      <input
                        type="checkbox"
                        checked={assignAll || selectedIds.has(s.studentId)}
                        onChange={() => toggleStudent(s.studentId)}
                      />
                      <span>
                        <strong>{s.fullName}</strong> — {s.email}
                        <span className={statusClass(s.profileStatus)} style={{ marginLeft: 8 }}>
                          {s.profileStatus}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="job-form-actions">
              <button type="submit" className="table-btn" disabled={submitting || assessments.length === 0}>
                {submitting ? "Assigning…" : assignAll ? `Assign all ${students.length} students` : `Assign ${selectedIds.size} students`}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function statusClass(status: string) {
  return `admin-status-pill admin-status-pill--${status.toLowerCase().replace(/\s+/g, "-")}`;
}
