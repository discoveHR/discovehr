import {
  API_URL,
  readScoutApiJson,
  scoutJsonHeaders,
  type ScoutApiEnvelope,
} from "./client";

export type InstitutionTpo = {
  tpoUser: string;
  tpoName: string;
  email: string;
  collegeName: string;
  state: string;
  country: string;
  collegeLocation: string;
  websiteLink: string;
  linkedinUrl: string;
  approvalStatus: string;
  isCurrent: boolean;
};

export type InstitutionCollege = {
  collegeName: string;
  country: string;
  state: string;
  district: string;
  collegeLocation: string;
  address: string;
  pincode: string;
  websiteLink: string;
  linkedinUrl: string;
  socialMediaLink: string;
  approvalStatus: string;
};

export type InstitutionBatchStat = {
  batch: string;
  studentCount: number;
};

export type InstitutionBranchStat = {
  branch: string;
  studentCount: number;
};

export type InstitutionOverview = {
  college: InstitutionCollege;
  tpos: InstitutionTpo[];
  batches: InstitutionBatchStat[];
  branches: InstitutionBranchStat[];
  totalStudents: number;
};

async function requireInstitution<T>(response: Response, fallback: string): Promise<ScoutApiEnvelope<T>> {
  const { body, raw } = await readScoutApiJson<T>(response);
  if (!response.ok || !body.ok) {
    const msg =
      body.message ||
      (response.status === 401 || response.status === 403
        ? "Session expired. Please log out and sign in again."
        : response.status >= 500
          ? `${fallback} (HTTP ${response.status}).`
          : fallback);
    throw new Error(msg);
  }
  return body;
}

export async function getInstitutionOverview(): Promise<InstitutionOverview> {
  const response = await fetch(`${API_URL}/api/method/scout.api.institution.get_institution_overview`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const body = await requireInstitution<InstitutionOverview>(response, "Unable to load institution overview.");
  if (!body.data) throw new Error("No institution data returned.");
  return body.data;
}
