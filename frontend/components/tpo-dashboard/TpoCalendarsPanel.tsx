"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createMockExam,
  createPlacementCalendarEvent,
  createTrainingSession,
  formatDatetimeForDisplay,
  listMockExams,
  listPlacementCalendarEvents,
  listTrainingSessions,
  mergeDateAndTime,
  publishMockExamResults,
  type MockExam,
  type PlacementCalendarEvent,
  type TrainingSession,
} from "../../lib/api";
import { CalendarDatetimeFields } from "./CalendarDatetimeFields";

type Tab = "placement" | "training" | "exams";

type Props = { onError: (m: string) => void; onSuccess: (m: string) => void };

function readFormString(fd: FormData, key: string): string {
  const v = fd.get(key);
  return v == null ? "" : String(v).trim();
}

export function TpoCalendarsPanel({ onError, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>("placement");
  const [placement, setPlacement] = useState<PlacementCalendarEvent[]>([]);
  const [training, setTraining] = useState<TrainingSession[]>([]);
  const [exams, setExams] = useState<MockExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [formKey, setFormKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t, e] = await Promise.all([listPlacementCalendarEvents(), listTrainingSessions(), listMockExams()]);
      setPlacement(p.events || []);
      setTraining(t.sessions || []);
      setExams(e.exams || []);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to load calendars.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setFormKey((k) => k + 1);
  }

  async function submitPlacement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createPlacementCalendarEvent({
        title: readFormString(fd, "title"),
        eventType: readFormString(fd, "eventType") || "Recruitment Drive",
        startDatetime: mergeDateAndTime(readFormString(fd, "startDate"), readFormString(fd, "startTime")),
        endDatetime: mergeDateAndTime(readFormString(fd, "endDate"), readFormString(fd, "endTime")),
        linkedJobId: readFormString(fd, "jobId"),
        slotsAvailable: Number(fd.get("slots") || 0),
        applyOnlyIfSuggested: fd.get("suggestedOnly") === "on",
        location: readFormString(fd, "location"),
        description: readFormString(fd, "description"),
        status: readFormString(fd, "status") || "Published",
      });
      onSuccess("Placement event added.");
      resetForm();
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to create event.");
    }
  }

  async function submitTraining(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createTrainingSession({
        title: readFormString(fd, "title"),
        department: readFormString(fd, "department"),
        startDatetime: mergeDateAndTime(readFormString(fd, "startDate"), readFormString(fd, "startTime")),
        endDatetime: mergeDateAndTime(readFormString(fd, "endDate"), readFormString(fd, "endTime")),
        location: readFormString(fd, "location"),
        trainer: readFormString(fd, "trainer"),
        description: readFormString(fd, "description"),
        status: "Published",
      });
      onSuccess("Training session scheduled.");
      resetForm();
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to create session.");
    }
  }

  async function submitExam(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createMockExam({
        title: readFormString(fd, "title"),
        examDatetime: mergeDateAndTime(readFormString(fd, "examDate"), readFormString(fd, "examTime")),
        durationMinutes: Number(fd.get("duration") || 60),
        feeInr: Number(fd.get("fee") || 50),
        priPointsOnPass: Number(fd.get("pri") || 5),
        instructions: readFormString(fd, "instructions"),
        status: "Published",
      });
      onSuccess("Internal exam published. Students can register and pay the exam fee.");
      resetForm();
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to create exam.");
    }
  }

  async function publishResults(exam: MockExam) {
    const regs = exam.registrations || [];
    if (!regs.length) {
      onError("No registrations to publish.");
      return;
    }
    const results = regs.map((r) => ({
      registrationId: r.name,
      scorePercent: Number(prompt(`Score % for ${r.studentName || r.student_user}`, "70") || 0),
      passed: confirm(`Did ${r.studentName || r.student_user} pass?`),
    }));
    try {
      await publishMockExamResults(exam.id, results);
      onSuccess("Results published; PRI updated for passers.");
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Publish failed.");
    }
  }

  return (
    <div className="tpo-reports-layout">
      <aside className="tpo-reports-sidebar">
        <p className="tpo-reports-sidebar-title">Calendars</p>
        <nav className="tpo-reports-nav">
          {(
            [
              ["placement", "Placement calendar", "Recruitments & interview slots"],
              ["training", "Training calendar", "Department skill sessions"],
              ["exams", "Internal exams", "Mock tests · fee · PRI"],
            ] as const
          ).map(([key, label, desc]) => (
            <button
              key={key}
              type="button"
              className={`tpo-reports-nav-item ${tab === key ? "active" : ""}`}
              onClick={() => setTab(key)}
            >
              <span className="tpo-reports-nav-label">{label}</span>
              <span className="tpo-reports-nav-desc">{desc}</span>
            </button>
          ))}
        </nav>
      </aside>
      <div className="tpo-reports-main">
        {loading ? <p className="empty-state">Loading…</p> : null}
        {tab === "placement" && !loading ? (
          <>
            <form key={`placement-${formKey}`} className="tpo-panel job-form-grid" onSubmit={(e) => void submitPlacement(e)}>
              <h3>Add recruitment / slot</h3>
              <p className="table-caption">Students see published events; apply only if suggested when linked to a company job.</p>
              <div className="job-form-row">
                <label>Title</label>
                <input name="title" placeholder="e.g. Infosys campus drive" required />
              </div>
              <div className="job-form-row">
                <label>Event type</label>
                <select name="eventType" defaultValue="Recruitment Drive">
                  <option>Recruitment Drive</option>
                  <option>Interview Slot</option>
                  <option>Campus Visit</option>
                </select>
              </div>
              <CalendarDatetimeFields label="Start" dateName="startDate" timeName="startTime" required />
              <CalendarDatetimeFields label="End" dateName="endDate" timeName="endTime" required defaultTime="17:00" />
              <div className="job-form-row">
                <label>Linked Scout Job ID (optional)</label>
                <input name="jobId" placeholder="JOB-00001" />
              </div>
              <div className="job-form-row">
                <label>Slots available</label>
                <input name="slots" type="number" min={0} placeholder="e.g. 50" />
              </div>
              <label className="calendar-checkbox-row">
                <input type="checkbox" name="suggestedOnly" defaultChecked /> Apply only if TPO suggested (linked job)
              </label>
              <div className="job-form-row">
                <label>Location / meeting link</label>
                <input name="location" placeholder="Auditorium A or Teams link" />
              </div>
              <div className="job-form-row">
                <label>Description</label>
                <textarea name="description" placeholder="Details for students" rows={2} />
              </div>
              <div className="job-form-row">
                <label>Status</label>
                <select name="status" defaultValue="Published">
                  <option>Published</option>
                  <option>Draft</option>
                </select>
              </div>
              <button type="submit" className="table-btn">
                Add event
              </button>
            </form>
            <EventTable
              headers={["Title", "Type", "Start", "End", "Job", "Suggested-only", "Status"]}
              rows={placement.map((ev) => [
                ev.title,
                ev.eventType,
                formatDatetimeForDisplay(ev.startDatetime),
                formatDatetimeForDisplay(ev.endDatetime),
                ev.linkedJobId || "—",
                ev.applyOnlyIfSuggested ? "Yes" : "No",
                ev.status,
              ])}
            />
          </>
        ) : null}
        {tab === "training" && !loading ? (
          <>
            <form key={`training-${formKey}`} className="tpo-panel job-form-grid" onSubmit={(e) => void submitTraining(e)}>
              <h3>Schedule training</h3>
              <div className="job-form-row">
                <label>Session title</label>
                <input name="title" placeholder="e.g. Aptitude workshop" required />
              </div>
              <div className="job-form-row">
                <label>Department</label>
                <input name="department" placeholder="e.g. Mechanical" required />
              </div>
              <CalendarDatetimeFields label="Start" dateName="startDate" timeName="startTime" required />
              <CalendarDatetimeFields label="End" dateName="endDate" timeName="endTime" required defaultTime="17:00" />
              <div className="job-form-row">
                <label>Trainer</label>
                <input name="trainer" placeholder="Trainer name" />
              </div>
              <div className="job-form-row">
                <label>Location</label>
                <input name="location" placeholder="Room / lab" />
              </div>
              <div className="job-form-row">
                <label>Agenda</label>
                <textarea name="description" rows={2} placeholder="Session outline" />
              </div>
              <button type="submit" className="table-btn">
                Publish session
              </button>
            </form>
            <EventTable
              headers={["Title", "Department", "Start", "End", "Status"]}
              rows={training.map((s) => [
                s.title,
                s.department,
                formatDatetimeForDisplay(s.startDatetime),
                formatDatetimeForDisplay(s.endDatetime),
                s.status,
              ])}
            />
          </>
        ) : null}
        {tab === "exams" && !loading ? (
          <>
            <form key={`exam-${formKey}`} className="tpo-panel job-form-grid" onSubmit={(e) => void submitExam(e)}>
              <h3>Publish internal exam</h3>
              <p className="table-caption">Pick exam date and time from the calendar. Students pay the fee to register.</p>
              <div className="job-form-row">
                <label>Exam title</label>
                <input name="title" placeholder="e.g. Mock aptitude — May 2026" required />
              </div>
              <CalendarDatetimeFields label="Exam date & time" dateName="examDate" timeName="examTime" required defaultTime="10:00" />
              <div className="job-form-dual">
                <div className="job-form-row">
                  <label>Duration (minutes)</label>
                  <input name="duration" type="number" min={15} defaultValue={60} />
                </div>
                <div className="job-form-row">
                  <label>Fee (₹)</label>
                  <input name="fee" type="number" min={0} defaultValue={50} />
                </div>
              </div>
              <div className="job-form-row">
                <label>PRI points on pass</label>
                <input name="pri" type="number" min={0} defaultValue={5} />
              </div>
              <div className="job-form-row">
                <label>Instructions for students</label>
                <textarea name="instructions" rows={2} placeholder="What to bring, reporting time, etc." />
              </div>
              <button type="submit" className="table-btn">
                Publish exam
              </button>
            </form>
            {exams.length === 0 ? <p className="empty-state">No internal exams yet.</p> : null}
            {exams.map((exam) => (
              <div key={exam.id} className="tpo-journey-setup-card">
                <h4>
                  {exam.title} · {formatDatetimeForDisplay(exam.examDatetime)} · ₹{exam.feeInr} · {exam.registrationCount}{" "}
                  registered
                </h4>
                <button type="button" className="table-btn secondary" onClick={() => void publishResults(exam)}>
                  Publish results & apply PRI
                </button>
              </div>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}

function EventTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="company-table-wrap">
      <table className="company-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length}>None yet.</td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
