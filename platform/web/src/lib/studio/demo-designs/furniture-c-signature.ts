import type { Action, FormField, LayoutTab, StudioEntry, StudioFont, StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { sides, sigEntry, sigTexts, signatureBar, type SignatureInk } from "./food-signature-parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { KIT_CUSTOM_PAGE, kitPhoto, ownPage, say, shop, type KitLook } from "./shop-kit-parts";

/**
 * 225 Rukn's look C, MIZAN (ميزان), the architect: the furniture house drawn
 * as a set of drawings. Monochrome on drafting paper by day, a black sheet
 * by night; Cairo; square corners and hairlines everywhere, no shadows.
 *
 * - Its own header (the wordmark large, the menu, the search and the bag)
 *   over a title block (sheet, room, scale, pieces in the scene), as a
 *   drawing's.
 * - A full-width room scene with numbered hotspots (each opens its piece),
 *   its figure caption under it.
 * - The rooms as a drawing's index (A, B, C… a thumbnail, the room, an
 *   arrow), each named like the shop's room so it opens it.
 * - Dimension-first cards: W × D × H as the headline figure with a
 *   dimension rule under it, the name quieter, then the price, on a hairline
 *   grid.
 * - "Try it in your room": a floor plan on a grid (the room, a sofa, a
 *   table, a chair, its width), sending the room's size to the shop (a
 *   custom-order request).
 * - The drawing's notes (delivery and assembly, the warranty, installments
 *   only ever "coming soon"), the delivery and assembly booking.
 * - The line bar: across the foot, a line over the open tab.
 *
 * Nothing of the shop kit's visual parts: only its data plumbing (words,
 * photos, the shop's own pages). The owner's words are in [brackets].
 */

export const MIZAN_INK: SignatureInk = {
  page: "#F6F6F4",
  darkPage: "#0D0D0D",
  surface: "#FFFFFF",
  darkSurface: "#161616",
  ink: "#111111",
  darkInk: "#F1F1EE",
  muted: "#5A5A56",
  darkMuted: "#A6A6A1",
  line: "#D6D6D1",
  darkLine: "#343432",
  accent: "#111111",
  darkAccent: "#F1F1EE",
  fill: "#111111",
  darkFill: "#F1F1EE",
  onFill: "#FFFFFF",
  darkOnFill: "#0D0D0D",
};

const L: KitLook = { k: MIZAN_INK, tint: { day: "#E9E9E5", night: "#202020" }, family: "Cairo", look: "c", dir: "furniture-photos", radius: 0, heavy: 800 };
const K = MIZAN_INK;
/** The plan's grid, fainter than the hairlines. */
const GRID = { day: "#E6E6E2", night: "#222221" };

/** The plan request is the shop's custom-order page (its answers kept as the shop's request). */
export const MIZAN_PLAN_PAGE = KIT_CUSTOM_PAGE;
const MENU_PAGE = "menu";

const font = (size: number, weight: StudioFont["weight"] = 400, extra: Partial<StudioFont> = {}): StudioFont => ({ family: L.family, size, weight, ...extra });
const hair = (ctx: SectionContext, margin = sides(0, 16, 0, 16), strong = false): StudioNode => ({
  id: idOf(ctx)(),
  type: "row",
  height: 1,
  margin,
  background: strong ? K.ink : K.line,
  dark_background: strong ? K.darkInk : K.darkLine,
  children: [],
});

/** A numbered section's head: "02", its title, a hairline to the edge, a quiet link. */
function head(ctx: SectionContext, n: string, title: SectionWord, link?: { word: SectionWord; action: Action }): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    gap: 10,
    cross: "center",
    padding: sides(30, 16, 12, 16),
    children: [
      { id: id(), type: "text", text: n, color: K.muted, dark_color: K.darkMuted, font: font(11, 700, { letter_spacing: 1 }) },
      say(ctx, L, title, font(18, 800), { max_lines: 1 }),
      { id: id(), type: "row", width: "fill", height: 1, self_align: "center", background: K.line, dark_background: K.darkLine, children: [] },
      ...(link ? [{ ...say(ctx, L, link.word, font(12, 700), { max_lines: 1 }), name: ctx.w(link.word), action: link.action }] : []),
    ],
  };
}

/** A drawing's title block: cells on hairlines, each a figure over its label. */
function titleBlock(ctx: SectionContext, cells: readonly [SectionWord, SectionWord][]): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("mzSheet"),
    gap: 1,
    padding: sides(1, 0, 1, 0),
    background: K.line,
    dark_background: K.darkLine,
    children: cells.map(([value, label]) => ({
      id: id(),
      type: "column" as const,
      width: "fill" as const,
      gap: 0,
      padding: sides(7, 14, 7, 14),
      background: K.page,
      dark_background: K.darkPage,
      children: [say(ctx, L, value, font(12.5, 700), { max_lines: 1 }), say(ctx, L, label, font(10.5), { muted: true, max_lines: 1 })],
    })),
  };
}

const SCENE_SPOTS = [
  { x: 6, y: 52, label: "mzSpot1" },
  { x: 56, y: 22, label: "mzSpot2" },
  { x: 34, y: 76, label: "mzSpot3" },
] as const satisfies readonly { x: number; y: number; label: SectionWord }[];

/** The room scene, edge to edge: square numbered spots on white labels, each opening its piece (the demo's own, else the shop). */
function scene(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  const photo = kitPhoto(ctx, L, "set-najd");
  const spot = ({ x, y, label }: (typeof SCENE_SPOTS)[number], i: number): StudioNode => {
    const entry = ctx.entries?.[i];
    return {
      id: id(),
      type: "row",
      name: ctx.w(label),
      width: Math.round(40 + ctx.w(label).length * 6.4),
      height: 28,
      gap: 6,
      cross: "center",
      padding: sides(0, 8, 0, 4),
      background: "#FFFFFF",
      border_color: "#111111",
      border_width: 1,
      place: { x, y },
      action: entry ? { type: "item", item: { source: "products", id: entry.id } } : shop,
      children: [
        { id: id(), type: "row", width: 19, height: 19, align: "center", cross: "center", border_color: "#111111", border_width: 1.5, children: [{ id: id(), type: "text", text: String(i + 1), color: "#111111", dark_color: "#111111", font: font(11, 800) }] },
        { id: id(), type: "text", text: ctx.w(label), max_lines: 1, color: "#111111", dark_color: "#111111", font: font(11, 700) },
      ],
    };
  };
  return [
    {
      id: id(),
      type: "stack",
      name: ctx.w("mzScene"),
      height: 300,
      background: L.tint.day,
      dark_background: L.tint.night,
      ...(photo ? { image_background_url: photo } : {}),
      children: SCENE_SPOTS.map(spot),
    },
    {
      id: id(),
      type: "row",
      name: ctx.w("mzFigure"),
      gap: 10,
      cross: "center",
      padding: sides(8, 16, 8, 16),
      children: [say(ctx, L, "mzFigure", font(11), { muted: true, width: "fill", max_lines: 2 }), say(ctx, L, "mzTapNumber", font(11), { muted: true, max_lines: 1 })],
    },
    hair(ctx, sides(0, 0, 0, 0)),
  ];
}

const ROOMS = [
  ["A", "room-living", "fuRoomLiving"],
  ["B", "room-bedroom", "fuRoomBedroom"],
  ["C", "room-dining", "fuRoomDining"],
  ["D", "room-office", "fuRoomOffice"],
  ["E", "room-outdoor", "fuRoomOutdoor"],
] as const satisfies readonly [string, string, SectionWord][];

/** The rooms as a drawing's index: a letter, a thumbnail, the room (named like the shop's, so it opens it), an arrow; hairlines between. */
function roomIndex(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const rows: StudioNode[] = [];
  for (const [letter, photo, word] of ROOMS) {
    const url = kitPhoto(ctx, L, photo);
    rows.push({
      id: id(),
      type: "row",
      name: ctx.w(word),
      gap: 12,
      cross: "center",
      padding: sides(11, 0, 11, 0),
      action: shop,
      children: [
        { id: id(), type: "text", text: letter, width: 18, color: K.muted, dark_color: K.darkMuted, font: font(11, 600) },
        url ? { id: id(), type: "image", image_url: url, width: 56, height: 40, fit: "cover" } : { id: id(), type: "row", width: 56, height: 40, background: L.tint.day, dark_background: L.tint.night, children: [] },
        say(ctx, L, word, font(16, 700), { width: "fill", max_lines: 1 }),
        { id: id(), type: "icon", icon: "arrow_forward", icon_size: 18, color: K.ink, dark_color: K.darkInk },
      ],
    });
    rows.push(hair(ctx, sides(0, 0, 0, 0)));
  }
  return { id: id(), type: "column", name: ctx.w("mzIndex"), gap: 0, margin: sides(0, 16, 0, 16), children: [hair(ctx, sides(0, 0, 0, 0), true), ...rows] };
}

/** A dimension-first card: the photo, W × D × H as its headline with a dimension rule, the name, the price. */
function dimensionCard(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const tick = (): StudioNode => ({ id: id(), type: "row", width: 1, height: 7, background: K.ink, dark_background: K.darkInk, children: [] });
  return {
    id: id(),
    type: "column",
    width: 170,
    gap: 4,
    padding: sides(10, 10, 12, 10),
    background: K.surface,
    dark_background: K.darkSurface,
    children: [
      {
        id: id(),
        type: "stack",
        width: 150,
        height: 128,
        children: [
          { id: id(), type: "image", bind: "image", width: 150, height: 128, fit: "cover", background: L.tint.day, dark_background: L.tint.night },
          { id: id(), type: "text", bind: "sale", font: font(10.5, 800), color: K.onFill, background: K.fill, dark_color: K.darkOnFill, dark_background: K.darkFill, padding: sides(2, 6, 2, 6), place: { x: 4, y: 5 } },
        ],
      },
      { id: id(), type: "text", bind: "subtitle", max_lines: 2, color: K.ink, dark_color: K.darkInk, font: font(12.5, 800, { line_height: 1.3 }), margin: sides(6, 0, 0, 0) },
      { id: id(), type: "row", width: 150, gap: 0, cross: "center", children: [tick(), { id: id(), type: "row", width: 148, height: 1, background: K.ink, dark_background: K.darkInk, children: [] }, tick()] },
      { id: id(), type: "text", bind: "title", max_lines: 1, color: K.muted, dark_color: K.darkMuted, font: font(12.5), margin: sides(4, 0, 0, 0) },
      {
        id: id(),
        type: "row",
        gap: 6,
        cross: "center",
        children: [
          { id: id(), type: "text", bind: "price", max_lines: 1, color: K.ink, dark_color: K.darkInk, font: font(13.5, 700) },
          { id: id(), type: "text", bind: "was_price", max_lines: 1, color: K.muted, dark_color: K.darkMuted, font: font(11.5) },
        ],
      },
    ],
  };
}

/** The pieces on a hairline grid, two by two. */
function dimensionGrid(ctx: SectionContext, word: SectionWord, sort: "newest" | "price_desc", limit = 4): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "items",
    name: ctx.w(word),
    source: "products",
    layout: "grid",
    columns: 2,
    gap: 1,
    padding: sides(1, 1, 1, 1),
    margin: sides(0, 16, 0, 16),
    background: K.line,
    dark_background: K.darkLine,
    query: { limit, category_id: null, featured: false, sort, ids: [] },
    card: dimensionCard(ctx),
  };
}

/** A box on the plan: placed in percent, drawn as a line. */
function planShape(ctx: SectionContext, x: number, y: number, w: number, h: number, weight = 1.5, round = false): StudioNode {
  return { id: idOf(ctx)(), type: "row", width: w, height: h, radius: round ? h / 2 : 0, border_color: K.ink, dark_border_color: K.darkInk, border_width: weight, place: { x, y }, children: [] };
}

/** Try it in your room: a floor plan on a grid, then the request (the room's size sent to the shop). */
function planCard(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const lines: StudioNode[] = [];
  for (let x = 0; x < 100; x += 6) lines.push({ id: id(), type: "row", width: 1, height: 200, background: GRID.day, dark_background: GRID.night, place: { x, y: 0 }, children: [] });
  for (let y = 0; y < 100; y += 10) lines.push({ id: id(), type: "row", width: 420, height: 1, background: GRID.day, dark_background: GRID.night, place: { x: 0, y }, children: [] });
  return {
    id: id(),
    type: "column",
    name: ctx.w("mzPlanTitle"),
    gap: 0,
    margin: sides(0, 16, 0, 16),
    background: K.surface,
    dark_background: K.darkSurface,
    border_color: K.ink,
    dark_border_color: K.darkInk,
    border_width: 1,
    action: ownPage(ctx, MIZAN_PLAN_PAGE),
    children: [
      {
        id: id(),
        type: "stack",
        height: 190,
        children: [
          ...lines,
          planShape(ctx, 8, 11, 290, 136, 2.5),
          planShape(ctx, 50, 20, 118, 34),
          planShape(ctx, 58, 50, 60, 32, 1.5, true),
          planShape(ctx, 16, 30, 38, 38),
          say(ctx, L, "mzPlanWidth", font(10, 600), { muted: true, width: 120, text_align: "center", place: { x: 36, y: 88 } }),
        ],
      },
      hair(ctx, sides(0, 0, 0, 0)),
      {
        id: id(),
        type: "column",
        gap: 4,
        padding: sides(14, 14, 16, 14),
        children: [
          say(ctx, L, "mzPlanTitle", font(17, 800, { line_height: 1.3 }), { max_lines: 2 }),
          say(ctx, L, "mzPlanText", font(12.5, 400, { line_height: 1.55 }), { muted: true, max_lines: 3 }),
          {
            id: id(),
            type: "button",
            name: ctx.w("mzPlanButton"),
            text: ctx.w("mzPlanButton"),
            icon: "arrow_forward",
            icon_position: "end",
            width: "hug",
            height: 44,
            radius: 0,
            padding: sides(0, 18, 0, 18),
            self_align: "start",
            margin: sides(10, 0, 0, 0),
            background: K.fill,
            dark_background: K.darkFill,
            color: K.onFill,
            dark_color: K.darkOnFill,
            font: font(13.5, 700),
            action: ownPage(ctx, MIZAN_PLAN_PAGE),
          },
        ],
      },
    ],
  };
}

/** The drawing's notes: label and value on hairlines (installments only ever coming soon). */
function notes(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const rows: readonly [SectionWord, SectionWord][] = [
    ["mzNoteDelivery", "mzNoteDeliveryValue"],
    ["mzNoteWarranty", "mzNoteWarrantyValue"],
    ["mzNoteSamples", "mzNoteSamplesValue"],
    ["mzNotePay", "installmentsSoon"],
  ];
  return {
    id: id(),
    type: "column",
    name: ctx.w("mzNotes"),
    gap: 0,
    margin: sides(0, 16, 0, 16),
    children: [
      hair(ctx, sides(0, 0, 0, 0), true),
      ...rows.flatMap(([label, value]) => [
        { id: id(), type: "row" as const, name: ctx.w(label), gap: 12, cross: "center" as const, padding: sides(10, 0, 10, 0), children: [say(ctx, L, label, font(13), { muted: true, width: 110, max_lines: 2 }), say(ctx, L, value, font(13, 600), { width: "fill", max_lines: 2 })] },
        hair(ctx, sides(0, 0, 0, 0)),
      ]),
    ],
  };
}

/** The delivery and assembly booking (the shop's days and times, kept for the checkout), square and outlined. */
function booking(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("mzSlotsTitle"),
    gap: 10,
    padding: sides(14, 14, 14, 14),
    margin: sides(0, 16, 0, 16),
    background: K.surface,
    dark_background: K.darkSurface,
    border_color: K.line,
    dark_border_color: K.darkLine,
    border_width: 1,
    children: [
      say(ctx, L, "mzSlotsTitle", font(14.5, 700), { max_lines: 2 }),
      { id: id(), type: "delivery_slots", name: ctx.w("mzSlotsTitle"), delivery_slots: { days: 5, assembly: true }, color: K.ink, dark_color: K.darkInk, border_color: K.fill, dark_border_color: K.darkFill },
    ],
  };
}

/** A square outlined button of the drawing's top: its icon, opening `action`. */
function squareButton(ctx: SectionContext, icon: string, name: SectionWord, action: Action): StudioNode {
  const id = idOf(ctx);
  return { id: id(), type: "row", name: ctx.w(name), width: 38, height: 38, align: "center", cross: "center", self_align: "center", border_color: K.line, dark_border_color: K.darkLine, border_width: 1, action, children: [{ id: id(), type: "icon", icon, icon_size: 21, color: K.ink, dark_color: K.darkInk }] };
}

/** The drawing's own top in place of the app's bar: the menu, the spaced wordmark in the middle, the search and the bag in square outlined buttons, a hairline under them. */
function sheetTop(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("fuWordmark"),
    gap: 6,
    cross: "center",
    padding: sides(8, 16, 10, 16),
    border_color: K.line,
    dark_border_color: K.darkLine,
    children: [
      squareButton(ctx, "menu_open", "skCategoryMenu", ownPage(ctx, MENU_PAGE)),
      say(ctx, L, "fuWordmark", font(15, 900, { letter_spacing: 5, uppercase: true }), { width: "fill", text_align: "center", max_lines: 1 }),
      squareButton(ctx, "search", "mzMenuSearch", screen("search")),
      squareButton(ctx, "shopping_bag", "tabCart", screen("cart")),
    ],
  };
}

function home(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    // No bar of the app's: the drawing's own top (`sheetTop`).
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 40, 0),
      children: [
        sheetTop(ctx),
        hair(ctx, sides(0, 0, 0, 0)),
        titleBlock(ctx, [
          ["mzSheet", "fuRoomLiving"],
          ["mzScale", "mzScaleLabel"],
          ["mzPieces", "mzPiecesLabel"],
        ]),
        ...scene(ctx),
        say(ctx, L, "mzTitle", font(30, 800, { line_height: 1.15 }), { max_lines: 3, padding: sides(24, 16, 6, 16) }),
        say(ctx, L, "mzLead", font(13, 400, { line_height: 1.6 }), { muted: true, max_lines: 4, padding: sides(0, 16, 0, 16) }),
        head(ctx, "01", "mzIndex"),
        roomIndex(ctx),
        head(ctx, "02", "mzNew", { word: "skSeeAll", action: shop }),
        dimensionGrid(ctx, "mzNew", "newest"),
        head(ctx, "03", "mzPlan"),
        planCard(ctx),
        head(ctx, "04", "mzSlots"),
        booking(ctx),
        head(ctx, "05", "mzLoved", { word: "skSeeAll", action: shop }),
        // Its finest pieces (a new shop has no best sellers yet, so never the same four as the new ones).
        dimensionGrid(ctx, "mzLoved", "price_desc"),
        head(ctx, "06", "mzNotes"),
        notes(ctx),
      ],
    },
  };
}

// ——— The pages after the home ———

/** A strip of the rooms as square cells on hairlines, each named like the room so it opens it (over the shop). */
function roomStrip(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("mzIndex"),
    gap: 1,
    scroll: true,
    padding: sides(1, 0, 1, 0),
    margin: sides(6, 16, 8, 16),
    background: K.line,
    dark_background: K.darkLine,
    children: ROOMS.map(([letter, , word]) => ({
      id: id(),
      type: "column" as const,
      name: ctx.w(word),
      gap: 0,
      padding: sides(8, 14, 8, 14),
      background: K.page,
      dark_background: K.darkPage,
      action: shop,
      children: [
        { id: id(), type: "text" as const, text: letter, color: K.muted, dark_color: K.darkMuted, font: font(10, 600) },
        say(ctx, L, word, font(13.5, 700), { max_lines: 1 }),
      ],
    })),
  };
}

function over(screenName: string, ctx: SectionContext): StudioNode[] | null {
  const id = idOf(ctx);
  switch (screenName) {
    case "search":
      return [titleBlock(ctx, [["mzShopSheet", "mzShopSheetLabel"], ["mzScale", "mzScaleLabel"], ["mzShopUnit", "mzShopUnitLabel"]]), roomStrip(ctx)];
    case "cart":
      return [
        { id: id(), type: "coupon", name: ctx.w("skCoupon"), code: FURNITURE_C_CODE, coupon: { look: "classic", bind: "public" }, radius: 0, color: K.fill, margin: sides(10, 16, 4, 16) },
        { ...notes(ctx), margin: sides(10, 16, 4, 16) },
      ];
    case "orders":
      return [
        head(ctx, "—", "skTrack"),
        {
          id: id(),
          type: "timeline",
          name: ctx.w("skTrack"),
          timeline: { style: "bars", source: "latest_order" },
          color: K.ink,
          dark_color: K.darkInk,
          background: K.surface,
          dark_background: K.darkSurface,
          border_color: K.line,
          dark_border_color: K.darkLine,
          border_width: 1,
          radius: 0,
          padding: sides(14, 14, 14, 14),
          margin: sides(0, 16, 6, 16),
          entries: (["fuTrack1", "fuTrack2", "fuTrack3", "fuTrack4"] as const).map((w, i): StudioEntry => sigEntry(ctx, { title: w, text: `${w}Text` as SectionWord }, i === 0 ? { highlight: true } : {})),
        },
      ];
    default:
      return null;
  }
}

/** The demo's code, shown in the cart (lib/demo/kits/furniture.ts makes it). */
const FURNITURE_C_CODE = "RUKN10";

/** The category menu: the search, every room a row of its sub-categories (numbered, square), then the account's ways in on hairlines and the contact. */
function menuPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "fuWordmark" });
  const cell = (word: SectionWord, icon: string, action: Action): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    gap: 6,
    padding: sides(12, 12, 12, 12),
    background: K.page,
    dark_background: K.darkPage,
    action,
    children: [{ id: id(), type: "icon", icon, icon_size: 20, color: K.ink, dark_color: K.darkInk }, say(ctx, L, word, font(12.5, 600), { max_lines: 1 })],
  });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["search", "cart"], background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk, style: "large" },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { id: id(), type: "search", name: ctx.w("mzMenuSearch"), text: ctx.w("mzMenuSearch"), source: "products", radius: 0, height: 48, background: K.surface, dark_background: K.darkSurface, color: K.muted, dark_color: K.darkMuted, border_color: K.ink, dark_border_color: K.darkInk, border_width: 1, margin: sides(4, 16, 10, 16) },
        hair(ctx, sides(0, 16, 0, 16), true),
        { id: id(), type: "categories", name: ctx.w("skCategoryMenu"), source: "products", style: "rows", category_menu: { look: "label", numbers: true, radius: 0 }, color: K.ink, dark_color: K.darkInk, padding: sides(8, 0, 8, 0) },
        hair(ctx, sides(8, 16, 0, 16), true),
        {
          id: id(),
          type: "grid",
          name: ctx.w("skMenuAccount"),
          columns: 2,
          gap: 1,
          padding: sides(1, 1, 1, 1),
          margin: sides(14, 16, 0, 16),
          background: K.line,
          dark_background: K.darkLine,
          children: [cell("skAccount", "person", screen("account")), cell("skOrders", "package_2", screen("orders")), cell("mzWishlist", "favorite", screen("favorites")), cell("skLanguage", "language", screen("settings"))],
        },
        {
          id: id(),
          type: "row",
          name: ctx.w("skContact"),
          gap: 12,
          cross: "center",
          padding: sides(14, 14, 14, 14),
          margin: sides(10, 16, 0, 16),
          background: K.fill,
          dark_background: K.darkFill,
          action: screen("account"),
          children: [
            { id: id(), type: "icon", icon: "support_agent", icon_size: 22, color: K.onFill, dark_color: K.darkOnFill },
            { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, L, "skContact", font(14, 700), { color: K.onFill, dark_color: K.darkOnFill }), say(ctx, L, "fuContactLine", font(12), { color: K.onFill, dark_color: K.darkOnFill, opacity: 0.8, max_lines: 2 })] },
            { id: id(), type: "icon", icon: "arrow_forward", icon_size: 20, color: K.onFill, dark_color: K.darkOnFill },
          ],
        },
      ],
    },
  };
}

/** Plan your room: what happens, then the room's size and what to place (a custom-order request the shop answers). */
function planPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "mzPlan" });
  const fields: readonly { kind: FormField["kind"]; label: SectionWord; required?: boolean }[] = [
    { kind: "text", label: "mzFieldWidth", required: true },
    { kind: "text", label: "mzFieldLength", required: true },
    { kind: "long_text", label: "mzFieldOpenings" },
    { kind: "long_text", label: "mzFieldPieces", required: true },
    { kind: "text", label: "skFieldName", required: true },
    { kind: "phone", label: "skFieldPhone", required: true },
  ];
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk, style: "large" },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        planCard({ ...ctx, ownPages: false }),
        say(ctx, L, "mzPlanText", font(13.5, 400, { line_height: 1.6 }), { muted: true, padding: sides(14, 16, 0, 16) }),
        {
          id: id(),
          type: "timeline",
          name: ctx.w("mzPlanSteps"),
          timeline: { style: "vertical" },
          color: K.ink,
          dark_color: K.darkInk,
          radius: 0,
          padding: sides(14, 14, 14, 14),
          margin: sides(14, 16, 4, 16),
          border_color: K.line,
          dark_border_color: K.darkLine,
          border_width: 1,
          entries: (["mzPlanStep1", "mzPlanStep2", "mzPlanStep3"] as const).map((w, i) => sigEntry(ctx, { title: w, text: `${w}Text` as SectionWord }, i === 0 ? { highlight: true } : {})),
        },
        head(ctx, "—", "mzPlanForm"),
        {
          id: id(),
          type: "form",
          name: ctx.w("mzPlanForm"),
          form: { fields: fields.map((f, i): FormField => ({ id: `f${i + 1}`, kind: f.kind, label: ctx.w(f.label), required: Boolean(f.required), options: null })), submit_label: ctx.w("mzPlanSend"), success_text: ctx.w("mzPlanSent"), send_to: "email", request: "custom_order" },
          color: K.ink,
          dark_color: K.darkInk,
          background: K.surface,
          dark_background: K.darkSurface,
          border_color: K.ink,
          dark_border_color: K.darkInk,
          border_width: 1,
          radius: 0,
          padding: sides(16, 16, 16, 16),
          margin: sides(0, 16, 4, 16),
        },
      ],
    },
  };
}

/** Five tabs: Home, Shop (the index), Cart, Orders, Account, in square outlined icons. */
export function mizanTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const out = structuredClone([...tabs]).map((t) => {
    const target = t.target.type === "screen" ? t.target.screen : null;
    if (t.id === "home") return { ...t, icon: "dashboard" };
    if (target === "search") return { ...t, label: "Shop", icon: "view_list" };
    if (target === "cart") return { ...t, label: "Cart", icon: "shopping_cart" };
    if (target === "account") return { ...t, icon: "account_circle" };
    return t;
  });
  const account = out.findIndex((t) => t.target.type === "screen" && t.target.screen === "account");
  const orders: LayoutTab = { id: "orders", label: "Orders", icon: "inventory_2", target: { type: "screen", screen: "orders" } };
  if (!out.some((t) => t.target.type === "screen" && t.target.screen === "orders")) out.splice(account < 0 ? out.length : account, 0, orders);
  return out;
}

const MIZAN_SCREENS = signatureScreens({
  style: "minimal",
  photo: "/furniture-photos/set-najd.jpg",
  title: { en: "Measured, then made", ar: "يُقاس أولًا، ثم يُصنع", tr: "Önce ölçülür, sonra yapılır" },
  subtitle: { en: "Sign in for your orders, your delivery day and your room's plan.", ar: "سجّل الدخول لطلباتك وموعد توصيلها ومخطط غرفتك.", tr: "Siparişleriniz, teslimat gününüz ve odanızın planı için giriş yapın." },
  menu: "night",
  accent: "#111111",
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** The line bar: across the foot on the paper, a line over the open tab, every name shown. */
const MIZAN_BAR = signatureBar(K, { design: "line", background: K.page, dark_background: K.darkPage, active: K.ink, dark_active: K.darkInk, inactive: "#77776F", dark_inactive: "#8E8E88", labels: "always" });

export const FURNITURE_C: SignatureDesign = {
  demo: "furniture",
  variant: "c",
  template: { id: "furniture_signature_c", icon: "straighten", fits: { types: ["store"], plain: true } },
  home,
  over,
  tabs: mizanTabs,
  pages: (ctx) => [
    { slug: MENU_PAGE, title: "skCategoryMenu", studio: menuPage(ctx) },
    { slug: MIZAN_PLAN_PAGE, title: "mzPlan", studio: planPage(ctx) },
  ],
  bar: MIZAN_BAR,
  look: { header: { background: K.page, color: K.ink, dark_background: K.darkPage, dark_color: K.darkInk }, background: K.page, dark_background: K.darkPage },
  chrome: { header: "large", system: "large" },
  isNew: true,
  project: {
    primary: K.fill,
    appearance: { secondary_color: "#5A5A56", font: "DM Sans", font_family: "Cairo", arabic_font: "Cairo", dark_background: K.darkPage, dark_surface: K.darkSurface },
    screens: MIZAN_SCREENS,
  },
};
