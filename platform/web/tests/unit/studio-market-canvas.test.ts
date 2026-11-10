import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarketSection } from "@/components/studio/market";
import { StudioView, type StudioLook } from "@/components/studio/view";
import { ENGINES } from "@/lib/app/kinds";
import { ownContentSetup } from "@/lib/app/own-content";
import { newApp } from "@/lib/app/setup";
import type { App } from "@/lib/data/types";
import { demoKind } from "@/lib/demo/constants";
import type { StudioMarket, StudioNode, StudioPage } from "@/lib/pages/types";
import { seedDemoSamples } from "@/lib/samples/demo";
import { canvasData, dartHash, marketSamples, pickVendors, type MarketCanvas } from "@/lib/studio/market-canvas";
import { marketCanvasOf } from "@/lib/studio/market-canvas-data";
import { NOW, days, setupClient } from "./helpers";

/**
 * 115.14 The editor's canvas draws a marketplace's `market` elements as the
 * app draws them (mobile/lib/modules/market/widgets/market_sections.dart),
 * with the project's places, offers, cuisines and orders, and the app's
 * samples where it has none: never a grey box with the section's name.
 */

const LOOK: StudioLook = { name: "Zad", logoUrl: null, brand: "#1F7A4D", font: "Cairo", tabs: [], activeTab: null };
const WORDS = { price: "Price", addPicture: "Add a picture", addVideo: "Add a video", send: "Send", search: "Search", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds", copy: "Copy" };

const section = (id: string, market: StudioMarket, title?: string, text?: string, extra: Partial<StudioNode> = {}): StudioNode => ({ id, type: "market", market, ...(title ? { title } : {}), ...(text ? { text } : {}), ...extra });

/** The approved market home (mobile/test/support/market_fixtures.dart `homePage`). */
const HOME: StudioPage = {
  background: "#F6F3EE",
  dark_background: "#0F0E1A",
  body: {
    id: "body",
    type: "column",
    children: [
      section("hero", { section: "address" }, "Hungry? Order in minutes.", undefined, { translations: { ar: { title: "جعان؟ اطلب في دقايق." } } }),
      section("kinds", { section: "kinds" }),
      section("offers", { section: "offers" }, "Today’s offers"),
      section("fast", { section: "vendors", style: "spotlight", kind: "restaurant", sort: "fastest", limit: 6 }, "Fastest near you", "Hot food at your door in under 30 min"),
      section("cuisines", { section: "cuisines" }, "What’s your mood?"),
      section("club", { section: "club" }, "Free delivery on every order", "Join the club for free delivery and members’ offers."),
      section("shops", { section: "vendors", style: "tiles", kind: "grocery", limit: 6 }, "Supermarkets & shops", "Groceries in about 20 minutes"),
      section("again", { section: "reorder" }, "Order again"),
      section("all", { section: "vendors", style: "list", kind: "restaurant" }, "All restaurants"),
    ],
  },
};

const draw = (props: { lang?: string; dark?: boolean; market?: MarketCanvas | null; page?: StudioPage } = {}) =>
  renderToStaticMarkup(createElement(StudioView, { page: props.page ?? HOME, lang: (props.lang ?? "en") as "en", defaultLang: "en", dark: props.dark ?? false, look: LOOK, pickable: { items: {}, categories: {} }, words: WORDS, market: props.market }));

/** The HTML one section drew, from its `data-studio-market` to the next element's. */
function part(html: string, id: string): string {
  const start = html.indexOf(`data-studio-node="${id}"`);
  expect(start, id).toBeGreaterThan(-1);
  const next = html.indexOf("data-studio-node=", start + 10);
  return html.slice(start, next === -1 ? undefined : next);
}

const one = (node: StudioNode, props: { lang?: string; dark?: boolean; data?: MarketCanvas | null; accent?: string } = {}) =>
  renderToStaticMarkup(createElement(MarketSection, { node, lang: props.lang ?? "en", defaultLang: "en", dark: props.dark ?? false, brand: LOOK.brand, accent: props.accent, color: node.color ?? undefined, data: props.data }));

describe("the market element on the canvas", () => {
  it("draws every part of the approved home with real content, not a labelled box", () => {
    const html = draw();
    // The old placeholder: a dashed box with the section's name.
    expect(html).not.toContain("1.5px dashed");
    const hero = part(html, "hero");
    expect(hero).toContain("Deliver to");
    expect(hero).toContain("Home · 9 Road 233, Maadi");
    expect(hero).toContain("Hungry? Order in minutes.");
    expect(hero).toContain("Restaurants, dishes or groceries");
    for (const icon of ["location_on", "notifications", "shopping_bag", "search", "tune"]) expect(hero).toContain(`>${icon}<`);

    const kinds = part(html, "kinds");
    for (const word of ["Food", "120+ restaurants", "Market", "Groceries in 20 min", "New", "Sweets", "Coffee", "Bakery"]) expect(kinds).toContain(word);
    expect(kinds).toContain('src="/design-pictures/art-dish-burger.png"');

    const offers = part(html, "offers");
    for (const word of ["Today’s offers", "Up to 40% off", "Lunch from 30 restaurants near you, until 4 pm.", "Code LUNCH40", "Fresh market week"]) expect(offers).toContain(word);
    expect(offers).toContain("linear-gradient(to bottom right, #FF8A3D, #E4472B)");

    const fast = part(html, "fast");
    expect(fast).toContain("Fastest near you");
    expect(fast).toContain("See all");
    // Fastest first: Bean Street (10–20 min), then Layers Bakehouse (15–25 min).
    expect(fast.indexOf("Bean Street")).toBeLessThan(fast.indexOf("Layers Bakehouse"));
    for (const word of ["10–20 min", "Free with Club", "4.7", "(2.0k)", "Coffee · Drinks · 0.5 km", "Free delivery", "Min. EGP 60.00", ">BS<"]) expect(fast).toContain(word);
    expect(fast).not.toContain("Fresh Basket");

    const cuisines = part(html, "cuisines");
    for (const word of ["What’s your mood?", "Burgers", "Breakfast", "Wraps", "Desserts", "art-dish-cheesecake.png"]) expect(cuisines).toContain(word);

    const club = part(html, "club");
    for (const word of ["CLUB", "Free delivery on every order", "Join the club for free delivery and members’ offers.", "Join", ">two_wheeler<"]) expect(club).toContain(word);

    const shops = part(html, "shops");
    for (const word of ["Supermarkets &amp; shops", "Groceries in about 20 minutes", "Fresh Basket", "Daily Bread", "15–25 min", "Free delivery", ">FB<"]) expect(shops).toContain(word);
    expect(shops).not.toContain("Ember &amp; Bun");

    const again = part(html, "again");
    for (const word of ["Ember &amp; Bun", "Last Friday", "2× Smoked double, fries", "EGP 640.00", "Order again", "Fresh Basket", "Weekly basket · 14 items"]) expect(again).toContain(word);

    const all = part(html, "all");
    for (const word of ["All restaurants", "Ember &amp; Bun", "4.8", "(2.4k)", "Burgers · Grills", "20–30 min", "Bowl &amp; Spoon", "Busy", "EGP 10.00 delivery"]) expect(all).toContain(word);
  });

  it("gives each place the mark colour the app gives it", () => {
    // The Dart VM's String.hashCode, as the app computes it.
    expect(dartHash("Ember & Bun")).toBe(609219371);
    expect(dartHash("Bean Street")).toBe(225969046);
    expect(dartHash("Fresh Basket")).toBe(980758545);
    expect(dartHash("جعان")).toBe(245707992);
    const html = draw();
    // Ember & Bun's red, Bean Street's purple, Fresh Basket's orange.
    expect(html).toMatch(/background:#C2185B[^>]*>EB</);
    expect(html).toMatch(/background:#7B4DB6[^>]*>BS</);
    expect(html).toMatch(/background:#D9822B[^>]*>FB</);
  });

  it("is in the language being edited, right to left in Arabic", () => {
    const html = draw({ lang: "ar" });
    expect(html).toContain('dir="rtl"');
    for (const word of ["التوصيل إلى", "جعان؟ اطلب في دقايق.", "مطاعم أو أطباق أو بقالة", "الطعام", "الماركت", "خصم حتى 40%", "الكود", "عرض الكل", "النادي", "انضم", "اطلب مرة أخرى", "الجمعة الماضية", "توصيل مجاني", "برجر · مشويات"]) expect(html).toContain(word);
    // Amounts stay left to right inside Arabic, and the arrows point the way it reads.
    expect(html).toContain("⁦EGP 640.00⁩");
    expect(html).toContain("transform:scaleX(-1)");
    expect(html).toContain("linear-gradient(to bottom left");
    const tr = draw({ lang: "tr" });
    for (const word of ["Teslimat adresi", "Yemek", "Tümü", "Katıl", "Tekrar sipariş ver", "Ücretsiz teslimat"]) expect(tr).toContain(word);
  });

  it("takes the project's colours and its dark look", () => {
    const light = one(section("h", { section: "address" }, "Hi"), { accent: "#E91E63" });
    expect(light).toContain("linear-gradient(to bottom right, #1F7A4D,");
    expect(light).toContain("background:#E91E63");
    const dark = one(section("c", { section: "cuisines" }, "Mood"), { dark: true });
    expect(dark).toContain("color:#F4EFE6");
    expect(dark).toContain("#2C2A47");
    // A dark brand colour is lightened on the dark cards, as the app does.
    const deep = renderToStaticMarkup(createElement(MarketSection, { node: section("k", { section: "kinds" }), lang: "en", defaultLang: "en", dark: true, brand: "#0E0D24" }));
    expect(deep).not.toContain("#0E0D24");
    // The element's own colour leads the address, and its corners lead the places' cards.
    expect(one(section("h", { section: "address" }, "Hi", undefined, { color: "#2C6CDB" }))).toContain("linear-gradient(to bottom right, #2C6CDB,");
    const cards = one(section("v", { section: "vendors", style: "spotlight", card: { radius: 8, hide: ["rating", "offer"] } }, "Near"));
    expect(cards).toContain("border-radius:8px");
    expect(cards).not.toContain("data-market-rating");
    expect(cards).not.toContain("20% off your first order");
  });

  it("shows the project's own places, offers, cuisines and orders, and samples only for what it has none of", () => {
    const project: MarketCanvas = {
      address: null,
      kinds: [{ id: "restaurant", kind: "restaurant", title: null, subtitle: null, places: 2, imageUrl: "", badge: null }],
      offers: [],
      cuisines: [{ id: "grill", name: "Grill", imageUrl: "" }],
      vendors: [
        { id: "1", kind: "restaurant", name: "Bab El Sharq Grill", coverUrl: "", logoUrl: "", tags: ["Grill"], rating: null, ratings: 0, etaMin: 25, etaMax: 40, deliveryFee: "EGP 20.00", freeDelivery: false, minOrder: "EGP 100.00", deliveredBy: "vendor", state: "open", promo: null, club: false, clubBenefit: null, distanceKm: 1.4, opensAt: null },
        { id: "2", kind: "restaurant", name: "Nile Pizza Co.", coverUrl: "", logoUrl: "", tags: ["Pizza"], rating: 4.5, ratings: 12, etaMin: 15, etaMax: 30, deliveryFee: "EGP 0.00", freeDelivery: true, minOrder: null, deliveredBy: "app", state: "closed", promo: null, club: false, clubBenefit: null, distanceKm: 2, opensAt: "09:00" },
      ],
      reorders: [],
    };
    const html = draw({ market: project });
    expect(part(html, "hero")).toContain("Choose your address");
    const kinds = part(html, "kinds");
    expect(kinds).toContain("Food");
    expect(kinds).toContain("2 places");
    // A place without pictures shows the app's soft tint, never an empty box.
    expect(kinds).toContain("data-market-picture");
    const fast = part(html, "fast");
    expect(fast).toContain("Bab El Sharq Grill");
    expect(fast).toContain(">New<");
    expect(fast).toContain("EGP 20.00 delivery");
    expect(fast).toContain("Closed · opens 09:00");
    expect(fast).not.toContain("Ember &amp; Bun");
    expect(part(html, "cuisines")).toContain("Grill");
    // No offers or orders yet: the app's samples.
    expect(part(html, "offers")).toContain("Up to 40% off");
    expect(part(html, "again")).toContain("Last Friday");
    // No grocery places: the app's sample shops.
    expect(part(html, "shops")).toContain("Fresh Basket");
    expect(canvasData(project, "en").vendors).toHaveLength(2);
    expect(canvasData(null, "ar")).toEqual(marketSamples("ar"));
  });

  it("picks the places as the app does: kind, free delivery, open first, sorted and limited", () => {
    const all = marketSamples("en").vendors;
    expect(pickVendors(all, { section: "vendors", kind: "grocery" }).map((v) => v.name)).toEqual(["Fresh Basket", "Daily Bread", "Green Corner", "The Roastery"]);
    expect(pickVendors(all, { section: "vendors", kind: "grocery", sort: "nearest" }).map((v) => v.name)).toEqual(["Daily Bread", "Fresh Basket", "Green Corner", "The Roastery"]);
    expect(pickVendors(all, { section: "vendors", sort: "rating", limit: 2 }).map((v) => v.name)).toEqual(["Layers Bakehouse", "Ember & Bun"]);
    expect(pickVendors(all, { section: "vendors", free_delivery: true }).every((v) => v.freeDelivery)).toBe(true);
    // Closed places go last.
    expect(pickVendors(all, { section: "vendors", kind: "grocery", sort: "rating" }).at(-1)!.name).toBe("The Roastery");
  });
});

describe("the canvas's marketplace data", () => {
  it("is the project's places from Zad's samples, read as the app reads them; none for other projects", { timeout: 60_000 }, async () => {
    const { store, client } = await setupClient({ plan: "pro", activeUntil: days(60) });
    const kind = demoKind("marketplace");
    const base: App = { ...newApp(client.id, null, NOW, kind.engine, kind.vertical), backend: "hosted", siteUrl: null, appName: "Zad" };
    const app: App = { ...base, ...ownContentSetup(ENGINES[kind.engine].ownContent.kind, base), websiteDoneAt: NOW };
    await store.createApp(app);
    const deps = { store, assetUrl: (id: string) => `/a/${id}`, platformUrl: "https://yallapp.test" };
    const empty = await marketCanvasOf((await store.getAppById(app.id))!, deps, NOW);
    expect(empty).toMatchObject({ vendors: [], offers: [], reorders: [] });

    await seedDemoSamples({ store, putBlob: async () => undefined, now: NOW }, app.id, "marketplace");
    const data = (await marketCanvasOf((await store.getAppById(app.id))!, deps, NOW))!;
    expect(data.vendors.map((v) => v.name).sort()).toEqual(["Bab El Sharq Grill", "Nile Pizza Co.", "Zad Market"]);
    expect(data.kinds.map((k) => [k.kind, k.places])).toEqual(
      expect.arrayContaining([
        ["restaurant", 2],
        ["grocery", 1],
      ]),
    );
    expect(data.cuisines.length).toBeGreaterThan(0);
    // A customer among the places sees their times.
    expect(data.vendors.some((v) => v.etaMin !== null)).toBe(true);
    // Drawn on the canvas: the project's places, with the app's sample offers.
    const html = draw({ market: data });
    expect(html).toContain("Bab El Sharq Grill");
    expect(html).toContain("Zad Market");
    expect(html).toContain("Up to 40% off");

    const shop = { ...newApp(client.id, null, NOW, "store", null), backend: "hosted" as const };
    expect(await marketCanvasOf(shop, deps, NOW)).toBeNull();
  });
});
