"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLoadingScreen } from "../../components/auth/AuthLoadingScreen";
import { registerUser, type RegisterPayload } from "../../lib/api";

type VisualRole = "student" | "employer" | "institution" | "job-seeker" | "freelance-recruiter" | "tpo";

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
    id: "job-seeker",
    label: "Job Seeker",
    icon: <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  },
  {
    id: "freelance-recruiter",
    label: "Freelance Recruiter",
    icon: <svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>,
  },
  {
    id: "tpo",
    label: "TPO",
    icon: <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11l-3 3-1.5-1.5"/></svg>,
  },
];

function toBackendRole(v: VisualRole): RegisterPayload["role"] {
  if (v === "student") return "Student";
  if (v === "employer") return "Company";
  if (v === "institution") return "Training & Placement Officer";
  if (v === "job-seeker") return "Job Seeker";
  if (v === "freelance-recruiter") return "Freelancer";
  if (v === "tpo") return "Training & Placement Officer";
  return "Company";
}

const CONTEXT_LABEL: Record<VisualRole, string> = {
  student: "College / University",
  employer: "Company name",
  institution: "Institution name",
  "job-seeker": "Agency or firm name (optional)",
  "freelance-recruiter": "Current employer",
  tpo: "Institution name",
};
const CONTEXT_PLACEHOLDER: Record<VisualRole, string> = {
  student: "e.g. College of Engineering, Trivandrum",
  employer: "e.g. Infosys Limited",
  institution: "e.g. Mar Athanasius College of Engineering",
  "job-seeker": "e.g. Hire Sphere India",
  "freelance-recruiter": "e.g. Volvo Group India",
  tpo: "e.g. Kerala Technological University",
};

// Roles where the context field is required
const CONTEXT_REQUIRED: VisualRole[] = ["employer", "institution", "tpo"];
// Roles where phone is required
const PHONE_REQUIRED: VisualRole[] = ["student"];

// ── Validators ──────────────────────────────────────────────────────────────
function validateEmail(val: string): string {
  if (!val.trim()) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim())) return "Enter a valid email address (e.g. you@company.com).";
  return "";
}

function validateName(val: string, label: string): string {
  const v = val.trim();
  if (!v) return `${label} is required.`;
  if (v.length < 2) return `${label} must be at least 2 characters.`;
  if (v.length > 50) return `${label} must be 50 characters or fewer.`;
  if (!/^[a-zA-Z\s\-'.]+$/.test(v)) return `${label} may only contain letters, spaces, hyphens, or apostrophes.`;
  return "";
}

function validatePhone(val: string, required: boolean): string {
  const v = val.trim();
  if (!v) return required ? "Phone number is required." : "";
  const digits = v.replace(/[\s\-().+]/g, "");
  if (!/^\d+$/.test(digits)) return "Enter a valid phone number (digits only).";
  if (digits.length < 10) return "Phone number must be at least 10 digits.";
  if (digits.length > 15) return "Phone number must be 15 digits or fewer.";
  return "";
}

function validateContext(val: string, label: string, required: boolean): string {
  const v = val.trim();
  if (!v) return required ? `${label} is required.` : "";
  if (v.length < 2) return `${label} must be at least 2 characters.`;
  if (v.length > 100) return `${label} must be 100 characters or fewer.`;
  return "";
}

function validatePassword(val: string): string {
  if (!val) return "Password is required.";
  if (val.length < 8) return "Password must be at least 8 characters.";
  return "";
}

function validateConfirm(val: string, password: string): string {
  if (!val) return "Please confirm your password.";
  if (val !== password) return "Passwords do not match.";
  return "";
}

// ── Component ────────────────────────────────────────────────────────────────
function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [visualRole, setVisualRole] = useState<VisualRole>("student");

  // Field values
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [context, setContext] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [strength, setStrength] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Per-field inline errors
  const [fe, setFe] = useState<Record<string, string>>({});
  function fe_set(field: string, msg: string) {
    setFe((prev) => ({ ...prev, [field]: msg }));
  }
  function fe_clear(field: string) {
    setFe((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  const [checkingEmail, setCheckingEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam) {
      const map: Record<string, VisualRole> = {
        student: "student", employer: "employer", company: "employer",
        institution: "institution", tpo: "tpo", placement: "tpo",
        recruiter: "job-seeker", "job-seeker": "job-seeker", jobseeker: "job-seeker",
        panelist: "freelance-recruiter", freelancer: "freelance-recruiter", "freelance-recruiter": "freelance-recruiter",
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

  async function handleStep1Continue() {
    const emailErr = validateEmail(email);
    if (emailErr) { setFe({ email: emailErr }); return; }
    setFe({});

    // Check with the server whether this email is already registered
    setCheckingEmail(true);
    try {
      const res = await fetch("/frappe/api/method/scout.api.auth.check_email_available", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const body = await res.json();
      // Frappe wraps the return value in a top-level "message" key
      const data = body?.message ?? body;
      if (data?.available === false) {
        setFe({ email: "An account with this email already exists. Sign in instead." });
        return;
      }
    } catch {
      // Network/server error — let them proceed; the final submit will catch it
    } finally {
      setCheckingEmail(false);
    }

    goStep(2);
  }

  function handleStep2Continue() {
    const phoneRequired = PHONE_REQUIRED.includes(visualRole);
    const contextRequired = CONTEXT_REQUIRED.includes(visualRole);
    const errs: Record<string, string> = {};

    const fnErr = validateName(firstName, "First name");
    if (fnErr) errs.firstName = fnErr;
    const lnErr = validateName(lastName, "Last name");
    if (lnErr) errs.lastName = lnErr;
    const phErr = validatePhone(phone, phoneRequired);
    if (phErr) errs.phone = phErr;
    const ctErr = validateContext(context, CONTEXT_LABEL[visualRole], contextRequired);
    if (ctErr) errs.context = ctErr;

    setFe(errs);
    if (Object.keys(errs).length === 0) goStep(3);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // Final step validation
    const pwErr = validatePassword(password);
    const cfErr = validateConfirm(confirmPassword, password);
    const errs: Record<string, string> = {};
    if (pwErr) errs.password = pwErr;
    if (cfErr) errs.confirmPassword = cfErr;
    if (Object.keys(errs).length > 0) { setFe(errs); return; }

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

            <form onSubmit={handleSubmit} noValidate>

              {/* ── STEP 1: Role + email ── */}
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
                    className={`field-input${fe.email ? " field-input--error" : ""}`}
                    type="email"
                    id="reg-email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); fe_clear("email"); }}
                    onBlur={() => { const err = validateEmail(email); if (err) fe_set("email", err); }}
                    placeholder="you@company.com"
                    autoComplete="email"
                  />
                  {fe.email && <p className="field-error">{fe.email}</p>}
                </div>

                <button type="button" className="btn-submit" onClick={handleStep1Continue} disabled={checkingEmail}>
                  {checkingEmail ? "Checking…" : "Continue"}
                  {!checkingEmail && <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>}
                </button>
              </div>

              {/* ── STEP 2: Personal details ── */}
              <div className={`step-panel${step === 2 ? " visible" : ""}`}>
                <button type="button" className="btn-ghost-back" onClick={() => goStep(1)}>
                  <svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                  Back
                </button>

                <div className="form-row">
                  <div className="field">
                    <label className="field-label" htmlFor="reg-first">First name</label>
                    <input
                      className={`field-input${fe.firstName ? " field-input--error" : ""}`}
                      type="text"
                      id="reg-first"
                      value={firstName}
                      onChange={(e) => { setFirstName(e.target.value); fe_clear("firstName"); }}
                      onBlur={() => { const err = validateName(firstName, "First name"); if (err) fe_set("firstName", err); }}
                      placeholder="Arun"
                      autoComplete="given-name"
                    />
                    {fe.firstName && <p className="field-error">{fe.firstName}</p>}
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="reg-last">Last name</label>
                    <input
                      className={`field-input${fe.lastName ? " field-input--error" : ""}`}
                      type="text"
                      id="reg-last"
                      value={lastName}
                      onChange={(e) => { setLastName(e.target.value); fe_clear("lastName"); }}
                      onBlur={() => { const err = validateName(lastName, "Last name"); if (err) fe_set("lastName", err); }}
                      placeholder="Krishnan"
                      autoComplete="family-name"
                    />
                    {fe.lastName && <p className="field-error">{fe.lastName}</p>}
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="reg-phone">
                    Phone number{PHONE_REQUIRED.includes(visualRole) ? "" : " (optional)"}
                  </label>
                  <input
                    className={`field-input${fe.phone ? " field-input--error" : ""}`}
                    type="tel"
                    id="reg-phone"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); fe_clear("phone"); }}
                    onBlur={() => { const err = validatePhone(phone, PHONE_REQUIRED.includes(visualRole)); if (err) fe_set("phone", err); }}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                  />
                  {fe.phone && <p className="field-error">{fe.phone}</p>}
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="reg-context">
                    {CONTEXT_LABEL[visualRole]}
                    {!CONTEXT_REQUIRED.includes(visualRole) && " (optional)"}
                  </label>
                  <input
                    className={`field-input${fe.context ? " field-input--error" : ""}`}
                    type="text"
                    id="reg-context"
                    value={context}
                    onChange={(e) => { setContext(e.target.value); fe_clear("context"); }}
                    onBlur={() => { const err = validateContext(context, CONTEXT_LABEL[visualRole], CONTEXT_REQUIRED.includes(visualRole)); if (err) fe_set("context", err); }}
                    placeholder={CONTEXT_PLACEHOLDER[visualRole]}
                  />
                  {fe.context && <p className="field-error">{fe.context}</p>}
                </div>

                <button type="button" className="btn-submit" onClick={handleStep2Continue}>
                  Continue
                  <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              </div>

              {/* ── STEP 3: Password + consent ── */}
              <div className={`step-panel${step === 3 ? " visible" : ""}`}>
                <button type="button" className="btn-ghost-back" onClick={() => goStep(2)}>
                  <svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                  Back
                </button>

                <div className="field">
                  <label className="field-label" htmlFor="reg-password">Create a password</label>
                  <div className="field-input-wrap">
                    <input
                      className={`field-input${fe.password ? " field-input--error" : ""}`}
                      type={showPass ? "text" : "password"}
                      id="reg-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        calcStrength(e.target.value);
                        fe_clear("password");
                        if (confirmPassword) fe_clear("confirmPassword");
                      }}
                      onBlur={() => { const err = validatePassword(password); if (err) fe_set("password", err); }}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
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
                  {fe.password && <p className="field-error">{fe.password}</p>}
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="reg-confirm">Confirm password</label>
                  <div className="field-input-wrap">
                    <input
                      className={`field-input${fe.confirmPassword ? " field-input--error" : confirmPassword && confirmPassword !== password ? " field-input--error" : ""}`}
                      type={showConfirm ? "text" : "password"}
                      id="reg-confirm"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); fe_clear("confirmPassword"); }}
                      onBlur={() => { const err = validateConfirm(confirmPassword, password); if (err) fe_set("confirmPassword", err); }}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                    />
                    <button type="button" className="field-toggle" onClick={() => setShowConfirm(!showConfirm)} aria-label="Toggle confirm password">
                      {showConfirm
                        ? <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                  {fe.confirmPassword
                    ? <p className="field-error">{fe.confirmPassword}</p>
                    : confirmPassword && confirmPassword !== password
                      ? <p className="field-error">Passwords do not match.</p>
                      : confirmPassword && confirmPassword === password
                        ? <p className="field-hint field-hint--ok">Passwords match.</p>
                        : null
                  }
                </div>

                <div className="check-row">
                  <input
                    className="check-input"
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
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
