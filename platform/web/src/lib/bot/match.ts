import { ARABIC_TAGS, WANT_INTENT, type ArabicTag, type PhraseLang } from "./intents";
import { editDistance, isArabicWord, normalizeText, tokensOf, tokenVariants, typosAllowed } from "./normalize";

/**
 * The app-builder bot's matcher: plain rules and the dictionary. A phrase
 * of the dictionary is found in what the owner typed when its words appear
 * in order, close together, each one:
 *
 * - as it is (or in the same normalised spelling): full marks;
 * - without an Arabic clitic or ending, or an English/Turkish plural ("المطعم",
 *   "restaurants"): a little lower;
 * - as the start of a longer Latin word of four letters or more (Turkish
 *   endings: "restoranım", "kafeler");
 * - sharing only a stem with it ("مدرسة", "مدرسين"): counted lower;
 * - with a small typo (one letter for words of four to six letters, two
 *   from seven; never in shorter words): counted lowest, and the bot asks.
 *
 * A phrase scores its words' letters times those marks, so longer phrases
 * win ("food delivery" over "delivery"). Each intent keeps its best phrase;
 * a phrase found without typos always comes before one found with them.
 */

export interface DictPhrase {
  intent: string;
  lang: PhraseLang;
  text: string;
}

interface Word {
  text: string;
  variants: string[];
  arabic: boolean;
}

interface CompiledPhrase extends DictPhrase {
  normalized: string;
  words: Word[];
  /** A sign of which Arabic it is written in: an "I want" word, or a phrase only one dialect has. */
  cue: boolean;
}

export interface Dictionary {
  phrases: CompiledPhrase[];
}

export interface IntentMatch {
  intent: string;
  score: number;
  /** A word was taken with a typo: the bot asks before it goes on. */
  fuzzy: boolean;
  /** The typed words the phrase took, by position. */
  positions: number[];
  /** The typed words any of the intent's phrases took without a typo (its best phrase's at least). */
  covered: number[];
  phrase: string;
  lang: PhraseLang;
}

function wordOf(text: string): Word {
  return { text, variants: tokenVariants(text), arabic: isArabicWord(text) };
}

/** The dictionary ready to match: each phrase normalised and split into words. */
export function compileDictionary(entries: readonly DictPhrase[]): Dictionary {
  const tagsOf = new Map<string, Set<PhraseLang>>();
  const compiled: CompiledPhrase[] = [];
  for (const entry of entries) {
    const normalized = normalizeText(entry.text);
    if (!normalized) continue;
    const tags = tagsOf.get(normalized) ?? new Set<PhraseLang>();
    tags.add(entry.lang);
    tagsOf.set(normalized, tags);
    compiled.push({ ...entry, normalized, words: tokensOf(normalized).map(wordOf), cue: false });
  }
  for (const phrase of compiled) {
    const arabicTags = [...(tagsOf.get(phrase.normalized) ?? [])].filter((t) => (ARABIC_TAGS as readonly string[]).includes(t));
    phrase.cue = (ARABIC_TAGS as readonly string[]).includes(phrase.lang) && (phrase.intent === WANT_INTENT || arabicTags.length === 1);
  }
  return { phrases: compiled };
}

interface Mark {
  quality: number;
  fuzzy: boolean;
  /** The letters it counts for: the shared form's. */
  letters: number;
}

/**
 * How well a typed word is the dictionary's word; null when it isn't. The
 * same word counts fully; one of them the other's form without a clitic or
 * an ending nearly so; two words that only share a stem ("مدرسة", "مدرسين")
 * less; a typo least.
 */
function markOf(want: Word, typed: Word): Mark | null {
  if (want.text === typed.text) return { quality: 1, fuzzy: false, letters: want.text.length };
  if (typed.variants.includes(want.text)) return { quality: 0.8, fuzzy: false, letters: want.text.length };
  if (want.variants.includes(typed.text)) return { quality: 0.8, fuzzy: false, letters: typed.text.length };
  let stem = 0;
  for (const v of want.variants) if (v.length > stem && typed.variants.includes(v)) stem = v.length;
  if (stem) return { quality: 0.65, fuzzy: false, letters: stem };
  if (!want.arabic && !typed.arabic && want.text.length >= 4 && typed.text.startsWith(want.text)) return { quality: 0.9, fuzzy: false, letters: want.text.length };
  if (typosAllowed(want.text.length) === 0 || typed.arabic !== want.arabic) return null;
  let best: { d: number; letters: number } | null = null;
  for (const v of want.variants) {
    for (const t of typed.variants) {
      // Never a typo in a short word, the dictionary's or the owner's.
      const max = typosAllowed(Math.min(v.length, t.length));
      if (max === 0) continue;
      const d = editDistance(v, t, max);
      if (d <= max && (!best || d < best.d || (d === best.d && v.length > best.letters))) best = { d, letters: v.length };
    }
  }
  if (!best) return null;
  return { quality: best.d === 1 ? 0.6 : 0.45, fuzzy: true, letters: best.letters };
}

interface Typed {
  words: Word[];
}

function typedOf(text: string): Typed {
  return { words: tokensOf(normalizeText(text)).map(wordOf) };
}

/** The phrase in the typed words: its words in order, within a few words of each other. */
function findPhrase(phrase: CompiledPhrase, typed: Typed): Omit<IntentMatch, "intent" | "phrase" | "lang" | "covered"> | null {
  const positions: number[] = [];
  let score = 0;
  let fuzzy = false;
  let previous = -1;
  for (const word of phrase.words) {
    let best: (Mark & { at: number }) | null = null;
    for (let at = previous + 1; at < typed.words.length; at++) {
      const mark = markOf(word, typed.words[at]!);
      if (mark && (!best || mark.quality > best.quality)) best = { ...mark, at };
      if (best?.quality === 1) break;
    }
    if (!best) return null;
    if (positions.length && best.at - positions[0]! > phrase.words.length + 2) return null;
    positions.push(best.at);
    previous = best.at;
    score += best.quality * best.letters;
    fuzzy ||= best.fuzzy;
  }
  return { score, fuzzy, positions };
}

/** Each intent's best phrase in the text, the best first; only `allowed` intents when given. */
export function rankIntents(dictionary: Dictionary, text: string, allowed?: readonly string[]): IntentMatch[] {
  const typed = typedOf(text);
  if (!typed.words.length) return [];
  const only = allowed ? new Set(allowed) : null;
  const best = new Map<string, IntentMatch>();
  for (const phrase of dictionary.phrases) {
    if (only ? !only.has(phrase.intent) : phrase.intent === WANT_INTENT) continue;
    const found = findPhrase(phrase, typed);
    if (!found) continue;
    const before = best.get(phrase.intent);
    const covered = new Set([...(before?.covered ?? []), ...(found.fuzzy ? [] : found.positions)]);
    const match: IntentMatch = { intent: phrase.intent, phrase: phrase.text, lang: phrase.lang, ...found, covered: [] };
    const kept = !before || better(match, before) ? match : before;
    best.set(phrase.intent, { ...kept, covered: [...new Set([...covered, ...kept.positions])].sort((a, b) => a - b) });
  }
  return [...best.values()].sort((a, b) => (better(a, b) ? -1 : better(b, a) ? 1 : 0));
}

/** A match without typos before any with one; then the higher score; then the earlier. */
function better(a: IntentMatch, b: IntentMatch): boolean {
  if (a.fuzzy !== b.fuzzy) return !a.fuzzy;
  if (a.score !== b.score) return a.score > b.score;
  return (a.positions[0] ?? 0) < (b.positions[0] ?? 0);
}

/** How far ahead the best intent must be to be taken without asking. */
export const SURE_LEAD = 1.2;
/** The most choices the bot shows when it isn't sure. */
export const MAX_CHOICES = 4;

export type OneMatch =
  | { kind: "sure"; intent: string; matches: IntentMatch[] }
  | { kind: "choices"; intents: string[]; matches: IntentMatch[] }
  | { kind: "none" };

/**
 * One answer (the kind of business, yes or no…): sure when the best intent
 * was found without typos, nothing else was named on other words, and it is
 * well ahead of the next found without typos (a word of the dictionary typed
 * as it is wins over what a typo might mean); else the few best as choices;
 * none when nothing was found.
 */
export function matchOne(dictionary: Dictionary, text: string, allowed: readonly string[]): OneMatch {
  const typed = typedOf(text);
  // "I don't have one" is no "yes".
  const matches = rankIntents(dictionary, text, allowed).filter((m) => m.intent !== "answer.yes" || !turnedDown(m, typed));
  const top = matches[0];
  if (!top) return { kind: "none" };
  const exact = matches.filter((m) => !m.fuzzy);
  const others = exact.slice(1);
  // Two things named apart ("a restaurant and a gym"): the owner chooses.
  const apart = others.some((m) => m.positions.every((p) => !top.covered.includes(p)));
  if (!top.fuzzy && !apart && (!others[0] || top.score >= others[0].score * SURE_LEAD)) return { kind: "sure", intent: top.intent, matches };
  return { kind: "choices", intents: matches.slice(0, MAX_CHOICES).map((m) => m.intent), matches };
}

/** Words that turn the next phrase down ("no chat", "بدون نقاط"), up to three words before it. */
const NOT_BEFORE = new Set(["no", "not", "without", "dont", "don", "doesn", "didn", "haven", "hasn", "isn", "aren", "never", "except", "nor", "neither", "ليس", "لست", "لسنا", "بدون", "بلاش", "مش", "مو", "مب", "لا", "غير", "دون", "ما", "ماعدا", "عدا", "الا", "ولا", "sans"].map(normalizeText));
/** Turkish says it after: "sohbet istemiyorum", "puan olmasın", "bildirim hariç". */
const NOT_AFTER = new Set(["istemiyorum", "istemiyoruz", "istemem", "olmasin", "haric", "gerekmez", "gereksiz", "degil", "yok"].map(normalizeText));
/** Where a "no" stops: "no points but chat". */
const STOPS = new Set(["and", "but", "also", "plus", "with", "ve", "ama", "fakat", "ile", "hem", "و", "بس", "لكن", "ولكن", "كمان", "وكمان", "ايضا", "مع"].map(normalizeText));
/** Turkish "without" endings: "sohbetsiz". */
const WITHOUT_ENDINGS = ["siz", "suz"];

function said(words: Word[], at: number, set: Set<string>): boolean {
  const word = words[at];
  return Boolean(word && word.variants.some((v) => set.has(v)));
}

function turnedDown(match: IntentMatch, typed: Typed): boolean {
  const first = match.positions[0]!;
  const last = match.positions[match.positions.length - 1]!;
  // Inside the phrase too: "I don't have one".
  for (let at = first + 1; at < last; at++) if (!match.positions.includes(at) && said(typed.words, at, NOT_BEFORE)) return true;
  for (let at = first - 1; at >= Math.max(0, first - 3); at--) {
    if (said(typed.words, at, STOPS)) break;
    if (said(typed.words, at, NOT_BEFORE)) return true;
  }
  for (let at = last + 1; at <= Math.min(typed.words.length - 1, last + 2); at++) {
    if (said(typed.words, at, STOPS)) break;
    if (said(typed.words, at, NOT_AFTER)) return true;
  }
  const lastWord = typed.words[last]?.text ?? "";
  return WITHOUT_ENDINGS.some((ending) => lastWord.endsWith(ending) && !match.phrase.endsWith(ending) && lastWord.length > ending.length + 2);
}

export interface ManyMatch extends IntentMatch {
  /** Asked not to have it ("no chat"). */
  negated: boolean;
}

/**
 * Several answers in one text (languages, features): every intent found on
 * words no better match took, in the order they were typed, each marked
 * when it was turned down. "No", "none" and "that's all" count only when
 * nothing else was named, and typos only when nothing was found without one.
 */
export function matchAll(dictionary: Dictionary, text: string, allowed: readonly string[]): ManyMatch[] {
  const typed = typedOf(text);
  const taken = new Set<number>();
  const out: ManyMatch[] = [];
  for (const match of rankIntents(dictionary, text, allowed)) {
    if (match.positions.some((p) => taken.has(p))) continue;
    match.covered.forEach((p) => taken.add(p));
    out.push({ ...match, negated: turnedDown(match, typed) });
  }
  // A typo only when nothing was found without one (the bot then asks).
  const sure = out.filter((m) => !m.fuzzy);
  const found = sure.length ? sure : out;
  // "No chat", "شات بس": with something named, "no" and "that's all" are only words around it.
  const named = found.filter((m) => !m.intent.startsWith("answer."));
  return (named.length ? named : found).sort((a, b) => a.positions[0]! - b.positions[0]!);
}

/**
 * Which Arabic the text is written in, from its "I want" words and the
 * words only one dialect uses; ties go to MSA, then Egyptian, then the
 * others in order. Null when nothing tells.
 */
export function detectDialect(dictionary: Dictionary, text: string): ArabicTag | null {
  const typed = typedOf(text);
  if (!typed.words.some((w) => w.arabic)) return null;
  const scores = new Map<ArabicTag, number>();
  for (const phrase of dictionary.phrases) {
    if (!phrase.cue) continue;
    const found = findPhrase(phrase, typed);
    if (!found || found.fuzzy) continue;
    const tag = phrase.lang as ArabicTag;
    scores.set(tag, (scores.get(tag) ?? 0) + found.score);
  }
  let best: ArabicTag | null = null;
  for (const tag of ARABIC_TAGS) {
    const score = scores.get(tag) ?? 0;
    if (score > 0 && (best === null || score > (scores.get(best) ?? 0))) best = tag;
  }
  return best;
}
