import { createHash, createHmac } from "node:crypto";
import { revealLicenseKey } from "../admin/clients";
import { isPrivateAddress, resolveHost } from "../app/api-check";
import { httpsSiteAddress } from "../app/wordpress-ready";
import type { DataStore } from "../data/store";
import type { App, StorePurchaseRecord } from "../data/types";
import { normalizeLicenseKey } from "../license/key";
import { pinnedFetch } from "../net/safe-fetch";
import { storeBillingSource } from "./access";
import { wantedPrice } from "./products";

/**
 * 100.3 A purchase's access, given or taken back where the course lives:
 * the hosted API enrols the person in the dashboard's course (or takes the
 * enrolment back); a WordPress site gets `POST /wp-json/yallapp/v1/billing/
 * access` (openapi.yaml, storeAccess), signed with the license key. False
 * when it couldn't be done now; the frequent job tries again.
 */

export const ACCESS_PATH = "/wp-json/yallapp/v1/billing/access";
const TIMEOUT_MS = 10_000;

export interface DeliveryDeps {
  store: DataStore;
  key: Buffer;
  now: Date;
  /** How the WordPress site is reached (tests: a fake fetch, or LICENSE_REFRESH_TEST_URL's site). */
  site?: { fetcher?: (url: string, init?: RequestInit) => Promise<Response>; resolve?: (host: string) => Promise<string[]>; testSiteUrl?: string | null };
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

export async function deliverPurchase(deps: DeliveryDeps, app: App, purchase: StorePurchaseRecord): Promise<boolean> {
  const source = storeBillingSource(app);
  if (source === "courses") {
    if (purchase.accountSource !== "hosted" || purchase.courseId === null) return true;
    const userId = Number(purchase.accountId);
    if (purchase.status === "active") await deps.store.enrollInCourse({ appId: app.id, userId, courseId: purchase.courseId, source: "paid", enrolledAt: deps.now });
    else if (purchase.status === "revoked" || purchase.status === "expired") await deps.store.leaveCourse(app.id, userId, purchase.courseId);
    return true;
  }
  if (source === "site") return purchase.accountSource === "wordpress" ? sendToSite(deps, app, purchase) : true;
  // The app no longer sells this way (its source changed): nothing left to give.
  return true;
}

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
