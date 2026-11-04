import { createHash } from "node:crypto";
import type { DataStore } from "../data/store";
import type { DeliverySettings, MarketAppSettings, MarketCoupon, MarketOrderLine, Restaurant, ShipmentPlace } from "../data/types";
import { readPlace } from "../delivery/service";
import { EMPTY_MENU } from "../food/menu";
import { currencyDecimals, toMinor } from "./currency";
import { quoteMarketDelivery, vendorDelivery, type DeliveryQuote } from "./delivery";
import { priceOrder, type ClubBenefit, type Commission, type OrderMoney } from "./money";
import { bestAutomaticOffer, checkCoupon, clubBenefit, couponFromCode, type CouponCheck } from "./offers";
import { marketSettingsOf, marketCurrency } from "./settings";
import { assetUrl } from "../assets";
import { photosRequired } from "./photos";

/**
 * 115 A marketplace cart: read from the app (MarketCartInput), priced at
 * today's prices with every line of the price (lib/market/money.ts), the
 * vendor's delivery terms (delivery.ts), the coupon or the best automatic
 * offer, the club's benefit and the wallet (offers.ts). The quote's id keeps
 * its total: placing the order prices it again and refuses a changed total.
 */

export const QUOTE_MINUTES = 15;
export const MAX_LINES = 200;

export interface CartLine {
  productId: number;
  quantity: number;
  choices: number[];
  note: string | null;
  ifMissing: "similar" | "chosen" | "remove";
  substituteProductId: number | null;
}

export interface Cart {
  vendorId: number;
  lines: CartLine[];
  fulfilment: "delivery" | "pickup";
  dropoff: ShipmentPlace | null;
  scheduledFor: Date | null;
  couponCode: string | null;
  useWallet: boolean;
  /** Minor units. */
  tip: number;
}

export interface OrderRequest extends Cart {
  quoteId: string;
  payment: "cash" | "card" | "apple_pay" | "google_pay" | "wallet";
  notes: string | null;
}

type Read<T> = { ok: true; value: T } | { ok: false; error: string; field: string };

const bad = <T>(field: string, error: string): Read<T> => ({ ok: false, error, field });
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0 && v < 1e15;

export function readCart(value: unknown, currency: string): Read<Cart> {
  if (!value || typeof value !== "object") return bad("body", "Send the cart.");
  const b = value as Record<string, unknown>;
  if (!isInt(b.vendor_id)) return bad("vendor_id", "Choose a place to order from.");
  if (!Array.isArray(b.lines) || b.lines.length === 0) return bad("lines", "Your cart is empty.");
  if (b.lines.length > MAX_LINES) return bad("lines", `A cart holds up to ${MAX_LINES} items.`);
  const lines: CartLine[] = [];
  for (const [i, raw] of b.lines.entries()) {
    const l = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    if (!isInt(l.product_id)) return bad(`lines[${i}].product_id`, "One of the items isn't valid.");
    if (typeof l.quantity !== "number" || !Number.isFinite(l.quantity) || l.quantity <= 0 || l.quantity > 10_000) return bad(`lines[${i}].quantity`, "Choose how many.");
    const choices = l.choices === undefined || l.choices === null ? [] : l.choices;
    if (!Array.isArray(choices) || !choices.every(isInt) || choices.length > 50) return bad(`lines[${i}].choices`, "One of the choices isn't valid.");
    const note = typeof l.note === "string" ? l.note.trim().slice(0, 200) || null : null;
    const ifMissing = l.if_missing === undefined || l.if_missing === null ? "remove" : l.if_missing;
    if (ifMissing !== "similar" && ifMissing !== "chosen" && ifMissing !== "remove") return bad(`lines[${i}].if_missing`, "Choose what to do if it's out.");
    const substitute = l.substitute_product_id === undefined || l.substitute_product_id === null ? null : l.substitute_product_id;
    if (substitute !== null && !isInt(substitute)) return bad(`lines[${i}].substitute_product_id`, "Choose the item to bring instead.");
    if (ifMissing === "chosen" && substitute === null) return bad(`lines[${i}].substitute_product_id`, "Choose the item to bring instead.");
    lines.push({ productId: l.product_id, quantity: l.quantity, choices: [...new Set(choices as number[])], note, ifMissing, substituteProductId: ifMissing === "chosen" ? substitute : null });
  }
  if (b.fulfilment !== "delivery" && b.fulfilment !== "pickup") return bad("fulfilment", "Choose delivery or pick-up.");
  let dropoff: ShipmentPlace | null = null;
  if (b.fulfilment === "delivery") {
    const place = readPlace(b.dropoff, "dropoff");
    if (!place.ok) return bad("dropoff", place.error);
    dropoff = place.value;
  }
  let scheduledFor: Date | null = null;
  if (b.scheduled_for !== undefined && b.scheduled_for !== null) {
    const at = typeof b.scheduled_for === "string" ? new Date(b.scheduled_for) : null;
    if (!at || Number.isNaN(at.getTime())) return bad("scheduled_for", "Choose one of the times shown.");
    scheduledFor = at;
  }
  const couponCode = typeof b.coupon_code === "string" ? b.coupon_code.trim().toUpperCase().replace(/\s+/g, "").slice(0, 40) || null : null;
  let tip = 0;
  if (b.tip !== undefined && b.tip !== null) {
    const minor = typeof b.tip === "string" ? toMinor(b.tip, currencyDecimals(currency)) : null;
    if (minor === null || minor < 0) return bad("tip", "Enter the tip as an amount.");
    tip = minor;
  }
  return { ok: true, value: { vendorId: b.vendor_id, lines, fulfilment: b.fulfilment, dropoff, scheduledFor, couponCode, useWallet: b.use_wallet === true, tip } };
}

const PAYMENTS = ["cash", "card", "apple_pay", "google_pay", "wallet"] as const;

export function readOrderRequest(value: unknown, currency: string): Read<OrderRequest> {
  const cart = readCart(value, currency);
  if (!cart.ok) return cart;
  const b = value as Record<string, unknown>;
  if (typeof b.quote_id !== "string" || !b.quote_id || b.quote_id.length > 200) return bad("quote_id", "Check the price again before ordering.");
  if (!(PAYMENTS as readonly unknown[]).includes(b.payment)) return bad("payment", "Choose how to pay.");
  const notes = typeof b.notes === "string" ? b.notes.trim().slice(0, 300) || null : null;
  const details = b.dropoff_details && typeof b.dropoff_details === "object" ? (b.dropoff_details as Record<string, unknown>) : null;
  const extra = details ? [details.building, details.floor, details.apartment, details.landmark].filter((x): x is string => typeof x === "string" && !!x.trim()).join(", ") : "";
  const dropoff = cart.value.dropoff && extra ? { ...cart.value.dropoff, details: [cart.value.dropoff.details, extra].filter(Boolean).join(", ").slice(0, 300) } : cart.value.dropoff;
  return { ok: true, value: { ...cart.value, dropoff, quoteId: b.quote_id, payment: b.payment as OrderRequest["payment"], notes } };
}

export type PriceRefusal = { status: number; code: string; error: string; field: string | null };

export interface PricedCart {
  vendor: Restaurant;
  lines: MarketOrderLine[];
  money: OrderMoney;
  delivery: Extract<DeliveryQuote, { ok: true }>;
  coupon: { record: MarketCoupon; title: string; code: string | null } | null;
  /** The coupon the customer typed was refused: the quote still prices without it. */
  couponRefused: string | null;
  club: ClubBenefit | null;
  walletBalance: number;
  currency: string;
  settings: MarketAppSettings;
  warnings: string[];
}

function onStep(quantity: number, step: number): boolean {
  if (step <= 0) return true;
  const n = quantity / step;
  return Math.abs(n - Math.round(n)) < 1e-6;
}

/** The vendor's commission: a fixed amount per order, or its percentage. */
export function commissionOfVendor(v: Pick<Restaurant, "commissionBp" | "commissionFixed">): Commission {
  return v.commissionFixed !== null && v.commissionFixed !== undefined ? { kind: "fixed", value: v.commissionFixed } : { kind: "percent", value: v.commissionBp / 100 };
}

/** The cart's lines at today's prices: dishes from the menu (restaurants), products from the catalog (groceries and shops). */
async function priceLines(store: DataStore, appId: string, vendor: Restaurant, cart: Cart, needPhoto: boolean): Promise<{ ok: true; lines: MarketOrderLine[]; departments: (number | null)[]; weighed: boolean } | { ok: false; refusal: PriceRefusal }> {
  const lines: MarketOrderLine[] = [];
  const departments: (number | null)[] = [];
  let weighed = false;
  const refuse = (status: number, code: string, error: string, field: string) => ({ ok: false as const, refusal: { status, code, error, field } });
  if ((vendor.kind ?? "restaurant") === "restaurant") {
    const menu = (await store.getRestaurantMenu(appId, vendor.id)) ?? EMPTY_MENU;
    for (const [i, l] of cart.lines.entries()) {
      const field = `lines[${i}]`;
      const dish = menu.sections.flatMap((s) => s.dishes).find((d) => d.id === l.productId);
      // 115 A dish without its photo isn't shown to customers while photos are required, so it can't be ordered either.
      if (!dish || (needPhoto && !dish.imageAssetId)) return refuse(409, "invalid_request", "One of the dishes isn't on the menu any more. Refresh the menu.", field);
      if (!dish.available) return refuse(409, "unavailable_item", `${dish.name} is sold out for now.`, field);
      if (!Number.isInteger(l.quantity)) return refuse(400, "invalid_request", "Choose how many.", field);
      const names: string[] = [];
      let extra = 0;
      for (const id of l.choices) {
        const group = dish.choiceGroups.find((g) => g.choices.some((c) => c.id === id));
        const choice = group?.choices.find((c) => c.id === id);
        if (!group || !choice) return refuse(409, "invalid_request", `One of the choices for ${dish.name} isn't offered any more.`, field);
        if (!choice.available) return refuse(409, "unavailable_item", `${choice.name} is sold out for now.`, field);
        names.push(choice.name);
        extra += choice.extraCents;
      }
      for (const g of dish.choiceGroups) {
        const picked = g.choices.filter((c) => l.choices.includes(c.id)).length;
        if (picked < g.min) return refuse(400, "invalid_request", `Choose ${g.name.toLowerCase()} for ${dish.name}.`, field);
        if (picked > g.max) return refuse(400, "invalid_request", `Choose up to ${g.max} for ${g.name.toLowerCase()}.`, field);
      }
      const unit = dish.priceCents + extra;
      lines.push({
        id: i + 1, productId: dish.id, name: dish.name, imageUrl: dish.imageAssetId ? assetUrl(dish.imageAssetId) : null, quantity: l.quantity, unit: "item", choices: names, note: l.note, unitPrice: unit, wasUnitPrice: null,
        total: Math.round(unit * l.quantity), ifMissing: "remove", substituteProductId: null, outcome: null, pickedQuantity: null, substitute: null,
      });
      departments.push(null);
    }
    return { ok: true, lines, departments, weighed };
  }
  for (const [i, l] of cart.lines.entries()) {
    const field = `lines[${i}]`;
    const p = await store.getMarketProduct(appId, l.productId);
    if (!p || p.vendorId !== vendor.id || (needPhoto && !p.imageAssetId)) return refuse(409, "invalid_request", "One of the items isn't sold here any more. Refresh the list.", field);
    if (!p.inStock || (p.stock !== null && p.stock <= 0)) return refuse(409, "unavailable_item", `${p.name} is out of stock.`, field);
    if (!onStep(l.quantity, p.step)) return refuse(400, "invalid_request", `${p.name} is sold in steps of ${p.step}.`, field);
    if (p.maxQuantity !== null && l.quantity > p.maxQuantity) return refuse(409, "too_many", `You can order up to ${p.maxQuantity} of ${p.name}.`, field);
    if (p.unit === "item" && p.stock !== null && l.quantity > p.stock) return refuse(409, "too_many", `Only ${p.stock} of ${p.name} left.`, field);
    if (l.substituteProductId !== null) {
      const sub = await store.getMarketProduct(appId, l.substituteProductId);
      if (!sub || sub.vendorId !== vendor.id) return refuse(400, "invalid_request", "Choose the item to bring instead from this place.", `${field}.substitute_product_id`);
    }
    if (p.unit !== "item") weighed = true;
    lines.push({
      id: i + 1, productId: p.id, name: p.name, imageUrl: p.imageAssetId ? assetUrl(p.imageAssetId) : null, quantity: l.quantity, unit: p.unit, choices: [], note: l.note, unitPrice: p.price,
      wasUnitPrice: p.wasPrice !== null && p.wasPrice > p.price ? p.wasPrice : null, total: Math.round(p.price * l.quantity + 1e-9),
      ifMissing: l.ifMissing, substituteProductId: l.substituteProductId, outcome: null, pickedQuantity: null, substitute: null,
    });
    departments.push(p.departmentId);
  }
  return { ok: true, lines, departments, weighed };
}

const REFUSAL_STATUS: Record<string, [number, string]> = {
  closed: [409, "vendor_closed"],
  below_min_order: [409, "below_minimum"],
  too_few_items: [409, "too_few_items"],
  too_many_items: [409, "too_many_items"],
  outside_area: [400, "outside_delivery_area"],
  needs_location: [400, "invalid_request"],
  no_pickup: [409, "no_pickup"],
  no_scheduling: [409, "no_scheduling"],
  bad_time: [400, "invalid_request"],
};

/** The whole cart priced, or why it can't be ordered. */
export async function priceMarketCart(
  store: DataStore,
  input: { appId: string; delivery: DeliverySettings; cart: Cart; userId: number | null; now: Date },
): Promise<{ ok: true; priced: PricedCart } | { ok: false; refusal: PriceRefusal }> {
  const { appId, delivery, cart, userId, now } = input;
  const settings = marketSettingsOf(delivery);
  const currency = marketCurrency(delivery);
  const vendor = await store.getRestaurant(appId, cart.vendorId);
  if (!vendor || !vendor.active) return { ok: false, refusal: { status: 404, code: "not_found", error: "This place isn't in the app any more.", field: "vendor_id" } };
  if (cart.fulfilment === "pickup" && !settings.pickup) return { ok: false, refusal: { status: 409, code: "no_pickup", error: "This app doesn't do pick-up.", field: "fulfilment" } };
  if (cart.scheduledFor) {
    if (!settings.scheduling.enabled) return { ok: false, refusal: { status: 409, code: "no_scheduling", error: "This app doesn't take orders for later.", field: "scheduled_for" } };
    if (cart.scheduledFor.getTime() > now.getTime() + (settings.scheduling.daysAhead + 1) * 86_400_000) {
      return { ok: false, refusal: { status: 400, code: "invalid_request", error: "Choose one of the times shown.", field: "scheduled_for" } };
    }
  }
  const lined = await priceLines(store, appId, vendor, cart, photosRequired(settings));
  if (!lined.ok) return lined;
  const itemsTotal = lined.lines.reduce((s, l) => s + l.total, 0);
  const itemCount = lined.lines.reduce((s, l) => s + (l.unit === "item" ? l.quantity : 1), 0);
  const quote = quoteMarketDelivery(delivery, vendor, { fulfilment: cart.fulfilment, dropoff: cart.dropoff, items: itemsTotal, itemCount, scheduledFor: cart.scheduledFor }, now);
  if (!quote.ok) {
    const [status, code] = REFUSAL_STATUS[quote.refusal] ?? [400, "invalid_request"];
    return { ok: false, refusal: { status, code, error: quote.error, field: quote.field } };
  }

  // The coupon typed, or else the best automatic offer.
  const byDepartment = new Map<number | null, number>();
  lined.lines.forEach((l, i) => byDepartment.set(lined.departments[i] ?? null, (byDepartment.get(lined.departments[i] ?? null) ?? 0) + l.total));
  const firstOrder = userId === null ? false : (await store.listMarketOrders({ appId, userId, statuses: ["delivered", "picked_up"], limit: 1, offset: 0 })).total === 0;
  const ctx = { now, vendorId: vendor.id, vendorKind: vendor.kind ?? "restaurant", lines: [...byDepartment].map(([departmentId, total]) => ({ departmentId, total })), userId, firstOrder } as const;
  let coupon: PricedCart["coupon"] = null;
  let couponCheck: Extract<CouponCheck, { ok: true }> | null = null;
  let couponRefused: string | null = null;
  if (cart.couponCode) {
    const found = await couponFromCode(store, appId, cart.couponCode, ctx);
    if (found.ok && found.record) {
      coupon = { record: found.record, title: found.record.title, code: found.record.code };
      couponCheck = found;
    } else if (!found.ok) couponRefused = found.error;
  }
  if (!coupon) {
    const best = await bestAutomaticOffer(store, appId, ctx, quote.fee);
    if (best) {
      coupon = { record: best.record, title: best.record.title, code: null };
      couponCheck = best.check;
    }
  }

  // The club's benefit, for members.
  let club: ClubBenefit | null = null;
  if (userId !== null && settings.club) {
    const member = await store.getMarketClubMember(appId, userId);
    const plan = member?.planId ? await store.getMarketClubPlan(appId, member.planId) : null;
    club = clubBenefit(member, plan, now);
  }

  const walletBalance = userId !== null && settings.wallet ? await store.walletBalance(appId, userId) : 0;
  const taxRate = vendor.taxRateBp !== null && vendor.taxRateBp !== undefined ? vendor.taxRateBp / 100 : settings.tax.ratePercent;
  const money = priceOrder({
    items: lined.lines.map((l) => ({ unitPrice: l.unitPrice, wasUnitPrice: l.wasUnitPrice, quantity: l.quantity })),
    deliveryFee: quote.fee,
    deliveryBy: quote.by,
    commission: commissionOfVendor(vendor),
    coupon: couponCheck ? couponCheck.coupon : null,
    club,
    tax: taxRate > 0 ? { ratePercent: taxRate, included: settings.tax.included, onDelivery: settings.tax.onDelivery, label: settings.tax.label } : null,
    tip: quote.by === "app" ? cart.tip : 0,
    wallet: cart.useWallet ? walletBalance : 0,
    // Who holds the money is known once the payment is chosen; the quote assumes online.
    collectedBy: "owner",
    courierCharge: quote.courierCharge,
  });
  const warnings: string[] = [];
  if (lined.weighed) warnings.push(`Items sold by weight are weighed when picked: the price can change a little, never by more than ${settings.weightTolerancePercent}%.`);
  if (couponRefused) warnings.push(couponRefused);
  if (cart.tip > 0 && quote.by !== "app") warnings.push("Tips are for the app's couriers.");
  return { ok: true, priced: { vendor, lines: lined.lines, money, delivery: quote, coupon, couponRefused, club, walletBalance, currency, settings, warnings } };
}

/** Prices the order again once the payment is chosen, with who then holds the customer's money. */
export function repriceFor(priced: PricedCart, cart: Cart, collectedBy: "owner" | "vendor"): OrderMoney {
  const taxRate = priced.vendor.taxRateBp !== null && priced.vendor.taxRateBp !== undefined ? priced.vendor.taxRateBp / 100 : priced.settings.tax.ratePercent;
  return priceOrder({
    items: priced.lines.map((l) => ({ unitPrice: l.unitPrice, wasUnitPrice: l.wasUnitPrice, quantity: l.quantity })),
    deliveryFee: priced.delivery.fee,
    deliveryBy: priced.delivery.by,
    commission: commissionOfVendor(priced.vendor),
    coupon: priced.coupon ? checkCouponOf(priced) : null,
    club: priced.club,
    tax: taxRate > 0 ? { ratePercent: taxRate, included: priced.settings.tax.included, onDelivery: priced.settings.tax.onDelivery, label: priced.settings.tax.label } : null,
    tip: priced.delivery.by === "app" ? cart.tip : 0,
    wallet: cart.useWallet ? priced.walletBalance : 0,
    collectedBy,
    courierCharge: priced.delivery.courierCharge,
  });
}

function checkCouponOf(priced: PricedCart) {
  const c = priced.coupon!.record;
  return { kind: c.kind, value: c.value, maxDiscount: c.maxDiscount, funder: c.paidBy, code: c.code };
}

/** The quote's id: its expiry and a digest of what was priced. Placing the order checks the total is still the same. */
export function quoteIdOf(appId: string, cart: Cart, total: number, expiresAt: Date): string {
  const digest = createHash("sha256")
    .update(JSON.stringify([appId, cart.vendorId, cart.lines, cart.fulfilment, cart.dropoff?.lat ?? null, cart.dropoff?.lng ?? null, cart.scheduledFor?.toISOString() ?? null, cart.couponCode, cart.useWallet, cart.tip, total, expiresAt.getTime()]))
    .digest("base64url")
    .slice(0, 32);
  return `${expiresAt.getTime().toString(36)}.${digest}`;
}

/** Whether the quote id still holds for this cart and total. */
export function quoteHolds(quoteId: string, appId: string, cart: Cart, total: number, now: Date): "ok" | "expired" | "changed" {
  const [stamp] = quoteId.split(".");
  const expires = Number.parseInt(stamp ?? "", 36);
  if (!Number.isFinite(expires)) return "changed";
  if (expires <= now.getTime()) return "expired";
  return quoteIdOf(appId, cart, total, new Date(expires)) === quoteId ? "ok" : "changed";
}

/** What a cart's vendor allows, for callers that only need its terms. */
export { vendorDelivery, checkCoupon };
