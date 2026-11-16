import { decrypt } from "../crypto/encryption";
import { catalogSettings, isOwnPayment, paymentContext } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { CatalogOrder, Donation, OwnPayment, PaymentProviderId, PaymentWebhookReceipt } from "../data/types";
import type { Settled, Trigger } from "./settle";
import { verifyStripeSignature } from "./stripe";

/**
 * 132.31 Stripe's webhook, and 132.33 the last webhook each gateway sent.
 *
 * Stripe sends an account's events to the endpoint its owner adds in the
 * Stripe Dashboard: one address per app, /api/pay/stripe/webhook/<app id>
 * (lib/payments/stripe-keys.ts). Its signature is checked on the raw body
 * with the endpoint's signing secret the owner saved (verifyStripeSignature),
 * and a paid Checkout Session settles its order or donation as Kashier's and
 * Fawaterk's webhooks do: the event is only a trigger, the session is read
 * back from Stripe with the owner's key before anything is marked paid
 * (lib/payments/settle.ts), so a replay or a forged event changes nothing.
 *
 * Each signed webhook is noted on the owner's account (`webhook`, never the
 * body), and one whose signature didn't match too, for the payments page to
 * say "Webhook working" or what to fix. Notes are written at most once a
 * minute per account, so a stream of webhooks writes the app rarely.
 */

/** What a webhook came to: signed by the account's secret (with its event), or refused. */
export type WebhookOutcome = { ok: true; event: string | null; livemode?: boolean | null } | { ok: false; failure: "signature" | "no_secret" };

const NOTE_EVERY_MS = 60_000;

/** The receipt after this webhook; null when the one kept already says it (noted less than a minute ago). */
export function nextReceipt(previous: PaymentWebhookReceipt | null | undefined, outcome: WebhookOutcome, now: Date): PaymentWebhookReceipt | null {
  const recent = (iso: string | null | undefined) => iso != null && now.getTime() - Date.parse(iso) < NOTE_EVERY_MS && now.getTime() >= Date.parse(iso);
  if (outcome.ok) {
    const same = previous?.event === outcome.event && (previous?.livemode ?? null) === (outcome.livemode ?? null) && !previous?.failedAt;
    if (same && recent(previous?.at)) return null;
    return { at: now.toISOString(), event: outcome.event?.slice(0, 80) ?? null, livemode: outcome.livemode ?? null, failedAt: null, failure: null };
  }
  if (previous?.failure === outcome.failure && recent(previous?.failedAt)) return null;
  return { at: previous?.at ?? null, event: previous?.event ?? null, livemode: previous?.livemode ?? null, failedAt: now.toISOString(), failure: outcome.failure };
}

/** The gateways whose webhooks are noted (iyzico and PayPal send none here). */
const NOTED: ReadonlySet<PaymentProviderId> = new Set(["stripe", "kashier", "fawaterk"]);

/** The receipt kept on the owner's account; null for none (or a gateway without webhooks). */
export function webhookReceipt(payment: OwnPayment | null | undefined): PaymentWebhookReceipt | null {
  if (!payment || !NOTED.has(payment.provider)) return null;
  return ("webhook" in payment ? payment.webhook : null) ?? null;
}

/**
 * Notes a webhook on the app's own account of this gateway. The app is read
 * again just before, and only the receipt changes, so nothing the owner
 * saved meanwhile is lost.
 */
export async function noteWebhook(store: Pick<DataStore, "getAppById" | "updateApp">, appId: string, provider: PaymentProviderId, outcome: WebhookOutcome, now: Date): Promise<void> {
  if (!NOTED.has(provider)) return;
  const app = await store.getAppById(appId);
  const settings = app ? catalogSettings(app) : null;
  const payment = settings?.payment;
  if (!app || !settings || !isOwnPayment(payment) || payment.provider !== provider) return;
  const receipt = nextReceipt(webhookReceipt(payment), outcome, now);
  if (!receipt) return;
  await store.updateApp(app.id, { catalogSettings: { ...settings, payment: { ...payment, webhook: receipt } as OwnPayment } }, now);
}

export interface StripeWebhookDeps {
  store: DataStore;
  encryptionKey: Buffer;
  now: Date;
  /** How an order and a donation are settled (lib/payments/settle.ts; tests: stand-ins). */
  settle: {
    order: (store: DataStore, order: CatalogOrder, trigger: Trigger) => Promise<Settled>;
    donation: (store: DataStore, donation: Donation, trigger: Trigger) => Promise<Settled>;
  };
}

export interface WebhookAnswer {
  status: number;
  body: Record<string, unknown>;
}

/** The largest body read: Stripe's events are a few kilobytes. */
export const STRIPE_WEBHOOK_MAX_BYTES = 512 * 1024;

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const text = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);

/** The events that settle a payment (lib/payments/stripe-keys.ts STRIPE_WEBHOOK_EVENTS). */
const SETTLING = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

/**
 * One webhook from Stripe for an app. 400 when its signature doesn't match
 * (Stripe shows the failure in its Dashboard and tries again), 404 when the
 * app takes no Stripe payments, 200 once it was taken in (a paid session
 * settled, any other event acknowledged).
 */
export async function handleStripeWebhook(deps: StripeWebhookDeps, appId: string, body: Uint8Array, signature: string | null): Promise<WebhookAnswer> {
  const app = await deps.store.getAppById(appId).catch(() => null);
  const payment = app ? catalogSettings(app).payment : null;
  if (!app || payment?.provider !== "stripe") return { status: 404, body: { error: "not_found" } };
  if (!payment.webhookSecretEncrypted) {
    await noteWebhook(deps.store, app.id, "stripe", { ok: false, failure: "no_secret" }, deps.now);
    return { status: 400, body: { error: "no_signing_secret" } };
  }
  let secret: string;
  try {
    secret = decrypt(payment.webhookSecretEncrypted, deps.encryptionKey, paymentContext(app.id));
  } catch {
    return { status: 500, body: { error: "unreadable_secret" } };
  }
  const check = verifyStripeSignature(body, signature, secret, { now: deps.now });
  if (!check.ok) {
    await noteWebhook(deps.store, app.id, "stripe", { ok: false, failure: "signature" }, deps.now);
    return { status: 400, body: { error: "invalid_signature" } };
  }
  let event: Record<string, unknown> | null = null;
  try {
    event = record(JSON.parse(Buffer.from(body).toString("utf8")));
  } catch {
    event = null;
  }
  if (!event) return { status: 400, body: { error: "invalid_body" } };
  const type = text(event.type);
  const livemode = typeof event.livemode === "boolean" ? event.livemode : null;
  await noteWebhook(deps.store, app.id, "stripe", { ok: true, event: type, livemode }, deps.now);
  // An event of the other mode (a test endpoint's secret with live keys): its session can't be read back with these keys.
  if (livemode !== null && livemode === payment.sandbox) return { status: 200, body: { received: true, ignored: "other_mode" } };
  if (!type || !SETTLING.has(type)) return { status: 200, body: { received: true } };
  const session = record(record(event.data)?.object);
  const sessionId = text(session?.id);
  const reference = text(session?.client_reference_id) ?? text(record(session?.metadata)?.reference);
  const match = reference ? /^(order|donation)-(\d{1,15})$/.exec(reference) : null;
  if (!sessionId || !match) return { status: 200, body: { received: true } };
  const id = Number(match[2]);
  const trigger: Trigger = { provider: "stripe", providerRef: sessionId };
  const store = deps.store;
  if (match[1] === "order") {
    const order = await deps.store.getCatalogOrder(app.id, id);
    if (!order) return { status: 200, body: { received: true } };
    const settled = await deps.settle.order(store, order, trigger);
    return { status: 200, body: { received: true, status: settled.status } };
  }
  const donation = await deps.store.getDonation(app.id, id);
  if (!donation) return { status: 200, body: { received: true } };
  const settled = await deps.settle.donation(store, donation, trigger);
  return { status: 200, body: { received: true, status: settled.status } };
}
