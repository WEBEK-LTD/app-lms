import type { DataStore } from "../data/store";
import type { App, AppStory, AppStoryMedia, AppStoryTexts } from "../data/types";
import { appOpensScreen, itemSourcesFor } from "../pages/sources";
import { ACTION_TYPES, SCREENS, type Action, type ItemSource, type StudioNode } from "../pages/types";
import { mediaAddress } from "../pages/validate";
import type { DashKey } from "../../i18n/dashboard";
import { designedStories, dashboardStoryElements, type DesignedStory } from "./elements";
export { SHOP_ACTION, servedStories, storyAction, storyLive } from "./serve";

/**
 * 165 Dashboard › Stories: the app's stories, each its photo or video, its
 * kicker, title and line, the ring's name and icon, its button (its words
 * and what it opens) and the category it belongs to, in every language the
 * app has (Arabic and Turkish beside its main one), on or off and between
 * two dates if the owner likes. They are served into the Studio elements
 * whose source is the dashboard (lib/stories/elements.ts), in the language
 * the app asks for, so the apps in the stores show them without a new build.
 */

export const STORY_LIMITS = { stories: 20, kicker: 40, title: 80, line: 160, ring: 24, button: 30 } as const;
export const STORY_TEXT_PARTS = ["kicker", "title", "line", "ring", "button"] as const satisfies readonly (keyof AppStoryTexts)[];

/** What the dashboard sends for a story. */
export interface StoryInput {
  enabled?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  media?: unknown;
  texts?: unknown;
  icon?: unknown;
  action?: unknown;
  categoryId?: unknown;
}

export type StoryFields = Pick<AppStory, "enabled" | "startsAt" | "endsAt" | "media" | "texts" | "icon" | "action" | "categoryId">;

export type StoryParse = { ok: true; value: StoryFields } | { ok: false; errors: DashKey[] };

export interface StoryRules {
  app: Pick<App, "appType" | "backend" | "vertical"> & Partial<Pick<App, "connector">>;
  /** The app's languages (its main one first); Arabic and Turkish are always kept too. */
  languages: string[];
  /** The Studio pages a button may open. */
  slugs: Set<string>;
}

const record = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const ICON = /^[a-z0-9_]{1,48}$/;
const ENTRY_ID = /^[A-Za-z0-9_.:-]{1,64}$/;
const LANG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

function time(v: unknown): Date | null | undefined {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** What a story's button opens, checked against what the app has: a page, a screen, a category, an entry, a course or a link. */
export function parseStoryAction(value: unknown, rules: StoryRules): Action | null | "bad" {
  if (value === undefined || value === null) return null;
  const v = record(value);
  if (!v || typeof v.type !== "string" || !(ACTION_TYPES as readonly string[]).includes(v.type)) return "bad";
  const sources: ItemSource[] = itemSourcesFor(rules.app);
  switch (v.type) {
    case "page":
      return typeof v.page_slug === "string" && rules.slugs.has(v.page_slug) ? { type: "page", page_slug: v.page_slug } : "bad";
    case "screen": {
      if (typeof v.screen !== "string" || !(SCREENS as readonly string[]).includes(v.screen) || !appOpensScreen(rules.app, v.screen)) return "bad";
      if (v.category_id !== undefined && v.category_id !== null && v.category_id !== "") {
        if (v.screen !== "courses" || typeof v.category_id !== "string" || !ENTRY_ID.test(v.category_id)) return "bad";
        return { type: "screen", screen: "courses", category_id: v.category_id };
      }
      return { type: "screen", screen: v.screen as Action["screen"] };
    }
    case "course": {
      const id = Number(v.course_id);
      return sources.includes("courses") && Number.isSafeInteger(id) && id > 0 ? { type: "course", course_id: id } : "bad";
    }
    case "item": {
      const item = record(v.item);
      const id = typeof item?.id === "string" ? item.id.trim() : "";
      return item && sources.includes(item.source as ItemSource) && ENTRY_ID.test(id) ? { type: "item", item: { source: item.source as ItemSource, id } } : "bad";
    }
    case "url": {
      const url = typeof v.url === "string" ? v.url.trim() : "";
      let ok = false;
      try {
        ok = /^https?:$/.test(new URL(url).protocol) && url.length <= 2000;
      } catch {
        ok = false;
      }
      return ok ? { type: "url", url, open_in: v.open_in === "browser" ? "browser" : "in_app" } : "bad";
    }
  }
  return "bad";
}

/** The languages a story is written in: the app's (its main one first), then Arabic and Turkish. */
export function storyLanguages(appLanguages: readonly string[]): string[] {
  return [...new Set([...appLanguages, "ar", "tr"])];
}

/** Checks a story the dashboard sends and keeps only what it knows. */
export function parseStory(input: StoryInput, rules: StoryRules): StoryParse {
  const errors = new Set<DashKey>();
  const media = record(input.media);
  const kind = media?.kind === "video" ? "video" : "image";
  const address = (v: unknown) => (typeof v === "string" && v.trim() ? mediaAddress(v.trim()) : null);
  const imageUrl = address(media?.imageUrl);
  const videoUrl = kind === "video" ? address(media?.videoUrl) : null;
  if ((typeof media?.imageUrl === "string" && media.imageUrl.trim() && !imageUrl) || (kind === "video" && typeof media?.videoUrl === "string" && media.videoUrl.trim() && !videoUrl)) errors.add("stories.errMediaLink");
  else if (kind === "image" ? !imageUrl : !videoUrl) errors.add(kind === "image" ? "stories.errPhoto" : "stories.errVideo");
  const known = new Set(storyLanguages(rules.languages));
  const texts: Record<string, AppStoryTexts> = {};
  for (const [lang, value] of Object.entries(record(input.texts) ?? {})) {
    if (!LANG.test(lang) || !known.has(lang)) continue;
    const t = record(value) ?? {};
    const out: AppStoryTexts = {};
    for (const part of STORY_TEXT_PARTS) {
      const text = typeof t[part] === "string" ? (t[part] as string).trim() : "";
      if (text.length > STORY_LIMITS[part]) errors.add("stories.errTooLong");
      if (text) out[part] = text.slice(0, STORY_LIMITS[part]);
    }
    if (Object.keys(out).length) texts[lang] = out;
  }
  const main = rules.languages[0] ?? "en";
  if (!texts[main]?.title && !texts[main]?.ring) errors.add("stories.errTitle");
  const icon = input.icon === undefined || input.icon === null || input.icon === "" ? null : typeof input.icon === "string" && ICON.test(input.icon) ? input.icon : undefined;
  if (icon === undefined) errors.add("stories.errIcon");
  const action = parseStoryAction(input.action, rules);
  if (action === "bad") errors.add("stories.errAction");
  const categoryId = input.categoryId === undefined || input.categoryId === null || input.categoryId === "" ? null : typeof input.categoryId === "string" && ENTRY_ID.test(input.categoryId) ? input.categoryId : undefined;
  if (categoryId === undefined) errors.add("stories.errCategory");
  const startsAt = time(input.startsAt);
  const endsAt = time(input.endsAt);
  if (startsAt === undefined || endsAt === undefined) errors.add("stories.errDates");
  else if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) errors.add("stories.errDates");
  if (errors.size) return { ok: false, errors: [...errors] };
  const shownMedia: AppStoryMedia = { kind, imageUrl, videoUrl };
  return {
    ok: true,
    value: { enabled: input.enabled !== false, startsAt: startsAt ?? null, endsAt: endsAt ?? null, media: shownMedia, texts, icon: icon ?? null, action: action === "bad" ? null : action, categoryId: categoryId ?? null },
  };
}

// ——— 165 The stories an app's Studio design already shows, copied once ———

/**
 * The stories of a design's story elements that come from the dashboard,
 * merged into one list: Leqaa shows the same occasions as its hero's
 * slides, as rings and (look B) as chips, the n-th of each the same
 * occasion. The slides give the most (kicker, title, line, button), so the
 * first element with slides leads; the others add what it lacks (the
 * ring's name and icon, a photo) when they show as many.
 */
export function designStories(pages: readonly { slug: string; studio?: { body: StudioNode } | null }[], def: string): { key: string; story: DesignedStory }[] {
  const found: { key: string; kind: string; stories: DesignedStory[] }[] = [];
  for (const page of pages) {
    if (!page.studio) continue;
    for (const { node, kind } of dashboardStoryElements(page.studio.body)) found.push({ key: `${page.slug}:${node.id}`, kind, stories: designedStories(node, kind, def) });
  }
  const rank = (k: string) => (k === "slides" ? 0 : k === "rings" ? 1 : 2);
  const lead = [...found].sort((a, b) => rank(a.kind) - rank(b.kind))[0];
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
 * Copies the stories the app's Studio design shows into Dashboard › Stories
 * once (the first time the Stories page opens or the app asks for a page
 * with them): the published design, else the draft. Nothing visible
 * changes: the elements then show the same stories, from the dashboard.
 * Idempotent: each story is copied under its key once, and the app is
 * marked when done; a story the owner removed afterwards stays removed. A
 * design with no such element leaves the app unmarked, to look again once
 * it has one (the template applied later).
 */
/**
 * 165 Whether the owner has saved the app's stories in Dashboard › Stories
 * (`App.storiesSavedAt`; the copy from Studio isn't theirs). Until then the
 * story elements follow the Studio design, the owner's edits there
 * included, so no edit is lost; from then on, the dashboard's. Read as
 * stored now: the app in hand may have been read before the save.
 */
export async function dashboardStoriesSaved(store: DataStore, app: App): Promise<boolean> {
  if (app.storiesSavedAt) return true;
  return Boolean((await store.getAppById(app.id))?.storiesSavedAt);
}

export async function ensureStoriesSeeded(store: DataStore, app: App, now: Date): Promise<number> {
  if (app.storiesSeededAt) return 0;
  // As stored now: the app in hand may have been read before another request copied them (a story removed since stays removed).
  if ((await store.getAppById(app.id))?.storiesSeededAt) return 0;
  const record = await store.getAppLayout(app.id);
  const content = record?.published ?? record?.draft ?? null;
  const designed = content ? designStories(content.pages, content.languages.default) : [];
  // A design without story elements from the dashboard (yet): looked at again next time.
  if (!designed.length) return 0;
  let made = 0;
  {
    const existing = await store.listAppStories(app.id);
    let position = existing.length ? Math.max(...existing.map((s) => s.position)) + 1 : 0;
    for (const { key, story } of designed) {
      const created = await store.createAppStory({
        appId: app.id,
        position: position,
        enabled: true,
        startsAt: null,
        endsAt: null,
        media: story.videoUrl ? { kind: "video", imageUrl: story.imageUrl, videoUrl: story.videoUrl } : { kind: "image", imageUrl: story.imageUrl, videoUrl: null },
        texts: story.texts,
        icon: story.icon,
        action: story.action,
        categoryId: null,
        importKey: key.slice(0, 191),
        createdAt: now,
        updatedAt: now,
      });
      if (created) {
        made += 1;
        position += 1;
      }
    }
  }
  await store.markStoriesSeeded(app.id, now);
  return made;
}
