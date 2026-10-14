import { decrypt, encrypt } from "../crypto/encryption";
import type { DataStore } from "../data/store";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder, type CatalogSettings, type OwnIyzicoPayment } from "../data/types";
import type { IyzicoKeys } from "../payments/iyzico";
import { platformSetting, yallappIyzicoKeys } from "../settings/platform";

const paymentContext = (appId: string) => `app:payment:${appId}`;

export function catalogSettings(app: App): CatalogSettings {
  return { ...DEFAULT_CATALOG_SETTINGS, ...(app.catalogSettings ?? {}) };
}

/**
 * 19 Whether the app's payment page can take a card payment: Card payments
 * are set up (the owner's iyzico keys or a marketplace account), or it's a
 * demo, whose payment page charges nothing. Products and paid courses aren't
 * offered for sale without it.
 */
export function paymentsSetUp(app: Pick<App, "catalogSettings" | "demo">): boolean {
  return app.catalogSettings?.payment != null || app.demo === true;
}

export function encryptPaymentKeys(appId: string, apiKey: string, secretKey: string, sandbox: boolean, key: Buffer): OwnIyzicoPayment {
  return {
    provider: "iyzico",
    apiKeyEncrypted: encrypt(apiKey, key, paymentContext(appId)),
    secretKeyEncrypted: encrypt(secretKey, key, paymentContext(appId)),
    sandbox,
  };
}

/** The client's own iyzico keys, decrypted (server only); null when they don't use their own account. */
export function paymentKeys(app: App, key: Buffer): IyzicoKeys | null {
  const payment = catalogSettings(app).payment;
  if (!payment || payment.provider !== "iyzico") return null;
  try {
    return {
      apiKey: decrypt(payment.apiKeyEncrypted, key, paymentContext(app.id)),
      secretKey: decrypt(payment.secretKeyEncrypted, key, paymentContext(app.id)),
      sandbox: payment.sandbox,
    };
  } catch {
    return null;
  }
}

/** Shipping for a subtotal: flat, free over the threshold, none for digital-only orders. */
export function shippingFor(settings: CatalogSettings, subtotalCents: number, physical: boolean): number {
  if (!physical) return 0;
  if (settings.freeShippingOverCents !== null && subtotalCents >= settings.freeShippingOverCents) return 0;
  return settings.shippingCents;
}

/** The number customers and the client see. */
export function orderNumber(order: Pick<CatalogOrder, "id">): string {
  return String(1000 + order.id);
}

/** How long a payment page link works. */
export const PAY_LINK_MINUTES = 60;

export function payLinkExpired(order: Pick<CatalogOrder, "createdAt">, now: Date): boolean {
  return now.getTime() - order.createdAt.getTime() > PAY_LINK_MINUTES * 60_000;
}

export const ORDER_STATUS_LABELS: Record<CatalogOrder["status"], string> = {
  pending: "Waiting for payment",
  processing: "Paid",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Payment failed",
  refunded: "Refunded",
};

/** Whether shops can sell through Yallapp's account, and Yallapp's commission. */
export async function marketplaceTerms(store: DataStore, key: Buffer): Promise<{ keys: IyzicoKeys; commissionPercent: number } | null> {
  const [keys, setting] = await Promise.all([yallappIyzicoKeys(store, key), platformSetting(store, "marketplace", { fresh: true })]);
  return keys && setting ? { keys, commissionPercent: setting.value.commissionPercent } : null;
}

export interface CheckoutAccount {
  keys: IyzicoKeys;
  /** Set when the shop sells through Yallapp's account. */
  marketplace: { subMerchantKey: string; commissionPercent: number } | null;
}

/** The account a shop's payments go to; null when the shop can't take payments. */
export async function checkoutAccount(store: DataStore, app: App, key: Buffer): Promise<CheckoutAccount | null> {
  // 16 Demo apps never charge a card, whatever keys they have.
  if (app.demo) return null;
  const payment = catalogSettings(app).payment;
  if (!payment) return null;
  if (payment.provider === "iyzico") {
    const keys = paymentKeys(app, key);
    return keys ? { keys, marketplace: null } : null;
  }
  const terms = await marketplaceTerms(store, key);
  if (!terms || terms.keys.sandbox !== payment.sandbox) return null;
  return { keys: terms.keys, marketplace: { subMerchantKey: payment.subMerchantKey, commissionPercent: terms.commissionPercent } };
}

/** Yallapp's commission on an amount, rounded to the cent. */
export function commissionOf(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}

/**
 * The account an order was started with: Yallapp's for marketplace orders
 * (they carry a commission), else the shop's own. The shop may have switched
 * accounts since, so this follows the order, not the current settings.
 */
export async function accountForOrder(store: DataStore, app: App, order: Pick<CatalogOrder, "commissionCents">, key: Buffer): Promise<CheckoutAccount | null> {
  if (app.demo) return null;
  if (order.commissionCents === null) {
    const keys = paymentKeys(app, key);
    return keys ? { keys, marketplace: null } : null;
  }
  const keys = await yallappIyzicoKeys(store, key);
  const payment = catalogSettings(app).payment;
  return keys ? { keys, marketplace: payment?.provider === "yallapp" ? { subMerchantKey: payment.subMerchantKey, commissionPercent: 0 } : null } : null;
}
