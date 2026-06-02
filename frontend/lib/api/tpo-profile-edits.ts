import { API_URL, frappeCsrfHeaders } from "./client";
import type { StudentProfileEditRequestItem } from "./types";

export async function listStudentProfileEditRequests() {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.list_student_profile_edit_requests`, {
    method: "GET",
    headers: { Accept: "application/json", ...frappeCsrfHeaders() },
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
    headers: { "Content-Type": "application/json", Accept: "application/json", ...frappeCsrfHeaders() },
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


