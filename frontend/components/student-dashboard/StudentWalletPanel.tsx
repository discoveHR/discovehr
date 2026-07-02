"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createCoinPurchaseOrder,
  getStudentWallet,
  upgradeStudentToPro,
  verifyCoinPurchase,
  type CoinPurchaseOrder,
} from "../../lib/api/student-wallet";
import type { CoinPackage, WalletTransaction } from "../../lib/api/types";

type Props = {
  isPro: boolean;
  coinBalance: number;
  onError: (m: string) => void;
  onSuccess: (m: string) => void;
  onProUpgrade: () => void;
  onBalanceChange: (newBalance: number, newIsPro: boolean) => void;
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay?: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export function StudentWalletPanel({ isPro, coinBalance, onError, onSuccess, onProUpgrade, onBalanceChange }: Props) {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [localBalance, setLocalBalance] = useState(coinBalance);
  const [localIsPro, setLocalIsPro] = useState(isPro);
  const [loading, setLoading] = useState(true);
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await getStudentWallet();
      setPackages(data.packages);
      setTransactions(data.transactions);
      setLocalBalance(data.coinBalance);
      setLocalIsPro(data.isPro);
      onBalanceChange(data.coinBalance, data.isPro);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to load wallet.");
    } finally {
      setLoading(false);
    }
  }, [onBalanceChange, onError]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void load();
  }, [load]);

  async function handleBuy(pack: CoinPackage) {
    setBuyingPackId(pack.id);
    try {
      const order = await createCoinPurchaseOrder(pack.id);
      if (order.devBypass) {
        await completePurchase(order, "", "", "");
        return;
      }
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        onError("Could not load payment gateway. Please try again.");
        return;
      }
      const rz = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: "DiscoveHR",
        description: `${pack.coins} Coins — ${pack.label}`,
        order_id: order.razorpayOrderId,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          await completePurchase(order, response.razorpay_payment_id, response.razorpay_order_id, response.razorpay_signature);
        },
        prefill: {},
        theme: { color: "#6366f1" },
        modal: { ondismiss: () => setBuyingPackId(null) },
      });
      rz.open();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Payment initiation failed.");
      setBuyingPackId(null);
    }
  }

  async function completePurchase(order: CoinPurchaseOrder, paymentId: string, orderId: string, signature: string) {
    try {
      const result = await verifyCoinPurchase({
        paymentOrderId: order.paymentOrderId,
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId,
        razorpaySignature: signature,
      });
      setLocalBalance(result.coinBalance);
      onBalanceChange(result.coinBalance, localIsPro);
      onSuccess(`Coins added! New balance: ${result.coinBalance} coins.`);
      loadedRef.current = false;
      void load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Payment verification failed.");
    } finally {
      setBuyingPackId(null);
    }
  }

  async function handleUpgradeToPro() {
    setUpgrading(true);
    try {
      const result = await upgradeStudentToPro();
      setLocalIsPro(true);
      const newBal = localBalance - 120;
      setLocalBalance(newBal);
      onBalanceChange(newBal, true);
      onProUpgrade();
      onSuccess(result.message || "Congratulations! Your account has been upgraded to Pro.");
      loadedRef.current = false;
      void load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upgrade failed.");
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <section className="wallet-wrap">
      <div className="wallet-header">
        <div>
          <h2 className="wallet-title">Coin Wallet</h2>
          <p className="wallet-sub">1 Coin = ₹10 · Coins unlock premium placement features</p>
        </div>
        <span className={`wallet-pro-badge${localIsPro ? " wallet-pro-badge--pro" : " wallet-pro-badge--normal"}`}>
          {localIsPro ? "⭐ Pro Student" : "Normal Student"}
        </span>
      </div>

      <div className="wallet-balance-card">
        <div className="wallet-balance-amount">{loading ? "—" : localBalance} <span className="wallet-balance-unit">Coins</span></div>
        <div className="wallet-balance-inr">≈ ₹{loading ? "—" : (localBalance * 10).toLocaleString("en-IN")} equivalent value</div>
      </div>

      {!localIsPro && !loading && (
        <div className="wallet-pro-cta">
          <div className="wallet-pro-cta-info">
            <strong>Upgrade to Pro</strong>
            <span>Unlock apply, company names, and all placement features.</span>
          </div>
          <div className="wallet-pro-cta-cost">120 Coins (₹1,200)</div>
          {localBalance >= 120 ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => void handleUpgradeToPro()}
              disabled={upgrading}
            >
              {upgrading ? "Upgrading…" : "Upgrade Now"}
            </button>
          ) : (
            <p className="wallet-insufficient">
              You need <strong>{120 - localBalance} more coins</strong> to upgrade. Add coins below.
            </p>
          )}
        </div>
      )}

      <div className="wallet-section-title">Add Coins</div>
      <div className="wallet-packages">
        {packages.map((pack) => (
          <div key={pack.id} className={`wallet-pack${pack.id === "coins_120" ? " wallet-pack--featured" : ""}`}>
            {pack.id === "coins_120" && <span className="wallet-pack-ribbon">Recommended for Pro</span>}
            <div className="wallet-pack-coins">{pack.coins} Coins</div>
            <div className="wallet-pack-label">{pack.label}</div>
            <div className="wallet-pack-price">₹{pack.priceInr.toLocaleString("en-IN")}</div>
            <button
              type="button"
              className="btn-primary wallet-pack-btn"
              onClick={() => void handleBuy(pack)}
              disabled={buyingPackId === pack.id}
            >
              {buyingPackId === pack.id ? "Processing…" : "Buy"}
            </button>
          </div>
        ))}
      </div>

      <div className="wallet-section-title">Transaction History</div>
      {loading ? (
        <p className="empty-state">Loading transactions…</p>
      ) : transactions.length === 0 ? (
        <p className="empty-state">No transactions yet. Purchase coins to get started.</p>
      ) : (
        <table className="company-table wallet-txn-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Coins</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>{new Date(tx.at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                <td>
                  <span className={`wallet-txn-type wallet-txn-type--${tx.type === "Pro Upgrade" || tx.type === "Student Spend" ? "debit" : "credit"}`}>
                    {tx.type}
                  </span>
                </td>
                <td className={tx.coins < 0 ? "wallet-txn-debit" : "wallet-txn-credit"}>
                  {tx.coins > 0 ? `+${tx.coins}` : tx.coins}
                </td>
                <td>{tx.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
