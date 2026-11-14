import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ar as studioAr, en as studioEn, tr as studioTr } from "@/i18n/dashboard/studio";
import { newApp } from "@/lib/app/setup";
import { demoKind, DEMO_SLUGS, type StudioDemoId } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import type { App } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { itemSourcesFor } from "@/lib/pages/sources";
import type { LayoutContent, StudioNode } from "@/lib/pages/types";
import { parseLayoutContent, parseStudioPage } from "@/lib/pages/validate";
import { signatureDesign, signatureDesigns } from "@/lib/studio/demo-designs";
import type { SignatureDesign, SignatureLook } from "@/lib/studio/demo-designs/signature";
import { withDemoFacts } from "@/lib/studio/demo-templates";
import { projectTemplatePicture, projectTemplatesFor } from "@/lib/studio/project-templates";
import { appWords } from "@/lib/studio/app-words";
import { TEMPLATES, templatesFor, type SectionContext } from "@/lib/studio/sections";
import { startLayout } from "@/lib/studio/start";
import { allNodes } from "@/lib/studio/tree";

/**
 * 130.1–130.6 Sofra Eats's, Zad's and Sahm Express's Signature looks:
 * each a whole project template of its demo's kind, its home as the board,
 * every page after it in the look (its header, colours and the look's own
 * elements over the screens), its bar, its sign-in and account menu, in
 * Studio's three languages; a page the platform takes. (The projects the
 * app's screenshots draw: tests/unit/signature-looks.test.ts, for all 18.)
 */

const NOW = new Date("2026-11-13T10:00:00Z");
const LANGS = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };

/** The looks this file checks. */
const LOOKS: readonly (readonly [StudioDemoId, SignatureLook])[] = [
  ["food", "a"],
  ["food", "b"],
  ["marketplace", "a"],
  ["marketplace", "b"],
  ["delivery", "a"],
  ["delivery", "b"],
];

const kindOf = (id: StudioDemoId) => ({ type: demoKind(id).engine, vertical: demoKind(id).vertical });

function projectApp(id: StudioDemoId, design: SignatureDesign): App {
  const kind = demoKind(id);
  return { ...newApp("client", null, NOW, kind.engine, kind.vertical), section: "studio", backend: "hosted", appName: DEMO_BRANDS[id].appName, primaryColor: design.project.primary ?? DEMO_BRANDS[id].primaryColor };
}

function englishContext(app: App): SectionContext {
  return { brand: app.primaryColor, source: itemSourcesFor(app)[0] ?? null, app: app.appName!, lang: "en", w: appWords("en", app.appName!), picture: (f) => `${appUrl()}/design-pictures/${f}` };
}

/** A project started from the look, as /start makes it for the demo (its words where the template has brackets). */
function started(id: StudioDemoId, look: SignatureLook): { app: App; layout: LayoutContent; design: SignatureDesign } {
  const design = signatureDesign(id, look)!;
  const app = projectApp(id, design);
  const template = TEMPLATES.find((t) => t.id === design.template.id)!;
  let n = 0;
  const layout = startLayout(app, template, { ...defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), languages: LANGS }, NOW, { ...englishContext(app), newId: () => `sig-${++n}` });
  return { app, design, layout: { ...layout, pages: layout.pages.map((p) => (p.studio ? { ...p, studio: withDemoFacts(id, p.studio) } : p)) } };
}

describe("130.1–130.6 the food, marketplace and delivery Signature looks", () => {
  it.each(LOOKS)("the %s look %s is a whole project template, offered first with its demo", (id, look) => {
    const design = signatureDesign(id, look)!;
    expect(design.template.id).toBe(`${id}_signature_${look}`);
    const list = templatesFor(kindOf(id));
    const ids = list.filter((t) => t.demo === id).map((t) => t.id);
    expect(ids).toContain(design.template.id);
    expect(ids.length).toBe(1 + signatureDesigns().filter((d) => d.demo === id).length);
    const template = list.find((t) => t.id === design.template.id)!;
    expect(template).toMatchObject({ recommended: true, demo: id, look });
    expect(template.project).toMatchObject({ tab_bar: design.bar, primary: design.project.primary ?? DEMO_BRANDS[id].primaryColor });
    // App setup's Branding step offers it as a whole design for a Studio project of the kind.
    const app = { ...newApp("c1", null, NOW, demoKind(id).engine, demoKind(id).vertical), section: "studio" as const };
    expect(projectTemplatesFor(app).map((t) => t.id)).toContain(design.template.id);
    // Its name, its template's name and the Branding step's words about it, in the dashboard's three languages; its real picture.
    for (const words of [studioEn, studioAr, studioTr]) {
      const own = words as unknown as Record<string, string | undefined>;
      expect(own[`tpl_${design.template.id}`], design.template.id).toBeTruthy();
      expect(own[`tplText_${design.template.id}`], design.template.id).toBeTruthy();
    }
    const picture = projectTemplatePicture(template);
    expect(picture).toBe(`/screens/${DEMO_SLUGS[id]}-sig-${look}-home.png`);
    expect(existsSync(join(process.cwd(), "public", picture!))).toBe(true);
    expect(existsSync(join(process.cwd(), "public", picture!.replace(".png", "-dark.png")))).toBe(true);
  });

  it.each(LOOKS)("the %s look %s's home, taken by an owner, is a page the platform takes, in Studio's three languages", (id, look) => {
    const design = signatureDesign(id, look)!;
    const kind = demoKind(id);
    const app = { ...newApp("c1", null, NOW, kind.engine, kind.vertical), backend: "hosted" as const, appName: "Corner Kitchen" };
    const page = TEMPLATES.find((t) => t.id === design.template.id)!.make(englishContext({ ...app, primaryColor: "#1F4E5F" }));
    const parsed = parseStudioPage(page, app, LANGS);
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    expect(JSON.stringify(page)).not.toContain("{app}");
    // Every word on it in Arabic and Turkish too (numbers and binds aside).
    for (const n of allNodes(page)) {
      if (!n.text || !/\p{L}/u.test(n.text)) continue;
      expect(n.translations?.ar?.text, n.text).toBeTruthy();
      expect(n.translations?.tr?.text, n.text).toBeTruthy();
    }
    // Light and dark: the page's own paper by night, never the light one inverted.
    expect(page.dark_background).toBeTruthy();
    expect(page.dark_background).not.toBe(page.background);
  });

  it.each(LOOKS)("a project from the %s look %s is the whole app in the look: its pages, header, bar, sign-in and account", (id, look) => {
    const { app, design, layout } = started(id, look);
    const checked = parseLayoutContent(layout, { app, now: NOW });
    expect(checked.ok ? [] : checked.errors).toEqual([]);
    // The look's bar: floating (a pill, a dock or glass), never the classic one across the bottom.
    expect(layout.tab_bar).toEqual(design.bar);
    expect(["float", "dock", "glass"]).toContain(layout.tab_bar!.design);
    // Every tab opens a Studio page; the pages after the home in the look's colours and premium header.
    const pages = layout.pages.filter((p) => p.studio && p.slug !== "home");
    expect(pages.length).toBeGreaterThan(3);
    for (const page of pages) {
      expect(page.studio!.background, page.slug).toBe(design.look!.background);
      expect(page.studio!.dark_background, page.slug).toBe(design.look!.dark_background);
      if (page.studio!.header) expect(page.studio!.header, page.slug).toMatchObject({ ...design.look!.header, style: design.chrome.header });
    }
    for (const tab of layout.tabs) expect(tab.target.type, tab.id).toBe("page");
    // The look's own elements over its tabs' screens.
    const over = pages.filter((p) => (p.studio!.body.children ?? []).length > 0).map((p) => p.studio!.screen);
    expect(over.length).toBeGreaterThan(0);
    // Its font and colours.
    expect(layout.appearance.font).toBe(design.project.appearance!.font);
    expect(layout.appearance.secondary_color).toBe(design.project.appearance!.secondary_color);
    // Its sign-in and account menu.
    const screens = design.project.screens(appUrl());
    expect(screens.sign_in?.image_url).toMatch(/^http.+\.jpg$/);
    for (const l of ["en", "ar", "tr"]) expect(screens.sign_in?.title[l]).toBeTruthy();
    expect(screens.account_menu?.header).toBeTruthy();
  });

  it.each(LOOKS)("the live parts of the %s look %s read the person's own (signed in only)", (id, look) => {
    const { layout } = started(id, look);
    const live = layout.pages.flatMap((p) => (p.studio ? allNodes(p.studio) : [])).filter((n: StudioNode) => n.type === "live_status" || n.type === "tracking");
    expect(live.length).toBeGreaterThan(0);
    for (const n of live) expect(n.visibility, n.id).toBe("signed_in");
  });
});

describe("130 the generic options the looks needed", () => {
  const app = { ...newApp("c1", null, NOW, "food", null), backend: "hosted" as const };
  const page = (node: Record<string, unknown>) => ({ body: { id: "root", type: "column", children: [{ id: "n", ...node }] } });
  const parsed = (node: Record<string, unknown>) => parseStudioPage(page(node), app, LANGS);

  it("takes the live cards' premium looks with their accent, and leaves out the card's own", () => {
    const ok = parsed({ type: "live_status", live_status: { source: "food_order", style: "ring", accent: "#f4b63f", dark_accent: "#F4B63F" }, image_url: "https://files.test/kofta.jpg" });
    expect(ok.ok && ok.value.body.children![0]).toMatchObject({ live_status: { source: "food_order", style: "ring", accent: "#F4B63F", dark_accent: "#F4B63F" }, image_url: "https://files.test/kofta.jpg" });
    const card = parsed({ type: "live_status", live_status: { source: "food_order", style: "card" } });
    expect(card.ok && card.value.body.children![0]!.live_status).toEqual({ source: "food_order" });
    expect(parsed({ type: "live_status", live_status: { source: "food_order", style: "spinning" } }).ok).toBe(false);
    expect(parsed({ type: "live_status", live_status: { source: "food_order", accent: "orange" } }).ok).toBe(false);
    const track = parsed({ type: "tracking", tracking: { kind: "shipment", style: "steps", accent: "#1F6FB2" } });
    expect(track.ok && track.value.body.children![0]!.tracking).toEqual({ kind: "shipment", style: "steps", accent: "#1F6FB2" });
  });

  it("takes the places as a deck", () => {
    const market = { ...newApp("c1", null, NOW, "food", "marketplace"), backend: "hosted" as const };
    const deck = parseStudioPage(page({ type: "market", title: "Places near you", market: { section: "vendors", style: "deck", limit: 3 } }), market, LANGS);
    expect(deck.ok ? [] : deck.errors).toEqual([]);
    expect(deck.ok && deck.value.body.children![0]!.market).toMatchObject({ section: "vendors", style: "deck" });
  });
});
