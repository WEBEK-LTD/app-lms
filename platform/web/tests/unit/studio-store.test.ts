import { beforeEach, describe, expect, it } from "vitest";
import { KINDS } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogProductInput } from "@/lib/data/types";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { publishLayout } from "@/lib/pages/layout";
import { itemSourcesFor } from "@/lib/pages/sources";
import type { StudioNode, StudioPage } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";
import { designsFor, makeDesign } from "@/lib/studio/designs";
import { sectionsFor, templatesFor, type SectionWord } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

const STORE = { type: "store" as const, vertical: null };
const languages = { default: "en" as const, available: ["en" as const] };
const storeApp = { ...newApp("c1", null, NOW, "store"), backend: "hosted" as const };
const ctx = {
  brand: "#1F4E5F",
  source: "products" as const,
  w: (word: SectionWord) => `[${word}]`,
  picture: (file: string) => `https://yallapp.test/design-pictures/${file}`,
  entries: [{ id: "11" }, { id: "12" }, { id: "13" }],
};
const pageOf = (...children: unknown[]) => ({ header: null, body: { id: "root", type: "column", children } });
const check = (page: unknown, app: Pick<App, "appType" | "backend" | "vertical"> = storeApp) => parseStudioPage(page, app, languages);
const errors = (...children: unknown[]) => {
  const parsed = check(pageOf(...children));
  return parsed.ok ? [] : parsed.errors;
};
const parsedBody = (...children: unknown[]): StudioNode[] => {
  const parsed = check(pageOf(...children));
  if (!parsed.ok) throw new Error(parsed.errors.join("; "));
  return parsed.value.body.children!;
};

describe("112.4 a store's sections and sliders in Studio", () => {
  it("offers a store its own sections and three templates; the sliders to every project", () => {
    const store = sectionsFor(STORE).map((s) => s.id);
    const own = ["banner_slider", "flash_sale", "category_pictures", "category_circles", "new_arrivals", "best_sellers", "on_sale", "deal", "shop_look", "brands", "trust", "coupon", "recent"];
    expect(store.slice(0, own.length)).toEqual(own);
    expect(store).toEqual(expect.arrayContaining(["hero_slider", "peek_slider", "split_slider"]));
    const academy = sectionsFor({ type: "lms", vertical: null }).map((s) => s.id);
    expect(academy).toEqual(expect.arrayContaining(["hero_slider", "peek_slider", "split_slider"]));
    expect(academy.filter((id) => own.includes(id))).toEqual([]);
    // Categories in pictures only where there are categories to show.
    expect(sectionsFor(STORE, { categories: false }).map((s) => s.id)).not.toContain("category_pictures");
    expect(templatesFor(STORE).slice(0, 3).map((t) => t.id)).toEqual(["shop", "shop_deals", "shop_looks"]);
    // 130.30 A premium home made for the store first.
    expect(designsFor(STORE)[0]!.templates).toEqual(["premium_home", "shop", "shop_deals", "shop_looks", "brand", "contact"]);
  });

  it("makes sections and templates the page checker takes, with Yallapp's pictures and the shop's products", () => {
    for (const section of sectionsFor(STORE)) {
      const parsed = check({ header: null, body: { id: "root", type: "column", children: [section.make(ctx)] } });
      expect(parsed.ok ? [] : parsed.errors, section.id).toEqual([]);
    }
    for (const template of templatesFor(STORE)) {
      const page = template.make(ctx);
      const parsed = check(page);
      expect(parsed.ok ? [] : parsed.errors, template.id).toEqual([]);
      // 110.3 No instructions to the owner left in a sample text.
      for (const node of allNodes(page)) expect(node.text ?? "", template.id).not.toMatch(/^Write |\[Your /);
    }
    // In each of the six looks too.
    const words = { home: "Home", template: (id: string) => id, theme: (id: string) => id };
    for (const design of designsFor(STORE)) for (const page of makeDesign(design, ctx, words, languages).pages) expect(check(page.studio).ok, `${design.id} › ${page.slug}`).toBe(true);
    // Without the platform's address, the slides keep their colours.
    const plain = sectionsFor(STORE).find((s) => s.id === "hero_slider")!.make({ ...ctx, picture: undefined });
    expect(plain.children!.every((slide) => !slide.image_background_url && slide.background)).toBe(true);
  });

  it("fills the shop's templates with the store's sections", () => {
    const shop = templatesFor(STORE)[0]!.make(ctx);
    const nodes = allNodes(shop);
    expect(nodes.filter((n) => n.type === "slider").map((n) => n.indicator)).toEqual(["progress"]);
    expect(nodes.some((n) => n.type === "countdown")).toBe(true);
    expect(nodes.filter((n) => n.type === "items").map((n) => [n.query!.sort, n.query!.on_sale ?? false, n.recent ?? false])).toEqual([
      ["popular", true, false],
      ["newest", false, false],
      ["popular", false, false],
      ["newest", false, true],
    ]);
    expect(nodes.find((n) => n.type === "coupon")).toMatchObject({ code: "WELCOME15" });
    expect(nodes.find((n) => n.type === "categories")).toMatchObject({ source: "products", style: "circles" });
    // A look's spots open the shop's first products, and the pieces under it are those.
    const looks = allNodes(templatesFor(STORE)[2]!.make(ctx));
    const spots = looks.filter((n) => n.place);
    expect(spots.map((n) => n.action?.item?.id)).toEqual(["11", "12", "13"]);
    expect(looks.find((n) => n.type === "items" && n.query?.ids.length)?.query?.ids).toEqual(["11", "12", "13"]);
    expect(looks.find((n) => n.type === "stack" && n.children?.some((c) => c.place))?.image_background_url).toBe("https://yallapp.test/design-pictures/art-room-living.png");
  });

  it("checks a coupon's code", () => {
    expect(parsedBody({ id: "c", type: "coupon", code: "WELCOME15" })[0]).toEqual({ id: "c", type: "coupon", code: "WELCOME15" });
    expect(parsedBody({ id: "c", type: "coupon", code: " RAMADAN-10 " })[0]!.code).toBe("RAMADAN-10");
    expect(parsedBody({ id: "c", type: "coupon", code: "خصم10" })[0]!.code).toBe("خصم10");
    expect(errors({ id: "c", type: "coupon" })).toEqual(["The page, page › 1: add the coupon's code."]);
    expect(errors({ id: "c", type: "coupon", code: "TWO WORDS" })[0]).toContain("the code can have letters, numbers, - and _");
    expect(errors({ id: "c", type: "coupon", code: "X".repeat(41) })[0]).toContain("up to 40");
  });

  it("keeps a slider's way of showing where it is, and its shape", () => {
    const [slider] = parsedBody({ id: "s", type: "slider", aspect_ratio: 0.8, indicator: "progress", autoplay: true, children: [{ id: "a", type: "column", children: [] }] });
    expect(slider).toMatchObject({ indicator: "progress", aspect_ratio: 0.8, autoplay: true });
    expect(parsedBody({ id: "s", type: "slider", indicator: "dots", children: [] })[0]).not.toHaveProperty("indicator");
    expect(errors({ id: "s", type: "slider", indicator: "stars", children: [] })).toEqual(["The page, page › 1: choose how the slider shows where it is."]);
  });

  it("places a stack's children in percent, and only a stack's", () => {
    const [stack, row] = parsedBody(
      { id: "look", type: "stack", children: [{ id: "spot", type: "icon", icon: "add", place: { x: 50.04, y: 66 }, action: { type: "item", item: { source: "products", id: "7" } } }] },
      { id: "r", type: "row", children: [{ id: "t", type: "text", text: "Hi", place: { x: 10, y: 10 } }] },
    );
    expect(stack!.children![0]).toMatchObject({ place: { x: 50, y: 66 }, action: { type: "item", item: { source: "products", id: "7" } } });
    expect(row!.children![0]).not.toHaveProperty("place");
    expect(errors({ id: "look", type: "stack", children: [{ id: "spot", type: "icon", icon: "add", place: { x: 120, y: 5 } }] })).toEqual(["The page, page › 1 › 1: its place needs a spot across and down, 0 to 100%."]);
  });

  it("keeps how categories look, and lists on sale or seen lately for products only", () => {
    const [pictures, chips, circles] = parsedBody(
      { id: "p", type: "categories", source: "products", style: "pictures", columns: 3 },
      { id: "c", type: "categories", source: "products", style: "chips", columns: 3 },
      { id: "o", type: "categories", source: "products", style: "circles" },
    );
    expect(pictures).toMatchObject({ style: "pictures", columns: 3 });
    expect(chips).not.toHaveProperty("style");
    expect(chips).not.toHaveProperty("columns");
    expect(circles).toMatchObject({ style: "circles" });
    expect(errors({ id: "p", type: "categories", source: "products", style: "slides" })).toEqual(["The page, page › 1: choose how the categories look."]);
    const [sale, recent] = parsedBody({ id: "s", type: "items", source: "products", query: { limit: 4, on_sale: true } }, { id: "r", type: "items", source: "products", recent: true, query: { limit: 10 } });
    expect(sale!.query).toMatchObject({ on_sale: true });
    expect(recent).toMatchObject({ recent: true });
    // Courses have no sale price, nor a list of what was seen.
    const academy = { ...newApp("c1", null, NOW, "lms"), backend: "hosted" as const };
    const courses = check(pageOf({ id: "s", type: "items", source: "courses", query: { limit: 4, on_sale: true } }), academy);
    expect(courses.ok && courses.value.body.children![0]!.query).not.toHaveProperty("on_sale");
    const seen = check(pageOf({ id: "r", type: "items", source: "courses", recent: true, query: { limit: 4 } }), academy);
    expect(seen.ok ? [] : seen.errors).toEqual(["The page, page › 1: only products can show what was seen lately."]);
  });

  it("the sample pages of every kind still pass with the new sections offered", () => {
    for (const kind of KINDS) {
      const app = { ...newApp("c1", null, NOW, kind.engine, kind.vertical), backend: "hosted" as const };
      const kctx = { ...ctx, source: itemSourcesFor(app)[0] ?? null, entries: undefined };
      for (const id of ["hero_slider", "peek_slider", "split_slider"]) {
        const section = sectionsFor({ type: kind.engine, vertical: kind.vertical }).find((s) => s.id === id)!;
        const parsed = check(pageOf(section.make(kctx)), app);
        expect(parsed.ok ? [] : parsed.errors, `${kind.id} › ${id}`).toEqual([]);
      }
    }
  });
});

describe("112.4 the hosted API serves a store's Studio page", () => {
  let store: MemoryStore;
  let app: App;
  const ids: Record<string, number> = {};
  const product = (input: Partial<CatalogProductInput>): CatalogProductInput => ({
    appId: app.id,
    name: "Product",
    description: "",
    priceCents: 10000,
    salePriceCents: null,
    categoryIds: [],
    imageAssetIds: [],
    stock: null,
    digital: false,
    featured: false,
    active: true,
    sku: null,
    ...input,
  });
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

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", appName: "Rose Shop", websiteDoneAt: NOW, connector: { kind: "catalog" }, catalogSettings: DEFAULT_CATALOG_SETTINGS };
    await store.createApp(app);
    const bouquets = await store.createCatalogCategory({ appId: app.id, name: "Bouquets", now: NOW });
    ids.roses = (await store.createCatalogProduct(product({ name: "Red Roses", priceCents: 60000, salePriceCents: 45000, categoryIds: [bouquets.id], imageAssetIds: ["img-1"] }), new Date(NOW.getTime() + 1000))).id;
    ids.vase = (await store.createCatalogProduct(product({ name: "Glass Vase", priceCents: 25000, categoryIds: [bouquets.id] }), new Date(NOW.getTime() + 2000))).id;
  });

  it("with products on sale, what was seen lately to be filled by the app, categories in pictures, a coupon, a slider and spots", async () => {
    const studio: StudioPage = {
      body: {
        id: "root",
        type: "column",
        children: [
          { id: "hero", type: "slider", aspect_ratio: 0.8, indicator: "count", autoplay: true, children: [{ id: "s1", type: "column", height: "fill", align: "end", children: [{ id: "t1", type: "text", text: "New this week" }] }] },
          { id: "sale", type: "items", source: "products", layout: "carousel", query: { limit: 8, category_id: null, featured: false, sort: "popular", ids: [], on_sale: true } },
          { id: "seen", type: "items", source: "products", layout: "carousel", recent: true, query: { limit: 10, category_id: null, featured: false, sort: "newest", ids: [] } },
          { id: "cats", type: "categories", source: "products", style: "pictures", columns: 2 },
          { id: "code", type: "coupon", code: "WELCOME15", radius: 10 },
          { id: "look", type: "stack", aspect_ratio: 1.33, children: [{ id: "spot", type: "icon", icon: "add", place: { x: 50, y: 66 }, action: { type: "item", item: { source: "products", id: String(ids.roses) } } }] },
        ],
      },
    };
    const layout = {
      appearance: { template: "classic", theme_mode: "system", user_can_change_mode: true, secondary_color: null, font: "Outfit", corners: "soft", cards: "elevated" },
      languages: { default: "en", available: ["en"] },
      tabs: [
        { id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" } },
        { id: "account", label: "Account", icon: "person", target: { type: "screen", screen: "account" } },
      ],
      pages: [{ slug: "home", title: "Home", show_title: false, updated_at: NOW.toISOString(), blocks: [], studio }],
    };
    const published = await publishLayout(store, app, layout, "owner@rose.test", NOW);
    expect(published.ok ? [] : published.errors).toEqual([]);
    const result = await handleHosted(context(), { method: "GET", path: ["pages", "home"], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null });
    expectContract("GET", "/pages/{slug}", result);
    const body = (result.body as { studio: StudioPage }).studio.body.children! as (StudioNode & { items?: { id: string }[]; categories?: Record<string, unknown>[] })[];
    expect(body.map((n) => n.id)).toEqual(["hero", "sale", "seen", "cats", "code", "look"]);
    expect(body[0]).toMatchObject({ indicator: "count", aspect_ratio: 0.8, autoplay: true });
    expect(body[1]!.items!.map((i) => i.id)).toEqual([String(ids.roses)]);
    expect(body[1]).not.toHaveProperty("query");
    expect(body[2]).toMatchObject({ recent: true, items: [] });
    expect(body[3]).toMatchObject({ style: "pictures", columns: 2, categories: [{ name: "Bouquets", count: 2, image_url: "https://yallapp.test/api/v1/assets/img-1" }] });
    expect(body[4]).toMatchObject({ type: "coupon", code: "WELCOME15" });
    expect(body[5]!.children![0]).toMatchObject({ place: { x: 50, y: 66 }, action: { type: "item", item: { source: "products", id: String(ids.roses) } } });
  });
});
