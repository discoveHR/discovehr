import { refreshScoutAccessToken } from "./auth";
import { API_URL, readScoutApiJson, scoutJsonHeaders } from "./client";

export type TpoDashboardRollup = {
  studentCount: number;
  applicationCount: number;
  trainingAllCompletedCount: number;
  pendingInviteCount: number;
  lastRefreshed: string;
  stale?: boolean;
};

export async function getTpoDashboardRollup(): Promise<TpoDashboardRollup> {
  let triedRefresh = false;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(`${API_URL}/api/method/scout.api.tpo.get_tpo_dashboard_rollup`, {
      method: "GET",
      headers: scoutJsonHeaders(),
      credentials: "include",
    });
    const { body } = await readScoutApiJson<{ rollup?: TpoDashboardRollup }>(response);
    if ((response.status === 401 || response.status === 403) && !triedRefresh) {
      triedRefresh = true;
      if (await refreshScoutAccessToken()) continue;
    }
    if (!response.ok || !body.ok) {
      throw new Error(body.message || "Unable to load dashboard summary.");
    }
    return (
      body.data?.rollup || {
        studentCount: 0,
        applicationCount: 0,
        trainingAllCompletedCount: 0,
        pendingInviteCount: 0,
        lastRefreshed: "",
      }
    );
  }
  throw new Error("Unable to load dashboard summary.");
}
