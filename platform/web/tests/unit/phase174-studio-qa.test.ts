import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { CouponCanvas, FlashSaleCanvas, COMMERCE_WORDS_EN } from "@/components/studio/commerce";
import { pickableCommerce, type Pickable } from "@/lib/hosted/pages/pickable";
import { layoutPlaceholders, loadLayout, publishLayout, saveDraft, storeFactsOf, withoutStrings, withFreshTranslations } from "@/lib/pages/layout";
import { placeholdersIn } from "@/lib/pages/template-translations";
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

describe("174.5 every template [placeholder] still on a page is listed, as the app leaves it out", () => {
  it("Leqaa's Kind words: the review still to write, on Home, with the element to select", async () => {
    const app = await leqaa();
    const draft = await editorDraft(app);
    const spots = layoutPlaceholders(draft, app);
    const quotes = homeNodes(draft).find((n) => n.type === "testimonials")!;
    const kind = spots.find((s) => s.slug === "home" && s.id === quotes.id);
    expect(kind?.words).toEqual(expect.arrayContaining(["[Another customer's words]"]));
    // Each one listed is one the app leaves out: none of them is served.
    const served = JSON.stringify(withFreshTranslations({ version: "1", ...draft }, app));
    for (const spot of spots) for (const word of spot.words) expect(served, word).not.toContain(word);
    // Written by the owner: gone from the list.
    quotes.entries = quotes.entries!.map((e) => ({ ...e, text: "Lovely roses.", title: "Salma", subtitle: undefined, translations: undefined }));
    expect(layoutPlaceholders(draft, app).find((s) => s.id === quotes.id)).toBeUndefined();
  });

  it("the store's cut-off fills its placeholder, a hidden element and an entry's bound sample aren't listed", () => {
    const layout = {
      pages: [
        {
          slug: "home",
          studio: {
            header: { type: "logo", title: "[Your offer here]" },
            body: {
              id: "root",
              type: "column",
              children: [
                { id: "cut", type: "text", text: "Order before [your cut-off time]" },
                { id: "gone", type: "text", text: "[Customer name]", hidden: true },
                { id: "list", type: "items", card: { id: "card", type: "column", children: [{ id: "t", type: "text", text: "[Customer name]", bind: "title" }, { id: "own", type: "text", text: "[Your area]" }] } },
              ],
            },
          },
        },
      ],
    };
    const spots = placeholdersIn(layout, { cutoff: "14:00" });
    expect(spots).toEqual([
      { slug: "home", id: null, words: ["[Your offer here]"] },
      { slug: "home", id: "list", words: ["[Your area]"] },
    ]);
    expect(placeholdersIn(layout, {}).some((s) => s.id === "cut")).toBe(true);
    expect(storeFactsOf({ demo: false })).toEqual({ cutoff: null, ownBusiness: true });
  });
});

describe("174.6 the canvas's sample sale and coupon are marked, in the shop's currency", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any of the two canvases, with its props
  const draw = (el: (props: any) => ReactElement, props: Record<string, unknown>) => renderToStaticMarkup(createElement(el, props));
  const empty: Pickable = { items: {}, categories: {} };

  it("a coupon showing the shop's coupon, with none in the shop: a sample (the app leaves it out)", () => {
    const node: StudioNode = { id: "c", type: "coupon", code: "LEQAA10", coupon: { bind: "public" } };
    const html = draw(CouponCanvas, { node, pickable: empty, dark: false, brand: "#C2185B", color: null, words: COMMERCE_WORDS_EN });
    expect(html).toContain("data-studio-coupon-sample");
    expect(html).toContain("Sample");
    // The shop's own coupon: drawn, no mark.
    const own = draw(CouponCanvas, { node, pickable: { ...empty, commerce: { flashSales: [], coupons: [{ code: "KECH15", percentOff: 15, amountOff: null, minOrder: null, endsAt: null }], giftMessages: {} } }, dark: true, brand: "#C2185B", color: null, words: COMMERCE_WORDS_EN });
    expect(own).toContain("KECH15");
    expect(own).not.toContain("data-studio-sample");
    // A code of the owner's own (not bound): theirs, no mark.
    expect(draw(CouponCanvas, { node: { ...node, coupon: undefined }, pickable: empty, dark: false, brand: "#C2185B", color: null, words: COMMERCE_WORDS_EN })).not.toContain("data-studio-sample");
  });

  it("a flash sale with none on: sample prices in the shop's currency (MAD), never ₺, and marked", async () => {
    const app = await leqaa();
    const commerce = await pickableCommerce(store, { ...app, catalogSettings: { ...(app.catalogSettings ?? {}), currency: "MAD" } } as App, NOW);
    expect(commerce?.samplePrices?.now).toMatch(/MAD/);
    const node: StudioNode = { id: "f", type: "flash_sale", flash_sale: { look: "grid" } };
    const html = draw(FlashSaleCanvas, { node, title: "", pickable: { ...empty, commerce }, dark: false, brand: "#C2185B", words: COMMERCE_WORDS_EN });
    expect(html).toContain(commerce!.samplePrices!.now);
    expect(html).not.toContain("₺");
    expect(html).toContain("data-studio-sample");
  });
});

describe("174.7 and 174 the inspector's entries", () => {
  const source = readFileSync(join(__dirname, "..", "..", "src", "app", "studio", "editor", "premium-controls.tsx"), "utf8");
  it("a review's Stars show the 5 the canvas and the app draw while unset", () => {
    expect(source).toMatch(/pm_stars", min: 0, max: 5, step: 1, unit: "★", unset: 5/);
    expect(source).toContain("value={e.value ?? spec.value.unset ?? 0}");
  });
  it("a new entry is written with the templates' [placeholders], never \"…\"", () => {
    expect(source).not.toMatch(/: "…"/);
  });
});
