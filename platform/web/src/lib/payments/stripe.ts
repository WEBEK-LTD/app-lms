import { PaymentError } from "./errors";

/**
 * 96.1 Stripe: a hosted Checkout Session, with the owner's own secret key.
 * We create the session (mode "payment"), send the customer to its page,
 * and Stripe sends them back to `success_url` or `cancel_url`. Neither proves
 * anything: the session is read back from Stripe with the secret key, and
 * only `payment_status: "paid"` with our reference, amount and currency marks
 * anything paid. Requests are form-encoded; amounts are in the currency's
 * smallest unit (every currency Yallapp sells in has two decimals at Stripe).
 * Test keys (`sk_test_…`, `rk_test_…`) work on Stripe's test data.
 */

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

/** Test keys start with sk_test_ or rk_test_. */
export function stripeTestKey(secretKey: string): boolean {
  return /^(?:sk|rk)_test_/.test(secretKey);
}

/** A Stripe secret or restricted key, live or test. */
export function validStripeKey(value: string): boolean {
  return /^(?:sk|rk)_(?:test|live)_[A-Za-z0-9]{10,240}$/.test(value);
}

/** The currencies Yallapp sells in that Stripe charges (all of them). */
export const STRIPE_CURRENCIES = ["TRY", "USD", "EUR", "EGP", "SAR", "AED"] as const;

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

function errorOf(json: Record<string, unknown> | null, fallback: string): string {
  return text(record(json?.error)?.message) ?? fallback;
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
          price_data: { currency: request.currency.toLowerCase(), unit_amount: request.amountCents, product_data: { name: request.description.slice(0, 250) || request.reference } },
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
  return {
    paid: json.payment_status === "paid" && json.status === "complete",
    reference: text(json.client_reference_id) ?? text(record(json.metadata)?.reference),
    amountCents: typeof json.amount_total === "number" ? json.amount_total : null,
    currency: text(json.currency)?.toUpperCase() ?? null,
    paymentIntent: text(intent) ?? text(record(intent)?.id),
  };
}

/** Refunds part or all of a payment (POST /v1/refunds); returns Stripe's refund ID. */
export async function refundStripePayment(
  keys: StripeKeys,
  request: { paymentIntent: string; cents: number; key: string },
  options: Options = {},
): Promise<{ reference: string }> {
  const { status, json } = await call(keys, "POST", "/v1/refunds", { payment_intent: request.paymentIntent, amount: request.cents, reason: "requested_by_customer" }, { ...options, idempotencyKey: request.key });
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
