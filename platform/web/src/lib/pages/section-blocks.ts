import { newBlockId } from "./defaults";
import type { BlockType, LayoutBlock } from "./types";

/**
 * 84.3 A saved section's blocks to add to a page of an app that has
 * `blockTypes`: copies with new IDs, and how many it left out.
 */
export function sectionBlocks(section: { blocks: LayoutBlock[] }, blockTypes: readonly BlockType[]): { blocks: LayoutBlock[]; left: number } {
  const kept = section.blocks.filter((b) => blockTypes.includes(b.type));
  return { blocks: kept.map((b) => ({ ...structuredClone(b), id: newBlockId() })), left: section.blocks.length - kept.length };
}
