import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import type { BlobStore } from "@/lib/blobs";
import { MemoryStore } from "@/lib/data/memory";
import { designerPageDefaults, type MarketTemplate } from "@/lib/data/types";
import type { LayoutContent, LayoutPage, LayoutTab, StudioNode, StudioPage } from "@/lib/pages/types";
import { demoKind, STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { pickerSections, startLooks, studioDemoTemplate } from "@/lib/demo/picker";
import { loadLayout } from "@/lib/pages/layout";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { appWords } from "@/lib/studio/app-words";
import { makeStudioProject } from "@/lib/studio/new-project";
import { signatureLooksOf } from "@/lib/studio/demo-designs";
import { TEMPLATES } from "@/lib/studio/sections";
import { parseStudioScreens } from "@/lib/studio/screens";
import { applyTemplate, restorePrevious, updateToLatest, type MarketDeps } from "@/lib/studio-market/apply";
import { buyerLicences, filterCards, marketCatalog, readMarketQuery, sellerTemplates } from "@/lib/studio-market/catalog";
import { DESIGNER_MESSAGES, joinAsDesigner } from "@/lib/studio-market/designers";
import { ensureHouseTemplates, HOUSE_DESIGNER, HOUSE_DESIGNER_ID, houseDesign, houseFileFor, houseKinds, houseLookOf, houseLooks, houseTemplateId, houseVersions, readTemplateLook } from "@/lib/studio-market/house";
import { kindsForEngine, templateFits } from "@/lib/studio-market/kinds";
import { publicTemplate, publicTemplateSlugs } from "@/lib/studio-market/public";
import { reviewQueue } from "@/lib/studio-market/review";
import { versionDesign } from "@/lib/studio-market/snapshot";
import { readTexts, TEMPLATE_LIMITS } from "@/lib/studio-market/templates";
import { offeredPlans } from "@/lib/studio-market/plans";
import { appUrl } from "@/lib/env";

/**
 * 190 Yallapp's own Studio demos on Studio Market, free: every look a new
 * Studio project starts from on /start?for=studio, listed by "Yallapp" (the
 * demo account's designer profile, no account made for it), seeded on read
 * and kept as the code makes it, found and filtered like any free template,
 * and applied to give a buyer's project what a new project from the demo
 * starts with; no money, plans, payouts or review.
 */

const BLOBS = mkdtempSync(join(tmpdir(), "phase190-"));
process.env.YALLAPP_BLOBS_DIR = BLOBS;
afterAll(() => rmSync(BLOBS, { recursive: true, force: true }));

class MemoryBlobs implements BlobStore {
  files = new Map<string, { data: Buffer; contentType: string }>();
  async put(key: string, data: Buffer, contentType: string) {
    this.files.set(key, { data, contentType });
  }
  async get(key: string) {
    return this.files.get(key) ?? null;
  }
  async delete(key: string) {
    this.files.delete(key);
  }
}

const NOW = new Date("2026-11-18T10:00:00Z");
const LATER = new Date("2026-11-19T10:00:00Z");
const LANGS = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };
const BLANK = TEMPLATES.find((t) => t.id === "blank")!;

let store: MemoryStore;
let blobs: MemoryBlobs;
let n = 0;
const deps = (now = NOW): MarketDeps => ({ store, blobs, now });
const house = (now = NOW) => ensureHouseTemplates({ store, blobs, now });

beforeEach(() => {
  store = new MemoryStore();
  blobs = new MemoryBlobs();
  clearPlatformSettingsCache();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

async function account(name: string): Promise<string> {
  n += 1;
  const { client } = await registerClient(store, { name, email: `${name.toLowerCase().replace(/\W+/g, "-")}-${n}@house.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  return client.id;
}

/** The demo account, as Admin › Demo apps makes it (platform setting `demo`). */
async function demoAccount(): Promise<string> {
  const clientId = await account("Yallapp demos");
  await store.setPlatformSetting("demo", { clientId }, "team@yallapp.test", NOW);
  clearPlatformSettingsCache();
  return clientId;
}

const houseIds = () => houseLooks().map((l) => houseTemplateId(l.demo, l.look));

describe("190 every Studio demo look, made in code", () => {
  it("is every look /start?for=studio starts a Studio project from: each demo's looks A and B", () => {
    const fromStart = pickerSections().studio.flatMap((demo) => startLooks(demo).map((look) => `${demo}:${look}`));
    expect(houseLooks().map((l) => `${l.demo}:${l.look}`).sort()).toEqual([...fromStart].sort());
    // 223 Two looks each, and two more (C and D) for each shop type that has them.
    expect(houseLooks()).toHaveLength(STUDIO_DEMO_TYPES.reduce((n, demo) => n + signatureLooksOf(demo).length, 0));
    // Every one makes a design that passes the page checker: none is left out.
    expect(houseVersions().map((v) => `${v.demo}:${v.look}`)).toEqual(houseLooks().map((l) => `${l.demo}:${l.look}`));
  });

  it("makes the same design each time, a version id of its own per look, and one id per template", () => {
    for (const { demo, look } of houseLooks()) {
      expect(JSON.stringify(houseDesign(demo, look, appUrl()))).toBe(JSON.stringify(houseDesign(demo, look, appUrl())));
    }
    const versions = houseVersions();
    expect(new Set(versions.map((v) => v.versionId)).size).toBe(versions.length);
    expect(new Set(versions.map((v) => v.templateId)).size).toBe(versions.length);
    expect(new Set(versions.map((v) => v.slug)).size).toBe(versions.length);
    for (const v of versions) {
      expect(houseLookOf(v.templateId)).toEqual({ demo: v.demo, look: v.look });
      expect(v.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      // Its cover is its home, in the demo's three languages.
      expect(v.file.pages[0]!.slug).toBe("home");
      expect(v.file.languages).toEqual(LANGS);
      expect(v.file.look?.tabs?.length).toBeGreaterThan(0);
      expect(v.file.look?.tab_bar).toBeTruthy();
      expect(v.file.look?.screens?.sign_in).toBeTruthy();
    }
    // A designer's template is none of them.
    expect(houseLookOf("00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  it("has its title, short line and description in English, Arabic and Turkish, in the market's limits", () => {
    const egyptian = /(?<![؀-ۿ])(?:و|ف|ب)?(?:النهارده|دلوقتي|اللي|دهبي|الدقايق|عايز|بتاع|فين|إزاي|كده|مش|قايمة|زرار|السواق)(?![؀-ۿ])/u;
    for (const v of houseVersions()) {
      expect(readTexts(v.texts)).toEqual({ ok: true, value: v.texts });
      for (const lang of ["en", "ar", "tr"] as const) {
        const text = v.texts[lang]!;
        expect(text.title.length, `${v.templateId} ${lang}`).toBeLessThanOrEqual(TEMPLATE_LIMITS.title);
        expect(text.short.length).toBeLessThanOrEqual(TEMPLATE_LIMITS.short);
        expect(text.title.startsWith(`${DEMO_BRANDS[v.demo].appName} · `)).toBe(true);
        expect(`${text.title} ${text.short} ${text.description}`).not.toMatch(/\{|\}/);
      }
      // The website's Arabic (Modern Standard Arabic), never the dashboard's Egyptian.
      expect(`${v.texts.ar!.title} ${v.texts.ar!.short} ${v.texts.ar!.description}`).not.toMatch(egyptian);
      expect(v.texts.ar!.description).toMatch(/[؀-ۿ]/u);
    }
  });

  it("fits the kinds a new project of which starts from the look", () => {
    for (const { demo, look } of houseLooks()) {
      const kinds = houseKinds(demo, look);
      expect(kinds).toContain(demoKind(demo).id);
      expect(kinds.length).toBeLessThanOrEqual(3);
      const engine = kindsForEngine(demoKind(demo).engine).map((k) => k.id);
      expect(kinds.every((k) => engine.includes(k))).toBe(true);
    }
  });
});

describe("190 seeded on read, by Yallapp, free", () => {
  it("lists nothing before the team made the demo apps, and makes no account for it", async () => {
    const clients = (await store.listClients({ filter: "all", now: NOW })).length;
    expect(await house()).toBe(0);
    expect((await marketCatalog(store, "en", NOW, blobs)).cards).toEqual([]);
    expect(await store.listTemplateDesigners()).toEqual([]);
    expect((await store.listClients({ filter: "all", now: NOW })).length).toBe(clients);
  });

  it("lists every look as a published, free template by Yallapp, on the demo account, with its cover, languages and kinds", async () => {
    const demo = await demoAccount();
    const clients = (await store.listClients({ filter: "all", now: NOW })).length;
    expect(await house()).toBe(houseLooks().length);
    // No new account: Yallapp's designer profile is on the demo account.
    expect((await store.listClients({ filter: "all", now: NOW })).length).toBe(clients);
    const designer = (await store.getTemplateDesigner(HOUSE_DESIGNER_ID))!;
    expect(designer).toMatchObject({ clientId: demo, name: "Yallapp", slug: "yallapp", status: "active", bio: null });
    const templates = await store.listMarketTemplates({ ids: houseIds() });
    expect(templates).toHaveLength(houseLooks().length);
    for (const t of templates) {
      const v = houseVersions().find((x) => x.templateId === t.id)!;
      expect(t).toMatchObject({ designerId: HOUSE_DESIGNER_ID, clientId: demo, sourceAppId: null, status: "published", free: true, plans: [], kinds: v.kinds, texts: v.texts, slug: v.slug, currentVersionId: v.versionId, reviewVersionId: null, submittedAt: null, publishedAt: null });
      const version = (await store.getMarketTemplateVersion(t.currentVersionId!))!;
      expect(version).toMatchObject({ templateId: t.id, number: 1, languages: ["en", "ar", "tr"], pages: v.file.pages.length });
      // Its cover: the home page and the look around it.
      expect(version.cover).toMatchObject({ lang: "en", brand: v.file.look!.primary_color, tabs: v.file.look!.tabs });
      expect(JSON.stringify(version.cover!.page)).toBe(JSON.stringify(v.file.pages[0]!.studio));
      // The design applying uses, and its look, kept like any version's.
      expect(JSON.stringify(await versionDesign(blobs, version))).toBe(JSON.stringify(v.file));
      expect(await readTemplateLook(blobs, version)).toEqual(v.appearance);
    }

    const catalog = await marketCatalog(store, "ar", NOW, blobs);
    expect(catalog.cards).toHaveLength(houseLooks().length);
    expect(catalog.designers).toEqual([expect.objectContaining({ id: HOUSE_DESIGNER_ID, name: "Yallapp", templates: houseLooks().length })]);
    const card = catalog.cards.find((c) => c.id === houseTemplateId("food", "a"))!;
    expect(card).toMatchObject({ title: `Sofra Eats · قائمة بأسلوب المجلات`, free: true, price: { kind: "free" }, designer: { name: "Yallapp" }, kinds: [expect.objectContaining({ id: "food" })] });
    expect(card.cover).toMatchObject({ lang: "ar", defaultLang: "en" });
  });

  it("is found by the market's own filters: Free, the kinds, a search; never under Paid", async () => {
    await demoAccount();
    const cards = (await marketCatalog(store, "en", NOW, blobs)).cards;
    const shown = (params: Record<string, string>) => filterCards(cards, readMarketQuery(params)).map((c) => c.id);
    expect(shown({ price: "free" }).sort()).toEqual(houseIds().sort());
    expect(shown({ price: "paid" })).toEqual([]);
    expect(shown({ kind: "taxi" }).sort()).toEqual([houseTemplateId("taxi", "a"), houseTemplateId("taxi", "b")].sort());
    expect(shown({ kind: "store" })).toEqual(expect.arrayContaining([houseTemplateId("flowers", "a"), houseTemplateId("flowers", "b")]));
    expect(shown({ q: "yallapp" })).toHaveLength(houseIds().length);
    expect(shown({ q: "Leqaa" }).sort()).toEqual([houseTemplateId("flowers", "a"), houseTemplateId("flowers", "b")].sort());
    // Free: no plan to buy.
    for (const t of await store.listMarketTemplates({ ids: houseIds() })) expect(offeredPlans(t)).toEqual([]);
  });

  it("is idempotent: read again, nothing is made twice or changed", async () => {
    await demoAccount();
    await house();
    const before = await store.listMarketTemplates({ ids: houseIds() });
    const versions = await store.listMarketTemplateVersions(before.map((t) => t.currentVersionId!));
    expect(await house(LATER)).toBe(0);
    await marketCatalog(store, "tr", LATER, blobs);
    expect(await store.listMarketTemplates({ ids: houseIds() })).toEqual(before);
    expect(await store.listMarketTemplateVersions(versions.map((v) => v.id))).toEqual(versions);
    expect(await store.listTemplateDesigners()).toHaveLength(1);
    for (const t of before) expect(await store.lastMarketTemplateVersion(t.id)).toBe(1);
    // Two reads at once: still one of each.
    const fresh = new MemoryStore();
    store = fresh;
    await demoAccount();
    await Promise.all([house(), house(), marketCatalog(store, "en", NOW, blobs)]);
    expect(await store.listMarketTemplates({ ids: houseIds() })).toHaveLength(houseIds().length);
    expect((await store.listMarketTemplates({ statuses: ["published"] })).length).toBe(houseIds().length);
  });

  it("puts back what the code says: its texts, kinds, price and status; a demo changed in code is a new version buyers get", async () => {
    await demoAccount();
    await house();
    const id = houseTemplateId("rides", "b");
    const code = houseVersions().find((v) => v.templateId === id)!;
    // An older version of the demo, as the code made it before.
    const older = { ...(await store.getMarketTemplateVersion(code.versionId))!, id: "1b8a3c9e-0000-4000-8000-000000000001", number: 1 };
    store["marketVersions"].delete(code.versionId);
    await store.createMarketTemplateVersion(older);
    await store.updateMarketTemplate(id, { currentVersionId: older.id }, NOW);
    // A buyer who took it then.
    const buyer = await account("Buyer");
    const app = await makeStudioProject(store, { clientId: buyer, name: "City Rides", kind: demoKind("rides"), source: "catalog", template: BLANK, words: appWords("en", "City Rides"), lang: "en", languages: LANGS }, NOW);
    const applied = await applyTemplate(deps(), { clientId: buyer, apps: [app], appId: app.id, template: (await store.getMarketTemplate(id))!, by: "buyer@house.test", plan: null });
    expect(applied).toMatchObject({ ok: true, licence: { plan: "free", versionId: older.id } });
    // And changed by hand meanwhile.
    await store.updateMarketTemplate(id, { texts: { en: { title: "Changed", short: "x", description: "y" } }, free: false, plans: [{ period: "1m", cents: 900 }], kinds: ["food"], tags: [], status: "draft" }, NOW);

    expect(await house(LATER)).toBe(1);
    const template = (await store.getMarketTemplate(id))!;
    expect(template).toMatchObject({ status: "published", free: true, plans: [], kinds: code.kinds, texts: code.texts, currentVersionId: code.versionId });
    expect((await store.getMarketTemplateVersion(code.versionId))!.number).toBe(2);
    // The buyer gets it from My templates as an update, free.
    const [row] = await buyerLicences(store, buyer, [app], "en", LATER);
    expect(row).toMatchObject({ update: true, state: "active", renewable: false });
    expect(await updateToLatest(deps(LATER), { clientId: buyer, apps: [app], applicationId: row!.application!.id, template, by: "buyer@house.test", plan: null })).toMatchObject({ ok: true });
    expect((await store.getTemplateLicence(row!.licence.id))!.versionId).toBe(code.versionId);
  });

  it("never touches a designer's templates, nor takes a designer's address", async () => {
    // A designer with the address "yallapp" (106.14: kept for Yallapp now, so made before the list) and a template at one of the looks' addresses.
    const other = await account("Other");
    expect(await joinAsDesigner(store, { id: other }, { name: "Yall App Studio", slug: "yallapp", country: "TR", bio: "", terms: true }, NOW)).toMatchObject({ ok: false, errors: { slug: DESIGNER_MESSAGES.slugReserved } });
    const madeBefore = await store.createTemplateDesigner({ id: "6c1d2e3f-0000-4000-8000-0000000000d1", clientId: other, name: "Yall App Studio", slug: "yallapp", country: "TR", bio: null, status: "active", termsAcceptedAt: NOW, createdAt: NOW, updatedAt: NOW, ...designerPageDefaults() });
    const joined = { ok: true as const, designer: madeBefore! };
    const taken = houseVersions().find((v) => v.demo === "taxi" && v.look === "a")!.slug;
    const theirs: MarketTemplate = {
      id: "6c1d2e3f-0000-4000-8000-000000000002", designerId: joined.designer.id, clientId: other, sourceAppId: null, slug: taken, status: "published", texts: { en: { title: "Their taxi", short: "Theirs.", description: "Theirs." } },
      kinds: ["taxi"], tags: [], free: false, plans: [{ period: "1m", cents: 800 }], afterEnd: "keep", screens: [], rightsConfirmedAt: NOW, noteToTeam: null, currentVersionId: null, reviewVersionId: null, submittedAt: NOW, publishedAt: NOW, views: 3, createdAt: NOW, updatedAt: NOW,
    };
    await store.createMarketTemplate(theirs);
    await demoAccount();
    await house();
    expect(await store.getMarketTemplate(theirs.id)).toEqual(theirs);
    expect(await store.getTemplateDesigner(joined.designer.id)).toEqual(joined.designer);
    expect((await store.getTemplateDesigner(HOUSE_DESIGNER_ID))!.slug).toBe(HOUSE_DESIGNER.slugs[1]);
    expect((await store.getMarketTemplate(houseTemplateId("taxi", "a")))!.slug).toBe(`${taken}-yallapp`);
    expect((await sellerTemplates(store, joined.designer, "en")).map((r) => r.template.id)).toEqual([theirs.id]);
  });

  it("is on the website (/templates, a template's page, the sitemap) and off it when the team suspends the designer", async () => {
    await demoAccount();
    const slugs = (await publicTemplateSlugs(store)).map((s) => s.slug);
    expect(slugs.sort()).toEqual(houseVersions().map((v) => v.slug).sort());
    const leqaa = houseVersions().find((v) => v.demo === "flowers" && v.look === "b")!;
    expect(await publicTemplate(store, leqaa.slug)).toMatchObject({ template: { id: leqaa.templateId }, designer: { name: "Yallapp" }, version: { id: leqaa.versionId } });
    await store.updateTemplateDesigner(HOUSE_DESIGNER_ID, { status: "suspended" }, NOW);
    expect(await publicTemplate(store, leqaa.slug)).toBeNull();
    expect((await marketCatalog(store, "en", NOW, blobs)).cards).toEqual([]);
    // Read again, the team's choice stays.
    expect((await store.getTemplateDesigner(HOUSE_DESIGNER_ID))!.status).toBe("suspended");
  });

  it("never counts towards money, payouts or the review queue", async () => {
    await demoAccount();
    await house();
    expect(await reviewQueue(store)).toEqual([]);
    const buyer = await account("Buyer");
    const app = await makeStudioProject(store, { clientId: buyer, name: "Ali Taxi", kind: demoKind("taxi"), source: "catalog", template: BLANK, words: appWords("en", "Ali Taxi"), lang: "en", languages: LANGS }, NOW);
    const template = (await store.getMarketTemplate(houseTemplateId("taxi", "b")))!;
    expect(await applyTemplate(deps(), { clientId: buyer, apps: [app], appId: app.id, template, by: "b@house.test", plan: null })).toMatchObject({ ok: true, licence: { plan: "free", endsAt: null } });
    expect(await store.listTemplateOrders({ designerId: HOUSE_DESIGNER_ID })).toEqual([]);
    expect(await store.listDesignerLedger({ designerId: HOUSE_DESIGNER_ID })).toEqual([]);
    expect((await marketCatalog(store, "en", NOW, blobs)).cards.find((c) => c.id === template.id)).toMatchObject({ applies: 1, recent: 1 });
  });
});

// ——— Applying it: what a new project from the demo starts with ———

/** A page's Studio content without its elements' ids, its links to pages by the page's title and screen. */
function comparable(layout: LayoutContent): { pages: Map<string, unknown>; tabs: unknown[] } {
  const key = (p: LayoutPage) => `${p.title}|${p.studio?.screen ?? ""}`;
  const named = new Map(layout.pages.map((p) => [p.slug, key(p)]));
  const strip = (node: StudioNode): unknown => {
    const { id: _id, children, card, action, ...rest } = node;
    void _id;
    const link = action?.type === "page" && action.page_slug ? { ...action, page_slug: named.get(action.page_slug) ?? action.page_slug } : action;
    return { ...rest, ...(link ? { action: link } : {}), ...(children ? { children: children.map(strip) } : {}), ...(card ? { card: strip(card) } : {}) };
  };
  const page = (s: StudioPage): unknown => ({ ...s, body: strip(s.body) });
  return {
    pages: new Map(layout.pages.filter((p) => p.studio).map((p) => [key(p), { title: p.title, translations: p.translations ?? null, studio: page(p.studio!) }])),
    tabs: layout.tabs.map((t: LayoutTab) => ({ ...t, target: t.target.type === "page" && t.target.page_slug ? { ...t.target, page_slug: named.get(t.target.page_slug) } : t.target })),
  };
}

const LOOK_KEYS = ["template", "font", "font_family", "arabic_font", "secondary_color", "corners", "cards", "dark_background", "dark_surface"] as const;
const lookOf = (layout: LayoutContent) => Object.fromEntries(LOOK_KEYS.map((k) => [k, layout.appearance[k] ?? null]));

describe("190 applied, a buyer's project starts as a new project from the demo does", () => {
  it.each(houseLooks().map((l) => [`${l.demo} ${l.look}`, l] as const))("%s: its pages, tabs, bar, colours, fonts and screens' looks", async (_, { demo, look }) => {
    await demoAccount();
    await house();
    const buyer = await account("Buyer");
    const name = "Green Valley";
    const kind = demoKind(demo);
    // What /start makes from the demo's look (lib/demo/start.ts), named as the buyer's app.
    const started = await makeStudioProject(store, { clientId: buyer, name, kind, source: "catalog", template: studioDemoTemplate(demo, look), words: appWords("en", name), lang: "en", languages: LANGS, fromDemo: demo }, NOW);
    // The buyer's own project of the kind, from a blank page, with the template applied.
    const own = await makeStudioProject(store, { clientId: buyer, name, kind, source: "catalog", template: BLANK, words: appWords("en", name), lang: "en", languages: LANGS }, NOW);
    const template = (await store.getMarketTemplate(houseTemplateId(demo, look)))!;
    expect(templateFits(template, own)).toBe(true);
    const done = await applyTemplate(deps(), { clientId: buyer, apps: [started, own], appId: own.id, template, by: "buyer@house.test", plan: null });
    expect(done, done.ok ? "" : `${done.message} ${(done.errors ?? []).join(" ")}`).toMatchObject({ ok: true, licence: { plan: "free" } });

    const want = (await loadLayout(store, (await store.getAppById(started.id))!, NOW)).draft;
    const got = (await loadLayout(store, (await store.getAppById(own.id))!, NOW)).draft;
    const a = comparable(want);
    const b = comparable(got);
    // Every page the new project has, the same (the buyer's own other pages stay theirs).
    for (const [key, page] of a.pages) expect(b.pages.get(key), `${demo} ${look}: ${key}`).toEqual(page);
    expect(b.tabs).toEqual(a.tabs);
    expect(got.tab_bar).toEqual(want.tab_bar);
    expect(got.languages).toEqual(want.languages);
    expect(lookOf(got)).toEqual(lookOf(want));
    const after = (await store.getAppById(own.id))!;
    const reference = (await store.getAppById(started.id))!;
    expect(after.primaryColor).toBe(reference.primaryColor);
    // The screens' looks as the app reads them (the checker keeps a menu's accent only for the night header, which alone shows it).
    expect(after.hostedSettings?.studioScreens).toEqual(parseStudioScreens(reference.hostedSettings?.studioScreens).screens);
    // Its texts name the buyer's app where the demo writes the app's name.
    if (houseVersions().find((v) => v.templateId === template.id)!.text.includes(`Welcome to ${DEMO_BRANDS[demo].appName}`)) expect(JSON.stringify(got.pages)).toContain(`Welcome to ${name}`);

    // And back to the design it had before.
    expect(await restorePrevious(deps(), { clientId: buyer, apps: [started, own], applicationId: done.ok ? done.application.id : "", by: "buyer@house.test", plan: null })).toEqual({ ok: true });
  }, 60_000);

  it("uses the version as kept when the code makes another one now", async () => {
    const v = houseVersions()[0]!;
    expect(houseFileFor({ id: v.versionId, templateId: v.templateId }, "Other name")).not.toBeNull();
    expect(houseFileFor({ id: "an-older-version", templateId: v.templateId }, "Other name")).toBeNull();
    expect(houseFileFor({ id: v.versionId, templateId: "not-ours" }, null)).toBeNull();
  });
});
