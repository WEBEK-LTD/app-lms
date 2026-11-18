import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogProductInput } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { listHeadings, productFallbacks, withListHeadings, withSampleProduct } from "@/lib/hosted/pages/lists";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { publishLayout } from "@/lib/pages/layout";
import { itemSourcesFor } from "@/lib/pages/sources";
import type { ItemsQuery, StudioNode, StudioPage } from "@/lib/pages/types";
import { appWords } from "@/lib/studio/app-words";
import { TEMPLATES, type SectionContext } from "@/lib/studio/sections";
import { startLayout } from "@/lib/studio/start";
import { allNodes } from "@/lib/studio/tree";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/**
 * 164 A bound list of products is never an empty section: Leqaa's "Picked
 * for you" and its price list were bound to featured products, which a real
 * shop may not have; served, they show the best sellers, else the newest,
 * and go with their titles when the shop has no products.
 */

const q = (over: Partial<ItemsQuery> = {}): ItemsQuery => ({ limit: 6, category_id: null, featured: false, sort: "newest", ids: [], ...over });

describe("164 the lists tried when a products list has nothing", () => {
  it("best sellers, then the newest, for featured, a category or products picked by hand", () => {
    for (const narrowed of [q({ featured: true, sort: "popular" }), q({ category_id: "7" }), q({ ids: ["900001", "900002"] })]) {
      expect(productFallbacks(narrowed).map((x) => [x.sort, x.featured, x.category_id, x.ids])).toEqual([
        ["popular", false, null, []],
        ["newest", false, null, []],
      ]);
    }
    for (const f of productFallbacks(q({ featured: true, limit: 5 }))) expect(f.limit).toBe(5);
  });

  it("only the other order for a list of every product, and none for products on sale", () => {
    expect(productFallbacks(q({ sort: "popular" })).map((x) => x.sort)).toEqual(["newest"]);
    expect(productFallbacks(q({ sort: "newest" })).map((x) => x.sort)).toEqual(["popular"]);
    expect(productFallbacks(q({ on_sale: true, featured: true }))).toEqual([]);
  });
});

describe("164 a list's title", () => {
  const text = (id: string, name?: string): StudioNode => ({ id, type: "text", text: "Picked for you", ...(name ? { name } : {}) });
  const list = (id: string, name?: string): StudioNode => ({ id, type: "items", source: "products", ...(name ? { name } : {}) });
  const head = (id: string, name: string): StudioNode => ({ id, type: "row", name, children: [{ id: `${id}-t`, type: "column", children: [text(`${id}-w`)] }, text(`${id}-all`)] });

  it("is the words just before it named as the list is, or its one companion in a column", () => {
    const root: StudioNode = {
      id: "root",
      type: "column",
      children: [head("h1", "Picked"), list("l1", "Picked"), head("h2", "Other"), list("l2", "Loved"), { id: "c", type: "column", children: [text("t3"), list("l3")] }, { id: "img", type: "image" }, list("l4", "x")],
    };
    expect([...listHeadings(root)]).toEqual([
      ["h1", "l1"],
      ["t3", "l3"],
    ]);
  });

  it("goes with its list, the column left empty too; kept, it is marked", () => {
    const root: StudioNode = { id: "root", type: "column", children: [head("h1", "Picked"), list("l1", "Picked"), { id: "c", type: "column", children: [text("t3"), list("l3")] }, text("other")] };
    const pairs = listHeadings(root);
    const served = withListHeadings({ ...root, children: [root.children![0]!, { ...root.children![2]!, children: [text("t3")] }, text("other")] }, pairs);
    expect(served.children!.map((n) => n.id)).toEqual(["other"]);
    const kept = withListHeadings(root, pairs);
    expect(kept.children![0]).toMatchObject({ id: "h1", heads: "l1" });
    expect(kept.children![2]!.children![0]).toMatchObject({ id: "t3", heads: "l3" });
  });
});

describe("164 the Leqaa template's lists in a real shop: no featured products, none of the template's", () => {
  let store: MemoryStore;
  let app: App;
  const ids: number[] = [];
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
  const contextOf = (lang: "en" | "ar"): SectionContext => {
    let n = 0;
    return { brand: app.primaryColor, source: itemSourcesFor(app)[0] ?? null, app: app.appName!, lang, w: appWords(lang, app.appName!), picture: (f) => `${appUrl()}/design-pictures/${f}`, newId: () => `lq-${++n}`, kind: { type: app.appType, vertical: app.vertical ?? null } };
  };
  /** The look's template published as /start makes it. */
  const publish = async (look: "a" | "b", lang: "en" | "ar" = "en") => {
    const template = TEMPLATES.find((t) => t.id === `flowers_signature_${look}`)!;
    const layout = startLayout(app, template, defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), NOW, contextOf(lang));
    const published = await publishLayout(store, app, layout, "owner@kechflora.test", NOW);
    expect(published.ok ? [] : published.errors).toEqual([]);
    return layout;
  };
  const served = async (slug: string): Promise<StudioPage> => {
    const result = await handleHosted(context(), { method: "GET", path: ["pages", slug], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null });
    expect(result.status, slug).toBe(200);
    expectContract("GET", "/pages/{slug}", result);
    return (result.body as { studio: StudioPage }).studio;
  };
  const lists = (page: StudioPage) => allNodes(page).filter((n) => n.type === "items") as (StudioNode & { items?: { id: string }[] })[];

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = { ...newApp(client.id, null, NOW, "store"), section: "studio", backend: "hosted", appName: "KechFlora", websiteDoneAt: NOW, connector: { kind: "catalog" }, catalogSettings: DEFAULT_CATALOG_SETTINGS };
    await store.createApp(app);
    ids.length = 0;
  });

  const addProducts = async () => {
    for (const [i, name] of ["Red Roses", "White Lilies", "Tulips"].entries()) ids.push((await store.createCatalogProduct(product({ name, imageAssetIds: [`img-${i}`] }), new Date(NOW.getTime() + (i + 1) * 1000))).id);
  };

  for (const look of ["a", "b"] as const) {
    it(`look ${look.toUpperCase()}: every list of products on every page is served with the shop's products`, async () => {
      await addProducts();
      const layout = await publish(look);
      const bound = layout.pages.filter((p) => p.studio && allNodes(p.studio).some((n) => n.type === "items" && !n.recent));
      expect(bound.map((p) => p.slug).sort()).toEqual(["bouquet", "home", "wishlist"]);
      for (const page of bound) {
        const studio = await served(page.slug);
        const shown = lists(studio).filter((n) => !n.recent);
        expect(shown.length, page.slug).toBe(allNodes(page.studio!).filter((n) => n.type === "items" && !n.recent).length);
        for (const n of shown) {
          expect(n.items!.length, `${page.slug} ${n.name}`).toBeGreaterThan(0);
          expect(n.items!.every((i) => ids.map(String).includes(i.id))).toBe(true);
        }
      }
    });
  }

  it("Picked for you: the newest products when none is featured or sold yet, its title kept and marked", async () => {
    await addProducts();
    await publish("a", "ar");
    const studio = await served("wishlist");
    const [recent, picked] = lists(studio);
    expect(recent).toMatchObject({ recent: true, items: [] });
    expect(picked!.items!.map((i) => i.id)).toEqual([...ids].reverse().map(String));
    const title = studio.body.children!.find((n) => n.heads === picked!.id);
    expect(title).toMatchObject({ type: "row", name: "اخترناها لك" });
  });

  it("featured products first, when the shop has them", async () => {
    await addProducts();
    const star = (await store.createCatalogProduct(product({ name: "Orchid", featured: true }), new Date(NOW.getTime() + 500))).id;
    await publish("a");
    const [, picked] = lists(await served("wishlist"));
    expect(picked!.items!.map((i) => i.id)).toEqual([String(star)]);
  });

  it("a shop with no products: the lists go with their titles, what was seen lately stays for the phone", async () => {
    for (const look of ["a", "b"] as const) {
      await publish(look);
      const studio = await served("wishlist");
      expect(lists(studio).map((n) => n.recent ?? false), look).toEqual([true]);
      expect(allNodes(studio).some((n) => n.name === "Picked for you"), look).toBe(false);
      const home = await served("home");
      expect(lists(home).filter((n) => !n.recent), look).toEqual([]);
      for (const title of ["Loved most", "The price list"]) expect(allNodes(home).some((n) => n.type === "row" && n.name === title), `${look} ${title}`).toBe(false);
    }
  });
  it("the bouquet page: the shop's best seller, else its newest, never the template's Blush Garden", async () => {
    await addProducts();
    for (const look of ["a", "b"] as const) {
      await publish(look);
      const studio = await served("bouquet");
      const bouquet = lists(studio);
      expect(bouquet.map((n) => n.items!.map((i) => i.id)), look).toEqual([[String(ids[2])]]);
      expect(JSON.stringify(studio), look).not.toContain("Blush Garden");
      expect(JSON.stringify(studio), look).not.toContain("Your signature bouquet");
    }
  });

  it("the bouquet page: the product the owner picked in Studio", async () => {
    await addProducts();
    const layout = await publish("a");
    const page = layout.pages.find((p) => p.slug === "bouquet")!;
    const node = allNodes(page.studio!).find((n) => n.type === "items")!;
    node.query = { ...node.query!, ids: [String(ids[0])] };
    const published = await publishLayout(store, app, layout, "owner@kechflora.test", NOW);
    expect(published.ok ? [] : published.errors).toEqual([]);
    expect(lists(await served("bouquet"))[0]!.items!.map((i) => i.id)).toEqual([String(ids[0])]);
  });

  it("an app made before: the sample bouquet's photos and words are served as one of the shop's products, the owner's own words kept", async () => {
    await addProducts();
    const layout = await publish("a");
    const page = layout.pages.find((p) => p.slug === "bouquet")!;
    const sample: StudioNode[] = [
      { id: "old-photos", type: "gallery", name: "The signature bouquet", gallery: { layout: "filmstrip", radius: 28, captions: false }, height: 380, images: [{ image_url: "https://yallapp.test/flower-photos/blush-bouquet.jpg", caption: null }] },
      {
        id: "old-words",
        type: "column",
        gap: 6,
        children: [
          { id: "old-kicker", type: "text", text: "The signature bouquet" },
          { id: "old-title", type: "text", text: "Blush Garden", translations: { ar: { text: "حديقة الورد" }, tr: { text: "Pembe Bahçe" } } },
          { id: "old-line", type: "text", text: "Blush roses, lisianthus and eucalyptus, made on the day it is delivered." },
        ],
      },
    ];
    const rest = page.studio!.body.children!.filter((n) => n.type !== "items");
    page.studio = { ...page.studio!, body: { ...page.studio!.body, children: [...sample, ...rest] } };
    const published = await publishLayout(store, app, layout, "owner@kechflora.test", NOW);
    expect(published.ok ? [] : published.errors).toEqual([]);
    const studio = await served("bouquet");
    expect(JSON.stringify(studio)).not.toContain("Blush Garden");
    expect(studio.body.children!.some((n) => n.type === "gallery")).toBe(false);
    const [bouquet] = lists(studio);
    expect(bouquet).toMatchObject({ id: "old-words", name: "The signature bouquet", items: [{ id: String(ids[2]) }] });
    const card = allNodes({ body: bouquet!.card! });
    expect(card.map((n) => n.bind ?? n.text)).toEqual([undefined, "image", "The signature bouquet", "title", "price"]);

    // An owner's own words are theirs: nothing changes.
    expect(withSampleProduct({ id: "r", type: "column", children: [sample[0]!, { ...sample[1]!, children: [{ id: "t", type: "text", text: "Our Nile bouquet" }] }] }).children!.map((n) => n.type)).toEqual(["gallery", "column"]);
  });

  it("the bouquet page in a shop with no products: no bouquet at all", async () => {
    await publish("b");
    const studio = await served("bouquet");
    expect(lists(studio)).toEqual([]);
    expect(JSON.stringify(studio)).not.toContain("Blush Garden");
  });
});
