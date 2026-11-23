import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import type { BlobStore } from "@/lib/blobs";
import { MemoryStore } from "@/lib/data/memory";
import type { App, MarketTemplate } from "@/lib/data/types";
import { dashboardMessages, getDashT } from "@/i18n/dashboard";
import { isLocalizedPath, localePath } from "@/i18n/paths";
import { loadLayout, saveDraft } from "@/lib/pages/layout";
import type { StudioNode } from "@/lib/pages/types";
import { en as appEn } from "@/lib/studio/app-words";
import { makeStudioProject } from "@/lib/studio/new-project";
import { TEMPLATES, type SectionWord } from "@/lib/studio/sections";
import { automaticDiscounts, marketCatalog } from "@/lib/studio-market/catalog";
import { createDiscount } from "@/lib/studio-market/designer-discounts";
import { joinAsDesigner } from "@/lib/studio-market/designers";
import type { DiscountForm } from "@/lib/studio-market/discounts";
import { marketPrice } from "@/lib/studio-market/discounts";
import { bestValuePlan, knowLines, planChoices, planPrices, priceWords, soonestFlashEnd } from "@/lib/studio-market/listing";
import {
  continueHref,
  isPublicTemplate,
  MARKET_NEXT_COOKIE,
  marketItemListLd,
  marketNextPath,
  publicTemplate,
  publicTemplateSlugs,
  safeMarketNext,
  templatePath,
  templateProductLd,
  templateSitemapEntries,
} from "@/lib/studio-market/public";
import { decideReview } from "@/lib/studio-market/review";
import { sendForReview, startTemplate } from "@/lib/studio-market/templates";
import { robotsRules, sitemapEntries } from "@/lib/sitemap";
import { MARKET_WORD_KEYS, marketCatalogFor, marketT, marketWords } from "@/site/templates-words";
import { templatesText } from "@/site/templates-text";

/**
 * 106.13 Studio Market's public pages (/templates, /templates/<slug>): only
 * published templates of active designers (a draft, one in review, one sent
 * back with changes requested, one whose designer is suspended: not found
 * and not in the sitemap), their prices by the dashboard's rules (106.10,
 * 106.12), the sitemap's entries in each language, the JSON-LD (ItemList,
 * Product with an Offer per plan), the way back to the dashboard after
 * signing up, and the words in Modern Standard Arabic.
 */

const BLOBS = mkdtempSync(join(tmpdir(), "studio-market-public-"));
process.env.YALLAPP_BLOBS_DIR = BLOBS;
afterAll(() => rmSync(BLOBS, { recursive: true, force: true }));

class MemoryBlobs implements BlobStore {
  files = new Map<string, { data: Buffer; contentType: string }>();
  async put(key: string, data: Buffer, contentType: string) {
    this.files.set(key, { data, contentType });
  }
  async get(key: string) {
    return this.files.get(key) ?? null;
  }
  async delete(key: string) {
    this.files.delete(key);
  }
}

const NOW = new Date("2026-11-18T10:00:00Z");
const BASE = "https://yallapp.com.tr";
const BLANK = TEMPLATES.find((t) => t.id === "blank")!;
const words = (name: string) => (word: SectionWord) => String(appEn[word]).replaceAll("{app}", name);

let store: MemoryStore;
let blobs: MemoryBlobs;
let n = 0;

beforeEach(() => {
  store = new MemoryStore();
  blobs = new MemoryBlobs();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

async function designerAccount(name: string) {
  n += 1;
  const { client } = await registerClient(store, { name, email: `designer-${n}@public.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  const joined = await joinAsDesigner(store, { id: client.id }, { name, slug: `designer-${n}`, country: "TR", bio: "Calm shops.", terms: true }, NOW);
  if (!joined.ok) throw new Error("join");
  const app: App = await makeStudioProject(store, { clientId: client.id, name: `${name} project`, kind: kindById("store")!, source: "catalog", template: BLANK, words: words(name), lang: "en" }, NOW);
  const record = await loadLayout(store, app, NOW);
  const first = record.draft.pages.findIndex((x) => x.studio);
  const pages = record.draft.pages.map((p, i) => (i === first && p.studio ? { ...p, studio: { ...p.studio, body: { ...p.studio.body, children: [{ id: "t1", type: "text", text: "Hello" } as StudioNode] } } } : p));
  expect((await saveDraft(store, app, { ...record.draft, pages }, NOW)).ok).toBe(true);
  return { designer: joined.designer, app, client };
}

type Stage = "draft" | "in_review" | "changes_requested" | "published";

/** A template taken as far as `stage`: 3 months at $24 and lifetime at $149, or free. */
async function template(stage: Stage, options: { title?: string; free?: boolean; designer?: Awaited<ReturnType<typeof designerAccount>> } = {}) {
  const who = options.designer ?? (await designerAccount(`Studio ${n + 1}`));
  let t = await startTemplate(store, who.designer, who.app, NOW);
  const title = options.title ?? `Peony House ${n}`;
  await store.updateMarketTemplate(
    t.id,
    {
      texts: { en: { title, short: "Peonies, calmly.", description: "A flower shop." }, ar: { title: `بيت الفاوانيا ${n}`, short: "فاوانيا بهدوء.", description: "متجر زهور." } },
      screens: [(await loadLayout(store, who.app, NOW)).draft.pages.find((p) => p.studio)!.slug],
      free: options.free ?? false,
      plans: options.free ? [] : [
        { period: "3m", cents: 2400 },
        { period: "life", cents: 14900 },
      ],
    },
    NOW,
  );
  t = (await store.getMarketTemplate(t.id))!;
  if (stage === "draft") return { template: t, ...who };
  const sent = await sendForReview({ store, blobs, now: NOW, baseUrl: BASE }, t, who.app, { rights: true, note: "" }, "designer@public.test");
  if (!sent.ok) throw new Error(sent.message);
  if (stage === "in_review") return { template: (await store.getMarketTemplate(t.id))!, ...who };
  const decided = await decideReview(store, sent.template, { decision: stage === "published" ? "approved" : "changes_requested", notes: stage === "published" ? "" : "Fix the photo.", teamNote: "", checks: [] }, { email: "deniz@yallapp.test", name: "Deniz" }, NOW);
  if (!decided.ok) throw new Error("review");
  return { template: (await store.getMarketTemplate(t.id))!, ...who };
}

const form = (over: Partial<DiscountForm>): DiscountForm => ({ kind: "drop", offType: "percent", percent: "", amount: "", allPlans: true, plans: [], startsAt: "", endsAt: "", code: "", limit: "", zone: "UTC", ...over });

describe("106.13 which templates the website shows", () => {
  it("finds a published template, and none that isn't published, has no version or whose designer is suspended", async () => {
    const published = await template("published");
    const found = await publicTemplate(store, published.template.slug);
    expect(found?.template.id).toBe(published.template.id);
    expect(found?.version.id).toBe(published.template.currentVersionId);
    for (const stage of ["draft", "in_review", "changes_requested"] as const) {
      const other = await template(stage);
      expect(other.template.status).toBe(stage);
      expect(await publicTemplate(store, other.template.slug), stage).toBeNull();
      expect(isPublicTemplate(other.template, other.designer), stage).toBe(false);
    }
    // A slug that isn't one, or that nothing has.
    expect(await publicTemplate(store, "../admin")).toBeNull();
    expect(await publicTemplate(store, "no-such-template")).toBeNull();
    // The designer suspended: their templates leave the website.
    await store.updateTemplateDesigner(published.designer.id, { status: "suspended" }, NOW);
    expect(await publicTemplate(store, published.template.slug)).toBeNull();
    expect(await publicTemplateSlugs(store)).toEqual([]);
  });

  it("never gives the page a designer's account, email or payout details", async () => {
    const published = await template("published");
    const found = (await publicTemplate(store, published.template.slug))!;
    // 106.14 With the public page's own settings (the page shows the photo and line once approved, the country and links when chosen).
    expect(Object.keys(found.designer).sort()).toEqual([
      "bio",
      "clientId",
      "country",
      "createdAt",
      "id",
      "links",
      "name",
      "pageLockedAt",
      "pageLockedReason",
      "photoAssetId",
      "profileNote",
      "profileReview",
      "profileReviewedAt",
      "showCountry",
      "showLinks",
      "slug",
      "status",
      "termsAcceptedAt",
      "updatedAt",
    ]);
    // The JSON-LD names the designer by their public name only.
    const ld = JSON.stringify(templateProductLd(BASE, "en", { slug: found.template.slug, title: "Peony House", description: "", designer: found.designer.name, kinds: [], freeName: "Free", plans: [] }));
    expect(ld).toContain(found.designer.name);
    expect(ld).not.toContain(found.designer.clientId);
    expect(ld).not.toContain("@public.test");
    expect(ld).not.toContain(found.designer.country);
  });

  it("lists only published templates in the sitemap, each in English, Arabic and Turkish with hreflang", async () => {
    const one = await template("published", { title: "Alpha" });
    const two = await template("published", { title: "Beta" });
    const hidden = [await template("draft"), await template("in_review"), await template("changes_requested")];
    const slugs = await publicTemplateSlugs(store);
    expect(slugs.map((s) => s.slug).sort()).toEqual([one.template.slug, two.template.slug].sort());
    const entries = templateSitemapEntries(BASE, slugs);
    expect(entries).toHaveLength(6);
    const urls = entries.map((e) => e.url);
    for (const t of [one, two]) {
      for (const lang of ["", "/ar", "/tr"]) expect(urls).toContain(`${BASE}${lang}/templates/${t.template.slug}`);
    }
    for (const h of hidden) expect(urls.some((u) => u.includes(h.template.slug)), h.template.status).toBe(false);
    for (const entry of entries) {
      const languages = entry.alternates!.languages as Record<string, string>;
      expect(Object.keys(languages).sort()).toEqual(["ar", "en", "tr", "x-default"]);
      expect(Object.values(languages)).toContain(entry.url);
      expect(languages["x-default"]).toBe(languages.en);
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
    // The market itself is in the static list, in every language; its templates are localized pages.
    expect(sitemapEntries(BASE).map((e) => e.url)).toContain(`${BASE}/templates`);
    expect(isLocalizedPath("/templates")).toBe(true);
    expect(isLocalizedPath(templatePath("alpha-1"))).toBe(true);
    expect(localePath("ar", templatePath("alpha-1"))).toBe("/ar/templates/alpha-1");
    // robots: the market is open; the dashboard's checkout and the continue link aren't.
    const rules = robotsRules(BASE).rules;
    const disallow = (Array.isArray(rules) ? rules[0]! : rules).disallow as string[];
    expect(disallow.some((p) => "/templates".startsWith(p))).toBe(false);
    expect(disallow).toContain("/dashboard");
    expect(disallow).toContain("/api/");
  });
});

describe("106.13 the market's data, with the dashboard's price rules", () => {
  it("shows the cards' prices as the dashboard does, the flash sale's old price struck through", async () => {
    const paid = await template("published", { title: "Paid" });
    const freeOne = await template("published", { title: "Free one", free: true });
    const flash = await createDiscount(store, paid.designer, paid.template, form({ kind: "flash", percent: "25", endsAt: "2026-11-18T14:00" }), NOW);
    expect(flash.ok).toBe(true);
    const catalog = await marketCatalog(store, "ar", NOW);
    const card = catalog.cards.find((c) => c.slug === paid.template.slug)!;
    // 3 months at $24 is $8/mo; 25% off: $6/mo, $8 struck through; the flash sale's end for the countdown.
    expect(card.price).toEqual({ kind: "from", cents: 600 });
    expect(card.wasCents).toBe(800);
    expect(card.flashEndsAt).toBe("2026-11-18T14:00:00.000Z");
    // In the reader's language when the template has it.
    expect(card.title).toBe(templateTextAr(paid.template));
    const free = catalog.cards.find((c) => c.slug === freeOne.template.slug)!;
    expect(free.price).toEqual({ kind: "free" });

    const t = marketT("ar");
    expect(priceWords(card.price, card.wasCents, t, "ar")).toEqual({ tag: "⁦$6⁩ شهريًا", short: "ابتداءً من ⁦$6⁩ شهريًا", was: "⁦$8⁩ شهريًا" });
    expect(priceWords(free.price, null, marketT("en"), "en")).toEqual({ tag: "Free", short: "Free", was: null });
    expect(priceWords({ kind: "once", cents: 14900 }, null, marketT("en"), "en").short).toBe("$149 once");
    // The same words as the dashboard's in English and Turkish.
    for (const lang of ["en", "tr"] as const) expect(priceWords(card.price, card.wasCents, marketT(lang), lang)).toEqual(priceWords(card.price, card.wasCents, getDashT(lang), lang));

    // Each plan's price now on the template's page.
    const discounts = (await automaticDiscounts(store, [paid.template.id], NOW)).get(paid.template.id) ?? [];
    const plans = planPrices(paid.template, discounts, NOW);
    expect(plans.map((p) => [p.period, p.list, p.cents])).toEqual([
      ["3m", 2400, 1800],
      ["life", 14900, 11175],
    ]);
    expect(soonestFlashEnd(plans)).toBe("2026-11-18T14:00:00.000Z");
    expect(bestValuePlan(plans)).toBeNull();
    expect(planChoices(plans, marketT("en"), "en")).toEqual([
      { period: "3m", name: "3 months", price: "$18", sub: "$6/mo", best: false, was: "$24" },
      { period: "life", name: "Lifetime", price: "$111.75", sub: "One payment, never ends", best: false, was: "$149" },
    ]);
    expect(marketPrice(paid.template, discounts, NOW).tag).toEqual(card.price);
    // After the sale: the plan's own prices again.
    const later = new Date("2026-11-18T15:00:00Z");
    expect(planPrices(paid.template, discounts, later).map((p) => p.cents)).toEqual([2400, 14900]);
  });

  it("says what to know before buying: the designer's end, no renewal, moving and no refunds", () => {
    expect(knowLines({ afterEnd: "restore" }, true).map(([, key]) => key)).toEqual(["studioMarket.knowEndRestore", "studioMarket.knowRenew", "studioMarket.knowMove", "studioMarket.knowRefund"]);
    expect(knowLines({ afterEnd: "keep" }, true)[0]![1]).toBe("studioMarket.knowEndKeep");
    expect(knowLines({ afterEnd: "keep" }, false).map(([, key]) => key)).toEqual(["studioMarket.knowFree", "studioMarket.knowKeep", "studioMarket.knowMove", "studioMarket.knowReview"]);
  });
});

function templateTextAr(t: MarketTemplate): string {
  return t.texts.ar!.title;
}

describe("106.13 structured data", () => {
  it("lists the market's templates as an ItemList, in the page's language", () => {
    const ld = marketItemListLd(BASE, "ar", "ماركت Studio", [
      { slug: "peony-1", title: "بيت الفاوانيا" },
      { slug: "rose-2", title: "Rose" },
    ]);
    expect(ld).toEqual({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "ماركت Studio",
      inLanguage: "ar",
      url: `${BASE}/ar/templates`,
      numberOfItems: 2,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "بيت الفاوانيا", url: `${BASE}/ar/templates/peony-1` },
        { "@type": "ListItem", position: 2, name: "Rose", url: `${BASE}/ar/templates/rose-2` },
      ],
    });
  });

  it("describes a template as a Product with an Offer per plan at its price now, in US dollars", () => {
    const ld = templateProductLd(BASE, "en", {
      slug: "peony-1",
      title: "Peony House",
      description: "Peonies, calmly.",
      designer: "Studio Lale",
      kinds: ["Store"],
      freeName: "Free",
      plans: [
        { period: "3m", cents: 1800, flashEndsAt: "2026-11-18T14:00:00.000Z", name: "3 months" },
        { period: "life", cents: 14900, flashEndsAt: null, name: "Lifetime" },
      ],
    });
    expect(ld).toMatchObject({ "@type": "Product", "@id": `${BASE}/templates/peony-1#product`, name: "Peony House", sku: "peony-1", url: `${BASE}/templates/peony-1`, brand: { "@type": "Brand", name: "Studio Lale" } });
    expect(ld.offers).toEqual([
      { "@type": "Offer", name: "3 months", price: "18.00", priceCurrency: "USD", availability: "https://schema.org/InStock", url: `${BASE}/templates/peony-1`, priceValidUntil: "2026-11-18" },
      { "@type": "Offer", name: "Lifetime", price: "149.00", priceCurrency: "USD", availability: "https://schema.org/InStock", url: `${BASE}/templates/peony-1` },
    ]);
    const free = templateProductLd(BASE, "tr", { slug: "free-1", title: "Free", description: "", designer: "D", kinds: [], freeName: "Ücretsiz", plans: [] });
    expect(free.offers).toEqual([{ "@type": "Offer", name: "Ücretsiz", price: "0.00", priceCurrency: "USD", availability: "https://schema.org/InStock", url: `${BASE}/tr/templates/free-1` }]);
    expect(free).not.toHaveProperty("description");
  });
});

describe("106.13 back to the dashboard after signing up or in", () => {
  it("builds and accepts only the market's own dashboard addresses", () => {
    expect(marketNextPath("checkout", "peony-1", "3m")).toBe("/studio/market/checkout/peony-1?plan=3m");
    expect(marketNextPath("checkout", "peony-1", "forever")).toBeNull();
    expect(marketNextPath("checkout", "peony-1", null)).toBeNull();
    expect(marketNextPath("preview", "peony-1")).toBe("/studio/market/t/peony-1?demo=mine");
    expect(marketNextPath("template", "peony-1")).toBe("/studio/market/t/peony-1");
    expect(marketNextPath("template", "../../admin")).toBeNull();
    for (const ok of ["/studio/market/checkout/peony-1?plan=life", "/studio/market/t/peony-1?demo=mine", "/studio/market/t/peony-1"]) expect(safeMarketNext(ok)).toBe(ok);
    for (const bad of [null, undefined, "", "https://evil.test/studio/market/t/x", "//evil.test", "/admin", "/studio/market/checkout/x?plan=3m&next=/admin", "/studio/market/t/x?demo=1", "/studio/market/t/X"]) expect(safeMarketNext(bad), String(bad)).toBeNull();
    expect(MARKET_NEXT_COOKIE).toBe("yallapp_market_next");
  });

  it("links the website's buttons to the continue route in the page's language, the plan last", () => {
    expect(continueHref("ar", "checkout", "peony-1")).toBe("/api/studio-market/continue?to=checkout&slug=peony-1&lang=ar&plan=");
    expect(continueHref("en", "preview", "peony-1")).toBe("/api/studio-market/continue?to=preview&slug=peony-1&lang=en");
    expect(continueHref("tr", "template", "peony-1", "sign-in")).toBe("/api/studio-market/continue?to=template&slug=peony-1&lang=tr&account=sign-in");
  });
});

describe("106.13 the website's words", () => {
  it("has every word the market's parts read, in Modern Standard Arabic, and the dashboard's own in English and Turkish", () => {
    const en = dashboardMessages("en") as unknown as Record<string, Record<string, string>>;
    const tr = dashboardMessages("tr") as unknown as Record<string, Record<string, string>>;
    for (const [area, keys] of Object.entries(MARKET_WORD_KEYS)) {
      for (const key of keys) {
        const ar = (marketWords("ar") as unknown as Record<string, Record<string, string>>)[area]![key]!;
        expect(ar, `${area}.${key}`).toBeTruthy();
        expect((marketWords("en") as unknown as Record<string, Record<string, string>>)[area]![key]).toBe(en[area]![key]);
        expect((marketWords("tr") as unknown as Record<string, Record<string, string>>)[area]![key]).toBe(tr[area]![key]);
        // The placeholders are the dashboard's.
        const names = (text: string) => [...new Set([...text.matchAll(/\{([a-z]\w*)[,}]/g)].map((m) => m[1]))].sort();
        expect(names(ar), `${area}.${key}`).toEqual(names(en[area]![key]!));
      }
    }
    // Words the Egyptian dashboard says that the website doesn't.
    const all = JSON.stringify(marketWords("ar")) + JSON.stringify(templatesText("ar"));
    for (const word of ["ببلاش", "شوف", "بيخلص", "مفيش", "اقفل", "اللي", "دوسة", "تمبلت", "غامق"]) expect(all, word).not.toContain(word);
    // The catalog given to the parts answers their keys.
    const t = marketT("ar");
    expect(t("studioMarket.applies", { count: 3 })).toBe("3 تطبيقات");
    expect(t("marketDiscounts.endsInDays", { days: 2, time: "04:12:09" })).toBe("ينتهي بعد يومين و04:12:09");
    expect((marketCatalogFor("ar") as unknown as { studioMarket: { free: string } }).studioMarket.free).toBe("مجاني");
  });

  it("writes each page text in all three languages with the same placeholders", () => {
    const en = templatesText("en") as unknown as Record<string, unknown>;
    for (const lang of ["ar", "tr"] as const) {
      const other = templatesText(lang) as unknown as Record<string, unknown>;
      expect(Object.keys(other).sort()).toEqual(Object.keys(en).sort());
      for (const [key, value] of Object.entries(en)) {
        if (typeof value !== "string") continue;
        const names = (text: string) => [...new Set([...text.matchAll(/\{([a-z]\w*)[,}]/g)].map((m) => m[1]))].sort();
        expect(names(other[key] as string), `${lang}.${key}`).toEqual(names(value));
      }
    }
    // The legal promises are the designer terms' (Phase 106), word for word in English.
    expect(templatesText("en").designersText).toContain("Yallapp takes 25% of each sale and you always get exactly 75%");
    expect(templatesText("en").designersText).toContain("USD 250");
  });
});
