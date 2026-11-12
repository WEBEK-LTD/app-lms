import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ICON_NAMES } from "@/components/icon-names";
import { blackFridayCopyFor } from "@/content/occasions";
import { couponPrice } from "@/lib/billing/coupons";
import { loweredOffer, offerFor } from "@/lib/billing/prices";
import { MemoryStore } from "@/lib/data/memory";
import type { OccasionRecord } from "@/lib/data/types";
import { icuArguments, parseIcu } from "@/lib/i18n/icu";
import { llmsText } from "@/lib/llms";
import { APP_SCREENS, SCREEN_ALT } from "@/lib/marketing";
import { newOccasion } from "@/lib/occasions";
import { PLAN_INFO, planPriceOf, planSettingOf, plansWith, REGULAR_PLANS } from "@/lib/plans";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { siteSitemap } from "@/lib/sitemap";
import { PRICED_PAGES } from "@/lib/geo-vary";
import { LANGS, type Lang } from "@/i18n/config";
import { isLocalizedPath, languageAlternates, localePath } from "@/i18n/paths";
import { daysText, FALLBACK_BLACK_FRIDAY, occasionPlanPrice, occasionView, percentText } from "@/site/occasions/offer";
import { FAQ_COUNT, HERO_SCREENS, INCLUDED_GROUPS, STEP_ICONS, TERM_ICONS } from "@/site/occasions/shape";
import { BLACK_FRIDAY_PATH, type OccasionText } from "@/site/occasions/types";

/**
 * 124 Black Friday's page (/black-friday in every language): its words
 * follow its shape in English, Arabic and Turkish, it renders live, not
 * started and over, every price with the offer is the coupon's, and its
 * metadata and structured data are right.
 */

const PUBLIC = path.join(__dirname, "../../public");
const store = new MemoryStore();

vi.mock("@/lib/data", () => ({ getStore: async () => store }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined, has: () => false }),
  headers: async () => new Headers({ "x-country": "TR" }),
}));
vi.mock("next/navigation", async (original) => ({ ...(await original<object>()), useRouter: () => ({ refresh: () => undefined }) }));

const { BlackFridayPage, blackFridayMetadata, blackFridayFaq, blackFridayOfferLd } = await import("@/site/occasions/black-friday");
const { blackFridayLink, blackFridayOgText } = await import("@/site/occasions/load");
const { renderToReadableStream } = await import("react-dom/server");

const LIVE = new Date("2026-11-12T10:00:00Z");
const BEFORE = new Date("2026-10-20T10:00:00Z");
const AFTER = new Date("2026-12-03T10:00:00Z");
const SAVED: OccasionRecord = { ...newOccasion("black_friday", 2026, "o1", "team@yallapp.test", LIVE), percent: 40, couponCode: "BF2026" };

async function render(lang: Lang, now: Date): Promise<string> {
  const element = await BlackFridayPage({ lang, now });
  let failure: unknown = null;
  const stream = await renderToReadableStream(element, { onError: (error) => void (failure ??= error) });
  await stream.allReady;
  const html = await new Response(stream).text();
  if (failure) throw failure;
  return html;
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const words = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
const ldOf = (html: string) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => JSON.parse(m[1]!) as unknown[]) as Record<string, unknown>[];

/** Every string of a language's words, by its path. */
function strings(value: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof value === "string") out.set(prefix, value);
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${prefix}.${i}`).forEach((s, k) => out.set(k, s)));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) strings(v, prefix ? `${prefix}.${k}` : k).forEach((s, key) => out.set(key, s));
  return out;
}

async function savePlans() {
  await store.setPlatformSetting(
    "plans",
    {
      growth: { ...planSettingOf(PLAN_INFO.growth), priceCents: 480000, usdCents: 9600, onRequest: false, billingMonths: 12 },
      pro: { ...planSettingOf(PLAN_INFO.pro), priceCents: 99900, usdCents: null, onRequest: false, billingMonths: 1 },
      studio_1: { ...planSettingOf(PLAN_INFO.studio_1), name: "Studio Start", priceCents: 150050, usdCents: 3300, onRequest: false, billingMonths: 1, offered: true },
    },
    "test",
    LIVE,
  );
  await store.setPlatformSetting("billing", { planProvider: "kashier", egpPerUsd: 50 }, "test", LIVE);
  clearPlatformSettingsCache();
}

describe("124 Black Friday's page", () => {
  beforeAll(savePlans);
  afterEach(() => clearPlatformSettingsCache());

  it("has one address in every language, in the sitemap, llms.txt and the priced pages", () => {
    expect(isLocalizedPath(BLACK_FRIDAY_PATH)).toBe(true);
    expect(localePath("ar", BLACK_FRIDAY_PATH)).toBe("/ar/black-friday");
    expect(localePath("tr", BLACK_FRIDAY_PATH)).toBe("/tr/black-friday");
    const urls = siteSitemap("https://yallapp.test").map((e) => e.url);
    for (const p of ["/black-friday", "/ar/black-friday", "/tr/black-friday"]) {
      expect(urls).toContain(`https://yallapp.test${p}`);
      expect(PRICED_PAGES).toContain(p);
    }
    expect(llmsText("en", "https://yallapp.test")).toContain("(https://yallapp.test/black-friday)");
    expect(llmsText("ar", "https://yallapp.test")).toContain("(https://yallapp.test/ar/black-friday)");
    expect(existsSync(path.join(__dirname, "../../src/app/black-friday/opengraph-image.tsx"))).toBe(true);
    expect(existsSync(path.join(__dirname, "../../src/app/[lang]/black-friday/opengraph-image.tsx"))).toBe(true);
  });

  it("its words follow the shape in every language, with the same placeholders as the English", () => {
    const english = strings(blackFridayCopyFor("en"));
    for (const lang of LANGS) {
      const t: OccasionText = blackFridayCopyFor(lang);
      expect(t.steps.items, lang).toHaveLength(STEP_ICONS.length);
      expect(t.included.groups, lang).toHaveLength(INCLUDED_GROUPS.length);
      INCLUDED_GROUPS.forEach((g, i) => expect(t.included.groups[i]!.items, `${lang} ${g.id}`).toHaveLength(g.items.length));
      expect(t.terms.items, lang).toHaveLength(TERM_ICONS.length);
      expect(t.faq.items, lang).toHaveLength(FAQ_COUNT);
      expect(FAQ_COUNT).toBeGreaterThanOrEqual(8);
      expect(FAQ_COUNT).toBeLessThanOrEqual(12);
      const mine = strings(t);
      expect([...mine.keys()].sort(), lang).toEqual([...english.keys()].sort());
      for (const [key, text] of mine) {
        expect(text.trim(), `${lang} ${key}`).not.toBe("");
        // Plural forms differ by language; the values they take don't.
        const args = (s: string) => [...icuArguments(parseIcu(s)).keys()].sort();
        expect(args(text), `${lang} ${key}`).toEqual(args(english.get(key)!));
      }
      const all = JSON.stringify(t);
      expect(all, lang).not.toMatch(/\bAI\b|artificial intelligence|machine learning|ذكاء اصطناعي|yapay zek|GPT|Claude|seamless|cutting-edge|revolutioni[sz]e/i);
      expect(all, lang).not.toMatch(/https?:\/\/|www\./);
      expect(all, lang).not.toMatch(/marketplace/i);
      // The percentage, the code and the days come from the occasion, never the words.
      expect(all, lang).not.toMatch(/BLACKFRIDAY50|\b50\s?%|%\s?50\b|\b2026\b|\b30 (November|نوفمبر|Kasım)/);
      expect(all, lang).not.toMatch(/WEBEK LTD|16326894/);
    }
  });

  it("the Arabic is written the site's way: Arabic punctuation, Latin digits, no stray Latin punctuation inside Arabic", () => {
    const ar = [...strings(blackFridayCopyFor("ar")).values()].join("\n");
    expect(ar).not.toMatch(/[٠-٩]/);
    expect(ar).not.toMatch(/[؀-ۿ]\s*,|,\s*[؀-ۿ]/);
    expect(ar).not.toMatch(/[؀-ۿ]\s*;|[؀-ۿ]\s*\?/);
    expect(ar).toMatch(/،/);
    expect(blackFridayCopyFor("ar").navName).toBe("الجمعة البيضاء");
    expect(blackFridayCopyFor("tr").navName).toBe("Kara Cuma");
  });

  it("uses only icons and screens that exist", () => {
    for (const icon of [...STEP_ICONS, ...TERM_ICONS, ...INCLUDED_GROUPS.flatMap((g) => [g.icon, ...g.items]), "local_offer", "percent", "calendar_month", "schedule", "event_busy"]) {
      expect(ICON_NAMES, icon).toContain(icon);
    }
    for (const screen of HERO_SCREENS) {
      expect(APP_SCREENS).toContain(screen);
      expect(SCREEN_ALT[screen]).toBeTruthy();
      expect(existsSync(path.join(PUBLIC, "screens", `${screen}.png`)), screen).toBe(true);
    }
  });

  it("falls back to lib/occasions' Black Friday 2026 until the team saves one", () => {
    expect(FALLBACK_BLACK_FRIDAY).toMatchObject({ startsOn: "2026-11-01", endsOn: "2026-11-30", percent: 50, couponCode: "BLACKFRIDAY50", plans: "all", active: true });
    expect(occasionView(FALLBACK_BLACK_FRIDAY, LIVE)).toMatchObject({ state: "live", codeShown: true, on: true, daysLeft: 19 });
    expect(occasionView(FALLBACK_BLACK_FRIDAY, BEFORE)).toMatchObject({ state: "upcoming", codeShown: true, on: true });
    expect(occasionView(FALLBACK_BLACK_FRIDAY, AFTER)).toMatchObject({ state: "ended", codeShown: false, on: false });
    expect(occasionView({ ...FALLBACK_BLACK_FRIDAY, active: false }, LIVE)).toMatchObject({ state: "off", on: false });
    expect(daysText("en", FALLBACK_BLACK_FRIDAY)).toBe("1–30 November 2026");
    expect(daysText("ar", FALLBACK_BLACK_FRIDAY)).toBe("1–30 نوفمبر 2026");
    expect(daysText("tr", FALLBACK_BLACK_FRIDAY)).toBe("1–30 Kasım 2026");
    expect(daysText("en", { startsOn: "2026-11-27", endsOn: "2026-12-02" })).toBe("27 November – 2 December 2026");
    expect(percentText("tr", 50)).toBe("%50");
    expect(percentText("ar", 50)).toBe("50%");
  });

  it("every price with the offer is what the coupon makes of the charged price, shown the payment form's way", () => {
    const plans = plansWith({
      growth: { ...planSettingOf(PLAN_INFO.growth), priceCents: 480000, usdCents: 9600, onRequest: false, billingMonths: 12 },
      pro: { ...planSettingOf(PLAN_INFO.pro), priceCents: 99900, usdCents: null, onRequest: false, billingMonths: 1 },
    });
    for (const view of [
      { display: "EGP" as const, egpPerUsd: 50 },
      { display: "USD" as const, egpPerUsd: 50 },
    ]) {
      for (const provider of ["kashier", "iyzico"] as const) {
        for (const id of ["growth", "pro"] as const) {
          const plan = plans[id];
          const got = occasionPlanPrice(plan, SAVED, view, provider)!;
          const offer = offerFor(planPriceOf(plan)!, view.display, provider, view.egpPerUsd)!;
          const coupon = couponPrice({ kind: "percent", percent: SAVED.percent }, offer.charged)!;
          expect(got.charged).toEqual(offer.charged);
          expect(got.chargedWithCode).toBe(coupon.amountCents);
          expect(got.full).toEqual(offer.shown);
          expect(got.offer).toEqual(loweredOffer(offer, coupon.amountCents).shown);
          expect(got.period).toBe(plan.billingMonths === 1 ? "month" : "year");
        }
      }
    }
    // On request: not paid by card, so no price; a plan outside the offer keeps its price.
    expect(occasionPlanPrice(plans.starter, SAVED, { display: "EGP", egpPerUsd: 50 }, "kashier")).toBeNull();
    expect(occasionPlanPrice(plans.growth, { ...SAVED, plans: "studio" }, { display: "EGP", egpPerUsd: 50 }, "kashier")).toMatchObject({ offer: null, chargedWithCode: null });
  });

  for (const lang of LANGS) {
    it(`${lang}: live, it shows the offer, the countdown, the code, every section and the prices with the code`, async () => {
      await store.setPlatformSetting("occasions", { items: [SAVED] }, "test", LIVE);
      clearPlatformSettingsCache();
      const t = blackFridayCopyFor(lang);
      const html = await render(lang, LIVE);
      expect(html).toContain('data-occasion-state="live"');
      expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
      expect(html).toContain(escape(t.hero.title));
      expect(html).toContain(percentText(lang, 40));
      expect(html).toContain('data-coupon-code="BF2026"');
      expect(html).not.toContain("BLACKFRIDAY50");
      expect(html).toContain('role="timer"');
      expect(html).toContain(`data-target="${new Date("2026-11-30T21:00:00.000Z").toISOString()}"`);
      for (const id of ["bf-plans", "bf-kinds", "bf-steps", "bf-included", "bf-terms", "bf-faq", "bf-final"]) expect(html, id).toContain(`id="${id}"`);
      for (const g of t.included.groups) expect(html).toContain(escape(g.title));
      for (const s of HERO_SCREENS) expect(html).toContain(`data-screen="${s}"`);
      // Headings in order: h1, then h2 sections with h3 inside; never h4 skipping.
      const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
      levels.forEach((l, i) => i > 0 && expect(l - levels[i - 1]!, `heading ${i}`).toBeLessThanOrEqual(1));
      // Prices: the visitor is outside Egypt (dollars), Kashier charges pounds.
      const all = plansWith((await store.listPlatformSettings()).find((s) => s.key === "plans")!.value as never);
      for (const id of ["growth", "pro", "studio_1"] as const) {
        const offer = offerFor(planPriceOf(all[id])!, "USD", "kashier", 50)!;
        const coupon = couponPrice({ kind: "percent", percent: 40 }, offer.charged)!;
        const shown = loweredOffer(offer, coupon.amountCents).shown;
        expect(html, id).toMatch(new RegExp(`data-plan="${id}" data-offer-price="${shown.cents}" data-full-price="${offer.shown.cents}"`));
      }
      // Starter and Business are on request: no price with the code.
      for (const id of REGULAR_PLANS.filter((p) => p === "starter" || p === "business")) expect(html).toMatch(new RegExp(`data-plan="${id}" class`));
      expect(html).toContain(`${localePath(lang, "/sign-up")}`);
      expect(html).toContain(`${localePath(lang, "/pricing")}`);
      expect(html).toContain(`${localePath(lang, "/solutions/academy")}`);
      expect(html).toContain(`${localePath(lang, "/demo/studio")}#`);
      expect(words(html)).not.toMatch(/marketplace/i);
      // The structured data: the trail, the questions and the offer with its days.
      const ld = ldOf(html);
      const crumbs = ld.find((d) => d["@type"] === "BreadcrumbList")!;
      expect(JSON.stringify(crumbs)).toContain(`${localePath(lang, BLACK_FRIDAY_PATH)}`);
      const faq = ld.find((d) => d["@type"] === "FAQPage")! as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
      expect(faq.mainEntity).toHaveLength(FAQ_COUNT);
      expect(faq.mainEntity.map((q) => q.name)).toEqual(blackFridayFaq(lang, SAVED).map((q) => q.q));
      expect(JSON.stringify(faq)).toContain("BF2026");
      const offers = ld.filter((d) => d["@type"] === "Offer");
      expect(offers.length).toBe(3);
      for (const o of offers) {
        expect(o).toMatchObject({ validFrom: "2026-10-31T21:00:00.000Z", validThrough: "2026-11-30T20:59:59.999Z", priceValidUntil: "2026-11-30", priceCurrency: "USD", availability: "https://schema.org/InStock" });
        expect(o).not.toHaveProperty("aggregateRating");
        expect(o).not.toHaveProperty("review");
      }
    });

    it(`${lang}: not started, it counts down to the start and keeps the code back`, async () => {
      await store.setPlatformSetting("occasions", { items: [SAVED] }, "test", LIVE);
      clearPlatformSettingsCache();
      const t = blackFridayCopyFor(lang);
      const html = await render(lang, BEFORE);
      expect(html).toContain('data-occasion-state="upcoming"');
      expect(html).toContain('role="timer"');
      expect(html).toContain(`data-target="${new Date("2026-10-31T21:00:00.000Z").toISOString()}"`);
      // The code, with the day it works from (the payment form refuses it before).
      expect(html).toContain('data-coupon-code="BF2026"');
      expect(html).toContain("data-code-from");
      expect(html).toContain(escape(t.countdown.startsIn));
      expect(ldOf(html).filter((d) => d["@type"] === "Offer").every((o) => o.availability === "https://schema.org/PreOrder")).toBe(true);
    });

    it(`${lang}: over or turned off, it says so, at the normal prices, without the code or a countdown`, async () => {
      for (const [items, now] of [
        [[SAVED], AFTER],
        [[{ ...SAVED, active: false }], LIVE],
      ] as const) {
        await store.setPlatformSetting("occasions", { items: [...items] }, "test", LIVE);
        clearPlatformSettingsCache();
        const t = blackFridayCopyFor(lang);
        const html = await render(lang, now);
        expect(html).toMatch(/data-occasion-state="(ended|off)"/);
        expect(html).toContain(escape(t.hero.overTitle));
        expect(html).not.toContain('role="timer"');
        expect(html).not.toContain("data-coupon-code");
        expect(html).not.toContain("data-offer-price");
        expect(html).not.toContain("BF2026");
        expect(html).toContain(`href="${localePath(lang, "/pricing")}"`);
        expect(ldOf(html).filter((d) => d["@type"] === "Offer")).toHaveLength(0);
        expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
        // The questions that name the code are left out; the rest stay, 8 or more.
        const faq = ldOf(html).find((d) => d["@type"] === "FAQPage")! as { mainEntity: unknown[] };
        expect(faq.mainEntity.length).toBeGreaterThanOrEqual(8);
      }
    });

    it(`${lang}: its metadata: title and description by state, canonical, hreflang and its share image`, async () => {
      await store.setPlatformSetting("occasions", { items: [SAVED] }, "test", LIVE);
      clearPlatformSettingsCache();
      const live = await blackFridayMetadata(lang, LIVE);
      const over = await blackFridayMetadata(lang, AFTER);
      const soon = await blackFridayMetadata(lang, BEFORE);
      expect(live.alternates).toEqual({ canonical: localePath(lang, BLACK_FRIDAY_PATH), languages: languageAlternates(BLACK_FRIDAY_PATH) });
      expect(String(live.title)).toContain(percentText(lang, 40).replace("%", "").trim());
      expect(String(live.description)).toContain("BF2026");
      expect(String(live.description)).not.toBe(String(soon.description));
      expect(String(over.title)).toBe(String(over.title));
      expect(String(over.description)).not.toContain("BF2026");
      for (const m of [live, over, soon]) {
        expect(String(m.description).length, `${lang} ${m.description}`).toBeLessThanOrEqual(170);
        expect(String(m.description).length).toBeGreaterThanOrEqual(50);
        expect(m.robots).toBeUndefined();
      }
      const image = (live.openGraph!.images as { url: string }[])[0]!.url;
      expect(image).toBe(lang === "en" ? "/black-friday/opengraph-image" : `/${lang}/black-friday/opengraph-image`);
      const og = await blackFridayOgText(lang, LIVE);
      expect(og.title).toContain("40");
      expect((await blackFridayOgText(lang, AFTER)).title).toBe(blackFridayCopyFor(lang).og.titleOver);
    });
  }

  it("is linked from the footer while the offer is on or about to start, not after", async () => {
    await store.setPlatformSetting("occasions", { items: [SAVED] }, "test", LIVE);
    clearPlatformSettingsCache();
    expect(await blackFridayLink("ar", LIVE)).toEqual({ href: "/ar/black-friday", label: "الجمعة البيضاء" });
    expect(await blackFridayLink("en", BEFORE)).toEqual({ href: "/black-friday", label: "Black Friday" });
    expect(await blackFridayLink("tr", AFTER)).toBeNull();
  });

  it("offers no structured offer without prices, and one per priced plan otherwise", () => {
    const view = occasionView(SAVED, LIVE);
    expect(blackFridayOfferLd("https://yallapp.test", "en", view, [])).toHaveLength(1);
    expect(blackFridayOfferLd("https://yallapp.test", "en", occasionView(SAVED, AFTER), [])).toEqual([]);
  });
});
