import type { ReactNode } from "react";
import type { TpoAccountStatus } from "../../lib/api";

type Props = {
  status: TpoAccountStatus;
  displayName: string;
  onLogout: () => void;
};

export function TpoAccountStatusPanel({ status, displayName, onLogout }: Props) {
  const category = status.managerCategory?.trim() || "your assigned college";

  if (status.approvalStatus === "Rejected") {
    return (
      <StatusLayout badge="Not approved" badgeVariant="rejected" title="Registration not approved" onLogout={onLogout}>
        <p>
          Hello {displayName}, your TPO registration was not approved.
          {status.rejectionReason ? ` Reason: ${status.rejectionReason}` : null}
        </p>
        <p className="table-caption">Contact your platform administrator if you believe this was a mistake.</p>
      </StatusLayout>
    );
  }

  return (
    <StatusLayout badge="Pending review" badgeVariant="pending" title="Awaiting admin approval" onLogout={onLogout}>
      <p>
        Hello {displayName}, your Training &amp; Placement Officer registration is pending review. Once an administrator
        approves you, you will be enabled as a college manager under category <strong>{category}</strong> and can set up
        your college profile.
      </p>
      <p className="table-caption">Check back after approval or contact your platform administrator.</p>
    </StatusLayout>
  );
}

function StatusLayout({
  badge,
  badgeVariant,
  title,
  children,
  onLogout,
}: {
  badge: string;
  badgeVariant: "pending" | "rejected";
  title: string;
  children: ReactNode;
  onLogout: () => void;
}) {
  return (
    <main className="tpo-dashboard tpo-dashboard--standalone">
      <div className="tpo-dashboard-main">
        <header className="tpo-status-topbar">
          <div className="tpo-status-brand">
            Scout
            <span>Placement Suite</span>
          </div>
          <button type="button" className="btn secondary" onClick={onLogout}>
            Sign out
          </button>
        </header>
        <div className="tpo-status-screen">
          <article className="tpo-status-card">
            <span className={`tpo-status-badge tpo-status-badge--${badgeVariant}`}>{badge}</span>
            <h1 className="company-title">{title}</h1>
            {children}
          </article>
        </div>
      </div>
    </main>
  );
}
