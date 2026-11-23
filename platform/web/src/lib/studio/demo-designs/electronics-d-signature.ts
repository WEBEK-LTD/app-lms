import type { Action, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { installmentsTag } from "../installments";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigPhoto, sigTexts, signatureBar, signatureHeader, type SignatureInk } from "./food-signature-parts";
import { ELECTRONICS_COUPON_CODE, electronicsTabs } from "./electronics-signature";

/**
 * 227 Madar's look D, the colour stage (the electronics type's second
 * look): every product on its own saturated colour, as a stage. Story
 * circles of the categories under a large wordmark, then big horizontal
 * cards that snap, each a device on its colour (coral, blue, emerald, gold,
 * violet) with its headline; the shop's lists as products set on colour
 * tiles; trade-in on gold. El Messiri, cream by day and ink by night, a bar
 * with a colour for each tab. Its own parts, built only from Studio's
 * elements.
 */

/** D · the stage: warm cream and ink by day, near-black plum by night; the colours are the products'. */
export const STAGE_INK: SignatureInk = {
  page: "#FBF8F3",
  darkPage: "#110F13",
  surface: "#FFFFFF",
  darkSurface: "#1D1A20",
  ink: "#141218",
  darkInk: "#F7F3EE",
  muted: "#5F5965",
  darkMuted: "#B9B2BC",
  line: "#ECE6DD",
  darkLine: "#2E2A32",
  accent: "#2F4BE0",
  darkAccent: "#8FA2FF",
  fill: "#141218",
  darkFill: "#F7F3EE",
  onFill: "#FFFFFF",
  darkOnFill: "#141218",
};
const K = STAGE_INK;
const MESSIRI = "El Messiri";

/** The stage's colours, by day and a shade deeper by night; words on gold are ink, on the others white. */
const STAGE = {
  coral: { day: "#FF5A36", night: "#E4482A", ink: false },
  blue: { day: "#3B5BFF", night: "#3350E8", ink: false },
  emerald: { day: "#0FA374", night: "#0C8C63", ink: false },
  gold: { day: "#FFC531", night: "#F0B51D", ink: true },
  violet: { day: "#9C3BFF", night: "#8A2FE6", ink: false },
} as const;
type StageColour = keyof typeof STAGE;
const onColour = (c: StageColour) => (STAGE[c].ink ? { color: "#141218", dark_color: "#141218" } : { color: "#FFFFFF", dark_color: "#FFFFFF" });
const colourBg = (c: StageColour) => ({ background: STAGE[c].day, dark_background: STAGE[c].night });

const P = (name: string) => `/electronics-photos/${name}.jpg`;
const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
const tradeIn: Action = { type: "screen", screen: "search", flow: "trade_in" };
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));
export const STAGE_MENU_PAGE = "menu";
export const STAGE_COMPARE_PAGE = "compare";

const face = (size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: MESSIRI, size, weight: 700, line_height: 1.15, ...extra });
const say = (ctx: SectionContext, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode => inked(ctx, K, ctx.w(word), font, extra);

/** A section's title, large in El Messiri, with a quiet line and link. */
function head(ctx: SectionContext, title: SectionWord, link: { word: SectionWord; action: Action } | null, line?: SectionWord, padding: StudioSides = sides(28, 16, 12, 16)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    cross: "end",
    gap: 12,
    padding,
    children: [
      { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, title, face(25), { max_lines: 2 }), ...(line ? [say(ctx, line, { family: MESSIRI, size: 13, weight: 500 }, { muted: true, max_lines: 1 })] : [])] },
      ...(link ? [say(ctx, link.word, { family: MESSIRI, size: 13.5, weight: 600 }, { muted: true, max_lines: 1, action: link.action })] : []),
    ],
  };
}

/** The categories as story circles, each on a ring of the stage's colours (from Dashboard › Stories, these the first time). */
function storyCircles(ctx: SectionContext): StudioNode {
  const stories: readonly [string, SectionWord, StageColour][] = [
    ["phone-hand", "esPhones", "blue"],
    ["laptop-silver", "esLaptops", "violet"],
    ["hp-leather", "esAudio", "coral"],
    ["watch-blush", "esWatches", "emerald"],
    ["lens-gold", "esCameras", "gold"],
    ["gamepad-hands", "esGaming", "blue"],
  ];
  return {
    id: idOf(ctx)(),
    type: "stories",
    name: ctx.w("esStories"),
    stories_source: "dashboard",
    interval_ms: 5000,
    stories: { size: 70 },
    color: K.ink,
    dark_color: K.darkInk,
    padding: sides(6, 16, 6, 16),
    slides: stories.map(([photo, word, colour]) => ({ image_url: sigPhoto(ctx, P(photo)), ...sigTexts(ctx, { heading: word }), subheading: null, action: shop, ring: "highlight" as const, ring_color: STAGE[colour].day })),
  };
}

/** A device on its stage: its colour, its kicker and headline, the photo set on it and a round button. */
function stageCard(ctx: SectionContext, colour: StageColour, photo: string, kicker: SectionWord, title: SectionWord): StudioNode {
  const id = idOf(ctx);
  const ink = onColour(colour);
  const url = sigPhoto(ctx, P(photo));
  return {
    id: id(),
    type: "column",
    name: ctx.w(title),
    gap: 0,
    radius: 34,
    padding: sides(20, 20, 20, 20),
    action: shop,
    ...colourBg(colour),
    children: [
      say(ctx, kicker, { family: MESSIRI, size: 13.5, weight: 600 }, { ...ink, opacity: 0.86, max_lines: 1 }),
      say(ctx, title, face(25), { ...ink, max_lines: 2, margin: sides(2, 0, 12, 0) }),
      url
        ? { id: id(), type: "image", image_url: url, width: "fill", height: 236, radius: 26, fit: "cover", shadow: "strong" }
        : { id: id(), type: "column", width: "fill", height: 236, radius: 26, background: "#2A2530", dark_background: "#2A2530", children: [] },
      { id: id(), type: "row", width: "fill", height: 1, children: [] },
      {
        id: id(),
        type: "row",
        gap: 10,
        cross: "center",
        margin: sides(16, 0, 0, 0),
        children: [
          say(ctx, "esShopNow", { family: MESSIRI, size: 16, weight: 700 }, { ...ink, width: "fill", max_lines: 1 }),
          { id: id(), type: "icon", icon: "arrow_forward", icon_size: 22, color: STAGE[colour].day, dark_color: STAGE[colour].night, background: STAGE[colour].ink ? "#141218" : "#FFFFFF", dark_background: STAGE[colour].ink ? "#141218" : "#FFFFFF", radius: 26, padding: sides(14, 14, 14, 14) },
        ],
      },
    ],
  };
}

/** The stage: big cards that snap, one device on its colour each. */
function stage(ctx: SectionContext): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "slider",
    name: ctx.w("esStage"),
    height: 452,
    per_view: 1.12,
    gap: 12,
    autoplay: false,
    dots: true,
    indicator: "dots",
    indicator_look: { color: K.ink },
    padding: sides(10, 16, 4, 16),
    children: [
      stageCard(ctx, "coral", "watch-blush", "esStage1Kicker", "esStage1"),
      stageCard(ctx, "blue", "hp-white", "esStage2Kicker", "esStage2"),
      stageCard(ctx, "gold", "lens-gold", "esStage3Kicker", "esStage3"),
      stageCard(ctx, "emerald", "phone-unbox", "esStage4Kicker", "esStage4"),
      stageCard(ctx, "violet", "drone-mini", "esStage5Kicker", "esStage5"),
    ],
  };
}

/** A product set on a colour: its photo inset on the colour's tile, then its name and price under it. */
function colourCard(ctx: SectionContext, colour: StageColour, width: StudioNode["width"], height: number): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    width,
    gap: 4,
    children: [
      {
        id: id(),
        type: "column",
        width: "fill",
        height,
        radius: 26,
        align: "center",
        cross: "center",
        padding: sides(18, 18, 18, 18),
        ...colourBg(colour),
        children: [{ id: id(), type: "image", bind: "image", width: "fill", height: height - 36, radius: 18, fit: "cover", shadow: "medium" }],
      },
      { id: id(), type: "text", bind: "title", max_lines: 1, color: K.ink, dark_color: K.darkInk, font: { family: MESSIRI, size: 14.5, weight: 600 }, margin: sides(6, 2, 0, 2) },
      {
        id: id(),
        type: "row",
        gap: 6,
        cross: "center",
        padding: sides(0, 2, 0, 2),
        children: [
          { id: id(), type: "text", bind: "price", max_lines: 2, color: K.ink, dark_color: K.darkInk, font: { family: MESSIRI, size: 16, weight: 700 } },
          { id: id(), type: "text", bind: "sale", max_lines: 1, ...onColour(colour), ...colourBg(colour), radius: 8, padding: sides(2, 7, 2, 7), font: { size: 11, weight: 800 } },
        ],
      },
    ],
  };
}

/** The trade-in card on gold (the `trade_in` element; nothing until the shop takes trade-ins). */
function tradeCard(ctx: SectionContext): StudioNode {
  const t = sigTexts(ctx, { text: "esTradeTitle" });
  return { id: idOf(ctx)(), type: "trade_in", name: ctx.w("esTradeTitle"), text: t.text, translations: t.translations, tech: { look: "card", accent: "#141218" }, ...colourBg("gold"), ...onColour("gold"), radius: 30, padding: sides(20, 20, 20, 20), margin: sides(28, 16, 4, 16), action: tradeIn };
}

/** Two products side by side (the `compare` element) on an emerald frame. */
function compareBlock(ctx: SectionContext, margin = sides(0, 16, 0, 16)): StudioNode {
  return { id: idOf(ctx)(), type: "compare", name: ctx.w("esCompare"), tech: { accent: STAGE.emerald.day, rows: 5 }, color: K.ink, dark_color: K.darkInk, background: K.surface, dark_background: K.darkSurface, border_color: STAGE.emerald.day, dark_border_color: STAGE.emerald.night, border_width: 2, radius: 28, padding: sides(16, 14, 16, 14), margin };
}

/** A round button on a stage colour (the title's menu and bag). */
function stageDot(ctx: SectionContext, colour: StageColour, icon: string, name: SectionWord, action: Action): StudioNode {
  return { id: idOf(ctx)(), type: "icon", name: ctx.w(name), icon, icon_size: 21, ...onColour(colour), ...colourBg(colour), radius: 24, padding: sides(11, 11, 11, 11), action };
}

/** The home's title instead of a bar: the wordmark large in El Messiri, the categories and the bag as two colour dots beside it. */
function stageTitle(ctx: SectionContext): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "row",
    name: ctx.w("esWordmark"),
    gap: 8,
    cross: "center",
    padding: sides(10, 16, 2, 16),
    children: [
      say(ctx, "esWordmark", face(40, { line_height: 1.1 }), { width: "fill", max_lines: 1 }),
      stageDot(ctx, "coral", "grid_view", "esMenuButton", ownPage(ctx, STAGE_MENU_PAGE)),
      stageDot(ctx, "blue", "shopping_bag", "esBag", screen("cart")),
    ],
  };
}

export function stageHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 104, 0),
      children: [
        stageTitle(ctx),
        storyCircles(ctx),
        stage(ctx),
        head(ctx, "esMostWanted", { word: "esSeeAll", action: shop }, "esMostWantedLine"),
        { id: id(), type: "items", name: ctx.w("esMostWanted"), source: "products", layout: "grid", columns: 2, gap: 12, padding: sides(0, 16, 0, 16), query: { limit: 2, category_id: null, featured: false, sort: "price_desc", ids: [] }, card: colourCard(ctx, "coral", "fill", 196) },
        { id: id(), type: "items", name: ctx.w("esMostWanted"), source: "products", layout: "grid", columns: 2, gap: 12, padding: sides(14, 16, 0, 16), query: { limit: 2, category_id: null, featured: false, sort: "popular", ids: [], on_sale: true }, card: colourCard(ctx, "emerald", "fill", 196) },
        head(ctx, "esNewIn", { word: "esSeeAll", action: shop }),
        { id: id(), type: "items", name: ctx.w("esNewIn"), source: "products", layout: "carousel", gap: 12, padding: sides(0, 16, 0, 16), query: { limit: 8, category_id: null, featured: false, sort: "newest", ids: [] }, card: colourCard(ctx, "blue", 220, 240) },
        tradeCard(ctx),
        { id: id(), type: "flash_sale", name: ctx.w("esDeals"), ...sigTexts(ctx, { text: "esDeals" }), flash_sale: { look: "carousel", limit: 6, countdown: true, stock_bar: true, accent: STAGE.violet.day }, radius: 28, margin: sides(24, 16, 4, 16) },
        head(ctx, "esCompare", { word: "esSeeAll", action: ownPage(ctx, STAGE_COMPARE_PAGE) }, "esCompareLine"),
        compareBlock(ctx),
      ],
    },
  };
}

// ——— The pages after the home ———

/** A round-cornered pill of the menu's foot, on one of the stage's colours. */
function colourPill(ctx: SectionContext, colour: StageColour, word: SectionWord, icon: string, action: Action): StudioNode {
  const id = idOf(ctx);
  const ink = onColour(colour);
  return {
    id: id(),
    type: "row",
    name: ctx.w(word),
    width: "fill",
    height: 56,
    gap: 8,
    cross: "center",
    radius: 28,
    padding: sides(0, 16, 0, 16),
    action,
    ...colourBg(colour),
    children: [
      { id: id(), type: "icon", icon, icon_size: 20, ...ink },
      say(ctx, word, { family: MESSIRI, size: 14.5, weight: 700 }, { ...ink, max_lines: 1 }),
    ],
  };
}

/** The category menu: the search, every main category a row of photo cards that slides, then the account, orders, wishlist, language and contact as colour pills. */
export function stageMenuPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "esMenu" });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["search"], ...signatureHeader(K, "large") },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { id: id(), type: "search", name: ctx.w("esMenuSearch"), text: ctx.w("esMenuSearch"), source: "products", height: 52, radius: 26, background: K.surface, dark_background: K.darkSurface, color: K.muted, dark_color: K.darkMuted, border_color: K.line, dark_border_color: K.darkLine, border_width: 1, margin: sides(4, 16, 6, 16) },
        { id: id(), type: "categories", name: ctx.w("esMenu"), source: "products", style: "rows", category_menu: { look: "label", radius: 26, numbers: false }, color: K.ink, dark_color: K.darkInk, padding: sides(6, 0, 6, 0) },
        { id: id(), type: "row", gap: 10, margin: sides(16, 16, 0, 16), children: [colourPill(ctx, "coral", "esAccount", "person", screen("account")), colourPill(ctx, "blue", "esOrders", "package_2", screen("orders"))] },
        { id: id(), type: "row", gap: 10, margin: sides(10, 16, 0, 16), children: [colourPill(ctx, "emerald", "esWishlist", "favorite", screen("favorites")), colourPill(ctx, "gold", "esLanguage", "language", screen("settings"))] },
        {
          id: id(),
          type: "row",
          name: ctx.w("esContact"),
          gap: 12,
          cross: "center",
          radius: 28,
          padding: sides(14, 18, 14, 18),
          margin: sides(10, 16, 0, 16),
          ...colourBg("violet"),
          action: screen("account"),
          children: [
            { id: id(), type: "icon", icon: "support_agent", icon_size: 22, color: "#FFFFFF", dark_color: "#FFFFFF" },
            { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, "esContact", { family: MESSIRI, size: 15, weight: 700 }, { color: "#FFFFFF", dark_color: "#FFFFFF" }), say(ctx, "esContactLine", { size: 12 }, { color: "#FFFFFF", dark_color: "#FFFFFF", opacity: 0.85, max_lines: 2 })] },
          ],
        },
      ],
    },
  };
}

export function stageComparePage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "esComparePage" });
  const s = sigTexts(ctx, { text: "esCompare" });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...signatureHeader(K, "large") },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { ...say(ctx, "esCompareLine", { family: MESSIRI, size: 15 }, { muted: true }), padding: sides(8, 16, 12, 16) },
        compareBlock(ctx),
        { id: id(), type: "spec_table", name: ctx.w("esCompare"), text: s.text, translations: s.translations, tech: { rows: 12 }, color: K.ink, dark_color: K.darkInk, background: K.surface, dark_background: K.darkSurface, radius: 28, padding: sides(16, 16, 16, 16), margin: sides(14, 16, 0, 16) },
      ],
    },
  };
}

/** Over the shop: the story circles, and a blue banner. */
function shopTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "categories", name: ctx.w("esStories"), source: "products", style: "circles", color: K.ink, dark_color: K.darkInk, padding: sides(6, 12, 4, 12) },
    {
      id: id(),
      type: "row",
      name: ctx.w("esShopTitle"),
      gap: 12,
      cross: "center",
      radius: 28,
      padding: sides(16, 18, 16, 18),
      margin: sides(6, 16, 8, 16),
      ...colourBg("blue"),
      action: shop,
      children: [
        { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, "esShopKicker", { family: MESSIRI, size: 12.5, weight: 600 }, { color: "#FFFFFF", dark_color: "#FFFFFF", opacity: 0.85 }), say(ctx, "esShopTitle", face(22), { color: "#FFFFFF", dark_color: "#FFFFFF", max_lines: 2 })] },
        { id: id(), type: "icon", icon: "sell", icon_size: 26, color: STAGE.blue.day, dark_color: STAGE.blue.night, background: "#FFFFFF", dark_background: "#FFFFFF", radius: 24, padding: sides(11, 11, 11, 11) },
      ],
    },
    { id: id(), type: "listing_filters", name: ctx.w("esShopTitle"), color: K.ink, dark_color: K.darkInk, padding: sides(2, 16, 4, 16) },
  ];
}

function cartTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "coupon", name: ctx.w("elCoupon"), code: ELECTRONICS_COUPON_CODE, coupon: { look: "ticket", bind: "public" }, radius: 24, color: STAGE.coral.day, margin: sides(10, 16, 4, 16) },
    {
      id: id(),
      type: "column",
      name: ctx.w("elReturnsNote"),
      gap: 10,
      radius: 24,
      padding: sides(14, 16, 14, 16),
      margin: sides(8, 16, 4, 16),
      ...colourBg("emerald"),
      children: [
        { id: id(), type: "row", gap: 12, cross: "center", children: [{ id: id(), type: "icon", icon: "verified", icon_size: 22, color: "#FFFFFF", dark_color: "#FFFFFF" }, say(ctx, "elReturnsNote", { size: 13, weight: 600, line_height: 1.4 }, { color: "#FFFFFF", dark_color: "#FFFFFF", width: "fill", max_lines: 3 })] },
        installmentsTag(ctx, { color: "#FFFFFF", dark_color: "#FFFFFF", background: "#0B7F5A", dark_background: "#096B4C" }),
      ],
    },
  ];
}

function ordersTop(ctx: SectionContext): StudioNode[] {
  const step = (title: SectionWord, text: SectionWord, highlight = false) => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    head(ctx, "elTrack", null, undefined, sides(12, 16, 10, 16)),
    {
      id: idOf(ctx)(),
      type: "timeline",
      name: ctx.w("elTrack"),
      timeline: { style: "vertical", source: "latest_order" },
      color: K.ink,
      dark_color: K.darkInk,
      background: K.surface,
      dark_background: K.darkSurface,
      border_color: STAGE.blue.day,
      dark_border_color: STAGE.blue.night,
      border_width: 2,
      radius: 28,
      padding: sides(16, 16, 16, 16),
      margin: sides(0, 16, 6, 16),
      entries: [step("elTrack1", "elTrack1Text", true), step("elTrack2", "elTrack2Text"), step("elTrack3", "elTrack3Text"), step("elTrack4", "elTrack4Text")],
    },
  ];
}

function stageOver(screenName: string, ctx: SectionContext): StudioNode[] | null {
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

const STAGE_SCREENS = signatureScreens({
  style: "card",
  photo: P("w-phone-camera"),
  title: { en: "Colour your tech", ar: "لوّن أجهزتك", tr: "Teknolojinize renk katın" },
  subtitle: { en: "Sign in for your orders, your wishlist and your warranty.", ar: "سجّل الدخول لطلباتك ومفضلتك وضمانك.", tr: "Siparişleriniz, favorileriniz ve garantiniz için giriş yapın." },
  menu: "card",
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** D's bar: across the bottom on the page's cream, each tab its own colour. */
export const STAGE_BAR = signatureBar(K, { design: "colours", background: K.surface, dark_background: K.darkSurface, active: STAGE.coral.day, dark_active: STAGE.coral.day, inactive: K.muted, dark_inactive: K.darkMuted, labels: "always", radius: 0, margin: 0 });

export const STAGE_D: SignatureDesign = {
  demo: "electronics",
  variant: "d",
  template: { id: "electronics_signature_d", icon: "palette", fits: { types: ["store"], plain: true } },
  home: stageHome,
  over: stageOver,
  tabs: electronicsTabs,
  pages: (ctx) => [
    { slug: STAGE_MENU_PAGE, title: "esMenu", studio: stageMenuPage(ctx) },
    { slug: STAGE_COMPARE_PAGE, title: "esComparePage", studio: stageComparePage(ctx) },
  ],
  bar: STAGE_BAR,
  look: { header: signatureHeader(K, "large"), background: K.page, dark_background: K.darkPage },
  chrome: { header: "large", system: "large" },
  isNew: true,
  project: {
    primary: STAGE.blue.day,
    appearance: { secondary_color: STAGE.coral.day, font: "Bricolage Grotesque", font_family: MESSIRI, dark_background: K.darkPage, dark_surface: K.darkSurface },
    screens: STAGE_SCREENS,
  },
};
