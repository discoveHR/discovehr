import { NextRequest, NextResponse } from "next/server";
import {
  getFrappeBackendUrlCandidates,
  invalidateFrappeBackendUrlCache,
} from "../../../../lib/frappe-backend-url";

export const runtime = "nodejs";

async function callFrappeRefresh(
  refreshToken: string,
): Promise<{ raw: Record<string, unknown>; status: number }> {
  let lastErr: unknown;
  for (let pass = 0; pass < 2; pass += 1) {
    for (const base of getFrappeBackendUrlCandidates()) {
      try {
        const resp = await fetch(`${base}/api/method/scout.api.auth.refresh_access_token`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", host: "portal.discovehr.com" },
          body: JSON.stringify({ refreshToken }),
          signal: AbortSignal.timeout(30_000),
        });
        const raw = (await resp.json()) as Record<string, unknown>;
        return { raw, status: resp.status };
      } catch (err) {
        lastErr = err;
      }
    }
    invalidateFrappeBackendUrlCache();
  }
  throw lastErr ?? new Error("Cannot reach Frappe backend.");
}

function unwrapFrappeBody(raw: Record<string, unknown>): Record<string, unknown> {
  const msg = raw.message;
  if (msg && typeof msg === "object" && "ok" in (msg as object)) return msg as Record<string, unknown>;
  return raw;
}

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("scout_refresh_token")?.value?.trim() ?? "";

  if (!refreshToken) {
    return NextResponse.json({ ok: false, message: "Not authenticated." }, { status: 401 });
  }

  let raw: Record<string, unknown>;
  try {
    ({ raw } = await callFrappeRefresh(refreshToken));
  } catch {
    return NextResponse.json({ ok: false, message: "Cannot reach the auth server." }, { status: 502 });
  }

  const body = unwrapFrappeBody(raw);

  if (!body.ok) {
    const response = NextResponse.json(
      { ok: false, message: "Session expired. Please log in again." },
      { status: 401 },
    );
    response.cookies.set("scout_access_token", "", { maxAge: 0, path: "/" });
    response.cookies.set("scout_refresh_token", "", { maxAge: 0, path: "/" });
    return response;
  }

  const data = body.data as Record<string, unknown> | undefined;
  const newAccessToken = String(data?.accessToken ?? data?.access_token ?? "").trim();
  const newRefreshToken = String(data?.refreshToken ?? data?.refresh_token ?? "").trim();
  const accessTtl =
    typeof data?.accessTokenExpiresIn === "number" ? data.accessTokenExpiresIn : 259200;
  const refreshTtl =
    typeof data?.refreshTokenExpiresIn === "number" ? data.refreshTokenExpiresIn : 604800;

  if (!newAccessToken) {
    return NextResponse.json(
      { ok: false, message: "Auth server did not issue a new token." },
      { status: 500 },
    );
  }

  const isSecure = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ ok: true });

  response.cookies.set("scout_access_token", newAccessToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: accessTtl,
    path: "/",
  });

  if (newRefreshToken) {
    response.cookies.set("scout_refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: refreshTtl,
      path: "/",
    });
  }

  return response;
}
