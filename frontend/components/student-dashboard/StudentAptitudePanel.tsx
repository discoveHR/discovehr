"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAptitudeModuleConfig,
  launchStudentAptitudeAssignment,
  listStudentAptitudeAssignments,
  submitStudentAptitudeDevResult,
  type AptitudeAssignment,
  type AptitudeModuleConfig,
} from "../../lib/api";

export function StudentAptitudePanel() {
  const [assignments, setAssignments] = useState<AptitudeAssignment[]>([]);
  const [config, setConfig] = useState<AptitudeModuleConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [rows, moduleConfig] = await Promise.all([
        listStudentAptitudeAssignments(),
        getAptitudeModuleConfig(),
      ]);
      setAssignments(rows);
      setConfig(moduleConfig);
      return rows;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load aptitude tests.");
      return [];
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      await load();
      setIsLoading(false);
    })();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  function startPollingForResult(assignmentId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(() => {
      attempts += 1;
      void load().then((rows) => {
        const row = rows.find((a) => a.id === assignmentId);
        if (row?.hasResult || row?.status === "Completed" || attempts >= 24) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          if (row?.hasResult) {
            setMessage("Your aptitude result is ready below.");
          }
        }
      });
    }, 5000);
  }

  async function handleStart(assignment: AptitudeAssignment) {
    setBusyId(assignment.id);
    setError("");
    setMessage("");
    try {
      const session = await launchStudentAptitudeAssignment(assignment.id);
      const url = session.launchUrl || assignment.launchUrl;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        setMessage("Test opened in a new tab. This page will refresh when your result arrives.");
        startPollingForResult(assignment.id);
      } else if (session.devMode || config?.devMode) {
        setMessage("Dev mode: complete the test in TAO later, or use “Submit sample result” to record scores now.");
      } else {
        setMessage("Session started. Refresh if your status does not update.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start test.");
    } finally {
      setBusyId("");
    }
  }

  async function handleDevComplete(assignmentId: string) {
    setBusyId(assignmentId);
    setError("");
    setMessage("");
    try {
      await submitStudentAptitudeDevResult(assignmentId);
      setMessage("Sample aptitude result saved. View your traits below.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save result.");
    } finally {
      setBusyId("");
    }
  }

  const showDevActions = config?.devMode;

  return (
    <section className="company-table-wrap">
      <div className="company-table-head">
        <h3>Aptitude tests</h3>
        <span className="table-caption">
          Assigned by admin or your college. {showDevActions ? "Dev mode: sample submit available without TAO." : "Complete in TAO when launched."}
        </span>
      </div>

      {isLoading ? <p className="empty-state">Loading assignments…</p> : null}
      {message ? (
        <p className="success" style={{ padding: "0 14px" }}>
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="error" style={{ padding: "0 14px" }}>
          {error}
        </p>
      ) : null}

      {!isLoading && assignments.length === 0 ? (
        <p className="empty-state">No aptitude tests assigned yet.</p>
      ) : null}

      {!isLoading
        ? assignments.map((row) => (
            <div key={row.id} className="tpo-panel" style={{ margin: "12px 14px" }}>
              <h4 style={{ margin: "0 0 6px" }}>{row.assessmentTitle}</h4>
              <p className="company-subtitle" style={{ margin: "0 0 10px" }}>
                {row.assessmentDescription || "Aptitude assessment"}
                {row.durationMinutes ? ` · ~${row.durationMinutes} min` : ""}
              </p>
              <p className="table-caption" style={{ margin: "0 0 12px" }}>
                Status: <strong>{row.status}</strong>
                {row.dueAt ? ` · Due ${row.dueAt.slice(0, 10)}` : ""}
              </p>

              {row.status !== "Completed" ? (
                <div className="job-form-actions" style={{ justifyContent: "flex-start", marginBottom: 12 }}>
                  <button type="button" className="table-btn" disabled={busyId === row.id} onClick={() => void handleStart(row)}>
                    {busyId === row.id ? "Starting…" : row.status === "In Progress" ? "Continue test" : "Start test"}
                  </button>
                  {showDevActions ? (
                    <button
                      type="button"
                      className="table-btn secondary"
                      disabled={busyId === row.id}
                      onClick={() => void handleDevComplete(row.id)}
                    >
                      Submit sample result (dev)
                    </button>
                  ) : null}
                </div>
              ) : null}

              {row.result ? (
                <div className="aptitude-result-card">
                  <p className="table-caption" style={{ margin: "0 0 8px" }}>
                    Overall score: <strong>{row.result.overallScore}%</strong>
                    {row.result.completedAt ? ` · Completed ${row.result.completedAt.slice(0, 10)}` : ""}
                  </p>
                  {row.result.traits?.primary ? (
                    <p className="company-subtitle" style={{ margin: "0 0 8px" }}>
                      <strong>{row.result.traits.primary}</strong>
                      {row.result.traits.secondary ? ` · ${row.result.traits.secondary}` : ""}
                    </p>
                  ) : null}
                  {Object.keys(row.result.scores || {}).length > 0 ? (
                    <ul style={{ margin: "0 0 10px", paddingLeft: "1.25rem", lineHeight: 1.6 }}>
                      {Object.entries(row.result.scores).map(([key, val]) => (
                        <li key={key}>
                          {key}: {val}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {row.result.recommendations ? (
                    <p className="company-subtitle" style={{ margin: 0 }}>
                      {row.result.recommendations}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))
        : null}
    </section>
  );
}
