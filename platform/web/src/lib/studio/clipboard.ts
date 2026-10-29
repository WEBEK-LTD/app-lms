import type { Action, ItemSource, StudioNode } from "../pages/types";
import { cloneWithNewIds } from "./edit";

/**
 * 107.1 Copying in Studio's editor: an element (with what it holds) or only
 * its style, kept in the browser so it can be pasted on another page or in
 * another project.
 */

/** Where the editor keeps what was copied (the browser's local storage). */
export const CLIPBOARD_KEY = "yallapp.studio.clipboard";
export const STYLE_CLIPBOARD_KEY = "yallapp.studio.style";

/** What an element's style is: how it looks and moves, never what it shows or does. */
export const STYLE_FIELDS = [
  "width",
  "height",
  "min_height",
  "aspect_ratio",
  "padding",
  "margin",
  "gap",
  "align",
  "cross",
  "self_align",
  "background",
  "color",
  "dark_background",
  "dark_color",
  "gradient",
  "radius",
  "corners",
  "rotation",
  "overlay",
  "border_color",
  "border_width",
  "shadow",
  "opacity",
  "font",
  "text_align",
  "motion",
] as const satisfies readonly (keyof StudioNode)[];

export type StudioStyle = Partial<Pick<StudioNode, (typeof STYLE_FIELDS)[number]>>;

/** The element's style, with only the fields it has. */
export function styleOf(node: StudioNode): StudioStyle {
  const out: Record<string, unknown> = {};
  for (const key of STYLE_FIELDS) if (node[key] !== undefined && node[key] !== null) out[key] = structuredClone(node[key]);
  return out as StudioStyle;
}

/** The change that gives an element this style: the style's fields, and the element's other style fields taken out. */
export function stylePatch(style: StudioStyle): Partial<StudioNode> {
  const patch: Record<string, unknown> = {};
  for (const key of STYLE_FIELDS) patch[key] = style[key] === undefined ? undefined : structuredClone(style[key]);
  return patch as Partial<StudioNode>;
}

export interface PasteContext {
  /** The project's lists and the ones with categories. */
  sources: readonly ItemSource[];
  categorySources: readonly ItemSource[];
  /** The project's pages and the app screens a tap can open. */
  pageSlugs: readonly string[];
  screens: readonly string[];
  newId: () => string;
}

function keptAction(action: Action | null | undefined, ctx: PasteContext): Action | null | undefined {
  if (!action) return action;
  if (action.type === "page" && !(action.page_slug && ctx.pageSlugs.includes(action.page_slug))) return undefined;
  if (action.type === "screen" && !(action.screen && ctx.screens.includes(action.screen))) return undefined;
  if (action.type === "course" && !ctx.sources.includes("courses")) return undefined;
  if (action.item && !ctx.sources.includes(action.item.source)) return undefined;
  return action;
}

/**
 * A copied element made to fit where it is pasted: new IDs, and what points
 * at the other project left out (a list of a source this one hasn't shows
 * this project's main list; a tap to a page or screen it hasn't does
 * nothing).
 */
export function forPaste(copied: StudioNode, ctx: PasteContext): StudioNode {
  const fit = (node: StudioNode): StudioNode => {
    const out: StudioNode = { ...node };
    const action = keptAction(node.action, ctx);
    if (action === undefined) delete out.action;
    if (node.type === "items" && node.source && !ctx.sources.includes(node.source)) {
      if (ctx.sources[0]) out.source = ctx.sources[0];
      else delete out.source;
      if (out.query) out.query = { ...out.query, category_id: null, ids: [] };
    }
    if (node.type === "categories" && node.source && !ctx.categorySources.includes(node.source)) {
      if (ctx.categorySources[0]) out.source = ctx.categorySources[0];
      else delete out.source;
    }
    if (node.children) out.children = node.children.map(fit);
    if (node.card) out.card = fit(node.card);
    return out;
  };
  return fit(cloneWithNewIds(structuredClone(copied), ctx.newId));
}

/** What was copied, if it is an element (anything else in the browser's storage is ignored). */
export function readCopied(raw: string | null): StudioNode | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (value && typeof value === "object" && typeof (value as StudioNode).type === "string" && typeof (value as StudioNode).id === "string") return value as StudioNode;
  } catch {
    // Not ours.
  }
  return null;
}

/** The copied style, if it is one. */
export function readStyle(raw: string | null): StudioStyle | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const out: Record<string, unknown> = {};
      for (const key of STYLE_FIELDS) if ((value as Record<string, unknown>)[key] !== undefined) out[key] = (value as Record<string, unknown>)[key];
      return out as StudioStyle;
    }
  } catch {
    // Not ours.
  }
  return null;
}
