import type { AppStory } from "../data/types";
import type { Action } from "../pages/types";
import { storyText, type ServedStory } from "./elements";

// 165 Serving Dashboard › Stories (the hosted API and Studio's canvas): what is shown now, in a language, and what each button opens.

/** The shop: what a story's button opens when the owner chose nothing (never Home). */
export const SHOP_ACTION: Action = { type: "screen", screen: "courses" };

/** Whether a story is shown now: on, and between its dates. */
export function storyLive(story: Pick<AppStory, "enabled" | "startsAt" | "endsAt">, now: Date): boolean {
  if (!story.enabled) return false;
  if (story.startsAt && story.startsAt.getTime() > now.getTime()) return false;
  if (story.endsAt && story.endsAt.getTime() <= now.getTime()) return false;
  return true;
}

/**
 * 165 What a story's button opens: the owner's choice; with none, the shop
 * (on the story's category when it has one), never Home. The app follows it
 * on the same path as every other tap (mobile runPageAction).
 */
export function storyAction(story: Pick<AppStory, "action" | "categoryId">): Action {
  if (story.action) return story.action;
  return story.categoryId ? { ...SHOP_ACTION, category_id: story.categoryId } : SHOP_ACTION;
}

/** The stories as an app gets them now: those live, in their order, each in `lang` (else the main language). */
export function servedStories(stories: readonly AppStory[], lang: string, def: string, now: Date): ServedStory[] {
  return stories
    .filter((s) => storyLive(s, now))
    .map((s) => ({
      id: s.id,
      imageUrl: s.media.imageUrl,
      videoUrl: s.media.kind === "video" ? s.media.videoUrl : null,
      kicker: storyText(s, "kicker", lang, def),
      title: storyText(s, "title", lang, def),
      line: storyText(s, "line", lang, def),
      ring: storyText(s, "ring", lang, def),
      button: storyText(s, "button", lang, def),
      icon: s.icon,
      action: storyAction(s),
    }));
}

