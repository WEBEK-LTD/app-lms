import type { AppStory } from "../data/types";

/** 165 A story as the dashboard and Studio's canvas get it: its times as ISO text. */
export type StoryView = Omit<AppStory, "appId" | "startsAt" | "endsAt" | "createdAt" | "updatedAt" | "importKey"> & {
  startsAt: string | null;
  endsAt: string | null;
  /** Copied from the Studio design. */
  fromStudio: boolean;
};

export function storyViewOf(s: AppStory): StoryView {
  return {
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

/** Back to a story (for serving it on Studio's canvas). */
export function storyOfView(v: StoryView, appId = ""): AppStory {
  const at = new Date(0);
  const { fromStudio: _f, ...rest } = v;
  void _f;
  return { ...rest, appId, startsAt: v.startsAt ? new Date(v.startsAt) : null, endsAt: v.endsAt ? new Date(v.endsAt) : null, importKey: null, createdAt: at, updatedAt: at };
}
