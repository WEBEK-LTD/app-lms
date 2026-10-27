import { createPublicKey, verify, type JsonWebKey } from "node:crypto";
import { googleAccessToken } from "../publishing/rollout";

/**
 * 100.2/100.3 Google Play Billing, server side. Through the Android Publisher
 * API and the service account the app already keeps for publishing (scope
 * androidpublisher), Yallapp keeps a store product for each paid course
 * (one-time product) and membership plan (subscription), reads each purchase
 * again from Google before giving access, acknowledges it, and reads refunds.
 * Google's real-time notifications come through Pub/Sub push, checked here.
 * Request shapes follow the Android Publisher v3 discovery document
 * (androidpublisher.googleapis.com/$discovery/rest?version=v3).
 */

const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";

/** Why a call to Google didn't go through, as the dashboard words it (by code). */
export const GOOGLE_BILLING_ERROR_TEXT = {
  google_key: "Google Play didn't accept your service account. Add its key again.",
  google_refused: "Google Play refused: give the service account the right to manage store presence and orders.",
  google_not_found: "Google Play has no such app, product or purchase.",
  google_failed: "Google Play couldn't be reached just now. Try again in a few minutes.",
  google_invalid: "Google Play's answer couldn't be used.",
} as const;

export type GoogleBillingCode = keyof typeof GOOGLE_BILLING_ERROR_TEXT;

export class GoogleBillingError extends Error {
  constructor(
    readonly code: GoogleBillingCode,
    readonly status: number | null = null,
  ) {
    super(GOOGLE_BILLING_ERROR_TEXT[code]);
  }
}

export interface GoogleBillingDeps {
  fetcher: typeof fetch;
  /** An Android Publisher access token (googleBillingToken). */
  token: string;
  packageName: string;
}

/** An access token from the app's service account; a refused key is google_key. */
export async function googleBillingToken(fetcher: typeof fetch, serviceAccountJson: string, now: Date): Promise<string> {
  try {
    return await googleAccessToken(fetcher, serviceAccountJson, now);
  } catch {
    throw new GoogleBillingError("google_key");
  }
}

/** One call to the Android Publisher API: Bearer token, JSON, 20 s. */
export async function googleBillingCall<T = Record<string, unknown>>(
  deps: Pick<GoogleBillingDeps, "fetcher" | "token">,
  url: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await deps.fetcher(url, {
      method: init.method ?? "GET",
      headers: { authorization: `Bearer ${deps.token}`, "content-type": "application/json" },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new GoogleBillingError("google_failed");
  }
  if (!response.ok) {
    const code = response.status === 401 || response.status === 403 ? "google_refused" : response.status === 404 ? "google_not_found" : "google_failed";
    throw new GoogleBillingError(code, response.status);
  }
  const text = await response.text().catch(() => "");
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GoogleBillingError("google_invalid", response.status);
  }
}

const app = (deps: GoogleBillingDeps) => `${API}/${encodeURIComponent(deps.packageName)}`;
const enc = encodeURIComponent;

// Prices -----------------------------------------------------------------------

/** Google's Money: whole units as a string, and nanos. */
export interface Money {
  currencyCode: string;
  units: string;
  nanos?: number;
}

/** Google's Money as a decimal string: { units: "529", nanos: 990000000 } → "529.99". */
export function fromMoney(money: Pick<Money, "units" | "nanos">): string {
  const fraction = String(Math.abs(money.nanos ?? 0)).padStart(9, "0").replace(/0+$/, "").padEnd(2, "0");
  return `${money.units || "0"}.${fraction}`;
}

/** "450.00" in TRY → { currencyCode: "TRY", units: "450", nanos: 0 }. */
export function toMoney(price: { currency: string; amount: string }): Money {
  const match = /^(\d+)(?:\.(\d{1,9}))?$/.exec(price.amount.trim());
  if (!match || !/^[A-Z]{3}$/.test(price.currency)) throw new Error(`Not a price: ${price.amount} ${price.currency}`);
  return { currencyCode: price.currency, units: String(BigInt(match[1] ?? "0")), nanos: Number((match[2] ?? "").padEnd(9, "0")) };
}

export interface RegionPrices {
  /** The price in each region Play sells in, in its own currency (tax included where Play includes it). */
  regions: { regionCode: string; price: Money }[];
  /** For regions Play may add later. */
  otherRegions: { usdPrice: Money; eurPrice: Money } | null;
  /** The regions version the prices were made for (sent back as regionsVersion.version). */
  regionsVersion: string;
}

/** The regions version used when Google's answer names none (the one-time products guide's value). */
export const DEFAULT_REGIONS_VERSION = "2022/02";

/**
 * 100.2 The nearest store price in every region, as Google computes it
 * (monetization.convertRegionPrices: POST …/pricing:convertRegionPrices
 * { price: Money } → { convertedRegionPrices: { [region]: { regionCode, price,
 * taxAmount } }, convertedOtherRegionsPrice: { usdPrice, eurPrice },
 * regionVersion: { version } }). Google reads `price` as tax exclusive.
 */
export async function convertRegionPrices(deps: GoogleBillingDeps, price: { currency: string; amount: string }): Promise<RegionPrices> {
  const body = await googleBillingCall<{
    convertedRegionPrices?: Record<string, { regionCode?: string; price?: Money }>;
    convertedOtherRegionsPrice?: { usdPrice?: Money; eurPrice?: Money };
    regionVersion?: { version?: string };
  }>(deps, `${app(deps)}/pricing:convertRegionPrices`, { method: "POST", body: { price: toMoney(price) } });
  const regions = Object.entries(body.convertedRegionPrices ?? {})
    .filter(([, value]) => value?.price?.currencyCode)
    .map(([code, value]) => ({ regionCode: value.regionCode ?? code, price: value.price as Money }))
    .sort((a, b) => a.regionCode.localeCompare(b.regionCode));
  if (regions.length === 0) throw new GoogleBillingError("google_invalid");
  const other = body.convertedOtherRegionsPrice;
  return {
    regions,
    otherRegions: other?.usdPrice && other.eurPrice ? { usdPrice: other.usdPrice, eurPrice: other.eurPrice } : null,
    regionsVersion: body.regionVersion?.version ?? DEFAULT_REGIONS_VERSION,
  };
}

/**
 * The site's price as it is in the regions that use the site's currency:
 * Google reads the price it converts as before tax and adds the tax, while
 * the site's price is what people pay there. Other regions keep Google's
 * conversion.
 */
export function withSitePrice(prices: RegionPrices, price: { currency: string; amount: string }): RegionPrices {
  const own = toMoney(price);
  return { ...prices, regions: prices.regions.map((r) => (r.price.currencyCode === price.currency ? { ...r, price: own } : r)) };
}

// Products -------------------------------------------------------------------------

/** The one purchase option of a course's one-time product. */
export const PURCHASE_OPTION_ID = "buy";
/** The base plan of a membership plan's subscription, by period. */
export const BASE_PLANS = { month: { id: "monthly", duration: "P1M" }, year: { id: "yearly", duration: "P1Y" } } as const;

export interface ProductInput {
  productId: string;
  title: string;
  description: string;
  price: { currency: string; amount: string };
  /** The listing's language: the app's default language in Play (playDefaultLanguage). */
  languageCode?: string;
}

/** Google's ID rules: lower-case letters, digits, "_" and "."; 1 to 40 long for subscriptions (course_12, plan_pmpro_3). */
function checkProductId(productId: string): void {
  if (!/^[a-z0-9][a-z0-9_.]{0,39}$/.test(productId)) throw new Error(`Not a Google Play product ID: ${productId}`);
}

/** Cut to Google's limits, by character: titles 55 and descriptions 200 ("The maximum length is 55 characters"). */
const cut = (text: string, max: number) => Array.from(text.trim()).slice(0, max).join("");

function listingOf(input: ProductInput) {
  const title = cut(input.title, 55);
  // A one-time product's description is required: the title stands in for an empty one.
  return { languageCode: input.languageCode ?? "en-US", title, description: cut(input.description, 200) || title };
}

/**
 * The price Google kept in the site's currency: the most common price among
 * the regions that use that currency (one region for TRY; several for EUR).
 * Null when no region Play sells in uses it.
 */
function keptPrice(configs: { price?: Money }[] | undefined, currency: string): string | null {
  const counts = new Map<string, number>();
  for (const config of configs ?? []) {
    if (config.price?.currencyCode !== currency) continue;
    const price = fromMoney(config.price);
    counts.set(price, (counts.get(price) ?? 0) + 1);
  }
  const ranked = [...counts].sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]));
  return ranked[0]?.[0] ?? null;
}

export interface UpsertResult {
  /** The purchase option's or base plan's state as Google reports it (ACTIVE once sellable). */
  state: string;
  /** The price Google kept in the given currency, a decimal string; null when no region uses that currency. */
  price: string | null;
}

type PurchaseOption = { purchaseOptionId?: string; state?: string; regionalPricingAndAvailabilityConfigs?: { regionCode?: string; price?: Money }[] };
type OneTimeProductResource = { purchaseOptions?: PurchaseOption[] };
const buyOption = (product: OneTimeProductResource | undefined) => product?.purchaseOptions?.find((o) => o.purchaseOptionId === PURCHASE_OPTION_ID);

/**
 * 100.2 Creates or updates a course's one-time product and makes it sellable.
 * monetization.onetimeproducts.patch: PATCH …/onetimeproducts/{productId}
 * (lower case in Google's path) with allowMissing=true ("the one-time product
 * will be created"), regionsVersion.version and updateMask; one "buy" purchase
 * option (buyOption.legacyCompatible: "available in legacy PBL flows") with a
 * regional config per region. Then purchaseOptions:batchUpdateStates with an
 * activatePurchaseOptionRequest, unless it is ACTIVE already.
 */
export async function upsertOneTimeProduct(deps: GoogleBillingDeps, input: ProductInput): Promise<UpsertResult> {
  checkProductId(input.productId);
  const prices = withSitePrice(await convertRegionPrices(deps, input.price), input.price);
  const query = new URLSearchParams({ allowMissing: "true", "regionsVersion.version": prices.regionsVersion, updateMask: "listings,purchaseOptions" });
  const product = await googleBillingCall<OneTimeProductResource>(deps, `${app(deps)}/onetimeproducts/${enc(input.productId)}?${query}`, {
    method: "PATCH",
    body: {
      packageName: deps.packageName,
      productId: input.productId,
      listings: [listingOf(input)],
      purchaseOptions: [
        {
          purchaseOptionId: PURCHASE_OPTION_ID,
          buyOption: { legacyCompatible: true },
          regionalPricingAndAvailabilityConfigs: prices.regions.map((r) => ({ regionCode: r.regionCode, price: r.price, availability: "AVAILABLE" })),
          ...(prices.otherRegions ? { newRegionsConfig: { ...prices.otherRegions, availability: "AVAILABLE" } } : {}),
        },
      ],
    },
  });
  const saved = buyOption(product);
  const price = keptPrice(saved?.regionalPricingAndAvailabilityConfigs ?? prices.regions, input.price.currency);
  if (saved?.state === "ACTIVE") return { state: saved.state, price };
  const activated = await setPurchaseOptionState(deps, input.productId, "activate");
  return { state: buyOption(activated.oneTimeProducts?.[0])?.state ?? "ACTIVE", price };
}

async function setPurchaseOptionState(deps: GoogleBillingDeps, productId: string, action: "activate" | "deactivate"): Promise<{ oneTimeProducts?: OneTimeProductResource[] }> {
  const request = { packageName: deps.packageName, productId, purchaseOptionId: PURCHASE_OPTION_ID };
  return googleBillingCall<{ oneTimeProducts?: OneTimeProductResource[] }>(deps, `${app(deps)}/oneTimeProducts/${enc(productId)}/purchaseOptions:batchUpdateStates`, {
    method: "POST",
    body: { requests: [action === "activate" ? { activatePurchaseOptionRequest: request } : { deactivatePurchaseOptionRequest: request }] },
  });
}

type BasePlan = { basePlanId?: string; state?: string; regionalConfigs?: { regionCode?: string; price?: Money }[] } & Record<string, unknown>;
type Listing = { languageCode?: string } & Record<string, unknown>;
type SubscriptionResource = { basePlans?: BasePlan[]; listings?: Listing[] };

async function getSubscription(deps: GoogleBillingDeps, productId: string): Promise<SubscriptionResource | null> {
  try {
    return await googleBillingCall<SubscriptionResource>(deps, `${app(deps)}/subscriptions/${enc(productId)}`);
  } catch (error) {
    if (error instanceof GoogleBillingError && error.code === "google_not_found") return null;
    throw error;
  }
}

/**
 * 100.2 Creates or updates a membership plan's subscription with one
 * auto-renewing base plan ("monthly" P1M or "yearly" P1Y), then activates it
 * ("Newly added base plans will remain in draft state until activated").
 * monetization.subscriptions.create (POST …/subscriptions?productId=…) when
 * it doesn't exist, else .patch with updateMask=listings,basePlans: the other
 * base plans and listings are sent back as they are, since the patch replaces
 * the lists. If the period changed, the other period's base plan stops selling.
 */
export async function upsertSubscription(deps: GoogleBillingDeps, input: ProductInput & { period: "month" | "year" }): Promise<UpsertResult> {
  checkProductId(input.productId);
  const prices = withSitePrice(await convertRegionPrices(deps, input.price), input.price);
  const plan = BASE_PLANS[input.period];
  const listing = listingOf(input);
  const basePlan = {
    basePlanId: plan.id,
    autoRenewingBasePlanType: { billingPeriodDuration: plan.duration },
    regionalConfigs: prices.regions.map((r) => ({ regionCode: r.regionCode, price: r.price, newSubscriberAvailability: true })),
    ...(prices.otherRegions ? { otherRegionsConfig: { ...prices.otherRegions, newSubscriberAvailability: true } } : {}),
  };
  const existing = await getSubscription(deps, input.productId);
  let saved: SubscriptionResource;
  if (!existing) {
    const query = new URLSearchParams({ productId: input.productId, "regionsVersion.version": prices.regionsVersion });
    saved = await googleBillingCall<SubscriptionResource>(deps, `${app(deps)}/subscriptions?${query}`, {
      method: "POST",
      body: { packageName: deps.packageName, productId: input.productId, listings: [listing], basePlans: [basePlan] },
    });
  } else {
    // `state` is output only: sent back without it.
    const others = (existing.basePlans ?? []).filter((b) => b.basePlanId !== plan.id).map((b) => Object.fromEntries(Object.entries(b).filter(([key]) => key !== "state")));
    const otherListings = (existing.listings ?? []).filter((l) => l.languageCode !== listing.languageCode);
    const query = new URLSearchParams({ "regionsVersion.version": prices.regionsVersion, updateMask: "listings,basePlans" });
    saved = await googleBillingCall<SubscriptionResource>(deps, `${app(deps)}/subscriptions/${enc(input.productId)}?${query}`, {
      method: "PATCH",
      body: { packageName: deps.packageName, productId: input.productId, listings: [listing, ...otherListings], basePlans: [...others, basePlan] },
    });
  }
  const plans = saved.basePlans ?? [];
  for (const other of Object.values(BASE_PLANS)) {
    if (other.id !== plan.id && plans.some((b) => b.basePlanId === other.id && b.state === "ACTIVE")) await setBasePlanState(deps, input.productId, other.id, "deactivate");
  }
  const ours = plans.find((b) => b.basePlanId === plan.id);
  const price = keptPrice(ours?.regionalConfigs ?? prices.regions, input.price.currency);
  if (ours?.state === "ACTIVE") return { state: ours.state, price };
  const activated = await setBasePlanState(deps, input.productId, plan.id, "activate");
  return { state: activated.basePlans?.find((b) => b.basePlanId === plan.id)?.state ?? "ACTIVE", price };
}

async function setBasePlanState(deps: GoogleBillingDeps, productId: string, basePlanId: string, action: "activate" | "deactivate"): Promise<SubscriptionResource> {
  return googleBillingCall<SubscriptionResource>(deps, `${app(deps)}/subscriptions/${enc(productId)}/basePlans/${enc(basePlanId)}:${action}`, {
    method: "POST",
    body: { packageName: deps.packageName, productId, basePlanId },
  });
}

/**
 * 100.2 Stops selling a product (a course no longer paid, a plan removed):
 * its purchase option or active base plans are deactivated, never deleted,
 * so people who bought keep their purchases. Nothing to do when it's gone.
 */
export async function deactivateProduct(deps: GoogleBillingDeps, input: { productId: string; type: "one_time" | "subscription" }): Promise<void> {
  if (input.type === "subscription") {
    const existing = await getSubscription(deps, input.productId);
    for (const plan of existing?.basePlans ?? []) {
      if (plan.basePlanId && plan.state === "ACTIVE") await setBasePlanState(deps, input.productId, plan.basePlanId, "deactivate");
    }
    return;
  }
  let product: OneTimeProductResource;
  try {
    product = await googleBillingCall(deps, `${app(deps)}/oneTimeProducts/${enc(input.productId)}`);
  } catch (error) {
    if (error instanceof GoogleBillingError && error.code === "google_not_found") return;
    throw error;
  }
  if (buyOption(product)?.state === "ACTIVE") await setPurchaseOptionState(deps, input.productId, "deactivate");
}

/**
 * 100.2 The app's default language in Play, which a subscription's listings
 * must include: edits.insert, edits.details.get (defaultLanguage), then the
 * edit is deleted unchanged.
 */
export async function playDefaultLanguage(deps: GoogleBillingDeps): Promise<string> {
  const edit = await googleBillingCall<{ id?: string }>(deps, `${app(deps)}/edits`, { method: "POST", body: {} });
  if (!edit.id) throw new GoogleBillingError("google_invalid");
  try {
    const details = await googleBillingCall<{ defaultLanguage?: string }>(deps, `${app(deps)}/edits/${enc(edit.id)}/details`);
    if (!details.defaultLanguage) throw new GoogleBillingError("google_invalid");
    return details.defaultLanguage;
  } finally {
    await googleBillingCall(deps, `${app(deps)}/edits/${enc(edit.id)}`, { method: "DELETE" }).catch(() => undefined);
  }
}

/** 100.2 Proves the service account can manage products: one-time products, one per page. */
export async function checkGoogleBilling(deps: GoogleBillingDeps): Promise<void> {
  await googleBillingCall(deps, `${app(deps)}/oneTimeProducts?pageSize=1`);
}

// Purchases ----------------------------------------------------------------------

export interface ProductPurchase {
  productId: string;
  orderId: string | null;
  state: "purchased" | "pending" | "cancelled";
  acknowledged: boolean;
  obfuscatedAccountId: string | null;
  refunded: boolean;
  test: boolean;
}

const PURCHASE_STATES: Record<string, ProductPurchase["state"]> = { PURCHASED: "purchased", PENDING: "pending", CANCELLED: "cancelled" };

/**
 * 100.3 A one-time purchase as Google has it (purchases.productsv2
 * .getproductpurchasev2: GET …/purchases/productsv2/tokens/{token}).
 * `refunded`: Google reports no refund flag here; a purchase that completed
 * and is now CANCELLED, or whose refundableQuantity is down to 0, was voided.
 * The voided purchases list stays the source of truth for refunds.
 */
export async function readProductPurchase(deps: GoogleBillingDeps, purchaseToken: string): Promise<ProductPurchase> {
  const body = await googleBillingCall<{
    orderId?: string;
    acknowledgementState?: string;
    purchaseCompletionTime?: string;
    purchaseStateContext?: { purchaseState?: string };
    productLineItem?: { productId?: string; productOfferDetails?: { quantity?: number; refundableQuantity?: number } }[];
    obfuscatedExternalAccountId?: string;
    testPurchaseContext?: object;
  }>(deps, `${app(deps)}/purchases/productsv2/tokens/${enc(purchaseToken)}`);
  const item = body.productLineItem?.[0];
  const state = PURCHASE_STATES[body.purchaseStateContext?.purchaseState ?? ""];
  if (!item?.productId || !state) throw new GoogleBillingError("google_invalid");
  const offer = item.productOfferDetails;
  const noneLeft = typeof offer?.refundableQuantity === "number" && offer.refundableQuantity === 0 && (offer.quantity ?? 1) > 0;
  return {
    productId: item.productId,
    orderId: body.orderId ?? null,
    state,
    acknowledged: body.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    obfuscatedAccountId: body.obfuscatedExternalAccountId ?? null,
    refunded: noneLeft || (state === "cancelled" && Boolean(body.purchaseCompletionTime)),
    test: Boolean(body.testPurchaseContext),
  };
}

/** 100.3 purchases.products.acknowledge: POST …/purchases/products/{productId}/tokens/{token}:acknowledge. */
export async function acknowledgeProductPurchase(deps: GoogleBillingDeps, input: { productId: string; purchaseToken: string }): Promise<void> {
  await googleBillingCall(deps, `${app(deps)}/purchases/products/${enc(input.productId)}/tokens/${enc(input.purchaseToken)}:acknowledge`, { method: "POST", body: {} });
}

export interface SubscriptionPurchase {
  productId: string;
  latestOrderId: string | null;
  state: "active" | "pending" | "grace" | "on_hold" | "paused" | "cancelled" | "expired";
  expiresAt: Date | null;
  acknowledged: boolean;
  autoRenewing: boolean;
  obfuscatedAccountId: string | null;
  test: boolean;
}

/**
 * Google's subscriptionState. CANCELED: the person cancelled, the access
 * lasts until expiresAt. A pending purchase that was cancelled never gave
 * access: expired. An unknown state is google_invalid, never a guess.
 */
const SUBSCRIPTION_STATES: Record<string, SubscriptionPurchase["state"]> = {
  SUBSCRIPTION_STATE_PENDING: "pending",
  SUBSCRIPTION_STATE_ACTIVE: "active",
  SUBSCRIPTION_STATE_PAUSED: "paused",
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: "grace",
  SUBSCRIPTION_STATE_ON_HOLD: "on_hold",
  SUBSCRIPTION_STATE_CANCELED: "cancelled",
  SUBSCRIPTION_STATE_EXPIRED: "expired",
  SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: "expired",
};

/** 100.3 A subscription as Google has it (purchases.subscriptionsv2.get: GET …/purchases/subscriptionsv2/tokens/{token}). */
export async function readSubscriptionPurchase(deps: GoogleBillingDeps, purchaseToken: string): Promise<SubscriptionPurchase> {
  const body = await googleBillingCall<{
    subscriptionState?: string;
    acknowledgementState?: string;
    lineItems?: { productId?: string; expiryTime?: string; latestSuccessfulOrderId?: string; autoRenewingPlan?: { autoRenewEnabled?: boolean } }[];
    externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
    testPurchase?: object;
  }>(deps, `${app(deps)}/purchases/subscriptionsv2/tokens/${enc(purchaseToken)}`);
  const items = body.lineItems ?? [];
  const item = items[0];
  const state = SUBSCRIPTION_STATES[body.subscriptionState ?? ""];
  if (!item?.productId || !state) throw new GoogleBillingError("google_invalid");
  const expiries = items.map((i) => (i.expiryTime ? Date.parse(i.expiryTime) : NaN)).filter((t) => Number.isFinite(t));
  return {
    productId: item.productId,
    latestOrderId: item.latestSuccessfulOrderId ?? null,
    state,
    expiresAt: expiries.length ? new Date(Math.max(...expiries)) : null,
    acknowledged: body.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    autoRenewing: item.autoRenewingPlan?.autoRenewEnabled === true,
    obfuscatedAccountId: body.externalAccountIdentifiers?.obfuscatedExternalAccountId ?? null,
    test: Boolean(body.testPurchase),
  };
}

/** 100.3 purchases.subscriptions.acknowledge: POST …/purchases/subscriptions/{subscriptionId}/tokens/{token}:acknowledge. */
export async function acknowledgeSubscription(deps: GoogleBillingDeps, input: { productId: string; purchaseToken: string }): Promise<void> {
  await googleBillingCall(deps, `${app(deps)}/purchases/subscriptions/${enc(input.productId)}/tokens/${enc(input.purchaseToken)}:acknowledge`, { method: "POST", body: {} });
}

export interface VoidedPurchase {
  purchaseToken: string;
  orderId: string | null;
  voidedAt: Date;
  reason: "refund" | "chargeback" | "revoked" | "other";
}

/**
 * Google's voidedReason: 0 Other, 1 Remorse, 2 Not_received, 3 Defective,
 * 4 Accidental_purchase, 5 Fraud, 6 Friendly_fraud, 7 Chargeback,
 * 8 Unacknowledged_purchase. Fraud is Google taking the purchase back.
 */
function voidedReason(code: number | undefined): VoidedPurchase["reason"] {
  if (code === 7) return "chargeback";
  if (code === 5 || code === 6) return "revoked";
  if (code === 1 || code === 2 || code === 3 || code === 4 || code === 8) return "refund";
  return "other";
}

/** Google refuses a startTime older than 30 days. */
const VOIDED_WINDOW_MS = 30 * 86_400_000 - 60_000;

/**
 * 100.3 Refunds, chargebacks and revocations since a time (purchases
 * .voidedpurchases.list: GET …/purchases/voidedpurchases?type=1&startTime=ms,
 * "1. Both voided in-app purchases and voided subscription purchases";
 * next pages through `token`, from tokenPagination.nextPageToken).
 */
export async function listVoidedPurchases(
  deps: GoogleBillingDeps,
  input: { since: Date; pageToken?: string | null; now?: Date },
): Promise<{ items: VoidedPurchase[]; nextPageToken: string | null }> {
  const since = input.now ? Math.max(input.since.getTime(), input.now.getTime() - VOIDED_WINDOW_MS) : input.since.getTime();
  const query = new URLSearchParams({ type: "1", startTime: String(since) });
  if (input.pageToken) query.set("token", input.pageToken);
  const body = await googleBillingCall<{
    voidedPurchases?: { purchaseToken?: string; orderId?: string; voidedTimeMillis?: string; voidedReason?: number }[];
    tokenPagination?: { nextPageToken?: string };
  }>(deps, `${app(deps)}/purchases/voidedpurchases?${query}`);
  const items = (body.voidedPurchases ?? [])
    .filter((v) => v.purchaseToken && Number.isFinite(Number(v.voidedTimeMillis)))
    .map((v) => ({ purchaseToken: v.purchaseToken as string, orderId: v.orderId ?? null, voidedAt: new Date(Number(v.voidedTimeMillis)), reason: voidedReason(v.voidedReason) }));
  return { items, nextPageToken: body.tokenPagination?.nextPageToken || null };
}

// Real-time developer notifications --------------------------------------------------

export const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);
const CERTS_TTL_MS = 3_600_000;
const SKEW_S = 60;

type Jwk = JsonWebKey & { kid?: string; kty?: string; alg?: string };
let certs: { keys: Jwk[]; fetchedAt: number } | null = null;

/** Forgets Google's certificates (tests). */
export function resetGoogleCerts(): void {
  certs = null;
}

async function googleCerts(fetcher: typeof fetch, now: Date, refresh: boolean): Promise<Jwk[]> {
  const at = now.getTime();
  const fresh = certs && at - certs.fetchedAt < CERTS_TTL_MS && at >= certs.fetchedAt;
  // A key not in the cache (Google rotated) fetches again, at most once a minute.
  if (fresh && certs && !(refresh && at - certs.fetchedAt > 60_000)) return certs.keys;
  let body: { keys?: Jwk[] };
  try {
    const response = await fetcher(GOOGLE_CERTS_URL, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(String(response.status));
    body = (await response.json()) as { keys?: Jwk[] };
  } catch {
    if (certs) return certs.keys;
    throw new GoogleBillingError("google_failed");
  }
  if (!Array.isArray(body.keys)) throw new GoogleBillingError("google_failed");
  certs = { keys: body.keys, fetchedAt: at };
  return certs.keys;
}

/**
 * 100.3 Checks the OIDC token Pub/Sub push sends in Authorization: signed by
 * Google (RS256, a key of Google's JWKS), issued by accounts.google.com, for
 * this audience, not expired. Answers the token's `email` (the push
 * subscription's service account). A bad token is google_invalid; Google's
 * certificates out of reach is google_failed.
 */
export async function verifyPubSubPush(authorizationHeader: string | null | undefined, options: { audience: string; now: Date; fetcher: typeof fetch }): Promise<string> {
  const invalid = () => new GoogleBillingError("google_invalid");
  const match = /^Bearer\s+([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec((authorizationHeader ?? "").trim());
  if (!match) throw invalid();
  const [rawHeader, rawPayload, rawSignature] = [match[1] ?? "", match[2] ?? "", match[3] ?? ""];
  let header: { alg?: string; kid?: string };
  let payload: { iss?: string; aud?: string | string[]; exp?: number; iat?: number; email?: string; email_verified?: boolean };
  try {
    header = JSON.parse(Buffer.from(rawHeader, "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(rawPayload, "base64url").toString("utf8"));
  } catch {
    throw invalid();
  }
  if (header.alg !== "RS256" || !header.kid) throw invalid();
  let key = (await googleCerts(options.fetcher, options.now, false)).find((k) => k.kid === header.kid);
  if (!key) key = (await googleCerts(options.fetcher, options.now, true)).find((k) => k.kid === header.kid);
  if (!key || key.kty !== "RSA") throw invalid();
  let valid = false;
  try {
    const publicKey = createPublicKey({ key, format: "jwk" });
    valid = verify("sha256", Buffer.from(`${rawHeader}.${rawPayload}`), publicKey, Buffer.from(rawSignature, "base64url"));
  } catch {
    valid = false;
  }
  if (!valid) throw invalid();
  const nowS = Math.floor(options.now.getTime() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!payload.iss || !ISSUERS.has(payload.iss)) throw invalid();
  if (!audiences.includes(options.audience)) throw invalid();
  if (typeof payload.exp !== "number" || payload.exp + SKEW_S < nowS) throw invalid();
  if (typeof payload.iat === "number" && payload.iat - SKEW_S > nowS) throw invalid();
  if (typeof payload.email !== "string" || !payload.email || payload.email_verified === false) throw invalid();
  return payload.email;
}

export interface DeveloperNotification {
  packageName: string;
  /** notificationType 1 ONE_TIME_PRODUCT_PURCHASED, 2 ONE_TIME_PRODUCT_CANCELED. */
  oneTime?: { purchaseToken: string; sku: string; notificationType: number };
  /** notificationType 1 RECOVERED … 13 EXPIRED, 20 PENDING_PURCHASE_CANCELED; Google no longer documents subscriptionId. */
  subscription?: { purchaseToken: string; subscriptionId: string | null; notificationType: number };
  /** refundType 1 full, 2 quantity-based partial; productType 1 subscription, 2 one-time. */
  voided?: { purchaseToken: string; orderId: string; refundType: number; productType: "subscription" | "one_time" | null };
  test?: true;
}

/**
 * 100.3 Reads the DeveloperNotification in a Pub/Sub message's `data`
 * (base64 JSON). Only says what to read again from Google; never trusted
 * itself. Null when it isn't one.
 */
export function parseDeveloperNotification(base64Data: string): DeveloperNotification | null {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(Buffer.from(base64Data, "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || typeof raw.packageName !== "string" || !raw.packageName) return null;
  const str = (value: unknown) => (typeof value === "string" && value ? value : null);
  const num = (value: unknown) => (typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : null);
  const obj = (value: unknown) => (value && typeof value === "object" ? (value as Record<string, unknown>) : null);
  const result: DeveloperNotification = { packageName: raw.packageName };
  const oneTime = obj(raw.oneTimeProductNotification);
  if (oneTime) {
    const purchaseToken = str(oneTime.purchaseToken);
    const sku = str(oneTime.sku);
    const notificationType = num(oneTime.notificationType);
    if (!purchaseToken || !sku || notificationType === null) return null;
    result.oneTime = { purchaseToken, sku, notificationType };
  }
  const subscription = obj(raw.subscriptionNotification);
  if (subscription) {
    const purchaseToken = str(subscription.purchaseToken);
    const notificationType = num(subscription.notificationType);
    if (!purchaseToken || notificationType === null) return null;
    result.subscription = { purchaseToken, subscriptionId: str(subscription.subscriptionId), notificationType };
  }
  const voided = obj(raw.voidedPurchaseNotification);
  if (voided) {
    const purchaseToken = str(voided.purchaseToken);
    const orderId = str(voided.orderId);
    const refundType = num(voided.refundType);
    const productType = num(voided.productType);
    if (!purchaseToken || !orderId || refundType === null) return null;
    result.voided = { purchaseToken, orderId, refundType, productType: productType === 1 ? "subscription" : productType === 2 ? "one_time" : null };
  }
  if (obj(raw.testNotification)) result.test = true;
  return result;
}
