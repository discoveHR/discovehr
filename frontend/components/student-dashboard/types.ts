import type { StudentPublicJobApplyInfo } from "../../lib/api";

export type StudentUser = {
  id: string;
  full_name: string;
  email: string;
};

export type StudentMenuKey =
  | "applications"
  | "mock-interviews"
  | "tests-assessments"
  | "all-jobs"
  | "suggested-jobs"
  | "lms"
  | "pri-score"
  | "interviews-calendar"
  | "messages"
  | "documents"
  | "profile"
  | "purchase-courses";

export type StudentProfileFlags = {
  profileSubmitted: boolean;
  profileEditRequested: boolean;
  profileEditApproved: boolean;
  profileComplete: boolean;
  canApplyToJobs: boolean;
  canApplyToGeneralJobboard: boolean;
  publicJobApply: StudentPublicJobApplyInfo;
};
