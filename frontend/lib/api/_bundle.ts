declare const process: {
  env: Record<string, string | undefined>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/frappe";

export type CompanyLoginPayload = {
  email: string;
  password: string;
};

export type StudentApplicationStatus = {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  status: "Submitted" | "In Review" | "Shortlisted" | "Rejected" | "Selected";
  appliedOn: string;
};

export type CompanyApplicantItem = {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: "Submitted" | "In Review" | "Shortlisted" | "Rejected" | "Selected";
  appliedOn: string;
  resumeFile?: string;
};

export type CompanyCollegeInviteItem = {
  id: string;
  jobId: string;
  jobTitle: string;
  collegeEmail: string;
  status: "Sent" | "Failed";
  sentAt: string;
  note: string;
  errorMessage: string;
};

export type ApplicationStatus = "Submitted" | "In Review" | "Shortlisted" | "Rejected" | "Selected";
export type ShortlistSchedulePayload = {
  gmeetLink: string;
  scheduleAt: string;
};

export type StudentPublicJobApplyInfo = {
  publicApplicationsUsed: number;
  withoutPriCap: number;
  hasPriScore: boolean;
  canApplyToPublicJobboard: boolean;
  remainingWithoutPri: number | null;
};

export type StudentDashboardData = {
  student: {
    id: string;
    full_name: string;
    email: string;
  };
  listJobs: JobItem[];
  suggestedJobs: JobItem[];
  applicationStatus: StudentApplicationStatus[];
  jobsUsePagination?: boolean;
  internalPostings?: TpoPosting[];
  publicJobApply?: StudentPublicJobApplyInfo;
};

export type StudentLmsCourse = {
  id: number;
  shortname: string;
  fullname: string;
  categoryid?: number;
};

export type TpoPosting = {
  id: string;
  title: string;
  description: string;
  branch: string;
  batch: string;
  eligibilityCriteria: string;
  posterFile: string;
  applicationLink: string;
  companyEmail: string;
  status: "Draft" | "Active" | "Closed";
  createdByTpo: string;
  validTill: string;
  isInternalJob?: boolean;
  batchAudience?: "All Students" | "Specific Batches";
  targetBatches?: string;
};

export type TpoPostingPayload = {
  title: string;
  description: string;
  branch: string;
  batch: string;
  eligibilityCriteria: string;
  posterFile: string;
  applicationLink: string;
  companyEmail: string;
  status: "Draft" | "Active" | "Closed";
  validTill: string;
  isInternalJob?: boolean;
  batchAudience?: "All Students" | "Specific Batches";
  targetBatches?: string;
  notifyStudents?: boolean;
};

export type TpoApplicant = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  branch: string;
  batch: string;
  courseClassGrade: string;
  resumeFile: string;
};

export type TpoStudentInvite = {
  id: string;
  email: string;
  branch: string;
  batch: string;
  year: string;
  status: "Pending" | "Accepted" | "Expired";
  expiresAt: string;
  acceptedAt: string;
};

export type TpoProfile = {
  tpoName: string;
  collegeName: string;
  country: string;
  state: string;
  collegeLocation: string;
};

export type TpoAddStudentPayload = {
  email: string;
  batch: string;
  branch: string;
  year: string;
};

export type TpoListedStudent = {
  studentId: string;
  fullName: string;
  email: string;
  phone: string;
  college: string;
  areaOfStudy: string;
  batch: string;
  branch: string;
  state: string;
  country: string;
  courseClassGrade: string;
  resumeFile: string;
};

export type TpoBulkUploadSummary = {
  processed: number;
  profilesUpdated: number;
  profilesCreated: number;
  invitesCreated: number;
  skipped: number;
  errors: string[];
};

export type StudentLmsContext = {
  enabled: boolean;
  provider: string;
  launchUrl: string;
  moodleUserId?: number;
  message?: string;
  courses: StudentLmsCourse[];
};

export type StudentCollegiateInvite = {
  inviteId: string;
  tpoName: string;
  collegeName: string;
  suggestedBranch: string;
  suggestedBatch: string;
  suggestedYear: string;
};

export type StudentProfileData = {
  fullName: string;
  email: string;
  phone: string;
  profilePhoto: string;
  college: string;
  school: string;
  areaOfStudy: string;
  academicYear: string;
  state: string;
  country: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  city: string;
  pinCode: string;
  courseClassGrade: string;
  departmentStream: string;
  resumeFile: string;
  candidateType?: string;
  linkedTpoUser?: string;
  collegiateInvite?: StudentCollegiateInvite | null;
  profileSubmitted?: boolean;
  profileEditRequested?: boolean;
  profileEditApproved?: boolean;
  profileComplete?: boolean;
  canApplyToJobs?: boolean;
  canApplyToGeneralJobboard?: boolean;
  publicJobApply?: StudentPublicJobApplyInfo;
  priScore?: number;
};

export type StudentProfileUpdatePayload = StudentProfileData & {
  finalizeProfile?: boolean;
};

export type StudentProfileEditRequestItem = {
  studentId: string;
  fullName: string;
  email: string;
  college: string;
  batch: string;
  branch: string;
  profileComplete: boolean;
};

export type RegisterPayload = {
  email: string;
  password: string;
  role: "Company" | "Student" | "Job Seeker" | "Training & Placement Officer" | "Internal Team" | "Freelancer" | "Admin";
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyName?: string;
  collegeName?: string;
};

export type CompanyMagicDashboard = {
  companyEmail: string;
  posting: {
    id: string;
    title: string;
    description: string;
    branch: string;
    batch: string;
    eligibilityCriteria: string;
    posterFile: string;
    applicationLink: string;
    status: string;
    validTill: string;
  };
  applicants: TpoApplicant[];
};

export type CollegeOption = {
  name: string;
  stateProvince?: string;
  website?: string;
};

export type JobItem = {
  id: string;
  title: string;
  opportunityType: "Job" | "Internship";
  locationType: "In office" | "Hybrid" | "Remote";
  openings: number;
  skills: string;
  minExperience: string;
  status: "Draft" | "Active" | "Closed";
  totalViews: number;
  applications: number;
  createdAt: string;
  description: string;
  companyName: string;
  companyAbout: string;
  isApplied?: boolean;
  applicationStatus?: "Not Applied" | "Submitted" | "In Review" | "Shortlisted" | "Rejected" | "Selected";
};

export type AssessmentItem = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  passingScore: number;
  status: "Draft" | "Published" | "Closed";
};

export type AssessmentFormPayload = {
  title: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  passingScore: number;
};

export type JobFormPayload = {
  title: string;
  opportunityType: "Job" | "Internship";
  minExperience: string;
  skills: string;
  locationType: "In office" | "Hybrid" | "Remote";
  workType: "Part-time" | "Full-time";
  openings: number;
  description: string;
  preferences: string;
  minSalary: string;
  maxSalary: string;
  screeningQuestion: string;
};

export type CompanyLoginResponse = {
  ok: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      full_name: string;
      email: string;
    };
    roles: string[];
  };
};

type FrappeEnvelope = {
  message?: CompanyLoginResponse;
  ok?: boolean;
  data?: CompanyLoginResponse["data"];
};

function parseFrappeResponse(body: FrappeEnvelope): CompanyLoginResponse {
  if (body?.message && typeof body.message === "object") {
    return body.message;
  }

  if (typeof body.ok === "boolean") {
    return {
      ok: body.ok,
      message: body.ok ? "Success" : "Request failed",
      data: body.data,
    };
  }

  return {
    ok: false,
    message: "Invalid API response.",
  };
}

/** Frappe sometimes returns errors as top-level `exception` / `_server_messages` instead of `message`. */
function messageFromFrappeBody(raw: Record<string, unknown>): string | undefined {
  const msg = raw.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (typeof msg === "object" && msg !== null && "message" in msg && typeof (msg as { message?: string }).message === "string") {
    return (msg as { message: string }).message;
  }
  const exc = raw.exception;
  if (typeof exc === "string" && exc.trim()) {
    const line = exc.split("\n").find((l) => l.trim());
    return line || exc;
  }
  try {
    const sm = raw._server_messages;
    if (typeof sm === "string") {
      const parsed = JSON.parse(sm) as unknown;
      if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === "object" && parsed[0] !== null && "message" in parsed[0]) {
        const m = (parsed[0] as { message?: string }).message;
        if (typeof m === "string") return m.replace(/<[^>]+>/g, "").trim();
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  const parts = document.cookie.split("; ");
  for (const p of parts) {
    if (p.startsWith(prefix)) return decodeURIComponent(p.slice(prefix.length));
  }
  return undefined;
}

function frappeCsrfHeaders(): Record<string, string> {
  const t = readCookie("csrf_token");
  return t ? { "X-Frappe-CSRF-Token": t } : {};
}

function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const text = error.message.toLowerCase();
  return (
    text.includes("failed to fetch") ||
    text.includes("networkerror") ||
    text.includes("load failed") ||
    text.includes("timeout")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Guest GET so Frappe sets `sid` / `csrf_token` cookies before JSON POST (reduces CSRF and session-related 500s). */
async function frappeGuestPreflight(): Promise<void> {
  try {
    let r = await fetch(`${API_URL}/api/method/frappe.ping`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (r.status === 404) {
      r = await fetch(`${API_URL}/api/method/ping`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
    }
    void r;
  } catch {
    /* login POST may still succeed */
  }
}

export async function companyLogin(payload: CompanyLoginPayload) {
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await frappeGuestPreflight();
      const response = await fetch(`${API_URL}/api/method/scout.api.auth.login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...frappeCsrfHeaders() },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const text = await response.text();
      let rawBody: FrappeEnvelope & Record<string, unknown>;
      try {
        rawBody = JSON.parse(text) as FrappeEnvelope & Record<string, unknown>;
      } catch {
        if (response.status >= 500 && attempt < maxAttempts) {
          await sleep(700 * attempt);
          continue;
        }
        const trimmed = text.trim().slice(0, 80).toLowerCase();
        const looksLikeHtml = trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
        if (!response.ok && (looksLikeHtml || response.status === 0)) {
          throw new Error(
            `Cannot reach login API (${response.status}). Start Frappe on port 8000 (WSL: cd ~/frappe-bench && bench start), then retry.`,
          );
        }
        throw new Error(
          !response.ok
            ? `Cannot reach login API (${response.status}). Backend may be restarting; please retry in a moment.`
            : "Invalid response from server.",
        );
      }

      const body = parseFrappeResponse(rawBody);
      if (!response.ok || !body.ok) {
        const fallback = messageFromFrappeBody(rawBody);
        const message = body.message || fallback || "Unable to login.";
        if (response.status >= 500 && attempt < maxAttempts) {
          await sleep(700 * attempt);
          continue;
        }
        throw new Error(message);
      }

      return body.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unable to login.");
      if (attempt < maxAttempts && isTransientNetworkError(error)) {
        await sleep(700 * attempt);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error("Unable to login.");
}

export async function getStudentDashboardData() {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.student_dashboard`, {
    method: "GET",
    credentials: "include",
  });
  const rawBody = (await response.json()) as {
    message?: {
      ok: boolean;
      message?: string;
      data?: StudentDashboardData;
    };
  };
  const body = rawBody?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok || !body.data) {
    throw new Error(body.message || "Unable to load student dashboard.");
  }
  return body.data;
}

export async function getStudentLmsContext() {
  const response = await fetch(`${API_URL}/api/method/scout.api.lms.student_lms_context`, {
    method: "GET",
    credentials: "include",
  });
  const rawBody = (await response.json()) as {
    message?: {
      ok: boolean;
      message?: string;
      data?: StudentLmsContext;
    };
  };
  const body = rawBody?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok || !body.data) {
    throw new Error(body.message || "Unable to load LMS details.");
  }
  return body.data;
}

export async function getStudentProfile() {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.get_student_profile`, {
    method: "GET",
    credentials: "include",
  });
  const rawBody = (await response.json()) as { message?: { ok: boolean; message?: string; data?: { profile: StudentProfileData } } };
  const body = rawBody?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok || !body.data?.profile) {
    throw new Error(body.message || "Unable to load profile.");
  }
  return body.data.profile;
}

export async function updateStudentProfile(payload: StudentProfileUpdatePayload) {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.update_student_profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to update profile.");
  }
  return body.message || "Profile updated successfully.";
}

export async function requestStudentProfileEdit() {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.request_student_profile_edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to request profile edit.");
  }
  return body.message || "Request sent.";
}

export type AcceptCollegiateEnrollmentPayload = {
  inviteId: string;
  departmentStream: string;
  courseClassGrade: string;
  academicYear: string;
  areaOfStudy?: string;
};

export async function acceptCollegiateEnrollment(payload: AcceptCollegiateEnrollmentPayload) {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.accept_collegiate_enrollment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to confirm placement.");
  }
  return body.message || "Placement confirmed.";
}

export async function declineCollegiateEnrollment(inviteId?: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.decline_collegiate_enrollment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inviteId ? { inviteId } : {}),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to update placement.");
  }
  return body.message || "Updated.";
}

export async function listStudentProfileEditRequests() {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.list_student_profile_edit_requests`, {
    method: "GET",
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string; data?: { requests?: StudentProfileEditRequestItem[] } } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to load edit requests.");
  }
  return body.data?.requests || [];
}

export async function approveStudentProfileEdit(studentUser: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.approve_student_profile_edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentUser }),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to approve edit.");
  }
  return body.message || "Approved.";
}

export async function uploadStudentResume(file: File) {
  const allowedExtensions = [".pdf", ".doc", ".docx"];
  const lowerName = file.name.toLowerCase();
  const isAllowed = allowedExtensions.some((ext) => lowerName.endsWith(ext));
  if (!isAllowed) {
    throw new Error("Only PDF, DOC, and DOCX resumes are allowed.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("is_private", "0");
  const response = await fetch(`${API_URL}/api/method/upload_file`, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { file_url?: string } };
  const fileUrl = raw?.message?.file_url;
  if (!response.ok || !fileUrl) {
    throw new Error("Unable to upload resume.");
  }
  return fileUrl;
}

export async function uploadStudentPhoto(file: File) {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG, and WEBP images are allowed.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("is_private", "0");
  const response = await fetch(`${API_URL}/api/method/upload_file`, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { file_url?: string } };
  const fileUrl = raw?.message?.file_url;
  if (!response.ok || !fileUrl) {
    throw new Error("Unable to upload profile photo.");
  }
  return fileUrl;
}

export async function uploadTpoStudentSheet(file: File) {
  const lowerName = file.name.toLowerCase();
  if (!(lowerName.endsWith(".csv") || lowerName.endsWith(".xlsx"))) {
    throw new Error("Only CSV and XLSX files are allowed.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("is_private", "0");
  const response = await fetch(`${API_URL}/api/method/upload_file`, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { file_url?: string } };
  const fileUrl = raw?.message?.file_url;
  if (!response.ok || !fileUrl) {
    throw new Error("Unable to upload student sheet.");
  }
  return fileUrl;
}

export async function applyToJob(jobId: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.apply_to_job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId }),
    credentials: "include",
  });
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to apply for job.");
  }
  return body.message;
}

export async function registerUser(payload: RegisterPayload) {
  await frappeGuestPreflight();
  const response = await fetch(`${API_URL}/api/method/scout.api.auth.register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...frappeCsrfHeaders() },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to register.");
  }
  return body.message;
}

export async function searchIndianColleges(query: string) {
  const response = await fetch(`/api/colleges?q=${encodeURIComponent(query)}`, {
    method: "GET",
    cache: "no-store",
  });

  const rawBody = (await response.json()) as {
    ok?: boolean;
    message?: string;
    data?: CollegeOption[];
  };

  if (!response.ok || !rawBody.ok) {
    throw new Error(rawBody.message || "Unable to search colleges.");
  }

  return rawBody.data || [];
}

export async function getCompanyMe() {
  const response = await fetch(`${API_URL}/api/method/scout.api.auth.me`, {
    method: "GET",
    credentials: "include",
  });

  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unauthorized.");
  }

  return body.data;
}

export async function companyLogout() {
  await fetch(`${API_URL}/api/method/scout.api.auth.logout`, {
    method: "POST",
    credentials: "include",
  });
}

type CompanyJobsResponse = {
  ok: boolean;
  message?: string;
  data?: {
    jobs: JobItem[];
    job?: JobItem;
  };
};

type CompanyAssessmentsResponse = {
  ok: boolean;
  message?: string;
  data?: {
    assessments: AssessmentItem[];
    assessment?: AssessmentItem;
  };
};

type CompanyApplicantsResponse = {
  ok: boolean;
  message?: string;
  data?: {
    applicants: CompanyApplicantItem[];
    pagination?: { page: number; pageSize: number; total: number; totalPages: number };
  };
};

function parseJobsResponse(body: { message?: CompanyJobsResponse }): CompanyJobsResponse {
  return body?.message || { ok: false, message: "Invalid API response." };
}

export async function listCompanyJobs() {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.list_jobs`, {
    method: "GET",
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: CompanyJobsResponse };
  const body = parseJobsResponse(raw);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Failed to load jobs.");
  }
  return body.data?.jobs || [];
}

export async function createCompanyJob(payload: JobFormPayload) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.create_job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: CompanyJobsResponse };
  const body = parseJobsResponse(raw);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Failed to create job.");
  }
  return body.data?.jobs || [];
}

function parseAssessmentsResponse(body: { message?: CompanyAssessmentsResponse }): CompanyAssessmentsResponse {
  return body?.message || { ok: false, message: "Invalid API response." };
}

export async function listCompanyAssessments() {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.list_assessments`, {
    method: "GET",
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: CompanyAssessmentsResponse };
  const body = parseAssessmentsResponse(raw);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Failed to load assessments.");
  }
  return body.data?.assessments || [];
}

export async function createCompanyAssessment(payload: AssessmentFormPayload) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.create_assessment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: CompanyAssessmentsResponse };
  const body = parseAssessmentsResponse(raw);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Failed to create assessment.");
  }
  return body.data?.assessments || [];
}

export async function listCompanyApplicants(params: { jobId?: string; page?: number; pageSize?: number; sort?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.jobId) qs.set("jobId", params.jobId);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params.sort) qs.set("sort", params.sort);
  const query = qs.toString();
  const endpoint = `${API_URL}/api/method/scout.api.company_api.list_applicants${query ? `?${query}` : ""}`;
  const response = await fetch(endpoint, {
    method: "GET",
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: CompanyApplicantsResponse };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Failed to load applicants.");
  }
  return {
    applicants: body.data?.applicants || [],
    pagination: body.data?.pagination,
  };
}

type UpdateApplicationStatusResponse = {
  ok: boolean;
  message?: string;
};

export async function updateCompanyApplicantStatus(
  applicationId: string,
  status: ApplicationStatus,
  schedule?: ShortlistSchedulePayload,
) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.update_application_status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicationId, status, schedule }),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: UpdateApplicationStatusResponse };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Failed to update application status.");
  }
  return body.message || "Application status updated successfully.";
}

type UpdateStatusResponse = {
  ok: boolean;
  message?: string;
  data?: {
    job: JobItem;
  };
};

export async function updateCompanyJobStatus(jobId: string, status: JobItem["status"]) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.update_job_status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, status }),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: UpdateStatusResponse };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Failed to update job status.");
  }
  return body.data?.job;
}

export async function inviteCollegeForCompanyJob(payload: { jobId: string; collegeEmails: string[]; note?: string }) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.invite_college_for_job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Failed to send college invitation.");
  }
  return body.message || "Invitation sent successfully.";
}

export async function listCompanyCollegeInvites(jobId?: string) {
  const endpoint = jobId
    ? `${API_URL}/api/method/scout.api.company_api.list_college_invites?jobId=${encodeURIComponent(jobId)}`
    : `${API_URL}/api/method/scout.api.company_api.list_college_invites`;
  const response = await fetch(endpoint, {
    method: "GET",
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string; data?: { invites?: CompanyCollegeInviteItem[] } } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Failed to load college invite history.");
  }
  return body.data?.invites || [];
}

export async function createTpoPosting(payload: TpoPostingPayload): Promise<{ posting?: TpoPosting; message: string }> {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.create_tpo_posting`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string; data?: { posting?: TpoPosting } } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to create posting.");
  }
  return {
    posting: body.data?.posting,
    message: typeof body.message === "string" ? body.message : "TPO posting created successfully.",
  };
}

export async function listTpoPostings(postingKind?: "company" | "internal" | "all") {
  let url = `${API_URL}/api/method/scout.api.tpo.list_tpo_postings`;
  if (postingKind && postingKind !== "all") {
    url += `?postingKind=${encodeURIComponent(postingKind)}`;
  }
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string; data?: { postings?: TpoPosting[] } } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to load TPO postings.");
  }
  return body.data?.postings || [];
}

export async function getTpoPostingApplicants(postingId: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.get_tpo_posting_applicants?postingId=${encodeURIComponent(postingId)}`, {
    method: "GET",
    credentials: "include",
  });
  const raw = (await response.json()) as {
    message?: { ok: boolean; message?: string; data?: { applicants?: TpoApplicant[] } };
  };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to load applicants.");
  }
  return body.data?.applicants || [];
}

export async function sendCompanySpecialDashboardLink(postingId: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.send_company_dashboard_link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postingId }),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to send company dashboard link.");
  }
  return body.message || "Link sent.";
}

export function downloadTpoApplicantsUrl(postingId: string) {
  return `${API_URL}/api/method/scout.api.tpo.download_tpo_applicants?postingId=${encodeURIComponent(postingId)}`;
}

export async function addTpoStudent(payload: TpoAddStudentPayload) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.invite_student_minimal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to invite student.");
  }
  return body.message || "Student invite sent successfully.";
}

export async function acceptStudentInvite(payload: { token: string; fullName: string; password: string }) {
  const response = await fetch(`${API_URL}/api/method/scout.api.auth.accept_student_invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to accept invite.");
  }
  return body.message || "Invite accepted successfully.";
}

export async function listTpoStudentInvites() {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.list_student_invites`, {
    method: "GET",
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string; data?: { invites?: TpoStudentInvite[] } } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to load invite status.");
  }
  return body.data?.invites || [];
}

export async function getTpoProfile() {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.get_tpo_profile`, {
    method: "GET",
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string; data?: { profile?: TpoProfile } } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok || !body.data?.profile) {
    throw new Error(body.message || "Unable to load TPO profile.");
  }
  return body.data.profile;
}

export async function upsertTpoProfile(payload: TpoProfile) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.upsert_tpo_profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to save TPO profile.");
  }
  return body.message || "TPO profile saved successfully.";
}

export function downloadStudentsByParametersUrl(filters: {
  branch?: string;
  batch?: string;
  state?: string;
  country?: string;
  areaOfStudy?: string;
}) {
  const params = new URLSearchParams();
  if (filters.branch) params.set("branch", filters.branch);
  if (filters.batch) params.set("batch", filters.batch);
  if (filters.state) params.set("state", filters.state);
  if (filters.country) params.set("country", filters.country);
  if (filters.areaOfStudy) params.set("areaOfStudy", filters.areaOfStudy);
  return `${API_URL}/api/method/scout.api.tpo.download_students_by_parameters?${params.toString()}`;
}

export async function listTpoStudentsByParameters(filters: {
  branch?: string;
  batch?: string;
  state?: string;
  country?: string;
  areaOfStudy?: string;
} = {}) {
  const params = new URLSearchParams();
  if (filters.branch) params.set("branch", filters.branch);
  if (filters.batch) params.set("batch", filters.batch);
  if (filters.state) params.set("state", filters.state);
  if (filters.country) params.set("country", filters.country);
  if (filters.areaOfStudy) params.set("areaOfStudy", filters.areaOfStudy);
  const qs = params.toString();
  const response = await fetch(
    `${API_URL}/api/method/scout.api.tpo.list_students_by_parameters${qs ? `?${qs}` : ""}`,
    { method: "GET", credentials: "include" },
  );
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string; data?: { students?: TpoListedStudent[] } } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to load students.");
  }
  return body.data?.students ?? [];
}

export async function bulkUploadTpoStudents(payload: {
  fileUrl: string;
  defaultBatch?: string;
  defaultDepartment?: string;
  defaultYear?: string;
  createInviteForMissing?: boolean;
}) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.bulk_upsert_students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string; data?: TpoBulkUploadSummary } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to process student sheet.");
  }
  return body.data || { processed: 0, profilesUpdated: 0, profilesCreated: 0, invitesCreated: 0, skipped: 0, errors: [] };
}

export async function getCompanyMagicDashboard(token: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_magic.dashboard_by_token?token=${encodeURIComponent(token)}`, {
    method: "GET",
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string; data?: CompanyMagicDashboard } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok || !body.data) {
    throw new Error(body.message || "Unable to load special dashboard.");
  }
  return body.data;
}
