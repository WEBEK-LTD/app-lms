import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type BouquetSettings, type CatalogProductInput } from "@/lib/data/types";
import { FLOWER_BOUQUET, FLOWER_PRODUCTS } from "@/lib/demo/flowers";
import { cartLines } from "@/lib/hosted/connectors/common";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { orderLinesJson } from "@/lib/owner/order-details";
import { parseStudioPage } from "@/lib/pages/validate";
import { BOUQUET_FORM_ERRORS, BOUQUET_PROBLEMS, bouquetConfigJson, bouquetOf, bouquetPartOf, checkBouquetLines, onceEach, orderGroups, parseBouquetForm } from "@/lib/selling/bouquet";
import { appWords } from "@/lib/studio/app-words";
import { BUILD_BOUQUET, LEQAA_SECTIONS } from "@/lib/studio/demo-designs/leqaa-signature";
import type { SectionContext } from "@/lib/studio/sections";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/**
 * 162 Build your bouquet: the owner's settings (the flowers' category, the
 * wraps, the cards, what may be left out, the stems), checked; a bouquet's
 * lines grouped in the cart and on the order; the template's Start opening
 * it, the shop until it is set up.
 */

const KEY = Buffer.alloc(32, 7);
const SETTINGS: BouquetSettings = { flowersCategoryId: 4, wraps: { from: "addons", productIds: [21, 22] }, cardProductIds: [31], wrapOptional: false, cardOptional: true, minStems: 3, maxStems: 12 };

describe("162 the owner's settings", () => {
  it("reads the form: off, the flowers, the wraps as add-ons or a category, the cards and the stems", () => {
    expect(parseBouquetForm({})).toEqual({ ok: true, value: null });
    expect(parseBouquetForm({ bouquet: "on", flowersCategoryId: "4", wrapsFrom: "addons", wrapOptional: "", cardOptional: "on", minStems: "3", maxStems: "12" }, { wrapIds: ["21", "22", "21", "x"], cardIds: ["31", "22"] })).toEqual({
      ok: true,
      // A card can't be one of the wraps too.
      value: { ...SETTINGS },
    });
    expect(parseBouquetForm({ bouquet: "on", flowersCategoryId: "4", wrapsFrom: "category", wrapsCategoryId: "7", wrapOptional: "on" })).toEqual({
      ok: true,
      value: { flowersCategoryId: 4, wraps: { from: "category", categoryId: 7 }, cardProductIds: [], wrapOptional: true, cardOptional: false, minStems: null, maxStems: null },
    });
    // A platform's numbers in one field.
    expect(parseBouquetForm({ bouquet: "on", flowersCategoryId: "4" }, { wrapIds: ["21, 22 23"], cardIds: [""] })).toMatchObject({ ok: true, value: { wraps: { from: "addons", productIds: [21, 22, 23] }, cardProductIds: [] } });
  });

  it("refuses settings that can't build a bouquet, each field its own message", () => {
    expect(parseBouquetForm({ bouquet: "on" })).toEqual({ ok: false, errors: { flowersCategoryId: BOUQUET_FORM_ERRORS.flowers, wrapIds: BOUQUET_FORM_ERRORS.wraps } });
    expect(parseBouquetForm({ bouquet: "on", flowersCategoryId: "4", wrapsFrom: "category" })).toMatchObject({ ok: false, errors: { wrapsCategoryId: BOUQUET_FORM_ERRORS.wrapsCategory } });
    expect(parseBouquetForm({ bouquet: "on", flowersCategoryId: "4", wrapsFrom: "category", wrapsCategoryId: "4" })).toMatchObject({ ok: false, errors: { wrapsCategoryId: BOUQUET_FORM_ERRORS.sameCategory } });
    expect(parseBouquetForm({ bouquet: "on", flowersCategoryId: "4", minStems: "0", maxStems: "120" }, { wrapIds: ["21"] })).toMatchObject({ ok: false, errors: { minStems: BOUQUET_FORM_ERRORS.stems, maxStems: BOUQUET_FORM_ERRORS.stems } });
    expect(parseBouquetForm({ bouquet: "on", flowersCategoryId: "4", minStems: "10", maxStems: "5" }, { wrapIds: ["21"] })).toMatchObject({ ok: false, errors: { maxStems: BOUQUET_FORM_ERRORS.order } });
  });

  it("serves the rules to the app, and nothing for an app that hasn't set it up, a restaurant or a hand-made value", () => {
    const app = (bouquet: unknown, extra: Partial<App> = {}) => ({ appType: "store", vertical: null, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, bouquet }, ...extra }) as unknown as App;
    expect(bouquetOf(app(SETTINGS))).toEqual(SETTINGS);
    expect(bouquetConfigJson(bouquetOf(app(SETTINGS)))).toEqual({ flowers_category_id: 4, wraps_from: "addons", wrap_optional: false, card_optional: true, has_cards: true, min_stems: 3, max_stems: 12, max_message: 500 });
    expect(bouquetConfigJson(bouquetOf(app({ ...SETTINGS, minStems: null, maxStems: null })))).toMatchObject({ min_stems: 1, max_stems: 99 });
    expect(bouquetOf(app(null))).toBeNull();
    expect(bouquetOf(app(SETTINGS, { vertical: "restaurant" } as Partial<App>))).toBeNull();
    expect(bouquetOf(app({ ...SETTINGS, wraps: { from: "addons", productIds: [] } }))).toBeNull();
    expect(bouquetOf(app({ flowersCategoryId: "x", wraps: SETTINGS.wraps }))).toBeNull();
    expect(bouquetOf(app({ ...SETTINGS, minStems: 9, maxStems: 4 }))?.maxStems).toBeNull();
  });
});

describe("162 a bouquet's lines", () => {
  it("parses a cart line's bouquet, its message cleaned, and refuses one that isn't", () => {
    expect(bouquetPartOf(undefined)).toBeUndefined();
    expect(bouquetPartOf({ id: "b-1", part: "card", message: "  Happy\r\n\r\n\r\nbirthday  " })).toEqual({ id: "b-1", part: "card", message: "Happy\n\nbirthday" });
    expect(bouquetPartOf({ id: "b-1", part: "flower", message: "   " })).toEqual({ id: "b-1", part: "flower" });
    expect(bouquetPartOf({ id: "b-1", part: "card", message: "x".repeat(600) })!.message).toHaveLength(500);
    for (const bad of [{ id: "", part: "flower" }, { id: "b 1", part: "flower" }, { id: "b1", part: "vase" }, { id: "b1", part: "card", message: 5 }, "b1", []]) expect(bouquetPartOf(bad), JSON.stringify(bad)).toBeNull();
    expect(cartLines({ lines: [{ product_id: 11, quantity: 6, bouquet: { id: "b1", part: "flower" } }, { product_id: 21, quantity: 1, addon_of: 11, bouquet: { id: "b1", part: "wrap" } }] })).toEqual([
      { product_id: 11, variation_id: null, quantity: 6, bouquet: { id: "b1", part: "flower" } },
      { product_id: 21, variation_id: null, quantity: 1, addon_of: 11, bouquet: { id: "b1", part: "wrap" } },
    ]);
    expect(cartLines({ lines: [{ product_id: 11, quantity: 6, bouquet: { id: "b1", part: "stem" } }] })).toBeNull();
  });

  it("checks each bouquet against the shop's rules: its flowers, one wrap, one card, its stems", () => {
    const b = (part: "flower" | "wrap" | "card", id = "b1") => ({ id, part });
    const flower = (productId: number, quantity: number, id = "b1") => ({ productId, quantity, bouquet: b("flower", id), categoryIds: [4] });
    const wrap = (productId = 21, id = "b1") => ({ productId, quantity: 1, bouquet: b("wrap", id), categoryIds: [] });
    const card = (productId = 31, id = "b1") => ({ productId, quantity: 1, bouquet: b("card", id), categoryIds: [] });
    expect([...checkBouquetLines([flower(11, 3), flower(12, 2), wrap(), card()], SETTINGS)]).toEqual([]);
    // The card may be left out here; the wrap may not.
    expect([...checkBouquetLines([flower(11, 3), wrap()], SETTINGS)]).toEqual([]);
    expect([...checkBouquetLines([flower(11, 3)], SETTINGS)]).toEqual([[0, BOUQUET_PROBLEMS.needsWrap]]);
    expect([...checkBouquetLines([flower(11, 2), wrap()], SETTINGS)]).toEqual([[0, BOUQUET_PROBLEMS.fewStems]]);
    expect([...checkBouquetLines([flower(11, 13), wrap()], SETTINGS)]).toEqual([[0, BOUQUET_PROBLEMS.manyStems]]);
    expect([...checkBouquetLines([{ ...flower(11, 3), categoryIds: [9] }, wrap()], SETTINGS)]).toEqual([[0, BOUQUET_PROBLEMS.notFlower]]);
    expect([...checkBouquetLines([flower(11, 3), wrap(), wrap(22)], SETTINGS)]).toEqual([
      [1, BOUQUET_PROBLEMS.oneWrap],
      [2, BOUQUET_PROBLEMS.oneWrap],
    ]);
    expect([...checkBouquetLines([flower(11, 3), wrap(99), card(98)], SETTINGS)]).toEqual([
      [1, BOUQUET_PROBLEMS.notWrap],
      [2, BOUQUET_PROBLEMS.notCard],
    ]);
    expect([...checkBouquetLines([wrap(), card()], SETTINGS)]).toEqual([
      [0, BOUQUET_PROBLEMS.noFlowers],
      [1, BOUQUET_PROBLEMS.noFlowers],
    ]);
    // A card required where the shop has cards; two bouquets checked each on its own.
    const strict = { ...SETTINGS, cardOptional: false };
    expect([...checkBouquetLines([flower(11, 3), wrap(), flower(11, 4, "b2"), wrap(21, "b2"), card(31, "b2")], strict)]).toEqual([[0, BOUQUET_PROBLEMS.needsCard]]);
    // Lines without a bouquet, and every bouquet with the builder off, are left alone.
    expect([...checkBouquetLines([{ productId: 11, quantity: 1, categoryIds: [] }], SETTINGS)]).toEqual([]);
    expect([...checkBouquetLines([flower(11, 1)], null)]).toEqual([]);
  });

  it("keeps a bouquet's message once, and groups an order's lines as the dashboard and the apps show them", () => {
    const lines = [
      { name: "Vase", quantity: 1 },
      { name: "Kraft wrap", quantity: 1, bouquet: { id: "b1", part: "wrap" as const } },
      { name: "Red rose", quantity: 6, bouquet: { id: "b1", part: "flower" as const } },
      { name: "Card", quantity: 1, bouquet: { id: "b1", part: "card" as const, message: "For you" } },
      { name: "Ranunculus", quantity: 3, bouquet: { id: "b1", part: "flower" as const, message: "Again" } },
      { name: "Lily", quantity: 5, bouquet: { id: "b2", part: "flower" as const } },
    ];
    expect(onceEach(lines).map((l) => l.bouquet?.message ?? null)).toEqual([null, null, null, "For you", null, null]);
    const groups = orderGroups(lines);
    expect(groups.map((g) => (g.kind === "line" ? g.line.name : `${g.id}:${g.lines.map((l) => l.line.name).join(",")}:${g.stems}:${g.message}`))).toEqual([
      "Vase",
      "b1:Red rose,Ranunculus,Kraft wrap,Card:9:For you",
      "b2:Lily:5:null",
    ]);
  });
});

describe("162 Build your bouquet on the shop's own products", () => {
  let store: MemoryStore;
  let app: App;
  const ids: Record<string, number> = {};
  const cats: Record<string, number> = {};
  const product = (input: Partial<CatalogProductInput>): CatalogProductInput => ({ appId: app.id, name: "Product", description: "", priceCents: 10000, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null, ...input });

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const fresh = newApp(client.id, null, NOW, "store");
    app = {
      ...fresh,
      backend: "hosted",
      websiteDoneAt: NOW,
      connector: { kind: "catalog" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "EGP", shippingCents: 0, freeShippingOverCents: null, payment: encryptPaymentKeys(fresh.id, "api", "secret", true, KEY) },
    };
    await store.createApp(app);
    cats.stems = (await store.createCatalogCategory({ appId: app.id, name: "Loose stems", now: NOW })).id;
    cats.bouquets = (await store.createCatalogCategory({ appId: app.id, name: "Bouquets", now: NOW })).id;
    const at = (s: number) => new Date(NOW.getTime() + s * 1000);
    ids.garden = (await store.createCatalogProduct(product({ name: "Blush Garden", priceCents: 145000, categoryIds: [cats.bouquets] }), at(1))).id;
    ids.rose = (await store.createCatalogProduct(product({ name: "Red Rose", priceCents: 4500, categoryIds: [cats.stems] }), at(2))).id;
    ids.ranunculus = (await store.createCatalogProduct(product({ name: "Blush Ranunculus", priceCents: 5500, categoryIds: [cats.stems] }), at(3))).id;
    // The wraps go with the stems only; the card with every product.
    ids.kraft = (await store.createCatalogProduct(product({ name: "Kraft Paper Wrap", priceCents: 6000, addon: true, addonFor: { offerWith: "categories", categoryIds: [cats.stems], productIds: [] } }), at(4))).id;
    ids.blush = (await store.createCatalogProduct(product({ name: "Blush Paper Wrap", priceCents: 9000, addon: true, addonFor: { offerWith: "products", categoryIds: [], productIds: [ids.garden] } }), at(5))).id;
    ids.card = (await store.createCatalogProduct(product({ name: "Greeting Card", priceCents: 6000, addon: true, addonFor: null }), at(6))).id;
  });

  const setUp = async (s: Partial<BouquetSettings> = {}) => {
    const bouquet: BouquetSettings = { flowersCategoryId: cats.stems!, wraps: { from: "addons", productIds: [ids.blush!, ids.kraft!] }, cardProductIds: [ids.card!], wrapOptional: false, cardOptional: true, minStems: 3, maxStems: 36, ...s };
    app = { ...app, catalogSettings: { ...app.catalogSettings!, bouquet } };
    await store.updateApp(app.id, { catalogSettings: app.catalogSettings }, NOW);
  };

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now: NOW,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender: new LogSender(),
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: new CatalogConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" }),
  });

  async function call(method: string, route: string, options: { body?: unknown; query?: Record<string, string> } = {}): Promise<HostedResult> {
    const result = await handleHosted(context(), { method, path: route.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: null, headers: new Headers() });
    expectContract(method, route, result);
    return result;
  }

  const bouquetLines = (id = "b-1", message = "Happy birthday, Mama.") => [
    { product_id: ids.rose, quantity: 6, bouquet: { id, part: "flower" } },
    { product_id: ids.ranunculus, quantity: 3, bouquet: { id, part: "flower" } },
    // The blush paper is offered with Blush Garden only; in the bouquet it goes with the stems.
    { product_id: ids.blush, quantity: 1, addon_of: ids.rose, bouquet: { id, part: "wrap" } },
    { product_id: ids.card, quantity: 1, addon_of: ids.rose, bouquet: { id, part: "card", message } },
  ];

  it("keeps today's shop for an app that hasn't set it up: no rules in the config, 404 for the builder", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { store: { bouquet: unknown } };
    expect(config.store.bouquet).toBeNull();
    expect((await call("GET", "/store/bouquet")).status).toBe(404);
  });

  it("serves the rules in the config and what to choose from: the stems, the wraps and the cards in the owner's order", async () => {
    await setUp();
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { store: { bouquet: unknown } };
    expect(config.store.bouquet).toEqual({ flowers_category_id: cats.stems, wraps_from: "addons", wrap_optional: false, card_optional: true, has_cards: true, min_stems: 3, max_stems: 36, max_message: 500 });
    const builder = (await call("GET", "/store/bouquet")).body as { flowers: { name: string; addon: boolean }[]; wraps: { name: string; addon: boolean; price: { amount: string } }[]; cards: { name: string }[] };
    expect(builder.flowers.map((p) => p.name)).toEqual(["Blush Ranunculus", "Red Rose"]);
    expect(builder.wraps.map((p) => [p.name, p.addon, p.price.amount])).toEqual([
      ["Blush Paper Wrap", true, "90.00"],
      ["Kraft Paper Wrap", true, "60.00"],
    ]);
    expect(builder.cards.map((p) => p.name)).toEqual(["Greeting Card"]);
    // A wraps category: its products.
    await setUp({ wraps: { from: "category", categoryId: cats.bouquets! } });
    expect(((await call("GET", "/store/bouquet")).body as { wraps: { name: string }[] }).wraps.map((p) => p.name)).toEqual(["Blush Garden"]);
  });

  it("prices a bouquet's lines as any, keeps them together in the cart, and checks it", async () => {
    await setUp();
    const cart = (await call("POST", "/store/cart", { body: { lines: bouquetLines() } })).body as { lines: { name: string; available: boolean; problem: string | null; bouquet?: unknown }[]; subtotal_amount: string };
    expect(cart.lines.map((l) => [l.name, l.available, l.bouquet])).toEqual([
      ["Red Rose", true, { id: "b-1", part: "flower" }],
      ["Blush Ranunculus", true, { id: "b-1", part: "flower" }],
      ["Blush Paper Wrap", true, { id: "b-1", part: "wrap" }],
      ["Greeting Card", true, { id: "b-1", part: "card", message: "Happy birthday, Mama." }],
    ]);
    // 6 × 45 + 3 × 55 + 90 + 60: the server's prices.
    expect(cart.subtotal_amount).toBe("585.00");
    // Outside a bouquet the blush paper still goes with Blush Garden only.
    const alone = (await call("POST", "/store/cart", { body: { lines: [{ product_id: ids.rose, quantity: 3 }, { product_id: ids.blush, quantity: 1, addon_of: ids.rose }] } })).body as { lines: { available: boolean }[] };
    expect(alone.lines[1]!.available).toBe(false);
    // Too few stems: the bouquet's first flower says so, and the checkout is refused.
    const few = [{ ...bouquetLines()[0]!, quantity: 1 }, ...bouquetLines().slice(2)];
    const quoted = (await call("POST", "/store/cart", { body: { lines: few } })).body as { lines: { available: boolean; problem: string | null }[] };
    expect(quoted.lines[0]).toMatchObject({ available: false, problem: BOUQUET_PROBLEMS.fewStems });
    expect((await call("POST", "/store/checkout-link", { body: { lines: few }, query: { platform: "android" } })).status).toBe(409);
  });

  it("keeps the bouquet on the order's lines, for the app's order, the dashboard and Yallapp Business", async () => {
    await setUp();
    const link = await call("POST", "/store/checkout-link", { body: { lines: [{ product_id: ids.garden, quantity: 1 }, ...bouquetLines()] }, query: { platform: "android" } });
    expect(link.status).toBe(200);
    const [order] = (await store.listCatalogOrders({ appId: app.id, offset: 0, limit: 5 })).items;
    expect(order!.lines.map((l) => [l.name, l.bouquet ?? null, l.addonOf ?? null])).toEqual([
      ["Blush Garden", null, null],
      ["Red Rose", { id: "b-1", part: "flower" }, null],
      ["Blush Ranunculus", { id: "b-1", part: "flower" }, null],
      ["Blush Paper Wrap", { id: "b-1", part: "wrap" }, ids.rose],
      ["Greeting Card", { id: "b-1", part: "card", message: "Happy birthday, Mama." }, ids.rose],
    ]);
    // The dashboard's order page: the bouquet once, its 9 stems and its message.
    const groups = orderGroups(order!.lines);
    expect(groups.map((g) => g.kind)).toEqual(["line", "bouquet"]);
    expect(groups[1]).toMatchObject({ id: "b-1", stems: 9, message: "Happy birthday, Mama." });
    // Yallapp Business's order (owner.yaml `Order.lines[].bouquet`).
    expect(orderLinesJson(order!, { sales: new Map(), lang: "en" }).map((l) => (l as { bouquet?: unknown }).bouquet ?? null)).toEqual([null, { id: "b-1", part: "flower" }, { id: "b-1", part: "flower" }, { id: "b-1", part: "wrap" }, { id: "b-1", part: "card", message: "Happy birthday, Mama." }]);
  });

  it("checks Leqaa's demo bouquet against its own rules", () => {
    const skus = new Map(FLOWER_PRODUCTS.map((p) => [p.sku, p]));
    expect(FLOWER_PRODUCTS.filter((p) => p.collection === FLOWER_BOUQUET.flowers).length).toBeGreaterThanOrEqual(5);
    for (const sku of [...FLOWER_BOUQUET.wraps, ...FLOWER_BOUQUET.cards]) expect(skus.get(sku)?.addon, sku).toBe(true);
    for (const sku of FLOWER_BOUQUET.wraps) expect(skus.get(sku)?.addonWith).toBe(FLOWER_BOUQUET.flowers);
    // Every stem with its real photo, never a bouquet's sizes.
    for (const p of FLOWER_PRODUCTS.filter((x) => x.collection === FLOWER_BOUQUET.flowers)) {
      expect(p.photo).not.toBeNull();
      expect(p.sizes).toBeUndefined();
    }
  });
});

describe("162 the template's Start", () => {
  it("opens Build your bouquet over the shop, kept by the page checker for a store only", () => {
    expect(BUILD_BOUQUET).toEqual({ type: "screen", screen: "search", flow: "bouquet" });
    let n = 0;
    const ctx: SectionContext = { brand: "#8E2445", source: "products", app: "Leqaa", lang: "en", w: appWords("en", "Leqaa"), picture: (f) => f, newId: () => `lq-${++n}`, kind: { type: "store", vertical: null } };
    for (const id of ["lq_builder", "lq_steps"]) {
      const node = LEQAA_SECTIONS.find((s) => s.id === id)!.make(ctx);
      // The section itself and its Start button.
      expect(JSON.stringify(node).match(/"flow":"bouquet"/g) ?? [], id).toHaveLength(2);
    }
    const page = { body: { id: "p", type: "column", children: [{ id: "start", type: "button", text: "Start", action: BUILD_BOUQUET }] } };
    const languages = { default: "en", available: ["en"] };
    const actionOf = (appType: App["appType"]) => {
      const parsed = parseStudioPage(page, { appType, backend: "hosted", vertical: null }, languages);
      expect(parsed.ok, appType).toBe(true);
      return parsed.ok ? parsed.value.body.children![0]!.action : null;
    };
    expect(actionOf("store")).toEqual(BUILD_BOUQUET);
    // Another kind's app keeps its search, never the builder.
    expect(actionOf("lms")).toEqual({ type: "screen", screen: "search" });
  });
});
