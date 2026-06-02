import { API_URL, frappeCsrfHeaders } from "./client";

async function parse<T>(response: Response): Promise<T> {
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string; data?: T } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) throw new Error(body.message || "Request failed.");
  return body.data as T;
}

export type TpoChallenge = {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
  applicantCount: number;
  applicants: Array<{
    name: string;
    student_user: string;
    studentName?: string;
    studentEmail?: string;
    status: string;
  }>;
};

export async function listTpoChallenges() {
  const r = await fetch(`${API_URL}/api/method/scout.api.tpo.list_tpo_challenges`, {
    headers: { Accept: "application/json", ...frappeCsrfHeaders() },
    credentials: "include",
  });
  return parse<{ challenges: TpoChallenge[] }>(r);
}

export async function createTpoChallenge(payload: { title: string; description?: string; status?: string }) {
  const r = await fetch(`${API_URL}/api/method/scout.api.tpo.create_tpo_challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...frappeCsrfHeaders() },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  return parse<Record<string, never>>(r);
}

export async function updateChallengeApplicationStatus(applicationId: string, status: string) {
  const r = await fetch(`${API_URL}/api/method/scout.api.tpo.update_challenge_application_status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...frappeCsrfHeaders() },
    body: JSON.stringify({ applicationId, status }),
    credentials: "include",
  });
  return parse<Record<string, never>>(r);
}
