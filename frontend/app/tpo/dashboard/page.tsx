"use client";

import { QueryProvider } from "../../../components/providers/QueryProvider";
import { TpoDashboardView } from "../../../components/tpo-dashboard/TpoDashboardView";
import { useTpoDashboard } from "../../../components/tpo-dashboard/hooks/useTpoDashboard";

function TpoDashboardInner() {
  const dashboard = useTpoDashboard();
  return <TpoDashboardView dashboard={dashboard} />;
}

export default function TpoDashboardPage() {
  return (
    <QueryProvider>
      <TpoDashboardInner />
    </QueryProvider>
  );
}
