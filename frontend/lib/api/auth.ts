import {
  API_URL,
  frappeGuestHeaders,
  frappeGuestPreflight,
  isTransientNetworkError,
  messageFromFrappeBody,
  parseFrappeResponse,
  readScoutApiJson,
  scoutJsonHeaders,
  sleep,
  type FrappeEnvelope,
} from "./client";
import type { CompanyLoginPayload, RegisterPayload } from "./types";

/**
 * Login via the Next.js `/api/auth/login` route, which calls Frappe server-to-server,
 * then stores tokens as HttpOnly cookies (never exposed to client JS).
 */
export async function companyLogin(payload: CompanyLoginPayload) {
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const raw = (await response.json()) as Record<string, unknown>;
      const ok = raw.ok === true;
      const message = typeof raw.message === "string" ? raw.message : undefined;

      if (!response.ok || !ok) {
        if (response.status >= 500 && attempt < maxAttempts) {
          await sleep(700 * attempt);
          continue;
        }
        throw new Error(message || "Unable to login.");
      }

      return raw.data as { user: unknown; roles: string[] };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unable to login.");
      if (attempt < maxAttempts && isTransientNetworkError(error)) {
        await sleep(700 * attempt);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error("Unable to login.");
}

/**
 * Request a new access token using the stored HttpOnly refresh cookie.
 * The Next.js route reads the cookie server-side and issues new cookies.
 */
export async function refreshScoutAccessToken(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "include",
    });

    const raw = (await response.json()) as Record<string, unknown>;
    return response.ok && raw.ok === true;
  } catch {
    return false;
  }
}

export async function getAuthMe() {
  const response = await fetch(`${API_URL}/api/method/scout.api.auth.me`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });

  const { body, raw } = await readScoutApiJson<{ user?: unknown; roles?: string[] }>(response);
  if (!response.ok || !body.ok) {
    throw new Error(body.message || messageFromFrappeBody(raw) || "Not logged in.");
  }
  return body.data;
}

/** Ensure a valid access token exists by trying a refresh (tokens are HttpOnly — can't read directly). */
export async function ensureScoutAccessToken(): Promise<boolean> {
  return refreshScoutAccessToken();
}

export async function registerUser(payload: RegisterPayload) {
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await frappeGuestPreflight();
      const response = await fetch(`${API_URL}/api/method/scout.api.auth.register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...frappeGuestHeaders() },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const text = await response.text();
      let rawBody: FrappeEnvelope & Record<string, unknown>;
      try {
        rawBody = JSON.parse(text) as FrappeEnvelope & Record<string, unknown>;
      } catch {
        const trimmed = text.trim().slice(0, 80).toLowerCase();
        const looksLikeHtml = trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
        if (!response.ok && (looksLikeHtml || response.status === 0)) {
          throw new Error(
            `Cannot reach signup API (${response.status}). Start Frappe on port 8000 (WSL: cd ~/frappe-bench && bench start), then retry.`,
          );
        }
        throw new Error(!response.ok ? `Cannot reach signup API (${response.status}).` : "Invalid response from server.");
      }

      const body = parseFrappeResponse(rawBody);
      if (!response.ok || !body.ok) {
        const fallback = messageFromFrappeBody(rawBody);
        const message = body.message || fallback || "Unable to register.";
        throw new Error(message);
      }
      return body.message;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unable to register.");
      if (attempt < maxAttempts && isTransientNetworkError(error)) {
        await sleep(700 * attempt);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error("Unable to register.");
}


export async function acceptStudentInvite(payload: { token: string; fullName: string; password: string }) {
  const response = await fetch(`${API_URL}/api/method/scout.api.auth.accept_student_invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...frappeGuestHeaders() },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const text = await response.text();
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(!response.ok ? `Unable to accept invite (HTTP ${response.status}).` : "Invalid response from server.");
  }
  const nested = raw.message;
  const body =
    nested && typeof nested === "object" && nested !== null && "ok" in nested
      ? (nested as { ok: boolean; message?: string })
      : typeof nested === "string"
        ? { ok: false, message: nested }
        : { ok: false, message: messageFromFrappeBody(raw) || "Invalid API response." };
  if (!response.ok || !body.ok) {
    throw new Error(body.message || "Unable to accept invite.");
  }
  return body.message || "Invite accepted successfully.";
}

