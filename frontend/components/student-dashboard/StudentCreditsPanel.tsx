"use client";

import { useCallback, useEffect, useState } from "react";
import { getStudentCreditWallet, type CreditTransaction } from "../../lib/api";

type Props = { onError: (m: string) => void };

export function StudentCreditsPanel({ onError }: Props) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStudentCreditWallet();
      setBalance(data.balanceCredits);
      setTransactions(data.transactions);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to load credits.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="company-table-wrap">
      <div className="company-table-head">
        <h3>Scout credits wallet</h3>
        <span className="table-caption">Your TPO can purchase credit packs for assessments, mock exams, and premium features</span>
      </div>
      {loading ? (
        <p className="company-subtitle">Loading…</p>
      ) : (
        <>
          <p className="company-subtitle" style={{ marginBottom: 16 }}>
            Balance: <strong>{balance}</strong> credits
          </p>
          <table className="company-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Credits</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4}>No transactions yet. Ask your placement officer to purchase a credit pack for you.</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.at}</td>
                    <td>{tx.type}</td>
                    <td>{tx.credits > 0 ? `+${tx.credits}` : tx.credits}</td>
                    <td>{tx.note}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
