import { getAuthMe } from "../api/auth";
import { companyLogout } from "../api/company";
import {
  resolveDashboardPath,
  resolvePortalRoleFromRoles,
  type PortalRoleId,
  type PortalUserLike,
} from "./portal-roles";

export type ScoutSession = {
  role?: string;
  user?: unknown;
  roles?: string[];
};

export function readScoutSession(): ScoutSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("scout_session");
    return raw ? (JSON.parse(raw) as ScoutSession) : null;
  } catch {
    return null;
  }
}

export function writeScoutSession(session: ScoutSession) {
  localStorage.setItem("scout_session", JSON.stringify(session));
}

export async function clearPortalSession() {
  try {
    await companyLogout();
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    localStorage.removeItem("scout_session");
  }
}

/** Validate session via API; returns dashboard path or null if session should not resume. */
export async function resolveResumeDashboardPath(): Promise<string | null> {
  const session = readScoutSession();
  if (!session?.role || session.role === "admin") {
    return null;
  }

  try {
    const me = await getAuthMe();
    const roles = (me?.roles || []) as string[];
    const portalRole: PortalRoleId | null = resolvePortalRoleFromRoles(roles);
    if (!portalRole) {
      await clearPortalSession();
      return null;
    }
    writeScoutSession({
      role: portalRole,
      user: me?.user,
      roles,
    });
    return resolveDashboardPath(portalRole, me?.user as PortalUserLike | undefined);
  } catch {
    await clearPortalSession();
    return null;
  }
}
