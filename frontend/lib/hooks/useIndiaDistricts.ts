"use client";

import { useEffect, useState } from "react";

type DistrictsResponse = {
  districts?: string[];
  error?: string;
};

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const v = value.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export function useIndiaDistricts(state: string, country = "India") {
  const [districts, setDistricts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (country !== "India" || !state.trim()) {
      setDistricts([]);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/india/districts?state=${encodeURIComponent(state.trim())}`, {
          signal: controller.signal,
        });
        const body = (await res.json()) as DistrictsResponse;
        if (cancelled) return;
        if (!res.ok) {
          setDistricts([]);
          setError(body.error || "Could not load districts");
          return;
        }
        setDistricts(uniqueNonEmpty(body.districts ?? []));
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        setDistricts([]);
        setError("Could not load districts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [state, country]);

  return { districts, loading, error };
}
