import type { CompanyLoginResponse } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "/frappe";

/** Turn Frappe `/files/...` or `/private/files/...` paths into URLs the Next.js proxy can serve. */
export function frappeAssetUrl(filePath: string): string {
  const path = (filePath || "").trim();
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = API_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export type FrappeEnvelope = {
  message?: CompanyLoginResponse;
  ok?: boolean;
  data?: CompanyLoginResponse["data"];
};

export type ScoutApiEnvelope<T = unknown> = {
  ok: boolean;
  message?: string;
  data?: T;
};

/** Normalize Frappe method JSON into `{ ok, message, data }` (handles string errors and top-level payloads). */
export function unwrapScoutApiBody<T = unknown>(raw: Record<string, unknown>): ScoutApiEnvelope<T> {
  const nested = raw.message;
  if (nested && typeof nested === "object" && nested !== null && "ok" in nested) {
    return nested as ScoutApiEnvelope<T>;
  }
  if (typeof raw.ok === "boolean") {
    return {
      ok: raw.ok,
      message: typeof raw.message === "string" ? raw.message : undefined,
      data: raw.data as T | undefined,
    };
  }
  if (typeof nested === "string" && nested.trim()) {
    return { ok: false, message: nested.trim() };
  }
  const parsed = parseFrappeResponse(raw as FrappeEnvelope & Record<string, unknown>);
  return {
    ok: parsed.ok,
    message: parsed.message,
    data: parsed.data as T | undefined,
  };
}

export async function readScoutApiJson<T = unknown>(
  response: Response,
): Promise<{ body: ScoutApiEnvelope<T>; raw: Record<string, unknown> }> {
  const text = await response.text();
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    const trimmed = text.trim().slice(0, 80).toLowerCase();
    const looksLikeHtml = trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
    if (looksLikeHtml || response.status === 0) {
      throw new Error(
        "Cannot reach the API. Start Frappe in WSL (cd ~/frappe-bench && bench start), then retry.",
      );
    }
    throw new Error(
      !response.ok
        ? `Request failed (HTTP ${response.status}).`
        : "Invalid response from server.",
    );
  }
  return { body: unwrapScoutApiBody<T>(raw), raw };
}

export function scoutJsonHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Accept: "application/json",
    ...frappeCsrfHeaders(),
    ...extra,
  };
}

export function parseFrappeResponse(body: FrappeEnvelope & Record<string, unknown>): CompanyLoginResponse {
  if (body?.message && typeof body.message === "object" && body.message !== null && "ok" in body.message) {
    return body.message as CompanyLoginResponse;
  }

  if (typeof body.ok === "boolean") {
    return {
      ok: body.ok,
      message: body.ok ? "Success" : "Request failed",
      data: body.data,
    };
  }

  const fallback = messageFromFrappeBody(body);
  if (fallback) {
    return { ok: false, message: fallback };
  }

  return {
    ok: false,
    message: "Invalid API response.",
  };
}

/** Frappe sometimes returns errors as top-level `exception` / `_server_messages` instead of `message`. */
export function messageFromFrappeBody(raw: Record<string, unknown>): string | undefined {
  const msg = raw.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (typeof msg === "object" && msg !== null && "message" in msg && typeof (msg as { message?: string }).message === "string") {
    return (msg as { message: string }).message;
  }
  const exc = raw.exception ?? raw.exc;
  if (typeof exc === "string" && exc.trim()) {
    if (exc.includes("AuthenticationError")) {
      return "Invalid email or password.";
    }
    const line = exc.split("\n").find((l) => l.trim());
    return line || exc;
  }
  try {
    const sm = raw._server_messages;
    if (typeof sm === "string") {
      const parsed = JSON.parse(sm) as unknown;
      if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === "object" && parsed[0] !== null && "message" in parsed[0]) {
        const m = (parsed[0] as { message?: string }).message;
        if (typeof m === "string") return m.replace(/<[^>]+>/g, "").trim();
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  const parts = document.cookie.split("; ");
  for (const p of parts) {
    if (p.startsWith(prefix)) return decodeURIComponent(p.slice(prefix.length));
  }
  return undefined;
}

/** CSRF only — use for guest login/register. */
export function frappeGuestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const csrf = readCookie("csrf_token");
  if (csrf) headers["X-Frappe-CSRF-Token"] = csrf;
  return headers;
}

/** CSRF when present — Bearer is injected server-side by the /frappe proxy from the HttpOnly cookie. */
export function frappeCsrfHeaders(): Record<string, string> {
  return frappeGuestHeaders();
}

export function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const text = error.message.toLowerCase();
  return (
    text.includes("failed to fetch") ||
    text.includes("networkerror") ||
    text.includes("load failed") ||
    text.includes("timeout")
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Guest GET so Frappe sets `sid` / `csrf_token` cookies before JSON POST (reduces CSRF and session-related 500s). */
export async function frappeGuestPreflight(): Promise<void> {
  try {
    let r = await fetch(`${API_URL}/api/method/frappe.ping`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (r.status === 404) {
      r = await fetch(`${API_URL}/api/method/ping`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
    }
    void r;
  } catch {
    /* login POST may still succeed */
  }
}

