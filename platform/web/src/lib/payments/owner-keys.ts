import type { OwnPaymentInput } from "../catalog/settings";
import type { PaymentProviderId } from "../data/types";
import { validKashierMerchantId } from "./kashier";
import { PROVIDER_NAME, type PaymentAccount } from "./provider";
import { maskKey, stripeKeysProblem, stripeTestKey, validStripeKey, validStripePublishableKey, validStripeWebhookSecret } from "./stripe-keys";

/**
 * 37, 96.1 The keys an owner enters for their own gateway, read from the
 * payments form; 132 a secret left empty keeps the one saved for the same
 * gateway (the page shows it masked, "sk_test_…abcd"), so the owner can
 * add Stripe's webhook secret, or test, without pasting every key again.
 * The messages are English; the dashboard translates them by their words
 * (src/i18n/dashboard/gateways.ts).
 */

export type ReadKeys = { ok: true; input: OwnPaymentInput } | { ok: false; errors: Record<string, string> };

/** One field as typed: trimmed, without spaces inside, at most 300 characters; null when empty or not a key. */
function keyOf(value: string): string | null {
  const text = value.trim();
  return text && text.length <= 300 && !/\s/.test(text) ? text : null;
}

/**
 * The keys of `provider` from the form (`field` reads one by its name);
 * `saved` is what's saved now, decrypted (lib/catalog/settings.ts
 * ownPaymentInput), whose secrets stand in for empty fields of the same
 * gateway. `sandbox` is the form's test switch (Stripe: the keys' prefix).
 * `lenient` (Test connection): only a missing key is an error; the shapes
 * are the test's own checks (lib/payments/connection.ts).
 */
export function readOwnKeys(
  provider: PaymentProviderId,
  field: (name: string) => string,
  sandbox: boolean,
  saved: OwnPaymentInput | null = null,
  options: { lenient?: boolean } = {},
): ReadKeys {
  const same = saved?.provider === provider ? saved : null;
  const typed = (name: string) => field(name).trim() !== "";
  const key = (name: string, fallback: string | null | undefined) => (typed(name) ? keyOf(field(name)) : (fallback ?? null));
  const errors: Record<string, string> = {};
  const name = PROVIDER_NAME[provider];

  // 96.1 Stripe: test or live by the keys' own prefix; 132.30 the publishable key with the secret one, of the same mode.
  if (provider === "stripe") {
    const was = same?.provider === "stripe" ? same : null;
    const secretKey = key("secretKey", was?.secretKey);
    const publishableKey = key("publishableKey", was?.publishableKey);
    const webhookSecret = key("webhookSecret", was?.webhookSecret);
    // 188 Not a secret: the field shows what's saved, so an empty one clears it.
    const applePayMerchantId = field("applePayMerchantId").trim() || null;
    if (options.lenient) {
      if (!secretKey) return { ok: false, errors: { secretKey: "Paste your Stripe secret key: it starts with sk_live_ or sk_test_." } };
      return { ok: true, input: { provider, secretKey, sandbox: stripeTestKey(secretKey), publishableKey, webhookSecret, ...(was?.applePayMerchantId ? { applePayMerchantId: was.applePayMerchantId } : {}) } };
    }
    // Each key's own shape first (both said at once), then whether they're of the same mode.
    if (!secretKey || !validStripeKey(secretKey)) errors.secretKey = "Paste your Stripe secret key: it starts with sk_live_ or sk_test_.";
    if (!publishableKey || !validStripePublishableKey(publishableKey)) errors.publishableKey = "Paste your Stripe publishable key: it starts with pk_live_ or pk_test_.";
    else if (!errors.secretKey && stripeKeysProblem(secretKey!, publishableKey) === "mode_mix") {
      errors.publishableKey = "Use two keys of the same mode: both test (pk_test_ and sk_test_) or both live (pk_live_ and sk_live_).";
    }
    // 132.31 The signing secret is optional: without it, payments are read back when the customer returns and every hour.
    if (typed("webhookSecret") && (!webhookSecret || !validStripeWebhookSecret(webhookSecret))) errors.webhookSecret = "Paste the webhook's signing secret: it starts with whsec_.";
    if (applePayMerchantId !== null && !validApplePayMerchantId(applePayMerchantId)) {
      errors.applePayMerchantId = "Enter the Apple Pay merchant ID as Apple shows it: it starts with merchant., like merchant.com.yourshop.app.";
    }
    if (Object.keys(errors).length > 0 || !secretKey) return { ok: false, errors };
    return { ok: true, input: { provider, secretKey, sandbox: stripeTestKey(secretKey), publishableKey, webhookSecret, ...(applePayMerchantId ? { applePayMerchantId } : {}) } };
  }
  // 96.1 PayPal: the REST app's client ID and secret, sandbox or live.
  if (provider === "paypal") {
    const was = same?.provider === "paypal" ? same : null;
    const clientId = keyOf(field("clientId")) ?? was?.clientId ?? null;
    const secret = key("secretKey", was?.secret);
    if (!clientId) errors.clientId = "Paste your PayPal client ID.";
    if (!secret) errors.secretKey = "Paste your PayPal secret.";
    return clientId && secret ? { ok: true, input: { provider, clientId, secret, sandbox } } : { ok: false, errors };
  }
  const was = same && same.provider !== "stripe" && same.provider !== "paypal" ? same : null;
  const apiKey = key("apiKey", was?.apiKey);
  if (!apiKey) errors.apiKey = provider === "kashier" ? "Paste your Kashier Payment API key." : `Paste your ${name} API key.`;
  if (provider === "fawaterk") return apiKey ? { ok: true, input: { provider, apiKey, sandbox } } : { ok: false, errors };
  const secretKey = key("secretKey", was && "secretKey" in was ? was.secretKey : null);
  if (!secretKey) errors.secretKey = `Paste your ${name} secret key.`;
  if (provider === "iyzico") return apiKey && secretKey ? { ok: true, input: { provider, apiKey, secretKey, sandbox } } : { ok: false, errors };
  const merchantId = field("merchantId").trim() || (was?.provider === "kashier" ? was.merchantId : "");
  if (!options.lenient && !validKashierMerchantId(merchantId)) errors.merchantId = "Enter your merchant ID, like MID-1234-567.";
  return apiKey && secretKey && !errors.merchantId ? { ok: true, input: { provider, merchantId, apiKey, secretKey, sandbox } } : { ok: false, errors };
}

/**
 * 188 An Apple Pay merchant ID as Apple's developer account shows it
 * (`merchant.` then a reverse-domain name, letters, digits, dots and
 * dashes); it goes into the iPhone app's entitlements, so nothing else.
 */
export function validApplePayMerchantId(value: string): boolean {
  return /^merchant\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(value) && value.length <= 128;
}

/** The account to call the gateway with. */
export function accountOf(input: OwnPaymentInput): PaymentAccount {
  if (input.provider === "stripe") return { provider: "stripe", keys: { secretKey: input.secretKey, sandbox: input.sandbox } };
  if (input.provider === "paypal") return { provider: "paypal", keys: { clientId: input.clientId, secret: input.secret, sandbox: input.sandbox } };
  if (input.provider === "kashier") return { provider: "kashier", keys: { merchantId: input.merchantId, apiKey: input.apiKey, secretKey: input.secretKey, sandbox: input.sandbox } };
  if (input.provider === "fawaterk") return { provider: "fawaterk", keys: { apiKey: input.apiKey, sandbox: input.sandbox } };
  return { provider: "iyzico", keys: { apiKey: input.apiKey, secretKey: input.secretKey, sandbox: input.sandbox } };
}

/** 132 What is saved, as the payments page may show it: secrets masked ("sk_test_…abcd"), the publishable key whole (it isn't secret). */
export interface SavedKeysView {
  provider: PaymentProviderId;
  /** The secret key (PayPal: its secret), masked. */
  secretKey: string | null;
  /** The API key (iyzico, Kashier's Payment API key, Fawaterk), masked. */
  apiKey: string | null;
  publishableKey: string | null;
  webhookSecret: string | null;
  /** 188 Not a secret: shown whole. */
  applePayMerchantId: string | null;
}

export function savedKeysView(saved: OwnPaymentInput | null): SavedKeysView | null {
  if (!saved) return null;
  return {
    provider: saved.provider,
    secretKey: maskKey(saved.provider === "paypal" ? saved.secret : saved.provider === "fawaterk" ? null : saved.secretKey),
    apiKey: maskKey(saved.provider === "stripe" || saved.provider === "paypal" ? null : saved.apiKey),
    publishableKey: saved.provider === "stripe" ? (saved.publishableKey ?? null) : null,
    webhookSecret: maskKey(saved.provider === "stripe" ? saved.webhookSecret : null),
    applePayMerchantId: saved.provider === "stripe" ? (saved.applePayMerchantId ?? null) : null,
  };
}

/**
 * 132.36 Whether the app takes card payments into the owner's own account
 * from Yallapp (the kinds whose pages hold the gateway form, as
 * app/actions/catalog.ts lets them save it): a shop, courses, memberships,
 * tickets, a charity's donations, deliveries, food orders, rides, school fees.
 */
export function takesOwnCardPayments(app: { connector?: { kind: string } | null }): boolean {
  const kind = app.connector?.kind;
  return kind !== undefined && ["catalog", "courses", "bookings", "events", "campaigns", "deliveries", "restaurants", "rides", "school"].includes(kind);
}
