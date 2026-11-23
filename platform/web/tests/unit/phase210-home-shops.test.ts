import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import { dimensionsLine, makeDaysLine, productLine, readProductDetails } from "@/lib/catalog/product-details";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { CROCHET_DEMO, DECOR_DEMO, demoIdOf, DEMO_SLUGS, FURNITURE_DEMO, isStoreTemplateDemo, STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { DEMO_BRANDS, DEMO_GUIDES } from "@/lib/demo/content";
import { isShopPhoto } from "@/lib/demo/shop-photos";
import { kitMainOf, kitVariants, type ShopKit } from "@/lib/demo/shop-kit";
import { SHOP_KITS } from "@/lib/demo/shop-kits";
import { setupDemoApps, type DemoSetupDeps } from "@/lib/demo/setup";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { parseStudioPage } from "@/lib/pages/validate";
import type { StudioNode } from "@/lib/pages/types";
import { answerStoreRequest, createStoreRequest, storeRequestJson } from "@/lib/selling/requests";
import { appWords } from "@/lib/studio/app-words";
import { signatureDesign } from "@/lib/studio/demo-designs";
import { KIT_CUSTOM_PAGE, KIT_MENU_PAGE, SHOP_KIT_SECTIONS } from "@/lib/studio/demo-designs/shop-kit-parts";
import { ELEMENTS, newNode } from "@/lib/studio/elements";
import { SECTIONS, TEMPLATES, type SectionContext } from "@/lib/studio/sections";
import { shopTypeById, shopTypeReady } from "@/lib/studio/shop-types";
import { makeStudioProject } from "@/lib/studio/new-project";
import { allNodes } from "@/lib/studio/tree";
import { appUrl } from "@/lib/env";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { expectContract } from "./contract";
import { KEY, NOW } from "./helpers";

/**
 * 210 Studio's shop types, stage 2: home decor (Sakan), crochet and
 * handmade (Ghurza) and furniture (Rukn), their kits and looks, and the
 * parts they bring every store: a product's size in cm and days to make,
 * custom-order requests, the delivery and assembly booking
 * (`delivery_slots`) and "Installments coming soon" on a furniture product.
 */

const ROOT = join(__dirname, "../..");
const KITS = [DECOR_DEMO, CROCHET_DEMO, FURNITURE_DEMO] as const;
const kit = (id: (typeof KITS)[number]): ShopKit => SHOP_KITS[id]!;

function deps(store: MemoryStore): DemoSetupDeps {
  return {
    store,
    encryptionKey: KEY,
    putBlob: async () => undefined,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    contact: { whatsapp: "+90 544 673 19 42", email: "info@yallapp.test" },
    actorEmail: "admin@yallapp.test",
    now: NOW,
  };
}

const ctx = (lang: "en" | "ar" | "tr" = "en", app = "Sakan"): SectionContext => {
  let n = 0;
  return { brand: "#4F5D2F", source: "products", app, lang, w: appWords(lang, app), picture: (f) => `${appUrl()}/design-pictures/${f}`, newId: () => `k-${++n}` };
};
const storeApp = { appType: "store" as const, backend: "hosted" as const, vertical: null };
const languages = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };

describe("210 a product's size in cm and the days it takes to make", () => {
  it("reads them as the owner types them, and refuses a wrong one", () => {
    expect(readProductDetails({ width: "220", depth: "95,5", height: "", makeMin: "3", makeMax: "5" })).toEqual({ errors: {}, dimensions: { width: 220, depth: 95.5, height: null }, makeDays: { min: 3, max: 5 } });
    expect(readProductDetails({})).toEqual({ errors: {}, dimensions: null, makeDays: null });
    // One number of days: from and to the same.
    expect(readProductDetails({ makeMax: "7" }).makeDays).toEqual({ min: 7, max: 7 });
    const wrong = readProductDetails({ width: "-4", height: "tall", makeMin: "9", makeMax: "2" });
    expect(Object.keys(wrong.errors).sort()).toEqual(["height", "makeMax", "width"]);
    expect(readProductDetails({ makeMin: "400" }).errors.makeMin).toBeTruthy();
  });

  it("writes them in the app's language, the days first on a card", () => {
    expect(dimensionsLine({ width: 220, depth: 95, height: 82 }, "en")).toBe("W 220 × D 95 × H 82 cm");
    expect(dimensionsLine({ width: 62, depth: null, height: null }, "tr")).toBe("G 62 cm");
    expect(dimensionsLine({ width: 220, depth: 95, height: 82.5 }, "ar")).toBe("ع 220 × عم 95 × ار 82.5 سم");
    expect(dimensionsLine(null, "en")).toBeNull();
    expect(makeDaysLine({ min: 3, max: 5 }, "en")).toBe("Made in 3–5 days");
    expect(makeDaysLine({ min: 1, max: 1 }, "ar")).toBe("يُصنع في يوم واحد");
    expect(makeDaysLine({ min: 4, max: 4 }, "tr")).toBe("4 günde yapılır");
    expect(productLine({ dimensions: { width: 1, depth: 1, height: 1 }, makeDays: { min: 2, max: 3 } }, "en")).toBe("Made in 2–3 days");
    expect(productLine({}, "en")).toBeNull();
  });
});

describe("210 the parts the shop types bring every store", () => {
  it("are ready sections of the editor's library, each a page the checker takes", () => {
    for (const s of SHOP_KIT_SECTIONS) {
      expect(SECTIONS.some((x) => x.id === s.id)).toBe(true);
      expect(s.fits).toEqual({ types: ["store"], plain: true });
      for (const lang of ["en", "ar", "tr"] as const) {
        const body = s.make(ctx(lang));
        expect(parseStudioPage({ body: { id: "root", type: "column", children: [body] } }, storeApp, languages), `${s.id} ${lang}`).toMatchObject({ ok: true });
      }
    }
  });

  it("offers the delivery days element for stores, checked and kept as made", () => {
    expect(ELEMENTS.some((e) => e.type === "delivery_slots" && e.only === "store")).toBe(true);
    const made = newNode("delivery_slots", { source: "products", brand: "#000000", text: () => "x" });
    expect(made).toMatchObject({ type: "delivery_slots", delivery_slots: { days: 5 } });
    const page = (node: Record<string, unknown>) => parseStudioPage({ body: { id: "root", type: "column", children: [{ id: "d", type: "delivery_slots", ...node }] } }, storeApp, languages);
    const ok = page({ delivery_slots: { days: 7, assembly: true, other: 1 } });
    expect(ok).toMatchObject({ ok: true });
    expect(ok.ok && ok.value.body.children![0]!.delivery_slots).toEqual({ days: 7, assembly: true });
    expect(page({ delivery_slots: { days: 30 } })).toMatchObject({ ok: false });
  });

  it("keeps a form marked as a custom-order request (only one sent by email)", () => {
    const form = (f: Record<string, unknown>) => parseStudioPage({ body: { id: "root", type: "column", children: [{ id: "f", type: "form", form: { fields: [{ id: "a", kind: "text", label: "Piece", required: true }], ...f } }] } }, storeApp, languages);
    const kept = form({ send_to: "email", request: "custom_order" });
    expect(kept.ok && kept.value.body.children![0]!.form?.request).toBe("custom_order");
    const chat = form({ send_to: "chat", request: "custom_order" });
    expect(chat.ok && chat.value.body.children![0]!.form?.request).toBeUndefined();
  });
});

describe("210 custom-order requests", () => {
  it("are kept from a form's answers with who sent them, and answered by the shop", async () => {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Ghurza", email: "owner@ghurza.test", whatsapp: "+201000000000", siteUrl: "", password: null }, NOW);
    const made = await makeStudioProject(store, { clientId: client.id, name: "Ghurza", kind: kindById("store")!, source: "catalog", template: TEMPLATES.find((t) => t.id === "crochet_signature_a")!, words: appWords("en", "Ghurza"), lang: "en" }, NOW);
    const app = (await store.getAppById(made.id))!;
    const pushed: number[] = [];
    const request = await createStoreRequest(
      { store, app, now: NOW, pushOwner: async () => void pushed.push(1) },
      {
        title: "Your custom order",
        lines: [
          { label: "What would you like us to make?", value: "A blanket" },
          { label: "Your name", value: "Mariam" },
          { label: "Your phone", value: "+20 100 000 0000" },
        ],
        kinds: new Map([["Your phone", "phone"]]),
        user: null,
        lang: "ar",
      },
    );
    expect(pushed).toEqual([1]);
    expect(request).toMatchObject({ status: "new", customer: { name: "Mariam", phone: "+20 100 000 0000", email: null }, lang: "ar" });
    expect(await store.listStoreRequests(app.id, { statuses: ["new"] })).toHaveLength(1);
    expect(await answerStoreRequest(store, app.id, request.id, { status: "quoted", reply: "  1,200 EGP, ready in 10 days ", quoteCents: 120_000 }, NOW)).toBe(true);
    const answered = (await store.getStoreRequest(app.id, request.id))!;
    expect(storeRequestJson(answered)).toMatchObject({ status: "quoted", reply: "1,200 EGP, ready in 10 days", quote_cents: 120_000 });
    // Another app's request is not this app's.
    expect(await answerStoreRequest(store, "other", request.id, { status: "done", reply: null, quoteCents: null }, NOW)).toBe(false);
  });
});

describe.each(KITS)("210 the %s type", (id) => {
  const k = kit(id);

  it("is ready, a Studio demo of the store kind told apart by its look A", () => {
    const type = shopTypeById(id)!;
    expect(shopTypeReady(type)).toBe(true);
    expect(STUDIO_DEMO_TYPES).toContain(id);
    expect(isStoreTemplateDemo(id)).toBe(true);
    expect(DEMO_SLUGS[id]).toBe(id);
    expect(demoIdOf({ appType: "store", vertical: null, design: `${id}_signature_a` })).toBe(id);
    expect(DEMO_BRANDS[id].appName).toBeTruthy();
    expect(DEMO_GUIDES[id].screens).toHaveLength(3);
    expect(type.liability).toBe(id === FURNITURE_DEMO ? "warranty" : "general");
    expect(Boolean(type.installmentsSoon)).toBe(id === FURNITURE_DEMO);
    expect(TEMPLATES.filter((t) => t.demo === id).map((t) => t.id)).toEqual([`${id}_signature_a`, `${id}_signature_b`]);
  });

  it("has its products in their categories, each SKU once, their photos shipped and credited", () => {
    expect(k.products.length).toBeGreaterThanOrEqual(24);
    expect(new Set(k.products.map((p) => p.sku)).size).toBe(k.products.length);
    for (const p of k.products) expect(kitMainOf(k, p.sub)).toBeTruthy();
    for (const c of k.categories) expect(c.names.ar && c.names.tr, c.name).toBeTruthy();
    for (const sku of k.flashSale.skus) expect(k.products.some((p) => p.sku === sku), sku).toBe(true);
    const credits = JSON.parse(readFileSync(join(ROOT, `public/${k.photos.dir}/CREDITS.json`), "utf8")) as { file: string; license: string }[];
    expect(credits.map((c) => c.file).sort()).toEqual(k.photos.names.map((n) => `${n}.jpg`).sort());
    for (const c of credits) {
      expect(c.license).toBe("CC0 1.0");
      expect(existsSync(join(ROOT, "public", k.photos.dir, c.file)), c.file).toBe(true);
    }
    for (const p of k.products) for (const photo of p.photos) expect(isShopPhoto(`${k.photos.prefix}${photo}`), photo).toBe(true);
    // Choices become variations with their own stock, one gone somewhere.
    const chosen = k.products.filter((p) => (p.choices ?? []).length > 0);
    expect(chosen.length).toBeGreaterThan(0);
    for (const [i, p] of chosen.entries()) expect(kitVariants(p, i)!.items.length).toBe(p.choices!.reduce((n, c) => n * c.values.length, 1));
    // The type's own parts: furniture its sizes, crochet its days to make, decor its sizes.
    if (id === CROCHET_DEMO) expect(k.products.filter((p) => p.makeDays).length).toBeGreaterThan(5);
    else expect(k.products.filter((p) => p.dimensions).length).toBeGreaterThan(10);
    if (id === FURNITURE_DEMO) expect(k.commerce.delivery?.enabled).toBe(true);
  });

  it.each(["a", "b"] as const)("look %s: a home, the category menu and each page the checker takes, in three languages", (look) => {
    const d = signatureDesign(id, look)!;
    for (const lang of ["en", "ar", "tr"] as const) {
      const c = ctx(lang, DEMO_BRANDS[id].appName);
      const home = d.home(c);
      expect(home.header?.menu_page).toBe(KIT_MENU_PAGE);
      const nodes = allNodes(home);
      const hero = nodes.find((n) => n.type === "slider")!;
      expect(hero.height).toBeGreaterThanOrEqual(190);
      expect(hero.height).toBeLessThanOrEqual(230);
      expect(hero.per_view).toBeGreaterThan(1);
      // Alone, the home's links to the look's own pages are the only thing the checker can't find (signature-looks checks the whole project).
      const checked = parseStudioPage(home, storeApp, languages);
      if (!checked.ok) for (const e of checked.errors) expect(e, `${id} ${look} ${lang} home`).toMatch(/choose a page that exists/);
      const pages = d.pages!(c);
      expect(pages.map((p) => p.slug)).toContain(KIT_MENU_PAGE);
      if (id !== DECOR_DEMO) expect(pages.map((p) => p.slug)).toContain(KIT_CUSTOM_PAGE);
      for (const page of pages) expect(parseStudioPage(page.studio, storeApp, languages), `${id} ${look} ${lang} ${page.slug}`).toMatchObject({ ok: true });
      const all = [...nodes, ...pages.flatMap((p) => allNodes(p.studio))];
      // Furniture: the delivery and assembly booking and installments only as "coming soon"; crochet: the custom order.
      if (id === FURNITURE_DEMO) expect(all.some((n) => n.type === "delivery_slots")).toBe(true);
      if (id !== DECOR_DEMO) expect(all.some((n) => n.type === "form" && n.form?.request === "custom_order")).toBe(true);
    }
    expect(d.bar.design).toBe("float");
  });

  describe("the demo app on the hosted API", () => {
    let store: MemoryStore;
    let app: App;
    beforeEach(async () => {
      clearPlatformSettingsCache();
      store = new MemoryStore();
      const result = await setupDemoApps(deps(store), [id]);
      app = (await store.getAppById(result.apps[0]!.appId))!;
    });

    const context = (): HostedContext => ({
      store,
      app,
      active: true,
      now: NOW,
      ip: "203.0.113.31",
      secret: "test-hosted-secret",
      sender: new LogSender(),
      push: false,
      assetUrl: (a) => `https://yallapp.test/api/v1/assets/${a}`,
      platformUrl: "https://yallapp.test",
      connector: new CatalogConnector({ store, app, assetUrl: (a) => `https://yallapp.test/api/v1/assets/${a}`, platformUrl: "https://yallapp.test" }),
    });

    async function call(route: string, query: Record<string, string> = {}, lang = "en", params: string[] = []): Promise<HostedResult> {
      let i = 0;
      const path = route.replace(/\{[^}]+\}/g, () => params[i++]!);
      const result = await handleHosted(context(), { method: "GET", path: path.split("/").filter(Boolean), query: new URLSearchParams({ platform: "android", ...query }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) });
      expectContract("GET", route, result);
      return result;
    }

    it("keeps its look, categories and products, and serves each product's line and details", async () => {
      expect(app.design).toBe(`${id}_signature_a`);
      expect(app.catalogSettings?.currency).toBe(k.currency);
      expect(await store.listCatalogProducts(app.id)).toHaveLength(k.products.length);
      const listed = (await call("/store/products", { per_page: "50" })).body as { items: { id: number; subtitle?: string | null }[] };
      expect(listed.items.some((p) => typeof p.subtitle === "string" && p.subtitle.length > 0)).toBe(true);
      const products = await store.listCatalogProducts(app.id);
      const piece = products.find((p) => (id === CROCHET_DEMO ? p.makeDays : p.dimensions) && !p.addon)!;
      const detail = (await call("/store/products/{product_id}", {}, "ar", [String(piece.id)])).body as { dimensions: { text: string } | null; make_days: { text: string } | null };
      if (id === CROCHET_DEMO) expect(detail.make_days?.text).toMatch(/^يُصنع في/);
      else expect(detail.dimensions?.text).toMatch(/سم$/);
      const config = (await call("/config", { platform: "android", app_version: "1.0.0" })).body as { store: { installments_soon: boolean; delivery_date: { enabled: boolean } } };
      expect(config.store.installments_soon).toBe(id === FURNITURE_DEMO);
      if (id === FURNITURE_DEMO) expect(config.store.delivery_date.enabled).toBe(true);
    });

    it("serves the category menu page with its main categories in their order", async () => {
      const page = (await call("/pages/{slug}", {}, "en", [KIT_MENU_PAGE])).body as { studio: { body: StudioNode } };
      const menu = allNodes({ body: page.studio.body }).find((n) => n.type === "categories" && n.style === "rows")!;
      const rows = (menu as unknown as { categories: { name: string }[] }).categories;
      expect(rows.map((r) => r.name)).toEqual(k.categories.map((c) => c.name));
    });

    it.runIf(id !== DECOR_DEMO)("keeps the custom-order page's answers as the shop's request", async () => {
      const page = (await call("/pages/{slug}", {}, "en", [KIT_CUSTOM_PAGE])).body as { studio: { body: StudioNode } };
      const form = allNodes({ body: page.studio.body }).find((n) => n.type === "form")!;
      const answers = Object.fromEntries(form.form!.fields.map((f) => [f.id, f.kind === "phone" ? "+966500000000" : f.kind === "email" ? "a@example.com" : f.kind === "number" ? "2" : f.kind === "choice" ? f.options![0]! : "A blanket in sage"]));
      const sent = await handleHosted({ ...context(), onFormAnswers: async () => undefined }, { method: "POST", path: ["forms", KIT_CUSTOM_PAGE, form.id], query: new URLSearchParams(), body: { answers }, token: null, headers: new Headers() });
      expect(sent.status).toBe(202);
      const kept = await store.listStoreRequests(app.id);
      expect(kept).toHaveLength(1);
      expect(kept[0]!.answers.length).toBe(form.form!.fields.length);
    });
  });
});
