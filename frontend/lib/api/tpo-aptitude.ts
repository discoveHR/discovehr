import {
  API_URL,
  frappeGuestPreflight,
  messageFromFrappeBody,
  readScoutApiJson,
  scoutJsonHeaders,
} from "./client";
import type { AptitudeAssessment, AptitudeAssignment } from "./aptitude";

export type TpoAptitudePaymentOrder = {
  paymentOrderId: string;
  razorpayOrderId: string;
  amountInr: number;
  amountPaise: number;
  currency: string;
  keyId: string;
  devBypass: boolean;
  feeInr: number;
  draft: {
    title: string;
    description?: string;
    durationMinutes: number;
  };
};

async function callTpoAptitude<T>(path: string, init?: RequestInit): Promise<T> {
  if (init?.method === "POST") {
    await frappeGuestPreflight();
  }
  const response = await fetch(`${API_URL}/api/method/${path}`, {
    ...init,
    headers: {
      ...scoutJsonHeaders(),
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<T>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Request failed.");
  }
  return (body.data ?? body) as T;
}

export async function createTpoAptitudePaymentOrder(payload: {
  title: string;
  description?: string;
  durationMinutes: number;
  dueAt?: string;
}) {
  return callTpoAptitude<TpoAptitudePaymentOrder>("scout.api.tpo.create_tpo_aptitude_payment_order", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyTpoAptitudePayment(payload: {
  paymentOrderId: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
}) {
  const response = await fetch(`${API_URL}/api/method/scout.api.tpo.verify_tpo_aptitude_payment`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<{ assessment: AptitudeAssessment }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Payment verification failed.");
  }
  return {
    message: body.message || "Aptitude test created.",
    assessment: (body.data as { assessment?: AptitudeAssessment })?.assessment,
  };
}

export async function listTpoAptitudeAssessments() {
  const data = await callTpoAptitude<{ assessments: AptitudeAssessment[] }>(
    "scout.api.tpo.list_tpo_aptitude_assessments",
    { method: "GET" },
  );
  return data.assessments || [];
}

export async function assignTpoAptitudeToStudents(payload: {
  assessmentId: string;
  studentIds?: string[];
  assignAllCollegeStudents?: boolean;
  dueAt?: string;
}) {
  return callTpoAptitude<{ created: AptitudeAssignment[]; skipped: { email: string; reason: string }[] }>(
    "scout.api.tpo.assign_tpo_aptitude_to_students",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export async function listTpoAptitudeAssignments(assessmentId?: string) {
  const qs = assessmentId ? `?assessmentId=${encodeURIComponent(assessmentId)}` : "";
  const data = await callTpoAptitude<{ assignments: AptitudeAssignment[] }>(
    `scout.api.tpo.list_tpo_aptitude_assignments${qs}`,
    { method: "GET" },
  );
  return data.assignments || [];
}
