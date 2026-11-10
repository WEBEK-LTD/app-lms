import { randomUUID } from "node:crypto";
import type { DataStore } from "../data/store";
import { checkPhrase, dictionaryFor, isBuiltIn } from "./dictionary";
import { intentLabel, isMatchedStep, MATCHED_STEPS, STEP_INTENTS, WANT_INTENT, type ArabicTag, type MatchedStep, type PhraseLang } from "./intents";
import { rankIntents, type Dictionary, type DictPhrase } from "./match";
import { isArabicWord, normalizeText } from "./normalize";
import { SEED_PHRASES } from "./seed";
import type { BotPhrase, BotUnmatched } from "./types";

/**
 * Admin › Bot dictionary and Admin › Unmatched phrases (English only): the
 * dictionary by question, the team's changes to it, and what owners typed
 * that the bot didn't understand, grouped, for one click to teach it.
 */

/** The dictionary page's tabs: each question the bot matches, and the "I want" words that tell the dialect. */
export const DICTIONARY_TABS = [...MATCHED_STEPS, "want"] as const;
export type DictionaryTab = (typeof DICTIONARY_TABS)[number];

export function isDictionaryTab(value: unknown): value is DictionaryTab {
  return typeof value === "string" && (DICTIONARY_TABS as readonly string[]).includes(value);
}

export const TAB_LABEL: Record<DictionaryTab, string> = {
  kind: "Kind of business",
  colour: "Colour",
  logo: "Logo",
  languages: "Languages",
  features: "Features",
  website: "Website",
  want: "\"I want\" words",
};

/** The questions an intent answers ("yes" is the logo's and the website's). */
export function stepsOfIntent(intent: string): MatchedStep[] {
  return MATCHED_STEPS.filter((step) => STEP_INTENTS[step].includes(intent));
}

// ——— The dictionary ———

export interface IntentView {
  intent: string;
  label: string;
  /** The other questions that share it: a change here changes them too. */
  alsoOn: MatchedStep[];
  builtIn: { lang: PhraseLang; text: string; off: boolean }[];
  added: { id: string; lang: PhraseLang; text: string; createdBy: string; createdAt: Date }[];
}

/** One tab's intents with their built-in phrases (switched off or not) and the team's own; only one language's when given. */
export function dictionaryView(tab: DictionaryTab, changes: readonly BotPhrase[], lang: PhraseLang | null = null, seed: readonly DictPhrase[] = SEED_PHRASES): IntentView[] {
  const intents = tab === "want" ? [WANT_INTENT] : STEP_INTENTS[tab];
  const shown = (l: PhraseLang) => lang === null || l === lang;
  return intents.map((intent) => {
    const off = new Set(changes.filter((c) => c.intent === intent && c.kind === "off").map((c) => `${c.lang}\u0000${c.normalized}`));
    return {
      intent,
      label: intentLabel(intent),
      alsoOn: tab === "want" ? [] : stepsOfIntent(intent).filter((s) => s !== tab),
      builtIn: seed
        .filter((p) => p.intent === intent && shown(p.lang))
        .map((p) => ({ lang: p.lang, text: p.text, off: off.has(`${p.lang}\u0000${normalizeText(p.text)}`) })),
      added: changes
        .filter((c) => c.intent === intent && c.kind === "added" && shown(c.lang))
        .map((c) => ({ id: c.id, lang: c.lang, text: c.text, createdBy: c.createdBy, createdAt: c.createdAt })),
    };
  });
}

export type PhraseOutcome = "added" | "switched_on" | "already";
export type PhraseResult = { ok: true; outcome: PhraseOutcome; phrase: BotPhrase | null } | { ok: false; error: string };

/**
 * Adds a phrase to an intent. A built-in phrase isn't added twice: switched
 * off, it is switched on again; on, or added before, nothing changes.
 */
export async function addTeamPhrase(store: DataStore, input: { intent: unknown; lang: unknown; text: unknown }, by: string, now: Date): Promise<PhraseResult> {
  const checked = checkPhrase(input);
  if (!checked.ok) return checked;
  const { intent, lang, text, normalized } = checked;
  const same = (c: BotPhrase) => c.intent === intent && c.lang === lang && c.normalized === normalized;
  const changes = await store.listBotPhrases();
  if (isBuiltIn(intent, lang, text)) {
    const off = changes.find((c) => c.kind === "off" && same(c));
    if (!off) return { ok: true, outcome: "already", phrase: null };
    await store.deleteBotPhrase(off.id);
    return { ok: true, outcome: "switched_on", phrase: off };
  }
  if (changes.some((c) => c.kind === "added" && same(c))) return { ok: true, outcome: "already", phrase: null };
  const phrase: BotPhrase = { id: randomUUID(), intent, lang, text, normalized, kind: "added", createdBy: by, createdAt: now };
  await store.saveBotPhrase(phrase);
  return { ok: true, outcome: "added", phrase };
}

/** Removes a phrase the team added (a built-in one is switched off instead). Null when there was none. */
export async function removeTeamPhrase(store: DataStore, id: string): Promise<BotPhrase | null> {
  const phrase = (await store.listBotPhrases()).find((c) => c.id === id && c.kind === "added");
  if (!phrase) return null;
  await store.deleteBotPhrase(id);
  return phrase;
}

/** Switches a built-in phrase off, or on again. Whether anything changed. */
export async function switchBuiltInPhrase(
  store: DataStore,
  input: { intent: unknown; lang: unknown; text: unknown },
  off: boolean,
  by: string,
  now: Date,
): Promise<{ ok: true; changed: boolean; intent: string; lang: PhraseLang; text: string } | { ok: false; error: string }> {
  const checked = checkPhrase(input);
  if (!checked.ok) return checked;
  const { intent, lang, text, normalized } = checked;
  if (!isBuiltIn(intent, lang, text)) return { ok: false, error: "That isn't a built-in phrase." };
  const was = (await store.listBotPhrases()).filter((c) => c.kind === "off" && c.intent === intent && c.lang === lang && c.normalized === normalized);
  if (off) {
    if (was.length) return { ok: true, changed: false, intent, lang, text };
    await store.saveBotPhrase({ id: randomUUID(), intent, lang, text, normalized, kind: "off", createdBy: by, createdAt: now });
  } else {
    if (!was.length) return { ok: true, changed: false, intent, lang, text };
    for (const c of was) await store.deleteBotPhrase(c.id);
  }
  return { ok: true, changed: true, intent, lang, text };
}

// ——— What the bot didn't understand ———

export interface UnmatchedGroup {
  step: MatchedStep;
  normalized: string;
  /** As it was last typed. */
  text: string;
  count: number;
  lastAt: Date;
  /** The buttons chosen next, most chosen first. */
  chosen: { intent: string; count: number }[];
  dialects: ArabicTag[];
  dashLangs: ("en" | "ar" | "tr")[];
  /** What the dictionary finds in it now (a phrase added since), the best first. */
  nowFound: string[];
  /** The intent one click adds it to: the button most chosen next, else what the dictionary finds now, else none. */
  suggested: string | null;
  /** The dictionary language it goes in: its dialect, else from its letters and the dashboard's language. */
  lang: PhraseLang;
  status: BotUnmatched["status"];
  mappedIntent: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
}

/** The dictionary language of something typed: Arabic in its dialect (MSA when none was told), else Turkish or English. */
export function phraseLangOf(text: string, dialect: ArabicTag | null, dashLang: "en" | "ar" | "tr"): PhraseLang {
  if (normalizeText(text).split(" ").some(isArabicWord)) return dialect ?? "ar";
  if (/[çğıöşüİ]/i.test(text) || dashLang === "tr") return "tr";
  return "en";
}

/** The rows grouped by question and normalised text, the most typed first, then the latest. */
export function groupUnmatched(rows: readonly BotUnmatched[], dictionary: Dictionary | null = null): UnmatchedGroup[] {
  const groups = new Map<string, BotUnmatched[]>();
  for (const row of rows) {
    const key = `${row.step}\u0000${row.status}\u0000${row.normalized}`;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  const out: UnmatchedGroup[] = [];
  for (const list of groups.values()) {
    const latest = list.reduce((a, b) => (b.createdAt.getTime() > a.createdAt.getTime() ? b : a));
    const intents = STEP_INTENTS[latest.step];
    const counts = new Map<string, number>();
    for (const r of list) if (r.chosenIntent && intents.includes(r.chosenIntent)) counts.set(r.chosenIntent, (counts.get(r.chosenIntent) ?? 0) + 1);
    const chosen = [...counts].map(([intent, count]) => ({ intent, count })).sort((a, b) => b.count - a.count || a.intent.localeCompare(b.intent));
    const nowFound = dictionary ? rankIntents(dictionary, latest.text, intents).map((m) => m.intent) : [];
    const resolved = list.find((r) => r.status !== "open") ?? null;
    out.push({
      step: latest.step,
      normalized: latest.normalized,
      text: latest.text,
      count: list.length,
      lastAt: latest.createdAt,
      chosen,
      dialects: [...new Set(list.map((r) => r.dialect).filter((d): d is ArabicTag => d !== null))],
      dashLangs: [...new Set(list.map((r) => r.dashLang))],
      nowFound,
      suggested: chosen[0]?.intent ?? nowFound[0] ?? null,
      lang: phraseLangOf(latest.text, latest.dialect, latest.dashLang),
      status: latest.status,
      mappedIntent: resolved?.mappedIntent ?? null,
      resolvedBy: resolved?.resolvedBy ?? null,
      resolvedAt: resolved?.resolvedAt ?? null,
    });
  }
  return out.sort((a, b) => b.count - a.count || b.lastAt.getTime() - a.lastAt.getTime());
}

/** The most rows the Unmatched phrases page reads at once (the latest). */
export const UNMATCHED_READ = 2000;

/** The open groups, of one question or all, with what the dictionary finds in them now. */
export async function openUnmatchedGroups(store: DataStore, step: MatchedStep | null): Promise<{ groups: UnmatchedGroup[]; rows: number; total: number }> {
  const [list, changes] = await Promise.all([store.listBotUnmatched({ status: "open", step: step ?? undefined, offset: 0, limit: UNMATCHED_READ }), store.listBotPhrases()]);
  return { groups: groupUnmatched(list.items, dictionaryFor(changes)), rows: list.items.length, total: list.total };
}

export type MapResult = { ok: true; outcome: PhraseOutcome; rows: number; phrase: BotPhrase | null; intent: string; lang: PhraseLang; text: string } | { ok: false; error: string };

/**
 * One click: what owners typed on a question goes into the dictionary under
 * one of that question's intents, and every open row of it is marked mapped.
 */
export async function mapUnmatched(
  store: DataStore,
  input: { step: unknown; normalized: unknown; intent: unknown; lang: unknown; text: unknown },
  by: string,
  now: Date,
): Promise<MapResult> {
  if (!isMatchedStep(input.step)) return { ok: false, error: "Unknown question." };
  if (typeof input.normalized !== "string" || !input.normalized) return { ok: false, error: "Unknown phrase." };
  if (typeof input.intent !== "string" || !STEP_INTENTS[input.step].includes(input.intent)) return { ok: false, error: "Choose one of this question's intents." };
  const checked = checkPhrase(input);
  if (!checked.ok) return checked;
  const added = await addTeamPhrase(store, checked, by, now);
  if (!added.ok) return added;
  const rows = await store.resolveBotUnmatched({ step: input.step, normalized: input.normalized, status: "mapped", mappedIntent: input.intent, resolvedBy: by, resolvedAt: now });
  return { ok: true, outcome: added.outcome, rows, phrase: added.phrase, intent: checked.intent, lang: checked.lang, text: checked.text };
}

/** What owners typed on a question is left out of the open list (nothing is added). How many rows. */
export async function ignoreUnmatched(store: DataStore, input: { step: unknown; normalized: unknown }, by: string, now: Date): Promise<number | null> {
  if (!isMatchedStep(input.step) || typeof input.normalized !== "string" || !input.normalized) return null;
  return store.resolveBotUnmatched({ step: input.step, normalized: input.normalized, status: "ignored", mappedIntent: null, resolvedBy: by, resolvedAt: now });
}
