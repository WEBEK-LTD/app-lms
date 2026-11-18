import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { TapAction } from "@/app/studio/editor/inspector";
import { DashboardI18n } from "@/components/dashboard-i18n";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogProductInput } from "@/lib/data/types";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import type { Connector } from "@/lib/hosted/connectors/types";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { dashboardMessages, knownEnglish } from "@/i18n/dashboard";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { publishLayout } from "@/lib/pages/layout";
import { itemSourcesFor, screenOptionsFor } from "@/lib/pages/sources";
import type { Action, LayoutContent, StudioNode, StudioPage } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";
import { appWords } from "@/lib/studio/app-words";
import { TEMPLATES, type SectionContext } from "@/lib/studio/sections";
import { startLayout } from "@/lib/studio/start";
import { allNodes, mapTree } from "@/lib/studio/tree";
import { NOW, setupClient } from "./helpers";

/**
 * 152 Our bouquet's chips and button open the product the owner links: in
 * Leqaa's Studio looks (and the apps made from them, like Kech Flora) the
 * bouquet's size chips and "Choose this bouquet" open the shop until the
 * owner picks one of their products for them in Studio ("When the customer
 * taps": A product). A linked one is saved and served as the product; one
 * with no product chosen, or whose product the shop no longer has, is
 * served as the shop.
 */

const SHOP: Action = { type: "screen", screen: "search" };
const productOf = (id: string): Action => ({ type: "item", item: { source: "products", id } });

function contextOf(app: App): SectionContext {
  let n = 0;
  return { brand: app.primaryColor, source: itemSourcesFor(app)[0] ?? null, app: app.appName!, lang: "en", w: appWords("en", app.appName!), picture: (f) => `https://yallapp.test/design-pictures/${f}`, newId: () => `lq-${++n}`, kind: { type: app.appType, vertical: app.vertical ?? null } };
}

/** A Leqaa look started for `app`: its layout as a new project gets it. */
function leqaa(app: App, look: "a" | "b"): LayoutContent {
  const template = TEMPLATES.find((t) => t.id === `flowers_signature_${look}`)!;
  return startLayout(app, template, defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), NOW, contextOf(app));
}

/** The bouquet page's size chips (Classic, Deluxe, Grand) and its "Choose this bouquet". */
function bouquetTaps(page: StudioPage): { sizes: StudioNode[]; choose: StudioNode } {
  const nodes = allNodes(page);
  const sizes = ["Classic", "Deluxe", "Grand"].map((word) => nodes.find((n) => n.type === "column" && n.name === word)!);
  const choose = nodes.find((n) => n.type === "button" && n.text === "Choose this bouquet")!;
  return { sizes, choose };
}

function storeApp(clientId = "client"): App {
  return { ...newApp(clientId, null, NOW, "store"), section: "studio", backend: "hosted", appName: "Leqaa", websiteDoneAt: NOW, connector: { kind: "catalog" }, catalogSettings: DEFAULT_CATALOG_SETTINGS };
}

describe("152 the template: the sizes and the button open the shop until the owner links them", () => {
  it.each(["a", "b"] as const)("look %s", (look) => {
    const page = leqaa(storeApp(), look).pages.find((p) => p.slug === "bouquet")!.studio!;
    const { sizes, choose } = bouquetTaps(page);
    expect(sizes.map((s) => s.action)).toEqual([SHOP, SHOP, SHOP]);
    expect(choose.action).toEqual(SHOP);
  });
});

describe("152 saving a tap linked to a product", () => {
  const page = (action: Action): unknown => ({ body: { id: "root", type: "column", children: [{ id: "chip", type: "column", action, children: [{ id: "t", type: "text", text: "Classic" }] }, { id: "choose", type: "button", text: "Choose this bouquet", action }] } });
  const languages = { default: "en" as const, available: ["en" as const] };

  it("keeps the product a chip or a button opens", () => {
    const parsed = parseStudioPage(page(productOf("21")), storeApp(), languages);
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    if (!parsed.ok) return;
    expect(allNodes(parsed.value).filter((n) => n.action).map((n) => n.action)).toEqual([productOf("21"), productOf("21")]);
  });

  it("takes a product not chosen yet (it opens the shop), and still refuses an ID that isn't one", () => {
    const empty = parseStudioPage(page(productOf("")), storeApp(), languages);
    expect(empty.ok ? [] : empty.errors).toEqual([]);
    if (empty.ok) expect(allNodes(empty.value).find((n) => n.id === "choose")!.action).toEqual(productOf(""));
    const bad = parseStudioPage(page(productOf("no such/id")), storeApp(), languages);
    expect(bad.ok ? [] : bad.errors).toEqual([expect.stringContaining("enter the entry's ID."), expect.stringContaining("enter the entry's ID.")]);
  });

  it("another kind of entry still needs its ID", () => {
    const booking = { ...newApp("client", null, NOW, "booking"), section: "studio" as const, backend: "hosted" as const };
    const parsed = parseStudioPage(page({ type: "item", item: { source: "services", id: "" } }), booking, languages);
    expect(parsed.ok ? [] : parsed.errors).toEqual([expect.stringContaining("enter the entry's ID."), expect.stringContaining("enter the entry's ID.")]);
  });
});

describe("152 GET /pages/bouquet: a linked tap opens the product, one not linked or gone opens the shop", () => {
  let store: MemoryStore;
  let app: App;
  let connector: Connector;
  const ids: Record<string, number> = {};
  const product = (input: Partial<CatalogProductInput>): CatalogProductInput => ({ appId: app.id, name: "Bouquet", description: "", priceCents: 60000, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null, ...input });
  const context = (): HostedContext => ({ store, app, active: true, now: NOW, ip: "203.0.113.9", secret: "test-hosted-secret", sender: new LogSender(), push: false, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test", connector });
  const served = async () => {
    const result = await handleHosted(context(), { method: "GET", path: ["pages", "bouquet"], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null });
    expect(result.status).toBe(200);
    return bouquetTaps((result.body as { studio: StudioPage }).studio);
  };
  /** The look with the owner's links: each size its own, and the button. */
  const linked = (look: "a" | "b", links: { classic: string | null; deluxe: string | null; grand: string | null; choose: string | null }): LayoutContent => {
    const layout = leqaa(app, look);
    const byName: Record<string, string | null> = { Classic: links.classic, Deluxe: links.deluxe, Grand: links.grand };
    return {
      ...layout,
      pages: layout.pages.map((p) =>
        p.slug === "bouquet" && p.studio
          ? {
              ...p,
              studio: {
                ...p.studio,
                body: mapTree(p.studio.body, (n) => {
                  if (n.type === "column" && n.name && n.name in byName) return byName[n.name] === null ? n : { ...n, action: productOf(byName[n.name]!) };
                  if (n.type === "button" && n.text === "Choose this bouquet") return links.choose === null ? n : { ...n, action: productOf(links.choose) };
                  return n;
                })!,
              },
            }
          : p,
      ),
    };
  };

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = storeApp(client.id);
    await store.createApp(app);
    connector = new CatalogConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" });
    ids.roses = (await store.createCatalogProduct(product({ name: "Red Roses" }), new Date(NOW.getTime() + 1000))).id;
    ids.peonies = (await store.createCatalogProduct(product({ name: "Peonies" }), new Date(NOW.getTime() + 2000))).id;
    ids.tulips = (await store.createCatalogProduct(product({ name: "Tulips" }), new Date(NOW.getTime() + 3000))).id;
  });

  it.each(["a", "b"] as const)("look %s: publishes the owner's links and serves each as it is, or the shop", async (look) => {
    const published = await publishLayout(store, app, linked(look, { classic: String(ids.roses), deluxe: "", grand: String(ids.tulips), choose: String(ids.peonies) }), "owner@leqaa.test", NOW);
    expect(published.ok ? [] : published.errors).toEqual([]);
    // The tulips leave the shop after the publish.
    await store.deleteCatalogProduct(app.id, ids.tulips!);
    const { sizes, choose } = await served();
    expect(sizes.map((s) => s.action)).toEqual([productOf(String(ids.roses)), SHOP, SHOP]);
    expect(choose.action).toEqual(productOf(String(ids.peonies)));
  });

  it("a product the shop hides (not active) opens the shop too; the unlinked template as it was", async () => {
    await store.updateCatalogProduct(app.id, ids.peonies!, { active: false }, NOW);
    const published = await publishLayout(store, app, linked("a", { classic: null, deluxe: null, grand: null, choose: String(ids.peonies) }), "owner@leqaa.test", NOW);
    expect(published.ok ? [] : published.errors).toEqual([]);
    const { sizes, choose } = await served();
    expect(sizes.map((s) => s.action)).toEqual([SHOP, SHOP, SHOP]);
    expect(choose.action).toEqual(SHOP);
  });

  it("a shop that can't be reached keeps the link (the app sends a product it can't find to the shop)", async () => {
    const published = await publishLayout(store, app, linked("a", { classic: String(ids.roses), deluxe: null, grand: null, choose: String(ids.peonies) }), "owner@leqaa.test", NOW);
    expect(published.ok ? [] : published.errors).toEqual([]);
    const catalog = connector;
    connector = {
      config: catalog.config.bind(catalog),
      handle: async (request) => {
        if (request.path[0] === "store" && request.path[1] === "products" && request.path[2]) throw new Error("The platform didn't answer.");
        return catalog.handle(request);
      },
    } as Connector;
    const { sizes, choose } = await served();
    expect(sizes[0]!.action).toEqual(productOf(String(ids.roses)));
    expect(choose.action).toEqual(productOf(String(ids.peonies)));
  });
});

describe("152 Studio's inspector: A product, from the shop's own products", () => {
  const app = storeApp();
  const pickable = { items: { products: [{ id: "21", title: "Red Roses" }, { id: "22", title: "Peonies" }] }, categories: {} };
  function html(action: Action | null, lang: "en" | "ar" | "tr" = "en"): string {
    const node: ReactNode = createElement(TapAction, { id: "action-choose", action, onChange: () => {}, pages: [{ slug: "bouquet", title: "Our bouquet" }], sources: itemSourcesFor(app), screens: screenOptionsFor(app), pickable });
    const props: ComponentProps<typeof DashboardI18n> = { lang, messages: dashboardMessages(lang), knownEnglish: lang === "en" ? {} : knownEnglish(), children: node };
    return renderToStaticMarkup(createElement(DashboardI18n, props));
  }

  it("offers A product in a store, lists its products, and says what happens without one", () => {
    const shop = html(SHOP);
    expect(shop).toContain("Opens: A product");
    expect(shop).not.toContain("One entry");
    // The hint only once a product is what the tap opens.
    expect(shop).not.toContain("data-product-link-hint");
    const none = html(productOf(""));
    expect(none).toMatch(/<option value="item" selected="">Opens: A product<\/option>/);
    expect(none).toContain('<option value="21">Red Roses</option>');
    expect(none).toContain('<option value="22">Peonies</option>');
    expect(none).toContain("Link to one of your products; without it, it opens the shop");
    expect(html(productOf("22"))).toContain('<option value="22" selected="">Peonies</option>');
  });

  it("names a linked product the list no longer has by its ID, so it isn't shown as not chosen", () => {
    const gone = html(productOf("99"));
    expect(gone).toContain('<option value="99" selected="">Product 99 (not in the list)</option>');
  });

  it("in Egyptian Arabic and Turkish", () => {
    const ar = html(productOf(""), "ar");
    expect(ar).toContain("يفتح: منتج");
    expect(ar).toContain("اربطه بمنتج من منتجاتك؛ من غيره بيفتح المحل");
    expect(html(productOf("99"), "ar")).toContain("منتج رقم 99 (مش في القايمة)");
    const tr = html(productOf(""), "tr");
    expect(tr).toContain("Açar: Bir ürün");
    expect(tr).toContain("Ürünlerinizden birine bağlayın; bağlamazsanız mağazayı açar");
    expect(html(productOf("99"), "tr")).toContain("Ürün 99 (listede yok)");
  });
});
