"use client";

import { useEffect, useState } from "react";
import {
  listApprovedFreelancerInterviewers,
  type CompanyFreelancerInterviewerSummary,
} from "../api/company-freelancer-interviewers";

/**
 * Load approved freelancer interviewers once per session (module cache dedupes network).
 * Pass `active: false` when the UI does not need the list.
 */
export function useCompanyFreelancerInterviewers(active: boolean) {
  const [interviewers, setInterviewers] = useState<CompanyFreelancerInterviewerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void listApprovedFreelancerInterviewers()
      .then((rows) => {
        if (!cancelled) {
          setInterviewers(rows);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load freelancer interviewers.");
          setInterviewers([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [active]);

  return { interviewers, isLoading, error };
}
