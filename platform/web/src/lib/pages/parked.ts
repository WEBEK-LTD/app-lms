import type { LayoutBlock, LayoutContent } from "./types";
import type { BlockIssue } from "./validate";

/**
 * 1.1 Blocks still to fill in. The draft is saved without them (the app
 * preview reads the draft), so the editor keeps them in the browser and puts
 * them back where they were when the editor opens again.
 */
export interface ParkedBlock {
  page: string;
  /** The block before it on its page; null: the first. */
  after: string | null;
  block: LayoutBlock;
}

/** The incomplete blocks of a layout, with where they are. */
export function parkedBlocks(layout: Pick<LayoutContent, "pages">, issues: readonly BlockIssue[]): ParkedBlock[] {
  const out: ParkedBlock[] = [];
  for (const issue of issues) {
    const page = layout.pages.find((p) => p.slug === issue.page);
    const at = page?.blocks.findIndex((b) => b.id === issue.id) ?? -1;
    if (!page || at < 0) continue;
    out.push({ page: page.slug, after: at > 0 ? page.blocks[at - 1]!.id : null, block: page.blocks[at]! });
  }
  return out;
}

/** The layout with the parked blocks back in place (those whose page is gone, or already there, are left out); null when none goes back. */
export function withParked<T extends Pick<LayoutContent, "pages">>(layout: T, parked: unknown): T | null {
  if (!Array.isArray(parked)) return null;
  let changed = false;
  const pages = layout.pages.map((page) => {
    let blocks = page.blocks;
    for (const entry of parked as Partial<ParkedBlock>[]) {
      const block = entry?.block;
      if (entry?.page !== page.slug || !block || typeof block !== "object" || typeof block.id !== "string" || typeof block.type !== "string") continue;
      if (blocks.some((b) => b.id === block.id)) continue;
      // After the block it followed; first when it was first; last when that block is gone.
      const found = typeof entry.after === "string" ? blocks.findIndex((b) => b.id === entry.after) : -1;
      const at = typeof entry.after !== "string" ? 0 : found >= 0 ? found + 1 : blocks.length;
      blocks = [...blocks.slice(0, at), block as LayoutBlock, ...blocks.slice(at)];
      changed = true;
    }
    return blocks === page.blocks ? page : { ...page, blocks };
  });
  return changed ? { ...layout, pages } : null;
}
