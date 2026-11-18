import { catalogSettings, isOwnPayment } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App, OwnPayment, OwnStripePayment, StripeWallets } from "../data/types";
import { noteAppError } from "../watch/app-errors";
import { registerStripeWalletDomain, StripeError, type StripeKeys } from "./stripe";

/**
 * 155 Apple Pay and Google Pay in Stripe's card form (Embedded Checkout, 144).
 *
 * Stripe shows them in its form only on a domain registered in the account
 * that takes the payment (docs.stripe.com/payments/payment-methods/pmd-registration),
 * in test and live mode apart, and each shop pays into its own Stripe
 * account with its own keys: so the payment page's domain (appUrl(), e.g.
 * yallapp.com.tr) is registered in each shop's account with the shop's own
 * secret key, when its keys are saved or tested and once before an embedded
 * session if it isn't yet. What Stripe answered is kept on the shop's
 * payment settings (`wallets`), so it isn't asked at every payment; a
 * domain not ready is asked again after WALLET_RETRY_MS. Nothing here ever
 * stops a card payment: on any failure the card form is as before, and the
 * team sees the error (noteAppError, source "payment").
 */

/** How long a domain that isn't ready waits before a payment asks Stripe again (saving or testing the keys always asks). */
export const WALLET_RETRY_MS = 6 * 60 * 60_000;

/** 155 Each request's limit before an embedded session: the payment never waits long for it. */
export const WALLET_TIMEOUT_MS = 5_000;

export type WalletReason = NonNullable<StripeWallets["reason"]>;

/**
 * The domain registered for the payment page: its host, lower case. Stripe
 * registers public domains only, so a local address (localhost, an IP, a
 * name without a dot) is none, unless the tests' fake Stripe answers.
 */
export function walletDomain(pageUrl: string, fakeStripe = false): string | null {
  let host: string;
  try {
    host = new URL(pageUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host) return null;
  if (fakeStripe) return host;
  const local = host === "localhost" || host.endsWith(".localhost") || !host.includes(".") || /^[\d.]+$/.test(host) || host.startsWith("[");
  return local ? null : host;
}

const modeOf = (keys: StripeKeys): StripeWallets["mode"] => (keys.sandbox ? "test" : "live");

/** Asks Stripe (registers the domain, or reads and checks it again). Never throws: Stripe out of reach is a reason of its own. */
export async function checkWalletDomain(keys: StripeKeys, domain: string, options: { fetcher?: typeof fetch; baseUrl?: string | null; timeoutMs?: number; now: Date }): Promise<StripeWallets> {
  const base = { domain, mode: modeOf(keys), at: options.now.toISOString() };
  const failed = (reason: WalletReason, details: string | null = null): StripeWallets => ({ ...base, status: "failed", id: null, applePay: false, googlePay: false, reason, details });
  let probe;
  try {
    probe = await registerStripeWalletDomain(keys, domain, { fetcher: options.fetcher, baseUrl: options.baseUrl, timeoutMs: options.timeoutMs, now: options.now });
  } catch (e) {
    if (e instanceof StripeError) return failed("unreachable");
    return failed("refused", e instanceof Error ? e.message.slice(0, 300) : null);
  }
  if (probe.kind === "refused") return failed("keysRefused");
  if (probe.kind === "forbidden") return failed("forbidden", probe.message.slice(0, 300));
  if (probe.kind === "error") return failed(probe.status >= 500 ? "unreachable" : "refused", probe.message.slice(0, 300));
  const found = probe.value;
  const applePay = found.enabled && found.applePay.active;
  const googlePay = found.enabled && found.googlePay.active;
  const status = applePay && googlePay ? "ready" : applePay || googlePay ? "partial" : "failed";
  const details = status === "ready" ? null : [!applePay ? found.applePay.message : null, !googlePay ? found.googlePay.message : null].filter(Boolean).join(" ").slice(0, 300) || null;
  return { ...base, status, id: found.id, applePay, googlePay, reason: status === "ready" ? null : "inactive", details };
}

/** What's kept for this account's domain in the keys' mode; null when it was never asked (or was for another domain or mode). */
export function walletsFor(payment: OwnPayment | null | undefined, domain: string | null): StripeWallets | null {
  if (!payment || payment.provider !== "stripe" || !domain) return null;
  const kept = payment.wallets;
  return kept && kept.domain === domain && kept.mode === (payment.sandbox ? "test" : "live") ? kept : null;
}

/** Whether a payment should ask Stripe now: never asked for this domain and mode, or not ready and asked over WALLET_RETRY_MS ago. */
export function walletsDue(payment: OwnStripePayment, domain: string, now: Date): boolean {
  const kept = walletsFor(payment, domain);
  if (!kept) return true;
  if (kept.status === "ready") return false;
  const at = Date.parse(kept.at);
  return !Number.isFinite(at) || now.getTime() - at >= WALLET_RETRY_MS || now.getTime() < at;
}

/**
 * Keeps what Stripe answered on the app's Stripe account. The app is read
 * again just before, and only `wallets` changes, and only while the same
 * secret key is saved (keys saved meanwhile are asked for themselves).
 */
export async function rememberWallets(store: Pick<DataStore, "getAppById" | "updateApp">, appId: string, secretKeyEncrypted: string, wallets: StripeWallets, now: Date): Promise<void> {
  const app = await store.getAppById(appId);
  const settings = app ? catalogSettings(app) : null;
  const payment = settings?.payment;
  if (!app || !settings || !isOwnPayment(payment) || payment.provider !== "stripe" || payment.secretKeyEncrypted !== secretKeyEncrypted) return;
  await store.updateApp(app.id, { catalogSettings: { ...settings, payment: { ...payment, wallets } } }, now);
}

/** Counts a domain that isn't ready for the team (Admin › Clients' errors), with Stripe's words; never a key. */
export async function noteWalletProblem(store: DataStore, app: Pick<App, "id" | "clientId">, wallets: StripeWallets, now: Date): Promise<void> {
  if (wallets.status === "ready") return;
  const missing = [!wallets.applePay ? "Apple Pay" : null, !wallets.googlePay ? "Google Pay" : null].filter(Boolean).join(" and ");
  await noteAppError(
    store,
    {
      clientId: app.clientId,
      appId: app.id,
      source: "payment",
      code: `stripe_wallets_${wallets.reason ?? "failed"}`,
      detail: `${missing} not available on ${wallets.domain} (${wallets.mode} mode): ${wallets.reason ?? "failed"}${wallets.details ? `. Stripe said: ${wallets.details}` : "."}`,
    },
    now,
  );
}

/**
 * Before an embedded session: registers the domain when it's due, keeps the
 * answer and notes a problem. Never throws, so the payment goes on whatever
 * happens; null when nothing was asked.
 */
export async function ensureWalletDomain(deps: {
  store: DataStore;
  app: App;
  keys: StripeKeys;
  domain: string | null;
  fetcher?: typeof fetch;
  baseUrl?: string | null;
  now: Date;
}): Promise<StripeWallets | null> {
  try {
    const payment = catalogSettings(deps.app).payment;
    if (!deps.domain || !isOwnPayment(payment) || payment.provider !== "stripe" || !walletsDue(payment, deps.domain, deps.now)) return null;
    const wallets = await checkWalletDomain(deps.keys, deps.domain, { fetcher: deps.fetcher, baseUrl: deps.baseUrl, timeoutMs: WALLET_TIMEOUT_MS, now: deps.now });
    await rememberWallets(deps.store, deps.app.id, payment.secretKeyEncrypted, wallets, deps.now);
    await noteWalletProblem(deps.store, deps.app, wallets, deps.now);
    return wallets;
  } catch {
    return null;
  }
}

/** 155 The Payments page's line: ready, or not yet and why (src/i18n/dashboard/gateways.ts `wallets`). */
export type WalletLine =
  | { tone: "success"; code: "ready"; values: { domain: string } }
  | { tone: "warn" | "neutral"; code: "partialApple" | "partialGoogle" | "unreachable" | "keysRefused" | "forbidden" | "refused" | "inactive" | "notYet"; values: { domain: string; details: string } };

export function walletLine(payment: OwnPayment | null | undefined, domain: string | null): WalletLine | null {
  if (!payment || payment.provider !== "stripe" || !domain) return null;
  const kept = walletsFor(payment, domain);
  if (!kept) return { tone: "neutral", code: "notYet", values: { domain, details: "" } };
  if (kept.status === "ready") return { tone: "success", code: "ready", values: { domain } };
  const details = kept.details ?? "";
  if (kept.status === "partial") return { tone: "warn", code: kept.applePay ? "partialGoogle" : "partialApple", values: { domain, details } };
  return { tone: "warn", code: kept.reason ?? "inactive", values: { domain, details } };
}
