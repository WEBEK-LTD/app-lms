import type { AppStory } from "../data/types";

/** 165 A story as the dashboard and Studio's canvas get it: its times as ISO text. */
export type StoryView = Omit<AppStory, "appId" | "startsAt" | "endsAt" | "createdAt" | "updatedAt" | "importKey"> & {
  startsAt: string | null;
  endsAt: string | null;
  /** Copied from the Studio design. */
  fromStudio: boolean;
  /** 194 Its set: the slug of the page whose story elements show it (`lead`'s for a story from before 194); null: none known. */
  page: string | null;
};

export function storyViewOf(s: AppStory): StoryView {
  return {
    page: s.page ?? null,
    id: s.id,
    position: s.position,
    enabled: s.enabled,
    startsAt: s.startsAt?.toISOString() ?? null,
    endsAt: s.endsAt?.toISOString() ?? null,
    media: s.media,
    texts: s.texts,
    icon: s.icon,
    action: s.action,
    categoryId: s.categoryId,
    fromStudio: s.importKey !== null,
  };
}

/** 194 The stories as views, each with its set: `lead`'s for one from before 194 (lib/stories/sets.ts `leadSetSlug`). */
export function storyViewsOf(stories: readonly AppStory[], lead: string | null): StoryView[] {
  return stories.map((s) => ({ ...storyViewOf(s), page: s.page ?? lead }));
}

/** Back to a story (for serving it on Studio's canvas). */
export function storyOfView(v: StoryView, appId = ""): AppStory {
  const at = new Date(0);
  const { fromStudio: _f, ...rest } = v;
  void _f;
  return { ...rest, page: v.page ?? null, appId, startsAt: v.startsAt ? new Date(v.startsAt) : null, endsAt: v.endsAt ? new Date(v.endsAt) : null, importKey: null, createdAt: at, updatedAt: at };
}
