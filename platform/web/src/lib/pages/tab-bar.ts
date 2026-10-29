import { LAYOUT_LIMITS } from "./types";

/**
 * 109 The bottom tabs as an app shows them: all of them up to five; with
 * more, the first four and a More tab that opens the rest as a list.
 */

export const MORE_TAB_ID = "more";

/** The More tab's name in the app's language; English for the others. */
const MORE_LABEL: Record<string, string> = { en: "More", ar: "المزيد", tr: "Daha fazla", fr: "Plus", de: "Mehr", es: "Más", it: "Altro", pt: "Mais", ru: "Ещё", fa: "بیشتر", ur: "مزید" };

export function moreLabel(lang: string): string {
  return MORE_LABEL[lang] ?? MORE_LABEL.en!;
}

/** The tabs shown in the bar and the ones in the More list. */
export function splitTabs<T>(tabs: readonly T[]): { shown: T[]; more: T[] } {
  if (tabs.length <= LAYOUT_LIMITS.shownTabs) return { shown: [...tabs], more: [] };
  return { shown: tabs.slice(0, LAYOUT_LIMITS.shownTabs - 1), more: tabs.slice(LAYOUT_LIMITS.shownTabs - 1) };
}

/** The More tab as an app gets it (`NavTab`, target `more`). */
export function moreTab(lang: string) {
  return { id: MORE_TAB_ID, label: moreLabel(lang), icon: "apps", target: { type: "more" as const } };
}
