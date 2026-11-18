import { sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import { HoldEndedError } from "../events/holds";
import { checkoutAccount, payLinkExpired } from "../catalog/settings";
import { startSheetPayment } from "../catalog/sheet-payment";
import { noteAppError } from "../watch/app-errors";
import { PAY_TOKEN } from "./app-return";
import { PaymentError } from "./errors";
import type { ProviderUrls } from "./provider";
import { StripeError } from "./stripe";

/**
 * 188 What `POST /pay/<token>/sheet` answers the app: the PaymentIntent its
 * Stripe PaymentSheet pays (lib/catalog/sheet-payment.ts), asked with the
 * payment's own token, which the app already holds. `state`:
 * - "ready": the sheet's keys (the publishable key, the PaymentIntent's
 *   client secret) and what it shows (the account's country, the currency,
 *   the amount, the shop's name, test mode);
 * - "paid": paid already, the order settled; the app reads the status;
 * - "unavailable": the page's own Stripe form takes this payment (another
 *   gateway, no publishable key, the buyer's details not given yet);
 * - "closed" / "expired" / "not_found": nothing to pay;
 * - "failed": Stripe couldn't start it (`too_small` under its least amount).
 * Never the secret key; the client secret is only ever sent here.
 */
export type SheetAnswerBody =
  | {
      state: "ready";
      publishable_key: string;
      client_secret: string;
      merchant_country: string | null;
      currency: string;
      amount_cents: number;
      merchant_name: string;
      test_mode: boolean;
    }
  | { state: "paid" | "closed" | "expired" | "not_found" | "unavailable"; reason?: string }
  | { state: "failed"; too_small?: boolean };

export interface SheetRequestDeps {
  store: DataStore;
  encryptionKey: Buffer;
  urls?: ProviderUrls;
  fetcher?: typeof fetch;
  now: Date;
  /** Settles the order by reading its payment back (lib/payments/settle.ts settleOrderPayment; tests: a stand-in). */
  settle: (token: string) => Promise<unknown>;
}

export async function answerSheetRequest(deps: SheetRequestDeps, token: string): Promise<{ status: number; body: SheetAnswerBody }> {
  if (!PAY_TOKEN.test(token)) return { status: 404, body: { state: "not_found" } };
  const { store, now } = deps;
  const order = await store.getCatalogOrderByToken(sha256Hex(token));
  const app = order ? await store.getAppById(order.appId) : null;
  if (!order || !app) return { status: 404, body: { state: "not_found" } };
  if (order.status === "processing" || order.status === "completed") return { status: 200, body: { state: "paid" } };
  if (order.status !== "pending" || order.manualPayment) return { status: 409, body: { state: "closed" } };
  if (payLinkExpired(order, now)) return { status: 409, body: { state: "expired" } };
  const account = await checkoutAccount(store, app, deps.encryptionKey);
  if (!account || account.marketplace) return { status: 200, body: { state: "unavailable", reason: "not_stripe" } };
  try {
    const started = await startSheetPayment({ store, app, account, order, now, fetcher: deps.fetcher, urls: deps.urls });
    if (started.kind === "paid") {
      await deps.settle(token);
      return { status: 200, body: { state: "paid" } };
    }
    if (started.kind === "unavailable") return { status: 200, body: { state: "unavailable", reason: started.reason } };
    return {
      status: 200,
      body: {
        state: "ready",
        publishable_key: started.publishableKey,
        client_secret: started.clientSecret,
        merchant_country: started.merchantCountry,
        currency: started.currency,
        amount_cents: started.amountCents,
        merchant_name: started.merchantName,
        test_mode: started.testMode,
      },
    };
  } catch (e) {
    if (e instanceof HoldEndedError) return { status: 409, body: { state: "closed", reason: "places_released" } };
    if (!(e instanceof PaymentError)) throw e;
    // 78.4 Counted for the team, as the page's own start is.
    await noteAppError(store, { clientId: app.clientId, appId: app.id, source: "payment", code: "stripe_sheet_start_failed", detail: e.message }, now);
    return { status: 502, body: { state: "failed", ...(e instanceof StripeError && e.tooSmall ? { too_small: true } : {}) } };
  }
}
