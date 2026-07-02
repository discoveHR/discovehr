"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  coinBalance: number;
  isPro: boolean;
  onOpenWallet: () => void;
  onOpenUpgrade: () => void;
};

export function StudentHeaderWallet({ coinBalance, isPro, onOpenWallet, onOpenUpgrade }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="company-wallet-wrap" ref={wrapRef}>
      <button
        type="button"
        className="company-wallet-btn"
        aria-expanded={open}
        aria-haspopup="true"
        title="Student coin wallet"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="company-wallet-icon" aria-hidden="true">◎</span>
        <span className="company-wallet-balance">
          <span className="company-wallet-balance-value">{coinBalance}</span>
          <span className="company-wallet-balance-label">coins</span>
        </span>
      </button>

      {open ? (
        <div className="company-wallet-panel">
          <div className="company-wallet-panel-head">
            <strong>{coinBalance} coins</strong>
            <span className={`sidebar-pro-badge${isPro ? " sidebar-pro-badge--pro" : " sidebar-pro-badge--normal"}`}>
              {isPro ? "⭐ Pro" : "Normal"}
            </span>
          </div>
          <p className="company-wallet-panel-hint">
            {isPro
              ? "You have full Pro access — apply to jobs, see company names, and all features."
              : "Upgrade to Pro (120 coins) to apply for jobs and reveal company names."}
          </p>

          {!isPro && (
            <button
              type="button"
              className="btn-primary"
              style={{ width: "100%", marginBottom: 8, fontSize: 13 }}
              onClick={() => { setOpen(false); onOpenUpgrade(); }}
            >
              Upgrade to Pro
            </button>
          )}

          <button
            type="button"
            className="company-wallet-view-all"
            onClick={() => { setOpen(false); onOpenWallet(); }}
          >
            Wallet &amp; recharge →
          </button>
        </div>
      ) : null}
    </div>
  );
}
