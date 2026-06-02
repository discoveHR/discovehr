import { API_URL, messageFromFrappeBody, readScoutApiJson, scoutJsonHeaders } from "./client";

async function parse<T>(response: Response): Promise<T> {
  const { body, raw } = await readScoutApiJson<T>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Request failed.");
  }
  return body.data as T;
}

export type StudentChallenge = {
  id: string;
  title: string;
  description: string;
  deadline: string;
  applied: boolean;
  applicationStatus: string;
};

export async function listStudentChallenges() {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.list_student_challenges`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  return parse<{ challenges: StudentChallenge[] }>(response);
}

export async function applyStudentChallenge(challengeId: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.apply_student_challenge`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ challengeId }),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Apply failed.");
  }
  return body.message || "Applied.";
}
