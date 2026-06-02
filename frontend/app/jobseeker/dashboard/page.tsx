"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PortalDashboardLoader } from "../../../components/auth/PortalDashboardLoader";

/** Job seekers use the freelancer interviewer profile & approval flow. */
export default function JobSeekerDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/freelancer/dashboard");
  }, [router]);

  return <PortalDashboardLoader portal="jobseeker" />;
}
