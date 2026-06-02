import { API_URL, messageFromFrappeBody, readScoutApiJson, scoutJsonHeaders } from "./client";
import type { CompanyCoinPack, CompanyCreditWallet } from "./types";

export async function getCompanyCreditWallet() {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.get_company_credit_wallet`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<CompanyCreditWallet>(response);
  if (!response.ok || !body.ok || !body.data) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to load wallet.");
  }
  return body.data;
}

export async function listCompanyCoinPacks() {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.list_company_coin_packs`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<{ packs: CompanyCoinPack[]; coinPriceInr: number }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to load packs.");
  }
  return body.data as { packs: CompanyCoinPack[]; coinPriceInr: number };
}

export async function createCompanyCoinPurchaseOrder(payload: { packId?: string; customCoins?: number }) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.create_company_coin_purchase_order`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Failed to create order.");
  }
  return body.data as {
    paymentOrderId: string;
    razorpayOrderId: string;
    amountInr: number;
    amountPaise: number;
    keyId: string;
    devBypass: boolean;
    coins: number;
  };
}

export async function verifyCompanyCoinPurchase(payload: {
  paymentOrderId: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
}) {
  const response = await fetch(`${API_URL}/api/method/scout.api.company_api.verify_company_coin_purchase`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<{ balanceCredits: number }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Verification failed.");
  }
  return { message: body.message || "Coins added.", balanceCredits: body.data?.balanceCredits };
}
