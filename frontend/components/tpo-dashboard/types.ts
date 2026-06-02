import type { TpoProfile } from "../../lib/api";
import type { IconHome } from "./icons";

export type TpoMenuKey =
  | "home"
  | "college-profile"
  | "placements"
  | "internal-jobs"
  | "applicants"
  | "students"
  | "reports"
  | "inbound-jobs"
  | "calendars"
  | "candidate-progress"
  | "challenges"
  | "engagement"
  | "aptitude"
  | "admin";

export type SessionUser = { full_name?: string; email?: string };

export type AddStudentForm = {
  email: string;
  batch: string;
  branch: string;
  year: string;
};

export type DownloadFilterForm = {
  branch: string;
  batch: string;
  state: string;
  country: string;
  areaOfStudy: string;
};

export type StudentTabKey = "all" | "batch" | "add" | "invites" | "download" | "profile-edits";

export type BulkStudentUploadForm = {
  defaultBatch: string;
  defaultDepartment: string;
  defaultYear: string;
  createInviteForMissing: boolean;
};

export type InternalJobFormState = {
  title: string;
  description: string;
  postingType: string;
  audienceDescription: string;
  branch: string;
  batchAudience: "All Students" | "Specific Batches";
  targetBatches: string;
  applicationLink: string;
  eligibilityCriteria: string;
  posterFile: string;
  validTill: string;
  status: "Draft" | "Active" | "Closed";
  notifyStudents: boolean;
};

export type NavItem = {
  key: TpoMenuKey;
  label: string;
  Icon: typeof IconHome;
};

export type EmptyTpoProfile = TpoProfile;
