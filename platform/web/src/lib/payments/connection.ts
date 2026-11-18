import type { OwnPaymentInput } from "../catalog/settings";
import type { PaymentProviderId, PaymentWebhookReceipt } from "../data/types";
import { checkFawaterkKeys } from "./fawaterk";
import { checkIyzicoKeys } from "./iyzico";
import { checkKashierKeys, validKashierMerchantId } from "./kashier";
import { accountOf } from "./owner-keys";
import { checkPaypalKeys } from "./paypal";
import { PROVIDER_NAME, providerTakes, takenCurrencies, type PaymentAccount, type ProviderOptions } from "./provider";
import { centsToDecimal } from "../catalog/money";
import { listStripeWebhookEndpoints, probeStripeCheckout, readStripeAccount, scrubStripeText, StripeError, stripeMinimumCents, stripeTestPayment, type StripeProbe } from "./stripe";
import { STRIPE_WEBHOOK_EVENTS, stripeKeysProblem, validStripeWebhookSecret } from "./stripe-keys";
import { checkWalletDomain } from "./wallets";
import type { StripeWallets } from "../data/types";

/**
 * 132.34 "Test connection" on the owner's payments page: each gateway's
 * lightest call that proves the keys, made with the keys just typed or the
 * ones saved, and nothing that charges anyone:
 *
 * - Stripe: the keys' shape and mode (pk_ and sk_/rk_ of the same mode), the
 *   account (GET /v1/account), Checkout Sessions (GET /v1/checkout/sessions,
 *   which a restricted key needs), the webhook endpoint for this app
 *   (GET /v1/webhook_endpoints) and the signing secret's shape; with test
 *   keys only, and only when asked, a 0.50 USD PaymentIntent cancelled at
 *   once. 155 Given the payment page's domain, it's registered for Apple Pay
 *   and Google Pay in the account (lib/payments/wallets.ts), the one thing
 *   the test may add to it: once, and only what Stripe asks for its form.
 * - PayPal: an OAuth token (POST /v1/oauth2/token) from sandbox or live.
 * - Kashier: the merchant (GET /merchant) with the secret key.
 * - Fawaterk: its payment methods (GET /api/v2/getPaymentmethods).
 * - iyzico: a card prefix lookup (POST /payment/bin/check).
 *
 * Keys a gateway refuses are tried once in the other mode: a test key with
 * the switch off (or a live one with it on) says so in plain words. The
 * result is a list of checks, each a code the dashboard words in each
 * language (src/i18n/dashboard/gateways.ts) and the few values it names.
 * No key ever goes into it, nor any of the gateway's words that may hold one.
 */

export type CheckTone = "ok" | "warn" | "fail" | "info";

/** Every check's code; the dashboard words each one (src/i18n/dashboard/gateways.ts `check`). */
export const CHECK_CODES = [
  "keysAccepted",
  "keysRefused",
  "wrongModeTest",
  "wrongModeLive",
  "unreachable",
  "modeTest",
  "modeLive",
  "currencyOk",
  "currencyNo",
  "minimum",
  "merchantShape",
  "missingKeys",
  "stripeSecretShape",
  "stripePublishableMissing",
  "stripePublishableShape",
  "stripeModeMix",
  "stripeAccount",
  "stripeAccountHidden",
  "stripeChargesOff",
  "stripeCheckoutOk",
  "stripeCheckoutDenied",
  "webhookSecretMissing",
  "webhookSecretShape",
  "webhookSecretOk",
  "endpointOk",
  "endpointMissing",
  "endpointDisabled",
  "endpointEvents",
  "endpointUnknown",
  "webhookWorking",
  "webhookBadSignature",
  "webhookBadSecret",
  "webhookNoSecret",
  "webhookOtherMode",
  "webhookNone",
  "webhookAuto",
  "noWebhook",
  "testPaymentOk",
  "testPaymentFailed",
  "testPaymentSkipped",
  "stripeError",
  // 155 The payment page's domain for Apple Pay and Google Pay.
  "walletsReady",
  "walletsApplePending",
  "walletsGooglePending",
  "walletsInactive",
  "walletsForbidden",
  "walletsRefused",
  "walletsUnreachable",
  "walletsSaid",
] as const;

export type CheckCode = (typeof CHECK_CODES)[number];

export interface ConnectionCheck {
  tone: CheckTone;
  code: CheckCode;
  /** What the code names: a gateway, a currency, an address, a time (ISO, `at`). */
  values?: Record<string, string>;
}

export interface ConnectionReport {
  provider: PaymentProviderId;
  mode: "test" | "live";
  /** No check failed (some may warn). */
  ok: boolean;
  checks: ConnectionCheck[];
  /** When it was tested (ISO). */
  at: string;
  /** 155 Stripe: the payment page's domain for Apple Pay and Google Pay, as Stripe answered (kept when the keys tested are the saved ones; never shown as such). */
  wallets?: StripeWallets;
}

/** What the test action hands back to the form. */
export interface PaymentTestState {
  ok?: boolean;
  message?: string;
  report?: ConnectionReport;
}

export interface ConnectionInput {
  /** The keys to test: as typed, empty fields standing for the saved ones (lib/payments/owner-keys.ts). */
  input: OwnPaymentInput;
  /** What the app sells in. */
  currency: string;
  /** Stripe: this app's webhook endpoint (lib/payments/stripe-keys.ts stripeWebhookUrl). */
  stripeWebhookUrl: string;
  /** The last webhook the gateway sent for the saved account (only when the keys tested are the saved gateway's). */
  receipt: PaymentWebhookReceipt | null;
  /** Stripe, test keys: also make a 0.50 USD test payment and cancel it. */
  testPayment: boolean;
  /** 155 Stripe: the payment page's domain, registered for Apple Pay and Google Pay with the keys tested; missing: not asked. */
  walletDomain?: string | null;
  now: Date;
}

const check = (tone: CheckTone, code: CheckCode, values?: Record<string, string>): ConnectionCheck => (values ? { tone, code, values } : { tone, code });

function flipped(account: PaymentAccount): PaymentAccount {
  return { ...account, keys: { ...account.keys, sandbox: !account.keys.sandbox } } as PaymentAccount;
}

/** Whether the gateway accepts these keys (true/false), or couldn't be asked (null). */
function accepts(account: PaymentAccount, options: ProviderOptions): Promise<boolean | null> {
  const base = (provider: PaymentProviderId) => ({ fetcher: options.fetcher, baseUrl: options.urls?.[provider] });
  if (account.provider === "kashier") return checkKashierKeys(account.keys, base("kashier"));
  if (account.provider === "fawaterk") return checkFawaterkKeys(account.keys, base("fawaterk"));
  if (account.provider === "paypal") return checkPaypalKeys(account.keys, base("paypal"));
  if (account.provider === "iyzico") return checkIyzicoKeys(account.keys, base("iyzico"));
  throw new Error("Stripe is tested by testStripe.");
}

function currencyChecks(provider: PaymentProviderId, currency: string): ConnectionCheck[] {
  const name = PROVIDER_NAME[provider];
  if (!providerTakes(provider, currency)) return [check("fail", "currencyNo", { provider: name, currency, list: takenCurrencies(provider).join(", ") })];
  const out = [check("ok", "currencyOk", { provider: name, currency })];
  if (provider === "stripe") {
    const least = stripeMinimumCents(currency);
    if (least !== null) out.push(check("info", "minimum", { amount: `${centsToDecimal(least, currency)} ${currency}` }));
  }
  return out;
}

/** What the last webhook says, for the gateways that send one here. */
function receiptChecks(provider: PaymentProviderId, receipt: PaymentWebhookReceipt | null, sandbox: boolean): ConnectionCheck[] {
  const name = PROVIDER_NAME[provider];
  if (receipt?.failedAt && (!receipt.at || receipt.failedAt >= receipt.at)) {
    if (receipt.failure === "no_secret") return [check("fail", "webhookNoSecret", { at: receipt.failedAt })];
    return [provider === "stripe" ? check("fail", "webhookBadSecret", { at: receipt.failedAt }) : check("fail", "webhookBadSignature", { provider: name, at: receipt.failedAt })];
  }
  if (receipt?.at) {
    if (provider === "stripe" && receipt.livemode != null && receipt.livemode === sandbox) return [check("warn", "webhookOtherMode", { at: receipt.at })];
    return [check("ok", "webhookWorking", { at: receipt.at })];
  }
  return [check("info", "webhookNone")];
}

/** Runs the test. Never throws for a gateway's answer: an unreachable gateway is a check of its own. */
export async function testConnection(test: ConnectionInput, options: ProviderOptions = {}): Promise<ConnectionReport> {
  const account = accountOf(test.input);
  const found: { wallets?: StripeWallets } = {};
  const checks = account.provider === "stripe" ? await testStripe(test, account, options, found) : await testOther(test, account, options);
  return { provider: account.provider, mode: account.keys.sandbox ? "test" : "live", ok: !checks.some((c) => c.tone === "fail"), checks, at: test.now.toISOString(), ...found };
}

/** 155 What a domain's registration for Apple Pay and Google Pay says, as checks (none fails the test: cards work without them). */
export function walletChecks(wallets: StripeWallets): ConnectionCheck[] {
  const domain = { domain: wallets.domain };
  const said = wallets.details ? [check("info", "walletsSaid", { details: wallets.details })] : [];
  if (wallets.status === "ready") return [check("ok", "walletsReady", domain)];
  if (wallets.status === "partial") return [check("warn", wallets.applePay ? "walletsGooglePending" : "walletsApplePending", domain), ...said];
  const code: CheckCode =
    wallets.reason === "forbidden" ? "walletsForbidden" : wallets.reason === "unreachable" ? "walletsUnreachable" : wallets.reason === "inactive" ? "walletsInactive" : "walletsRefused";
  return [check("warn", code, domain), ...said];
}

async function testOther(test: ConnectionInput, account: Exclude<PaymentAccount, { provider: "stripe" }>, options: ProviderOptions): Promise<ConnectionCheck[]> {
  const name = PROVIDER_NAME[account.provider];
  const out: ConnectionCheck[] = [];
  if (account.provider === "kashier" && !validKashierMerchantId(account.keys.merchantId)) out.push(check("fail", "merchantShape"));
  const accepted = await accepts(account, options).catch(() => null);
  if (accepted === true) out.push(check("ok", "keysAccepted", { provider: name }));
  else if (accepted === null) out.push(check("warn", "unreachable", { provider: name }));
  else {
    // Refused: are they the other mode's keys?
    const other = await accepts(flipped(account), options).catch(() => null);
    out.push(other === true ? check("fail", account.keys.sandbox ? "wrongModeLive" : "wrongModeTest", { provider: name }) : check("fail", "keysRefused", { provider: name }));
  }
  out.push(check("info", account.keys.sandbox ? "modeTest" : "modeLive"));
  out.push(...currencyChecks(account.provider, test.currency));
  if (account.provider === "kashier" || account.provider === "fawaterk") {
    out.push(check("info", "webhookAuto", { provider: name }));
    out.push(...receiptChecks(account.provider, test.receipt, account.keys.sandbox));
  } else out.push(check("info", "noWebhook", { provider: name }));
  return out;
}

async function testStripe(test: ConnectionInput, account: Extract<PaymentAccount, { provider: "stripe" }>, options: ProviderOptions, found: { wallets?: StripeWallets }): Promise<ConnectionCheck[]> {
  const input = test.input.provider === "stripe" ? test.input : null;
  const stripe = { fetcher: options.fetcher, baseUrl: options.urls?.stripe };
  const out: ConnectionCheck[] = [];
  const problem = stripeKeysProblem(account.keys.secretKey, input?.publishableKey ?? null);
  if (problem === "secret_shape") return [check("fail", "stripeSecretShape")];
  if (problem === "publishable_missing") out.push(check("warn", "stripePublishableMissing"));
  if (problem === "publishable_shape") out.push(check("fail", "stripePublishableShape"));
  if (problem === "mode_mix") out.push(check("fail", "stripeModeMix"));
  const unreachable = [check("warn", "unreachable", { provider: "Stripe" })];
  const asked = async <T>(probe: () => Promise<StripeProbe<T>>): Promise<StripeProbe<T> | null> => {
    try {
      return await probe();
    } catch (e) {
      if (e instanceof StripeError) return null;
      throw e;
    }
  };

  const accountInfo = await asked(() => readStripeAccount(account.keys, stripe));
  if (!accountInfo) return [...out, ...unreachable, check("info", account.keys.sandbox ? "modeTest" : "modeLive")];
  if (accountInfo.kind === "refused") return [...out, check("fail", "keysRefused", { provider: "Stripe" }), check("info", account.keys.sandbox ? "modeTest" : "modeLive")];
  if (accountInfo.kind === "ok") {
    const a = accountInfo.value;
    out.push(check("ok", "stripeAccount", { name: [a.name ?? a.id ?? "Stripe", a.country].filter(Boolean).join(" · ") }));
    if (!account.keys.sandbox && a.chargesEnabled === false) out.push(check("warn", "stripeChargesOff"));
  } else if (accountInfo.kind === "forbidden") out.push(check("info", "stripeAccountHidden"));
  else out.push(check("warn", "stripeError", { details: scrubStripeText(accountInfo.message).slice(0, 200) }));

  const checkout = await asked(() => probeStripeCheckout(account.keys, stripe));
  if (checkout?.kind === "ok") out.push(check("ok", "stripeCheckoutOk"));
  else if (checkout?.kind === "forbidden") out.push(check("fail", "stripeCheckoutDenied"));
  else if (checkout?.kind === "refused") out.push(check("fail", "keysRefused", { provider: "Stripe" }));
  else if (checkout) out.push(check("warn", "stripeError", { details: scrubStripeText(checkout.message).slice(0, 200) }));
  else out.push(...unreachable);

  out.push(check("info", account.keys.sandbox ? "modeTest" : "modeLive"));
  out.push(...currencyChecks("stripe", test.currency));

  // The webhook: its signing secret, the endpoint in Stripe, and what last arrived.
  const secret = input?.webhookSecret ?? null;
  if (!secret) out.push(check("warn", "webhookSecretMissing"));
  else if (!validStripeWebhookSecret(secret)) out.push(check("fail", "webhookSecretShape"));
  else out.push(check("ok", "webhookSecretOk"));
  const endpoints = await asked(() => listStripeWebhookEndpoints(account.keys, stripe));
  if (endpoints?.kind === "ok") {
    const ours = endpoints.value.find((e) => e.url === test.stripeWebhookUrl);
    if (!ours) out.push(check("warn", "endpointMissing", { url: test.stripeWebhookUrl }));
    else if (ours.status && ours.status !== "enabled") out.push(check("warn", "endpointDisabled", { url: test.stripeWebhookUrl }));
    else {
      const missing = ours.events.includes("*") ? [] : STRIPE_WEBHOOK_EVENTS.filter((e) => !ours.events.includes(e));
      out.push(missing.length ? check("warn", "endpointEvents", { events: missing.join(", ") }) : check("ok", "endpointOk"));
    }
  } else out.push(check("info", "endpointUnknown"));
  out.push(...receiptChecks("stripe", test.receipt, account.keys.sandbox));

  // 155 Apple Pay and Google Pay: the payment page's domain registered in this account (once; checked again when it isn't ready).
  if (test.walletDomain) {
    const wallets = await checkWalletDomain(account.keys, test.walletDomain, { ...stripe, now: test.now });
    found.wallets = wallets;
    out.push(...walletChecks(wallets));
  }

  // The optional test payment: test keys only, made and cancelled at once.
  if (test.testPayment) {
    if (!account.keys.sandbox) out.push(check("info", "testPaymentSkipped"));
    else {
      const paid = await asked(() => stripeTestPayment(account.keys, { key: `yallapp-test-${test.now.getTime().toString(36)}` }, stripe));
      if (paid?.kind === "ok") out.push(check("ok", "testPaymentOk", { id: paid.value.id }));
      else if (paid) out.push(check("warn", "testPaymentFailed", { details: scrubStripeText(paid.message).slice(0, 200) }));
      else out.push(...unreachable);
    }
  }
  return out;
}

/** 132.34 What "Test connection" says when there's nothing to test. */
export function missingKeysReport(provider: PaymentProviderId, now: Date, sandbox: boolean): ConnectionReport {
  return { provider, mode: sandbox ? "test" : "live", ok: false, checks: [check("fail", "missingKeys", { provider: PROVIDER_NAME[provider] })], at: now.toISOString() };
}
