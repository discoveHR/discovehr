import { API_URL, messageFromFrappeBody, readScoutApiJson, scoutJsonHeaders } from "./client";
import type { StudentWalletData } from "./types";

async function parse<T>(response: Response): Promise<T> {
  const { body, raw } = await readScoutApiJson<T>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Request failed.");
  }
  return body.data as T;
}

export async function getStudentWallet(): Promise<StudentWalletData> {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.get_wallet`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  return parse<StudentWalletData>(response);
}

export type CoinPurchaseOrder = {
  paymentOrderId: string;
  razorpayOrderId: string;
  amountInr: number;
  amountPaise: number;
  currency: string;
  keyId: string;
  devBypass: boolean;
};

export async function createCoinPurchaseOrder(packId: string): Promise<CoinPurchaseOrder> {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.create_coin_purchase_order`, {
    method: "POST",
    headers: scoutJsonHeaders(),
    credentials: "include",
    body: JSON.stringify({ packId }),
  });
  return parse<CoinPurchaseOrder>(response);
}

export type VerifyCoinPurchaseResult = { coinBalance: number };

export async function verifyCoinPurchase(payload: {
  paymentOrderId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}): Promise<VerifyCoinPurchaseResult> {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.verify_coin_purchase`, {
    method: "POST",
    headers: scoutJsonHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return parse<VerifyCoinPurchaseResult>(response);
}

export type UpgradeProResult = {
  isPro: boolean;
  insufficientCoins?: boolean;
  required?: number;
  balance?: number;
};

export async function upgradeStudentToPro(): Promise<UpgradeProResult & { message?: string }> {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.upgrade_to_pro`, {
    method: "POST",
    headers: scoutJsonHeaders(),
    credentials: "include",
    body: JSON.stringify({}),
  });
  const { body, raw } = await readScoutApiJson<UpgradeProResult>(response);
  if (!response.ok || !body.ok) {
    const err = new Error(body.message || messageFromFrappeBody(raw) || "Upgrade failed.");
    (err as Error & { data?: UpgradeProResult }).data = body.data;
    throw err;
  }
  return { ...(body.data as UpgradeProResult), message: body.message };
}
