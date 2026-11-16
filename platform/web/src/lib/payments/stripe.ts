import { ISO_CURRENCIES } from "../money/currencies";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PaymentError } from "./errors";
import { stripeTestKey, validStripeKey } from "./stripe-keys";

export { stripeTestKey, validStripeKey };

/**
 * 96.1 Stripe: a hosted Checkout Session, with the owner's own secret key.
 * We create the session (mode "payment"), send the customer to its page,
 * and Stripe sends them back to `success_url` or `cancel_url`. Neither proves
 * anything: the session is read back from Stripe with the secret key, and
 * only `payment_status: "paid"` with our reference, amount and currency marks
 * anything paid. Requests are form-encoded; amounts are in the currency's
 * smallest unit (132.32 stripeAmount: zero-decimal and three-decimal
 * currencies as Stripe counts them). Test keys (`sk_test_…`, `rk_test_…`)
 * work on Stripe's test data.
 *
 * 132.32 Every request names the API version it was written for
 * (`Stripe-Version`), so a change of the account's default version in
 * Stripe's Dashboard changes nothing here, and every create carries an
 * idempotency key, so a retry never makes a second one
 * (docs.stripe.com/api-versions, docs.stripe.com/api/idempotent_requests).
 * 132.31 The webhook's signature is checked as Stripe's docs say
 * (verifyStripeSignature, docs.stripe.com/webhooks/signature).
 */

/** 132.32 The API version this module reads and writes (2025-09-30.clover changed nothing it uses). */
export const STRIPE_API_VERSION = "2025-09-30.clover";

export interface StripeKeys {
  /** The secret key (or a restricted key with Checkout Sessions and Refunds). */
  secretKey: string;
  /** Test keys: derived from the key itself. */
  sandbox: boolean;
}

export class StripeError extends PaymentError {
  constructor(message: string, options: { unreachable?: boolean } = {}) {
    super(message, options);
    this.name = "StripeError";
  }
}

type Fetch = typeof fetch;
interface Options {
  fetcher?: Fetch;
  /** Stripe's address in tests (a fake server). */
  baseUrl?: string | null;
}

export const STRIPE_URL = "https://api.stripe.com";

/**
 * The currencies Yallapp sells in that Stripe charges (all of them). 133.4
 * Every active ISO 4217 currency but the few Stripe doesn't list
 * (docs.stripe.com/currencies): it has no Iraqi or Libyan dinar, Iranian,
 * Syrian, Sudanese or North Korean money, among others below.
 */
const STRIPE_LEAVES_OUT: ReadonlySet<string> = new Set(["BTN", "CUP", "ERN", "IQD", "IRR", "KPW", "LYD", "MRU", "SDG", "SSP", "STN", "SVC", "SYP", "TMT", "VED", "VES", "ZWG"]);
export const STRIPE_CURRENCIES: readonly string[] = ISO_CURRENCIES.filter((code) => !STRIPE_LEAVES_OUT.has(code));

/**
 * 132.32 How Stripe counts amounts (docs.stripe.com/currencies): most
 * currencies in cents; zero-decimal ones in whole units (¥500 is 500);
 * three-decimal ones in thousandths, the last digit 0; ISK and UGX are
 * whole units written with two decimals (always …00). Yallapp keeps every
 * amount in cents (hundredths), so these turn one into the other.
 */
export const STRIPE_ZERO_DECIMAL: ReadonlySet<string> = new Set(["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "VND", "VUV", "XAF", "XOF", "XPF"]);
export const STRIPE_THREE_DECIMAL: ReadonlySet<string> = new Set(["BHD", "JOD", "KWD", "OMR", "TND"]);
const STRIPE_WHOLE_TWO_DECIMAL: ReadonlySet<string> = new Set(["ISK", "UGX"]);

/** Our cents as Stripe's amount in this currency; null when the currency can't take it (fractions of a zero-decimal currency). */
export function stripeAmount(cents: number, currency: string): number | null {
  const code = currency.toUpperCase();
  if (!Number.isSafeInteger(cents) || cents < 0) return null;
  if (STRIPE_ZERO_DECIMAL.has(code)) return cents % 100 === 0 ? cents / 100 : null;
  if (STRIPE_WHOLE_TWO_DECIMAL.has(code)) return cents % 100 === 0 ? cents : null;
  // Thousandths, rounded to tens as Stripe asks: our cents times ten always are.
  if (STRIPE_THREE_DECIMAL.has(code)) return cents * 10;
  return cents;
}

/** Stripe's amount in this currency as our cents; null when it isn't a whole number of cents. */
export function centsFromStripe(amount: number, currency: string): number | null {
  const code = currency.toUpperCase();
  if (!Number.isSafeInteger(amount)) return null;
  if (STRIPE_ZERO_DECIMAL.has(code)) return amount * 100;
  if (STRIPE_THREE_DECIMAL.has(code)) return amount % 10 === 0 ? amount / 10 : null;
  return amount;
}

/**
 * 132.32 The least Stripe charges, in cents, where the currency is the
 * account's settlement currency (docs.stripe.com/currencies#minimum-and-maximum-charge-amounts):
 * 0.50 USD, 0.50 EUR, 2.00 AED and the others below. A payment in another
 * currency must come to the settlement currency's least once converted, so
 * for the lira, the pound and the riyal there's no fixed amount here: Stripe
 * says so itself when it refuses one.
 */
export const STRIPE_MINIMUM_CENTS: Readonly<Record<string, number>> = {
  USD: 50,
  EUR: 50,
  AED: 200,
  AUD: 50,
  BGN: 100,
  BRL: 50,
  CAD: 50,
  CHF: 50,
  CZK: 1500,
  DKK: 250,
  GBP: 30,
  HKD: 400,
  HUF: 17500,
  INR: 50,
  JPY: 5000,
  MXN: 1000,
  MYR: 200,
  NOK: 300,
  NZD: 50,
  PLN: 200,
  RON: 200,
  SEK: 300,
  SGD: 50,
  THB: 1000,
};

/** The least Stripe takes in this currency, in cents; null when it depends on the account's settlement currency. */
export function stripeMinimumCents(currency: string): number | null {
  return STRIPE_MINIMUM_CENTS[currency.toUpperCase()] ?? null;
}

/** Stripe's form encoding: nested keys in brackets (`line_items[0][quantity]`). */
export function stripeForm(params: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item && typeof item === "object") out.push(...stripeForm(item as Record<string, unknown>, `${name}[${i}]`));
        else out.push(`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof value === "object") {
      out.push(...stripeForm(value as Record<string, unknown>, name));
    } else {
      out.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return out;
}

async function call(
  keys: StripeKeys,
  method: "GET" | "POST",
  path: string,
  params: Record<string, unknown> | undefined,
  options: Options & { idempotencyKey?: string },
): Promise<{ status: number; json: Record<string, unknown> | null }> {
  const base = (options.baseUrl || STRIPE_URL).replace(/\/+$/, "");
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(`${base}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${keys.secretKey}`,
        accept: "application/json",
        "stripe-version": STRIPE_API_VERSION,
        ...(method === "POST" ? { "content-type": "application/x-www-form-urlencoded" } : {}),
        ...(options.idempotencyKey ? { "idempotency-key": options.idempotencyKey } : {}),
      },
      ...(params === undefined ? {} : { body: stripeForm(params).join("&") }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new StripeError("Stripe can't be reached.", { unreachable: true });
  }
  const json = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: response.status, json: json && typeof json === "object" ? json : null };
}

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const text = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);

/** Stripe's own words, with any key in them cut to its last four characters (Stripe masks most of it already). */
export function scrubStripeText(value: string): string {
  return value.replace(/\b((?:sk|rk|pk)_(?:test|live)_|whsec_)[A-Za-z0-9*+/=]+/g, (whole, prefix: string) => `${prefix}…${whole.slice(-4).replace(/\*/g, "")}`);
}

function errorOf(json: Record<string, unknown> | null, fallback: string): string {
  const message = text(record(json?.error)?.message);
  return message ? scrubStripeText(message) : fallback;
}


export interface StripeSessionRequest {
  /** Our reference ("order-<id>"): the session's client_reference_id and metadata. */
  reference: string;
  amountCents: number;
  currency: string;
  /** One line about what is paid, shown on Stripe's page. */
  description: string;
  customerEmail: string | null;
  /** Where Stripe sends the customer back, paid or not. */
  returnUrl: string;
  /** When the page stops taking the payment: Stripe takes 30 minutes to 24 hours from now. */
  expiresAt?: Date | null;
  now?: Date;
}

/** Creates a hosted Checkout Session; returns its ID (to read it back) and its page. */
export async function createStripeSession(keys: StripeKeys, request: StripeSessionRequest, options: Options = {}): Promise<{ sessionId: string; url: string; expiresAt: Date }> {
  const now = (request.now ?? new Date()).getTime();
  const min = now + 31 * 60_000;
  const max = now + 23 * 60 * 60_000;
  const wanted = request.expiresAt ? request.expiresAt.getTime() : max;
  const expiresAt = new Date(Math.min(max, Math.max(min, wanted)));
  // 132.32 In Stripe's units for the currency, and never under the least Stripe takes (it would refuse it).
  const unitAmount = stripeAmount(request.amountCents, request.currency);
  if (unitAmount === null) throw new StripeError(`Stripe doesn't take this amount in ${request.currency.toUpperCase()}.`);
  const least = stripeMinimumCents(request.currency);
  if (least !== null && request.amountCents < least) throw new StripeError(`Stripe takes payments of at least ${(least / 100).toFixed(2)} ${request.currency.toUpperCase()}.`);
  const { status, json } = await call(
    keys,
    "POST",
    "/v1/checkout/sessions",
    {
      mode: "payment",
      success_url: request.returnUrl,
      cancel_url: request.returnUrl,
      client_reference_id: request.reference,
      ...(request.customerEmail ? { customer_email: request.customerEmail } : {}),
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      metadata: { reference: request.reference },
      payment_intent_data: { metadata: { reference: request.reference }, description: request.description.slice(0, 500) },
      line_items: [
        {
          quantity: 1,
          price_data: { currency: request.currency.toLowerCase(), unit_amount: unitAmount, product_data: { name: request.description.slice(0, 250) || request.reference } },
        },
      ],
    },
    { ...options, idempotencyKey: `${request.reference}-${now}` },
  );
  const id = text(json?.id);
  const url = text(json?.url);
  if (status >= 400 || !id || !url) throw new StripeError(errorOf(json, "Stripe couldn't start the payment."));
  return { sessionId: id, url, expiresAt };
}

export interface StripePayment {
  paid: boolean;
  /** Our reference, as we gave it. */
  reference: string | null;
  amountCents: number | null;
  currency: string | null;
  /** The PaymentIntent, which a refund names. */
  paymentIntent: string | null;
}

/** A Checkout Session as Stripe has it (GET /v1/checkout/sessions/{id}). */
export async function getStripeSession(keys: StripeKeys, sessionId: string, options: Options = {}): Promise<StripePayment> {
  const { status, json } = await call(keys, "GET", `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, undefined, options);
  if (status === 404) return { paid: false, reference: null, amountCents: null, currency: null, paymentIntent: null };
  if (status >= 400 || !json) throw new StripeError(errorOf(json, `Stripe answered HTTP ${status}.`));
  const intent = json.payment_intent;
  const currency = text(json.currency)?.toUpperCase() ?? null;
  return {
    paid: json.payment_status === "paid" && json.status === "complete",
    reference: text(json.client_reference_id) ?? text(record(json.metadata)?.reference),
    // 132.32 Back from Stripe's units to cents.
    amountCents: typeof json.amount_total === "number" && currency ? centsFromStripe(json.amount_total, currency) : null,
    currency,
    paymentIntent: text(intent) ?? text(record(intent)?.id),
  };
}

/** Refunds part or all of a payment (POST /v1/refunds); returns Stripe's refund ID. */
export async function refundStripePayment(
  keys: StripeKeys,
  request: { paymentIntent: string; cents: number; key: string; /** 132.32 For Stripe's units; missing: cents. */ currency?: string },
  options: Options = {},
): Promise<{ reference: string }> {
  const amount = request.currency ? stripeAmount(request.cents, request.currency) : request.cents;
  if (amount === null) throw new StripeError("Stripe couldn't make the refund.");
  const { status, json } = await call(keys, "POST", "/v1/refunds", { payment_intent: request.paymentIntent, amount, reason: "requested_by_customer" }, { ...options, idempotencyKey: request.key });
  const id = text(json?.id);
  if (status >= 400 || !id || json?.status === "failed" || json?.status === "canceled") throw new StripeError(errorOf(json, "Stripe couldn't make the refund."));
  return { reference: id };
}

/** Whether Stripe accepts the key, with a call that changes nothing (GET /v1/balance); null when it couldn't be asked. */
export async function checkStripeKeys(keys: StripeKeys, options: Options = {}): Promise<boolean | null> {
  try {
    const { status } = await call(keys, "GET", "/v1/balance", undefined, options);
    if (status === 401) return false;
    // A restricted key without the balance permission is still a key Stripe knows.
    return status < 400 || status === 403 ? true : null;
  } catch (e) {
    if (e instanceof StripeError) return null;
    throw e;
  }
}

// 132.31 Webhooks: Stripe signs each one with the endpoint's signing secret.

/** Stripe's libraries accept a webhook signed up to 5 minutes ago (docs.stripe.com/webhooks/signature). */
export const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

/** The v1 signature: HMAC-SHA256, keyed with the whole signing secret, of "<timestamp>.<raw body>", in hex. */
export function stripeSignature(payload: string | Uint8Array, secret: string, timestamp: number): string {
  return createHmac("sha256", secret).update(`${timestamp}.`, "utf8").update(payload).digest("hex");
}

/** The Stripe-Signature header Stripe would send for this body (tests, and the dashboard's own check). */
export function stripeSignatureHeader(payload: string | Uint8Array, secret: string, timestamp: number): string {
  return `t=${timestamp},v1=${stripeSignature(payload, secret, timestamp)}`;
}

export type StripeSignatureCheck = { ok: true; timestamp: number } | { ok: false; reason: "no_header" | "no_timestamp" | "no_signature" | "mismatch" | "too_old" };

/**
 * Whether a webhook's Stripe-Signature header signs this raw body with this
 * secret, as Stripe's docs say to check it by hand: the header's `t` and
 * every `v1` (several while a rolled secret is still active; `v0` and any
 * other scheme ignored, so nothing downgrades it), the expected signature
 * compared in constant time with each, then the timestamp no older than the
 * tolerance. The body must be the bytes as they came: parsed and written
 * again, it no longer matches.
 */
export function verifyStripeSignature(
  payload: string | Uint8Array,
  header: string | null | undefined,
  secret: string,
  options: { now?: Date; toleranceSeconds?: number } = {},
): StripeSignatureCheck {
  if (!header) return { ok: false, reason: "no_header" };
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const at = part.indexOf("=");
    if (at < 1) continue;
    const key = part.slice(0, at).trim();
    const value = part.slice(at + 1).trim();
    if (key === "t" && timestamp === null && /^\d{1,12}$/.test(value)) timestamp = Number(value);
    else if (key === "v1" && /^[0-9a-f]{64}$/i.test(value)) signatures.push(value.toLowerCase());
  }
  if (timestamp === null) return { ok: false, reason: "no_timestamp" };
  if (signatures.length === 0) return { ok: false, reason: "no_signature" };
  const expected = Buffer.from(stripeSignature(payload, secret, timestamp), "utf8");
  const matches = signatures.some((signature) => {
    const given = Buffer.from(signature, "utf8");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!matches) return { ok: false, reason: "mismatch" };
  const tolerance = options.toleranceSeconds ?? STRIPE_SIGNATURE_TOLERANCE_SECONDS;
  const age = Math.floor((options.now ?? new Date()).getTime() / 1000) - timestamp;
  if (tolerance > 0 && age > tolerance) return { ok: false, reason: "too_old" };
  return { ok: true, timestamp };
}

// 132.34 "Test connection": calls that change nothing (one creates a test payment and cancels it, test keys only).

/** How a check went: Stripe answered (with what), refused the key (401), or the key may not do this (403, a restricted key). */
export type StripeProbe<T> = { kind: "ok"; value: T } | { kind: "refused"; message: string } | { kind: "forbidden"; message: string } | { kind: "error"; status: number; message: string };

function probeOf<T>(status: number, json: Record<string, unknown> | null, value: (json: Record<string, unknown>) => T): StripeProbe<T> {
  if (status === 401) return { kind: "refused", message: errorOf(json, "Invalid API key.") };
  if (status === 403) return { kind: "forbidden", message: errorOf(json, "This key can't do this.") };
  if (status >= 400 || !json) return { kind: "error", status, message: errorOf(json, `Stripe answered HTTP ${status}.`) };
  return { kind: "ok", value: value(json) };
}

export interface StripeAccountInfo {
  id: string | null;
  /** The business's name as Stripe shows it, else the Dashboard's display name. */
  name: string | null;
  country: string | null;
  defaultCurrency: string | null;
  /** Whether Stripe lets the account take live payments yet (it needs the account activated). */
  chargesEnabled: boolean | null;
}

/** The account the key belongs to (GET /v1/account). Throws StripeError when Stripe can't be reached. */
export async function readStripeAccount(keys: StripeKeys, options: Options = {}): Promise<StripeProbe<StripeAccountInfo>> {
  const { status, json } = await call(keys, "GET", "/v1/account", undefined, options);
  return probeOf(status, json, (account) => {
    const profile = record(account.business_profile);
    const settings = record(record(account.settings)?.dashboard);
    return {
      id: text(account.id),
      name: text(profile?.name) ?? text(settings?.display_name),
      country: text(account.country),
      defaultCurrency: text(account.default_currency)?.toUpperCase() ?? null,
      chargesEnabled: typeof account.charges_enabled === "boolean" ? account.charges_enabled : null,
    };
  });
}

/** Whether the key may use Checkout Sessions, which every payment starts with (GET /v1/checkout/sessions?limit=1). */
export async function probeStripeCheckout(keys: StripeKeys, options: Options = {}): Promise<StripeProbe<true>> {
  const { status, json } = await call(keys, "GET", "/v1/checkout/sessions?limit=1", undefined, options);
  return probeOf(status, json, () => true as const);
}

export interface StripeWebhookEndpoint {
  url: string;
  /** "enabled" or "disabled". */
  status: string | null;
  /** The events it sends; ["*"] for all. */
  events: string[];
}

/** The account's webhook endpoints in the key's mode (GET /v1/webhook_endpoints). */
export async function listStripeWebhookEndpoints(keys: StripeKeys, options: Options = {}): Promise<StripeProbe<StripeWebhookEndpoint[]>> {
  const { status, json } = await call(keys, "GET", "/v1/webhook_endpoints?limit=100", undefined, options);
  return probeOf(status, json, (list) =>
    (Array.isArray(list.data) ? list.data : []).flatMap((item) => {
      const endpoint = record(item);
      const url = text(endpoint?.url);
      if (!endpoint || !url) return [];
      const events = Array.isArray(endpoint.enabled_events) ? endpoint.enabled_events.filter((e): e is string => typeof e === "string") : [];
      return [{ url, status: text(endpoint.status), events }];
    }),
  );
}

/**
 * The optional test payment: a PaymentIntent of 0.50 USD (the least Stripe
 * charges in dollars), cancelled at once, so it shows in the Dashboard's test
 * payments as "Canceled". Test keys only: never with a live key.
 */
export async function stripeTestPayment(keys: StripeKeys, request: { key: string }, options: Options = {}): Promise<StripeProbe<{ id: string }>> {
  if (!stripeTestKey(keys.secretKey)) throw new Error("A test payment is made with test keys only.");
  const created = await call(
    keys,
    "POST",
    "/v1/payment_intents",
    {
      amount: 50,
      currency: "usd",
      payment_method_types: ["card"],
      description: "Yallapp connection test, cancelled at once",
      metadata: { purpose: "yallapp_connection_test" },
    },
    { ...options, idempotencyKey: `${request.key}-create` },
  );
  const id = text(created.json?.id);
  if (created.status >= 400 || !id) return probeOf(created.status >= 400 ? created.status : 502, created.json, () => ({ id: "" }));
  const cancelled = await call(keys, "POST", `/v1/payment_intents/${encodeURIComponent(id)}/cancel`, { cancellation_reason: "abandoned" }, { ...options, idempotencyKey: `${request.key}-cancel` });
  return probeOf(cancelled.status, cancelled.json, () => ({ id }));
}
