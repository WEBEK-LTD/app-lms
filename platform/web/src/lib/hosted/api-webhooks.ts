import { randomUUID } from "node:crypto";
import { isPrivateAddress, resolveHost } from "../app/api-check";
import { pinnedFetch } from "../net/safe-fetch";
import type { DataStore } from "../data/store";
import type { ApiWebhook, ApiWebhookData, ApiWebhookEvent, App } from "../data/types";
import { ensureAuthKey, signSecurityEvent, tokenIssuer } from "./app-auth";
import { yallappSignsIn } from "./sign-in-methods";
import { noteAppError } from "../watch/app-errors";

/**
 * 49 Account deletion reaches the client's API (roadmap 34.8). For an app on
 * its own API that Yallapp signs people in to, when a person deletes their
 * account Yallapp deletes it at once and sends the client's API a signed
 * notice, `POST <API address>/webhooks/yallapp` (docs/api/openapi.yaml,
 * webhook `accountDeleted`):
 *
 * - the body is a Security Event Token (RFC 8417), `Content-Type:
 *   application/secevent+jwt`: a JWT signed with the app's own ES256 key, the
 *   one that signs its access tokens (`typ` `secevent+jwt`), with `iss`,
 *   `aud` `<app ID>:events` (never the access tokens' audience, so a notice
 *   can't pass as an access token), `sub` (the person), `jti` (the same on
 *   every try), `iat`, `exp` (5 minutes, signed again for each try) and
 *   `events: { "account.deleted": {} }`;
 * - a 2xx answer delivers it; 3xx and other 4xx answers (404: the API
 *   doesn't take notices) fail it at once; 408, 425, 429, 5xx, no answer
 *   within the time and an unreachable API are tried again after 1, 5 and 30
 *   minutes, 2, 6, 12 and 24 hours (8 tries, about two days); never to a
 *   private network address, never following a redirect;
 * - the first try happens with the deletion; the others in the webhook job
 *   (`POST /api/internal/webhooks`, every 5 minutes); every notice and its
 *   last try are listed on App sign-in › For your developer, and deleted
 *   after 30 days.
 *
 * The app still calls the client's `DELETE /me` first, when the API answers
 * it; it goes on to Yallapp whatever that call answers.
 *
 * 100.7 The same notices tell the client's API of store purchases
 * (`purchase.completed`, `purchase.revoked`, queued by
 * lib/store-billing/delivery.ts with the purchase change's grant ID as
 * `jti`), listed on In-app purchases. One whose purchase changed again
 * before it was delivered is dropped, never sent late.
 */

export const WEBHOOK_PATH = "/webhooks/yallapp";
/** Minutes before the next try, after each failed one; one more try than there are delays. */
export const RETRY_MINUTES = [1, 5, 30, 120, 360, 720, 1440] as const;
export const MAX_ATTEMPTS = RETRY_MINUTES.length + 1;
export const KEEP_DAYS = 30;
/** How long a try waits for the API: with the deletion, and in the job. */
export const FIRST_TRY_TIMEOUT_MS = 5_000;
export const RETRY_TIMEOUT_MS = 10_000;
/** How long a try holds a notice, so two job runs never send it at once. */
const CLAIM_MS = 2 * 60_000;
const MINUTE = 60_000;

export interface WebhookDeps {
  store: DataStore;
  encryptionKey: Buffer;
  /** Yallapp's address: the notices' issuer. */
  platformUrl: string;
  now: () => Date;
  fetcher?: typeof fetch;
  /** Host name to addresses; tests pass their own. */
  resolve?: (host: string) => Promise<string[]>;
}

/** Where an app's notices go. */
export function webhookUrl(apiBaseUrl: string): string {
  return `${apiBaseUrl.trim().replace(/\/+$/, "")}${WEBHOOK_PATH}`;
}

/** The audience of an app's notices: never its access tokens' (the app ID). */
export function eventAudience(appId: string): string {
  return `${appId}:events`;
}

/** Whether an app gets notices: on its own API, with Yallapp signing people in. */
export function sendsApiWebhooks(app: Pick<App, "backend" | "apiBaseUrl" | "hostedSettings" | "demo">): boolean {
  return app.backend === "custom_api" && Boolean(app.apiBaseUrl) && yallappSignsIn(app) && !app.demo;
}

/** Queues `account.deleted` for a person, due now. Null for apps that don't get notices. */
export async function queueAccountDeleted(deps: WebhookDeps, app: App, subject: string): Promise<ApiWebhook | null> {
  if (!sendsApiWebhooks(app)) return null;
  const webhook: ApiWebhook = {
    id: randomUUID(),
    appId: app.id,
    event: "account.deleted",
    subject: subject.slice(0, 64),
    status: "pending",
    attempts: 0,
    nextAttemptAt: deps.now(),
    lastAttemptAt: null,
    lastStatus: null,
    lastError: null,
    createdAt: deps.now(),
    deliveredAt: null,
  };
  await deps.store.createApiWebhook(webhook);
  return webhook;
}

/**
 * 100.7 Queues a store purchase's notice (`purchase.completed` or
 * `purchase.revoked`, openapi.yaml webhook `storePurchase`), due now, under
 * the ID that is the same for every try of this change of the purchase. A
 * notice queued already under it (two sends at once) is returned instead.
 * Null for apps that don't get notices.
 */
export async function queuePurchaseNotice(
  deps: Pick<WebhookDeps, "store" | "now">,
  app: App,
  input: { id: string; event: Extract<ApiWebhookEvent, "purchase.completed" | "purchase.revoked">; subject: string; data: ApiWebhookData },
): Promise<ApiWebhook | null> {
  if (!sendsApiWebhooks(app)) return null;
  const now = deps.now();
  const webhook: ApiWebhook = {
    id: input.id,
    appId: app.id,
    event: input.event,
    subject: input.subject.slice(0, 64),
    status: "pending",
    attempts: 0,
    nextAttemptAt: now,
    lastAttemptAt: null,
    lastStatus: null,
    lastError: null,
    createdAt: now,
    deliveredAt: null,
    data: input.data,
  };
  try {
    await deps.store.createApiWebhook(webhook);
  } catch (error) {
    const found = await deps.store.getApiWebhook(input.id);
    if (found) return found;
    throw error;
  }
  return webhook;
}

/** 100.7 A purchase notice whose purchase changed again (or is gone) since it was queued: never sent late. */
export const REPLACED = "A newer change of this purchase replaced it.";
async function replaced(store: DataStore, webhook: ApiWebhook): Promise<boolean> {
  const change = webhook.data?.purchase;
  if (!change) return false;
  const purchase = await store.getStorePurchase(webhook.appId, change.platform, change.storeKey);
  return !purchase || purchase.id !== change.id || purchase.status !== change.status || (purchase.expiresAt?.toISOString() ?? null) !== change.expiresAt;
}

/** What a try's answer means: delivered, worth another try, or failed for good. */
export function outcomeOf(status: number | null): "delivered" | "retry" | "failed" {
  if (status === null) return "retry";
  if (status >= 200 && status < 300) return "delivered";
  if (status === 408 || status === 425 || status === 429 || status >= 500) return "retry";
  return "failed";
}

/** The plain words for a failed try, shown to the owner and their developer. */
export function errorText(status: number | null, reason: "timeout" | "unreachable" | "private" | null): string {
  if (reason === "private") return "Your API's address points to a private network.";
  if (reason === "timeout") return "Your API didn't answer in time.";
  if (reason === "unreachable" || status === null) return "Your API couldn't be reached.";
  if (status === 404 || status === 405) return `Your API doesn't take these notices yet (HTTP ${status}).`;
  if (status >= 300 && status < 400) return `Your API answered with a redirect (HTTP ${status}); notices aren't sent on.`;
  return `Your API answered HTTP ${status}.`;
}

/** The signed notice for one try. */
export async function signedNotice(deps: WebhookDeps, webhook: ApiWebhook, now: Date): Promise<string> {
  const key = await ensureAuthKey(deps.store, webhook.appId, deps.encryptionKey, now);
  const iat = Math.floor(now.getTime() / 1000);
  return signSecurityEvent(key, deps.encryptionKey, {
    iss: tokenIssuer(deps.platformUrl),
    aud: eventAudience(webhook.appId),
    sub: webhook.subject,
    jti: webhook.id,
    iat,
    exp: iat + 300,
    // 100.7 A purchase notice carries its claim (product, kind, item, platform...).
    events: { [webhook.event]: webhook.data?.event ?? {} },
  });
}

/**
 * One try of a due notice: takes it (so no other run sends it at once), signs
 * it, posts it, and records the answer. Returns the notice as saved, or null
 * when it wasn't due (another run has it, or it's done).
 */
export async function attemptWebhook(deps: WebhookDeps, webhook: ApiWebhook, timeoutMs: number): Promise<ApiWebhook | null> {
  const now = deps.now();
  if (!(await deps.store.claimApiWebhook(webhook.id, new Date(now.getTime() + CLAIM_MS), now))) return null;
  const attempts = webhook.attempts + 1;
  const app = await deps.store.getAppById(webhook.appId);
  let status: number | null = null;
  let reason: "timeout" | "unreachable" | "private" | null = null;
  let finalError: string | null = null;
  if (!app || !sendsApiWebhooks(app)) {
    finalError = "The app no longer has its own API with Yallapp signing people in.";
  } else if (await replaced(deps.store, webhook)) {
    finalError = REPLACED;
  } else {
    const url = webhookUrl(app.apiBaseUrl!);
    try {
      const host = new URL(url).hostname;
      const addresses = await (deps.resolve ?? resolveHost)(host);
      if (addresses.length === 0 || addresses.some(isPrivateAddress)) reason = "private";
    } catch {
      reason = "unreachable";
    }
    if (reason === null) {
      try {
        // 70 Connects only to an address checked like the one above (lib/net/safe-fetch.ts).
        const response = await pinnedFetch(deps.fetcher, deps.resolve)(url, {
          method: "POST",
          headers: {
            "content-type": "application/secevent+jwt",
            accept: "application/json",
            "user-agent": "Yallapp-Webhooks/1.0",
            "yallapp-event": webhook.event,
            "yallapp-delivery": webhook.id,
          },
          body: await signedNotice(deps, webhook, now),
          redirect: "manual",
          signal: AbortSignal.timeout(timeoutMs),
        });
        status = response.status;
        await response.body?.cancel().catch(() => undefined);
      } catch (e) {
        reason = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError") ? "timeout" : "unreachable";
      }
    }
  }
  const outcome = finalError ? "failed" : reason === "private" ? "failed" : outcomeOf(status);
  const done = deps.now();
  const patch =
    outcome === "delivered"
      ? { status: "delivered" as const, deliveredAt: done, nextAttemptAt: null, lastError: null }
      : outcome === "retry" && attempts < MAX_ATTEMPTS
        ? { status: "pending" as const, nextAttemptAt: new Date(done.getTime() + RETRY_MINUTES[attempts - 1]! * MINUTE), lastError: errorText(status, reason) }
        : { status: "failed" as const, nextAttemptAt: null, lastError: finalError ?? errorText(status, reason) };
  await deps.store.updateApiWebhook(webhook.id, { ...patch, attempts, lastAttemptAt: done, lastStatus: status });
  // 78.4 A try that didn't reach the app's API: counted for the team (100.7 not a replaced purchase notice).
  if (outcome !== "delivered" && app && finalError !== REPLACED) {
    await noteAppError(deps.store, { clientId: app.clientId, appId: app.id, source: "webhook", code: patch.status === "failed" ? "delivery_failed" : "delivery_retry", detail: `${webhook.event}: ${patch.lastError ?? "not delivered"}` }, done);
  }
  return { ...webhook, ...patch, attempts, lastAttemptAt: done, lastStatus: status };
}

/** The webhook job: tries the due notices (at most `limit`), then deletes notices older than 30 days. */
export async function runApiWebhooks(deps: WebhookDeps, limit = 50): Promise<{ tried: number; delivered: number; failed: number; purged: number }> {
  const due = await deps.store.listDueApiWebhooks(deps.now(), limit);
  let tried = 0;
  let delivered = 0;
  let failed = 0;
  for (const webhook of due) {
    const saved = await attemptWebhook(deps, webhook, RETRY_TIMEOUT_MS);
    if (!saved) continue;
    tried++;
    if (saved.status === "delivered") delivered++;
    if (saved.status === "failed") failed++;
  }
  const purged = await deps.store.purgeApiWebhooks(new Date(deps.now().getTime() - KEEP_DAYS * 24 * 60 * MINUTE));
  return { tried, delivered, failed, purged };
}

/** With the deletion: queues the notice and makes its first try; a failed try is left to the job. */
export async function sendAccountDeleted(deps: WebhookDeps, app: App, subject: string): Promise<ApiWebhook | null> {
  const webhook = await queueAccountDeleted(deps, app, subject);
  if (!webhook) return null;
  try {
    return (await attemptWebhook(deps, webhook, FIRST_TRY_TIMEOUT_MS)) ?? webhook;
  } catch (e) {
    console.error(`[webhooks] app ${app.id}: the first try failed: ${e instanceof Error ? e.message : "unknown error"}`);
    return webhook;
  }
}

/**
 * 80.3 "Send again" on App sign-in › For your developer: a failed notice
 * starts over (its 8 tries and their waits), with a first try now. Null when
 * it isn't one of the app's failed notices.
 */
export async function resendWebhook(deps: WebhookDeps, appId: string, id: string): Promise<ApiWebhook | null> {
  const webhook = await deps.store.getApiWebhook(id);
  if (!webhook || webhook.appId !== appId || webhook.status !== "failed") return null;
  const now = deps.now();
  const restarted: ApiWebhook = { ...webhook, status: "pending", attempts: 0, nextAttemptAt: now, lastError: null };
  await deps.store.updateApiWebhook(id, { status: "pending", attempts: 0, nextAttemptAt: now, lastError: null });
  try {
    return (await attemptWebhook(deps, restarted, FIRST_TRY_TIMEOUT_MS)) ?? restarted;
  } catch (e) {
    // Left to the job, as with the first try.
    console.error(`[webhooks] app ${appId}: sending again failed: ${e instanceof Error ? e.message : "unknown error"}`);
    return restarted;
  }
}

/** How a notice reads on App sign-in › For your developer. */
export function webhookStateText(webhook: ApiWebhook): string {
  if (webhook.status === "delivered") return "Delivered";
  if (webhook.status === "failed") return webhook.lastError ?? "Failed";
  if (webhook.attempts === 0) return "Waiting to be sent";
  return `${webhook.lastError ?? "Not delivered yet"} Trying again (${webhook.attempts} of ${MAX_ATTEMPTS} tries made).`;
}
