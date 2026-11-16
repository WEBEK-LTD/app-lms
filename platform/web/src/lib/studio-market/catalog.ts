import type { App, MarketTemplate, MarketTemplateCover, MarketTemplateVersion, TemplateApplication, TemplateDesigner, TemplateLicence } from "../data/types";
import type { DataStore } from "../data/store";
import type { LanguageCode, LayoutTab, StudioPage, TabBarStyle } from "../pages/types";
import type { StudioLook } from "@/components/studio/view";
import { kindById } from "../app/kinds";
import { designerInitials, designerTint } from "./designers";
import { getsUpdates, mayMove, nextMoveAt } from "./apply";
import { templateText } from "./templates";
import { offeredPlans, priceTag, type PriceTag } from "./plans";

/**
 * 106 What the market's pages show: the templates' cards (their cover page
 * drawn as the app draws it), the designers, a buyer's licences and a
 * designer's own templates. Buyers see only what the designs show and the
 * designers' public profiles; designers see only the app kind of a buyer's
 * app (never who bought it).
 */

const DAY = 24 * 60 * 60 * 1000;

export interface DesignerChip {
  id: string;
  name: string;
  slug: string;
  initials: string;
  bg: string;
  fg: string;
  country: string;
}

export function designerChip(d: TemplateDesigner): DesignerChip {
  const tint = designerTint(d.slug);
  return { id: d.id, name: d.name, slug: d.slug, initials: designerInitials(d.name), bg: tint.bg, fg: tint.fg, country: d.country };
}

export interface CoverView {
  page: StudioPage;
  look: StudioLook;
  lang: LanguageCode;
  defaultLang: LanguageCode;
}

/** The cover page as a phone draws it, in the reader's language when the template has it. */
export function coverView(cover: MarketTemplateCover | null, languages: readonly string[], lang: string, name: string): CoverView | null {
  if (!cover || !cover.page) return null;
  const tabs = (cover.tabs ?? []) as LayoutTab[];
  return {
    page: cover.page as StudioPage,
    lang: (languages.includes(lang) ? lang : cover.lang) as LanguageCode,
    defaultLang: cover.lang as LanguageCode,
    look: { name, logoUrl: null, brand: cover.brand, font: cover.font, tabs, activeTab: tabs[0]?.id ?? null, ...(cover.tabBar ? { tabBar: cover.tabBar as TabBarStyle } : {}), accent: cover.accent },
  };
}

export interface TemplateCard {
  id: string;
  slug: string;
  title: string;
  short: string;
  kinds: { id: string; name: string; icon: string }[];
  /** Free (no plan to buy), as its price tag says. */
  free: boolean;
  /** 106.2 "Free", "From $X/mo" (the lowest per month) or "$X once" (lifetime only). */
  price: PriceTag;
  designer: DesignerChip;
  cover: CoverView | null;
  /** Apps that took it, and in the last 30 days. */
  applies: number;
  recent: number;
  publishedAt: string | null;
  updatedAt: string;
  isNew: boolean;
  tags: string[];
}

function kindsOf(template: Pick<MarketTemplate, "kinds">): TemplateCard["kinds"] {
  return template.kinds.flatMap((id) => {
    const kind = kindById(id);
    return kind ? [{ id: kind.id, name: kind.name, icon: kind.icon }] : [];
  });
}

export function templateCard(template: MarketTemplate, designer: TemplateDesigner, version: MarketTemplateVersion | null, lang: string, counts: { all: number; recent: number }, now: Date): TemplateCard {
  const text = templateText(template, lang);
  const price = priceTag(template);
  return {
    id: template.id,
    slug: template.slug,
    title: text.title,
    short: text.short,
    kinds: kindsOf(template),
    free: price.kind === "free",
    price,
    designer: designerChip(designer),
    cover: version ? coverView(version.cover, version.languages, lang, text.title) : null,
    applies: counts.all,
    recent: counts.recent,
    publishedAt: template.publishedAt?.toISOString() ?? null,
    updatedAt: template.updatedAt.toISOString(),
    isNew: Boolean(template.publishedAt && now.getTime() - template.publishedAt.getTime() < 7 * DAY),
    tags: template.tags,
  };
}

export interface DesignerCard extends DesignerChip {
  templates: number;
  applies: number;
  covers: CoverView[];
}

export interface MarketCatalog {
  cards: TemplateCard[];
  designers: DesignerCard[];
}

/** Every published template's card, with its designer, its cover and how many apps took it. */
export async function marketCatalog(store: DataStore, lang: string, now: Date): Promise<MarketCatalog> {
  const templates = (await store.listMarketTemplates({ statuses: ["published"] })).filter((t) => t.currentVersionId);
  const [designers, versions, all, recent] = await Promise.all([
    store.listTemplateDesigners([...new Set(templates.map((t) => t.designerId))]),
    store.listMarketTemplateVersions(templates.map((t) => t.currentVersionId!)),
    store.countTemplateLicences(),
    store.countTemplateLicences(new Date(now.getTime() - 30 * DAY)),
  ]);
  const designerOf = new Map(designers.filter((d) => d.status === "active").map((d) => [d.id, d]));
  const versionOf = new Map(versions.map((v) => [v.id, v]));
  const cards = templates.flatMap((t) => {
    const designer = designerOf.get(t.designerId);
    return designer ? [templateCard(t, designer, versionOf.get(t.currentVersionId!) ?? null, lang, { all: all[t.id] ?? 0, recent: recent[t.id] ?? 0 }, now)] : [];
  });
  const byDesigner = new Map<string, TemplateCard[]>();
  for (const card of cards) byDesigner.set(card.designer.id, [...(byDesigner.get(card.designer.id) ?? []), card]);
  const designerCards: DesignerCard[] = [...byDesigner.entries()]
    .map(([id, own]) => ({
      ...designerChip(designerOf.get(id)!),
      templates: own.length,
      applies: own.reduce((n, c) => n + c.applies, 0),
      covers: own.flatMap((c) => (c.cover ? [c.cover] : [])).slice(0, 3),
    }))
    .sort((a, b) => b.applies - a.applies || b.templates - a.templates || a.name.localeCompare(b.name));
  return { cards, designers: designerCards };
}

export type MarketSort = "popular" | "newest" | "name";
export type MarketPrice = "all" | "free" | "paid";

export interface MarketQuery {
  q: string;
  kind: string | null;
  price: MarketPrice;
  sort: MarketSort;
}

export function readMarketQuery(params: Record<string, string | string[] | undefined>): MarketQuery {
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const sort = one("sort");
  const price = one("price");
  return {
    q: one("q").trim().slice(0, 80),
    kind: kindById(one("kind")) ? one("kind") : null,
    price: price === "free" || price === "paid" ? price : "all",
    sort: sort === "newest" || sort === "name" ? sort : "popular",
  };
}

/** The cards a search, a kind, a price and an order leave. */
export function filterCards(cards: readonly TemplateCard[], query: MarketQuery): TemplateCard[] {
  const q = query.q.toLowerCase();
  const shown = cards.filter(
    (c) =>
      (!query.kind || c.kinds.some((k) => k.id === query.kind)) &&
      (query.price === "all" || (query.price === "free") === c.free) &&
      (!q || [c.title, c.short, c.designer.name, ...c.tags, ...c.kinds.map((k) => k.name)].some((text) => text.toLowerCase().includes(q))),
  );
  const newest = (c: TemplateCard) => (c.publishedAt ? Date.parse(c.publishedAt) : 0);
  return shown.sort((a, b) => (query.sort === "newest" ? newest(b) - newest(a) : query.sort === "name" ? a.title.localeCompare(b.title) : b.applies - a.applies || newest(b) - newest(a)));
}

// ——— A buyer's templates ———

export type LicenceState = "active" | "ending" | "not_applied" | "replaced" | "ended";

/** 106.2 A plan ending within these days shows as ending soon (the first reminder goes out then too). */
export const ENDING_SOON_DAYS = 14;

export interface LicenceRow {
  licence: TemplateLicence;
  template: MarketTemplate;
  card: TemplateCard;
  application: TemplateApplication | null;
  app: App | null;
  state: LicenceState;
  /** The application this licence's last one replaced it on, or when it was replaced (Replaced by …). */
  replacedBy: { title: string; at: Date } | null;
  update: boolean;
  mayMove: boolean;
  nextMove: Date | null;
  /** 106.2 A plan for a time (not free, not lifetime): it can be renewed, or bought again once ended. */
  renewable: boolean;
}

/** The buyer's licences with their templates and the app each one is on. */
export async function buyerLicences(store: DataStore, clientId: string, apps: readonly App[], lang: string, now: Date): Promise<LicenceRow[]> {
  const licences = await store.listTemplateLicences({ clientId });
  if (!licences.length) return [];
  const templates = await store.listMarketTemplates({ ids: [...new Set(licences.map((l) => l.templateId))] });
  const templateOf = new Map(templates.map((t) => [t.id, t]));
  const [designers, versions] = await Promise.all([
    store.listTemplateDesigners([...new Set(templates.map((t) => t.designerId))]),
    store.listMarketTemplateVersions([...new Set(licences.map((l) => l.versionId).filter((v): v is string => Boolean(v)))]),
  ]);
  const designerOf = new Map(designers.map((d) => [d.id, d]));
  const versionOf = new Map(versions.map((v) => [v.id, v]));
  const rows: LicenceRow[] = [];
  for (const licence of licences) {
    const template = templateOf.get(licence.templateId);
    const designer = template ? designerOf.get(template.designerId) : undefined;
    if (!template || !designer) continue;
    const applications = await store.listTemplateApplications({ licenceId: licence.id });
    const open = applications.find((a) => !a.endedAt) ?? null;
    const app = licence.appId ? (apps.find((a) => a.id === licence.appId) ?? null) : null;
    const last = applications[0] ?? null;
    let replacedBy: LicenceRow["replacedBy"] = null;
    if (!open && last?.endReason === "replaced" && last.endedAt) {
      const next = (await store.listTemplateApplications({ appId: last.appId })).find((a) => a.replacedId === last.id);
      const nextTemplate = next ? (templateOf.get(next.templateId) ?? (await store.getMarketTemplate(next.templateId))) : null;
      replacedBy = { title: nextTemplate ? templateText(nextTemplate, lang).title : "", at: last.endedAt };
    }
    const ending = licence.endsAt !== null && licence.endsAt.getTime() - now.getTime() <= ENDING_SOON_DAYS * DAY;
    const state: LicenceState = licence.status === "ended" ? "ended" : open && app ? (ending ? "ending" : "active") : replacedBy ? "replaced" : "not_applied";
    rows.push({
      licence,
      template,
      card: templateCard(template, designer, versionOf.get(licence.versionId ?? "") ?? null, lang, { all: 0, recent: 0 }, now),
      application: open,
      app: open ? app : null,
      state,
      replacedBy,
      update: Boolean(open && template.currentVersionId && template.currentVersionId !== open.versionId && getsUpdates(licence, now)),
      mayMove: mayMove(licence, now),
      nextMove: nextMoveAt(licence),
      renewable: licence.plan !== "free" && licence.plan !== "life" && offeredPlans(template).length > 0 && template.status === "published",
    });
  }
  return rows;
}

// ——— A designer's templates ———

export interface SellerRow {
  template: MarketTemplate;
  title: string;
  kinds: TemplateCard["kinds"];
  cover: CoverView | null;
  applies: number;
}

export async function sellerTemplates(store: DataStore, designer: TemplateDesigner, lang: string): Promise<SellerRow[]> {
  const templates = await store.listMarketTemplates({ designerId: designer.id });
  const versionIds = templates.map((t) => t.currentVersionId ?? t.reviewVersionId).filter((v): v is string => Boolean(v));
  const [versions, counts] = await Promise.all([store.listMarketTemplateVersions(versionIds), store.countTemplateLicences()]);
  const versionOf = new Map(versions.map((v) => [v.id, v]));
  return templates.map((template) => {
    const text = templateText(template, lang);
    const version = versionOf.get(template.currentVersionId ?? template.reviewVersionId ?? "");
    return { template, title: text.title, kinds: kindsOf(template), cover: version ? coverView(version.cover, version.languages, lang, text.title) : null, applies: counts[template.id] ?? 0 };
  });
}
