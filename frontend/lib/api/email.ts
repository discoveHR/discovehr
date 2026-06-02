import { API_URL, messageFromFrappeBody, readScoutApiJson, scoutJsonHeaders } from "./client";

export type MailerConfig = {
  provider: "postmark" | "frappe" | "none";
  configured: boolean;
  fromEmail?: string;
  hint?: string;
};

export type SendTestEmailResult = {
  sentTo: string;
  provider?: string;
};

export async function getMailerConfig(): Promise<MailerConfig> {
  const response = await fetch(`${API_URL}/api/method/scout.api.email_api.get_mailer_config`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const { body, raw } = await readScoutApiJson<MailerConfig>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Unable to load email configuration.");
  }
  return (body.data ?? body) as MailerConfig;
}

export async function sendTestEmail(toEmail?: string): Promise<SendTestEmailResult> {
  const response = await fetch(`${API_URL}/api/method/scout.api.email_api.send_test_email`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify(toEmail?.trim() ? { toEmail: toEmail.trim() } : {}),
  });
  const { body, raw } = await readScoutApiJson<SendTestEmailResult>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Test email could not be sent.");
  }
  return (body.data ?? {}) as SendTestEmailResult;
}
