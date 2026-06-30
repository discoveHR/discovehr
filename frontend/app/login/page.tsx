"use client";

import { type FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLoadingScreen } from "../../components/auth/AuthLoadingScreen";
import { performPortalLogin } from "../../lib/auth/perform-portal-login";
import { adminLogin } from "../../lib/api";

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
    label: "Employers",
    desc: "Post internships and jobs, run hiring workflows, and connect with campuses",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
    label: "Candidates & Job Seekers",
    desc: "Apply to opportunities, take assessments, and track your placement journey",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" />
      </svg>
    ),
    label: "TPO / Institutions",
    desc: "Manage students, placements, and campus-company engagement in one dashboard",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3 8-8" />
        <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
      </svg>
    ),
    label: "Freelance Interviewers",
    desc: "Submit your profile, upload documents, and apply to interview opportunities",
  },
];

const STATS = [
  { value: "12,000+", label: "Active users" },
  { value: "3,400+",  label: "Companies hiring" },
  { value: "28",      label: "States reached" },
  { value: "95%",     label: "Placement rate" },
];

function UnifiedLoginForm() {
  const router = useRouter();

  // Sign-in state
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState("");

  // Forgot-password state
  const [forgotOpen, setForgotOpen]     = useState(false);
  const [resetEmail, setResetEmail]     = useState("");
  const [resetEmailErr, setResetEmailErr] = useState("");
  const [resetStatus, setResetStatus]   = useState<"idle" | "loading" | "sent">("idle");
  const [resetError, setResetError]     = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const result = await performPortalLogin(email, password);
      router.replace(result.dashboardPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // Portal login rejects admin accounts — fall back to admin session auth
      if (msg.toLowerCase().includes("admin")) {
        try {
          const result = await adminLogin({ email, password });
          localStorage.setItem("scout_session", JSON.stringify({ role: "admin", user: result?.user }));
          router.replace("/admin/dashboard");
          return;
        } catch (adminErr) {
          setError(adminErr instanceof Error ? adminErr.message : "Sign in failed.");
          setIsLoading(false);
          return;
        }
      }
      setError(msg || "Sign in failed. Please check your credentials.");
      setIsLoading(false);
    }
  }

  function openForgot() {
    setForgotOpen(true);
    setResetEmail(email); // Pre-fill with whatever the user already typed
    setResetEmailErr("");
    setResetError("");
    setResetStatus("idle");
  }

  function closeForgot() {
    setForgotOpen(false);
    setResetStatus("idle");
    setResetError("");
    setResetEmailErr("");
  }

  async function handleResetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = resetEmail.trim().toLowerCase();
    if (!trimmed) { setResetEmailErr("Please enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) { setResetEmailErr("Enter a valid email address."); return; }
    setResetEmailErr("");
    setResetStatus("loading");
    setResetError("");
    try {
      const res = await fetch("/frappe/api/method/frappe.core.doctype.user.user.reset_password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: trimmed }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);
      // Frappe returns 200 and never leaks whether the email exists (anti-enumeration)
      setResetStatus("sent");
    } catch {
      setResetError("Could not send the reset email. Please try again.");
      setResetStatus("idle");
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
            <Link href="/signup" className="btn-blue">Create account</Link>
          </div>
        </div>
      </nav>

      {/* ── Shell ── */}
      <main className="auth-page">
        <div className="auth-shell st-login-shell rise d1">

          {/* LEFT — platform branding */}
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
              <div className="panel-eyebrow">One portal for everyone</div>
              <h2 className="panel-headline">
                Your role,<br /><em>your dashboard.</em>
              </h2>
              <p className="panel-sub">
                Sign in with your account. DiscoveHR routes you to the right dashboard automatically — whether you are an employer, candidate, TPO, or freelance interviewer.
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

          {/* RIGHT — login form / forgot-password panel */}
          <div className="auth-form-side">

            {!forgotOpen ? (
              /* ── SIGN-IN FORM ── */
              <>
                <div className="auth-form-header rise d2">
                  <div className="auth-form-eyebrow st-form-eyebrow">Sign in</div>
                  <h1 className="auth-form-title">Welcome back</h1>
                  <p className="auth-form-sub">
                    New to DiscoveHR?{" "}
                    <Link href="/signup">Create a free account →</Link>
                  </p>
                </div>

                <form className="form rise d3" onSubmit={handleSubmit} noValidate>

                  {/* Email */}
                  <div className="field">
                    <label className="field-label st-field-label" htmlFor="login-email">
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
                      id="login-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="field">
                    <div className="field-meta">
                      <label className="field-label st-field-label" htmlFor="login-password">
                        <span className="st-field-icon">
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </span>
                        Password
                      </label>
                      <button
                        type="button"
                        className="forgot-link"
                        onClick={openForgot}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="field-input-wrap">
                      <input
                        className="field-input st-field-input"
                        type={showPwd ? "text" : "password"}
                        id="login-password"
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

                  {error && <div className="form-error">{error}</div>}

                  <button type="submit" className="btn-submit" disabled={isLoading}>
                    {isLoading ? "Signing in…" : "Sign in"}
                    {!isLoading && (
                      <svg viewBox="0 0 24 24">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    )}
                  </button>
                </form>

              </>
            ) : (
              /* ── FORGOT PASSWORD PANEL ── */
              <div className="rise d2">
                <button type="button" className="btn-ghost-back" onClick={closeForgot}>
                  <svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                  Back to sign in
                </button>

                <div className="auth-form-header" style={{ marginTop: "1.2rem" }}>
                  <div className="auth-form-eyebrow st-form-eyebrow">Password reset</div>
                  <h1 className="auth-form-title">Forgot your password?</h1>
                  <p className="auth-form-sub">
                    Enter the email address on your account. If it exists, we&rsquo;ll send a reset link.
                  </p>
                </div>

                {resetStatus === "sent" ? (
                  <div style={{ marginTop: "1.6rem" }}>
                    <div className="form-success" style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}>
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span>
                        <strong>Check your inbox.</strong> If an account exists for <em>{resetEmail.trim().toLowerCase()}</em>, a password reset link has been sent. Check your spam folder if it doesn&rsquo;t arrive within a few minutes.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-submit"
                      onClick={closeForgot}
                      style={{ marginTop: "1.4rem" }}
                    >
                      Back to sign in
                      <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                  </div>
                ) : (
                  <form className="form" onSubmit={handleResetPassword} noValidate style={{ marginTop: "1.4rem" }}>
                    <div className="field">
                      <label className="field-label st-field-label" htmlFor="reset-email">
                        <span className="st-field-icon">
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                          </svg>
                        </span>
                        Email address
                      </label>
                      <input
                        className={`field-input st-field-input${resetEmailErr ? " field-input--error" : ""}`}
                        type="email"
                        id="reset-email"
                        value={resetEmail}
                        onChange={(e) => { setResetEmail(e.target.value); setResetEmailErr(""); }}
                        placeholder="name@example.com"
                        autoComplete="email"
                        autoFocus
                      />
                      {resetEmailErr && <p className="field-error">{resetEmailErr}</p>}
                    </div>

                    {resetError && <div className="form-error">{resetError}</div>}

                    <button
                      type="submit"
                      className="btn-submit"
                      disabled={resetStatus === "loading"}
                    >
                      {resetStatus === "loading" ? "Sending…" : "Send reset link"}
                      {resetStatus !== "loading" && (
                        <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

          </div>
        </div>
      </main>

      <footer className="auth-footer-bar">
        <div className="auth-footer">
          <span className="auth-footer-copy">© 2026 DiscoveHR. All rights reserved.</span>
          <div className="auth-footer-links">
            <a href="/legal#sec-privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
            <a href="/legal#sec-tnc" target="_blank" rel="noopener noreferrer">Terms</a>
            <a href="/legal" target="_blank" rel="noopener noreferrer">Security</a>
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
          message="Loading portal"
          subtitle="Setting up your workspace…"
          variant="portal"
        />
      }
    >
      <UnifiedLoginForm />
    </Suspense>
  );
}
