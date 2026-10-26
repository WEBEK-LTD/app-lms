import "server-only";
import { chooseApp } from "../auth/session";
import { appUrl } from "../env";
import { verifyFawaterkWebhook } from "./fawaterk";
import { verifyKashierWebhook } from "./kashier";
import { PAYMENT_KINDS, type PaymentKind } from "./routes";
import { settleDonationPayment, settleOrderPayment, settlePlanPayment, type Settled, type Trigger } from "./settle";

/**
 * 37 /api/pay/kashier/<kind>/<token> and /api/pay/fawaterk/<kind>/<token>;
 * 96.1 /api/pay/stripe/… and /api/pay/paypal/… (GET only).
 *
 * GET: the provider sends the customer back. Nothing in the address is
 * trusted (no status, no amount): the payment is read back from the
 * provider, so the request is safe to repeat and needs no CSRF token.
 *
 * POST: the provider's webhook. Its signature is checked with the account
 * the payment started with (Kashier: x-kashier-signature, HMAC-SHA256 with
 * the Payment API key; Fawaterk: hashKey, HMAC-SHA256 with the API key),
 * and then the payment is read back all the same. No cookies are read.
 */

type Provider = "kashier" | "fawaterk";
/** 96.1 They only send the customer back (no webhook). */
type ReturnOnly = Provider | "stripe" | "paypal";

function settle(kind: PaymentKind, token: string, trigger: Trigger): Promise<Settled> {
  if (kind === "plan") return settlePlanPayment(token, trigger);
  if (kind === "order") return settleOrderPayment(token, trigger);
  return settleDonationPayment(token, trigger);
}

const isKind = (value: string): value is PaymentKind => (PAYMENT_KINDS as string[]).includes(value);

/** The customer comes back from the provider's page. */
export async function providerReturn(provider: ReturnOnly, kind: string, token: string): Promise<Response> {
  if (!isKind(kind)) return new Response("Not found", { status: 404 });
  const settled = await settle(kind, token, { provider });
  if (kind === "plan" && settled.paidApp) await chooseApp(settled.paidApp);
  return new Response(null, { status: 303, headers: { location: `${appUrl()}${settled.path}`, "cache-control": "no-store" } });
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text().catch(() => "");
  if (!text || text.length > 64_000) return null;
  try {
    const json = JSON.parse(text) as unknown;
    return json && typeof json === "object" && !Array.isArray(json) ? (json as Record<string, unknown>) : null;
  } catch {
    // Some providers post a form instead.
    return Object.fromEntries(new URLSearchParams(text));
  }
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** The provider's webhook. */
export async function providerWebhook(provider: Provider, kind: string, token: string, request: Request): Promise<Response> {
  if (!isKind(kind)) return json({ error: "not_found" }, 404);
  const body = await readBody(request);
  if (!body) return json({ error: "invalid_body" }, 400);
  let trigger: Trigger;
  if (provider === "kashier") {
    // Only payments matter here; refunds are made (and seen) in Kashier's panel.
    if (body.event !== undefined && body.event !== "pay") return json({ received: true });
    const signature = request.headers.get("x-kashier-signature");
    trigger = { provider, verify: (account) => account.provider === "kashier" && verifyKashierWebhook(body, signature, account.keys.apiKey) };
  } else {
    // Only a paid invoice carries the hashKey; other events change nothing here.
    if (String(body.invoice_status ?? "").toLowerCase() !== "paid") return json({ received: true });
    const invoiceId = typeof body.invoice_id === "string" || typeof body.invoice_id === "number" ? String(body.invoice_id) : null;
    trigger = { provider, providerRef: invoiceId, verify: (account) => account.provider === "fawaterk" && verifyFawaterkWebhook(body, account.keys.apiKey) };
  }
  const settled = await settle(kind, token, trigger);
  if (settled.status === "rejected") return json({ error: "invalid_signature" }, 401);
  if (settled.status === "not_found") return json({ error: "not_found" }, 404);
  return json({ received: true, status: settled.status });
}
