"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  assignTpoAptitudeToStudents,
  createTpoAptitudePaymentOrder,
  getAptitudeModuleConfig,
  listTpoAptitudeAssessments,
  listTpoAptitudeAssignments,
  verifyTpoAptitudePayment,
  type AptitudeAssessment,
  type AptitudeAssignment,
  type AptitudeModuleConfig,
} from "../../lib/api";
import { listTpoStudentsByParameters, type TpoListedStudent } from "../../lib/api";
import { openRazorpayCheckout } from "../../lib/razorpay";

export function TpoAptitudePanel() {
  const [step, setStep] = useState<"create" | "assign">("create");
  const [config, setConfig] = useState<AptitudeModuleConfig | null>(null);
  const [assessments, setAssessments] = useState<AptitudeAssessment[]>([]);
  const [assignments, setAssignments] = useState<AptitudeAssignment[]>([]);
  const [students, setStudents] = useState<TpoListedStudent[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [assignAll, setAssignAll] = useState(true);
  const [dueAt, setDueAt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const feeInr = config?.tpoCreateFeeInr ?? 30;

  const refresh = useCallback(async (assessmentId?: string) => {
    const [rows, moduleConfig, assignmentRows, studentList] = await Promise.all([
      listTpoAptitudeAssessments(),
      getAptitudeModuleConfig(),
      listTpoAptitudeAssignments(assessmentId),
      listTpoStudentsByParameters({ page: 1, pageSize: 500 }),
    ]);
    setAssessments(rows);
    setConfig(moduleConfig);
    setAssignments(assignmentRows);
    setStudents(studentList.students);
    if (!selectedAssessmentId && rows.length > 0) {
      setSelectedAssessmentId(rows[0].id);
    }
  }, [selectedAssessmentId]);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      setError("");
      try {
        await refresh(selectedAssessmentId || undefined);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load aptitude tests.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refresh, selectedAssessmentId]);

  async function handlePayAndCreate(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setIsPaying(true);
    setError("");
    setMessage("");
    try {
      const order = await createTpoAptitudePaymentOrder({
        title: title.trim(),
        description: description.trim(),
        durationMinutes,
      });
      if (order.devBypass) {
        const res = await verifyTpoAptitudePayment({ paymentOrderId: order.paymentOrderId });
        if (res.assessment) {
          setSelectedAssessmentId(res.assessment.id);
          setStep("assign");
          setMessage(res.message || "Aptitude test created (dev bypass).");
          setTitle("");
          setDescription("");
          await refresh(res.assessment.id);
        }
        return;
      }
      await openRazorpayCheckout({
        keyId: order.keyId,
        amountPaise: order.amountPaise,
        currency: order.currency,
        orderId: order.razorpayOrderId,
        name: "Scout Express",
        description: `Aptitude test — ₹${feeInr}`,
        onSuccess: async (rzp) => {
          try {
            const res = await verifyTpoAptitudePayment({
              paymentOrderId: order.paymentOrderId,
              razorpayPaymentId: rzp.razorpayPaymentId,
              razorpayOrderId: rzp.razorpayOrderId,
              razorpaySignature: rzp.razorpaySignature,
            });
            if (res.assessment) {
              setSelectedAssessmentId(res.assessment.id);
              setStep("assign");
              setMessage(res.message || "Payment verified. Aptitude test is ready to assign.");
              setTitle("");
              setDescription("");
              await refresh(res.assessment.id);
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment verification failed.");
          }
        },
        onDismiss: () => setError("Payment cancelled."),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment.");
    } finally {
      setIsPaying(false);
    }
  }

  async function handleAssign(event: FormEvent) {
    event.preventDefault();
    if (!selectedAssessmentId) {
      setError("Select an assessment.");
      return;
    }
    if (!assignAll && selectedStudentIds.size === 0) {
      setError("Select at least one student.");
      return;
    }
    setIsAssigning(true);
    setError("");
    setMessage("");
    try {
      const result = await assignTpoAptitudeToStudents({
        assessmentId: selectedAssessmentId,
        assignAllCollegeStudents: assignAll,
        studentIds: assignAll ? undefined : Array.from(selectedStudentIds),
        dueAt: dueAt || undefined,
      });
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

  return (
    <>
      <div className="tpo-panel" style={{ marginBottom: 14 }}>
        <p className="table-caption" style={{ margin: 0 }}>
          Create one aptitude test per payment (₹{feeInr}). Tests are delivered via TAO.
          {config?.taoConfigured ? " TAO connected." : " TAO not configured — dev mode uses local ids."}
        </p>
      </div>

      <div className="job-form-actions" style={{ justifyContent: "flex-start", marginBottom: 14, gap: 8 }}>
        <button type="button" className={`table-btn ${step === "create" ? "" : "secondary"}`} onClick={() => setStep("create")}>
          1. Create & pay
        </button>
        <button
          type="button"
          className={`table-btn ${step === "assign" ? "" : "secondary"}`}
          onClick={() => setStep("assign")}
          disabled={assessments.length === 0}
        >
          2. Assign students
        </button>
      </div>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {step === "create" ? (
        <div className="tpo-panel">
          <h2 className="company-title" style={{ fontSize: "17px", margin: "0 0 8px" }}>
            New aptitude test (₹{feeInr})
          </h2>
          <form className="job-form-grid" onSubmit={handlePayAndCreate}>
            <div className="job-form-row">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Quantitative aptitude — Batch 2026" />
            </div>
            <div className="job-form-row">
              <label>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
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
            <div className="job-form-actions">
              <button type="submit" className="table-btn" disabled={isPaying}>
                {isPaying ? "Processing…" : `Pay ₹${feeInr} & create test`}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="tpo-panel">
          <h2 className="company-title" style={{ fontSize: "17px", margin: "0 0 8px" }}>
            Assign college students
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
            {students.length > 0 ? (
              <div className="job-form-row">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ margin: 0 }}>Students ({students.length})</label>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      setAssignAll(true);
                      setSelectedStudentIds(new Set(students.map((s) => s.studentId)));
                    }}
                  >
                    Select all
                  </button>
                </div>
                <div className="admin-student-picker">
                  {students.map((s) => (
                    <label key={s.studentId} className="admin-student-picker-row">
                      <input
                        type="checkbox"
                        checked={assignAll || selectedStudentIds.has(s.studentId)}
                        onChange={() => {
                          setAssignAll(false);
                          setSelectedStudentIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(s.studentId)) next.delete(s.studentId);
                            else next.add(s.studentId);
                            return next;
                          });
                        }}
                      />
                      <span>
                        {s.fullName} — {s.email}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="table-caption">No students in your college roster yet.</p>
            )}
            <div className="job-form-row">
              <label>Due date (optional)</label>
              <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
            <div className="job-form-actions">
              <button type="submit" className="table-btn" disabled={isAssigning || students.length === 0}>
                {isAssigning ? "Assigning…" : "Assign students"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="company-table-wrap" style={{ marginTop: 18 }}>
        <div className="company-table-head">
          <h3>Your aptitude tests</h3>
          <span className="table-caption">{isLoading ? "Loading…" : `${assessments.length} test(s)`}</span>
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
                <td colSpan={4}>No aptitude tests yet. Pay ₹{feeInr} to create one.</td>
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

      {assignments.length > 0 ? (
        <div className="company-table-wrap" style={{ marginTop: 18 }}>
          <div className="company-table-head">
            <h3>Assignments</h3>
          </div>
          <table className="company-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((row) => (
                <tr key={row.id}>
                  <td>{row.studentName || row.studentEmail || row.studentUser}</td>
                  <td>{row.status}</td>
                  <td>{row.hasResult ? "Yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
