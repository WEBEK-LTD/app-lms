import type { ItemSource, StudioLiveStatus, StudioNode, StudioNodeType } from "../pages/types";
// 129 Premium motion & media.
import { PREMIUM_MOTION_ELEMENTS, premiumMotionNode, type PremiumWord } from "./premium-motion";

/**
 * 103R The editor's Elements panel (the approved design): layout elements,
 * content elements and the ones under "More", each with its icon and what a
 * new one starts as.
 */

/** 129 `premium`: the premium elements and looks (lib/studio/premium-*.ts). */
export type ElementGroup = "layout" | "content" | "more" | "premium";

export interface ElementInfo {
  type: StudioNodeType;
  group: ElementGroup;
  /** A Material Symbols (Rounded) name. */
  icon: string;
  /** Words people search for, besides its name, in English. */
  keywords: string;
  /** 115.14 Offered only in projects of this kind (a marketplace's sections). */
  only?: "marketplace" | "academy" | "orders" | "trips" | "school";
  /** 129 A premium look of an existing element (a hero slider): its name is `studio.el_<preset>`. */
  preset?: string;
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
  // 112.4 A code people copy with one tap.
  { type: "coupon", group: "content", icon: "confirmation_number", keywords: "coupon code discount promo voucher copy offer" },
  // 115.14 One marketplace section from the marketplace's data: the address, kinds, offers, cuisines, the club, places, order again.
  // 123 The student's own cards: the course they are taking, their streak, their next live class, this week's learning.
  { type: "learning", group: "content", icon: "school", keywords: "learning continue course progress streak live class week time student", only: "academy" },
  // 128 The family's school day: the greeting with today's date, the children to switch between, today's card.
  { type: "school", group: "content", icon: "family_restroom", keywords: "school family parent child children today check in class bus greeting", only: "school" },
  { type: "market", group: "content", icon: "storefront", keywords: "marketplace vendors restaurants supermarket shops offers club cuisines address reorder", only: "marketplace" },
  // 128 The person's order on its way (food delivery and marketplaces), from the app's own data.
  { type: "live_status", group: "content", icon: "two_wheeler", keywords: "live status order on its way tracking delivery minutes progress", only: "orders" },
  // 128 A photo with a scrim and elements over it (a hero, a photo tile, a promo banner); a drawn map with markers and a sheet over it;
  // a greeting with the person's name; and, in delivery and ride apps, their shipment or ride on its way or the taxis near them.
  { type: "photo_hero", group: "layout", icon: "panorama", keywords: "hero photo picture banner cover scrim gradient tile caption promo header" },
  { type: "map_header", group: "layout", icon: "map", keywords: "map header markers taxis sheet bottom sheet cover" },
  { type: "greeting", group: "content", icon: "waving_hand", keywords: "greeting hello good morning evening name welcome" },
  { type: "tracking", group: "content", icon: "local_shipping", keywords: "tracking live status shipment parcel ride driver arriving on the way nearby taxis", only: "trips" },
  { type: "icon", group: "more", icon: "emoji_symbols", keywords: "icon symbol" },
  { type: "categories", group: "more", icon: "label", keywords: "categories chips tags filter" },
  { type: "search", group: "more", icon: "search", keywords: "search field" },
  { type: "divider", group: "more", icon: "horizontal_rule", keywords: "divider line separator" },
  // 129 Premium motion & media.
  ...PREMIUM_MOTION_ELEMENTS,
];

export function elementInfo(type: StudioNodeType): ElementInfo {
  return ELEMENTS.find((e) => e.type === type && !e.preset) ?? ELEMENTS.find((e) => e.type === type) ?? ELEMENTS[0]!;
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

export function newNode(
  type: StudioNodeType,
  options: {
    source: ItemSource | null;
    brand: string;
    text: (key: NewText) => string;
    newId?: () => string;
    now?: Date;
    /** 128 Whose orders a live status card follows: a marketplace's, else food delivery's. */ orders?: StudioLiveStatus["source"];
    /** 129 A premium look of the element (ElementInfo.preset), and the premium elements' sample words. */
    preset?: string;
    premiumWords?: (key: PremiumWord) => string;
  },
): StudioNode {
  // 129 Premium motion & media: its looks and elements start as lib/studio/premium-motion.ts makes them.
  const premium = premiumMotionNode(type, options.preset, { brand: options.brand, newId: options.newId ?? newNodeId, words: options.premiumWords });
  if (premium) return premium;
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
    case "coupon":
      return { id, type, code: "SAVE10", radius: 10, color: options.brand, margin: { top: 8, end: 16, bottom: 8, start: 16 } };
    case "market":
      return { id, type, market: { section: "vendors" }, margin: { top: 8, end: 0, bottom: 8, start: 0 } };
    case "live_status":
      return { id, type, live_status: { source: options.orders ?? "food_order" }, radius: 18, background: options.brand, color: "#FFFFFF", padding: { top: 12, end: 14, bottom: 12, start: 14 }, margin: { top: 10, end: 16, bottom: 0, start: 16 } };
    case "school":
      return { id, type, school: { section: "today" }, radius: 22, margin: { top: 14, end: 16, bottom: 0, start: 16 } };
    case "learning":
      return { id, type, learning: { section: "continue" }, radius: 30, margin: { top: 8, end: 16, bottom: 8, start: 16 }, gradient: { from: "#141A3A", to: "#3B2A6B", angle: 140 } };
    // 128 The covers start with words over them, ready to change.
    case "photo_hero":
      return {
        id,
        type,
        image_url: null,
        height: 180,
        radius: 20,
        background: "#1F2A37",
        scrim: { color: "#000000", from: 0, middle: 0, at: 40, to: 0.7 },
        align: "end",
        padding: { top: 14, end: 14, bottom: 14, start: 14 },
        margin: { top: 8, end: 16, bottom: 8, start: 16 },
        children: [{ id: (options.newId ?? newNodeId)(), type: "text", text: options.text("text"), color: "#FFFFFF", font: { size: 18, weight: 800 } }],
      };
    case "map_header":
      return { id, type, height: 320, map_drawing: { markers: [{ x: 18, y: 30 }, { x: 78, y: 38 }, { x: 36, y: 74 }], me: true }, padding: { top: 16, end: 16, bottom: 16, start: 16 }, children: [] };
    case "greeting":
      return { id, type, font: { size: 18, weight: 700 }, margin: { top: 8, end: 16, bottom: 8, start: 16 } };
    case "tracking":
      return { id, type, tracking: { kind: "shipment" }, radius: 20, padding: { top: 14, end: 14, bottom: 14, start: 14 }, margin: { top: 8, end: 16, bottom: 8, start: 16 } };
    // 129 The premium elements are made above (lib/studio/premium-motion.ts).
    default:
      return { id, type };
  }
}
