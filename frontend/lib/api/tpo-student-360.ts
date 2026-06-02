import { API_URL, readScoutApiJson, scoutJsonHeaders } from "./client";
import type { TpoStudent360Data } from "./types";

export async function fetchTpoStudent360(studentId: string): Promise<TpoStudent360Data> {
  const qs = new URLSearchParams({ studentId });
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.get_student_360?${qs.toString()}`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body } = await readScoutApiJson<TpoStudent360Data>(response);
  if (!response.ok || !body.ok || !body.data) {
    throw new Error(body.message || "Unable to load student details.");
  }
  return body.data as TpoStudent360Data;
}

export function tpoStudent360Path(studentId: string) {
  return `/tpo/dashboard/students/${encodeURIComponent(studentId)}`;
}
