"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getJobRecruitmentJourney,
  inviteCollegeForCompanyJob,
  sendCompanyOfferLetter,
  updateCollegeInviteStage,
  updateCompanyApplicantStatus,
  updateJobRecruitmentJourney,
  type ApplicationStatus,
  type CompanyApplicantItem,
  type CompanyCollegeInviteItem,
  type InboundCollegeApplicant,
  type JobItem,
  type JobRecruitmentJourneyData,
  type JourneyStageDef,
} from "../../../lib/api";
import { StudentProfileModal } from "../modals/StudentProfileModal";
import {
  JOURNEY_STAGE_TYPE_OPTIONS,
  OFFER_LETTER_MACRO,
  defaultJourneyStages,
  labelForStageType,
  newStageId,
  normalizeStageDef,
  type JourneyStageType,
} from "../../../lib/journey-stages";
import { MailerStatusBanner } from "../../common/MailerStatusBanner";

type Props = {
  jobs: JobItem[];
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onInvitesChanged?: () => void | Promise<void>;
};

function formatAppliedOn(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function toCompanyApplicant(row: InboundCollegeApplicant, job: JobItem, rank: number): CompanyApplicantItem {
  const status = (row.applicationStatus || "Submitted") as ApplicationStatus;
  return {
    applicationId: row.applicationId || "",
    jobId: job.id,
    jobTitle: job.title,
    studentId: row.studentId,
    studentName: row.fullName,
    studentEmail: row.email,
    status: ["Submitted", "In Review", "Shortlisted", "Rejected", "Selected"].includes(status)
      ? status
      : "Submitted",
    appliedOn: row.appliedOn || "",
    resumeFile: row.resumeFile,
    branch: row.branch,
    batch: row.batch,
    priScore: row.priScore,
    psychometricScore: row.psychometricScore,
    psychometricTitle: row.psychometricTitle,
    companyFeedback: row.companyFeedback,
    rank,
  };
}

export function JobRecruitmentJourneyPanel({ jobs, onError, onSuccess, onInvitesChanged }: Props) {
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedInviteId, setSelectedInviteId] = useState("");
  const [data, setData] = useState<JobRecruitmentJourneyData | null>(null);
  const [stageDefs, setStageDefs] = useState<JourneyStageDef[]>(defaultJourneyStages());
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingJourney, setIsSavingJourney] = useState(false);
  const [isSavingStage, setIsSavingStage] = useState(false);
  const [stageDraft, setStageDraft] = useState("");
  const [inviteCollegeName, setInviteCollegeName] = useState("");
  const [inviteCollegeEmail, setInviteCollegeEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({});
  const [offerDraft, setOfferDraft] = useState(OFFER_LETTER_MACRO);
  const [actionApplicationId, setActionApplicationId] = useState<string | null>(null);
  const [profileTarget, setProfileTarget] = useState<CompanyApplicantItem | null>(null);

  const load = useCallback(
    async (jobId: string, inviteId?: string) => {
      if (!jobId) return;
      setIsLoading(true);
      try {
        const result = await getJobRecruitmentJourney(jobId, inviteId);
        setData(result);
        const defs = (result.journeyStageDefs?.length ? result.journeyStageDefs : result.journeyStages?.map((label) => ({ id: newStageId(), type: "custom" as const, label }))) || defaultJourneyStages();
        setStageDefs(defs.map((d) => normalizeStageDef(d)));
        setStageDraft(result.selectedCollege?.recruitmentStage || defs[0]?.label || "");
        setSelectedInviteId(result.selectedCollege?.id || "");
      } catch (err) {
        onError(err instanceof Error ? err.message : "Unable to load recruitment journey.");
      } finally {
        setIsLoading(false);
      }
    },
    [onError],
  );

  useEffect(() => {
    if (selectedJobId) {
      void load(selectedJobId);
    } else {
      setData(null);
    }
  }, [selectedJobId, load]);

  function updateStageDef(index: number, patch: Partial<JourneyStageDef>) {
    setStageDefs((prev) => {
      const next = [...prev];
      const current = next[index];
      const merged = { ...current, ...patch };
      if (patch.type && patch.type !== "custom") {
        merged.label = labelForStageType(patch.type as JourneyStageType);
      }
      next[index] = normalizeStageDef(merged);
      return next;
    });
  }

  function addStage() {
    setStageDefs((prev) => [...prev, { id: newStageId(), type: "psychometric", label: labelForStageType("psychometric") }]);
  }

  function removeStage(index: number) {
    setStageDefs((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleSaveJourney() {
    if (!selectedJobId || stageDefs.length === 0) return;
    setIsSavingJourney(true);
    try {
      await updateJobRecruitmentJourney(selectedJobId, stageDefs);
      onSuccess("Recruitment journey saved.");
      await load(selectedJobId, selectedInviteId || undefined);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to save journey.");
    } finally {
      setIsSavingJourney(false);
    }
  }

  async function handleCollegeChange(inviteId: string) {
    setSelectedInviteId(inviteId);
    if (selectedJobId) {
      await load(selectedJobId, inviteId);
    }
  }

  async function handleSaveCollegeStage() {
    if (!selectedInviteId || !stageDraft) return;
    setIsSavingStage(true);
    try {
      await updateCollegeInviteStage(selectedInviteId, stageDraft);
      onSuccess("College pipeline stage updated.");
      if (selectedJobId) {
        await load(selectedJobId, selectedInviteId);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to update stage.");
    } finally {
      setIsSavingStage(false);
    }
  }

  async function handleInviteCollege() {
    if (!selectedJobId) return;
    const name = inviteCollegeName.trim();
    const email = inviteCollegeEmail.trim().toLowerCase();
    if (!name || !email) {
      onError("College name and TPO email are required.");
      return;
    }
    setIsInviting(true);
    try {
      await inviteCollegeForCompanyJob({
        jobId: selectedJobId,
        collegeEmails: [email],
        note: `College Name: ${name}`,
      });
      setInviteCollegeName("");
      setInviteCollegeEmail("");
      onSuccess("College invite sent.");
      await load(selectedJobId, selectedInviteId || undefined);
      await onInvitesChanged?.();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to send invite.");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleApplicantDecision(row: InboundCollegeApplicant, status: "Selected" | "Rejected") {
    if (!row.applicationId) {
      onError("Student has not applied to this job yet.");
      return;
    }
    setActionApplicationId(row.applicationId);
    try {
      const feedback = (feedbackDraft[row.applicationId] || "").trim();
      await updateCompanyApplicantStatus(row.applicationId, status, undefined, feedback || undefined);
      onSuccess(status === "Selected" ? "Applicant marked selected." : "Applicant rejected with feedback saved.");
      if (selectedJobId) {
        await load(selectedJobId, selectedInviteId || undefined);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to update applicant.");
    } finally {
      setActionApplicationId(null);
    }
  }

  async function handleSendOffer(row: InboundCollegeApplicant) {
    if (!row.applicationId) {
      onError("Student has not applied to this job yet.");
      return;
    }
    setActionApplicationId(row.applicationId);
    try {
      await sendCompanyOfferLetter(row.applicationId, offerDraft.trim() || OFFER_LETTER_MACRO);
      onSuccess("Offer letter macro sent and applicant marked Selected.");
      if (selectedJobId) {
        await load(selectedJobId, selectedInviteId || undefined);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to send offer.");
    } finally {
      setActionApplicationId(null);
    }
  }

  const activeJobs = jobs.filter((j) => j.status !== "Draft");
  const stageLabels = stageDefs.map((s) => s.label);

  return (
    <section className="company-table-wrap tpo-journey-panel">
      <div className="company-table-head">
        <div>
          <h3>Job posting — journey & pipeline</h3>
          <span className="table-caption">
            Setup job stages (psychometric, aptitude, interviews), invite colleges, then select, reject, or send offer.
          </span>
        </div>
      </div>
      <MailerStatusBanner />

      <div className="tpo-journey-toolbar">
        <label>
          Job
          <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
            <option value="">Select a published job…</option>
            {activeJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </label>
        {data && data.colleges.length > 0 ? (
          <label>
            College invite
            <select value={selectedInviteId} onChange={(e) => void handleCollegeChange(e.target.value)}>
              {data.colleges.map((c: CompanyCollegeInviteItem) => (
                <option key={c.id} value={c.id}>
                  {c.collegeEmail} · TPO {c.tpoResponse || "Pending"} · {c.recruitmentStage || "—"}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {!selectedJobId ? (
        <p className="empty-state">Choose a job to configure recruitment journey and college invites.</p>
      ) : isLoading ? (
        <p className="empty-state">Loading journey…</p>
      ) : !data ? null : (
        <>
          <div className="tpo-journey-setup-card journey-stage-builder">
            <h4>1.C.2 Setup journey</h4>
            <p className="table-caption">First step is always application received. Add custom assessment and interview stages.</p>
            <div className="journey-stage-list">
              {stageDefs.map((stage, index) => (
                <div key={stage.id} className="journey-stage-row">
                  <span className="journey-stage-index">{index + 1}</span>
                  <select
                    value={stage.type}
                    onChange={(e) => updateStageDef(index, { type: e.target.value as JourneyStageType })}
                    disabled={stage.type === "application_received" && index === 0}
                  >
                    {JOURNEY_STAGE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {stage.type === "custom" ? (
                    <input
                      value={stage.label}
                      onChange={(e) => updateStageDef(index, { label: e.target.value })}
                      placeholder="Custom stage name"
                    />
                  ) : (
                    <input value={stage.label} readOnly className="readonly-field" />
                  )}
                  <button type="button" className="table-btn secondary" onClick={() => removeStage(index)} disabled={stageDefs.length <= 1}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="journey-stage-actions">
              <button type="button" className="table-btn secondary" onClick={addStage}>
                Add stage
              </button>
              <button type="button" className="table-btn" disabled={isSavingJourney} onClick={() => void handleSaveJourney()}>
                {isSavingJourney ? "Saving…" : "Save journey"}
              </button>
            </div>
          </div>

          <div className="tpo-journey-setup-card">
            <h4>1.D Custom invite — colleges</h4>
            <div className="journey-invite-row">
              <input value={inviteCollegeName} onChange={(e) => setInviteCollegeName(e.target.value)} placeholder="College name" />
              <input
                value={inviteCollegeEmail}
                onChange={(e) => setInviteCollegeEmail(e.target.value)}
                placeholder="TPO email"
                type="email"
              />
              <button type="button" className="table-btn" disabled={isInviting} onClick={() => void handleInviteCollege()}>
                {isInviting ? "Sending…" : "Invite college"}
              </button>
            </div>
            {data.colleges.length === 0 ? (
              <p className="table-caption">No colleges invited yet for this job.</p>
            ) : null}
          </div>

          {data.selectedCollege ? (
            <div className="tpo-journey-setup-card">
              <h4>College pipeline — {data.selectedCollege.collegeEmail}</h4>
              <div className="tpo-inbound-stage-row">
                <label>
                  Current stage
                  <select value={stageDraft} onChange={(e) => setStageDraft(e.target.value)}>
                    {stageLabels.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="table-btn secondary" disabled={isSavingStage} onClick={() => void handleSaveCollegeStage()}>
                  {isSavingStage ? "Updating…" : "Update stage"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="tpo-journey-setup-card">
            <h4>1.F Send offer — macro template</h4>
            <textarea rows={4} value={offerDraft} onChange={(e) => setOfferDraft(e.target.value)} placeholder={OFFER_LETTER_MACRO} />
            <p className="table-caption">Used when you click Send offer on an applicant below.</p>
          </div>

          <div className="tpo-inbound-students">
            <h4>1.E Selected / rejected / feedback — applicants</h4>
            <span className="table-caption">
              Ranked applicants for {data.job.title} — branch, PRI, psychometric, and status are in View profile
            </span>
            <table className="company-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th>Applied for</th>
                  <th>Applied on</th>
                  <th>Profile</th>
                  <th>Feedback</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.collegeApplicants.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No students at this college yet.</td>
                  </tr>
                ) : (
                  data.collegeApplicants.map((row, index) => (
                    <tr key={row.studentId}>
                      <td>{index + 1}</td>
                      <td>
                        {row.fullName}
                        <br />
                        <span className="table-caption">{row.email}</span>
                      </td>
                      <td>
                        <strong>{data.job.title}</strong>
                        {row.applicationStatus && row.applicationStatus !== "Not Applied" ? (
                          <span className="table-caption"> · {row.applicationStatus}</span>
                        ) : (
                          <span className="table-caption"> · Not applied</span>
                        )}
                      </td>
                      <td>{formatAppliedOn(row.appliedOn)}</td>
                      <td>
                        <button
                          type="button"
                          className="table-btn secondary"
                          onClick={() => setProfileTarget(toCompanyApplicant(row, data.job, index + 1))}
                        >
                          View profile
                        </button>
                      </td>
                      <td>
                        {row.applicationId ? (
                          <textarea
                            rows={2}
                            className="feedback-inline"
                            value={feedbackDraft[row.applicationId] ?? row.companyFeedback ?? ""}
                            onChange={(e) => {
                              const appId = row.applicationId as string;
                              setFeedbackDraft((prev) => ({
                                ...prev,
                                [appId]: e.target.value,
                              }));
                            }}
                            placeholder="Feedback for reject or notes"
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="applicant-action-cell">
                        <button
                          type="button"
                          className="table-btn secondary"
                          disabled={!row.applicationId || actionApplicationId === row.applicationId}
                          onClick={() => void handleApplicantDecision(row, "Selected")}
                        >
                          Select
                        </button>
                        <button
                          type="button"
                          className="table-btn secondary"
                          disabled={!row.applicationId || actionApplicationId === row.applicationId}
                          onClick={() => void handleApplicantDecision(row, "Rejected")}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className="table-btn"
                          disabled={!row.applicationId || actionApplicationId === row.applicationId}
                          onClick={() => void handleSendOffer(row)}
                        >
                          Send offer
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {profileTarget ? (
            <StudentProfileModal applicant={profileTarget} onClose={() => setProfileTarget(null)} />
          ) : null}
        </>
      )}
    </section>
  );
}

