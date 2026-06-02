import type { StudentProfileData, StudentPublicJobApplyInfo } from "../../lib/api";

export const DEFAULT_PUBLIC_JOB_APPLY: StudentPublicJobApplyInfo = {
  publicApplicationsUsed: 0,
  withoutPriCap: 5,
  hasPriScore: false,
  canApplyToPublicJobboard: true,
  remainingWithoutPri: 5,
};

export const COUNTRY_OPTIONS = ["India", "United States", "United Kingdom", "Canada", "Australia", "Singapore", "United Arab Emirates", "Germany", "France"];
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
export const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

export const SEMESTER_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "Odd semester", "Even semester", "Annual", "N/A"];

export const ACADEMIC_YEAR_OPTIONS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "PG — Year 1",
  "PG — Year 2",
  "Doctorate",
  "Completed",
  "Other",
];

export const EMPTY_STUDENT_PROFILE: StudentProfileData = {
  fullName: "",
  email: "",
  phone: "",
  profilePhoto: "",
  dateOfBirth: "",
  gender: "",
  parentGuardianName: "",
  parentContactNumber: "",
  address: "",
  city: "",
  district: "",
  state: "",
  country: "",
  pinCode: "",
  college: "",
  universityName: "",
  school: "",
  areaOfStudy: "",
  courseClassGrade: "",
  departmentStream: "",
  academicYear: "",
  semester: "",
  rollNumber: "",
  admissionYear: "",
  expectedGraduationYear: "",
  currentCgpa: "",
  skills: "",
  certifications: "",
  areasOfInterest: "",
  internshipExperience: "",
  projectTitle: "",
  preferredJobRole: "",
  resumeFile: "",
  studentIdCardNumber: "",
  aadhaarNumber: "",
  linkedinProfile: "",
  githubProfile: "",
  portfolioWebsite: "",
  profileConsent: false,
};

export function normalizeDateForInput(value: string) {
  if (!value) return "";
  const exact = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (exact) return value;

  const withTime = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ]/);
  if (withTime) return `${withTime[1]}-${withTime[2]}-${withTime[3]}`;

  return "";
}
