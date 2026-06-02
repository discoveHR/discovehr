import { API_URL, frappeCsrfHeaders } from "./client";
import type { InboundJobDetail, InboundJobSummary, JobItem } from "./types";

async function parseMessage<T>(response: Response): Promise<T> {
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string; data?: T } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Request failed.");
  }
  return body.data as T;
}

export async function listInboundJobs(tpoResponse?: string) {
  const qs = tpoResponse ? `?tpoResponse=${encodeURIComponent(tpoResponse)}` : "";
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.list_inbound_jobs${qs}`, {
    method: "GET",
    headers: { Accept: "application/json", ...frappeCsrfHeaders() },
    credentials: "include",
  });
  return parseMessage<{ inboundJobs: InboundJobSummary[]; summary: { pending: number; total: number } }>(response);
}

export async function getInboundJobDetail(inviteId: string) {
  const response = await fetch(
    `${API_URL}/api/method/scout.api.tpo.get_inbound_job_detail?inviteId=${encodeURIComponent(inviteId)}`,
    {
      method: "GET",
      headers: { Accept: "application/json", ...frappeCsrfHeaders() },
      credentials: "include",
    },
  );
  return parseMessage<InboundJobDetail>(response);
}

export async function respondInboundJob(payload: {
  inviteId: string;
  decision: "accept" | "decline";
  reason?: string;
  recruitmentStage?: string;
}) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.respond_inbound_job`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...frappeCsrfHeaders() },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  return parseMessage<{ invite: InboundJobSummary; message?: string }>(response);
}

export async function suggestStudentsForInboundJob(inviteId: string, studentIds: string[]) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.suggest_students_for_inbound_job`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...frappeCsrfHeaders() },
    body: JSON.stringify({ inviteId, studentIds }),
    credentials: "include",
  });
  return parseMessage<{ suggestedStudents: InboundJobDetail["suggestedStudents"] }>(response);
}

export async function updateInboundRecruitmentStage(inviteId: string, recruitmentStage: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.update_inbound_recruitment_stage`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...frappeCsrfHeaders() },
    body: JSON.stringify({ inviteId, recruitmentStage }),
    credentials: "include",
  });
  return parseMessage<Record<string, never>>(response);
}

export type { JobItem };
