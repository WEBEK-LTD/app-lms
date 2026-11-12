import "server-only";
import { blackFridayCopyFor } from "@/content/occasions";
import { getStore } from "@/lib/data";
import { currentOccasion } from "@/lib/occasions";
import { occasionsOf } from "@/lib/occasions/store";
import type { OccasionRecord } from "@/lib/data/types";
import { localePath } from "@/i18n/paths";
import type { Lang } from "@/i18n/config";
import { formatMessage } from "@/i18n/format";
import { FALLBACK_BLACK_FRIDAY, occasionValues, occasionView } from "./offer";
import { BLACK_FRIDAY_PATH } from "./types";

/**
 * 124 Black Friday as the team saved it (Admin › Occasions, `occasionsOf`):
 * the one on now, else the next, else the last. Until the team saves one,
 * or when the database can't be read (a build), lib/occasions' defaults
 * for 2026 (`FALLBACK_BLACK_FRIDAY`).
 */
export async function blackFridayOccasion(now: Date): Promise<OccasionRecord> {
  try {
    return currentOccasion(await occasionsOf(await getStore()), "black_friday", now) ?? FALLBACK_BLACK_FRIDAY;
  } catch {
    return FALLBACK_BLACK_FRIDAY;
  }
}

/** The footer's link to Black Friday's page while the offer is on or about to start; null otherwise. */
export async function blackFridayLink(lang: Lang, now: Date = new Date()): Promise<{ href: string; label: string } | null> {
  const view = occasionView(await blackFridayOccasion(now), now);
  return view.on ? { href: localePath(lang, BLACK_FRIDAY_PATH), label: blackFridayCopyFor(lang).navName } : null;
}

/** The share image's words, in the page's language and the offer's state. */
export async function blackFridayOgText(lang: Lang, now: Date = new Date()): Promise<{ eyebrow: string; title: string; text: string }> {
  const view = occasionView(await blackFridayOccasion(now), now);
  const t = blackFridayCopyFor(lang).og;
  const values = occasionValues(lang, view.occasion);
  const fill = (text: string) => formatMessage(lang, text, values);
  return { eyebrow: fill(t.eyebrow), title: fill(view.on ? t.title : t.titleOver), text: fill(view.on ? t.text : t.textOver) };
}
