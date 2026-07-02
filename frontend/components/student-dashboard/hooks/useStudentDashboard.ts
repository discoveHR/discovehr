"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../../common/useToast";
import {
  acceptCollegiateEnrollment,
  applyToJob,
  declineCollegiateEnrollment,
  getStudentDashboardData,
  getStudentLmsContext,
  getStudentProfile,
  listStudentJobs,
  searchIndianColleges,
  updateStudentProfile,
  requestStudentProfileEdit,
  uploadStudentPhoto,
  uploadStudentResume,
  type CollegeOption,
  type JobItem,
  type StudentApplicationStatus,
  type StudentCollegiateInvite,
  type StudentLmsContext,
  type StudentProfileData,
  type PaginationMeta,
  type StudentDashboardData,
  type TpoPosting,
} from "../../../lib/api";
import { clearPortalSession } from "../../../lib/auth/session";
import { DEFAULT_PUBLIC_JOB_APPLY, EMPTY_STUDENT_PROFILE, normalizeDateForInput } from "../constants";
import type { StudentMenuKey, StudentProfileFlags, StudentUser } from "../types";

export function useStudentDashboard() {
  const router = useRouter();
  const { toast, showToast, dismissToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeMenu, setActiveMenu] = useState<StudentMenuKey>("all-jobs");
  const [student, setStudent] = useState<StudentUser | null>(null);
  const [suggestedJobs, setSuggestedJobs] = useState<JobItem[]>([]);
  const [jobBoardJobs, setJobBoardJobs] = useState<JobItem[]>([]);
  const [jobsPagination, setJobsPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 30,
    total: 0,
    totalPages: 1,
  });
  const [isJobsLoading, setIsJobsLoading] = useState(false);
  const [jobsPage, setJobsPage] = useState(1);
  const [internalPostings, setInternalPostings] = useState<TpoPosting[]>([]);
  const [applicationStatus, setApplicationStatus] = useState<StudentApplicationStatus[]>([]);
  const [applicationsTruncated, setApplicationsTruncated] = useState(false);
  const [lmsContext, setLmsContext] = useState<StudentLmsContext | null>(null);
  const [isLmsLoading, setIsLmsLoading] = useState(false);
  const [profileForm, setProfileForm] = useState<StudentProfileData>({ ...EMPTY_STUDENT_PROFILE });
  const profileSteps = useMemo(
    () => [
      { id: "personal", label: "Personal details" },
      { id: "address", label: "Address details" },
      { id: "academic", label: "Academic details" },
      { id: "skills", label: "Skills & career" },
      { id: "resume", label: "Resume upload" },
      { id: "identification", label: "ID & profiles" },
      { id: "declaration", label: "Declaration" },
    ],
    [],
  );
  const [profileWizardStep, setProfileWizardStep] = useState(0);
  const [profileStepError, setProfileStepError] = useState("");
  const [resumeUploadFile, setResumeUploadFile] = useState<File | null>(null);
  const [photoUploadFile, setPhotoUploadFile] = useState<File | null>(null);
  const [isRequestingEdit, setIsRequestingEdit] = useState(false);
  const [profileFlags, setProfileFlags] = useState<StudentProfileFlags>({
    profileSubmitted: false,
    profileEditRequested: false,
    profileEditApproved: false,
    profileComplete: false,
    canApplyToJobs: false,
    canApplyToGeneralJobboard: false,
    publicJobApply: DEFAULT_PUBLIC_JOB_APPLY,
  });
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isResumeSaving, setIsResumeSaving] = useState(false);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [profileApplyModalOpen, setProfileApplyModalOpen] = useState(false);
  const [priCapModalOpen, setPriCapModalOpen] = useState(false);
  const [upgradeProModalOpen, setUpgradeProModalOpen] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [collegiateInvite, setCollegiateInvite] = useState<StudentCollegiateInvite | null>(null);
  const [candidateType, setCandidateType] = useState<string>("Independent");
  const [collegiateForm, setCollegiateForm] = useState({
    departmentStream: "",
    courseClassGrade: "",
    academicYear: "",
    areaOfStudy: "",
  });
  const [isCollegiateSaving, setIsCollegiateSaving] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [locationFilter, setLocationFilter] = useState<"All" | JobItem["locationType"]>("All");
  const [experienceFilter, setExperienceFilter] = useState<"All" | "0 year" | "1 year" | "2 years">("All");
  const [typeFilter, setTypeFilter] = useState<"All" | JobItem["opportunityType"]>("All");
  const [collegeResults, setCollegeResults] = useState<CollegeOption[]>([]);
  const [isCollegeLoading, setIsCollegeLoading] = useState(false);
  const [collegeSearchError, setCollegeSearchError] = useState("");
  const [isCollegeDropdownOpen, setIsCollegeDropdownOpen] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const profileLoadedRef = useRef(false);
  const lmsLoadedRef = useRef(false);

  const showCollegeDropdown = profileWizardStep === 2 && isCollegeDropdownOpen && profileForm.college.trim().length >= 2;
  const selectedCollege = useMemo(
    () => collegeResults.find((item) => item.name.toLowerCase() === profileForm.college.trim().toLowerCase()),
    [collegeResults, profileForm.college],
  );
  const photoPreviewUrl = useMemo(() => (photoUploadFile ? URL.createObjectURL(photoUploadFile) : ""), [photoUploadFile]);

  const profileLocked = useMemo(
    () => profileFlags.profileSubmitted && !profileFlags.profileEditApproved,
    [profileFlags.profileSubmitted, profileFlags.profileEditApproved],
  );

  useEffect(() => {
    const sessionRaw = localStorage.getItem("scout_session");
    const session = sessionRaw ? (JSON.parse(sessionRaw) as { role?: string }) : null;
    if (session?.role !== "student") {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      try {
        await loadDashboard();
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("scout_student_theme");
    if (saved === "dark" || saved === "light") {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("scout_student_theme", theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  useEffect(() => {
    if (!collegiateInvite?.inviteId) return;
    setCollegiateForm({
      departmentStream: collegiateInvite.suggestedBranch || "",
      courseClassGrade: collegiateInvite.suggestedBatch || "",
      academicYear: collegiateInvite.suggestedYear || "",
      areaOfStudy: "",
    });
  }, [collegiateInvite?.inviteId]);

  const applyDashboardBootstrap = useCallback((data: StudentDashboardData) => {
    setStudent((data?.student as StudentUser) || null);
    setSuggestedJobs(data?.suggestedJobs || []);
    setInternalPostings(data?.internalPostings || []);
    setApplicationStatus(data?.applicationStatus || []);
    setApplicationsTruncated(Boolean(data?.applicationsTruncated));
    if (data?.listJobs?.length) {
      setJobBoardJobs(data.listJobs);
    }

    const flags = data.profileFlags;
    const pubApply = data.publicJobApply;
    setProfileFlags({
      profileSubmitted: Boolean(flags?.profileSubmitted),
      profileEditRequested: Boolean(flags?.profileEditRequested),
      profileEditApproved: Boolean(flags?.profileEditApproved),
      profileComplete: Boolean(flags?.profileComplete),
      canApplyToJobs: Boolean(flags?.canApplyToJobs),
      canApplyToGeneralJobboard: Boolean(flags?.canApplyToGeneralJobboard ?? pubApply?.canApplyToPublicJobboard),
      publicJobApply: pubApply || DEFAULT_PUBLIC_JOB_APPLY,
    });

    const invite = data.collegiateInvite;
    setCollegiateInvite(invite?.inviteId ? invite : null);
    setCandidateType(data.candidateType || "Independent");
    setIsPro(Boolean(data.isPro));
    setCoinBalance(data.coinBalance ?? 0);

    setProfileForm((prev) => ({
      ...prev,
      fullName: data.student?.full_name || prev.fullName,
      email: data.student?.email || prev.email,
    }));
  }, []);

  const loadLmsContext = useCallback(async (force = false) => {
    if (lmsLoadedRef.current && !force) return;
    lmsLoadedRef.current = true;
    setIsLmsLoading(true);
    try {
      const lms = await getStudentLmsContext();
      setLmsContext(lms);
    } catch {
      setLmsContext({
        enabled: false,
        provider: "LMS",
        launchUrl: "",
        courses: [],
        message: "LMS details are currently unavailable.",
      });
    } finally {
      setIsLmsLoading(false);
    }
  }, []);

  async function loadDashboard() {
    try {
      const data = await getStudentDashboardData();
      applyDashboardBootstrap(data);
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load dashboard.";
      setError(message);
      const backendDown = /cannot reach|start frappe|bad gateway|failed to fetch|network/i.test(message);
      if (backendDown) {
        return;
      }
      await clearPortalSession();
      router.replace("/login");
    }
  }

  async function handleRequestProfileEdit() {
    setError("");
    setIsRequestingEdit(true);
    try {
      const message = await requestStudentProfileEdit();
      await loadDashboard();
      showToast(message);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send request.";
      setError(message);
    } finally {
      setIsRequestingEdit(false);
    }
  }

  async function handleAcceptCollegiate() {
    if (!collegiateInvite || profileLocked) return;
    setError("");
    setIsCollegiateSaving(true);
    try {
      const msg = await acceptCollegiateEnrollment({
        inviteId: collegiateInvite.inviteId,
        departmentStream: collegiateForm.departmentStream.trim(),
        courseClassGrade: collegiateForm.courseClassGrade.trim(),
        academicYear: collegiateForm.academicYear.trim(),
        areaOfStudy: collegiateForm.areaOfStudy.trim() || undefined,
      });
      await loadDashboard();
      if (activeMenu === "profile") {
        profileLoadedRef.current = false;
        await loadFullProfile(true);
      }
      showToast(msg);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to confirm placement.";
      setError(message);
    } finally {
      setIsCollegiateSaving(false);
    }
  }

  async function handleDeclineCollegiate() {
    if (!collegiateInvite || profileLocked) return;
    if (!window.confirm("Decline this college invite and continue as an independent candidate?")) return;
    setError("");
    setIsCollegiateSaving(true);
    try {
      const msg = await declineCollegiateEnrollment(collegiateInvite.inviteId);
      await loadDashboard();
      if (activeMenu === "profile") {
        profileLoadedRef.current = false;
        await loadFullProfile(true);
      }
      showToast(msg);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to decline invite.";
      setError(message);
    } finally {
      setIsCollegiateSaving(false);
    }
  }

  async function handleLogout() {
    await clearPortalSession();
    router.replace("/login");
  }

  async function handleApply(jobId: string) {
    setApplyingJobId(jobId);
    setError("");
    try {
      await applyToJob(jobId);
      await loadDashboard();
      if (activeMenu === "all-jobs") {
        await loadJobBoard(jobsPage);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to apply for job.";
      if (/complete and submit your profile/i.test(message)) {
        setProfileApplyModalOpen(true);
      } else if (/placement readiness index|public job applications without pri/i.test(message)) {
        setPriCapModalOpen(true);
      } else {
        setError(message);
      }
    } finally {
      setApplyingJobId(null);
    }
  }

  function openUpgradeProModal() {
    setUpgradeProModalOpen(true);
  }

  function closeUpgradeProModal() {
    setUpgradeProModalOpen(false);
  }

  function onApplyJobClick(jobId: string) {
    if (!isPro) {
      setUpgradeProModalOpen(true);
      return;
    }
    if (!profileFlags.canApplyToJobs) {
      setProfileApplyModalOpen(true);
      return;
    }
    if (!profileFlags.canApplyToGeneralJobboard) {
      setPriCapModalOpen(true);
      return;
    }
    void handleApply(jobId);
  }

  function toggleDetails(jobId: string) {
    setExpandedJobId((prev) => (prev === jobId ? null : jobId));
  }

  function filterJobs(jobs: JobItem[]) {
    const query = searchText.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchSearch =
        !query ||
        job.title.toLowerCase().includes(query) ||
        (job.companyName || "").toLowerCase().includes(query);
      const matchLocation = locationFilter === "All" || job.locationType === locationFilter;
      const matchExperience = experienceFilter === "All" || job.minExperience === experienceFilter;
      const matchType = typeFilter === "All" || job.opportunityType === typeFilter;
      return matchSearch && matchLocation && matchExperience && matchType;
    });
  }

  const loadJobBoard = useCallback(
    async (page = 1) => {
      setIsJobsLoading(true);
      try {
        const result = await listStudentJobs({
          page,
          pageSize: 30,
          q: searchText.trim() || undefined,
          locationType: locationFilter,
          opportunityType: typeFilter,
          minExperience: experienceFilter,
        });
        setJobBoardJobs(result.jobs);
        setJobsPagination(result.pagination);
        setJobsPage(result.pagination.page);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load jobs.";
        setError(message);
      } finally {
        setIsJobsLoading(false);
      }
    },
    [searchText, locationFilter, experienceFilter, typeFilter],
  );

  useEffect(() => {
    if (activeMenu !== "all-jobs") return;
    const timer = window.setTimeout(() => {
      void loadJobBoard(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [activeMenu, loadJobBoard]);

  const filteredSuggestedJobs = filterJobs(suggestedJobs);

  function resetFilters() {
    setSearchText("");
    setLocationFilter("All");
    setExperienceFilter("All");
    setTypeFilter("All");
    setJobsPage(1);
  }

  function goToJobsPage(page: number) {
    const next = Math.max(1, Math.min(jobsPagination.totalPages, page));
    void loadJobBoard(next);
  }

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }

  function openLms() {
    if (!lmsContext?.enabled || !lmsContext.launchUrl) return;
    window.open(lmsContext.launchUrl, "_blank", "noopener,noreferrer");
  }

  function updateProfileField<K extends keyof StudentProfileData>(key: K, value: StudentProfileData[K]) {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCollegeSearch(value: string) {
    updateProfileField("college", value);
    setCollegeSearchError("");

    if (value.trim().length < 2) {
      setCollegeResults([]);
      setIsCollegeDropdownOpen(false);
      return;
    }

    setIsCollegeDropdownOpen(true);
    setIsCollegeLoading(true);
    try {
      const results = await searchIndianColleges(value);
      setCollegeResults(results);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to fetch colleges.";
      setCollegeSearchError(message);
      setCollegeResults([]);
    } finally {
      setIsCollegeLoading(false);
    }
  }

  function validatePinCode(): string {
    const pin = profileForm.pinCode.trim();
    if (pin && profileForm.country === "India" && !/^\d{6}$/.test(pin)) {
      return "PIN code for India must be 6 digits.";
    }
    if (pin && profileForm.country !== "India" && pin.length > 16) {
      return "PIN / postal code looks too long.";
    }
    return "";
  }

  function validateProfileWizardStep(step: number): string {
    const f = profileForm;
    if (step === 0) {
      if (!f.fullName.trim()) return "Full name is required.";
      if (!f.phone.trim()) return "Mobile number is required.";
      if (!f.gender) return "Gender is required.";
      if (!f.dateOfBirth) return "Date of birth is required.";
      if (!f.parentGuardianName.trim()) return "Parent / guardian name is required.";
      if (!f.parentContactNumber.trim()) return "Parent contact number is required.";
      return "";
    }
    if (step === 1) {
      if (!f.address.trim()) return "House name / address is required.";
      if (!f.city.trim()) return "City / town is required.";
      if (!f.district.trim()) return "District is required.";
      if (!f.state) return "State is required.";
      if (!f.country) return "Country is required.";
      if (!f.pinCode.trim()) return "PIN code is required.";
      return validatePinCode();
    }
    if (step === 2) {
      if (!f.college.trim()) return "College name is required.";
      if (!f.universityName.trim()) return "University name is required.";
      if (!f.courseClassGrade.trim()) return "Course / program is required.";
      if (!f.departmentStream.trim()) return "Department / branch is required.";
      if (!f.academicYear.trim()) return "Year of study is required.";
      if (!f.semester.trim()) return "Semester is required.";
      if (!f.rollNumber.trim()) return "Roll / register number is required.";
      if (!f.admissionYear.trim()) return "Admission year is required.";
      if (!f.expectedGraduationYear.trim()) return "Expected graduation year is required.";
      if (!f.currentCgpa.trim()) return "Current CGPA / percentage is required.";
      return "";
    }
    if (step === 3) {
      if (!f.skills.trim()) return "Skills are required.";
      if (!f.preferredJobRole.trim()) return "Preferred job role is required.";
      return "";
    }
    if (step === 4) {
      if (!f.resumeFile && !resumeUploadFile) return "Resume upload is required.";
      return "";
    }
    if (step === 5) {
      if (!f.studentIdCardNumber.trim()) return "Student ID card number is required.";
      const aadhaar = f.aadhaarNumber.trim();
      if (aadhaar && !/^\d{12}$/.test(aadhaar)) return "Aadhaar number must be 12 digits when provided.";
      return "";
    }
    if (step === 6) {
      if (!f.profileConsent) return "You must confirm that the information provided is correct.";
      return "";
    }
    return "";
  }

  function studentProfileDocname() {
    return (profileForm.email || student?.email || "").trim();
  }

  async function syncProfileFromServer(): Promise<boolean> {
    try {
      const profile = await getStudentProfile();
      const {
        profileSubmitted = false,
        profileEditRequested = false,
        profileEditApproved = false,
        profileComplete = false,
        canApplyToJobs = false,
        canApplyToGeneralJobboard = false,
        publicJobApply: pubApply,
        priScore: _priScore,
        collegiateInvite: profileCollegiate,
        candidateType: loadedCandidateType = "Independent",
        linkedTpoUser: _linkedTpo,
        ...formRest
      } = profile;
      setCollegiateInvite(profileCollegiate?.inviteId ? profileCollegiate : null);
      setCandidateType(loadedCandidateType || "Independent");
      setProfileFlags({
        profileSubmitted: Boolean(profileSubmitted),
        profileEditRequested: Boolean(profileEditRequested),
        profileEditApproved: Boolean(profileEditApproved),
        profileComplete: Boolean(profileComplete),
        canApplyToJobs: Boolean(canApplyToJobs),
        canApplyToGeneralJobboard: Boolean(canApplyToGeneralJobboard),
        publicJobApply: pubApply || DEFAULT_PUBLIC_JOB_APPLY,
      });
      setProfileForm((prev) => ({
        ...prev,
        ...formRest,
        dateOfBirth: normalizeDateForInput(formRest.dateOfBirth || prev.dateOfBirth || ""),
        profileConsent: Boolean(formRest.profileConsent),
        fullName: formRest.fullName || prev.fullName,
        email: formRest.email || prev.email,
        resumeFile: formRest.resumeFile || prev.resumeFile,
        profilePhoto: formRest.profilePhoto || prev.profilePhoto,
      }));
      profileLoadedRef.current = true;
      return Boolean(profileComplete);
    } catch {
      /* keep local draft */
    }
    return profileFlags.profileComplete;
  }

  const loadFullProfile = useCallback(async (force = false) => {
    if (profileLoadedRef.current && !force) return;
    setIsProfileLoading(true);
    try {
      await syncProfileFromServer();
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (activeMenu === "lms") {
      void loadLmsContext();
    }
  }, [activeMenu, isLoading, loadLmsContext]);

  useEffect(() => {
    if (isLoading) return;
    if (activeMenu === "profile") {
      void loadFullProfile();
    }
  }, [activeMenu, isLoading, loadFullProfile]);

  async function persistCurrentProfileStep(advanceStep: boolean): Promise<boolean> {
    if (profileLocked) return false;
    const validation = validateProfileWizardStep(profileWizardStep);
    if (validation) {
      setProfileStepError(validation);
      return false;
    }
    setProfileStepError("");
    setError("");
    setIsProfileSaving(true);
    try {
      const docname = studentProfileDocname();
      let resumeFile = profileForm.resumeFile;
      let profilePhoto = profileForm.profilePhoto;
      if (profileWizardStep === 4 && resumeUploadFile) {
        resumeFile = await uploadStudentResume(resumeUploadFile, docname || undefined);
      }
      if (profileWizardStep === 0 && photoUploadFile) {
        profilePhoto = await uploadStudentPhoto(photoUploadFile, docname || undefined);
      }
      const message = await updateStudentProfile({
        ...profileForm,
        resumeFile,
        profilePhoto,
        finalizeProfile: false,
      });
      setProfileForm((prev) => ({ ...prev, resumeFile, profilePhoto }));
      if (resumeUploadFile) setResumeUploadFile(null);
      if (photoUploadFile) setPhotoUploadFile(null);
      const profileComplete = await syncProfileFromServer();
      if (advanceStep) {
        setProfileWizardStep((prev) => Math.min(prev + 1, profileSteps.length - 1));
      }
      const completeNote = profileComplete ? " All required fields are complete." : "";
      showToast((message || "Section saved.") + completeNote);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save this section.";
      setProfileStepError(message);
      return false;
    } finally {
      setIsProfileSaving(false);
    }
  }

  async function nextProfileWizardStep() {
    await persistCurrentProfileStep(true);
  }

  function previousProfileWizardStep() {
    if (profileLocked) return;
    setProfileStepError("");
    setProfileWizardStep((prev) => Math.max(prev - 1, 0));
  }

  async function handleSaveResume() {
    if (profileLocked) return;
    const validation = validateProfileWizardStep(4);
    if (validation && !profileForm.resumeFile) {
      setProfileStepError(validation);
      return;
    }
    if (!resumeUploadFile && !profileForm.resumeFile) {
      setProfileStepError("Choose a resume file to upload.");
      return;
    }
    setProfileStepError("");
    setError("");
    setIsResumeSaving(true);
    try {
      const docname = studentProfileDocname();
      let resumeFile = profileForm.resumeFile;
      if (resumeUploadFile) {
        resumeFile = await uploadStudentResume(resumeUploadFile, docname || undefined);
      }
      const message = await updateStudentProfile({ ...profileForm, resumeFile, finalizeProfile: false });
      setProfileForm((prev) => ({ ...prev, resumeFile }));
      setResumeUploadFile(null);
      await syncProfileFromServer();
      showToast(message || "Resume saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save resume.";
      setError(message);
    } finally {
      setIsResumeSaving(false);
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileLocked) {
      return;
    }
    const validation = validateProfileWizardStep(profileWizardStep);
    if (validation) {
      setProfileStepError(validation);
      return;
    }
    setError("");
    setIsProfileSaving(true);
    try {
      let resumeFile = profileForm.resumeFile;
      let profilePhoto = profileForm.profilePhoto;
      const docname = studentProfileDocname();
      if (resumeUploadFile) {
        resumeFile = await uploadStudentResume(resumeUploadFile, docname || undefined);
      }
      if (photoUploadFile) {
        profilePhoto = await uploadStudentPhoto(photoUploadFile, docname || undefined);
      }
      const message = await updateStudentProfile({ ...profileForm, resumeFile, profilePhoto, finalizeProfile: true });
      setProfileForm((prev) => ({ ...prev, resumeFile, profilePhoto }));
      setResumeUploadFile(null);
      setPhotoUploadFile(null);
      await loadDashboard();
      profileLoadedRef.current = true;
      if (message) {
        showToast(message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save profile.";
      setError(message);
    } finally {
      setIsProfileSaving(false);
    }
  }

  const dashboard = {
    isLoading,
    isProfileLoading,
    error,
    theme,
    activeMenu,
    setActiveMenu,
    student,
    suggestedJobs,
    jobBoardJobs,
    jobsPagination,
    isJobsLoading,
    jobsPage,
    goToJobsPage,
    internalPostings,
    applicationStatus,
    applicationsTruncated,
    lmsContext,
    isLmsLoading,
    profileForm,
    profileSteps,
    profileWizardStep,
    setProfileWizardStep,
    profileStepError,
    setProfileStepError,
    resumeUploadFile,
    setResumeUploadFile,
    photoUploadFile,
    setPhotoUploadFile,
    isRequestingEdit,
    profileFlags,
    isProfileSaving,
    isResumeSaving,
    handleSaveResume,
    applyingJobId,
    isPro,
    setIsPro,
    coinBalance,
    setCoinBalance,
    upgradeProModalOpen,
    openUpgradeProModal,
    closeUpgradeProModal,
    profileApplyModalOpen,
    setProfileApplyModalOpen,
    priCapModalOpen,
    setPriCapModalOpen,
    expandedJobId,
    collegiateInvite,
    candidateType,
    collegiateForm,
    setCollegiateForm,
    isCollegiateSaving,
    searchText,
    setSearchText,
    locationFilter,
    setLocationFilter,
    experienceFilter,
    setExperienceFilter,
    typeFilter,
    setTypeFilter,
    collegeResults,
    isCollegeLoading,
    collegeSearchError,
    isCollegeDropdownOpen,
    setIsCollegeDropdownOpen,
    showCollegeDropdown,
    selectedCollege,
    photoPreviewUrl,
    profileLocked,
    filteredSuggestedJobs,
    toast,
    showToast,
    dismissToast,
    setError,
    handleRequestProfileEdit,
    handleAcceptCollegiate,
    handleDeclineCollegiate,
    handleLogout,
    onApplyJobClick,
    toggleDetails,
    resetFilters,
    toggleTheme,
    openLms,
    updateProfileField,
    handleCollegeSearch,
    nextProfileWizardStep,
    previousProfileWizardStep,
    handleProfileSubmit,
  };

  return { dashboard };
}

export type StudentDashboardModel = ReturnType<typeof useStudentDashboard>["dashboard"];
