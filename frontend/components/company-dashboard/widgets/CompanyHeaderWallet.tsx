"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listCompanyCoinPacks, type CompanyCoinPack } from "../../../lib/api";
import { purchaseCompanyCoins } from "../../../lib/company-purchase-coins";

type Props = {
  balanceCredits: number | null;
  coinPriceInr?: number;
  loading?: boolean;
  onRefresh: () => Promise<void>;
  onPurchaseSuccess: (message: string) => void;
  onPurchaseError: (message: string) => void;
  onViewAll?: () => void;
};

export function CompanyHeaderWallet({
  balanceCredits,
  coinPriceInr = 10,
  loading = false,
  onRefresh,
  onPurchaseSuccess,
  onPurchaseError,
  onViewAll,
}: Props) {
  const [open, setOpen] = useState(false);
  const [packs, setPacks] = useState<CompanyCoinPack[]>([]);
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const packsLoadedRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; });

  const loadPacks = useCallback(async () => {
    if (packsLoadedRef.current) return;
    try {
      const data = await listCompanyCoinPacks();
      setPacks(data.packs);
      packsLoadedRef.current = true;
    } catch {
      /* packs optional */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void onRefreshRef.current();
    void loadPacks();
  }, [open, loadPacks]);

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

  async function buyPack(packId: string) {
    setBuyingPackId(packId);
    try {
      const res = await purchaseCompanyCoins({ packId });
      onPurchaseSuccess(res.message);
      await onRefresh();
      setOpen(false);
    } catch (err) {
      onPurchaseError(err instanceof Error ? err.message : "Purchase failed.");
    } finally {
      setBuyingPackId(null);
    }
  }

  const balanceLabel = loading ? "…" : String(balanceCredits ?? 0);

  return (
    <div className="company-wallet-wrap" ref={wrapRef}>
      <button
        type="button"
        className="company-wallet-btn"
        aria-expanded={open}
        aria-haspopup="true"
        title="Scout coin wallet"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="company-wallet-icon" aria-hidden="true">
          ◎
        </span>
        <span className="company-wallet-balance">
          <span className="company-wallet-balance-value">{balanceLabel}</span>
          <span className="company-wallet-balance-label">coins</span>
        </span>
      </button>

      {open ? (
        <div className="company-wallet-panel">
          <div className="company-wallet-panel-head">
            <strong>{balanceLabel} coins</strong>
            <span>1 coin = ₹{coinPriceInr}</span>
          </div>
          <p className="company-wallet-panel-hint">Used for assessments, proctoring, and freelancer interviewer sessions.</p>

          <div className="company-wallet-packs">
            {packs.length === 0 ? (
              <p className="table-caption">Loading packs…</p>
            ) : (
              packs.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  className="company-wallet-pack-btn"
                  disabled={buyingPackId !== null}
                  onClick={() => void buyPack(pack.id)}
                >
                  {buyingPackId === pack.id ? "Processing…" : `${pack.coins} coins · ₹${pack.priceInr}`}
                </button>
              ))
            )}
          </div>

          {onViewAll ? (
            <button type="button" className="company-wallet-view-all" onClick={() => { setOpen(false); onViewAll(); }}>
              Full wallet &amp; custom amount →
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

