import { describe, expect, it } from "vitest";
import { ar as studioAr, en as studioEn, tr as studioTr } from "@/i18n/dashboard/studio";
import { newApp } from "@/lib/app/setup";
import { demoKind, type StudioDemoId } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import type { App } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { itemSourcesFor } from "@/lib/pages/sources";
import type { LayoutContent, StudioNode } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import { signatureDesign, signatureDesigns, signatureLooksOf } from "@/lib/studio/demo-designs";
import type { SignatureDesign } from "@/lib/studio/demo-designs/signature";
import { appWords } from "@/lib/studio/app-words";
import { TEMPLATES, templatesFor, type SectionContext } from "@/lib/studio/sections";
import { startLayout } from "@/lib/studio/start";
import { allNodes } from "@/lib/studio/tree";

/**
 * 130.13–130.18 The Signature looks of Nakhla School, Rawaq Academy and Ufuq
 * Academy: each a real template of its kind that starts a whole project in
 * the look (its home, every page after it, its tabs, its premium bar, its
 * sign-in and account menu), valid as the app API takes it, in Studio's
 * three languages. (The projects the app's screenshots draw:
 * tests/unit/signature-looks.test.ts, for all 18.)
 */

const NOW = new Date("2026-11-13T07:00:00Z");
const MINE: StudioDemoId[] = ["school", "instructors", "premium_academy"];
const LOOKS: SignatureDesign[] = signatureDesigns().filter((d) => MINE.includes(d.demo));
const idOf = (d: SignatureDesign) => d.template.id;
const lookOf = (id: string) => LOOKS.find((d) => idOf(d) === id)!;

function projectApp(demo: StudioDemoId): App {
  const kind = demoKind(demo);
  return { ...newApp("client", null, NOW, kind.engine, kind.vertical), section: "studio", backend: "hosted", appName: DEMO_BRANDS[demo].appName, primaryColor: DEMO_BRANDS[demo].primaryColor };
}

function context(app: App, lang: "en" | "ar" | "tr" = "en"): SectionContext {
  // Ids counted from one, so the project is the same each time it is made.
  let n = 0;
  return { brand: app.primaryColor, source: itemSourcesFor(app)[0] ?? null, app: app.appName!, lang, newId: () => `sig-${++n}`, w: appWords(lang, app.appName!), picture: (f) => `${appUrl()}/design-pictures/${f}` };
}

function projectOf(id: string, lang: "en" | "ar" | "tr" = "en"): { app: App; layout: LayoutContent } {
  const look = lookOf(id);
  const app = { ...projectApp(look.demo), primaryColor: look.project.primary ?? DEMO_BRANDS[look.demo].primaryColor, design: id };
  const template = TEMPLATES.find((t) => t.id === id)!;
  const ready = { ...defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), languages: { default: lang, available: ["en", "ar", "tr"].sort((a, b) => (a === lang ? -1 : b === lang ? 1 : 0)) } };
  return { app, layout: startLayout(app, template, ready, NOW, context(app, lang), null) };
}

describe("130.13–130.18 the Signature looks of Nakhla School, Rawaq Academy and Ufuq Academy", () => {
  it("has two looks for each, A and B", () => {
    for (const demo of MINE) {
      expect(signatureLooksOf(demo), demo).toEqual(["a", "b"]);
      for (const look of ["a", "b"] as const) expect(idOf(signatureDesign(demo, look)!)).toBe(`${demo}_signature_${look}`);
    }
  });

  it.each(LOOKS.map(idOf))("%s is a template of its kind, named in Studio's languages, first with its demo", (id) => {
    const look = lookOf(id);
    const kind = { type: demoKind(look.demo).engine, vertical: demoKind(look.demo).vertical };
    const list = templatesFor(kind).filter((t) => t.demo === look.demo);
    expect(list.map((t) => t.id)).toContain(id);
    // Its name, and what it is in App setup's Branding.
    for (const words of [studioEn, studioAr, studioTr]) for (const key of [`tpl_${id}`, `tplText_${id}`]) expect(String((words as Record<string, unknown>)[key] ?? ""), key).not.toBe("");
  });

  it.each(LOOKS.map(idOf))("%s starts a whole project in its look, valid as the app API takes it", (id) => {
    const look = lookOf(id);
    const { app, layout } = projectOf(id);
    const parsed = parseLayoutContent(layout, { app, now: NOW });
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    // Its premium bar, never the classic bar across the bottom.
    expect(layout.tab_bar).toEqual(look.bar);
    expect(layout.tab_bar?.design).not.toBe("classic");
    // Every page with a header has the look's premium header; the home its own.
    const home = layout.pages.find((p) => p.slug === "home")!.studio!;
    // The home's header over its cover and its greeting are the board's own; another one in the look's premium style.
    if (home.header && home.header.type !== "transparent" && home.header.type !== "greeting") expect(home.header.style).toBe(look.chrome.home ?? look.chrome.header);
    for (const p of layout.pages.filter((x) => x.slug !== "home" && x.studio?.header)) expect(p.studio!.header!.style, p.slug).toBe(look.chrome.header);
    // The pages after the home on the look's paper.
    const school = layout.pages.find((p) => p.studio?.screen && p.studio.header)!;
    expect(school.studio!.background).toBe(look.look!.background);
    // Its texts in Studio's other languages too.
    const missing = allNodes(home).filter((n: StudioNode) => n.text && !n.translations && /[a-z]/.test(n.text));
    expect(missing.map((n) => n.text)).toEqual([]);
  });

  it.each(LOOKS.map(idOf))("%s is made in Arabic too", (id) => {
    const { app, layout } = projectOf(id, "ar");
    const parsed = parseLayoutContent(layout, { app, now: NOW });
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
  });
});
