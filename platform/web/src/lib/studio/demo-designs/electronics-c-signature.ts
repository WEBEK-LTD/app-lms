import { STUDIO_PRODUCT_SCREEN, type Action, LayoutTab, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { installmentsTag } from "../installments";
import { PRODUCT_PAGE_SLUG, productPart, type ProductPagePart } from "../product-page";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigPhoto, sigTexts, signatureBar, type SignatureInk } from "./food-signature-parts";
import { ELECTRONICS_COUPON_CODE, electronicsTabs } from "./electronics-signature";

/**
 * 227 Madar's look C, MADAR GRID (the electronics type's main look): the
 * home is a bento of tiles of mixed sizes, dark glass by night and frosted
 * white by day: the smart-home scene across the top with its spec chips,
 * the deal of the day beside the shop's best seller, the categories as four
 * small tiles, trade-in, the smart home and compare; then the new arrivals
 * and best sellers as glass tiles. IBM Plex Sans Arabic, one electric blue,
 * a frosted glass bar. Built only from Studio's elements, its own parts in
 * this file (none of the kit's), so every part is the owner's to change.
 */

/**
 * C · MADAR GRID: dark glass tiles in both modes, on a graphite-tinted grey
 * by day and near-black by night, one electric blue. `ink` and `muted` are
 * the tiles' words (white on glass); the page's own words, between the
 * tiles, are `PAGE_INK`.
 */
export const MADAR_GRID_INK: SignatureInk = {
  page: "#C9CFD9",
  darkPage: "#05070B",
  surface: "#161C27",
  darkSurface: "#10141C",
  ink: "#F2F5FA",
  darkInk: "#F2F5FA",
  muted: "#A9B2C2",
  darkMuted: "#A0AABB",
  line: "#2A3242",
  darkLine: "#232A37",
  accent: "#5CB8FF",
  darkAccent: "#5CB8FF",
  fill: "#0A63D6",
  darkFill: "#2F8CFF",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const K = MADAR_GRID_INK;
/** A chip's ground and a tile's soft wash. */
const CHIP = { day: "#252D3B", night: "#1A2030" };
/** The page's own words, between the tiles: graphite ink by day, white by night. */
const PAGE_INK = { color: "#0B1020", dark_color: "#F2F5FA" };
const PAGE_MUTED = { color: "#3A4253", dark_color: "#A0AABB" };
/** The pages after the home: their header on the page's graphite grey, in its ink (the look's `brand` chrome). */
const PAGE_HEADER = { background: "#C9CFD9", dark_background: "#05070B", color: "#0B1020", dark_color: "#F2F5FA", style: "brand" as const };
const PLEX = "IBM Plex Sans Arabic";
const TILE_RADIUS = 22;

const P = (name: string) => `/electronics-photos/${name}.jpg`;
const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
const tradeIn: Action = { type: "screen", screen: "search", flow: "trade_in" };
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));
export const GRID_MENU_PAGE = "menu";
export const GRID_COMPARE_PAGE = "compare";

const face = (size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: PLEX, size, weight: 700, line_height: 1.22, ...extra });
const say = (ctx: SectionContext, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode => inked(ctx, K, ctx.w(word), font, extra);
const white = { color: "#FFFFFF", dark_color: "#FFFFFF" };

/** A tile of the bento: the look's surface with its line, frosted where something lies behind it. */
function tile(extra: Partial<StudioNode> = {}): Partial<StudioNode> {
  return { radius: TILE_RADIUS, background: K.surface, dark_background: K.darkSurface, border_color: K.line, dark_border_color: K.darkLine, border_width: 1, ...extra };
}

/** A spec chip: its words on a soft wash (white glass over a photo). */
function chip(ctx: SectionContext, word: SectionWord, onPhoto = false): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "text",
    name: ctx.w(word),
    text: ctx.w(word),
    max_lines: 1,
    font: { family: PLEX, size: 11, weight: 600 },
    radius: 8,
    padding: sides(3, 8, 3, 8),
    ...(onPhoto ? { ...white, background: "#1B2433", dark_background: "#1B2433" } : { color: K.ink, dark_color: K.darkInk, background: CHIP.day, dark_background: CHIP.night }),
  };
}

/** A section's title and its link, quiet and close to the tiles. */
function head(ctx: SectionContext, title: SectionWord, link: { word: SectionWord; action: Action } | null, line?: SectionWord, padding: StudioSides = sides(22, 16, 10, 16)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    cross: "end",
    gap: 12,
    padding,
    children: [
      { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, title, face(19), { ...PAGE_INK, max_lines: 2 }), ...(line ? [say(ctx, line, { size: 12 }, { ...PAGE_MUTED, max_lines: 1 })] : [])] },
      ...(link ? [say(ctx, link.word, { size: 12.5, weight: 600 }, { color: "#0A55B8", dark_color: K.darkAccent, max_lines: 1, action: link.action })] : []),
    ],
  };
}

/** The search as the bento's first tile. */
function searchTile(ctx: SectionContext, word: SectionWord, margin = sides(4, 16, 0, 16)): StudioNode {
  return { id: idOf(ctx)(), type: "search", name: ctx.w(word), text: ctx.w(word), source: "products", height: 52, radius: 18, background: K.surface, dark_background: K.darkSurface, color: K.muted, dark_color: K.darkMuted, border_color: K.line, dark_border_color: K.darkLine, border_width: 1, margin };
}

/** A photo tile: the photo under a shade at its foot, its kicker, title and spec chips. */
function photoTile(ctx: SectionContext, photo: string, kicker: SectionWord, title: SectionWord, height: number, chips: readonly SectionWord[] = [], action: Action = shop, width: StudioNode["width"] = "fill"): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w(title),
    image_url: sigPhoto(ctx, P(photo)),
    width,
    height,
    radius: TILE_RADIUS,
    background: "#0A0F1C",
    scrim: { color: "#05070B", from: 0, middle: 0.18, at: 50, to: 0.84 },
    align: "end",
    padding: sides(14, 14, 14, 14),
    action,
    children: [
      say(ctx, kicker, { size: 11, weight: 600, letter_spacing: 0.3 }, { color: "#A9DBFF", dark_color: "#A9DBFF", max_lines: 1 }),
      say(ctx, title, face(height > 200 ? 23 : 16), { ...white, max_lines: 2, margin: sides(3, 0, 0, 0) }),
      ...(chips.length ? [{ id: id(), type: "row" as const, gap: 5, margin: sides(8, 0, 0, 0), children: chips.map((c) => chip(ctx, c, true)) }] : []),
    ],
  };
}

/** The deal tile: its kicker, headline, a bolt and a button to the shop's offers. */
function dealTile(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("ebDealKicker"),
    width: "fill",
    height: 206,
    gap: 6,
    padding: sides(14, 14, 14, 14),
    action: shop,
    ...tile({ surface: { glow: "#2F8CFF" } }),
    children: [
      { id: id(), type: "icon", icon: "bolt", icon_size: 26, color: K.accent, dark_color: K.darkAccent, background: CHIP.day, dark_background: CHIP.night, radius: 12, padding: sides(6, 6, 6, 6), self_align: "start" },
      say(ctx, "ebDealKicker", { size: 11, weight: 600 }, { muted: true, max_lines: 1, margin: sides(6, 0, 0, 0) }),
      say(ctx, "ebDealTitle", face(16.5), { max_lines: 3 }),
      { id: id(), type: "row", width: "fill", height: 1, children: [] },
      say(ctx, "ebDealButton", { size: 12.5, weight: 700 }, { accent: true, max_lines: 1 }),
    ],
  };
}

/** The best seller tile: the shop's most bought product, its photo filling the tile and its name and price on frosted glass at its foot. */
function bestTile(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w("ebBestKicker"),
    source: "products",
    layout: "list",
    width: "fill",
    gap: 0,
    query: { limit: 1, category_id: null, featured: false, sort: "popular", ids: [] },
    card: {
      id: id(),
      type: "stack",
      width: "fill",
      height: 206,
      ...tile(),
      children: [
        { id: id(), type: "image", bind: "image", width: "fill", height: 206, radius: TILE_RADIUS, fit: "cover", background: CHIP.day, dark_background: CHIP.night },
        { id: id(), type: "text", text: ctx.w("ebBestKicker"), max_lines: 1, font: { size: 10.5, weight: 700 }, color: K.onFill, dark_color: K.darkOnFill, background: K.fill, dark_background: K.darkFill, radius: 8, padding: sides(3, 7, 3, 7), place: { x: 6, y: 5 } },
        {
          id: id(),
          type: "column",
          width: "fill",
          gap: 1,
          padding: sides(8, 10, 9, 10),
          corners: { top_start: 0, top_end: 0, bottom_start: TILE_RADIUS, bottom_end: TILE_RADIUS },
          background: K.surface,
          dark_background: K.darkSurface,
          surface: { glass: 16, tint: 0.5 },
          place: { x: 0, y: 72 },
          children: [
            { id: id(), type: "text", bind: "title", max_lines: 1, color: K.ink, dark_color: K.darkInk, font: { family: PLEX, size: 12, weight: 600 } },
            { id: id(), type: "text", bind: "price", max_lines: 2, color: K.ink, dark_color: K.darkInk, font: { family: PLEX, size: 14, weight: 700 } },
          ],
        },
      ],
    },
  };
}

/** Two tiles side by side. */
function pair(ctx: SectionContext, a: StudioNode, b: StudioNode, margin = sides(10, 16, 0, 16)): StudioNode {
  return { id: idOf(ctx)(), type: "row", gap: 10, margin, children: [a, b] };
}

/** The trade-in tile (the `trade_in` element: the estimator a tap away, nothing until the shop takes trade-ins). */
function tradeTile(ctx: SectionContext): StudioNode {
  const t = sigTexts(ctx, { text: "ebTradeTitle" });
  return {
    id: idOf(ctx)(),
    type: "trade_in",
    name: ctx.w("ebTradeTitle"),
    text: t.text,
    translations: t.translations,
    tech: { look: "card", accent: K.fill },
    color: K.ink,
    dark_color: K.darkInk,
    ...tile(),
    padding: sides(16, 16, 16, 16),
    margin: sides(10, 16, 0, 16),
    action: tradeIn,
  };
}

/** The compare tile: an icon, its words and a link to the compare page. */
function compareTile(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("ebCompare"),
    width: 112,
    height: 150,
    gap: 8,
    align: "center",
    cross: "center",
    padding: sides(12, 10, 12, 10),
    action: ownPage(ctx, GRID_COMPARE_PAGE),
    ...tile(),
    children: [
      { id: id(), type: "icon", icon: "compare_arrows", icon_size: 28, color: K.accent, dark_color: K.darkAccent },
      say(ctx, "ebCompare", { size: 12, weight: 700, line_height: 1.25 }, { text_align: "center", max_lines: 3 }),
    ],
  };
}

/** A product as a glass tile: its photo, its key line as a chip, its name and price. */
function productTile(ctx: SectionContext, width: StudioNode["width"], height: number): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    width,
    gap: 6,
    padding: sides(8, 8, 12, 8),
    ...tile(),
    children: [
      {
        id: id(),
        type: "stack",
        width: "fill",
        height,
        children: [
          { id: id(), type: "image", bind: "image", width: "fill", height, radius: 16, fit: "cover", background: CHIP.day, dark_background: CHIP.night },
          { id: id(), type: "text", bind: "sale", font: { size: 10.5, weight: 800 }, color: K.onFill, dark_color: K.darkOnFill, background: K.fill, dark_background: K.darkFill, radius: 8, padding: sides(3, 7, 3, 7), place: { x: 5, y: 5 } },
        ],
      },
      { id: id(), type: "text", bind: "subtitle", max_lines: 1, font: { family: PLEX, size: 10.5, weight: 600 }, color: K.ink, dark_color: K.darkInk, background: CHIP.day, dark_background: CHIP.night, radius: 7, padding: sides(2, 7, 2, 7), self_align: "start", margin: sides(2, 4, 0, 4) },
      { id: id(), type: "text", bind: "title", max_lines: 2, color: K.ink, dark_color: K.darkInk, font: { family: PLEX, size: 13, weight: 600, line_height: 1.3 }, padding: sides(0, 4, 0, 4) },
      {
        id: id(),
        type: "row",
        gap: 6,
        cross: "center",
        padding: sides(0, 4, 0, 4),
        children: [
          { id: id(), type: "text", bind: "price", max_lines: 2, color: K.ink, dark_color: K.darkInk, font: { family: PLEX, size: 14.5, weight: 700 } },
          { id: id(), type: "text", bind: "was_price", max_lines: 1, color: K.muted, dark_color: K.darkMuted, font: { size: 11.5 } },
        ],
      },
    ],
  };
}

function productRow(ctx: SectionContext, name: SectionWord, sort: "newest" | "popular"): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w(name), source: "products", layout: "carousel", gap: 10, padding: sides(0, 16, 0, 16), query: { limit: 8, category_id: null, featured: false, sort, ids: [] }, card: productTile(ctx, 172, 150) };
}

function productGrid(ctx: SectionContext, name: SectionWord): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w(name), source: "products", layout: "grid", columns: 2, gap: 10, padding: sides(0, 16, 0, 16), query: { limit: 4, category_id: null, featured: false, sort: "price_desc", ids: [] }, card: productTile(ctx, "fill", 140) };
}

/** Two products spec by spec (the `compare` element), as one wide tile. */
function compareBlock(ctx: SectionContext, margin = sides(0, 16, 0, 16)): StudioNode {
  return { id: idOf(ctx)(), type: "compare", name: ctx.w("ebCompare"), tech: { accent: K.fill, rows: 5 }, color: K.ink, dark_color: K.darkInk, ...tile(), padding: sides(14, 14, 14, 14), margin };
}

/** A small square tile with an icon: the header tile's menu and bag. */
function iconTile(ctx: SectionContext, icon: string, name: SectionWord, action: Action): StudioNode {
  return { id: idOf(ctx)(), type: "icon", name: ctx.w(name), icon, icon_size: 22, color: K.ink, dark_color: K.darkInk, background: CHIP.day, dark_background: CHIP.night, radius: 14, padding: sides(11, 11, 11, 11), action };
}

/** The home's header is the bento's first tile: the wordmark and its line, the category menu and the bag as small tiles (no bar over the page). */
function headerTile(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("ebWordmark"),
    gap: 8,
    cross: "center",
    padding: sides(12, 12, 12, 16),
    margin: sides(6, 16, 0, 16),
    ...tile(),
    children: [
      { id: id(), type: "column", width: "fill", gap: 0, children: [say(ctx, "ebWordmark", face(22, { letter_spacing: 0.4 }), { max_lines: 1 }), say(ctx, "ebHeadLine", { size: 11, weight: 600, letter_spacing: 0.3 }, { accent: true, max_lines: 1 })] },
      iconTile(ctx, "grid_view", "ebMenu", ownPage(ctx, GRID_MENU_PAGE)),
      iconTile(ctx, "shopping_bag", "ebBag", screen("cart")),
    ],
  };
}

export function madarGridHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 104, 0),
      children: [
        headerTile(ctx),
        { ...searchTile(ctx, "ebSearch"), margin: sides(10, 16, 0, 16) },
        { ...photoTile(ctx, "w-tv-room", "ebSceneKicker", "ebSceneTitle", 244, ["ebChipScreen", "ebChipSound", "ebChipWifi"]), margin: sides(10, 16, 0, 16) },
        pair(ctx, dealTile(ctx), bestTile(ctx)),
        {
          id: id(),
          type: "categories",
          name: ctx.w("ebCategories"),
          source: "products",
          style: "circles",
          color: K.ink,
          dark_color: K.darkInk,
          background: K.surface,
          dark_background: K.darkSurface,
          border_color: K.line,
          dark_border_color: K.darkLine,
          border_width: 1,
          radius: TILE_RADIUS,
          padding: sides(8, 6, 8, 6),
          margin: sides(10, 16, 0, 16),
        },
        tradeTile(ctx),
        pair(ctx, photoTile(ctx, "w-vr-headset", "ebHomeKicker", "ebHomeTitle", 150), compareTile(ctx)),
        head(ctx, "ebNewIn", { word: "ebSeeAll", action: shop }),
        productRow(ctx, "ebNewIn", "newest"),
        head(ctx, "ebGaming", null),
        pair(ctx, photoTile(ctx, "gamepad-blue", "ebGamingKicker", "ebGaming", 170), photoTile(ctx, "camera-night", "ebCreatorsKicker", "ebCreators", 170), sides(0, 16, 0, 16)),
        head(ctx, "ebBest", { word: "ebSeeAll", action: shop }, "ebBestLine"),
        productGrid(ctx, "ebBest"),
      ],
    },
  };
}

// ——— The pages after the home ———

/** One small tile of the menu's foot: an icon over its word. */
function menuTile(ctx: SectionContext, word: SectionWord, icon: string, action: Action): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    height: 84,
    gap: 6,
    align: "between",
    padding: sides(12, 12, 12, 12),
    action,
    ...tile({ radius: 18 }),
    children: [
      { id: id(), type: "icon", icon, icon_size: 22, color: K.accent, dark_color: K.darkAccent },
      say(ctx, word, { size: 12.5, weight: 700 }, { max_lines: 1 }),
    ],
  };
}

/**
 * The category menu (the header's menu button opens it): the search, every
 * main category a row of cards (its photo and name, its sub-categories
 * sliding after it), then the account, orders, wishlist, language and how
 * to reach the shop as bento tiles.
 */
export function gridMenuPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "ebWordmark" });
  return {
    header: { type: "logo_center", title: t.title, translations: t.translations, buttons: ["search"], ...PAGE_HEADER },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        searchTile(ctx, "ebMenuSearch", sides(4, 16, 6, 16)),
        { id: id(), type: "categories", name: ctx.w("ebMenu"), source: "products", style: "rows", category_menu: { look: "lead", radius: 18, numbers: false }, ...PAGE_INK, padding: sides(6, 0, 6, 0) },
        { id: id(), type: "row", gap: 10, margin: sides(14, 16, 0, 16), children: [menuTile(ctx, "ebAccount", "person", screen("account")), menuTile(ctx, "ebOrders", "package_2", screen("orders")), menuTile(ctx, "ebWishlist", "favorite", screen("favorites"))] },
        { id: id(), type: "row", gap: 10, margin: sides(10, 16, 0, 16), children: [menuTile(ctx, "ebLanguage", "language", screen("settings")), { ...menuTile(ctx, "ebContact", "support_agent", screen("account")), width: "fill" }] },
        { ...say(ctx, "ebContactLine", { size: 12 }, { ...PAGE_MUTED, max_lines: 2 }), padding: sides(8, 18, 0, 18) },
      ],
    },
  };
}

/** The compare page: two products side by side, then the first one's whole specifications. */
export function gridComparePage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "ebComparePage" });
  const s = sigTexts(ctx, { text: "ebSpecs" });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...PAGE_HEADER },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { ...say(ctx, "ebCompareLine", { size: 13.5 }, { ...PAGE_MUTED }), padding: sides(8, 16, 10, 16) },
        compareBlock(ctx),
        head(ctx, "ebSpecs", null),
        { id: id(), type: "spec_table", name: ctx.w("ebSpecs"), text: s.text, translations: s.translations, tech: { rows: 12 }, color: K.ink, dark_color: K.darkInk, ...tile(), padding: sides(14, 16, 14, 16), margin: sides(0, 16, 0, 16) },
      ],
    },
  };
}

/** Over the shop: its categories as chips, and a wide photo tile. */
function shopTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "categories", name: ctx.w("ebCategories"), source: "products", style: "chips", ...PAGE_INK, padding: sides(4, 12, 4, 12) },
    { id: id(), type: "listing_filters", name: ctx.w("ebShopTitle"), ...PAGE_INK, padding: sides(4, 16, 4, 16) },
    { ...photoTile(ctx, "w-laptop-chart", "ebShopKicker", "ebShopTitle", 132), margin: sides(6, 16, 8, 16) },
  ];
}

/** Over the cart: the shop's code, its returns and warranty, installments coming soon. */
function cartTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "coupon", name: ctx.w("elCoupon"), code: ELECTRONICS_COUPON_CODE, coupon: { look: "glass", bind: "public" }, radius: 18, color: K.fill, margin: sides(10, 16, 4, 16) },
    {
      id: id(),
      type: "column",
      name: ctx.w("elReturnsNote"),
      gap: 10,
      padding: sides(12, 14, 12, 14),
      margin: sides(8, 16, 4, 16),
      ...tile({ radius: 18 }),
      children: [
        { id: id(), type: "row", gap: 10, cross: "center", children: [{ id: id(), type: "icon", icon: "verified", icon_size: 22, color: K.accent, dark_color: K.darkAccent }, say(ctx, "elReturnsNote", { size: 13, weight: 600, line_height: 1.4 }, { width: "fill", max_lines: 3 })] },
        installmentsTag(ctx, { color: K.muted, dark_color: K.darkMuted, background: CHIP.day, dark_background: CHIP.night }),
      ],
    },
  ];
}

/** Over the orders: how an order travels, as a glass tile (the person's newest order, else the first step lit). */
function ordersTop(ctx: SectionContext): StudioNode[] {
  const step = (title: SectionWord, text: SectionWord, highlight = false) => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    head(ctx, "elTrack", null, undefined, sides(10, 16, 8, 16)),
    {
      id: idOf(ctx)(),
      type: "timeline",
      name: ctx.w("elTrack"),
      timeline: { style: "vertical", source: "latest_order" },
      color: K.ink,
      dark_color: K.darkInk,
      ...tile(),
      padding: sides(16, 14, 16, 14),
      margin: sides(0, 16, 6, 16),
      entries: [step("elTrack1", "elTrack1Text", true), step("elTrack2", "elTrack2Text"), step("elTrack3", "elTrack3Text"), step("elTrack4", "elTrack4Text")],
    },
  ];
}

/** The bento's tabs: the electronics shop's five, a grid of tiles for Home. */
export function gridTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  return electronicsTabs(tabs).map((t) => (t.id === "home" ? { ...t, icon: "dashboard" } : t.target.type === "screen" && t.target.screen === "search" ? { ...t, icon: "devices" } : t));
}

function gridOver(screenName: string, ctx: SectionContext): StudioNode[] | null {
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

function gridProductPage(ctx: SectionContext): { slug: string; title: SectionWord; studio: StudioPage } {
  const id = idOf(ctx);
  const part = (p: ProductPagePart): StudioNode => productPart(ctx, p);
  // Words in the tiles white on dark glass, by day and by night.
  const glassInk = { color: K.ink, dark_color: K.darkInk } as const;
  const blue = { accent: "#5CB8FF", dark_accent: "#5CB8FF" } as const;
  const glassTile = (children: StudioNode[], extra: Partial<StudioNode> = {}): StudioNode => ({ id: id(), type: "column", gap: 8, padding: sides(14, 14, 14, 14), ...tile(), ...extra, children });
  // The tiles whose rows and fine print the app draws in its own day and night colours: frosted light glass by day, dark glass by night.
  const frost = { background: "#EEF1F6", border_color: "#AEB7C6" } as const;
  const frostTile = (children: StudioNode[]): StudioNode => glassTile(children, frost);
  return {
    slug: PRODUCT_PAGE_SLUG,
    title: "pProductPage" as SectionWord,
    studio: {
      background: K.page,
      dark_background: K.darkPage,
      show_tabs: false,
      screen: STUDIO_PRODUCT_SCREEN,
      body: {
        id: id(),
        type: "column",
        gap: 10,
        padding: sides(56, 16, 24, 16),
        children: [
          // 227 The bento of the product: its photos, name, price and choices in dark glass tiles, its specs, delivery, reviews and story in frosted ones by day.
          glassTile([part({ type: "product_gallery", look: "card", radius: 18, node: { aspect_ratio: 1 } })], { padding: sides(8, 8, 8, 8) }),
          {
            id: id(),
            type: "row",
            gap: 10,
            children: [
              glassTile(
                [
                  say(ctx, "ebPpKicker", { family: PLEX, size: 11, weight: 600, letter_spacing: 0.4 }, { accent: true, max_lines: 1 }),
                  part({ type: "product_title", look: "plain", node: { ...glassInk, font: face(19, { weight: 700 }) } }),
                  part({ type: "product_price", look: "from", node: { ...glassInk, font: face(20, { weight: 700 }) } }),
                ],
                { width: "fill" },
              ),
            ],
          },
          glassTile([part({ type: "product_variants", look: "chips", ...blue, node: { ...glassInk } }), part({ type: "product_quantity", look: "pill", node: { ...glassInk, margin: sides(6, 0, 0, 0) } })]),
          frostTile([say(ctx, "ebSpecs", face(15), { ...PAGE_INK, max_lines: 1 }), part({ type: "product_specs", look: "table", rows: 10, node: { ...PAGE_INK } })]),
          frostTile([part({ type: "product_delivery", look: "rows", accent: "#1F6FD1", dark_accent: "#5CB8FF", node: { ...PAGE_INK } })]),
          frostTile([part({ type: "product_reviews", look: "summary", accent: "#1F6FD1", dark_accent: "#5CB8FF", node: { ...PAGE_INK } })]),
          frostTile([part({ type: "product_description", look: "accordion", node: { ...PAGE_INK } })]),
          part({ type: "product_related", look: "carousel", rows: 8, node: { color: PAGE_INK.color, dark_color: PAGE_INK.dark_color, margin: sides(10, 0, 80, 0) } }),
          part({ type: "product_buy", look: "price", ...blue, node: { pin: "bottom", ...PAGE_INK, radius: 20, padding: sides(10, 14, 10, 14), background: "#EEF1F6", dark_background: "#121823", border_color: "#AEB7C6", dark_border_color: K.darkLine, border_width: 1 } }),
        ],
      },
    },
  };
}

const GRID_SCREENS = signatureScreens({
  style: "premium",
  photo: P("w-tv-room"),
  title: { en: "Your devices, in one place", ar: "أجهزتك في مكان واحد", tr: "Cihazlarınız tek yerde" },
  subtitle: { en: "Sign in to follow your orders and your warranty.", ar: "سجّل الدخول لتتابع طلباتك وضمانك.", tr: "Siparişlerinizi ve garantinizi takip etmek için giriş yapın." },
  menu: "tiles",
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** C's bar: dark frosted glass floating over the tiles by day and by night, the open tab electric blue. */
export const MADAR_GRID_BAR = signatureBar(K, { design: "glass", background: "#121823", dark_background: "#10141C", active: "#5CB8FF", dark_active: "#5CB8FF", inactive: "#8E98AA", dark_inactive: "#8E98AA", labels: "always", radius: 24, margin: 14 });

export const MADAR_GRID_C: SignatureDesign = {
  demo: "electronics",
  variant: "c",
  template: { id: "electronics_signature_c", icon: "dashboard", fits: { types: ["store"], plain: true } },
  home: madarGridHome,
  over: gridOver,
  tabs: gridTabs,
  pages: (ctx) => [
    // 227 Its own product page (228.7): the product as a bento of dark glass tiles.
    gridProductPage(ctx),
    { slug: GRID_MENU_PAGE, title: "ebMenu", studio: gridMenuPage(ctx) },
    { slug: GRID_COMPARE_PAGE, title: "ebComparePage", studio: gridComparePage(ctx) },
  ],
  bar: MADAR_GRID_BAR,
  look: { header: { background: PAGE_HEADER.background, dark_background: PAGE_HEADER.dark_background, color: PAGE_HEADER.color, dark_color: PAGE_HEADER.dark_color }, background: K.page, dark_background: K.darkPage },
  chrome: { header: "brand", system: "glass" },
  isNew: true,
  project: {
    primary: K.fill,
    appearance: { secondary_color: "#0A0F1C", font: "Manrope", font_family: PLEX, dark_background: K.darkPage, dark_surface: K.darkSurface },
    screens: GRID_SCREENS,
  },
};
