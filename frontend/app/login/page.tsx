"use client";

import { type FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLoadingScreen } from "../../components/auth/AuthLoadingScreen";
import { performPortalLogin } from "../../lib/auth/perform-portal-login";

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
    label: "Apply to opportunities",
    desc: "Campus drives, internships, and job postings from 3,400+ verified employers",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3 8-8" />
        <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
      </svg>
    ),
    label: "Built-in assessments",
    desc: "Aptitude, coding, and psychometric tests — no third-party logins needed",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    label: "Real-time application tracking",
    desc: "Stage-wise status, feedback, and offer letters — all in one dashboard",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" />
      </svg>
    ),
    label: "Campus placement drives",
    desc: "TPO-coordinated drives with live updates and instant notifications",
  },
];

const STATS = [
  { value: "12,000+", label: "Active students" },
  { value: "3,400+",  label: "Companies hiring" },
  { value: "28",      label: "States reached"   },
  { value: "95%",     label: "Placement rate"   },
];

function StudentLoginForm() {
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
                <circle cx="16" cy="16" r="14" stroke="#2563eb" strokeWidth="2" fill="none" />
                <circle cx="16" cy="16" r="5" fill="#2563eb" />
                <circle cx="26" cy="9" r="2.6" fill="#0d0f1a" />
              </svg>
            </span>
            <span className="brand-name">Discove<b>HR</b></span>
          </Link>
          <div className="nav-right">
            <Link href="/company/login" className="nav-link">Employer portal</Link>
            <Link href="/signup" className="btn-blue">Create account</Link>
          </div>
        </div>
      </nav>

      {/* ── Shell ── */}
      <main className="auth-page">
        <div className="auth-shell st-login-shell rise d1">

          {/* LEFT — student branding */}
          <div className="auth-panel st-login-panel">
            <Link href="/" className="panel-brand">
              <span className="brand-mark">
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="14" stroke="#818cf8" strokeWidth="2" fill="none" />
                  <circle cx="16" cy="16" r="5" fill="#818cf8" />
                  <circle cx="26" cy="9" r="2.6" fill="#ffffff" />
                </svg>
              </span>
              <span className="brand-name">
                Discove<b style={{ color: "#818cf8" }}>HR</b>
              </span>
            </Link>

            <div className="panel-body">
              <div className="panel-eyebrow">Student &amp; Candidate portal</div>
              <h2 className="panel-headline">
                Land your<br /><em>dream role.</em>
              </h2>
              <p className="panel-sub">
                India's campus-first hiring platform — apply to drives, take assessments, and track your placement journey in one place.
              </p>
            </div>

            {/* Stats */}
            <div className="st-login-stats">
              {STATS.map((s) => (
                <div key={s.label} className="st-login-stat">
                  <span className="st-login-stat-value">{s.value}</span>
                  <span className="st-login-stat-label">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Features */}
            <div className="st-login-features">
              {FEATURES.map((f) => (
                <div key={f.label} className="st-login-feature">
                  <span className="st-login-feature-icon">{f.icon}</span>
                  <span className="st-login-feature-text">
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
              <div className="auth-form-eyebrow st-form-eyebrow">Candidate sign in</div>
              <h1 className="auth-form-title">
                Welcome back, <em style={{ color: "#4f46e5" }}>Candidate</em>
              </h1>
              <p className="auth-form-sub">
                New to DiscoveHR?{" "}
                <Link href="/signup">Create a free account →</Link>
              </p>
            </div>

            <form className="form rise d3" onSubmit={handleSubmit}>

              {/* Email */}
              <div className="field">
                <label className="field-label st-field-label" htmlFor="st-email">
                  <span className="st-field-icon">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  Email address
                </label>
                <input
                  className="field-input st-field-input"
                  type="email"
                  id="st-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password */}
              <div className="field">
                <div className="field-meta">
                  <label className="field-label st-field-label" htmlFor="st-password">
                    <span className="st-field-icon">
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
                    className="field-input st-field-input"
                    type={showPwd ? "text" : "password"}
                    id="st-password"
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
                className="btn-submit"
                disabled={isLoading}
              >
                {isLoading ? "Signing in…" : "Sign in to Candidate Portal"}
                {!isLoading && (
                  <svg viewBox="0 0 24 24">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </form>

            {/* Other portals */}
            <div className="st-login-footer rise d4">
              <p className="st-login-footer-label">Not a student or candidate?</p>
              <div className="st-login-footer-roles">
                <Link href="/company/login" className="st-login-footer-role-link">Employer</Link>
                <span>·</span>
                <Link href="/tpo/login" className="st-login-footer-role-link">TPO / Institution</Link>
                <span>·</span>
                <Link href="/admin/login" className="st-login-footer-role-link">Admin →</Link>
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
          message="Loading your dashboard"
          subtitle="Signing you in and preparing your workspace…"
        />
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthLoadingScreen
          message="Loading candidate portal"
          subtitle="Setting up your workspace…"
          variant="portal"
        />
      }
    >
      <StudentLoginForm />
    </Suspense>
  );
}
