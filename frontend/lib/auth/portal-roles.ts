import type { RegisterPayload } from "../api/types";

export type PortalRoleId = "company" | "student" | "jobseeker" | "freelancer" | "tpo";

export type PortalRoleConfig = {
  id: PortalRoleId;
  label: string;
  shortLabel: string;
  badge: string;
  title: string;
  subtitle: string;
  points: string[];
  signInTitle: string;
  signInSubtitle: string;
  emailPlaceholder: string;
  submitLabel: string;
  registerRole: RegisterPayload["role"];
  signupLabel: string;
};

export const PORTAL_ROLES: PortalRoleConfig[] = [
  {
    id: "company",
    label: "Employer",
    shortLabel: "Employer",
    badge: "Employers",
    title: "Hire from campuses",
    subtitle: "Post internships and jobs, run hiring workflows, and connect with TPOs and candidates.",
    points: [
      "Post internships, jobs, and freelance projects",
      "Manage applicants with stage-wise workflow",
      "Invite colleges and coordinate with TPOs",
    ],
    signInTitle: "Employer sign in",
    signInSubtitle: "Use the email and password from your employer registration.",
    emailPlaceholder: "hr@company.com",
    submitLabel: "Sign in as Employer",
    registerRole: "Company",
    signupLabel: "Employer",
  },
  {
    id: "student",
    label: "Candidate",
    shortLabel: "Candidate",
    badge: "Candidates",
    title: "Build your placement profile",
    subtitle: "Apply to opportunities, complete assessments, and track applications in one place.",
    points: [
      "Apply to campus and employer postings",
      "Take psychometric and aptitude assessments",
      "Track application status and feedback",
    ],
    signInTitle: "Candidate sign in",
    signInSubtitle: "Sign in with your candidate account.",
    emailPlaceholder: "you@email.com",
    submitLabel: "Sign in as Candidate",
    registerRole: "Student",
    signupLabel: "Candidate",
  },
  {
    id: "freelancer",
    label: "Freelancer Interviewer",
    shortLabel: "Freelancer Interviewer",
    badge: "Freelancer interviewers",
    title: "Build your freelancer interviewer profile",
    subtitle: "Submit your details and documents for admin approval, then apply to interview opportunities.",
    points: [
      "Complete profile with resume and certificates",
      "Upload ID proof and experience documents",
      "Apply to roles after admin approval",
    ],
    signInTitle: "Freelancer interviewer sign in",
    signInSubtitle: "Use the credentials from your freelancer interviewer registration.",
    emailPlaceholder: "you@email.com",
    submitLabel: "Sign in as Freelancer Interviewer",
    registerRole: "Freelancer",
    signupLabel: "Freelancer Interviewer",
  },
  {
    id: "jobseeker",
    label: "Job Seeker",
    shortLabel: "Job Seeker",
    badge: "Job seekers",
    title: "Open opportunities beyond campus",
    subtitle: "Browse and apply to roles posted for job seekers on DiscoveHR.",
    points: [
      "Discover jobs and freelance projects",
      "Apply with your Scout profile",
      "Track hiring stages in your dashboard",
    ],
    signInTitle: "Job seeker sign in",
    signInSubtitle: "Use the credentials you created when registering as a job seeker.",
    emailPlaceholder: "you@email.com",
    submitLabel: "Sign in as Job Seeker",
    registerRole: "Job Seeker",
    signupLabel: "Job Seeker",
  },
  {
    id: "tpo",
    label: "TPO",
    shortLabel: "TPO",
    badge: "Campus",
    title: "Training & Placement Office",
    subtitle: "Manage your college pipeline, students, placements, and company engagement.",
    points: [
      "Configure departments with HOD and coordinators",
      "Manage students, placements, and internal jobs",
      "Coordinate campus hiring with companies",
    ],
    signInTitle: "TPO sign in",
    signInSubtitle: "Use the email and password from your TPO registration.",
    emailPlaceholder: "tpo@college.edu",
    submitLabel: "Sign in as TPO",
    registerRole: "Training & Placement Officer",
    signupLabel: "Training & Placement Officer",
  },
];

const ROLE_BY_ID = Object.fromEntries(PORTAL_ROLES.map((r) => [r.id, r])) as Record<PortalRoleId, PortalRoleConfig>;

export function getPortalRole(id: PortalRoleId): PortalRoleConfig {
  return ROLE_BY_ID[id];
}

export function parsePortalRoleParam(value: string | null | undefined): PortalRoleId {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "student") return "student";
  if (normalized === "freelancer") return "freelancer";
  if (normalized === "jobseeker" || normalized === "job-seeker" || normalized === "job_seeker") return "jobseeker";
  if (normalized === "tpo" || normalized === "placement") return "tpo";
  return "company";
}

export function normalizeFrappeRoles(roles: string[]): string[] {
  return roles.map((role) => role.trim().toLowerCase());
}

export function hasCompanyRole(roles: string[]): boolean {
  return roles.includes("Company");
}

export function hasStudentRole(roles: string[]): boolean {
  return roles.includes("Student");
}

export function hasJobSeekerRole(roles: string[]): boolean {
  return roles.includes("Job Seeker");
}

export function hasFreelancerRole(roles: string[]): boolean {
  return roles.includes("Freelancer");
}

export function hasTpoRole(roles: string[]): boolean {
  const normalized = normalizeFrappeRoles(roles);
  return (
    normalized.includes("training & placement officer") ||
    normalized.includes("training and placement officer") ||
    normalized.includes("tpo")
  );
}

export function hasAdminOnlyRole(roles: string[]): boolean {
  const hasAdmin =
    roles.includes("Administrator") || roles.includes("System Manager") || roles.includes("Admin");
  return (
    hasAdmin &&
    !hasStudentRole(roles) &&
    !hasJobSeekerRole(roles) &&
    !hasCompanyRole(roles) &&
    !hasTpoRole(roles)
  );
}

export function dashboardPathForRole(
  role: PortalRoleId,
): "/company/dashboard" | "/student/dashboard" | "/freelancer/dashboard" | "/jobseeker/dashboard" | "/tpo/dashboard" {
  if (role === "student") return "/student/dashboard";
  if (role === "jobseeker") return "/jobseeker/dashboard";
  if (role === "freelancer") return "/freelancer/dashboard";
  if (role === "tpo") return "/tpo/dashboard";
  return "/company/dashboard";
}

export type PortalUserLike = {
  isSubAdmin?: boolean;
};

/** Route after login — sub-admins use the district dashboard, not the full company portal. */
export function resolveDashboardPath(
  role: PortalRoleId,
  user?: PortalUserLike | null,
): "/sub-admin/dashboard" | "/company/dashboard" | "/student/dashboard" | "/freelancer/dashboard" | "/jobseeker/dashboard" | "/tpo/dashboard" {
  if (user?.isSubAdmin && role === "company") {
    return "/sub-admin/dashboard";
  }
  return dashboardPathForRole(role);
}

export function sessionRoleKey(role: PortalRoleId): "company" | "student" | "jobseeker" | "freelancer" | "tpo" {
  return role;
}

/** Shared left-panel copy for unified login and signup. */
export const UNIFIED_AUTH_SHELL: PortalRoleConfig = {
  id: "company",
  label: "Portal",
  shortLabel: "Portal",
  badge: "DiscoveHR",
  title: "One portal for everyone",
  subtitle:
    "Sign in with your account. Scout routes you to the right dashboard based on your role—Employer, Candidate, Job Seeker, Freelancer Interviewer, or TPO.",
  points: [
    "Employers: post jobs and manage hiring",
    "Candidates & job seekers: apply and take assessments",
    "TPO: manage campus placements and candidate pipelines",
  ],
  signInTitle: "Sign in",
  signInSubtitle: "Use your email and password. Your dashboard opens automatically after sign-in.",
  emailPlaceholder: "name@example.com",
  submitLabel: "Sign in",
  registerRole: "Company",
  signupLabel: "Account",
};

export const SIGNUP_ROLE_OPTIONS: { label: string; value: RegisterPayload["role"] }[] = [
  { label: "Employer", value: "Company" },
  { label: "Candidate", value: "Student" },
  { label: "Job Seeker", value: "Job Seeker" },
  { label: "Training & Placement Officer", value: "Training & Placement Officer" },
  { label: "Internal Team", value: "Internal Team" },
  { label: "Freelancer Interviewer", value: "Freelancer" },
];

export function registerRoleFromParam(value: string | null | undefined): RegisterPayload["role"] {
  const id = parsePortalRoleParam(value);
  return getPortalRole(id).registerRole;
}

/** Pick portal role when user has multiple dashboard roles (Freelancer / Job Seeker first). */
export function resolvePortalRoleFromRoles(roles: string[]): PortalRoleId | null {
  if (hasFreelancerRole(roles)) return "freelancer";
  if (hasJobSeekerRole(roles)) return "jobseeker";
  if (hasStudentRole(roles)) return "student";
  if (hasTpoRole(roles)) return "tpo";
  if (hasCompanyRole(roles)) return "company";
  return null;
}

export function hasAnyPortalDashboardRole(roles: string[]): boolean {
  return resolvePortalRoleFromRoles(roles) !== null;
}
