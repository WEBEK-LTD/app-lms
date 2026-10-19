import { createHmac, randomBytes } from "node:crypto";
import { PaymentError } from "./errors";

/**
 * iyzico's hosted checkout form: the customer pays on iyzico's page, into
 * the merchant account of the keys used (a shop's own, or Yallapp's). With
 * Yallapp's account a shop can be a sub-merchant (iyzico marketplace): each
 * basket item names the shop and its share, and iyzico pays the shop once
 * the item is approved. Requests are signed with iyzico's IYZWSv2 scheme.
 */

export interface IyzicoKeys {
  apiKey: string;
  secretKey: string;
  sandbox: boolean;
}

export class IyzicoError extends PaymentError {
  constructor(message: string, options: { unreachable?: boolean } = {}) {
    super(message, options);
    this.name = "IyzicoError";
  }
}

type Fetch = typeof fetch;

export const IYZICO_URLS = { live: "https://api.iyzipay.com", sandbox: "https://sandbox-api.iyzipay.com" };

export function iyzicoBaseUrl(keys: Pick<IyzicoKeys, "sandbox">, override?: string | null): string {
  return (override || (keys.sandbox ? IYZICO_URLS.sandbox : IYZICO_URLS.live)).replace(/\/+$/, "");
}

/** The Authorization header for a request to `path` with this JSON body. */
export function iyzicoAuthorization(keys: Pick<IyzicoKeys, "apiKey" | "secretKey">, randomKey: string, path: string, body: string): string {
  const signature = createHmac("sha256", keys.secretKey).update(randomKey + path + body).digest("hex");
  return `IYZWSv2 ${Buffer.from(`apiKey:${keys.apiKey}&randomKey:${randomKey}&signature:${signature}`).toString("base64")}`;
}

interface IyzicoResponse {
  status?: string;
  errorMessage?: string;
  [key: string]: unknown;
}

async function post(keys: IyzicoKeys, path: string, payload: unknown, options: { fetcher?: Fetch; baseUrl?: string | null }): Promise<IyzicoResponse> {
  const body = JSON.stringify(payload);
  const randomKey = `${Date.now()}${randomBytes(6).toString("hex")}`;
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(`${iyzicoBaseUrl(keys, options.baseUrl)}${path}`, {
      method: "POST",
      headers: {
        authorization: iyzicoAuthorization(keys, randomKey, path, body),
        "x-iyzi-rnd": randomKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new IyzicoError("iyzico can't be reached.", { unreachable: true });
  }
  const json = (await response.json().catch(() => null)) as IyzicoResponse | null;
  if (!json) throw new IyzicoError(`iyzico answered HTTP ${response.status}.`);
  return json;
}

export interface IyzicoAddress {
  contactName: string;
  city: string;
  country: string;
  address: string;
}

export interface CheckoutFormRequest {
  conversationId: string;
  /** Decimal strings, e.g. "450.00". `price` is the sum of the basket items. */
  price: string;
  paidPrice: string;
  currency: string;
  basketId: string;
  callbackUrl: string;
  buyer: {
    id: string;
    name: string;
    surname: string;
    /** 29 Optional for iyzico: donors may leave it out. */
    gsmNumber?: string;
    email: string;
    identityNumber: string;
    registrationAddress: string;
    ip: string;
    city: string;
    country: string;
  };
  billingAddress: IyzicoAddress;
  shippingAddress?: IyzicoAddress;
  basketItems: {
    id: string;
    name: string;
    category1: string;
    itemType: "PHYSICAL" | "VIRTUAL";
    price: string;
    /** Marketplace: the shop selling this item, and what it gets of `price`. */
    subMerchantKey?: string;
    subMerchantPrice?: string;
  }[];
}

/** Starts a payment; returns the page to send the customer to. */
export async function initializeCheckoutForm(
  keys: IyzicoKeys,
  request: CheckoutFormRequest,
  options: { fetcher?: Fetch; baseUrl?: string | null } = {},
): Promise<{ token: string; paymentPageUrl: string; tokenExpireSeconds: number | null }> {
  const result = await post(
    keys,
    "/payment/iyzipos/checkoutform/initialize/auth/ecom",
    { locale: "en", paymentGroup: "PRODUCT", enabledInstallments: [1], ...request },
    options,
  );
  if (result.status !== "success" || typeof result.token !== "string" || typeof result.paymentPageUrl !== "string") {
    throw new IyzicoError(result.errorMessage ?? "iyzico couldn't start the payment.");
  }
  // 49 How long the page takes the payment (iyzico says 1800 seconds).
  const seconds = Number((result as { tokenExpireTime?: unknown }).tokenExpireTime);
  return { token: result.token, paymentPageUrl: result.paymentPageUrl, tokenExpireSeconds: Number.isFinite(seconds) && seconds > 0 ? seconds : null };
}

export interface CheckoutFormResult {
  paid: boolean;
  paymentId: string | null;
  paidCents: number;
  basketId: string | null;
  /** 37 The currency iyzico took it in; null when its answer doesn't say. */
  currency: string | null;
  message: string | null;
  /** iyzico's transaction per basket item (marketplace payouts are approved per item). */
  transactionIds: string[];
}

/** The outcome of a payment, asked from iyzico with the token its callback brings. */
export async function retrieveCheckoutForm(
  keys: IyzicoKeys,
  input: { token: string; conversationId: string },
  options: { fetcher?: Fetch; baseUrl?: string | null } = {},
): Promise<CheckoutFormResult> {
  const result = await post(keys, "/payment/iyzipos/checkoutform/auth/ecom/detail", { locale: "en", ...input }, options);
  const paid = result.status === "success" && result.paymentStatus === "SUCCESS";
  return {
    paid,
    paymentId: typeof result.paymentId === "string" || typeof result.paymentId === "number" ? String(result.paymentId) : null,
    paidCents: Math.round(Number(result.paidPrice ?? 0) * 100),
    basketId: typeof result.basketId === "string" ? result.basketId : null,
    currency: typeof result.currency === "string" ? result.currency : null,
    message: typeof result.errorMessage === "string" ? result.errorMessage : null,
    transactionIds: Array.isArray(result.itemTransactions)
      ? (result.itemTransactions as { paymentTransactionId?: unknown }[])
          .map((t) => (typeof t.paymentTransactionId === "string" || typeof t.paymentTransactionId === "number" ? String(t.paymentTransactionId) : ""))
          .filter(Boolean)
      : [],
  };
}

export interface SubMerchantInput {
  conversationId: string;
  /** Our own ID for the shop. */
  subMerchantExternalId: string;
  subMerchantType: "PERSONAL" | "PRIVATE_COMPANY" | "LIMITED_OR_JOINT_STOCK_COMPANY";
  /** The shop's name as iyzico shows it. */
  name: string;
  contactName: string;
  contactSurname: string;
  email: string;
  gsmNumber: string;
  address: string;
  iban: string;
  /** Turkish ID number: people and sole proprietors. */
  identityNumber?: string;
  /** Companies. */
  taxOffice?: string;
  taxNumber?: string;
  legalCompanyTitle?: string;
  currency: string;
}

/** Registers a shop as a sub-merchant of this (Yallapp's) account; returns its key. */
export async function createSubMerchant(
  keys: IyzicoKeys,
  input: SubMerchantInput,
  options: { fetcher?: Fetch; baseUrl?: string | null } = {},
): Promise<string> {
  const result = await post(keys, "/onboarding/submerchant", { locale: "en", ...input }, options);
  if (result.status !== "success" || typeof result.subMerchantKey !== "string") {
    throw new IyzicoError(result.errorMessage ?? "iyzico couldn't register the shop.");
  }
  return result.subMerchantKey;
}

/** Releases a marketplace item's share to its sub-merchant. */
export async function approvePaymentItem(
  keys: IyzicoKeys,
  input: { conversationId: string; paymentTransactionId: string },
  options: { fetcher?: Fetch; baseUrl?: string | null } = {},
): Promise<void> {
  const result = await post(keys, "/payment/iyzipos/item/approve", { locale: "en", ...input }, options);
  if (result.status !== "success") throw new IyzicoError(result.errorMessage ?? "iyzico couldn't approve the payout.");
}

/**
 * Whether iyzico accepts these keys: it looks up a card number prefix, and
 * answers "failure" when the keys are wrong. Null when iyzico couldn't be asked.
 */
export async function checkIyzicoKeys(keys: IyzicoKeys, options: { fetcher?: Fetch; baseUrl?: string | null } = {}): Promise<boolean | null> {
  try {
    const result = await post(keys, "/payment/bin/check", { locale: "en", binNumber: "554960" }, options);
    if (result.status === "success") return true;
    if (result.status === "failure") return false;
    return null;
  } catch {
    return null;
  }
}

// 47 Refunds: iyzico's Cancel and Refund APIs, called as its own SDKs call them.

/** 47 iyzico's refund reasons. */
export type IyzicoRefundReason = "double_payment" | "buyer_request" | "fraud" | "other";

export interface IyzicoPaymentItem {
  paymentTransactionId: string;
  /** What the customer paid for this item (iyzico's `paidPrice`). */
  paidCents: number;
  /** Marketplace: the shop selling it. */
  subMerchantKey: string | null;
}

export interface IyzicoPaymentDetail {
  paymentId: string;
  paidCents: number;
  currency: string | null;
  items: IyzicoPaymentItem[];
}

const idText = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : typeof value === "number" ? String(value) : null);

/** 47 A payment as iyzico has it (Retrieve Payment, `POST /payment/detail`): its item transactions, to refund them one by one. */
export async function retrieveIyzicoPayment(
  keys: IyzicoKeys,
  input: { paymentId: string; conversationId: string },
  options: { fetcher?: Fetch; baseUrl?: string | null } = {},
): Promise<IyzicoPaymentDetail> {
  const result = await post(
    keys,
    "/payment/detail",
    {
      locale: "en",
      conversationId: input.conversationId,
      paymentId: input.paymentId,
    },
    options,
  );
  if (result.status !== "success") throw new IyzicoError(result.errorMessage ?? "iyzico couldn't find the payment.");
  const items = Array.isArray(result.itemTransactions) ? (result.itemTransactions as Record<string, unknown>[]) : [];
  return {
    paymentId: idText(result.paymentId) ?? input.paymentId,
    paidCents: Math.round(Number(result.paidPrice ?? 0) * 100),
    currency: typeof result.currency === "string" ? result.currency : null,
    items: items
      .map((t) => ({
        paymentTransactionId: idText(t.paymentTransactionId) ?? "",
        paidCents: Math.round(Number(t.paidPrice ?? t.price ?? 0) * 100),
        subMerchantKey: typeof t.subMerchantKey === "string" && t.subMerchantKey ? t.subMerchantKey : null,
      }))
      .filter((t) => t.paymentTransactionId !== ""),
  };
}

/**
 * 47 Cancels a whole payment (`POST /payment/cancel`): only on the day it
 * was taken, before iyzico's end-of-day report, and never in part. The
 * customer's statement shows nothing. Returns iyzico's reference.
 */
export async function cancelIyzicoPayment(
  keys: IyzicoKeys,
  input: {
    paymentId: string;
    conversationId: string;
    ip: string;
    reason: IyzicoRefundReason;
    description: string;
  },
  options: { fetcher?: Fetch; baseUrl?: string | null } = {},
): Promise<{ reference: string }> {
  const result = await post(
    keys,
    "/payment/cancel",
    {
      locale: "en",
      conversationId: input.conversationId,
      paymentId: input.paymentId,
      ip: input.ip,
      reason: input.reason,
      description: input.description.slice(0, 200),
    },
    options,
  );
  if (result.status !== "success") throw new IyzicoError(result.errorMessage ?? "iyzico couldn't cancel the payment.");
  return {
    reference: idText(result.hostReference) ?? idText(result.authCode) ?? input.paymentId,
  };
}

/**
 * 47 Refunds part or all of one item transaction (`POST /payment/refund`):
 * iyzico refunds per basket item, never more than what was paid for it, up
 * to 365 days later. A marketplace item's own transaction is refunded, so
 * iyzico takes the refund from the shares the item was split into.
 * Returns iyzico's reference.
 */
export async function refundIyzicoItem(
  keys: IyzicoKeys,
  input: {
    paymentTransactionId: string;
    cents: number;
    currency: string;
    conversationId: string;
    ip: string;
    reason: IyzicoRefundReason;
    description: string;
  },
  options: { fetcher?: Fetch; baseUrl?: string | null } = {},
): Promise<{ reference: string }> {
  const result = await post(
    keys,
    "/payment/refund",
    {
      locale: "en",
      conversationId: input.conversationId,
      paymentTransactionId: input.paymentTransactionId,
      price: (input.cents / 100).toFixed(2),
      currency: input.currency,
      ip: input.ip,
      reason: input.reason,
      description: input.description.slice(0, 200),
    },
    options,
  );
  if (result.status !== "success") throw new IyzicoError(result.errorMessage ?? "iyzico couldn't make the refund.");
  return {
    reference: idText(result.hostReference) ?? idText(result.authCode) ?? input.paymentTransactionId,
  };
}
