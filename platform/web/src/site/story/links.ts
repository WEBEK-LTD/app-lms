import type { IconName } from "@/components/icon-names";
import { storyCopyFor } from "@/content/stories";
import { localePath } from "@/i18n/paths";
import type { Lang } from "@/i18n/config";
import { STORIES } from "./stories";
import { STORY_IDS, storyPath, type StoryId } from "./types";

/** The story pages, for the Studio page's and the solution pages' links. */
export function storyLinks(lang: Lang): { id: StoryId; href: string; icon: IconName; name: string; title: string; summary: string }[] {
  const copy = storyCopyFor(lang).stories;
  return STORY_IDS.map((id) => ({ id, href: localePath(lang, storyPath(id)), icon: STORIES[id].icon, name: copy[id].navName, title: copy[id].title, summary: copy[id].summary }));
}

/** The story a solution page belongs to, if any. */
export function storyOfSolution(solution: string): StoryId | null {
  return STORY_IDS.find((id) => STORIES[id].solutions.includes(solution)) ?? null;
}
