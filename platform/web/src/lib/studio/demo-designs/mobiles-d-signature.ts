import type { Action, StudioEntry, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigTexts, signatureBar, type SignatureInk } from "./food-signature-parts";
import { clothesTabs, MENU_PAGE } from "./clothes-signature";

/**
 * 226 Nova's look D, the DEALS HUB (the owner, 23 November 2026: every type
 * gets two new templates that look like no other): a bright white, dense,
 * fast shop. A search header, the brands as a row of chips, today's deals
 * on a hot pink card with their live countdown (the shop's flash sale), the
 * departments, the best sellers as a dense grid of three columns whose
 * cards lead with "Installments coming soon" (a notice, never a way to
 * pay), a dark compare tray that opens the compare page, the shop by
 * storage, the installments notice and the lowest prices first. Square
 * corners kept small, thin grey lines, hot pink and a flash yellow. Its bar
 * is a row of squares, the open one filled pink. Almarai. Built only from
 * Studio's elements; the brands are the owner's (in brackets; the demo
 * fills them), the sale, the products and the specs the shop's own.
 */

export const HUB_INK: SignatureInk = {
  page: "#FFFFFF",
  darkPage: "#0E0F13",
  surface: "#F3F4F6",
  darkSurface: "#1A1C22",
  ink: "#111318",
  darkInk: "#F4F5F7",
  muted: "#5E6470",
  darkMuted: "#A3A8B3",
  line: "#E6E8EC",
  darkLine: "#2A2D35",
  accent: "#D70F3D",
  darkAccent: "#FF5C7A",
  fill: "#FF2D55",
  darkFill: "#FF2D55",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const K = HUB_INK;
const HOT = "#FF2D55";
const ZAP = "#FFD60A";
const GOOD = { day: "#00875A", night: "#3DDC97", soft: "#E3F6EE", darkSoft: "#12271F" };
const FACE = "Almarai";
const COMPARE_PAGE = "compare";

const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));

const font = (size: number, weight: NonNullable<StudioFont["weight"]> = 700, extra: Partial<StudioFont> = {}): StudioFont => ({ family: FACE, size, weight, line_height: 1.3, ...extra });
const white = { color: "#FFFFFF", dark_color: "#FFFFFF" } as const;

function say(ctx: SectionContext, word: SectionWord, f: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, K, ctx.w(word), f, extra);
}

/** A dense section title, its link in pink at its end. */
function head(ctx: SectionContext, title: SectionWord, link?: { word: SectionWord; action: Action }, padding: StudioSides = sides(22, 12, 10, 12)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    gap: 8,
    cross: "center",
    padding,
    children: [say(ctx, title, font(18, 800), { width: "fill", max_lines: 1 }), ...(link ? [say(ctx, link.word, font(12.5, 700), { accent: true, max_lines: 1, action: link.action })] : [])],
  };
}

/** The brands as chips, "All" filled ink, the owner's brands outlined (each opening the shop). */
function brands(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const chip = (word: SectionWord, lit: boolean): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(word),
    height: 34,
    radius: 8,
    cross: "center",
    padding: sides(0, 14, 0, 14),
    action: shop,
    ...(lit ? { background: K.ink, dark_background: K.darkInk } : { border_color: K.line, dark_border_color: K.darkLine, border_width: 1.5 }),
    children: [{ ...say(ctx, word, font(13, 800, { letter_spacing: 0.3 }), { max_lines: 1 }), ...(lit ? { color: K.page, dark_color: K.darkPage } : {}) }],
  });
  return { id: id(), type: "row", name: ctx.w("mbBrands"), gap: 6, scroll: true, padding: sides(6, 12, 4, 12), children: [chip("mbHubAll", true), chip("mbBrand1", false), chip("mbBrand2", false), chip("mbBrand3", false), chip("mbBrand4", false)] };
}

/** The shop's own categories as dense chips ("All" first, each opening its category): the home's quick row. */
function catChips(ctx: SectionContext, padding = sides(6, 10, 4, 10)): StudioNode {
  return { id: idOf(ctx)(), type: "categories", name: ctx.w("mbHubCats"), source: "products", style: "chips", color: K.ink, dark_color: K.darkInk, font: { family: FACE }, padding };
}

/** Today's deals: a hot pink card, the bolt and its words, then the shop's flash sale (its countdown and stock bars) on white. */
function deals(ctx: SectionContext, margin = sides(8, 12, 0, 12)): StudioNode {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { text: "mbHubDeals" });
  return {
    id: id(),
    type: "column",
    name: ctx.w("mbHubDeals"),
    gap: 10,
    radius: 16,
    padding: sides(6, 6, 6, 6),
    margin,
    background: HOT,
    dark_background: "#C8143D",
    children: [
      { id: id(), type: "flash_sale", name: ctx.w("mbDeal"), text: t.text, translations: t.translations, flash_sale: { look: "carousel", limit: 1, countdown: true, stock_bar: true, accent: HOT }, font: { family: FACE }, background: K.page, dark_background: K.darkPage, radius: 12, padding: sides(8, 8, 8, 8) },
      // The rest of what is on sale, as the hub's dense cards (their names on two lines).
      { id: id(), type: "items", name: ctx.w("mbHubDealsLine"), source: "products", layout: "carousel", gap: 8, padding: sides(0, 0, 2, 0), query: { limit: 8, category_id: null, featured: false, sort: "popular", ids: [], on_sale: true }, card: { ...denseCard(ctx), width: 132 } },
    ],
  };
}

/** A product as a dense card: its photo on grey, "Installments coming soon" first, its name, its price bold, its old price. */
function denseCard(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    width: "fill",
    gap: 0,
    radius: 12,
    border_color: K.line,
    dark_border_color: K.darkLine,
    border_width: 1.5,
    background: K.page,
    dark_background: K.darkSurface,
    children: [
      {
        id: id(),
        type: "stack",
        width: "fill",
        height: 108,
        children: [
          { id: id(), type: "image", bind: "image", width: "fill", height: 108, corners: { top_start: 11, top_end: 11 }, fit: "cover", background: K.surface, dark_background: "#24262D" },
          { id: id(), type: "text", bind: "sale", font: font(10.5, 800), color: "#111318", dark_color: "#111318", background: ZAP, dark_background: ZAP, radius: 5, padding: sides(2, 5, 2, 5), place: { x: 5, y: 6 } },
        ],
      },
      {
        id: id(),
        type: "column",
        gap: 3,
        padding: sides(7, 7, 8, 7),
        children: [
          { id: id(), type: "text", text: ctx.w("installmentsSoon"), max_lines: 1, font: font(9.5, 700), color: GOOD.day, dark_color: GOOD.night, background: GOOD.soft, dark_background: GOOD.darkSoft, radius: 5, padding: sides(2, 5, 2, 5), self_align: "start" },
          { id: id(), type: "text", bind: "title", max_lines: 2, color: K.ink, dark_color: K.darkInk, font: font(11.5, 700), margin: sides(2, 0, 0, 0) },
          { id: id(), type: "text", bind: "price", max_lines: 2, color: K.ink, dark_color: K.darkInk, font: font(12.5, 800) },
          { id: id(), type: "text", bind: "was_price", max_lines: 1, color: K.muted, dark_color: K.darkMuted, font: font(10.5, 400) },
        ],
      },
    ],
  };
}

function denseGrid(ctx: SectionContext, name: SectionWord, sort: "popular" | "price_asc" | "newest", limit = 6): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w(name), source: "products", layout: "grid", columns: 3, gap: 8, padding: sides(0, 12, 0, 12), query: { limit, category_id: null, featured: false, sort, ids: [] }, card: denseCard(ctx) };
}

/** The compare tray: a dark bar, its icon, its words and a pink button opening the compare page. */
function tray(ctx: SectionContext, margin = sides(16, 12, 0, 12)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("mbHubTray"),
    gap: 10,
    cross: "center",
    radius: 14,
    padding: sides(10, 10, 10, 12),
    margin,
    background: "#111318",
    dark_background: "#22252D",
    action: ownPage(ctx, COMPARE_PAGE),
    children: [
      { id: id(), type: "row", width: 42, height: 42, radius: 10, align: "center", cross: "center", border_color: "#4A4F5A", dark_border_color: "#4A4F5A", border_width: 1.5, children: [{ id: id(), type: "icon", icon: "compare_arrows", icon_size: 22, ...white }] },
      { id: id(), type: "column", width: "fill", gap: 1, children: [say(ctx, "mbHubTray", font(14, 800), { ...white, max_lines: 1 }), say(ctx, "mbHubTrayLine", font(11.5, 400), { color: "#B9BDC6", dark_color: "#B9BDC6", max_lines: 1 })] },
      { id: id(), type: "button", name: ctx.w("mbHubTrayButton"), text: ctx.w("mbHubTrayButton"), width: "hug", height: 40, radius: 10, padding: sides(0, 14, 0, 14), background: HOT, dark_background: HOT, ...white, font: font(13, 800), motion: { press: "shrink" }, action: ownPage(ctx, COMPARE_PAGE) },
    ],
  };
}

/** The installments notice: a soft green card, never a way to pay. */
function soon(ctx: SectionContext, margin = sides(14, 12, 0, 12)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("installmentsSoon"),
    gap: 12,
    cross: "center",
    radius: 14,
    padding: sides(12, 12, 12, 12),
    margin,
    background: GOOD.soft,
    dark_background: GOOD.darkSoft,
    border_color: GOOD.day,
    dark_border_color: GOOD.night,
    border_width: 1.5,
    children: [
      { id: id(), type: "icon", icon: "calendar_month", icon_size: 28, color: GOOD.day, dark_color: GOOD.night },
      { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, "mbHubSoon", font(14, 800), { color: GOOD.day, dark_color: GOOD.night, max_lines: 1 }), say(ctx, "mbHubSoonLine", font(12, 400), { max_lines: 2 })] },
    ],
  };
}

/** The shop by storage (`spec_filter`, the shop's own storages). */
function storage(ctx: SectionContext): StudioNode {
  const t = sigTexts(ctx, { text: "mbHubStorage" });
  return { id: idOf(ctx)(), type: "spec_filter", name: ctx.w("mbHubStorage"), text: t.text, translations: t.translations, tech: { spec: "storage", accent: HOT }, font: { family: FACE }, color: K.ink, dark_color: K.darkInk, margin: sides(18, 12, 0, 12) };
}

// ——— The home ———

/** The home's own header, made of elements, first on the page: a square menu button, the shop's search filling the row, a pink compare button. */
function topBar(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const square = (icon: string, action: Action, hot = false): StudioNode => ({ id: id(), type: "row", width: 44, height: 44, radius: 10, align: "center", cross: "center", action, ...(hot ? { background: HOT, dark_background: HOT } : { background: K.surface, dark_background: K.darkSurface }), children: [{ id: id(), type: "icon", icon, icon_size: 22, ...(hot ? white : { color: K.ink, dark_color: K.darkInk }) }] });
  return {
    id: id(),
    type: "row",
    name: ctx.w("mbWordmark"),
    gap: 8,
    cross: "center",
    padding: sides(6, 12, 8, 12),
    background: K.page,
    dark_background: K.darkPage,
    children: [
      square("menu_open", ownPage(ctx, MENU_PAGE)),
      { id: id(), type: "search", name: ctx.w("mbHubSearch"), text: ctx.w("mbHubSearch"), source: "products", width: "fill", radius: 10, height: 44, background: K.surface, dark_background: K.darkSurface, color: K.muted, dark_color: K.darkMuted },
      square("compare_arrows", ownPage(ctx, COMPARE_PAGE), true),
    ],
  };
}

export function hubHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    header: null,
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 100, 0),
      children: [
        topBar(ctx),
        catChips(ctx),
        deals(ctx),
        head(ctx, "mbHubCats"),
        { id: id(), type: "categories", name: ctx.w("mbHubCats"), source: "products", style: "pictures", color: K.ink, dark_color: K.darkInk, font: { family: FACE }, padding: sides(0, 8, 0, 8) },
        head(ctx, "mbHubBest", { word: "mbHubSeeAll", action: shop }),
        denseGrid(ctx, "mbHubBest", "popular"),
        tray(ctx),
        storage(ctx),
        soon(ctx),
        head(ctx, "mbHubBudget", { word: "mbHubSeeAll", action: shop }),
        denseGrid(ctx, "mbHubBudget", "price_asc"),
      ],
    },
  };
}

// ——— The pages after the home ———

/** One of the menu's square tiles: its icon on a soft square, its words. */
function tile(ctx: SectionContext, word: SectionWord, icon: string, action: Action): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w(word),
    gap: 6,
    cross: "center",
    radius: 12,
    padding: sides(12, 4, 10, 4),
    background: K.surface,
    dark_background: K.darkSurface,
    action,
    children: [{ id: id(), type: "icon", icon, icon_size: 24, color: K.ink, dark_color: K.darkInk }, say(ctx, word, font(11.5, 700), { max_lines: 1, text_align: "center" })],
  };
}

/**
 * The category menu: the wordmark and the search, the brands, every main
 * category of the shop a row of cards (its "All" card, then its
 * sub-categories, sliding), then the account, the orders, the wishlist and
 * the language as square tiles, and the contact on pink.
 */
export function hubMenuPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "mbWordmark" });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk, style: "search", collapse: false },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 36, 0),
      children: [
        { id: id(), type: "categories", name: ctx.w("mbCategoryMenu"), source: "products", style: "rows", category_menu: { look: "lead", radius: 12 }, color: K.ink, dark_color: K.darkInk, font: { family: FACE }, padding: sides(8, 0, 6, 0) },
        {
          id: id(),
          type: "grid",
          name: ctx.w("mbMenuAccount"),
          columns: 4,
          gap: 8,
          padding: sides(16, 12, 0, 12),
          children: [tile(ctx, "mbAccount", "person", screen("account")), tile(ctx, "mbOrders", "receipt_long", screen("orders")), tile(ctx, "mbHubWishlist", "favorite", screen("favorites")), tile(ctx, "mbLanguage", "language", screen("settings"))],
        },
        {
          id: id(),
          type: "row",
          name: ctx.w("mbContact"),
          gap: 12,
          cross: "center",
          radius: 14,
          padding: sides(12, 14, 12, 14),
          margin: sides(10, 12, 0, 12),
          background: HOT,
          dark_background: "#C8143D",
          action: screen("account"),
          children: [
            { id: id(), type: "icon", icon: "support_agent", icon_size: 24, ...white },
            { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, "mbContact", font(14, 800), { ...white, max_lines: 1 }), say(ctx, "mbContactLine", font(11.5, 400), { ...white, max_lines: 2 })] },
            { id: id(), type: "icon", icon: "chat", icon_size: 22, ...white },
          ],
        },
      ],
    },
  };
}

/** The compare page: two phones side by side (the `compare` element), then the shop by storage. */
export function hubComparePage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "mbHubCompareTitle" });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 36, 0),
      children: [
        say(ctx, "mbHubCompareLine", font(13, 400), { muted: true, max_lines: 3, padding: sides(6, 12, 10, 12) }),
        { id: id(), type: "compare", name: ctx.w("mbHubCompareTitle"), tech: { accent: HOT, rows: 8 }, font: { family: FACE }, color: K.ink, dark_color: K.darkInk, background: K.page, dark_background: K.darkSurface, border_color: K.line, dark_border_color: K.darkLine, border_width: 1.5, radius: 14, padding: sides(12, 10, 12, 10), margin: sides(0, 12, 0, 12) },
        storage(ctx),
        soon(ctx),
      ],
    },
  };
}

/** Over the shop: the brands, the shop's filters and the shop by storage. */
function listTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [head(ctx, "mbHubListTitle", undefined, sides(8, 12, 2, 12)), catChips(ctx), { id: id(), type: "listing_filters", name: ctx.w("mbHubListTitle"), padding: sides(4, 12, 4, 12) }, storage(ctx)];
}

/** Over the cart: the shop's code, the delivery note and the installments notice. */
function cartTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "coupon", name: ctx.w("mbCoupon"), coupon: { look: "ticket", bind: "public" }, radius: 12, color: HOT, margin: sides(10, 12, 4, 12) },
    { id: id(), type: "row", name: ctx.w("mbHubCartLine"), gap: 10, cross: "center", radius: 12, padding: sides(12, 12, 12, 12), margin: sides(8, 12, 0, 12), background: K.surface, dark_background: K.darkSurface, children: [{ id: id(), type: "icon", icon: "local_shipping", icon_size: 22, color: HOT, dark_color: HOT }, say(ctx, "mbHubCartLine", font(12.5, 700), { width: "fill", max_lines: 3 })] },
    soon(ctx, sides(8, 12, 6, 12)),
  ];
}

/** Over the orders: the order's way on grey (the person's newest order, else the first step lit). */
function ordersTop(ctx: SectionContext): StudioNode[] {
  const step = (title: SectionWord, t: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text: t }, highlight ? { highlight: true } : {});
  return [
    head(ctx, "mbTrack", undefined, sides(10, 12, 8, 12)),
    { id: idOf(ctx)(), type: "timeline", name: ctx.w("mbTrack"), timeline: { style: "vertical", source: "latest_order" }, color: K.ink, dark_color: K.darkInk, font: { family: FACE }, background: K.surface, dark_background: K.darkSurface, radius: 14, padding: sides(14, 12, 14, 12), margin: sides(0, 12, 8, 12), entries: [step("mbTrack1", "mbTrack1Text", true), step("mbTrack2", "mbTrack2Text"), step("mbTrack3", "mbTrack3Text"), step("mbTrack4", "mbTrack4Text")] },
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

const HUB_SCREENS = signatureScreens({
  style: "classic",
  photo: "/mobiles-photos/phone-hand-grey.jpg",
  title: { en: "Today's best prices", ar: "أفضل أسعار اليوم", tr: "Bugünün en iyi fiyatları" },
  subtitle: { en: "Sign in to follow your orders, your deals and your wishlist.", ar: "سجّل الدخول لتتابع طلباتك وعروضك ومفضّلتك.", tr: "Siparişlerinizi, fırsatlarınızı ve favorilerinizi takip etmek için giriş yapın." },
  menu: "card",
  first: ["orders", "wishlist", "notifications", "settings", "help", "privacy", "terms"],
});

/** The bar: across the bottom on white, the open tab rising in a hot pink circle. */
export const HUB_BAR = signatureBar(K, { design: "lift", background: K.page, dark_background: K.darkPage, active: HOT, dark_active: HOT, inactive: K.muted, dark_inactive: K.darkMuted, labels: "always" });

export const HUB_D: SignatureDesign = {
  demo: "mobiles",
  variant: "d",
  template: { id: "mobiles_signature_d", icon: "local_offer", fits: { types: ["store"], plain: true } },
  home: hubHome,
  over,
  tabs: clothesTabs,
  pages: (ctx) => [
    { slug: MENU_PAGE, title: "mbCategoryMenu", studio: hubMenuPage(ctx) },
    { slug: COMPARE_PAGE, title: "mbComparePage", studio: hubComparePage(ctx) },
  ],
  bar: HUB_BAR,
  look: { header: { background: K.page, color: K.ink, dark_background: K.darkPage, dark_color: K.darkInk }, background: K.page, dark_background: K.darkPage },
  chrome: { home: "search", header: "search", system: "glass" },
  isNew: true,
  project: {
    primary: HOT,
    appearance: { secondary_color: "#111318", font: "Plus Jakarta Sans", font_family: FACE, dark_background: K.darkPage, dark_surface: K.darkSurface },
    screens: HUB_SCREENS,
  },
};

// ——— Its parts as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;
const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};
const alone = (ctx: SectionContext): SectionContext => ({ ...ctx, ownPages: false });

export const MOBILES_D_SECTIONS: readonly SectionInfo[] = [
  // The brands as chips.
  { id: "mb_brand_chips", icon: "sell", isNew: true, fits: STORE_PLAIN, make: one((ctx) => brands(ctx)) },
  // Today's deals on a hot card.
  { id: "mb_deals_hot", icon: "bolt", isNew: true, fits: STORE_PLAIN, make: one((ctx) => deals(ctx)) },
  // The dense grid of three, installments-soon first.
  { id: "mb_dense_grid", icon: "grid_view", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [head(ctx, "mbHubBest", { word: "mbHubSeeAll", action: shop }), denseGrid(ctx, "mbHubBest", "popular")]) },
  // The compare tray.
  { id: "mb_compare_tray", icon: "compare_arrows", isNew: true, fits: STORE_PLAIN, make: one((ctx) => tray(alone(ctx))) },
  // The installments notice.
  { id: "mb_installments_card", icon: "calendar_month", isNew: true, fits: STORE_PLAIN, make: one((ctx) => soon(ctx)) },
];
