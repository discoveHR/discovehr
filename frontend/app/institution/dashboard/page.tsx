"use client";

import { QueryProvider } from "../../../components/providers/QueryProvider";
import { InstitutionDashboardView } from "../../../components/institution-dashboard/InstitutionDashboardView";
import { useInstitutionDashboard } from "../../../components/institution-dashboard/hooks/useInstitutionDashboard";

function InstitutionDashboardInner() {
  const dashboard = useInstitutionDashboard();
  return <InstitutionDashboardView dashboard={dashboard} />;
}

export default function InstitutionDashboardPage() {
  return (
    <QueryProvider>
      <InstitutionDashboardInner />
    </QueryProvider>
  );
}
