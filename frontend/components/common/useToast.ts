"use client";

import { useCallback, useEffect, useState } from "react";

export type ToastState = {
  message: string;
  type: "success" | "error" | "warning";
} | null;

export function useToast(autoDismissMs = 4000) {
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = useCallback((message: string, type: ToastState extends null ? never : NonNullable<ToastState>["type"] = "success") => {
    setToast({ message, type });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [toast, autoDismissMs]);

  return { toast, showToast, dismissToast };
}
