import { API_URL, parseFrappeResponse, scoutJsonHeaders, type FrappeEnvelope } from "./client";
import type { PaginationMeta } from "./types";

export type ReferralJobOption = {
  jobId: string;
  title: string;
  companyName: string;
};

export type FreelancerReferralRow = {
  referralId: string;
  jobId: string;
  jobTitle: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  status: "Pending" | "Contacted" | "Applied" | "Rejected";
  notes: string;
  uploadedAt: string;
};

export type AdminReferralRow = FreelancerReferralRow & {
  referredByUser: string;
  referredByName: string;
};

export type CsvCandidate = {
  name: string;
  email: string;
  phone: string;
};

export async function listOpenJobsForReferral(): Promise<ReferralJobOption[]> {
  const response = await fetch(`${API_URL}/api/method/scout.api.freelancer.referrals.list_open_jobs_for_referral`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) throw new Error(body.message || "Failed to load jobs.");
  return ((body.data as { jobs?: ReferralJobOption[] })?.jobs ?? []);
}

export async function submitCsvReferrals(jobId: string, candidates: CsvCandidate[]): Promise<{ created: number; skipped: number; errors: string[] }> {
  const response = await fetch(`${API_URL}/api/method/scout.api.freelancer.referrals.submit_csv_referrals`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify({ jobId, candidates }),
  });
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) throw new Error(body.message || "Upload failed.");
  return body.data as unknown as { created: number; skipped: number; errors: string[] };
}

export async function listMyReferrals(params?: { page?: number; pageSize?: number }): Promise<{ referrals: FreelancerReferralRow[]; pagination: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  const qs = query.toString();
  const response = await fetch(
    `${API_URL}/api/method/scout.api.freelancer.referrals.list_my_referrals${qs ? `?${qs}` : ""}`,
    { method: "GET", headers: scoutJsonHeaders(), credentials: "include" },
  );
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) throw new Error(body.message || "Failed to load referrals.");
  const d = body.data as { referrals?: FreelancerReferralRow[]; pagination?: PaginationMeta };
  return { referrals: d?.referrals ?? [], pagination: d?.pagination ?? { total: 0, page: 1, pageSize: 50, totalPages: 1 } };
}

export async function listAllReferrals(params?: {
  page?: number;
  pageSize?: number;
  jobId?: string;
  freelancerUser?: string;
  status?: string;
}): Promise<{ referrals: AdminReferralRow[]; pagination: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.jobId) query.set("jobId", params.jobId);
  if (params?.freelancerUser) query.set("freelancerUser", params.freelancerUser);
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  const response = await fetch(
    `${API_URL}/api/method/scout.api.admin.referrals.list_all_referrals${qs ? `?${qs}` : ""}`,
    { method: "GET", headers: scoutJsonHeaders(), credentials: "include" },
  );
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) throw new Error(body.message || "Failed to load referrals.");
  const d = body.data as { referrals?: AdminReferralRow[]; pagination?: PaginationMeta };
  return { referrals: d?.referrals ?? [], pagination: d?.pagination ?? { total: 0, page: 1, pageSize: 50, totalPages: 1 } };
}

export async function updateReferralStatus(referralId: string, status: string, notes?: string): Promise<string> {
  const response = await fetch(`${API_URL}/api/method/scout.api.admin.referrals.update_referral_status`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify({ referralId, status, notes }),
  });
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) throw new Error(body.message || "Failed to update status.");
  return body.message || "Updated.";
}

export async function listReferralRecruiters(): Promise<{ userId: string; name: string }[]> {
  const response = await fetch(`${API_URL}/api/method/scout.api.admin.referrals.list_referral_recruiters`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) throw new Error(body.message || "Failed to load recruiters.");
  return ((body.data as { recruiters?: { userId: string; name: string }[] })?.recruiters ?? []);
}

export async function exportMyReferrals(jobId?: string): Promise<FreelancerReferralRow[]> {
  const query = new URLSearchParams();
  if (jobId) query.set("jobId", jobId);
  const qs = query.toString();
  const response = await fetch(
    `${API_URL}/api/method/scout.api.freelancer.referrals.export_my_referrals${qs ? `?${qs}` : ""}`,
    { method: "GET", headers: scoutJsonHeaders(), credentials: "include" },
  );
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) throw new Error(body.message || "Export failed.");
  const d = body.data as { referrals?: FreelancerReferralRow[] };
  return d?.referrals ?? [];
}

export async function exportAllReferrals(params?: {
  jobId?: string;
  freelancerUser?: string;
  status?: string;
}): Promise<AdminReferralRow[]> {
  const query = new URLSearchParams();
  if (params?.jobId) query.set("jobId", params.jobId);
  if (params?.freelancerUser) query.set("freelancerUser", params.freelancerUser);
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  const response = await fetch(
    `${API_URL}/api/method/scout.api.admin.referrals.export_all_referrals${qs ? `?${qs}` : ""}`,
    { method: "GET", headers: scoutJsonHeaders(), credentials: "include" },
  );
  const rawBody = (await response.json()) as FrappeEnvelope;
  const body = parseFrappeResponse(rawBody);
  if (!response.ok || !body.ok) throw new Error(body.message || "Export failed.");
  const d = body.data as { referrals?: AdminReferralRow[] };
  return d?.referrals ?? [];
}

export function downloadCsvBlob(rows: string[][], filename: string) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseCsvCandidates(csvText: string): { candidates: CsvCandidate[]; errors: string[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { candidates: [], errors: ["CSV file is empty."] };

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));
  const nameIdx = header.findIndex((h) => h === "name" || h === "candidatename" || h === "fullname");
  const emailIdx = header.findIndex((h) => h === "email" || h === "candidateemail");
  const phoneIdx = header.findIndex((h) => h === "phone" || h === "candidatephone" || h === "mobile");

  if (nameIdx === -1 || emailIdx === -1) {
    return { candidates: [], errors: ['CSV must have "name" and "email" columns.'] };
  }

  const candidates: CsvCandidate[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const name = (cols[nameIdx] || "").trim();
    const email = (cols[emailIdx] || "").trim().toLowerCase();
    const phone = phoneIdx !== -1 ? (cols[phoneIdx] || "").trim() : "";

    if (!name || !email) {
      errors.push(`Row ${i + 1}: missing name or email.`);
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Row ${i + 1}: invalid email "${email}".`);
      continue;
    }
    candidates.push({ name, email, phone });
  }

  return { candidates, errors };
}
