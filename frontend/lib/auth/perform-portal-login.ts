import { companyLogin, companyLogout } from "../api";
import { writeScoutSession } from "./session";
import type { PortalRoleId } from "./portal-roles";
import {
  hasAdminOnlyRole,
  hasAnyPortalDashboardRole,
  resolveDashboardPath,
  resolvePortalRoleFromRoles,
  sessionRoleKey,
  type PortalUserLike,
} from "./portal-roles";

export type PortalLoginResult = {
  dashboardPath: string;
  sessionRole: string;
  user: unknown;
};

export async function performPortalLogin(email: string, password: string): Promise<PortalLoginResult> {
  const result = await companyLogin({ email, password });
  const roles = (result?.roles || []) as string[];

  if (hasAdminOnlyRole(roles)) {
    await companyLogout();
    throw new Error("Administrator accounts must use the admin portal at /admin/login.");
  }

  const portalRole: PortalRoleId | null = resolvePortalRoleFromRoles(roles);

  if (!portalRole || !hasAnyPortalDashboardRole(roles)) {
    await companyLogout();
    throw new Error(
      "Signed in successfully, but only Employer, Candidate, Job Seeker, Freelancer Interviewer, and TPO accounts have a dashboard here. Use Frappe Desk for other roles, or register with the correct role.",
    );
  }

  const sessionRole = sessionRoleKey(portalRole);
  const user = result?.user as PortalUserLike | undefined;
  writeScoutSession({
    role: sessionRole,
    user: result?.user,
    roles,
  });

  return {
    dashboardPath: resolveDashboardPath(portalRole, user),
    sessionRole,
    user: result?.user,
  };
}
