import { NextRequest, NextResponse } from "next/server";
import { getFrappeBackendUrlCandidates } from "../../../../lib/frappe-backend-url";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get("scout_access_token")?.value?.trim() ?? "";
  const refreshToken = req.cookies.get("scout_refresh_token")?.value?.trim() ?? "";
  const [frappeBase] = getFrappeBackendUrlCandidates();

  if (refreshToken) {
    try {
      await fetch(`${frappeBase}/api/method/scout.api.auth.revoke_refresh_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      /* best effort */
    }
  }

  try {
    await fetch(`${frappeBase}/api/method/scout.api.auth.logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    /* best effort */
  }

  // Best-effort admin session logout (no-op when caller is not an admin)
  try {
    await fetch(`${frappeBase}/api/method/scout.api.admin_api.logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    /* best effort */
  }

  const response = NextResponse.json({ ok: true, message: "Logged out." });
  response.cookies.set("scout_access_token", "", { maxAge: 0, path: "/", httpOnly: true });
  response.cookies.set("scout_refresh_token", "", { maxAge: 0, path: "/", httpOnly: true });
  return response;
}
