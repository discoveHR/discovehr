import {
  API_URL,
  frappeCsrfHeaders,
  messageFromFrappeBody,
  readScoutApiJson,
  scoutJsonHeaders,
} from "./client";
import type {
  ApplicationStatus,
  AssessmentFormPayload,
  AssessmentItem,
  CompanyApplicantItem,
  CompanyCollegeInviteItem,
  CompanyLoginResponse,
  JobFormPayload,
  JobItem,
  PaginationMeta,
  ShortlistSchedulePayload,
} from "./types";

export async function getCompanyMe() {
  const response = await fetch(`${API_URL}/api/method/scout.api.auth.me`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });

  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Unauthorized.");
  }

  return body.data as CompanyLoginResponse["data"];
}

export async function companyLogout() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    /* best effort */
  }
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
    catalog?: Record<string, string[]>;
  };
};

type CompanyApplicantsResponse = {
  ok: boolean;
  message?: string;
  data?: {
    applicants: CompanyApplicantItem[];
    pagination?: PaginationMeta;
  };
};

export type ListCompanyApplicantsParams = {
  jobId?: string;
  page?: number;
  pageSize?: number;
  sort?: "score" | "recent";
};

export async function listCompanyJobs() {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.list_jobs`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<CompanyJobsResponse["data"]>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to load jobs.");
  }
  return body.data?.jobs || [];
}

export async function createCompanyJob(payload: JobFormPayload) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.create_job`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<CompanyJobsResponse["data"]>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to create job.");
  }
  return body.data?.jobs || [];
}

export async function listCompanyAssessments() {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.list_assessments`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<CompanyAssessmentsResponse["data"]>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to load assessments.");
  }
  return {
    assessments: body.data?.assessments || [],
    catalog: body.data?.catalog,
  };
}

export async function createCompanyAssessment(payload: AssessmentFormPayload) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.create_assessment`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<CompanyAssessmentsResponse["data"]>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to create assessment.");
  }
  return body.data?.assessments || [];
}

export async function publishCompanyAssessment(assessmentId: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.publish_assessment`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ assessmentId }),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<CompanyAssessmentsResponse["data"]>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to publish assessment.");
  }
  return body.data?.assessments || [];
}

export async function listCompanyApplicants(params: ListCompanyApplicantsParams = {}) {
  const qs = new URLSearchParams();
  if (params.jobId) qs.set("jobId", params.jobId);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params.sort) qs.set("sort", params.sort);
  const query = qs.toString();
  const endpoint = `${API_URL}/api/method/scout.api.company_api.list_applicants${query ? `?${query}` : ""}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<CompanyApplicantsResponse["data"]>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to load applicants.");
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
  feedback?: string,
) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.update_application_status`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ applicationId, status, schedule, feedback }),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to update application status.");
  }
  return body.message || "Application status updated successfully.";
}

export async function sendCompanyOfferLetter(applicationId: string, offerDetails?: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.send_offer_letter`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ applicationId, offerDetails }),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to send offer.");
  }
  return body.message || "Offer sent.";
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
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ jobId, status }),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<UpdateStatusResponse["data"]>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to update job status.");
  }
  return body.data?.job;
}

export async function inviteCollegeForCompanyJob(payload: { jobId: string; collegeEmails: string[]; note?: string }) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.invite_college_for_job`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to send college invitation.");
  }
  return body.message || "Invitation sent successfully.";
}

export async function listCompanyCollegeInvites(jobId?: string) {
  const endpoint = jobId
    ? `${API_URL}/api/method/scout.api.company_api.list_college_invites?jobId=${encodeURIComponent(jobId)}`
    : `${API_URL}/api/method/scout.api.company_api.list_college_invites`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<{ invites?: CompanyCollegeInviteItem[] }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to load college invite history.");
  }
  return body.data?.invites || [];
}

/* ===== SUB-ADMIN MANAGEMENT ===== */

export type CompanySubAdmin = {
  id: string;
  full_name: string;
  email: string;
  state: string;
  district: string;
  isActive: boolean;
  createdAt: string;
};

export type CreateSubAdminPayload = {
  /** Use fullName — Frappe API strips the reserved key ``name`` from JSON bodies. */
  fullName: string;
  email: string;
  password: string;
  state: string;
  district: string;
};

export async function listCompanySubAdmins(): Promise<CompanySubAdmin[]> {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.list_sub_admins`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<{ subAdmins?: CompanySubAdmin[] }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to load sub-admins.");
  }
  return body.data?.subAdmins || [];
}

export async function createCompanySubAdmin(payload: CreateSubAdminPayload): Promise<CompanySubAdmin> {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.create_sub_admin`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      fullName: payload.fullName,
      full_name: payload.fullName,
      email: payload.email,
      password: payload.password,
      state: payload.state,
      district: payload.district,
    }),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<{ subAdmin?: CompanySubAdmin }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to create sub-admin.");
  }
  if (!body.data?.subAdmin) throw new Error("No sub-admin data returned.");
  return body.data.subAdmin;
}

export async function deleteCompanySubAdmin(subAdminId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.delete_sub_admin`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ subAdminId }),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to delete sub-admin.");
  }
}

export async function listCompanyApplicantsByDistrict(params: {
  district: string;
  page?: number;
  pageSize?: number;
}) {
  const qs = new URLSearchParams();
  qs.set("district", params.district);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  const endpoint = `${API_URL}/api/method/scout.api.company_api.list_applicants_by_district?${qs.toString()}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<{ applicants?: CompanyApplicantItem[]; pagination?: PaginationMeta }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to load district applicants.");
  }
  return {
    applicants: body.data?.applicants || [],
    pagination: body.data?.pagination,
  };
}

/* ===== SUB-ADMIN DASHBOARD ===== */

export type SubAdminJobItem = {
  id: string;
  title: string;
  opportunityType: string;
  locationType: string;
  workType: string;
  openings: number;
  skills: string;
  status: string;
  totalApplications: number;
  districtApplications: number;
  createdAt: string;
};

export type SubAdminApplicantItem = {
  applicationId: string;
  studentUser: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  district: string;
  skills: string;
  academicYear: string;
  jobId: string;
  jobTitle: string;
  status: string;
  appliedOn: string;
};

export async function listSubAdminCompanyJobs(): Promise<{
  jobs: SubAdminJobItem[];
  district: string;
  state: string;
  companyName: string;
}> {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.list_sub_admin_company_jobs`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<{
    jobs?: SubAdminJobItem[];
    district?: string;
    state?: string;
    companyName?: string;
  }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to load jobs.");
  }
  return {
    jobs: body.data?.jobs || [],
    district: body.data?.district || "",
    state: body.data?.state || "",
    companyName: body.data?.companyName || "",
  };
}

export async function listSubAdminDistrictApplicants(params?: { jobId?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params?.jobId) qs.set("jobId", params.jobId);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  const url = `${API_URL}/api/method/scout.api.company_api.list_sub_admin_district_applicants${qs.toString() ? `?${qs}` : ""}`;
  const response = await fetch(url, { method: "GET", headers: scoutJsonHeaders(), credentials: "include" });
  const { body, raw } = await readScoutApiJson<{
    applicants?: SubAdminApplicantItem[];
    district?: string;
    state?: string;
    pagination?: PaginationMeta;
  }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to load applicants.");
  }
  return {
    applicants: body.data?.applicants || [],
    district: body.data?.district || "",
    state: body.data?.state || "",
    pagination: body.data?.pagination,
  };
}

export type ScheduleSubAdminInterviewPayload = {
  applicationId: string;
  title?: string;
  interviewType: "Video" | "In-person" | "Phone";
  startDatetime: string;
  endDatetime?: string;
  meetingLink?: string;
  location?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  hrNotifyEmails?: string;
  notes?: string;
};

export async function scheduleInterviewAsSubAdmin(payload: ScheduleSubAdminInterviewPayload) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.schedule_interview_as_sub_admin`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to schedule interview.");
  }
  return body.message || "Interview scheduled.";
}

export async function listSubAdminInterviews() {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.list_sub_admin_interviews`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<{ interviews?: unknown[] }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to load interviews.");
  }
  return body.data?.interviews || [];
}
