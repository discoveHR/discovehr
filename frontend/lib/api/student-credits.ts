import { API_URL, messageFromFrappeBody, readScoutApiJson, scoutJsonHeaders } from "./client";

async function parse<T>(response: Response): Promise<T> {
  const { body, raw } = await readScoutApiJson<T>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Request failed.");
  }
  return body.data as T;
}

export type CreditTransaction = {
  id: string;
  type: string;
  credits: number;
  note: string;
  at: string;
};

export async function getStudentCreditWallet() {
  const response = await fetch(`${API_URL}/api/method/scout.api.student.get_student_credit_wallet`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  return parse<{ balanceCredits: number; transactions: CreditTransaction[] }>(response);
}
