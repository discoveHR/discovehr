"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCompanyCreditWallet,
  listCompanyCoinPacks,
  type CompanyCoinPack,
  type CompanyCreditWallet,
} from "../../../lib/api";
import { purchaseCompanyCoins } from "../../../lib/company-purchase-coins";

type Props = {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  prefillEmail?: string;
};

function formatWhen(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const RATE_ICONS: Record<string, string> = {
  assessment: "📝",
  freelanceInterview: "🎙️",
  fullProctoring: "🔒",
  standardProctoring: "🛡️",
};

export function CompanyCreditsPanel({ onError, onSuccess, prefillEmail }: Props) {
  const [wallet, setWallet] = useState<CompanyCreditWallet | null>(null);
  const [packs, setPacks] = useState<CompanyCoinPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<string>("");
  const [customCoins, setCustomCoins] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [w, p] = await Promise.all([getCompanyCreditWallet(), listCompanyCoinPacks()]);
      setWallet(w);
      setPacks(p.packs);
      setSelectedPackId((prev) => prev || p.packs[1]?.id || p.packs[0]?.id || "");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to load credits.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { void load(); }, [load]);

  async function handlePurchase() {
    if (buying) return;
    setBuying(true);
    try {
      const customNum = customCoins ? Number.parseInt(customCoins, 10) : 0;
      const res = await purchaseCompanyCoins(
        customNum > 0 ? { customCoins: customNum } : { packId: selectedPackId },
        prefillEmail,
      );
      onSuccess(res.message);
      setCustomCoins("");
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Purchase failed.");
    } finally {
      setBuying(false);
    }
  }

  const coinPrice = wallet?.coinPriceInr ?? 10;
  const rates = wallet?.rates;
  const customNum = customCoins ? Number.parseInt(customCoins, 10) : 0;
  const isCustom = customNum > 0;
  const selectedPack = packs.find((p) => p.id === selectedPackId);
  const purchaseCoins = isCustom ? customNum : (selectedPack?.coins ?? 0);
  const purchaseAmount = isCustom ? customNum * coinPrice : (selectedPack?.priceInr ?? 0);
  const canBuy = purchaseCoins > 0 && (!isCustom || (customNum >= 1 && customNum <= 10000));

  if (loading) {
    return (
      <div className="credits-page">
        <div className="credits-loading">
          <div className="credits-spinner" />
          <span>Loading wallet…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="credits-page">

      {/* ── Wallet balance card ── */}
      <div className="credits-wallet-card">
        <div className="credits-wallet-left">
          <div className="credits-wallet-coin-icon">🪙</div>
          <div>
            <div className="credits-wallet-balance">{wallet?.balanceCredits ?? 0}</div>
            <div className="credits-wallet-sublabel">coins in your wallet</div>
          </div>
        </div>
        <div className="credits-wallet-divider" />
        <div className="credits-rates-grid">
          {[
            { key: "assessment",       label: "Assessment",          val: rates?.assessment ?? 1,       suffix: "coin"  },
            { key: "freelanceInterview", label: "Freelancer interview", val: rates?.freelanceInterview ?? 5, suffix: "coins" },
            { key: "fullProctoring",   label: "Full proctoring",     val: rates?.fullProctoring ?? 3,   suffix: "coins", prefix: "+" },
            { key: "standardProctoring", label: "Standard proctoring", val: rates?.standardProctoring ?? 1, suffix: "coin", prefix: "+" },
          ].map(({ key, label, val, suffix, prefix = "" }) => (
            <div key={key} className="credits-rate-item">
              <span className="credits-rate-icon">{RATE_ICONS[key]}</span>
              <div>
                <div className="credits-rate-label">{label}</div>
                <div className="credits-rate-cost">{prefix}{val} {suffix}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Purchase section ── */}
      <div className="credits-purchase-card">
        <div className="credits-purchase-header">
          <div>
            <h3 className="credits-purchase-title">Buy coins</h3>
            <p className="credits-purchase-sub">Select a pack or enter a custom amount</p>
          </div>
          <span className="credits-coin-rate-badge">1 coin = ₹{coinPrice}</span>
        </div>

        {/* Pack grid */}
        <div className="credits-pack-grid">
          {packs.map((pack) => {
            const isSelected = !isCustom && selectedPackId === pack.id;
            const perCoin = pack.priceInr / pack.coins;
            const isBest = pack.coins === 100; // highlight the 100-coin pack as "best value"
            return (
              <button
                key={pack.id}
                type="button"
                className={`credits-pack-card${isSelected ? " credits-pack-card--active" : ""}${isBest ? " credits-pack-card--best" : ""}`}
                onClick={() => { setSelectedPackId(pack.id); setCustomCoins(""); }}
              >
                {isBest && <span className="credits-pack-best-badge">Best value</span>}
                <div className="credits-pack-coins">🪙 {pack.coins}</div>
                <div className="credits-pack-coins-label">coins</div>
                <div className="credits-pack-price">₹{pack.priceInr.toLocaleString("en-IN")}</div>
                <div className="credits-pack-per">₹{perCoin.toFixed(0)}/coin</div>
              </button>
            );
          })}
        </div>

        {/* Custom amount */}
        <div className="credits-custom-row">
          <label className="credits-custom-label" htmlFor="credits-custom-input">
            Or enter custom coins
          </label>
          <div className="credits-custom-input-wrap">
            <span className="credits-custom-coin-icon">🪙</span>
            <input
              id="credits-custom-input"
              className="credits-custom-input"
              type="number"
              min={1}
              max={10000}
              value={customCoins}
              onChange={(e) => setCustomCoins(e.target.value)}
              placeholder="e.g. 25"
            />
            {isCustom && customNum >= 1 && (
              <span className="credits-custom-equiv">= ₹{(customNum * coinPrice).toLocaleString("en-IN")}</span>
            )}
          </div>
          {isCustom && (customNum < 1 || customNum > 10000) && (
            <p className="credits-custom-error">Enter between 1 and 10,000 coins.</p>
          )}
        </div>

        {/* Buy button */}
        <button
          type="button"
          className="credits-buy-btn"
          disabled={buying || !canBuy}
          onClick={() => void handlePurchase()}
        >
          {buying ? (
            <><div className="credits-btn-spinner" /> Processing payment…</>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              {canBuy
                ? `Pay ₹${purchaseAmount.toLocaleString("en-IN")} for ${purchaseCoins} coins`
                : "Select a pack or enter coins"}
              <span className="credits-rzp-tag">via Razorpay</span>
            </>
          )}
        </button>

        <p className="credits-secure-note">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Secured by Razorpay · Card details are never stored on our servers
        </p>
      </div>

      {/* ── Transaction history ── */}
      <section className="company-table-wrap">
        <div className="company-table-head credits-txn-head">
          <div>
            <h3>Transaction history</h3>
            <span className="table-caption">Last 40 coin transactions</span>
          </div>
          <span className="jl-total-badge">{(wallet?.transactions || []).length} records</span>
        </div>

        {(wallet?.transactions || []).length === 0 ? (
          <div className="applicants-empty">
            <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#cbd5e1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            <p>No transactions yet</p>
            <span>Your coin purchases and usage will appear here.</span>
          </div>
        ) : (
          <div className="credits-txn-list">
            {wallet?.transactions.map((txn) => {
              const isPositive = txn.credits > 0;
              return (
                <div key={txn.id} className="credits-txn-row">
                  <div className={`credits-txn-arrow ${isPositive ? "credits-txn-arrow--in" : "credits-txn-arrow--out"}`}>
                    {isPositive ? (
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
                      </svg>
                    )}
                  </div>
                  <div className="credits-txn-info">
                    <div className="credits-txn-type">{txn.type}</div>
                    {txn.note && <div className="credits-txn-note">{txn.note}</div>}
                  </div>
                  <div className="credits-txn-meta">
                    <div className={`credits-txn-coins ${isPositive ? "credits-txn-coins--pos" : "credits-txn-coins--neg"}`}>
                      {isPositive ? "+" : ""}{txn.credits} coins
                    </div>
                    {txn.amountInr > 0 && (
                      <div className="credits-txn-inr">₹{txn.amountInr.toLocaleString("en-IN")}</div>
                    )}
                    <div className="credits-txn-date">{formatWhen(txn.at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}

