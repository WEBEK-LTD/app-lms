import { isIntent, isPhraseLang, type PhraseLang } from "./intents";
import { compileDictionary, type DictPhrase, type Dictionary } from "./match";
import { normalizeText } from "./normalize";
import { SEED_PHRASES } from "./seed";
import type { BotPhrase } from "./types";

/**
 * The bot's dictionary as it works now: the built-in phrases (seed.ts) less
 * the ones the team switched off, and the ones the team added.
 */

const key = (intent: string, lang: string, normalized: string) => `${intent}\u0000${lang}\u0000${normalized}`;

/** The phrases in use, given the team's changes. */
export function effectivePhrases(changes: readonly BotPhrase[], seed: readonly DictPhrase[] = SEED_PHRASES): DictPhrase[] {
  const off = new Set(changes.filter((c) => c.kind === "off").map((c) => key(c.intent, c.lang, c.normalized)));
  const kept = seed.filter((p) => !off.has(key(p.intent, p.lang, normalizeText(p.text))));
  const have = new Set(kept.map((p) => key(p.intent, p.lang, normalizeText(p.text))));
  const added = changes.filter((c) => c.kind === "added" && isIntent(c.intent) && !have.has(key(c.intent, c.lang, c.normalized)));
  return [...kept, ...added.map((c) => ({ intent: c.intent, lang: c.lang, text: c.text }))];
}

/** Whether this phrase is built in (so it is switched off, never deleted). */
export function isBuiltIn(intent: string, lang: PhraseLang, text: string, seed: readonly DictPhrase[] = SEED_PHRASES): boolean {
  const normalized = normalizeText(text);
  return seed.some((p) => p.intent === intent && p.lang === lang && normalizeText(p.text) === normalized);
}

export const PHRASE_MAX = 80;

/** A phrase the team adds, checked; or why it can't be added. */
export function checkPhrase(input: { intent: unknown; lang: unknown; text: unknown }): { ok: true; intent: string; lang: PhraseLang; text: string; normalized: string } | { ok: false; error: string } {
  if (!isIntent(input.intent)) return { ok: false, error: "Choose one of the intents." };
  if (!isPhraseLang(input.lang)) return { ok: false, error: "Choose the phrase's language." };
  const text = typeof input.text === "string" ? input.text.trim().replace(/\s+/g, " ") : "";
  if (!text) return { ok: false, error: "Type the phrase." };
  if (text.length > PHRASE_MAX) return { ok: false, error: `Keep the phrase to ${PHRASE_MAX} characters.` };
  const normalized = normalizeText(text);
  if (!normalized) return { ok: false, error: "The phrase needs letters or numbers." };
  return { ok: true, intent: input.intent, lang: input.lang, text, normalized };
}

let cached: { stamp: string; dictionary: Dictionary } | null = null;

/** The compiled dictionary, made again only when the team's changes did. */
export function dictionaryFor(changes: readonly BotPhrase[]): Dictionary {
  const stamp = changes
    .map((c) => `${c.id}:${c.kind}`)
    .sort()
    .join(",");
  if (cached?.stamp !== stamp) cached = { stamp, dictionary: compileDictionary(effectivePhrases(changes)) };
  return cached.dictionary;
}
