import { ENTRY_LISTS, TRANSLATABLE, TRANSLATABLE_ENTRIES, type LayoutBlock, type LayoutContent } from "../types";

/**
 * 33 Sample texts of a design: the editor marks the blocks that still have
 * them ("Sample text"), so the owner writes their own before publishing.
 * Kept apart from the designs, so the editor doesn't load them all.
 */

/** A block's texts (and its entries' texts), to tell whether the owner changed them. */
export function blockTexts(block: LayoutBlock): string {
  const record = block as unknown as Record<string, unknown>;
  // Opening times are samples too; 110.3 and a map's place, and the pictures of people, cards and galleries.
  const texts: unknown[] = [...TRANSLATABLE.block.map((f) => record[f] ?? null), record.hours ?? null];
  if (block.type === "map") texts.push([record.latitude ?? null, record.longitude ?? null]);
  for (const list of ENTRY_LISTS) {
    const entries = (record[list] ?? []) as Record<string, unknown>[];
    const picture = list === "people" ? "photo_url" : list === "cards" || list === "images" ? "image_url" : null;
    texts.push(entries.map((e) => [...TRANSLATABLE_ENTRIES[list].map((f) => e[f] ?? null), ...(picture ? [e[picture] ?? null] : [])]));
  }
  return JSON.stringify(texts);
}

/** Blocks a design writes sample texts in (texts, slides, quotes, people...); a Contact or a List block is the owner's already. 110.3 Cards, photos, the map's place and forms too. */
const SAMPLE_TYPES = new Set<LayoutBlock["type"]>(["text", "slider", "testimonials", "faq", "team", "stats", "notice", "countdown", "hours", "cards", "gallery", "map", "form"]);

/** The texts of the blocks a design wrote samples in, by `page/block` ID, as applied. */
export function sampleTexts(layout: LayoutContent): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of layout.pages) {
    for (const b of p.blocks) if (SAMPLE_TYPES.has(b.type)) out[`${p.slug}/${b.id}`] = blockTexts(b);
  }
  return out;
}
