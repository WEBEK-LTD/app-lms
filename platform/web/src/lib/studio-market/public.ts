import type { MetadataRoute } from "next";
import type { DataStore } from "../data/store";
import type { MarketPlanPeriod, MarketTemplate, MarketTemplateVersion, TemplateDesigner } from "../data/types";
import { LANGS, type Lang } from "@/i18n/config";
import { languageAlternates, localePath } from "@/i18n/paths";
import { MARKET_PERIODS } from "./plans";
import type { PlanPriceNow } from "./listing";
import type { TemplateCard } from "./catalog";

/**
 * 106.13 Studio Market on the website, for visitors who aren't signed in:
 * /templates (in Arabic /ar/templates, in Turkish /tr/templates) and a
 * template's page /templates/<slug>. Only what the dashboard's market shows
 * buyers: published templates of active designers, their cards, plans and
 * pages; never a designer's account, email, ID or payout details. A
 * template not published (a draft, in review, changes requested), with no
 * published version or whose designer is suspended is "page not found" and
 * isn't in the sitemap.
 */

export const MARKET_PATH = "/templates";

/** A template's English address on the website: /templates/<slug>. */
export function templatePath(slug: string): string {
  return `${MARKET_PATH}/${slug}`;
}

/** What a public page may show: published, with a published version, by an active designer. */
export function isPublicTemplate(template: Pick<MarketTemplate, "status" | "currentVersionId"> | null, designer: Pick<TemplateDesigner, "status"> | null): boolean {
  return Boolean(template && template.status === "published" && template.currentVersionId && designer && designer.status === "active");
}

export interface PublicTemplate {
  template: MarketTemplate;
  designer: TemplateDesigner;
  version: MarketTemplateVersion;
}

/** 190 Yallapp's own Studio demos on the market, as this code makes them (lib/studio-market/house.ts, loaded only here). */
async function withHouseTemplates(store: DataStore): Promise<void> {
  const [{ houseTemplatesReady }, { getBlobStore }] = await Promise.all([import("./house"), import("../blobs")]);
  await houseTemplatesReady(store, getBlobStore(), new Date());
}

/** The template at /templates/<slug>, or null (the page is then "page not found"). 190 One of Yallapp's own is there before the market was first read. */
export async function publicTemplate(store: DataStore, slug: string): Promise<PublicTemplate | null> {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  let template = await store.getMarketTemplateBySlug(slug);
  if (!template) {
    await withHouseTemplates(store);
    template = await store.getMarketTemplateBySlug(slug);
  }
  if (!template || !template.currentVersionId) return null;
  const [designer, version] = await Promise.all([store.getTemplateDesigner(template.designerId), store.getMarketTemplateVersion(template.currentVersionId)]);
  if (!version || !isPublicTemplate(template, designer)) return null;
  return { template, designer: designer!, version };
}

/** Every public template's address and when it last changed, for the sitemap. */
export async function publicTemplateSlugs(store: DataStore): Promise<{ slug: string; updatedAt: Date }[]> {
  await withHouseTemplates(store);
  const templates = (await store.listMarketTemplates({ statuses: ["published"] })).filter((t) => t.currentVersionId);
  const designers = new Map((await store.listTemplateDesigners([...new Set(templates.map((t) => t.designerId))])).map((d) => [d.id, d]));
  return templates
    .filter((t) => isPublicTemplate(t, designers.get(t.designerId) ?? null))
    .map((t) => ({ slug: t.slug, updatedAt: t.updatedAt }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** The sitemap's entries of the templates: each one in every language, each naming all three (hreflang, English as x-default). */
export function templateSitemapEntries(base: string, templates: readonly { slug: string; updatedAt: Date }[]): MetadataRoute.Sitemap {
  const url = (path: string) => `${base}${path}`;
  return templates.flatMap(({ slug, updatedAt }) => {
    const path = templatePath(slug);
    const languages = Object.fromEntries(Object.entries(languageAlternates(path)).map(([lang, href]) => [lang, url(href)]));
    return LANGS.map((lang) => ({ url: url(localePath(lang, path)), lastModified: updatedAt, priority: 0.6, alternates: { languages } }));
  });
}

// ——— Back to the dashboard after signing up or in ———

/**
 * 106.13 Someone signed out who chose a plan or "Preview it on my app
 * first" on the website: a cookie for an hour holding where to go once they
 * have an account (only one of these dashboard addresses, checked again when
 * it is read), so signing up or in takes them back to checkout or the demo.
 */
export const MARKET_NEXT_COOKIE = "yallapp_market_next";
export const MARKET_NEXT_TTL_SECONDS = 60 * 60;

export type MarketNextTo = "checkout" | "preview" | "template";

const SLUG = "[a-z0-9-]{1,120}";
const PERIODS = MARKET_PERIODS.join("|");
const NEXT_PAGE = new RegExp(`^/studio/market/(?:checkout/${SLUG}\\?plan=(?:${PERIODS})|t/${SLUG}(?:\\?demo=mine)?)$`);

/** The dashboard address for a template: its checkout with the plan, its demo on the buyer's app, or its page (a free one is applied there). */
export function marketNextPath(to: MarketNextTo, slug: string, plan?: string | null): string | null {
  if (!new RegExp(`^${SLUG}$`).test(slug)) return null;
  if (to === "checkout") return MARKET_PERIODS.includes(plan as MarketPlanPeriod) ? `/studio/market/checkout/${slug}?plan=${plan}` : null;
  if (to === "preview") return `/studio/market/t/${slug}?demo=mine`;
  return `/studio/market/t/${slug}`;
}

/** The cookie's address when it is one of ours, else null. */
export function safeMarketNext(value: string | null | undefined): string | null {
  return value && NEXT_PAGE.test(value) ? value : null;
}

/** The website's link that remembers the dashboard address and opens sign-up (or sign-in): /api/studio-market/continue. */
export function continueHref(lang: Lang, to: MarketNextTo, slug: string, account: "sign-up" | "sign-in" = "sign-up"): string {
  const params = new URLSearchParams({ to, slug, lang });
  if (account === "sign-in") params.set("account", "sign-in");
  // The plan's period goes last: the page adds it (`plan=`), as the visitor picks one.
  return `/api/studio-market/continue?${params.toString()}${to === "checkout" ? "&plan=" : ""}`;
}

// ——— Structured data ———

type JsonLd = Record<string, unknown>;

/** The market's templates as an ItemList, in the order shown. */
export function marketItemListLd(base: string, lang: Lang, name: string, cards: readonly Pick<TemplateCard, "slug" | "title">[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    inLanguage: lang,
    url: `${base}${localePath(lang, MARKET_PATH)}`,
    numberOfItems: cards.length,
    itemListElement: cards.map((card, i) => ({ "@type": "ListItem", position: i + 1, name: card.title, url: `${base}${localePath(lang, templatePath(card.slug))}` })),
  };
}

const dollars = (cents: number) => (cents / 100).toFixed(2);

/**
 * A template as a Product with an Offer per plan at its price now (a free
 * one: one Offer at 0), in US dollars; a flash sale's end as the offer's
 * `priceValidUntil`. The designer is named by their public name only.
 */
export function templateProductLd(
  base: string,
  lang: Lang,
  input: {
    slug: string;
    title: string;
    description: string;
    designer: string;
    kinds: string[];
    freeName: string;
    plans: readonly (Pick<PlanPriceNow, "period" | "cents" | "flashEndsAt"> & { name: string })[];
    /** 106.14 Its buyers' visible ratings (an AggregateRating once it has one). */
    rating?: { average: number | null; count: number };
  },
): JsonLd {
  const url = `${base}${localePath(lang, templatePath(input.slug))}`;
  const offer = (name: string, cents: number, until: string | null) => ({
    "@type": "Offer",
    name,
    price: dollars(cents),
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url,
    ...(until ? { priceValidUntil: until.slice(0, 10) } : {}),
  });
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: input.title,
    ...(input.description ? { description: input.description } : {}),
    sku: input.slug,
    url,
    inLanguage: lang,
    category: "App design template",
    ...(input.kinds.length ? { keywords: input.kinds.join(", ") } : {}),
    brand: { "@type": "Brand", name: input.designer },
    ...(input.rating?.count && input.rating.average !== null ? { aggregateRating: { "@type": "AggregateRating", ratingValue: input.rating.average.toFixed(1), ratingCount: input.rating.count, bestRating: 5, worstRating: 1 } } : {}),
    offers: input.plans.length ? input.plans.map((p) => offer(p.name, p.cents, p.flashEndsAt)) : [offer(input.freeName, 0, null)],
  };
}
