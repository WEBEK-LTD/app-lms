import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { CLOTHES_DEMO } from "@/lib/demo/constants";
import { setupDemoApps, type DemoSetupDeps } from "@/lib/demo/setup";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import { parseStudioPage } from "@/lib/pages/validate";
import { hasProductPage, pageScreenOptionsFor } from "@/lib/pages/sources";
import { STUDIO_NODE_TYPES, STUDIO_PAGE_SCREENS, STUDIO_PRODUCT_LOOKS, STUDIO_PRODUCT_TYPES, SCREENS, type StudioNode, type StudioPage } from "@/lib/pages/types";
import { APP_WORDS } from "@/lib/studio/app-words";
import { signatureDesign } from "@/lib/studio/demo-designs";
import { ELEMENTS, newNode } from "@/lib/studio/elements";
import { PRODUCT_PAGE_SLUG, productPage, productPageOf } from "@/lib/studio/product-page";
import type { SectionContext, SectionWord } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";
import { ProductPartCanvas } from "@/components/studio/product-page";
import { en as studioEn, ar as studioAr, tr as studioTr } from "@/i18n/dashboard/studio";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { expectContract } from "./contract";
import { KEY, NOW } from "./helpers";

/**
 * 228 A look designs its own product page in Studio: `product` a page
 * screen (the product page, drawn for every product in place of the app's
 * own product screen), the product page's elements bound to the product
 * open, each with its looks, edited in the inspector and drawn on the
 * canvas and in the app; a look declares it with lib/studio/product-page.ts,
 * Lujain's look A the first.
 */

const ROOT = join(__dirname, "../..");
const STORE = { appType: "store" as const, backend: "hosted" as const, vertical: null };
const ACADEMY = { appType: "lms" as const, backend: "hosted" as const, vertical: null };
const LANGS = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };
const onProductPage = (...children: StudioNode[]): StudioPage => ({ screen: "product", body: { id: "root", type: "column", children } });

describe("228 the product page screen", () => {
  it("is a page screen a shop's page can be drawn for, never a screen a button opens", () => {
    expect(STUDIO_PAGE_SCREENS).toContain("product");
    expect(SCREENS as readonly string[]).not.toContain("product");
    expect(hasProductPage(STORE)).toBe(true);
    expect(hasProductPage(ACADEMY)).toBe(false);
    expect(pageScreenOptionsFor(STORE).map((o) => o.value)).toContain("product");
    expect(pageScreenOptionsFor(ACADEMY).map((o) => o.value)).not.toContain("product");
  });

  it("passes the checker in a shop, with the header over its photos too; refused elsewhere", () => {
    expect(parseStudioPage(onProductPage(), STORE, LANGS)).toMatchObject({ ok: true, value: { screen: "product" } });
    const transparent = { ...onProductPage(), header: { type: "transparent" as const, buttons: ["cart" as const] } };
    expect(parseStudioPage(transparent, STORE, LANGS)).toMatchObject({ ok: true });
    // A page around another screen still can't have that header.
    expect(parseStudioPage({ ...transparent, screen: "cart" }, STORE, LANGS).ok).toBe(false);
    expect(parseStudioPage(onProductPage(), ACADEMY, LANGS).ok).toBe(false);
  });
});

describe("228 the product page's elements", () => {
  it("are elements of the content list and the editor's Product page group, for shops, named in three languages", () => {
    for (const type of STUDIO_PRODUCT_TYPES) {
      expect(STUDIO_NODE_TYPES).toContain(type);
      const info = ELEMENTS.find((e) => e.type === type)!;
      expect(info).toMatchObject({ group: "product", only: "store" });
      for (const lang of [studioEn, studioAr, studioTr]) {
        const words = lang as unknown as Record<string, string>;
        expect(words[`el_${type}`], `el_${type}`).toBeTruthy();
        for (const look of STUDIO_PRODUCT_LOOKS[type]) expect(words[`prodLook_${type}_${look}`], `${type} ${look}`).toBeTruthy();
      }
    }
    for (const lang of [studioEn, studioAr, studioTr]) expect((lang as unknown as Record<string, string>).groupProduct).toBeTruthy();
    // The app's words for the canvas, in each of its languages.
    for (const key of Object.keys(APP_WORDS.en).filter((k) => k.startsWith("p") && /^p[A-Z]/.test(k))) for (const lang of ["ar", "tr"] as const) expect((APP_WORDS[lang] as Record<string, string>)[key], `${lang} ${key}`).toBeTruthy();
  });

  it("start in their first look and pass the checker as they are made", () => {
    let n = 0;
    const made = STUDIO_PRODUCT_TYPES.map((type) => newNode(type, { brand: "#121212", text: () => "", source: "products", newId: () => `n${++n}` }));
    expect(made.find((m) => m.type === "product_buy")!.pin).toBe("bottom");
    expect(parseStudioPage(onProductPage(...made), STORE, LANGS)).toMatchObject({ ok: true });
  });

  it("keep their looks, options and words in other languages, and refuse what doesn't work", () => {
    const nodes: StudioNode[] = [
      { id: "g", type: "product_gallery", aspect_ratio: 0.8, product_part: { look: "thumbs", radius: 18 } },
      { id: "p", type: "product_price", product_part: { look: "single" } },
      { id: "b", type: "product_buy", text: "Add to bag", title: "Buy it now", translations: { ar: { text: "أضف إلى الحقيبة", title: "اشترِه الآن" } }, product_part: { look: "buy_now", accent: "#121212", dark_accent: "#f3f0ea" } },
      { id: "r", type: "product_related", text: "Wear it with", product_part: { look: "grid", related: "complete_look", rows: 4 } },
      { id: "d", type: "product_delivery", title: "Free delivery over SAR 300\nGift wrapping on request", product_part: { look: "card" } },
    ];
    const parsed = parseStudioPage(onProductPage(...nodes), STORE, LANGS);
    expect(parsed).toMatchObject({ ok: true });
    const kids = (parsed as { ok: true; value: StudioPage }).value.body.children!;
    expect(kids[0]!.product_part).toEqual({ look: "thumbs", radius: 18 });
    // Its first look is the one it has without saying.
    expect(kids[1]!.product_part).toBeUndefined();
    expect(kids[2]).toMatchObject({ text: "Add to bag", title: "Buy it now", translations: { ar: { text: "أضف إلى الحقيبة", title: "اشترِه الآن" } }, product_part: { look: "buy_now", accent: "#121212", dark_accent: "#F3F0EA" } });
    expect(kids[3]!.product_part).toEqual({ look: "grid", related: "complete_look", rows: 4 });
    expect(kids[4]!.title).toBe("Free delivery over SAR 300\nGift wrapping on request");
    const bad = (node: Partial<StudioNode>) => parseStudioPage(onProductPage({ id: "x", ...node } as StudioNode), STORE, LANGS).ok;
    expect(bad({ type: "product_gallery", product_part: { look: "chips" } })).toBe(false);
    expect(bad({ type: "product_related", product_part: { related: "everything" as "related" } })).toBe(false);
    expect(bad({ type: "product_specs", product_part: { rows: 99 } })).toBe(false);
    expect(bad({ type: "product_gallery", product_part: { radius: 60 } })).toBe(false);
    expect(bad({ type: "product_delivery", title: "1\n2\n3\n4\n5" })).toBe(false);
    // A shop's only.
    expect(parseStudioPage({ body: { id: "root", type: "column", children: [{ id: "t", type: "product_title" }] } }, ACADEMY, LANGS).ok).toBe(false);
  });

  it("are drawn on the canvas in each of their looks, the shop's first product standing for the product, else a sample", () => {
    const own: Pickable = { items: { products: [{ id: "1", title: "Silk midi dress", imageUrl: "https://cdn.test/1.jpg", price: "SAR 890", sale: { was: "SAR 1,100", now: "SAR 890", percentOff: 19, endsAt: null, remaining: null, total: null } }, { id: "2", title: "Leather mules", imageUrl: "https://cdn.test/2.jpg", price: "SAR 420" }] }, categories: {} };
    const none: Pickable = { items: {}, categories: {} };
    for (const type of STUDIO_PRODUCT_TYPES)
      for (const look of STUDIO_PRODUCT_LOOKS[type])
        for (const [pickable, lang] of [[own, "en"], [none, "ar"]] as const) {
          const html = renderToStaticMarkup(createElement(ProductPartCanvas, { node: { id: "n", type, product_part: { look } }, pickable, dark: lang === "ar", lang, brand: "#121212", title: "", second: "" }));
          expect(html, `${type} ${look}`).toContain(`data-studio-product="${type}"`);
          expect(html).toContain(`data-product-look="${look}"`);
        }
    const title = renderToStaticMarkup(createElement(ProductPartCanvas, { node: { id: "t", type: "product_title" }, pickable: own, dark: false, lang: "en", brand: "#000000", title: "", second: "" }));
    expect(title).toContain("Silk midi dress");
    const sample = renderToStaticMarkup(createElement(ProductPartCanvas, { node: { id: "t", type: "product_title" }, pickable: none, dark: false, lang: "ar", brand: "#000000", title: "", second: "" }));
    expect(sample).toContain(APP_WORDS.ar.pSampleTitle);
    const buy = renderToStaticMarkup(createElement(ProductPartCanvas, { node: { id: "b", type: "product_buy", product_part: { look: "buy_now" } }, pickable: own, dark: false, lang: "tr", brand: "#000000", title: "", second: "" }));
    expect(buy).toContain(APP_WORDS.tr.pAddToCart);
    expect(buy).toContain(APP_WORDS.tr.pBuyNow);
  });
});

describe("228 a look's own product page (lib/studio/product-page.ts)", () => {
  const ctx = (): SectionContext => {
    let n = 0;
    return { w: (word) => (APP_WORDS.en as Record<string, string>)[word] ?? word, newId: () => `id${++n}` } as SectionContext;
  };

  it("is declared in a few lines: its elements in order, each in its look", () => {
    const page = productPage(ctx(), { parts: [{ type: "product_gallery", look: "card", radius: 24 }, { type: "product_buy", look: "price", text: "pAddToCart" as SectionWord, node: { pin: "bottom" } }] });
    expect(page).toMatchObject({ screen: "product", show_tabs: false });
    expect(page.body.children!.map((n) => n.type)).toEqual(["product_gallery", "product_buy"]);
    expect(page.body.children![0]!.product_part).toEqual({ look: "card", radius: 24 });
    expect(page.body.children![1]).toMatchObject({ text: "Add to cart", pin: "bottom", product_part: { look: "price" } });
    expect(productPageOf(ctx(), { parts: [] }).slug).toBe(PRODUCT_PAGE_SLUG);
    expect(parseStudioPage(page, STORE, LANGS)).toMatchObject({ ok: true });
  });

  it("is Lujain's look A's (the pilot), passing the checker; look B keeps the app's product screen", () => {
    const a = signatureDesign("clothes", "a")!.pages!(ctx()).find((p) => p.slug === PRODUCT_PAGE_SLUG)!;
    expect(a.studio.screen).toBe("product");
    const types = allNodes(a.studio).map((n) => n.type);
    for (const type of ["product_gallery", "product_title", "product_price", "product_variants", "product_buy", "product_related", "product_delivery"]) expect(types).toContain(type);
    expect(allNodes(a.studio).find((n) => n.type === "product_buy")).toMatchObject({ pin: "bottom", product_part: { look: "buy_now" } });
    expect(parseStudioPage(a.studio, STORE, LANGS)).toMatchObject({ ok: true });
    expect(signatureDesign("clothes", "b")!.pages!(ctx()).some((p) => p.slug === PRODUCT_PAGE_SLUG)).toBe(false);
  });
});

describe("228 on the hosted API: Lujain's demo", () => {
  let store: MemoryStore;
  let app: App;
  const deps = (s: MemoryStore): DemoSetupDeps => ({
    store: s,
    encryptionKey: KEY,
    putBlob: async () => undefined,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    contact: { whatsapp: "+90 544 673 19 42", email: "info@yallapp.test" },
    actorEmail: "admin@yallapp.test",
    now: NOW,
  });
  beforeEach(async () => {
    clearPlatformSettingsCache();
    store = new MemoryStore();
    const result = await setupDemoApps(deps(store), [CLOTHES_DEMO]);
    app = (await store.getAppById(result.apps[0]!.appId))!;
  });
  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now: NOW,
    ip: "203.0.113.30",
    secret: "test-hosted-secret",
    sender: new LogSender(),
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: new CatalogConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" }),
  });
  async function call(route: string, lang = "en", params: string[] = []): Promise<HostedResult> {
    let i = 0;
    const path = route.replace(/\{[^}]+\}/g, () => params[i++]!);
    const result = await handleHosted(context(), { method: "GET", path: path.split("/").filter(Boolean), query: new URLSearchParams({ platform: "android" }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) });
    expectContract("GET", route, result);
    return result;
  }

  it("lists the product page with its screen, never as a tab's screen, and serves it in the language asked for", async () => {
    const nav = (await call("/pages")).body as { pages: { slug: string; screen?: string }[]; tabs: { target: { type: string; screen?: string } }[] };
    expect(nav.pages.find((p) => p.slug === PRODUCT_PAGE_SLUG)?.screen).toBe("product");
    expect(nav.tabs.some((t) => t.target.screen === "product")).toBe(false);
    const page = (await call("/pages/{slug}", "ar", [PRODUCT_PAGE_SLUG])).body as { studio: StudioPage };
    expect(page.studio.screen).toBe("product");
    const nodes = allNodes(page.studio);
    expect(nodes.filter((n) => (STUDIO_PRODUCT_TYPES as readonly string[]).includes(n.type)).length).toBeGreaterThanOrEqual(10);
    for (const n of nodes) expect(n.translations).toBeUndefined();
  });
});

describe("228 in the contract and the app", () => {
  it("is in the contract, and the app draws each element and the page for every product", () => {
    const api = readFileSync(join(ROOT, "../../docs/api/openapi.yaml"), "utf8");
    expect(api).toContain(`listing_filters, ${STUDIO_PRODUCT_TYPES.join(", ")}]`);
    expect(api).toContain("price_alerts, product, edit_profile");
    expect(api).toContain("product_part:");
    expect(readFileSync(join(ROOT, "public/developers/openapi.yaml"), "utf8")).toBe(api);
    const models = readFileSync(join(ROOT, "../../mobile/lib/core/api/models/page_models.dart"), "utf8");
    for (const type of STUDIO_PRODUCT_TYPES) expect(models).toContain(`  ${type.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())},`);
    const screen = readFileSync(join(ROOT, "../../mobile/lib/modules/store/screens/product_screen.dart"), "utf8");
    expect(screen).toContain("p.screen == 'product'");
    expect(screen).toContain("ProductStudioPage(");
    const view = readFileSync(join(ROOT, "../../mobile/lib/modules/shared/pages/studio_product.dart"), "utf8");
    for (const look of ["'stacked'", "'thumbs'", "'card'", "'from'", "'sale'", "'grid'", "'pill'", "'buy_now'", "'price'", "'accordion'", "'list'", "'bars'"]) expect(view).toContain(look);
  });
});
