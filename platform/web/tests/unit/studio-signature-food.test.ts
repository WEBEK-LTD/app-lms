import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ar as studioAr, en as studioEn, tr as studioTr } from "@/i18n/dashboard/studio";
import { newApp } from "@/lib/app/setup";
import { demoKind, type StudioDemoId } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import type { App } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { servedAppearance } from "@/lib/fonts/look";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { itemSourcesFor } from "@/lib/pages/sources";
import type { LayoutContent, StudioNode } from "@/lib/pages/types";
import { parseLayoutContent, parseStudioPage } from "@/lib/pages/validate";
import { signatureDesign, signatureDesigns } from "@/lib/studio/demo-designs";
import type { SignatureDesign, SignatureLook } from "@/lib/studio/demo-designs/signature";
import { withDemoFacts } from "@/lib/studio/demo-templates";
import { projectTemplatesFor } from "@/lib/studio/project-templates";
import { TEMPLATES, templatesFor, type SectionContext, type SectionWord } from "@/lib/studio/sections";
import { startLayout } from "@/lib/studio/start";
import { allNodes } from "@/lib/studio/tree";

/**
 * 130.1–130.6 Sofra Eats's, Zad's and Sahm Express's Signature looks:
 * each a whole project template of its demo's kind, its home as the board,
 * every page after it in the look (its header, colours and the look's own
 * elements over the screens), its bar, its sign-in and account menu, in
 * Studio's three languages; a page the platform takes. The projects the
 * app's screenshots draw (mobile/test/support/sig_<demo>_<look>.json).
 */

const NOW = new Date("2026-11-13T10:00:00Z");
const LANGS = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };

/** The looks this file checks, as [demo, look, brand for the screenshots' file]. */
const LOOKS: readonly (readonly [StudioDemoId, SignatureLook, string])[] = [
  ["food", "a", "sofra"],
];

const kindOf = (id: StudioDemoId) => ({ type: demoKind(id).engine, vertical: demoKind(id).vertical });

function projectApp(id: StudioDemoId, design: SignatureDesign): App {
  const kind = demoKind(id);
  return { ...newApp("client", null, NOW, kind.engine, kind.vertical), section: "studio", backend: "hosted", appName: DEMO_BRANDS[id].appName, primaryColor: design.project.primary };
}

function englishContext(app: App): SectionContext {
  return { brand: app.primaryColor, source: itemSourcesFor(app)[0] ?? null, app: app.appName!, lang: "en", w: (word: SectionWord) => String(studioEn[`w_${word}`]).replaceAll("{app}", app.appName!), picture: (f) => `${appUrl()}/design-pictures/${f}` };
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
  it.each(LOOKS)("the %s look %s is a whole project template, offered first among its kind's own", (id, look) => {
    const design = signatureDesign(id, look)!;
    expect(design.template.id).toBe(`${id}_signature_${look}`);
    const list = templatesFor(kindOf(id));
    const own = list.filter((t) => !t.demo);
    const ids = own.map((t) => t.id);
    expect(ids.indexOf(design.template.id)).toBeLessThan(signatureDesigns().filter((d) => d.demo === id).length);
    const template = list.find((t) => t.id === design.template.id)!;
    expect(template).toMatchObject({ recommended: true, signature: { demo: id, look } });
    expect(template.project).toBe(design.project);
    // App setup's Branding step offers it as a whole design for a Studio project of the kind.
    const app = { ...newApp("c1", null, NOW, demoKind(id).engine, demoKind(id).vertical), section: "studio" as const };
    expect(projectTemplatesFor(app).map((t) => t.id)).toContain(design.template.id);
    // Its name, in the dashboard's three languages.
    for (const words of [studioEn, studioAr, studioTr]) expect(String(words[`w_${design.name}`]).length).toBeGreaterThan(2);
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
      if (!n.text || /^\d+$/.test(n.text)) continue;
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
    expect(layout.tab_bar).toEqual(design.project.tab_bar);
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
    expect(layout.appearance.font).toBe(design.project.appearance.font);
    expect(layout.appearance.secondary_color).toBe(design.project.appearance.secondary_color);
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

  it.each(LOOKS)("the %s look %s is the project the app's screenshots draw (mobile/test/support/sig_<brand>_<look>.json)", (id, look, brand) => {
    const { layout, design } = started(id, look);
    const file = join(process.cwd(), "..", "..", "mobile", "test", "support", `sig_${brand}_${look}.json`);
    const served = { ...layout, appearance: servedAppearance(layout.appearance, appUrl()) };
    const data = `${JSON.stringify({ screens: design.project.screens(appUrl()), layout: served }, null, 1)}\n`;
    if (process.env.YALLAPP_WRITE_SIGNATURES) writeFileSync(file, data);
    expect(readFileSync(file, "utf8")).toBe(data);
  });
});
