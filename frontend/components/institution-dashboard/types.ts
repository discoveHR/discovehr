import type { InstitutionOverview } from "../../lib/api/institution";

export type InstitutionMenuKey = "overview" | "students";

export type InstitutionDashboardState = {
  isLoading: boolean;
  error: string | null;
  overview: InstitutionOverview | null;
  activeMenu: InstitutionMenuKey;
  setActiveMenu: React.Dispatch<React.SetStateAction<InstitutionMenuKey>>;
  selectedBatch: string;
  setSelectedBatch: (batch: string) => void;
  handleLogout: () => void;

  displayName: string;
  userEmail: string;
};
