import type { DataStore } from "../data/store";
import type { App, ListingTranslation, ScreenshotFrame } from "../data/types";

/**
 * 88.2 The store listing in the app's languages, and framed screenshots:
 * the main texts are in `listingLanguage`; the app's other languages may each
 * have their own (all three texts, or none). The framed screenshots'
 * captions are one per line, in screenshot order.
 */

export const CAPTIONS_MAX = 10;
export const CAPTION_LENGTH = 60;

const LIMITS = {
  storeTitle: { min: 2, max: 30, short: "Enter the store title.", long: "Use at most 30 characters." },
  shortDescription: { min: 10, max: 80, short: "Write a short description.", long: "Use at most 80 characters." },
  fullDescription: { min: 50, max: 4000, short: "Write at least 50 characters.", long: "Use at most 4000 characters." },
} as const;

type TextField = keyof typeof LIMITS;
const TEXT_FIELDS = Object.keys(LIMITS) as TextField[];

/** The form field of a translation's text. */
export const translationField = (language: string, field: TextField | "captions") => `tr_${language}_${field}`;

/** The app's languages (published, else the draft's): the listing's own first, then the others. */
export async function listingLanguages(store: Pick<DataStore, "getAppLayout">, app: Pick<App, "id" | "listingLanguage">): Promise<{ main: string; others: string[] }> {
  const layout = await store.getAppLayout(app.id);
  const languages = (layout?.published ?? layout?.draft)?.languages;
  const available = languages?.available?.length ? languages.available : ["en"];
  const main = app.listingLanguage && available.includes(app.listingLanguage) ? app.listingLanguage : (languages?.default ?? available[0] ?? "en");
  return { main, others: available.filter((code) => code !== main) };
}

/** Captions from a textarea: one per line, blank lines dropped. */
export function captionLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function checkCaptions(lines: string[]): string | null {
  if (lines.length > CAPTIONS_MAX) return `Write at most ${CAPTIONS_MAX} captions, one for each screenshot.`;
  if (lines.some((line) => line.length > CAPTION_LENGTH)) return `Keep each caption to ${CAPTION_LENGTH} characters.`;
  return null;
}

export interface ListingExtras {
  listingLanguage: string;
  listingTranslations: ListingTranslation[];
  screenshotFrame: ScreenshotFrame | null;
}

/**
 * Reads the listing's language, its translations and the framed screenshots'
 * captions from the form. A translation with no texts is left out; one with
 * some must have all three within the stores' limits.
 */
export function parseListingExtras(
  get: (name: string) => string,
  languages: { main: string; others: string[] },
): { ok: true; extras: ListingExtras } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const all = [languages.main, ...languages.others];
  const chosen = get("listingLanguage").trim();
  const main = all.includes(chosen) ? chosen : languages.main;

  const framed = get("frameScreenshots") === "on";
  const captions = captionLines(get("captions"));
  const captionError = checkCaptions(captions);
  if (captionError) errors.captions = captionError;

  const translations: ListingTranslation[] = [];
  for (const language of all.filter((code) => code !== main)) {
    const texts = Object.fromEntries(TEXT_FIELDS.map((field) => [field, get(translationField(language, field)).trim()])) as Record<TextField, string>;
    const own = captionLines(get(translationField(language, "captions")));
    if (TEXT_FIELDS.every((field) => !texts[field]) && own.length === 0) continue;
    for (const field of TEXT_FIELDS) {
      const limit = LIMITS[field];
      if (texts[field].length < limit.min) errors[translationField(language, field)] = limit.short;
      else if (texts[field].length > limit.max) errors[translationField(language, field)] = limit.long;
    }
    const ownError = checkCaptions(own);
    if (ownError) errors[translationField(language, "captions")] = ownError;
    translations.push({ language, ...texts, captions: own });
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, extras: { listingLanguage: main, listingTranslations: translations, screenshotFrame: framed ? { captions } : null } };
}
