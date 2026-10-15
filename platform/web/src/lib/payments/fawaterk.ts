import { createHmac, timingSafeEqual } from "node:crypto";
import { decimalToCents, PaymentError } from "./errors";

/**
 * 37 Fawaterk (Egypt), API v2 with the vendor's API key as a Bearer token:
 * createInvoiceLink makes an invoice with its payment page, and Fawaterk
 * sends the customer back to the redirection URLs and posts a webhook.
 * Neither proves anything: the invoice is read back with getInvoiceData
 * before anything is marked paid. Amounts are decimal strings in major units.
 */

export interface FawaterkKeys {
  apiKey: string;
  /** A staging key (staging.fawaterk.com). */
  sandbox: boolean;
}

export class FawaterkError extends PaymentError {
  constructor(message: string) {
    super(message);
    this.name = "FawaterkError";
  }
}

type Fetch = typeof fetch;
interface Options {
  fetcher?: Fetch;
  /** Fawaterk's address in tests (a fake server). */
  baseUrl?: string | null;
}

export const FAWATERK_URLS = { live: "https://app.fawaterk.com", sandbox: "https://staging.fawaterk.com" };

export function fawaterkBaseUrl(keys: Pick<FawaterkKeys, "sandbox">, override?: string | null): string {
  return (override || (keys.sandbox ? FAWATERK_URLS.sandbox : FAWATERK_URLS.live)).replace(/\/+$/, "");
}

async function call(keys: FawaterkKeys, method: "GET" | "POST", path: string, body: unknown, options: Options) {
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(`${fawaterkBaseUrl(keys, options.baseUrl)}/api/v2${path}`, {
      method,
      headers: {
        authorization: `Bearer ${keys.apiKey}`,
        accept: "application/json",
        ...(method === "POST" ? { "content-type": "application/json" } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new FawaterkError("Fawaterk can't be reached.");
  }
  const json = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: response.status, json: json && typeof json === "object" ? json : null };
}

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const text = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : typeof value === "number" ? String(value) : null);
const money = (cents: number) => (cents / 100).toFixed(2);

function errorOf(json: Record<string, unknown> | null, fallback: string): string {
  const message = json?.message;
  if (typeof message === "string" && message) return message;
  const first = record(message) ? Object.values(record(message)!).flat()[0] : null;
  return typeof first === "string" ? first : fallback;
}

export interface FawaterkInvoiceRequest {
  /** Ours; sent in `payLoad` and read back from the invoice. */
  reference: string;
  amountCents: number;
  currency: string;
  customer: { firstName: string; lastName: string; email: string; phone: string | null; address: string | null };
  /** Their prices add up to `amountCents`. */
  items: { name: string; cents: number }[];
  successUrl: string;
  failUrl: string;
  pendingUrl: string;
  /** Null for none. */
  webhookUrl: string | null;
}

/** Makes an invoice; returns its ID (to read it back) and its payment page. */
export async function createFawaterkInvoice(
  keys: FawaterkKeys,
  request: FawaterkInvoiceRequest,
  options: Options = {},
): Promise<{ invoiceId: string; invoiceKey: string | null; url: string }> {
  const { customer } = request;
  const { status, json } = await call(
    keys,
    "POST",
    "/createInvoiceLink",
    {
      cartTotal: money(request.amountCents),
      currency: request.currency,
      customer: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        email: customer.email,
        // Digits only, as Fawaterk takes them.
        ...(customer.phone ? { phone: customer.phone.replace(/\D+/g, "") } : {}),
        ...(customer.address ? { address: customer.address } : {}),
      },
      // One per line, at the line's total: their prices add up to cartTotal exactly.
      cartItems: request.items.map((i) => ({ name: i.name.slice(0, 120), price: money(i.cents), quantity: "1" })),
      payLoad: { reference: request.reference },
      sendEmail: false,
      sendSMS: false,
      redirectionUrls: {
        successUrl: request.successUrl,
        failUrl: request.failUrl,
        pendingUrl: request.pendingUrl,
        ...(request.webhookUrl ? { webhookUrl: request.webhookUrl } : {}),
      },
    },
    options,
  );
  const data = record(json?.data);
  const invoiceId = text(data?.invoiceId) ?? text(data?.invoice_id);
  const url = text(data?.url);
  if (status >= 400 || json?.status !== "success" || !invoiceId || !url) throw new FawaterkError(errorOf(json, "Fawaterk couldn't start the payment."));
  return { invoiceId, invoiceKey: text(data?.invoiceKey) ?? text(data?.invoice_key), url };
}

export interface FawaterkInvoice {
  paid: boolean;
  amountCents: number | null;
  currency: string | null;
  /** The reference we sent in `payLoad`. */
  reference: string | null;
  invoiceId: string | null;
}

/** An invoice as Fawaterk has it (getInvoiceData). */
export async function getFawaterkInvoice(keys: FawaterkKeys, invoiceId: string, options: Options = {}): Promise<FawaterkInvoice> {
  const { status, json } = await call(keys, "GET", `/getInvoiceData/${encodeURIComponent(invoiceId)}`, undefined, options);
  if (status === 404) return { paid: false, amountCents: null, currency: null, reference: null, invoiceId: null };
  const data = record(json?.data);
  if (status >= 400 || json?.status !== "success" || !data) throw new FawaterkError(errorOf(json, `Fawaterk answered HTTP ${status}.`));
  let payload: unknown = data.pay_load ?? data.payLoad;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = null;
    }
  }
  return {
    paid: data.paid === 1 || data.paid === "1" || data.paid === true,
    amountCents: decimalToCents(data.total ?? data.cartTotal ?? data.cart_total),
    currency: text(data.currency),
    reference: text(record(payload)?.reference),
    invoiceId: text(data.invoice_id) ?? text(data.id) ?? invoiceId,
  };
}

/** Fawaterk's webhook hashKey: HMAC-SHA256 of "InvoiceId=…&InvoiceKey=…&PaymentMethod=…" with the vendor's key. */
export function fawaterkHash(invoiceId: string, invoiceKey: string, paymentMethod: string, apiKey: string): string {
  return createHmac("sha256", apiKey).update(`InvoiceId=${invoiceId}&InvoiceKey=${invoiceKey}&PaymentMethod=${paymentMethod}`).digest("hex");
}

/** Whether a paid-invoice webhook carries the hashKey of this vendor key. */
export function verifyFawaterkWebhook(body: unknown, apiKey: string): boolean {
  const data = record(body);
  const hashKey = text(data?.hashKey);
  const invoiceId = text(data?.invoice_id);
  const invoiceKey = text(data?.invoice_key);
  const method = text(data?.payment_method);
  if (!hashKey || !invoiceId || !invoiceKey || !method) return false;
  const expected = Buffer.from(fawaterkHash(invoiceId, invoiceKey, method, apiKey));
  const given = Buffer.from(hashKey.trim().toLowerCase());
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Whether Fawaterk accepts the key: it lists the vendor's payment methods. Null when Fawaterk couldn't be asked. */
export async function checkFawaterkKeys(keys: FawaterkKeys, options: Options = {}): Promise<boolean | null> {
  try {
    const { status, json } = await call(keys, "GET", "/getPaymentmethods", undefined, options);
    if (status === 401 || status === 403) return false;
    if (status >= 200 && status < 300) return json?.status === "success" ? true : json?.status === "error" ? false : null;
    return null;
  } catch {
    return null;
  }
}
