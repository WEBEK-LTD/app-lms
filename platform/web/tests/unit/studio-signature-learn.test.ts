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
import { parseLayoutContent } from "@/lib/pages/validate";
import { signatureLook, signatureLooksOf } from "@/lib/studio/demo-designs/signatures";
import { withDemoFacts } from "@/lib/studio/demo-templates";
import { TEMPLATES, templatesFor, type SectionContext, type SectionWord } from "@/lib/studio/sections";
import { startLayout } from "@/lib/studio/start";
import { allNodes } from "@/lib/studio/tree";

/**
 * 130.13–130.18 The Signature looks of Nakhla School, Rawaq Academy and Ufuq
 * Academy: each a real template of its kind that starts a whole project in
 * the look (its home, every page after it, its tabs, its premium bar, its
 * sign-in and account menu), valid as the app API takes it, in Studio's
 * three languages. Each look's project is also what the app's screenshots
 * draw (mobile/test/support/<brand>_sig_<a|b>.json).
 */

const NOW = new Date("2026-11-13T07:00:00Z");
const MINE: StudioDemoId[] = ["school", "instructors", "premium_academy"];
const BRAND: Record<string, string> = { school: "nakhla", instructors: "rawaq", premium_academy: "ufuq" };
const LOOKS = MINE.flatMap((d) => signatureLooksOf(d));

function projectApp(demo: StudioDemoId): App {
  const kind = demoKind(demo);
  return { ...newApp("client", null, NOW, kind.engine, kind.vertical), section: "studio", backend: "hosted", appName: DEMO_BRANDS[demo].appName, primaryColor: DEMO_BRANDS[demo].primaryColor };
}

function context(app: App, lang: "en" | "ar" | "tr" = "en"): SectionContext {
  const words = { en: studioEn, ar: studioAr, tr: studioTr }[lang];
  // Ids counted from one, so the project is the same each time it is made.
  let n = 0;
  return { brand: app.primaryColor, source: itemSourcesFor(app)[0] ?? null, app: app.appName!, lang, newId: () => `sig-${++n}`, w: (word: SectionWord) => String(words[`w_${word}`]).replaceAll("{app}", app.appName!), picture: (f) => `${appUrl()}/design-pictures/${f}` };
}

function projectOf(id: string, lang: "en" | "ar" | "tr" = "en"): { app: App; layout: LayoutContent } {
  const look = signatureLook(id)!;
  const app = { ...projectApp(look.demo), primaryColor: look.project.primary, design: id };
  const template = TEMPLATES.find((t) => t.id === id)!;
  const ready = { ...defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), languages: { default: lang, available: ["en", "ar", "tr"].sort((a, b) => (a === lang ? -1 : b === lang ? 1 : 0)) } };
  return { app, layout: startLayout(app, template, ready, NOW, context(app, lang), null) };
}

describe("130.13–130.18 the Signature looks of Nakhla School, Rawaq Academy and Ufuq Academy", () => {
  it("has two looks for each, A and B", () => {
    for (const demo of MINE) expect(signatureLooksOf(demo).map((l) => l.id), demo).toEqual([`${demo}_signature_a`, `${demo}_signature_b`].filter((x) => signatureLook(x)));
  });

  it.each(LOOKS.map((l) => l.id))("%s is a template of its kind, named in Studio's languages, first among the kind's own", (id) => {
    const look = signatureLook(id)!;
    const kind = { type: demoKind(look.demo).engine, vertical: demoKind(look.demo).vertical };
    const list = templatesFor(kind).filter((t) => !t.demo);
    expect(list.slice(0, signatureLooksOf(look.demo).length).map((t) => t.id)).toContain(id);
    for (const words of [studioEn, studioAr, studioTr]) expect(String((words as Record<string, unknown>)[`tpl_${id}`] ?? "")).not.toBe("");
  });

  it.each(LOOKS.map((l) => l.id))("%s starts a whole project in its look, valid as the app API takes it", (id) => {
    const look = signatureLook(id)!;
    const { app, layout } = projectOf(id);
    const parsed = parseLayoutContent(layout, { app, now: NOW });
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    // Its premium bar, never the classic bar across the bottom.
    expect(layout.tab_bar).toEqual(look.project.tab_bar);
    expect(layout.tab_bar?.design).not.toBe("classic");
    // Every page with a header has the look's premium header; the home its own.
    const home = layout.pages.find((p) => p.slug === "home")!.studio!;
    expect(home.header?.style).toBe(look.chrome.home);
    for (const p of layout.pages.filter((x) => x.slug !== "home" && x.studio?.header)) expect(p.studio!.header!.style, p.slug).toBe(look.chrome.header);
    // The pages after the home on the look's paper.
    const school = layout.pages.find((p) => p.studio?.screen && p.studio.header)!;
    expect(school.studio!.background).toBe(look.design.look!.background);
    // Its texts in Studio's other languages too.
    const missing = allNodes(home).filter((n: StudioNode) => n.text && !n.translations && /[a-z]/.test(n.text));
    expect(missing.map((n) => n.text)).toEqual([]);
  });

  it.each(LOOKS.map((l) => l.id))("%s is made in Arabic too", (id) => {
    const { app, layout } = projectOf(id, "ar");
    const parsed = parseLayoutContent(layout, { app, now: NOW });
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
  });

  it.each(LOOKS.map((l) => l.id))("%s is the project the app's screenshots draw (mobile/test/support/<brand>_sig_<a|b>.json)", (id) => {
    const look = signatureLook(id)!;
    // As a project started from the demo on /start has it: the demo's own words in the template's brackets.
    const made = projectOf(id).layout;
    const layout = { ...made, pages: made.pages.map((p) => (p.studio ? { ...p, studio: withDemoFacts(look.demo, p.studio) } : p)) };
    const file = join(process.cwd(), "..", "..", "mobile", "test", "support", `${BRAND[look.demo]}_sig_${look.letter}.json`);
    const served = { ...layout, appearance: servedAppearance(layout.appearance, appUrl()) };
    const data = `${JSON.stringify({ screens: look.project.screens(appUrl()), layout: served }, null, 1)}\n`;
    if (process.env.YALLAPP_WRITE_SIGNATURE_LOOKS) writeFileSync(file, data);
    expect(readFileSync(file, "utf8")).toBe(data);
  });
});
