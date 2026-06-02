import { API_URL, readScoutApiJson, scoutJsonHeaders } from "./client";

export type FreelancerDocumentRow = {
  name?: string;
  documentType: string;
  description?: string;
  file: string;
};

export type FreelancerProfileData = {
  fullName: string;
  email: string;
  phone: string;
  profilePhoto?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  professionalSummary?: string;
  skills?: string;
  yearsOfExperience?: string;
  primaryService?: string;
  hourlyRate?: string;
  availability?: string;
  linkedinProfile?: string;
  githubProfile?: string;
  portfolioWebsite?: string;
  resumeFile?: string;
  idProofFile?: string;
  workExperience?: string;
  profileConsent?: boolean;
  documents?: FreelancerDocumentRow[];
  profileSubmitted?: boolean;
  profileLocked?: boolean;
  profileComplete?: boolean;
  canApplyToJobs?: boolean;
  approvalStatus?: string;
  rejectionReason?: string;
};

export async function getFreelancerDashboard() {
  const response = await fetch(`${API_URL}/api/method/scout.api.freelancer.freelancer_dashboard`, {
    method: "GET",
    credentials: "include",
    headers: scoutJsonHeaders(),
  });
  const { body } = await readScoutApiJson<{
    user: { id: string; full_name: string; email: string };
    profile: FreelancerProfileData;
  }>(response);
  if (!response.ok || !body.ok || !body.data) {
    throw new Error(body.message || "Unable to load freelancer interviewer dashboard.");
  }
  return body.data;
}

export async function getFreelancerProfile() {
  const response = await fetch(`${API_URL}/api/method/scout.api.freelancer.get_freelancer_profile`, {
    method: "GET",
    credentials: "include",
    headers: scoutJsonHeaders(),
  });
  const { body } = await readScoutApiJson<{ profile: FreelancerProfileData }>(response);
  if (!response.ok || !body.ok || !body.data?.profile) {
    throw new Error(body.message || "Unable to load profile.");
  }
  return body.data.profile;
}

export type FreelancerInterviewAssignment = {
  id: string;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  candidateId: string;
  candidateName: string;
  title: string;
  interviewType: string;
  startDatetime: string;
  endDatetime: string;
  meetingLink: string;
  location: string;
  notes: string;
  status: string;
};

export async function listFreelancerInterviewAssignments() {
  const response = await fetch(
    `${API_URL}/api/method/scout.api.freelancer.list_freelancer_interview_assignments`,
    { method: "GET", credentials: "include", headers: scoutJsonHeaders() },
  );
  const { body } = await readScoutApiJson<{ assignments: FreelancerInterviewAssignment[] }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to load interview assignments.");
  }
  return body.data?.assignments || [];
}

export async function updateFreelancerProfile(profile: FreelancerProfileData, finalizeProfile = false) {
  const response = await fetch(`${API_URL}/api/method/scout.api.freelancer.update_freelancer_profile`, {
    method: "POST",
    credentials: "include",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ ...profile, finalizeProfile: finalizeProfile ? 1 : 0 }),
  });
  const { body } = await readScoutApiJson<{ profile: FreelancerProfileData }>(response);
  if (!response.ok || !body.ok || !body.data?.profile) {
    throw new Error(body.message || "Unable to save profile.");
  }
  return body.data.profile;
}
