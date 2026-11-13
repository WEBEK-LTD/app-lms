import type { Action, StudioNode, StudioPage, TabBarStyle } from "../pages/types";
import { newNodeId } from "./elements";
import type { SectionContext, SectionWord } from "./sections";

/**
 * 128 Food, photo first (Sofra Eats's home as the owner approved it on
 * 13 November 2026, light and dark): a photo of a full table under a soft
 * shade, where it delivers and the bell over it, the app's name and
 * "Tonight's table is set." at its foot; the search as a card over the
 * photo's edge; the cuisines as round photos; the order on its way
 * (`live_status`, the customer's own); the restaurants loved near you as
 * photo cards; and a floating pill bar. Every part is an ordinary Studio
 * element the owner changes in the editor: the photos are Yallapp's own
 * (public/demo-screens, public/demo-photos, free licences in their
 * CREDITS.json), the words Studio's in each language.
 */

/** The approved colours, by day and by night. */
export const FOOD_PHOTO_COLORS = {
  brand: "#D2552B",
  paper: "#FBF7F2",
  night: "#17100C",
  surface: "#FFFFFF",
  nightSurface: "#241913",
  ink: "#2A1810",
  nightInk: "#F7EDE6",
  muted: "#6E5A50",
  nightMuted: "#C5B2A6",
  line: "#EFE4DA",
  nightLine: "#3A2A21",
  accentText: "#B8431D",
  nightAccentText: "#FF9A72",
  kicker: "#FFC9AE",
  shade: "#140A05",
} as const;
const C = FOOD_PHOTO_COLORS;

/** The approved bar: a dark capsule by day and a light one by night, the open tab a pill in the brand's colour. */
export const FOOD_PHOTO_TAB_BAR: TabBarStyle = {
  design: "float",
  background: C.ink,
  dark_background: C.nightInk,
  active: C.brand,
  dark_active: C.brand,
  inactive: "#E8D9CE",
  dark_inactive: "#5B463B",
  radius: 22,
  margin: 12,
  labels: "active",
};

/** The font the approved boards are drawn in, one of the app's own. */
export const PHOTO_FONT = "Manrope";

const pad = (v: number, h: number) => ({ top: v, end: h, bottom: v, start: h });

/** One of Yallapp's photos (`/demo-photos/kofta.jpg`) at the address the context draws Yallapp's pictures from. */
export function yallappPhoto(ctx: SectionContext, path: string): string | null {
  const probe = ctx.picture?.("x");
  if (!probe?.endsWith("/design-pictures/x")) return null;
  return `${probe.slice(0, -"/design-pictures/x".length)}${path}`;
}

const restaurants: Action = { type: "screen", screen: "restaurants" };

/** A round button over a photo: a white disc at a fifth of its strength under a white icon. */
export function glassButton(ctx: SectionContext, icon: string, action: Action | null = null, size = 40): StudioNode {
  const id = () => (ctx.newId ?? newNodeId)();
  return {
    id: id(),
    type: "stack",
    width: size,
    height: size,
    cross: "center",
    ...(action ? { action } : {}),
    children: [
      { id: id(), type: "column", width: size, height: size, radius: size / 2, background: "#FFFFFF", opacity: 0.18, children: [] },
      { id: id(), type: "icon", icon, icon_size: 22, color: "#FFFFFF" },
    ],
  };
}

/** The cuisines as round photos, the first ringed in the brand's colour; each opens the restaurants. */
export function cuisineChips(ctx: SectionContext, padding = { top: 18, end: 16, bottom: 6, start: 16 }): StudioNode {
  const id = () => (ctx.newId ?? newNodeId)();
  const chips: [SectionWord, string][] = [
    ["fpGrill", "/demo-photos/cover-grill.jpg"],
    ["fpPizza", "/demo-photos/margherita.jpg"],
    ["fpKofta", "/demo-photos/kofta.jpg"],
    ["fpTawook", "/demo-photos/shish-tawook.jpg"],
    ["fpSweets", "/demo-photos/chocolate-brownie.jpg"],
  ];
  return {
    id: id(),
    type: "row",
    name: ctx.w("fpGrill"),
    scroll: true,
    gap: 14,
    cross: "start",
    padding,
    children: chips.map(([word, photo], i) => ({
      id: id(),
      type: "column",
      gap: 6,
      cross: "center",
      action: restaurants,
      children: [
        // Without Yallapp's photos at hand, a disc in a warm shade for the owner's own photo.
        {
          id: id(),
          ...(yallappPhoto(ctx, photo) ? { type: "image" as const, image_url: yallappPhoto(ctx, photo), fit: "cover" as const } : { type: "column" as const, background: "#F3D9CC", dark_background: "#3A2A21", children: [] }),
          width: 58,
          height: 58,
          radius: 29,
          ...(i === 0 ? { border_color: C.brand, border_width: 2 } : {}),
        },
        { id: id(), type: "text", text: ctx.w(word), font: { size: 12, weight: 700 }, color: C.ink, dark_color: C.nightInk },
      ],
    })),
  };
}

/** The customer's order on its way, in the brand's colour (nothing without one). */
export function liveOrderCard(ctx: SectionContext, source: "food_order" | "market_order" = "food_order", background: string = C.brand): StudioNode {
  return {
    id: (ctx.newId ?? newNodeId)(),
    type: "live_status",
    live_status: { source },
    visibility: "signed_in",
    radius: 18,
    background,
    color: "#FFFFFF",
    padding: pad(12, 14),
    margin: { top: 10, end: 16, bottom: 0, start: 16 },
  };
}

/** A section's title with "See all" opening `action`. */
export function sectionHead(ctx: SectionContext, word: SectionWord, action: Action, colors: { ink: string; nightInk: string; accent: string; nightAccent: string }, padding = { top: 18, end: 16, bottom: 10, start: 16 }, size = 18): StudioNode {
  const id = () => (ctx.newId ?? newNodeId)();
  return {
    id: id(),
    type: "row",
    name: ctx.w(word),
    cross: "end",
    padding,
    children: [
      { id: id(), type: "text", text: ctx.w(word), width: "fill", font: { size, weight: 800 }, color: colors.ink, dark_color: colors.nightInk },
      { id: id(), type: "text", text: ctx.w("seeAll"), font: { size: 13, weight: 700 }, color: colors.accent, dark_color: colors.nightAccent, action },
    ],
  };
}

/** The restaurants as photo cards in a row: the photo, the name, the rating and cuisines. */
function restaurantCards(ctx: SectionContext): StudioNode {
  const id = () => (ctx.newId ?? newNodeId)();
  return {
    id: id(),
    type: "items",
    source: "restaurants",
    layout: "carousel",
    gap: 12,
    padding: { top: 0, end: 16, bottom: 0, start: 16 },
    query: { limit: 6, category_id: null, featured: false, sort: "popular", ids: [] },
    card: {
      id: id(),
      type: "column",
      width: 200,
      radius: 20,
      background: C.surface,
      dark_background: C.nightSurface,
      border_color: C.line,
      border_width: 1,
      children: [
        { id: id(), type: "image", bind: "image", width: "fill", height: 108 },
        {
          id: id(),
          type: "column",
          gap: 2,
          padding: pad(10, 12),
          children: [
            { id: id(), type: "text", bind: "title", max_lines: 1, font: { size: 14, weight: 800 }, color: C.ink, dark_color: C.nightInk },
            {
              id: id(),
              type: "row",
              gap: 6,
              cross: "center",
              children: [
                { id: id(), type: "text", bind: "badge", font: { size: 12, weight: 700 }, color: C.ink, dark_color: C.nightInk },
                { id: id(), type: "text", bind: "subtitle", width: "fill", max_lines: 1, font: { size: 12 }, color: C.muted, dark_color: C.nightMuted },
              ],
            },
          ],
        },
      ],
    },
  };
}

/**
 * The photo hero with the search over its edge: a layer as tall as the
 * photo and half the search, the photo with its words first, the search
 * card at the layer's foot.
 */
function hero(ctx: SectionContext): StudioNode {
  const id = () => (ctx.newId ?? newNodeId)();
  const white = "#FFFFFF";
  const kicker: StudioNode[] = ctx.app
    ? [{ id: id(), type: "text", text: ctx.app, font: { size: 12, weight: 800, letter_spacing: 1.9, uppercase: true }, color: C.kicker }]
    : [];
  return {
    id: id(),
    type: "stack",
    name: ctx.w("fpHeadline").replace("\n", " "),
    cross: "end",
    children: [
      {
        id: id(),
        type: "column",
        height: 357,
        children: [
          {
            id: id(),
            type: "column",
            height: 330,
            align: "between",
            image_background_url: yallappPhoto(ctx, "/demo-screens/sofra-mezze.jpg"),
            scrim: { color: C.shade, from: 0.55, middle: 0.05, at: 38, to: 0.75 },
            padding: { top: 22, end: 18, bottom: 52, start: 18 },
            color: white,
            children: [
              {
                id: id(),
                type: "row",
                gap: 10,
                cross: "center",
                children: [
                  {
                    id: id(),
                    type: "column",
                    width: "fill",
                    children: [
                      { id: id(), type: "text", text: ctx.w("fpDeliverTo"), font: { size: 12 }, opacity: 0.85, color: white },
                      {
                        id: id(),
                        type: "row",
                        gap: 2,
                        cross: "center",
                        children: [
                          { id: id(), type: "text", text: ctx.w("fpArea"), font: { size: 15, weight: 700 }, color: white },
                          { id: id(), type: "icon", icon: "expand_more", icon_size: 18, color: white },
                        ],
                      },
                    ],
                  },
                  glassButton(ctx, "notifications", { type: "screen", screen: "notifications" }),
                ],
              },
              {
                id: id(),
                type: "column",
                gap: 6,
                children: [
                  ...kicker,
                  { id: id(), type: "text", text: ctx.w("fpHeadline"), font: { size: 32, weight: 800, line_height: 1.05, letter_spacing: -0.6 }, color: white },
                ],
              },
            ],
          },
        ],
      },
      {
        id: id(),
        type: "row",
        name: ctx.w("fpSearch"),
        height: 54,
        gap: 10,
        cross: "center",
        radius: 18,
        background: C.surface,
        dark_background: C.nightSurface,
        shadow: "medium",
        padding: pad(0, 16),
        margin: { top: 0, end: 16, bottom: 0, start: 16 },
        color: C.muted,
        dark_color: C.nightMuted,
        action: restaurants,
        children: [
          { id: id(), type: "icon", icon: "search", icon_size: 22, color: C.muted, dark_color: C.nightMuted },
          { id: id(), type: "text", text: ctx.w("fpSearch"), width: "fill", max_lines: 1, font: { size: 15 }, color: C.muted, dark_color: C.nightMuted },
        ],
      },
    ],
  };
}

/** The approved home: the hero, the cuisines, the order on its way and the restaurants loved near you. */
export function foodPhotoHome(ctx: SectionContext): StudioPage {
  return {
    background: C.paper,
    dark_background: C.night,
    body: {
      id: (ctx.newId ?? newNodeId)(),
      type: "column",
      // 128.10 The app ends the page above its floating bar itself.
      padding: { top: 0, end: 0, bottom: 24, start: 0 },
      children: [
        hero(ctx),
        cuisineChips(ctx),
        liveOrderCard(ctx),
        sectionHead(ctx, "fpLoved", restaurants, { ink: C.ink, nightInk: C.nightInk, accent: C.accentText, nightAccent: C.nightAccentText }),
        restaurantCards(ctx),
      ],
    },
  };
}

/**
 * The approved home's language on the pages after it: the restaurants
 * under the cuisines, the orders under the order on its way; the pages
 * around a restaurant, the cart and an order with the title in the brand's
 * colours by night.
 */
export function foodPhotoPage(screen: string, ctx: SectionContext): StudioNode[] | null {
  switch (screen) {
    case "restaurants":
      return [cuisineChips(ctx, { top: 8, end: 16, bottom: 8, start: 16 })];
    case "food_orders":
      return [{ ...liveOrderCard(ctx), margin: { top: 10, end: 16, bottom: 6, start: 16 } }];
    default:
      return null;
  }
}

/** The header of the pages after the home: the page's ink by day, the night's surface by night. */
export const FOOD_PHOTO_PAGE_HEADER = { background: C.paper, color: C.ink, dark_background: C.night, dark_color: C.nightInk } as const;
