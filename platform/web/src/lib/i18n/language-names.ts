import { LANG_INFO, type Lang } from "@/i18n/config";
import { languageName } from "./locales";

const names = new Map<Lang, Intl.DisplayNames>();

/**
 * 56 An app language's name in the dashboard's language: "Turkish",
 * "التركية", "Türkçe" for `tr`. English keeps the names of lib/i18n/locales.ts
 * (what the admin and the website show); Arabic and Turkish ask the browser's
 * (or the server's) language data, and fall back to the English name.
 */
export function appLanguageName(code: string, dashboard: Lang): string {
  if (dashboard === "en") return languageName(code);
  try {
    let display = names.get(dashboard);
    if (!display) names.set(dashboard, (display = new Intl.DisplayNames([LANG_INFO[dashboard].intl], { type: "language" })));
    const name = display.of(code);
    return name && name !== code ? name : languageName(code);
  } catch {
    return languageName(code);
  }
}
