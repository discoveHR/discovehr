"use client";

type AuthLoadingScreenProps = {
  message?: string;
  subtitle?: string;
  /** portal = dark (login/dashboard load), admin = light, dashboard = light */
  variant?: "portal" | "admin" | "dashboard";
  /** Full viewport or centered overlay on an existing card */
  mode?: "fullscreen" | "overlay";
};

export function AuthLoadingScreen({
  message = "Loading…",
  subtitle,
  variant = "portal",
  mode = "fullscreen",
}: AuthLoadingScreenProps) {
  const rootClass = [
    mode === "overlay" ? "auth-loading-overlay" : "auth-loading-page",
    `auth-loading--${variant}`,
  ].join(" ");

  const isPortal = variant === "portal";

  /* colour tokens per variant */
  const logoRing  = isPortal ? "#34d399" : "#059669";
  const logoDot   = isPortal ? "#34d399" : "#059669";
  const logoSat   = isPortal ? "#ffffff"  : "#0d0f1a";

  return (
    <div className={rootClass} role="status" aria-live="polite" aria-busy="true">
      <div className="auth-loading-card">

        {/* Spinning rings + DiscoveHR logo mark */}
        <div className="auth-loading-spinner" aria-hidden>
          <span className="auth-loading-ring auth-loading-ring--outer" />
          <span className="auth-loading-ring auth-loading-ring--inner" />
          <span className="auth-loading-ring auth-loading-ring--glow" />
          <span className="auth-loading-logo">
            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="30" height="30">
              <circle cx="16" cy="16" r="13" stroke={logoRing} strokeWidth="2" fill="none" />
              <circle cx="16" cy="16" r="5"  fill={logoDot} />
              <circle cx="25.2" cy="8.8" r="2.6" fill={logoSat} />
            </svg>
          </span>
        </div>

        {/* Brand wordmark */}
        <div className="auth-loading-brand" aria-hidden>
          Discove<strong>HR</strong>
        </div>

        {/* Message */}
        <p className="auth-loading-message">{message}</p>
        {subtitle ? <p className="auth-loading-subtitle">{subtitle}</p> : null}

        {/* Animated dots */}
        <div className="auth-loading-dots" aria-hidden>
          <span /><span /><span />
        </div>

      </div>
    </div>
  );
}
