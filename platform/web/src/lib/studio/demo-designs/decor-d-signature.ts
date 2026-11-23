import type { Action, LayoutTab, StudioEntry, StudioFont, StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { sides, sigEntry, sigTexts, signatureBar, type SignatureInk } from "./food-signature-parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { kitPhoto, say, shop, type KitLook } from "./shop-kit-parts";

/**
 * 225 Sakan's look D, MAZAJ (مزاج), the moodboard: the decor house as a
 * board of pinned photos. Terracotta on cream by day, cocoa by night in a
 * warm coral; Marhey; tilted polaroids, tape and round shapes.
 *
 * - The greeting header (the day's greeting over the shop's name).
 * - A collage hero of overlapping polaroids, each taped and tilted, a
 *   round stamp over them.
 * - Shop by colour: colour circles (terracotta, sage, sand, blush, indigo,
 *   olive), each opening the shop.
 * - The seasons' palette cards: a stripe of their colours over a photo, the
 *   season named like the shop's category so it opens it.
 * - The pieces as tilted polaroids (a white frame, the name handwritten
 *   under the photo), a "make your board" card, and the season's pieces.
 * - The drop bar: the open tab hangs as a coral drop.
 *
 * The owner's words are in [brackets].
 */

export const MAZAJ_INK: SignatureInk = {
  page: "#F7EEE2",
  darkPage: "#1C130F",
  surface: "#FFFBF5",
  darkSurface: "#2A1E18",
  ink: "#3A2418",
  darkInk: "#F7E9DC",
  muted: "#765A4A",
  darkMuted: "#CDB3A1",
  line: "#EBDCCB",
  darkLine: "#3A2A22",
  accent: "#B4532F",
  darkAccent: "#F0976F",
  fill: "#C4623F",
  darkFill: "#E98A63",
  onFill: "#FFFFFF",
  darkOnFill: "#2A140A",
};

const L: KitLook = { k: MAZAJ_INK, tint: { day: "#F0E0CF", night: "#33251E" }, family: "Marhey", look: "d", dir: "decor-photos", radius: 26, heavy: 700 };
const K = MAZAJ_INK;
/** A polaroid's paper: the same by day and by night (a photo print). */
const PAPER = "#FFFDF8";
const PRINT_INK = "#3A2418";
const TAPE = "#E98A63";
const MENU_PAGE = "menu";

const font = (size: number, weight: StudioFont["weight"] = 400, extra: Partial<StudioFont> = {}): StudioFont => ({ family: L.family, size, weight, ...extra });

function head(ctx: SectionContext, title: SectionWord, link?: { word: SectionWord; action: Action }): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    gap: 12,
    cross: "end",
    padding: sides(28, 16, 12, 16),
    children: [say(ctx, L, title, font(20, 700), { width: "fill", max_lines: 2 }), ...(link ? [{ ...say(ctx, L, link.word, font(13, 500), { accent: true, max_lines: 1 }), name: ctx.w(link.word), action: link.action }] : [])],
  };
}

/** A polaroid: the photo on white paper with a deep foot, its caption handwritten there, a strip of tape on top; tilted. */
function polaroid(ctx: SectionContext, o: { photo: string; caption: SectionWord; width: number; height: number; tilt: number; x: number; y: number; tape?: boolean }): StudioNode {
  const id = idOf(ctx);
  const url = kitPhoto(ctx, L, o.photo);
  return {
    id: id(),
    type: "column",
    name: ctx.w(o.caption),
    width: o.width + 18,
    gap: 6,
    cross: "center",
    padding: sides(9, 9, 10, 9),
    background: PAPER,
    dark_background: PAPER,
    shadow: "medium",
    rotation: o.tilt,
    place: { x: o.x, y: o.y },
    action: shop,
    children: [
      url ? { id: id(), type: "image", image_url: url, width: o.width, height: o.height, fit: "cover" } : { id: id(), type: "row", width: o.width, height: o.height, background: L.tint.day, children: [] },
      { id: id(), type: "text", text: ctx.w(o.caption), max_lines: 1, text_align: "center", color: PRINT_INK, dark_color: PRINT_INK, font: font(13, 500) },
    ],
  };
}

/** A strip of tape over a polaroid's top. */
function tape(ctx: SectionContext, x: number, y: number, tilt: number): StudioNode {
  return { id: idOf(ctx)(), type: "row", width: 70, height: 22, background: TAPE, dark_background: TAPE, opacity: 0.6, rotation: tilt, place: { x, y }, children: [] };
}

/** The collage hero: three polaroids overlapping, taped, and the week's stamp over them. */
function collage(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "stack",
    name: ctx.w("mjBoard"),
    height: 400,
    children: [
      polaroid(ctx, { photo: "hero-autumn", caption: "mjPolaroid1", width: 176, height: 186, tilt: 5, x: 46, y: 5 }),
      polaroid(ctx, { photo: "pink-vase", caption: "mjPolaroid2", width: 146, height: 166, tilt: -6, x: 5, y: 17 }),
      polaroid(ctx, { photo: "brass-lantern", caption: "mjPolaroid3", width: 128, height: 118, tilt: -2, x: 32, y: 52 }),
      tape(ctx, 61, 2, -4),
      tape(ctx, 14, 14, 6),
      {
        id: id(),
        type: "row",
        name: ctx.w("mjStamp"),
        radius: 26,
        padding: sides(10, 18, 10, 18),
        background: K.fill,
        dark_background: K.darkFill,
        shadow: "medium",
        rotation: -3,
        place: { x: 54, y: 82 },
        action: shop,
        children: [say(ctx, L, "mjStamp", font(14.5, 700), { color: K.onFill, dark_color: K.darkOnFill, max_lines: 1 })],
      },
    ],
  };
}

const COLOURS = [
  ["mjTerracotta", "#C4623F"],
  ["mjSage", "#A3B18A"],
  ["mjSand", "#E6D3B6"],
  ["mjBlush", "#E8B4A6"],
  ["mjIndigo", "#3D4A5C"],
  ["mjOlive", "#7D7A45"],
] as const satisfies readonly [SectionWord, string][];

/** Shop by colour: a circle of each colour with a paper ring, its name under it, opening the shop. */
function byColour(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("mjByColour"),
    gap: 14,
    scroll: true,
    padding: sides(0, 16, 0, 16),
    children: COLOURS.map(([word, colour]) => ({
      id: id(),
      type: "column" as const,
      name: ctx.w(word),
      width: 64,
      gap: 6,
      cross: "center" as const,
      action: shop,
      children: [
        { id: id(), type: "row" as const, width: 60, height: 60, radius: 30, background: colour, dark_background: colour, border_color: K.surface, dark_border_color: K.darkSurface, border_width: 3, shadow: "light" as const, children: [] },
        say(ctx, L, word, font(11.5, 500), { max_lines: 1, text_align: "center" }),
      ],
    })),
  };
}

const PALETTES = [
  { word: "mjSeasonAutumn", line: "mjSeasonAutumnLine", photo: "hero-autumn", colours: ["#C4623F", "#D99A6C", "#EBCFA8", "#6B4A3A"] },
  { word: "dcSeasonRamadan", line: "mjSeasonRamadanLine", photo: "brass-lantern", colours: ["#2F3B57", "#C9A45C", "#F2E6CF", "#7C4B3A"] },
  { word: "mjSeasonSpring", line: "mjSeasonSpringLine", photo: "daisy-vase", colours: ["#A3B18A", "#F3E3C3", "#E8B4A6", "#FFFFFF"] },
] as const satisfies readonly { word: SectionWord; line: SectionWord; photo: string; colours: readonly string[] }[];

/** The seasons' palette cards: a stripe of the season's colours, its photo, its name (named like the season's category) and a line. */
function palettes(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("mjPalettes"),
    gap: 12,
    scroll: true,
    padding: sides(0, 16, 4, 16),
    children: PALETTES.map((p) => {
      const url = kitPhoto(ctx, L, p.photo);
      return {
        id: id(),
        type: "column" as const,
        name: ctx.w(p.word),
        width: 226,
        gap: 10,
        radius: 26,
        padding: sides(10, 10, 12, 10),
        background: K.surface,
        dark_background: K.darkSurface,
        action: shop,
        children: [
          { id: id(), type: "row" as const, height: 62, radius: 18, gap: 0, children: p.colours.map((c, i) => ({ id: id(), type: "row" as const, width: "fill" as const, background: c, dark_background: c, ...(i === 0 ? { corners: { top_start: 18, bottom_start: 18 } } : i === p.colours.length - 1 ? { corners: { top_end: 18, bottom_end: 18 } } : {}), children: [] })) },
          {
            id: id(),
            type: "row" as const,
            gap: 10,
            cross: "center" as const,
            children: [
              url ? { id: id(), type: "image" as const, image_url: url, width: 52, height: 52, radius: 14, fit: "cover" as const } : { id: id(), type: "row" as const, width: 52, height: 52, radius: 14, background: L.tint.day, children: [] },
              { id: id(), type: "column" as const, width: "fill" as const, gap: 1, children: [say(ctx, L, p.word, font(15, 700), { max_lines: 1 }), say(ctx, L, p.line, font(11.5), { muted: true, max_lines: 1 })] },
            ],
          },
        ],
      };
    }),
  };
}

/** The pieces as polaroids: the photo on white paper, the name and price handwritten under it, every other one tilted the other way. */
function polaroidCards(ctx: SectionContext, word: SectionWord, sort: "newest" | "popular", featured: boolean, tilt: number): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w(word),
    source: "products",
    layout: "carousel",
    gap: 14,
    padding: sides(8, 16, 12, 16),
    query: { limit: 8, category_id: null, featured, sort, ids: [] },
    card: {
      id: id(),
      type: "column",
      width: 156,
      gap: 3,
      padding: sides(8, 8, 10, 8),
      background: PAPER,
      dark_background: PAPER,
      shadow: "light",
      rotation: tilt,
      children: [
        {
          id: id(),
          type: "stack",
          width: 140,
          height: 150,
          children: [
            { id: id(), type: "image", bind: "image", width: 140, height: 150, fit: "cover", background: L.tint.day, dark_background: L.tint.day },
            { id: id(), type: "text", bind: "sale", font: font(11, 700), color: "#FFFFFF", background: K.fill, dark_color: "#FFFFFF", dark_background: K.fill, radius: 10, padding: sides(2, 7, 2, 7), place: { x: 5, y: 5 } },
          ],
        },
        { id: id(), type: "text", bind: "title", max_lines: 1, color: PRINT_INK, dark_color: PRINT_INK, font: font(13, 500), margin: sides(6, 0, 0, 0) },
        { id: id(), type: "row", gap: 6, cross: "center", children: [{ id: id(), type: "text", bind: "price", max_lines: 1, color: K.fill, dark_color: K.fill, font: font(13, 700) }, { id: id(), type: "text", bind: "was_price", max_lines: 1, color: "#8C7364", dark_color: "#8C7364", font: font(11) }] },
      ],
    },
  };
}

/** Make your board: the coral card, its words, a round palette button; opens the shop. */
function makeBoard(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("mjMakeTitle"),
    gap: 14,
    cross: "center",
    radius: 30,
    padding: sides(18, 18, 18, 18),
    margin: sides(20, 16, 0, 16),
    background: K.fill,
    dark_background: K.darkFill,
    action: shop,
    children: [
      { id: id(), type: "column", width: "fill", gap: 3, children: [say(ctx, L, "mjMakeTitle", font(18, 700), { color: K.onFill, dark_color: K.darkOnFill, max_lines: 2 }), say(ctx, L, "mjMakeLine", font(12.5), { color: K.onFill, dark_color: K.darkOnFill, opacity: 0.9, max_lines: 2 })] },
      { id: id(), type: "row", width: 48, height: 48, radius: 24, align: "center", cross: "center", self_align: "center", background: K.onFill, dark_background: K.darkOnFill, children: [{ id: id(), type: "icon", icon: "palette", icon_size: 24, color: K.fill, dark_color: K.darkFill }] },
    ],
  };
}

function home(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "dcWordmark" });
  return {
    header: { type: "greeting", ...t, buttons: ["menu", "search", "cart"], menu_page: MENU_PAGE, background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 110, 0),
      children: [
        collage(ctx),
        say(ctx, L, "mjTitle", font(30, 700, { line_height: 1.25 }), { max_lines: 2, padding: sides(4, 16, 0, 16) }),
        head(ctx, "mjByColour", { word: "mjAllColours", action: shop }),
        byColour(ctx),
        head(ctx, "mjPalettes", { word: "skSeeAll", action: shop }),
        palettes(ctx),
        head(ctx, "mjOnBoard", { word: "skSeeAll", action: shop }),
        polaroidCards(ctx, "mjOnBoard", "newest", false, -2),
        makeBoard(ctx),
        head(ctx, "mjLoved", { word: "skSeeAll", action: shop }),
        polaroidCards(ctx, "mjLoved", "popular", true, 2),
      ],
    },
  };
}

// ——— The pages after the home ———

function over(screenName: string, ctx: SectionContext): StudioNode[] | null {
  const id = idOf(ctx);
  switch (screenName) {
    case "search":
      return [{ ...byColour(ctx), padding: sides(8, 16, 10, 16) }];
    case "cart":
      return [
        { id: id(), type: "coupon", name: ctx.w("skCoupon"), code: DECOR_D_CODE, coupon: { look: "ticket", bind: "public" }, radius: 24, color: K.fill, margin: sides(10, 16, 4, 16) },
        {
          id: id(),
          type: "row",
          name: ctx.w("mjCartNote"),
          gap: 12,
          cross: "center",
          radius: 24,
          padding: sides(12, 14, 12, 14),
          margin: sides(8, 16, 4, 16),
          background: L.tint.day,
          dark_background: L.tint.night,
          rotation: -1,
          children: [{ id: id(), type: "icon", icon: "redeem", icon_size: 22, color: K.accent, dark_color: K.darkAccent }, say(ctx, L, "mjCartNote", font(13, 500, { line_height: 1.4 }), { width: "fill", max_lines: 3 })],
        },
      ];
    case "orders":
      return [
        head(ctx, "skTrack"),
        {
          id: id(),
          type: "timeline",
          name: ctx.w("skTrack"),
          timeline: { style: "horizontal", source: "latest_order" },
          color: K.ink,
          dark_color: K.darkInk,
          background: K.surface,
          dark_background: K.darkSurface,
          radius: 26,
          padding: sides(16, 14, 16, 14),
          margin: sides(0, 16, 6, 16),
          entries: (["dcTrack1", "dcTrack2", "dcTrack3", "dcTrack4"] as const).map((w, i): StudioEntry => sigEntry(ctx, { title: w, text: `${w}Text` as SectionWord }, i === 0 ? { highlight: true } : {})),
        },
      ];
    default:
      return null;
  }
}

const DECOR_D_CODE = "SAKAN10";

/** The category menu: the search, the colours, every main category a row of its sub-categories' cards, then the ways in as round bubbles. */
function menuPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "dcWordmark" });
  const bubble = (word: SectionWord, icon: string, action: Action): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    gap: 6,
    cross: "center",
    action,
    children: [
      { id: id(), type: "row", width: 52, height: 52, radius: 26, align: "center", cross: "center", background: K.surface, dark_background: K.darkSurface, children: [{ id: id(), type: "icon", icon, icon_size: 22, color: K.accent, dark_color: K.darkAccent }] },
      say(ctx, L, word, font(11.5, 500), { max_lines: 1, text_align: "center" }),
    ],
  });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk, style: "large" },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { id: id(), type: "search", name: ctx.w("mjMenuSearch"), text: ctx.w("mjMenuSearch"), source: "products", radius: 26, height: 50, background: K.surface, dark_background: K.darkSurface, color: K.muted, dark_color: K.darkMuted, margin: sides(4, 16, 6, 16) },
        head(ctx, "mjByColour"),
        byColour(ctx),
        { id: id(), type: "categories", name: ctx.w("skCategoryMenu"), source: "products", style: "rows", category_menu: { look: "lead", radius: 24 }, color: K.ink, dark_color: K.darkInk, padding: sides(14, 0, 6, 0) },
        {
          id: id(),
          type: "row",
          name: ctx.w("skMenuAccount"),
          gap: 4,
          radius: 28,
          padding: sides(14, 8, 12, 8),
          margin: sides(14, 16, 0, 16),
          background: L.tint.day,
          dark_background: L.tint.night,
          children: [bubble("skAccount", "person", screen("account")), bubble("skOrders", "package_2", screen("orders")), bubble("mjWishlist", "favorite", screen("favorites")), bubble("skLanguage", "language", screen("settings")), bubble("skContact", "chat", screen("account"))],
        },
      ],
    },
  };
}

/** Five tabs: Home, the colours (the shop), Cart, Orders, Account. */
export function mazajTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const out = structuredClone([...tabs]).map((t) => {
    const target = t.target.type === "screen" ? t.target.screen : null;
    if (t.id === "home") return { ...t, icon: "home" };
    if (target === "search") return { ...t, label: "Shop", icon: "palette" };
    if (target === "cart") return { ...t, label: "Cart", icon: "local_mall" };
    if (target === "account") return { ...t, icon: "face" };
    return t;
  });
  const account = out.findIndex((t) => t.target.type === "screen" && t.target.screen === "account");
  const orders: LayoutTab = { id: "orders", label: "Orders", icon: "redeem", target: { type: "screen", screen: "orders" } };
  if (!out.some((t) => t.target.type === "screen" && t.target.screen === "orders")) out.splice(account < 0 ? out.length : account, 0, orders);
  return out;
}

const MAZAJ_SCREENS = signatureScreens({
  style: "photo",
  photo: "/decor-photos/hero-autumn.jpg",
  title: { en: "A home in your mood", ar: "بيت على مزاجك", tr: "Ruh halinize göre bir ev" },
  subtitle: { en: "Sign in to save your boards and follow your orders.", ar: "سجّل الدخول لتحفظ لوحاتك وتتابع طلباتك.", tr: "Panolarınızı saklamak ve siparişlerinizi takip etmek için giriş yapın." },
  menu: "tiles",
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** The drop bar: cream paper, the open tab hanging as a coral drop. */
const MAZAJ_BAR = signatureBar(K, { design: "drop", background: K.surface, dark_background: K.darkSurface, active: K.fill, dark_active: K.darkFill, inactive: "#9C8273", dark_inactive: "#A88F80", labels: "active", radius: 28, margin: 0 });

export const DECOR_D: SignatureDesign = {
  demo: "decor",
  variant: "d",
  template: { id: "decor_signature_d", icon: "palette", fits: { types: ["store"], plain: true } },
  home,
  over,
  tabs: mazajTabs,
  pages: (ctx) => [{ slug: MENU_PAGE, title: "skCategoryMenu", studio: menuPage(ctx) }],
  bar: MAZAJ_BAR,
  look: { header: { background: K.page, color: K.ink, dark_background: K.darkPage, dark_color: K.darkInk }, background: K.page, dark_background: K.darkPage },
  chrome: { header: "photo", system: "photo" },
  isNew: true,
  project: {
    primary: K.fill,
    appearance: { secondary_color: "#3A2418", font: "DM Sans", font_family: "Marhey", arabic_font: "Marhey", dark_background: K.darkPage, dark_surface: K.darkSurface },
    screens: MAZAJ_SCREENS,
  },
};
