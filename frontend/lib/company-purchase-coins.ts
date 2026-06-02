import {
  createCompanyCoinPurchaseOrder,
  verifyCompanyCoinPurchase,
} from "./api";
import { openRazorpayCheckout } from "./razorpay";

export async function purchaseCompanyCoins(
  payload: { packId?: string; customCoins?: number },
  prefillEmail?: string,
): Promise<{ message: string; balanceCredits?: number }> {
  const order = await createCompanyCoinPurchaseOrder(payload);

  if (order.devBypass) {
    const res = await verifyCompanyCoinPurchase({ paymentOrderId: order.paymentOrderId });
    return { message: res.message, balanceCredits: res.balanceCredits };
  }

  return new Promise((resolve, reject) => {
    void openRazorpayCheckout({
      keyId: order.keyId,
      amountPaise: order.amountPaise,
      currency: "INR",
      orderId: order.razorpayOrderId,
      name: "DiscoveHR",
      description: `${order.coins} DiscoveHR coins`,
      prefillEmail,
      onSuccess: async (rzp) => {
        try {
          const res = await verifyCompanyCoinPurchase({
            paymentOrderId: order.paymentOrderId,
            razorpayPaymentId: rzp.razorpayPaymentId,
            razorpayOrderId: rzp.razorpayOrderId,
            razorpaySignature: rzp.razorpaySignature,
          });
          resolve({ message: res.message, balanceCredits: res.balanceCredits });
        } catch (err) {
          reject(err);
        }
      },
      onDismiss: () => reject(new Error("Payment cancelled.")),
    }).catch(reject);
  });
}
