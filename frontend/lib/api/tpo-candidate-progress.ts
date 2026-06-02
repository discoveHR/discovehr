import { API_URL, frappeCsrfHeaders } from "./client";
import type { JobItem } from "./types";

async function parse<T>(response: Response): Promise<T> {
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string; data?: T } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) throw new Error(body.message || "Request failed.");
  return body.data as T;
}

export type KanbanJobItem = { inviteId: string; jobId: string; jobTitle: string; collegeEmail: string; recruitmentStage: string };

export type KanbanColumn = {
  stage: string;
  candidates: Array<{
    studentId: string;
    fullName: string;
    email: string;
    branch: string;
    applicationStatus?: string;
    eligible?: boolean;
    suggestedByTpo?: boolean;
  }>;
};

export async function listKanbanJobs() {
  const r = await fetch(`${API_URL}/api/method/scout.api.tpo.list_kanban_jobs`, {
    headers: { Accept: "application/json", ...frappeCsrfHeaders() },
    credentials: "include",
  });
  return parse<{ items: KanbanJobItem[] }>(r);
}

export async function getCandidateProgressKanban(jobId: string, inviteId?: string) {
  let url = `${API_URL}/api/method/scout.api.tpo.get_candidate_progress_kanban?jobId=${encodeURIComponent(jobId)}`;
  if (inviteId) url += `&inviteId=${encodeURIComponent(inviteId)}`;
  const r = await fetch(url, { headers: { Accept: "application/json", ...frappeCsrfHeaders() }, credentials: "include" });
  return parse<{ job: JobItem; inviteId: string; journeyStages: string[]; columns: KanbanColumn[] }>(r);
}
