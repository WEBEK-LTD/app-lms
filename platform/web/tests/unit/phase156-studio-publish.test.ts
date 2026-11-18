import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { activateLicense, parseSiteInfo } from "@/lib/license/service";
import { PAGE_TEXT_FORMS } from "@/lib/i18n/builtin";
import { inMainLanguage } from "@/lib/pages/builtin";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { loadLayout, publishLayout, saveDraft, withoutStrings } from "@/lib/pages/layout";
import { pluginLayout } from "@/lib/pages/plugin";
import { itemSourcesFor } from "@/lib/pages/sources";
import { editedTranslations, servedText, translationState, withOwnTranslation, withoutStaleTranslations } from "@/lib/pages/template-translations";
import { OWN_TRANSLATIONS, type LayoutContent, type StudioNode, type StudioPage } from "@/lib/pages/types";
import { PLAN_INFO } from "@/lib/plans";
import { appWords } from "@/lib/studio/app-words";
import { makeStudioProject } from "@/lib/studio/new-project";
import { TEMPLATES } from "@/lib/studio/sections";
import { startLayout } from "@/lib/studio/start";
import { allNodes } from "@/lib/studio/tree";
import { demoLayout } from "@/lib/demo/setup";
import { demoKind, FLOWER_SHOP_DEMO, FLOWER_SHOP_TEMPLATE, PREMIUM_ACADEMY_DEMO, PREMIUM_ACADEMY_TEMPLATE, STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { setupClient } from "./helpers";

/**
 * 156 What the owner publishes in Studio is what the app shows, in every
 * language. A template writes its texts in the project's language with
 * Studio's other languages as translations; once the owner changed a text
 * (Kech Flora's review by Jakeer, "What our customers say"), those
 * translations were the template's words for the old text, and an Arabic
 * or Turkish phone showed them ("[رأي أحد العملاء فيك]", "كلمات طيبة").
 * The path itself (the editor's publish, the published layout, hosted
 * `GET /pages`, its ETag) carries every edit, in the main language too.
 */

const BLOBS = mkdtempSync(join(tmpdir(), "phase156-"));
process.env.YALLAPP_BLOBS_DIR = BLOBS;
afterAll(() => rmSync(BLOBS, { recursive: true, force: true }));

const NOW = new Date("2026-11-18T10:00:00Z");
const LATER = new Date("2026-11-18T10:05:00Z");
const LEQAA_A = TEMPLATES.find((t) => t.id === "flowers_signature_a")!;
const MOBILE = join(__dirname, "..", "..", "..", "..", "mobile", "test", "support");

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

/** A Studio store from Leqaa's look A, its content kept in Yallapp, as /studio/new makes it with the dashboard in `lang`. */
async function kechFlora(lang: "en" | "ar"): Promise<App> {
  const { client } = await registerClient(store, { name: "Kech Flora", email: `kech-${lang}@flora.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  const languages = lang === "ar" ? { default: "ar", available: ["ar", "en", "tr"] } : { default: "en", available: ["en", "ar", "tr"] };
  const made = await makeStudioProject(store, { clientId: client.id, name: "Kech Flora", kind: kindById("store")!, source: "catalog", template: LEQAA_A, words: appWords(lang, "Kech Flora"), lang, languages }, NOW);
  return (await store.getAppById(made.id))!;
}

/** The draft as Studio's editor gets it (app/studio/editor/page.tsx), to change as the editor does. */
async function editorDraft(app: App): Promise<LayoutContent> {
  return JSON.parse(JSON.stringify(withoutStrings((await loadLayout(store, app, NOW)).draft))) as LayoutContent;
}

function contextOf(app: App): HostedContext {
  const assetUrl = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
  return { store, app, active: true, now: LATER, plan: PLAN_INFO.studio_1, ip: "203.0.113.9", secret: "s", sender: new LogSender(), push: false, assetUrl, platformUrl: "https://yallapp.test", connector: new CatalogConnector({ store, app, assetUrl, platformUrl: "https://yallapp.test" }) };
}

/** What the app asks (`GET /pages`, `GET /pages/{slug}`): its platform and type, its language, its ETag. */
async function get(app: App, path: string, lang: string, etag?: string): Promise<HostedResult> {
  return handleHosted(contextOf(app), {
    method: "GET",
    path: path.split("/").filter(Boolean),
    query: new URLSearchParams({ platform: "android", app_type: "store" }),
    body: undefined,
    token: null,
    headers: new Headers({ "accept-language": lang, ...(etag ? { "if-none-match": etag } : {}) }),
  });
}

async function servedHome(app: App, lang: string): Promise<StudioNode[]> {
  const page = await get(app, "/pages/home", lang);
  expect(page.status).toBe(200);
  return allNodes((page.body as { studio: StudioPage }).studio);
}

/** The edits of the owner's report: the wordmark wide, in green, renamed; the "Kind words" heading and a review in their own words. */
function edit(draft: LayoutContent): { word: string; heading: string; quotes: string } {
  const home = draft.pages.find((p) => p.slug === "home")!.studio!;
  const nodes = allNodes(home);
  const top = nodes.find((n) => n.type === "row" && n.self_align === "start" && n.children?.length === 3 && n.children[1]!.type === "text")!;
  const word = top.children![1]!;
  word.width = "fill";
  word.color = "#00A86B";
  const heading = nodes.find((n) => n.type === "text" && n.text === (draft.languages.default === "ar" ? "كلمات طيبة" : "Kind words"))!;
  const quotes = nodes.find((n) => n.type === "testimonials")!;
  return { word: word.id, heading: heading.id, quotes: quotes.id };
}

describe("156 an edit in Studio reaches the app, in every language", () => {
  it("in the main language: the wordmark, the heading and a review, after Publish, as the app asks for them", async () => {
    const app = await kechFlora("en");
    const draft = await editorDraft(app);
    const ids = edit(draft);
    const nodes = allNodes(draft.pages.find((p) => p.slug === "home")!.studio!);
    nodes.find((n) => n.id === ids.word)!.text = "Kech Flora";
    nodes.find((n) => n.id === ids.heading)!.text = "What our customers say";
    const quotes = nodes.find((n) => n.id === ids.quotes)!;
    quotes.entries![0] = { ...quotes.entries![0]!, text: "The fact that every question was answered to.", title: "Jakeer" };
    // Before: the template's translations of the old texts.
    expect(translationState(nodes.find((n) => n.id === ids.heading)!, "text", "ar")).toBe("stale");
    expect(translationState(quotes.entries![0]!, "text", "ar")).toBe("stale");
    expect(translationState(quotes.entries![1]!, "text", "ar")).toBe("template");
    // Studio's Publish (publishLayoutAction): the editor's whole draft.
    const published = await publishLayout(store, app, JSON.parse(JSON.stringify(draft)), "owner@kech.test", LATER, PLAN_INFO.studio_1);
    expect(published.ok ? [] : published.errors).toEqual([]);
    for (const lang of ["en", "ar", "tr"]) {
      const served = await servedHome(app, lang);
      expect(served.find((n) => n.id === ids.word), lang).toMatchObject({ width: "fill", color: "#00A86B", text: "Kech Flora" });
      expect(served.find((n) => n.id === ids.heading)!.text, lang).toBe("What our customers say");
      const entries = served.find((n) => n.id === ids.quotes)!.entries!;
      expect(entries[0], lang).toMatchObject({ text: "The fact that every question was answered to.", title: "Jakeer" });
      // The review the owner hasn't written yet (the template's "[Another customer's words]") waits for them; theirs has no "[What they sent]".
      expect(entries, lang).toHaveLength(1);
      expect(entries[0], lang).not.toHaveProperty("subtitle");
      expect(JSON.stringify(served), lang).not.toMatch(/\[(Another customer's words|كلمات عميل آخر|Başka bir müşterinin sözleri|What they sent|ما أرسله|Ne gönderdi)\]/);
    }
    // The saved draft holds no translation that would say something else.
    const saved = (await loadLayout(store, app, LATER)).draft;
    const heading = allNodes(saved.pages.find((p) => p.slug === "home")!.studio!).find((n) => n.id === ids.heading)!;
    expect(heading.translations).toBeUndefined();
  });

  it("in an Arabic-first project: the Arabic text everywhere, and a review written in English instead of the Arabic placeholders", async () => {
    const app = await kechFlora("ar");
    const draft = await editorDraft(app);
    expect(draft.languages.default).toBe("ar");
    const ids = edit(draft);
    const nodes = allNodes(draft.pages.find((p) => p.slug === "home")!.studio!);
    nodes.find((n) => n.id === ids.heading)!.text = "آراء عملائنا";
    // The review written with Studio's language switch on English: a translation of the Arabic placeholders.
    const quotes = nodes.find((n) => n.id === ids.quotes)!;
    const first = quotes.entries![0]!;
    quotes.entries![0] = { ...first, translations: withOwnTranslation(withOwnTranslation(first.translations, "en", "text", "Every question was answered."), "en", "title", "Jakeer") };
    expect((await publishLayout(store, app, JSON.parse(JSON.stringify(draft)), "owner@kech.test", LATER, PLAN_INFO.studio_1)).ok).toBe(true);
    for (const lang of ["ar", "en", "tr"]) {
      const served = await servedHome(app, lang);
      expect(served.find((n) => n.id === ids.heading)!.text, lang).toBe("آراء عملائنا");
      expect(served.find((n) => n.id === ids.quotes)!.entries![0], lang).toMatchObject({ text: "Every question was answered.", title: "Jakeer" });
    }
  });

  it("keeps the owner's own translations: their words, and one of the template's words they wrote by hand", async () => {
    const app = await kechFlora("en");
    const before = await editorDraft(app);
    const ids = edit(before);
    // One change in the editor: the heading renamed, its Arabic written by hand as the template's own "كلمات طيبة", its Turkish in their words.
    const after: LayoutContent = JSON.parse(JSON.stringify(before));
    const heading = allNodes(after.pages.find((p) => p.slug === "home")!.studio!).find((n) => n.id === ids.heading)!;
    heading.text = "Reviews";
    heading.translations = { ...heading.translations, ar: { text: "كلمات طيبة" }, tr: { text: "Yorumlar" } };
    // Typed after the rename: Studio's editor marks it as theirs.
    const renamed: LayoutContent = JSON.parse(JSON.stringify(before));
    allNodes(renamed.pages.find((p) => p.slug === "home")!.studio!).find((n) => n.id === ids.heading)!.text = "Reviews";
    const cleaned = editedTranslations(before, renamed);
    expect(allNodes(cleaned.pages.find((p) => p.slug === "home")!.studio!).find((n) => n.id === ids.heading)!.translations).toBeUndefined();
    const typed = editedTranslations(cleaned, after);
    const marked = allNodes(typed.pages.find((p) => p.slug === "home")!.studio!).find((n) => n.id === ids.heading)!;
    expect(marked.translations).toEqual({ ar: { text: "كلمات طيبة" }, tr: { text: "Yorumlar" }, [OWN_TRANSLATIONS]: { ar: "text" } });
    expect(translationState(marked, "text", "ar")).toBe("own");
    expect(translationState(marked, "text", "tr")).toBe("own");
    expect((await publishLayout(store, app, JSON.parse(JSON.stringify(typed)), "owner@kech.test", LATER, PLAN_INFO.studio_1)).ok).toBe(true);
    expect((await servedHome(app, "ar")).find((n) => n.id === ids.heading)!.text).toBe("كلمات طيبة");
    expect((await servedHome(app, "tr")).find((n) => n.id === ids.heading)!.text).toBe("Yorumlar");
    expect((await servedHome(app, "en")).find((n) => n.id === ids.heading)!.text).toBe("Reviews");
    // The marks stay on the platform: the app gets texts only.
    expect(JSON.stringify((await get(app, "/pages/home", "ar")).body)).not.toContain(OWN_TRANSLATIONS);
  });

  it("a layout published before the fix is served fresh, with a new ETag, so the app doesn't keep the old pages", async () => {
    const app = await kechFlora("en");
    const draft = await editorDraft(app);
    const ids = edit(draft);
    expect((await publishLayout(store, app, draft, "owner@kech.test", NOW, PLAN_INFO.studio_1)).ok).toBe(true);
    // As Leqaa and Kech Flora have it saved: the heading renamed, the template's Arabic and Turkish still on it.
    const record = (await store.getAppLayout(app.id))!;
    const stale = JSON.parse(JSON.stringify(record.published)) as NonNullable<typeof record.published>;
    allNodes(stale.pages.find((p) => p.slug === "home")!.studio!).find((n) => n.id === ids.heading)!.text = "What our customers say";
    await store.saveAppLayout({ ...record, published: stale });
    const nav = await get(app, "/pages", "ar");
    expect(nav.status).toBe(200);
    const version = (nav.body as { version: string }).version;
    expect(version).not.toBe(`${stale.version}.ar`);
    expect(version).toContain("~f");
    // The app's ETag of the pages it had: the new ones come.
    expect((await get(app, "/pages", "ar", `"${stale.version}.ar"`)).status).toBe(200);
    expect((await get(app, "/pages", "ar", `"${version}"`)).status).toBe(304);
    expect((await servedHome(app, "ar")).find((n) => n.id === ids.heading)!.text).toBe("What our customers say");
  });

  it("each Publish has its own ETag: the app's copy of the pages is never kept past a publish", async () => {
    const app = await kechFlora("en");
    const draft = await editorDraft(app);
    const ids = edit(draft);
    expect((await publishLayout(store, app, draft, "owner@kech.test", NOW, PLAN_INFO.studio_1)).ok).toBe(true);
    const first = (await get(app, "/pages", "en")).headers!.etag!;
    allNodes(draft.pages.find((p) => p.slug === "home")!.studio!).find((n) => n.id === ids.word)!.text = "Kech";
    expect((await publishLayout(store, app, draft, "owner@kech.test", LATER, PLAN_INFO.studio_1)).ok).toBe(true);
    const second = await get(app, "/pages", "en", first);
    expect(second.status).toBe(200);
    expect(second.headers!.etag).not.toBe(first);
    expect((await get(app, "/pages", "en", second.headers!.etag)).status).toBe(304);
    expect((await servedHome(app, "en")).find((n) => n.id === ids.word)!.text).toBe("Kech");
  });

  it("Studio › Screens: a welcome the owner changed in the main language shows in every language; what they didn't change keeps its words", async () => {
    const app = await kechFlora("en");
    const screens = app.hostedSettings!.studioScreens!;
    const title = screens.sign_in!.title;
    const subtitle = screens.sign_in!.subtitle;
    expect(Object.keys(title).sort()).toEqual(["ar", "en", "tr"]);
    await store.updateApp(app.id, { hostedSettings: { ...app.hostedSettings!, studioScreens: { ...screens, sign_in: { ...screens.sign_in!, title: { ...title, en: "Welcome to Kech Flora" } } } } }, LATER);
    const changed = (await store.getAppById(app.id))!;
    for (const lang of ["en", "ar", "tr"]) {
      const config = (await handleHosted(contextOf(changed), { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "android", app_version: "1.0.0" }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) })).body as { screens: { sign_in: { title: Record<string, string>; subtitle: Record<string, string> } } };
      expect(config.screens.sign_in.title, lang).toEqual({ en: "Welcome to Kech Flora" });
      expect(config.screens.sign_in.subtitle, lang).toEqual(subtitle);
    }
  });

  it("the WordPress plugin gets the layout without the template's translations of texts the owner changed", async () => {
    const { store: s, client, licenseKey } = await setupClient({ plan: "studio_1", activeUntil: new Date("2027-01-01T00:00:00Z") });
    store = s;
    const parsed = parseSiteInfo({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.4.50" });
    if (!parsed.ok) throw new Error("bad site");
    await activateLicense(store, parsed.value, NOW);
    // The app the site's license names (a store on WooCommerce), with Leqaa's Studio pages.
    const app: App = { ...newApp(client.id, "https://academy.test", NOW, "store"), appName: "Kech Flora" };
    await store.createApp(app);
    const ctx = { brand: app.primaryColor, source: itemSourcesFor(app)[0] ?? null, app: "Kech Flora", lang: "en" as const, w: appWords("en", "Kech Flora"), picture: (f: string) => `${appUrl()}/design-pictures/${f}` };
    const layout = startLayout(app, LEQAA_A, defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), NOW, ctx);
    const languages = { default: "en", available: ["en", "ar", "tr"] };
    const ids = edit({ ...layout, languages });
    allNodes(layout.pages.find((p) => p.slug === "home")!.studio!).find((n) => n.id === ids.heading)!.text = "What our customers say";
    const published = await publishLayout(store, app, { ...layout, languages }, "owner@kech.test", NOW, PLAN_INFO.studio_1);
    expect(published.ok ? [] : published.errors).toEqual([]);
    const result = await pluginLayout(store, parsed.value, null, NOW);
    if (result.status !== 200) throw new Error(`status ${result.status}`);
    const heading = allNodes(result.body.pages.find((p) => p.slug === "home")!.studio!).find((n) => n.id === ids.heading)!;
    expect(heading.text).toBe("What our customers say");
    expect(heading.translations).toBeUndefined();
  });
});

describe("156 the app's own test of the path (mobile/test/support/studio_publish.json)", () => {
  it("is Leqaa's home and shop as hosted GET /pages serves them after the owner's edits, in English and Arabic, and after a second publish", async () => {
    const kind = demoKind(FLOWER_SHOP_DEMO);
    const { client } = await registerClient(store, { name: "Leqaa", email: "owner@leqaa.test", whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, kind.engine, kind.vertical), id: "00000000-0000-4000-8000-000000000156", section: "studio", backend: "hosted", connector: { kind: "catalog" }, appName: "Leqaa", primaryColor: DEMO_BRANDS.flowers.primaryColor, brandingDoneAt: NOW, websiteDoneAt: NOW, design: FLOWER_SHOP_TEMPLATE };
    await store.createApp(app);
    const draft: LayoutContent = JSON.parse(JSON.stringify(await demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, app, "banner-asset")));
    const ids = edit(draft);
    const nodes = allNodes(draft.pages.find((p) => p.slug === "home")!.studio!);
    nodes.find((n) => n.id === ids.heading)!.text = "What our customers say";
    const quotes = nodes.find((n) => n.id === ids.quotes)!;
    quotes.entries![0] = { ...quotes.entries![0]!, text: "The fact that every question was answered to.", title: "Jakeer" };
    expect((await publishLayout(store, app, JSON.parse(JSON.stringify(draft)), "owner@leqaa.test", NOW, PLAN_INFO.studio_1)).ok).toBe(true);
    const served = async (lang: string) => {
      const navigation = await get(app, "/pages", lang);
      const pages: Record<string, unknown> = {};
      for (const slug of ["home", "shop"]) pages[slug] = (await get(app, `/pages/${slug}`, lang)).body;
      return { etag: navigation.headers!.etag, navigation: navigation.body, pages };
    };
    const config = (await handleHosted(contextOf(app), { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "android", app_version: "1.0.0" }), body: undefined, token: null, headers: new Headers({ "accept-language": "en" }) })).body;
    const first = { en: await served("en"), ar: await served("ar") };
    // A second publish: the heading again.
    nodes.find((n) => n.id === ids.heading)!.text = "Our customers' words";
    expect((await publishLayout(store, app, JSON.parse(JSON.stringify(draft)), "owner@leqaa.test", LATER, PLAN_INFO.studio_1)).ok).toBe(true);
    const second = { en: await served("en") };
    expect(second.en.etag).not.toBe(first.en.etag);
    const data = `${JSON.stringify({ ids, config, first, second }, null, 1)}\n`;
    const file = join(MOBILE, "studio_publish.json");
    if (process.env.YALLAPP_WRITE_STUDIO_PUBLISH) writeFileSync(file, data);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf8")).toBe(data);
  });
});

describe("156 what Yallapp writes is left as it is", () => {
  const app = (engine: App["appType"], vertical: App["vertical"] = null): App => ({ ...newApp("c", null, NOW, engine, vertical), section: "studio", backend: "hosted", appName: "Kech Flora" });

  it("every Studio template, in each of Studio's languages: no translation it writes is stale", () => {
    const problems: string[] = [];
    for (const template of TEMPLATES) {
      const kind = template.fits?.types?.[0] ?? (template.demo ? demoKind(template.demo).engine : "store");
      const vertical = template.fits?.verticals?.[0] ?? (template.demo ? demoKind(template.demo).vertical : null);
      const project = app(kind, vertical);
      for (const lang of ["en", "ar", "tr"] as const) {
        const languages = { default: lang, available: [lang, ...(["en", "ar", "tr"] as const).filter((l) => l !== lang)] };
        const ready = inMainLanguage({ ...defaultLayout(project, BUILT_IN_APP_DEFAULTS, NOW), languages });
        const ctx = { brand: project.primaryColor, source: itemSourcesFor(project)[0] ?? null, app: "Kech Flora", lang, w: appWords(lang, "Kech Flora"), picture: (f: string) => `${appUrl()}/design-pictures/${f}` };
        const layout = startLayout(project, template, ready, NOW, ctx);
        const fresh = withoutStaleTranslations(layout, { appName: "Kech Flora", more: PAGE_TEXT_FORMS });
        if (fresh !== layout) problems.push(`${template.id} (${lang}): ${diff(layout, fresh).slice(0, 3).join("; ")}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("every Studio demo app: nothing in it is stale", async () => {
    for (const id of STUDIO_DEMO_TYPES) {
      const kind = demoKind(id);
      const design = id === PREMIUM_ACADEMY_DEMO ? { design: PREMIUM_ACADEMY_TEMPLATE } : id === FLOWER_SHOP_DEMO ? { design: FLOWER_SHOP_TEMPLATE } : {};
      const demo: App = { ...newApp("demo-client", null, NOW, kind.engine, kind.vertical), demo: true, section: "studio", backend: "hosted", appName: DEMO_BRANDS[id].appName, brandingDoneAt: NOW, ...design };
      const layout = await demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, demo, "banner-asset");
      const fresh = withoutStaleTranslations(layout, { appName: demo.appName, more: PAGE_TEXT_FORMS });
      expect(fresh === layout ? [] : diff(layout, fresh), id).toEqual([]);
    }
  });

  it("a text with a translation of its own, and a placeholder's text in the app", () => {
    const quote = { text: "[What a customer says about you]", translations: { ar: { text: "[رأي أحد العملاء فيك]" }, tr: { text: "[Bir müşterinin sizin hakkınızdaki sözü]" } } };
    expect(translationState(quote, "text", "ar")).toBe("template");
    expect(servedText(quote, "text")).toBe("[What a customer says about you]");
    const own = { ...quote, translations: { ...quote.translations, ar: { text: "كل سؤال وجد إجابته" } } };
    expect(translationState(own, "text", "ar")).toBe("own");
    expect(translationState(own, "text", "tr")).toBe("stale");
    expect(servedText(own, "text")).toBe("كل سؤال وجد إجابته");
    // The app's name in a word the template wrote with it; another name is the owner's.
    const welcome = { text: "Welcome", translations: { ar: { text: "مرحبًا بك في Kech Flora" } } };
    expect(translationState(welcome, "text", "ar", { appName: "Kech Flora" })).toBe("stale");
    expect(translationState(welcome, "text", "ar", { appName: "Other" })).toBe("own");
    // The app's name alone (a wordmark) is the template's while it is the app's name; another name is the owner's.
    const wordmark = { text: "Kech", translations: { ar: { text: "Kech Flora" } } };
    const named = { text: "Kech", translations: { ar: { text: "كيش فلورا" } } };
    expect(translationState(wordmark, "text", "ar", { appName: "Kech Flora" })).toBe("stale");
    expect(translationState(named, "text", "ar", { appName: "Kech Flora" })).toBe("own");
  });

  it("no [placeholder] of a template reaches a customer: the cut-off from the delivery settings, the rest waits for the owner's words", async () => {
    const app = await kechFlora("en");
    expect((await publishLayout(store, app, await editorDraft(app), "owner@kech.test", NOW, PLAN_INFO.studio_1)).ok).toBe(true);
    const placeholder = /[[［【][^\]］】]*\p{L}[^\]］】]*[\]］】]/u;
    const pages = ["home", "bouquet"];
    // Without a same-day cut-off: the line about it waits too.
    // Every text the page has, but an element's `name` (its layer's in Studio, never shown).
    const strings = (value: unknown, key = ""): string[] =>
      typeof value === "string" ? (key === "name" ? [] : [value]) : Array.isArray(value) ? value.flatMap((v) => strings(v)) : value && typeof value === "object" ? Object.entries(value).flatMap(([k, v]) => strings(v, k)) : [];
    for (const lang of ["en", "ar", "tr"]) for (const slug of pages) expect(strings((await get(app, `/pages/${slug}`, lang)).body).filter((t) => placeholder.test(t)), `${slug} ${lang}`).toEqual([]);
    // With one: "Order before 14:00 and it arrives today.", in each language.
    const delivery = { enabled: true, required: false, sameDay: true, cutoff: "14:00", nextDay: true, maxDays: 7, closedWeekdays: [], timezone: "Africa/Cairo", slots: [] };
    await store.updateApp(app.id, { catalogSettings: { ...app.catalogSettings!, delivery } }, LATER);
    const shop = (await store.getAppById(app.id))!;
    const texts = async (lang: string) => allNodes(((await get(shop, "/pages/home", lang)).body as { studio: StudioPage }).studio).map((n) => n.text ?? "");
    expect(await texts("en")).toContain("Order before 14:00 and it arrives today.");
    expect(await texts("ar")).toContain("اطلب قبل 14:00 ويصل اليوم.");
    expect(await texts("tr")).toContain("14:00 öncesinde sipariş verin, bugün ulaşsın.");
    // Studio still shows the owner the placeholders, to fill in.
    expect(JSON.stringify((await loadLayout(store, shop, LATER)).draft)).toContain("[Customer name]");
  });

  it("a project started from Leqaa's demo never tells its customers the demo's facts: no Cairo, no 4 pm; its own cut-off, or no line", async () => {
    const { client } = await registerClient(store, { name: "Kech Flora", email: "kech-demo@flora.test", whatsapp: "+212600000000", siteUrl: "", password: null }, NOW);
    const languages = { default: "en", available: ["en", "ar", "tr"] };
    const made = await makeStudioProject(store, { clientId: client.id, name: "Kech Flora", kind: kindById("store")!, source: "catalog", template: LEQAA_A, words: appWords("en", "Kech Flora"), lang: "en", languages, fromDemo: FLOWER_SHOP_DEMO }, NOW);
    const app = (await store.getAppById(made.id))!;
    const draft = await editorDraft(app);
    // Studio shows the demo's words it started from.
    expect(JSON.stringify(draft)).toContain("Order before 4 pm and it arrives today, anywhere in Cairo.");
    expect((await publishLayout(store, app, draft, "owner@kech.test", NOW, PLAN_INFO.studio_1)).ok).toBe(true);
    const demoWords = /Cairo|القاهرة|Kahire|4 pm|الرابعة|16\.00/;
    for (const lang of ["en", "ar", "tr"]) expect(JSON.stringify((await get(app, "/pages/home", lang)).body), lang).not.toMatch(demoWords);
    const delivery = { enabled: true, required: false, sameDay: true, cutoff: "15:30", nextDay: true, maxDays: 7, closedWeekdays: [], timezone: "Africa/Casablanca", slots: [] };
    await store.updateApp(app.id, { catalogSettings: { ...app.catalogSettings!, delivery } }, LATER);
    const shop = (await store.getAppById(app.id))!;
    const texts = allNodes(((await get(shop, "/pages/home", "en")).body as { studio: StudioPage }).studio).map((n) => n.text ?? "");
    expect(texts).toContain("Order before 15:30 and it arrives today.");
    // Yallapp's own demo app keeps its own facts.
    const demo = { ...shop, demo: true };
    expect(JSON.stringify((await get(demo, "/pages/home", "en")).body)).toContain("anywhere in Cairo");
  });

  it("dropping and marking leave anything else as it was", () => {
    const value = { id: "a", type: "text", text: "Hello", children: [{ id: "b", type: "text", text: "Hi" }] };
    expect(withoutStaleTranslations(value)).toBe(value);
    expect(editedTranslations(value, value)).toBe(value);
    expect(withOwnTranslation(undefined, "ar", "text", "")).toBeUndefined();
    expect(withOwnTranslation({ ar: { text: "x" }, [OWN_TRANSLATIONS]: { ar: "text" } }, "ar", "text", "")).toBeUndefined();
  });

  it("saving keeps the owner's marks and drops what is stale (saveDraft)", async () => {
    const project = await kechFlora("en");
    const draft = await editorDraft(project);
    const ids = edit(draft);
    const heading = allNodes(draft.pages.find((p) => p.slug === "home")!.studio!).find((n) => n.id === ids.heading)!;
    heading.text = "Reviews";
    heading.translations = { ar: { text: "كلمات طيبة" }, tr: { text: "Güzel sözler" }, [OWN_TRANSLATIONS]: { tr: "text" } };
    const saved = await saveDraft(store, project, draft, LATER);
    if (!saved.ok) throw new Error(saved.errors.join("; "));
    const kept = allNodes(saved.value.draft.pages.find((p) => p.slug === "home")!.studio!).find((n) => n.id === ids.heading)!;
    expect(kept.translations).toEqual({ tr: { text: "Güzel sözler" }, [OWN_TRANSLATIONS]: { tr: "text" } });
  });
});

/** Where two values differ, as `path: before → after`. */
function diff(a: unknown, b: unknown, path = ""): string[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].flatMap((k) => diff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`));
  }
  return [`${path}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`];
}

