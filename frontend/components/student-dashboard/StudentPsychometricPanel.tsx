"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getPsychometricModuleConfig,
  launchStudentPsychometricAssignment,
  listStudentPsychometricAssignments,
  submitStudentPsychometricDevResult,
  type PsychometricAssignment,
  type PsychometricModuleConfig,
} from "../../lib/api";

function statusPillClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("complet")) return "spsy-status-pill spsy-status--completed";
  if (s.includes("progress") || s.includes("start")) return "spsy-status-pill spsy-status--progress";
  return "spsy-status-pill spsy-status--pending";
}

export function StudentPsychometricPanel() {
  const [assignments, setAssignments] = useState<PsychometricAssignment[]>([]);
  const [config, setConfig] = useState<PsychometricModuleConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [rows, moduleConfig] = await Promise.all([
        listStudentPsychometricAssignments(),
        getPsychometricModuleConfig(),
      ]);
      setAssignments(rows);
      setConfig(moduleConfig);
      return rows;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load psychometric tests.");
      return [];
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      await load();
      setIsLoading(false);
    })();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
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
          if (row?.hasResult) setMessage("Your psychometric result is ready below.");
        }
      });
    }, 5000);
  }

  async function handleStart(assignment: PsychometricAssignment) {
    setBusyId(assignment.id);
    setError("");
    setMessage("");
    try {
      const session = await launchStudentPsychometricAssignment(assignment.id);
      const url = session.launchUrl || assignment.launchUrl;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        setMessage("Test opened in a new tab. This page will refresh when your result arrives.");
        startPollingForResult(assignment.id);
      } else if (session.devMode || config?.devMode) {
        setMessage("Dev mode: complete in TAO later, or use Submit sample result to record scores now.");
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
      await submitStudentPsychometricDevResult(assignmentId);
      setMessage("Sample result saved. View your traits below.");
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
        <h3>Psychometric Tests</h3>
        <span className="table-caption">
          {showDevActions
            ? "Dev mode — sample submit available without TAO."
            : "Assigned by platform admin. Complete in TAO when launched."}
        </span>
      </div>

      {message ? <p className="spf-inline-msg spf-inline-msg--info" style={{ margin: "0.75rem 1.2rem 0" }}>{message}</p> : null}
      {error   ? <p className="spf-inline-msg spf-inline-msg--error" style={{ margin: "0.75rem 1.2rem 0" }}>{error}</p>   : null}

      {isLoading ? (
        <div className="sp-empty">
          <div className="credits-spinner" />
          <span>Loading assignments...</span>
        </div>
      ) : assignments.length === 0 ? (
        <div className="sp-empty">
          <div className="sp-empty-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3 8-8" />
              <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
            </svg>
          </div>
          <p>No tests assigned yet</p>
          <span>Psychometric assessments will appear here once assigned.</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingTop: "0.75rem" }}>
          {assignments.map((row) => (
            <div key={row.id} className="spsy-card">
              <div className="spsy-card-head">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="spsy-card-title">{row.assessmentTitle}</p>
                  <p className="spsy-card-desc">
                    {row.assessmentDescription || "Psychometric assessment"}
                    {row.durationMinutes ? ` · ~${row.durationMinutes} min` : ""}
                  </p>
                  {row.dueAt ? <div className="spsy-card-meta"><span>Due {row.dueAt.slice(0, 10)}</span></div> : null}
                </div>
                <span className={statusPillClass(row.status)}>{row.status}</span>
              </div>
              <div className="spsy-card-body">
                {row.status !== "Completed" ? (
                  <div className="spsy-card-actions">
                    <button type="button" className="spsy-btn-start" disabled={busyId === row.id} onClick={() => void handleStart(row)}>
                      {busyId === row.id ? "Starting..." : row.status === "In Progress" ? "Continue test" : "Start test"}
                    </button>
                    {showDevActions ? (
                      <button type="button" className="spsy-btn-dev" disabled={busyId === row.id} onClick={() => void handleDevComplete(row.id)}>
                        Submit sample (dev)
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {row.result ? (
                  <div className="spsy-result">
                    <div>
                      <span className="spsy-result-score">{row.result.overallScore}%<span>Overall score</span></span>
                    </div>
                    {row.result.traits?.primary ? (
                      <p className="spsy-result-trait">{row.result.traits.primary}{row.result.traits.secondary ? ` · ${row.result.traits.secondary}` : ""}</p>
                    ) : null}
                    {Object.keys(row.result.scores || {}).length > 0 ? (
                      <div className="spsy-result-scores">
                        {Object.entries(row.result.scores).map(([key, val]) => (
                          <span key={key} className="spsy-result-score-item">{key}: {val}</span>
                        ))}
                      </div>
                    ) : null}
                    {row.result.recommendations ? <p className="spsy-result-recs">{row.result.recommendations}</p> : null}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
