import { sha256Hex } from "../crypto/tokens";
import type { SchoolAnnouncement } from "../data/types";
import type { Layout, StudioNode } from "../pages/types";
import { APP_WORDS } from "../studio/app-words";
import { DEMO_FACTS } from "../studio/demo-templates";

/**
 * 179 Nakhla School's news ticker (its Signature look A's home, the
 * "News" pill) runs the school's own news. The template wrote it as words
 * ("[This week's news, a line each]", or the demo's "Parents' evening for
 * Grade 5…" when the project started from the demo), which the customers'
 * pass leaves out of a school's own app, so every school's parents saw the
 * pill with "News" and nothing after it. Served, a ticker still holding
 * those words runs the titles of the news to the whole school (Dashboard ›
 * School › News), newest first, a line each; with none, the pill goes. A
 * ticker the owner wrote their own words in stays as they wrote it.
 */

/** At most this many of the school's news run in the ticker. */
export const TICKER_NEWS = 5;

/** The template's words of the ticker in each of Studio's languages, and the demo's. */
function templateNews(): Set<string> {
  const out = new Set<string>();
  for (const words of Object.values(APP_WORDS)) out.add(words.nkNewsLines);
  for (const text of Object.values(DEMO_FACTS.school?.nkNewsLines ?? {})) out.add(text);
  return out;
}

const norm = (text: unknown): string => (typeof text === "string" ? text.replace(/\r\n/g, "\n").trim() : "");

/** Whether a ticker still holds the template's words (main text and every translation). */
export function isTemplateNewsTicker(node: StudioNode): boolean {
  if (node.type !== "marquee") return false;
  const known = templateNews();
  if (!known.has(norm(node.text))) return false;
  return Object.values(node.translations ?? {}).every((t) => t?.text === undefined || known.has(norm(t.text)));
}

/** The ticker's lines: the titles of the news to the whole school, newest first. */
export function tickerLines(news: readonly SchoolAnnouncement[]): string[] {
  return [...news]
    .filter((a) => a.audience === "school" && a.title.trim())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
    .slice(0, TICKER_NEWS)
    .map((a) => a.title.replace(/\s+/g, " ").trim());
}

/** Whether a Studio page body has a ticker still holding the template's words. */
export function hasTemplateNewsTicker(body: StudioNode): boolean {
  if (isTemplateNewsTicker(body)) return true;
  return (body.children ?? []).some(hasTemplateNewsTicker);
}

/**
 * The body with the template's tickers running `lines`, without the
 * template's translations; with no lines, each ticker goes with the pill
 * around it (a row holding only it and its label).
 */
export function withNewsTicker(body: StudioNode, lines: readonly string[]): StudioNode {
  const walk = (node: StudioNode): StudioNode | null => {
    if (isTemplateNewsTicker(node)) {
      if (!lines.length) return null;
      const { translations: _t, ...rest } = node;
      void _t;
      return { ...rest, text: lines.join("\n") };
    }
    if (!node.children) return node;
    const children = node.children.map(walk);
    if (children.every((c, i) => c === node.children![i])) return node;
    const kept = children.filter((c): c is StudioNode => c !== null);
    // The pill: nothing but its label left.
    if (node.type === "row" && kept.length < node.children.length && kept.every((c) => c.type === "badge_text" || c.type === "icon" || c.type === "text")) return null;
    return { ...node, children: kept };
  };
  return walk(body) ?? { ...body, children: [] };
}

/** A layout's Studio pages with their tickers of the school's news; the same layout when none has one. */
export function withSchoolNews<T extends Pick<Layout, "pages" | "version">>(layout: T, news: readonly SchoolAnnouncement[]): T {
  if (!layout.pages.some((p) => p.studio && hasTemplateNewsTicker(p.studio.body))) return layout;
  const lines = tickerLines(news);
  const pages = layout.pages.map((p) => (p.studio && hasTemplateNewsTicker(p.studio.body) ? { ...p, studio: { ...p.studio, body: withNewsTicker(p.studio.body, lines) } } : p));
  // Its own version, so the apps ask for the page again when the school's news change.
  return { ...layout, pages, version: `${layout.version}~n${sha256Hex(JSON.stringify(lines)).slice(0, 8)}` };
}
