import { decimalToCents, PaymentError } from "./errors";

/**
 * 96.1 PayPal: an order (Orders v2, intent CAPTURE) with the owner's own
 * REST app (client ID and secret). We create the order, send the customer to
 * PayPal to approve it, and PayPal sends them back to `return_url` or
 * `cancel_url`. Neither proves anything: the order is read back from PayPal,
 * captured if it was approved, and only a COMPLETED capture with our
 * reference, amount and currency marks anything paid. Capturing an order
 * twice is refused by PayPal, so a second confirmation reads the capture
 * back instead. Amounts are decimal strings in major units ("450.00").
 */

export interface PaypalKeys {
  clientId: string;
  secret: string;
  /** Sandbox credentials (developer.paypal.com) instead of live ones. */
  sandbox: boolean;
}

export class PaypalError extends PaymentError {
  constructor(message: string, options: { unreachable?: boolean } = {}) {
    super(message, options);
    this.name = "PaypalError";
  }
}

type Fetch = typeof fetch;
interface Options {
  fetcher?: Fetch;
  /** PayPal's address in tests (a fake server). */
  baseUrl?: string | null;
}

export const PAYPAL_URLS = { live: "https://api-m.paypal.com", sandbox: "https://api-m.sandbox.paypal.com" };

/** The currencies Yallapp sells in that PayPal takes (it has no Turkish lira, Egyptian pound, riyal or dirham). */
export const PAYPAL_CURRENCIES = ["USD", "EUR"] as const;

export function paypalBaseUrl(keys: Pick<PaypalKeys, "sandbox">, override?: string | null): string {
  return (override || (keys.sandbox ? PAYPAL_URLS.sandbox : PAYPAL_URLS.live)).replace(/\/+$/, "");
}

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);

function errorOf(json: Record<string, unknown> | null, fallback: string): string {
  const detail = record(list(json?.details)[0]);
  return text(detail?.description) ?? text(json?.message) ?? text(json?.error_description) ?? fallback;
}

async function send(url: string, init: RequestInit, options: Options): Promise<{ status: number; json: Record<string, unknown> | null }> {
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(url, { ...init, signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new PaypalError("PayPal can't be reached.", { unreachable: true });
  }
  const json = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: response.status, json: json && typeof json === "object" ? json : null };
}

/** An access token for the REST app (client credentials); null when PayPal refuses the credentials. */
async function accessToken(keys: PaypalKeys, options: Options): Promise<string | null> {
  const { status, json } = await send(
    `${paypalBaseUrl(keys, options.baseUrl)}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${keys.clientId}:${keys.secret}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: "grant_type=client_credentials",
    },
    options,
  );
  if (status === 401 || status === 400) return null;
  const token = text(json?.access_token);
  if (status >= 400 || !token) throw new PaypalError(errorOf(json, `PayPal answered HTTP ${status}.`));
  return token;
}

async function call(
  keys: PaypalKeys,
  method: "GET" | "POST",
  path: string,
  body: unknown,
  options: Options & { requestId?: string },
): Promise<{ status: number; json: Record<string, unknown> | null }> {
  const token = await accessToken(keys, options);
  if (!token) throw new PaypalError("PayPal didn't accept the client ID and secret.");
  return send(
    `${paypalBaseUrl(keys, options.baseUrl)}${path}`,
    {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        ...(method === "POST" ? { "content-type": "application/json" } : {}),
        ...(options.requestId ? { "paypal-request-id": options.requestId } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    options,
  );
}

const decimal = (cents: number) => (cents / 100).toFixed(2);

export interface PaypalOrderRequest {
  /** Our reference ("order-<id>"): the purchase unit's custom_id and reference_id. */
  reference: string;
  amountCents: number;
  currency: string;
  description: string;
  returnUrl: string;
}

/** Creates an order for the customer to approve; returns its ID (to read it back) and PayPal's page. */
export async function createPaypalOrder(keys: PaypalKeys, request: PaypalOrderRequest, options: Options = {}): Promise<{ orderId: string; url: string }> {
  const { status, json } = await call(
    keys,
    "POST",
    "/v2/checkout/orders",
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: request.reference.slice(0, 256),
          custom_id: request.reference.slice(0, 127),
          description: request.description.slice(0, 127),
          amount: { currency_code: request.currency, value: decimal(request.amountCents) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: { return_url: request.returnUrl, cancel_url: request.returnUrl, user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING" },
        },
      },
    },
    { ...options, requestId: `${request.reference}-${Date.now().toString(36)}` },
  );
  const id = text(json?.id);
  const link = list(json?.links)
    .map(record)
    .find((l) => l && (l.rel === "payer-action" || l.rel === "approve"));
  const url = text(link?.href);
  if (status >= 400 || !id || !url) throw new PaypalError(errorOf(json, "PayPal couldn't start the payment."));
  return { orderId: id, url };
}

export interface PaypalPayment {
  paid: boolean;
  /** The order's custom_id: our reference. */
  reference: string | null;
  amountCents: number | null;
  currency: string | null;
  /** The capture, which a refund names. */
  captureId: string | null;
}

function paymentOf(order: Record<string, unknown> | null): PaypalPayment {
  const unit = record(list(order?.purchase_units)[0]);
  const capture = record(list(record(unit?.payments)?.captures)[0]);
  const amount = record(capture?.amount) ?? record(unit?.amount);
  return {
    paid: order?.status === "COMPLETED" && capture?.status === "COMPLETED",
    reference: text(capture?.custom_id) ?? text(unit?.custom_id) ?? text(unit?.reference_id),
    amountCents: decimalToCents(amount?.value),
    currency: text(amount?.currency_code)?.toUpperCase() ?? null,
    captureId: text(capture?.id),
  };
}

/**
 * The order as PayPal has it, captured first when the customer approved it
 * (GET /v2/checkout/orders/{id}, then POST …/capture once).
 */
export async function confirmPaypalOrder(keys: PaypalKeys, orderId: string, options: Options = {}): Promise<PaypalPayment> {
  const path = `/v2/checkout/orders/${encodeURIComponent(orderId)}`;
  const read = await call(keys, "GET", path, undefined, options);
  if (read.status === 404) return { paid: false, reference: null, amountCents: null, currency: null, captureId: null };
  if (read.status >= 400 || !read.json) throw new PaypalError(errorOf(read.json, `PayPal answered HTTP ${read.status}.`));
  if (read.json.status !== "APPROVED") return paymentOf(read.json);
  const captured = await call(keys, "POST", `${path}/capture`, {}, { ...options, requestId: `capture-${orderId}` });
  if (captured.status < 400 && captured.json) return paymentOf(captured.json);
  // Captured meanwhile (a second return, the pending check): read it back.
  const again = await call(keys, "GET", path, undefined, options);
  if (again.status >= 400 || !again.json) throw new PaypalError(errorOf(captured.json, "PayPal couldn't find the payment."));
  return paymentOf(again.json);
}

/** Refunds part or all of a capture (POST /v2/payments/captures/{id}/refund); returns PayPal's refund ID. */
export async function refundPaypalCapture(
  keys: PaypalKeys,
  request: { captureId: string; cents: number; currency: string; note: string; key: string },
  options: Options = {},
): Promise<{ reference: string }> {
  const { status, json } = await call(
    keys,
    "POST",
    `/v2/payments/captures/${encodeURIComponent(request.captureId)}/refund`,
    { amount: { value: decimal(request.cents), currency_code: request.currency }, note_to_payer: request.note.slice(0, 255) || undefined },
    { ...options, requestId: request.key },
  );
  const id = text(json?.id);
  if (status >= 400 || !id || json?.status === "FAILED" || json?.status === "CANCELLED") throw new PaypalError(errorOf(json, "PayPal couldn't make the refund."));
  return { reference: id };
}

/** Whether PayPal accepts the client ID and secret (an access token, which changes nothing); null when it couldn't be asked. */
export async function checkPaypalKeys(keys: PaypalKeys, options: Options = {}): Promise<boolean | null> {
  try {
    return (await accessToken(keys, options)) !== null;
  } catch (e) {
    if (e instanceof PaypalError) return null;
    throw e;
  }
}
