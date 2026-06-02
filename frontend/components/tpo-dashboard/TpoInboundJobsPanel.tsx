"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getInboundJobDetail,
  listInboundJobs,
  respondInboundJob,
  suggestStudentsForInboundJob,
  updateInboundRecruitmentStage,
} from "../../lib/api";
import type { InboundEligibleStudent, InboundJobSummary } from "../../lib/api";

type Props = {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function TpoInboundJobsPanel({ onError, onSuccess }: Props) {
  const [filter, setFilter] = useState<"" | "Pending" | "Accepted" | "Declined">("");
  const [jobs, setJobs] = useState<InboundJobSummary[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getInboundJobDetail>> | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [stage, setStage] = useState("");

  const loadList = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listInboundJobs(filter || undefined);
      setJobs(data.inboundJobs);
      setPendingCount(data.summary.pending);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to load inbound jobs.");
    } finally {
      setIsLoading(false);
    }
  }, [filter, onError]);

  const loadDetail = useCallback(
    async (inviteId: string) => {
      setIsDetailLoading(true);
      try {
        const data = await getInboundJobDetail(inviteId);
        setDetail(data);
        setStage(data.invite.recruitmentStage);
        setSelectedStudentIds(new Set());
      } catch (err) {
        onError(err instanceof Error ? err.message : "Unable to load job details.");
        setDetail(null);
      } finally {
        setIsDetailLoading(false);
      }
    },
    [onError],
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  async function handleRespond(decision: "accept" | "decline") {
    if (!selectedId) return;
    setIsResponding(true);
    try {
      await respondInboundJob({
        inviteId: selectedId,
        decision,
        reason: decision === "decline" ? declineReason : undefined,
        recruitmentStage: decision === "accept" ? "Accepted - Open" : undefined,
      });
      setDeclineReason("");
      onSuccess(decision === "accept" ? "Inbound job accepted." : "Inbound job declined.");
      await loadList();
      await loadDetail(selectedId);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to update request.");
    } finally {
      setIsResponding(false);
    }
  }

  async function handleSuggest() {
    if (!selectedId || selectedStudentIds.size === 0) return;
    setIsSuggesting(true);
    try {
      const data = await suggestStudentsForInboundJob(selectedId, Array.from(selectedStudentIds));
      setDetail((prev) => (prev ? { ...prev, suggestedStudents: data.suggestedStudents } : prev));
      setSelectedStudentIds(new Set());
      onSuccess("Students suggested for this job (PRI bypass enabled).");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to suggest students.");
    } finally {
      setIsSuggesting(false);
    }
  }

  async function handleStageUpdate() {
    if (!selectedId || !stage) return;
    try {
      await updateInboundRecruitmentStage(selectedId, stage);
      onSuccess("Recruitment stage updated.");
      await loadDetail(selectedId);
      await loadList();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to update stage.");
    }
  }

  function toggleStudent(id: string) {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const invite = detail?.invite;
  const job = invite?.job;

  return (
    <div className="tpo-inbound-layout">
      <div className="company-table-wrap tpo-inbound-list">
        <div className="company-table-head">
          <div>
            <h3>Inbound jobs</h3>
            <span className="table-caption">Company recruitment requests for your college</span>
            {pendingCount > 0 ? <p className="tpo-reports-summary">{pendingCount} pending review</p> : null}
          </div>
          <div className="tpo-inbound-filters">
            {(["", "Pending", "Accepted", "Declined"] as const).map((f) => (
              <button
                key={f || "all"}
                type="button"
                className={`table-btn secondary ${filter === f ? "company-filter-active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f || "All"}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <p className="empty-state">Loading inbound requests…</p>
        ) : jobs.length === 0 ? (
          <p className="empty-state">No inbound recruitment requests yet.</p>
        ) : (
          <table className="company-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Company</th>
                <th>Deadline</th>
                <th>Stage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((row) => (
                <tr
                  key={row.id}
                  className={selectedId === row.id ? "tpo-inbound-row-active" : ""}
                  onClick={() => setSelectedId(row.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{row.jobTitle}</td>
                  <td>{row.companyName}</td>
                  <td>{row.applicationDeadline || "—"}</td>
                  <td>{row.recruitmentStage}</td>
                  <td>
                    <span className={`status-pill ${row.tpoResponse === "Accepted" ? "active" : row.tpoResponse === "Declined" ? "closed" : ""}`}>
                      {row.tpoResponse}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="company-table-wrap tpo-inbound-detail">
        {!selectedId ? (
          <p className="empty-state">Select an inbound request to review job details, eligible students, and respond.</p>
        ) : isDetailLoading || !invite ? (
          <p className="empty-state">Loading details…</p>
        ) : (
          <>
            <div className="company-table-head">
              <div>
                <h3>{invite.jobTitle}</h3>
                <span className="table-caption">
                  {invite.companyName} · Deadline: {invite.applicationDeadline || "Not set"}
                </span>
              </div>
            </div>

            {job ? (
              <div className="tpo-inbound-job-card">
                <p>
                  <strong>Type:</strong> {job.opportunityType} · {job.locationType} · {job.openings} openings
                </p>
                <p>
                  <strong>Skills:</strong> {job.skills}
                </p>
                <p>
                  <strong>Experience:</strong> {job.minExperience}
                </p>
                {job.description ? <p>{job.description}</p> : null}
                {invite.companyNote ? (
                  <p>
                    <strong>Company note:</strong> {invite.companyNote}
                  </p>
                ) : null}
                {(invite.eligibilityBranch || invite.eligibilityBatch) && (
                  <p>
                    <strong>Eligibility:</strong> {invite.eligibilityBranch || "Any branch"}
                    {invite.eligibilityBatch ? ` · Batch ${invite.eligibilityBatch}` : ""}
                  </p>
                )}
              </div>
            ) : null}

            {detail.journeyStages?.length ? (
              <p className="tpo-inbound-note">Recruiter journey: {detail.journeyStages.join(" → ")}</p>
            ) : null}

            <div className="tpo-inbound-stage-row">
              <label>
                Recruitment stage
                <select value={stage} onChange={(e) => setStage(e.target.value)} disabled={invite.tpoResponse !== "Accepted"}>
                  {(detail.stages || []).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              {invite.tpoResponse === "Accepted" ? (
                <button type="button" className="table-btn secondary" onClick={() => void handleStageUpdate()}>
                  Update stage
                </button>
              ) : null}
            </div>

            {invite.tpoResponse === "Pending" ? (
              <div className="tpo-inbound-actions">
                <button type="button" className="table-btn" disabled={isResponding} onClick={() => void handleRespond("accept")}>
                  Accept
                </button>
                <div className="tpo-inbound-decline">
                  <input
                    placeholder="Decline reason (required)"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                  />
                  <button
                    type="button"
                    className="table-btn secondary"
                    disabled={isResponding || !declineReason.trim()}
                    onClick={() => void handleRespond("decline")}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ) : invite.tpoResponse === "Declined" ? (
              <p className="tpo-inbound-note">Declined. Company sees: {invite.declineReason || "—"}</p>
            ) : (
              <p className="tpo-inbound-note accepted">Accepted — eligible students see this under Suggested jobs.</p>
            )}

            <StudentTable
              title="Eligible candidates"
              caption="Based on your college roster and eligibility filters"
              students={detail.eligibleStudents}
              selectable={invite.tpoResponse === "Accepted"}
              selectedIds={selectedStudentIds}
              onToggle={toggleStudent}
              suggestedIds={new Set(detail.suggestedStudents.map((s) => s.studentId))}
            />

            {invite.tpoResponse === "Accepted" ? (
              <div className="tpo-inbound-suggest-bar">
                <button
                  type="button"
                  className="table-btn"
                  disabled={isSuggesting || selectedStudentIds.size === 0}
                  onClick={() => void handleSuggest()}
                >
                  {isSuggesting ? "Suggesting…" : `Suggest selected (${selectedStudentIds.size}) — bypass PRI`}
                </button>
              </div>
            ) : null}

            <StudentTable
              title="Suggested students"
              caption="Explicitly suggested; can apply without PRI limits"
              students={detail.suggestedStudents}
              selectable={false}
              selectedIds={new Set()}
              onToggle={() => undefined}
              suggestedIds={new Set(detail.suggestedStudents.map((s) => s.studentId))}
            />

            {(detail.collegeApplicants?.length ?? 0) > 0 ? (
              <div className="tpo-inbound-students">
                <h4>Applicants & eligibility</h4>
                <span className="table-caption">Application status for students at your college on this recruiter job</span>
                <table className="company-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Branch</th>
                      <th>Eligible</th>
                      <th>Application</th>
                      <th>Suggested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.collegeApplicants!.map((row) => (
                      <tr key={row.studentId}>
                        <td>
                          {row.fullName}
                          <br />
                          <span className="table-caption">{row.email}</span>
                        </td>
                        <td>{row.branch || "—"}</td>
                        <td>
                          <span className={`status-pill ${row.eligible ? "active" : "closed"}`}>{row.eligible ? "Yes" : "No"}</span>
                        </td>
                        <td>{row.applicationStatus}</td>
                        <td>{row.suggestedByTpo ? "Yes" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function StudentTable({
  title,
  caption,
  students,
  selectable,
  selectedIds,
  onToggle,
  suggestedIds,
}: {
  title: string;
  caption: string;
  students: InboundEligibleStudent[];
  selectable: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  suggestedIds: Set<string>;
}) {
  return (
    <div className="tpo-inbound-students">
      <h4>{title}</h4>
      <span className="table-caption">{caption}</span>
      <table className="company-table">
        <thead>
          <tr>
            {selectable ? <th /> : null}
            <th>Name</th>
            <th>Email</th>
            <th>Branch</th>
            <th>Batch</th>
          </tr>
        </thead>
        <tbody>
          {students.length === 0 ? (
            <tr>
              <td colSpan={selectable ? 5 : 4}>No students in this list.</td>
            </tr>
          ) : (
            students.map((s) => (
              <tr key={s.studentId}>
                {selectable ? (
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.studentId)}
                      onChange={() => onToggle(s.studentId)}
                      aria-label={`Select ${s.fullName}`}
                    />
                  </td>
                ) : null}
                <td>
                  {s.fullName}
                  {suggestedIds.has(s.studentId) ? <span className="tpo-inbound-tag"> Suggested</span> : null}
                </td>
                <td>{s.email}</td>
                <td>{s.branch}</td>
                <td>{s.batch}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
