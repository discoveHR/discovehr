import { execSync } from "child_process";

let cached: { urls: string[]; at: number } | null = null;
const TTL_MS = 15_000;

// Warn once at startup if running in production without an explicit backend URL.
// In production NEXT_FRAPPE_BACKEND_URL must be set; the WSL auto-detect only works on Windows dev.
let _warnedProd = false;

function wslIp(): string | null {
  if (process.platform !== "win32") {
    return null;
  }
  try {
    const out = execSync("wsl hostname -I", { encoding: "utf8", timeout: 8000 });
    const ip = out.trim().split(/\s+/).filter(Boolean)[0];
    return ip || null;
  } catch {
    return null;
  }
}

/** Ordered backends to try when proxying to Frappe. */
export function getFrappeBackendUrlCandidates(): string[] {
  const fromEnv = (process.env.NEXT_FRAPPE_BACKEND_URL || process.env.FRAPPE_BACKEND_URL || "").trim();
  if (fromEnv) {
    return [fromEnv.replace(/\/$/, "")];
  }

  // In production without an explicit env var, fall back to localhost and warn once.
  if (process.env.NODE_ENV === "production" && !_warnedProd) {
    _warnedProd = true;
    console.warn(
      "[DiscoveHR] NEXT_FRAPPE_BACKEND_URL is not set. " +
      "Falling back to http://127.0.0.1:8000 — this only works if Frappe runs on the same host. " +
      "Set NEXT_FRAPPE_BACKEND_URL=https://your-frappe-host in your deployment environment."
    );
  }

  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) {
    return cached.urls;
  }

  const candidates: string[] = [];
  if (process.platform === "win32") {
    // WSL2 publishes bench on Windows localhost — usually more stable than a changing WSL IP.
    candidates.push("http://127.0.0.1:8000", "http://localhost:8000");
    const ip = wslIp();
    if (ip) {
      candidates.push(`http://${ip}:8000`);
    }
  } else {
    candidates.push("http://127.0.0.1:8000");
  }

  const unique = Array.from(new Set(candidates));
  cached = { urls: unique, at: now };
  return unique;
}

export function invalidateFrappeBackendUrlCache(): void {
  cached = null;
}

/** Primary URL (first candidate). */
export function getFrappeBackendUrl(): string {
  return getFrappeBackendUrlCandidates()[0];
}
