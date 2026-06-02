"use client";

import { PortalDashboardLoader } from "../../../components/auth/PortalDashboardLoader";
import { StudentDashboardView } from "../../../components/student-dashboard/StudentDashboardView";
import { useStudentDashboard } from "../../../components/student-dashboard/hooks/useStudentDashboard";

export default function StudentDashboardPage() {
  const { dashboard } = useStudentDashboard();

  if (dashboard.isLoading) {
    return <PortalDashboardLoader portal="student" />;
  }

  if (dashboard.error && !dashboard.student) {
    return (
      <main className="company-page">
        <section className="company-shell">
          <div className="company-main">
            <h1 className="company-title">Student dashboard unavailable</h1>
            <p className="company-subtitle">{dashboard.error}</p>
            <p className="company-subtitle" style={{ marginTop: 12 }}>
              If this mentions Frappe or the API, start the backend in WSL:{" "}
              <code>cd ~/frappe-bench && bench start</code> (or run{" "}
              <code>.\start-dev.ps1</code> from the project folder), then refresh.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return <StudentDashboardView dashboard={dashboard} />;
}
