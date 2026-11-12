import type { Lang } from "@/i18n/config";
import type { OccasionText } from "@/site/occasions/types";
import { BLACK_FRIDAY_AR } from "./ar";
import { BLACK_FRIDAY_EN } from "./en";
import { BLACK_FRIDAY_TR } from "./tr";

/** 124 Black Friday's page in each language (src/site/occasions). */
const COPY: Record<Lang, OccasionText> = { en: BLACK_FRIDAY_EN, ar: BLACK_FRIDAY_AR, tr: BLACK_FRIDAY_TR };

export function blackFridayCopyFor(lang: Lang): OccasionText {
  return COPY[lang];
}
