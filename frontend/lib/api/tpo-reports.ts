import { refreshScoutAccessToken } from "./auth";
import { API_URL, readScoutApiJson, scoutJsonHeaders } from "./client";
import type {
  TpoApplicationReportRow,
  TpoJobSelectionReportRow,
  TpoListedStudent,
  TpoRecruitmentByJob,
  TpoRecruitmentReportRow,
  TpoReportJobOption,
  TpoReportKey,
  TpoReportPostingOption,
  TpoTestScoreReportRow,
  TpoTrainingReportRow,
} from "./types";

export type TpoReportPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  reportTruncated?: boolean;
};

export const TPO_REPORT_PAGE_SIZE = 100;

async function fetchReport<T>(reportKey: TpoReportKey, params?: Record<string, string>) {
  let triedRefresh = false;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const qs = new URLSearchParams({ reportKey, ...params });
    const response = await fetch(`${API_URL}/api/method/scout.api.tpo.get_tpo_report?${qs.toString()}`, {
      method: "GET",
      headers: scoutJsonHeaders(),
      credentials: "include",
    });
    const { body } = await readScoutApiJson<T>(response);
    const sessionExpired = response.status === 401 || response.status === 403;
    if (sessionExpired && !triedRefresh) {
      triedRefresh = true;
      if (await refreshScoutAccessToken()) {
        continue;
      }
    }
    if (!response.ok || !body.ok) {
      const message =
        body.message ||
        (sessionExpired ? "Session expired. Please log out and sign in again." : "Unable to load report.");
      throw new Error(message);
    }
    return body.data as T;
  }
  throw new Error("Unable to load report.");
}

export function downloadTpoReportUrl(reportKey: TpoReportKey, params?: Record<string, string>, sync = false) {
  const qs = new URLSearchParams({ reportKey, ...params });
  if (sync) qs.set("sync", "1");
  // Bearer is injected server-side by the /frappe proxy from the HttpOnly cookie.
  return `${API_URL}/api/method/scout.api.tpo.download_tpo_report?${qs.toString()}`;
}

export async function enqueueTpoReportExport(reportKey: TpoReportKey, params?: Record<string, string>) {
  const qs = new URLSearchParams({ reportKey, ...params });
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.enqueue_tpo_report_export?${qs.toString()}`, {
    method: "POST",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body } = await readScoutApiJson<{ exportId: string; status: string }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to start export.");
  }
  return body.data as { exportId: string; status: string };
}

export async function getTpoReportExportStatus(exportId: string) {
  const qs = new URLSearchParams({ exportId });
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.get_tpo_report_export_status?${qs.toString()}`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body } = await readScoutApiJson<{
    status: string;
    message?: string;
    filename?: string;
    rowCount?: number;
    downloadUrl?: string;
  }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to check export status.");
  }
  return body.data!;
}

function pageParams(page: number, pageSize = TPO_REPORT_PAGE_SIZE): Record<string, string> {
  return { page: String(page), pageSize: String(pageSize) };
}

export async function listTpoReportJobs() {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.list_tpo_report_jobs`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body } = await readScoutApiJson<{ jobs?: TpoReportJobOption[]; postings?: TpoReportPostingOption[] }>(
    response,
  );
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to load filter options.");
  }
  return {
    jobs: body.data?.jobs || [],
    postings: body.data?.postings || [],
  };
}

type ApplicationReportResult = {
  rows: TpoApplicationReportRow[];
  summary: { total: number; uniqueStudents?: number };
  total: number;
  page: number;
  totalPages: number;
  reportTruncated?: boolean;
};

export async function fetchApplicationsReport(page = 1) {
  return fetchReport<ApplicationReportResult>("applications", pageParams(page));
}

type TrainingReportResult = {
  rows: TpoTrainingReportRow[];
  summary: { fullyCompletedOnPage?: number; fullyCompleted?: number; totalStudents: number };
  page: number;
  totalPages: number;
  total: number;
  reportTruncated?: boolean;
};

export async function fetchTrainingAttendanceReport(page = 1) {
  return fetchReport<TrainingReportResult>("training-attendance", pageParams(page));
}

type TestScoreReportResult = {
  rows: TpoTestScoreReportRow[];
  summary: { total: number };
  total: number;
  page: number;
  totalPages: number;
  reportTruncated?: boolean;
};

export async function fetchTestScoresReport(page = 1) {
  return fetchReport<TestScoreReportResult>("test-scores", pageParams(page));
}

type RecruitmentStatusReportResult = {
  rows: TpoRecruitmentReportRow[];
  byJob: TpoRecruitmentByJob[];
  summary: { totalApplications: number };
  total: number;
  page: number;
  totalPages: number;
  reportTruncated?: boolean;
};

export async function fetchRecruitmentStatusReport(page = 1) {
  return fetchReport<RecruitmentStatusReportResult>("recruitment-status", pageParams(page));
}

type JobSelectionReportResult = {
  rows: TpoJobSelectionReportRow[];
  summary: { selectedCount: number };
  job: { jobTitle: string };
  page: number;
  totalPages: number;
  reportTruncated?: boolean;
};

export async function fetchJobSelectionsReport(jobId: string, page = 1) {
  return fetchReport<JobSelectionReportResult>("job-selections", { jobId, ...pageParams(page) });
}

type EligibilityReportFilters = {
  branch?: string;
  batch?: string;
  state?: string;
  country?: string;
  areaOfStudy?: string;
  postingId?: string;
  page?: number;
};

type EligibilityReportResult = {
  rows: TpoListedStudent[];
  summary: { total: number; scopeTotal?: number };
  total: number;
  page: number;
  totalPages: number;
  reportTruncated?: boolean;
};

export async function fetchEligibilityStudentsReport(filters: EligibilityReportFilters = {}) {
  const { page = 1, ...rest } = filters;
  const params: Record<string, string> = pageParams(page);
  for (const [k, v] of Object.entries(rest)) {
    if (v) params[k] = String(v);
  }
  return fetchReport<EligibilityReportResult>("eligibility-students", params);
}
