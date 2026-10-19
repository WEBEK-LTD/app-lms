import { createHmac, timingSafeEqual } from "node:crypto";
import { decimalToCents, PaymentError } from "./errors";

/**
 * 37 Kashier (Egypt): a hosted payment session. We create the session with
 * the secret key (Authorization) and the Payment API key (api-key), send the
 * customer to its page, and Kashier sends them back to `merchantRedirect`
 * and posts a webhook to `serverWebhook`. Neither proves anything: the
 * payment is read back from Kashier with our secret key before anything is
 * marked paid. Amounts are decimal strings in major units ("450.00").
 */

export interface KashierKeys {
  /** MID-XXXX-XXXX. */
  merchantId: string;
  /** The Payment API key: sent as `api-key`, and signs the webhooks. */
  apiKey: string;
  /** The secret key: the Authorization header. */
  secretKey: string;
  /** Test keys (test mode keys differ from live ones). */
  sandbox: boolean;
}

export class KashierError extends PaymentError {
  constructor(message: string, options: { unreachable?: boolean } = {}) {
    super(message, options);
    this.name = "KashierError";
  }
}

type Fetch = typeof fetch;
interface Options {
  fetcher?: Fetch;
  /** Kashier's address in tests (a fake server). */
  baseUrl?: string | null;
}

export const KASHIER_URLS = { live: "https://api.kashier.io", sandbox: "https://test-api.kashier.io" };

export function kashierBaseUrl(keys: Pick<KashierKeys, "sandbox">, override?: string | null): string {
  return (override || (keys.sandbox ? KASHIER_URLS.sandbox : KASHIER_URLS.live)).replace(/\/+$/, "");
}

/** Kashier merchant IDs look like MID-1234-567. */
export function validKashierMerchantId(value: string): boolean {
  return /^MID-[A-Za-z0-9-]{3,60}$/.test(value);
}

/** 47 Kashier's order operations (refunds) live on its "fep" host. */
export const KASHIER_FEP_URLS = { live: "https://fep.kashier.io", sandbox: "https://test-fep.kashier.io" };

export function kashierFepUrl(keys: Pick<KashierKeys, "sandbox">, override?: string | null): string {
  return (override || (keys.sandbox ? KASHIER_FEP_URLS.sandbox : KASHIER_FEP_URLS.live)).replace(/\/+$/, "");
}

async function call(
  keys: KashierKeys,
  method: "GET" | "POST" | "PUT",
  path: string,
  body: unknown,
  options: Options,
  base: string = kashierBaseUrl(keys, options.baseUrl),
): Promise<{ status: number; json: Record<string, unknown> | null }> {
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(`${base}${path}`, {
      method,
      headers: {
        authorization: keys.secretKey,
        ...(method === "POST" ? { "api-key": keys.apiKey, "content-type": "application/json" } : method === "PUT" ? { "content-type": "application/json" } : {}),
        accept: "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new KashierError("Kashier can't be reached.", { unreachable: true });
  }
  const json = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: response.status, json: json && typeof json === "object" ? json : null };
}

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const text = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : typeof value === "number" ? String(value) : null);

function errorOf(json: Record<string, unknown> | null, fallback: string): string {
  const messages = record(json?.messages);
  const error = record(json?.error);
  return text(messages?.en) ?? text(error?.message) ?? text(json?.message) ?? fallback;
}

export interface KashierSessionRequest {
  /** Our order reference; unique per session (Kashier refuses a reused one). */
  order: string;
  amountCents: number;
  currency: string;
  /** Where Kashier sends the customer back. */
  merchantRedirect: string;
  /** Where Kashier posts the payment's webhook; null for none. */
  serverWebhook: string | null;
  customer: { email: string; reference: string };
  description: string;
  /** 49 When the session stops taking the payment (`expireAt`); missing: Kashier's own default. */
  expiresAt?: Date | null;
}

/** Creates a hosted payment session; returns its ID (to read the payment back) and its page. */
export async function createKashierSession(
  keys: KashierKeys,
  request: KashierSessionRequest,
  options: Options = {},
): Promise<{ sessionId: string; sessionUrl: string }> {
  const { status, json } = await call(
    keys,
    "POST",
    "/v3/payment/sessions",
    {
      paymentType: "credit",
      amount: (request.amountCents / 100).toFixed(2),
      currency: request.currency,
      order: request.order,
      merchantId: keys.merchantId,
      merchantRedirect: request.merchantRedirect,
      ...(request.serverWebhook ? { serverWebhook: request.serverWebhook } : {}),
      display: "en",
      type: "one-time",
      allowedMethods: "card",
      defaultMethod: "card",
      failureRedirect: false,
      maxFailureAttempts: 3,
      customer: request.customer,
      description: request.description.slice(0, 120),
      metaData: { reference: request.order },
      ...(request.expiresAt ? { expireAt: request.expiresAt.toISOString() } : {}),
    },
    options,
  );
  const body = record(json?.response) ?? json;
  const sessionUrl = text(body?.sessionUrl);
  if (status >= 400 || !sessionUrl) throw new KashierError(errorOf(json, "Kashier couldn't start the payment."));
  // The session's ID reads the payment back; its page's last path segment is the same ID.
  const sessionId = text(body?._id) ?? text(body?.sessionId) ?? text(body?.id) ?? lastSegment(sessionUrl);
  if (!sessionId) throw new KashierError("Kashier didn't return the payment session.");
  return { sessionId, sessionUrl };
}

function lastSegment(url: string): string | null {
  try {
    const segment = new URL(url).pathname.split("/").filter(Boolean).pop();
    return segment && /^[A-Za-z0-9_-]{8,}$/.test(segment) ? segment : null;
  } catch {
    return null;
  }
}

export interface KashierPayment {
  paid: boolean;
  /** Kashier's status, upper case ("SUCCESS", "FAILURE", "PENDING"). */
  status: string | null;
  amountCents: number | null;
  currency: string | null;
  /** The `order` we sent. */
  merchantOrderId: string | null;
  transactionId: string | null;
  /** 47 Kashier's own order ID, which a refund names. */
  kashierOrderId?: string | null;
}

const PAID = new Set(["SUCCESS", "PAID", "CAPTURED"]);

/** The payment of a session, as Kashier has it (GET /v3/payment/sessions/{id}/payment, with the secret key). */
export async function getKashierSessionPayment(keys: KashierKeys, sessionId: string, options: Options = {}): Promise<KashierPayment> {
  const { status, json } = await call(keys, "GET", `/v3/payment/sessions/${encodeURIComponent(sessionId)}/payment`, undefined, options);
  if (status === 404) return { paid: false, status: null, amountCents: null, currency: null, merchantOrderId: null, transactionId: null };
  if (status >= 400 || !json) throw new KashierError(errorOf(json, `Kashier answered HTTP ${status}.`));
  const data = record(json.data) ?? record(json.response) ?? json;
  const params = record(data.paymentParams);
  const state = (text(data.status) ?? text(data.paymentStatus))?.toUpperCase() ?? null;
  return {
    paid: state !== null && PAID.has(state),
    status: state,
    amountCents: decimalToCents(data.amount ?? params?.amount),
    currency: text(data.currency) ?? text(params?.currency),
    merchantOrderId: text(data.merchantOrderId) ?? text(data.order) ?? text(params?.order),
    transactionId: text(data.transactionId) ?? text(data.kashierOrderId) ?? text(data.orderId),
    kashierOrderId: text(data.kashierOrderId) ?? text(data.orderId) ?? null,
  };
}

const REFUNDED = new Set(["SUCCESS", "REFUNDED", "APPROVED"]);

/**
 * 47 Refunds part or all of a payment: `PUT /v3/orders/{orderId}/` on
 * Kashier's fep host with the secret key, `apiOperation: "REFUND"`, the
 * amount in major units and the payment's transaction as the target (its
 * documented refund call; the key's role needs the refund permission).
 * Returns Kashier's reference for the refund. Throws KashierError when
 * Kashier refuses it or can't be reached.
 */
export async function refundKashierPayment(
  keys: KashierKeys,
  input: { kashierOrderId: string; transactionId: string | null; cents: number; reason: string },
  options: Options = {},
): Promise<{ reference: string }> {
  const { status, json } = await call(
    keys,
    "PUT",
    `/v3/orders/${encodeURIComponent(input.kashierOrderId)}/`,
    {
      apiOperation: "REFUND",
      reason: input.reason.slice(0, 200),
      transaction: { amount: Number((input.cents / 100).toFixed(2)), ...(input.transactionId ? { targetTransactionId: input.transactionId } : {}) },
    },
    options,
    kashierFepUrl(keys, options.baseUrl),
  );
  const body = record(json?.response) ?? json;
  const transaction = record(body?.transaction);
  const state = (text(body?.status) ?? text(transaction?.status))?.toUpperCase() ?? null;
  if (status >= 400 || !json || (state !== null && !REFUNDED.has(state))) throw new KashierError(errorOf(json, "Kashier couldn't make the refund."));
  return { reference: text(transaction?.transactionId) ?? text(body?.transactionId) ?? text(body?.refundId) ?? input.kashierOrderId };
}

/** PHP's rawurlencode: everything but letters, digits and -_.~ */
function rawUrlEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** PHP's http_build_query(..., PHP_QUERY_RFC3986), which Kashier's own plugins sign: null is left out, true is "1". */
export function phpQuery(entries: [string, unknown][]): string {
  const parts: string[] = [];
  const add = (key: string, value: unknown) => {
    if (value === null || value === undefined) return;
    if (typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) add(`${key}[${k}]`, v);
      return;
    }
    const plain = typeof value === "boolean" ? (value ? "1" : "0") : String(value);
    parts.push(`${rawUrlEncode(key)}=${rawUrlEncode(plain)}`);
  };
  for (const [key, value] of entries) add(key, value);
  return parts.join("&");
}

/** The signature of a webhook's `data` over the given keys, in that order. */
export function kashierSignature(data: Record<string, unknown>, keys: string[], apiKey: string): string {
  return createHmac("sha256", apiKey).update(phpQuery(keys.map((k) => [k, data[k]]))).digest("hex");
}

/**
 * Whether a webhook is signed with this Payment API key: the
 * `x-kashier-signature` header is HMAC-SHA256 over `data`'s
 * `signatureKeys` as a query string (Kashier's docs sort the keys; its
 * plugins keep the order sent, so both are accepted).
 */
export function verifyKashierWebhook(body: unknown, signature: string | null, apiKey: string): boolean {
  const data = record(record(body)?.data);
  const keys = data?.signatureKeys;
  if (!data || !signature || !Array.isArray(keys) || keys.length === 0 || !keys.every((k) => typeof k === "string")) return false;
  const given = Buffer.from(signature.trim().toLowerCase());
  return [keys as string[], [...(keys as string[])].sort()].some((order) => {
    const expected = Buffer.from(kashierSignature(data, order, apiKey));
    return expected.length === given.length && timingSafeEqual(expected, given);
  });
}

/**
 * Whether Kashier accepts the secret key: it reads the merchant (as Kashier's
 * own plugins do). Null when Kashier couldn't be asked. The Payment API key
 * is only used when a payment starts.
 */
export async function checkKashierKeys(keys: KashierKeys, options: Options = {}): Promise<boolean | null> {
  try {
    const { status } = await call(keys, "GET", "/merchant", undefined, options);
    if (status === 401 || status === 403) return false;
    return status >= 200 && status < 300 ? true : null;
  } catch {
    return null;
  }
}
