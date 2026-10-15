import { decrypt, encrypt } from "../crypto/encryption";
import type { DataStore } from "../data/store";
import {
  DEFAULT_CATALOG_SETTINGS,
  type App,
  type CatalogOrder,
  type CatalogSettings,
  type MarketplacePayment,
  type OwnIyzicoPayment,
  type OwnPayment,
} from "../data/types";
import type { IyzicoKeys } from "../payments/iyzico";
import type { PaymentAccount } from "../payments/provider";
import type { PayoutDetails } from "./marketplace";
import { platformSetting, yallappAccountFor, yallappPaymentAccount } from "../settings/platform";

const paymentContext = (appId: string) => `app:payment:${appId}`;

export function catalogSettings(app: App): CatalogSettings {
  return { ...DEFAULT_CATALOG_SETTINGS, ...(app.catalogSettings ?? {}) };
}

/**
 * 19 Whether the app's payment page can take a card payment: Card payments
 * are set up (the owner's own keys, 37 iyzico, Kashier or Fawaterk, or a marketplace account), or it's a
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

/** 37 What the owner enters for their own account, per provider. */
export type OwnPaymentInput =
  | { provider: "iyzico"; apiKey: string; secretKey: string; sandbox: boolean }
  | { provider: "kashier"; merchantId: string; apiKey: string; secretKey: string; sandbox: boolean }
  | { provider: "fawaterk"; apiKey: string; sandbox: boolean };

/** 37 The client's own account with its keys encrypted (context `app:payment:<app id>`, as iyzico's always were). */
export function encryptOwnPayment(appId: string, input: OwnPaymentInput, key: Buffer): OwnPayment {
  const seal = (value: string) => encrypt(value, key, paymentContext(appId));
  if (input.provider === "iyzico") return encryptPaymentKeys(appId, input.apiKey, input.secretKey, input.sandbox, key);
  if (input.provider === "kashier") {
    return { provider: "kashier", merchantId: input.merchantId, apiKeyEncrypted: seal(input.apiKey), secretKeyEncrypted: seal(input.secretKey), sandbox: input.sandbox };
  }
  return { provider: "fawaterk", apiKeyEncrypted: seal(input.apiKey), sandbox: input.sandbox };
}

/** 37 Whether the payment settings are the client's own account (not selling through Yallapp's). */
export function isOwnPayment(payment: CatalogSettings["payment"] | undefined): payment is OwnPayment {
  return payment != null && payment.provider !== "yallapp";
}

/** 37 The client's own account with its keys decrypted (server only); null when they don't use their own account. */
export function ownPaymentAccount(app: App, key: Buffer): PaymentAccount | null {
  const payment = catalogSettings(app).payment;
  if (!isOwnPayment(payment)) return null;
  const open = (value: string) => decrypt(value, key, paymentContext(app.id));
  try {
    if (payment.provider === "kashier") {
      return {
        provider: "kashier",
        keys: { merchantId: payment.merchantId, apiKey: open(payment.apiKeyEncrypted), secretKey: open(payment.secretKeyEncrypted), sandbox: payment.sandbox },
      };
    }
    if (payment.provider === "fawaterk") return { provider: "fawaterk", keys: { apiKey: open(payment.apiKeyEncrypted), sandbox: payment.sandbox } };
    return { provider: "iyzico", keys: { apiKey: open(payment.apiKeyEncrypted), secretKey: open(payment.secretKeyEncrypted), sandbox: payment.sandbox } };
  } catch {
    return null;
  }
}

/** The client's own iyzico keys, decrypted (server only); null when they don't use their own iyzico account. */
export function paymentKeys(app: App, key: Buffer): IyzicoKeys | null {
  const account = ownPaymentAccount(app, key);
  return account?.provider === "iyzico" ? account.keys : null;
}

/** 37 The payee's details for the team's transfers (Kashier or Fawaterk), encrypted like the keys. */
export function encryptPayout(appId: string, details: PayoutDetails, key: Buffer): string {
  return encrypt(JSON.stringify(details), key, paymentContext(appId));
}

/** 37 Who the team pays a marketplace shop's share to (Kashier or Fawaterk); null for iyzico, which pays the shop itself. */
export function payoutDetails(app: App, key: Buffer): PayoutDetails | null {
  const payment = catalogSettings(app).payment;
  if (payment?.provider !== "yallapp" || !payment.payoutEncrypted) return null;
  try {
    return JSON.parse(decrypt(payment.payoutEncrypted, key, paymentContext(app.id))) as PayoutDetails;
  } catch {
    return null;
  }
}

/** 37 The provider of Yallapp's account a marketplace shop joined with. */
export function marketplaceVia(payment: MarketplacePayment): PaymentAccount["provider"] {
  return payment.via ?? "iyzico";
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

/** Whether shops can sell through Yallapp's account (37 the provider the team chose), and Yallapp's commission. */
export async function marketplaceTerms(store: DataStore, key: Buffer): Promise<{ account: PaymentAccount; commissionPercent: number } | null> {
  const [account, setting] = await Promise.all([yallappPaymentAccount(store, key), platformSetting(store, "marketplace", { fresh: true })]);
  return account && setting ? { account, commissionPercent: setting.value.commissionPercent } : null;
}

export interface CheckoutAccount {
  /** 37 The merchant account and its provider. */
  account: PaymentAccount;
  /** Set when the shop sells through Yallapp's account (subMerchantKey: iyzico only, empty otherwise). */
  marketplace: { subMerchantKey: string; commissionPercent: number } | null;
}

/** The account a shop's payments go to; null when the shop can't take payments. */
export async function checkoutAccount(store: DataStore, app: App, key: Buffer): Promise<CheckoutAccount | null> {
  // 16 Demo apps never charge a card, whatever keys they have.
  if (app.demo) return null;
  const payment = catalogSettings(app).payment;
  if (!payment) return null;
  if (isOwnPayment(payment)) {
    const account = ownPaymentAccount(app, key);
    return account ? { account, marketplace: null } : null;
  }
  // 37 A shop joined with the provider Yallapp used then; it sells through Yallapp only while that is still Yallapp's provider.
  const terms = await marketplaceTerms(store, key);
  if (!terms || terms.account.provider !== marketplaceVia(payment) || terms.account.keys.sandbox !== payment.sandbox) return null;
  return { account: terms.account, marketplace: { subMerchantKey: payment.subMerchantKey, commissionPercent: terms.commissionPercent } };
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
export async function accountForOrder(
  store: DataStore,
  app: App,
  order: Pick<CatalogOrder, "commissionCents" | "paymentProvider">,
  key: Buffer,
): Promise<CheckoutAccount | null> {
  if (app.demo) return null;
  // 37 The provider the payment started with (none recorded: iyzico).
  const provider = order.paymentProvider ?? "iyzico";
  if (order.commissionCents === null) {
    const account = ownPaymentAccount(app, key);
    return account && account.provider === provider ? { account, marketplace: null } : null;
  }
  const account = await yallappAccountFor(store, provider, key);
  const payment = catalogSettings(app).payment;
  return account ? { account, marketplace: payment?.provider === "yallapp" ? { subMerchantKey: payment.subMerchantKey, commissionPercent: 0 } : null } : null;
}
