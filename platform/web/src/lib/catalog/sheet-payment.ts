import type { CatalogOrder } from "../data/types";
import { checkTicketHold, holdForPayment, providerPageExpiry } from "../events/holds";
import { cancelStripeIntent, createStripeIntent, expireStripeSession, getStripeIntent, getStripeSession, readStripeAccount, STRIPE_CURRENCIES, StripeError, type StripeIntent, type StripeKeys } from "../payments/stripe";
import { chargedAmount, stripeEmbeddedKey, type PaymentDeps } from "./payment";
import { orderNumber } from "./settings";

/**
 * 188 Stripe's PaymentSheet in the apps: the app's own bottom sheet takes the
 * card, Apple Pay or Google Pay, natively, where the app's web view can't
 * show the wallets. The payment page stays in the app's web view (the
 * buyer's details, delivery, the coupon, the other gateways); when the buyer
 * pays with Stripe there, the page asks the app to take the payment, and the
 * app asks this for the PaymentIntent with the payment's token.
 *
 * One order, one PaymentIntent: the one kept on the order is used again
 * while it's for the same amount and currency and not cancelled; a Checkout
 * Session started earlier from the page's own Stripe form is expired first
 * (and read back: if it was paid, nothing new starts), and a PaymentIntent
 * replaced is cancelled. Each create carries an idempotency key made of the
 * order, the amount and what it replaces, so two calls at once make one.
 * Nothing is marked paid here: the order is settled by reading the
 * PaymentIntent back (the status route, the webhook), as every payment is.
 */

export type SheetStart =
  | {
      kind: "ready";
      publishableKey: string;
      clientSecret: string;
      intentId: string;
      /** The Stripe account's country (Google Pay and Apple Pay ask for it); null when Stripe didn't say. */
      merchantCountry: string | null;
      currency: string;
      amountCents: number;
      merchantName: string;
      /** Test keys: Google Pay's test environment. */
      testMode: boolean;
    }
  /** Paid already (earlier, by the page's form or the sheet): the order is settled by reading it back. */
  | { kind: "paid" }
  /** The sheet can't take this payment: the page's own Stripe form does. */
  | { kind: "unavailable"; reason: "not_stripe" | "no_publishable_key" | "currency" | "details_needed" | "in_progress" };

const reusable = (intent: StripeIntent, reference: string, cents: number, currency: string) =>
  intent.reference === reference &&
  intent.amountCents === cents &&
  intent.currency === currency &&
  intent.clientSecret !== null &&
  ["requires_payment_method", "requires_confirmation", "requires_action"].includes(intent.status);

/** Starts (or takes up again) the order's PaymentIntent for the app's PaymentSheet. Throws PaymentError when Stripe can't be asked. */
export async function startSheetPayment(deps: PaymentDeps & { order: CatalogOrder }): Promise<SheetStart> {
  const { order, app, now } = deps;
  const account = deps.account.account;
  // 72 Yallapp never collects payments for its clients.
  if (deps.account.marketplace) throw new Error("A sale is never paid into Yallapp's account.");
  if (account.provider !== "stripe") return { kind: "unavailable", reason: "not_stripe" };
  const publishableKey = stripeEmbeddedKey(app, account);
  if (!publishableKey) return { kind: "unavailable", reason: "no_publishable_key" };
  // The buyer's details are given on the page first (its form saves them on the order).
  if (!order.customer) return { kind: "unavailable", reason: "details_needed" };
  const charge = chargedAmount(order);
  if (!STRIPE_CURRENCIES.includes(charge.currency)) return { kind: "unavailable", reason: "currency" };
  await checkTicketHold(deps.store, app, order, now);
  const keys: StripeKeys = account.keys;
  const options = { fetcher: deps.fetcher, baseUrl: deps.urls?.stripe };
  const reference = `order-${order.id}`;
  const earlier = order.paymentProvider === "stripe" ? order.providerRef : null;
  let intent: StripeIntent | null = null;
  if (earlier?.startsWith("pi_")) {
    const known = await getStripeIntent(keys, earlier, options);
    if (known?.status === "succeeded") return { kind: "paid" };
    if (known?.status === "processing" || known?.status === "requires_capture") return { kind: "unavailable", reason: "in_progress" };
    if (known && reusable(known, reference, charge.cents, charge.currency)) intent = known;
    else if (known && known.status !== "canceled") {
      // Another amount (the shipping priced since): this one can't be paid as well.
      const after = await cancelStripeIntent(keys, known.id, options);
      if (after?.status === "succeeded") return { kind: "paid" };
      if (after && after.status !== "canceled") return { kind: "unavailable", reason: "in_progress" };
    }
  } else if (earlier?.startsWith("cs_")) {
    // The page's own Stripe form started a Checkout Session: paid, or closed before the sheet takes the payment.
    const session = await getStripeSession(keys, earlier, options);
    if (session.paid) return { kind: "paid" };
    if (!(await expireStripeSession(keys, earlier, options)) && (await getStripeSession(keys, earlier, options)).paid) return { kind: "paid" };
  }
  if (!intent) {
    intent = await createStripeIntentFor(deps, keys, {
      reference,
      cents: charge.cents,
      currency: charge.currency,
      email: order.customer.email || null,
      // The same order, amount and payment it follows: the same PaymentIntent, however many times the app asks at once.
      idempotencyKey: `${reference}-sheet-${charge.cents}-${charge.currency}-${earlier ?? "first"}`,
    });
    // 49 Tickets: the places are held while the sheet takes the payment, as for the provider's page.
    await holdForPayment(deps.store, app, order, providerPageExpiry(now), now);
    await deps.store.updateCatalogOrder(order.appId, order.id, { commissionCents: null, paymentProvider: "stripe", providerRef: intent.id.slice(0, 191), updatedAt: now });
  }
  if (!intent.clientSecret) throw new StripeError("Stripe couldn't start the payment.");
  const country = await readStripeAccount(keys, options).catch(() => null);
  return {
    kind: "ready",
    publishableKey,
    clientSecret: intent.clientSecret,
    intentId: intent.id,
    merchantCountry: country?.kind === "ok" && country.value.country && /^[A-Z]{2}$/.test(country.value.country) ? country.value.country : null,
    currency: charge.currency,
    amountCents: charge.cents,
    merchantName: (app.appName ?? app.shortName ?? "").trim().slice(0, 60) || `Order ${orderNumber(order)}`,
    testMode: keys.sandbox,
  };
}

async function createStripeIntentFor(
  deps: PaymentDeps & { order: CatalogOrder },
  keys: StripeKeys,
  request: { reference: string; cents: number; currency: string; email: string | null; idempotencyKey: string },
): Promise<StripeIntent> {
  return createStripeIntent(
    keys,
    {
      reference: request.reference,
      amountCents: request.cents,
      currency: request.currency,
      description: `Order ${orderNumber(deps.order)}${deps.app.appName ? ` from ${deps.app.appName}` : ""}`,
      customerEmail: request.email,
      idempotencyKey: request.idempotencyKey,
    },
    { fetcher: deps.fetcher, baseUrl: deps.urls?.stripe },
  );
}
