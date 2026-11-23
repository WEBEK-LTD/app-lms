import type { Action, StudioEntry, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigImage, sigTexts, signatureBar, type SignatureInk } from "./food-signature-parts";
import { clothesTabs, MENU_PAGE } from "./clothes-signature";
import { TOYS_AGE_WORDS, TOYS_COUPON_CODE } from "./toys-signature";

/**
 * 226 Toot's look D, MONTESSORI (the owner, 23 November 2026: every type
 * gets two new templates that look like no other): a quiet shop of wooden
 * toys in muted earth tones, oat, walnut, sage and clay, with no shadows,
 * thin lines and square-ish corners. Its home is an editorial page: a calm
 * headline, the toys filtered by the skill the child is learning (movement,
 * science, language, creativity: each tile named as the shop's category
 * that holds it, and so opening it) and by age (the shop's age categories as
 * a rail of chips), one calm photo with the parents' guide, the toys as a
 * list of quiet rows, the "how to play" cards (numbered steps under a
 * photo), the quiet favourites and the wood and paint promise. Its bar is
 * names only, the open one underlined. Playpen Sans Arabic; a walnut night.
 * Built only from Studio's elements; the skills, the ages and the products
 * are the shop's own.
 */

export const MONTESSORI_INK: SignatureInk = {
  page: "#F3EDE3",
  darkPage: "#1A1612",
  surface: "#FBF8F2",
  darkSurface: "#241F1A",
  ink: "#3A3129",
  darkInk: "#EFE6D8",
  muted: "#75695D",
  darkMuted: "#B3A795",
  line: "#DDD2C2",
  darkLine: "#3A322A",
  accent: "#66775A",
  darkAccent: "#A9B998",
  fill: "#3A3129",
  darkFill: "#E9DFCF",
  onFill: "#FBF8F2",
  darkOnFill: "#1A1612",
};
const K = MONTESSORI_INK;
const WOOD = { day: "#A87A4F", night: "#D2A273" };
const CLAY = { day: "#A85B3E", night: "#DE9677" };
const SAGE = { day: "#7D8F6E", night: "#7F9070" };
const OAT = { day: "#E8DFD0", night: "#2D2720" };
const FACE = "Playpen Sans Arabic";

const P = (name: string) => `/toys-photos/${name}.jpg`;
const shop: Action = screen("search");

const font = (size: number, weight: NonNullable<StudioFont["weight"]> = 400, extra: Partial<StudioFont> = {}): StudioFont => ({ family: FACE, size, weight, line_height: 1.45, ...extra });

function say(ctx: SectionContext, word: SectionWord, f: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, K, ctx.w(word), f, extra);
}

/** A thin rule in the page's line colour. */
const rule = (ctx: SectionContext, margin: StudioSides = sides(0, 0, 0, 0)): StudioNode => ({ id: idOf(ctx)(), type: "divider", height: 1, background: K.line, dark_background: K.darkLine, margin });

/** A small label over a part of the page. */
const label = (ctx: SectionContext, word: SectionWord, padding = sides(24, 20, 10, 20)): StudioNode => ({ ...say(ctx, word, font(12.5, 500), { muted: true, max_lines: 1 }), padding });

/** A section's title with a hairline running to a quiet link at its end. */
function head(ctx: SectionContext, title: SectionWord, link?: { word: SectionWord; action: Action }, padding = sides(34, 20, 14, 20)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    gap: 12,
    cross: "center",
    padding,
    children: [
      say(ctx, title, font(21, 500, { line_height: 1.3 }), { max_lines: 2 }),
      { id: id(), type: "divider", width: "fill", height: 1, background: K.line, dark_background: K.darkLine },
      ...(link ? [say(ctx, link.word, font(12.5, 500), { muted: true, max_lines: 1, action: link.action })] : []),
    ],
  };
}

// ——— By skill and by age ———

/** The four skills, each a tile named as the shop's category that holds its toys (and so opening it); the first one dark. */
function skills(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const tile = (cat: SectionWord, title: SectionWord, line: SectionWord, icon: string, lit: boolean): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(cat),
    gap: 10,
    cross: "center",
    radius: 6,
    padding: sides(14, 12, 14, 12),
    action: shop,
    ...(lit ? { background: K.fill, dark_background: K.darkFill } : { background: K.surface, dark_background: K.darkSurface, border_color: K.line, dark_border_color: K.darkLine, border_width: 1 }),
    children: [
      { id: id(), type: "icon", icon, icon_size: 26, ...(lit ? { color: K.onFill, dark_color: K.darkOnFill } : { color: WOOD.day, dark_color: WOOD.night }) },
      {
        id: id(),
        type: "column",
        width: "fill",
        gap: 0,
        children: [
          { ...say(ctx, title, font(14, 600, { line_height: 1.3 }), { max_lines: 1 }), ...(lit ? { color: K.onFill, dark_color: K.darkOnFill } : {}) },
          { ...say(ctx, line, font(11, 400, { line_height: 1.3 }), { muted: true, max_lines: 1 }), ...(lit ? { color: "#D9CFC2", dark_color: "#5A4F44" } : {}) },
        ],
      },
    ],
  });
  return {
    id: id(),
    type: "grid",
    name: ctx.w("tyMoSkillsLabel"),
    columns: 2,
    gap: 10,
    padding: sides(0, 20, 0, 20),
    children: [
      tile("tyMoCatMotor", "tyMoMotor", "tyMoMotorLine", "waving_hand", true),
      tile("tyMoCatStem", "tyMoStem", "tyMoStemLine", "explore", false),
      tile("tyMoCatLanguage", "tyMoLanguage", "tyMoLanguageLine", "language", false),
      tile("tyMoCatCreative", "tyMoCreative", "tyMoCreativeLine", "auto_awesome", false),
    ],
  };
}

/** The ages as a rail of pills, each named as the shop's age category (and so opening it); the second one sage. */
function ageRail(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("tyMoAgeLabel"),
    gap: 6,
    scroll: true,
    padding: sides(0, 20, 0, 20),
    children: TOYS_AGE_WORDS.map((word, i) => ({
      id: id(),
      type: "row" as const,
      name: ctx.w(word),
      height: 38,
      radius: 19,
      cross: "center" as const,
      padding: sides(0, 16, 0, 16),
      action: shop,
      ...(i === 1 ? { background: SAGE.day, dark_background: SAGE.night } : { border_color: K.line, dark_border_color: K.darkLine, border_width: 1, background: K.surface, dark_background: K.darkSurface }),
      children: [{ ...say(ctx, word, font(13, 500), { max_lines: 1 }), ...(i === 1 ? { color: "#FFFFFF", dark_color: "#FFFFFF" } : {}) }],
    })),
  };
}

// ——— The calm photo, the toys and the guides ———

/** One calm photo, a little faded, and the guide's title with its quiet link under it. */
function calmPhoto(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("tyMoReadTitle"),
    gap: 12,
    padding: sides(26, 20, 0, 20),
    action: shop,
    children: [
      sigImage(ctx, K, P("toddler-play"), { width: "fill", height: 250, radius: 4, background: OAT.day, dark_background: OAT.night }),
      {
        id: id(),
        type: "row",
        gap: 12,
        cross: "start",
        children: [say(ctx, "tyMoReadTitle", font(16, 500, { line_height: 1.4 }), { width: "fill", max_lines: 2 }), { ...say(ctx, "tyMoRead", font(12.5, 600), { max_lines: 1 }), color: CLAY.day, dark_color: CLAY.night, border_color: CLAY.day, dark_border_color: CLAY.night }],
      },
    ],
  };
}

/** A toy as a quiet row: its photo on oat, its name, its price, a thin plus, a rule under it. */
function toyRow(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    gap: 0,
    children: [
      {
        id: id(),
        type: "row",
        gap: 14,
        cross: "center",
        padding: sides(12, 0, 12, 0),
        children: [
          { id: id(), type: "image", bind: "image", width: 92, height: 92, radius: 4, fit: "cover", background: OAT.day, dark_background: OAT.night },
          {
            id: id(),
            type: "column",
            width: "fill",
            gap: 4,
            children: [
              { id: id(), type: "text", bind: "title", max_lines: 2, color: K.ink, dark_color: K.darkInk, font: font(14.5, 500, { line_height: 1.35 }) },
              {
                id: id(),
                type: "row",
                gap: 6,
                cross: "center",
                children: [
                  { id: id(), type: "text", bind: "price", max_lines: 1, color: K.ink, dark_color: K.darkInk, font: font(14, 600) },
                  { id: id(), type: "text", bind: "was_price", max_lines: 1, color: K.muted, dark_color: K.darkMuted, font: font(11.5) },
                  { id: id(), type: "text", bind: "sale", max_lines: 1, color: CLAY.day, dark_color: CLAY.night, font: font(11.5, 600) },
                ],
              },
            ],
          },
          { id: id(), type: "icon", icon: "add", icon_size: 22, color: K.muted, dark_color: K.darkMuted },
        ],
      },
      rule(ctx),
    ],
  };
}

function toyList(ctx: SectionContext, name: SectionWord, sort: "newest" | "popular"): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w(name), source: "products", layout: "list", gap: 0, padding: sides(0, 20, 0, 20), query: { limit: 3, category_id: null, featured: false, sort, ids: [] }, card: toyRow(ctx) };
}

/** A toy as a tall quiet card: its photo, its name and its price under it, no box. */
function quietCard(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    width: "fill",
    gap: 4,
    children: [
      { id: id(), type: "image", bind: "image", width: "fill", height: 196, radius: 4, fit: "cover", background: OAT.day, dark_background: OAT.night },
      { id: id(), type: "text", bind: "title", max_lines: 1, color: K.ink, dark_color: K.darkInk, font: font(13.5, 500), margin: sides(6, 0, 0, 0) },
      { id: id(), type: "text", bind: "price", max_lines: 1, color: K.muted, dark_color: K.darkMuted, font: font(13, 500) },
    ],
  };
}

function quietGrid(ctx: SectionContext): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w("tyMoQuiet"), source: "products", layout: "grid", columns: 2, gap: 16, padding: sides(0, 20, 0, 20), query: { limit: 4, category_id: null, featured: true, sort: "popular", ids: [] }, card: quietCard(ctx) };
}

/** How to play: cards of a photo and numbered steps, each named as the category its toy is in (and so opening it). */
function howToPlay(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  const step = (n: number, word: SectionWord): StudioNode => ({
    id: id(),
    type: "row",
    gap: 10,
    cross: "start",
    children: [
      { id: id(), type: "row", width: 22, height: 22, radius: 11, align: "center", cross: "center", border_color: WOOD.day, dark_border_color: WOOD.night, border_width: 1, children: [{ id: id(), type: "text", text: String(n), font: font(11, 600, { line_height: 1 }), color: WOOD.day, dark_color: WOOD.night }] },
      say(ctx, word, font(12.5, 400, { line_height: 1.4 }), { muted: true, width: "fill", max_lines: 2 }),
    ],
  });
  const card = (cat: SectionWord, photo: string, title: SectionWord, steps: [SectionWord, SectionWord, SectionWord]): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(cat),
    width: 268,
    gap: 0,
    radius: 6,
    background: K.surface,
    dark_background: K.darkSurface,
    border_color: K.line,
    dark_border_color: K.darkLine,
    border_width: 1,
    action: shop,
    children: [
      sigImage(ctx, K, P(photo), { width: "fill", height: 140, corners: { top_start: 6, top_end: 6 }, background: OAT.day, dark_background: OAT.night }),
      { id: id(), type: "column", gap: 10, padding: sides(14, 14, 16, 14), children: [say(ctx, title, font(15, 500), { max_lines: 1 }), ...steps.map((w, i) => step(i + 1, w))] },
    ],
  });
  return [
    head(ctx, "tyMoHowTitle"),
    {
      id: id(),
      type: "row",
      name: ctx.w("tyMoHowTitle"),
      gap: 12,
      scroll: true,
      padding: sides(0, 20, 0, 20),
      children: [
        card("tyMapCatWooden", "block-tower", "tyMoHow1", ["tyMoHow1a", "tyMoHow1b", "tyMoHow1c"]),
        card("tyMoCatLanguage", "letters", "tyMoHow2", ["tyMoHow2a", "tyMoHow2b", "tyMoHow2c"]),
        card("tyMoCatMotor", "bead-maze", "tyMoHow3", ["tyMoHow3a", "tyMoHow3b", "tyMoHow3c"]),
      ],
    },
  ];
}

/** Natural beech, water-based paints: a band of warm wood. */
function woodBand(ctx: SectionContext, margin = sides(34, 20, 0, 20)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("tyMoWood"),
    gap: 16,
    cross: "center",
    radius: 6,
    padding: sides(18, 18, 18, 18),
    margin,
    gradient: { from: "#C99B6E", to: "#A8784E", angle: 135 },
    background: "#B98A5E",
    dark_background: "#4A3626",
    children: [
      { id: id(), type: "icon", icon: "yard", icon_size: 32, color: "#FFF8EE", dark_color: "#FFF8EE" },
      { id: id(), type: "column", width: "fill", gap: 4, children: [say(ctx, "tyMoWood", font(16.5, 500, { line_height: 1.35 }), { color: "#FFF8EE", dark_color: "#FFF8EE", max_lines: 2 }), say(ctx, "tyMoWoodLine", font(12, 400), { color: "#FFF1E0", dark_color: "#E9D8C4", max_lines: 2 })] },
    ],
  };
}

/** The opening: a deep sage band, the calm headline in cream over the skills and the ages (the look's own first screen). */
function sageBand(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const cream = { color: "#F6F0E4", dark_color: "#EFE6D8" } as const;
  return {
    id: id(),
    type: "column",
    name: ctx.w("tyMoHello"),
    gap: 0,
    padding: sides(22, 0, 24, 0),
    background: "#5F6F54",
    dark_background: "#232B1E",
    corners: { bottom_start: 28, bottom_end: 28 },
    children: [
      { id: id(), type: "column", gap: 8, padding: sides(0, 20, 0, 20), children: [say(ctx, "tyMoHello", font(27, 500, { line_height: 1.35 }), { ...cream, max_lines: 3 }), say(ctx, "tyMoHelloLine", font(13, 400, { line_height: 1.65 }), { color: "#E3E8D9", dark_color: "#C9D1BC", max_lines: 3 })] },
      { ...label(ctx, "tyMoSkillsLabel", sides(20, 20, 10, 20)), color: "#D8E0C9", dark_color: "#A9B998" },
      skills(ctx),
      { ...label(ctx, "tyMoAgeLabel", sides(18, 20, 10, 20)), color: "#D8E0C9", dark_color: "#A9B998" },
      ageRail(ctx),
    ],
  };
}

// ——— The home ———

function header(ctx: SectionContext): StudioPage["header"] {
  const t = sigTexts(ctx, { title: "tyWordmark", subtitle: "tyMoKicker" });
  return { type: "logo_center", title: t.title, subtitle: t.subtitle, translations: t.translations, buttons: ["menu", "cart"], menu_page: MENU_PAGE, background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk, style: "large" };
}

export function montessoriHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    header: header(ctx),
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 100, 0),
      children: [
        sageBand(ctx),
        calmPhoto(ctx),
        head(ctx, "tyMoForMotor", { word: "tyMoAll", action: shop }),
        toyList(ctx, "tyMoForMotor", "newest"),
        ...howToPlay(ctx),
        head(ctx, "tyMoQuiet", { word: "tyMoAll", action: shop }),
        quietGrid(ctx),
        woodBand(ctx),
      ],
    },
  };
}

// ——— The pages after the home ———

/** One of the menu's quiet rows: an icon, its words, a chevron, a rule under it. */
function menuRow(ctx: SectionContext, word: SectionWord, icon: string, action: Action, line?: SectionWord): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w(word),
    gap: 0,
    action,
    children: [
      {
        id: id(),
        type: "row",
        gap: 14,
        cross: "center",
        padding: sides(14, 0, 14, 0),
        children: [
          { id: id(), type: "icon", icon, icon_size: 22, color: WOOD.day, dark_color: WOOD.night },
          { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, word, font(14.5, 500), { max_lines: 1 }), ...(line ? [say(ctx, line, font(11.5), { muted: true, max_lines: 2 })] : [])] },
          { id: id(), type: "icon", icon: "arrow_forward", icon_size: 20, color: K.muted, dark_color: K.darkMuted },
        ],
      },
      rule(ctx),
    ],
  };
}

/**
 * The category menu: the wordmark, a quiet search, every main category of
 * the shop a row of cards (its "All" card, then its sub-categories,
 * sliding), then the account, the orders, the wishlist, the language and
 * how to reach the shop as quiet rows.
 */
export function montessoriMenuPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "tyWordmark" });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["search"], background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk, style: "large" },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 36, 0),
      children: [
        { id: id(), type: "search", name: ctx.w("tySearchAll"), text: ctx.w("tySearchAll"), source: "products", radius: 24, height: 48, background: K.surface, dark_background: K.darkSurface, color: K.muted, dark_color: K.darkMuted, border_color: K.line, dark_border_color: K.darkLine, border_width: 1, margin: sides(4, 20, 10, 20) },
        { id: id(), type: "categories", name: ctx.w("tyCategoryMenu"), source: "products", style: "rows", category_menu: { look: "label", radius: 6 }, color: K.ink, dark_color: K.darkInk, font: { family: FACE }, padding: sides(6, 0, 6, 0) },
        {
          id: id(),
          type: "column",
          name: ctx.w("tyMenuAccount"),
          gap: 0,
          padding: sides(18, 20, 0, 20),
          children: [
            rule(ctx),
            menuRow(ctx, "tyAccount", "person", screen("account")),
            menuRow(ctx, "tyOrders", "package_2", screen("orders")),
            menuRow(ctx, "tyMoWishlist", "favorite", screen("favorites")),
            menuRow(ctx, "tyLanguage", "language", screen("settings")),
            menuRow(ctx, "tyContact", "support_agent", screen("account"), "tyContactLine"),
          ],
        },
      ],
    },
  };
}

/** Over the shop: the shelf's title, the categories as chips and the shop's filters. */
function listTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "column", name: ctx.w("tyMoListTitle"), gap: 4, padding: sides(10, 20, 10, 20), children: [say(ctx, "tyMoListTitle", font(26, 500, { line_height: 1.3 }), { max_lines: 1 }), say(ctx, "tyMoListLine", font(12.5), { muted: true, max_lines: 2 })] },
    { id: id(), type: "categories", name: ctx.w("tyCategories"), source: "products", style: "chips", color: K.ink, dark_color: K.darkInk, padding: sides(0, 16, 4, 16) },
    { id: id(), type: "listing_filters", name: ctx.w("tyMoListTitle"), padding: sides(4, 20, 8, 20) },
    rule(ctx, sides(4, 20, 4, 20)),
  ];
}

/** Over the cart: the shop's code (the classic coupon) and the kraft wrapping's note. */
function cartTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "coupon", name: ctx.w("tyCoupon"), code: TOYS_COUPON_CODE, coupon: { look: "classic", bind: "public" }, radius: 6, color: SAGE.day, margin: sides(10, 20, 4, 20) },
    { id: id(), type: "row", name: ctx.w("tyMoCartLine"), gap: 12, cross: "center", radius: 6, padding: sides(12, 14, 12, 14), margin: sides(8, 20, 6, 20), border_color: K.line, dark_border_color: K.darkLine, border_width: 1, children: [{ id: id(), type: "icon", icon: "redeem", icon_size: 22, color: WOOD.day, dark_color: WOOD.night }, say(ctx, "tyMoCartLine", font(12.5, 500), { width: "fill", max_lines: 3 })] },
  ];
}

/** Over the orders: the order's way, quiet and lined (the person's newest order, else the first step lit). */
function ordersTop(ctx: SectionContext): StudioNode[] {
  const step = (title: SectionWord, t: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text: t }, highlight ? { highlight: true } : {});
  return [
    head(ctx, "tyTrack", undefined, sides(12, 20, 10, 20)),
    { id: idOf(ctx)(), type: "timeline", name: ctx.w("tyTrack"), timeline: { style: "vertical", source: "latest_order" }, color: K.ink, dark_color: K.darkInk, font: { family: FACE }, radius: 6, padding: sides(14, 14, 14, 14), margin: sides(0, 20, 8, 20), border_color: K.line, dark_border_color: K.darkLine, border_width: 1, entries: [step("tyTrack1", "tyTrack1Text", true), step("tyTrack2", "tyTrack2Text"), step("tyTrack3", "tyTrack3Text"), step("tyTrack4", "tyTrack4Text")] },
  ];
}

function over(screenName: string, ctx: SectionContext): StudioNode[] | null {
  switch (screenName) {
    case "search":
      return listTop(ctx);
    case "cart":
      return cartTop(ctx);
    case "orders":
      return ordersTop(ctx);
    default:
      return null;
  }
}

// ——— The sign-in screen, the account menu, the bar and the look ———

const MONTESSORI_SCREENS = signatureScreens({
  style: "minimal",
  photo: P("toddler-play"),
  title: { en: "Play that grows with them", ar: "لعب يكبر معهم", tr: "Onlarla büyüyen oyun" },
  subtitle: { en: "Sign in for your orders and toys chosen for their age.", ar: "سجّل الدخول لطلباتك وألعاب مختارة لعمر طفلك.", tr: "Siparişleriniz ve yaşına göre seçilen oyuncaklar için giriş yapın." },
  menu: "plain",
  first: ["orders", "wishlist", "settings", "notifications", "help", "privacy", "terms"],
});

/** The bar: names only on the oat page, the open one in ink with a line over it. */
export const MONTESSORI_BAR = signatureBar(K, { design: "text", background: K.page, dark_background: K.darkPage, active: K.ink, dark_active: K.darkInk, inactive: K.muted, dark_inactive: K.darkMuted, labels: "always" });

export const MONTESSORI_D: SignatureDesign = {
  demo: "toys",
  variant: "d",
  template: { id: "toys_signature_d", icon: "yard", fits: { types: ["store"], plain: true } },
  home: montessoriHome,
  over,
  tabs: clothesTabs,
  pages: (ctx) => [{ slug: MENU_PAGE, title: "tyCategoryMenu", studio: montessoriMenuPage(ctx) }],
  bar: MONTESSORI_BAR,
  look: { header: { background: K.page, color: K.ink, dark_background: K.darkPage, dark_color: K.darkInk }, background: K.page, dark_background: K.darkPage },
  chrome: { home: "large", header: "large", system: "large" },
  isNew: true,
  project: {
    primary: K.fill,
    appearance: { secondary_color: SAGE.day, font: "Outfit", font_family: FACE, dark_background: K.darkPage, dark_surface: K.darkSurface },
    screens: MONTESSORI_SCREENS,
  },
};

// ——— Its parts as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;
const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};

export const TOYS_D_SECTIONS: readonly SectionInfo[] = [
  // By skill: four tiles, each opening its category.
  { id: "ty_skill_filter", icon: "waving_hand", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [label(ctx, "tyMoSkillsLabel"), skills(ctx)]) },
  // By age: a rail of pills.
  { id: "ty_age_rail", icon: "linear_scale", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [label(ctx, "tyMoAgeLabel"), ageRail(ctx)]) },
  // How to play: photo cards with numbered steps.
  { id: "ty_how_to_play", icon: "format_list_numbered", isNew: true, fits: STORE_PLAIN, make: one((ctx) => howToPlay(ctx)) },
  // The toys as quiet rows.
  { id: "ty_quiet_list", icon: "view_agenda", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [head(ctx, "tyMoForMotor", { word: "tyMoAll", action: shop }), toyList(ctx, "tyMoForMotor", "newest")]) },
  // Natural wood and paint.
  { id: "ty_wood_band", icon: "yard", isNew: true, fits: STORE_PLAIN, make: one((ctx) => woodBand(ctx, sides(16, 20, 0, 20))) },
];
