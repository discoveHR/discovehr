"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyStudentChallenge,
  createMockExamPaymentOrder,
  listStudentChallenges,
  listStudentMockExams,
  listStudentPlacementCalendar,
  listStudentTrainingCalendar,
  registerStudentMockExamDev,
  verifyMockExamPayment,
  type StudentChallenge,
  type StudentMockExam,
  type StudentPlacementEvent,
  type StudentTrainingSession,
} from "../../lib/api";
import { openRazorpayCheckout } from "../../lib/razorpay";

type Tab = "placement" | "training" | "exams" | "challenges";

type Props = {
  studentEmail?: string;
  onError: (m: string) => void;
  onSuccess: (m: string) => void;
};

export function StudentCalendarsPanel({ studentEmail, onError, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>("placement");
  const [placement, setPlacement] = useState<StudentPlacementEvent[]>([]);
  const [training, setTraining] = useState<StudentTrainingSession[]>([]);
  const [exams, setExams] = useState<StudentMockExam[]>([]);
  const [challenges, setChallenges] = useState<StudentChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingExamId, setPayingExamId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t, e, c] = await Promise.all([
        listStudentPlacementCalendar(),
        listStudentTrainingCalendar(),
        listStudentMockExams(),
        listStudentChallenges(),
      ]);
      setPlacement(p.events);
      setTraining(t.sessions);
      setExams(e.exams);
      setChallenges(c.challenges);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to load calendars.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function registerExam(exam: StudentMockExam) {
    setPayingExamId(exam.id);
    try {
      const order = await createMockExamPaymentOrder(exam.id);
      if (order.devBypass) {
        await verifyMockExamPayment({
          paymentOrderId: order.paymentOrderId,
          registrationId: order.registrationId,
        });
        onSuccess("Registered for mock exam.");
        await load();
        return;
      }
      await openRazorpayCheckout({
        keyId: order.keyId,
        amountPaise: order.amountPaise,
        currency: order.currency,
        orderId: order.razorpayOrderId,
        name: "Scout Express",
        description: exam.title,
        prefillEmail: studentEmail,
        onSuccess: async (rzp) => {
          try {
            const msg = await verifyMockExamPayment({
              paymentOrderId: order.paymentOrderId,
              registrationId: order.registrationId,
              razorpayPaymentId: rzp.razorpayPaymentId,
              razorpayOrderId: rzp.razorpayOrderId,
              razorpaySignature: rzp.razorpaySignature,
            });
            onSuccess(msg);
            await load();
          } catch (err) {
            onError(err instanceof Error ? err.message : "Payment verification failed.");
          }
        },
      });
    } catch {
      try {
        const msg = await registerStudentMockExamDev(exam.id);
        onSuccess(msg);
        await load();
      } catch (inner) {
        onError(inner instanceof Error ? inner.message : "Registration failed.");
      }
    } finally {
      setPayingExamId("");
    }
  }

  async function applyChallenge(id: string) {
    try {
      const msg = await applyStudentChallenge(id);
      onSuccess(msg);
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Apply failed.");
    }
  }

  return (
    <section className="company-table-wrap">
      <div className="company-table-head">
        <h3>College calendars & challenges</h3>
        <span className="table-caption">Placement events, training, mock exams (₹50 + PRI on pass), and TPO challenges</span>
      </div>
      <div className="tpo-tabs" style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["placement", "training", "exams", "challenges"] as Tab[]).map((t) => (
          <button key={t} type="button" className={`table-btn ${tab === t ? "" : "secondary"}`} onClick={() => setTab(t)}>
            {t === "placement" ? "Placement" : t === "training" ? "Training" : t === "exams" ? "Mock exams" : "Challenges"}
          </button>
        ))}
      </div>
      {loading ? <p className="company-subtitle">Loading…</p> : null}

      {tab === "placement" && !loading ? (
        <table className="company-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>When</th>
              <th>Location</th>
              <th>Apply</th>
            </tr>
          </thead>
          <tbody>
            {placement.length === 0 ? (
              <tr>
                <td colSpan={4}>No placement events published yet.</td>
              </tr>
            ) : (
              placement.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    <strong>{ev.title}</strong>
                    <div className="table-caption">{ev.eventType}</div>
                  </td>
                  <td>{ev.startDatetime}</td>
                  <td>{ev.location || "—"}</td>
                  <td>
                    {ev.applyOnlyIfSuggested && !ev.canApply ? (
                      <span className="status-pill">Suggested students only</span>
                    ) : (
                      <span className="status-pill active">Eligible</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      ) : null}

      {tab === "training" && !loading ? (
        <table className="company-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Dept</th>
              <th>When</th>
              <th>Trainer</th>
            </tr>
          </thead>
          <tbody>
            {training.length === 0 ? (
              <tr>
                <td colSpan={4}>No training sessions for your department yet.</td>
              </tr>
            ) : (
              training.map((s) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td>{s.department}</td>
                  <td>{s.startDatetime}</td>
                  <td>{s.trainer || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      ) : null}

      {tab === "exams" && !loading ? (
        <table className="company-table">
          <thead>
            <tr>
              <th>Exam</th>
              <th>Fee</th>
              <th>When</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {exams.length === 0 ? (
              <tr>
                <td colSpan={5}>No mock exams published.</td>
              </tr>
            ) : (
              exams.map((ex) => {
                const paid = ex.registration?.payment_status === "Paid";
                return (
                  <tr key={ex.id}>
                    <td>{ex.title}</td>
                    <td>₹{ex.feeInr}</td>
                    <td>{ex.examDatetime}</td>
                    <td>
                      {paid ? (
                        ex.resultsPublished && ex.registration?.passed ? (
                          <span className="status-pill active">Passed — PRI updated</span>
                        ) : (
                          <span className="status-pill active">Registered</span>
                        )
                      ) : (
                        <span className="status-pill">Not registered</span>
                      )}
                    </td>
                    <td>
                      {!paid ? (
                        <button type="button" className="table-btn" disabled={payingExamId === ex.id} onClick={() => void registerExam(ex)}>
                          {payingExamId === ex.id ? "Processing…" : `Pay ₹${ex.feeInr} & register`}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      ) : null}

      {tab === "challenges" && !loading ? (
        <table className="company-table">
          <thead>
            <tr>
              <th>Challenge</th>
              <th>Deadline</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {challenges.length === 0 ? (
              <tr>
                <td colSpan={4}>No open challenges.</td>
              </tr>
            ) : (
              challenges.map((ch) => (
                <tr key={ch.id}>
                  <td>
                    <strong>{ch.title}</strong>
                    <p className="table-caption">{ch.description}</p>
                  </td>
                  <td>{ch.deadline || "—"}</td>
                  <td>{ch.applied ? ch.applicationStatus || "Applied" : "Open"}</td>
                  <td>
                    {!ch.applied ? (
                      <button type="button" className="table-btn" onClick={() => void applyChallenge(ch.id)}>
                        Apply
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
