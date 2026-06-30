"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearPortalSession } from "../../../lib/auth/session";
import {
  type ApplicationStatus,
  type AssessmentFormPayload,
  type AssessmentItem,
  type CompanyApplicantItem,
  type CompanyCollegeInviteItem,
  type CompanyCreditWallet,
  type JobFormPayload,
  type JobItem,
  type PaginationMeta,
  type ShortlistSchedulePayload,
  createCompanyAssessment,
  createCompanyJob,
  getCompanyCreditWallet,
  getCompanyMe,
  inviteCollegeForCompanyJob,
  listCompanyApplicants,
  listCompanyAssessments,
  listCompanyCollegeInvites,
  listCompanyJobs,
  publishCompanyAssessment,
  scheduleCompanyInterview,
  updateCompanyApplicantStatus,
  updateCompanyJobStatus,
} from "../../../lib/api";
import { initialAssessmentForm, initialJobForm, type MenuKey } from "../types";
import type { ShortlistScheduleFormPayload } from "../modals/ShortlistScheduleModal";

export type CompanyUser = {
  id: string;
  full_name: string;
  email: string;
  isSubAdmin?: boolean;
  assignedDistrict?: string;
  assignedState?: string;
  roles?: string[];
};

type PendingShortlistAction = { applicationId: string; applicantName: string };

export function useCompanyDashboard() {
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<CompanyUser | null>(null);
  const [error, setError] = useState("");
  const [activeMenu, setActiveMenu] = useState<MenuKey>("dashboard");
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [creditWallet, setCreditWallet] = useState<CompanyCreditWallet | null>(null);
  const [publishingAssessmentId, setPublishingAssessmentId] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState<JobFormPayload>(initialJobForm);
  const [assessmentForm, setAssessmentForm] = useState<AssessmentFormPayload>(initialAssessmentForm);
  const [applicants, setApplicants] = useState<CompanyApplicantItem[]>([]);
  const [applicantsPagination, setApplicantsPagination] = useState<PaginationMeta>({
    page: 1, pageSize: 50, total: 0, totalPages: 1,
  });
  const [applicantsPage, setApplicantsPage] = useState(1);
  const [selectedApplicantJob, setSelectedApplicantJob] = useState<JobItem | null>(null);
  const [isApplicantsLoading, setIsApplicantsLoading] = useState(false);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [statusUpdatingJobId, setStatusUpdatingJobId] = useState<string | null>(null);
  const [closeTarget, setCloseTarget] = useState<JobItem | null>(null);
  const [shortlistTarget, setShortlistTarget] = useState<PendingShortlistAction | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);
  const [postJobFocusTick, setPostJobFocusTick] = useState(0);
  const [schedulerFreelancerUser, setSchedulerFreelancerUser] = useState<string | undefined>();
  const [collegeInviteHistory, setCollegeInviteHistory] = useState<CompanyCollegeInviteItem[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [isAssessmentsLoading, setIsAssessmentsLoading] = useState(false);
  const lazyLoadedRef = useRef({ wallet: false, assessments: false, invites: false });

  // ── Data loaders ──────────────────────────────────────────────────────────

  const refreshCreditWallet = useCallback(async (force = false) => {
    if (lazyLoadedRef.current.wallet && !force) return;
    setWalletLoading(true);
    try {
      const wallet = await getCompanyCreditWallet();
      setCreditWallet(wallet);
      lazyLoadedRef.current.wallet = true;
    } catch { /* ignore */ } finally {
      setWalletLoading(false);
    }
  }, []);

  const loadCollegeInvites = useCallback(async (force = false) => {
    if (lazyLoadedRef.current.invites && !force) return;
    try {
      const invites = await listCompanyCollegeInvites();
      setCollegeInviteHistory(invites);
      lazyLoadedRef.current.invites = true;
    } catch { /* optional */ }
  }, []);

  const loadAssessments = useCallback(async (force = false) => {
    if (lazyLoadedRef.current.assessments && !force) return;
    setIsAssessmentsLoading(true);
    try {
      const data = await listCompanyAssessments();
      setAssessments(data.assessments);
      lazyLoadedRef.current.assessments = true;
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to load assessments." });
    } finally {
      setIsAssessmentsLoading(false);
    }
  }, []);

  const refreshApplicants = useCallback(async (job?: JobItem | null, page = 1) => {
    setIsApplicantsLoading(true);
    setFormError("");
    try {
      const result = await listCompanyApplicants({ jobId: job?.id, page, pageSize: 50, sort: "score" });
      setApplicants(result.applicants);
      if (result.pagination) {
        setApplicantsPagination(result.pagination);
        setApplicantsPage(result.pagination.page);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load applicants.";
      setFormError(message);
      setToast({ type: "error", message });
    } finally {
      setIsApplicantsLoading(false);
    }
  }, []);

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = window.localStorage.getItem("scout_company_theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

  useEffect(() => {
    const sessionRaw = localStorage.getItem("scout_session");
    const session = sessionRaw ? (JSON.parse(sessionRaw) as { role?: string }) : null;
    if (session?.role !== "company") {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    async function bootstrap() {
      try {
        const [me, loadedJobs] = await Promise.all([getCompanyMe(), listCompanyJobs()]);
        if (cancelled) return;
        const meUser = me?.user as CompanyUser;
        if (meUser?.isSubAdmin) { router.replace("/sub-admin/dashboard"); return; }
        setUser(meUser || null);
        setJobs(loadedJobs);
        setIsLoading(false);
        void Promise.all([refreshCreditWallet(), loadCollegeInvites()]).catch(() => {});
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unauthorized.");
        router.replace("/login");
        setIsLoading(false);
      }
    }
    void bootstrap();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setApplicantsPage(1); }, [selectedApplicantJob?.id]);

  useEffect(() => {
    if (isLoading) return;
    if (activeMenu === "view-applicants") void refreshApplicants(selectedApplicantJob, applicantsPage);
    if (activeMenu === "assessments") void loadAssessments();
    if (activeMenu === "job-journey") void loadCollegeInvites();
    if (activeMenu === "credit-purchase") void refreshCreditWallet();
  }, [activeMenu, isLoading, selectedApplicantJob, applicantsPage, refreshApplicants, loadAssessments, loadCollegeInvites, refreshCreditWallet]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    window.localStorage.setItem("scout_company_theme", theme);
  }, [theme]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleLogout() {
    await clearPortalSession();
    router.replace("/login");
  }

  function updateJobForm<K extends keyof JobFormPayload>(key: K, value: JobFormPayload[K]) {
    setJobForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateAssessmentForm<K extends keyof AssessmentFormPayload>(key: K, value: AssessmentFormPayload[K]) {
    setAssessmentForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleJobSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!jobForm.title.trim() || !jobForm.skills.trim() || !jobForm.openings) {
      setFormError("Please fill Job title, Skills, and Number of openings.");
      return;
    }
    if (jobForm.openings <= 0) { setFormError("Number of openings must be a positive number."); return; }
    try {
      const nextJobs = await createCompanyJob({ ...jobForm, title: jobForm.title.trim(), skills: jobForm.skills.trim() });
      setJobs(nextJobs);
      setJobForm(initialJobForm);
      setActiveMenu("job-listings");
      setToast({ type: "success", message: "Job posted successfully." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to post job.";
      setFormError(message);
      setToast({ type: "error", message });
    }
  }

  async function handleUpdateJobStatus(jobId: string, nextStatus: JobItem["status"]) {
    setFormError("");
    setStatusUpdatingJobId(jobId);
    try {
      await updateCompanyJobStatus(jobId, nextStatus);
      setJobs(await listCompanyJobs());
      setToast({ type: "success", message: nextStatus === "Active" ? "Job published successfully." : "Job closed successfully." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update status.";
      setFormError(message);
      setToast({ type: "error", message });
    } finally {
      setStatusUpdatingJobId(null);
    }
  }

  async function handleConfirmClose() {
    if (!closeTarget) return;
    await handleUpdateJobStatus(closeTarget.id, "Closed");
    setCloseTarget(null);
  }

  function handleJobUpdated(updatedJob: JobItem) {
    setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
  }

  async function handleAssessmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!assessmentForm.title.trim()) { setFormError("Please enter assessment title."); return; }
    if (assessmentForm.scheduleMode === "Scheduled" && (!assessmentForm.windowStart || !assessmentForm.windowEnd)) {
      setFormError("Scheduled assessments need a start and end window."); return;
    }
    if (assessmentForm.durationMinutes <= 0 || assessmentForm.totalQuestions <= 0) {
      setFormError("Duration and questions must be positive."); return;
    }
    if (assessmentForm.passingScore < 0 || assessmentForm.passingScore > 100) {
      setFormError("Passing score should be between 0 and 100."); return;
    }
    try {
      let questionsJson: unknown = [];
      if (assessmentForm.questionsJson.trim()) questionsJson = JSON.parse(assessmentForm.questionsJson);
      const nextAssessments = await createCompanyAssessment({
        ...assessmentForm,
        title: assessmentForm.title.trim(),
        description: assessmentForm.description.trim(),
        questionsJson: JSON.stringify(questionsJson),
      });
      setAssessments(nextAssessments);
      setAssessmentForm(initialAssessmentForm);
      setToast({ type: "success", message: "Assessment saved as draft. Publish when ready." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create assessment.";
      setFormError(message);
      setToast({ type: "error", message });
    }
  }

  async function handlePublishAssessment(assessmentId: string) {
    setFormError("");
    setPublishingAssessmentId(assessmentId);
    try {
      setAssessments(await publishCompanyAssessment(assessmentId));
      await refreshCreditWallet(true);
      setToast({ type: "success", message: "Assessment published." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to publish.";
      setFormError(message);
      setToast({ type: "error", message });
    } finally {
      setPublishingAssessmentId(null);
    }
  }

  async function handleViewApplicants(job?: JobItem) {
    setSelectedApplicantJob(job || null);
    setActiveMenu("view-applicants");
    await refreshApplicants(job || null, 1);
  }

  async function handleInviteCollege(job: JobItem, collegeEmails: string[], note?: string) {
    try {
      const message = await inviteCollegeForCompanyJob({ jobId: job.id, collegeEmails, note });
      await loadCollegeInvites(true);
      setToast({ type: "success", message });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send college invitation.";
      setFormError(message);
      setToast({ type: "error", message });
      throw err;
    }
  }

  async function handleResendCollegeInvite(invite: CompanyCollegeInviteItem) {
    const job = jobs.find((row) => row.id === invite.jobId);
    if (!job) {
      const message = "Job no longer exists for this invite.";
      setFormError(message);
      setToast({ type: "error", message });
      return;
    }
    await handleInviteCollege(job, [invite.collegeEmail], invite.note || undefined);
  }

  async function submitApplicantStatusChange(
    applicationId: string,
    status: ApplicationStatus,
    schedule?: ShortlistSchedulePayload,
    feedback?: string,
  ) {
    setFormError("");
    setUpdatingApplicationId(applicationId);
    try {
      const apiMessage = await updateCompanyApplicantStatus(applicationId, status, schedule, feedback);
      const refreshed = await listCompanyApplicants({
        jobId: selectedApplicantJob?.id, page: applicantsPage, pageSize: 50, sort: "score",
      });
      setApplicants(refreshed.applicants);
      if (refreshed.pagination) setApplicantsPagination(refreshed.pagination);
      if (status === "Shortlisted" && apiMessage.toLowerCase().includes("could not be sent")) {
        setToast({ type: "warning", message: apiMessage });
      } else if (status === "Shortlisted") {
        setToast({ type: "success", message: apiMessage });
      } else {
        setToast({ type: "success", message: `Applicant status updated to ${status}.` });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update applicant status.";
      setFormError(message);
      setToast({ type: "error", message });
    } finally {
      setUpdatingApplicationId(null);
    }
  }

  async function handleApplicantStatusChange(applicationId: string, status: ApplicationStatus, feedback?: string) {
    if (status === "Shortlisted") {
      const applicantName = applicants.find((a) => a.applicationId === applicationId)?.studentName || "student";
      setShortlistTarget({ applicationId, applicantName });
      return;
    }
    await submitApplicantStatusChange(applicationId, status, undefined, feedback);
  }

  async function handleShortlistConfirm(payload: ShortlistScheduleFormPayload) {
    if (!shortlistTarget) return;
    setUpdatingApplicationId(shortlistTarget.applicationId);
    try {
      const result = await scheduleCompanyInterview({
        applicationId: shortlistTarget.applicationId,
        interviewType: "Video",
        startDatetime: payload.scheduleAt,
        meetingLink: payload.gmeetLink,
        interviewerName: payload.interviewerName || undefined,
        interviewerEmail: payload.interviewerEmail || undefined,
        hrNotifyEmails: payload.hrNotifyEmails || undefined,
        notes: payload.notes || undefined,
        markShortlisted: true,
      });
      const refreshed = await listCompanyApplicants({
        jobId: selectedApplicantJob?.id, page: applicantsPage, pageSize: 50, sort: "score",
      });
      setApplicants(refreshed.applicants);
      if (refreshed.pagination) setApplicantsPagination(refreshed.pagination);
      setToast({ type: "success", message: result.message });
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to schedule interview." });
    } finally {
      setUpdatingApplicationId(null);
      setShortlistTarget(null);
    }
  }

  function toggleTheme() { setTheme((prev) => (prev === "light" ? "dark" : "light")); }

  function openPostJob() {
    setActiveMenu("post-job");
    setPostJobFocusTick((prev) => prev + 1);
  }

  function handleMenuChange(next: MenuKey) {
    if (next === "post-job") { openPostJob(); return; }
    setActiveMenu(next);
  }

  function handleJobChange(jobId: string | undefined) {
    const job = jobId ? (jobs.find((j) => j.id === jobId) ?? null) : null;
    setSelectedApplicantJob(job);
    void refreshApplicants(job, 1);
  }

  return {
    // state
    theme, isLoading, user, error, activeMenu, jobs, assessments, creditWallet,
    publishingAssessmentId, jobForm, assessmentForm,
    applicants, applicantsPagination, applicantsPage, selectedApplicantJob, isApplicantsLoading,
    updatingApplicationId, formError, statusUpdatingJobId, closeTarget, shortlistTarget,
    toast, postJobFocusTick, schedulerFreelancerUser, collegeInviteHistory,
    walletLoading, isAssessmentsLoading,
    // setters needed by child components
    setCloseTarget, setShortlistTarget, setSchedulerFreelancerUser,
    setActiveMenu, setAssessmentForm, setJobForm, setToast,
    // handlers
    toggleTheme, openPostJob, handleMenuChange, handleLogout,
    updateJobForm, updateAssessmentForm,
    handleJobSubmit, handleUpdateJobStatus, handleConfirmClose,
    handleAssessmentSubmit, handlePublishAssessment,
    handleViewApplicants, handleInviteCollege, handleResendCollegeInvite,
    handleApplicantStatusChange, handleShortlistConfirm,
    refreshApplicants, refreshCreditWallet, loadCollegeInvites,
    handleJobChange, handleJobUpdated,
  };
}
