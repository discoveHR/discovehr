"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getFreelancerDashboard,
  listStudentJobs,
  applyToJob,
  type FreelancerProfileData,
  type JobItem,
} from "../../../lib/api";
import { clearPortalSession } from "../../../lib/auth/session";
import type { JsMenuKey, JobSeekerDashboardState } from "../types";

export function useJobSeekerDashboard(): JobSeekerDashboardState {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ id: string; full_name: string; email: string } | null>(null);
  const [profile, setProfile] = useState<FreelancerProfileData | null>(null);
  const [activeMenu, setActiveMenu] = useState<JsMenuKey>("home");
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobPage, setJobPage] = useState(1);
  const [jobTotalPages, setJobTotalPages] = useState(1);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessionRaw = typeof window !== "undefined" ? localStorage.getItem("scout_session") : null;
        const session = sessionRaw ? (JSON.parse(sessionRaw) as { role?: string }) : null;
        if (session?.role !== "jobseeker") {
          router.replace("/login");
          return;
        }
        const data = await getFreelancerDashboard();
        if (cancelled) return;
        setUser(data.user);
        setProfile(data.profile);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load dashboard.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const loadJobs = useCallback(async (page: number) => {
    setJobsLoading(true);
    try {
      const result = await listStudentJobs({ page, pageSize: 15 });
      setJobs(result.jobs || []);
      setJobTotalPages(result.pagination?.totalPages ?? 1);
      setJobPage(page);
    } catch {
      // silently ignore — jobs panel shows empty state
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeMenu === "jobs" && jobs.length === 0 && !jobsLoading) {
      void loadJobs(1);
    }
  }, [activeMenu, jobs.length, jobsLoading, loadJobs]);

  const goToJobPage = useCallback((page: number) => void loadJobs(page), [loadJobs]);

  const handleApply = useCallback(async (jobId: string) => {
    setApplyingJobId(jobId);
    setError("");
    try {
      await applyToJob(jobId);
      await loadJobs(jobPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to apply.");
    } finally {
      setApplyingJobId(null);
    }
  }, [jobPage, loadJobs]);

  const handleLogout = useCallback(() => {
    clearPortalSession();
    router.replace("/login");
  }, [router]);

  const displayName = user?.full_name || user?.email || "";

  return {
    isLoading,
    error,
    user,
    profile,
    activeMenu,
    setActiveMenu,
    jobs,
    jobsLoading,
    jobPage,
    jobTotalPages,
    goToJobPage,
    applyingJobId,
    handleApply,
    handleLogout,
    displayName,
  };
}
