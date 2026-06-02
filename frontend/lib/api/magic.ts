import { API_URL } from "./client";
import type { CompanyMagicDashboard } from "./types";

export async function getCompanyMagicDashboard(token: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_magic.dashboard_by_token?token=${encodeURIComponent(token)}`, {
    method: "GET",
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string; data?: CompanyMagicDashboard } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok || !body.data) {
    throw new Error(body.message || "Unable to load special dashboard.");
  }
  return body.data;
}

export async function replicatePostingFromMagic(token: string, collegeEmails: string[]) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_magic.replicate_posting_from_magic`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token, collegeEmails }),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string; data?: { jobId: string; invitesSent: number } } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) throw new Error(body.message || "Replication failed.");
  return body;
}

export async function getHrMagicDashboard(token: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.hr_magic.hr_dashboard_by_token?token=${encodeURIComponent(token)}`, {
    method: "GET",
    credentials: "include",
  });
  const raw = (await response.json()) as {
    message?: {
      ok: boolean;
      message?: string;
      data?: {
        hrEmail: string;
        hrName: string;
        campusDriveTitle: string;
        tpoName: string;
        collegeName: string;
        posting: { id: string; title: string; description: string; branch: string; batch: string } | null;
        applicants: Array<{ studentName: string; studentEmail: string; branch: string; batch: string }>;
      };
    };
  };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok || !body.data) throw new Error(body.message || "Unable to load HR dashboard.");
  return body.data;
}

export async function listPublicBlogPosts() {
  const response = await fetch(`${API_URL}/api/method/scout.api.public.community.list_public_blog_posts`, {
    method: "GET",
    credentials: "include",
  });
  const raw = (await response.json()) as {
    message?: { ok: boolean; data?: { posts: Array<{ id: string; title: string; authorName: string; excerpt: string; body: string; publishedAt: string }> } };
  };
  const body = raw?.message || { ok: false };
  if (!response.ok || !body.ok || !body.data) throw new Error("Unable to load blog.");
  return body.data.posts;
}

