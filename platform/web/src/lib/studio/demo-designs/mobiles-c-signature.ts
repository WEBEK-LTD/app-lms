import type { Action, StudioEntry, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { installmentsTag } from "../installments";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigImage, sigPhoto, sigTexts, signatureBar, type SignatureInk } from "./food-signature-parts";
import { clothesTabs, MENU_PAGE } from "./clothes-signature";

/**
 * 226 Nova's look C, the KEYNOTE (the owner, 23 November 2026: every type
 * gets two new templates that look like no other): a launch event, calm and
 * spare. The home opens on a black stage that stays black by day and by
 * night: a tiny spaced wordmark, "New", the shop's star phone in big quiet
 * type, its promise, the phone alone in a warm glow, its colours (the
 * `swatches` element), two pill buttons and its price with "Installments
 * coming soon". Then, on silver by day and on black by night: the specs
 * revealed one per row as giant thin figures, two phones compared (the
 * `compare` element), the trade-in estimate on a dark card (the `trade_in`
 * element), a full-bleed sound scene and the line-up as tall centred cards.
 * Its bar is a small dark dock. Readex Pro. Built only from Studio's
 * elements; the phone's name, words, colours and figures are the owner's
 * (in brackets; the demo fills them), the compare, trade-in and products
 * the shop's own.
 */

export const KEYNOTE_INK: SignatureInk = {
  page: "#F5F5F7",
  darkPage: "#000000",
  surface: "#FFFFFF",
  darkSurface: "#111113",
  ink: "#1D1D1F",
  darkInk: "#F5F5F7",
  muted: "#6E6E73",
  darkMuted: "#9A9AA0",
  line: "#D9D9DE",
  darkLine: "#262629",
  accent: "#0071E3",
  darkAccent: "#2997FF",
  fill: "#1D1D1F",
  darkFill: "#F5F5F7",
  onFill: "#FFFFFF",
  darkOnFill: "#000000",
};
const K = KEYNOTE_INK;
/** The stage: black by day and by night, its words silver. */
const STAGE = "#000000";
const SILVER = "#F5F5F7";
const GREY = "#A1A1A6";
const GOLD = { day: "#A8713E", night: "#E8B07A" };
const FACE = "Readex Pro";

const P = (name: string) => `/mobiles-photos/${name}.jpg`;
const shop: Action = screen("search");

const font = (size: number, weight: NonNullable<StudioFont["weight"]> = 400, extra: Partial<StudioFont> = {}): StudioFont => ({ family: FACE, size, weight, line_height: 1.25, ...extra });
const silver = { color: SILVER, dark_color: SILVER } as const;
const grey = { color: GREY, dark_color: GREY } as const;
const gold = { color: "#E8B07A", dark_color: "#E8B07A" } as const;

function say(ctx: SectionContext, word: SectionWord, f: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, K, ctx.w(word), f, extra);
}

/** A section's opening: a small grey kicker over a big quiet title. */
function opening(ctx: SectionContext, kicker: SectionWord, title: SectionWord, padding: StudioSides = sides(48, 24, 14, 24)): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "column",
    name: ctx.w(title),
    gap: 6,
    padding,
    children: [say(ctx, kicker, font(13.5, 400), { muted: true, max_lines: 1 }), say(ctx, title, font(29, 600, { line_height: 1.2, letter_spacing: -0.3 }), { max_lines: 3 })],
  };
}

/** A pill button on the stage: filled silver, or outlined. */
function pill(ctx: SectionContext, word: SectionWord, filled: boolean, action: Action): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "button",
    name: ctx.w(word),
    text: ctx.w(word),
    width: "hug",
    height: 42,
    radius: 21,
    padding: sides(0, 22, 0, 22),
    font: font(14, 500),
    motion: { press: "shrink" },
    action,
    ...(filled ? { background: SILVER, dark_background: SILVER, color: "#000000", dark_color: "#000000" } : { background: STAGE, dark_background: STAGE, color: SILVER, dark_color: SILVER, border_color: "#48484C", dark_border_color: "#48484C", border_width: 1 }),
  };
}

// ——— The stage ———

/** The phone's colours: the `swatches` element, the shades the owner's (the demo's four), the one tapped showing its name. */
function colours(ctx: SectionContext): StudioNode {
  const t = sigTexts(ctx, { text: "mbKeyColours", title: "mbKeyBuy" });
  const shades: [SectionWord, string][] = [
    ["mbKeySw1", "#8C8A86"],
    ["mbKeySw2", "#1E1E20"],
    ["mbKeySw3", "#D9DADC"],
    ["mbKeySw4", "#3C4A5C"],
  ];
  const entries: StudioEntry[] = shades.map(([word, hex], i) => ({ ...sigEntry(ctx, { title: word, text: "mbKeySwLine" }), color: hex, ...(i === 0 ? { highlight: true } : {}) }));
  return {
    id: idOf(ctx)(),
    type: "swatches",
    name: ctx.w("mbKeyColours"),
    text: t.text,
    title: t.title,
    translations: t.translations,
    action: shop,
    swatches: { shape: "circle", size: 28 },
    entries,
    font: { family: FACE },
    ...silver,
    background: STAGE,
    dark_background: STAGE,
    padding: sides(6, 24, 0, 24),
  };
}

/** The black stage: the wordmark's header lies over it; "New", the star phone's name and promise, the phone in a warm glow, its colours, two pills, its price and the installments' notice. */
function stage(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("mbKeyHeroName"),
    gap: 0,
    cross: "center",
    padding: sides(18, 0, 30, 0),
    background: STAGE,
    dark_background: STAGE,
    children: [
      say(ctx, "mbKeyNew", font(13, 400), { ...gold, max_lines: 1, text_align: "center" }),
      say(ctx, "mbKeyHeroName", font(42, 600, { line_height: 1.08, letter_spacing: -0.6 }), { ...silver, max_lines: 2, text_align: "center", padding: sides(6, 20, 0, 20) }),
      say(ctx, "mbKeyHeroLine", font(18, 300), { ...grey, max_lines: 2, text_align: "center", padding: sides(8, 24, 0, 24) }),
      {
        id: id(),
        type: "stack",
        name: ctx.w("mbKeyHeroName"),
        width: "fill",
        height: 318,
        margin: sides(18, 0, 0, 0),
        action: shop,
        children: [
          { id: id(), type: "row", width: 300, height: 300, radius: 150, place: { x: 12, y: 3 }, gradient: { from: "#5A4029", to: "#000000", angle: 90 }, background: "#2A1F15", dark_background: "#2A1F15", opacity: 0.85, children: [] },
          { ...sigImage(ctx, K, P("phone-cam"), { width: 246, height: 300, radius: 34, background: "#111111", dark_background: "#111111" }), place: { x: 18, y: 3 }, motion: { enter: "zoom", duration_ms: 900 } },
        ],
      },
      colours(ctx),
      { id: id(), type: "row", name: ctx.w("mbKeyBuy"), gap: 12, align: "center", padding: sides(18, 0, 0, 0), children: [pill(ctx, "mbKeyBuy", true, shop), pill(ctx, "mbKeyMore", false, shop)] },
      say(ctx, "mbKeyFrom", font(13, 400), { ...grey, max_lines: 1, text_align: "center", padding: sides(14, 20, 8, 20) }),
      { ...installmentsTag(ctx, { color: "#C9C9CE", dark_color: "#C9C9CE", background: "#1C1C1E", dark_background: "#1C1C1E" }), self_align: "center" },
    ],
  };
}

// ——— The specs, the compare, the trade-in, the sound and the line-up ———

/** The specs revealed: one figure per row, giant and thin, its meaning beside it, a hairline over each. */
function specRows(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  const row = (value: SectionWord, line: SectionWord): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(value),
    gap: 0,
    motion: { enter: "slide_up", duration_ms: 600 },
    children: [
      { id: id(), type: "divider", height: 1, background: K.line, dark_background: K.darkLine },
      { id: id(), type: "row", gap: 16, cross: "center", padding: sides(18, 0, 18, 0), children: [say(ctx, value, font(42, 300, { line_height: 1, letter_spacing: -1 }), { width: 168, max_lines: 1 }), say(ctx, line, font(13.5, 400, { line_height: 1.45 }), { muted: true, width: "fill", max_lines: 3 })] },
    ],
  });
  return [
    opening(ctx, "mbKeyWhyKicker", "mbKeyWhy"),
    { id: id(), type: "column", name: ctx.w("mbKeyWhy"), gap: 0, padding: sides(0, 24, 0, 24), children: [row("mbKeySpec1", "mbKeySpec1Line"), row("mbKeySpec2", "mbKeySpec2Line"), row("mbKeySpec3", "mbKeySpec3Line")] },
  ];
}

/** Two phones compared spec by spec (the `compare` element, the shop's own) on a white card. */
function compare(ctx: SectionContext, margin = sides(0, 16, 0, 16)): StudioNode {
  return { id: idOf(ctx)(), type: "compare", name: ctx.w("mbKeyCompare"), tech: { accent: K.accent, rows: 5 }, font: { family: FACE }, color: K.ink, dark_color: K.darkInk, background: K.surface, dark_background: K.darkSurface, radius: 28, padding: sides(18, 14, 18, 14), margin };
}

/** The trade-in on a dark card: its kicker in gold, its promise, then the estimator itself (the `trade_in` element). */
function trade(ctx: SectionContext, margin = sides(16, 16, 0, 16)): StudioNode {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { text: "mbKeyTrade" });
  return {
    id: id(),
    type: "column",
    name: ctx.w("mbKeyTrade"),
    gap: 8,
    radius: 28,
    padding: sides(24, 20, 20, 20),
    margin,
    gradient: { from: "#1C1C1E", to: "#000000", angle: 160 },
    background: "#111113",
    dark_background: "#111113",
    border_color: "#1C1C1E",
    dark_border_color: "#2A2A2D",
    border_width: 1,
    children: [
      say(ctx, "mbKeyTradeKicker", font(13, 400), { ...gold, max_lines: 1 }),
      say(ctx, "mbKeyTrade", font(23, 500, { line_height: 1.3 }), { ...silver, max_lines: 3 }),
      { id: id(), type: "trade_in", name: ctx.w("mbKeyTradeKicker"), text: t.text, translations: t.translations, tech: { look: "full", accent: "#E8B07A" }, font: { family: FACE }, ...silver, background: "#111113", dark_background: "#111113", radius: 20, padding: sides(14, 0, 0, 0) },
    ],
  };
}

/** The sound: a full-bleed scene, its kicker and line over the photo's dark foot. */
function sound(ctx: SectionContext): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "photo_hero",
    name: ctx.w("mbKeyAudio"),
    image_url: sigPhoto(ctx, P("hp-woman-wide")),
    height: 420,
    radius: 0,
    background: STAGE,
    scrim: { color: "#000000", from: 0, middle: 0.1, at: 50, to: 0.85 },
    align: "end",
    padding: sides(24, 24, 28, 24),
    margin: sides(48, 0, 0, 0),
    action: shop,
    ken_burns: true,
    children: [say(ctx, "mbKeyAudioKicker", font(13, 400), { ...gold, max_lines: 1 }), say(ctx, "mbKeyAudio", font(27, 600, { line_height: 1.2 }), { ...silver, max_lines: 3, margin: sides(6, 0, 0, 0) })],
  };
}

/** A device of the line-up: tall on black, its name and price centred under it. */
function lineupCard(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    width: 160,
    gap: 3,
    cross: "center",
    children: [
      { id: id(), type: "image", bind: "image", width: 160, height: 196, radius: 24, fit: "cover", background: "#000000", dark_background: "#111113" },
      { id: id(), type: "text", bind: "title", max_lines: 1, text_align: "center", color: K.ink, dark_color: K.darkInk, font: font(14, 500), margin: sides(10, 0, 0, 0) },
      { id: id(), type: "text", bind: "price", max_lines: 1, text_align: "center", color: K.muted, dark_color: K.darkMuted, font: font(12.5, 400) },
    ],
  };
}

function lineup(ctx: SectionContext): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w("mbKeyLineup"), source: "products", layout: "carousel", gap: 14, padding: sides(0, 16, 0, 16), query: { limit: 8, category_id: null, featured: false, sort: "popular", ids: [] }, card: lineupCard(ctx) };
}

// ——— The home ———

function header(ctx: SectionContext): StudioPage["header"] {
  const t = sigTexts(ctx, { title: "mbWordmark" });
  return { type: "logo_center", title: t.title, translations: t.translations, buttons: ["menu", "cart"], menu_page: MENU_PAGE, background: STAGE, dark_background: STAGE, color: SILVER, dark_color: SILVER, style: "brand" };
}

export function keynoteHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    header: header(ctx),
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 110, 0),
      children: [
        stage(ctx),
        ...specRows(ctx),
        opening(ctx, "mbKeyCompareKicker", "mbKeyCompare"),
        compare(ctx),
        trade(ctx),
        sound(ctx),
        opening(ctx, "mbKeyLineupKicker", "mbKeyLineup"),
        lineup(ctx),
      ],
    },
  };
}

// ——— The pages after the home ———

/** One of the menu's big quiet links: its words large and thin, an arrow at its end, a hairline under it. */
function bigLink(ctx: SectionContext, word: SectionWord, action: Action, line?: SectionWord): StudioNode {
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
        gap: 12,
        cross: "center",
        padding: sides(16, 0, 16, 0),
        children: [
          { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, word, font(22, 300), { max_lines: 1 }), ...(line ? [say(ctx, line, font(12, 400), { muted: true, max_lines: 2 })] : [])] },
          { id: id(), type: "icon", icon: "arrow_outward", icon_size: 20, color: K.muted, dark_color: K.darkMuted },
        ],
      },
      { id: id(), type: "divider", height: 1, background: K.line, dark_background: K.darkLine },
    ],
  };
}

/**
 * The category menu: the wordmark, the search, every main category of the
 * shop a row of cards (its "All" card, then its sub-categories, sliding),
 * then the account, the orders, the wishlist, the language and the
 * contact as big quiet links.
 */
export function keynoteMenuPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "mbWordmark" });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["search"], background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk, style: "brand" },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 36, 0),
      children: [
        { id: id(), type: "search", name: ctx.w("mbSearchAll"), text: ctx.w("mbSearchAll"), source: "products", radius: 14, height: 46, background: K.surface, dark_background: K.darkSurface, color: K.muted, dark_color: K.darkMuted, margin: sides(4, 16, 10, 16) },
        { id: id(), type: "categories", name: ctx.w("mbCategoryMenu"), source: "products", style: "rows", category_menu: { look: "label", radius: 22 }, color: K.ink, dark_color: K.darkInk, font: { family: FACE }, padding: sides(6, 0, 6, 0) },
        {
          id: id(),
          type: "column",
          name: ctx.w("mbMenuAccount"),
          gap: 0,
          padding: sides(18, 24, 0, 24),
          children: [
            { id: id(), type: "divider", height: 1, background: K.line, dark_background: K.darkLine },
            bigLink(ctx, "mbAccount", screen("account")),
            bigLink(ctx, "mbOrders", screen("orders")),
            bigLink(ctx, "mbKeyWishlist", screen("favorites")),
            bigLink(ctx, "mbLanguage", screen("settings")),
            bigLink(ctx, "mbContact", screen("account"), "mbContactLine"),
          ],
        },
      ],
    },
  };
}

/** Over the shop: the line-up's opening, the categories as chips and the shop by storage. */
function listTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { text: "mbByStorage" });
  return [
    opening(ctx, "mbKeyListLine", "mbKeyListTitle", sides(10, 20, 10, 20)),
    { id: id(), type: "categories", name: ctx.w("mbCategories"), source: "products", style: "chips", color: K.ink, dark_color: K.darkInk, padding: sides(0, 14, 4, 14) },
    { id: id(), type: "spec_filter", name: ctx.w("mbByStorage"), text: t.text, translations: t.translations, tech: { spec: "storage", accent: K.accent }, font: { family: FACE }, color: K.ink, dark_color: K.darkInk, margin: sides(8, 20, 8, 20) },
  ];
}

/** Over the cart: the shop's code and the warranty's quiet line. */
function cartTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "coupon", name: ctx.w("mbCoupon"), coupon: { look: "glass", bind: "public" }, radius: 20, color: K.accent, margin: sides(10, 16, 4, 16) },
    { id: id(), type: "row", name: ctx.w("mbKeyCartLine"), gap: 12, cross: "center", radius: 20, padding: sides(14, 16, 14, 16), margin: sides(8, 16, 6, 16), background: K.surface, dark_background: K.darkSurface, children: [{ id: id(), type: "icon", icon: "verified", icon_size: 22, color: K.accent, dark_color: K.darkAccent }, say(ctx, "mbKeyCartLine", font(13, 400), { width: "fill", max_lines: 3 })] },
  ];
}

/** Over the orders: the order's way as bars (the person's newest order, else the first step lit). */
function ordersTop(ctx: SectionContext): StudioNode[] {
  const step = (title: SectionWord, t: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text: t }, highlight ? { highlight: true } : {});
  return [
    opening(ctx, "mbOrders", "mbTrack", sides(10, 20, 10, 20)),
    { id: idOf(ctx)(), type: "timeline", name: ctx.w("mbTrack"), timeline: { style: "bars", source: "latest_order" }, color: K.ink, dark_color: K.darkInk, font: { family: FACE }, background: K.surface, dark_background: K.darkSurface, radius: 24, padding: sides(18, 16, 18, 16), margin: sides(0, 16, 8, 16), entries: [step("mbTrack1", "mbTrack1Text", true), step("mbTrack2", "mbTrack2Text"), step("mbTrack3", "mbTrack3Text"), step("mbTrack4", "mbTrack4Text")] },
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

const KEYNOTE_SCREENS = signatureScreens({
  style: "premium",
  photo: P("phone-vintage"),
  title: { en: "Welcome to the line-up", ar: "أهلًا بك في التشكيلة", tr: "Seriye hoş geldiniz" },
  subtitle: { en: "Sign in to follow your orders, your trade-ins and your warranty.", ar: "سجّل الدخول لتتابع طلباتك واستبدالاتك وضمانك.", tr: "Siparişlerinizi, takaslarınızı ve garantinizi takip etmek için giriş yapın." },
  menu: "night",
  accent: "#1D1D1F",
  first: ["orders", "wishlist", "notifications", "settings", "help", "privacy", "terms"],
});

/** The bar: a small dark dock in the middle, icons only, the open one a silver circle. */
export const KEYNOTE_BAR = signatureBar(K, { design: "dock", background: "#1C1C1E", dark_background: "#1C1C1E", active: SILVER, dark_active: SILVER, inactive: "#8E8E93", dark_inactive: "#8E8E93", labels: "never", radius: 30, margin: 16 });

export const KEYNOTE_C: SignatureDesign = {
  demo: "mobiles",
  variant: "c",
  template: { id: "mobiles_signature_c", icon: "smartphone", fits: { types: ["store"], plain: true } },
  home: keynoteHome,
  over,
  tabs: clothesTabs,
  pages: (ctx) => [{ slug: MENU_PAGE, title: "mbCategoryMenu", studio: keynoteMenuPage(ctx) }],
  bar: KEYNOTE_BAR,
  look: { header: { background: K.page, color: K.ink, dark_background: K.darkPage, dark_color: K.darkInk }, background: K.page, dark_background: K.darkPage },
  chrome: { home: "brand", header: "glass", system: "photo" },
  isNew: true,
  project: {
    primary: K.fill,
    appearance: { secondary_color: K.accent, font: "Lexend", font_family: FACE, dark_background: K.darkPage, dark_surface: K.darkSurface },
    screens: KEYNOTE_SCREENS,
  },
};

// ——— Its parts as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;
const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};

export const MOBILES_C_SECTIONS: readonly SectionInfo[] = [
  // The keynote stage: one device in the spotlight, its colours, two pills and its price.
  { id: "mb_spotlight", icon: "smartphone", isNew: true, fits: STORE_PLAIN, make: one((ctx) => stage(ctx)) },
  // The specs revealed one per row.
  { id: "mb_spec_reveal", icon: "format_size", isNew: true, fits: STORE_PLAIN, make: one((ctx) => specRows(ctx)) },
  // The trade-in on a dark card.
  { id: "mb_trade_dark", icon: "currency_exchange", isNew: true, fits: STORE_PLAIN, make: one((ctx) => trade(ctx)) },
  // The line-up as tall centred cards.
  { id: "mb_lineup", icon: "view_carousel", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [opening(ctx, "mbKeyLineupKicker", "mbKeyLineup"), lineup(ctx)]) },
];
