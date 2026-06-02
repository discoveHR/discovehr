"use client";

import { type FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLoadingScreen } from "../../../components/auth/AuthLoadingScreen";
import { performPortalLogin } from "../../../lib/auth/perform-portal-login";
import { clearPortalSession } from "../../../lib/auth/session";

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    label: "Manage your student pipeline",
    desc: "Invite, track, and export students with batch-wise views and bulk upload tools",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
    label: "Coordinate campus drives",
    desc: "Connect with 3,400+ companies, manage postings, and share magic links with students",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3 8-8" />
        <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
      </svg>
    ),
    label: "Approve placements & profile edits",
    desc: "Review applicant stages, shortlist students, and unlock profile edits with one click",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    label: "Reports & placement analytics",
    desc: "Download placement data, track internship activity, and export filtered student lists",
  },
];

const STATS = [
  { value: "12,000+", label: "Active students" },
  { value: "3,400+",  label: "Companies hiring" },
  { value: "28",      label: "States covered"   },
  { value: "95%",     label: "Placement rate"   },
];

function TpoLoginForm() {
  const router = useRouter();
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const result = await performPortalLogin(email, password);
      if (result.sessionRole !== "tpo") {
        await clearPortalSession();
        throw new Error(
          "This portal is for Training & Placement Officers. Use the appropriate portal for your role.",
        );
      }
      router.replace(result.dashboardPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please check your credentials.");
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="auth-bg" />

      {/* ── Nav ── */}
      <nav className="auth-topnav">
        <div className="nav-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" stroke="#7c3aed" strokeWidth="2" fill="none" />
                <circle cx="16" cy="16" r="5" fill="#7c3aed" />
                <circle cx="26" cy="9" r="2.6" fill="#0d0f1a" />
              </svg>
            </span>
            <span className="brand-name">Discove<b>HR</b></span>
          </Link>
          <div className="nav-right">
            <Link href="/company/login" className="nav-link">Employer portal</Link>
            <Link href="/signup" className="btn-blue">Register institution</Link>
          </div>
        </div>
      </nav>

      {/* ── Shell ── */}
      <main className="auth-page">
        <div className="auth-shell tpo-login-shell rise d1">

          {/* LEFT — TPO branding */}
          <div className="auth-panel tpo-login-panel">
            <Link href="/" className="panel-brand">
              <span className="brand-mark">
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="14" stroke="#a78bfa" strokeWidth="2" fill="none" />
                  <circle cx="16" cy="16" r="5" fill="#a78bfa" />
                  <circle cx="26" cy="9" r="2.6" fill="#ffffff" />
                </svg>
              </span>
              <span className="brand-name">
                Discove<b style={{ color: "#a78bfa" }}>HR</b>
              </span>
            </Link>

            <div className="panel-body">
              <div className="panel-eyebrow">Training &amp; Placement Office</div>
              <h2 className="panel-headline">
                Train. Place.<br /><em>Excel.</em>
              </h2>
              <p className="panel-sub">
                India's campus placement platform — manage students, coordinate company drives, and track every placement from one dashboard.
              </p>
            </div>

            {/* Stats */}
            <div className="tpo-login-stats">
              {STATS.map((s) => (
                <div key={s.label} className="tpo-login-stat">
                  <span className="tpo-login-stat-value">{s.value}</span>
                  <span className="tpo-login-stat-label">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Features */}
            <div className="tpo-login-features">
              {FEATURES.map((f) => (
                <div key={f.label} className="tpo-login-feature">
                  <span className="tpo-login-feature-icon">{f.icon}</span>
                  <span className="tpo-login-feature-text">
                    <strong>{f.label}</strong>
                    <span>{f.desc}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — login form */}
          <div className="auth-form-side">
            <div className="auth-form-header rise d2">
              <div className="auth-form-eyebrow tpo-form-eyebrow">TPO sign in</div>
              <h1 className="auth-form-title">
                Welcome back, <em style={{ color: "#7c3aed" }}>Placement Officer</em>
              </h1>
              <p className="auth-form-sub">
                New to DiscoveHR?{" "}
                <Link href="/signup">Register your institution →</Link>
              </p>
            </div>

            <form className="form rise d3" onSubmit={handleSubmit}>

              {/* Email */}
              <div className="field">
                <label className="field-label tpo-field-label" htmlFor="tpo-email">
                  <span className="tpo-field-icon">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  Institutional email address
                </label>
                <input
                  className="field-input tpo-field-input"
                  type="email"
                  id="tpo-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tpo@college.edu"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password */}
              <div className="field">
                <div className="field-meta">
                  <label className="field-label tpo-field-label" htmlFor="tpo-password">
                    <span className="tpo-field-icon">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    Password
                  </label>
                  <a href="#" className="forgot-link">Forgot password?</a>
                </div>
                <div className="field-input-wrap">
                  <input
                    className="field-input tpo-field-input"
                    type={showPwd ? "text" : "password"}
                    id="tpo-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="field-toggle"
                    onClick={() => setShowPwd(!showPwd)}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && <div className="form-error">{error}</div>}

              {/* Submit */}
              <button
                type="submit"
                className="btn-submit tpo-btn-submit"
                disabled={isLoading}
              >
                {isLoading ? "Signing in…" : "Sign in to TPO Portal"}
                {!isLoading && (
                  <svg viewBox="0 0 24 24">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </form>

            {/* Other portals */}
            <div className="tpo-login-footer rise d4">
              <p className="tpo-login-footer-label">Not a placement officer?</p>
              <div className="tpo-login-footer-roles">
                <Link href="/login" className="tpo-login-footer-role-link">Student / Candidate</Link>
                <span>·</span>
                <Link href="/company/login" className="tpo-login-footer-role-link">Employer</Link>
                <span>·</span>
                <Link href="/admin/login" className="tpo-login-footer-role-link">Admin →</Link>
              </div>
            </div>

          </div>
        </div>
      </main>

      <footer className="auth-footer-bar">
        <div className="auth-footer">
          <span className="auth-footer-copy">© 2026 DiscoveHR. All rights reserved.</span>
          <div className="auth-footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
            <a href="#">Help</a>
          </div>
        </div>
      </footer>

      {isLoading && (
        <AuthLoadingScreen
          mode="fullscreen"
          variant="portal"
          message="Loading TPO dashboard"
          subtitle="Signing you in and preparing your placement workspace…"
        />
      )}
    </>
  );
}

export default function TpoLoginPage() {
  return (
    <Suspense
      fallback={
        <AuthLoadingScreen
          message="Loading TPO portal"
          subtitle="Setting up your workspace…"
          variant="portal"
        />
      }
    >
      <TpoLoginForm />
    </Suspense>
  );
}
