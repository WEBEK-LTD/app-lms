import { STUDIO_TEXT_STYLES, type LayoutContent, type StudioFont, type StudioNode, type StudioTextStyle } from "../pages/types";
import { mapTree } from "./tree";

/**
 * Editor audit 3.3: the project's text styles. An element that follows one
 * keeps a copy of the style's font, so apps only ever read `font`; changing a
 * style rewrites that copy on every page of the draft.
 */

/** What each style is before the owner changes it. */
export const DEFAULT_TEXT_STYLES: Record<StudioTextStyle, StudioFont> = {
  heading: { weight: 800, size: 26, line_height: 1.2 },
  subheading: { weight: 700, size: 18, line_height: 1.3 },
  body: { weight: 400, size: 15, line_height: 1.5 },
  button: { weight: 700, size: 16 },
};

/** The project's styles, each one filled in from the defaults. */
export function textStylesOf(layout: Pick<LayoutContent, "text_styles">): Record<StudioTextStyle, StudioFont> {
  const out = {} as Record<StudioTextStyle, StudioFont>;
  for (const style of STUDIO_TEXT_STYLES) out[style] = { ...(layout.text_styles?.[style] ?? DEFAULT_TEXT_STYLES[style]) };
  return out;
}

/** A font without the fields left empty, so it compares and saves cleanly. */
export function cleanFont(font: StudioFont): StudioFont {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(font)) if (value !== undefined && value !== null && value !== "" && value !== false) out[key] = value;
  return out as StudioFont;
}

/** The same text for the same font, whatever order its fields are in. */
export function fontKey(font: StudioFont): string {
  return JSON.stringify(Object.entries(cleanFont(font)).sort(([a], [b]) => a.localeCompare(b)));
}

/** The fields an element gets when it starts following a style. */
export function followStyle(style: StudioTextStyle, styles: Record<StudioTextStyle, StudioFont>): Pick<StudioNode, "text_style" | "font"> {
  return { text_style: style, font: cleanFont(styles[style]) };
}

/**
 * The draft with one style changed: saved on the layout, and every element on
 * every page that follows it takes the new font. Returns the same draft when
 * nothing changes.
 */
export function applyTextStyle(layout: LayoutContent, style: StudioTextStyle, font: StudioFont): LayoutContent {
  const next = cleanFont(font);
  const key = fontKey(next);
  const isDefault = fontKey(DEFAULT_TEXT_STYLES[style]) === key;
  const stored = layout.text_styles?.[style];
  const kept = stored ? fontKey(stored) === key : isDefault;
  if (kept && !pagesNeed(layout, style, key)) return layout;
  const styles = { ...(layout.text_styles ?? {}) };
  if (isDefault) delete styles[style];
  else styles[style] = next;
  const { text_styles: _old, ...rest } = layout;
  void _old;
  const now = new Date().toISOString();
  const pages = layout.pages.map((page) => {
    if (!page.studio) return page;
    let changed = false;
    const body = mapTree(page.studio.body, (node) => {
      if (node.text_style !== style || fontKey(node.font ?? {}) === key) return node;
      changed = true;
      return { ...node, font: next };
    });
    return changed && body ? { ...page, studio: { ...page.studio, body }, updated_at: now } : page;
  });
  return { ...rest, ...(Object.keys(styles).length ? { text_styles: styles } : {}), pages };
}

/** Whether some element following the style has a different font. */
function pagesNeed(layout: LayoutContent, style: StudioTextStyle, want: string): boolean {
  let need = false;
  for (const page of layout.pages) {
    if (!page.studio || need) continue;
    mapTree(page.studio.body, (node) => {
      if (node.text_style === style && fontKey(node.font ?? {}) !== want) need = true;
      return node;
    });
  }
  return need;
}

/** How many elements on the draft's pages follow each style. */
export function textStyleUse(layout: LayoutContent): Record<StudioTextStyle, number> {
  const out = { heading: 0, subheading: 0, body: 0, button: 0 } as Record<StudioTextStyle, number>;
  for (const page of layout.pages) {
    if (!page.studio) continue;
    mapTree(page.studio.body, (node) => {
      if (node.text_style) out[node.text_style] += 1;
      return node;
    });
  }
  return out;
}
