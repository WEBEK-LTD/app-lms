import { catalogSettings } from "../catalog/settings";
import { couponDiscount } from "../catalog/coupons";
import { formatCents, centsToDecimal } from "../catalog/money";
import type { DataStore } from "../data/store";
import type { App, CatalogCoupon, CatalogCurrency, OrderDelivery, StoreFlashSale } from "../data/types";
import { error, intParam } from "../hosted/connectors/common";
import type { Connector, ConnectorRequest, ConnectorResult } from "../hosted/connectors/types";
import { checkoutLookOf } from "../studio/checkout-look";
import { checkDelivery, deliveryConfigJson, deliveryOf, deliverySlotsJson, slotLabel, type SlotCounts } from "./delivery";
import { flashSaleJson, listedSales, withSale } from "./flash-sales";
import { giftMessagesJson, giftOccasionsOf } from "./gift-messages";
import { checkGift, checkoutModeOf, deliveryAttributes, deliveryNote, giftConfigJson, giftsOf, hasDeliveryDetails, type CheckoutMode } from "./gifts";
import { breakdownJson, needsPlace, placeOf, quoteShipping, SHIPPING_COUNTRIES, shippingRulesOf, type ShippingQuote } from "./shipping";

/**
 * 131 What every store app gets beside its products, wherever they come
 * from: the delivery day and slot, the gift details and the gift checkout,
 * the card messages, where it delivers and what shipping costs, flash sales
 * and the coupons shown in the app. Its own products (no website) use these
 * in their own checkout (lib/hosted/connectors/catalog.ts); a connected
 * platform gets them through `withStoreExtras`.
 */

export interface StoreExtrasDeps {
  store: DataStore;
  app: App;
}

/** The checkout the app shows (the store's setting, or the flower shop's look in Studio). */
export function checkoutModeOfApp(app: App): CheckoutMode {
  return checkoutModeOf(giftsOf(app), checkoutLookOf(app));
}

/**
 * `StoreConfig`'s parts for these (merged over the source's own): `fees`
 * whether the slot's and shipping's fees are charged (Yallapp's checkout).
 */
export function storeExtrasConfig(app: App, currency: string, opts: { fees: boolean }) {
  const mode = checkoutModeOfApp(app);
  const rules = shippingRulesOf(catalogSettings(app));
  return {
    checkout_mode: mode,
    delivery_date: deliveryConfigJson(deliveryOf(app, mode === "gift"), currency, opts.fees),
    gift_message: giftConfigJson(giftsOf(app), mode),
    ...(needsPlace(rules)
      ? {
          shipping: {
            mode: rules.mode,
            countries: rules.areas.map((a) => ({ code: a.country, names: SHIPPING_COUNTRIES[a.country] ?? { en: a.country }, cities: a.cities })),
            needs_location: rules.mode === "distance",
            charged: opts.fees,
            free_over: rules.freeOverCents !== null ? centsToDecimal(rules.freeOverCents) : null,
            free_over_formatted: rules.freeOverCents !== null ? formatCents(rules.freeOverCents, currency as CatalogCurrency) : null,
            max_km: rules.mode === "distance" ? (rules.distance?.maxKm ?? null) : null,
          },
        }
      : {}),
  };
}

/** A coupon the app may show: shown in the app, on, started, not ended or used up. */
export function couponShown(c: CatalogCoupon, now: Date): boolean {
  return c.public === true && c.active && (!c.startsAt || c.startsAt.getTime() <= now.getTime()) && (!c.endsAt || c.endsAt.getTime() > now.getTime()) && (c.maxUses === null || c.usedCount < c.maxUses);
}

/** `PublicCoupon` in the contract. */
export function publicCouponJson(c: CatalogCoupon, currency: string) {
  const money = (cents: number) => formatCents(cents, currency as CatalogCurrency);
  return {
    code: c.code,
    kind: c.kind,
    percent_off: c.kind === "percent" ? c.value : null,
    amount_off: c.kind === "amount" ? centsToDecimal(c.value) : null,
    amount_off_formatted: c.kind === "amount" ? money(c.value) : null,
    min_order: c.minOrderCents !== null ? centsToDecimal(c.minOrderCents) : null,
    min_order_formatted: c.minOrderCents !== null ? money(c.minOrderCents) : null,
    starts_at: c.startsAt ? c.startsAt.toISOString() : null,
    ends_at: c.endsAt ? c.endsAt.toISOString() : null,
    remaining: c.maxUses !== null ? Math.max(0, c.maxUses - c.usedCount) : null,
  };
}

export { couponDiscount };

/** Loads a source's products by id, as the app gets them (summaries). */
export type ProductsLoader = (ids: number[], categoryId: number | null) => Promise<{ id: number; price?: unknown; categories?: { id: number }[] }[]>;

/**
 * The routes these add: `GET /store/delivery-slots`, `GET /store/gift-messages`,
 * `GET /store/coupons` and `GET /store/flash-sales`; null for any other.
 */
export async function handleStoreExtras(
  deps: StoreExtrasDeps & { currency: string; fees: boolean; counts: (date: string) => Promise<SlotCounts>; products: ProductsLoader; sales?: StoreFlashSale[] },
  request: ConnectorRequest,
): Promise<ConnectorResult | null> {
  if (request.method !== "GET" || request.path[0] !== "store" || request.path.length !== 2) return null;
  const { app, store } = deps;
  switch (request.path[1]) {
    case "delivery-slots": {
      const delivery = deliveryOf(app, checkoutModeOfApp(app) === "gift");
      if (!delivery) return error(404, "not_found", "This shop has no delivery days.");
      const date = (request.query.get("date") ?? "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return error(400, "invalid_request", "Choose a valid delivery date.");
      return { status: 200, body: deliverySlotsJson(delivery, date, await deps.counts(date), request.now, deps.currency, deps.fees) };
    }
    case "gift-messages": {
      const languages = await appLanguagesOf(store, app);
      return { status: 200, body: giftMessagesJson(await giftOccasionsOf(store, app, request.now), request.lang ?? languages.default, languages.default) };
    }
    case "coupons": {
      const coupons = (await store.listCatalogCoupons(app.id)).filter((c) => couponShown(c, request.now));
      return { status: 200, body: { items: coupons.slice(0, 20).map((c) => publicCouponJson(c, deps.currency)) } };
    }
    case "flash-sales": {
      const sales = deps.sales ?? (await store.listFlashSales(app.id));
      const listed = listedSales(sales, request.now).slice(0, intParam(request.query, "per_page", 10, 20));
      const items = [];
      for (const sale of listed) {
        const products = await deps.products(sale.productIds, sale.productIds.length ? null : sale.categoryId);
        items.push(flashSaleJson(sale, products.slice(0, 24).map((p) => withSale(p as Parameters<typeof withSale>[0], sales, request.now)), request.now));
      }
      return { status: 200, body: { items } };
    }
  }
  return null;
}

/** The app's languages (its layout's: published, else the draft), for texts written in several. */
export async function appLanguagesOf(store: DataStore, app: Pick<App, "id">): Promise<{ default: string; available: string[] }> {
  const layout = await store.getAppLayout(app.id);
  const languages = (layout?.published ?? layout?.draft)?.languages;
  const def = languages?.default ?? "en";
  return { default: def, available: [...new Set([def, ...(languages?.available ?? [])])] };
}

export type StoreCheckout =
  | { ok: true; delivery: OrderDelivery; shipping: Extract<ShippingQuote, { ok: true }> | null }
  | { ok: false; status: number; code: string; message: string };

/**
 * The checkout's delivery, gift and destination, checked (`POST /store/checkout-link`
 * and the quote): the day and slot (required in the gift checkout), the
 * sender and recipient, the card, and the place the shop's areas and prices
 * read. `shipping` is quoted when the shop prices by place or delivers to
 * some places only.
 */
export async function checkStoreCheckout(
  app: App,
  body: unknown,
  now: Date,
  opts: { counts: (date: string) => Promise<SlotCounts>; fees: boolean; subtotalCents: number; physical: boolean; requirePlace: boolean; weightGrams?: number; quote?: boolean },
): Promise<StoreCheckout> {
  const mode = checkoutModeOfApp(app);
  const gifts = giftsOf(app);
  const raw = (body ?? {}) as { delivery_date?: unknown };
  // The cart's quote (`POST /store/cart`) prices what was chosen so far: a day once picked, never the people.
  const asked = !opts.quote || (typeof raw.delivery_date === "string" && raw.delivery_date.trim() !== "");
  const day = asked ? await checkDelivery(deliveryOf(app, mode === "gift"), body, now, opts.counts, opts.fees) : { ok: true as const, date: null, slot: null, feeCents: 0 };
  if (!day.ok) return day;
  const gift = opts.quote ? ({ ok: true, sender: null, recipient: null, message: null, anonymous: false } as const) : checkGift(gifts, mode, body);
  if (!gift.ok) return gift;
  const input = (body ?? {}) as { recipient?: unknown; delivery_address?: unknown };
  const rules = shippingRulesOf(catalogSettings(app));
  const place = needsPlace(rules) ? placeOf(mode === "gift" ? input.recipient : (input.delivery_address ?? input.recipient)) : null;
  let shipping: Extract<ShippingQuote, { ok: true }> | null = null;
  if (place && (opts.requirePlace || place.country || place.city || place.lat !== null)) {
    const quoted = quoteShipping(rules, { subtotalCents: opts.subtotalCents, physical: opts.physical, place, weightGrams: opts.weightGrams });
    if (!quoted.ok) return { ok: false, status: 400, code: quoted.code, message: quoted.message };
    shipping = quoted;
  }
  return {
    ok: true,
    delivery: {
      date: day.date,
      slot: day.slot ? { id: day.slot.id, start: day.slot.start, end: day.slot.end } : null,
      feeCents: day.feeCents,
      sender: gift.sender,
      recipient: gift.recipient,
      message: gift.message,
      anonymous: gift.anonymous,
      place,
      shipping: shipping ? { cents: shipping.cents, zone: shipping.zone, rule: shipping.rule, breakdown: shipping.breakdown } : null,
    },
    shipping,
  };
}

/** The quote's delivery parts (`Cart.delivery_fee`, `shipping_breakdown`, `delivery_zone`). */
export function quoteDeliveryJson(delivery: OrderDelivery | null, currency: string) {
  const money = (cents: number) => formatCents(cents, currency as CatalogCurrency);
  return {
    delivery_fee: delivery && delivery.feeCents > 0 ? money(delivery.feeCents) : null,
    delivery_zone: delivery?.shipping?.zone ?? null,
    shipping_breakdown:
      delivery?.shipping || (delivery && delivery.feeCents > 0)
        ? breakdownJson([...(delivery.shipping?.breakdown ?? []), ...(delivery.feeCents > 0 && delivery.slot ? [{ label: slotLabel(delivery.slot), cents: delivery.feeCents, rule: "slot" as const }] : [])], currency)
        : null,
  };
}

/** Platforms whose order takes the details: Shopify's cart attributes and note, Wix's note to the shop. */
const CARRIES: ReadonlySet<string> = new Set(["shopify", "wix"]);

/** Whether the app's connected platform puts the details on its order. */
export function platformCarriesDetails(app: App): boolean {
  if (app.connector?.kind === "shopify") return true;
  return app.connector?.kind === "platform" && CARRIES.has(app.connector.platform);
}

/**
 * A connected platform's connector with these added: the config, the
 * routes, each product's `sale` (a Yallapp flash sale over the platform's
 * price), and the checkout's delivery and gift checked, passed to the
 * platform's order where it takes them (`ConnectorRequest.order`) and kept
 * for the owner (`StoreDelivery`) either way. The platform's own checkout
 * charges its own prices, shipping and fees.
 */
export function withStoreExtras(inner: Connector, deps: StoreExtrasDeps): Connector {
  const { store, app } = deps;
  let sales: Promise<StoreFlashSale[]> | null = null;
  const flashSales = () => (sales ??= store.listFlashSales(app.id));
  let currency = "TRY";
  const counts = (date: string) => store.countStoreDeliveries(app.id, date);
  const call = (request: ConnectorRequest, path: string[], query: Record<string, string>) =>
    inner.handle({ ...request, method: "GET", path, query: new URLSearchParams(query), body: null });

  const overlay = async (result: ConnectorResult | null, request: ConnectorRequest): Promise<ConnectorResult | null> => {
    if (!result || result.status !== 200 || !result.body || typeof result.body !== "object") return result;
    const list = await flashSales();
    const sale = <T,>(p: T): T => (p && typeof p === "object" && "id" in p ? (withSale(p as never, list, request.now) as T) : p);
    const body = result.body as Record<string, unknown>;
    if (Array.isArray(body.items)) return { ...result, body: { ...body, items: body.items.map(sale) } };
    if (Array.isArray(body.sections)) {
      return { ...result, body: { ...body, sections: (body.sections as Record<string, unknown>[]).map((s) => (Array.isArray(s.products) ? { ...s, products: s.products.map(sale) } : s)) } };
    }
    if (typeof body.id === "number" && body.price) {
      const out = sale(body) as Record<string, unknown>;
      return { ...result, body: Array.isArray(out.related) ? { ...out, related: out.related.map(sale) } : out };
    }
    return result;
  };

  return {
    async config() {
      const base = await inner.config();
      const own = base.store as { currency?: string } | undefined;
      if (!own) return base;
      currency = own.currency ?? currency;
      return { ...base, store: { ...own, ...storeExtrasConfig(app, currency, { fees: false }) } };
    },
    async handle(request) {
      const route = `${request.method} /${request.path.join("/")}`;
      const extra = await handleStoreExtras(
        {
          store,
          app,
          currency,
          fees: false,
          counts,
          sales: await flashSales(),
          products: async (ids, categoryId) => {
            const r = await call(request, ["store", "products"], ids.length ? { ids: ids.join(",") } : { category: String(categoryId ?? ""), per_page: "24" });
            const items = (r?.body as { items?: unknown[] } | undefined)?.items;
            return Array.isArray(items) ? (items as { id: number }[]) : [];
          },
        },
        request,
      );
      if (extra) return extra;
      if (route === "POST /store/checkout-link") return checkoutLink(request);
      const result = await inner.handle(request);
      if (request.method === "GET" && request.path[0] === "store" && (request.path[1] === "products" || request.path[1] === "home") && request.path.length <= 3) {
        return overlay(result, request);
      }
      return result;
    },
  };

  async function checkoutLink(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const checked = await checkStoreCheckout(app, request.body, request.now, { counts, fees: false, subtotalCents: 0, physical: true, requirePlace: needsPlace(shippingRulesOf(catalogSettings(app))) });
    if (!checked.ok) return error(checked.status, checked.code, checked.message);
    const details = hasDeliveryDetails(checked.delivery) ? checked.delivery : null;
    // A flash sale's own code on the platform goes with the checkout, unless the customer gave one.
    const body = (request.body ?? {}) as Record<string, unknown>;
    let coupon = typeof body.coupon === "string" && body.coupon.trim() ? body.coupon : null;
    if (!coupon) {
      const ids = new Set(((body.lines as { product_id?: unknown }[] | undefined) ?? []).map((l) => Number(l.product_id)));
      const code = listedSales(await flashSales(), request.now).find((s) => s.platformCode && s.startsAt.getTime() <= request.now.getTime() && s.productIds.some((id) => ids.has(id)))?.platformCode;
      if (code) coupon = code;
    }
    const result = await inner.handle({
      ...request,
      body: { ...body, ...(coupon ? { coupon } : {}) },
      ...(details ? { order: { note: deliveryNote(details, { slotLabel }), attributes: deliveryAttributes(details, slotLabel), delivery: details } } : {}),
    });
    if (details && result?.status === 200) {
      const lines = ((body.lines as { product_id?: unknown; quantity?: unknown }[] | undefined) ?? []).map((l) => `${Number(l.quantity) || 1} × #${Number(l.product_id)}`);
      await store.createStoreDelivery({
        appId: app.id,
        userId: request.user?.id ?? null,
        delivery: details,
        lines: lines.slice(0, 30),
        buyer: { name: request.user?.name ?? null, phone: request.user?.phone ?? null, email: request.user?.email ?? null },
        passed: platformCarriesDetails(app),
        createdAt: request.now,
      });
    }
    return result;
  }
}
