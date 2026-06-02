import type { AssessmentFormPayload, JobFormPayload } from "../../lib/api";

export type MenuKey =
  | "dashboard"
  | "post-job"
  | "job-listings"
  | "job-journey"
  | "view-applicants"
  | "interview-scheduler"
  | "freelancer-interviewers"
  | "credit-purchase"
  | "assessments"
  | "sub-admins";

export const menuItems: { key: MenuKey; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "post-job", label: "Post a Job" },
  { key: "job-listings", label: "Job Listings" },
  { key: "job-journey", label: "Journey & Invites" },
  { key: "view-applicants", label: "Applicants" },
  { key: "interview-scheduler", label: "Interview Scheduler" },
  { key: "freelancer-interviewers", label: "Freelancer Interviewers" },
  { key: "credit-purchase", label: "Credit Purchase" },
  { key: "assessments", label: "Assessments" },
  { key: "sub-admins", label: "Sub Admins" },
];

export const initialJobForm: JobFormPayload = {
  title: "",
  opportunityType: "Job",
  minExperience: "0 year",
  skills: "",
  locationType: "In office",
  workType: "Full-time",
  openings: 0,
  description: "",
  preferences: "",
  minSalary: "",
  maxSalary: "",
  screeningQuestion: "Please confirm your availability for this job.",
  journeyStages: [{ id: "app-received", type: "application_received", label: "Application received" }],
};

export const initialAssessmentForm: AssessmentFormPayload = {
  title: "",
  description: "",
  scheduleMode: "Scheduled",
  questionClass: "MCQ Single",
  mcqScoringMode: "Single Correct",
  durationMinutes: 30,
  totalQuestions: 20,
  passingScore: 50,
  windowStart: "",
  windowEnd: "",
  proctoringLevel: "None",
  integrationMode: "Frappe Native",
  questionsJson: "[]",
};
