import type { Lang } from "@/i18n/config";
import type { StoryCopy } from "@/site/story/types";
import { STORIES_AR } from "./ar";
import { STORIES_EN } from "./en";
import { STORIES_TR } from "./tr";

/** The Studio story pages' words in each language (src/site/story). */
const COPY: Record<Lang, StoryCopy> = { en: STORIES_EN, ar: STORIES_AR, tr: STORIES_TR };

export function storyCopyFor(lang: Lang): StoryCopy {
  return COPY[lang];
}
