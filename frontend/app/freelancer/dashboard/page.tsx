"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PortalDashboardLoader } from "../../../components/auth/PortalDashboardLoader";
import { FreelancerProfilePanel } from "../../../components/freelancer-dashboard/FreelancerProfilePanel";
import { FreelancerReferralsPanel } from "../../../components/freelancer-dashboard/FreelancerReferralsPanel";
import { clearPortalSession } from "../../../lib/auth/session";
import {
  applyToJob,
  getFreelancerDashboard,
  listFreelancerInterviewAssignments,
  listStudentJobs,
  type FreelancerInterviewAssignment,
  type FreelancerProfileData,
  type JobItem,
} from "../../../lib/api";

type MenuKey = "profile" | "assignments" | "jobs" | "referrals";

function formatWhen(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function FreelancerDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ id: string; full_name: string; email: string } | null>(null);
  const [profile, setProfile] = useState<FreelancerProfileData | null>(null);
  const [activeMenu, setActiveMenu] = useState<MenuKey>("profile");
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [assignments, setAssignments] = useState<FreelancerInterviewAssignment[]>([]);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const sessionRaw = localStorage.getItem("scout_session");
        const session = sessionRaw ? (JSON.parse(sessionRaw) as { role?: string }) : null;
        const role = session?.role;
        if (role === "jobseeker") {
          router.replace("/jobseeker/dashboard");
          return;
        }
        if (role !== "freelancer") {
          router.replace("/login");
          return;
        }
        const data = await getFreelancerDashboard();
        setUser(data.user);
        setProfile(data.profile);
        const fetchAssignments = data.profile.approvalStatus === "Approved"
          ? listFreelancerInterviewAssignments()
          : Promise.resolve([] as FreelancerInterviewAssignment[]);
        const fetchJobs = data.profile.canApplyToJobs
          ? listStudentJobs({ page: 1, pageSize: 20 })
          : Promise.resolve(null);
        const [assignmentsData, jobsData] = await Promise.all([fetchAssignments, fetchJobs]);
        setAssignments(assignmentsData);
        if (jobsData) setJobs(jobsData.jobs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load dashboard.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [router]);

  async function handleApply(jobId: string) {
    setApplyingJobId(jobId);
    setError("");
    try {
      await applyToJob(jobId);
      const jobData = await listStudentJobs({ page: 1, pageSize: 20 });
      setJobs(jobData.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to apply.");
    } finally {
      setApplyingJobId(null);
    }
  }

  function handleLogout() {
    clearPortalSession();
    router.replace("/login");
  }

  if (isLoading) {
    return <PortalDashboardLoader portal="freelancer" />;
  }

  return (
    <main className="tpo-dashboard">
      <aside className="tpo-dashboard-sidebar">
        <div className="tpo-dashboard-brand">
          <div className="tpo-brand-logo">
            <span className="tpo-brand-mark">
              <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" stroke="#6f9bff" strokeWidth="2" fill="none" />
                <circle cx="16" cy="16" r="5" fill="#6f9bff" />
                <circle cx="26" cy="9" r="2.6" fill="#ffffff" />
              </svg>
            </span>
            <span className="tpo-brand-name">Discove<b>HR</b></span>
          </div>
          <span className="tpo-brand-suite">Freelance Recruiter</span>
        </div>
        <nav className="tpo-dashboard-nav" aria-label="Freelance recruiter sections">
          <button
            type="button"
            className={`tpo-nav-item ${activeMenu === "profile" ? "active" : ""}`}
            onClick={() => setActiveMenu("profile")}
          >
            Profile & documents
          </button>
          <button
            type="button"
            className={`tpo-nav-item ${activeMenu === "jobs" ? "active" : ""}`}
            onClick={() => setActiveMenu("jobs")}
            disabled={!profile?.canApplyToJobs}
            title={profile?.canApplyToJobs ? undefined : "Available after profile is submitted and approved"}
          >
            Job listings
          </button>
          <button
            type="button"
            className={`tpo-nav-item ${activeMenu === "assignments" ? "active" : ""}`}
            onClick={() => setActiveMenu("assignments")}
            disabled={profile?.approvalStatus !== "Approved"}
            title={
              profile?.approvalStatus === "Approved"
                ? undefined
                : "Available after admin approves your profile"
            }
          >
            Interview assignments
          </button>
          <button
            type="button"
            className={`tpo-nav-item ${activeMenu === "referrals" ? "active" : ""}`}
            onClick={() => setActiveMenu("referrals")}
            disabled={profile?.approvalStatus !== "Approved"}
            title={
              profile?.approvalStatus === "Approved"
                ? undefined
                : "Available after admin approves your profile"
            }
          >
            Refer candidates
          </button>
        </nav>
        <button className="tpo-sidebar-logout" type="button" onClick={handleLogout}>
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="1.8">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </aside>

      <div className="tpo-dashboard-main">
        <header className="tpo-topbar">
          <div className="tpo-topbar-left">
            <h1>
              {activeMenu === "jobs"
                ? "Job listings"
                : activeMenu === "assignments"
                  ? "Interview assignments"
                  : activeMenu === "referrals"
                    ? "Refer candidates"
                    : "Profile & documents"}
            </h1>
            <p>{user?.email || "Freelance recruiter dashboard"}</p>
          </div>
          <div className="tpo-topbar-right">
            <strong>{user?.full_name || "Freelance Recruiter"}</strong>
          </div>
        </header>
        <div className="tpo-dashboard-body">
          {error ? <p className="error">{error}</p> : null}
          {activeMenu === "profile" && profile && user ? (
            <FreelancerProfilePanel userId={user.id} profile={profile} onSaved={setProfile} />
          ) : null}
          {activeMenu === "assignments" ? (
            <div className="tpo-panel">
              <h3>Company interview assignments</h3>
              <p className="table-caption">
                Interviews assigned to you by employers for their shortlisted candidates.
              </p>
              {assignments.length === 0 ? (
                <p className="table-caption">No assignments yet.</p>
              ) : (
                <ul className="job-list">
                  {assignments.map((item) => (
                    <li key={item.id} className="job-card">
                      <strong>{item.jobTitle}</strong>
                      <p>
                        {item.companyName} · Candidate: {item.candidateName}
                      </p>
                      <p className="table-caption">{formatWhen(item.startDatetime)}</p>
                      {item.meetingLink ? (
                        <p>
                          <a href={item.meetingLink} target="_blank" rel="noreferrer">
                            Join meeting
                          </a>
                        </p>
                      ) : null}
                      {item.notes ? <p className="table-caption">{item.notes}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
          {activeMenu === "referrals" && profile?.approvalStatus === "Approved" ? (
            <FreelancerReferralsPanel />
          ) : null}
          {activeMenu === "jobs" ? (
            <div className="tpo-panel">
              <h3>Open jobs</h3>
              {!profile?.canApplyToJobs ? (
                <p className="table-caption">Submit your profile and wait for admin approval to browse jobs.</p>
              ) : jobs.length === 0 ? (
                <p className="table-caption">No active jobs right now.</p>
              ) : (
                <ul className="job-list">
                  {jobs.map((job) => (
                    <li key={job.id} className="job-card">
                      <strong>{job.title}</strong>
                      <p>{job.companyName}</p>
                      <button
                        type="button"
                        className="btn"
                        disabled={applyingJobId === job.id}
                        onClick={() => void handleApply(job.id)}
                      >
                        {applyingJobId === job.id ? "Applying…" : "Apply"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
