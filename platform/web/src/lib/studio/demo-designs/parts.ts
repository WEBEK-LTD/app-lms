import type { Action, StudioNode, StudioSides } from "../../pages/types";
import { newNodeId } from "../elements";
import { yallappPhoto as photo } from "../photo-food";
import type { SectionContext } from "../sections";

/**
 * 128 What the premium demos' pages are made of: elements written once,
 * with each demo's own colours by day and by night.
 */

/** A demo's colours by day and by night (the approved boards' `light` and `dark`). */
export interface DemoInk {
  page: string;
  darkPage: string;
  surface: string;
  darkSurface: string;
  ink: string;
  darkInk: string;
  muted: string;
  darkMuted: string;
  line: string;
  darkLine: string;
}

export const pad = (v: number, h: number): StudioSides => ({ top: v, end: h, bottom: v, start: h });

export const screen = (name: NonNullable<Action["screen"]>): Action => ({ type: "screen", screen: name });

export function idOf(ctx: SectionContext): () => string {
  return () => (ctx.newId ?? newNodeId)();
}

/** One of the platform's own photos (under public/, with its licence beside it) at the platform's address: the one helper the photo-first demos use too. */
export { photo };

/** A frosted round button over a photo or the map: an icon, opening `action`. */
export function roundButton(ctx: SectionContext, icon: string, action: Action, look: Partial<StudioNode> = {}): StudioNode {
  const id = idOf(ctx);
  const node: StudioNode = {
    id: id(),
    type: "row",
    width: 40,
    height: 40,
    radius: 20,
    align: "center",
    cross: "center",
    overlay: { color: "#FFFFFF", opacity: 0.18 },
    color: "#FFFFFF",
    action,
    ...look,
    children: [],
  };
  // The icon in the button's own colour, by day and by night.
  node.children = [{ id: id(), type: "icon", icon, icon_size: 22, color: node.color ?? "#FFFFFF", ...(node.dark_color ? { dark_color: node.dark_color } : {}) }];
  // A solid button (`overlay: null`) keeps no see-through colour.
  if (!node.overlay) delete node.overlay;
  return node;
}

/**
 * A photo banner: the photo with a colour over it from its foot (or its
 * start side), a title and a line at its foot (or top), opening `action`.
 */
export function photoBanner(
  ctx: SectionContext,
  options: { path: string; title: string; text?: string | null; eyebrow?: string | null; eyebrowColor?: string; scrim: string; across?: boolean; height?: number; margin?: StudioSides | null; action?: Action | null },
): StudioNode {
  const id = idOf(ctx);
  const children: StudioNode[] = [];
  if (options.eyebrow) children.push({ id: id(), type: "text", text: options.eyebrow, color: options.eyebrowColor ?? "#FFFFFF", font: { size: 12, weight: 800, letter_spacing: 1.7, uppercase: true } });
  children.push({ id: id(), type: "text", text: options.title, color: "#FFFFFF", font: { size: options.across ? 19 : 17, weight: 800, line_height: 1.2 }, ...(options.eyebrow ? { margin: { top: 4 } } : {}) });
  if (options.text) children.push({ id: id(), type: "text", text: options.text, color: "#FFFFFF", opacity: 0.9, font: { size: 12.5, line_height: 1.35 }, margin: { top: 3 } });
  return {
    id: id(),
    type: "photo_hero",
    name: options.title,
    image_url: photo(ctx, options.path),
    height: options.height ?? 132,
    radius: 22,
    background: options.scrim,
    scrim: options.across ? { color: options.scrim, from: 0.92, middle: 0.2, at: 75, to: 0.2, angle: 90 } : { color: options.scrim, from: 0, middle: 0, at: 40, to: 0.82 },
    ...(options.across ? {} : { align: "end" as const }),
    padding: pad(16, 16),
    ...(options.margin === null ? {} : { margin: options.margin ?? { top: 12, end: 16, bottom: 4, start: 16 } }),
    ...(options.action ? { action: options.action } : {}),
    children,
  };
}

/** A box with a thin border in the page's line colour by day and by night: a row in that colour holding a row in the surface's. */
export function bordered(ctx: SectionContext, ink: DemoInk, inner: Omit<StudioNode, "id">, outer: Partial<StudioNode> & { border?: string; darkBorder?: string; thickness?: number } = {}): StudioNode {
  const id = idOf(ctx);
  const { border, darkBorder, thickness, ...rest } = outer;
  const w = thickness ?? 1;
  const radius = (inner.radius ?? 0) + w;
  return {
    id: id(),
    type: "row",
    radius,
    padding: pad(w, w),
    background: border ?? ink.line,
    dark_background: darkBorder ?? border ?? ink.darkLine,
    ...rest,
    children: [{ ...inner, id: id(), width: inner.width ?? "fill", background: inner.background ?? ink.surface, dark_background: inner.dark_background ?? ink.darkSurface } as StudioNode],
  };
}
