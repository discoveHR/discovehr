import { API_URL, messageFromFrappeBody, readScoutApiJson, scoutJsonHeaders } from "./client";
import type { CompanyCollegeInviteItem, JourneyStageDef, JobRecruitmentJourneyData } from "./types";

async function parseMessage<T>(response: Response): Promise<T> {
  const { body, raw } = await readScoutApiJson<T>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Request failed.");
  }
  return body.data as T;
}

export async function getJobRecruitmentJourney(jobId: string, inviteId?: string) {
  let url = `${API_URL}/api/method/scout.api.company_api.get_job_recruitment_journey?jobId=${encodeURIComponent(jobId)}`;
  if (inviteId) {
    url += `&inviteId=${encodeURIComponent(inviteId)}`;
  }
  const response = await fetch(url, { method: "GET", headers: scoutJsonHeaders(), credentials: "include" });
  return parseMessage<JobRecruitmentJourneyData>(response);
}

export async function updateJobRecruitmentJourney(jobId: string, stageDefs: JourneyStageDef[]) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.update_job_recruitment_journey`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ jobId, stageDefs }),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<{ journeyStages: string[]; journeyStageDefs: JourneyStageDef[] }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Request failed.");
  }
  return body.data as { journeyStages: string[]; journeyStageDefs: JourneyStageDef[] };
}

export async function updateCollegeInviteStage(inviteId: string, recruitmentStage: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.update_college_invite_stage`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ inviteId, recruitmentStage }),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<{ invite: CompanyCollegeInviteItem }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Request failed.");
  }
  return body.data as { invite: CompanyCollegeInviteItem };
}
