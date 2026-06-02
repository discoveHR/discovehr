import { API_URL, messageFromFrappeBody, readScoutApiJson, scoutJsonHeaders } from "./client";
import type {
  ListStudentJobsParams,
  ListStudentJobsResult,
  StudentDashboardData,
  StudentLmsContext,
  StudentProfileData,
  StudentProfileUpdatePayload,
} from "./types";

export async function listStudentJobs(params: ListStudentJobsParams = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params.q) qs.set("q", params.q);
  if (params.locationType && params.locationType !== "All") qs.set("locationType", params.locationType);
  if (params.opportunityType && params.opportunityType !== "All") qs.set("opportunityType", params.opportunityType);
  if (params.minExperience && params.minExperience !== "All") qs.set("minExperience", params.minExperience);
  const query = qs.toString();
  const url = `${API_URL}/api/method/scout.api.student.list_student_jobs${query ? `?${query}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<ListStudentJobsResult>(response);
  if (!response.ok || !body.ok || !body.data?.pagination) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Unable to load jobs.");
  }
  return {
    jobs: body.data.jobs || [],
    pagination: body.data.pagination,
  };
}

export async function getStudentDashboardData() {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.student_dashboard`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<StudentDashboardData>(response);
  if (!response.ok || !body.ok || !body.data) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Unable to load student dashboard.");
  }
  return body.data;
}

export async function getStudentLmsContext() {
  const response = await fetch(`${API_URL}/api/method/scout.api.lms.student_lms_context`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<StudentLmsContext>(response);
  if (!response.ok || !body.ok || !body.data) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Unable to load LMS details.");
  }
  return body.data;
}

export async function getStudentProfile() {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.get_student_profile`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<{ profile: StudentProfileData }>(response);
  if (!response.ok || !body.ok || !body.data?.profile) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Unable to load profile.");
  }
  return body.data.profile;
}

export async function updateStudentProfile(payload: StudentProfileUpdatePayload) {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.update_student_profile`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Unable to update profile.");
  }
  return body.message || "Profile updated successfully.";
}

export async function requestStudentProfileEdit() {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.request_student_profile_edit`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({}),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Unable to request profile edit.");
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
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Unable to confirm placement.");
  }
  return body.message || "Placement confirmed.";
}

export async function declineCollegiateEnrollment(inviteId?: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.decline_collegiate_enrollment`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(inviteId ? { inviteId } : {}),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Unable to update placement.");
  }
  return body.message || "Updated.";
}

export async function applyToJob(jobId: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.apply_to_job`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ jobId }),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Unable to apply for job.");
  }
  return body.message || "Application submitted.";
}
