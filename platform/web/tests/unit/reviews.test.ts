import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { HomeReviews } from "@/components/home-reviews";
import { ReviewsSection } from "@/components/reviews-section";
import { messagesFor } from "@/i18n";
import { getStore } from "@/lib/data";
import { MemoryStore } from "@/lib/data/memory";
import { PLAN_INFO } from "@/lib/plans";
import { moveReview, newReview, parseSourceUrl, publicReviews, readReviewForm, reviewRows, reviewsView, sampleReviews } from "@/lib/reviews/reviews";
import type { SiteReview } from "@/lib/reviews/types";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";

/**
 * The home page's customer reviews: only real reviews the team added with
 * the customer's agreement; until one is shown, labelled sample cards if
 * the team leaves them on, with no rating, badge, link or score; nothing
 * when neither.
 */

const NOW = new Date("2026-11-10T12:00:00Z");

function review(patch: Partial<SiteReview> = {}): SiteReview {
  return {
    id: `r-${Math.random().toString(36).slice(2)}`,
    name: "Selin Kaya",
    role: "Owner, Lale Flowers",
    city: "Istanbul",
    appName: "Lale",
    plan: null,
    clientId: "client-secret-id",
    rating: 4,
    lang: "tr",
    text: "Uygulamamız bir haftada yayındaydı.",
    translations: { en: "Our app was live in a week." },
    photo: null,
    source: "google",
    sourceUrl: "https://g.page/r/abc",
    reviewedAt: NOW,
    consent: true,
    hidden: false,
    position: 1,
    createdBy: "team@yallapp.test",
    createdAt: NOW,
    ...patch,
  };
}

const ON = { samples: true };
const OFF = { samples: false };
const words = (lang: "en" | "ar" | "tr") => messagesFor(lang).reviews;
const render = (view: ReturnType<typeof reviewsView>, lang: "en" | "ar" | "tr" = "en") => renderToStaticMarkup(createElement(ReviewsSection, { view, words: words(lang), lang }));
const sampleTexts = (lang: "en" | "ar" | "tr") => Object.values(messagesFor(lang).reviews.samples).map((s) => s.text);

describe("the admin's form", () => {
  const form = { name: "Selin Kaya", rating: "5", lang: "tr", text: "Uygulamamız bir haftada yayındaydı.", reviewedOn: "2026-11-01", source: "google", sourceUrl: "https://g.page/r/abc", consent: "on" };

  it("needs the box: a real review the customer agreed to show", () => {
    const without = readReviewForm({ ...form, consent: "" }, PLAN_INFO, NOW);
    expect(!without.ok && without.errors.consent).toMatch(/real reviews/);
    const ok = readReviewForm({ ...form, text_en: "Our app was live in a week.", text_tr: "ignored: the language it was written in" }, PLAN_INFO, NOW);
    expect(ok.ok && ok.form).toMatchObject({ rating: 5, lang: "tr", source: "google", sourceUrl: "https://g.page/r/abc", translations: { en: "Our app was live in a week." }, consent: true });
  });

  it("takes http and https links only, and none for a review given directly", () => {
    expect(parseSourceUrl("javascript:alert(1)")).toBeNull();
    expect(parseSourceUrl("ftp://example.com/x")).toBeNull();
    expect(parseSourceUrl("http://example.com/r")).toBe("http://example.com/r");
    const bad = readReviewForm({ ...form, sourceUrl: "javascript:alert(1)" }, PLAN_INFO, NOW);
    expect(!bad.ok && bad.errors.sourceUrl).toBeTruthy();
    const direct = readReviewForm({ ...form, source: "direct" }, PLAN_INFO, NOW);
    expect(!direct.ok && direct.errors.sourceUrl).toBeTruthy();
    const unknown = readReviewForm({ ...form, source: "yelp" }, PLAN_INFO, NOW);
    expect(!unknown.ok && unknown.errors.source).toBeTruthy();
  });

  it("refuses 0 or 6 stars and a day in the future", () => {
    const bad = readReviewForm({ ...form, rating: "6", reviewedOn: "2027-01-01" }, PLAN_INFO, NOW);
    expect(bad.ok ? [] : Object.keys(bad.errors).sort()).toEqual(["rating", "reviewedOn"]);
  });
});

describe("what the home page shows", () => {
  it("shows samples only with no real review shown and the setting on", () => {
    expect(reviewsView([], ON, "en")?.kind).toBe("samples");
    expect(reviewsView([], OFF, "en")).toBeNull();
    // Hidden ones and ones saved without the agreement don't count.
    expect(reviewsView([review({ hidden: true }), review({ consent: false })], ON, "en")?.kind).toBe("samples");
    expect(reviewsView([review({ hidden: true })], OFF, "en")).toBeNull();
    expect(reviewsView([review()], ON, "en")?.kind).toBe("real");
    expect(reviewsView([review()], OFF, "en")?.kind).toBe("real");
  });

  it("labels every sample card visibly, in each language, with a role instead of a name", () => {
    for (const lang of ["en", "ar", "tr"] as const) {
      const html = render(reviewsView([], ON, lang), lang);
      const cards = html.split('data-review-card="sample"').slice(1);
      expect(cards.length).toBeGreaterThanOrEqual(sampleReviews(lang).length);
      for (const card of cards) expect(card.slice(0, card.indexOf("</article>"))).toContain(words(lang).sampleLabel);
      expect(html).toContain(words(lang).samplesNote.replace(/'/g, "&#x27;"));
      for (const s of sampleReviews(lang)) expect(s.name).toMatch(lang === "en" ? /^Sample: / : lang === "ar" ? /^مثال: / : /^Örnek: /);
    }
    expect(words("en").sampleLabel).toBe("Sample review");
    expect(words("ar").sampleLabel).toBe("ريفيو تجريبي");
    expect(words("tr").sampleLabel).toBe("Örnek yorum");
  });

  it("gives samples no rating, badge, link, score or structured data", () => {
    const html = render(reviewsView([], ON, "en"));
    expect(html).not.toContain("data-review-source");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("data-reviews-score");
    expect(html).not.toContain("out of 5");
    expect(html).not.toContain("ld+json");
    expect(html).not.toContain("aggregateRating");
    for (const s of sampleReviews("en")) expect(s).toMatchObject({ source: "direct", sourceUrl: null, photoUrl: null, sample: true });
  });

  it("drops the samples as soon as a real review is shown, with its score, stars and badge", () => {
    const html = render(reviewsView([review(), review({ rating: 5, source: "trustpilot", sourceUrl: null })], ON, "en"));
    expect(html).not.toContain("Sample review");
    for (const t of sampleTexts("en")) expect(html).not.toContain(t);
    expect(html).toContain("data-reviews-score");
    expect(html).toContain("Average rating: 4.5 out of 5");
    expect(html).toContain('href="https://g.page/r/abc" target="_blank" rel="noopener nofollow"');
    expect(html).toContain("Review on Google");
    expect(html).toContain("Review on Trustpilot");
    expect(html).toContain("4 out of 5 stars");
    // The team's translation in English, the customer's own words elsewhere; never the account.
    expect(html).toContain("Our app was live in a week.");
    expect(html).not.toContain("client-secret-id");
    expect(render(reviewsView([review()], ON, "ar"), "ar")).toContain("Uygulamamız bir haftada yayındaydı.");
    expect(render(reviewsView([review({ source: "direct", sourceUrl: null })], ON, "en"))).not.toContain("data-review-source");
  });

  it("drifts its rows in turn left and right, and keeps one or two cards still", () => {
    expect(reviewRows([1, 2])).toEqual({ moving: false, rows: [[1, 2]] });
    expect(reviewRows([1, 2, 3, 4])).toEqual({ moving: true, rows: [[1, 2, 3, 4], [3, 4, 1, 2]] });
    expect(reviewRows(Array.from({ length: 12 }, (_, i) => i)).rows).toHaveLength(3);
    const html = render(reviewsView([review(), review(), review()], ON, "ar"), "ar");
    expect(html.match(/data-drift="(left|right)"/g)).toEqual(['data-drift="left"', 'data-drift="right"']);
    expect(html).toContain('dir="rtl"');
  });
});

describe("the home page's section", () => {
  beforeEach(() => clearPlatformSettingsCache());

  it("isn't rendered with no review and the samples off, and never draws samples next to real reviews", async () => {
    const store = await getStore();
    for (const r of await store.listSiteReviews()) await store.deleteSiteReview(r.id);
    await store.setPlatformSetting("reviews", { samples: false }, "team@yallapp.test", NOW);
    clearPlatformSettingsCache();
    expect(await HomeReviews({ lang: "en" })).toBeNull();
    await store.saveSiteReview(review({ hidden: true }));
    expect(await HomeReviews({ lang: "en" })).toBeNull();

    await store.setPlatformSetting("reviews", { samples: true }, "team@yallapp.test", NOW);
    clearPlatformSettingsCache();
    const samples = renderToStaticMarkup((await HomeReviews({ lang: "tr" }))!);
    expect(samples).toContain("Örnek yorum");

    await store.saveSiteReview(review({ id: "shown-one", position: 2 }));
    const real = renderToStaticMarkup((await HomeReviews({ lang: "en" }))!);
    expect(real).toContain("Selin Kaya");
    for (const t of sampleTexts("en")) expect(real).not.toContain(t);
    expect(real).not.toContain("Sample review");
    for (const r of await store.listSiteReviews()) await store.deleteSiteReview(r.id);
  });

  it("keeps sample text out of the stored reviews and the code's defaults", async () => {
    const { readFileSync } = await import("node:fs");
    for (const file of ["src/lib/reviews/reviews.ts", "src/lib/reviews/types.ts", "src/lib/data/memory.ts", "src/lib/db/schema.ts", "src/components/reviews-section.tsx"]) {
      const text = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
      for (const t of sampleTexts("en")) expect(text, file).not.toContain(t.slice(0, 30));
    }
  });
});

describe("order", () => {
  it("moves a review up or down", async () => {
    const store = new MemoryStore();
    const a = review({ id: "a", position: 1 });
    const b = review({ id: "b", position: 2 });
    const c = review({ id: "c", position: 3 });
    for (const r of [a, b, c]) await store.saveSiteReview(r);
    expect(await moveReview(store, "c", "up")).toBe(true);
    expect((await store.listSiteReviews()).map((r) => r.id)).toEqual(["a", "c", "b"]);
    expect(await moveReview(store, "a", "up")).toBe(false);
    expect(publicReviews(await store.listSiteReviews(), "en").map((r) => r.key)).toEqual(["review-0", "review-1", "review-2"]);
    const made = newReview({ name: "X Y", role: null, city: null, appName: null, plan: null, client: "x", rating: 5, lang: "en", text: "Great work all round.", translations: {}, source: "direct", sourceUrl: null, reviewedAt: NOW, consent: true }, { clientId: null, photo: null, position: 4, createdBy: "t@y.test", now: NOW });
    expect(made).toMatchObject({ hidden: false, consent: true, position: 4 });
    expect("client" in made).toBe(false);
  });
});
