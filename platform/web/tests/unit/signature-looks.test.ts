import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { ar as studioAr, en as studioEn, tr as studioTr } from "@/i18n/dashboard/studio";
import { appWords } from "@/lib/studio/app-words";
import { demoKind, DEMO_SLUGS, STUDIO_DEMO_TYPES, type StudioDemoId } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { studioDemoTemplate } from "@/lib/demo/picker";
import { demoStudioScreens, demoTabBar } from "@/lib/demo/screens";
import type { App } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { servedAppearance } from "@/lib/fonts/look";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { itemSourcesFor } from "@/lib/pages/sources";
import { STUDIO_HEADER_STYLES, TAB_BAR_DESIGNS, type StudioHeader, type StudioNode, type StudioPage } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import { signatureDesign, signatureDesigns, signatureLooksOf, studioDemoDesign } from "@/lib/studio/demo-designs";
import { SYSTEM_SCREENS, systemLookFor } from "@/lib/studio/premium-chrome";
import { parseStudioScreens } from "@/lib/studio/screens";
import type { SignatureLook } from "@/lib/studio/demo-designs/signature";
import { DEMO_HOME_TEMPLATES, withDemoFacts } from "@/lib/studio/demo-templates";
import { designsFor } from "@/lib/studio/designs";
import { TEMPLATES, templatesFor, type SectionContext } from "@/lib/studio/sections";
import { startLayout } from "@/lib/studio/start";
import { allNodes } from "@/lib/studio/tree";

/**
 * 130 The Signature looks, all eighteen from the one registry
 * (lib/studio/demo-designs SIGNATURE_DESIGNS): each one a real template of
 * its demo's kind (`<demo>_signature_<look>`) that makes the whole app in
 * that look, every page, tab, the premium bar, the sign-in screen and the
 * account menu, in Studio's three languages, every page in its premium
 * header and the system screens in its premium look, kept as the platform
 * saves them; a demo's look A is the demo. With YALLAPP_WRITE_SIGNATURES
 * the projects are written for the app's pictures of them
 * (mobile/test/support/signatures/<demo's address>_<look>.json).
 */

const NOW = new Date("2026-11-13T18:00:00Z");

// Studio's own words (the looks' names).
const WORDS = { en: studioEn, ar: studioAr, tr: studioTr };

const LOOKS = STUDIO_DEMO_TYPES.flatMap((demo) => signatureLooksOf(demo).map((look) => [demo, look] as [StudioDemoId, SignatureLook]));

function projectApp(id: StudioDemoId): App {
  const kind = demoKind(id);
  return { ...newApp("client", null, NOW, kind.engine, kind.vertical), section: "studio", backend: "hosted", appName: DEMO_BRANDS[id].appName, primaryColor: DEMO_BRANDS[id].primaryColor };
}

function contextOf(app: App, lang: "en" | "ar" | "tr" = "en"): SectionContext {
  // The same ids each time, so the pictures' project stays the same until the look changes.
  let n = 0;
  return { brand: app.primaryColor, source: itemSourcesFor(app)[0] ?? null, app: app.appName!, lang, w: appWords(lang, app.appName!), picture: (f) => `${appUrl()}/design-pictures/${f}`, newId: () => `sig-${++n}` };
}

/** A new project from the look's template, as /start and Studio make it. */
function started(demo: StudioDemoId, look: SignatureLook, lang: "en" | "ar" | "tr" = "en") {
  const app = projectApp(demo);
  const template = studioDemoTemplate(demo, look);
  const layout = startLayout(app, template, defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), NOW, contextOf(app, lang));
  return { app, template, layout };
}

const texts = (page: StudioPage) => allNodes(page).flatMap((n) => [n.text, n.title].filter((x): x is string => Boolean(x)));

describe("130 the Signature looks: one registry, eighteen looks", () => {
  it("has looks A and B for each of the nine Studio demos, one template of its kind each, named in Studio's three languages", () => {
    expect(LOOKS).toHaveLength(18);
    for (const demo of STUDIO_DEMO_TYPES) expect(signatureLooksOf(demo), demo).toEqual(["a", "b"]);
    expect(signatureDesigns().map((d) => `${d.demo}_signature_${d.variant}`).sort()).toEqual(LOOKS.map(([demo, look]) => `${demo}_signature_${look}`).sort());
    for (const [demo, look] of LOOKS) {
      const id = `${demo}_signature_${look}`;
      const design = signatureDesign(demo, look)!;
      expect(design, id).toMatchObject({ demo, variant: look, template: { id } });
      const template = TEMPLATES.find((t) => t.id === id);
      expect(template, id).toMatchObject({ demo, look, recommended: true });
      expect(TEMPLATES.filter((t) => t.id === id), id).toHaveLength(1);
      const kind = demoKind(demo);
      expect(templatesFor({ type: kind.engine, vertical: kind.vertical }).map((t) => t.id)).toContain(id);
      for (const lang of ["en", "ar", "tr"] as const) expect(String((WORDS[lang] as unknown as Record<string, string>)[`tpl_${id}`] ?? ""), `${lang} tpl_${id}`).not.toBe("");
      // A look is a whole app of its own: never a page of a whole design's look.
      expect(designsFor({ type: kind.engine, vertical: kind.vertical }).flatMap((d) => d.templates)).not.toContain(id);
    }
  });

  it("makes every demo's look A the demo: its home, bar, screens and chrome", () => {
    for (const demo of STUDIO_DEMO_TYPES) {
      expect(DEMO_HOME_TEMPLATES[demo]).toBe(`${demo}_signature_a`);
      expect(studioDemoDesign(demo)).toEqual(signatureDesign(demo, "a"));
      expect(demoTabBar(demo)).toEqual(signatureDesign(demo, "a")!.bar);
      expect(demoStudioScreens(demo, appUrl())).toEqual(demoStudioScreens(demo, appUrl(), "a"));
      expect(studioDemoTemplate(demo).id === `${demo}_signature_a` || studioDemoTemplate(demo).demo === demo, demo).toBe(true);
    }
  });

  it.each(LOOKS)("%s look %s: the whole app in the look, a layout the platform takes", (demo, look) => {
    const { app, template, layout } = started(demo, look);
    const design = signatureDesign(demo, look)!;
    expect(template.id).toBe(`${demo}_signature_${look}`);
    const checked = parseLayoutContent(layout, { app, now: NOW });
    expect(checked.ok ? [] : checked.errors).toEqual([]);
    // Its premium bar: never the classic one.
    expect(layout.tab_bar).toEqual(design.bar);
    expect(TAB_BAR_DESIGNS).toContain(design.bar.design);
    expect(design.bar.design).not.toBe("classic");
    // The home is the look's, every tab's page and every screen's after it in the look's colours.
    const [home, ...rest] = layout.pages;
    expect(home!.slug).toBe("home");
    const designed = rest.filter((p) => p.studio?.header);
    expect(designed.length).toBeGreaterThan(2);
    const { style: _style, ...colours } = design.look!.header as StudioHeader;
    void _style;
    for (const p of designed) expect(p.studio!.header, p.slug).toMatchObject(colours);
    // Its tabs open the look's pages.
    for (const tab of layout.tabs) if (tab.target.type === "page") expect(layout.pages.some((p) => p.slug === tab.target.page_slug), tab.id).toBe(true);
    // Live parts are the signed-in person's: nothing of theirs signed out.
    for (const node of allNodes(home!.studio!).filter((n) => n.type === "tracking" && !["nearby_taxis"].includes(n.tracking?.kind ?? ""))) expect(node.visibility, node.id).toBe("signed_in");
  });

  it.each(LOOKS)("%s look %s: premium chrome on every page, kept as the platform saves it, and premium system screens", (demo, look) => {
    const { app, layout } = started(demo, look);
    const design = signatureDesign(demo, look)!;
    const checked = parseLayoutContent(layout, { app, now: NOW });
    if (!checked.ok) throw new Error(checked.errors.join("; "));
    for (const page of checked.value.pages) {
      const header = page.studio?.header;
      if (!header) continue;
      // The home's header over its cover (and the greeting) is the board's own; every other header premium.
      if (page.slug === "home" && (header.type === "transparent" || header.type === "greeting")) continue;
      expect(STUDIO_HEADER_STYLES, `${page.slug} (${header.type})`).toContain(header.style);
      if (page.slug === "home") expect(header.style).toBe(design.chrome.home ?? design.chrome.header);
    }
    expect(checked.value.pages.filter((p) => p.slug !== "home" && p.studio?.header?.style === design.chrome.header).length).toBeGreaterThan(2);
    // The sign-in screen, the account menu and the system screens in the look.
    const screens = demoStudioScreens(demo, appUrl(), look);
    expect(parseStudioScreens(screens).problems).toEqual([]);
    expect(screens.system?.look).toBe(design.chrome.system);
    for (const screen of SYSTEM_SCREENS) expect(systemLookFor(parseStudioScreens(screens).screens.system, screen), screen).toBe(design.chrome.system);
    if (design.chrome.system === "photo") expect(screens.system?.image_url).toBe(screens.sign_in?.image_url);
    expect(screens.sign_in?.image_url).toMatch(/^https?:\/\//);
    for (const lang of ["en", "ar", "tr"] as const) expect(screens.sign_in?.title[lang]).toBeTruthy();
  });

  it.each(LOOKS)("%s look %s: every word in Studio's three languages", (demo, look) => {
    // Made in Arabic, its words are Arabic, with English and Turkish as translations.
    const { layout } = started(demo, look, "ar");
    const home = layout.pages[0]!.studio!;
    const words = allNodes(home).filter((n): n is StudioNode & { text: string } => n.type === "text" && Boolean(n.text) && /[؀-ۿ]/u.test(n.text!));
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
