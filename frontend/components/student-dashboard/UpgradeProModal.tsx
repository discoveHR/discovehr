"use client";

import { useState } from "react";
import { upgradeStudentToPro } from "../../lib/api/student-wallet";

type Props = {
  open: boolean;
  coinBalance: number;
  onClose: () => void;
  onUpgradeSuccess: (newBalance: number) => void;
  onGoToWallet: () => void;
};

const PRO_COST = 120;

export function UpgradeProModal({ open, coinBalance, onClose, onUpgradeSuccess, onGoToWallet }: Props) {
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState("");
  const canAfford = coinBalance >= PRO_COST;

  if (!open) return null;

  async function handleUpgrade() {
    setError("");
    setUpgrading(true);
    try {
      const result = await upgradeStudentToPro();
      onUpgradeSuccess(coinBalance - PRO_COST);
      onClose();
      alert(result.message || "Congratulations! Your account has been upgraded to Pro.");
    } catch (err) {
      const e = err as Error & { data?: { insufficientCoins?: boolean } };
      setError(e.message || "Upgrade failed. Please try again.");
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <div className="spm-backdrop" onClick={onClose}>
      <div className="spm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="spm-header">
          <span className="spm-crown">👑</span>
          <h2 className="spm-title">Upgrade to Pro</h2>
          <button type="button" className="spm-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p className="spm-desc">
          Unlock premium placement features — view company names, apply for jobs, and access all recruitment tools.
        </p>

        <div className="spm-options">
          <div className="spm-option">
            <div className="spm-option-icon spm-option-icon--tpo">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="spm-option-body">
              <h3>Option 1 — Contact your College TPO</h3>
              <p>Your Training &amp; Placement Officer can activate your Pro membership free of cost if your college has partnered with the platform.</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  alert("Please visit your college placement office or email your TPO to request Pro activation. They will activate it from their dashboard.");
                  onClose();
                }}
              >
                Contact TPO
              </button>
            </div>
          </div>

          <div className="spm-divider"><span>or</span></div>

          <div className="spm-option">
            <div className="spm-option-icon spm-option-icon--coin">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </div>
            <div className="spm-option-body">
              <h3>Option 2 — Upgrade with Coins</h3>
              <p>Pay <strong>120 Coins (₹1,200)</strong> to activate Pro instantly.</p>
              <div className="spm-balance-row">
                <span className="spm-balance-label">Your balance:</span>
                <span className={`spm-balance-val${canAfford ? " spm-balance-val--ok" : " spm-balance-val--low"}`}>
                  {coinBalance} Coins
                </span>
              </div>

              {error && <p className="spm-error">{error}</p>}

              {canAfford ? (
                <button
                  type="button"
                  className="btn-primary spm-upgrade-btn"
                  onClick={() => void handleUpgrade()}
                  disabled={upgrading}
                >
                  {upgrading ? "Upgrading…" : "Upgrade Now (120 Coins)"}
                </button>
              ) : (
                <>
                  <p className="spm-insufficient">
                    Insufficient Coins. You need <strong>{PRO_COST - coinBalance} more coins</strong> to upgrade.
                  </p>
                  <button
                    type="button"
                    className="btn-primary spm-upgrade-btn"
                    onClick={() => { onGoToWallet(); onClose(); }}
                  >
                    Recharge Wallet
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <button type="button" className="btn-secondary spm-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
