import { STUDIO_TABLET_FIELDS, type StudioNode, type StudioTablet } from "../pages/types";

/**
 * Editor audit 3.3: an element's sizes, spacing and text on tablets. They sit
 * in `tablet` over the element's own; the font's fields one by one. Apps on a
 * screen at least 600 wide on its short side read them the same way.
 */

type TabletField = (typeof STUDIO_TABLET_FIELDS)[number];

export function isTabletField(key: string): key is TabletField {
  return (STUDIO_TABLET_FIELDS as readonly string[]).includes(key);
}

/** The element as a tablet shows it (itself when it has no tablet changes). */
export function forTablet(node: StudioNode): StudioNode {
  const t = node.tablet;
  if (!t) return node;
  const { font, ...rest } = t;
  return { ...node, ...rest, ...(font ? { font: { ...(node.font ?? {}), ...font } } : {}) };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * What an edit made while looking at a tablet changes on the element: sizes,
 * spacing and text go into its tablet changes (only where they differ from its
 * own), anything else changes the element itself. Choosing a text style is
 * for every screen; leaving one by changing the font on a tablet keeps the
 * style on phones.
 */
export function tabletPatch(node: StudioNode, patch: Partial<StudioNode>): Partial<StudioNode> {
  // Choosing a text style is for the element everywhere.
  if (patch.text_style !== undefined) return patch;
  const own: Record<string, unknown> = {};
  const tablet: Record<string, unknown> = { ...(node.tablet ?? {}) };
  let touched = false;
  for (const [key, value] of Object.entries(patch)) {
    if (!isTabletField(key)) {
      // The font changed by hand on a tablet: the element keeps following its style on phones.
      if (key === "text_style" && value === undefined && "font" in patch) continue;
      own[key] = value;
      continue;
    }
    touched = true;
    if (key === "font") {
      const base = node.font ?? {};
      const wanted = (value ?? {}) as Record<string, unknown>;
      const diff: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(wanted)) if (!same(v, (base as Record<string, unknown>)[k])) diff[k] = v;
      if (Object.keys(diff).length) tablet.font = diff;
      else delete tablet.font;
      continue;
    }
    if (value === undefined || same(value, node[key])) delete tablet[key];
    else tablet[key] = value;
  }
  if (touched) own.tablet = Object.keys(tablet).length ? (tablet as StudioTablet) : undefined;
  return own as Partial<StudioNode>;
}

/** How many of the page's elements have tablet changes. */
export function tabletChanges(node: StudioNode): number {
  let count = node.tablet ? 1 : 0;
  for (const child of node.children ?? []) count += tabletChanges(child);
  if (node.card) count += tabletChanges(node.card);
  return count;
}
