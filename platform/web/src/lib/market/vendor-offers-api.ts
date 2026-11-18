import type { MarketCoupon } from "../data/types";
import { currencyDecimals, fromMinor } from "./currency";
import { money, moneyOrNull } from "./json";
import { createVendorCoupon, listVendorCoupons, parseVendorCouponForm, setVendorCoupon, vendorCatalogChoices, vendorCoupon, vendorCouponRules, type VendorCouponAction, type VendorCouponScope } from "./vendor-coupons";

/**
 * 115.77 The place's own offers in the vendor app (the Offers tab, as the
 * partner panel's, 115.18): `GET /vendor/offers`, `POST /vendor/offers`,
 * `POST /vendor/offers/{offer_id}/pause|resume|end`, for its owner and
 * managers. The same rules as the panel (lib/market/vendor-coupons.ts): the
 * place's own, paid by it, within the owner's largest percentage; a pause by
 * the app's owner stays.
 */

export type VendorOfferStatus = "active" | "paused" | "ended" | "owner_paused";

export function vendorOfferStatus(c: MarketCoupon, now: Date): VendorOfferStatus {
  if (c.ownerPaused) return "owner_paused";
  if (c.endsAt && c.endsAt <= now) return "ended";
  return c.active ? "active" : "paused";
}

export function vendorOfferJson(c: MarketCoupon, now: Date) {
  const value = c.kind === "percent" ? String(c.value) : c.kind === "amount" ? fromMinor(c.value, currencyDecimals(c.currency)) : null;
  return {
    id: c.id,
    title: c.title,
    code: c.code,
    kind: c.kind,
    value,
    amount: c.kind === "amount" ? money(c.value, c.currency) : null,
    min_order: c.minOrder > 0 ? moneyOrNull(c.minOrder, c.currency) : null,
    first_order_only: c.firstOrderOnly,
    starts_at: c.startsAt ? c.startsAt.toISOString() : null,
    ends_at: c.endsAt ? c.endsAt.toISOString() : null,
    status: vendorOfferStatus(c, now),
  };
}

export async function vendorOffersJson(scope: VendorCouponScope, now: Date) {
  const [rules, items] = await Promise.all([vendorCouponRules(scope.store, scope.appId), listVendorCoupons(scope)]);
  return { enabled: rules.enabled, max_percent: rules.maxPercent, items: items.map((c) => vendorOfferJson(c, now)) };
}

const text = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

/** The app's JSON body as the panel's form. */
export function offerForm(body: unknown): Record<string, string> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  return {
    title: text(b.title),
    code: text(b.code),
    kind: text(b.kind),
    value: text(b.value),
    max_discount: text(b.max_discount),
    min_order: text(b.min_order),
    uses_limit: text(b.uses_limit),
    per_user_limit: text(b.per_user_limit),
    starts: text(b.starts),
    ends: text(b.ends),
    first_order: b.first_order_only === true ? "1" : "",
  };
}

/** Made and kept; for the store reviewers ([keep] false), checked and shown, never kept. */
export async function createVendorOffer(scope: VendorCouponScope, body: unknown, now: Date, keep: boolean) {
  const form = offerForm(body);
  if (keep) {
    const made = await createVendorCoupon(scope, form, now);
    return made.ok ? { ok: true as const, body: vendorOfferJson(made.coupon, now) } : made;
  }
  const [rules, catalog] = await Promise.all([vendorCouponRules(scope.store, scope.appId), vendorCatalogChoices(scope)]);
  const parsed = parseVendorCouponForm(form, { appId: scope.appId, vendor: scope.vendor, currency: scope.currency, now, rules, catalog });
  if (!parsed.ok) return parsed;
  return { ok: true as const, body: vendorOfferJson({ ...parsed.value, id: 0, usesCount: 0 } as unknown as MarketCoupon, now) };
}

export async function moveVendorOffer(scope: VendorCouponScope, id: number, action: VendorCouponAction, now: Date, keep: boolean) {
  const coupon = await vendorCoupon(scope, id);
  if (!coupon) return { ok: false as const, status: 404, error: "This offer isn't one of yours." };
  if (!keep) {
    const shown = action === "end" ? { ...coupon, active: false, endsAt: now } : { ...coupon, active: action === "resume" };
    return { ok: true as const, body: vendorOfferJson(shown, now) };
  }
  const moved = await setVendorCoupon(scope, id, action, now);
  if (!moved.ok) return { ok: false as const, status: 409, error: moved.error };
  return { ok: true as const, body: vendorOfferJson((await vendorCoupon(scope, id))!, now) };
}
