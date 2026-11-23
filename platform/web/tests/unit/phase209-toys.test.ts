import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import { detailsOf } from "@/lib/catalog/details";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { demoIdOf, demoKind, DEMO_SLUGS, isStoreTemplateDemo, STUDIO_DEMO_TYPES, TOYS_DEMO } from "@/lib/demo/constants";
import { DEMO_BRANDS, DEMO_GUIDES } from "@/lib/demo/content";
import { isShopPhoto, TOYS_PHOTO_NAMES } from "@/lib/demo/shop-photos";
import { setupDemoApps, type DemoSetupDeps } from "@/lib/demo/setup";
import { ageLabel, TOYS_ADDONS, TOYS_AGES, TOYS_BIRTHDAY, TOYS_BY_AGE, TOYS_CATEGORIES, TOYS_COMMERCE, TOYS_PRODUCTS, toysAgesOf, toysMainOf } from "@/lib/demo/toys";
import { toysPartsForSamples } from "@/lib/demo/toys-entries";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { mediaAddress, parseStudioPage } from "@/lib/pages/validate";
import type { StudioNode } from "@/lib/pages/types";
import { APP_WORDS, appWords } from "@/lib/studio/app-words";
import { signatureDesign } from "@/lib/studio/demo-designs";
import { MENU_PAGE } from "@/lib/studio/demo-designs/clothes-signature";
import { TOYS_AGE_WORDS, TOYS_SECTIONS } from "@/lib/studio/demo-designs/toys-signature";
import { DEMO_FACTS } from "@/lib/studio/demo-templates";
import { liabilityDue } from "@/lib/studio/liability";
import { SECTIONS, TEMPLATES, templatesFor, type SectionContext } from "@/lib/studio/sections";
import { namesakeOf, TEMPLATE_CATEGORY_LINK_WORDS, withShopCategoriesIn } from "@/lib/studio/shop-categories";
import { shopTypeById, shopTypeOfDesign, shopTypeReady, shopTypesIn, shopTypeTemplate } from "@/lib/studio/shop-types";
import { makeStudioProject } from "@/lib/studio/new-project";
import { allNodes } from "@/lib/studio/tree";
import { ICON_NAMES } from "@/components/icon-names";
import { appUrl } from "@/lib/env";
import { en as shopTypesEn } from "@/i18n/dashboard/shop-types";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { expectContract } from "./contract";
import { KEY, NOW } from "./helpers";

/**
 * 209 Studio's toys type: Toot, the toy shop's demo (its toys by type and
 * by age, each with its age, safety and materials; the birthday gifts with
 * the wraps and the card as add-ons and the card's message at checkout;
 * gifts under a price; its flash sale and code), its two looks A (Toot)
 * and B (Mukaab), their ready sections and the kids' liability notice.
 */

const ROOT = join(__dirname, "../..");

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

const ctx = (lang: "en" | "ar" | "tr" = "en"): SectionContext => {
  let n = 0;
  return { brand: "#7B2D4E", source: "products", app: "Toot", lang, w: appWords(lang, "Toot"), picture: (f) => `${appUrl()}/design-pictures/${f}`, newId: () => `ty-${++n}` };
};

describe("209 the toys type", () => {
  it("is ready in Kids & toys, with its two looks as store templates and the kids' notice", () => {
    const toys = shopTypeById("toys")!;
    expect(shopTypeReady(toys)).toBe(true);
    expect(toys.demo).toBe(TOYS_DEMO);
    expect(shopTypeTemplate(toys)).toBe("toys_signature_a");
    expect(shopTypeTemplate(toys, "b")).toBe("toys_signature_b");
    expect(shopTypesIn("kids").map((t) => t.id)).toContain("toys");
    expect(shopTypesIn("kids")[0]!.id).toBe("toys");
    const store = templatesFor({ type: "store", vertical: null }).map((t) => t.id);
    expect(store).toEqual(expect.arrayContaining(["toys_signature_a", "toys_signature_b"]));
    expect(templatesFor({ type: "store", vertical: "restaurant" }).map((t) => t.id)).not.toContain("toys_signature_a");
    expect(shopTypeOfDesign("toys_signature_b")?.id).toBe("toys");
    expect(TEMPLATES.filter((t) => t.demo === TOYS_DEMO).map((t) => t.id)).toEqual(["toys_signature_a", "toys_signature_b"]);
  });

  it("asks its owner to accept the kids' notice once: child-safety standards and age warnings, sold to parents", () => {
    const app = (design: string, accepted: App["liabilityAccepted"] = null) => ({ section: "studio" as const, design, liabilityAccepted: accepted });
    expect(liabilityDue(app("toys_signature_a"))).toMatchObject({ kind: "kids", type: { id: "toys" } });
    expect(liabilityDue(app("toys_signature_b"))?.kind).toBe("kids");
    expect(liabilityDue(app("toys_signature_a", { kids: { at: NOW.toISOString(), userId: "u" } }))).toBeNull();
    expect(shopTypesEn.notice_kids).toMatch(/safety/i);
    expect(shopTypesEn.notice_kids).toMatch(/age/i);
    expect(shopTypesEn.notice_kids).toMatch(/parent/i);
  });
});

describe("209 Toot's toys", () => {
  it("puts every toy in its type, its main category and the ages it is for, with its age, safety and materials", () => {
    expect(new Set(TOYS_PRODUCTS.map((p) => p.sku)).size).toBe(TOYS_PRODUCTS.length);
    expect(TOYS_PRODUCTS.length).toBeGreaterThanOrEqual(30);
    for (const p of TOYS_PRODUCTS) {
      expect(toysMainOf(p.sub).subs.some((s) => s.name === p.sub), p.sku).toBe(true);
      const ages = toysAgesOf(p.ageMonths);
      expect(ages.length, p.sku).toBeGreaterThan(0);
      // The age its first month is in, always.
      const first = TOYS_AGES.find((a) => a.from <= p.ageMonths.min && (a.to === null || a.to > p.ageMonths.min))!;
      expect(ages, p.sku).toContain(first.name);
      // The details as the product page reads them: its age, safety and materials, tested for safety, gift wrapping.
      const d = detailsOf(p.details)!;
      expect(d.ageMonths, p.sku).toEqual(p.ageMonths);
      expect(d.info!.map((i) => i.kind), p.sku).toEqual(expect.arrayContaining(["safety", "materials"]));
      expect(d.badges, p.sku).toEqual(expect.arrayContaining(["safety_tested", "gift_wrap"]));
      expect(d.facts!.map((f) => f.name), p.sku).toEqual(expect.arrayContaining(["Age", "Material", "Size", "Batteries"]));
      for (const photo of p.photos) expect(isShopPhoto(`ty-${photo}`), photo).toBe(true);
    }
    // Small parts: the warning for under 3s.
    const bricks = TOYS_PRODUCTS.find((p) => p.sku === "TY-201")!;
    expect(bricks.details.info!.find((i) => i.kind === "safety")!.text).toMatch(/not suitable for children under 3 years/);
    expect(ageLabel({ min: 0, max: null })).toBe("From birth");
    expect(ageLabel({ min: 18, max: null })).toBe("18+ months");
    expect(ageLabel({ min: 36, max: null })).toBe("3+ years");
    expect(ageLabel({ min: 0, max: 12 })).toBe("0–12 months");
    expect(ageLabel({ min: 24, max: 60 })).toBe("2–5 years");
    expect(toysAgesOf({ min: 0, max: 12 })).toEqual(["0–12 months"]);
    expect(toysAgesOf({ min: 108, max: null })).toEqual(["9+ years"]);
  });

  it("names the ages, the birthday gifts and the categories the looks open as the looks' words, in each language", () => {
    const named = (word: (typeof TEMPLATE_CATEGORY_LINK_WORDS)[number]) => ({ en: APP_WORDS.en[word], ar: APP_WORDS.ar[word], tr: APP_WORDS.tr[word] });
    TOYS_AGES.forEach((age, i) => expect(named(TOYS_AGE_WORDS[i]!)).toEqual({ en: age.name, ar: age.names.ar, tr: age.names.tr }));
    const all = TOYS_CATEGORIES.flatMap((c) => [c, ...c.subs]);
    for (const word of TEMPLATE_CATEGORY_LINK_WORDS) {
      const c = all.find((x) => x.name === APP_WORDS.en[word]);
      expect(c, word).toBeTruthy();
      expect(named(word)).toEqual({ en: c!.name, ar: c!.names.ar, tr: c!.names.tr });
    }
    expect(TOYS_CATEGORIES.map((c) => c.name)).toEqual(expect.arrayContaining([TOYS_BY_AGE, TOYS_BIRTHDAY, "Wooden toys", "Plush", "Building", "Puzzles & games", "Science & STEM", "Outdoor"]));
  });

  it("has its photos (CC0, credited) where the looks and its products take them", () => {
    const credits = JSON.parse(readFileSync(join(ROOT, "public/toys-photos/CREDITS.json"), "utf8")) as { file: string; license: string; page: string }[];
    expect(credits.map((c) => c.file).sort()).toEqual(TOYS_PHOTO_NAMES.map((n) => `${n}.jpg`).sort());
    for (const c of credits) {
      expect(c.license).toBe("CC0 1.0");
      expect(c.page).toMatch(/^https:\/\/stocksnap\.io\/photo\//);
      expect(existsSync(join(ROOT, "public/toys-photos", c.file)), c.file).toBe(true);
    }
    for (const a of TOYS_ADDONS) expect(isShopPhoto(`ty-${a.photo}`)).toBe(true);
    expect(mediaAddress(`${appUrl()}/toys-photos/bear-mint.jpg`)).toBe(`${appUrl()}/toys-photos/bear-mint.jpg`);
    // Every photo the looks name is one of the set.
    const named = new Set<string>();
    for (const look of ["a", "b"] as const) {
      const d = signatureDesign(TOYS_DEMO, look)!;
      const pages = [d.home(ctx()), ...d.pages!(ctx()).map((p) => p.studio)];
      for (const page of pages) for (const n of allNodes(page)) for (const url of [n.image_url, n.image_background_url, ...(n.entries ?? []).map((e) => e.image_url)]) if (url) named.add(url);
    }
    for (const url of named) expect(TOYS_PHOTO_NAMES as readonly string[], url).toContain(url.split("/toys-photos/")[1]!.replace(".jpg", ""));
  });
});

describe("209 Toot, the toy shop's demo", () => {
  it("is a Studio demo of the store kind, told apart by its look A, at its own address", () => {
    expect(STUDIO_DEMO_TYPES).toContain(TOYS_DEMO);
    expect(isStoreTemplateDemo(TOYS_DEMO)).toBe(true);
    expect(demoKind(TOYS_DEMO)).toMatchObject({ engine: "store", vertical: null });
    expect(DEMO_SLUGS.toys).toBe("toys");
    expect(demoIdOf({ appType: "store", vertical: null, design: "toys_signature_a" })).toBe(TOYS_DEMO);
    expect(DEMO_BRANDS.toys.appName).toBe("Toot");
    expect(DEMO_GUIDES.toys.screens).toEqual(["toot-home", "toot-menu", "toot-product"]);
    // The demo's words where its looks leave the owner brackets, in its three languages.
    for (const words of Object.values(DEMO_FACTS.toys!)) expect(Object.keys(words!).sort()).toEqual(["ar", "en", "tr"]);
  });

  describe("the demo app on the hosted API", () => {
    let store: MemoryStore;
    let app: App;
    beforeEach(async () => {
      clearPlatformSettingsCache();
      store = new MemoryStore();
      const result = await setupDemoApps(deps(store), [TOYS_DEMO]);
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
      assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
      platformUrl: "https://yallapp.test",
      connector: new CatalogConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" }),
    });

    /** A GET of `route`, checked against the contract (209 the quiz element isn't in it yet: `contract` false for the home). */
    async function call(route: string, query: Record<string, string> = {}, lang = "en", params: string[] = [], contract = true): Promise<HostedResult> {
      let i = 0;
      const path = route.replace(/\{[^}]+\}/g, () => params[i++]!);
      const result = await handleHosted(context(), { method: "GET", path: path.split("/").filter(Boolean), query: new URLSearchParams({ platform: "android", ...query }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) });
      if (contract) expectContract("GET", route, result);
      return result;
    }

    it("keeps its categories, its toys with their details, the add-ons, the card at checkout, the sale and the code", async () => {
      expect(app.design).toBe("toys_signature_a");
      expect(app.catalogSettings?.currency).toBe("AED");
      expect(app.catalogSettings?.returnDays).toBe(30);
      expect(app.catalogSettings?.gifts).toMatchObject({ message: true, recipient: true, starterTexts: { ar: TOYS_COMMERCE.gifts!.starterTexts!.ar } });
      const categories = await store.listCatalogCategories(app.id);
      expect(categories).toHaveLength(TOYS_CATEGORIES.length + TOYS_CATEGORIES.reduce((n, c) => n + c.subs.length, 0));
      const byAge = categories.find((c) => c.name === TOYS_BY_AGE)!;
      expect(byAge.parentId ?? null).toBeNull();
      expect(categories.filter((c) => c.parentId === byAge.id).map((c) => c.name)).toEqual(TOYS_AGES.map((a) => a.name));
      const products = await store.listCatalogProducts(app.id);
      expect(products).toHaveLength(TOYS_PRODUCTS.length + TOYS_ADDONS.length);
      const ageIds = new Set(categories.filter((c) => c.parentId === byAge.id).map((c) => c.id));
      for (const p of products.filter((x) => !x.addon)) {
        expect(p.categoryIds.some((id) => ageIds.has(id)), p.name).toBe(true);
        expect(p.details?.ageMonths, p.name).toBeTruthy();
      }
      const addons = products.filter((p) => p.addon);
      expect(addons.map((p) => p.sku).sort()).toEqual(TOYS_ADDONS.map((a) => a.sku).sort());
      for (const a of addons) expect(a.addonFor ?? null).toBeNull();
      const birthday = categories.find((c) => c.name === TOYS_BIRTHDAY)!;
      expect(products.filter((p) => p.categoryIds.includes(birthday.id)).length).toBeGreaterThanOrEqual(8);
      expect((await store.listFlashSales(app.id)).length).toBe(1);
      expect(await store.getCatalogCouponByCode(app.id, "TOOT10")).toBeTruthy();
    });

    it("serves the ages with their main category, a toy's details, and gifts under a price", async () => {
      const listed = (await call("/store/categories")).body as { items: { id: number; name: string; count: number; parent_id: number | null }[] };
      const byAge = listed.items.find((c) => c.name === TOYS_BY_AGE)!;
      const toddlers = listed.items.find((c) => c.name === "1–2 years")!;
      expect(toddlers.parent_id).toBe(byAge.id);
      expect(byAge.count).toBe(TOYS_PRODUCTS.length);
      const arabic = (await call("/store/categories", {}, "ar")).body as { items: { name: string }[] };
      expect(arabic.items.map((c) => c.name)).toEqual(expect.arrayContaining(["حسب العمر", "1–2 سنة", "هدايا أعياد الميلاد"]));
      const under = (await call("/store/products", { max_price: "100", per_page: "50" })).body as { items: { name: string }[] };
      const cheap = TOYS_PRODUCTS.filter((p) => (p.salePriceCents ?? p.priceCents) <= 100_00).map((p) => p.name);
      expect(under.items.map((p) => p.name).sort()).toEqual(expect.arrayContaining(cheap.sort()));
      expect(under.items.length).toBeGreaterThanOrEqual(5);
      const products = await store.listCatalogProducts(app.id);
      const bear = products.find((p) => p.sku === "TY-302")!;
      const detail = (await call("/store/products/{product_id}", {}, "en", [String(bear.id)])).body as Record<string, unknown>;
      expect(detail.name).toBe("Lulu classic bear, 40 cm");
    });

    it("serves the menu's rows and opens each age, the birthday gifts and the gift boxes from the home, in every language", async () => {
      const page = (await call("/pages/{slug}", {}, "en", [MENU_PAGE])).body as { studio: { body: StudioNode } };
      const menu = allNodes({ body: page.studio.body }).find((n) => n.type === "categories" && n.style === "rows")!;
      const rows = (menu as unknown as { categories: { name: string; children: { name: string }[] }[] }).categories;
      expect(rows.map((r) => r.name)).toEqual(TOYS_CATEGORIES.map((c) => c.name));
      expect(rows.find((r) => r.name === TOYS_BY_AGE)!.children.map((c) => c.name)).toEqual(TOYS_AGES.map((a) => a.name));
      const categories = await store.listCatalogCategories(app.id);
      for (const lang of ["en", "ar"]) {
        const home = (await call("/pages/{slug}", {}, lang, ["home"], false)).body as { studio: { body: StudioNode } };
        const nodes = allNodes({ body: home.studio.body });
        const opened = new Set(nodes.flatMap((n) => [n.action, ...(n.entries ?? []).map((e) => e.action)]).flatMap((a) => (a?.type === "screen" && a.category_id ? [Number(a.category_id)] : [])));
        for (const age of TOYS_AGES) expect(opened.has(categories.find((c) => c.name === age.name)!.id), `${lang} ${age.name}`).toBe(true);
        // The gift finder: its results open the ages.
        const quiz = nodes.find((n) => n.type === "quiz")!;
        expect(quiz.entries!.every((e) => e.action?.type === "screen" && e.action.category_id)).toBe(true);
        expect(quiz.quiz!.questions).toHaveLength(3);
        // Gifts under 100: the shop's toys at that price or under.
        expect(nodes.some((n) => n.type === "items" && (n as unknown as { items?: unknown[] }).items?.length)).toBe(true);
      }
    });
  });
});

describe("209 Toot's two looks: Toot, playful, and Mukaab, calm and educational", () => {
  it.each(["a", "b"] as const)("look %s: a real phone app, its menu, the ages, safety, the gift finder and gifts under a price, each page the checker takes", (look) => {
    const d = signatureDesign(TOYS_DEMO, look)!;
    for (const lang of ["en", "ar", "tr"] as const) {
      // Made alone, as a check of the home by itself (the look's own pages are made with it in a project).
      const home = d.home({ ...ctx(lang), ownPages: false });
      expect(home.header?.buttons).toContain("menu");
      expect(home.header?.menu_page).toBe(MENU_PAGE);
      const nodes = allNodes(home);
      const hero = nodes.find((n) => n.type === "slider")!;
      expect(hero.height).toBe(210);
      expect(hero.per_view).toBeGreaterThan(1);
      expect(nodes.some((n) => n.type === "flash_sale")).toBe(true);
      expect(nodes.some((n) => n.type === "quiz")).toBe(true);
      expect(nodes.some((n) => n.type === "items" && n.query?.max_price === (look === "a" ? 100 : 200))).toBe(true);
      // The ages, each in its own words (the category it opens).
      const texts = new Set(nodes.map((n) => n.text));
      for (const word of TOYS_AGE_WORDS) expect(texts.has(APP_WORDS[lang][word]), word).toBe(true);
      // Nine to twelve sections: the home's own parts.
      expect(home.body.children!.length).toBeGreaterThanOrEqual(12);
      const app = { appType: "store" as const, backend: "hosted" as const, vertical: null };
      const languages = { default: lang, available: ["en" as const, "ar" as const, "tr" as const] };
      expect(parseStudioPage(home, app, languages)).toMatchObject({ ok: true });
      const pages = d.pages!(ctx(lang));
      expect(pages.map((p) => p.slug)).toEqual([MENU_PAGE]);
      for (const page of pages) expect(parseStudioPage(page.studio, app, languages)).toMatchObject({ ok: true });
      const menu = allNodes(pages[0]!.studio).find((n) => n.type === "categories" && n.style === "rows")!;
      expect(menu.category_menu?.look).toBe(look === "a" ? "lead" : "label");
      const opens = allNodes(pages[0]!.studio).flatMap((n) => (n.action?.type === "screen" ? [n.action.screen] : []));
      expect(opens).toEqual(expect.arrayContaining(["account", "orders", "settings"]));
      for (const over of ["search", "cart", "orders"]) expect(d.over!(over, ctx(lang))?.length, over).toBeGreaterThan(0);
    }
    expect(d.bar.design).toBe("float");
    expect(d.tabs!([]).map((t) => t.icon)).toContain("package_2");
  });

  it("draws only icons the site has", () => {
    const icons = new Set<string>();
    for (const look of ["a", "b"] as const) {
      const d = signatureDesign(TOYS_DEMO, look)!;
      for (const page of [d.home(ctx()), ...d.pages!(ctx()).map((p) => p.studio), ...["search", "cart", "orders"].flatMap((s) => (d.over!(s, ctx()) ?? []).map((body) => ({ body })))]) {
        for (const n of allNodes(page)) {
          if (n.icon) icons.add(n.icon);
          for (const e of n.entries ?? []) if (e.icon) icons.add(e.icon);
        }
      }
    }
    for (const s of TOYS_SECTIONS) icons.add(s.icon);
    for (const icon of icons) expect(ICON_NAMES as readonly string[], icon).toContain(icon);
  });

  it("links an element named like one of the shop's sub-categories (an age) in any language, never a list", () => {
    const list = [{ id: 1, name: "حسب العمر" }];
    const subs = [{ id: 11, name: "0–12 شهرًا" }, { id: 12, name: "1–2 سنة" }];
    expect(namesakeOf("0–12 months", subs)?.id).toBe(11);
    const tile: StudioNode = { id: "t", type: "column", action: { type: "screen", screen: "search" }, children: [{ id: "x", type: "text", text: "1–2 years" }] };
    const body: StudioNode = { id: "b", type: "column", children: [tile] };
    const linked = withShopCategoriesIn(body, { list, own: false, subs });
    expect(linked.children![0]!.action).toEqual({ type: "screen", screen: "search", category_id: "12" });
    // Without the sub-categories, the shop.
    expect(withShopCategoriesIn(body, { list, own: false }).children![0]!.action).toEqual({ type: "screen", screen: "search" });
  });

  it("are new ready sections for any store", () => {
    for (const s of TOYS_SECTIONS) {
      expect(SECTIONS.some((x) => x.id === s.id), s.id).toBe(true);
      expect(s.isNew).toBe(true);
      expect(s.fits).toEqual({ types: ["store"], plain: true });
      expect(s.make(ctx()), s.id).toBeTruthy();
    }
  });

  it("starts a project from Mukaab with Toot's toys as samples and the birthday card at checkout", async () => {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Cubes", email: "owner@cubes.test", whatsapp: "+971500000000", siteUrl: "", password: null }, NOW);
    const mukaab = TEMPLATES.find((t) => t.id === "toys_signature_b")!;
    const made = await makeStudioProject(store, { clientId: client.id, name: "Cubes Toys", kind: kindById("store")!, source: "catalog", template: mukaab, words: appWords("en", "Cubes Toys"), lang: "en" }, NOW);
    const app = (await store.getAppById(made.id))!;
    expect(app.design).toBe("toys_signature_b");
    const products = await store.listCatalogProducts(app.id);
    expect(products.length).toBe(TOYS_PRODUCTS.length + TOYS_ADDONS.length);
    expect(products.every((p) => p.sample)).toBe(true);
    expect(app.catalogSettings?.gifts?.message).toBe(true);
    // Its own gift settings are kept when the samples come again.
    await store.updateApp(app.id, { catalogSettings: { ...app.catalogSettings!, gifts: { ...app.catalogSettings!.gifts!, message: false } } }, NOW);
    await toysPartsForSamples({ store, now: NOW }, (await store.getAppById(app.id))!);
    expect((await store.getAppById(app.id))!.catalogSettings?.gifts?.message).toBe(false);
  });
});
