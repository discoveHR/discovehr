"use client";

import type { ReactNode } from "react";
import type { PortalRoleConfig } from "../../lib/auth/portal-roles";

type AuthShellProps = {
  role: PortalRoleConfig;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ role, children, footer }: AuthShellProps) {
  return (
    <main className="page">
      <section className="panel">
        <div className="left">
          <span className="badge">Scout Express · {role.badge}</span>
          <h1 className="title">{role.title}</h1>
          <p className="subtitle">{role.subtitle}</p>
          <ul className="points">
            {role.points.map((point) => (
              <li key={point}>- {point}</li>
            ))}
          </ul>
        </div>
        <div className="right">{children}</div>
      </section>
      {footer ? <div className="auth-shell-footer">{footer}</div> : null}
    </main>
  );
}
