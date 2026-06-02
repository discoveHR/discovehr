"use client";

import { useCallback, useEffect, useState } from "react";
import { getCandidateProgressKanban, listKanbanJobs, type KanbanColumn, type KanbanJobItem } from "../../lib/api";

type Props = { onError: (m: string) => void };

export function TpoCandidateProgressPanel({ onError }: Props) {
  const [jobs, setJobs] = useState<KanbanJobItem[]>([]);
  const [selected, setSelected] = useState<KanbanJobItem | null>(null);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    try {
      const data = await listKanbanJobs();
      setJobs(data.items);
      if (data.items[0] && !selected) {
        setSelected(data.items[0]);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to load jobs.");
    }
  }, [onError, selected]);

  const loadKanban = useCallback(
    async (item: KanbanJobItem) => {
      setLoading(true);
      try {
        const data = await getCandidateProgressKanban(item.jobId, item.inviteId);
        setColumns(data.columns);
        setStages(data.journeyStages);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Unable to load kanban.");
      } finally {
        setLoading(false);
      }
    },
    [onError],
  );

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (selected) void loadKanban(selected);
  }, [selected, loadKanban]);

  return (
    <section className="company-table-wrap">
      <div className="company-table-head">
        <h3>Candidate progress</h3>
        <span className="table-caption">Kanban by application stage for accepted inbound recruiter jobs</span>
      </div>
      <div className="tpo-journey-toolbar">
        <label>
          Job post
          <select
            value={selected?.inviteId || ""}
            onChange={(e) => {
              const item = jobs.find((j) => j.inviteId === e.target.value);
              setSelected(item || null);
            }}
          >
            <option value="">Select…</option>
            {jobs.map((j) => (
              <option key={j.inviteId} value={j.inviteId}>
                {j.jobTitle} · {j.collegeEmail}
              </option>
            ))}
          </select>
        </label>
      </div>
      {stages.length ? <p className="tpo-inbound-note">Recruiter journey: {stages.join(" → ")}</p> : null}
      {loading ? (
        <p className="empty-state">Loading kanban…</p>
      ) : (
        <div className="tpo-kanban-board">
          {columns.map((col) => (
            <div key={col.stage} className="tpo-kanban-column">
              <h4>
                {col.stage} <span className="table-caption">({col.candidates.length})</span>
              </h4>
              {col.candidates.map((c) => (
                <div key={c.studentId} className="tpo-kanban-card">
                  <strong>{c.fullName}</strong>
                  <span className="table-caption">{c.email}</span>
                  <span className="table-caption">{c.branch}</span>
                  {c.suggestedByTpo ? <span className="tpo-inbound-tag">Suggested</span> : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

