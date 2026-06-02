import { NextRequest, NextResponse } from "next/server";
import {
  getFrappeBackendUrlCandidates,
  invalidateFrappeBackendUrlCache,
} from "../../../lib/frappe-backend-url";

export const runtime = "nodejs";

const PROXY_TIMEOUT_MS = 120_000;

async function proxyOnce(target: string, init: RequestInit) {
  return fetch(target, {
    ...init,
    signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
  });
}

async function proxyToFrappe(req: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join("/");
  const search = req.nextUrl.search;

  const headers = new Headers(req.headers);
  headers.delete("host");

  // Inject Bearer token from the HttpOnly cookie so Frappe can authenticate the request.
  // The cookie is inaccessible to client-side JS; only this server-side proxy reads it.
  const accessToken = req.cookies.get("scout_access_token")?.value?.trim();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  let lastError: unknown;

  async function attempt(bases: string[]) {
    for (const base of bases) {
      const target = `${base}/${path}${search}`;
      try {
        const upstream = await proxyOnce(target, init);
        const responseHeaders = new Headers(upstream.headers);
        responseHeaders.delete("content-encoding");
        responseHeaders.delete("content-length");

        return new NextResponse(upstream.body, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers: responseHeaders,
        });
      } catch (err) {
        lastError = err;
      }
    }
    return null;
  }

  let response = await attempt(getFrappeBackendUrlCandidates());
  if (!response) {
    invalidateFrappeBackendUrlCache();
    response = await attempt(getFrappeBackendUrlCandidates());
  }
  if (response) {
    return response;
  }

  const tried = getFrappeBackendUrlCandidates();
  const detail =
    lastError instanceof Error && lastError.message
      ? lastError.message
      : "connection refused or timed out";
  console.error("[frappe-proxy] upstream failed:", detail, "tried:", tried.join(", "));

  return NextResponse.json(
    {
      message: {
        ok: false,
        message:
          "Cannot reach Frappe. In WSL run: cd ~/frappe-bench && bench start — keep that terminal open, then retry.",
      },
    },
    { status: 502 },
  );
}

type RouteContext = { params: { path: string[] } };

async function handle(req: NextRequest, context: RouteContext) {
  return proxyToFrappe(req, context.params.path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
