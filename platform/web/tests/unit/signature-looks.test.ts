import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { ar as studioAr, en as studioEn, tr as studioTr } from "@/i18n/dashboard/studio";
import { demoKind, DEMO_SLUGS, STUDIO_DEMO_TYPES, type StudioDemoId } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { studioDemoTemplate } from "@/lib/demo/picker";
import { demoStudioScreens, demoTabBar } from "@/lib/demo/screens";
import type { App } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { servedAppearance } from "@/lib/fonts/look";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { itemSourcesFor } from "@/lib/pages/sources";
import { TAB_BAR_DESIGNS, type StudioNode, type StudioPage } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import { signatureDesign, signatureLooksOf, studioDemoDesign } from "@/lib/studio/demo-designs";
import type { SignatureLook } from "@/lib/studio/demo-designs/signature";
import { DEMO_HOME_TEMPLATES, withDemoFacts } from "@/lib/studio/demo-templates";
import { designsFor } from "@/lib/studio/designs";
import { TEMPLATES, templatesFor, type SectionContext, type SectionWord } from "@/lib/studio/sections";
import { startLayout } from "@/lib/studio/start";
import { allNodes } from "@/lib/studio/tree";

/**
 * 130 The Signature looks: each one a real template of its demo's kind
 * (`<demo>_signature_<look>`) that makes the whole app in that look, every
 * page, tab, the premium bar, the sign-in screen and the account menu, in
 * Studio's three languages; a demo's look A is the demo. Every look a demo
 * registers (lib/studio/demo-designs) is checked here. With
 * YALLAPP_WRITE_SIGNATURES the projects are written for the app's pictures
 * of them (mobile/test/support/signatures/<demo>_<look>.json).
 */

const NOW = new Date("2026-11-13T18:00:00Z");
const WORDS = { en: studioEn, ar: studioAr, tr: studioTr };

const LOOKS = STUDIO_DEMO_TYPES.flatMap((demo) => signatureLooksOf(demo).map((look) => [demo, look] as [StudioDemoId, SignatureLook]));

function projectApp(id: StudioDemoId): App {
  const kind = demoKind(id);
  return { ...newApp("client", null, NOW, kind.engine, kind.vertical), section: "studio", backend: "hosted", appName: DEMO_BRANDS[id].appName, primaryColor: DEMO_BRANDS[id].primaryColor };
}

function contextOf(app: App, lang: "en" | "ar" | "tr" = "en"): SectionContext {
  return { brand: app.primaryColor, source: itemSourcesFor(app)[0] ?? null, app: app.appName!, lang, w: (word: SectionWord) => String(WORDS[lang][`w_${word}`]).replaceAll("{app}", app.appName!), picture: (f) => `${appUrl()}/design-pictures/${f}` };
}

/** A new project from the look's template, as /start and Studio make it. */
function started(demo: StudioDemoId, look: SignatureLook, lang: "en" | "ar" | "tr" = "en") {
  const app = projectApp(demo);
  const template = studioDemoTemplate(demo, look);
  const layout = startLayout(app, template, defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), NOW, contextOf(app, lang));
  return { app, template, layout };
}

const texts = (page: StudioPage) => allNodes(page).flatMap((n) => [n.text, n.title].filter((x): x is string => Boolean(x)));

describe("130 the Signature looks", () => {
  it("has looks for Masar Rides, a template of its kind each, named in Studio's three languages", () => {
    expect(signatureLooksOf("rides")).toContain("a");
    for (const [demo, look] of LOOKS) {
      const id = `${demo}_signature_${look}`;
      const template = TEMPLATES.find((t) => t.id === id);
      expect(template, id).toMatchObject({ demo, look, recommended: true });
      const kind = demoKind(demo);
      expect(templatesFor({ type: kind.engine, vertical: kind.vertical }).map((t) => t.id)).toContain(id);
      for (const lang of ["en", "ar", "tr"] as const) expect(String((WORDS[lang] as unknown as Record<string, string>)[`tpl_${id}`] ?? ""), `${lang} tpl_${id}`).not.toBe("");
      // A look is a whole app of its own: never a page of a whole design's look.
      expect(designsFor({ type: kind.engine, vertical: kind.vertical }).flatMap((d) => d.templates)).not.toContain(id);
    }
  });

  it("makes the demo's look A the demo: its home, bar and screens", () => {
    for (const demo of STUDIO_DEMO_TYPES.filter((d) => signatureLooksOf(d).includes("a"))) {
      expect(DEMO_HOME_TEMPLATES[demo]).toBe(`${demo}_signature_a`);
      expect(studioDemoDesign(demo)).toBe(signatureDesign(demo, "a"));
      expect(demoTabBar(demo)).toEqual(signatureDesign(demo, "a")!.bar);
      expect(demoStudioScreens(demo, appUrl())).toEqual(demoStudioScreens(demo, appUrl(), "a"));
    }
  });

  it.each(LOOKS)("%s look %s: the whole app in the look, a layout the platform takes", (demo, look) => {
    const { app, template, layout } = started(demo, look);
    const design = signatureDesign(demo, look)!;
    expect(template.id).toBe(`${demo}_signature_${look}`);
    const checked = parseLayoutContent(layout, { app, now: NOW });
    expect(checked.ok ? [] : checked.errors).toEqual([]);
    // Its premium bar: never the classic one, never across the bottom.
    expect(layout.tab_bar).toEqual(design.bar);
    expect(TAB_BAR_DESIGNS).toContain(design.bar.design);
    expect(design.bar.design).not.toBe("classic");
    // The home is the look's, every tab's page and every screen's after it in the look's colours.
    const [home, ...rest] = layout.pages;
    expect(home!.slug).toBe("home");
    expect(home!.studio!.background).toBe(design.look!.background);
    const designed = rest.filter((p) => p.studio?.header);
    expect(designed.length).toBeGreaterThan(2);
    for (const p of designed) expect(p.studio!.header, p.slug).toMatchObject(design.look!.header);
    // Its tabs open the look's pages.
    for (const tab of layout.tabs) if (tab.target.type === "page") expect(layout.pages.some((p) => p.slug === tab.target.page_slug), tab.id).toBe(true);
    // Live parts are the signed-in person's: nothing of theirs signed out.
    for (const node of allNodes(home!.studio!).filter((n) => n.type === "tracking")) expect(node.visibility, node.id).toBe("signed_in");
    // The sign-in screen and the account menu in the look.
    const screens = demoStudioScreens(demo, appUrl(), look);
    expect(screens.sign_in?.image_url).toBe(`${appUrl()}${design.screens.photo}`);
    expect(screens.account_menu?.header).toBe(design.screens.menu);
    for (const lang of ["en", "ar", "tr"] as const) expect(screens.sign_in?.title[lang]).toBeTruthy();
  });

  it.each(LOOKS)("%s look %s: every word in Studio's three languages", (demo, look) => {
    // Made in Arabic, its words are Arabic, with English and Turkish as translations.
    const { layout } = started(demo, look, "ar");
    const home = layout.pages[0]!.studio!;
    const words = allNodes(home).filter((n): n is StudioNode & { text: string } => n.type === "text" && Boolean(n.text) && !/^[\d\s.,:·+%$£E-]+$/.test(n.text!) && !/^[A-Z0-9 ]+$/.test(n.text!));
    expect(words.length).toBeGreaterThan(2);
    for (const n of words) {
      expect(n.translations?.en?.text, n.text).toBeTruthy();
      expect(n.translations?.tr?.text, n.text).toBeTruthy();
    }
  });

  it.each(LOOKS)("%s look %s: the project the app's pictures of it draw (mobile/test/support/signatures)", (demo, look) => {
    const { layout } = started(demo, look);
    const filled = { ...layout, pages: layout.pages.map((p) => (p.studio ? { ...p, studio: withDemoFacts(demo, p.studio) } : p)) };
    const served = { ...filled, appearance: servedAppearance(filled.appearance, appUrl()) };
    const data = `${JSON.stringify({ screens: demoStudioScreens(demo, appUrl(), look), layout: served }, null, 1)}\n`;
    const folder = join(process.cwd(), "..", "..", "mobile", "test", "support", "signatures");
    const file = join(folder, `${DEMO_SLUGS[demo]}_${look}.json`);
    if (process.env.YALLAPP_WRITE_SIGNATURES) {
      mkdirSync(folder, { recursive: true });
      writeFileSync(file, data);
    }
    expect(readFileSync(file, "utf8")).toBe(data);
    expect(texts(layout.pages[0]!.studio!).length).toBeGreaterThan(0);
  });
});
