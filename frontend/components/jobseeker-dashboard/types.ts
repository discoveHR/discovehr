import type { FreelancerProfileData, JobItem } from "../../lib/api";

export type JsMenuKey =
  | "home"
  | "profile"
  | "resume"
  | "jobs"
  | "applied"
  | "saved"
  | "recommended"
  | "interviews"
  | "notifications"
  | "settings";

export type JobSeekerDashboardState = {
  isLoading: boolean;
  error: string;
  user: { id: string; full_name: string; email: string } | null;
  profile: FreelancerProfileData | null;
  activeMenu: JsMenuKey;
  setActiveMenu: (key: JsMenuKey) => void;
  jobs: JobItem[];
  jobsLoading: boolean;
  jobPage: number;
  jobTotalPages: number;
  goToJobPage: (page: number) => void;
  applyingJobId: string | null;
  handleApply: (jobId: string) => Promise<void>;
  handleLogout: () => void;
  displayName: string;
};
