import type { Action, LayoutTab, StudioEntry, StudioFont, StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigImage, sigTexts, signatureBar, type SignatureInk } from "./food-signature-parts";
import { productPart } from "../product-page";
import { mixedProductPage } from "./product-page-mix";

/**
 * 223 Lujain's template D, the OUTFIT BUILDER (the owner, 23 November
 * 2026): the clothes type's second new template, light and warm, drawn from
 * its own parts:
 *
 * - the home opens on the day's question as a large title over the
 *   search, round buttons beside it, then the moods as chips (work,
 *   weekend, evening, travel);
 * - "Build your outfit": a card of three rows that each slide (top, bottom,
 *   shoes), the chosen piece larger with a ring, each row named after the
 *   demo's category so a tap opens it, "Shop the outfit" under them;
 * - a staggered masonry of two columns of different heights, 28-point
 *   corners, a round "+" on each piece;
 * - the pieces as rounded tiles, a style note card, what was looked at;
 * - a dark dock in the middle and a round floating bag button (Tajawal).
 *
 * Its category menu is a page of its own: the search, every main category
 * a row of rounded cards, then the account, orders, saved and language as
 * four round tiles and the stylists. Every word in Studio's three languages
 * (lib/studio/words/clothes-cd.ts).
 */

export const OUTFIT_INK: SignatureInk = {
  page: "#EEE7DD",
  darkPage: "#171310",
  surface: "#FBF8F3",
  darkSurface: "#231D19",
  ink: "#2A221C",
  darkInk: "#F3ECE3",
  muted: "#6E6257",
  darkMuted: "#B3A697",
  line: "#E0D6C8",
  darkLine: "#352D27",
  accent: "#9C5F3C",
  darkAccent: "#E0A27A",
  fill: "#9C5F3C",
  darkFill: "#E0A27A",
  onFill: "#FFFFFF",
  darkOnFill: "#1A1410",
};
const K = OUTFIT_INK;
const TINT = { day: "#E4D9CA", night: "#2C2520" };
const FACE = "Tajawal";
const R = 28;

const P = (name: string) => `/clothes-photos/${name}.jpg`;

const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));
export const OUTFIT_MENU_PAGE = "menu";
export const OUTFIT_SIZE_PAGE = "size-guide";

const face = (size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: FACE, size, weight: 800, line_height: 1.25, ...extra });

function say(ctx: SectionContext, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, K, ctx.w(word), font, extra);
}

/** A round button on the card's surface. */
function disc(ctx: SectionContext, icon: string, action: Action, size = 44, filled = false): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    width: size,
    height: size,
    radius: size / 2,
    align: "center",
    cross: "center",
    self_align: "center",
    background: filled ? TINT.day : K.surface,
    dark_background: filled ? TINT.night : K.darkSurface,
    action,
    children: [{ id: id(), type: "icon", icon, icon_size: 21, color: K.ink, dark_color: K.darkInk }],
  };
}

/** A section's title in heavy type, the link in the accent. */
function headOf(ctx: SectionContext, title: SectionWord, link: { word: SectionWord; action: Action } | null): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    cross: "center",
    gap: 12,
    padding: sides(28, 18, 12, 18),
    children: [say(ctx, title, face(21), { width: "fill", max_lines: 2 }), ...(link ? [say(ctx, link.word, { family: FACE, size: 13, weight: 700 }, { accent: true, max_lines: 1, action: link.action })] : [])],
  };
}

// ——— The home ———

/** The moods as chips, the first filled. */
function moods(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const chip = (word: SectionWord, icon: string, on: boolean): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(word),
    height: 40,
    radius: 20,
    gap: 6,
    cross: "center",
    padding: sides(0, 16, 0, 14),
    background: on ? K.ink : K.surface,
    dark_background: on ? K.darkInk : K.darkSurface,
    action: shop,
    children: [
      { id: id(), type: "icon", icon, icon_size: 18, color: on ? K.surface : K.ink, dark_color: on ? K.darkSurface : K.darkInk },
      { id: id(), type: "text", text: ctx.w(word), max_lines: 1, font: { family: FACE, size: 14, weight: 500 }, color: on ? K.surface : K.ink, dark_color: on ? K.darkSurface : K.darkInk },
    ],
  });
  return { id: id(), type: "row", name: ctx.w("obdMoods"), gap: 8, scroll: true, padding: sides(16, 18, 4, 18), children: [chip("obdWork", "work", true), chip("obdWeekend", "wb_sunny", false), chip("obdEvening", "nights_stay", false), chip("obdTravel", "flight", false)] };
}

/**
 * One row of the outfit: its name in a small tag, then the pieces
 * sliding, the chosen one larger with a ring. The row is named after the
 * demo's category (Tops & knitwear, Denim, Shoes): a tap opens it.
 */
function lane(ctx: SectionContext, label: SectionWord, category: SectionWord, photos: readonly string[]): StudioNode {
  const id = idOf(ctx);
  const tile = (photo: string, on: boolean): StudioNode =>
    sigImage(ctx, K, P(photo), {
    name: ctx.w(category),
    width: on ? 116 : 78,
    height: on ? 116 : 90,
    radius: on ? 24 : 18,
    fit: "cover",
    self_align: "center",
    opacity: on ? 1 : 0.55,
    background: TINT.day,
    dark_background: TINT.night,
    ...(on ? { border_color: K.accent, dark_border_color: K.darkAccent, border_width: 2 } : {}),
    action: shop,
  });
  return {
    id: id(),
    type: "row",
    name: ctx.w(category),
    gap: 8,
    cross: "center",
    margin: sides(12, 0, 0, 0),
    padding: sides(0, 12, 0, 12),
    children: [
      { id: id(), type: "row", width: 52, height: 26, radius: 13, align: "center", cross: "center", self_align: "center", background: TINT.day, dark_background: TINT.night, children: [{ id: id(), type: "text", text: ctx.w(label), max_lines: 1, font: { family: FACE, size: 11, weight: 700 }, color: K.ink, dark_color: K.darkInk }] },
      { id: id(), type: "row", name: ctx.w(category), width: "fill", gap: 8, cross: "center", scroll: true, children: photos.map((p, i) => tile(p, i === 1)) },
    ],
  };
}

/** Build your outfit: three rows that slide (top, bottom, shoes), another outfit, and the whole outfit in the shop. */
export function outfitBuilder(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("obdBuild"),
    radius: R,
    padding: sides(18, 0, 16, 0),
    margin: sides(14, 14, 0, 14),
    background: K.surface,
    dark_background: K.darkSurface,
    children: [
      {
        id: id(),
        type: "row",
        gap: 12,
        cross: "center",
        padding: sides(0, 18, 0, 18),
        children: [{ id: id(), type: "column", width: "fill", gap: 3, children: [say(ctx, "obdBuild", face(21)), say(ctx, "obdBuildLine", { family: FACE, size: 12.5 }, { muted: true, max_lines: 2 })] }, { ...disc(ctx, "sync", shop, 42, true), name: ctx.w("obdShuffle") }],
      },
      lane(ctx, "obdTop", "obdTops", ["top-black", "top-cream", "top-knit", "top-plaid"]),
      lane(ctx, "obdBottom", "obdDenim", ["denim", "bottom-jeans", "bottom-skirt", "bottom-velvet"]),
      lane(ctx, "obdFeet", "obdShoes", ["nude-heels", "black-heels", "sneak-white", "red-pumps"]),
      { id: id(), type: "divider", height: 1, background: K.line, dark_background: K.darkLine, margin: sides(16, 18, 14, 18) },
      {
        id: id(),
        type: "row",
        gap: 12,
        cross: "center",
        padding: sides(0, 18, 0, 18),
        children: [
          say(ctx, "obdPieces", { family: FACE, size: 14, weight: 700, line_height: 1.35 }, { width: "fill", max_lines: 2 }),
          { id: id(), type: "button", name: ctx.w("obdShopOutfit"), text: ctx.w("obdShopOutfit"), icon: "shopping_bag", width: "hug", height: 46, radius: 23, padding: sides(0, 20, 0, 18), background: K.fill, dark_background: K.darkFill, color: K.onFill, dark_color: K.darkOnFill, font: { family: FACE, size: 14, weight: 700 }, motion: { press: "shrink" }, action: shop },
        ],
      },
    ],
  };
}

/** A piece of the masonry: its photo with 28-point corners and a round "+", its name and price under it. */
function tile(ctx: SectionContext, height: number): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    gap: 4,
    children: [
      {
        id: id(),
        type: "stack",
        height,
        children: [
          { id: id(), type: "image", bind: "image", width: "fill", height, radius: R, fit: "cover", background: TINT.day, dark_background: TINT.night },
          { id: id(), type: "row", width: 34, height: 34, radius: 17, align: "center", cross: "center", background: K.surface, dark_background: K.darkSurface, place: { x: 8, y: 8 }, children: [{ id: id(), type: "icon", icon: "add", icon_size: 20, color: K.ink, dark_color: K.darkInk }] },
        ],
      },
      { id: id(), type: "text", bind: "title", max_lines: 1, margin: sides(6, 6, 0, 6), font: { family: FACE, size: 13, weight: 500 }, color: K.ink, dark_color: K.darkInk },
      { id: id(), type: "text", bind: "price", max_lines: 1, margin: sides(0, 6, 0, 6), font: { family: FACE, size: 14, weight: 800 }, color: K.accent, dark_color: K.darkAccent },
    ],
  };
}

/** The masonry: two columns of the shop's pieces at different heights, the second starting lower. */
export function masonry(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  // Two different lists: the newest, and the shop's dearest pieces, so no piece shows twice side by side.
  const column = (sort: "newest" | "price_desc", height: number, top: number): StudioNode => ({ id: id(), type: "items", name: ctx.w("obdPicks"), source: "products", layout: "list", width: "fill", gap: 12, padding: sides(top, 0, 0, 0), query: { limit: 3, category_id: null, featured: false, sort, ids: [] }, card: tile(ctx, height) });
  return { id: id(), type: "row", name: ctx.w("obdPicks"), gap: 10, cross: "start", padding: sides(0, 14, 0, 14), children: [column("newest", 236, 0), column("price_desc", 186, 36)] };
}

/** The pieces as rounded tiles under their names, each named as the demo's category. */
function byPiece(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const piece = (word: SectionWord, photo: string): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: 96,
    gap: 8,
    cross: "center",
    action: shop,
    children: [
      sigImage(ctx, K, P(photo), { width: 96, height: 112, radius: 24, fit: "cover", background: TINT.day, dark_background: TINT.night }),
      { id: id(), type: "text", text: ctx.w(word), max_lines: 2, text_align: "center", font: { family: FACE, size: 12.5, weight: 500 }, color: K.ink, dark_color: K.darkInk },
    ],
  });
  return { id: id(), type: "row", name: ctx.w("obdByPiece"), gap: 10, scroll: true, padding: sides(0, 18, 0, 18), children: [piece("obdDresses", "camel-dress"), piece("obdCoats", "c-black-coat"), piece("obdDenim", "denim"), piece("obdShoes", "black-heels"), piece("obdBags", "brown-bag"), piece("obdAccessories", "sunglasses")] };
}

/** The style note: a photo beside the advice, on the accent's tint. */
function styleNote(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("obdNoteKicker"),
    gap: 14,
    cross: "center",
    radius: R,
    padding: sides(12, 12, 12, 16),
    margin: sides(26, 14, 0, 14),
    background: TINT.day,
    dark_background: TINT.night,
    children: [
      sigImage(ctx, K, P("camel-jacket"), { width: 104, height: 128, radius: 22, fit: "cover", background: K.surface, dark_background: K.darkSurface }),
      {
        id: id(),
        type: "column",
        width: "fill",
        gap: 6,
        children: [
          say(ctx, "obdNoteKicker", { family: FACE, size: 11.5, weight: 700, letter_spacing: 1 }, { accent: true }),
          say(ctx, "obdNote", { family: FACE, size: 15, weight: 700, line_height: 1.45 }, { max_lines: 4 }),
          { id: id(), type: "button", name: ctx.w("obdNoteButton"), text: ctx.w("obdNoteButton"), icon: "arrow_forward", icon_position: "end", width: "hug", height: 36, radius: 18, self_align: "start", padding: sides(0, 14, 0, 14), margin: sides(4, 0, 0, 0), background: K.ink, dark_background: K.darkInk, color: K.surface, dark_color: K.darkSurface, font: { family: FACE, size: 13, weight: 700 }, action: shop },
        ],
      },
    ],
  };
}

/** The round floating bag button, pinned at the foot of the home, over the bar. */
function bagButton(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("obdBag"),
    pin: "bottom",
    align: "end",
    padding: sides(0, 16, 8, 16),
    children: [
      {
        id: id(),
        type: "row",
        name: ctx.w("obdBag"),
        width: 60,
        height: 60,
        radius: 30,
        align: "center",
        cross: "center",
        background: K.fill,
        dark_background: K.darkFill,
        shadow: "medium",
        motion: { press: "bounce" },
        action: screen("cart"),
        children: [{ id: id(), type: "icon", icon: "shopping_bag", icon_size: 26, color: K.onFill, dark_color: K.darkOnFill }],
      },
    ],
  };
}

export function outfitHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "obdHello" });
  return {
    // The day's question as a large title over the search, the menu (the category menu) and the bell as round buttons.
    header: { type: "title_search", title: t.title, translations: t.translations, buttons: ["menu", "notifications"], menu_page: OUTFIT_MENU_PAGE, style: "search", background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 40, 0),
      children: [
        moods(ctx),
        outfitBuilder(ctx),
        headOf(ctx, "obdPicks", { word: "obdSeeAll", action: shop }),
        masonry(ctx),
        headOf(ctx, "obdByPiece", { word: "obdSeeAll", action: ownPage(ctx, OUTFIT_MENU_PAGE) }),
        byPiece(ctx),
        styleNote(ctx),
        headOf(ctx, "obdRecent", null),
        { id: id(), type: "items", name: ctx.w("obdRecent"), source: "products", layout: "carousel", recent: true, gap: 10, padding: sides(0, 14, 0, 14), query: { limit: 10, category_id: null, featured: false, sort: "newest", ids: [] }, card: { ...tile(ctx, 150), width: 124 } },
        bagButton(ctx),
      ],
    },
  };
}

// ——— The pages after the home ———

function pageHeader(ctx: SectionContext, word: SectionWord): StudioPage["header"] {
  const t = sigTexts(ctx, { title: word });
  return { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], background: K.page, color: K.ink, dark_background: K.darkPage, dark_color: K.darkInk, style: "search" };
}

/** A round tile of the menu's foot: its icon in a disc, its words under it. */
function menuTile(ctx: SectionContext, word: SectionWord, icon: string, action: Action): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    gap: 8,
    cross: "center",
    radius: 24,
    padding: sides(14, 6, 12, 6),
    background: K.surface,
    dark_background: K.darkSurface,
    action,
    children: [
      { id: id(), type: "row", width: 40, height: 40, radius: 20, align: "center", cross: "center", background: TINT.day, dark_background: TINT.night, children: [{ id: id(), type: "icon", icon, icon_size: 20, color: K.ink, dark_color: K.darkInk }] },
      { id: id(), type: "text", text: ctx.w(word), max_lines: 1, text_align: "center", font: { family: FACE, size: 12.5, weight: 700 }, color: K.ink, dark_color: K.darkInk },
    ],
  };
}

export function outfitMenuPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    header: pageHeader(ctx, "obdMenu"),
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        // The header's own search is the menu's (its premium search style).
        moods(ctx),
        { id: id(), type: "categories", name: ctx.w("obdMenu"), source: "products", style: "rows", category_menu: { look: "label", radius: R }, color: K.ink, dark_color: K.darkInk, padding: sides(10, 0, 6, 0) },
        { id: id(), type: "row", name: ctx.w("obdAccount"), gap: 8, padding: sides(14, 14, 0, 14), children: [menuTile(ctx, "obdAccount", "person", screen("account")), menuTile(ctx, "obdOrders", "package_2", screen("orders")), menuTile(ctx, "obdWishlist", "favorite", screen("favorites")), menuTile(ctx, "obdLanguage", "language", screen("settings"))] },
        {
          id: id(),
          type: "row",
          name: ctx.w("obdContact"),
          gap: 12,
          cross: "center",
          radius: R,
          padding: sides(14, 16, 14, 16),
          margin: sides(10, 14, 0, 14),
          background: TINT.day,
          dark_background: TINT.night,
          action: screen("account"),
          children: [
            { id: id(), type: "icon", icon: "support_agent", icon_size: 24, color: K.accent, dark_color: K.darkAccent },
            { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, "obdContact", { family: FACE, size: 14.5, weight: 800 }), say(ctx, "obdContactLine", { family: FACE, size: 12.5 }, { muted: true, max_lines: 2 })] },
            { id: id(), type: "icon", icon: "chat", icon_size: 20, color: K.ink, dark_color: K.darkInk },
          ],
        },
      ],
    },
  };
}

export function outfitSizePage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    header: pageHeader(ctx, "obdSizeGuide"),
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { id: id(), type: "size_chart", name: ctx.w("obdSizeChart"), text: ctx.w("obdSizeChart"), color: K.ink, dark_color: K.darkInk, background: K.surface, dark_background: K.darkSurface, radius: R, padding: sides(16, 14, 16, 14), margin: sides(12, 14, 4, 14) },
        { id: id(), type: "row", name: ctx.w("obdFitTip"), gap: 12, cross: "center", radius: R, padding: sides(14, 16, 14, 16), margin: sides(10, 14, 0, 14), background: TINT.day, dark_background: TINT.night, children: [{ id: id(), type: "icon", icon: "straighten", icon_size: 22, color: K.accent, dark_color: K.darkAccent }, say(ctx, "obdFitTip", { family: FACE, size: 13.5, weight: 500, line_height: 1.5 }, { width: "fill", max_lines: 4 })] },
      ],
    },
  };
}

/** Over the shop: the moods, the sizes to filter by. */
function shopTop(ctx: SectionContext): StudioNode[] {
  return [moods(ctx), { id: idOf(ctx)(), type: "listing_filters", name: ctx.w("obdSizeChart"), color: K.ink, dark_color: K.darkInk, padding: sides(8, 18, 6, 18) }];
}

/** Over the bag: complete the outfit with rounded tiles. */
function cartTop(ctx: SectionContext): StudioNode[] {
  return [
    headOf(ctx, "obdCompleteOutfit", null),
    { id: idOf(ctx)(), type: "items", name: ctx.w("obdCompleteOutfit"), source: "products", layout: "carousel", gap: 10, padding: sides(0, 14, 6, 14), query: { limit: 6, category_id: null, featured: true, sort: "popular", ids: [] }, card: { ...tile(ctx, 140), width: 118 } },
  ];
}

/** Over the orders: the newest order's steps across a card. */
function ordersTop(ctx: SectionContext): StudioNode[] {
  const step = (title: SectionWord, text: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    headOf(ctx, "obdTrack", null),
    { id: idOf(ctx)(), type: "timeline", name: ctx.w("obdTrack"), timeline: { style: "horizontal", source: "latest_order" }, color: K.ink, dark_color: K.darkInk, background: K.surface, dark_background: K.darkSurface, radius: R, padding: sides(18, 14, 18, 14), margin: sides(0, 14, 8, 14), entries: [step("clTrack1", "clTrack1Text", true), step("clTrack2", "clTrack2Text"), step("clTrack3", "clTrack3Text"), step("clTrack4", "clTrack4Text")] },
  ];
}

function outfitOver(screenName: string, ctx: SectionContext): StudioNode[] | null {
  switch (screenName) {
    case "search":
      return shopTop(ctx);
    case "cart":
      return cartTop(ctx);
    case "orders":
      return ordersTop(ctx);
    default:
      return null;
  }
}

/** Four tabs in the dock (Home, Shop, Saved, Account); the bag is the round button. */
export function outfitTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const out = structuredClone([...tabs])
    .filter((t) => !(t.target.type === "screen" && t.target.screen === "cart"))
    .map((t) => {
      const target = t.target.type === "screen" ? t.target.screen : null;
      if (t.id === "home") return { ...t, icon: "home" };
      if (target === "search") return { ...t, label: "Shop", icon: "checkroom" };
      if (target === "account") return { ...t, icon: "person" };
      return t;
    });
  const account = out.findIndex((t) => t.target.type === "screen" && t.target.screen === "account");
  const saved: LayoutTab = { id: "saved", label: "Wishlist", icon: "favorite", target: { type: "screen", screen: "favorites" } };
  if (!out.some((t) => t.target.type === "screen" && t.target.screen === "favorites")) out.splice(account < 0 ? out.length : account, 0, saved);
  return out;
}

/** The dock: a dark capsule in the middle, icons only, the open one a filled circle in the page's colour. */
export const OUTFIT_BAR = signatureBar(K, { design: "dock", background: K.ink, dark_background: K.darkSurface, active: K.page, dark_active: K.darkAccent, inactive: "#CFC3B5", dark_inactive: K.darkMuted, labels: "never", margin: 16 });

const OUTFIT_SCREENS = signatureScreens({
  style: "photo",
  photo: P("camel-jacket"),
  title: { en: "Your wardrobe, styled", ar: "خزانتكِ، منسّقة", tr: "Gardırobunuz, kombinlenmiş" },
  subtitle: { en: "Sign in to save outfits and follow your orders.", ar: "سجّلي الدخول لتحفظي إطلالاتكِ وتتابعي طلباتكِ.", tr: "Kombinleri kaydetmek ve siparişlerinizi izlemek için giriş yapın." },
  menu: "cover",
  accent: K.accent,
  first: ["orders", "wishlist", "notifications", "settings", "help", "privacy", "terms"],
});

/**
 * 228.7 The outfit builder's own product page: the photo as a rounded card
 * on warm linen (28 px corners, the masonry's), the moods to wear it to as
 * chips under it, its name in heavy Tajawal and its sale price, then the
 * signature, "Complete the outfit": a tinted card of the pieces that go with
 * it, a grid of two, before the sizes; the colours as swatches, the
 * quantity, the words, the delivery lines and the stars' summary; Add to my
 * bag a floating pill over the page, no bar behind it.
 */
function outfitProductPage(ctx: SectionContext) {
  const id = idOf(ctx);
  const ink = { color: K.ink, dark_color: K.darkInk } as const;
  const warm = { accent: K.fill, dark_accent: K.darkFill } as const;
  const gap = (top: number, bottom = 0) => sides(top, 18, bottom, 18);
  const outfit: StudioNode = {
    id: id(),
    type: "column",
    name: ctx.w("obdCompleteOutfit"),
    gap: 10,
    radius: R,
    padding: sides(18, 14, 16, 14),
    margin: gap(22),
    background: TINT.day,
    dark_background: TINT.night,
    children: [
      productPart(ctx, { type: "product_related", look: "grid", related: "complete_look", rows: 4, text: "obdCompleteOutfit", node: { ...ink } }),
      say(ctx, "obdOutfitLine", face(13, { weight: 500 }), { muted: true, padding: sides(0, 4, 0, 4) }),
    ],
  };
  return mixedProductPage(ctx, { background: K.page, dark_background: K.darkPage }, [
    { type: "product_gallery", look: "card", radius: R, node: { aspect_ratio: 4 / 5, margin: sides(8, 14, 0, 14) } },
    { ...moods(ctx), margin: sides(14, 0, 0, 0) },
    { type: "product_title", look: "plain", node: { ...ink, font: face(22, { line_height: 1.3 }), margin: gap(18) } },
    { type: "product_price", look: "sale", node: { color: K.accent, dark_color: K.darkAccent, font: face(19), margin: gap(4) } },
    outfit,
    { type: "product_variants", look: "grid" /* the sizes as cells; its colours draw as swatches whatever the look */, ...warm, node: { ...ink, margin: gap(24) } },
    { type: "product_quantity", look: "stepper", node: { ...ink, margin: gap(16) } },
    { type: "product_description", look: "plain", node: { ...ink, margin: gap(22) } },
    { type: "product_delivery", look: "rows", ...warm, node: { ...ink, margin: gap(18) } },
    { type: "product_reviews", look: "summary", ...warm, node: { ...ink, margin: gap(20, 96) } },
    {
      type: "product_buy",
      look: "cart",
      text: "obdAddToBag",
      ...warm,
      node: { pin: "bottom", radius: 30, padding: sides(8, 18, 14, 18), color: K.onFill, dark_color: K.darkOnFill },
    },
  ]);
}

export const OUTFIT_D: SignatureDesign = {
  demo: "clothes",
  variant: "d",
  template: { id: "clothes_signature_d", icon: "apparel", fits: { types: ["store"], plain: true } },
  home: outfitHome,
  over: outfitOver,
  tabs: outfitTabs,
  pages: (ctx) => [
    { slug: OUTFIT_MENU_PAGE, title: "obdMenu", studio: outfitMenuPage(ctx) },
    { slug: OUTFIT_SIZE_PAGE, title: "obdSizeGuide", studio: outfitSizePage(ctx) },
    // 228.7 Its own product page.
    outfitProductPage(ctx),
  ],
  bar: OUTFIT_BAR,
  look: { header: { background: K.page, color: K.ink, dark_background: K.darkPage, dark_color: K.darkInk }, background: K.page, dark_background: K.darkPage },
  chrome: { header: "search", system: "brand" },
  isNew: true,
  project: {
    primary: K.fill,
    appearance: { secondary_color: K.ink, font: "DM Sans", font_family: FACE, arabic_font: FACE, dark_background: K.darkPage, dark_surface: K.darkSurface },
    screens: OUTFIT_SCREENS,
  },
};
