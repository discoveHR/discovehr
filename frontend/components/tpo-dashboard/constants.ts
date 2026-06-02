import {
  IconAdmin,
  IconApplicants,
  IconCollegeProfile,
  IconHome,
  IconInternalJobs,
  IconPlacements,
  IconCalendar,
  IconChallenge,
  IconInbound,
  IconKanban,
  IconReports,
  IconStudents,
} from "./icons";
import type { AddStudentForm, BulkStudentUploadForm, DownloadFilterForm, InternalJobFormState, NavItem } from "./types";

export const COUNTRY_OPTIONS = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Singapore",
  "United Arab Emirates",
  "Germany",
  "France",
];

export const STATE_OPTIONS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
];

export const initialAddStudentForm: AddStudentForm = {
  email: "",
  batch: "",
  branch: "",
  year: "",
};

export const initialDownloadFilters: DownloadFilterForm = {
  branch: "",
  batch: "",
  state: "",
  country: "",
  areaOfStudy: "",
};

export const initialBulkUploadForm: BulkStudentUploadForm = {
  defaultBatch: "",
  defaultDepartment: "",
  defaultYear: "",
  createInviteForMissing: true,
};

export const TPO_INTERNAL_POSTING_TYPES = [
  "Summer Internship",
  "Winter Internship",
  "Full-time Placement",
  "Part-time / Contract",
  "Campus Drive",
  "Workshop / Event",
  "Other",
] as const;

export const initialInternalJobForm: InternalJobFormState = {
  title: "",
  description: "",
  postingType: "Summer Internship",
  audienceDescription: "",
  branch: "All",
  batchAudience: "Specific Batches",
  targetBatches: "",
  applicationLink: "",
  eligibilityCriteria: "",
  posterFile: "",
  validTill: "",
  status: "Draft",
  notifyStudents: true,
};

export const initialTpoProfile = {
  tpoName: "",
  collegeName: "",
  country: "India",
  state: "",
  district: "",
  collegeLocation: "",
  address: "",
  pincode: "",
  websiteLink: "",
  linkedinUrl: "",
  socialMediaLink: "",
};

export const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "Home", Icon: IconHome },
  { key: "college-profile", label: "College profile", Icon: IconCollegeProfile },
  { key: "placements", label: "Placements", Icon: IconPlacements },
  { key: "internal-jobs", label: "Internal job posting", Icon: IconInternalJobs },
  { key: "applicants", label: "Applicants", Icon: IconApplicants },
  { key: "students", label: "Students", Icon: IconStudents },
  { key: "reports", label: "Reports", Icon: IconReports },
  { key: "inbound-jobs", label: "Inbound jobs", Icon: IconInbound },
  { key: "calendars", label: "Calendars", Icon: IconCalendar },
  { key: "candidate-progress", label: "Candidate progress", Icon: IconKanban },
  { key: "challenges", label: "Challenges", Icon: IconChallenge },
  { key: "engagement", label: "Engagement", Icon: IconPlacements },
  { key: "aptitude", label: "Aptitude tests", Icon: IconCalendar },
  { key: "admin", label: "Admin", Icon: IconAdmin },
];
