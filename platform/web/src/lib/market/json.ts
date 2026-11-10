import type {
  DeliverySettings,
  Dish,
  MarketClubMember,
  MarketClubPlan,
  MarketComplaint,
  MarketCoupon,
  MarketOrder,
  MarketOrderLine,
  MarketProduct,
  Restaurant,
  RestaurantMenu,
  VendorRole,
  WalletEntry,
} from "../data/types";
import { restaurantRating } from "../food/service";
import { currencyDecimals, formatMinor, fromMinor } from "./currency";
import { vendorDelivery } from "./delivery";
import { productPhotos } from "./photos";
import type { OrderMoney, PriceLineKind } from "./money";
import type { Statement } from "./statement";

/**
 * 115 The marketplace's JSON, as the contract writes it (docs/api/openapi.yaml,
 * the Market and Vendor tags). Customers never get a vendor's phone, email or
 * exact address (only its district, and its place for pick-up orders);
 * vendors never get a customer's phone or email, only the first name, and the
 * drop-off only when they deliver themselves.
 */

type AssetUrl = (assetId: string) => string;

/** `Money`: the amount with the currency's decimals, and written out. */
export function money(minor: number, currency: string) {
  return { amount: fromMinor(minor, currencyDecimals(currency)), formatted: formatMinor(minor, currency) };
}

export function moneyOrNull(minor: number | null | undefined, currency: string) {
  return minor === null || minor === undefined ? null : money(minor, currency);
}

const PRICE_LABELS: Record<PriceLineKind, string> = {
  items: "Items",
  item_discounts: "Discounts",
  coupon: "Coupon",
  club: "Club",
  delivery: "Delivery",
  delivery_discount: "Delivery discount",
  tax: "Tax",
  tip: "Tip",
  wallet: "Wallet",
  total: "Total",
};

/** Every line of the price, in order, ending with the total. */
export function priceLinesJson(m: OrderMoney, currency: string, taxLabel: string) {
  return m.lines.map((l) => ({ kind: l.kind, label: l.kind === "tax" ? taxLabel : PRICE_LABELS[l.kind], amount: money(l.amount, currency) }));
}

/** What the vendor card and the order show of where the customer stands with it. */
export interface VendorNear {
  open: boolean;
  opensAt: Date | null;
  busy: boolean;
  distanceKm: number | null;
  delivers: boolean | null;
  deliveryFee: number | null;
  minutes: number | null;
  offer: string | null;
  clubBenefit: string | null;
}

export function vendorSummaryJson(v: Restaurant, near: VendorNear, currency: string, assetUrl: AssetUrl) {
  const terms = vendorDelivery(v);
  const rating = restaurantRating(v);
  return {
    id: v.id,
    kind: v.kind ?? "restaurant",
    name: v.name,
    logo_url: v.logoAssetId ? assetUrl(v.logoAssetId) : null,
    cover_url: v.coverAssetId ? assetUrl(v.coverAssetId) : null,
    categories: v.cuisines,
    rating,
    ratings_count: v.ratingCount,
    open: near.open,
    opens_at: near.opensAt ? near.opensAt.toISOString() : null,
    busy: near.busy,
    delivery_by: terms.by,
    // 115 Outside the delivery area: no time and no fee.
    delivery_minutes: near.minutes === null || near.delivers === false ? null : { min: Math.max(5, near.minutes - 5), max: near.minutes + 10 },
    delivery_fee: near.delivers === false ? null : moneyOrNull(near.deliveryFee, currency),
    free_delivery_over: terms.by === "vendor" ? moneyOrNull(terms.freeOver, currency) : null,
    min_order: v.minOrderCents > 0 ? money(v.minOrderCents, currency) : null,
    distance_km: near.distanceKm,
    delivers: near.delivers,
    pickup: terms.pickup,
    scheduling: terms.scheduling,
    offer: near.offer,
    club_benefit: near.clubBenefit,
  };
}

const TAGS = new Set(["spicy", "vegetarian", "vegan", "new", "popular", "organic", "frozen", "age_restricted"]);

export function productJson(p: MarketProduct, currency: string, assetUrl: AssetUrl) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    // 115 Uploaded photos only: a picture link from an import is fetched into a photo first (lib/market/photos.ts).
    image_url: p.imageAssetId ? assetUrl(p.imageAssetId) : null,
    images: productPhotos(p).map(assetUrl),
    brand: p.brand,
    price: money(p.price, currency),
    was_price: p.wasPrice !== null && p.wasPrice > p.price ? money(p.wasPrice, currency) : null,
    unit: p.unit,
    step: p.step,
    max_quantity: p.maxQuantity,
    in_stock: p.inStock && (p.stock === null || p.stock > 0),
    choices: [],
    tags: p.tags.filter((t) => TAGS.has(t)),
  };
}

/** A restaurant's dish as a product: sold by the item, with its choices. */
export function dishJson(d: Dish, currency: string, assetUrl: AssetUrl) {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    image_url: d.imageAssetId ? assetUrl(d.imageAssetId) : null,
    images: d.imageAssetId ? [assetUrl(d.imageAssetId)] : [],
    brand: null,
    price: money(d.priceCents, currency),
    was_price: null,
    unit: "item" as const,
    step: 1,
    max_quantity: null,
    in_stock: d.available,
    choices: d.choiceGroups.map((g) => ({
      id: g.id,
      name: g.name,
      min: g.min,
      max: g.max,
      choices: g.choices.map((c) => ({
        id: c.id,
        name: c.name,
        extra: fromMinor(c.extraCents, currencyDecimals(currency)),
        extra_formatted: c.extraCents > 0 ? `+${formatMinor(c.extraCents, currency)}` : null,
        available: c.available,
      })),
    })),
    tags: d.popular ? ["popular"] : [],
  };
}

export function couponJson(c: MarketCoupon, currency: string) {
  return {
    id: c.id,
    title: c.title,
    description: null,
    code: c.code,
    vendor_id: c.vendorIds.length === 1 ? c.vendorIds[0]! : null,
    kind: c.kind,
    value: c.kind === "percent" ? String(c.value) : c.kind === "amount" ? fromMinor(c.value, currencyDecimals(currency)) : null,
    min_order: c.minOrder > 0 ? money(c.minOrder, currency) : null,
    ends_at: c.endsAt ? c.endsAt.toISOString() : null,
    first_order_only: c.firstOrderOnly,
  };
}

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function vendorJson(
  v: Restaurant,
  near: VendorNear,
  input: {
    currency: string;
    menu: RestaurantMenu | null;
    departments: { id: number; name: string; imageAssetId: string | null; aisles: { id: number; name: string }[] }[];
    offers: MarketCoupon[];
    pickupOrder: boolean;
  },
  assetUrl: AssetUrl,
) {
  const terms = vendorDelivery(v);
  const kind = v.kind ?? "restaurant";
  return {
    ...vendorSummaryJson(v, near, input.currency, assetUrl),
    description: v.description,
    area: v.area ?? null,
    hours: [...v.hours].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day)).map((h) => ({ day: h.day, opens: h.opens, closes: h.closes })),
    quantity: { min_items: terms.minItems, max_items: terms.maxItems },
    tax_rate_percent: v.taxRateBp === null || v.taxRateBp === undefined ? null : v.taxRateBp / 100,
    sections:
      kind === "restaurant" && input.menu
        ? input.menu.sections.filter((s) => s.dishes.length).map((s) => ({ id: s.id, name: s.name, items: s.dishes.map((d) => dishJson(d, input.currency, assetUrl)) }))
        : [],
    departments:
      kind === "restaurant"
        ? []
        : input.departments.map((d) => ({ id: d.id, name: d.name, image_url: d.imageAssetId ? assetUrl(d.imageAssetId) : null, aisles: d.aisles })),
    offers: input.offers.map((c) => couponJson(c, input.currency)),
  };
}

export function orderLineJson(l: MarketOrderLine, currency: string) {
  return {
    id: l.id,
    product_id: l.productId,
    name: l.name,
    image_url: l.imageUrl,
    quantity: l.quantity,
    unit: l.unit,
    choices: l.choices,
    note: l.note,
    unit_price: money(l.unitPrice, currency),
    before_discount: l.wasUnitPrice !== null && l.wasUnitPrice > l.unitPrice ? money(Math.round(l.wasUnitPrice * l.quantity), currency) : null,
    total: money(l.total, currency),
    if_missing: l.ifMissing,
    outcome: l.outcome,
    picked_quantity: l.pickedQuantity,
    substitute: l.substitute ? { product_id: l.substitute.productId, name: l.substitute.name, quantity: l.substitute.quantity, total: money(l.substitute.total, currency) } : null,
  };
}

export function marketOrderReference(order: Pick<MarketOrder, "id">): string {
  return `M-${1000 + order.id}`;
}

/** A customer's tracking, while the order is on its way. */
export interface Tracking {
  mode: "map" | "stages";
  courier: { name: string; photoUrl: string | null; vehicle: string | null } | null;
  position: { lat: number; lng: number } | null;
  updatedAt: Date | null;
}

export function customerOrderJson(
  o: MarketOrder,
  input: { vendor: ReturnType<typeof vendorSummaryJson>; taxLabel: string; tracking: Tracking | null; canCancel: boolean; canComplain: boolean; complaintId: number | null; eta: Date | null },
) {
  const c = o.currency;
  return {
    id: o.id,
    reference: marketOrderReference(o),
    vendor: input.vendor,
    status: o.status,
    fulfilment: o.fulfilment,
    scheduled_for: o.scheduledFor ? o.scheduledFor.toISOString() : null,
    lines: o.lines.map((l) => orderLineJson(l, c)),
    price: priceLinesJson(o.money, c, input.taxLabel),
    total: money(o.money.total, c),
    payment: { method: o.paymentMethod, status: o.paymentStatus, wallet_used: o.money.wallet > 0 ? money(o.money.wallet, c) : null },
    delivery_by: o.fulfilment === "pickup" ? null : o.deliveryBy,
    ready_at: o.readyAt ? o.readyAt.toISOString() : null,
    eta: input.eta ? input.eta.toISOString() : null,
    pickup_code: o.fulfilment === "pickup" ? o.pickupCode : null,
    tracking: input.tracking
      ? {
          mode: input.tracking.mode,
          courier: input.tracking.courier ? { name: input.tracking.courier.name, photo_url: input.tracking.courier.photoUrl, vehicle: input.tracking.courier.vehicle } : null,
          position: input.tracking.position,
          updated_at: input.tracking.updatedAt ? input.tracking.updatedAt.toISOString() : null,
          route: [],
        }
      : null,
    rating: o.rating ? { vendor: o.rating.vendor, courier: o.rating.courier } : null,
    can_cancel: input.canCancel,
    can_complain: input.canComplain,
    complaint_id: input.complaintId,
    created_at: o.createdAt.toISOString(),
    timeline: o.timeline.map((s) => ({ status: s.status, at: s.at })),
  };
}

/** The customer's first name only: what a vendor sees of them. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0]?.slice(0, 40) || "Customer";
}

export function vendorOrderJson(o: MarketOrder, input: { courierName: string | null; collect: number | null }) {
  const c = o.currency;
  const ownDriver = o.fulfilment === "delivery" && o.deliveryBy === "vendor";
  return {
    id: o.id,
    reference: marketOrderReference(o),
    status: o.status,
    fulfilment: o.fulfilment,
    scheduled_for: o.scheduledFor ? o.scheduledFor.toISOString() : null,
    lines: o.lines.map((l) => orderLineJson(l, c)),
    subtotal: money(o.money.items, c),
    customer: { first_name: firstName(o.customerName) },
    notes: o.notes,
    dropoff: ownDriver && o.dropoff ? { address: o.dropoff.address, details: o.dropoff.details, lat: o.dropoff.lat, lng: o.dropoff.lng, notes: o.notes } : null,
    payment: { method: o.paymentMethod, status: o.paymentStatus, collect: moneyOrNull(input.collect, c) },
    prep_minutes: o.prepMinutes,
    ready_at: o.readyAt ? o.readyAt.toISOString() : null,
    courier: input.courierName ? { name: firstName(input.courierName) } : null,
    created_at: o.createdAt.toISOString(),
    timeline: o.timeline.map((s) => ({ status: s.status, at: s.at })),
  };
}

export function complaintReference(c: Pick<MarketComplaint, "id">): string {
  return `C-${100 + c.id}`;
}

/** A complaint as its customer sees it: never the team's notes, nor who on the team wrote. */
export function complaintJson(c: MarketComplaint, currency: string, assetUrl: AssetUrl) {
  return {
    id: c.id,
    reference: complaintReference(c),
    order_id: c.orderId,
    reason: c.reason,
    status: c.status,
    text: c.text,
    line_ids: c.lineIds,
    photos: c.photoAssetIds.map((id, i) => ({ id: i + 1, url: assetUrl(id) })),
    messages: c.messages.map((m) => ({ id: m.id, from: m.from, text: m.text, at: m.at })),
    decision: c.decision
      ? {
          outcome: c.decision.outcome,
          amount: moneyOrNull(c.decision.amount, currency),
          to: c.decision.to,
          coupon_code: c.decision.couponCode,
          reason: c.decision.reason,
          at: c.decision.at.toISOString(),
        }
      : null,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

export function walletJson(balance: number, entries: WalletEntry[], currency: string, page: number, totalPages: number) {
  return {
    balance: money(balance, currency),
    entries: entries.map((e) => ({ id: e.id, kind: e.kind, amount: money(e.amount, currency), label: e.label, order_id: e.orderId, at: e.createdAt.toISOString() })),
    page,
    total_pages: totalPages,
  };
}

/** The plan's benefits in words, written from its numbers: Yallapp writes no prices of its own. */
export function clubBenefits(plan: MarketClubPlan): string[] {
  const out: string[] = [];
  if (plan.freeDeliveryOver !== null) out.push(plan.freeDeliveryOver === 0 ? "Free delivery on every order" : `Free delivery on orders over ${formatMinor(plan.freeDeliveryOver, plan.currency)}`);
  else if (plan.deliveryDiscountPercent) out.push(`${plan.deliveryDiscountPercent}% off delivery`);
  return [...out, ...plan.perks];
}

export function clubPlanJson(plan: MarketClubPlan) {
  return { id: plan.id, name: plan.name, period: plan.period, price: money(plan.price, plan.currency), benefits: clubBenefits(plan) };
}

const MEMBER_STATUS: Record<MarketClubMember["status"], "awaiting_payment" | "active" | "ending" | "ended"> = {
  pending: "awaiting_payment",
  active: "active",
  cancelled: "ending",
  expired: "ended",
};

export function membershipJson(member: MarketClubMember | null, plan: MarketClubPlan | null, currency: string) {
  if (!member || !plan) return null;
  return {
    plan: clubPlanJson(plan),
    status: MEMBER_STATUS[member.status],
    renews: member.renews && member.status === "active",
    current_period_end: member.paidUntil ? member.paidUntil.toISOString() : null,
    saved: money(member.saved, currency),
  };
}

export function deskJson(
  v: Restaurant,
  input: { role: VendorRole; inHours: boolean; busy: boolean; accepting: boolean; orders: number; sales: number; newOrders: number; currency: string },
  assetUrl: AssetUrl,
) {
  return {
    id: v.id,
    kind: v.kind ?? "restaurant",
    name: v.name,
    logo_url: v.logoAssetId ? assetUrl(v.logoAssetId) : null,
    open: input.inHours,
    busy_until: input.busy && v.busyUntil ? v.busyUntil.toISOString() : null,
    paused: v.paused ?? false,
    accepting: input.accepting,
    delivery_by: vendorDelivery(v).by,
    role: input.role,
    today: { orders: input.orders, sales: money(input.sales, input.currency), new_orders: input.newOrders },
  };
}

/** The delivery settings' currency for a marketplace, for callers that only have them. */
export type MarketDelivery = Pick<DeliverySettings, "currency" | "marketApp">;

/** 115.16 A vendor's statement for its app: every total as `Money`, its orders and the refunds and compensations after them. */
export function vendorStatementJson(s: Statement, month: string) {
  const c = s.currency;
  const totals = Object.fromEntries(
    Object.entries(s.totals).map(([key, value]) => [key.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`), key === "orders" ? value : money(value, c)]),
  );
  return {
    month,
    from: s.from.toISOString(),
    to: s.to.toISOString(),
    currency: c,
    totals,
    orders: s.orders.map((o) => ({ id: o.id, reference: o.reference, at: o.at.toISOString(), payment: o.payment, total: money(o.money.total, c), vendor_earns: money(o.money.split.vendorEarns, c), commission: money(o.money.split.commission, c), due_to_vendor: money(o.money.split.dueToVendor, c) })),
    adjustments: s.adjustments.map((a) => ({ order_id: a.orderId, reference: a.reference, at: a.at.toISOString(), kind: a.kind, amount: money(a.amount, c), funder: a.funder })),
  };
}

/** 115.16 A complaint as the vendor reads it: what was wrong and the decision, never anyone's contact, the conversation or the team's notes. */
export function vendorComplaintJson(c: MarketComplaint, currency: string, assetUrl: AssetUrl) {
  return {
    id: c.id,
    reference: complaintReference(c),
    order_id: c.orderId,
    order_reference: marketOrderReference({ id: c.orderId }),
    reason: c.reason,
    status: c.status,
    text: c.text,
    line_ids: c.lineIds,
    photos: c.photoAssetIds.map((id, i) => ({ id: i + 1, url: assetUrl(id) })),
    decision: c.decision ? { outcome: c.decision.outcome, amount: moneyOrNull(c.decision.amount, currency), funder: c.decision.funder, at: c.decision.at.toISOString() } : null,
    created_at: c.createdAt.toISOString(),
  };
}
