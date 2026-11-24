import type { Action, LayoutTab, StudioEntry, StudioFont, StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigImage, sigTexts, signatureBar, type SignatureInk } from "./food-signature-parts";
import { mixedProductPage } from "./product-page-mix";

/**
 * 223 Toota's template D, the NURSERY (the owner, 23 November 2026): the
 * kids' clothes type's second new template, Scandinavian and calm, drawn
 * from its own parts:
 *
 * - linen and sage by day, a deep moss night; Vazirmatn, light and large;
 * - the home opens on editorial type (a kicker, a light line and a bold
 *   one, a quiet paragraph) under a hairline header, no cover;
 * - a split two-column editorial: a tall photo beside a smaller one and
 *   the main categories as lines of text;
 * - the size by age as a ruler of ticks, the age that fits marked in sage;
 * - "The baby gift list": a bordered card of three things to give, the
 *   newborn gifts, saved to the favourites, wrapped with a card (the
 *   demo's own add-ons), on a page of its own;
 * - the essentials as rows between thin lines, a quiet photo with its
 *   caption under it; no shadows anywhere, square corners;
 * - a bar of thin icons and words, a line over the open one.
 *
 * Its category menu is a page of its own: the search, every main category
 * a row of square cards, then the account, orders, favourites, language
 * and a note to write to us as lines. Every word in Studio's three
 * languages (lib/studio/words/kids-cd.ts).
 */

export const NURSERY_INK: SignatureInk = {
  page: "#F3EEE5",
  darkPage: "#151713",
  surface: "#FAF7F1",
  darkSurface: "#1C1F1A",
  ink: "#2E322B",
  darkInk: "#EDE9DF",
  muted: "#5F645A",
  darkMuted: "#A9AD9E",
  line: "#D8D1C3",
  darkLine: "#30342C",
  accent: "#5D6F4E",
  darkAccent: "#AFC09D",
  fill: "#2E322B",
  darkFill: "#EDE9DF",
  onFill: "#F3EEE5",
  darkOnFill: "#151713",
};
const K = NURSERY_INK;
const SAGE_TINT = { day: "#E2E3D3", night: "#232720" };
const FACE = "Vazirmatn";

const P = (name: string) => `/kids-photos/${name}.jpg`;

const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));
export const NURSERY_MENU_PAGE = "menu";
export const NURSERY_SIZE_PAGE = "size-guide";
export const NURSERY_GIFT_PAGE = "gift-list";

const face = (size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: FACE, size, weight: 300, line_height: 1.25, ...extra });

function say(ctx: SectionContext, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, K, ctx.w(word), font, extra);
}

const hairline = (ctx: SectionContext, margin = sides(0, 0, 0, 0)): StudioNode => ({ id: idOf(ctx)(), type: "divider", height: 1, background: K.line, dark_background: K.darkLine, margin });

/** A section's title in light type, a quiet link at its end. */
function headOf(ctx: SectionContext, title: SectionWord, link: { word: SectionWord; action: Action } | null): StudioNode {
  const id = idOf(ctx);
  return { id: id(), type: "row", name: ctx.w(title), cross: "end", gap: 12, padding: sides(38, 20, 14, 20), children: [say(ctx, title, face(24), { width: "fill", max_lines: 2 }), ...(link ? [say(ctx, link.word, { family: FACE, size: 12.5 }, { muted: true, max_lines: 1, action: link.action })] : [])] };
}

/** A line of text that opens something, an arrow at its end, a hairline under it. */
function textLine(ctx: SectionContext, word: SectionWord, action: Action, size = 13.5): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w(word),
    action,
    children: [
      { id: id(), type: "row", gap: 8, cross: "center", padding: sides(11, 0, 11, 0), children: [say(ctx, word, { family: FACE, size, weight: 400 }, { width: "fill", max_lines: 1 }), { id: id(), type: "icon", icon: "arrow_forward", icon_size: 18, color: K.ink, dark_color: K.darkInk }] },
      hairline(ctx),
    ],
  };
}

// ——— The home ———

/** The lead, centred between two short sage rules: the kicker, a light line over a bold one, a quiet paragraph. */
function lead(ctx: SectionContext): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "column",
    name: ctx.w("nrsLead1"),
    gap: 2,
    cross: "center",
    padding: sides(30, 28, 0, 28),
    children: [
      { id: idOf(ctx)(), type: "row", width: 28, height: 1, background: K.accent, dark_background: K.darkAccent, margin: sides(0, 0, 14, 0), children: [] },
      say(ctx, "nrsKicker", { family: FACE, size: 11.5, weight: 600, letter_spacing: 1.6 }, { accent: true, max_lines: 1, text_align: "center", margin: sides(0, 0, 10, 0) }),
      say(ctx, "nrsLead1", face(36), { max_lines: 2, text_align: "center" }),
      say(ctx, "nrsLead2", face(36, { weight: 700 }), { max_lines: 2, text_align: "center" }),
      say(ctx, "nrsLeadLine", { family: FACE, size: 14, line_height: 1.8 }, { muted: true, max_lines: 3, text_align: "center", margin: sides(12, 0, 0, 0) }),
      { id: idOf(ctx)(), type: "row", width: 28, height: 1, background: K.accent, dark_background: K.darkAccent, margin: sides(16, 0, 0, 0), children: [] },
    ],
  };
}

/** The split editorial: a tall photo beside a smaller one over the main categories as lines (each named as the demo's, so it opens it). */
export function splitEditorial(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("nrsBaby"),
    gap: 16,
    cross: "start",
    padding: sides(24, 20, 0, 20),
    children: [
      sigImage(ctx, K, P("newborn-mint"), { name: ctx.w("nrsBaby"), width: "fill", height: 276, radius: 0, background: SAGE_TINT.day, dark_background: SAGE_TINT.night, action: shop }),
      {
        id: id(),
        type: "column",
        width: "fill",
        gap: 10,
        children: [
          sigImage(ctx, K, P("knit-feet"), { width: "fill", height: 140, radius: 0, fit: "cover", background: SAGE_TINT.day, dark_background: SAGE_TINT.night }),
          { id: id(), type: "column", children: [textLine(ctx, "nrsBaby", shop, 13), textLine(ctx, "nrsGifts", shop, 13), textLine(ctx, "nrsShoes", shop, 13)] },
        ],
      },
    ],
  };
}

/** The size by age as a ruler: a line of ticks, each age under its tick, the one that fits in sage with a dot. */
export function sizeRuler(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const tick = (n: string, unit: SectionWord, on: boolean): StudioNode => ({
    id: id(),
    type: "column",
    name: `${n} ${ctx.w(unit)}`,
    width: "fill",
    gap: 6,
    cross: "center",
    children: [
      on
        ? { id: id(), type: "row", width: 9, height: 9, radius: 5, background: K.accent, dark_background: K.darkAccent, children: [] }
        : { id: id(), type: "row", width: 1, height: 9, background: K.ink, dark_background: K.darkInk, children: [] },
      { id: id(), type: "text", text: n, max_lines: 1, font: { family: FACE, size: 15, weight: 600 }, color: on ? K.accent : K.ink, dark_color: on ? K.darkAccent : K.darkInk },
      say(ctx, unit, { family: FACE, size: 10.5 }, { muted: true, max_lines: 1 }),
    ],
  });
  return {
    id: id(),
    type: "column",
    name: ctx.w("nrsSizes"),
    padding: sides(34, 20, 0, 20),
    action: ownPage(ctx, NURSERY_SIZE_PAGE),
    children: [
      hairline(ctx),
      { id: id(), type: "row", cross: "center", padding: sides(16, 0, 14, 0), children: [say(ctx, "nrsSizes", { family: FACE, size: 12, weight: 600, letter_spacing: 1.4 }, { muted: true, width: "fill", max_lines: 1 }), { id: id(), type: "icon", icon: "straighten", icon_size: 20, color: K.ink, dark_color: K.darkInk }] },
      { id: id(), type: "divider", height: 1, background: K.ink, dark_background: K.darkInk },
      { id: id(), type: "row", children: [tick("0–3", "nrsMonths", false), tick("3–6", "nrsMonths", false), tick("6–12", "nrsMonths", true), tick("1–2", "nrsYear", false), tick("2–4", "nrsYears", false)] },
    ],
  };
}

/** The baby gift list: a bordered card, three things to give with their marks, "Start your list" to its page. */
export function giftList(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const item = (word: SectionWord, done: boolean): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    children: [
      hairline(ctx),
      {
        id: id(),
        type: "row",
        gap: 10,
        cross: "center",
        padding: sides(11, 0, 11, 0),
        children: [say(ctx, word, { family: FACE, size: 14, weight: 400 }, { width: "fill", max_lines: 1, ...(done ? { muted: true } : {}) }), { id: id(), type: "icon", icon: done ? "check_circle" : "radio_button_checked", icon_size: 20, color: done ? K.accent : K.line, dark_color: done ? K.darkAccent : K.darkLine }],
      },
    ],
  });
  return {
    id: id(),
    type: "column",
    name: ctx.w("nrsGift"),
    padding: sides(20, 20, 20, 20),
    margin: sides(34, 20, 0, 20),
    border_color: K.ink,
    dark_border_color: K.darkInk,
    border_width: 1,
    action: ownPage(ctx, NURSERY_GIFT_PAGE),
    children: [
      { id: id(), type: "row", gap: 12, cross: "start", children: [{ id: id(), type: "column", width: "fill", gap: 4, children: [say(ctx, "nrsGift", face(24, { weight: 400 }), { max_lines: 2 }), say(ctx, "nrsGiftLine", { family: FACE, size: 12.5, line_height: 1.6 }, { muted: true, max_lines: 3 })] }, { id: id(), type: "icon", icon: "redeem", icon_size: 26, color: K.accent, dark_color: K.darkAccent }] },
      { id: id(), type: "column", margin: sides(14, 0, 0, 0), children: [item("nrsGift1", true), item("nrsGift2", false), item("nrsGift3", false)] },
      { id: id(), type: "button", name: ctx.w("nrsGiftStart"), text: ctx.w("nrsGiftStart"), icon: "arrow_forward", icon_position: "end", width: "fill", height: 48, radius: 0, margin: sides(14, 0, 0, 0), background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk, border_color: K.ink, dark_border_color: K.darkInk, border_width: 1, shadow: "none", font: { family: FACE, size: 14, weight: 500 }, action: ownPage(ctx, NURSERY_GIFT_PAGE) },
    ],
  };
}

/** A row of the essentials: its photo square, its name and price, a hairline under it; no shadow. */
function essentialRow(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    children: [
      {
        id: id(),
        type: "row",
        gap: 14,
        cross: "center",
        padding: sides(14, 0, 14, 0),
        children: [
          { id: id(), type: "image", bind: "image", width: 92, height: 108, radius: 0, fit: "cover", background: SAGE_TINT.day, dark_background: SAGE_TINT.night },
          { id: id(), type: "column", width: "fill", gap: 4, children: [{ id: id(), type: "text", bind: "title", max_lines: 2, font: { family: FACE, size: 15, weight: 500, line_height: 1.4 }, color: K.ink, dark_color: K.darkInk }, { id: id(), type: "text", bind: "was_price", max_lines: 1, font: { family: FACE, size: 12 }, color: K.muted, dark_color: K.darkMuted }] },
          { id: id(), type: "text", bind: "price", max_lines: 1, font: { family: FACE, size: 15, weight: 600 }, color: K.ink, dark_color: K.darkInk },
        ],
      },
      hairline(ctx),
    ],
  };
}

function essentials(ctx: SectionContext): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w("nrsEssentials"), source: "products", layout: "list", gap: 0, padding: sides(0, 20, 0, 20), query: { limit: 4, category_id: null, featured: false, sort: "newest", ids: [] }, card: essentialRow(ctx) };
}

/** A quiet photo, full width, its caption under it in small type. */
function madeSlowly(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("nrsMadeKicker"),
    gap: 10,
    margin: sides(38, 0, 0, 0),
    action: shop,
    children: [
      sigImage(ctx, K, P("knit-blanket"), { width: "fill", height: 300, radius: 0, fit: "cover", background: SAGE_TINT.day, dark_background: SAGE_TINT.night }),
      { id: id(), type: "column", gap: 4, padding: sides(4, 20, 0, 20), children: [say(ctx, "nrsMadeKicker", { family: FACE, size: 11.5, weight: 600, letter_spacing: 1.4 }, { accent: true, max_lines: 1 }), say(ctx, "nrsMade", face(18, { weight: 400, line_height: 1.5 }), { max_lines: 3 })] },
    ],
  };
}

/** The ready sets two by two, square and quiet. */
function sets(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w("nrsSets"),
    source: "products",
    layout: "grid",
    columns: 2,
    gap: 16,
    padding: sides(0, 20, 0, 20),
    query: { limit: 4, category_id: null, featured: false, sort: "price_desc", ids: [] },
    card: { id: id(), type: "column", gap: 6, children: [{ id: id(), type: "image", bind: "image", width: "fill", aspect_ratio: 0.85, radius: 0, fit: "cover", background: SAGE_TINT.day, dark_background: SAGE_TINT.night }, { id: id(), type: "text", bind: "title", max_lines: 1, font: { family: FACE, size: 13.5, weight: 400 }, color: K.ink, dark_color: K.darkInk }, { id: id(), type: "text", bind: "price", max_lines: 1, font: { family: FACE, size: 13.5, weight: 600 }, color: K.accent, dark_color: K.darkAccent }] },
  };
}

export function nurseryHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "nrsWordmark" });
  return {
    header: { type: "logo_center", title: t.title, translations: t.translations, buttons: ["menu", "cart"], menu_page: NURSERY_MENU_PAGE, background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 100, 0),
      children: [
        hairline(ctx),
        lead(ctx),
        splitEditorial(ctx),
        sizeRuler(ctx),
        giftList(ctx),
        headOf(ctx, "nrsEssentials", { word: "nrsViewAll", action: shop }),
        { ...essentials(ctx), padding: sides(0, 20, 0, 20) },
        madeSlowly(ctx),
        headOf(ctx, "nrsSets", { word: "nrsViewAll", action: shop }),
        sets(ctx),
      ],
    },
  };
}

// ——— The pages after the home ———

function pageHeader(ctx: SectionContext, word: SectionWord): StudioPage["header"] {
  const t = sigTexts(ctx, { title: word });
  return { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], background: K.page, color: K.ink, dark_background: K.darkPage, dark_color: K.darkInk, style: "large" };
}

function iconLine(ctx: SectionContext, word: SectionWord, icon: string, action: Action, line?: SectionWord): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w(word),
    action,
    children: [
      { id: id(), type: "row", gap: 14, cross: "center", padding: sides(14, 0, 14, 0), children: [{ id: id(), type: "icon", icon, icon_size: 22, color: K.accent, dark_color: K.darkAccent }, { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, word, { family: FACE, size: 15, weight: 400 }, { max_lines: 1 }), ...(line ? [say(ctx, line, { family: FACE, size: 12 }, { muted: true, max_lines: 2 })] : [])] }, { id: id(), type: "icon", icon: "arrow_forward", icon_size: 18, color: K.muted, dark_color: K.darkMuted }] },
      hairline(ctx),
    ],
  };
}

export function nurseryMenuPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    header: pageHeader(ctx, "nrsMenu"),
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { id: id(), type: "search", name: ctx.w("nrsSearchAll"), text: ctx.w("nrsSearchAll"), source: "products", radius: 0, height: 48, background: K.surface, dark_background: K.darkSurface, color: K.muted, dark_color: K.darkMuted, border_color: K.line, dark_border_color: K.darkLine, border_width: 1, margin: sides(6, 20, 8, 20) },
        { id: id(), type: "categories", name: ctx.w("nrsMenu"), source: "products", style: "rows", category_menu: { look: "label", radius: 0, numbers: false }, color: K.ink, dark_color: K.darkInk, padding: sides(8, 0, 8, 0) },
        { id: id(), type: "column", name: ctx.w("nrsAccount"), padding: sides(14, 20, 0, 20), children: [hairline(ctx), iconLine(ctx, "nrsAccount", "person", screen("account")), iconLine(ctx, "nrsOrders", "package_2", screen("orders")), iconLine(ctx, "nrsWishlist", "favorite", screen("favorites")), iconLine(ctx, "nrsLanguage", "language", screen("settings")), iconLine(ctx, "nrsContact", "mail", screen("account"), "nrsContactLine")] },
      ],
    },
  };
}

export function nurserySizePage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    header: pageHeader(ctx, "nrsSizeGuide"),
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [{ ...sizeRuler({ ...ctx, ownPages: false }), action: null }, { id: id(), type: "size_chart", name: ctx.w("nrsSizeChart"), text: ctx.w("nrsSizeChart"), color: K.ink, dark_color: K.darkInk, background: K.surface, dark_background: K.darkSurface, border_color: K.line, dark_border_color: K.darkLine, border_width: 1, radius: 0, padding: sides(14, 14, 14, 14), margin: sides(18, 20, 4, 20) }],
    },
  };
}

/** The gift list's page: how it works as three steps, the newborn gifts' button (named as the demo's category, so it opens it), the gifts. */
export function nurseryGiftPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const step = (title: SectionWord, text: SectionWord): StudioEntry => sigEntry(ctx, { title, text });
  return {
    header: pageHeader(ctx, "nrsGiftPage"),
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { ...say(ctx, "nrsGiftLine", { family: FACE, size: 14, line_height: 1.7 }, { muted: true }), padding: sides(8, 20, 6, 20) },
        { id: id(), type: "timeline", name: ctx.w("nrsGift"), timeline: { style: "vertical" }, color: K.ink, dark_color: K.darkInk, background: K.page, dark_background: K.darkPage, padding: sides(14, 20, 0, 20), entries: [step("nrsStep1", "nrsStep1Text"), step("nrsStep2", "nrsStep2Text"), step("nrsStep3", "nrsStep3Text")] },
        { id: id(), type: "button", name: ctx.w("nrsGifts"), text: ctx.w("nrsShopGifts"), icon: "redeem", width: "fill", height: 50, radius: 0, margin: sides(18, 20, 0, 20), background: K.fill, dark_background: K.darkFill, color: K.onFill, dark_color: K.darkOnFill, shadow: "none", font: { family: FACE, size: 14.5, weight: 500 }, action: shop },
        headOf(ctx, "nrsGifts", null),
        essentials(ctx),
      ],
    },
  };
}

/** Over the shop: its title in light type, its line, the ages as a ruler, the sizes to filter by. */
function shopTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "column", name: ctx.w("nrsShop"), gap: 2, padding: sides(12, 20, 0, 20), children: [say(ctx, "nrsShop", face(32)), say(ctx, "nrsShopLine", { family: FACE, size: 13 }, { muted: true })] },
    { ...sizeRuler(ctx), padding: sides(14, 20, 0, 20) },
    { id: id(), type: "listing_filters", name: ctx.w("nrsSizeChart"), color: K.ink, dark_color: K.darkInk, padding: sides(12, 20, 6, 20) },
  ];
}

/** Over the cart: the gifts' wrapping and card, between hairlines. */
function cartTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [{ id: id(), type: "column", name: ctx.w("nrsCartNote"), padding: sides(8, 20, 4, 20), children: [hairline(ctx), { id: id(), type: "row", gap: 12, cross: "center", padding: sides(14, 0, 14, 0), children: [{ id: id(), type: "icon", icon: "redeem", icon_size: 22, color: K.accent, dark_color: K.darkAccent }, say(ctx, "nrsCartNote", { family: FACE, size: 13, line_height: 1.6 }, { width: "fill", max_lines: 3 })] }, hairline(ctx)] }];
}

/** Over the orders: the newest order's steps, a quiet line of them. */
function ordersTop(ctx: SectionContext): StudioNode[] {
  const step = (title: SectionWord, text: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [headOf(ctx, "nrsTrack", null), { id: idOf(ctx)(), type: "timeline", name: ctx.w("nrsTrack"), timeline: { style: "vertical", source: "latest_order" }, color: K.ink, dark_color: K.darkInk, background: K.surface, dark_background: K.darkSurface, border_color: K.line, dark_border_color: K.darkLine, border_width: 1, radius: 0, padding: sides(16, 16, 16, 16), margin: sides(0, 20, 8, 20), entries: [step("kdTrack1", "kdTrack1Text", true), step("kdTrack2", "kdTrack2Text"), step("kdTrack3", "kdTrack3Text"), step("kdTrack4", "kdTrack4Text")] }];
}

function nurseryOver(screenName: string, ctx: SectionContext): StudioNode[] | null {
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

/** Five tabs, thin icons over their words: Home, Shop, Gifts, Cart, Account. */
export function nurseryTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const out = structuredClone([...tabs]).map((t) => {
    const target = t.target.type === "screen" ? t.target.screen : null;
    if (t.id === "home") return { ...t, icon: "home" };
    if (target === "search") return { ...t, label: "Shop", icon: "grid_view" };
    if (target === "cart") return { ...t, label: "Cart", icon: "shopping_bag" };
    if (target === "account") return { ...t, icon: "person" };
    return t;
  });
  const cart = out.findIndex((t) => t.target.type === "screen" && t.target.screen === "cart");
  const gifts: LayoutTab = { id: "gifts", label: "Gifts", icon: "redeem", target: { type: "page", page_slug: NURSERY_GIFT_PAGE } };
  if (!out.some((t) => t.id === "gifts")) out.splice(cart < 0 ? out.length : cart, 0, gifts);
  return out;
}

/** The line bar: across the foot on the linen, thin icons with their words, a sage line over the open one. */
export const NURSERY_BAR = signatureBar(K, { design: "line", background: K.page, dark_background: K.darkPage, active: K.accent, dark_active: K.darkAccent, inactive: K.muted, dark_inactive: K.darkMuted, labels: "always", font: FACE });

const NURSERY_SCREENS = signatureScreens({
  style: "photo",
  photo: P("newborn-mint"),
  title: { en: "Welcome to the nursery", ar: "أهلًا بكِ في الحضانة", tr: "Bebek odasına hoş geldiniz" },
  subtitle: { en: "Sign in to keep your gift list and your orders.", ar: "سجّلي الدخول لتحفظي قائمة الهدايا وطلباتكِ.", tr: "Hediye listenizi ve siparişlerinizi saklamak için giriş yapın." },
  menu: "cover",
  first: ["orders", "wishlist", "notifications", "settings", "help", "privacy", "terms"],
});

/**
 * 228.7 The nursery's own product page, calm and editorial: the shop's name
 * small and spaced over a hairline, the photo with its thumbnails under it, square, then
 * the name in large light Vazirmatn and the price in grey between
 * hairlines; the signature, the size by age as the ruler of ticks over the
 * sizes; Add to basket in the page, outlined in ink, never pinned; the
 * words, the details as a table of thin lines and the delivery lines; the
 * baby gift list card; soft companions to slide through. No shadows, no
 * fills, nothing rounded.
 */
function nurseryProductPage(ctx: SectionContext) {
  const ink = { color: K.ink, dark_color: K.darkInk } as const;
  const sage = { accent: K.accent, dark_accent: K.darkAccent } as const;
  const gap = (top: number, bottom = 0) => sides(top, 20, bottom, 20);
  const ruler = sizeRuler(ctx);
  // The shop's name, small and spaced, over the photo (an app header would show the page's own title there).
  const wordmark = say(ctx, "nrsWordmark", { family: FACE, size: 13, weight: 500, letter_spacing: 1.6 }, { text_align: "center", max_lines: 1, padding: sides(62, 56, 0, 56) });
  return mixedProductPage(
    ctx,
    { background: K.page, dark_background: K.darkPage },
    [
      wordmark,
      hairline(ctx, gap(14)),
      { type: "product_gallery", look: "thumbs", radius: 0, node: { aspect_ratio: 1, margin: gap(18) } },
      hairline(ctx, gap(26)),
      { type: "product_title", look: "plain", node: { ...ink, font: face(27, { line_height: 1.3 }), margin: gap(20) } },
      { type: "product_price", look: "single", node: { color: K.muted, dark_color: K.darkMuted, font: { family: FACE, size: 15, weight: 400, letter_spacing: 0.3 }, margin: gap(8) } },
      hairline(ctx, gap(20)),
      { ...ruler, padding: sides(4, 20, 0, 20) },
      { type: "product_variants", look: "chips", ...sage, node: { ...ink, margin: gap(18) } },
      { type: "product_buy", look: "cart", text: "nrsAddToBasket", accent: K.fill, dark_accent: K.darkFill, node: { pin: "none", radius: 2, margin: gap(22), ...ink } },
      hairline(ctx, gap(28)),
      { type: "product_description", look: "plain", node: { ...ink, margin: gap(20) } },
      { type: "product_specs", look: "table", ...sage, node: { ...ink, margin: gap(22) } },
      { type: "product_delivery", look: "rows", ...sage, node: { ...ink, margin: gap(20) } },
      giftList(ctx),
      { type: "product_related", look: "carousel", rows: 8, text: "nrsCompanions", node: { ...ink, margin: sides(34, 0, 28, 0) } },
    ],
  );
}

export const NURSERY_D: SignatureDesign = {
  demo: "kids",
  variant: "d",
  template: { id: "kids_signature_d", icon: "family_restroom", fits: { types: ["store"], plain: true } },
  home: nurseryHome,
  over: nurseryOver,
  tabs: nurseryTabs,
  pages: (ctx) => [
    { slug: NURSERY_MENU_PAGE, title: "nrsMenu", studio: nurseryMenuPage(ctx) },
    { slug: NURSERY_SIZE_PAGE, title: "nrsSizeGuide", studio: nurserySizePage(ctx) },
    { slug: NURSERY_GIFT_PAGE, title: "nrsGiftPage", studio: nurseryGiftPage(ctx) },
    // 228.7 Its own product page.
    nurseryProductPage(ctx),
  ],
  bar: NURSERY_BAR,
  look: { header: { background: K.page, color: K.ink, dark_background: K.darkPage, dark_color: K.darkInk }, background: K.page, dark_background: K.darkPage },
  chrome: { header: "large", system: "large" },
  isNew: true,
  project: {
    primary: K.accent,
    appearance: { secondary_color: K.ink, font: "DM Sans", font_family: FACE, arabic_font: FACE, dark_background: K.darkPage, dark_surface: K.darkSurface },
    screens: NURSERY_SCREENS,
  },
};
