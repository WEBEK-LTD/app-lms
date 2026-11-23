import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import type { BlobStore } from "@/lib/blobs";
import { MemoryStore } from "@/lib/data/memory";
import type { App, TemplateLicence } from "@/lib/data/types";
import { DashboardI18n } from "@/components/dashboard-i18n";
import { RatingList } from "@/components/studio-market/ratings";
import { dashboardMessages } from "@/i18n/dashboard";
import { isLocalizedPath, localePath } from "@/i18n/paths";
import { loadLayout, saveDraft } from "@/lib/pages/layout";
import type { StudioNode } from "@/lib/pages/types";
import { en as appEn } from "@/lib/studio/app-words";
import { makeStudioProject } from "@/lib/studio/new-project";
import { TEMPLATES, type SectionWord } from "@/lib/studio/sections";
import { designerChip, marketCatalog } from "@/lib/studio-market/catalog";
import {
  designerPath,
  designersBase,
  linkLabel,
  mayRate,
  PAGE_MESSAGES,
  publicProfile,
  rateTemplate,
  ratingAuthorName,
  ratingStats,
  readDesignerLink,
  readDesignerLinks,
  readDesignerPhoto,
  readRating,
  replyToRating,
} from "@/lib/studio-market/designer-page";
import { designerProfileLd, designerSitemapEntries, publicDesigner, publicDesignerSlugs, templateRatings } from "@/lib/studio-market/designer-public";
import { DESIGNER_MESSAGES, isReservedDesignerSlug, joinAsDesigner, nextProfileReview, readDesignerProfile, updateDesignerProfile } from "@/lib/studio-market/designers";
import { templateProductLd } from "@/lib/studio-market/public";
import { decideReview } from "@/lib/studio-market/review";
import { sendForReview, startTemplate } from "@/lib/studio-market/templates";
import { marketCatalogFor } from "@/site/templates-words";
import { designersText } from "@/site/designers-text";

/**
 * 106.14 A designer's public page (/designers/<handle>): the address's
 * rules (reserved words), the photo and links, the team's first look at the
 * photo and line, a buyer's rating (only after getting the template, once,
 * changed in place), the designer's one answer, the team hiding a rating
 * and locking a page, what the page shows (and never shows), its sitemap
 * entries and JSON-LD, and the ratings as they are drawn.
 */

const BLOBS = mkdtempSync(join(tmpdir(), "studio-market-designer-page-"));
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

const NOW = new Date("2026-11-23T10:00:00Z");
const LATER = new Date("2026-11-24T10:00:00Z");
const BASE = "https://yallapp.com.tr";
const BLANK = TEMPLATES.find((t) => t.id === "blank")!;
const words = (name: string) => (word: SectionWord) => String(appEn[word]).replaceAll("{app}", name);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);

let store: MemoryStore;
let blobs: MemoryBlobs;
let n = 0;

beforeEach(() => {
  store = new MemoryStore();
  blobs = new MemoryBlobs();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

async function account(name: string) {
  n += 1;
  const { client, user } = await registerClient(store, { name, email: `page-${n}@designer.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  return { client, user };
}

async function designerAccount(name: string, bio = "Calm shops.") {
  const { client } = await account(name);
  const joined = await joinAsDesigner(store, { id: client.id }, { name, slug: `studio-${n}`, country: "TR", bio, terms: true }, NOW);
  if (!joined.ok) throw new Error("join");
  const app: App = await makeStudioProject(store, { clientId: client.id, name: `${name} project`, kind: kindById("store")!, source: "catalog", template: BLANK, words: words(name), lang: "en" }, NOW);
  const record = await loadLayout(store, app, NOW);
  const first = record.draft.pages.findIndex((x) => x.studio);
  const pages = record.draft.pages.map((p, i) => (i === first && p.studio ? { ...p, studio: { ...p.studio, body: { ...p.studio.body, children: [{ id: "t1", type: "text", text: "Hello" } as StudioNode] } } } : p));
  expect((await saveDraft(store, app, { ...record.draft, pages }, NOW)).ok).toBe(true);
  return { designer: joined.designer, app, client };
}

/** A published free template by the designer. */
async function published(who: Awaited<ReturnType<typeof designerAccount>>, title = `Peony House ${n}`) {
  let t = await startTemplate(store, who.designer, who.app, NOW);
  await store.updateMarketTemplate(t.id, { texts: { en: { title, short: "Peonies, calmly.", description: "A flower shop." } }, screens: [(await loadLayout(store, who.app, NOW)).draft.pages.find((p) => p.studio)!.slug], free: true, plans: [] }, NOW);
  t = (await store.getMarketTemplate(t.id))!;
  const sent = await sendForReview({ store, blobs, now: NOW, baseUrl: BASE }, t, who.app, { rights: true, note: "" }, "designer@page.test");
  if (!sent.ok) throw new Error(sent.message);
  const decided = await decideReview(store, sent.template, { decision: "approved", notes: "", teamNote: "", checks: [] }, { email: "deniz@yallapp.test", name: "Deniz" }, NOW);
  if (!decided.ok) throw new Error("review");
  return (await store.getMarketTemplate(t.id))!;
}

async function licence(clientId: string, templateId: string) {
  const l: TemplateLicence = { id: crypto.randomUUID(), templateId, clientId, plan: "free", status: "active", appId: null, versionId: null, startsAt: NOW, endsAt: null, movedAt: null, afterEnd: null, remindedEarlyFor: null, remindedLastFor: null, endedAt: null, createdAt: NOW, updatedAt: NOW };
  await store.createTemplateLicence(l);
  return l;
}

describe("106.14 the page's address", () => {
  const input = (slug: string) => ({ name: "Studio Nūr", slug, country: "TR", bio: "" });
  it("takes 3 to 40 small letters, numbers or dashes, and none kept for Yallapp", () => {
    expect(readDesignerProfile(input("studio-nur"))).toMatchObject({ ok: true, value: { slug: "studio-nur" } });
    for (const bad of ["ab", "Studio Nur", "nur_", "-nur", "nur-", "nur--x", "a".repeat(41), "نور"]) expect(readDesignerProfile(input(bad)), bad).toMatchObject({ ok: false, errors: { slug: DESIGNER_MESSAGES.slug } });
    for (const reserved of ["admin", "yallapp", "yallapp-official", "support", "templates", "designers", "sign-in", "api", "studio"]) {
      expect(isReservedDesignerSlug(reserved), reserved).toBe(true);
      expect(readDesignerProfile(input(reserved)), reserved).toMatchObject({ ok: false, errors: { slug: DESIGNER_MESSAGES.slugReserved } });
    }
    // A designer who has one already (made before the list) keeps it.
    expect(readDesignerProfile(input("studio"), "studio")).toMatchObject({ ok: true, value: { slug: "studio" } });
    // Upper case is read as lower case.
    expect(readDesignerProfile(input("NUR-Design"))).toMatchObject({ ok: true, value: { slug: "nur-design" } });
  });

  it("is unique: another designer's address is refused when joining and when changing it", async () => {
    const nur = await designerAccount("Nur");
    const { client } = await account("Lale");
    expect(await joinAsDesigner(store, { id: client.id }, { name: "Lale", slug: nur.designer.slug, country: "TR", bio: "", terms: true }, NOW)).toMatchObject({ ok: false, errors: { slug: DESIGNER_MESSAGES.slugTaken } });
    const lale = await joinAsDesigner(store, { id: client.id }, { name: "Lale", slug: "lale-paper", country: "TR", bio: "", terms: true }, NOW);
    if (!lale.ok) throw new Error("join");
    expect(await updateDesignerProfile(store, lale.designer, { name: "Lale", slug: nur.designer.slug, country: "TR", bio: "" }, NOW)).toMatchObject({ ok: false, errors: { slug: DESIGNER_MESSAGES.slugTaken } });
    expect(await updateDesignerProfile(store, lale.designer, { name: "Lale", slug: "admin", country: "TR", bio: "" }, NOW)).toMatchObject({ ok: false, errors: { slug: DESIGNER_MESSAGES.slugReserved } });
    expect(isLocalizedPath("/designers/lale-paper")).toBe(true);
    expect(localePath("ar", designerPath("lale-paper"))).toBe("/ar/designers/lale-paper");
    expect(localePath("tr", designerPath("lale-paper"))).toBe("/tr/designers/lale-paper");
    // The cards' links start here in each language.
    expect([designersBase("en"), designersBase("ar"), designersBase("tr")]).toEqual(["/designers", "/ar/designers", "/tr/designers"]);
  });
});

describe("106.14 the photo, the links and the team's first look", () => {
  it("takes a PNG or JPEG photo up to 2 MB by its first bytes", () => {
    expect(readDesignerPhoto(PNG)).toMatchObject({ ok: true, photo: { contentType: "image/png", extension: "png" } });
    expect(readDesignerPhoto(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]))).toMatchObject({ ok: true, photo: { contentType: "image/jpeg" } });
    expect(readDesignerPhoto(null)).toEqual({ ok: true, photo: null });
    expect(readDesignerPhoto(Buffer.from("GIF89a....."))).toEqual({ ok: false, error: PAGE_MESSAGES.photo });
    expect(readDesignerPhoto(Buffer.from("<svg onload=alert(1)>"))).toEqual({ ok: false, error: PAGE_MESSAGES.photo });
    expect(readDesignerPhoto(Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]))).toEqual({ ok: false, error: PAGE_MESSAGES.photo });
  });

  it("takes up to 4 https links, and names the known services", () => {
    expect(readDesignerLink("behance.net/nur")).toBe("https://behance.net/nur");
    expect(readDesignerLink("https://www.instagram.com/nur.design")).toBe("https://www.instagram.com/nur.design");
    for (const bad of ["http://nur.design", "javascript:alert(1)", "https://user:pw@nur.design", "https://localhost/x", "https://10.0.0.1/", "ftp://nur.design", "https://nur.design:8443/", "data:text/html,hi"]) expect(readDesignerLink(bad), bad).toBeNull();
    expect(readDesignerLinks(["https://nur.design", "", "  ", "https://nur.design"])).toEqual({ ok: true, links: ["https://nur.design/"] });
    expect(readDesignerLinks(["a.com", "b.com", "c.com", "d.com", "e.com"])).toEqual({ ok: false, error: PAGE_MESSAGES.links });
    expect(readDesignerLinks(["http://nur.design"])).toEqual({ ok: false, error: PAGE_MESSAGES.links });
    expect(linkLabel("https://www.behance.net/nur")).toBe("Behance");
    expect(linkLabel("https://x.com/nur")).toBe("X");
    expect(linkLabel("https://www.nur.design/work")).toBe("nur.design");
  });

  it("waits for the team the first time; once approved, changes show at once", async () => {
    // Joined with a line about them: pending, and not shown.
    const nur = await designerAccount("Nur", "Calm shops.");
    expect(nur.designer.profileReview).toBe("pending");
    expect(publicProfile(nur.designer)).toEqual({ photoAssetId: null, bio: null });
    // Joined without one: nothing to look at.
    const { client } = await account("Lale");
    const lale = await joinAsDesigner(store, { id: client.id }, { name: "Lale", slug: "lale-paper", country: "TR", bio: "", terms: true }, NOW);
    expect(lale.ok && lale.designer.profileReview).toBe("none");

    expect(nextProfileReview({ profileReview: "none" }, { bio: null, photoAssetId: null, changed: false })).toBe("none");
    expect(nextProfileReview({ profileReview: "none" }, { bio: null, photoAssetId: "p1", changed: true })).toBe("pending");
    expect(nextProfileReview({ profileReview: "declined" }, { bio: "x", photoAssetId: null, changed: false })).toBe("declined");
    expect(nextProfileReview({ profileReview: "declined" }, { bio: "y", photoAssetId: null, changed: true })).toBe("pending");
    expect(nextProfileReview({ profileReview: "approved" }, { bio: "z", photoAssetId: "p2", changed: true })).toBe("approved");

    await store.updateTemplateDesigner(nur.designer.id, { profileReview: "approved", photoAssetId: "11111111-1111-4111-8111-111111111111" }, NOW);
    const approved = (await store.getTemplateDesigner(nur.designer.id))!;
    expect(publicProfile(approved)).toEqual({ photoAssetId: "11111111-1111-4111-8111-111111111111", bio: "Calm shops." });
    expect(designerChip(approved).photoUrl).toMatch(/\/api\/v1\/assets\/11111111-1111-4111-8111-111111111111$/);
    expect(await updateDesignerProfile(store, approved, { name: "Nur", slug: approved.slug, country: "TR", bio: "Calm shops, bright colours." }, LATER)).toEqual({ ok: true });
    expect(await store.getTemplateDesigner(nur.designer.id)).toMatchObject({ profileReview: "approved", bio: "Calm shops, bright colours." });
  });
});

describe("106.14 ratings", () => {
  it("only an account that got the template rates it, once, and changes it in place", async () => {
    const nur = await designerAccount("Nur");
    const template = await published(nur);
    const buyer = await account("Ahmed Kamal Hassan");
    expect(await mayRate(store, template, buyer.client.id)).toEqual({ ok: false, error: PAGE_MESSAGES.notBuyer });
    expect(await rateTemplate(store, template, { clientId: buyer.client.id, name: buyer.user.name }, { stars: 5, comment: "" }, NOW)).toEqual({ ok: false, errors: { form: PAGE_MESSAGES.notBuyer } });
    // The designer can't rate their own.
    expect(await rateTemplate(store, template, { clientId: nur.client.id, name: "Nur" }, { stars: 5, comment: "" }, NOW)).toEqual({ ok: false, errors: { form: PAGE_MESSAGES.ownTemplate } });

    await licence(buyer.client.id, template.id);
    expect(await rateTemplate(store, template, { clientId: buyer.client.id, name: buyer.user.name }, { stars: 0, comment: "" }, NOW)).toMatchObject({ ok: false, errors: { stars: PAGE_MESSAGES.stars } });
    expect(await rateTemplate(store, template, { clientId: buyer.client.id, name: buyer.user.name }, { stars: "4.5", comment: "" }, NOW)).toMatchObject({ ok: false, errors: { stars: PAGE_MESSAGES.stars } });
    expect(await rateTemplate(store, template, { clientId: buyer.client.id, name: buyer.user.name }, { stars: 4, comment: "x".repeat(1001) }, NOW)).toMatchObject({ ok: false, errors: { comment: PAGE_MESSAGES.comment } });

    const first = await rateTemplate(store, template, { clientId: buyer.client.id, name: buyer.user.name }, { stars: "4", comment: "  Lovely shop.\r\n\r\n\r\n\r\nFast.  " }, NOW);
    expect(first).toMatchObject({ ok: true, created: true, rating: { stars: 4, comment: "Lovely shop.\n\nFast.", authorName: "Ahmed H.", designerId: nur.designer.id } });
    const again = await rateTemplate(store, template, { clientId: buyer.client.id, name: buyer.user.name }, { stars: 5, comment: "" }, LATER);
    expect(again).toMatchObject({ ok: true, created: false, rating: { stars: 5, comment: null, createdAt: NOW, updatedAt: LATER } });
    expect(first.ok && again.ok && first.rating.id === again.rating.id).toBe(true);
    expect(await store.listMarketRatings({ templateIds: [template.id] })).toHaveLength(1);
    // A plan that ended still lets them rate (they had it).
    expect(readRating({ stars: 3, comment: "" })).toEqual({ ok: true, stars: 3, comment: null });
    expect(ratingAuthorName("Zeynep")).toBe("Zeynep");
    expect(ratingAuthorName("  ")).toBe("");
    expect(ratingAuthorName("محمد علي")).toBe("محمد ع.");
  });

  it("the designer answers each rating once (changes it, or takes it away); another designer can't", async () => {
    const nur = await designerAccount("Nur");
    const lale = await designerAccount("Lale");
    const template = await published(nur);
    const buyer = await account("Tulip Gifts");
    await licence(buyer.client.id, template.id);
    const rated = await rateTemplate(store, template, { clientId: buyer.client.id, name: buyer.user.name }, { stars: 3, comment: "Good, but the cart is small." }, NOW);
    if (!rated.ok) throw new Error("rate");
    expect(await replyToRating(store, lale.designer, rated.rating.id, "Not mine", NOW)).toEqual({ ok: false, error: PAGE_MESSAGES.gone });
    expect(await replyToRating(store, nur.designer, rated.rating.id, "y".repeat(1001), NOW)).toEqual({ ok: false, error: PAGE_MESSAGES.reply });
    expect(await replyToRating(store, nur.designer, rated.rating.id, "Thanks! A bigger cart is in the next version.", NOW)).toEqual({ ok: true, removed: false });
    expect(await replyToRating(store, nur.designer, rated.rating.id, "Thanks! It is in version 2.", LATER)).toEqual({ ok: true, removed: false });
    expect(await store.getMarketRating(rated.rating.id)).toMatchObject({ reply: "Thanks! It is in version 2.", repliedAt: LATER });
    expect(await replyToRating(store, nur.designer, rated.rating.id, "   ", LATER)).toEqual({ ok: true, removed: true });
    expect(await store.getMarketRating(rated.rating.id)).toMatchObject({ reply: null, repliedAt: null });
    expect(await replyToRating(store, nur.designer, "missing", "Hi", LATER)).toEqual({ ok: false, error: PAGE_MESSAGES.gone });
  });

  it("averages the visible ratings; a rating the team hid is out of the pages and the average", async () => {
    const nur = await designerAccount("Nur");
    const template = await published(nur);
    const ids: string[] = [];
    for (const stars of [5, 4, 1]) {
      const buyer = await account(`Buyer ${stars}`);
      await licence(buyer.client.id, template.id);
      const r = await rateTemplate(store, template, { clientId: buyer.client.id, name: buyer.user.name }, { stars, comment: stars === 1 ? "Abusive words" : "" }, NOW);
      if (r.ok) ids.push(r.rating.id);
    }
    expect((await templateRatings(store, template, "Peony")).stats).toEqual({ average: 3.3, count: 3 });
    await store.hideMarketRating(ids[2]!, { at: NOW, by: "deniz@yallapp.test", reason: "Abusive" });
    const { ratings, stats } = await templateRatings(store, template, "Peony");
    expect(stats).toEqual({ average: 4.5, count: 2 });
    expect(ratings.map((r) => r.id)).not.toContain(ids[2]);
    // The card on the market shows it too.
    const card = (await marketCatalog(store, "en", NOW, blobs)).cards.find((c) => c.id === template.id)!;
    expect(card.rating).toEqual({ average: 4.5, count: 2 });
    expect(card.designer).toMatchObject({ slug: nur.designer.slug, page: true });
    expect(ratingStats({})).toEqual({ average: null, count: 0 });
    expect(ratingStats({ a: { count: 2, sum: 9 }, b: { count: 1, sum: 1 } }, ["a"])).toEqual({ average: 4.5, count: 2 });
  });
});

describe("106.14 the public page", () => {
  it("shows the profile, the templates, the rating, the buyers and the ratings with the answer, and never the account", async () => {
    const nur = await designerAccount("Nur");
    const first = await published(nur, "Peony House");
    const second = await published(nur, "Tulip Corner");
    for (const [name, t, stars] of [["Ahmed Kamal", first, 5], ["Lale Su", first, 4], ["Ahmed Kamal 2", second, 3]] as const) {
      const buyer = await account(name);
      await licence(buyer.client.id, t.id);
      await rateTemplate(store, t, { clientId: buyer.client.id, name }, { stars, comment: `${stars} stars` }, NOW);
    }
    const page = (await publicDesigner(store, nur.designer.slug, "en", NOW))!;
    expect(page.cards.map((c) => c.title).sort()).toEqual(["Peony House", "Tulip Corner"]);
    expect(page.overall).toEqual({ average: 4, count: 3 });
    expect(page.buyers).toBe(3);
    expect(page.ratings.map((r) => r.authorName).sort()).toEqual(["Ahmed 2.", "Ahmed K.", "Lale S."]);
    // Pending: no photo, no line; country and links hidden unless chosen.
    expect(page).toMatchObject({ photoUrl: null, bio: null, country: null, links: [] });
    const json = JSON.stringify(page.ratings);
    expect(json).not.toContain("@designer.test");
    expect(Object.keys(page.ratings[0]!)).not.toContain("clientId");

    await store.updateTemplateDesigner(nur.designer.id, { profileReview: "approved", photoAssetId: "22222222-2222-4222-8222-222222222222", showCountry: true, links: ["https://behance.net/nur"], showLinks: true }, LATER);
    const shown = (await publicDesigner(store, nur.designer.slug, "en", LATER))!;
    expect(shown).toMatchObject({ bio: "Calm shops.", country: "TR", links: [{ url: "https://behance.net/nur", label: "Behance" }] });
    expect(shown.photoUrl).toMatch(/22222222-2222-4222-8222-222222222222$/);
    // Links chosen but not shown, country not shown: neither on the page.
    await store.updateTemplateDesigner(nur.designer.id, { showCountry: false, showLinks: false }, LATER);
    expect(await publicDesigner(store, nur.designer.slug, "en", LATER)).toMatchObject({ country: null, links: [] });

    const ld = designerProfileLd(BASE, "ar", shown);
    expect(ld).toMatchObject({ "@type": "ProfilePage", url: `${BASE}/ar/designers/${nur.designer.slug}`, mainEntity: { "@type": "Person", name: "Nur", description: "Calm shops.", sameAs: ["https://behance.net/nur"] }, hasPart: { numberOfItems: 2 } });
    expect(JSON.stringify(ld)).not.toContain("TR\"");
    const product = templateProductLd(BASE, "en", { slug: "x", title: "X", description: "", designer: "Nur", kinds: [], freeName: "Free", plans: [], rating: { average: 4.5, count: 2 } });
    expect(product.aggregateRating).toEqual({ "@type": "AggregateRating", ratingValue: "4.5", ratingCount: 2, bestRating: 5, worstRating: 1 });
    expect(templateProductLd(BASE, "en", { slug: "x", title: "X", description: "", designer: "Nur", kinds: [], freeName: "Free", plans: [], rating: { average: null, count: 0 } }).aggregateRating).toBeUndefined();
  });

  it("is page not found when locked by the team, suspended, with no published template, or a bad address; and only open pages are in the sitemap", async () => {
    const nur = await designerAccount("Nur");
    expect(await publicDesigner(store, nur.designer.slug, "en", NOW)).toBeNull();
    await published(nur);
    expect(await publicDesigner(store, nur.designer.slug, "en", NOW)).not.toBeNull();
    expect((await publicDesignerSlugs(store, NOW)).map((d) => d.slug)).toContain(nur.designer.slug);

    await store.updateTemplateDesigner(nur.designer.id, { pageLockedAt: NOW, pageLockedReason: "Spam" }, NOW);
    expect(await publicDesigner(store, nur.designer.slug, "en", NOW)).toBeNull();
    expect((await publicDesignerSlugs(store, NOW)).map((d) => d.slug)).not.toContain(nur.designer.slug);
    // Their templates stay on the market, the name without a link to the page.
    const card = (await marketCatalog(store, "en", NOW, blobs)).cards.find((c) => c.designer.id === nur.designer.id)!;
    expect(card.designer.page).toBe(false);

    await store.updateTemplateDesigner(nur.designer.id, { pageLockedAt: null, pageLockedReason: null, status: "suspended" }, NOW);
    expect(await publicDesigner(store, nur.designer.slug, "en", NOW)).toBeNull();
    for (const bad of ["", "../etc", "NUR", "a".repeat(61)]) expect(await publicDesigner(store, bad, "en", NOW), bad).toBeNull();

    const entries = designerSitemapEntries(BASE, [{ slug: "studio-nur", updatedAt: NOW }]);
    expect(entries.map((e) => e.url)).toEqual([`${BASE}/designers/studio-nur`, `${BASE}/ar/designers/studio-nur`, `${BASE}/tr/designers/studio-nur`]);
    expect(entries[0]!.alternates?.languages).toMatchObject({ ar: `${BASE}/ar/designers/studio-nur`, tr: `${BASE}/tr/designers/studio-nur` });
  });

  it("draws the ratings with the designer's answer, in Arabic too", async () => {
    const rating = { id: "r1", templateId: "t1", templateSlug: "peony", templateTitle: "Peony House", stars: 4, comment: "تصميم هادئ", authorName: "أحمد ك.", createdAt: NOW, updatedAt: LATER, reply: "شكرًا لك!", repliedAt: LATER };
    const list = createElement(RatingList, {
      ratings: [rating],
      words: { someone: "x", replyFrom: (name: string) => `رد من ${name}`, date: () => "24 نوفمبر 2026", edited: designersText("ar").edited, onTemplate: (t: string) => `عن ${t}` },
      designerName: "نور",
      templateHref: (s: string) => `/ar/templates/${s}`,
      empty: "—",
    });
    const html = renderToStaticMarkup(createElement(DashboardI18n, { lang: "ar", messages: marketCatalogFor("ar"), knownEnglish: {} } as ComponentProps<typeof DashboardI18n>, list));
    expect(html).toContain("تصميم هادئ");
    expect(html).toContain("رد من نور");
    expect(html).toContain("شكرًا لك!");
    expect(html).toContain('href="/ar/templates/peony"');
    expect(html).toContain("4 من 5");
    expect(html).toContain("معدَّل");
    const empty = renderToStaticMarkup(createElement(RatingList, { ratings: [], words: { someone: "", replyFrom: () => "", date: () => "", edited: "" }, designerName: "", empty: designersText("en").noRatings }));
    expect(empty).toContain("No ratings yet.");
  });

  it("has its words in English, Arabic and Turkish", () => {
    for (const lang of ["en", "ar", "tr"] as const) {
      const x = designersText(lang);
      for (const [key, value] of Object.entries(x)) expect(value, `${lang}.${key}`).toBeTruthy();
      expect(Object.keys(dashboardMessages(lang).marketPage).sort()).toEqual(Object.keys(dashboardMessages("en").marketPage).sort());
      expect(marketCatalogFor(lang).marketPage.ratingsCount).toBeTruthy();
    }
  });
});
