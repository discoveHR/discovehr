import { NextRequest, NextResponse } from "next/server";
import {
  getFrappeBackendUrlCandidates,
  invalidateFrappeBackendUrlCache,
} from "../../../../lib/frappe-backend-url";

export const runtime = "nodejs";

async function callFrappeTokenLogin(
  email: string,
  password: string,
): Promise<{ raw: Record<string, unknown>; status: number }> {
  let lastErr: unknown;
  for (let pass = 0; pass < 2; pass += 1) {
    for (const base of getFrappeBackendUrlCandidates()) {
      try {
        const resp = await fetch(`${base}/api/method/scout.api.auth.token_login`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", host: "portal.discovehr.com" },
          body: JSON.stringify({ email, password }),
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
  if (msg && typeof msg === "object" && "ok" in (msg as object)) {
    return msg as Record<string, unknown>;
  }
  return raw;
}

export async function POST(req: NextRequest) {
  let email: string, password: string;
  try {
    const body = (await req.json()) as { email?: unknown; password?: unknown };
    email = String(body.email ?? "").trim().toLowerCase();
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "Email and password are required." }, { status: 400 });
  }

  let raw: Record<string, unknown>;
  let status: number;
  try {
    ({ raw, status } = await callFrappeTokenLogin(email, password));
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Cannot reach the auth server." },
      { status: 502 },
    );
  }

  const body = unwrapFrappeBody(raw);

  if (!body.ok) {
    const message = typeof body.message === "string" ? body.message : "Login failed.";
    return NextResponse.json(
      { ok: false, message },
      { status: status === 401 || status === 403 ? status : 400 },
    );
  }

  const data = body.data as Record<string, unknown> | undefined;
  const accessToken = String(data?.accessToken ?? data?.access_token ?? "").trim();
  const refreshToken = String(data?.refreshToken ?? data?.refresh_token ?? "").trim();
  const accessTtl =
    typeof data?.accessTokenExpiresIn === "number" ? data.accessTokenExpiresIn : 259200;
  const refreshTtl =
    typeof data?.refreshTokenExpiresIn === "number" ? data.refreshTokenExpiresIn : 604800;

  if (!accessToken) {
    return NextResponse.json(
      { ok: false, message: "Auth server did not issue a token." },
      { status: 500 },
    );
  }

  const isSecure = process.env.NODE_ENV === "production";

  const response = NextResponse.json({
    ok: true,
    message: "Login successful.",
    data: { user: data?.user, roles: data?.roles },
  });

  response.cookies.set("scout_access_token", accessToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: accessTtl,
    path: "/",
  });

  if (refreshToken) {
    response.cookies.set("scout_refresh_token", refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: refreshTtl,
      path: "/",
    });
  }

  return response;
}
