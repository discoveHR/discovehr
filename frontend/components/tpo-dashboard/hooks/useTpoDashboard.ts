"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../../common/useToast";
import {
  initialAddStudentForm,
  initialBulkUploadForm,
  initialDownloadFilters,
  initialInternalJobForm,
  initialTpoProfile,
} from "../constants";
import type {
  AddStudentForm,
  BulkStudentUploadForm,
  DownloadFilterForm,
  InternalJobFormState,
  SessionUser,
  StudentTabKey,
  TpoMenuKey,
} from "../types";
import {
  approveStudentProfileEdit,
  addTpoStudent,
  bulkUploadTpoStudentsAndWait,
  companyLogout,
  createTpoPosting,
  ensureScoutAccessToken,
  downloadStudentsByParametersUrl,
  getTpoAccountStatus,
  getTpoPostingApplicants,
  getTpoProfile,
  listStudentProfileEditRequests,
  listTpoPostings,
  listTpoStudentInvites,
  countTpoStudentsDirectory,
  getTpoDashboardRollup,
  listTpoStudentsByParameters,
  type TpoDashboardRollup,
  searchIndianColleges,
  sendCompanySpecialDashboardLink,
  uploadTpoStudentSheet,
  upsertTpoProfile,
  type CollegeOption,
  type StudentProfileEditRequestItem,
  type TpoAccountStatus,
  type TpoApplicant,
  type TpoPosting,
  type TpoProfile,
  type TpoListedStudent,
  type TpoStudentsPagination,
  type TpoStudentInvite,
  TPO_STUDENTS_PAGE_SIZE,
} from "../../../lib/api";

export function useTpoDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast, showToast, dismissToast } = useToast();

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [postings, setPostings] = useState<TpoPosting[]>([]);
  const [selectedPostingId, setSelectedPostingId] = useState("");
  const [applicants, setApplicants] = useState<TpoApplicant[]>([]);
  const [isApplicantsLoading, setIsApplicantsLoading] = useState(false);
  const [sendingPostingId, setSendingPostingId] = useState("");
  const [activeMenu, setActiveMenu] = useState<TpoMenuKey>("home");
  const [addStudentForm, setAddStudentForm] = useState<AddStudentForm>(initialAddStudentForm);
  const [downloadFilters, setDownloadFilters] = useState<DownloadFilterForm>(initialDownloadFilters);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [studentInvites, setStudentInvites] = useState<TpoStudentInvite[]>([]);
  const [bulkUploadForm, setBulkUploadForm] = useState<BulkStudentUploadForm>(initialBulkUploadForm);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkUploadAlert, setBulkUploadAlert] = useState<string | null>(null);
  const [tpoProfile, setTpoProfile] = useState<TpoProfile>(initialTpoProfile);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [collegeResults, setCollegeResults] = useState<CollegeOption[]>([]);
  const [isCollegeLoading, setIsCollegeLoading] = useState(false);
  const [isCollegeDropdownOpen, setIsCollegeDropdownOpen] = useState(false);
  const [collegeError, setCollegeError] = useState("");
  const [studentDirectoryCount, setStudentDirectoryCount] = useState(0);
  const [studentCountCapped, setStudentCountCapped] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeStudentTab, setActiveStudentTab] = useState<StudentTabKey>("all");
  const [studentRows, setStudentRows] = useState<TpoListedStudent[]>([]);
  const [studentPagination, setStudentPagination] = useState<TpoStudentsPagination>({
    page: 1,
    pageSize: TPO_STUDENTS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [studentPage, setStudentPage] = useState(1);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [profileEditRequests, setProfileEditRequests] = useState<StudentProfileEditRequestItem[]>([]);
  const [isProfileEditsLoading, setIsProfileEditsLoading] = useState(false);
  const [approvingStudentId, setApprovingStudentId] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [internalPostings, setInternalPostings] = useState<TpoPosting[]>([]);
  const [internalJobForm, setInternalJobForm] = useState<InternalJobFormState>(initialInternalJobForm);
  const [isCreatingInternal, setIsCreatingInternal] = useState(false);
  const [tpoAccountStatus, setTpoAccountStatus] = useState<TpoAccountStatus | null>(null);

  const homeMetricsEnabled = !isLoading && activeMenu === "home";

  const directoryCountQuery = useQuery({
    queryKey: ["tpo", "students-directory-count"],
    queryFn: () => countTpoStudentsDirectory(),
    enabled: homeMetricsEnabled,
    staleTime: 120_000,
  });

  const rollupQuery = useQuery({
    queryKey: ["tpo", "dashboard-rollup"],
    queryFn: () => getTpoDashboardRollup(),
    enabled: homeMetricsEnabled,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (!directoryCountQuery.data) return;
    setStudentDirectoryCount(directoryCountQuery.data.total);
    setStudentCountCapped(directoryCountQuery.data.truncated);
  }, [directoryCountQuery.data]);

  useEffect(() => {
    async function bootstrap() {
      const sessionRaw = window.localStorage.getItem("scout_session");
      let session: { role?: string } | null = null;
      try {
        session = sessionRaw ? (JSON.parse(sessionRaw) as { role?: string }) : null;
      } catch {
        session = null;
      }

      if (!session || session.role !== "tpo") {
        router.replace("/login");
        return;
      }

      const tokenOk = await ensureScoutAccessToken();
      if (!tokenOk) {
        localStorage.removeItem("scout_session");
        router.replace("/login");
        return;
      }

      await loadData();
      setIsLoading(false);
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("scout_tpo_theme");
    if (saved === "dark" || saved === "light") {
      setTheme(saved);
    }

    const rawSession = window.localStorage.getItem("scout_session");
    if (!rawSession) return;
    try {
      const parsed = JSON.parse(rawSession) as { user?: SessionUser };
      setSessionUser(parsed.user || null);
    } catch {
      setSessionUser(null);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("scout_tpo_theme", theme);
  }, [theme]);

  const institutionTitle = useMemo(() => {
    const c = tpoProfile.collegeName?.trim();
    if (c) return c;
    return "Training & Placement Office";
  }, [tpoProfile.collegeName]);

  const activePostingsCount = useMemo(() => postings.filter((p) => p.status === "Active").length, [postings]);
  const pendingInvitesCount = useMemo(() => studentInvites.filter((i) => i.status === "Pending").length, [studentInvites]);

  const showCollegeDropdown =
    (activeMenu === "college-profile" || activeMenu === "admin") &&
    isCollegeDropdownOpen &&
    tpoProfile.collegeName.trim().length >= 2;
  const displayName = sessionUser?.full_name || tpoProfile.tpoName || "TPO";
  const userEmail = sessionUser?.email || "";

  async function reloadAfterCollegeSetup() {
    try {
      await loadData();
      showToast("College profile saved.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to refresh dashboard.";
      showToast(message, "error");
    }
  }

  async function loadData(options?: { allowSessionRetry?: boolean }) {
    try {
      const { profile, status } = await getTpoProfile();
      setTpoProfile(profile);
      if (status) {
        setTpoAccountStatus(status);
      } else {
        setTpoAccountStatus(await getTpoAccountStatus());
      }
      // Home metrics, postings, and invites load when user opens those menus (see useEffects / React Query).
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unauthorized.";
      if (options?.allowSessionRetry !== false) {
        const refreshed = await ensureScoutAccessToken();
        if (refreshed) {
          try {
            await loadData({ allowSessionRetry: false });
            return;
          } catch {
            /* fall through to sign-out */
          }
        }
      }
      showToast(message, "error");
      void companyLogout().catch(() => {});
      localStorage.removeItem("scout_session");
      router.replace("/login");
    }
  }

  async function fetchApplicantsForPosting(postingId: string) {
    if (!postingId) return;
    setIsApplicantsLoading(true);
    try {
      const rows = await getTpoPostingApplicants(postingId);
      setApplicants(rows);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load applicants.";
      showToast(message, "error");
    } finally {
      setIsApplicantsLoading(false);
    }
  }

  async function handleLoadApplicants(postingId: string) {
    setSelectedPostingId(postingId);
    setActiveMenu("applicants");
    await fetchApplicantsForPosting(postingId);
  }

  async function handleSendMagicLink(postingId: string) {
    setSendingPostingId(postingId);
    try {
      const message = await sendCompanySpecialDashboardLink(postingId);
      showToast(message, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send dashboard link.";
      showToast(message, "error");
    } finally {
      setSendingPostingId("");
    }
  }

  async function handleCreateInternalPosting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tb = internalJobForm.targetBatches.trim();
    if (internalJobForm.batchAudience === "Specific Batches" && !tb) {
      showToast("Enter target batches (for example 2026, 2027 or 2026–2028), or choose All Students.", "error");
      return;
    }
    if (!internalJobForm.applicationLink.trim()) {
      showToast("Application link is required for internal job postings.", "error");
      return;
    }
    if (!internalJobForm.title.trim()) {
      showToast("Title is required.", "error");
      return;
    }
    setIsCreatingInternal(true);
    try {
      const { message } = await createTpoPosting({
        title: internalJobForm.title.trim(),
        description: internalJobForm.description.trim(),
        postingType: internalJobForm.postingType,
        audienceDescription: internalJobForm.audienceDescription.trim(),
        branch: internalJobForm.branch.trim() || "All",
        batch: internalJobForm.batchAudience === "Specific Batches" ? tb : "",
        eligibilityCriteria: internalJobForm.eligibilityCriteria.trim(),
        posterFile: internalJobForm.posterFile.trim(),
        applicationLink: internalJobForm.applicationLink.trim(),
        companyEmail: "",
        status: internalJobForm.status,
        validTill: internalJobForm.validTill.trim(),
        isInternalJob: true,
        batchAudience: internalJobForm.batchAudience,
        targetBatches: internalJobForm.batchAudience === "Specific Batches" ? tb : "",
        notifyStudents: internalJobForm.notifyStudents,
      });
      showToast(message, "success");
      setInternalJobForm({ ...initialInternalJobForm });
      const rows = await listTpoPostings("internal");
      setInternalPostings(rows);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create internal posting.";
      showToast(message, "error");
    } finally {
      setIsCreatingInternal(false);
    }
  }

  async function handleLogout() {
    await companyLogout();
    localStorage.removeItem("scout_session");
    router.replace("/login");
  }

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }

  async function handleAddStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAddingStudent(true);
    try {
      const message = await addTpoStudent(addStudentForm);
      showToast(message, "success");
      setAddStudentForm(initialAddStudentForm);
      const invites = await listTpoStudentInvites();
      setStudentInvites(invites);
      await queryClient.invalidateQueries({ queryKey: ["tpo", "students-directory-count"] });
      try {
        const listed = await listTpoStudentsByParameters({ page: 1 });
        setStudentDirectoryCount(listed.pagination.total);
        setStudentCountCapped(listed.pagination.total >= 2000);
        setStudentRows(listed.students);
        setStudentPagination(listed.pagination);
        setStudentPage(1);
      } catch {
        /* keep previous count */
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to add student.";
      showToast(message, "error");
    } finally {
      setIsAddingStudent(false);
    }
  }

  async function loadStudentDirectory(page = studentPage, options?: { batch?: string }) {
    const batchParam =
      options?.batch !== undefined
        ? options.batch
        : activeStudentTab === "batch"
          ? batchFilter.trim()
          : "";
    setIsStudentsLoading(true);
    try {
      const result = await listTpoStudentsByParameters({
        page,
        pageSize: TPO_STUDENTS_PAGE_SIZE,
        batch: batchParam || undefined,
      });
      setStudentRows(result.students);
      setStudentPagination(result.pagination);
      setStudentPage(result.pagination.page);
      setStudentDirectoryCount(result.pagination.total);
      setStudentCountCapped(Boolean(result.pagination.truncated));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load students.";
      showToast(message, "error");
    } finally {
      setIsStudentsLoading(false);
    }
  }

  function goToStudentPage(page: number) {
    void loadStudentDirectory(page);
  }

  async function loadProfileEditRequests() {
    setIsProfileEditsLoading(true);
    try {
      const rows = await listStudentProfileEditRequests();
      setProfileEditRequests(rows);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load profile edit requests.";
      showToast(message, "error");
    } finally {
      setIsProfileEditsLoading(false);
    }
  }

  async function handleApproveProfileEdit(studentId: string) {
    setApprovingStudentId(studentId);
    try {
      const message = await approveStudentProfileEdit(studentId);
      showToast(message, "success");
      await loadProfileEditRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to approve.";
      showToast(message, "error");
    } finally {
      setApprovingStudentId("");
    }
  }

  useEffect(() => {
    if (activeMenu !== "students" || activeStudentTab !== "profile-edits") return;
    void loadProfileEditRequests();
  }, [activeMenu, activeStudentTab]);

  useEffect(() => {
    if (activeMenu !== "students") return;
    if (activeStudentTab !== "all" && activeStudentTab !== "batch") return;
    setStudentPage(1);
    void loadStudentDirectory(1, {
      batch: activeStudentTab === "batch" ? batchFilter.trim() : "",
    });
  }, [activeMenu, activeStudentTab]);

  useEffect(() => {
    if (activeMenu !== "students" || activeStudentTab !== "batch") return;
    const timer = window.setTimeout(() => {
      setStudentPage(1);
      void loadStudentDirectory(1, { batch: batchFilter.trim() });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [batchFilter]);

  async function loadCompanyPostings() {
    try {
      const rows = await listTpoPostings("company");
      setPostings(rows);
      if (!selectedPostingId && rows[0]) {
        setSelectedPostingId(rows[0].id);
      }
    } catch (postingsErr) {
      setPostings([]);
      const msg = postingsErr instanceof Error ? postingsErr.message : "Unable to load postings.";
      showToast(msg, "error");
    }
  }

  async function loadStudentInvitesList() {
    try {
      const invites = await listTpoStudentInvites();
      setStudentInvites(invites);
    } catch {
      setStudentInvites([]);
    }
  }

  useEffect(() => {
    if (activeMenu !== "home" && activeMenu !== "placements" && activeMenu !== "applicants") return;
    void loadCompanyPostings();
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu !== "applicants" || !selectedPostingId) return;
    void fetchApplicantsForPosting(selectedPostingId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when menu/posting changes
  }, [activeMenu, selectedPostingId]);

  useEffect(() => {
    if (activeMenu !== "home" && activeMenu !== "students") return;
    void loadStudentInvitesList();
  }, [activeMenu]);

  async function loadInternalPostings() {
    try {
      const rows = await listTpoPostings("internal");
      setInternalPostings(rows);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load internal postings.";
      showToast(message, "error");
    }
  }

  useEffect(() => {
    if (activeMenu !== "internal-jobs") return;
    void loadInternalPostings();
  }, [activeMenu]);

  function handleDownloadFilteredStudents() {
    const url = downloadStudentsByParametersUrl(downloadFilters);
    window.open(url, "_blank");
  }

  async function handleSaveTpoProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    try {
      const message = await upsertTpoProfile(tpoProfile);
      showToast(message, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save TPO profile.";
      showToast(message, "error");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleBulkStudentUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bulkUploadFile) {
      showToast("Please select a CSV or XLSX file.", "error");
      return;
    }
    setBulkUploadAlert(null);
    setIsBulkUploading(true);
    try {
      const fileUrl = await uploadTpoStudentSheet(bulkUploadFile);
      const summary = await bulkUploadTpoStudentsAndWait({
        fileUrl,
        defaultBatch: bulkUploadForm.defaultBatch,
        defaultDepartment: bulkUploadForm.defaultDepartment,
        defaultYear: bulkUploadForm.defaultYear,
        createInviteForMissing: bulkUploadForm.createInviteForMissing,
      });
      const summaryMessage = `Processed ${summary.processed}. Updated ${summary.profilesUpdated}, created ${summary.profilesCreated}, invites ${summary.invitesCreated}, skipped ${summary.skipped}.`;
      const errorMessage = summary.errors.length > 0 ? ` First error: ${summary.errors[0]}` : "";
      const inviteOnly =
        summary.invitesCreated > 0 && summary.profilesCreated === 0 && summary.profilesUpdated === 0;
      showToast(
        inviteOnly
          ? `${summaryMessage} Listed under Students → All Students as Pending (not registered yet).`
          : summaryMessage + errorMessage,
        summary.errors.length > 0 ? "warning" : "success",
      );
      setBulkUploadFile(null);
      const invites = await listTpoStudentInvites();
      setStudentInvites(invites);
      const listed = await listTpoStudentsByParameters({ page: 1 });
      setStudentRows(listed.students);
      setStudentPagination(listed.pagination);
      setStudentPage(1);
      setStudentDirectoryCount(listed.pagination.total);
      setStudentCountCapped(listed.pagination.total >= 2000);
      setActiveMenu("students");
      setActiveStudentTab("all");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to upload student sheet.";
      setBulkUploadAlert(message);
    } finally {
      setIsBulkUploading(false);
    }
  }

  async function handleCollegeSearch(query: string) {
    setTpoProfile((prev) => ({ ...prev, collegeName: query }));
    setCollegeError("");

    if (query.trim().length < 2) {
      setCollegeResults([]);
      setIsCollegeDropdownOpen(false);
      return;
    }

    setIsCollegeDropdownOpen(true);
    setIsCollegeLoading(true);
    try {
      const results = await searchIndianColleges(query);
      setCollegeResults(results);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to fetch colleges.";
      setCollegeError(message);
      setCollegeResults([]);
    } finally {
      setIsCollegeLoading(false);
    }
  }

  return {
    toast,
    showToast,
    dismissToast,
    theme,
    isLoading,
    activeMenu,
    setActiveMenu,
    institutionTitle,
    tpoProfile,
    displayName,
    userEmail,
    showNotifications,
    setShowNotifications,
    toggleTheme,
    handleLogout,
    studentDirectoryCount,
    studentCountCapped,
    dashboardRollup: rollupQuery.data ?? null,
    isRollupLoading: rollupQuery.isLoading,
    activePostingsCount,
    pendingInvitesCount,
    postings,
    handleLoadApplicants,
    handleSendMagicLink,
    sendingPostingId,
    internalJobForm,
    setInternalJobForm,
    handleCreateInternalPosting,
    isCreatingInternal,
    internalPostings,
    selectedPostingId,
    applicants,
    isApplicantsLoading,
    activeStudentTab,
    setActiveStudentTab,
    studentRows,
    studentPagination,
    studentPage,
    goToStudentPage,
    isStudentsLoading,
    batchFilter,
    setBatchFilter,
    addStudentForm,
    setAddStudentForm,
    handleAddStudent,
    isAddingStudent,
    studentInvites,
    downloadFilters,
    setDownloadFilters,
    handleDownloadFilteredStudents,
    profileEditRequests,
    isProfileEditsLoading,
    loadProfileEditRequests,
    handleApproveProfileEdit,
    approvingStudentId,
    setTpoProfile,
    isSavingProfile,
    handleSaveTpoProfile,
    collegeResults,
    isCollegeLoading,
    isCollegeDropdownOpen,
    setIsCollegeDropdownOpen,
    collegeError,
    showCollegeDropdown,
    handleCollegeSearch,
    bulkUploadForm,
    setBulkUploadForm,
    bulkUploadFile,
    setBulkUploadFile,
    isBulkUploading,
    handleBulkStudentUpload,
    bulkUploadAlert,
    setBulkUploadAlert,
    tpoAccountStatus,
    reloadAfterCollegeSetup,
  };
}

export type TpoDashboardState = ReturnType<typeof useTpoDashboard>;
