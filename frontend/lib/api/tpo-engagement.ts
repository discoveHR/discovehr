import { API_URL, frappeCsrfHeaders } from "./client";

async function parse<T>(response: Response): Promise<T> {
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string; data?: T } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) throw new Error(body.message || "Request failed.");
  return body.data as T;
}

export type CreditPack = { id: string; credits: number; priceInr: number };

export async function listCreditPacksTpo() {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.list_credit_packs_tpo`, {
    method: "GET",
    headers: { Accept: "application/json", ...frappeCsrfHeaders() },
    credentials: "include",
  });
  return parse<{ packs: CreditPack[] }>(response);
}

export async function purchaseStudentCreditsOrder(packId: string, studentEmail: string) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.purchase_student_credits_order`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...frappeCsrfHeaders() },
    body: JSON.stringify({ packId, studentEmail }),
    credentials: "include",
  });
  return parse<{
    paymentOrderId: string;
    razorpayOrderId: string;
    amountInr: number;
    amountPaise: number;
    keyId: string;
    devBypass: boolean;
  }>(response);
}

export async function purchaseStudentCreditsVerify(payload: {
  paymentOrderId: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
}) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.purchase_student_credits_verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...frappeCsrfHeaders() },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) throw new Error(body.message || "Verification failed.");
  return body.message || "Credits granted.";
}

export async function inviteHrPartner(payload: {
  hrEmail: string;
  hrName?: string;
  campusDriveTitle?: string;
  postingId?: string;
}) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.invite_hr_partner`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...frappeCsrfHeaders() },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const raw = (await response.json()) as {
    message?: { ok: boolean; message?: string; data?: { inviteId: string; magicLink: string; frontendPath: string } };
  };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) throw new Error(body.message || "Request failed.");
  return { ...(body.data as { inviteId: string; magicLink: string; frontendPath: string }), message: body.message || "" };
}

export async function listHrInvites() {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.list_hr_invites`, {
    method: "GET",
    headers: { Accept: "application/json", ...frappeCsrfHeaders() },
    credentials: "include",
  });
  return parse<{
    invites: Array<{
      id: string;
      hrEmail: string;
      hrName: string;
      campusDriveTitle: string;
      expiresAt: string;
      isActive: boolean;
    }>;
  }>(response);
}

export type CommunityPost = {
  id: string;
  title: string;
  authorName: string;
  tags: string;
  isPublished: boolean;
  isPublicBlog: boolean;
  createdAt: string;
};

export async function listTpoCommunityPosts() {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.list_tpo_community_posts`, {
    method: "GET",
    headers: { Accept: "application/json", ...frappeCsrfHeaders() },
    credentials: "include",
  });
  return parse<{ posts: CommunityPost[] }>(response);
}

export async function upsertTpoCommunityPost(payload: {
  postId?: string;
  title: string;
  body: string;
  authorName?: string;
  tags?: string;
  isPublished?: boolean;
  isPublicBlog?: boolean;
}) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.upsert_tpo_community_post`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...frappeCsrfHeaders() },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const raw = (await response.json()) as { message?: { ok: boolean; message?: string; data?: { post: CommunityPost & { body: string } } } };
  const body = raw?.message || { ok: false, message: "Invalid API response." };
  if (!response.ok || !body.ok) throw new Error(body.message || "Save failed.");
  return body;
}
