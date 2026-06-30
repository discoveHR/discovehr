import { refreshScoutAccessToken } from "./auth";
import { API_URL, readScoutApiJson, scoutJsonHeaders } from "./client";

export type TpoStudentSearchHit = {
  studentId: string;
  fullName: string;
  email: string;
  branch: string;
  batch: string;
  college: string;
  rollNumber: string;
};

export async function searchTpoStudents(
  query: string,
  limit = 25,
  signal?: AbortSignal,
): Promise<TpoStudentSearchHit[]> {
  if (query.trim().length < 2) return [];

  const qs = new URLSearchParams({ q: query.trim(), limit: String(limit) });
  let triedRefresh = false;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(`${API_URL}/api/method/scout.api.search.search_tpo_students?${qs}`, {
      method: "GET",
      headers: scoutJsonHeaders(),
      credentials: "include",
      signal,
    });
    const { body } = await readScoutApiJson<{ results?: TpoStudentSearchHit[] }>(response);
    if ((response.status === 401 || response.status === 403) && !triedRefresh) {
      triedRefresh = true;
      if (await refreshScoutAccessToken()) continue;
    }
    if (!response.ok || !body.ok) {
      throw new Error(body.message || "Search failed.");
    }
    return body.data?.results || [];
  }
  return [];
}
