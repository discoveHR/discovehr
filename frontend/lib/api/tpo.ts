import { refreshScoutAccessToken } from "./auth";
import {
  API_URL,
  frappeGuestPreflight,
  messageFromFrappeBody,
  readScoutApiJson,
  scoutJsonHeaders,
  sleep,
  type ScoutApiEnvelope,
} from "./client";
import type {
  TpoAccountStatus,
  TpoAddStudentPayload,
  TpoApplicant,
  TpoBulkUploadSummary,
  TpoBulkUploadStatus,
  TpoCollegeSetupPayload,
  TpoListedStudent,
  TpoStudentsDirectoryCount,
  TpoStudentsListResult,
  TpoPosting,
  TpoPostingPayload,
  TpoProfile,
  TpoStudentInvite,
} from "./types";

async function requireTpo<T>(response: Response, fallback: string): Promise<ScoutApiEnvelope<T>> {
  const { body, raw } = await readScoutApiJson<T>(response);
  if (!response.ok || !body.ok) {
    const msg =
      body.message ||
      messageFromFrappeBody(raw) ||
      (response.status >= 500
        ? `${fallback} (HTTP ${response.status}). If the backend just restarted, wait a few seconds and retry.`
        : response.status === 401 || response.status === 403
          ? "Session expired. Please log out and sign in again."
          : fallback);
    throw new Error(msg);
  }
  return body;
}

export async function createTpoPosting(payload: TpoPostingPayload): Promise<{ posting?: TpoPosting; message: string }> {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.create_tpo_posting`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const body = await requireTpo<{ posting?: TpoPosting }>(response, "Unable to create posting.");
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
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const body = await requireTpo<{ postings?: TpoPosting[] }>(response, "Unable to load TPO postings.");
  return body.data?.postings || [];
}

export async function getTpoPostingApplicants(postingId: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.get_tpo_posting_applicants?postingId=${encodeURIComponent(postingId)}`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const body = await requireTpo<{ applicants?: TpoApplicant[] }>(response, "Unable to load applicants.");
  return body.data?.applicants || [];
}

export async function sendCompanySpecialDashboardLink(postingId: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.send_company_dashboard_link`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ postingId }),
    credentials: "include",
  });
  const body = await requireTpo(response, "Unable to send company dashboard link.");
  return body.message || "Link sent.";
}

export function downloadTpoApplicantsUrl(postingId: string) {
  return `${API_URL}/api/method/scout.api.tpo.download_tpo_applicants?postingId=${encodeURIComponent(postingId)}`;
}

export async function addTpoStudent(payload: TpoAddStudentPayload) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.invite_student_minimal`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const body = await requireTpo(response, "Unable to invite student.");
  return body.message || "Student invite sent successfully.";
}

export async function listTpoStudentInvites() {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.list_student_invites`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const body = await requireTpo<{ invites?: TpoStudentInvite[] }>(response, "Unable to load invite status.");
  return body.data?.invites || [];
}

export async function getTpoProfile() {
  const maxAttempts = 4;
  let lastError: Error | null = null;
  let triedRefresh = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (attempt > 1) {
      await sleep(250 * attempt);
    }

    const response = await fetch(`${API_URL}/api/method/scout.api.tpo.get_tpo_profile`, {
      method: "GET",
      headers: scoutJsonHeaders(),
      credentials: "include",
    });
    const { body, raw } = await readScoutApiJson<{ profile?: TpoProfile; status?: TpoAccountStatus }>(response);
    const msg = typeof body.message === "string" ? body.message.toLowerCase() : "";
    const excType = typeof raw.exc_type === "string" ? raw.exc_type : "";
    const sessionNotReady =
      response.status === 401 ||
      response.status === 403 ||
      excType === "PermissionError" ||
      msg.includes("not whitelisted") ||
      msg.includes("not logged in") ||
      msg.includes("login to access");

    if (sessionNotReady && !triedRefresh) {
      triedRefresh = true;
      if (await refreshScoutAccessToken()) {
        lastError = new Error(body.message || "Session not ready. Retrying…");
        continue;
      }
    }

    if (sessionNotReady && attempt < maxAttempts) {
      lastError = new Error(body.message || "Session not ready. Retrying…");
      continue;
    }

    if (!response.ok || !body.ok || !body.data?.profile) {
      throw new Error(body.message || messageFromFrappeBody(raw) || "Unable to load TPO profile.");
    }
    return { profile: body.data.profile, status: body.data.status };
  }

  throw lastError || new Error("Unable to load TPO profile.");
}

export async function getTpoAccountStatus() {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.get_tpo_account_status`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const body = await requireTpo<{ status?: TpoAccountStatus }>(response, "Unable to load TPO account status.");
  if (!body.data?.status) {
    throw new Error("Unable to load TPO account status.");
  }
  return body.data.status;
}

export async function getTpoCollegeSetup() {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.get_college_setup`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const body = await requireTpo<TpoCollegeSetupPayload & { status?: TpoAccountStatus }>(response, "Unable to load college setup.");
  if (!body.data) {
    throw new Error("Unable to load college setup.");
  }
  return body.data;
}

export async function saveTpoCollegeSetup(payload: TpoCollegeSetupPayload) {
  await frappeGuestPreflight();
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.save_college_setup`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const body = await requireTpo(response, "Unable to save college setup.");
  return typeof body.message === "string" ? body.message : "College structure saved.";
}

export async function completeTpoCollegeSetup() {
  await frappeGuestPreflight();
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.complete_college_setup`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({}),
    credentials: "include",
  });
  const body = await requireTpo(response, "Unable to complete college setup.");
  return typeof body.message === "string" ? body.message : "College setup completed.";
}

export async function upsertTpoProfile(payload: TpoProfile) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.upsert_tpo_profile`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const body = await requireTpo(response, "Unable to save TPO profile.");
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

export const TPO_STUDENTS_PAGE_SIZE = 10;

export async function countTpoStudentsDirectory(
  filters: {
    branch?: string;
    batch?: string;
    state?: string;
    country?: string;
    areaOfStudy?: string;
  } = {},
): Promise<TpoStudentsDirectoryCount> {
  const params = new URLSearchParams();
  if (filters.branch) params.set("branch", filters.branch);
  if (filters.batch) params.set("batch", filters.batch);
  if (filters.state) params.set("state", filters.state);
  if (filters.country) params.set("country", filters.country);
  if (filters.areaOfStudy) params.set("areaOfStudy", filters.areaOfStudy);
  const qs = params.toString();
  const url = `${API_URL}/api/method/scout.api.tpo.count_students_directory${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const body = await requireTpo<TpoStudentsDirectoryCount>(response, "Unable to load student count.");
  return (
    body.data ?? {
      total: 0,
      profileCount: 0,
      inviteCount: 0,
      truncated: false,
    }
  );
}

export async function listTpoStudentsByParameters(
  filters: {
    branch?: string;
    batch?: string;
    state?: string;
    country?: string;
    areaOfStudy?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<TpoStudentsListResult> {
  const params = new URLSearchParams();
  if (filters.branch) params.set("branch", filters.branch);
  if (filters.batch) params.set("batch", filters.batch);
  if (filters.state) params.set("state", filters.state);
  if (filters.country) params.set("country", filters.country);
  if (filters.areaOfStudy) params.set("areaOfStudy", filters.areaOfStudy);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? TPO_STUDENTS_PAGE_SIZE));
  const qs = params.toString();
  const response = await fetch(
    `${API_URL}/api/method/scout.api.tpo.list_students_by_parameters?${qs}`,
    { method: "GET", headers: scoutJsonHeaders(), credentials: "include" },
  );
  const body = await requireTpo<{ students?: TpoListedStudent[]; pagination?: TpoStudentsListResult["pagination"] }>(
    response,
    "Unable to load students.",
  );
  const pagination = body.data?.pagination;
  return {
    students: body.data?.students ?? [],
    pagination: pagination ?? {
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? TPO_STUDENTS_PAGE_SIZE,
      total: body.data?.students?.length ?? 0,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };
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
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const body = await requireTpo<TpoBulkUploadSummary>(response, "Unable to process student sheet.");
  return body.data || { processed: 0, profilesUpdated: 0, profilesCreated: 0, invitesCreated: 0, skipped: 0, errors: [] };
}

export async function getTpoBulkUploadStatus(uploadId: string) {
  const response = await fetch(
    `${API_URL}/api/method/scout.api.tpo.get_bulk_upload_status?uploadId=${encodeURIComponent(uploadId)}`,
    {
      method: "GET",
      headers: scoutJsonHeaders(),
      credentials: "include",
    },
  );
  const body = await requireTpo<TpoBulkUploadStatus>(response, "Unable to check upload status.");
  return body.data || { status: "unknown" };
}

const BULK_POLL_MS = 2000;
const BULK_POLL_MAX = 180;

export async function bulkUploadTpoStudentsAndWait(
  payload: Parameters<typeof bulkUploadTpoStudents>[0],
  onProgress?: (status: TpoBulkUploadStatus) => void,
): Promise<TpoBulkUploadSummary> {
  const initial = await bulkUploadTpoStudents(payload);
  if (!initial.async || !initial.uploadId) {
    return initial;
  }

  for (let attempt = 0; attempt < BULK_POLL_MAX; attempt += 1) {
    await sleep(BULK_POLL_MS);
    const state = await getTpoBulkUploadStatus(initial.uploadId);
    onProgress?.(state);
    if (state.status === "ready") {
      return {
        processed: state.processed ?? 0,
        profilesUpdated: state.profilesUpdated ?? 0,
        profilesCreated: state.profilesCreated ?? 0,
        invitesCreated: state.invitesCreated ?? 0,
        skipped: state.skipped ?? 0,
        errors: state.errors ?? [],
      };
    }
    if (state.status === "failed") {
      throw new Error(state.message || "Bulk upload failed.");
    }
  }
  throw new Error("Bulk upload is still processing. Refresh the student list in a few minutes.");
}
