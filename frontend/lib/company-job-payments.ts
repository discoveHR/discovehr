import {
  createJobBoostOrder,
  createJobExtensionOrder,
  verifyJobBoost,
  verifyJobExtension,
} from "./api/company-job-payments";
import type { JobItem } from "./api/types";
import { openRazorpayCheckout } from "./razorpay";

export async function extendJob(
  jobId: string,
  prefillEmail?: string,
): Promise<{ message: string; job: JobItem }> {
  const order = await createJobExtensionOrder(jobId);

  if (order.devBypass) {
    return verifyJobExtension({ paymentOrderId: order.paymentOrderId, jobId });
  }

  return new Promise((resolve, reject) => {
    void openRazorpayCheckout({
      keyId: order.keyId,
      amountPaise: order.amountPaise,
      currency: "INR",
      orderId: order.razorpayOrderId,
      name: "DiscoveHR",
      description: "Job Extension — 90 days",
      prefillEmail,
      onSuccess: async (rzp) => {
        try {
          const res = await verifyJobExtension({
            paymentOrderId: order.paymentOrderId,
            jobId,
            razorpayPaymentId: rzp.razorpayPaymentId,
            razorpayOrderId: rzp.razorpayOrderId,
            razorpaySignature: rzp.razorpaySignature,
          });
          resolve(res);
        } catch (err) {
          reject(err);
        }
      },
      onDismiss: () => reject(new Error("Payment cancelled.")),
    }).catch(reject);
  });
}

export async function boostJob(
  jobId: string,
  prefillEmail?: string,
): Promise<{ message: string; job: JobItem }> {
  const order = await createJobBoostOrder(jobId);

  if (order.devBypass) {
    return verifyJobBoost({ paymentOrderId: order.paymentOrderId, jobId });
  }

  return new Promise((resolve, reject) => {
    void openRazorpayCheckout({
      keyId: order.keyId,
      amountPaise: order.amountPaise,
      currency: "INR",
      orderId: order.razorpayOrderId,
      name: "DiscoveHR",
      description: "Job Boost — 30 days featured placement",
      prefillEmail,
      onSuccess: async (rzp) => {
        try {
          const res = await verifyJobBoost({
            paymentOrderId: order.paymentOrderId,
            jobId,
            razorpayPaymentId: rzp.razorpayPaymentId,
            razorpayOrderId: rzp.razorpayOrderId,
            razorpaySignature: rzp.razorpaySignature,
          });
          resolve(res);
        } catch (err) {
          reject(err);
        }
      },
      onDismiss: () => reject(new Error("Payment cancelled.")),
    }).catch(reject);
  });
}
