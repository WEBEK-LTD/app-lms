import { levelOf } from "../levels";
import type { MemberRank } from "./types";

/** 231 Limits of what members write. */
export const LIMITS = {
  titleMin: 10,
  titleMax: 200,
  bodyMin: 20,
  bodyMax: 20_000,
  answerMin: 10,
  answerMax: 20_000,
  replyMax: 1_000,
  tagsMax: 5,
  tagMax: 32,
  searchMin: 2,
  pageMax: 50,
} as const;

/**
 * An address for a title, kept in its own script ("how-do-i-give-each…",
 * "كيف-أربط-بوابة…", "ürün-sayfası"): lower case, words joined by dashes,
 * at most 80 characters, never empty.
 */
export function slugify(text: string, fallback = "post"): string {
  const slug = text
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    // Arabic diacritics and the tatweel.
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || fallback;
}

/** The first words of a text without its Markdown, at most `max` characters, cut at a word. */
export function excerpt(text: string, max = 180): string {
  const plain = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

const STOP = new Set(
  [
    // English
    "a an and are as at be by can do does for from how i if in into is it its me my of on or so that the this to was what when where which who why will with you your",
    // Arabic
    "في من على إلى الى عن ما ماذا كيف هل هو هي أن ان او أو مع لا هذا هذه ذلك التي الذي كل بعد قبل عند لكل",
    // Turkish
    "ve ile bir bu şu o ne nasıl neden mi mı mu mü için da de ki gibi daha çok en",
  ]
    .join(" ")
    .split(" "),
);

/** A text's search words: lower case, letters and digits, without the small words of the three languages, each once. */
export function words(text: string): string[] {
  const out = new Set<string>();
  for (const raw of text.normalize("NFKC").toLocaleLowerCase("en").replace(/[ً-ٰٟـ]/g, "").split(/[^\p{L}\p{N}]+/u)) {
    // Arabic's "the" (ال) and "and" (و) joined to the word: "المتجر" finds "متجر".
    const w = raw.length > 4 && /^(وال|ال)/.test(raw) ? raw.replace(/^(وال|ال)/, "") : raw;
    if (w.length >= 2 && !STOP.has(w) && !STOP.has(raw)) out.add(w);
  }
  return [...out];
}

/**
 * How alike two questions are, 0 to 1: the share of words they have in
 * common (Jaccard), a word of the title counting twice. "Similar
 * questions" before asking shows those above `SIMILAR_MIN`.
 */
export function similarity(a: { title: string; body?: string }, b: { title: string; body?: string }): number {
  const weigh = (q: { title: string; body?: string }) => {
    const map = new Map<string, number>();
    for (const w of words(q.body ?? "")) map.set(w, 1);
    for (const w of words(q.title)) map.set(w, 2);
    return map;
  };
  const x = weigh(a);
  const y = weigh(b);
  let both = 0;
  let either = 0;
  for (const w of new Set([...x.keys(), ...y.keys()])) {
    const p = x.get(w) ?? 0;
    const q = y.get(w) ?? 0;
    both += Math.min(p, q);
    either += Math.max(p, q);
  }
  return either === 0 ? 0 : both / either;
}

export const SIMILAR_MIN = 0.18;

/** The web addresses a text links to, for the spam and bad-link filter (area C). */
export function links(text: string): string[] {
  return [...new Set(text.match(/\bhttps?:\/\/[^\s<>()"']+/gi) ?? [])];
}

/** A member's standing from their points: the mockup's "Expert" beside a name. */
/** The member's level by their points: the community's one table (lib/community/levels.ts). */
export function rankOf(points: number): MemberRank {
  return levelOf(points).level;
}

/** Points per thing done (the mockup's "Answer accepted · +25 points"). */
export const POINTS = {
  answer_accepted: 25,
  accepted_an_answer: 2,
  answer_upvoted: 5,
  answer_downvoted: -2,
  question_upvoted: 2,
  question_downvoted: -1,
  tutorial_published: 50,
} as const;

/** A tag's address and its name as typed ("Product page" → product-page). */
export function tagOf(name: string): { slug: string; name: string } {
  const clean = name.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, LIMITS.tagMax);
  return { slug: slugify(clean, ""), name: clean };
}

/** A page's cursor: where the next page starts. */
export const cursorOf = (offset: number): string => Buffer.from(String(offset)).toString("base64url");
export function offsetOf(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  const n = Number(Buffer.from(cursor, "base64url").toString());
  return Number.isInteger(n) && n >= 0 ? n : 0;
}
