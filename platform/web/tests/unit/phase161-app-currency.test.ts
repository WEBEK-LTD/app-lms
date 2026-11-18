import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { StoriesControls } from "@/app/studio/editor/premium-motion-controls";
import { DashboardI18n } from "@/components/dashboard-i18n";
import { dashboardMessages, knownEnglish } from "@/i18n/dashboard";
import { newApp } from "@/lib/app/setup";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogProductInput, type CatalogSettings, type HostedUser } from "@/lib/data/types";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { courseItem, itemPrice, pricedEntry } from "@/lib/hosted/pages";
import { handleHosted, type HostedContext, type HostedRequest } from "@/lib/hosted/service";
import { addDisplayPrices, type DisplayCurrency } from "@/lib/money/display";
import { ratesOf, type Rates } from "@/lib/money/rates";
import { DEFAULT_DELIVERY } from "@/lib/selling/delivery";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { publishLayout } from "@/lib/pages/layout";
import { itemSourcesFor } from "@/lib/pages/sources";
import type { Action, LayoutContent, StudioNode, StudioPage } from "@/lib/pages/types";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { appWords } from "@/lib/studio/app-words";
import { TEMPLATES, type SectionContext } from "@/lib/studio/sections";
import { startLayout } from "@/lib/studio/start";
import { allNodes, mapTree } from "@/lib/studio/tree";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/**
 * 161 The whole app in the customer's currency. The owner of Kech Flora (18
 * November), a flower shop made from Leqaa's Signature template selling in
 * Moroccan dirhams: "The currency on the home page is in Moroccan even
 * though I set my currency to something else." The home's Studio lists
 * were served by GET /pages with the shop's words alone (`price_label`),
 * never converted: their connector reads didn't carry the customer's
 * currency, and a card had no amount or currency. Every price the hosted
 * API sends of Yallapp's own now has its amount, currency and `display`
 * (the same in the customer's), the owner's switch and list respected, and
 * what is charged as before. And a shop's story's Open opens its link, or
 * the shop, never nothing (which left the customer on Home).
 */

const RATES: Rates = ratesOf({ rates: { USD: 1, MAD: 10, EGP: 50, EUR: 0.92 }, date: "2026-11-18", fetchedAt: NOW.toISOString(), source: "ExchangeRate-API" }, null);
const SHOP: Action = { type: "screen", screen: "search" };

function contextOf(app: App): SectionContext {
  let n = 0;
  return { brand: app.primaryColor, source: itemSourcesFor(app)[0] ?? null, app: app.appName!, lang: "en", w: appWords("en", app.appName!), picture: (f) => `https://yallapp.test/design-pictures/${f}`, newId: () => `kf-${++n}`, kind: { type: app.appType, vertical: app.vertical ?? null } };
}

/** Leqaa's look started for `app`, as a new project gets it. */
function leqaa(app: App, look: "a" | "b"): LayoutContent {
  const template = TEMPLATES.find((t) => t.id === `flowers_signature_${look}`)!;
  return startLayout(app, template, defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), NOW, contextOf(app));
}

function kechFlora(clientId: string, settings: Partial<CatalogSettings> = {}): App {
  return { ...newApp(clientId, null, NOW, "store"), section: "studio", backend: "hosted", appName: "Kech Flora", websiteDoneAt: NOW, connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "MAD", ...settings } };
}

/** Every element of a served page, the lists' cards with them. */
const nodesOf = (page: StudioPage): StudioNode[] => allNodes(page);
type Card = { id: string; price_label?: string; price?: Record<string, unknown> & { display?: Record<string, unknown> }; sale?: Record<string, unknown> & { display?: Record<string, unknown> } };
const cardsOf = (page: StudioPage): Card[] => nodesOf(page).flatMap((n) => ((n as { items?: Card[] }).items ?? []));

describe("161 GET /pages: a MAD shop's Leqaa home in the customer's currency", () => {
  let store: MemoryStore;
  let app: App;
  const user = { id: 5 } as HostedUser;
  const product = (input: Partial<CatalogProductInput>): CatalogProductInput => ({ appId: app.id, name: "Bouquet", description: "", priceCents: 25000, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: true, active: true, sku: null, ...input });
  const connector = () => new CatalogConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" });
  const context = (): HostedContext => ({ store, app, active: true, now: NOW, ip: "203.0.113.9", secret: "test-hosted-secret", sender: new LogSender(), push: false, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test", connector: connector() });
  const call = (path: string, currency?: string, query: Record<string, string> = {}, method = "GET", body?: unknown) =>
    handleHosted(context(), { method, path: path.split("/").filter(Boolean), query: new URLSearchParams({ platform: "android", ...query }), body, token: null, headers: new Headers(currency ? { "x-currency": currency } : {}) } as HostedRequest);
  const page = async (slug: string, currency?: string) => {
    const result = await call(`/pages/${slug}`, currency);
    expect(result.status).toBe(200);
    expectContract("GET", "/pages/{slug}", result);
    return (result.body as { studio: StudioPage }).studio;
  };
  const publish = async (layout: LayoutContent) => {
    const done = await publishLayout(store, app, layout, "owner@kechflora.test", NOW);
    expect(done.ok ? [] : done.errors).toEqual([]);
  };

  beforeEach(async () => {
    ({ store } = await setupClient({ plan: "growth" }));
    clearPlatformSettingsCache();
    await store.setPlatformSetting("exchangeRates", { rates: RATES.perDollar, date: "2026-11-18", fetchedAt: NOW.toISOString(), source: "ExchangeRate-API" }, "daily job", NOW);
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = kechFlora(client.id);
    await store.createApp(app);
    const roses = await store.createCatalogProduct(product({ name: "Atlas Roses", priceCents: 32000, salePriceCents: 25000 }), new Date(NOW.getTime() + 1000));
    await store.createCatalogProduct(product({ name: "Medina Lilies", priceCents: 18000 }), new Date(NOW.getTime() + 2000));
    await store.createCatalogCoupon({ appId: app.id, code: "LEQAA10", kind: "amount", value: 5000, minOrderCents: 30000, endsAt: null, maxUses: null, active: true, createdAt: NOW, public: true, startsAt: null });
    await store.createFlashSale({ appId: app.id, title: "Rose hour", productIds: [roses.id], categoryId: null, discount: { kind: "percent", percent: 10 }, startsAt: new Date(NOW.getTime() - 3_600_000), endsAt: new Date(NOW.getTime() + 3_600_000), limit: 12, platformCode: null, active: true, createdAt: NOW, updatedAt: NOW });
    void user;
  });

  it.each(["a", "b"] as const)("look %s: every card has its amount and currency, and the same in USD, EGP or EUR; the words kept", async (look) => {
    await publish(leqaa(app, look));
    for (const [currency, rate] of [["USD", 0.1], ["EGP", 5], ["EUR", 0.092]] as const) {
      for (const slug of ["home", "wishlist"]) {
        const cards = cardsOf(await page(slug, currency));
        expect(cards.length, `${look} ${slug}`).toBeGreaterThan(0);
        for (const card of cards) {
          // Older apps keep reading the shop's words.
          expect(card.price_label, card.id).toMatch(/MAD/);
          expect(card.price, card.id).toMatchObject({ currency: "MAD", amount: expect.stringMatching(/^\d+\.\d{2}$/) });
          expect(card.price!.display, card.id).toMatchObject({ currency, rate });
          const shop = Number(card.price!.amount);
          expect(Number(card.price!.display!.amount)).toBeCloseTo(Math.round(shop * rate * 100) / 100, 2);
          if (card.sale) expect(card.sale.display, card.id).toMatchObject({ currency, now_formatted: expect.any(String), was_formatted: expect.any(String) });
        }
      }
    }
  });

  it("the flash sale's cards and the shop's coupon too; nothing in MAD left without its USD", async () => {
    await publish(leqaa(app, "a"));
    const home = await page("home", "USD");
    const flash = nodesOf(home).find((n) => n.type === "flash_sale") as StudioNode & { items: Card[] };
    expect(flash.items.length).toBeGreaterThan(0);
    for (const card of flash.items) {
      expect(card.sale!.display).toMatchObject({ currency: "USD" });
      expect(card.price!.display).toMatchObject({ currency: "USD" });
    }
    const coupon = nodesOf(home).find((n) => n.type === "coupon") as StudioNode & { coupon_offer: Record<string, unknown> };
    expect(coupon.coupon_offer).toMatchObject({ currency: "MAD", amount_off: "50.00", min_order: "300.00", display: { currency: "USD", amount_off_formatted: "$5.00", min_order_formatted: "$30.00" } });
  });

  it("the owner's switch off, or a currency outside their list: no display anywhere, the amounts and words as they are", async () => {
    await publish(leqaa(app, "a"));
    for (const settings of [{ showInCustomerCurrency: false }, { customerCurrencies: ["EUR"] }]) {
      app = { ...app, catalogSettings: { ...app.catalogSettings!, ...settings } };
      await store.updateApp(app.id, { catalogSettings: app.catalogSettings }, NOW);
      const home = await page("home", "USD");
      expect(JSON.stringify(home)).not.toContain('"display"');
      for (const card of cardsOf(home)) expect(card.price).toMatchObject({ currency: "MAD" });
    }
  });

  it("the cart: its lines, the coupon's discount and the total in USD; what is charged stays the shop's", async () => {
    const products = (await call("/store/products")).body as { items: { id: number; name: string }[] };
    const lines = [{ product_id: products.items.find((p) => p.name === "Medina Lilies")!.id, quantity: 2 }];
    const cart = await call("/store/cart", "USD", {}, "POST", { lines, coupon: "LEQAA10" });
    expectContract("POST", "/store/cart", cart);
    expect(cart.body).toMatchObject({
      currency: "MAD",
      discount_amount: "50.00",
      display: { currency: "USD", subtotal: "$36.00", discount: "$5.00", total: "$31.00" },
      charge: { currency: "MAD", in_customer_currency: false },
      lines: [{ currency: "MAD", unit_price_amount: "180.00", display: { currency: "USD", unit_price: "$18.00", line_total: "$36.00" } }],
    });
  });

  it("the config: the gift checkout's slot fees in USD too", async () => {
    app = { ...app, catalogSettings: { ...app.catalogSettings!, delivery: { ...DEFAULT_DELIVERY, enabled: true, timezone: "Africa/Casablanca", slots: [{ id: "s1", start: "10:00", end: "14:00", feeCents: 2000, capacity: null }] } } };
    await store.updateApp(app.id, { catalogSettings: app.catalogSettings }, NOW);
    const config = await call("/config", "USD", { app_version: "1.0.0" });
    expectContract("GET", "/config", config);
    const slots = (config.body as { store: { delivery_date: { slots: Record<string, unknown>[] } } }).store.delivery_date.slots;
    expect(slots[0]).toMatchObject({ currency: "MAD", fee: "20.00", display: { currency: "USD", fee_formatted: "$2.00" } });
    // And the day's slots, asked on their own.
    const day = await call("/store/delivery-slots", "USD", { date: "2026-11-21" });
    expect((day.body as { slots: Record<string, unknown>[] }).slots[0]).toMatchObject({ display: { currency: "USD", fee_formatted: "$2.00" } });
  });

  it("an order: its lines and total at the rate of its own day when the customer still shows prices in its currency", async () => {
    const order = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: sha256Hex("o-161"),
      userId: 5,
      status: "processing",
      lines: [{ productId: 1, name: "Medina Lilies", quantity: 2, unitCents: 18000, imageAssetId: null, digital: false }],
      subtotalCents: 36000,
      shippingCents: 0,
      totalCents: 36000,
      currency: "MAD",
      // The day's rate then: 1 MAD = 0.11 USD.
      customerCurrency: { currency: "USD", totalCents: 3960, rate: 0.11, rateDate: "2026-11-10", charged: false },
      customer: null,
      paymentId: null,
      createdAt: NOW,
      paidAt: NOW,
      updatedAt: NOW,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    } as unknown as Parameters<MemoryStore["createCatalogOrder"]>[0]);
    const read = async (currency: string) => {
      const display: DisplayCurrency = { currency, rates: RATES };
      const answer = await connector().handle({ method: "GET", path: ["me", "orders"], query: new URLSearchParams(), body: null, user: { id: 5 } as HostedUser, now: NOW, display });
      // As the hosted API answers: today's rate for what has none yet.
      return (addDisplayPrices(answer!.body, display) as { items: Record<string, unknown>[] }).items.find((o) => o.id === order.id)! as { display: Record<string, unknown>; items: { display: Record<string, unknown> }[] };
    };
    const usd = await read("USD");
    expect(usd).toMatchObject({ currency: "MAD", total_amount: "360.00", display: { currency: "USD", total: "$39.60", rate: 0.11 } });
    expect(usd.items[0]!.display).toMatchObject({ currency: "USD", total: "$39.60" });
    // Another currency chosen since: today's rate.
    const eur = await read("EUR");
    expect(eur.display).toMatchObject({ currency: "EUR", rate: 0.092 });
  });
});

describe("161 a shop's stories: Open opens the story's link, or the shop", () => {
  let store: MemoryStore;
  let app: App;
  const context = (): HostedContext => ({ store, app, active: true, now: NOW, ip: "203.0.113.9", secret: "test-hosted-secret", sender: new LogSender(), push: false, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test", connector: new CatalogConnector({ store, app, assetUrl: (id) => id, platformUrl: "https://yallapp.test" }) });
  const storiesOf = async (slug: string) => {
    const result = await handleHosted(context(), { method: "GET", path: ["pages", slug], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null });
    expect(result.status).toBe(200);
    expectContract("GET", "/pages/{slug}", result);
    return nodesOf((result.body as { studio: StudioPage }).studio).filter((n) => n.type === "stories");
  };

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = kechFlora(client.id);
    await store.createApp(app);
  });

  it("the template's occasions open the shop, as made", async () => {
    await publishLayout(store, app, leqaa(app, "a"), "owner@kechflora.test", NOW);
    const [stories] = await storiesOf("home");
    expect(stories!.slides!.length).toBe(5);
    for (const slide of stories!.slides!) expect(slide.action).toEqual(SHOP);
  });

  it("one with its own link keeps it; one without opens the shop", async () => {
    const layout = leqaa(app, "a");
    const links: (Action | null)[] = [{ type: "page", page_slug: "bouquet" }, null, { type: "url", url: "https://kechflora.ma/love", open_in: "in_app" }, { type: "screen", screen: "orders" }, null];
    const edited: LayoutContent = {
      ...layout,
      pages: layout.pages.map((p) => (p.slug === "home" ? { ...p, studio: { ...p.studio!, body: mapTree(p.studio!.body, (n) => (n.type === "stories" ? { ...n, slides: n.slides!.map((s, i) => ({ ...s, action: links[i] ?? null })) } : n))! } } : p)),
    };
    const published = await publishLayout(store, app, edited, "owner@kechflora.test", NOW);
    expect(published.ok ? [] : published.errors).toEqual([]);
    const [stories] = await storiesOf("home");
    expect(stories!.slides!.map((s) => s.action)).toEqual([{ type: "page", page_slug: "bouquet" }, SHOP, { type: "url", url: "https://kechflora.ma/love", open_in: "in_app" }, { type: "screen", screen: "orders" }, SHOP]);
  });

  it("an academy's stories as they are (no shop to fall back on)", async () => {
    const academy: App = { ...newApp(app.clientId, null, NOW, "lms"), section: "studio", backend: "hosted", appName: "Nour", websiteDoneAt: NOW, connector: { kind: "courses" } };
    await store.createApp(academy);
    const layout = defaultLayout(academy, BUILT_IN_APP_DEFAULTS, NOW);
    const home = { slug: "home", title: "Home", show_title: false, blocks: [], updated_at: NOW.toISOString(), studio: { body: { id: "root", type: "column", children: [{ id: "st", type: "stories", slides: [{ image_url: "https://yallapp.test/a.jpg", heading: "Hi", subheading: null, action: null }] }] } } } as unknown as LayoutContent["pages"][number];
    const published = await publishLayout(store, academy, { ...layout, pages: [home, ...layout.pages.filter((p) => p.slug !== "home")] }, "owner@nour.test", NOW);
    expect(published.ok ? [] : published.errors).toEqual([]);
    app = academy;
    const [stories] = await storiesOf("home");
    expect(stories!.slides![0]!.action ?? null).toBeNull();
  });

  it("Studio says what a story's Open opens, and that it's the shop without a link (en, Egyptian Arabic, Turkish)", () => {
    const node: StudioNode = { id: "st", type: "stories", slides: [{ image_url: "https://yallapp.test/a.jpg", heading: "Love", subheading: null, action: null }] };
    const html = (lang: "en" | "ar" | "tr") => {
      const controls = createElement(StoriesControls, { node, onChange: () => {}, lang: "en", defaultLang: "en", link: () => createElement("span", { "data-link": true }), shop: true });
      const props: ComponentProps<typeof DashboardI18n> = { lang, messages: dashboardMessages(lang), knownEnglish: lang === "en" ? {} : knownEnglish(), children: controls };
      return renderToStaticMarkup(createElement(DashboardI18n, props));
    };
    expect(html("en")).toContain("Its Open button opens");
    expect(html("en")).toContain("Without a link, or with one the app can&#x27;t open, Open opens the shop.");
    expect(html("ar")).toContain("زرار «افتح» بتاعها بيفتح");
    expect(html("tr")).toContain("Aç düğmesinin açtığı");
    // Not in an app without a shop.
    const plain = renderToStaticMarkup(createElement(DashboardI18n, { lang: "en", messages: dashboardMessages("en"), knownEnglish: {}, children: createElement(StoriesControls, { node, onChange: () => {}, lang: "en", defaultLang: "en", link: () => null }) }));
    expect(plain).not.toContain("data-story-open-hint");
  });
});

describe("161 the parts", () => {
  const display: DisplayCurrency = { currency: "USD", rates: RATES };

  it("a card's price: its amounts and currency, a range's dearest end, nothing without an amount", () => {
    expect(itemPrice({ amount: "100.00", currency: "MAD", formatted: "MAD 100.00", range: true, max_amount: "200.00", regular_amount: null, on_sale: false })).toEqual({ price: { amount: "100.00", currency: "MAD", formatted: "MAD 100.00", range: true, max_amount: "200.00", on_sale: false } });
    expect(itemPrice({ is_free: true, amount: null, currency: null, formatted: null })).toEqual({});
    // A free course: 0 in its currency (its words "Free"); from a source that names none, nothing.
    expect(courseItem({ id: 7, title: "Intro", price: { is_free: true, amount: "0.00", currency: "EGP", formatted: null } }, "en")).toMatchObject({ price_label: "Free", price: { amount: "0.00", currency: "EGP", formatted: "E£0.00" } });
    expect(courseItem({ id: 7, title: "Intro", price: { is_free: true } }, "en")).not.toHaveProperty("price");
    // A range, both ends converted.
    const range = addDisplayPrices({ amount: "100.00", currency: "MAD", formatted: "MAD 100.00 – MAD 200.00", range: true, max_amount: "200.00" }, display) as unknown as { display: Record<string, unknown> };
    expect(range.display).toMatchObject({ formatted: "$10.00 – $20.00", max_amount: "20.00" });
  });

  it("a pricing element's plans in the customer's currency", () => {
    expect(pricedEntry({ title: "Monthly", price: 10000, price_yearly: 100000 }, "EGP", display)).toMatchObject({ display: { currency: "USD", price: "$2.00", price_yearly: "$20.00", rate: 0.02 } });
    expect(pricedEntry({ title: "Monthly", price: 10000 }, "USD", display)).toEqual({ title: "Monthly", price: 10000 });
    expect(pricedEntry({ title: "Monthly", price: 10000 }, "EGP", null)).toEqual({ title: "Monthly", price: 10000 });
  });
});
