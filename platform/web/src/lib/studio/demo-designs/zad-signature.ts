import type { Action, LayoutTab, StudioNode, StudioPage } from "../../pages/types";
import { marketPhotoTabs, marketShopsPage } from "../photo-market";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { inked, sides, sigImage, sigPhoto, sigTexts, signatureBar, signatureHead, signatureHeader, signatureScreens, type SignatureDesign, type SignatureInk } from "./signature";

/**
 * 130.3–130.4 Zad's Signature looks (the owner approved both on 13
 * November 2026, boards R2-Zad-A and R2-Zad-B), each a whole marketplace
 * project: its five tabs (Home, Shops, Cart, Orders, Account), Shops a
 * page of its own, every page after the home in the look.
 *
 * A · Market arches: where it delivers with the soonest time and the
 * search (the marketplace's own, `market` address), this week's offers as
 * a slider of deep green posters, each its number huge in amber beside a
 * photo cut as an arch, its code dashed under it; the departments as arch
 * photos (rounded only at the top: any image's own corners); the places
 * near you as a list (the marketplace's own); a frosted bar.
 *
 * Every part an ordinary Studio element; the offers are the demo's own
 * (lib/demo/marketplace.ts: FRESH15, ZAD20, Nile Pizza Co.'s free
 * delivery), the photos Yallapp's (public/demo-photos).
 */

const search: Action = screen("search");

// ——— A · Market arches ———

export const ZAD_A_INK: SignatureInk = {
  page: "#F5F2EA",
  darkPage: "#09130E",
  surface: "#FFFFFF",
  darkSurface: "#12201A",
  ink: "#12211A",
  darkInk: "#EAF3EE",
  muted: "#56645C",
  darkMuted: "#A3B5AB",
  line: "#E3DED3",
  darkLine: "#213129",
  accent: "#1B644C",
  darkAccent: "#8FDDB9",
  fill: "#1B644C",
  darkFill: "#8FDDB9",
  onFill: "#FFFFFF",
  darkOnFill: "#09130E",
};
const A = ZAD_A_INK;
const AMBER = "#F2A93B";
const TINT = { background: "#DDEFE6", dark_background: "#183A2C" } as const;
const LEXEND = "Lexend";

/** One offer as a deep green poster: its kicker, its number huge in amber, what it is, its code; a photo cut as an arch at its end with a round arrow. */
function poster(ctx: SectionContext, path: string, kicker: SectionWord, big: SectionWord, line: SectionWord, code: readonly [SectionWord, SectionWord] | null): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(line),
    height: 220,
    radius: 28,
    gap: 10,
    background: "#134A36",
    dark_background: "#0F3B2B",
    surface: { soft: 3 },
    padding: sides(14, 14, 14, 18),
    action: search,
    children: [
      {
        id: id(),
        type: "column",
        width: "fill",
        align: "end",
        padding: sides(0, 0, 4, 0),
        children: [
          { id: id(), type: "text", text: ctx.w(kicker), color: "#FFD27A", font: { size: 11, weight: 800, letter_spacing: 1.8, uppercase: true } },
          { id: id(), type: "text", text: ctx.w(big), color: AMBER, max_lines: 1, font: { family: LEXEND, size: 72, weight: 800, line_height: 0.95, letter_spacing: -4 }, margin: sides(6, 0, 0, 0) },
          { id: id(), type: "text", text: ctx.w(line), color: "#FFFFFF", max_lines: 2, font: { size: 15, weight: 700, line_height: 1.25 }, margin: sides(4, 0, 0, 0) },
          ...(code
            ? [
                {
                  id: id(),
                  type: "row" as const,
                  gap: 6,
                  cross: "center" as const,
                  height: 34,
                  radius: 10,
                  border_color: AMBER,
                  border_width: 1.5,
                  padding: sides(0, 10, 0, 10),
                  margin: sides(12, 0, 0, 0),
                  children: [
                    { id: id(), type: "text" as const, text: ctx.w(code[0]), color: "#FFFFFF", font: { family: "JetBrains Mono", size: 12, weight: 700 as const } },
                    { id: id(), type: "text" as const, text: ctx.w(code[1]), color: "#D7E6DE", font: { size: 10.5 }, width: "fill", max_lines: 1 },
                  ],
                },
              ]
            : []),
        ],
      },
      {
        id: id(),
        type: "stack",
        width: 124,
        height: 192,
        children: [
          sigImage(ctx, A, path, { width: 124, height: 192, corners: { top_start: 62, top_end: 62, bottom_end: 20, bottom_start: 20 }, ken_burns: true }),
          {
            id: id(),
            type: "row",
            width: 44,
            height: 44,
            radius: 22,
            align: "center",
            cross: "center",
            background: "#FFFFFF",
            shadow: "strong",
            place: { x: 30, y: 84 },
            action: search,
            children: [{ id: id(), type: "icon", icon: "arrow_forward", icon_size: 22, color: "#134A36" }],
          },
        ],
      },
    ],
  };
}

/** This week's offers, a line per poster filling at its top. */
function offerPosters(ctx: SectionContext): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "slider",
    name: ctx.w("zadOfferKicker"),
    radius: 28,
    height: 220,
    per_view: 1,
    autoplay: true,
    interval_ms: 5000,
    indicator: "progress",
    indicator_look: { at: "top", inset: 14, color: "#FFFFFF" },
    margin: sides(12, 16, 0, 16),
    children: [
      poster(ctx, "/demo-photos/fruit.jpg", "zadOfferKicker", "zadOffer1Big", "zadOffer1Line", ["zadOffer1Code", "zadOffer1Min"]),
      poster(ctx, "/demo-photos/bakery.jpg", "zadOffer2Kicker", "zadOffer2Big", "zadOffer2Line", ["zadOffer2Code", "zadOffer2Min"]),
      poster(ctx, "/demo-photos/cover-pizza.jpg", "zadOffer3Kicker", "zadOffer3Big", "zadOffer3Line", null),
    ],
  };
}

/** The departments as arch photos with their names under them, the pantry a tinted arch of words. */
function archTiles(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const arch = { top_start: 40, top_end: 40, bottom_end: 14, bottom_start: 14 };
  const tile = (path: string | null, name: SectionWord, inside?: SectionWord): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(name),
    width: 80,
    gap: 7,
    cross: "center",
    action: search,
    children: [
      path
        ? sigImage(ctx, A, path, { width: 80, height: 104, corners: arch, shadow: "medium" })
        : {
            id: id(),
            type: "column",
            width: 80,
            height: 104,
            corners: arch,
            align: "end",
            padding: sides(0, 10, 12, 10),
            ...TINT,
            children: [inked(ctx, A, ctx.w(inside!), { family: LEXEND, size: 12, weight: 700, line_height: 1.2 }, { accent: true })],
          },
      inked(ctx, A, ctx.w(name), { size: 13, weight: 800, line_height: 1.15 }, { text_align: "center", max_lines: 2 }),
    ],
  });
  return {
    id: id(),
    type: "row",
    name: ctx.w("zadDepartments"),
    scroll: true,
    gap: 10,
    cross: "start",
    padding: sides(0, 16, 0, 16),
    children: [
      tile("/demo-photos/vegetables.jpg", "zadFruitVeg"),
      tile("/demo-photos/dairy.jpg", "zadDairy"),
      tile("/demo-photos/bakery.jpg", "zadBakery"),
      tile(null, "zadPantry", "zadPantryLine"),
    ],
  };
}

/** The approved home: the address and the search, the offers, the departments, the places near you. */
export function zadAHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const display = { family: LEXEND, size: 19, weight: 700 as const, letter_spacing: -0.4 };
  return {
    background: A.page,
    dark_background: A.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 24, 0),
      children: [
        // Where it delivers and the soonest time, the search under it: the marketplace's own, on the page's paper.
        { id: id(), type: "market", name: ctx.w("mpSearch"), market: { section: "address", style: "bar" }, text: ctx.w("mpSearch"), color: A.page, dark_color: A.darkPage },
        offerPosters(ctx),
        signatureHead(ctx, A, ctx.w("zadDepartments"), display, { text: ctx.w("seeAll"), action: search }, sides(18, 16, 10, 16)),
        archTiles(ctx),
        signatureHead(ctx, A, ctx.w("mpNear"), display, { text: ctx.w("seeAll"), action: search }, sides(18, 16, 4, 16)),
        { id: id(), type: "market", name: ctx.w("mpNear"), market: { section: "vendors", style: "list", sort: "nearest", limit: 3 } },
      ],
    },
  };
}

/** The person's marketplace order on its way: its minutes as a hero number over its four stages, a bag in a green disc. */
export function zadAOrder(ctx: SectionContext, margin = sides(10, 16, 6, 16)): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "live_status",
    name: ctx.w("sofOnItsWay"),
    live_status: { source: "market_order", style: "hero", accent: A.accent, dark_accent: A.darkAccent },
    icon: "shopping_bag",
    visibility: "signed_in",
    width: "fill",
    radius: 24,
    background: A.surface,
    dark_background: A.darkSurface,
    color: A.ink,
    dark_color: A.darkInk,
    border_color: A.line,
    dark_border_color: A.darkLine,
    border_width: 1,
    shadow: "medium",
    padding: sides(14, 14, 12, 16),
    margin,
  };
}

/** Over the orders, the order on its way; over the search, this week's offers. */
export function zadAPage(screenName: string, ctx: SectionContext): StudioNode[] | null {
  switch (screenName) {
    case "food_orders":
    case "orders":
      return [zadAOrder(ctx)];
    case "search":
      return [{ ...offerPosters(ctx), margin: sides(8, 16, 8, 16) }];
    default:
      return null;
  }
}

/** The approved bar's five tabs, the board's icons. */
function zadTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  return marketPhotoTabs(tabs).map((t) => (t.id === "shops" ? { ...t, icon: "storefront" } : t));
}

/** Shops, a page of its own: the kinds, every place, the club. */
function zadShops(ctx: SectionContext) {
  return [{ slug: "shops", title: "tabShops" as SectionWord, studio: marketShopsPage(ctx) }];
}

const ZAD_A_SCREENS = signatureScreens({
  style: "photo",
  photo: "/demo-photos/fruit.jpg",
  title: { en: "Your neighbourhood, in one app", ar: "حيّك كله في تطبيق واحد", tr: "Mahalleniz tek bir uygulamada" },
  subtitle: {
    en: "Fresh food and groceries from the places near you, at your door.",
    ar: "طعام طازج وبقالة من الأماكن القريبة منك حتى باب بيتك.",
    tr: "Yakınınızdaki yerlerden taze yemek ve market, kapınıza kadar.",
  },
  menu: "cover",
  first: ["notifications", "settings", "help", "privacy", "terms"],
});

const ZAD_A_BAR = signatureBar(A, { design: "glass", labels: "always", radius: 26, margin: 12 });

export const ZAD_A: SignatureDesign = {
  demo: "marketplace",
  variant: "a",
  name: "sigZadA",
  template: { id: "marketplace_signature_a", icon: "storefront", fits: { types: ["food"], verticals: ["marketplace"] } },
  home: zadAHome,
  over: zadAPage,
  tabs: zadTabs,
  pages: zadShops,
  bar: ZAD_A_BAR,
  look: { header: signatureHeader(A, "search"), background: A.page, dark_background: A.darkPage },
  chrome: { header: "search", screens: "photo" },
  project: {
    primary: A.fill,
    tab_bar: ZAD_A_BAR,
    appearance: { secondary_color: AMBER, font: "Plus Jakarta Sans" },
    tabs: (tabs) => zadTabs(tabs),
    screens: ZAD_A_SCREENS,
  },
};

// ——— B · Night aisle ———

/**
 * B · Night aisle (board R2-Zad-B): the market's aisle full-bleed under a
 * deep shade, the order on its way as a slim frosted pill with a Track
 * button over its top, "The week's shop," and the minutes to the door set
 * huge in amber at its foot; a frosted card hanging over the photo's foot
 * with the search and the departments as story rings; the places near you
 * as a deck of photo cards ("1 / 3", the marketplace's own); a white
 * floating pill by day, a dark one by night with the open tab in amber.
 */
export const ZAD_B_INK: SignatureInk = {
  page: "#EEF1EC",
  darkPage: "#070D0A",
  surface: "#FFFFFF",
  darkSurface: "#101E17",
  ink: "#10201A",
  darkInk: "#EAF3EE",
  muted: "#526159",
  darkMuted: "#A3B5AB",
  line: "#D8DDD4",
  darkLine: "#1C2A23",
  accent: "#1B644C",
  darkAccent: "#8FDDB9",
  fill: "#134A36",
  darkFill: "#F2A93B",
  onFill: "#FFFFFF",
  darkOnFill: "#1B2A20",
};
const Z = ZAD_B_INK;
const READEX = "Readex Pro";

/** The marketplace order on its way as a slim frosted pill: a live dot, what is on its way and who brings it, a Track button. */
export function zadBOrder(ctx: SectionContext, margin = sides(0, 0, 0, 0)): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "live_status",
    name: ctx.w("sofOnItsWay"),
    live_status: { source: "market_order", style: "pill", accent: AMBER, dark_accent: AMBER },
    icon: "two_wheeler",
    visibility: "signed_in",
    width: "fill",
    radius: 28,
    background: "#0B1A13",
    color: "#FFFFFF",
    surface: { glass: 16, tint: 0.55 },
    padding: sides(8, 8, 8, 12),
    margin,
  };
}

/** A department as a story ring: its photo, its name under it, opening the search. */
function department(ctx: SectionContext, path: string, word: SectionWord, lit: boolean) {
  return { image_url: sigPhoto(ctx, path), ...sigTexts(ctx, { heading: word }), subheading: null, action: search, ring: lit ? ("highlight" as const) : ("plain" as const), ...(lit ? { ring_color: AMBER } : {}) };
}

/** The frosted card over the photo's foot: the search with the barcode, the departments as story rings, every department as a dashed tile. */
function searchCard(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("mpSearch"),
    width: "fill",
    radius: 28,
    background: Z.surface,
    dark_background: Z.darkSurface,
    border_color: "#FFFFFF",
    dark_border_color: "#22382D",
    border_width: 1,
    surface: { glass: 22, tint: 0.84, soft: 3 },
    padding: sides(12, 12, 6, 12),
    margin: sides(0, 12, 0, 12),
    children: [
      {
        id: id(),
        type: "row",
        name: ctx.w("mpSearch"),
        height: 50,
        radius: 16,
        gap: 10,
        cross: "center",
        background: "#E9ECE8",
        dark_background: "#1A2A22",
        padding: sides(0, 14, 0, 14),
        action: search,
        children: [
          { id: id(), type: "icon", icon: "search", icon_size: 22, color: Z.muted, dark_color: Z.darkMuted },
          inked(ctx, Z, ctx.w("mpSearch"), { size: 15 }, { muted: true, width: "fill", max_lines: 1 }),
          { id: id(), type: "icon", icon: "barcode_scanner", icon_size: 22, color: Z.accent, dark_color: Z.darkAccent },
        ],
      },
      {
        id: id(),
        type: "stories",
        name: ctx.w("zadDepartments"),
        interval_ms: 5000,
        stories: { size: 58 },
        color: Z.ink,
        dark_color: Z.darkInk,
        padding: sides(12, 0, 6, 0),
        slides: [
          department(ctx, "/demo-photos/fruit.jpg", "zadFruitVeg", true),
          department(ctx, "/demo-photos/bakery.jpg", "zadBakery", true),
          department(ctx, "/demo-photos/dairy.jpg", "zadDairy", false),
          department(ctx, "/demo-photos/vegetables.jpg", "zadVegetables", false),
          { image_url: null, ...sigTexts(ctx, { heading: "zadAllDepartments" }), subheading: null, action: search, ring: "dashed" as const, icon: "grid_view" },
        ],
      },
    ],
  };
}

/** The aisle under its shade: the order on its way at its top, the week's shop and the minutes at its foot, the search card hanging over it. */
function zadBHero(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const white = "#FFFFFF";
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w("zadBHeadline"),
    image_url: sigPhoto(ctx, "/stories/multi-vendor/zad-market-aisle.jpg"),
    height: 430,
    background: "#06160F",
    scrim: { color: "#06160F", from: 0.62, middle: 0.4, at: 45, to: 0.92 },
    align: "between",
    padding: sides(20, 16, 86, 16),
    overlap: 64,
    ken_burns: true,
    children: [
      zadBOrder(ctx),
      {
        id: id(),
        type: "column",
        padding: sides(0, 4, 0, 4),
        children: [
          { id: id(), type: "text", text: ctx.w("zadBKicker"), color: white, font: { size: 11, weight: 700, letter_spacing: 2.4, uppercase: true } },
          { id: id(), type: "text", text: ctx.w("zadBHeadline"), color: white, font: { family: READEX, size: 38, weight: 700, line_height: 1.05, letter_spacing: -1 }, margin: sides(10, 0, 0, 0) },
          {
            id: id(),
            type: "row",
            gap: 10,
            cross: "end",
            children: [
              { id: id(), type: "text", text: ctx.w("zadBMinutes"), color: AMBER, font: { family: READEX, size: 84, weight: 700, line_height: 0.95, letter_spacing: -4 } },
              {
                id: id(),
                type: "column",
                cross: "start",
                padding: sides(0, 0, 10, 0),
                children: [
                  { id: id(), type: "text", text: ctx.w("zadBMin"), color: white, font: { family: READEX, size: 28, weight: 700, line_height: 1 } },
                  { id: id(), type: "text", text: ctx.w("zadBTo"), color: white, opacity: 0.9, max_lines: 1, font: { size: 14 } },
                ],
              },
            ],
          },
        ],
      },
      searchCard(ctx),
    ],
  };
}

/** The approved home: the aisle with the order and the minutes, the search and the departments, the places as a deck. */
export function zadBHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    background: Z.page,
    dark_background: Z.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 24, 0),
      children: [
        zadBHero(ctx),
        { id: id(), type: "market", name: ctx.w("mpNear"), title: ctx.w("mpNear"), market: { section: "vendors", style: "deck", sort: "nearest", limit: 3 }, margin: sides(22, 0, 0, 0) },
      ],
    },
  };
}

/** Over the orders, the order on its way as the home's pill on the night green; over the search, the departments' card. */
export function zadBPage(screenName: string, ctx: SectionContext): StudioNode[] | null {
  switch (screenName) {
    case "food_orders":
    case "orders":
      return [zadBOrder(ctx, sides(10, 16, 6, 16))];
    case "search":
      return [{ ...searchCard(ctx), margin: sides(8, 16, 8, 16) }];
    default:
      return null;
  }
}

const ZAD_B_SCREENS = signatureScreens({
  style: "photo",
  photo: "/stories/multi-vendor/zad-market-aisle.jpg",
  title: { en: "The week’s shop, at your door", ar: "تسوّق الأسبوع حتى بابك", tr: "Haftanın alışverişi kapınızda" },
  subtitle: {
    en: "Fresh food and groceries from the places near you, at your door.",
    ar: "طعام طازج وبقالة من الأماكن القريبة منك حتى باب بيتك.",
    tr: "Yakınınızdaki yerlerden taze yemek ve market, kapınıza kadar.",
  },
  menu: "night",
  accent: AMBER,
  first: ["notifications", "settings", "help", "privacy", "terms"],
});

const ZAD_B_BAR = signatureBar(Z, { design: "float", background: "#FFFFFF", dark_background: "#101E17", inactive: "#3F4D46", dark_inactive: "#B9C8C0", labels: "active", radius: 30, margin: 14 });

export const ZAD_B: SignatureDesign = {
  demo: "marketplace",
  variant: "b",
  name: "sigZadB",
  template: { id: "marketplace_signature_b", icon: "nightlife", fits: { types: ["food"], verticals: ["marketplace"] } },
  home: zadBHome,
  over: zadBPage,
  tabs: zadTabs,
  pages: zadShops,
  bar: ZAD_B_BAR,
  look: { header: signatureHeader(Z, "photo"), background: Z.page, dark_background: Z.darkPage },
  chrome: { header: "photo", screens: "photo" },
  project: {
    primary: Z.fill,
    tab_bar: ZAD_B_BAR,
    appearance: { secondary_color: AMBER, font: "Manrope" },
    tabs: (tabs) => zadTabs(tabs),
    screens: ZAD_B_SCREENS,
  },
};
