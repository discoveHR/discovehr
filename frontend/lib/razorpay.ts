declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only."));
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay."));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(opts: {
  keyId: string;
  amountPaise: number;
  currency: string;
  orderId: string;
  name: string;
  description: string;
  prefillEmail?: string;
  onSuccess: (payload: { razorpayPaymentId: string; razorpayOrderId: string; razorpaySignature: string }) => void;
  onDismiss?: () => void;
}) {
  if (!opts.keyId) {
    opts.onSuccess({ razorpayPaymentId: "", razorpayOrderId: opts.orderId, razorpaySignature: "" });
    return;
  }
  await loadRazorpayScript();
  if (!window.Razorpay) throw new Error("Razorpay unavailable.");
  const rzp = new window.Razorpay({
    key: opts.keyId,
    amount: opts.amountPaise,
    currency: opts.currency || "INR",
    name: opts.name,
    description: opts.description,
    order_id: opts.orderId,
    prefill: { email: opts.prefillEmail || "" },
    handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
      opts.onSuccess({
        razorpayPaymentId: response.razorpay_payment_id,
        razorpayOrderId: response.razorpay_order_id,
        razorpaySignature: response.razorpay_signature,
      });
    },
    modal: { ondismiss: opts.onDismiss },
  });
  rzp.open();
}
