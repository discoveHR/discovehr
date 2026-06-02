"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogout, getAdminMe, getAdminOverview, type AdminOverview, type AdminUser } from "../../../lib/api";

export function useAdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMenu, setActiveMenu] = useState<
    | "overview"
    | "colleges"
    | "companies"
    | "freelancer-approvals"
    | "tpo-approvals"
    | "psychometric"
    | "aptitude"
    | "referrals"
  >("overview");

  useEffect(() => {
    void (async () => {
      try {
        const sessionRaw = localStorage.getItem("scout_session");
        const session = sessionRaw ? (JSON.parse(sessionRaw) as { role?: string }) : null;
        if (session?.role !== "admin") {
          router.replace("/admin/login");
          return;
        }

        const [me, data] = await Promise.all([getAdminMe(), getAdminOverview()]);
        setUser(me.user);
        setOverview(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load admin dashboard.";
        setError(message);
        if (message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("not logged")) {
          router.replace("/admin/login");
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [router]);

  async function handleLogout() {
    await adminLogout();
    localStorage.removeItem("scout_session");
    router.push("/admin/login");
  }

  return { user, overview, isLoading, error, handleLogout, activeMenu, setActiveMenu };
}
