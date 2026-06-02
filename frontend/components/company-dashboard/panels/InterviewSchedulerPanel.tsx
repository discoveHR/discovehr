"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cancelCompanyInterview,
  downloadCompanyInterviewIcs,
  getCompanyFreelancerInterviewerDetail,
  listCompanyInterviews,
  scheduleCompanyInterview,
  type CompanyApplicantItem,
  type CompanyFreelancerInterviewerDetail,
  type CompanyInterview,
  type JobItem,
} from "../../../lib/api";
import { useCompanyFreelancerInterviewers } from "../../../lib/hooks/useCompanyFreelancerInterviewers";
import { ScheduleApplicantPickerModal } from "../modals/ScheduleApplicantPickerModal";
import { DateTimePicker } from "../widgets/DateTimePicker";

type Props = {
  jobs: JobItem[];
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  preselectedFreelancerUser?: string;
};

function formatWhen(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function groupByDate(interviews: CompanyInterview[]) {
  const map = new Map<string, CompanyInterview[]>();
  for (const item of interviews) {
    const key = item.startDatetime ? item.startDatetime.slice(0, 10) : "Unscheduled";
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

const TYPE_OPTIONS = [
  { value: "Video",      label: "Video Call",        icon: "📹", hint: "Google Meet / Teams" },
  { value: "In-person",  label: "In Person",          icon: "🏢", hint: "Office / campus" },
  { value: "Phone",      label: "Phone Call",         icon: "📞", hint: "Voice call" },
  { value: "Freelancer", label: "Freelancer Session", icon: "⭐", hint: "Coins deducted" },
];

export function InterviewSchedulerPanel({ jobs, onError, onSuccess, preselectedFreelancerUser }: Props) {
  const [selectedJobId, setSelectedJobId] = useState("");
  const [interviews, setInterviews] = useState<CompanyInterview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<CompanyApplicantItem | null>(null);
  const [applicantPickerOpen, setApplicantPickerOpen] = useState(false);
  const [interviewType, setInterviewType] = useState<"Video" | "In-person" | "Phone" | "Freelancer">("Video");
  const [startDatetime, setStartDatetime] = useState("");
  const [endDatetime, setEndDatetime] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [location, setLocation] = useState("");
  const [interviewerName, setInterviewerName] = useState("");
  const [interviewerEmail, setInterviewerEmail] = useState("");
  const [hrNotifyEmails, setHrNotifyEmails] = useState("");
  const [notes, setNotes] = useState("");
  const [freelancerInterviewerUser, setFreelancerInterviewerUser] = useState(preselectedFreelancerUser || "");
  const [freelancerDetail, setFreelancerDetail] = useState<CompanyFreelancerInterviewerDetail | null>(null);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const { interviewers: freelancerInterviewers, error: freelancerListError } = useCompanyFreelancerInterviewers(true);
  const freelancerLocked = Boolean(freelancerInterviewerUser.trim());
  const activeJobs = jobs.filter((j) => j.status === "Active" || j.status === "Draft");

  const loadInterviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await listCompanyInterviews(selectedJobId || undefined);
      setInterviews(loaded.filter((i) => i.status !== "Cancelled"));
    } catch (err) {
      onErrorRef.current(err instanceof Error ? err.message : "Unable to load scheduler.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedJobId]);

  useEffect(() => { void loadInterviews(); }, [loadInterviews]);
  useEffect(() => { setSelectedApplicant(null); }, [selectedJobId]);

  useEffect(() => {
    if (selectedJobId && selectedApplicant && selectedApplicant.jobId !== selectedJobId) {
      setSelectedApplicant(null);
    }
  }, [selectedJobId, selectedApplicant]);

  useEffect(() => {
    if (freelancerListError) onErrorRef.current(freelancerListError);
  }, [freelancerListError]);

  useEffect(() => {
    if (preselectedFreelancerUser) {
      setInterviewType("Freelancer");
      setFreelancerInterviewerUser(preselectedFreelancerUser);
    }
  }, [preselectedFreelancerUser]);

  useEffect(() => {
    if (!freelancerInterviewerUser) { setFreelancerDetail(null); return; }
    void (async () => {
      try {
        const detail = await getCompanyFreelancerInterviewerDetail(freelancerInterviewerUser);
        setFreelancerDetail(detail);
        setInterviewerName(detail.fullName || "");
        setInterviewerEmail(detail.email || "");
      } catch { setFreelancerDetail(null); }
    })();
  }, [freelancerInterviewerUser]);

  function handleFreelancerChange(userId: string) {
    setFreelancerInterviewerUser(userId);
    if (!userId) { setInterviewerName(""); setInterviewerEmail(""); setFreelancerDetail(null); }
  }

  async function handleSchedule(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedApplicant?.applicationId || !startDatetime) {
      onError("Select an applicant and interview start time.");
      return;
    }
    if (interviewType === "Video" && !meetingLink.trim()) {
      onError("Meeting link is required for video interviews.");
      return;
    }
    if (interviewType === "Freelancer" && !freelancerInterviewerUser) {
      onError("Select an approved freelancer interviewer.");
      return;
    }
    setIsSaving(true);
    try {
      const result = await scheduleCompanyInterview({
        applicationId: selectedApplicant.applicationId,
        interviewType,
        startDatetime,
        endDatetime: endDatetime || undefined,
        meetingLink: meetingLink.trim() || undefined,
        location: location.trim() || undefined,
        interviewerName: freelancerLocked
          ? freelancerDetail?.fullName || interviewerName.trim()
          : interviewerName.trim() || undefined,
        interviewerEmail: freelancerLocked
          ? freelancerDetail?.email || interviewerEmail.trim()
          : interviewerEmail.trim() || undefined,
        freelancerInterviewerUser: freelancerInterviewerUser.trim() || undefined,
        hrNotifyEmails: hrNotifyEmails.trim() || undefined,
        notes: notes.trim() || undefined,
        markShortlisted: true,
      });
      onSuccess(result.message);
      setSelectedApplicant(null);
      setStartDatetime("");
      setEndDatetime("");
      setMeetingLink("");
      setLocation("");
      setNotes("");
      setHrNotifyEmails("");
      if (!freelancerLocked) {
        setInterviewerName("");
        setInterviewerEmail("");
      }
      await loadInterviews();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to schedule interview.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCancel(interviewId: string) {
    try {
      const message = await cancelCompanyInterview(interviewId);
      onSuccess(message);
      await loadInterviews();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to cancel.");
    }
  }

  const grouped = useMemo(() => groupByDate(interviews), [interviews]);

  return (
    <section className="sched-panel">
      {/* Panel header */}
      <div className="sched-panel-header">
        <div className="sched-panel-header-left">
          <div className="sched-panel-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.8">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h3 className="sched-panel-title">Interview Scheduler</h3>
            <p className="sched-panel-sub">Schedule interviews, assign interviewers, and notify candidates automatically.</p>
          </div>
        </div>
        <div className="sched-filter-wrap">
          <span className="sched-filter-label">Filter by job</span>
          <select className="sched-filter-select" value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
            <option value="">All jobs</option>
            {activeJobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main grid */}
      <div className="sched-grid">

        {/* ── LEFT: Schedule Form ── */}
        <div className="sched-form-col">
          <form className="sched-form" onSubmit={(e) => void handleSchedule(e)}>

            {/* Step 1: Applicant */}
            <div className="sched-section">
              <div className="sched-section-label">
                <span className="sched-step-num">1</span>
                Select Applicant
              </div>
              {selectedApplicant ? (
                <div className="sched-applicant-card">
                  <div className="sched-applicant-avatar">
                    {selectedApplicant.studentName.charAt(0).toUpperCase()}
                  </div>
                  <div className="sched-applicant-info">
                    <span className="sched-applicant-name">{selectedApplicant.studentName}</span>
                    <span className="sched-applicant-meta">{selectedApplicant.studentEmail}</span>
                    <span className="sched-applicant-meta">{selectedApplicant.jobTitle} · {selectedApplicant.status}</span>
                  </div>
                  <button type="button" className="sched-change-btn" onClick={() => setApplicantPickerOpen(true)}>
                    Change
                  </button>
                </div>
              ) : (
                <button type="button" className="sched-pick-btn" onClick={() => setApplicantPickerOpen(true)}>
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                  </svg>
                  Choose an applicant
                </button>
              )}
            </div>

            {/* Step 2: Interview type */}
            <div className="sched-section">
              <div className="sched-section-label">
                <span className="sched-step-num">2</span>
                Interview Type
              </div>
              <div className="sched-type-grid">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`sched-type-btn${interviewType === opt.value ? " sched-type-active" : ""}`}
                    onClick={() => setInterviewType(opt.value as typeof interviewType)}
                  >
                    <span className="sched-type-emoji">{opt.icon}</span>
                    <span className="sched-type-name">{opt.label}</span>
                    <span className="sched-type-hint">{opt.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Schedule */}
            <div className="sched-section">
              <div className="sched-section-label">
                <span className="sched-step-num">3</span>
                Date &amp; Time
              </div>
              <div className="sched-datetime-row">
                <DateTimePicker
                  label="Start"
                  value={startDatetime}
                  onChange={setStartDatetime}
                  required
                />
                <DateTimePicker
                  label="End"
                  value={endDatetime}
                  onChange={setEndDatetime}
                  optional
                />
              </div>
            </div>

            {/* Step 4: Location / Link */}
            {(interviewType === "Video" || interviewType === "Freelancer") && (
              <div className="sched-section">
                <div className="sched-section-label">
                  <span className="sched-step-num">4</span>
                  Meeting Link{interviewType === "Video" ? " *" : " (optional)"}
                </div>
                <input
                  className="sched-input"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/…"
                  required={interviewType === "Video"}
                />
              </div>
            )}
            {interviewType === "In-person" && (
              <div className="sched-section">
                <div className="sched-section-label">
                  <span className="sched-step-num">4</span>
                  Venue / Location
                </div>
                <input
                  className="sched-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Office address or campus name"
                />
              </div>
            )}

            {/* Step 5: Interviewer */}
            <div className="sched-section">
              <div className="sched-section-label">
                <span className="sched-step-num">{interviewType === "Phone" ? "4" : "5"}</span>
                Interviewer
              </div>

              {(interviewType === "Freelancer" || freelancerInterviewers.length > 0) && (
                <div className="sched-field">
                  <label className="sched-field-label">
                    Freelancer interviewer{interviewType === "Freelancer" ? " *" : " (optional)"}
                  </label>
                  <select
                    className="sched-select"
                    value={freelancerInterviewerUser}
                    onChange={(e) => handleFreelancerChange(e.target.value)}
                    required={interviewType === "Freelancer"}
                  >
                    <option value="">— None / enter manually —</option>
                    {freelancerInterviewers.map((fi) => (
                      <option key={fi.freelancerUser} value={fi.freelancerUser}>
                        {fi.fullName} · {fi.primaryService || "Interviewer"} · {fi.email}
                      </option>
                    ))}
                  </select>
                  {freelancerDetail && (
                    <div className="sched-freelancer-badge">
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      <div>
                        <strong>{freelancerDetail.fullName}</strong> will be emailed this assignment.
                        <br />{freelancerDetail.primaryService} · {freelancerDetail.phone || freelancerDetail.email}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="sched-two-col">
                <div className="sched-field">
                  <label className="sched-field-label">Interviewer name</label>
                  <input
                    className="sched-input"
                    value={interviewerName}
                    onChange={(e) => setInterviewerName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    disabled={freelancerLocked}
                  />
                </div>
                <div className="sched-field">
                  <label className="sched-field-label">Interviewer email</label>
                  <input
                    type="email"
                    className="sched-input"
                    value={interviewerEmail}
                    onChange={(e) => setInterviewerEmail(e.target.value)}
                    placeholder="interviewer@company.com"
                    disabled={freelancerLocked}
                  />
                </div>
              </div>
              {freelancerLocked && (
                <p className="sched-hint-text">Name and email are auto-filled from the selected freelancer.</p>
              )}
            </div>

            {/* Step 6: Notifications */}
            <div className="sched-section">
              <div className="sched-section-label">
                <span className="sched-step-num">{interviewType === "Phone" ? "5" : "6"}</span>
                Notifications &amp; Notes
              </div>
              <div className="sched-field">
                <label className="sched-field-label">HR team emails (comma-separated)</label>
                <input
                  className="sched-input"
                  value={hrNotifyEmails}
                  onChange={(e) => setHrNotifyEmails(e.target.value)}
                  placeholder="hr@company.com, talent@company.com"
                />
              </div>
              <div className="sched-field">
                <label className="sched-field-label">Notes for candidate &amp; HR</label>
                <textarea
                  className="sched-textarea"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Round 1 technical — bring ID, dress formally…"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="sched-submit-row">
              <p className="sched-submit-hint">
                Saves to database, marks applicant <strong>Shortlisted</strong>, and emails the candidate, interviewer, HR team, and your company account.
              </p>
              <button
                type="submit"
                className="sched-submit-btn"
                disabled={isSaving || !selectedApplicant || !startDatetime}
              >
                {isSaving ? (
                  <>
                    <span className="sched-spinner" />
                    Scheduling…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Schedule &amp; Notify
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── RIGHT: Calendar ── */}
        <div className="sched-cal-col">
          <div className="sched-cal-header">
            <h4 className="sched-cal-title">Interview Calendar</h4>
            <span className="sched-cal-count">
              {interviews.length} scheduled
            </span>
          </div>

          {isLoading ? (
            <div className="sched-cal-loading">
              <span className="sched-spinner" />
              Loading interviews…
            </div>
          ) : interviews.length === 0 ? (
            <div className="sched-cal-empty">
              <div className="sched-cal-empty-icon">
                <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" fill="none" strokeWidth="1.4">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <p>No interviews scheduled yet.</p>
              <p>Fill out the form to schedule your first one.</p>
            </div>
          ) : (
            <div className="sched-cal-list">
              {grouped.map(([day, items]) => (
                <div key={day} className="sched-day-group">
                  <div className="sched-day-label">
                    {day === "Unscheduled" ? "Unscheduled" : new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                    <span className="sched-day-count">{items.length}</span>
                  </div>
                  {items.map((item) => (
                    <article key={item.id} className="sched-cal-item">
                      <div className="sched-cal-item-top">
                        <div className="sched-cal-item-type-dot" data-type={item.interviewType} />
                        <strong className="sched-cal-item-title">{item.title}</strong>
                        <span className={`sched-cal-pill ${item.status === "Scheduled" ? "pill-active" : "pill-draft"}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="sched-cal-item-who">{item.studentName} · {item.jobTitle}</p>
                      <p className="sched-cal-item-when">
                        <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2">
                          <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
                        </svg>
                        {formatWhen(item.startDatetime)}
                        {item.interviewType && <span className="sched-type-tag">{item.interviewType}</span>}
                      </p>
                      {item.meetingLink && (
                        <a className="sched-cal-link" href={item.meetingLink} target="_blank" rel="noreferrer">
                          <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                          Join meeting
                        </a>
                      )}
                      {item.freelancerInterviewerName && (
                        <p className="sched-cal-item-meta">Freelancer: {item.freelancerInterviewerName}</p>
                      )}
                      {item.interviewerEmail && (
                        <p className="sched-cal-item-meta">Interviewer: {item.interviewerEmail}</p>
                      )}
                      <div className="sched-cal-actions">
                        {item.googleCalendarUrl && (
                          <a className="sched-cal-action-btn" href={item.googleCalendarUrl} target="_blank" rel="noreferrer">
                            Add to Google Calendar
                          </a>
                        )}
                        <button type="button" className="sched-cal-action-btn" onClick={() => void downloadCompanyInterviewIcs(item.id)}>
                          .ics
                        </button>
                        {item.status === "Scheduled" && (
                          <button type="button" className="sched-cal-action-btn sched-cal-action-danger" onClick={() => void handleCancel(item.id)}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ScheduleApplicantPickerModal
        open={applicantPickerOpen}
        jobs={activeJobs}
        initialJobId={selectedJobId}
        selectedApplicationId={selectedApplicant?.applicationId}
        onClose={() => setApplicantPickerOpen(false)}
        onSelect={(applicant) => {
          if (selectedJobId && applicant.jobId !== selectedJobId) {
            onError("This applicant did not apply for the job selected in the filter above.");
            return;
          }
          setSelectedApplicant(applicant);
        }}
        onJobFilterChange={(jobId) => {
          if (selectedApplicant && jobId && selectedApplicant.jobId !== jobId) setSelectedApplicant(null);
        }}
        onError={onError}
      />
    </section>
  );
}

