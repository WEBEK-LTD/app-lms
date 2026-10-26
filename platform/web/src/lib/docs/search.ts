import type { DocSection } from "@/content/docs";

/**
 * 93.2 The documentation's search: every word of the query in an article's
 * title, description or text, in the page's language. Titles count most,
 * then descriptions, then how often the words appear; each result has a
 * short piece of the text around the first word found.
 */

export interface SearchableDoc {
  slug: string;
  section: DocSection;
  title: string;
  description: string;
  body: string;
}

export interface DocHit {
  slug: string;
  section: DocSection;
  title: string;
  description: string;
  /** The text around the first word found, without Markdown; empty when only the title or description match. */
  snippet: string;
}

export const SEARCH_MAX_QUERY = 100;
const SNIPPET = 180;

/** Lower case and without accents or Arabic marks, so "kampanya" finds "Kampanya" and "إشعار" finds "اشعار". */
export function fold(text: string): string {
  return text
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟ]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ı/g, "i");
}

/** Markdown as plain text: no links' addresses, no emphasis, no headings' marks. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>|]/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function queryWords(query: string): string[] {
  return [...new Set(fold(query.slice(0, SEARCH_MAX_QUERY)).split(/[\s.,;:!?"“”'()]+/u).filter((w) => w.length >= 2))].slice(0, 8);
}

function count(haystack: string, word: string): number {
  let n = 0;
  for (let i = haystack.indexOf(word); i !== -1; i = haystack.indexOf(word, i + word.length)) n++;
  return n;
}

/** The folded text, and for each of its characters where it is in the original (folding can drop marks). */
function foldWithMap(text: string): { folded: string; at: number[] } {
  let folded = "";
  const at: number[] = [];
  for (let i = 0; i < text.length; i++) {
    for (const c of fold(text[i]!)) {
      folded += c;
      at.push(i);
    }
  }
  return { folded, at };
}

function snippetOf(text: string, found: number): string {
  const start = Math.max(0, found - 60);
  const cut = text.slice(start, start + SNIPPET);
  // Whole words at both ends.
  const from = start > 0 ? cut.indexOf(" ") + 1 : 0;
  const to = start + SNIPPET < text.length ? cut.lastIndexOf(" ") : cut.length;
  return `${start > 0 ? "…" : ""}${cut.slice(from, to > from ? to : cut.length).trim()}${start + SNIPPET < text.length ? "…" : ""}`;
}

export function searchDocs(docs: SearchableDoc[], query: string, limit = 20): DocHit[] {
  const words = queryWords(query);
  if (words.length === 0) return [];
  const hits: (DocHit & { score: number })[] = [];
  for (const doc of docs) {
    const title = fold(doc.title);
    const description = fold(doc.description);
    const text = plainText(doc.body);
    const { folded: body, at } = foldWithMap(text);
    if (!words.every((w) => title.includes(w) || description.includes(w) || body.includes(w))) continue;
    const score = words.reduce((sum, w) => sum + (title.includes(w) ? 20 : 0) + (description.includes(w) ? 8 : 0) + Math.min(count(body, w), 10), 0);
    // Where the words are together, else the first one found.
    const together = body.indexOf(words.join(" "));
    const first = together >= 0 ? together : Math.min(...words.map((w) => body.indexOf(w)).filter((i) => i >= 0));
    const snippet = Number.isFinite(first) ? snippetOf(text, at[first]!) : "";
    hits.push({ slug: doc.slug, section: doc.section, title: doc.title, description: doc.description, snippet, score });
  }
  return hits
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map((hit) => ({ slug: hit.slug, section: hit.section, title: hit.title, description: hit.description, snippet: hit.snippet }));
}
