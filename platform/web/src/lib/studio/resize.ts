import type { StudioSize } from "../pages/types";

/**
 * 108.1 Resizing an element by dragging a corner of its selection in the
 * editor's phone. Only what was dragged changes: a mostly sideways drag sets
 * the width, a mostly up-or-down one the height. A width that reaches what
 * holds it becomes "fill", so it stays full on every phone.
 */

/** How far (in the phone's pixels) the pointer goes before that side changes. */
export const RESIZE_START = 3;
/** This close to what holds it, the width fills it. */
export const RESIZE_SNAP = 6;
/** The smallest an element gets by dragging. */
export const RESIZE_MIN = 8;

export interface ResizeStart {
  /** The element's size when the drag began, in the phone's pixels. */
  width: number;
  height: number;
  /** The space inside what holds it, across. */
  room: number;
}

export interface ResizeMove {
  /** How far the dragged corner went outwards (positive) or inwards, in the phone's pixels. */
  dx: number;
  dy: number;
  /** Shift held: the shape is kept. */
  keepRatio: boolean;
}

export function resized(start: ResizeStart, move: ResizeMove): { width?: StudioSize; height?: StudioSize } {
  const sideways = Math.abs(move.dx) >= RESIZE_START;
  const upDown = Math.abs(move.dy) >= RESIZE_START;
  if (!sideways && !upDown) return {};
  const ratio = start.height > 0 ? start.width / start.height : 1;
  let width = start.width + move.dx;
  let height = start.height + move.dy;
  if (move.keepRatio) {
    // The side dragged further leads; the other follows the shape.
    if (Math.abs(move.dx) >= Math.abs(move.dy) * ratio) height = width / ratio;
    else width = height * ratio;
  }
  const out: { width?: StudioSize; height?: StudioSize } = {};
  if (sideways || move.keepRatio) {
    width = Math.max(RESIZE_MIN, Math.round(width));
    out.width = start.room > 0 && width >= start.room - RESIZE_SNAP ? "fill" : width;
  }
  if (upDown || move.keepRatio) out.height = Math.max(RESIZE_MIN, Math.round(height));
  return out;
}

/** Editor audit 3.3: sizes land on this grid while dragging (Alt: anywhere). */
export const RESIZE_GRID = 4;

export type ResizeGuide = "half" | "third" | "two_thirds";

const SHARES: readonly [ResizeGuide, number][] = [
  ["half", 1 / 2],
  ["third", 1 / 3],
  ["two_thirds", 2 / 3],
];

/**
 * Editor audit 3.3: snapping while resizing. A width close to a half, a
 * third or two thirds of what holds it takes that share (and says which, for
 * the guide); otherwise sizes land on the 4-pixel grid. `free` (Alt held)
 * leaves the size where the pointer put it.
 */
export function snapped(size: { width?: StudioSize; height?: StudioSize }, start: ResizeStart, free: boolean): { size: { width?: StudioSize; height?: StudioSize }; guide: { share: ResizeGuide; width: number } | null } {
  if (free) return { size, guide: null };
  const out = { ...size };
  let guide: { share: ResizeGuide; width: number } | null = null;
  if (typeof out.width === "number") {
    const w = out.width;
    const share = start.room > 0 ? SHARES.find(([, f]) => Math.abs(w - start.room * f) <= RESIZE_SNAP) : undefined;
    if (share) {
      out.width = Math.round(start.room * share[1]);
      guide = { share: share[0], width: out.width };
    } else out.width = onGrid(w);
  }
  if (typeof out.height === "number") out.height = onGrid(out.height);
  return { size: out, guide };
}

function onGrid(n: number): number {
  return Math.max(RESIZE_MIN, Math.round(n / RESIZE_GRID) * RESIZE_GRID);
}
