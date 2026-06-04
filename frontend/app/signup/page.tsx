"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLoadingScreen } from "../../components/auth/AuthLoadingScreen";
import { registerUser, type RegisterPayload } from "../../lib/api";

type VisualRole = "student" | "employer" | "institution" | "recruiter" | "panelist" | "placement";

const VISUAL_ROLES: { id: VisualRole; label: string; icon: React.ReactNode }[] = [
  {
    id: "student",
    label: "Student",
    icon: <svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  },
  {
    id: "employer",
    label: "Employer",
    icon: <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  },
  {
    id: "institution",
    label: "Institution",
    icon: <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6"/></svg>,
  },
  {
    id: "recruiter",
    label: "Recruiter",
    icon: <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  },
  {
    id: "panelist",
    label: "Panelist",
    icon: <svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>,
  },
  {
    id: "placement",
    label: "Placement",
    icon: <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11l-3 3-1.5-1.5"/></svg>,
  },
];

function toBackendRole(v: VisualRole): RegisterPayload["role"] {
  if (v === "student") return "Student";
  if (v === "employer") return "Company";
  if (v === "institution") return "Training & Placement Officer";
  if (v === "recruiter") return "Job Seeker";
  if (v === "panelist") return "Freelancer";
  if (v === "placement") return "Training & Placement Officer";
  return "Company";
}

const CONTEXT_LABEL: Record<VisualRole, string> = {
  student: "College / University",
  employer: "Company name",
  institution: "Institution name",
  recruiter: "Agency or firm name",
  panelist: "Current employer",
  placement: "Institution name",
};
const CONTEXT_PLACEHOLDER: Record<VisualRole, string> = {
  student: "e.g. College of Engineering, Trivandrum",
  employer: "e.g. Infosys Limited",
  institution: "e.g. Mar Athanasius College of Engineering",
  recruiter: "e.g. Hire Sphere India",
  panelist: "e.g. Volvo Group India",
  placement: "e.g. Kerala Technological University",
};

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [visualRole, setVisualRole] = useState<VisualRole>("student");

  // Step 1
  const [email, setEmail] = useState("");
  // Step 2
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [context, setContext] = useState("");
  // Step 3
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [strength, setStrength] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam) {
      const map: Record<string, VisualRole> = {
        student: "student", employer: "employer", company: "employer",
        institution: "institution", tpo: "institution", placement: "placement",
        recruiter: "recruiter", panelist: "panelist", freelancer: "panelist",
      };
      const mapped = map[roleParam.toLowerCase()];
      if (mapped) setVisualRole(mapped);
    }
  }, [searchParams]);

  function calcStrength(val: string) {
    let s = 0;
    if (val.length >= 8) s++;
    if (/[A-Z]/.test(val)) s++;
    if (/[0-9]/.test(val)) s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    setStrength(s);
  }

  function goStep(n: number) {
    setError("");
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!termsAccepted) {
      setError("You must accept the Terms of Service to continue.");
      return;
    }
    setIsLoading(true);
    try {
      const backendRole = toBackendRole(visualRole);
      const fullNameCombined = `${firstName.trim()} ${lastName.trim()}`.trim();
      const phoneTrimmed = phone.trim();
      let payload: RegisterPayload;
      if (backendRole === "Student") {
        payload = { role: backendRole, email, password, firstName: firstName.trim(), lastName: lastName.trim(), phone: phoneTrimmed, collegeName: context.trim() };
      } else if (backendRole === "Company") {
        payload = { role: backendRole, email, password, fullName: fullNameCombined, companyName: context.trim(), phone: phoneTrimmed };
      } else if (backendRole === "Training & Placement Officer") {
        payload = { role: backendRole, email, password, fullName: fullNameCombined, collegeName: context.trim(), phone: phoneTrimmed };
      } else {
        payload = { role: backendRole, email, password, fullName: fullNameCombined, phone: phoneTrimmed };
      }
      const message = await registerUser(payload);
      setSuccess(message || "Account created! Redirecting to sign in…");
      window.setTimeout(() => router.push("/login"), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  }

  const strengthColors = ["#e24b4a", "#ef9f27", "#1d9e75", "#1d9e75"];
  const strengthLabels = ["Too short", "Weak", "Good", "Strong"];

  return (
    <>
      <div className="auth-bg" />

      <nav className="auth-topnav">
        <div className="nav-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" stroke="#0047ff" strokeWidth="2" fill="none" />
                <circle cx="16" cy="16" r="5" fill="#0047ff" />
                <circle cx="26" cy="9" r="2.6" fill="#0a0a0b" />
              </svg>
            </span>
            <span className="brand-name">Discove<b>HR</b></span>
          </Link>
          <div className="nav-right">
            <Link href="/login" className="nav-link">Already have an account?</Link>
            <Link href="/login" className="btn-blue">Sign in</Link>
          </div>
        </div>
      </nav>

      <main className="auth-page">
        <div className="auth-shell rise d1" style={{ alignItems: "stretch" }}>

          {/* LEFT PANEL */}
          <div className="auth-panel">
            <Link href="/" className="panel-brand">
              <span className="brand-mark">
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="14" stroke="#6f9bff" strokeWidth="2" fill="none" />
                  <circle cx="16" cy="16" r="5" fill="#6f9bff" />
                  <circle cx="26" cy="9" r="2.6" fill="#ffffff" />
                </svg>
              </span>
              <span className="brand-name">Discove<b style={{ color: "#6f9bff" }}>HR</b></span>
            </Link>

            <div className="panel-body">
              <div className="panel-eyebrow">Join the network</div>
              <h2 className="panel-headline">
                Talent discovery,<br /><em>starts here.</em>
              </h2>
              <p className="panel-sub">
                One account. Access to the entire DiscoveHR ecosystem — assessments, campus networks, recruiter panels, and live opportunities.
              </p>
            </div>

            <div className="panel-stats">
              <div className="panel-stat-item">
                <span className="panel-stat-dot" />
                <span className="panel-stat-text"><strong>Free to join</strong> — for students and institutions</span>
              </div>
              <div className="panel-stat-item">
                <span className="panel-stat-dot" />
                <span className="panel-stat-text"><strong>Verified profiles</strong> — trusted by enterprise employers</span>
              </div>
              <div className="panel-stat-item">
                <span className="panel-stat-dot" />
                <span className="panel-stat-text"><strong>Setup in 2 minutes</strong> — no lengthy onboarding</span>
              </div>
            </div>
          </div>

          {/* RIGHT FORM */}
          <div className="auth-form-side" style={{ justifyContent: "flex-start", paddingTop: "2.8rem", paddingBottom: "2.8rem" }}>
            <div className="auth-form-header rise d2">
              <div className="auth-form-eyebrow">Create account</div>
              <h1 className="auth-form-title">Join <em>DiscoveHR.</em></h1>
              <p className="auth-form-sub">
                Already registered? <Link href="/login">Sign in →</Link>
              </p>
            </div>

            {/* Step dots */}
            <div className="step-dots rise d2">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`step-dot${step === n ? " active" : step > n ? " done" : ""}`}
                />
              ))}
            </div>

            <form onSubmit={handleSubmit}>

              {/* STEP 1: Role + email */}
              <div className={`step-panel rise d3${step === 1 ? " visible" : ""}`}>
                <div className="field">
                  <label className="field-label">I am joining as</label>
                </div>

                <div className="role-selector" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  {VISUAL_ROLES.map((r) => (
                    <label
                      key={r.id}
                      className="role-label"
                      style={visualRole === r.id
                        ? { borderColor: "var(--blue)", background: "var(--blue-wash)" }
                        : {}}
                      onClick={() => setVisualRole(r.id)}
                    >
                      <span
                        className="role-icon"
                        style={visualRole === r.id
                          ? { background: "var(--white)", borderColor: "var(--blue)" }
                          : {}}
                      >
                        {r.icon}
                      </span>
                      <span
                        className="role-text"
                        style={visualRole === r.id ? { color: "var(--blue)" } : {}}
                      >
                        {r.label}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="form-divider">Your email address</div>

                <div className="field">
                  <label className="field-label" htmlFor="reg-email">Work or institutional email</label>
                  <input
                    className="field-input"
                    type="email"
                    id="reg-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <button type="button" className="btn-submit" onClick={() => { if (email) goStep(2); }}>
                  Continue
                  <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              </div>

              {/* STEP 2: Personal details */}
              <div className={`step-panel${step === 2 ? " visible" : ""}`}>
                <button type="button" className="btn-ghost-back" onClick={() => goStep(1)}>
                  <svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                  Back
                </button>

                <div className="form-row">
                  <div className="field">
                    <label className="field-label" htmlFor="reg-first">First name</label>
                    <input
                      className="field-input"
                      type="text"
                      id="reg-first"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Arun"
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="reg-last">Last name</label>
                    <input
                      className="field-input"
                      type="text"
                      id="reg-last"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Krishnan"
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="reg-phone">Phone number</label>
                  <input
                    className="field-input"
                    type="tel"
                    id="reg-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                  />
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="reg-context">
                    {CONTEXT_LABEL[visualRole]}
                  </label>
                  <input
                    className="field-input"
                    type="text"
                    id="reg-context"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder={CONTEXT_PLACEHOLDER[visualRole]}
                  />
                </div>

                <button type="button" className="btn-submit" onClick={() => { if (firstName && lastName) goStep(3); }}>
                  Continue
                  <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              </div>

              {/* STEP 3: Password + consent */}
              <div className={`step-panel${step === 3 ? " visible" : ""}`}>
                <button type="button" className="btn-ghost-back" onClick={() => goStep(2)}>
                  <svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                  Back
                </button>

                <div className="field">
                  <label className="field-label" htmlFor="reg-password">Create a password</label>
                  <div className="field-input-wrap">
                    <input
                      className="field-input"
                      type={showPass ? "text" : "password"}
                      id="reg-password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); calcStrength(e.target.value); }}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      required
                    />
                    <button type="button" className="field-toggle" onClick={() => setShowPass(!showPass)} aria-label="Toggle password">
                      {showPass
                        ? <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                  <div className="strength-bar">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="strength-seg"
                        style={{ background: password && i < strength ? strengthColors[strength - 1] : undefined }}
                      />
                    ))}
                  </div>
                  {password && (
                    <div className="strength-label" style={{ color: strengthColors[strength - 1] || undefined }}>
                      {strengthLabels[strength - 1] || "Too short"}
                    </div>
                  )}
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="reg-confirm">Confirm password</label>
                  <div className="field-input-wrap">
                    <input
                      className="field-input"
                      type={showConfirm ? "text" : "password"}
                      id="reg-confirm"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      required
                      style={confirmPassword && confirmPassword !== password ? { borderColor: "#e24b4a" } : {}}
                    />
                    <button type="button" className="field-toggle" onClick={() => setShowConfirm(!showConfirm)} aria-label="Toggle confirm password">
                      {showConfirm
                        ? <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                <div className="check-row">
                  <input
                    className="check-input"
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    required
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label className="check-label" htmlFor="terms">
                      I have read and agree to the{" "}
                      <a href="/legal#sec-tnc" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Terms of Service</a>
                      {" "}and{" "}
                      <a href="/legal#sec-privacy" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Privacy Policy</a>.
                      I understand my data is processed in accordance with the DPDP Act 2023.
                    </label>
                    <a
                      href="/legal"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "0.78rem", color: "var(--indigo)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "3px", width: "fit-content" }}
                    >
                      Read full Terms &amp; Conditions
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
                      </svg>
                    </a>
                  </div>
                </div>

                <div className="check-row">
                  <input className="check-input" type="checkbox" id="updates" />
                  <label className="check-label" htmlFor="updates">
                    Send me platform updates, opportunities, and hiring insights.
                  </label>
                </div>

                {error && <div className="form-error">{error}</div>}
                {success && <div className="form-success">{success}</div>}

                <button type="submit" className="btn-submit" disabled={isLoading || !termsAccepted}>
                  {isLoading ? "Creating account…" : "Create my account"}
                  {!isLoading && (
                    <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  )}
                </button>
              </div>

            </form>
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
          mode="overlay"
          variant="portal"
          message="Creating your account"
          subtitle="Setting up your portal access…"
        />
      )}
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <AuthLoadingScreen
          message="Loading registration"
          subtitle="Preparing the sign-up form…"
          variant="portal"
        />
      }
    >
      <SignupForm />
    </Suspense>
  );
}
