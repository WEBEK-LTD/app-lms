import { createHash } from "node:crypto";
import type { AppLanguage, Languages, LayoutContent } from "../pages/types";
import { isRtl, localeInfo } from "./locales";

/**
 * 43 String packs: the owner's translations of the app's own interface
 * strings, one per language, which the app downloads at start and keeps
 * for offline use (`GET /api/app/{app_id}/strings/{language}`). The app
 * lays them over the strings it ships: the owner's string, then the
 * app's own in that language, then English. `Config.languages.list` names
 * each language and where its pack is; the version changes with its
 * strings, so the app downloads a pack only when it changed.
 */

/** A pack's version: a fingerprint of its strings, or null for none. */
export function packVersion(strings: Record<string, string> | undefined | null): string | null {
  if (!strings || !Object.keys(strings).length) return null;
  const sorted = Object.fromEntries(Object.entries(strings).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex").slice(0, 16);
}

/** `StringPack`: what `GET /strings/{language}` answers. A language without strings has an empty pack. */
export function stringPack(strings: LayoutContent["strings"], lang: string): { language: string; version: string; strings: Record<string, string> } {
  const own = strings?.[lang] ?? {};
  return { language: lang, version: packVersion(own) ?? "empty", strings: own };
}

/** Where the app downloads a language's pack. `draft`: the Pages & look draft, for the preview. */
export function packUrl(platformUrl: string, appId: string, lang: string, version: string, draft = false): string {
  return `${platformUrl.replace(/\/+$/, "")}/api/app/${appId}/strings/${lang}?v=${version}${draft ? "&draft=1" : ""}`;
}

/** `AppLanguage` for each of the app's languages, in their order. */
export function languageList(
  languages: Pick<Languages, "available">,
  strings: LayoutContent["strings"],
  options: { platformUrl: string; appId: string; draft?: boolean },
): AppLanguage[] {
  return languages.available.map((code) => {
    const info = localeInfo(code);
    const version = packVersion(strings?.[code]);
    return {
      code,
      name: info?.name ?? code,
      native_name: info?.nativeName ?? code,
      direction: isRtl(code) ? "rtl" : "ltr",
      strings: version ? { url: packUrl(options.platformUrl, options.appId, code, version, options.draft), version } : null,
    };
  });
}

/** `Languages` with `list` (Config.languages, and the layout the plugin gets). */
export function withLanguageList(
  languages: Languages,
  strings: LayoutContent["strings"],
  options: { platformUrl: string; appId: string; draft?: boolean },
): Languages {
  return { default: languages.default, available: languages.available, list: languageList(languages, strings, options) };
}
