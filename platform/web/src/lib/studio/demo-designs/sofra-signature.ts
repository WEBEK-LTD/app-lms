import type { Action, LayoutTab, StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { glassDisc, inked, sides, sigEntry, sigImage, sigPhoto, signatureBar, signatureHead, signatureHeader, surfaceDisc, type SignatureInk } from "./food-signature-parts";

/**
 * 130.1–130.2 Sofra Eats's Signature looks (the owner approved both on
 * 13 November 2026, boards R2-Sofra-A and R2-Sofra-B), each a whole food
 * delivery project:
 *
 * A · Editorial menu: tonight's dishes as a magazine cover, a hero slider
 * of the restaurants' photos with a line per slide filling at its top,
 * the dish's name set huge in Bricolage Grotesque over each; the order on
 * its way as a frosted card hanging over the hero's foot, its minutes a
 * hero number over its four stages; the restaurants open near you as
 * photo tiles, a few dishes from the menus as a price list; a frosted bar.
 *
 * Every part an ordinary Studio element: the restaurants are the app's own
 * (`items` of restaurants), the order the person's own (`live_status`,
 * nothing without one), the photos Yallapp's (public/demo-photos,
 * public/demo-screens, free licences in their CREDITS.json), the words
 * Studio's in each language, the prices the demo's own.
 */

const restaurants: Action = screen("restaurants");

// ——— A · Editorial menu ———

/** The board's two themes: warm paper and ink by day, a lit charcoal by night, the brick accent. */
export const SOFRA_A_INK: SignatureInk = {
  page: "#F6F0E6",
  darkPage: "#110B08",
  surface: "#FFFBF5",
  darkSurface: "#241913",
  ink: "#1F140E",
  darkInk: "#F6ECE2",
  muted: "#66533F",
  darkMuted: "#C2AE9E",
  line: "#E3D6C5",
  darkLine: "#2E221B",
  accent: "#B13F1A",
  darkAccent: "#FF9A6B",
  fill: "#B13F1A",
  darkFill: "#FF8A5C",
  onFill: "#FFFFFF",
  darkOnFill: "#1A0E08",
};
const A = SOFRA_A_INK;
/** The board's display face, one the app bundles. */
const DISPLAY = "Bricolage Grotesque";
/** The hero's shade: dark at the top for the address, lighter over the dish, darkest at the foot for its name. */
const HERO_SHADE = "#140903";

/** One slide of the hero: the photo under its shade, the kicker, the dish set huge with a round arrow, the line with its price. */
function heroSlide(ctx: SectionContext, path: string, kicker: SectionWord, dish: SectionWord, line: SectionWord): StudioNode {
  const id = idOf(ctx);
  const white = "#FFFFFF";
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w(dish).replace("\n", " "),
    image_url: sigPhoto(ctx, path),
    height: 340,
    background: HERO_SHADE,
    scrim: { color: HERO_SHADE, from: 0.68, middle: 0.5, at: 32, to: 0.92 },
    align: "end",
    padding: sides(0, 18, 66, 20),
    action: restaurants,
    children: [
      { id: id(), type: "text", text: ctx.w(kicker), color: white, font: { size: 11, weight: 700, letter_spacing: 2, uppercase: true } },
      {
        id: id(),
        type: "row",
        cross: "end",
        gap: 12,
        margin: sides(8, 0, 0, 0),
        children: [
          { id: id(), type: "text", text: ctx.w(dish), width: "fill", color: white, font: { family: DISPLAY, size: 60, weight: 800, line_height: 0.9, letter_spacing: -2.6 } },
          {
            id: id(),
            type: "row",
            width: 52,
            height: 52,
            radius: 26,
            align: "center",
            cross: "center",
            background: white,
            shadow: "strong",
            action: restaurants,
            children: [{ id: id(), type: "icon", icon: "arrow_forward", icon_size: 24, color: "#1F140E" }],
          },
        ],
      },
      { id: id(), type: "text", text: ctx.w(line), color: white, opacity: 0.92, max_lines: 2, font: { size: 14, line_height: 1.3 }, margin: sides(8, 0, 0, 0) },
    ],
  };
}

/** Where it delivers, the search and the bell, over the hero's top. */
function addressRow(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const white = "#FFFFFF";
  return {
    id: id(),
    type: "row",
    name: ctx.w("fpDeliverTo"),
    width: "fill",
    gap: 8,
    cross: "center",
    self_align: "start",
    height: 66,
    padding: sides(18, 16, 4, 16),
    children: [
      {
        id: id(),
        type: "column",
        width: "fill",
        children: [
          { id: id(), type: "text", text: ctx.w("fpDeliverTo"), font: { size: 12 }, opacity: 0.86, color: white },
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
      glassDisc(ctx, "search", restaurants),
      glassDisc(ctx, "notifications", screen("notifications")),
    ],
  };
}

/** The order on its way: a frosted card, the minutes as a hero number over its four stages, the scooter in a brick disc. */
export function sofraAOrder(ctx: SectionContext, margin = sides(0, 14, 0, 14)): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "live_status",
    name: ctx.w("sofOnItsWay"),
    live_status: { source: "food_order", style: "hero", accent: A.accent, dark_accent: A.darkAccent },
    icon: "two_wheeler",
    visibility: "signed_in",
    width: "fill",
    radius: 24,
    background: A.surface,
    dark_background: A.darkSurface,
    color: A.ink,
    dark_color: A.darkInk,
    border_color: "#FFFFFF",
    dark_border_color: "#3A2B22",
    border_width: 1,
    shadow: "strong",
    surface: { glass: 22, tint: 0.88, soft: 3 },
    padding: sides(14, 14, 12, 16),
    margin,
  };
}

/** The hero slider of tonight's dishes with where it delivers over its top, the order on its way hanging over its foot. */
function sofraAHero(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "stack",
    name: ctx.w("sofTonight1"),
    cross: "end",
    children: [
      {
        id: id(),
        type: "column",
        height: 384,
        children: [
          {
            id: id(),
            type: "stack",
            height: 340,
            cross: "start",
            children: [
              {
                id: id(),
                type: "slider",
                height: 340,
                per_view: 1,
                autoplay: true,
                interval_ms: 5000,
                indicator: "progress",
                indicator_look: { at: "top", inset: 76, color: "#FFFFFF", count: "padded" },
                ken_burns: true,
                children: [
                  heroSlide(ctx, "/demo-photos/cover-grill.jpg", "sofTonight1", "sofDish1", "sofDish1Line"),
                  heroSlide(ctx, "/demo-photos/cover-pizza.jpg", "sofTonight2", "sofDish2", "sofDish2Line"),
                  heroSlide(ctx, "/demo-screens/sofra-mezze.jpg", "sofTonight3", "sofDish3", "sofDish3Line"),
                ],
              },
              addressRow(ctx),
            ],
          },
        ],
      },
      sofraAOrder(ctx),
    ],
  };
}

/** The restaurants open near you as square photo tiles, each its name and cuisine over a shade at its foot. */
function photoTiles(ctx: SectionContext, size = 140): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w("sofOpenNear"),
    source: "restaurants",
    layout: "carousel",
    gap: 10,
    padding: sides(0, 16, 0, 16),
    query: { limit: 6, category_id: null, featured: false, sort: "popular", ids: [] },
    card: {
      id: id(),
      type: "stack",
      width: size,
      height: size,
      radius: 20,
      shadow: "medium",
      cross: "end",
      children: [
        { id: id(), type: "image", bind: "image", width: size, height: size, fit: "cover", scrim: { color: "#0F0703", from: 0, middle: 0, at: 40, to: 0.82 } },
        {
          id: id(),
          type: "column",
          width: "fill",
          padding: sides(0, 10, 10, 12),
          children: [
            { id: id(), type: "text", bind: "title", max_lines: 1, color: "#FFFFFF", font: { size: 15, weight: 700 } },
            { id: id(), type: "text", bind: "subtitle", max_lines: 1, color: "#FFFFFF", opacity: 0.9, font: { size: 12 } },
          ],
        },
      ],
    },
  };
}

/** A dish from the menus as a line of a price list: its photo, name and restaurant, the price in mono, an add button. */
function priceLine(ctx: SectionContext, path: string, dish: SectionWord, place: SectionWord, price: SectionWord): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(dish),
    height: 48,
    gap: 10,
    cross: "center",
    action: restaurants,
    children: [
      sigImage(ctx, A, path, { width: 32, height: 32, radius: 16 }),
      inked(ctx, A, ctx.w(dish), { size: 15, weight: 700 }),
      inked(ctx, A, ctx.w(place), { size: 12 }, { muted: true, width: "fill", max_lines: 1 }),
      inked(ctx, A, ctx.w(price), { family: "JetBrains Mono", size: 13, weight: 700 }),
      { id: id(), type: "icon", icon: "add_circle", icon_size: 22, color: A.accent, dark_color: A.darkAccent },
    ],
  };
}

/** The approved home: tonight's dishes, the order on its way, the restaurants open near you, a few dishes from the menus. */
export function sofraAHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const display = { family: DISPLAY, size: 22, weight: 700 as const, letter_spacing: -0.4 };
  return {
    background: A.page,
    dark_background: A.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 24, 0),
      children: [
        sofraAHero(ctx),
        signatureHead(ctx, A, ctx.w("sofOpenNear"), display, { text: ctx.w("seeAll"), action: restaurants }),
        photoTiles(ctx),
        signatureHead(ctx, A, ctx.w("sofFromMenus"), display, { text: ctx.w("sofDeliveryFee"), muted: true }, sides(18, 16, 4, 16)),
        {
          id: id(),
          type: "column",
          name: ctx.w("sofFromMenus"),
          padding: sides(0, 16, 0, 16),
          children: [
            priceLine(ctx, "/demo-photos/margherita.jpg", "sofMargherita", "sofForno", "sofPrice140"),
            { id: id(), type: "divider", height: 1, background: A.line, dark_background: A.darkLine },
            priceLine(ctx, "/demo-photos/shish-tawook.jpg", "sofShish", "sofSahara", "sofPrice150"),
          ],
        },
      ],
    },
  };
}

/**
 * The look on the pages after the home: over the restaurants an editorial
 * banner of tonight's dish, over the orders the order on its way as the
 * home's frosted card.
 */
export function sofraAPage(screenName: string, ctx: SectionContext): StudioNode[] | null {
  const id = idOf(ctx);
  switch (screenName) {
    case "restaurants":
      return [
        {
          id: id(),
          type: "photo_hero",
          name: ctx.w("sofTonight1"),
          image_url: sigPhoto(ctx, "/demo-photos/cover-grill.jpg"),
          height: 168,
          radius: 24,
          background: HERO_SHADE,
          scrim: { color: HERO_SHADE, from: 0.3, middle: 0.35, at: 40, to: 0.9 },
          align: "end",
          padding: sides(16, 16, 16, 18),
          margin: sides(8, 16, 6, 16),
          action: restaurants,
          ken_burns: true,
          children: [
            { id: id(), type: "text", text: ctx.w("sofTonight1"), color: "#FFFFFF", font: { size: 11, weight: 700, letter_spacing: 2, uppercase: true } },
            { id: id(), type: "text", text: ctx.w("sofDish1").replace("\n", " "), color: "#FFFFFF", font: { family: DISPLAY, size: 40, weight: 800, line_height: 0.95, letter_spacing: -1.6 }, margin: sides(6, 0, 0, 0) },
            { id: id(), type: "text", text: ctx.w("sofDish1Line"), color: "#FFFFFF", opacity: 0.92, max_lines: 1, font: { size: 13 }, margin: sides(6, 0, 0, 0) },
          ],
        },
      ];
    case "food_orders":
      return [sofraAOrder(ctx, sides(10, 16, 6, 16))];
    default:
      return null;
  }
}

/** The kind's tabs with the board's icons: Home, Restaurants, Orders, Account. */
function sofraTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  return structuredClone([...tabs]).map((t) => {
    const s = t.target.type === "screen" ? t.target.screen : null;
    return s === "restaurants" ? { ...t, icon: "restaurant" } : s === "food_orders" ? { ...t, icon: "receipt_long" } : s === "account" ? { ...t, icon: "person" } : t;
  });
}

/** The welcome over tonight's grill; the account's top a cover in the look's colours, the orders first. */
const SOFRA_A_SCREENS = signatureScreens({
  style: "premium",
  photo: "/demo-photos/cover-grill.jpg",
  title: { en: "Tonight’s table is set.", ar: "سفرة الليلة جاهزة.", tr: "Bu akşamın sofrası hazır." },
  subtitle: {
    en: "Sign in to order from the restaurants near you.",
    ar: "سجّل الدخول لتطلب من المطاعم القريبة منك.",
    tr: "Yakınınızdaki restoranlardan sipariş vermek için giriş yapın.",
  },
  menu: "cover",
  first: ["food_orders", "notifications", "settings", "help", "privacy", "terms"],
});

export const SOFRA_A: SignatureDesign = {
  demo: "food",
  variant: "a",
  template: { id: "food_signature_a", icon: "menu_book", fits: { types: ["food"] } },
  home: sofraAHome,
  over: sofraAPage,
  tabs: sofraTabs,
  bar: signatureBar(A, { design: "glass", labels: "always", radius: 26, margin: 12 }),
  look: { header: signatureHeader(A, "large"), background: A.page, dark_background: A.darkPage },
  chrome: { header: "large", system: "photo" },
  project: {
    primary: A.fill,
    appearance: { secondary_color: A.darkAccent, font: "DM Sans" },
    screens: SOFRA_A_SCREENS,
  },
};

// ——— B · Bento table ———

/**
 * B · Bento table (board R2-Sofra-B): the evening's question large under a
 * greeting, the order on its way on its own dish's photo darkened, the
 * dish in a gold progress ring; the cuisines as a bento of photos with
 * frosted labels (the grill large, pizza and desserts beside it, the
 * Egyptian table across); a tilted band of the demo's dishes and prices
 * running; the restaurants near you as wide cards; a dark floating pill
 * with the open tab in gold.
 */
export const SOFRA_B_INK: SignatureInk = {
  page: "#F2EFEA",
  darkPage: "#0C0A09",
  surface: "#FFFFFF",
  darkSurface: "#181412",
  ink: "#15110E",
  darkInk: "#F4EEE8",
  muted: "#5F5750",
  darkMuted: "#B5ACA3",
  line: "#E3DED6",
  darkLine: "#2A2420",
  accent: "#875800",
  darkAccent: "#F4B63F",
  fill: "#F4B63F",
  darkFill: "#F4B63F",
  onFill: "#1C1307",
  darkOnFill: "#1C1307",
};
const B = SOFRA_B_INK;
const GOLD = "#F4B63F";
const OUTFIT = "Outfit";

/** The greeting with the person's name (the time of day's), the evening's question large, the search and the account. */
function sofraBTop(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("sofDinner"),
    gap: 8,
    cross: "center",
    padding: sides(20, 16, 0, 16),
    children: [
      {
        id: id(),
        type: "column",
        width: "fill",
        gap: 2,
        children: [
          { id: id(), type: "greeting", font: { size: 13, weight: 600 }, color: B.muted, dark_color: B.darkMuted },
          inked(ctx, B, ctx.w("sofDinner"), { family: OUTFIT, size: 26, weight: 700, line_height: 1.1, letter_spacing: -0.7 }),
        ],
      },
      surfaceDisc(ctx, B, "search", restaurants),
      surfaceDisc(ctx, B, "person", screen("account")),
    ],
  };
}

/** The order on its way on the dish's photo darkened, the dish in a gold ring filled as far as it is, the minutes large. */
export function sofraBOrder(ctx: SectionContext, margin = sides(14, 16, 0, 16)): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "live_status",
    name: ctx.w("sofOnItsWay"),
    live_status: { source: "food_order", style: "ring", accent: GOLD, dark_accent: GOLD },
    image_url: sigPhoto(ctx, "/demo-photos/kofta.jpg"),
    image_background_url: sigPhoto(ctx, "/demo-photos/kofta.jpg"),
    scrim: { color: "#120A06", from: 0.82, middle: 0.68, at: 50, to: 0.86, angle: 90 },
    background: "#2A1A10",
    visibility: "signed_in",
    width: "fill",
    radius: 26,
    color: "#FFFFFF",
    shadow: "strong",
    padding: sides(18, 18, 18, 16),
    margin,
  };
}

/** The cuisines as a bento of photos, each with its name on a frosted label: the grill large with its dish, pizza and desserts beside it, the Egyptian table across. */
function cuisineBento(ctx: SectionContext, margin = sides(16, 16, 0, 16)): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "bento",
    name: ctx.w("sofGrill"),
    columns: 3,
    gap: 8,
    radius: 22,
    margin,
    bento: { caption: "glass", row: 92 },
    entries: [
      sigEntry(ctx, { title: "sofGrill", text: "sofSahara", subtitle: "sofGrillChip" }, { size: "large", image_url: sigPhoto(ctx, "/demo-photos/cover-grill.jpg"), action: restaurants }),
      sigEntry(ctx, { title: "sofPizza" }, { size: "small", image_url: sigPhoto(ctx, "/demo-photos/cover-pizza.jpg"), action: restaurants }),
      sigEntry(ctx, { title: "sofDesserts" }, { size: "small", image_url: sigPhoto(ctx, "/demo-photos/chocolate-brownie.jpg"), action: restaurants }),
      sigEntry(ctx, { title: "sofEgyptian", text: "sofEgyptianLine" }, { size: "full", image_url: sigPhoto(ctx, "/demo-screens/sofra-mezze.jpg"), action: restaurants }),
    ],
  };
}

/** The demo's dishes and their prices on a tilted band (ink with gold words by day, gold by night), running. */
function priceBand(ctx: SectionContext): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "marquee",
    name: ctx.w("sofFromMenus"),
    text: ctx.w("sofTicker"),
    marquee: { speed: 36, direction: "start", tilt: -2, dot: true },
    gap: 18,
    height: 34,
    background: B.ink,
    dark_background: GOLD,
    color: GOLD,
    dark_color: "#1C1307",
    font: { family: OUTFIT, size: 13, weight: 700, letter_spacing: 1, uppercase: true },
    margin: sides(22, 0, 0, 0),
  };
}

/** The restaurants near you as wide cards: the cover at the start, the name, cuisine and rating. */
function wideCards(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w("sofNearYou"),
    source: "restaurants",
    layout: "carousel",
    gap: 10,
    padding: sides(0, 16, 0, 16),
    query: { limit: 6, category_id: null, featured: false, sort: "popular", ids: [] },
    card: {
      id: id(),
      type: "row",
      width: 262,
      height: 96,
      radius: 22,
      background: B.surface,
      dark_background: B.darkSurface,
      border_color: B.line,
      dark_border_color: B.darkLine,
      border_width: 1,
      shadow: "medium",
      children: [
        { id: id(), type: "image", bind: "image", width: 96, height: 96, fit: "cover" },
        {
          id: id(),
          type: "column",
          width: "fill",
          gap: 2,
          align: "center",
          padding: sides(12, 14, 12, 14),
          children: [
            { id: id(), type: "text", bind: "title", max_lines: 1, font: { size: 16, weight: 800 }, color: B.ink, dark_color: B.darkInk },
            { id: id(), type: "text", bind: "subtitle", max_lines: 1, font: { size: 12 }, color: B.muted, dark_color: B.darkMuted },
            { id: id(), type: "text", bind: "badge", font: { size: 12, weight: 700 }, color: B.accent, dark_color: B.darkAccent, margin: sides(6, 0, 0, 0) },
          ],
        },
      ],
    },
  };
}

/** The approved home: the evening's question, the order on its way, the cuisines' bento, the dishes' band, the restaurants near you. */
export function sofraBHome(ctx: SectionContext): StudioPage {
  return {
    background: B.page,
    dark_background: B.darkPage,
    body: {
      id: idOf(ctx)(),
      type: "column",
      padding: sides(0, 0, 24, 0),
      children: [
        sofraBTop(ctx),
        sofraBOrder(ctx),
        cuisineBento(ctx),
        priceBand(ctx),
        signatureHead(ctx, B, ctx.w("sofNearYou"), { family: OUTFIT, size: 20, weight: 700, letter_spacing: -0.4 }, { text: ctx.w("seeAll"), action: restaurants }),
        wideCards(ctx),
      ],
    },
  };
}

/** The look on the pages after the home: the cuisines' bento over the restaurants, the order in its ring over the orders. */
export function sofraBPage(screenName: string, ctx: SectionContext): StudioNode[] | null {
  switch (screenName) {
    case "restaurants":
      return [cuisineBento(ctx, sides(8, 16, 8, 16))];
    case "food_orders":
      return [sofraBOrder(ctx, sides(10, 16, 6, 16))];
    default:
      return null;
  }
}

/** The welcome over the table of mezze; the account's top a dark card in gold. */
const SOFRA_B_SCREENS = signatureScreens({
  style: "photo",
  photo: "/demo-screens/sofra-mezze.jpg",
  title: { en: "What’s for dinner?", ar: "ماذا على العشاء؟", tr: "Akşam yemeğinde ne var?" },
  subtitle: {
    en: "Sign in to order from the restaurants near you.",
    ar: "سجّل الدخول لتطلب من المطاعم القريبة منك.",
    tr: "Yakınınızdaki restoranlardan sipariş vermek için giriş yapın.",
  },
  menu: "night",
  accent: GOLD,
  first: ["food_orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** A dark floating pill by day and by night, the open tab gold with its name. */
const SOFRA_B_BAR = signatureBar(B, { design: "float", background: "#15110E", dark_background: "#28221E", active: GOLD, dark_active: GOLD, inactive: "#D9D2CA", dark_inactive: "#C9C0B7", labels: "active", radius: 30, margin: 14 });

export const SOFRA_B: SignatureDesign = {
  demo: "food",
  variant: "b",
  template: { id: "food_signature_b", icon: "grid_view", fits: { types: ["food"] } },
  home: sofraBHome,
  over: sofraBPage,
  tabs: sofraTabs,
  bar: SOFRA_B_BAR,
  look: { header: signatureHeader(B, "glass"), background: B.page, dark_background: B.darkPage },
  chrome: { header: "glass", system: "photo" },
  project: {
    primary: "#875800",
    appearance: { secondary_color: GOLD, font: "Manrope" },
    screens: SOFRA_B_SCREENS,
  },
};
