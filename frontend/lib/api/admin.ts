import {
  API_URL,
  frappeCsrfHeaders,
  frappeGuestHeaders,
  frappeGuestPreflight,
  isTransientNetworkError,
  messageFromFrappeBody,
  parseFrappeResponse,
  sleep,
  type FrappeEnvelope,
} from "./client";
import type {
  AdminFreelancerProfileDetail,
  AdminPendingFreelancer,
  AdminPendingTpo,
  CompanyLoginPayload,
  PaginationMeta,
} from "./types";

export type AdminUser = {
  id: string;
  full_name: string;
  email: string;
};

export type AdminCollegeTpo = {
  profileId: string;
  tpoUser: string;
  tpoName: string;
  email: string;
  approvalStatus: string;
  collegeSetupComplete: boolean;
  registeredAt: string;
};

export type AdminStudentStatusCounts = Record<string, number>;

export type AdminCollegeStudent = {
  studentId: string;
  fullName: string;
  email: string;
  phone: string;
  college: string;
  branch: string;
  batch: string;
  courseClassGrade: string;
  state: string;
  country: string;
  candidateType: string;
  profileStatus: string;
  profileSubmitted: boolean;
  linkedTpoUser: string;
  registeredAt: string;
};

export type AdminCollegeRow = {
  collegeId: string;
  collegeName: string;
  country: string;
  state: string;
  district: string;
  primaryTpoUser: string;
  primaryTpoName: string;
  primaryTpoEmail: string;
  tpoCount: number;
  studentCount: number;
  studentStatusCounts: AdminStudentStatusCounts;
  tpos: AdminCollegeTpo[];
};

export type AdminCollegesDirectory = {
  totalColleges: number;
  totalTpos: number;
  totalStudents?: number;
  colleges: AdminCollegeRow[];
  pagination?: PaginationMeta;
};

export type AdminCollegeStudentsPayload = {
  collegeId: string;
  collegeName: string;
  totalStudents: number;
  studentStatusCounts: AdminStudentStatusCounts;
  students: AdminCollegeStudent[];
  pagination?: PaginationMeta;
};

export type AdminStudentDetail = Record<string, unknown> & {
  studentId?: string;
  fullName?: string;
  email?: string;
  profileStatus?: string;
  profileComplete?: boolean;
  applicationCount?: number;
};

export type AdminCompanyRow = {
  userId: string;
  companyName: string;
  email: string;
  phone: string;
  bio: string;
  enabled: boolean;
  registeredAt: string;
  jobCount: number;
  assessmentCount: number;
  applicationCount: number;
};

export type AdminCompaniesDirectory = {
  totalCompanies: number;
  companies: AdminCompanyRow[];
  pagination?: PaginationMeta;
};

export type AdminOverviewStats = {
  students: number;
  companies: number;
  colleges?: number;
  tpos: number;
  jobs: number;
  applications: number;
  tpoPostings: number;
  studentInvites: number;
  assessments: number;
  psychometricAssessments?: number;
  aptitudeAssessments?: number;
  aptitudeAssignments?: number;
  aptitudeCompleted?: number;
  psychometricAssignments?: number;
  psychometricCompleted?: number;
};

export type AdminOverview = {
  admin: AdminUser & { primaryRole: string };
  stats: AdminOverviewStats;
};

async function frappeAdminPost(path: string, payload?: Record<string, unknown>) {
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await frappeGuestPreflight();
      const response = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...frappeCsrfHeaders() },
        body: JSON.stringify(payload ?? {}),
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
            `Cannot reach admin API (${response.status}). Start Frappe on port 8000 (WSL: cd ~/frappe-bench && bench start), then retry.`,
          );
        }
        throw new Error(
          !response.ok
            ? `Cannot reach admin API (${response.status}). Backend may be restarting; please retry in a moment.`
            : "Invalid response from server.",
        );
      }

      const body = parseFrappeResponse(rawBody);
      if (!response.ok || !body.ok) {
        const fallback = messageFromFrappeBody(rawBody);
        const message = body.message || fallback || "Request failed.";
        if (response.status >= 500 && attempt < maxAttempts) {
          await sleep(700 * attempt);
          continue;
        }
        throw new Error(message);
      }

      return body;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Request failed.");
      if (attempt < maxAttempts && isTransientNetworkError(error)) {
        await sleep(700 * attempt);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error("Request failed.");
}

export async function adminLogin(payload: CompanyLoginPayload) {
  // Clear any active portal session cookies before starting an admin session.
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch { /* ignore */ }
  const body = await frappeAdminPostGuest("/api/method/scout.api.admin_api.login", payload);
  return body.data as { user: AdminUser; roles: string[] };
}

async function frappeAdminPostGuest(path: string, payload?: Record<string, unknown>) {
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await frappeGuestPreflight();
      const response = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...frappeGuestHeaders() },
        body: JSON.stringify(payload ?? {}),
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
            "Cannot reach the API. Start Frappe in WSL: cd ~/frappe-bench && bench start — then retry login.",
          );
        }
        throw new Error(
          !response.ok
            ? `Cannot reach admin API (HTTP ${response.status}). If the backend just started, wait a few seconds and retry.`
            : "Invalid response from server.",
        );
      }

      const body = parseFrappeResponse(rawBody);
      if (!response.ok || !body.ok) {
        const fallback = messageFromFrappeBody(rawBody);
        throw new Error(body.message || fallback || "Request failed.");
      }
      return body;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Request failed.");
      if (attempt < maxAttempts && isTransientNetworkError(error)) {
        await sleep(700 * attempt);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error("Request failed.");
}

export async function getAdminMe() {
  const response = await fetch(`${API_URL}/api/method/scout.api.admin_api.me`, {
    method: "GET",
    credentials: "include",
  });

  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unauthorized.");
  }
  return body.data as { user: AdminUser; roles: string[] };
}

export async function adminLogout() {
  await fetch(`${API_URL}/api/method/scout.api.admin_api.logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function getAdminOverview() {
  const response = await fetch(`${API_URL}/api/method/scout.api.admin_api.overview`, {
    method: "GET",
    credentials: "include",
  });

  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Failed to load admin overview.");
  }
  return (body.data ?? {}) as unknown as AdminOverview;
}

async function frappeAdminGet<T>(path: string, errorMessage: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    credentials: "include",
  });
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || errorMessage);
  }
  return (body.data ?? {}) as T;
}

export async function getAdminCollegesDirectory(params?: { page?: number; pageSize?: number }) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  const qs = query.toString();
  return frappeAdminGet<AdminCollegesDirectory>(
    `/api/method/scout.api.admin_api.list_colleges_with_tpos${qs ? `?${qs}` : ""}`,
    "Failed to load colleges directory.",
  );
}

export async function getAdminCompaniesDirectory(params?: { page?: number; pageSize?: number }) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  const qs = query.toString();
  return frappeAdminGet<AdminCompaniesDirectory>(
    `/api/method/scout.api.admin_api.list_registered_companies${qs ? `?${qs}` : ""}`,
    "Failed to load companies directory.",
  );
}

export async function getAdminCollegeStudents(params: {
  collegeId?: string;
  collegeName: string;
  page?: number;
  pageSize?: number;
}) {
  const query = new URLSearchParams();
  if (params.collegeId) query.set("collegeId", params.collegeId);
  query.set("collegeName", params.collegeName);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  return frappeAdminGet<AdminCollegeStudentsPayload>(
    `/api/method/scout.api.admin_api.list_college_students?${query.toString()}`,
    "Failed to load college students.",
  );
}

export async function getAdminStudentDetail(studentId: string) {
  const query = new URLSearchParams({ studentId });
  return frappeAdminGet<{ student: AdminStudentDetail; applicationCount: number }>(
    `/api/method/scout.api.admin_api.get_admin_student_detail?${query.toString()}`,
    "Failed to load student details.",
  );
}

export async function listPendingTpos() {
  const response = await fetch(`${API_URL}/api/method/scout.api.admin_api.list_pending_tpos`, {
    method: "GET",
    credentials: "include",
  });
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Failed to load pending TPO registrations.");
  }
  return ((body.data as { pending?: AdminPendingTpo[] })?.pending ?? []) as AdminPendingTpo[];
}

export async function approveTpoRegistration(profileId: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.admin_api.approve_tpo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...frappeCsrfHeaders() },
    body: JSON.stringify({ profileId }),
    credentials: "include",
  });
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to approve TPO.");
  }
  return body.message || "TPO approved.";
}

export async function rejectTpoRegistration(profileId: string, reason?: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.admin_api.reject_tpo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...frappeCsrfHeaders() },
    body: JSON.stringify({ profileId, reason }),
    credentials: "include",
  });
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to reject TPO.");
  }
  return body.message || "TPO rejected.";
}

export async function listPendingFreelancers() {
  const response = await fetch(`${API_URL}/api/method/scout.api.admin_api.list_pending_freelancers`, {
    method: "GET",
    credentials: "include",
  });
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Failed to load pending freelancer interviewer registrations.");
  }
  return ((body.data as { pending?: AdminPendingFreelancer[] })?.pending ?? []) as AdminPendingFreelancer[];
}

export async function getAdminFreelancerDetail(profileId: string) {
  const query = new URLSearchParams({ profileId });
  const response = await fetch(
    `${API_URL}/api/method/scout.api.admin_api.get_freelancer_profile_for_admin?${query.toString()}`,
    { method: "GET", credentials: "include" },
  );
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Failed to load freelancer interviewer profile.");
  }
  return body.data as unknown as { profile: AdminFreelancerProfileDetail };
}

export async function approveFreelancerRegistration(profileId: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.admin_api.approve_freelancer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...frappeCsrfHeaders() },
    body: JSON.stringify({ profileId }),
    credentials: "include",
  });
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to approve freelancer interviewer.");
  }
  return body.message || "Freelancer interviewer approved.";
}

export async function rejectFreelancerRegistration(profileId: string, reason?: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.admin_api.reject_freelancer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...frappeCsrfHeaders() },
    body: JSON.stringify({ profileId, reason }),
    credentials: "include",
  });
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to reject freelancer interviewer.");
  }
  return body.message || "Freelancer interviewer rejected.";
}

export async function ensureDemoAdminUser() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch { /* ignore */ }
  const body = await frappeAdminPostGuest("/api/method/scout.api.admin_api.ensure_demo_admin_user");
  return body.data as unknown as { email: string; password: string; loginUrl: string };
}
