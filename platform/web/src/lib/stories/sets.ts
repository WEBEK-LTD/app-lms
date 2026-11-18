import type { DataStore } from "../data/store";
import type { App, AppStory, AppStoryTexts } from "../data/types";
import type { StudioNode } from "../pages/types";
import { templateCategoryList, withShopCategoriesIn, type ShopCategories } from "../studio/shop-categories";
import { mapTree } from "../studio/tree";
import { dashboardStoryElements, designedStories, withServedStories, type DesignedStory, type StoryElementKind } from "./elements";
import { servedStories } from "./serve";

/**
 * 194 Each Studio page's story elements have their own set of stories in
 * Dashboard › Stories (`AppStory.page`, the page's slug): Kech Flora's Home
 * (its hero's slides, its rings) is one, its shop's "Every occasion" rings
 * another, and changing one never changes the other. The stories are what
 * the app shows, in Studio's canvas, its inspector and the Stories page
 * alike:
 *
 * - each set is copied from its page as the app shows it: the design, with
 *   the shop's own categories in a template's list of them (157) — Kech
 *   Flora's shop showed its categories while Dashboard › Stories listed the
 *   template's Love, Birthday…;
 * - a set still all copies (never changed by the owner) is copied again when
 *   the page shows something else (its design changed in Studio, the shop's
 *   categories), until the owner saves in Dashboard › Stories; after that,
 *   only where the app shows the shop's categories in place of the copies'
 *   template words (`syncStorySets`);
 * - a story from before 194 (no `page`) is in the set of the page that led
 *   then (`leadSetSlug`: the one with the hero's slides, Home), where it was
 *   copied from;
 * - a page whose set has no story (a set new in 194, or one the owner
 *   emptied) shows its design and is copied again.
 */

interface SetPage {
  slug: string;
  studio?: { body: StudioNode } | null;
}

const RANK: Record<StoryElementKind, number> = { slides: 0, rings: 1, chips: 2 };

/** The pages with story elements whose stories come from the dashboard, in the layout's order. */
export function storySetPages<P extends SetPage>(pages: readonly P[]): P[] {
  return pages.filter((p) => p.studio && dashboardStoryElements(p.studio.body).length > 0);
}

/** The page whose set the stories from before 194 are in: the one that led the single list then (the hero's slides first). */
export function leadSetSlug(pages: readonly SetPage[]): string | null {
  let best: { slug: string; rank: number } | null = null;
  for (const page of storySetPages(pages)) {
    for (const { kind } of dashboardStoryElements(page.studio!.body)) {
      if (!best || RANK[kind] < best.rank) best = { slug: page.slug, rank: RANK[kind] };
    }
  }
  return best?.slug ?? null;
}

/** A story's set: its page, else the lead's (a story from before 194). */
export function storySetOf(story: Pick<AppStory, "page">, lead: string | null): string | null {
  return story.page ?? lead;
}

/**
 * The stories one page's story elements show, merged into one list: Leqaa
 * shows the same occasions as its hero's slides, as rings and (look B) as
 * chips, the n-th of each the same. The slides give the most (kicker,
 * title, line, button), so the first element with slides leads; the others
 * add what it lacks (the ring's name and icon, a photo) when they show as many.
 */
export function pageStories(page: SetPage, def: string): { key: string; story: DesignedStory }[] {
  if (!page.studio) return [];
  const found = dashboardStoryElements(page.studio.body).map(({ node, kind }) => ({ key: `${page.slug}:${node.id}`, kind, stories: designedStories(node, kind, def) }));
  const lead = [...found].sort((a, b) => RANK[a.kind] - RANK[b.kind])[0];
  if (!lead) return [];
  return lead.stories.map((story, i) => {
    const merged: DesignedStory = { ...story, texts: structuredClone(story.texts) };
    for (const other of found) {
      if (other === lead || other.stories.length !== lead.stories.length) continue;
      const o = other.stories[i]!;
      merged.imageUrl ??= o.imageUrl;
      merged.icon ??= o.icon;
      for (const [lang, t] of Object.entries(o.texts)) {
        if (t.ring && !merged.texts[lang]?.ring) merged.texts[lang] = { ...merged.texts[lang], ring: t.ring };
      }
    }
    return { key: `${lead.key}:${i}`, story: merged };
  });
}

/**
 * The shop's categories for a page's set: only where the element leading
 * it is a template's list of them (the shop page's "Every occasion" rings).
 * On Home the hero's slides lead, the same five occasions as ever; its rings
 * still show the shop's categories over them, as they did (157).
 */
export function setShop(page: SetPage, shop: ShopCategories | null): ShopCategories | null {
  if (!shop || !page.studio) return null;
  const lead = [...dashboardStoryElements(page.studio.body)].sort((a, b) => RANK[a.kind] - RANK[b.kind])[0];
  return lead && templateCategoryList(lead.node) !== null ? shop : null;
}

/** A page's body as the app shows it: the set's stories served into its story elements (in `lang`), the shop's categories in a template's lists of them. */
export function shownBody(body: StudioNode, served: readonly AppStory[] | null, lang: string, def: string, shop: ShopCategories | null, now: Date): StudioNode {
  let out = body;
  if (served) {
    const kinds = new Map(dashboardStoryElements(body).map((e) => [e.node.id, e.kind]));
    const list = servedStories(served, lang, def, now);
    out = mapTree(body, (n) => {
      const kind = kinds.get(n.id);
      return kind ? (withServedStories(n, kind, list) ?? n) : n;
    }) ?? body;
  }
  return shop ? withShopCategoriesIn(out, shop) : out;
}

/**
 * What a page's set is as the app shows it, in every language: from its
 * design (`served` null) or from the set's stories, each language served
 * and read back on its own.
 */
export function shownStories(page: SetPage, served: readonly AppStory[] | null, languages: readonly string[], def: string, shop: ShopCategories | null, now: Date): { key: string; story: DesignedStory }[] {
  if (!page.studio) return [];
  if (!served) return pageStories({ slug: page.slug, studio: { body: shownBody(page.studio.body, null, def, def, shop, now) } }, def);
  const first = pageStories({ slug: page.slug, studio: { body: shownBody(page.studio.body, served, def, def, shop, now) } }, def);
  for (const lang of languages) {
    if (lang === def) continue;
    const other = pageStories({ slug: page.slug, studio: { body: shownBody(page.studio.body, served, lang, def, shop, now) } }, lang);
    if (other.length !== first.length) continue;
    other.forEach((o, i) => {
      const t = o.story.texts[lang];
      const main = first[i]!.story.texts[def];
      // Only what differs from the main language's: a language without its own words falls back to them, as served.
      const own: AppStoryTexts = {};
      for (const [part, text] of Object.entries(t ?? {}) as [keyof AppStoryTexts, string][]) if (text && text !== main?.[part]) own[part] = text;
      if (Object.keys(own).length) first[i]!.story.texts[lang] = own;
    });
  }
  return first;
}

/** Whether a page's story elements change when the shop's categories are put in them (a template's list of them, as the app shows it). */
function categoriesChange(body: StudioNode, served: readonly AppStory[], def: string, shop: ShopCategories | null, now: Date): boolean {
  if (!shop) return false;
  const before = shownBody(body, served, def, def, null, now);
  const after = withShopCategoriesIn(before, shop);
  const ids = new Set(dashboardStoryElements(body).map((e) => e.node.id));
  const pick = (root: StudioNode) => {
    const out: string[] = [];
    mapTree(root, (n) => {
      if (ids.has(n.id)) out.push(JSON.stringify(n));
      return n;
    });
    return out.join("|");
  };
  return pick(before) !== pick(after);
}

const same = (a: readonly AppStory[], b: readonly { story: DesignedStory }[]) =>
  a.length === b.length &&
  a.every((s, i) => {
    const d = b[i]!.story;
    return JSON.stringify([s.media.imageUrl, s.media.kind === "video" ? s.media.videoUrl : null, s.texts, s.icon, s.action]) === JSON.stringify([d.imageUrl, d.videoUrl, d.texts, d.icon, d.action]);
  });

export interface SyncOptions {
  /** The app's languages, its main one first. */
  languages: readonly string[];
  /** The shop's categories (157), or null without a shop. */
  shop: ShopCategories | null;
  /** The owner saved in Dashboard › Stories (`App.storiesSavedAt`). */
  saved: boolean;
}

/**
 * 194 Brings each page's set in line with what the app shows (see above):
 * copies a set with no story, and copies again one that is all copies and
 * shows something else. The owner's own stories, and a set with one of them,
 * a story switched off or with dates, are never touched. Returns the number
 * of stories copied.
 */
export async function syncStorySets(store: DataStore, app: App, now: Date, options: SyncOptions): Promise<number> {
  const record = await store.getAppLayout(app.id);
  const content = record?.published ?? record?.draft ?? null;
  if (!content) return 0;
  const def = content.languages.default;
  const pages = storySetPages(content.pages);
  if (!pages.length) return 0;
  const lead = leadSetSlug(content.pages);
  const all = await store.listAppStories(app.id);
  let position = all.length ? Math.max(...all.map((s) => s.position)) + 1 : 0;
  let made = 0;
  for (const page of pages) {
    const mine = all.filter((s) => storySetOf(s, lead) === page.slug);
    const shop = setShop(page, options.shop);
    let shown: { key: string; story: DesignedStory }[] | null = null;
    if (!mine.length) shown = shownStories(page, null, options.languages, def, shop, now);
    else if (mine.every((s) => s.importKey !== null && s.enabled && !s.startsAt && !s.endsAt)) {
      if (!options.saved) {
        const designed = shownStories(page, null, options.languages, def, shop, now);
        if (!same(mine, designed)) shown = designed;
      } else if (categoriesChange(page.studio!.body, mine, def, shop, now)) shown = shownStories(page, mine, options.languages, def, shop, now);
    }
    if (!shown || !shown.length) continue;
    if (mine.length) await store.removeAppStoryCopies(app.id, mine.map((s) => s.id));
    // In the set's place among the app's stories: where its first one was, else after the others.
    let at = mine.length ? Math.min(...mine.map((s) => s.position)) : position;
    for (const { key, story } of shown) {
      const created = await store.createAppStory({
        appId: app.id,
        position: at,
        enabled: true,
        startsAt: null,
        endsAt: null,
        media: story.videoUrl ? { kind: "video", imageUrl: story.imageUrl, videoUrl: story.videoUrl } : { kind: "image", imageUrl: story.imageUrl, videoUrl: null },
        texts: story.texts,
        icon: story.icon,
        action: story.action,
        categoryId: null,
        importKey: key.slice(0, 191),
        page: page.slug,
        createdAt: now,
        updatedAt: now,
      });
      if (created) {
        made += 1;
        at += 1;
        position = Math.max(position, at);
      }
    }
  }
  return made;
}
