import type { CatalogCurrency, MarketOrder, PaymentProviderId } from "../data/types";
import type { CheckoutRequest, PaymentAccount, ProviderOptions } from "../payments/provider";
import { PROVIDER_NAME, providerTakes, startCheckout } from "../payments/provider";
import { refundThroughProvider, type RefundPart } from "../payments/refund";

/**
 * 115.11 How a marketplace order is paid: cash on delivery (up to the
 * owner's highest amount, if any; taken by the vendor's driver or at
 * pick-up, or by the app's courier, and counted in the statements), cards,
 * Apple Pay and Google Pay. Apple Pay and Google Pay go through the
 * gateway's own hosted page where it offers them (Stripe Checkout in the
 * countries Stripe serves, Kashier's Apple Pay in Egypt); the app's own
 * Apple Pay and Google Pay sheet comes once a gateway takes its token and
 * the owner has set up the merchant IDs. The gateway is the app's, chosen
 * by country and currency. Yallapp holds no keys and sets no prices.
 */

export type MarketPaymentMethod = "cash" | "card" | "apple_pay" | "google_pay" | "wallet";

/** What each gateway's hosted page offers, as their public pages say (to confirm with the gateway before turning it on). */
export const HOSTED_WALLETS: Record<PaymentProviderId, { applePay: boolean; googlePay: boolean }> = {
  stripe: { applePay: true, googlePay: true },
  kashier: { applePay: true, googlePay: false },
  iyzico: { applePay: false, googlePay: false },
  fawaterk: { applePay: false, googlePay: false },
  paypal: { applePay: false, googlePay: false },
};

export interface MarketPaymentSettings {
  /** The app's gateway for this marketplace; null: cash only. */
  gateway: PaymentProviderId | null;
  cash: boolean;
  /** The highest order cash may pay; null: no limit. */
  cashMax: number | null;
  /** The owner turned Apple Pay / Google Pay on (and set them up with the gateway). */
  applePay: boolean;
  googlePay: boolean;
}

export const DEFAULT_PAYMENT_SETTINGS: MarketPaymentSettings = { gateway: null, cash: true, cashMax: null, applePay: false, googlePay: false };

export interface PaymentChoice {
  method: MarketPaymentMethod;
  /** Through the gateway's page (`hosted`), the app's own sheet (`native`), or none (cash, the wallet). */
  via: "hosted" | "native" | null;
  /** Why it can't be used for this order, for the checkout to say. */
  unavailable: string | null;
}

/** The ways this order can be paid, in the order the checkout shows them. */
export function paymentChoices(settings: MarketPaymentSettings, input: { currency: string; total: number; platform: "ios" | "android" | "web"; walletBalance: number }): PaymentChoice[] {
  const out: PaymentChoice[] = [];
  const gateway = settings.gateway && providerTakes(settings.gateway, input.currency) ? settings.gateway : null;
  if (gateway) {
    const wallets = HOSTED_WALLETS[gateway];
    if (settings.applePay && wallets.applePay && input.platform !== "android") out.push({ method: "apple_pay", via: "hosted", unavailable: null });
    if (settings.googlePay && wallets.googlePay && input.platform !== "ios") out.push({ method: "google_pay", via: "hosted", unavailable: null });
    out.push({ method: "card", via: "hosted", unavailable: null });
  }
  if (settings.cash) {
    const over = settings.cashMax !== null && input.total > settings.cashMax;
    out.push({ method: "cash", via: null, unavailable: over ? "Cash is for smaller orders. Pay online instead." : null });
  }
  if (input.walletBalance > 0) out.push({ method: "wallet", via: null, unavailable: input.walletBalance < input.total && !gateway && !settings.cash ? "Your wallet doesn't cover this order." : null });
  return out;
}

/** Who holds the customer's cash: the vendor (its own driver, pick-up) or the owner (the app's courier). Online money is the owner's. */
export function cashCollector(order: Pick<MarketOrder, "fulfilment" | "deliveryBy">): "owner" | "vendor" {
  return order.fulfilment === "pickup" || order.deliveryBy === "vendor" ? "vendor" : "owner";
}

export function marketPaymentReference(orderId: number): string {
  return `market-${orderId}`;
}

/** The gateway's checkout for what is left to pay after the wallet: one line per vendor's order. */
export function marketCheckout(
  order: Pick<MarketOrder, "id" | "vendorName" | "currency" | "money" | "customerName" | "customerPhone" | "userId">,
  input: { email: string; city: string; address: string | null; ip: string; returnUrl: string; webhookUrl: string | null },
): CheckoutRequest {
  const amount = order.money.payNow;
  const reference = marketPaymentReference(order.id);
  return {
    reference,
    amountCents: amount,
    currency: order.currency as CatalogCurrency,
    description: `Order ${order.id} from ${order.vendorName}`.slice(0, 120),
    lines: [{ id: `order-${order.id}`, name: `${order.vendorName}`.slice(0, 80) || "Order", cents: amount, category: "Marketplace", digital: false }],
    customer: { id: order.userId !== null ? `user-${order.userId}` : `guest-${order.id}`, name: order.customerName || "Customer", email: input.email, phone: order.customerPhone || null, city: input.city, address: input.address, ip: input.ip },
    returnUrl: input.returnUrl,
    webhookUrl: input.webhookUrl,
    iyzico: { conversationId: reference, basketId: reference, shipping: true },
  };
}

/** Starts paying on the gateway's page; the order keeps its reference to read it back. */
export async function startMarketPayment(account: PaymentAccount, request: CheckoutRequest, options: ProviderOptions = {}) {
  return startCheckout(account, request, options);
}

/** A complaint's refund to the order's payment (115.9's `refundToPayment`), through the gateway's API. */
export async function refundMarketPayment(
  account: PaymentAccount,
  order: Pick<MarketOrder, "id" | "currency" | "money" | "paymentRef" | "createdAt" | "updatedAt">,
  input: { cents: number; refundedBefore: number; paymentId: string | null; note: string; ip: string; now: Date },
  options: ProviderOptions = {},
): Promise<{ ok: true; parts: RefundPart[] } | { ok: false; error: string }> {
  const reference = marketPaymentReference(order.id);
  if (input.cents <= 0 || input.cents + input.refundedBefore > order.money.payNow) return { ok: false, error: "That's more than what was paid online for this order." };
  const result = await refundThroughProvider(
    account,
    {
      conversationId: reference,
      paymentId: input.paymentId,
      providerRef: order.paymentRef,
      currency: order.currency,
      paidCents: order.money.payNow,
      paidAt: order.createdAt,
      cents: input.cents,
      earlier: [],
      refundedBeforeCents: input.refundedBefore,
      reason: "buyer_request",
      note: input.note.slice(0, 200),
      ip: input.ip,
      now: input.now,
    },
    options,
  );
  if (result.error) return { ok: false, error: result.error };
  return { ok: true, parts: result.parts };
}

/** 115.12 One thing the owner sets up for the ways to pay, for Studio's settings page to word in its language. */
export type PaymentSetupStep =
  | { step: "choose_gateway" }
  | { step: "add_keys"; name: string }
  | { step: "apple_on"; name: string }
  | { step: "apple_unsupported"; name: string }
  | { step: "google_on"; name: string }
  | { step: "google_unsupported"; name: string }
  | { step: "test_order" };

/** What the owner sets up: by the gateway chosen and the wallets turned on. */
export function paymentSetupPlan(settings: MarketPaymentSettings): PaymentSetupStep[] {
  if (!settings.gateway) return [{ step: "choose_gateway" }];
  const name = PROVIDER_NAME[settings.gateway];
  const steps: PaymentSetupStep[] = [{ step: "add_keys", name }];
  if (settings.applePay) steps.push({ step: HOSTED_WALLETS[settings.gateway].applePay ? "apple_on" : "apple_unsupported", name });
  if (settings.googlePay) steps.push({ step: HOSTED_WALLETS[settings.gateway].googlePay ? "google_on" : "google_unsupported", name });
  steps.push({ step: "test_order" });
  return steps;
}

/** What the owner sets up, shown in Studio › Payments: by the gateway chosen and the wallets turned on. */
export function paymentSetupSteps(settings: MarketPaymentSettings): string[] {
  return paymentSetupPlan(settings).map((s) => {
    switch (s.step) {
      case "choose_gateway":
        return "Choose a payment gateway that works in your country and currency, and add its keys in Studio › Payments. Until then, customers pay in cash.";
      case "add_keys":
        return `Add your ${s.name} keys in Studio › Payments (test keys first, then live ones).`;
      case "apple_on":
        return `Turn on Apple Pay in your ${s.name} account. ${s.name} may ask you to register an Apple Pay merchant ID and to verify your domain.`;
      case "apple_unsupported":
        return `${s.name}'s payment page doesn't offer Apple Pay. Choose a gateway that does (Stripe, or Kashier in Egypt) to offer it.`;
      case "google_on":
        return `Turn on Google Pay in your ${s.name} account and ask Google for production access if ${s.name} asks you to.`;
      case "google_unsupported":
        return `${s.name}'s payment page doesn't offer Google Pay. Choose a gateway that does (Stripe) to offer it.`;
      case "test_order":
        return "Make a small test order with each way of paying before opening to customers.";
    }
  });
}
