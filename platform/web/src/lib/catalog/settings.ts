import { decrypt, encrypt } from "../crypto/encryption";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder, type CatalogSettings } from "../data/types";
import type { IyzicoKeys } from "../payments/iyzico";

const paymentContext = (appId: string) => `app:payment:${appId}`;

export function catalogSettings(app: App): CatalogSettings {
  return { ...DEFAULT_CATALOG_SETTINGS, ...(app.catalogSettings ?? {}) };
}

export function encryptPaymentKeys(appId: string, apiKey: string, secretKey: string, sandbox: boolean, key: Buffer): CatalogSettings["payment"] {
  return {
    provider: "iyzico",
    apiKeyEncrypted: encrypt(apiKey, key, paymentContext(appId)),
    secretKeyEncrypted: encrypt(secretKey, key, paymentContext(appId)),
    sandbox,
  };
}

/** The client's iyzico keys, decrypted (server only); null when payments aren't set up. */
export function paymentKeys(app: App, key: Buffer): IyzicoKeys | null {
  const payment = catalogSettings(app).payment;
  if (!payment) return null;
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
