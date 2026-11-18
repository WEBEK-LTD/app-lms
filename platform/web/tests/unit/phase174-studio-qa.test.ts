import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { loadLayout, publishLayout, saveDraft, withoutStrings } from "@/lib/pages/layout";
import { STUDIO_LIMITS, STUDIO_PILL_RADIUS, type LayoutContent, type StudioNode } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";
import { PLAN_INFO } from "@/lib/plans";
import { appWords } from "@/lib/studio/app-words";
import { makeStudioProject } from "@/lib/studio/new-project";
import { TEMPLATES } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";

/**
 * 174 The Studio QA of 18 November (Leqaa's Rose hour and Botanical press
 * looks; Leqaa and Kech Flora).
 */

const BLOBS = mkdtempSync(join(tmpdir(), "phase174-"));
process.env.YALLAPP_BLOBS_DIR = BLOBS;
afterAll(() => rmSync(BLOBS, { recursive: true, force: true }));

const NOW = new Date("2026-11-18T10:00:00Z");
const LATER = new Date("2026-11-18T10:05:00Z");
const LEQAA_A = TEMPLATES.find((t) => t.id === "flowers_signature_a")!;

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

async function leqaa(): Promise<App> {
  const { client } = await registerClient(store, { name: "Leqaa", email: "owner@leqaa.test", whatsapp: "+212600000000", siteUrl: "", password: null }, NOW);
  const made = await makeStudioProject(store, { clientId: client.id, name: "Leqaa", kind: kindById("store")!, source: "catalog", template: LEQAA_A, words: appWords("en", "Leqaa"), lang: "en", languages: { default: "en", available: ["en", "ar", "tr"] } }, NOW);
  return (await store.getAppById(made.id))!;
}

async function editorDraft(app: App): Promise<LayoutContent> {
  return JSON.parse(JSON.stringify(withoutStrings((await loadLayout(store, app, NOW)).draft))) as LayoutContent;
}

function homeNodes(draft: LayoutContent): StudioNode[] {
  return allNodes(draft.pages.find((p) => p.slug === "home")!.studio!);
}

describe("174.1 Pill corners save, and saved 999s are repaired", () => {
  it("Pill is a value the server accepts", () => {
    expect(STUDIO_PILL_RADIUS).toBeLessThanOrEqual(STUDIO_LIMITS.maxRadius);
  });

  it("a draft holding the old 999 (radius and each corner) saves, as the largest corners, and publishes", async () => {
    const app = await leqaa();
    const draft = await editorDraft(app);
    const texts = homeNodes(draft).filter((n) => n.type === "text");
    const [pill, corners] = [texts[0]!, texts[1]!];
    pill.radius = 999;
    corners.corners = { top_start: 999, top_end: 12, bottom_end: 100000, bottom_start: 0 };
    const saved = await saveDraft(store, app, draft, LATER);
    expect(saved.ok ? [] : saved.errors).toEqual([]);
    const back = homeNodes((await loadLayout(store, app, LATER)).draft);
    expect(back.find((n) => n.id === pill.id)!.radius).toBe(STUDIO_PILL_RADIUS);
    expect(back.find((n) => n.id === corners.id)!.corners).toEqual({ top_start: STUDIO_PILL_RADIUS, top_end: 12, bottom_end: STUDIO_PILL_RADIUS });
    // A later edit is kept too: nothing is stuck.
    const next = await editorDraft(app);
    homeNodes(next).find((n) => n.id === pill.id)!.text = "QA after pill";
    expect((await saveDraft(store, app, next, LATER)).ok).toBe(true);
    expect(homeNodes((await loadLayout(store, app, LATER)).draft).find((n) => n.id === pill.id)!.text).toBe("QA after pill");
    const published = await publishLayout(store, app, next, "owner@leqaa.test", LATER, PLAN_INFO.studio_1);
    expect(published.ok ? [] : published.errors).toEqual([]);
  });

  it("corners below 0 or not a number are still refused", () => {
    const page = (radius: unknown) => ({ body: { id: "root", type: "column", children: [{ id: "a", type: "text", text: "Hi", radius }] } });
    const app = { appType: "store", backend: "catalog", vertical: null } as unknown as App;
    const langs = { default: "en", available: ["en"] } as const;
    expect(parseStudioPage(page(-4), app, { ...langs, available: [...langs.available] }).ok).toBe(false);
    expect(parseStudioPage(page("pill"), app, { ...langs, available: [...langs.available] }).ok).toBe(false);
    const ok = parseStudioPage(page(999), app, { ...langs, available: [...langs.available] });
    expect(ok.ok ? [] : ok.errors).toEqual([]);
    expect(ok.ok && ok.value.body.children![0]!.radius).toBe(STUDIO_PILL_RADIUS);
  });
});
