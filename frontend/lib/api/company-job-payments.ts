import { API_URL, readScoutApiJson, scoutJsonHeaders } from "./client";
import type { JobItem } from "./types";

type RazorpayOrderData = {
  paymentOrderId: string;
  razorpayOrderId: string;
  amountInr: number;
  amountPaise: number;
  currency: string;
  keyId: string;
  devBypass: boolean;
};

type JobPaymentVerifyPayload = {
  paymentOrderId: string;
  jobId: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
};

async function postJobPayment(method: string, body: object): Promise<{ ok: boolean; data?: unknown; message?: string }> {
  const response = await fetch(
    `${API_URL}/api/method/scout.api.company.${method}`,
    {
      method: "POST",
      headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify(body),
    },
  );
  const { body: parsed } = await readScoutApiJson(response);
  if (!response.ok || !parsed.ok) {
    throw new Error(parsed.message || "Request failed.");
  }
  return parsed;
}

export async function createJobExtensionOrder(jobId: string): Promise<RazorpayOrderData> {
  const res = await postJobPayment("create_job_extension_order", { jobId });
  return res.data as RazorpayOrderData;
}

export async function verifyJobExtension(payload: JobPaymentVerifyPayload): Promise<{ message: string; job: JobItem }> {
  const res = await postJobPayment("verify_job_extension", payload);
  return res.data as { message: string; job: JobItem };
}

export async function createJobBoostOrder(jobId: string): Promise<RazorpayOrderData> {
  const res = await postJobPayment("create_job_boost_order", { jobId });
  return res.data as RazorpayOrderData;
}

export async function verifyJobBoost(payload: JobPaymentVerifyPayload): Promise<{ message: string; job: JobItem }> {
  const res = await postJobPayment("verify_job_boost", payload);
  return res.data as { message: string; job: JobItem };
}
