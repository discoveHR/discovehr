"use client";

import { JobSeekerDashboardView } from "../../../components/jobseeker-dashboard/JobSeekerDashboardView";
import { useJobSeekerDashboard } from "../../../components/jobseeker-dashboard/hooks/useJobSeekerDashboard";

export default function JobSeekerDashboardPage() {
  const dashboard = useJobSeekerDashboard();
  return <JobSeekerDashboardView dashboard={dashboard} />;
}
