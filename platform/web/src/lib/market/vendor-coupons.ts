import type { DataStore } from "../data/store";
import type { MarketCoupon, MarketCouponInput, Restaurant } from "../data/types";
import { deliverySettingsOf } from "../delivery/settings";
import { EMPTY_MENU } from "../food/menu";
import { vendorDelivery } from "./delivery";
import { parseCouponForm, type Parsed } from "./offer-forms";
import { marketSettingsOf, vendorCouponsOf } from "./settings";

/**
 * 115.18 A place's own coupons and automatic offers, made in its panel
 * (Offers): always for this place alone and paid by it, a percentage, an
 * amount, or free delivery when it delivers itself; on part of its own
 * catalog when it likes (menu sections or departments, dishes or
 * products). The app's owner lets places do this or not, sets the largest
 * percentage, and can pause any of them; the vendor can't undo that pause.
 * Every function checks the coupon belongs to the vendor asking.
 */

export interface VendorCouponScope {
  store: DataStore;
  appId: string;
  vendor: Restaurant;
  currency: string;
}

export type VendorCouponAction = "pause" | "resume" | "end";

export interface VendorCatalogChoices {
  /** Menu sections (restaurants) or departments (groceries and shops). */
  groups: { id: number; name: string }[];
  products: { id: number; name: string }[];
}

/** What a coupon can be limited to: the vendor's own sections or departments, and its own dishes or products. */
export async function vendorCatalogChoices(scope: VendorCouponScope): Promise<VendorCatalogChoices> {
  const { store, appId, vendor } = scope;
  if ((vendor.kind ?? "restaurant") === "restaurant") {
    const menu = (await store.getRestaurantMenu(appId, vendor.id)) ?? EMPTY_MENU;
    return { groups: menu.sections.map((s) => ({ id: s.id, name: s.name })), products: menu.sections.flatMap((s) => s.dishes.map((d) => ({ id: d.id, name: d.name }))) };
  }
  const [departments, products] = await Promise.all([store.listMarketDepartments(appId, vendor.id), store.listMarketProducts({ appId, vendorId: vendor.id, page: 1, perPage: 500 })]);
  return { groups: departments.map((d) => ({ id: d.id, name: d.name })), products: products.items.filter((p) => p.vendorId === vendor.id).map((p) => ({ id: p.id, name: p.name })) };
}

/** Whether the app's owner lets places make their own coupons, and the largest percentage. */
export async function vendorCouponRules(store: DataStore, appId: string): Promise<{ enabled: boolean; maxPercent: number | null }> {
  return vendorCouponsOf(marketSettingsOf(deliverySettingsOf(await store.getDeliverySettings(appId))));
}

const ids = (text: string | undefined) =>
  (text ?? "")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

/** The panel's form as a coupon of this vendor's: its own place, its own money, its own catalog. */
export function parseVendorCouponForm(
  form: Record<string, string>,
  input: { appId: string; vendor: Restaurant; currency: string; now: Date; rules: { enabled: boolean; maxPercent: number | null }; catalog: VendorCatalogChoices },
): Parsed<MarketCouponInput> {
  if (!input.rules.enabled) return { ok: false, field: "title", error: "The app doesn't let places make their own offers." };
  const parsed = parseCouponForm({ ...form, paid_by: "vendor" }, { appId: input.appId, currency: input.currency, now: input.now });
  if (!parsed.ok) return parsed;
  const c = parsed.value;
  if (c.kind === "free_delivery" && vendorDelivery(input.vendor).by !== "vendor") return { ok: false, field: "kind", error: "Free delivery is for places that deliver themselves." };
  if (c.kind === "percent" && input.rules.maxPercent !== null && c.value > input.rules.maxPercent) {
    return { ok: false, field: "value", error: `The app allows up to ${input.rules.maxPercent}% off.` };
  }
  const groups = new Set(input.catalog.groups.map((g) => g.id));
  const products = new Set(input.catalog.products.map((p) => p.id));
  // Only the vendor's own: anything else is dropped, never kept.
  const groupIds = [...new Set([...ids(form.group_ids), ...Object.keys(form).filter((k) => k.startsWith("group_")).map((k) => Number(k.slice(6)))])].filter((id) => groups.has(id));
  const productIds = [...new Set([...ids(form.product_ids), ...Object.keys(form).filter((k) => k.startsWith("product_")).map((k) => Number(k.slice(8)))])].filter((id) => products.has(id));
  return {
    ok: true,
    value: { ...c, paidBy: "vendor", vendorIds: [input.vendor.id], vendorKinds: [], departmentIds: groupIds, productIds, createdByVendorId: input.vendor.id, ownerPaused: false },
  };
}

/** The vendor's own coupons, the latest first. */
export async function listVendorCoupons(scope: VendorCouponScope): Promise<MarketCoupon[]> {
  return (await scope.store.listMarketCoupons(scope.appId, { createdByVendorId: scope.vendor.id })).filter((c) => c.createdByVendorId === scope.vendor.id);
}

/** A coupon of this vendor's, or null (another vendor's, or the owner's, is never found here). */
export async function vendorCoupon(scope: VendorCouponScope, id: number): Promise<MarketCoupon | null> {
  const found = Number.isInteger(id) && id > 0 ? await scope.store.getMarketCoupon(scope.appId, id) : null;
  return found && found.createdByVendorId === scope.vendor.id ? found : null;
}

export async function createVendorCoupon(scope: VendorCouponScope, form: Record<string, string>, now: Date): Promise<{ ok: true; coupon: MarketCoupon } | { ok: false; field: string; error: string }> {
  const [rules, catalog] = await Promise.all([vendorCouponRules(scope.store, scope.appId), vendorCatalogChoices(scope)]);
  const parsed = parseVendorCouponForm(form, { appId: scope.appId, vendor: scope.vendor, currency: scope.currency, now, rules, catalog });
  if (!parsed.ok) return parsed;
  const made = await scope.store.createMarketCoupon(parsed.value);
  if (!made) return { ok: false, field: "code", error: "This code is taken. Choose another." };
  return { ok: true, coupon: made };
}

/** Pause, start again or end one of the vendor's own; a coupon the owner paused stays paused. */
export async function setVendorCoupon(scope: VendorCouponScope, id: number, action: VendorCouponAction, now: Date): Promise<{ ok: true } | { ok: false; error: string }> {
  const coupon = await vendorCoupon(scope, id);
  if (!coupon) return { ok: false, error: "This offer isn't one of yours." };
  if (action === "resume") {
    if (coupon.ownerPaused) return { ok: false, error: "The app paused this offer. Ask the app to allow it again." };
    if (coupon.endsAt && coupon.endsAt <= now) return { ok: false, error: "This offer has ended. Make a new one." };
    if (!(await vendorCouponRules(scope.store, scope.appId)).enabled) return { ok: false, error: "The app doesn't let places make their own offers." };
  }
  const patch = action === "end" ? { active: false, endsAt: coupon.endsAt && coupon.endsAt < now ? coupon.endsAt : now, updatedAt: now } : { active: action === "resume", updatedAt: now };
  await scope.store.updateMarketCoupon(scope.appId, coupon.id, patch);
  return { ok: true };
}

/** The app's owner pauses a place's coupon, or allows it again (only coupons places made). */
export async function ownerPauseVendorCoupon(store: DataStore, appId: string, id: number, paused: boolean, now: Date): Promise<boolean> {
  const coupon = await store.getMarketCoupon(appId, id);
  if (!coupon || !coupon.createdByVendorId) return false;
  return store.updateMarketCoupon(appId, id, { ownerPaused: paused, updatedAt: now });
}
