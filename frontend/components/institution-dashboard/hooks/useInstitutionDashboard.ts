"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getInstitutionOverview, type InstitutionOverview } from "../../../lib/api/institution";
import { clearPortalSession } from "../../../lib/auth/session";
import type { InstitutionDashboardState, InstitutionMenuKey } from "../types";

export function useInstitutionDashboard(): InstitutionDashboardState {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<InstitutionOverview | null>(null);
  const [activeMenu, setActiveMenu] = useState<InstitutionMenuKey>("overview");
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [displayName, setDisplayName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const sessionRaw = typeof window !== "undefined" ? localStorage.getItem("scout_session") : null;
    const session = sessionRaw ? (JSON.parse(sessionRaw) as { role?: string }) : null;
    if (session?.role !== "tpo") {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await getInstitutionOverview();
        if (cancelled) return;
        setOverview(data);
        const currentTpo = data.tpos.find((t) => t.isCurrent);
        if (currentTpo) {
          setDisplayName(currentTpo.tpoName || currentTpo.email || "");
          setUserEmail(currentTpo.email || "");
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed to load institution data.";
          if (msg.includes("Session expired") || msg.includes("401") || msg.includes("403")) {
            router.replace("/login");
            return;
          }
          setError(msg);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const handleLogout = useCallback(() => {
    clearPortalSession();
    router.replace("/login");
  }, [router]);

  return {
    isLoading,
    error,
    overview,
    activeMenu,
    setActiveMenu,
    selectedBatch,
    setSelectedBatch,
    handleLogout,
    displayName,
    userEmail,
  };
}
