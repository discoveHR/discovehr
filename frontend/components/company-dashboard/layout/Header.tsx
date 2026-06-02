import { AuthHeader } from "../../common/AuthHeader";
import { CompanyHeaderWallet } from "../widgets/CompanyHeaderWallet";
import type { MenuKey } from "../types";

const BANNER_TABS: MenuKey[] = ["dashboard", "post-job", "job-listings"];

type HeaderProps = {
  userName: string;
  userEmail: string;
  activeMenu: MenuKey;
  onPostJobClick: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  balanceCredits: number | null;
  coinPriceInr?: number;
  walletLoading?: boolean;
  onWalletRefresh: () => Promise<void>;
  onWalletPurchaseSuccess: (message: string) => void;
  onWalletPurchaseError: (message: string) => void;
  onOpenCreditPurchase: () => void;
  onSidebarToggle?: () => void;
};

export function Header({
  userName,
  userEmail,
  activeMenu,
  onPostJobClick,
  theme,
  onToggleTheme,
  balanceCredits,
  coinPriceInr,
  walletLoading,
  onWalletRefresh,
  onWalletPurchaseSuccess,
  onWalletPurchaseError,
  onOpenCreditPurchase,
  onSidebarToggle,
}: HeaderProps) {
  return (
    <>
      <AuthHeader
        title="Company Dashboard"
        subtitle="Manage job posts, listings, and candidate pipeline in one place."
        userName={userName}
        roleLabel="Company"
        userEmail={userEmail}
        theme={theme}
        onToggleTheme={onToggleTheme}
        notificationCount={2}
        onSidebarToggle={onSidebarToggle}
        extraActions={
          <CompanyHeaderWallet
            balanceCredits={balanceCredits}
            coinPriceInr={coinPriceInr}
            loading={walletLoading}
            onRefresh={onWalletRefresh}
            onPurchaseSuccess={onWalletPurchaseSuccess}
            onPurchaseError={onWalletPurchaseError}
            onViewAll={onOpenCreditPurchase}
          />
        }
      />

      {BANNER_TABS.includes(activeMenu) && (
        <section className="company-banner">
          <h3>Ready to hire?</h3>
          <p>Post a new job and start receiving applications from eligible students.</p>
          <button type="button" className="btn company-banner-btn" onClick={onPostJobClick}>
            Post Job for Free
          </button>
        </section>
      )}
    </>
  );
}

