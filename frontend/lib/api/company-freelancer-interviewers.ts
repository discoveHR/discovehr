import { API_URL, readScoutApiJson, scoutJsonHeaders } from "./client";

export type CompanyFreelancerInterviewerSummary = {
  profileId: string;
  freelancerUser: string;
  fullName: string;
  email: string;
  phone: string;
  primaryService: string;
  skills: string;
  yearsOfExperience: string;
  availability: string;
  professionalSummary: string;
};

export type CompanyFreelancerInterviewerDetail = CompanyFreelancerInterviewerSummary & {
  profilePhoto?: string;
  gender?: string;
  city?: string;
  state?: string;
  country?: string;
  hourlyRate?: string;
  linkedinProfile?: string;
  githubProfile?: string;
  portfolioWebsite?: string;
  workExperience?: string;
  resumeFile?: string;
  documents?: { documentType: string; description?: string; file: string }[];
  approvalStatus?: string;
};

/** Primary RPC path; fallback uses implementation module (not company_api — avoids stale bench cache). */
const LIST_METHODS = [
  "scout.api.company_freelancer_api.list_approved_freelancer_interviewers",
  "scout.api.company.freelancer_interviewers.list_approved_freelancer_interviewers",
] as const;
const DETAIL_METHODS = [
  "scout.api.company_freelancer_api.get_freelancer_interviewer_detail",
  "scout.api.company.freelancer_interviewers.get_freelancer_interviewer_detail",
] as const;

let cachedList: CompanyFreelancerInterviewerSummary[] | null = null;
let listInflight: Promise<CompanyFreelancerInterviewerSummary[]> | null = null;
const detailCache = new Map<string, CompanyFreelancerInterviewerDetail>();
const detailInflight = new Map<string, Promise<CompanyFreelancerInterviewerDetail>>();

async function fetchFreelancerList(): Promise<CompanyFreelancerInterviewerSummary[]> {
  for (const method of LIST_METHODS) {
    const response = await fetch(`${API_URL}/api/method/${method}`, {
      method: "GET",
      headers: scoutJsonHeaders(),
      credentials: "include",
    });
    const { body } = await readScoutApiJson<{ interviewers: CompanyFreelancerInterviewerSummary[] }>(response);
    if (response.ok && body.ok) {
      return (body.data?.interviewers ?? []) as CompanyFreelancerInterviewerSummary[];
    }
    const msg = String(body.message || "");
    if (!msg.includes("has no attribute") && !msg.includes("Failed to get method")) {
      throw new Error(body.message || "Unable to load freelancer interviewers.");
    }
  }
  throw new Error("Unable to load freelancer interviewers. Restart bench: cd ~/frappe-bench && bench restart");
}

async function fetchFreelancerDetail(freelancerUser: string): Promise<CompanyFreelancerInterviewerDetail> {
  const query = new URLSearchParams({ freelancerUser });
  for (const method of DETAIL_METHODS) {
    const response = await fetch(`${API_URL}/api/method/${method}?${query.toString()}`, {
      method: "GET",
      headers: scoutJsonHeaders(),
      credentials: "include",
    });
    const { body } = await readScoutApiJson<{ interviewer: CompanyFreelancerInterviewerDetail }>(response);
    if (response.ok && body.ok && body.data?.interviewer) {
      return body.data.interviewer;
    }
    const msg = String(body.message || "");
    if (!msg.includes("has no attribute") && !msg.includes("Failed to get method")) {
      throw new Error(body.message || "Unable to load interviewer details.");
    }
  }
  throw new Error("Unable to load interviewer details. Restart bench: cd ~/frappe-bench && bench restart");
}

export function clearFreelancerInterviewerCache() {
  cachedList = null;
  listInflight = null;
  detailCache.clear();
  detailInflight.clear();
}

export async function listApprovedFreelancerInterviewers(options?: { force?: boolean }) {
  if (!options?.force && cachedList) {
    return cachedList;
  }
  if (!options?.force && listInflight) {
    return listInflight;
  }

  listInflight = (async () => {
    const interviewers = await fetchFreelancerList();
    cachedList = interviewers;
    return interviewers;
  })();

  try {
    return await listInflight;
  } catch (err) {
    cachedList = null;
    throw err;
  } finally {
    listInflight = null;
  }
}

export async function getCompanyFreelancerInterviewerDetail(freelancerUser: string) {
  const key = freelancerUser.trim();
  if (!key) {
    throw new Error("Freelancer user is required.");
  }

  const cached = detailCache.get(key);
  if (cached) {
    return cached;
  }

  const inflight = detailInflight.get(key);
  if (inflight) {
    return inflight;
  }

  const promise = (async () => {
    const interviewer = await fetchFreelancerDetail(key);
    detailCache.set(key, interviewer);
    return interviewer;
  })();

  detailInflight.set(key, promise);
  try {
    return await promise;
  } finally {
    detailInflight.delete(key);
  }
}
