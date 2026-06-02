"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SubAdminSidebar, type SubAdminMenuKey } from "../../../components/sub-admin-dashboard/Sidebar";
import { SubAdminJobsPanel } from "../../../components/sub-admin-dashboard/JobsPanel";
import { SubAdminApplicantsPanel } from "../../../components/sub-admin-dashboard/ApplicantsPanel";
import { SubAdminInterviewsPanel } from "../../../components/sub-admin-dashboard/InterviewsPanel";
import { PortalDashboardLoader } from "../../../components/auth/PortalDashboardLoader";
import { clearPortalSession } from "../../../lib/auth/session";
import { companyLogout, getCompanyMe } from "../../../lib/api";

type SubAdminUser = {
  id: string;
  full_name: string;
  email: string;
  isSubAdmin?: boolean;
  assignedDistrict?: string;
  assignedState?: string;
  companyName?: string;
};

export default function SubAdminDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<SubAdminUser | null>(null);
  const [activeMenu, setActiveMenu] = useState<SubAdminMenuKey>("company-jobs");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [filterJobId, setFilterJobId] = useState<string | undefined>();
  const [filterJobTitle, setFilterJobTitle] = useState<string | undefined>();

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const me = await getCompanyMe();
        if (cancelled) return;
        const meUser = me?.user as SubAdminUser;
        if (!meUser?.isSubAdmin) {
          router.replace("/company/dashboard");
          return;
        }
        setUser(meUser);
      } catch {
        if (!cancelled) router.replace("/login");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    try {
      await companyLogout();
    } catch {
      /* best effort */
    }
    clearPortalSession();
    router.replace("/login");
  }

  function handleViewApplicants(jobId: string, jobTitle: string) {
    setFilterJobId(jobId);
    setFilterJobTitle(jobTitle);
    setActiveMenu("district-applicants");
  }

  function handleClearFilter() {
    setFilterJobId(undefined);
    setFilterJobTitle(undefined);
  }

  function handleMenuChange(key: SubAdminMenuKey) {
    if (key !== "district-applicants") {
      setFilterJobId(undefined);
      setFilterJobTitle(undefined);
    }
    setActiveMenu(key);
  }

  if (isLoading) {
    return <PortalDashboardLoader portal="company" />;
  }

  const district = user?.assignedDistrict || "";
  const state = user?.assignedState || "";
  const companyName = user?.companyName || "Your company";

  return (
    <div className="company-dashboard-root">
      <SubAdminSidebar
        userName={user?.full_name || ""}
        companyName={companyName}
        district={district}
        state={state}
        activeMenu={activeMenu}
        onMenuChange={handleMenuChange}
        onLogout={() => void handleLogout()}
      />

      <main className="company-main">
        <div className="company-topbar sub-admin-topbar">
          <div>
            <p className="sub-admin-company-label">Company</p>
            <h1 className="sub-admin-company-title">{companyName}</h1>
            <p className="sub-admin-topbar-meta">
              {activeMenu === "company-jobs" && "Jobs posted by your company"}
              {activeMenu === "district-applicants" && "Applicants from your assigned district"}
              {activeMenu === "interviews" && "Interviews you have scheduled"}
              {district ? (
                <>
                  {" "}
                  · District: <strong>{district}</strong>
                  {state ? `, ${state}` : ""}
                </>
              ) : null}
            </p>
          </div>
          <div className="sub-admin-topbar-user">
            <span className="sub-admin-topbar-user-name">{user?.full_name}</span>
            <span className="sub-admin-topbar-user-email">{user?.email}</span>
          </div>
        </div>

        <div className="company-content">
          {activeMenu === "company-jobs" && (
            <SubAdminJobsPanel
              companyName={companyName}
              district={district}
              onViewApplicants={handleViewApplicants}
              onError={(msg) => showToast(msg, "error")}
            />
          )}
          {activeMenu === "district-applicants" && (
            <SubAdminApplicantsPanel
              district={district}
              companyName={companyName}
              filterJobId={filterJobId}
              filterJobTitle={filterJobTitle}
              onClearFilter={handleClearFilter}
              onError={(msg) => showToast(msg, "error")}
              onSuccess={(msg) => showToast(msg, "success")}
            />
          )}
          {activeMenu === "interviews" && (
            <SubAdminInterviewsPanel district={district} onError={(msg) => showToast(msg, "error")} />
          )}
        </div>
      </main>

      {toast && (
        <div className={`company-toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
