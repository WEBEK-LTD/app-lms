/**
 * 132.30 Stripe's keys by their shape, as Stripe's docs give them
 * (docs.stripe.com/keys): a publishable key (pk_test_… / pk_live_…), safe
 * in a browser; a secret key (sk_…) or a restricted key (rk_…) for the
 * server; and a webhook endpoint's signing secret (whsec_…). The key's
 * prefix says its mode: test (Stripe's sandboxes) or live, and the two keys
 * of an account must be of the same mode. No Node modules here: the
 * dashboard's form uses these too, to show the mode as the owner types.
 */

export type StripeMode = "test" | "live";

/** Test keys start with sk_test_ or rk_test_. */
export function stripeTestKey(secretKey: string): boolean {
  return /^(?:sk|rk)_test_/.test(secretKey);
}

/** A Stripe secret or restricted key, live or test. */
export function validStripeKey(value: string): boolean {
  return /^(?:sk|rk)_(?:test|live)_[A-Za-z0-9]{10,240}$/.test(value);
}

/** 132.30 A publishable key, live or test. */
export function validStripePublishableKey(value: string): boolean {
  return /^pk_(?:test|live)_[A-Za-z0-9]{10,240}$/.test(value);
}

/** 132.31 A webhook endpoint's signing secret (the Dashboard's are base64, the Stripe CLI's hexadecimal). */
export function validStripeWebhookSecret(value: string): boolean {
  return /^whsec_[A-Za-z0-9+/=]{16,240}$/.test(value);
}

/** The mode a key's prefix says (secret, restricted or publishable); null when it has none. */
export function stripeKeyMode(key: string | null | undefined): StripeMode | null {
  const match = /^(?:sk|rk|pk)_(test|live)_/.exec(key ?? "");
  return match ? (match[1] as StripeMode) : null;
}

/** What is wrong with a pair of keys, first thing first; null when they go together. */
export type StripeKeysProblem = "secret_shape" | "publishable_missing" | "publishable_shape" | "mode_mix";

export function stripeKeysProblem(secretKey: string, publishableKey: string | null): StripeKeysProblem | null {
  if (!validStripeKey(secretKey)) return "secret_shape";
  if (!publishableKey) return "publishable_missing";
  if (!validStripePublishableKey(publishableKey)) return "publishable_shape";
  return stripeKeyMode(secretKey) === stripeKeyMode(publishableKey) ? null : "mode_mix";
}

/**
 * A key or secret as the page may show it: its kind and mode, then its last
 * four characters ("sk_test_…abcd", "whsec_…abcd", "…abcd"). Never more:
 * the rest stays encrypted on the server.
 */
export function maskKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const prefix = /^(?:(?:sk|rk|pk)_(?:test|live)_|whsec_)/.exec(value)?.[0] ?? "";
  const rest = value.slice(prefix.length);
  if (rest.length < 8) return `${prefix}…`;
  return `${prefix}…${rest.slice(-4)}`;
}

/**
 * The events the Stripe webhook endpoint should send (lib/payments/webhooks.ts
 * handles them): a Checkout Session paid, and one paid later by a method
 * that confirms after a while (a bank debit). Stripe's fulfilment guide
 * names these two (docs.stripe.com/checkout/fulfillment).
 */
/** 188 With payment_intent.succeeded: the app's PaymentSheet pays a PaymentIntent, not a Checkout Session. */
export const STRIPE_WEBHOOK_EVENTS = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "payment_intent.succeeded"] as const;

/** The address of an app's Stripe webhook endpoint, to paste in Stripe's Dashboard. */
export function stripeWebhookUrl(base: string, appId: string): string {
  return `${base.replace(/\/+$/, "")}/api/pay/stripe/webhook/${encodeURIComponent(appId)}`;
}
