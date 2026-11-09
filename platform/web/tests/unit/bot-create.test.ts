import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { en as studioEn } from "@/i18n/dashboard/studio";
import { kindById } from "@/lib/app/kinds";
import { readAnswers, websiteAddress, type BotAnswers } from "@/lib/bot/answers";
import { makeFromAnswers, type BotMaker } from "@/lib/bot/create";
import { BOT_LOYALTY, featureSettings, featureStatus, featuresFor } from "@/lib/bot/features";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { demoIdOf, demoKind, STUDIO_DEMO_TYPES, type StudioDemoId } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { demoDesign, demoDesignId } from "@/lib/demo/look";
import { demoLayout } from "@/lib/demo/setup";
import { designsForApp } from "@/lib/pages/designs/catalog";
import { parseLayoutContent } from "@/lib/pages/validate";
import type { LayoutContent, LayoutPage, StudioNode, StudioPage } from "@/lib/pages/types";
import { PLAN_INFO } from "@/lib/plans";
import { sampleTotal } from "@/lib/samples/lists";
import type { SectionWord } from "@/lib/studio/sections";

// The sample pictures go to a folder of their own.
const BLOBS = mkdtempSync(join(tmpdir(), "bot-create-"));
process.env.YALLAPP_BLOBS_DIR = BLOBS;
afterAll(() => rmSync(BLOBS, { recursive: true, force: true }));

const NOW = new Date("2026-11-09T10:00:00Z");

function maker(name: string, plan: BotMaker["plan"] = null): BotMaker {
  return { clientId: "client-1", plan, lang: "en", words: (word: SectionWord) => String(studioEn[`w_${word}`]).replaceAll("{app}", name) };
}

function answers(patch: Partial<BotAnswers>): BotAnswers {
  return { kind: "restaurant", university: false, name: "Lokma", colour: null, logoAssetId: null, languages: ["en"], features: [], website: null, ...patch };
}

async function make(store: MemoryStore, patch: Partial<BotAnswers>, plan: BotMaker["plan"] = null) {
  const a = answers(patch);
  const made = await makeFromAnswers(store, maker(a.name, plan), a, kindById(a.kind)!, NOW);
  const layout = (await store.getAppLayout(made.app.id))!.draft;
  return { ...made, layout };
}

// ——— What a project is, without the ids that differ each time and the demo's own note on signing in ———
function stripNode(n: StudioNode): unknown {
  const { id: _id, children, card, ...rest } = n;
  void _id;
  return { ...rest, ...(children ? { children: children.map(stripNode) } : {}), ...(card ? { card: stripNode(card) } : {}) };
}
function withoutNote(page: StudioPage): StudioPage {
  return { ...page, body: { ...page.body, children: (page.body.children ?? []).filter((n) => n.visibility !== "signed_out") } };
}
function untranslated(node: StudioNode): StudioNode {
  const { translations: _t, children, ...rest } = node;
  void _t;
  return { ...rest, ...(children ? { children: children.map(untranslated) } : {}) } as StudioNode;
}
function whole(layout: Pick<LayoutContent, "pages" | "tabs" | "menu" | "appearance">) {
  return {
    pages: layout.pages.map((p: LayoutPage) => ({ slug: p.slug, title: p.title, show_title: p.show_title, blocks: p.blocks, studio: p.studio ? stripNode(untranslated(withoutNote(p.studio).body)) : null })),
    tabs: layout.tabs,
    menu: layout.menu ?? [],
    look: { template: layout.appearance.template, font: layout.appearance.font, font_family: layout.appearance.font_family ?? null, corners: layout.appearance.corners, cards: layout.appearance.cards, secondary_color: layout.appearance.secondary_color },
  };
}

function demoApp(id: StudioDemoId): App {
  const kind = demoKind(id);
  return { ...(null as unknown as App), ...({} as App), id: "demo", clientId: "demo-client", demo: true, section: "studio", backend: "hosted", appType: kind.engine, vertical: kind.vertical, appName: DEMO_BRANDS[id].appName, primaryColor: DEMO_BRANDS[id].primaryColor } as App;
}

describe("the bot makes a Studio project: the chosen demo, exactly", () => {
  it.each(STUDIO_DEMO_TYPES)("%s", async (id) => {
    const store = new MemoryStore();
    const kind = demoKind(id);
    const { app, open, layout } = await make(store, { kind: kind.id, name: DEMO_BRANDS[id].appName });
    expect(open).toBe("/studio/editor");
    expect(app).toMatchObject({ section: "studio", backend: "hosted", appType: kind.engine, vertical: kind.vertical, primaryColor: DEMO_BRANDS[id].primaryColor, appName: DEMO_BRANDS[id].appName });
    const { newApp } = await import("@/lib/app/setup");
    const demo = await demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, { ...newApp("demo-client", null, NOW, kind.engine, kind.vertical), ...demoApp(id) }, "banner-asset");
    // The demo as the platform keeps it (a layout is checked and tidied when it's saved or published).
    const kept = parseLayoutContent(demo, { app, now: NOW });
    expect(kept.ok).toBe(true);
    if (kept.ok) expect(whole(layout)).toEqual(whole(kept.value));
    // The demo's own sample entries.
    expect(await sampleTotal(store, (await store.getAppById(app.id))!)).toBeGreaterThan(0);
  });

  it("takes the owner's colour, logo, languages and features on top", async () => {
    const store = new MemoryStore();
    const { app, layout } = await make(store, { kind: "food", colour: "#D32F2F", logoAssetId: "logo-1", languages: ["ar", "en"], features: ["chat"] });
    expect(app).toMatchObject({ primaryColor: "#D32F2F", logoAssetId: "logo-1", chatSettings: { enabled: true, courseGroups: false }, reviewPrompt: false });
    expect(layout.languages).toEqual({ default: "ar", available: ["ar", "en"] });
  });

  it("makes a university from the school's university template", async () => {
    const store = new MemoryStore();
    const { app } = await make(store, { kind: "school", university: true, name: "Nile University" });
    expect(app).toMatchObject({ section: "studio", appType: "school" });
  });

  it("keeps a regular plan's limits off a Studio project", async () => {
    const store = new MemoryStore();
    const { layout } = await make(store, { kind: "taxi", languages: ["en", "ar", "tr"] }, PLAN_INFO.starter);
    expect(layout.languages.available).toEqual(["en", "ar", "tr"]);
  });
});

describe("the bot makes a regular app: like our demo", () => {
  it.each(["restaurant", "store", "clinic", "fitness", "academy", "bookings", "real_estate", "news", "events", "charity"])("%s, its content kept in Yallapp, with the demo's samples", async (kindId) => {
    const store = new MemoryStore();
    const { app, open, layout } = await make(store, { kind: kindId, languages: ["tr", "en"] });
    expect(open).toBe("/dashboard/pages?from=bot");
    const demo = demoIdOf(app);
    const design = demoDesign(demo);
    expect(app).toMatchObject({ section: "regular", backend: "hosted", siteUrl: null, appName: "Lokma", design: demoDesignId(demo), primaryColor: design.palettes![0]!.primary });
    expect(app.websiteDoneAt).toEqual(NOW);
    expect(layout.languages).toEqual({ default: "tr", available: ["tr", "en"] });
    expect(layout.pages.map((p) => p.slug)).toEqual(design.pages.map((p) => p.slug));
    expect(layout.appearance).toMatchObject({ template: design.look.template, corners: design.look.corners, cards: design.look.cards, secondary_color: design.palettes![0]!.secondary });
    expect(await sampleTotal(store, app)).toBeGreaterThan(0);
  });

  it("starts a kind with no demo of its own from its first design", async () => {
    const store = new MemoryStore();
    const { app } = await make(store, { kind: "services" });
    const first = (await designsForApp(new MemoryStore(), app))[0]!;
    expect(app).toMatchObject({ design: first.id, primaryColor: first.palettes![0]!.primary });
  });

  it("keeps the owner's colour instead of the demo's", async () => {
    const store = new MemoryStore();
    const { app } = await make(store, { colour: "#1E63E9" });
    expect(app.primaryColor).toBe("#1E63E9");
  });

  it("leaves the content to the website when there is one: no samples", async () => {
    const store = new MemoryStore();
    const { app } = await make(store, { kind: "store", website: "https://shop.example.com" });
    expect(app).toMatchObject({ backend: "wordpress", siteUrl: "https://shop.example.com", connector: null, websiteDoneAt: null, design: demoDesignId(demoIdOf(app)) });
    expect(await sampleTotal(store, app)).toBe(0);
  });

  it("turns on what the plan includes, and nothing it doesn't", async () => {
    const none = await make(new MemoryStore(), { kind: "store", features: ["loyalty", "chat", "ratings"] });
    expect(none.app.catalogSettings?.loyalty ?? null).toBeNull();
    expect(none.app).toMatchObject({ chatSettings: { enabled: true }, reviewPrompt: true });
    const starter = await make(new MemoryStore(), { kind: "store", features: ["loyalty"] }, PLAN_INFO.starter);
    expect(starter.app.catalogSettings?.loyalty ?? null).toBeNull();
    expect(starter.app.chatSettings?.enabled).toBe(false);
    const growth = await make(new MemoryStore(), { kind: "store", features: ["loyalty"] }, PLAN_INFO.growth);
    expect(growth.app.catalogSettings?.loyalty).toEqual(BOT_LOYALTY);
  });

  it("keeps the languages to the plan's", async () => {
    const limit = PLAN_INFO.starter.limits.languages;
    const { layout } = await make(new MemoryStore(), { languages: ["ar", "en", "tr", "fr", "de"] }, PLAN_INFO.starter);
    expect(layout.languages.default).toBe("ar");
    if (limit !== null) expect(layout.languages.available.length).toBe(Math.min(limit, 5));
  });
});

describe("the bot's features and the plan", () => {
  it("offers loyalty points to shops and restaurants, and card payments where the app sells", () => {
    expect(featuresFor(kindById("restaurant")!)).toContain("loyalty");
    expect(featuresFor(kindById("store")!)).toContain("loyalty");
    expect(featuresFor(kindById("clinic")!)).not.toContain("loyalty");
    expect(featuresFor(kindById("news")!)).not.toContain("payments");
    expect(featuresFor(kindById("food")!)).toContain("chat");
  });

  it("says what the plan includes, and which plan brings the rest", () => {
    expect(featureStatus("ratings", null, PLAN_INFO, "regular")).toEqual({ status: "in_plan" });
    expect(featureStatus("chat", PLAN_INFO.business, PLAN_INFO, "regular")).toEqual({ status: "in_plan" });
    expect(featureStatus("loyalty", PLAN_INFO.starter, PLAN_INFO, "regular")).toEqual({ status: "upgrade", plan: "growth" });
    expect(featureStatus("loyalty", null, PLAN_INFO, "regular")).toMatchObject({ status: "no_plan" });
  });

  it("turns chat and store ratings off when they weren't chosen", () => {
    const app = { appType: "store" as const, backend: "hosted" as const, connector: { kind: "catalog" as const }, catalogSettings: null };
    expect(featureSettings(app, [], PLAN_INFO.business)).toEqual({ chatSettings: { enabled: false, courseGroups: false }, reviewPrompt: false });
  });
});

describe("the bot's answers, checked", () => {
  it("tidies them", () => {
    const read = readAnswers({ kind: "school", university: true, name: "  Nile   School ", colour: "#1e63e9", logoAssetId: null, languages: ["ar", "ar", "xx", "en"], features: ["chat", "loyalty", "spaceship"], website: "nile.example.com" });
    expect(read).toMatchObject({ ok: true, value: { kind: "school", university: true, name: "Nile School", colour: "#1E63E9", languages: ["ar", "en"], features: ["chat"], website: null } });
  });

  it("keeps a website only for a kind that can have one", () => {
    expect(readAnswers({ ...answers({}), kind: "store", website: "shop.example.com" })).toMatchObject({ ok: true, value: { website: "https://shop.example.com" } });
    expect(readAnswers({ ...answers({}), kind: "real_estate", website: "homes.example.com" })).toMatchObject({ ok: true, value: { website: null } });
  });

  it.each([
    [{ kind: "spaceship" }, "kind"],
    [{ name: "" }, "name"],
    [{ name: "x".repeat(31) }, "name"],
    [{ colour: "red" }, "colour"],
    [{ logoAssetId: "../x" }, "logo"],
    [{ languages: [] }, "languages"],
    [{ languages: ["xx"] }, "languages"],
    [{ kind: "store", website: "not a site" }, "website"],
  ])("refuses %j", (patch, error) => {
    expect(readAnswers({ ...answers({}), ...patch })).toEqual({ ok: false, error });
  });

  it.each([
    ["example.com", "https://example.com"],
    ["https://www.example.com.tr/", "https://www.example.com.tr"],
    ["http://shop.example.org", "http://shop.example.org"],
    ["مطعم.مصر", "https://مطعم.مصر"],
    ["example", null],
    ["my site", null],
    ["javascript:alert(1)", null],
    ["", null],
  ])("reads %j as a website as %j", (typed, address) => {
    expect(websiteAddress(typed)).toBe(address);
  });
});
