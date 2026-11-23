import type { MetadataRoute } from "next";
import { LANGS, type Lang } from "@/i18n/config";
import { languageAlternates, localePath } from "@/i18n/paths";
import type { DataStore } from "../data/store";
import type { MarketRating, TemplateDesigner } from "../data/types";
import { designerChip, marketCatalog, type DesignerChip, type TemplateCard } from "./catalog";
import { designerPath, linkLabel, pageOpen, publicProfile, ratingStats, type RatingStats } from "./designer-page";
import { templatePath } from "./public";
import { designerPhotoUrl } from "./house-photo";

/**
 * 106.14 What a designer's public page shows (site/designers.tsx), for
 * visitors and buyers alike: only what the designer chose to make public
 * and what the market shows already. A designer suspended, whose page the
 * team locked or with no published template has no page.
 */

export interface PublicRating {
  id: string;
  templateId: string;
  templateSlug: string;
  templateTitle: string;
  stars: number;
  comment: string | null;
  /** "Ahmed K."; empty when the account had no name (the page says "A Yallapp user"). */
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
  reply: string | null;
  repliedAt: Date | null;
}

export interface PublicDesignerPage {
  designer: TemplateDesigner;
  chip: DesignerChip;
  photoUrl: string | null;
  bio: string | null;
  /** ISO 3166-1 alpha-2, only when they chose to show it. */
  country: string | null;
  links: { url: string; label: string }[];
  cards: TemplateCard[];
  overall: RatingStats;
  buyers: number;
  ratings: PublicRating[];
}

const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A rating as the pages show it: never the buyer's account, only the name it was given with. */
export function publicRating(rating: MarketRating, card: Pick<TemplateCard, "slug" | "title">): PublicRating {
  return {
    id: rating.id,
    templateId: rating.templateId,
    templateSlug: card.slug,
    templateTitle: card.title,
    stars: rating.stars,
    comment: rating.comment,
    authorName: rating.authorName,
    createdAt: rating.createdAt,
    updatedAt: rating.updatedAt,
    reply: rating.reply,
    repliedAt: rating.repliedAt,
  };
}

/** The page at /designers/<handle>, or null ("page not found"). */
export async function publicDesigner(store: DataStore, slug: string, lang: string, now: Date): Promise<PublicDesignerPage | null> {
  if (slug.length > 60 || !HANDLE.test(slug)) return null;
  const designer = await store.getTemplateDesignerBySlug(slug);
  if (!designer || !pageOpen(designer)) return null;
  const catalog = await marketCatalog(store, lang, now);
  const cards = catalog.cards.filter((c) => c.designer.id === designer.id);
  if (!cards.length) return null;
  const ids = cards.map((c) => c.id);
  const [ratings, summaries, buyers] = await Promise.all([store.listMarketRatings({ designerId: designer.id, templateIds: ids, limit: 500 }), store.marketRatingSummaries(ids), store.countDesignerBuyers(designer.id)]);
  const cardOf = new Map(cards.map((c) => [c.id, c]));
  const profile = publicProfile(designer);
  return {
    designer,
    chip: designerChip(designer),
    photoUrl: designerPhotoUrl(designer),
    bio: profile.bio,
    country: designer.showCountry ? designer.country : null,
    links: designer.showLinks ? designer.links.map((url) => ({ url, label: linkLabel(url) })) : [],
    cards,
    overall: ratingStats(summaries),
    buyers,
    ratings: ratings.flatMap((r) => (cardOf.has(r.templateId) ? [publicRating(r, cardOf.get(r.templateId)!)] : [])),
  };
}

/** A template's visible ratings, newest first, for its pages (the website's and the dashboard's). */
export async function templateRatings(store: DataStore, template: { id: string; slug: string }, title: string): Promise<{ ratings: PublicRating[]; stats: RatingStats }> {
  const [ratings, summaries] = await Promise.all([store.listMarketRatings({ templateIds: [template.id], limit: 200 }), store.marketRatingSummaries([template.id])]);
  return { ratings: ratings.map((r) => publicRating(r, { slug: template.slug, title })), stats: ratingStats(summaries) };
}

/** Every open designer page with a published template, and when it last changed, for the sitemap. */
export async function publicDesignerSlugs(store: DataStore, now: Date): Promise<{ slug: string; updatedAt: Date }[]> {
  const catalog = await marketCatalog(store, "en", now);
  const latest = new Map<string, number>();
  for (const card of catalog.cards) if (card.designer.page) latest.set(card.designer.id, Math.max(latest.get(card.designer.id) ?? 0, Date.parse(card.updatedAt)));
  const designers = await store.listTemplateDesigners([...latest.keys()]);
  return designers
    .filter((d) => pageOpen(d))
    .map((d) => ({ slug: d.slug, updatedAt: new Date(Math.max(latest.get(d.id) ?? 0, d.updatedAt.getTime())) }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** The sitemap's entries of the designers' pages: each in every language, each naming all three. */
export function designerSitemapEntries(base: string, designers: readonly { slug: string; updatedAt: Date }[]): MetadataRoute.Sitemap {
  const url = (path: string) => `${base}${path}`;
  return designers.flatMap(({ slug, updatedAt }) => {
    const path = designerPath(slug);
    const languages = Object.fromEntries(Object.entries(languageAlternates(path)).map(([lang, href]) => [lang, url(href)]));
    return LANGS.map((lang) => ({ url: url(localePath(lang, path)), lastModified: updatedAt, priority: 0.5, alternates: { languages } }));
  });
}

type JsonLd = Record<string, unknown>;

/**
 * The page as a ProfilePage about the designer (a Person: their public name,
 * photo, line and links only) with their templates as an ItemList.
 */
export function designerProfileLd(base: string, lang: Lang, page: Pick<PublicDesignerPage, "designer" | "photoUrl" | "bio" | "links" | "cards">): JsonLd {
  const url = `${base}${localePath(lang, designerPath(page.designer.slug))}`;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    inLanguage: lang,
    mainEntity: {
      "@type": "Person",
      "@id": `${url}#designer`,
      name: page.designer.name,
      url,
      ...(page.photoUrl ? { image: page.photoUrl } : {}),
      ...(page.bio ? { description: page.bio } : {}),
      ...(page.links.length ? { sameAs: page.links.map((l) => l.url) } : {}),
    },
    hasPart: {
      "@type": "ItemList",
      numberOfItems: page.cards.length,
      itemListElement: page.cards.map((card, i) => ({ "@type": "ListItem", position: i + 1, name: card.title, url: `${base}${localePath(lang, templatePath(card.slug))}` })),
    },
  };
}
