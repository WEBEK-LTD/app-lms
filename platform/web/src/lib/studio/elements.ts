import type { ItemSource, StudioNode, StudioNodeType } from "../pages/types";

/**
 * 103R The editor's Elements panel (the approved design): layout elements,
 * content elements and the ones under "More", each with its icon and what a
 * new one starts as.
 */

export type ElementGroup = "layout" | "content" | "more";

export interface ElementInfo {
  type: StudioNodeType;
  group: ElementGroup;
  /** A Material Symbols (Rounded) name. */
  icon: string;
  /** Words people search for, besides its name, in English. */
  keywords: string;
}

export const ELEMENTS: readonly ElementInfo[] = [
  { type: "row", group: "layout", icon: "view_column", keywords: "horizontal side by side flex" },
  { type: "column", group: "layout", icon: "view_agenda", keywords: "vertical stack under" },
  { type: "stack", group: "layout", icon: "layers", keywords: "layers overlay on top" },
  { type: "grid", group: "layout", icon: "grid_view", keywords: "grid columns tiles" },
  { type: "slider", group: "layout", icon: "view_carousel", keywords: "carousel slides swipe banner" },
  { type: "spacer", group: "layout", icon: "crop_free", keywords: "space gap empty" },
  // 107.3 Questions that open, and tabs.
  { type: "accordion", group: "layout", icon: "unfold_more", keywords: "accordion faq questions answers open collapse" },
  { type: "tabs", group: "layout", icon: "tab", keywords: "tabs switch sections" },
  { type: "text", group: "content", icon: "title", keywords: "text title heading paragraph" },
  { type: "image", group: "content", icon: "image", keywords: "picture photo image" },
  { type: "button", group: "content", icon: "smart_button", keywords: "button action link" },
  { type: "items", group: "content", icon: "storefront", keywords: "products list courses services data" },
  { type: "video", group: "content", icon: "play_circle", keywords: "video youtube vimeo" },
  { type: "form", group: "content", icon: "list_alt", keywords: "form contact questions" },
  { type: "map", group: "content", icon: "map", keywords: "map location place" },
  { type: "ratings", group: "content", icon: "star", keywords: "ratings stars reviews" },
  // 107.3 A countdown to an offer's end, and a list with an icon on each line.
  { type: "countdown", group: "content", icon: "timer", keywords: "countdown timer offer ends sale" },
  { type: "bullets", group: "content", icon: "list", keywords: "list bullets points features checklist" },
  { type: "icon", group: "more", icon: "emoji_symbols", keywords: "icon symbol" },
  { type: "categories", group: "more", icon: "label", keywords: "categories chips tags filter" },
  { type: "search", group: "more", icon: "search", keywords: "search field" },
  { type: "divider", group: "more", icon: "horizontal_rule", keywords: "divider line separator" },
];

export function elementInfo(type: StudioNodeType): ElementInfo {
  return ELEMENTS.find((e) => e.type === type) ?? ELEMENTS[0]!;
}

/** A short random ID for a new element. */
export function newNodeId(): string {
  return `n${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * A new element as it starts: sized and styled so it looks right where it is
 * dropped. `source` is the app's main list for `items` and `categories`;
 * `brand` the app's main colour.
 */
export type NewText = "text" | "button" | "search" | "ratings" | "field" | "question" | "answer" | "tab" | "ended" | "bullets";

export function newNode(type: StudioNodeType, options: { source: ItemSource | null; brand: string; text: (key: NewText) => string; newId?: () => string; now?: Date }): StudioNode {
  const id = (options.newId ?? newNodeId)();
  const child = (title: string, text: string): StudioNode => ({
    id: (options.newId ?? newNodeId)(),
    type: "column",
    title,
    padding: { top: 4, end: 0, bottom: 8, start: 0 },
    children: [{ id: (options.newId ?? newNodeId)(), type: "text", text, font: { size: 14 } }],
  });
  switch (type) {
    case "row":
      return { id, type, gap: 8, cross: "center", padding: { top: 8, end: 8, bottom: 8, start: 8 }, children: [] };
    case "column":
      return { id, type, gap: 8, padding: { top: 8, end: 8, bottom: 8, start: 8 }, children: [] };
    case "stack":
      return { id, type, height: 160, radius: 16, background: options.brand, children: [] };
    case "grid":
      return { id, type, columns: 2, gap: 10, padding: { top: 6, end: 10, bottom: 6, start: 10 }, children: [] };
    case "slider":
      return { id, type, height: 160, per_view: 1, dots: true, children: [] };
    case "spacer":
      return { id, type, height: 24 };
    case "text":
      return { id, type, text: options.text("text"), font: { size: 16 } };
    case "image":
      return { id, type, image_url: null, height: 180, radius: 14, fit: "cover" };
    case "button":
      return {
        id,
        type,
        text: options.text("button"),
        width: "fill",
        height: 46,
        radius: 14,
        background: options.brand,
        color: "#FFFFFF",
        font: { weight: 800, size: 15 },
        text_align: "center",
        margin: { top: 10, end: 18, bottom: 0, start: 18 },
        shadow: "medium",
      };
    case "items":
      return { id, type, source: options.source ?? undefined, layout: "grid", columns: 2, query: { limit: 4, category_id: null, featured: false, sort: "newest", ids: [] }, gap: 10, padding: { top: 6, end: 10, bottom: 6, start: 10 } };
    case "categories":
      return { id, type, source: options.source ?? undefined, padding: { top: 6, end: 10, bottom: 6, start: 10 } };
    case "video":
      return { id, type, video_url: null, aspect_ratio: 16 / 9, radius: 14 };
    case "form":
      return { id, type, form: { send_to: "email", fields: [{ id: "name", kind: "text", label: options.text("field"), required: true, options: null }] }, padding: { top: 8, end: 16, bottom: 8, start: 16 } };
    case "map":
      return { id, type, map: { lat: 30.0444, lng: 31.2357 }, height: 180, radius: 14 };
    case "ratings":
      return { id, type, rating: 4.8, text: options.text("ratings") };
    case "icon":
      return { id, type, icon: "star", icon_size: 28 };
    case "search":
      return { id, type, text: options.text("search"), radius: 12, margin: { top: 8, end: 10, bottom: 8, start: 10 } };
    case "divider":
      return { id, type, height: 1, background: "#E5E0D5", margin: { top: 8, end: 10, bottom: 8, start: 10 } };
    case "accordion":
      return { id, type, gap: 8, padding: { top: 8, end: 16, bottom: 8, start: 16 }, children: [child(`${options.text("question")} 1`, options.text("answer")), child(`${options.text("question")} 2`, options.text("answer"))] };
    case "tabs":
      return { id, type, gap: 10, padding: { top: 8, end: 16, bottom: 8, start: 16 }, children: [child(`${options.text("tab")} 1`, options.text("text")), child(`${options.text("tab")} 2`, options.text("text"))] };
    case "countdown": {
      // A week from now, on the hour.
      const ends = new Date((options.now ?? new Date()).getTime() + 7 * 86_400_000);
      ends.setUTCMinutes(0, 0, 0);
      return { id, type, ends_at: ends.toISOString(), text: options.text("ended"), radius: 14, padding: { top: 12, end: 12, bottom: 12, start: 12 }, margin: { top: 8, end: 16, bottom: 8, start: 16 } };
    }
    case "bullets":
      return { id, type, text: options.text("bullets"), icon: "check_circle", icon_size: 20, gap: 8, padding: { top: 8, end: 16, bottom: 8, start: 16 } };
  }
}
