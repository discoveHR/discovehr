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

  // Strip hop-by-hop and connection-specific headers that must not be forwarded.
  // transfer-encoding + content-length must be removed for POST bodies because the
  // Node.js fetch API recalculates them from the ArrayBuffer we pass as body —
  // forwarding the originals causes conflicts (e.g. chunked + fixed-length mismatch).
  // Strip hop-by-hop and problematic headers that must not be forwarded.
  // "expect" (100-continue) causes Node.js fetch to throw "expect header not supported"
  // when a client like PowerShell/curl sends it on POST requests.
  for (const h of ["host", "expect", "transfer-encoding", "content-length", "connection", "keep-alive", "te", "trailer", "upgrade"]) {
    headers.delete(h);
  }
  headers.set("host", "portal.discovehr.com");

  // Inject Bearer token from the HttpOnly cookie so Frappe can authenticate the request.
  // The cookie is inaccessible to client-side JS; only this server-side proxy reads it.
  const accessToken = req.cookies.get("scout_access_token")?.value?.trim();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
    // Drop the browser's session cookies so Frappe doesn't try to resume a stale/broken
    // sid session before seeing the Bearer token — that causes "User None is disabled".
    headers.delete("cookie");
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
