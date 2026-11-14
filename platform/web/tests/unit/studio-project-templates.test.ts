import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { en as appEn } from "@/lib/studio/app-words";
import { kindById } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { loadLayout } from "@/lib/pages/layout";
import { sampleTotal } from "@/lib/samples/lists";
import { ACADEMY_PROJECT } from "@/lib/studio/academy";
import { makeStudioProject } from "@/lib/studio/new-project";
import { kindOfChoice, premiumAcademyChoice, templateAfterChoice } from "@/lib/studio/new-choices";
import { applyProjectTemplate, chosenProjectDesign, projectDesignId, projectTemplateOf, projectTemplatePicture, projectTemplatesFor } from "@/lib/studio/project-templates";
import { TEMPLATES, type SectionWord } from "@/lib/studio/sections";

/**
 * 124.6 The premium academy (a Studio template for the whole project) in
 * App setup's Branding step: offered to a Studio academy only, first; taken
 * whole, the project is what a new project from the template is (its pages,
 * tabs, bar, look and screens, and sample entries for its lists); its look
 * only changes the look alone. And /studio/new's "Premium academy" choice:
 * the Academy kind with the template picked.
 */

// The sample entries' pictures go to a folder of their own.
const BLOBS = mkdtempSync(join(tmpdir(), "studio-project-templates-"));
process.env.YALLAPP_BLOBS_DIR = BLOBS;
afterAll(() => rmSync(BLOBS, { recursive: true, force: true }));

const NOW = new Date("2026-11-12T10:00:00Z");
const TEMPLATE = TEMPLATES.find((t) => t.id === "academy_premium")!;
const BLANK = TEMPLATES.find((t) => t.id === "blank")!;
const words = (name: string) => ({ w: (word: SectionWord) => String(appEn[word]).replaceAll("{app}", name), lang: "en" as const });

let store: MemoryStore;
let n = 0;
beforeEach(() => {
  store = new MemoryStore();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

async function client(): Promise<string> {
  n += 1;
  const { client } = await registerClient(store, { name: "Nour Academy", email: `nour-${n}@academy.test`, whatsapp: "+905446731942", siteUrl: "https://nour.academy", password: null }, NOW);
  return client.id;
}

/** A Studio project of a kind, its content kept in Yallapp, started from `template`. */
async function project(kind: string, template = BLANK): Promise<App> {
  return makeStudioProject(store, { clientId: await client(), name: "Nour Academy", kind: kindById(kind)!, source: "catalog", template, words: words("Nour Academy").w, lang: "en" }, NOW);
}

describe("124.6 the premium academy in App setup", () => {
  it("is offered to a Studio academy only: not to a regular academy, an academy of many teachers or another kind", async () => {
    const studio = await project("academy");
    // 130.17 130.18 Ufuq Academy's Signature looks too, first.
    expect(projectTemplatesFor(studio).map((t) => t.id)).toEqual(["premium_academy_signature_a", "premium_academy_signature_b", "academy_premium"]);
    expect(projectTemplateOf(studio, "studio-academy_premium")?.id).toBe("academy_premium");
    expect(projectDesignId("academy_premium")).toBe("studio-academy_premium");
    expect(projectTemplatePicture(TEMPLATE)).toBe("/screens/premium-home.png");
    const regular: App = newApp("c", null, NOW, "lms", null);
    expect(projectTemplatesFor(regular)).toEqual([]);
    expect(projectTemplateOf(regular, "studio-academy_premium")).toBeNull();
    // 130.15 130.16 An academy of many teachers gets Rawaq Academy's Signature looks.
    expect(projectTemplatesFor(await project("instructors")).map((t) => t.id)).toEqual(["instructors_signature_a", "instructors_signature_b"]);
    expect(projectTemplatesFor(await project("store"))).toEqual([]);
    // A page design's id or a made-up one isn't a template.
    expect(projectTemplateOf(studio, "academy-kids")).toBeNull();
    expect(projectTemplateOf(studio, "studio-blank")).toBeNull();
  });

  it("taken whole, makes the project a new project from the template is, in the colour just chosen", async () => {
    const app = { ...(await project("academy")), primaryColor: "#7A1F3D" };
    expect(chosenProjectDesign(app)).toBeNull();
    const saved = await applyProjectTemplate(store, app, TEMPLATE, NOW, words("Nour Academy"));
    expect(saved.ok ? [] : saved.errors).toEqual([]);
    const after = (await store.getAppById(app.id))!;
    expect(after.design).toBe("academy_premium");
    expect(chosenProjectDesign(after)).toBe("studio-academy_premium");
    expect(after.hostedSettings?.studioScreens).toEqual(ACADEMY_PROJECT.screens(appUrl()));
    const draft = (await loadLayout(store, after, NOW)).draft;
    // As a project made from the template: its pages, tabs (the Blog from the sign-up website), bar and look.
    const made = await project("academy", TEMPLATE);
    const fresh = (await loadLayout(store, made, NOW)).draft;
    // Which App setup shows as chosen there too.
    expect(chosenProjectDesign((await store.getAppById(made.id))!)).toBe("studio-academy_premium");
    expect(draft.pages.map((p) => p.slug)).toEqual(fresh.pages.map((p) => p.slug));
    expect(draft.tabs.map((t) => t.id)).toEqual(["home", "courses", "blog", "learning", "account"]);
    expect(draft.tabs).toEqual(fresh.tabs);
    expect(draft.tab_bar).toEqual(fresh.tab_bar);
    // 128.8 The approved bar: a floating navy pill, the open tab on gold.
    expect(draft.tab_bar).toMatchObject({ design: "float", margin: 12, radius: 22, background: "#1D2B4F", dark_background: "#EEF0F7", active: "#E6C26E", labels: "active" });
    expect(draft.appearance).toMatchObject(ACADEMY_PROJECT.appearance);
    const home = draft.pages.find((p) => p.slug === "home")!.studio!;
    expect(home.header).toMatchObject({ type: "greeting" });
    // The banner in the colour the owner chose.
    expect(JSON.stringify(home.body)).toContain("#7A1F3D");
    // Its lists get sample entries.
    expect(await sampleTotal(store, after)).toBeGreaterThan(0);
  });

  it("its look only: the look changes, the pages, tabs, screens and design stay", async () => {
    const app = await project("academy");
    const before = (await loadLayout(store, app, NOW)).draft;
    const saved = await applyProjectTemplate(store, app, TEMPLATE, NOW, words("Nour Academy"), { mode: "look" });
    expect(saved.ok).toBe(true);
    const after = (await store.getAppById(app.id))!;
    const draft = (await loadLayout(store, after, NOW)).draft;
    expect(draft.pages).toEqual(before.pages);
    expect(draft.tabs).toEqual(before.tabs);
    expect(draft.tab_bar).toEqual(before.tab_bar);
    expect(draft.appearance).toMatchObject(ACADEMY_PROJECT.appearance);
    expect(after.design ?? null).toBe(app.design ?? null);
    expect(after.hostedSettings?.studioScreens ?? null).toEqual(app.hostedSettings?.studioScreens ?? null);
  });

  it("takes the Branding step's template and font last", async () => {
    const app = await project("academy");
    await applyProjectTemplate(store, app, TEMPLATE, NOW, words("Nour Academy"), { look: { template: "bold", font: "DM Sans" } });
    const draft = (await loadLayout(store, app, NOW)).draft;
    expect(draft.appearance.template).toBe("bold");
    expect(draft.appearance.font).toBe("DM Sans");
    expect(draft.appearance.font_family).toBeUndefined();
  });
});

describe("124.6 the premium academy among the Studio projects", () => {
  const academy = { id: "academy", name: "Academy", icon: "school", sources: [] };

  it("is the Academy kind with the template picked, under its own id", () => {
    const choice = premiumAcademyChoice(academy, "Premium academy", "A full design")!;
    expect(choice).toMatchObject({ id: "academy_premium", kind: "academy", template: "academy_premium", icon: "workspace_premium", name: "Premium academy", text: "A full design", soon: false });
    // The form sends the real kind.
    expect(kindOfChoice(choice)).toBe("academy");
    expect(kindOfChoice(academy)).toBe("academy");
    expect(kindOfChoice(null)).toBeNull();
    // Only a kind with the template has it.
    expect(premiumAcademyChoice({ ...academy, id: "store" }, "x", "y")).toBeNull();
    expect(premiumAcademyChoice({ ...academy, id: "instructors" }, "x", "y")).toBeNull();
  });

  it("picks its template; another choice after it starts from that kind's own, and other choices keep the pick", () => {
    const choice = premiumAcademyChoice(academy, "Premium academy", "A full design")!;
    expect(templateAfterChoice(choice, null, null)).toBe("academy_premium");
    expect(templateAfterChoice(choice, academy, "courses")).toBe("academy_premium");
    expect(templateAfterChoice(academy, choice, "academy_premium")).toBeNull();
    expect(templateAfterChoice(academy, { id: "store" }, "courses")).toBe("courses");
  });
});
