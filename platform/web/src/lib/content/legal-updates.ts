import "server-only";
import { createHash } from "node:crypto";
import { LOCALIZED } from "@/content/localized";
import { PRIVACY, REFUND, TERMS } from "@/content/legal";
import { LEGAL_HISTORY } from "@/content/legal-history";
import type { Lang } from "@/i18n/config";
import { isPending, legalChanges, type LegalChange } from "./legal-diff";

/**
 * 172 Whether the team's saved version of a legal page (Admin › Website
 * content) lacks changes Yallapp has since made to the page's default text.
 *
 * A save records the version of the default it was based on (BASE_FIELD,
 * kept with the page's fields: no migration). A version saved before that
 * was recorded is taken as based on the default as it was when it was saved,
 * and never later than the version before 18 November 2026 (LEGACY_BEFORE).
 * The default's earlier versions come from its git history
 * (src/content/legal-history.ts, scripts/legal-history.mjs). Whatever the
 * base, a change counts only while the saved text lacks one of the sentences
 * it added: a saved version that already has them shows no notice.
 */

export type LegalKey = "privacy" | "terms" | "refund";
export const LEGAL_KEYS: LegalKey[] = ["privacy", "terms", "refund"];

/** The field a saved version keeps its base in. It isn't one of the page's fields, so pages never show it. */
export const BASE_FIELD = "_basedOn";
/** Saved versions with no recorded base: based on the default before this date at the latest (Phase 106.11's changes). */
export const LEGACY_BEFORE = "2026-11-18T00:00:00Z";

export interface LegalVersion {
  hash: string;
  /** When this text reached the default (its commit's date). */
  since: string;
  title: string;
  updated: string;
  body: string;
}

const history = LEGAL_HISTORY;

export function isLegalKey(key: string): key is LegalKey {
  return (LEGAL_KEYS as string[]).includes(key);
}

/** The same hash as scripts/legal-history.mjs. */
export function legalHash(d: { title: string; updated: string; body: string }): string {
  return createHash("sha256").update(`${d.title}\n${d.updated}\n${d.body}`).digest("hex").slice(0, 16);
}

/** The id of a page's default in a language (its built-in translation, else the English text). */
function historyId(key: LegalKey, lang: Lang): string {
  return lang !== "en" && LOCALIZED[lang].legal[key] ? `${key}@${lang}` : key;
}

/** The page's default text in a language, as it is now. */
export function legalDefault(key: LegalKey, lang: Lang): { title: string; updated: string; body: string } {
  const english = { privacy: PRIVACY, terms: TERMS, refund: REFUND }[key];
  const own = lang === "en" ? undefined : LOCALIZED[lang].legal[key];
  const d = own ?? english;
  return { title: d.title, updated: d.updated, body: d.body };
}

/** The page's default versions in a language, oldest first. */
export function legalVersions(key: LegalKey, lang: Lang): LegalVersion[] {
  return history[historyId(key, lang)] ?? [];
}

/** The version a saved text was based on, or null when none is known. */
export function baseVersion(key: LegalKey, lang: Lang, saved: { fields: Record<string, string>; updatedAt: Date }): LegalVersion | null {
  const versions = legalVersions(key, lang);
  const recorded = saved.fields[BASE_FIELD];
  if (recorded) {
    const found = versions.find((v) => v.hash === recorded);
    if (found) return found;
    if (recorded === legalHash(legalDefault(key, lang))) return { ...legalDefault(key, lang), hash: recorded, since: new Date().toISOString() };
  }
  const by = Math.min(saved.updatedAt.getTime(), Date.parse(LEGACY_BEFORE));
  return versions.filter((v) => Date.parse(v.since) < by).at(-1) ?? null;
}

export interface LegalUpdate {
  key: LegalKey;
  lang: Lang;
  /** The default's "Last updated" date now, as the page shows it (in its language). */
  updated: string;
  /** The day the default's text changed last, in English for the admin (like 18 November 2026). */
  updatedOn: string;
  /** The current default's hash: a save after "Add the new text" records it as the base. */
  hash: string;
  /** The default's "Last updated" date in the version the saved text was based on, when known. */
  baseUpdated: string | null;
  /** Everything the default changed since that version. */
  changes: (LegalChange & { pending: boolean })[];
  /** The default's texts now, for the merge. */
  current: { title: string; updated: string; body: string };
}

/**
 * The default's changes a saved version lacks, or null when it has them all
 * (or isn't a saved legal page's text). With no known base, the saved text is
 * compared with the default as it is now when it was saved before the
 * default's "Last updated" version reached it.
 */
export function legalUpdateFor(key: string, lang: Lang, saved: { fields: Record<string, string>; updatedAt: Date } | null | undefined): LegalUpdate | null {
  if (!isLegalKey(key) || !saved) return null;
  const body = saved.fields.body;
  if (typeof body !== "string" || body.trim() === "") return null;
  const current = legalDefault(key, lang);
  const hash = legalHash(current);
  const base = baseVersion(key, lang, saved);
  if (base?.hash === hash) return null;
  let changes: LegalChange[];
  if (base) changes = legalChanges(base.body, current.body);
  else {
    // No earlier version known: only when the default's newest version came after the save.
    const newest = legalVersions(key, lang).at(-1);
    if (newest && Date.parse(newest.since) <= saved.updatedAt.getTime()) return null;
    changes = legalChanges(body, current.body);
  }
  const marked = changes.map((c) => ({ ...c, pending: isPending(body, c) }));
  if (!marked.some((c) => c.pending)) return null;
  const since = legalVersions(key, lang).find((v) => v.hash === hash)?.since;
  const updatedOn = new Date(since ?? Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
  return { key, lang, updated: current.updated, updatedOn, hash, baseUpdated: base?.updated ?? null, changes: marked, current };
}

/** The base a save records: the one the form sends when it's a version of this page's default, else nothing. */
export function baseToRecord(key: string, lang: Lang, sent: unknown): string | null {
  if (!isLegalKey(key) || typeof sent !== "string" || !/^[0-9a-f]{16}$/.test(sent)) return null;
  if (sent === legalHash(legalDefault(key, lang))) return sent;
  return legalVersions(key, lang).some((v) => v.hash === sent) ? sent : null;
}
