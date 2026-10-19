import "server-only";
import { LOCALIZED } from "@/content/localized";
import { DOCS } from "@/content/docs";
import type { PrefixedLang } from "@/i18n/config";
import { faqFor, numberWordFor } from "../marketing-lang";
import { INTEGRATION_COUNTS, SOLUTIONS, STEPS } from "../marketing";
import { faqMarkdown, type ContentPage } from "./site";

/**
 * 55 The Arabic and Turkish versions of the texts the team edits in the
 * admin (Website content). Each page's edit in a language is kept in
 * `site_content` under "<key>@<lang>" (no migration: the table is keyed by
 * text). A field shows, first that has text: the team's edit in that
 * language, the built-in translation, then the English text (the team's
 * English edit, or the English default).
 */

export function langContentKey(key: string, lang: PrefixedLang): string {
  return `${key}@${lang}`;
}

/** {kinds}, {steps}, {plugins} and {platforms} in a translation, from the registries. */
function fillCounts(lang: PrefixedLang, text: string): string {
  const counts: Record<string, string> = {
    kinds: numberWordFor(lang, SOLUTIONS.length),
    steps: numberWordFor(lang, STEPS.length),
    plugins: String(INTEGRATION_COUNTS.plugins),
    platforms: String(INTEGRATION_COUNTS.platforms),
  };
  return text.replace(/\{(kinds|steps|plugins|platforms)\}/g, (_, name: string) => counts[name]!);
}

/** The built-in translation of a page's fields (some may be missing: those show in English). */
export function translatedDefaults(page: ContentPage, lang: PrefixedLang): Record<string, string> {
  const content = LOCALIZED[lang];
  const out: Record<string, string> = {};
  const doc = page.group === "Guides" ? DOCS.find((d) => d.key === page.key) : undefined;
  const fields: Record<string, string> | undefined = doc
    ? content.docs[doc.slug] && { ...content.docs[doc.slug]! }
    : page.group === "Legal pages"
      ? content.legal[page.key as "privacy" | "terms" | "refund"] && { ...content.legal[page.key as "privacy" | "terms" | "refund"]! }
      : content.site[page.key];
  for (const [name, value] of Object.entries(fields ?? {})) if (value) out[name] = fillCounts(lang, value);
  if (page.key === "faq") out.entries = faqMarkdown(faqFor(lang));
  return out;
}

/** A page's texts in a language: the team's edit in it, the built-in translation, then the English text. */
export function contentInLang(page: ContentPage, lang: PrefixedLang, english: Record<string, string>, saved: Record<string, string> | null | undefined): Record<string, string> {
  const defaults = translatedDefaults(page, lang);
  const out: Record<string, string> = {};
  for (const field of page.fields) {
    const own = saved?.[field.name];
    out[field.name] = typeof own === "string" && own.trim() !== "" ? own : (defaults[field.name] ?? english[field.name] ?? "");
  }
  return out;
}
