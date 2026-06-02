"use client";

import { AuthLoadingScreen } from "./AuthLoadingScreen";

export type PortalDashboardKind = "company" | "student" | "jobseeker" | "freelancer" | "tpo" | "admin";

const COPY: Record<PortalDashboardKind, { message: string; subtitle: string }> = {
  company: {
    message: "Loading company dashboard",
    subtitle: "Preparing your workspace…",
  },
  student: {
    message: "Loading student hub",
    subtitle: "Fetching jobs and your applications…",
  },
  jobseeker: {
    message: "Loading job seeker dashboard",
    subtitle: "Preparing job listings and your profile…",
  },
  freelancer: {
    message: "Loading freelancer interviewer dashboard",
    subtitle: "Preparing your profile and documents…",
  },
  tpo: {
    message: "Loading TPO dashboard",
    subtitle: "Preparing placements, students, and reports…",
  },
  admin: {
    message: "Loading admin console",
    subtitle: "Preparing platform overview…",
  },
};

type Props = {
  portal: PortalDashboardKind;
};

/** Full-screen loader after login while a portal dashboard bootstraps. */
export function PortalDashboardLoader({ portal }: Props) {
  const { message, subtitle } = COPY[portal];
  return <AuthLoadingScreen variant="portal" message={message} subtitle={subtitle} />;
}
