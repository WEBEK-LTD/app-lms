import { catalogSettings } from "../catalog/settings";
import { couponDiscount } from "../catalog/coupons";
import { formatCents, centsToDecimal } from "../catalog/money";
import type { DataStore } from "../data/store";
import type { App, CatalogCoupon, CatalogCurrency, MapTilesSetting, OrderDelivery, StoreFlashSale } from "../data/types";
import { mapConfigJson } from "../delivery/service";
import { handleMapRequest, isMapRequest, platformMapEndpoints } from "../hosted/connectors/maps";
import { platformSetting } from "../settings/platform";
import { cartLines, error, intParam } from "../hosted/connectors/common";
import type { Connector, ConnectorRequest, ConnectorResult } from "../hosted/connectors/types";
import { checkoutLookOf } from "../studio/checkout-look";
import { checkDelivery, deliveryConfigJson, deliveryOf, deliverySlotsJson, slotLabel, type SlotCounts } from "./delivery";
import { flashSaleJson, listedSales, withSale } from "./flash-sales";
import { giftMessagesJson, giftOccasionsOf } from "./gift-messages";
import { checkGift, checkoutModeOf, deliveryAttributes, deliveryNote, giftConfigJson, giftsOf, hasDeliveryDetails, type CheckoutMode } from "./gifts";
import { ADDON_LIMITS, ADDON_NEEDS_ITEM, checkAddonLines, hasAddons, offeredWith, sectionTitlesJson } from "./addons";
import { countryNames } from "./countries";
import { BOUQUET_LIMITS, bouquetConfigJson, bouquetJson, bouquetOf, bouquetOffers, bouquetPartJson } from "./bouquet";
import { breakdownJson, needsPlace, placeOf, quoteShipping, shippingRulesOf, type ShippingQuote } from "./shipping";
import { FASHION_LIMITS, fashionOf, sizeChartJson } from "./fashion";

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
  // A restaurant's checkout is its kitchen's (26), whatever the look says.
  if (app.vertical === "restaurant") return "standard";
  return checkoutModeOf(giftsOf(app), checkoutLookOf(app));
}

/**
 * `StoreConfig`'s parts for these (merged over the source's own): `fees`
 * whether the slot's and shipping's fees are charged (Yallapp's checkout).
 */
export function storeExtrasConfig(app: App, currency: string, opts: { fees: boolean; map?: MapTilesSetting | null }) {
  const mode = checkoutModeOfApp(app);
  const rules = shippingRulesOf(catalogSettings(app));
  return {
    checkout_mode: mode,
    delivery_date: deliveryConfigJson(deliveryOf(app, mode === "gift"), currency, opts.fees),
    gift_message: giftConfigJson(giftsOf(app), mode),
    // 131 The owner's titles of the add-ons, the card and the delivery picker, per language.
    titles: sectionTitlesJson(catalogSettings(app).titles),
    // 162 Build your bouquet; null: off (the template's Start opens the shop).
    bouquet: bouquetConfigJson(bouquetOf(app)),
    ...(needsPlace(rules)
      ? {
          shipping: {
            mode: rules.mode,
            countries: rules.areas.map((a) => ({ code: a.country, names: countryNames(a.country), cities: a.cities })),
            needs_location: rules.mode === "distance",
            charged: opts.fees,
            // 161 The currency of its amount: the hosted API adds it in the customer's (`display`).
            currency,
            free_over: rules.freeOverCents !== null ? centsToDecimal(rules.freeOverCents) : null,
            free_over_formatted: rules.freeOverCents !== null ? formatCents(rules.freeOverCents, currency as CatalogCurrency) : null,
            max_km: rules.mode === "distance" ? (rules.distance?.maxKm ?? null) : null,
            // 131 Priced by distance: the map the customer pins the place on (the platform's
            // tiles, and whether its search works at `/maps/places`), starting at the shop.
            ...(rules.mode === "distance"
              ? {
                  map: mapConfigJson(opts.map ?? null),
                  center: rules.distance ? { lat: rules.distance.origin.lat, lng: rules.distance.origin.lng } : null,
                }
              : {}),
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
    // 161 The currency of its amounts: the hosted API adds them in the customer's (`display`).
    currency,
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

/** Loads a source's products by id, as the app gets them (summaries); `limit`, how many of a category's (24 unless said). */
export type ProductsLoader = (ids: number[], categoryId: number | null, limit?: number) => Promise<{ id: number; price?: unknown; categories?: { id: number }[] }[]>;

/**
 * The routes these add: `GET /store/delivery-slots`, `GET /store/gift-messages`,
 * `GET /store/coupons` and `GET /store/flash-sales`; null for any other.
 */
export async function handleStoreExtras(
  deps: StoreExtrasDeps & {
    currency: string;
    fees: boolean;
    counts: (date: string) => Promise<SlotCounts>;
    products: ProductsLoader;
    sales?: StoreFlashSale[];
    /** 162 Products by id, the gift add-ons too (a bouquet's wraps and cards). */
    extras?: (ids: number[]) => Promise<{ id: number; price?: unknown; categories?: { id: number }[] }[]>;
  },
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
        items.push(flashSaleJson(sale, products.slice(0, 24).map((p) => withSale(p as Parameters<typeof withSale>[0], sales, request.now)), request.now, request.lang));
      }
      return { status: 200, body: { items } };
    }
    case "bouquet": {
      // 162 Build your bouquet: the flowers of the owner's category, the wraps and the cards, each with its sale.
      const s = bouquetOf(app);
      if (!s) return error(404, "not_found", "This shop doesn't build bouquets in the app.");
      const sales = deps.sales ?? (await store.listFlashSales(app.id));
      const byIds = deps.extras ?? ((ids: number[]) => deps.products(ids, null));
      const [flowers, wraps, cards] = await Promise.all([
        deps.products([], s.flowersCategoryId, BOUQUET_LIMITS.flowers),
        s.wraps.from === "category" ? deps.products([], s.wraps.categoryId, BOUQUET_LIMITS.wraps) : byIds(s.wraps.productIds),
        s.cardProductIds.length ? byIds(s.cardProductIds) : Promise.resolve([]),
      ]);
      const sale = (p: { id: number }) => withSale(p as Parameters<typeof withSale>[0], sales, request.now);
      // The owner's order for the add-ons they ticked.
      const inOrder = <T extends { id: number }>(list: T[], ids: number[]) => (ids.length ? ids.map((id) => list.find((p) => p.id === id)).filter((p): p is T => Boolean(p)) : list);
      return {
        status: 200,
        body: bouquetJson(s, {
          flowers: flowers.map(sale),
          wraps: inOrder(wraps, s.wraps.from === "addons" ? s.wraps.productIds : []).map(sale),
          cards: inOrder(cards, s.cardProductIds).map(sale),
        }),
      };
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
  // 131 The gift checkout's place is the recipient's; the standard checkout's is its `place`
  // (or a delivery address's), the recipient's for an older app.
  const input = (body ?? {}) as { recipient?: unknown; delivery_address?: unknown; place?: unknown };
  const rules = shippingRulesOf(catalogSettings(app));
  const byPlace = needsPlace(rules);
  // A price per kg needs no place: with flat shipping anywhere it's priced as it is.
  const place = byPlace || rules.weight ? placeOf(mode === "gift" ? (input.recipient ?? input.place) : (input.place ?? input.delivery_address ?? input.recipient)) : null;
  let shipping: Extract<ShippingQuote, { ok: true }> | null = null;
  if (place && (!byPlace || opts.requirePlace || place.country || place.city || place.lat !== null)) {
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
export function quoteDeliveryJson(delivery: OrderDelivery | null, currency: string, lang?: string | null) {
  const money = (cents: number) => formatCents(cents, currency as CatalogCurrency);
  return {
    delivery_fee: delivery && delivery.feeCents > 0 ? money(delivery.feeCents) : null,
    // 161 Its amount: the hosted API adds it in the customer's currency (`display.delivery_fee`).
    delivery_fee_amount: delivery && delivery.feeCents > 0 ? centsToDecimal(delivery.feeCents, currency) : null,
    delivery_zone: delivery?.shipping?.zone ?? null,
    shipping_breakdown:
      delivery?.shipping || (delivery && delivery.feeCents > 0)
        ? breakdownJson([...(delivery.shipping?.breakdown ?? []), ...(delivery.feeCents > 0 && delivery.slot ? [{ label: slotLabel(delivery.slot), cents: delivery.feeCents, rule: "slot" as const }] : [])], currency, lang)
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
  const itemsOf = (r: ConnectorResult | null) => {
    const items = r?.status === 200 ? (r.body as { items?: unknown[] } | undefined)?.items : undefined;
    return Array.isArray(items) ? (items as { id: number; categories?: { id: number }[] }[]) : [];
  };

  // 131 The platform's products the owner made gift add-ons: their list, a category's, a tag's.
  const addonSettings = catalogSettings(app).addons;
  let addonIds: Promise<Set<number>> | null = null;
  const addonSet = (request: ConnectorRequest) =>
    (addonIds ??= (async () => {
      const s = addonSettings;
      if (!hasAddons(s)) return new Set<number>();
      const set = new Set(s.productIds);
      if (s.categoryId !== null) {
        for (const p of itemsOf(await call(request, ["store", "products"], { category: String(s.categoryId), per_page: "50" }).catch(() => null))) set.add(p.id);
      }
      if (s.tag && inner.taggedProducts) {
        for (const id of await inner.taggedProducts(s.tag).catch(() => [] as number[])) set.add(id);
      }
      return set;
    })());
  /** A product's categories, from its page (for add-ons offered with some categories). */
  const categoriesOf = async (request: ConnectorRequest, id: number): Promise<number[]> => {
    const r = await call(request, ["store", "products", String(id)], {}).catch(() => null);
    const cats = r?.status === 200 ? (r.body as { categories?: { id: number }[] }).categories : undefined;
    return Array.isArray(cats) ? cats.map((c) => c.id) : [];
  };
  /** The add-ons offered with a product (`main`; null: those offered with every product), as the app gets them. */
  const addonsFor = async (request: ConnectorRequest, main: { id: number; categoryIds?: number[] } | null): Promise<unknown[]> => {
    const set = await addonSet(request);
    const s = addonSettings;
    if (!set.size || !s || (main && set.has(main.id))) return [];
    if (main ? !offeredWith(s.offerWith, main) : s.offerWith.offerWith !== "all") return [];
    const list = itemsOf(await call(request, ["store", "products"], { ids: [...set].slice(0, 50).join(",") }).catch(() => null));
    const sales = await flashSales();
    return list.slice(0, ADDON_LIMITS.offered).map((p) => ({ ...(withSale(p as never, sales, request.now) as object), addon: true }));
  };

  const overlay = async (result: ConnectorResult | null, request: ConnectorRequest): Promise<ConnectorResult | null> => {
    if (!result || result.status !== 200 || !result.body || typeof result.body !== "object") return result;
    const list = await flashSales();
    // 131 The gift add-ons are never listed on their own.
    const addons = await addonSet(request);
    const listed = (p: unknown) => !(p && typeof p === "object" && "id" in p && addons.has((p as { id: number }).id));
    const sale = <T,>(p: T): T => (p && typeof p === "object" && "id" in p ? ({ ...(withSale(p as never, list, request.now) as object), addon: false } as T) : p);
    const body = result.body as Record<string, unknown>;
    if (Array.isArray(body.items)) return { ...result, body: { ...body, items: body.items.filter(listed).map(sale) } };
    if (Array.isArray(body.sections)) {
      const hidden = addonSettings?.categoryId ?? null;
      return {
        ...result,
        body: {
          ...body,
          sections: (body.sections as Record<string, unknown>[]).map((s) =>
            Array.isArray(s.products)
              ? { ...s, products: s.products.filter(listed).map(sale) }
              : Array.isArray(s.categories) && hidden !== null
                ? { ...s, categories: (s.categories as { id: number }[]).filter((c) => c.id !== hidden) }
                : s,
          ),
        },
      };
    }
    if (typeof body.id === "number" && body.price) {
      const id = body.id;
      const isAddon = addons.has(id);
      const out: Record<string, unknown> = { ...(sale(body) as Record<string, unknown>), addon: isAddon };
      const categoryIds = Array.isArray(body.categories) ? (body.categories as { id: number }[]).map((c) => c.id) : [];
      const related = Array.isArray(out.related) ? (out.related as unknown[]).filter(listed).map(sale) : out.related;
      // 212 Complete the look on a platform's product too, from its other main categories.
      const look = Array.isArray(out.complete_look) && out.complete_look.length ? out.complete_look : !isAddon && fashionOf(app)?.completeLook ? (await completeLook(request, id, categoryIds)).filter(listed).map(sale) : [];
      return { ...result, body: { ...out, related, complete_look: look, addons: isAddon ? [] : await addonsFor(request, { id, categoryIds }) } };
    }
    return result;
  };

  /**
   * 212 "Complete the look" from a connected platform: the first product of
   * each of its main categories the product isn't in (at most 4), as the
   * shop's own products have it (lib/selling/fashion.ts completeLookFor).
   */
  const completeLook = async (request: ConnectorRequest, id: number, categoryIds: number[]): Promise<unknown[]> => {
    const listed = await call(request, ["store", "categories"], {}).catch(() => null);
    const all = listed?.status === 200 ? ((listed.body as { items?: { id: number; parent_id?: number | null }[] }).items ?? []) : [];
    const parentOf = new Map(all.map((c) => [c.id, c.parent_id ?? null]));
    const own = new Set(categoryIds.map((c) => parentOf.get(c) ?? c));
    const mains = all.filter((c) => (c.parent_id ?? null) === null && !own.has(c.id)).slice(0, 6);
    const out: { id: number }[] = [];
    for (const main of mains) {
      const items = itemsOf(await call(request, ["store", "products"], { category: String(main.id), per_page: "3" }).catch(() => null));
      const pick = items.find((p) => p.id !== id && !out.some((o) => o.id === p.id));
      if (pick) out.push(pick);
      if (out.length >= FASHION_LIMITS.look) break;
    }
    return out;
  };

  /** 131 A cart's add-on lines checked: none alone, each with a main item it goes with. */
  const checkAddons = async (request: ConnectorRequest) => {
    const lines = cartLines(request.body) ?? [];
    const set = await addonSet(request);
    if (!set.size) return { needsItem: false, problems: new Map<number, string>(), lines };
    const rule = addonSettings!.offerWith;
    const cats = new Map<number, number[]>();
    for (const l of lines) {
      if (rule.offerWith === "categories" && !set.has(l.product_id) && !cats.has(l.product_id) && cats.size < 5) cats.set(l.product_id, await categoriesOf(request, l.product_id));
    }
    const bouquet = bouquetOf(app);
    const checked = checkAddonLines(
      lines.map((l) => ({ productId: l.product_id, addonOf: l.addon_of ?? null, addon: set.has(l.product_id) })),
      // 162 A bouquet's wrap and card the owner chose go with its flowers.
      (i, mainId) => bouquetOffers(bouquet, lines[i]!, { id: lines[i]!.product_id, categoryIds: [] }) || offeredWith(rule, { id: mainId, categoryIds: cats.get(mainId) ?? [] }),
    );
    return { ...checked, lines };
  };

  return {
    async config() {
      const base = await inner.config();
      const own = base.store as { currency?: string } | undefined;
      if (!own) return base;
      currency = own.currency ?? currency;
      // 212 The size chart set in Yallapp (Delivery & offers › Clothes), for a platform's shop too.
      const chart = (own as { size_chart?: unknown }).size_chart ?? sizeChartJson(fashionOf(app)?.sizeChart ?? null, null);
      return { ...base, store: { ...own, ...storeExtrasConfig(app, currency, { fees: false, map: await storeMap(store, app) }), size_chart: chart } };
    },
    async handle(request) {
      const route = `${request.method} /${request.path.join("/")}`;
      // 131 The map's place search, for a shop priced by distance.
      const map = await storeMapRoute({ store, app }, request);
      if (map) return map;
      const extra = await handleStoreExtras(
        {
          store,
          app,
          currency,
          fees: false,
          counts,
          sales: await flashSales(),
          products: async (ids, categoryId, limit) => {
            const r = await call(request, ["store", "products"], ids.length ? { ids: ids.join(",") } : { category: String(categoryId ?? ""), per_page: String(Math.min(limit ?? 24, 50)) });
            // 131 A flash sale's list never shows a gift add-on.
            const addons = await addonSet(request);
            return itemsOf(r).filter((p) => !addons.has(p.id));
          },
          // 162 A bouquet's wraps and cards, which may be the platform's add-ons.
          extras: async (ids) => itemsOf(await call(request, ["store", "products"], { ids: ids.slice(0, 50).join(",") }).catch(() => null)),
        },
        request,
      );
      if (extra) return extra;
      if (route === "GET /store/addons") return addonsRoute(request);
      if (route === "POST /store/checkout-link") return checkoutLink(request);
      if (route === "POST /store/cart") return quote(request);
      const result = await inner.handle(request);
      if (request.method === "GET" && request.path[0] === "store" && (request.path[1] === "products" || request.path[1] === "home") && request.path.length <= 3) {
        return overlay(result, request);
      }
      return result;
    },
  };

  /** 131 `GET /store/addons?product_id=`. */
  async function addonsRoute(request: ConnectorRequest): Promise<ConnectorResult> {
    const raw = request.query.get("product_id");
    const id = raw === null || raw === "" ? null : Number(raw);
    if (id !== null && (!Number.isSafeInteger(id) || id < 1)) return error(400, "invalid_request", "Unknown product.");
    const categoryIds = id !== null && addonSettings?.offerWith.offerWith === "categories" ? await categoriesOf(request, id) : [];
    return { status: 200, body: { items: await addonsFor(request, id === null ? null : { id, categoryIds }) } };
  }

  /** 131 The platform's cart, with the add-ons checked. */
  async function quote(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const addons = await checkAddons(request);
    if (addons.needsItem) return error(400, "addon_needs_item", ADDON_NEEDS_ITEM);
    const result = await inner.handle(request);
    const set = await addonSet(request);
    const grouped = addons.lines.some((l) => l.bouquet);
    if ((!set.size && !grouped) || result?.status !== 200 || !Array.isArray((result.body as { lines?: unknown })?.lines)) return result;
    const body = result.body as { lines: Record<string, unknown>[] };
    return {
      ...result,
      body: {
        ...body,
        lines: body.lines.map((l, i) => {
          // 162 The bouquet each line is part of, as sent (the platform's own cart knows none).
          const sent = addons.lines[i];
          const b = sent?.bouquet && Number(sent.product_id) === Number(l.product_id) ? { bouquet: bouquetPartJson(sent.bouquet) } : {};
          if (!set.has(Number(l.product_id))) return { ...l, ...b };
          const problem = addons.problems.get(i);
          return { ...l, ...b, addon: true, addon_of: sent?.addon_of ?? null, ...(problem ? { available: false, problem } : {}) };
        }),
      },
    };
  }

  async function checkoutLink(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const addons = await checkAddons(request);
    if (addons.needsItem) return error(400, "addon_needs_item", ADDON_NEEDS_ITEM);
    if (addons.problems.size) return error(400, "addon_needs_item", [...addons.problems.values()][0]!);
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

/** 131 The platform's map, for a store's config (its tiles, when priced by distance). */
export async function storeMap(store: DataStore, app: App): Promise<MapTilesSetting | null> {
  if (shippingRulesOf(catalogSettings(app)).mode !== "distance") return null;
  return (await platformSetting(store, "maps").catch(() => null))?.value ?? null;
}

/**
 * 131 A store priced by distance searches the place on the map (`/maps/places`, the
 * place's position, the address at the customer's pin), through the platform's map;
 * null for any other request or store.
 */
export async function storeMapRoute(deps: StoreExtrasDeps, request: ConnectorRequest): Promise<ConnectorResult | null> {
  if (!isMapRequest(request.path) || shippingRulesOf(catalogSettings(deps.app)).mode !== "distance") return null;
  return handleMapRequest(platformMapEndpoints({ store: deps.store, app: deps.app }), request);
}
