import { DEMO_BRANDS } from "../demo/content";
import type { Layout } from "./types";

/**
 * 176.6 An app started from one of the App editor's demos on /start keeps
 * the demo's home: its banner and the welcome under it, written about the
 * demo's own business (Defne Café's "Open every day from 08:00 to 23:00.
 * Pickup in Moda, delivery in Kadıköy.", "Order ahead for pickup, or have it
 * delivered in Moda."). In a business's own app those lines aren't its
 * facts: while they are still the demo's words, the banner keeps its heading
 * without its line and the welcome its heading without the sentence. The
 * owner's own words stay; Yallapp's demo apps keep theirs; the editor still
 * shows them to the owner, to change.
 */

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

let index: { lines: Set<string>; sentences: string[] } | null = null;

function demoWords(): { lines: Set<string>; sentences: string[] } {
  index ??= {
    lines: new Set(Object.values(DEMO_BRANDS).map((b) => b.banner.subheading.trim())),
    sentences: Object.values(DEMO_BRANDS).map((b) => `<p>${escapeHtml(b.welcome)}</p>`),
  };
  return index;
}

/** `layout` without the demos' own lines on its pages' blocks; the same object when there is none. */
export function withoutDemoWords<T extends Layout>(layout: T): T {
  const { lines, sentences } = demoWords();
  let changed = false;
  const pages = layout.pages.map((page) => {
    let own = false;
    const blocks = page.blocks.map((block) => {
      if (block.type === "banner" && typeof block.subheading === "string" && lines.has(block.subheading.trim())) {
        own = true;
        return { ...block, subheading: null };
      }
      if (block.type === "text" && typeof block.html === "string") {
        const html = sentences.reduce((h, s) => h.replace(s, ""), block.html);
        if (html !== block.html) {
          own = true;
          return { ...block, html };
        }
      }
      return block;
    });
    if (!own) return page;
    changed = true;
    return { ...page, blocks };
  });
  return changed ? { ...layout, pages } : layout;
}
