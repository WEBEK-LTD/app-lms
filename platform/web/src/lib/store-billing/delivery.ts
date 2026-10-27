import { createHash, createHmac } from "node:crypto";
import { revealLicenseKey } from "../admin/clients";
import { isPrivateAddress, resolveHost } from "../app/api-check";
import { httpsSiteAddress } from "../app/wordpress-ready";
import type { DataStore } from "../data/store";
import type { App, StoreProduct, StorePurchaseRecord } from "../data/types";
import { appUrl } from "../env";
import { attemptWebhook, FIRST_TRY_TIMEOUT_MS, queuePurchaseNotice, RETRY_TIMEOUT_MS, type WebhookDeps } from "../hosted/api-webhooks";
import { platformConnector, StoreAccessError } from "../hosted/connectors/platforms";
import "../hosted/connectors/registry";
import { normalizeLicenseKey } from "../license/key";
import { pinnedFetch } from "../net/safe-fetch";
import { storeBillingSource } from "./access";
import { wantedPrice } from "./products";

/**
 * 100.3 A purchase's access, given or taken back where the course lives:
 * the hosted API enrols the person in the dashboard's course (or takes the
 * enrolment back); a WordPress site gets `POST /wp-json/yallapp/v1/billing/
 * access` (openapi.yaml, storeAccess), signed with the license key. 100.7 An
 * app on its own API gets the signed `purchase.completed` or
 * `purchase.revoked` notice (openapi.yaml webhook storePurchase); a
 * Teachable or Thinkific school enrols or unenrols the student through its
 * API. Not delivered when it couldn't be done now; the frequent job tries
 * again.
 */

export const ACCESS_PATH = "/wp-json/yallapp/v1/billing/access";
const TIMEOUT_MS = 10_000;

export interface DeliveryDeps {
  store: DataStore;
  key: Buffer;
  now: Date;
  /** How the WordPress site is reached (tests: a fake fetch, or LICENSE_REFRESH_TEST_URL's site). */
  site?: { fetcher?: (url: string, init?: RequestInit) => Promise<Response>; resolve?: (host: string) => Promise<string[]>; testSiteUrl?: string | null };
  /**
   * 100.7 How the client's own API (its notices) and a Teachable or Thinkific
   * school are reached (tests: recorded answers), and Yallapp's address (the
   * notices' issuer; appUrl() otherwise).
   */
  api?: { fetcher?: typeof fetch; resolve?: (host: string) => Promise<string[]>; platformUrl?: string };
}

/** What a delivery did: given (or taken back) on the source; 100.7 the school courses Yallapp gave for the purchase now. */
export interface Delivery {
  ok: boolean;
  grantedCourseIds?: number[];
}

/** Lowercase hex HMAC-SHA256 of `yallapp-billing-access:<timestamp>:<raw body>`, keyed with the license key in capitals. */
export function accessSignature(licenseKey: string, timestamp: number, body: string): string {
  return createHmac("sha256", normalizeLicenseKey(licenseKey)).update(`yallapp-billing-access:${timestamp}:${body}`).digest("hex");
}

/** The same ID on every try of one change (a status and paid period of one purchase), as a UUID. */
export function grantId(purchase: Pick<StorePurchaseRecord, "id" | "status" | "expiresAt">): string {
  const hex = createHash("sha256").update(`${purchase.id}:${purchase.status}:${purchase.expiresAt?.toISOString() ?? ""}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function deliverPurchase(deps: DeliveryDeps, app: App, purchase: StorePurchaseRecord): Promise<Delivery> {
  const source = storeBillingSource(app);
  if (source === "courses") {
    if (purchase.accountSource !== "hosted" || purchase.courseId === null) return { ok: true };
    const userId = Number(purchase.accountId);
    if (purchase.status === "active") await deps.store.enrollInCourse({ appId: app.id, userId, courseId: purchase.courseId, source: "paid", enrolledAt: deps.now });
    else if (purchase.status === "revoked" || purchase.status === "expired") await deps.store.leaveCourse(app.id, userId, purchase.courseId);
    return { ok: true };
  }
  if (source === "site") return { ok: purchase.accountSource === "wordpress" ? await sendToSite(deps, app, purchase) : true };
  if (purchase.accountSource !== "hosted") return { ok: true };
  if (source === "own_api") return { ok: await noticeToOwnApi(deps, app, purchase) };
  if (source === "teachable" || source === "thinkific") return accessOnSchool(deps, app, purchase);
  // The app no longer sells this way (its source changed): nothing left to give.
  return { ok: true };
}

/** 100.7 The courses a product opens: a membership's list, or the course itself. */
function coursesOf(product: Pick<StoreProduct, "courseIds"> | null, purchase: Pick<StorePurchaseRecord, "courseId">): number[] {
  if (product && product.courseIds.length > 0) return product.courseIds;
  return purchase.courseId !== null ? [purchase.courseId] : [];
}

/** 100.7 The `events` claim of a purchase notice (openapi.yaml webhook storePurchase). */
export function purchaseClaim(purchase: StorePurchaseRecord, product: StoreProduct | null): Record<string, unknown> {
  return {
    product_id: purchase.productId,
    kind: purchase.kind,
    item_id: purchase.kind === "course" ? String(purchase.courseId ?? "") : (purchase.planId ?? ""),
    platform: purchase.platform,
    transaction_id: purchase.platform === "ios" ? purchase.storeKey : (purchase.transactionId ?? purchase.storeKey),
    expires_at: purchase.expiresAt?.toISOString() ?? null,
    ...(purchase.status === "active" ? {} : { reason: purchase.reason ?? (purchase.status === "expired" ? "expired" : "revoked") }),
    course_ids: coursesOf(product, purchase),
    amount: product ? wantedPrice(product) : null,
    currency: product?.currency ?? null,
    test: purchase.test,
  };
}

/**
 * 100.7 The client's API hears of the purchase's change: its notice is
 * queued once (the grant ID, the same on every try, is its `jti`) and tried
 * now; later calls try it again when it is due, and the webhook job keeps
 * trying it as for `account.deleted`. Delivered once the API answered 2xx.
 */
async function noticeToOwnApi(deps: DeliveryDeps, app: App, purchase: StorePurchaseRecord): Promise<boolean> {
  const webhookDeps: WebhookDeps = {
    store: deps.store,
    encryptionKey: deps.key,
    platformUrl: deps.api?.platformUrl ?? appUrl(),
    now: () => deps.now,
    fetcher: deps.api?.fetcher,
    resolve: deps.api?.resolve,
  };
  const id = grantId(purchase);
  let notice = await deps.store.getApiWebhook(id);
  if (!notice) {
    const product = await deps.store.getStoreProduct(app.id, purchase.productId);
    notice = await queuePurchaseNotice(webhookDeps, app, {
      id,
      event: purchase.status === "active" ? "purchase.completed" : "purchase.revoked",
      subject: purchase.accountId,
      data: {
        purchase: { id: purchase.id, platform: purchase.platform, storeKey: purchase.storeKey, status: purchase.status, expiresAt: purchase.expiresAt?.toISOString() ?? null },
        event: purchaseClaim(purchase, product),
      },
    });
    // A demo app, or one that stopped letting Yallapp sign people in: no API to tell.
    if (!notice) return true;
  }
  if (notice.status === "pending" && notice.nextAttemptAt !== null && notice.nextAttemptAt.getTime() <= deps.now.getTime()) {
    try {
      notice = (await attemptWebhook(webhookDeps, notice, notice.attempts === 0 ? FIRST_TRY_TIMEOUT_MS : RETRY_TIMEOUT_MS)) ?? notice;
    } catch (error) {
      console.error("[store billing] notice", app.id, error instanceof Error ? error.message : String(error));
    }
  }
  return notice.status === "delivered";
}

/**
 * 100.7 Teachable or Thinkific: the student the app shows courses to is
 * enrolled in the courses bought (a membership's, until a day after its paid
 * period on Thinkific), or unenrolled from the ones Yallapp gave for this
 * purchase. A course another active purchase of the same person opens stays,
 * and becomes that purchase's to take back. Courses the student had from the
 * school's website are never taken.
 */
async function accessOnSchool(deps: DeliveryDeps, app: App, purchase: StorePurchaseRecord): Promise<Delivery> {
  const user = await deps.store.getHostedUser(app.id, Number(purchase.accountId));
  // The account is gone: nothing to give or take.
  if (!user) return { ok: true, grantedCourseIds: [] };
  const connector = platformConnector(app, deps.key, { store: deps.store }, deps.api?.fetcher);
  if (!connector?.storeAccess) return { ok: false };
  const ours = purchase.grantedCourseIds ?? [];
  try {
    if (purchase.status === "active") {
      const courseIds = coursesOf(await deps.store.getStoreProduct(app.id, purchase.productId), purchase);
      const { granted } = await connector.storeAccess({ user, action: "grant", courseIds, ours, expiresAt: purchase.expiresAt, now: deps.now });
      return { ok: true, grantedCourseIds: unique([...ours, ...granted]) };
    }
    // Courses another active purchase of this person opens stay.
    const covering = new Map<number, StorePurchaseRecord>();
    for (const other of await deps.store.listAccountStorePurchases(app.id, "hosted", purchase.accountId)) {
      if (other.id === purchase.id || other.status !== "active") continue;
      for (const courseId of coursesOf(await deps.store.getStoreProduct(app.id, other.productId), other)) if (!covering.has(courseId)) covering.set(courseId, other);
    }
    const end = ours.filter((courseId) => !covering.has(courseId));
    if (end.length > 0) await connector.storeAccess({ user, action: "revoke", courseIds: end, ours, expiresAt: null, now: deps.now });
    // The ones kept are now the covering purchase's to take back.
    const moved = new Map<string, { purchase: StorePurchaseRecord; courseIds: number[] }>();
    for (const courseId of ours) {
      const other = covering.get(courseId);
      if (!other) continue;
      const entry = moved.get(other.id) ?? { purchase: other, courseIds: [] };
      entry.courseIds.push(courseId);
      moved.set(other.id, entry);
    }
    for (const { purchase: other, courseIds } of moved.values()) {
      await deps.store.saveStorePurchase({ ...other, grantedCourseIds: unique([...(other.grantedCourseIds ?? []), ...courseIds]) });
    }
    return { ok: true, grantedCourseIds: [] };
  } catch (error) {
    console.error("[store billing] school access", app.id, error instanceof Error ? error.message : String(error));
    // What a grant gave before it failed stays Yallapp's to take back.
    return error instanceof StoreAccessError ? { ok: false, grantedCourseIds: unique([...ours, ...error.granted]) } : { ok: false };
  }
}

const unique = (ids: number[]) => [...new Set(ids)].sort((a, b) => a - b);

async function sendToSite(deps: DeliveryDeps, app: App, purchase: StorePurchaseRecord): Promise<boolean> {
  const license = await deps.store.getLicenseForApp(app.clientId, app.id);
  const activation = license ? await deps.store.getActivation(license.id) : null;
  const testSite = deps.site?.testSiteUrl;
  const base = testSite ? testSite.replace(/\/+$/, "") : activation ? httpsSiteAddress(activation.siteUrlRaw) : null;
  if (!license || !activation || !base) return false;
  const url = `${base}${ACCESS_PATH}`;
  if (!testSite) {
    const addresses = await (deps.site?.resolve ?? resolveHost)(new URL(url).hostname);
    if (addresses.length === 0 || addresses.some(isPrivateAddress)) return false;
  }
  const product = await deps.store.getStoreProduct(app.id, purchase.productId);
  const body = JSON.stringify({
    grant_id: grantId(purchase),
    action: purchase.status === "active" ? "grant" : "revoke",
    user_id: Number(purchase.accountId),
    kind: purchase.kind,
    course_id: purchase.courseId,
    plan_id: purchase.planId,
    expires_at: purchase.expiresAt?.toISOString() ?? null,
    platform: purchase.platform,
    transaction_id: purchase.platform === "ios" ? purchase.storeKey : (purchase.transactionId ?? purchase.storeKey),
    amount: product ? wantedPrice(product) : null,
    currency: product?.currency ?? null,
  });
  const timestamp = Math.floor(deps.now.getTime() / 1000);
  const fetcher = deps.site?.fetcher ?? (testSite ? fetch : pinnedFetch(undefined, deps.site?.resolve));
  try {
    const response = await fetcher(url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "yallapp-timestamp": String(timestamp),
        "yallapp-signature": accessSignature(revealLicenseKey(license, deps.key), timestamp, body),
      },
      body,
    });
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}
