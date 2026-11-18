import type { StudioNode } from "../pages/types";
import { storiesSourceOf, storyElementKind } from "../stories/elements";

/**
 * 189 A slider's slides, plain to find in Studio: which slide the canvas
 * shows while editing, and whether what is selected is (in) one of the
 * app's stories, the slides of a slider whose stories come from
 * Dashboard › Stories, where their pictures, words and buttons are changed.
 */

/** Whether `id` is `node` or anything inside it. */
export function holds(node: StudioNode, id: string | null | undefined): boolean {
  if (!id) return false;
  if (node.id === id) return true;
  if ((node.children ?? []).some((c) => holds(c, id))) return true;
  return node.card ? holds(node.card, id) : false;
}

/** The slide the canvas shows of a slider while editing: the one holding the selection, else the first. */
export function shownSlide(slider: StudioNode, selectedId: string | null | undefined): number {
  return Math.max(0, (slider.children ?? []).findIndex((c) => holds(c, selectedId)));
}

/** Whether a slider's slides are the app's stories from Dashboard › Stories. */
export function storiesSlider(node: StudioNode, parent: StudioNode | null = null): boolean {
  return node.type === "slider" && storyElementKind(node, parent) === "slides" && storiesSourceOf(node, parent) === "dashboard";
}

/**
 * The stories slider `id` is, or is inside: the slider, how many slides it
 * has and which of them holds `id` (null for the slider itself).
 */
export function storiesSliderOf(body: StudioNode, id: string | null | undefined): { slider: StudioNode; count: number; index: number | null } | null {
  if (!id) return null;
  let found: { slider: StudioNode; count: number; index: number | null } | null = null;
  const walk = (node: StudioNode, parent: StudioNode | null) => {
    if (found) return;
    if (storiesSlider(node, parent) && holds(node, id)) {
      const kids = node.children ?? [];
      const at = kids.findIndex((c) => holds(c, id));
      found = { slider: node, count: kids.length, index: node.id === id || at < 0 ? null : at };
      return;
    }
    for (const child of node.children ?? []) walk(child, node);
    if (node.card) walk(node.card, node);
  };
  walk(body, null);
  return found;
}
