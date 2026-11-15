import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogProductInput } from "@/lib/data/types";
import { cartLines } from "@/lib/hosted/connectors/common";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import type { Connector, ConnectorRequest } from "@/lib/hosted/connectors/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { ADDON_NEEDS_ITEM, checkAddonLines, cleanLangText, inLanguage, langTextOfForm, offeredWith, ownAddonsFor, parseAddonRule, parseAddonSettings, sectionTitlesJson } from "@/lib/selling/addons";
import { flashSaleJson } from "@/lib/selling/flash-sales";
import { storeExtrasConfig, withStoreExtras } from "@/lib/selling/store";
import { parseCheckoutLook } from "@/lib/studio/checkout-look";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/**
 * 131 Gift add-ons for every store app (chocolates, a card, a vase: never
 * listed or bought alone, offered as "Add a little more" with what the owner
 * chose, each line linked to its item), the titles the owner words per
 * language, and a flash sale on one product only.
 */

const KEY = Buffer.alloc(32, 7);
const FRI_11 = new Date("2026-11-20T08:00:00Z");

describe("131 add-on rules", () => {
  it("offers an add-on with every product, some categories' or some products", () => {
    expect(offeredWith(null, { id: 1 })).toBe(true);
    expect(offeredWith({ offerWith: "categories", categoryIds: [5], productIds: [] }, { id: 1, categoryIds: [3, 5] })).toBe(true);
    expect(offeredWith({ offerWith: "categories", categoryIds: [5], productIds: [] }, { id: 1, categoryIds: [3] })).toBe(false);
    expect(offeredWith({ offerWith: "products", categoryIds: [], productIds: [1, 2] }, { id: 2 })).toBe(true);
    expect(offeredWith({ offerWith: "products", categoryIds: [], productIds: [1, 2] }, { id: 3 })).toBe(false);
  });

  it("needs a main item, and each add-on its own line or any line it goes with", () => {
    expect(checkAddonLines([{ productId: 31, addon: true, addonOf: 20 }], () => true).needsItem).toBe(true);
    const lines = [
      { productId: 20, addon: false },
      { productId: 31, addon: true, addonOf: 20 },
      { productId: 32, addon: true, addonOf: 99 },
      { productId: 33, addon: true, addonOf: 20 },
      // An older app's line, without its link.
      { productId: 34, addon: true },
    ];
    const checked = checkAddonLines(lines, (i) => lines[i]!.productId !== 33);
    expect(checked.needsItem).toBe(false);
    expect([...checked.problems]).toEqual([
      [2, ADDON_NEEDS_ITEM],
      [3, "This add-on doesn't go with the items in your cart."],
    ]);
  });

  it("reads the product form's and the platform's add-on settings", () => {
    expect(parseAddonRule({ offerWith: "categories", categoryIds: ["5", "5", "x"] })).toEqual({ ok: true, value: { offerWith: "categories", categoryIds: [5], productIds: [] } });
    expect(parseAddonRule({ offerWith: "products" })).toMatchObject({ ok: false });
    expect(parseAddonRule({})).toEqual({ ok: true, value: { offerWith: "all", categoryIds: [], productIds: [] } });
    expect(parseAddonSettings({ addonProductIds: "31, 32 31", addonCategoryId: "9", addonTag: " yallapp-addon ", offerWith: "all" }, {})).toEqual({
      ok: true,
      value: { productIds: [31, 32], categoryId: 9, tag: "yallapp-addon", offerWith: { offerWith: "all", categoryIds: [], productIds: [] } },
    });
    expect(parseAddonSettings({ addonTag: "no<tags>" }, {})).toMatchObject({ ok: false, errors: { addonTag: expect.any(String) } });
  });

  it("parses a cart line's addon_of, an older app's line without it", () => {
    expect(cartLines({ lines: [{ product_id: 31, quantity: 1, addon_of: 20 }, { product_id: 20, quantity: 1 }, { product_id: 32, quantity: 1, addon_of: "x" }] })).toEqual([
      { product_id: 31, variation_id: null, quantity: 1, addon_of: 20 },
      { product_id: 20, variation_id: null, quantity: 1 },
      { product_id: 32, variation_id: null, quantity: 1 },
    ]);
  });
});

describe("131 the titles the owner words", () => {
  it("keeps words per language, trimmed, at most 40 characters", () => {
    expect(cleanLangText({ en: "  Make it   extra special ", ar: "أضف لمسة أخرى", tr: "   ", EN1: "x", fr: 5 })).toEqual({ en: "Make it extra special", ar: "أضف لمسة أخرى" });
    expect(cleanLangText({ en: "x".repeat(60) })).toEqual({ en: "x".repeat(40) });
    expect(cleanLangText(null)).toBeNull();
    expect(langTextOfForm({ addons_en: "Make it extra special", addons_ar: "" }, "addons", ["en", "ar"])).toEqual({ value: { en: "Make it extra special" }, error: null });
    expect(langTextOfForm({ addons_en: "x".repeat(41) }, "addons", ["en"]).error).toBe("Keep each title to 40 characters.");
    expect(inLanguage({ en: "A", ar: "ب" }, "ar")).toBe("ب");
    expect(inLanguage({ en: "A" }, "tr", "fallback")).toBe("fallback");
  });

  it("sends the store's titles in its config, and a checkout look's own", () => {
    const app = { vertical: null, hostedSettings: null, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, titles: { addons: { en: "Make it extra special" }, delivery: { tr: "Ne zaman gelsin?" } } } } as unknown as App;
    expect(storeExtrasConfig(app, "TRY", { fees: true }).titles).toEqual({ addons: { en: "Make it extra special" }, gift_card: null, delivery: { tr: "Ne zaman gelsin?" } });
    expect(sectionTitlesJson(null)).toEqual({ addons: null, gift_card: null, delivery: null });
    expect(parseCheckoutLook({ style: "cards", addons_title: { en: " Add a treat " }, card_title: { ar: "كلماتك" }, delivery_title: "nope" })).toEqual({ style: "cards", addons_title: { en: "Add a treat" }, card_title: { ar: "كلماتك" } });
  });

  it("gives a flash sale's title in the app's language", () => {
    const sale = { id: 1, appId: "a", title: "Mother's Day roses", titles: { ar: "ورود عيد الأم" }, productIds: [1], categoryId: null, discount: { kind: "percent" as const, percent: 20 }, startsAt: NOW, endsAt: new Date(NOW.getTime() + 86_400_000), limit: null, sold: 0, platformCode: null, active: true, createdAt: NOW, updatedAt: NOW };
    expect(flashSaleJson(sale, [], NOW, "ar")).toMatchObject({ title: "ورود عيد الأم", titles: { ar: "ورود عيد الأم" } });
    expect(flashSaleJson(sale, [], NOW, "tr").title).toBe("Mother's Day roses");
    expect(flashSaleJson({ ...sale, titles: undefined }, [], NOW).titles).toBeNull();
  });
});

describe("131 add-ons and a one-product flash sale on the shop's own products", () => {
  let store: MemoryStore;
  let app: App;
  const ids: Record<string, number> = {};
  let categoryId = 0;
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
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, shippingCents: 0, freeShippingOverCents: null, payment: encryptPaymentKeys(fresh.id, "api", "secret", true, KEY), weightPricing: { perKgCents: 1000, includedKg: 0 }, titles: { addons: { en: "Make it extra special" } } },
    };
    await store.createApp(app);
    categoryId = (await store.createCatalogCategory({ appId: app.id, name: "Bouquets", now: NOW })).id;
    const at = (s: number) => new Date(NOW.getTime() + s * 1000);
    ids.roses = (await store.createCatalogProduct(product({ name: "Blush Garden", priceCents: 145000, categoryIds: [categoryId], featured: true }), at(1))).id;
    ids.tulips = (await store.createCatalogProduct(product({ name: "Morning Tulips", priceCents: 110000, categoryIds: [categoryId] }), at(2))).id;
    // The demo's add-ons: a vase with every product, the chocolates with the bouquets, a card with the roses only.
    ids.vase = (await store.createCatalogProduct(product({ name: "Ceramic vase", priceCents: 35000, categoryIds: [categoryId], addon: true, addonFor: null, weightGrams: 2000 }), at(3))).id;
    ids.chocolates = (await store.createCatalogProduct(product({ name: "Chocolates", priceCents: 25000, addon: true, addonFor: { offerWith: "categories", categoryIds: [categoryId], productIds: [] } }), at(4))).id;
    ids.card = (await store.createCatalogProduct(product({ name: "Greeting card", priceCents: 5000, addon: true, addonFor: { offerWith: "products", categoryIds: [], productIds: [ids.roses] }, featured: true }), at(5))).id;
    // A flash sale on one bouquet only.
    await store.createFlashSale({ appId: app.id, title: "Blush hour", productIds: [ids.roses], categoryId: null, discount: { kind: "percent", percent: 25 }, startsAt: new Date("2026-11-20T00:00:00Z"), endsAt: new Date("2026-11-21T02:00:00Z"), limit: 12, platformCode: null, active: true, createdAt: NOW, updatedAt: NOW });
  });

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now: FRI_11,
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
    expectContract(method, route.startsWith("/store/products/") ? "/store/products/{product_id}" : route, result);
    return result;
  }

  type Summary = { id: number; name: string; addon?: boolean; sale: { percent_off: number; remaining: number | null; ends_at: string | null } | null };

  it("never lists an add-on on its own: lists, search, by its ID, the home, categories' counts, related and a flash sale's list", async () => {
    const names = (items: Summary[]) => items.map((p) => p.name);
    const list = (await call("GET", "/store/products")).body as { items: Summary[]; total: number };
    expect(names(list.items)).toEqual(["Morning Tulips", "Blush Garden"]);
    expect(list.items.every((p) => p.addon === false)).toBe(true);
    expect(((await call("GET", "/store/products", { query: { search: "card" } })).body as { items: Summary[] }).items).toEqual([]);
    expect(((await call("GET", "/store/products", { query: { ids: `${ids.card},${ids.roses}` } })).body as { items: Summary[] }).items.map((p) => p.id)).toEqual([ids.roses]);
    const home = (await call("GET", "/store/home")).body as { sections: { type: string; products?: Summary[]; categories?: { count: number }[] }[] };
    expect(home.sections.find((s) => s.type === "featured_products")!.products!.map((p) => p.name)).toEqual(["Blush Garden"]);
    expect(home.sections.find((s) => s.type === "categories")!.categories![0]!.count).toBe(2);
    const detail = (await call("GET", `/store/products/${ids.tulips}`)).body as { related: Summary[] };
    expect(names(detail.related)).toEqual(["Blush Garden"]);
    const sales = (await call("GET", "/store/flash-sales")).body as { items: { products: Summary[] }[] };
    expect(names(sales.items[0]!.products)).toEqual(["Blush Garden"]);
  });

  it("offers each product the add-ons the owner chose, with GET /store/addons too", async () => {
    const offered = async (id: number) => (((await call("GET", `/store/products/${id}`)).body as { addons: Summary[] }).addons ?? []).map((p) => p.name);
    // Newest first, as the shop lists them.
    expect(await offered(ids.roses!)).toEqual(["Greeting card", "Chocolates", "Ceramic vase"]);
    expect(await offered(ids.tulips!)).toEqual(["Chocolates", "Ceramic vase"]);
    // An add-on's own page offers none.
    expect(await offered(ids.vase!)).toEqual([]);
    const route = (await call("GET", "/store/addons", { query: { product_id: String(ids.tulips) } })).body as { items: Summary[] };
    expect(route.items.map((p) => [p.name, p.addon])).toEqual([
      ["Chocolates", true],
      ["Ceramic vase", true],
    ]);
    expect(((await call("GET", "/store/addons")).body as { items: Summary[] }).items.map((p) => p.name)).toEqual(["Ceramic vase"]);
    expect((await call("GET", "/store/addons", { query: { product_id: String(ids.vase) } })).status).toBe(404);
  });

  it("puts a flash sale on one product only, wherever it shows", async () => {
    const roses = (await call("GET", `/store/products/${ids.roses}`)).body as Summary;
    expect(roses.sale).toMatchObject({ percent_off: 25, remaining: 12, ends_at: "2026-11-21T02:00:00.000Z" });
    const tulips = (await call("GET", `/store/products/${ids.tulips}`)).body as Summary;
    expect(tulips.sale).toBeNull();
    const onSale = (await call("GET", "/store/products", { query: { on_sale: "true" } })).body as { items: Summary[] };
    expect(onSale.items.map((p) => p.name)).toEqual(["Blush Garden"]);
  });

  it("refuses add-ons alone, checks each goes with its item, and prices them in the total and the weight", async () => {
    const alone = await call("POST", "/store/cart", { body: { lines: [{ product_id: ids.card, quantity: 1, addon_of: ids.roses }] } });
    expect(alone).toMatchObject({ status: 400, body: { code: "addon_needs_item", message: ADDON_NEEDS_ITEM } });
    const link = await call("POST", "/store/checkout-link", { body: { lines: [{ product_id: ids.vase, quantity: 1 }] }, query: { platform: "android" } });
    expect(link).toMatchObject({ status: 400, body: { code: "addon_needs_item" } });

    // The card goes with the roses only: with the tulips it's refused.
    const wrong = (await call("POST", "/store/cart", { body: { lines: [{ product_id: ids.tulips, quantity: 1 }, { product_id: ids.card, quantity: 1, addon_of: ids.tulips }] } })).body as { lines: { available: boolean; problem: string | null; addon?: boolean; addon_of?: number | null }[] };
    expect(wrong.lines[1]).toMatchObject({ available: false, problem: "This add-on doesn't go with the items in your cart.", addon: true, addon_of: ids.tulips });
    expect((await call("POST", "/store/checkout-link", { body: { lines: [{ product_id: ids.tulips, quantity: 1 }, { product_id: ids.card, quantity: 1, addon_of: ids.tulips }] }, query: { platform: "android" } })).status).toBe(409);

    const cart = (await call("POST", "/store/cart", { body: { lines: [{ product_id: ids.roses, quantity: 1 }, { product_id: ids.vase, quantity: 1, addon_of: ids.roses }, { product_id: ids.card, quantity: 2, addon_of: ids.roses }] } })).body as { lines: { available: boolean; addon_of?: number | null }[]; subtotal_amount: string; shipping: string | null; item_count: number };
    expect(cart.lines.map((l) => [l.available, l.addon_of ?? null])).toEqual([
      [true, null],
      [true, ids.roses],
      [true, ids.roses],
    ]);
    // The roses at the flash sale's 1087.50, the vase 350 and two cards 100; the vase's 2 kg priced.
    expect(cart.subtotal_amount).toBe("1537.50");
    expect(cart.item_count).toBe(4);
    expect(cart.shipping).toBe("₺20.00");

    const ok = await call("POST", "/store/checkout-link", { body: { lines: [{ product_id: ids.roses, quantity: 1 }, { product_id: ids.vase, quantity: 1, addon_of: ids.roses }] }, query: { platform: "android" } });
    expect(ok.status).toBe(200);
    const [order] = (await store.listCatalogOrders({ appId: app.id, offset: 0, limit: 5 })).items;
    expect(order!.lines.map((l) => [l.name, l.addonOf ?? null])).toEqual([
      ["Blush Garden", null],
      ["Ceramic vase", ids.roses],
    ]);
  });

  it("gives the owner's add-ons title in the store's config", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { store: { titles: unknown } };
    expect(config.store.titles).toEqual({ addons: { en: "Make it extra special" }, gift_card: null, delivery: null });
  });

  it("offers own add-ons in the shop's order, never inactive ones", () => {
    const list = [
      { id: 1, active: true, addon: true, addonFor: null, categoryIds: [] },
      { id: 2, active: false, addon: true, addonFor: null, categoryIds: [] },
      { id: 3, active: true, addon: false, addonFor: null, categoryIds: [] },
    ] as unknown as Parameters<typeof ownAddonsFor>[0];
    expect(ownAddonsFor(list, { id: 3, categoryIds: [] }).map((p) => p.id)).toEqual([1]);
  });
});

describe("131 a connected platform's add-ons", () => {
  let store: MemoryStore;
  let app: App;
  const item = (id: number, name: string, amount = "300.00") => ({ id, name, price: { amount, regular_amount: null, currency: "TRY", formatted: `₺${amount}`, on_sale: false, range: false } });
  const inner: Connector = {
    async config() {
      return { store: { currency: "TRY", guest_checkout: true, checkout_opens_in: "in_app", reviews: false, delivery_date: { enabled: false, required: false, min_days: 0, max_days: 0, closed_weekdays: [] }, gift_message: { enabled: false, max_length: 200 } } };
    },
    async handle(request) {
      const path = request.path.join("/");
      if (path === "store/products" && request.query.get("category") === "9") return { status: 200, body: { items: [item(52, "Balloons", "60.00")] } };
      if (path === "store/products" && request.query.get("ids")) {
        const wanted = request.query.get("ids")!.split(",").map(Number);
        return { status: 200, body: { items: [item(51, "Chocolates", "90.00"), item(52, "Balloons", "60.00"), item(53, "Teddy", "120.00")].filter((p) => wanted.includes(p.id)) } };
      }
      if (path === "store/products") return { status: 200, body: { items: [item(41, "Tulips"), item(51, "Chocolates", "90.00"), item(53, "Teddy", "120.00")] } };
      if (path === "store/products/41") return { status: 200, body: { ...item(41, "Tulips"), categories: [{ id: 3 }], related: [item(51, "Chocolates", "90.00"), item(42, "Roses")] } };
      if (path === "store/categories") return { status: 200, body: { items: [{ id: 3, name: "Bouquets" }, { id: 9, name: "Gift extras" }] } };
      if (path === "store/home") return { status: 200, body: { sections: [{ type: "categories", title: null, categories: [{ id: 3 }, { id: 9 }] }, { type: "new_products", title: null, products: [item(41, "Tulips"), item(52, "Balloons", "60.00")] }] } };
      if (path === "store/cart") return { status: 200, body: { lines: cartLines(request.body)!.map((l) => ({ product_id: l.product_id, quantity: l.quantity, available: true })), subtotal: "₺0.00" } };
      if (path === "store/checkout-link") return { status: 200, body: { url: "https://shop.example/checkout/1", expires_at: request.now.toISOString(), open_in: "in_app" } };
      return null;
    },
    // Shopify gives tags: the teddy has the owner's.
    async taggedProducts(tag) {
      return tag === "yallapp-addon" ? [53] : [];
    },
  };

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = {
      ...newApp(client.id, null, NOW, "store"),
      backend: "hosted",
      connector: { kind: "platform", platform: "ikas", settings: {}, secretsEncrypted: "x" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, addons: { productIds: [51], categoryId: 9, tag: "yallapp-addon", offerWith: { offerWith: "categories", categoryIds: [3], productIds: [] } } },
    };
    await store.createApp(app);
  });

  const req = (method: string, path: string, body: unknown = null, query: Record<string, string> = {}): ConnectorRequest => ({ method, path: path.split("/"), query: new URLSearchParams(query), body, user: null, now: FRI_11 });
  const names = (items: { name: string }[]) => items.map((p) => p.name);

  it("hides the owner's list, category and tagged products from the app's lists, its category too", async () => {
    const extras = () => withStoreExtras(inner, { store, app });
    expect(names(((await extras().handle(req("GET", "store/products")))!.body as { items: { name: string }[] }).items)).toEqual(["Tulips"]);
    const home = (await extras().handle(req("GET", "store/home")))!.body as { sections: { categories?: { id: number }[]; products?: { name: string }[] }[] };
    expect(home.sections[0]!.categories!.map((c) => c.id)).toEqual([3]);
    expect(names(home.sections[1]!.products!)).toEqual(["Tulips"]);
    const detail = (await extras().handle(req("GET", "store/products/41")))!.body as { addon: boolean; related: { name: string }[]; addons: { name: string; addon: boolean }[] };
    expect(detail.addon).toBe(false);
    expect(names(detail.related)).toEqual(["Roses"]);
    expect(detail.addons.map((a) => [a.name, a.addon])).toEqual([
      ["Chocolates", true],
      ["Balloons", true],
      ["Teddy", true],
    ]);
    const route = (await extras().handle(req("GET", "store/addons", null, { product_id: "41" })))!.body as { items: { name: string }[] };
    expect(names(route.items)).toEqual(["Chocolates", "Balloons", "Teddy"]);
    // Offered with the bouquets' category only: nothing to offer with every product.
    expect(((await extras().handle(req("GET", "store/addons")))!.body as { items: unknown[] }).items).toEqual([]);
  });

  it("refuses add-ons alone and marks their lines, linked to their item", async () => {
    const extras = () => withStoreExtras(inner, { store, app });
    expect(await extras().handle(req("POST", "store/cart", { lines: [{ product_id: 51, quantity: 1 }] }))).toMatchObject({ status: 400, body: { code: "addon_needs_item" } });
    expect(await extras().handle(req("POST", "store/checkout-link", { lines: [{ product_id: 53, quantity: 1 }] }, { platform: "android" }))).toMatchObject({ status: 400, body: { code: "addon_needs_item" } });
    const cart = (await extras().handle(req("POST", "store/cart", { lines: [{ product_id: 41, quantity: 1 }, { product_id: 51, quantity: 1, addon_of: 41 }] })))!.body as { lines: Record<string, unknown>[] };
    expect(cart.lines[1]).toMatchObject({ product_id: 51, addon: true, addon_of: 41, available: true });
    expect((await extras().handle(req("POST", "store/checkout-link", { lines: [{ product_id: 41, quantity: 1 }, { product_id: 51, quantity: 1, addon_of: 41 }] }, { platform: "android" })))!.status).toBe(200);
  });

  it("leaves a platform shop without add-ons as it was", async () => {
    app = { ...app, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } };
    const extras = withStoreExtras(inner, { store, app });
    expect(names(((await extras.handle(req("GET", "store/products")))!.body as { items: { name: string }[] }).items)).toEqual(["Tulips", "Chocolates", "Teddy"]);
    expect((await extras.handle(req("POST", "store/cart", { lines: [{ product_id: 51, quantity: 1 }] })))!.status).toBe(200);
  });
});
