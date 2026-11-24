import { STUDIO_PRODUCT_SCREEN, type Action, LayoutTab, StudioCorners, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { installmentsTag } from "../installments";
import { PRODUCT_PAGE_SLUG, productPart, type ProductPagePart } from "../product-page";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigPhoto, sigTexts, signatureBar, signatureHeader, type SignatureInk } from "./food-signature-parts";
import { COMPUTERS_COUPON_CODE, computersTabs } from "./computers-signature";

/**
 * 227 Nawah's look C, the battle station (the computers type's main look):
 * neon RGB on black. Angular cards with two corners cut, text tabs of what
 * you play, the Build your PC configurator first (processor, then graphics,
 * then memory, and the button that starts it), graphics cards and ready
 * builds with their frame-rate badges in neon green, the shop by graphics,
 * parts on sale and gear. Changa throughout, a faint grid by night, a black
 * bar that glows. By day the page is cool grey and the configurator and bar
 * stay black. Its own parts, built only from Studio's elements.
 */

/** C · the battle station: cool grey and black by day, black and neon by night. */
export const BATTLE_INK: SignatureInk = {
  page: "#E6E8EE",
  darkPage: "#040507",
  surface: "#FFFFFF",
  darkSurface: "#0E1017",
  ink: "#0B0C12",
  darkInk: "#F1F3FA",
  muted: "#545868",
  darkMuted: "#A0A6B8",
  line: "#D0D3DC",
  darkLine: "#1F2331",
  accent: "#B80F86",
  darkAccent: "#FF4FDC",
  fill: "#0B0C12",
  darkFill: "#FF2BD6",
  onFill: "#FFFFFF",
  darkOnFill: "#0B0C12",
};
const K = BATTLE_INK;
const NEON = { magenta: "#FF2BD6", cyan: "#22E6FF", green: "#7CFF4F" } as const;
/** The black of the configurator, the badges and the bar, the same by day and by night. */
const BLACK = "#0B0C12";
const CHANGA = "Changa";
/** Two corners cut, two square: the station's angular card. */
const CUT = (r = 18): StudioCorners => ({ top_start: 0, top_end: r, bottom_end: 0, bottom_start: r });

const P = (name: string) => `/computers-photos/${name}.jpg`;
const shop: Action = screen("search");
const build: Action = { type: "screen", screen: "search", flow: "pc_builder" };
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? build : pageOf(slug));
export const BATTLE_MENU_PAGE = "menu";
export const BATTLE_BUILD_PAGE = "build-your-pc";

const face = (size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: CHANGA, size, weight: 800, line_height: 1.12, ...extra });
const say = (ctx: SectionContext, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode => inked(ctx, K, ctx.w(word), font, extra);
const on = (color: string) => ({ color, dark_color: color });

/** A card of the station: the surface, a fine line, two corners cut. */
function card(extra: Partial<StudioNode> = {}): Partial<StudioNode> {
  return { corners: CUT(), background: K.surface, dark_background: K.darkSurface, border_color: K.line, dark_border_color: K.darkLine, border_width: 1, ...extra };
}

/** A frame-rate badge: neon green words on black, a green edge that glows. */
function fpsBadge(ctx: SectionContext, word: SectionWord, extra: Partial<StudioNode> = {}): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "text",
    name: ctx.w(word),
    text: ctx.w(word),
    max_lines: 1,
    font: { family: CHANGA, size: 11.5, weight: 800 },
    ...on(NEON.green),
    background: BLACK,
    dark_background: BLACK,
    border_color: NEON.green,
    dark_border_color: NEON.green,
    border_width: 1,
    corners: CUT(8),
    surface: { glow: "#7CFF4F" },
    padding: sides(2, 8, 2, 8),
    ...extra,
  };
}

/** A section's title in two inks (its word, then its code in magenta) and a cyan link. */
function head(ctx: SectionContext, title: SectionWord, code: SectionWord | null, link: { word: SectionWord; action: Action } | null, padding: StudioSides = sides(24, 16, 10, 16)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    cross: "end",
    gap: 8,
    padding,
    children: [
      say(ctx, title, face(21), { max_lines: 1 }),
      ...(code ? [say(ctx, code, { family: CHANGA, size: 13, weight: 800, letter_spacing: 1 }, { accent: true, max_lines: 1, margin: sides(0, 0, 3, 0) })] : []),
      { id: id(), type: "row", width: "fill", height: 1, children: [] },
      ...(link ? [say(ctx, link.word, { family: CHANGA, size: 13, weight: 700 }, { color: "#007E9E", dark_color: NEON.cyan, max_lines: 1, action: link.action })] : []),
    ],
  };
}

/** What you play, as text tabs with cut corners (the first lit), each opening the shop. */
function playTabs(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const words: SectionWord[] = ["pbTabGaming", "pbTabStream", "pbTabParts", "pbTabGear"];
  return {
    id: id(),
    type: "row",
    name: ctx.w("pbTabGaming"),
    gap: 6,
    scroll: true,
    padding: sides(6, 16, 6, 16),
    children: words.map((w, i) => ({
      id: id(),
      type: "text" as const,
      name: ctx.w(w),
      text: ctx.w(w),
      max_lines: 1,
      font: { family: CHANGA, size: 13.5, weight: 700 },
      corners: CUT(12),
      padding: sides(6, 16, 7, 16),
      action: shop,
      ...(i === 0 ? { color: "#FFFFFF", dark_color: BLACK, background: BLACK, dark_background: K.darkInk } : { color: K.ink, dark_color: K.darkInk, border_color: K.line, dark_border_color: K.darkLine, border_width: 1 }),
    })),
  };
}

/** One step of the configurator: its number on magenta (later steps dim), its part and line. */
function step(ctx: SectionContext, n: string, title: SectionWord, line: SectionWord, lit: boolean): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    gap: 12,
    cross: "center",
    padding: sides(12, 12, 12, 12),
    background: "#151721",
    dark_background: "#151721",
    border_color: "#262A3B",
    dark_border_color: "#262A3B",
    border_width: 1,
    action: build,
    children: [
      { id: id(), type: "text", text: n, width: 32, height: 32, text_align: "center", font: { family: CHANGA, size: 15, weight: 800, line_height: 2.1 }, corners: CUT(10), ...(lit ? { ...on(BLACK), background: NEON.magenta, dark_background: NEON.magenta } : { ...on("#A0A6B8"), background: "#232636", dark_background: "#232636" }) },
      { id: id(), type: "column", width: "fill", gap: 1, children: [say(ctx, title, { family: CHANGA, size: 14.5, weight: 700 }, { ...on("#F1F3FA"), max_lines: 1 }), say(ctx, line, { family: CHANGA, size: 11.5, weight: 400 }, { ...on("#A0A6B8"), max_lines: 1 })] },
      { id: id(), type: "icon", icon: lit ? "bolt" : "lock", icon_size: 18, ...on(lit ? NEON.cyan : "#5D6275") },
    ],
  };
}

/** The configurator: black by day and by night, a magenta edge that glows, the three parts in order and the gradient button that starts Build your PC. */
function configurator(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("pbBuildTitle"),
    gap: 10,
    corners: CUT(24),
    padding: sides(18, 18, 18, 18),
    margin: sides(10, 16, 0, 16),
    background: BLACK,
    dark_background: BLACK,
    border_color: NEON.magenta,
    dark_border_color: NEON.magenta,
    border_width: 1.5,
    surface: { glow: "#FF2BD6", pattern: "grid", pattern_strength: 0.05 },
    children: [
      say(ctx, "pbBuildKicker", { family: CHANGA, size: 12, weight: 800, letter_spacing: 2 }, { ...on(NEON.cyan), max_lines: 1 }),
      say(ctx, "pbBuildTitle", face(26), { ...on("#FFFFFF"), max_lines: 2, margin: sides(0, 0, 4, 0) }),
      step(ctx, "1", "pbStepCpu", "pbStepCpuLine", true),
      step(ctx, "2", "pbStepGpu", "pbStepGpuLine", false),
      step(ctx, "3", "pbStepRam", "pbStepRamLine", false),
      {
        id: id(),
        type: "row",
        name: ctx.w("pbStart"),
        height: 50,
        gap: 8,
        align: "center",
        cross: "center",
        corners: CUT(16),
        margin: sides(6, 0, 0, 0),
        gradient: { from: NEON.magenta, to: NEON.cyan, angle: 0 },
        motion: { press: "shrink" },
        action: ownPage(ctx, BATTLE_BUILD_PAGE),
        children: [say(ctx, "pbStart", { family: CHANGA, size: 16, weight: 800 }, { ...on(BLACK), max_lines: 1 }), { id: id(), type: "icon", icon: "arrow_forward", icon_size: 20, ...on(BLACK) }],
      },
    ],
  };
}

/** A part as a station card: its photo, its line in neon green on black, its name and price. */
function partCard(ctx: SectionContext, width: StudioNode["width"], height: number): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    width,
    gap: 5,
    padding: sides(10, 10, 12, 10),
    ...card(),
    children: [
      {
        id: id(),
        type: "stack",
        width: "fill",
        height,
        children: [
          { id: id(), type: "image", bind: "image", width: "fill", height, corners: CUT(12), fit: "cover", background: "#D9DCE4", dark_background: "#171A24" },
          { id: id(), type: "text", bind: "sale", font: { family: CHANGA, size: 11, weight: 800 }, ...on(BLACK), background: NEON.magenta, dark_background: NEON.magenta, corners: CUT(6), padding: sides(2, 7, 2, 7), place: { x: 5, y: 6 } },
        ],
      },
      { id: id(), type: "text", bind: "subtitle", max_lines: 1, font: { family: CHANGA, size: 11, weight: 700 }, ...on(NEON.green), background: BLACK, dark_background: BLACK, corners: CUT(6), padding: sides(2, 7, 2, 7), self_align: "start", margin: sides(4, 0, 0, 0) },
      { id: id(), type: "text", bind: "title", max_lines: 2, color: K.ink, dark_color: K.darkInk, font: { family: CHANGA, size: 14, weight: 700, line_height: 1.25 } },
      {
        id: id(),
        type: "row",
        gap: 6,
        cross: "center",
        children: [
          { id: id(), type: "text", bind: "price", max_lines: 2, color: K.ink, dark_color: K.darkInk, font: { family: CHANGA, size: 17, weight: 800 } },
          { id: id(), type: "text", bind: "was_price", max_lines: 1, color: K.muted, dark_color: K.darkMuted, font: { family: CHANGA, size: 12 } },
        ],
      },
    ],
  };
}

/** A ready build: its photo under a shade, its frame-rate badge, its name and line in cyan. */
function rigTile(ctx: SectionContext, photo: string, fps: SectionWord, title: SectionWord, line: SectionWord): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "photo_hero",
    name: ctx.w(title),
    image_url: sigPhoto(ctx, P(photo)),
    width: "fill",
    height: 196,
    corners: CUT(20),
    background: BLACK,
    scrim: { color: "#040507", from: 0.1, middle: 0.2, at: 45, to: 0.88 },
    align: "between",
    padding: sides(12, 12, 12, 12),
    action: shop,
    children: [
      fpsBadge(ctx, fps, { self_align: "start" }),
      {
        id: idOf(ctx)(),
        type: "column",
        gap: 1,
        children: [say(ctx, title, face(17), { ...on("#FFFFFF"), max_lines: 1 }), say(ctx, line, { family: CHANGA, size: 11.5, weight: 600 }, { ...on(NEON.cyan), max_lines: 2 })],
      },
    ],
  };
}

/** The shop by a spec (`spec_filter`): the values the shop's products take, as chips. */
function specFilter(ctx: SectionContext, spec: "cpu" | "ram" | "storage" | "gpu", title: SectionWord, margin = sides(0, 16, 0, 16)): StudioNode {
  const t = sigTexts(ctx, { text: title });
  return { id: idOf(ctx)(), type: "spec_filter", name: ctx.w(title), text: t.text, translations: t.translations, tech: { spec, accent: NEON.magenta, rows: 6 }, color: K.ink, dark_color: K.darkInk, margin };
}

/** A cut-corner button of the station's header: its icon in cyan on black, a fine edge. */
function hudButton(ctx: SectionContext, icon: string, name: SectionWord, action: Action): StudioNode {
  return { id: idOf(ctx)(), type: "icon", name: ctx.w(name), icon, icon_size: 22, ...on(NEON.cyan), background: "#151824", dark_background: "#151824", border_color: "#2A2F45", dark_border_color: "#2A2F45", border_width: 1, corners: CUT(10), padding: sides(9, 9, 9, 9), action };
}

/** The station's header, black by day and by night: the category menu, the bolt glyph and the wordmark spaced wide, the cart. */
function hudHeader(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("pbWordmark"),
    gap: 10,
    cross: "center",
    padding: sides(10, 16, 10, 16),
    background: BLACK,
    dark_background: BLACK,
    children: [
      hudButton(ctx, "apps", "pbMenu", ownPage(ctx, BATTLE_MENU_PAGE)),
      { id: id(), type: "icon", icon: "bolt", icon_size: 22, ...on(NEON.magenta) },
      say(ctx, "pbWordmark", face(20, { letter_spacing: 3 }), { ...on("#FFFFFF"), width: "fill", max_lines: 1 }),
      hudButton(ctx, "shopping_cart", "pbCart", screen("cart")),
    ],
  };
}

export function battleHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 108, 0),
      children: [
        hudHeader(ctx),
        { ...playTabs(ctx), padding: sides(10, 16, 6, 16) },
        configurator(ctx),
        head(ctx, "pbGpus", "pbGpusAccent", { word: "pbAll", action: shop }),
        { id: id(), type: "items", name: ctx.w("pbGpus"), source: "products", layout: "carousel", gap: 12, padding: sides(0, 16, 0, 16), query: { limit: 8, category_id: null, featured: true, sort: "popular", ids: [] }, card: partCard(ctx, 196, 128) },
        { ...specFilter(ctx, "gpu", "pbByGpu"), margin: sides(14, 16, 0, 16) },
        head(ctx, "pbRigs", "pbRigsAccent", { word: "pbAll", action: shop }),
        { id: id(), type: "row", gap: 10, padding: sides(0, 16, 0, 16), children: [rigTile(ctx, "setup-purple", "pbFps4k", "pbRig4k", "pbRig4kLine"), rigTile(ctx, "kb-rgb", "pbFps1440", "pbRigStream", "pbRigStreamLine")] },
        { ...rigTile(ctx, "pad-blue", "pbFps1080", "pbRigEsports", "pbRigEsportsLine"), height: 150, margin: sides(10, 16, 0, 16) },
        { id: id(), type: "flash_sale", name: ctx.w("pbDeals"), ...sigTexts(ctx, { text: "pbDeals" }), flash_sale: { look: "carousel", limit: 6, countdown: true, stock_bar: true, accent: NEON.magenta }, corners: CUT(22), margin: sides(24, 16, 4, 16) },
        head(ctx, "pbGear", "pbGearAccent", { word: "pbAll", action: shop }),
        { id: id(), type: "items", name: ctx.w("pbGear"), source: "products", layout: "grid", columns: 2, gap: 10, padding: sides(0, 16, 0, 16), query: { limit: 4, category_id: null, featured: false, sort: "price_asc", ids: [] }, card: partCard(ctx, "fill", 112) },
        head(ctx, "pbCompare", null, null),
        { id: id(), type: "compare", name: ctx.w("pbCompare"), tech: { accent: NEON.magenta, rows: 5 }, color: K.ink, dark_color: K.darkInk, ...card({ corners: CUT(22) }), padding: sides(14, 14, 14, 14), margin: sides(0, 16, 0, 16) },
      ],
    },
  };
}

// ——— The pages after the home ———

/** A row of the menu's foot: an icon on black, its word, a chevron. */
function menuRow(ctx: SectionContext, word: SectionWord, icon: string, action: Action): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(word),
    gap: 12,
    cross: "center",
    padding: sides(10, 12, 10, 12),
    action,
    ...card({ corners: CUT(14) }),
    children: [
      { id: id(), type: "icon", icon, icon_size: 20, ...on(NEON.cyan), background: BLACK, dark_background: BLACK, corners: CUT(8), padding: sides(7, 7, 7, 7) },
      say(ctx, word, { family: CHANGA, size: 14, weight: 700 }, { width: "fill", max_lines: 1 }),
      { id: id(), type: "icon", icon: "chevron_right", icon_size: 20, color: K.muted, dark_color: K.darkMuted },
    ],
  };
}

/** The category menu: the search, every main category a row of photo cards that slides, then the account, orders, wishlist, language and contact. */
export function battleMenuPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "pbWordmark" });
  return {
    header: { type: "logo_center", title: t.title, translations: t.translations, buttons: ["search"], ...signatureHeader(K, "glass") },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { id: id(), type: "search", name: ctx.w("pbMenuSearch"), text: ctx.w("pbMenuSearch"), source: "products", height: 50, corners: CUT(14), background: K.surface, dark_background: K.darkSurface, color: K.muted, dark_color: K.darkMuted, border_color: K.line, dark_border_color: K.darkLine, border_width: 1, margin: sides(4, 16, 6, 16) },
        { id: id(), type: "categories", name: ctx.w("pbMenu"), source: "products", style: "rows", category_menu: { look: "label", radius: 6, numbers: true }, color: K.ink, dark_color: K.darkInk, padding: sides(6, 0, 6, 0) },
        { id: id(), type: "column", gap: 8, margin: sides(14, 16, 0, 16), children: [menuRow(ctx, "pbAccount", "person", screen("account")), menuRow(ctx, "pbOrders", "inventory_2", screen("orders")), menuRow(ctx, "pbWishlist", "favorite", screen("favorites")), menuRow(ctx, "pbLanguage", "language", screen("settings")), menuRow(ctx, "pbContact", "support_agent", screen("account"))] },
        { ...say(ctx, "pbContactLine", { family: CHANGA, size: 12 }, { muted: true, max_lines: 2 }), padding: sides(8, 18, 0, 18) },
      ],
    },
  };
}

/** Build your PC's page: the builder (`pc_builder`), then the shop by graphics and by memory. */
export function battleBuildPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "pbBuildPage" });
  const s = sigTexts(ctx, { text: "pbBuildCard" });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...signatureHeader(K, "glass") },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { ...say(ctx, "pbBuildLine", { family: CHANGA, size: 14, weight: 400, line_height: 1.5 }, { muted: true }), padding: sides(8, 16, 6, 16) },
        { id: id(), type: "pc_builder", name: ctx.w("pbBuildPage"), text: s.text, translations: s.translations, tech: { accent: NEON.magenta }, ...on("#F1F3FA"), background: BLACK, dark_background: BLACK, border_color: NEON.magenta, dark_border_color: NEON.magenta, border_width: 1.5, corners: CUT(24), surface: { glow: "#FF2BD6" }, padding: sides(16, 16, 16, 16), margin: sides(8, 16, 0, 16) },
        { ...specFilter(ctx, "gpu", "pbByGpu"), margin: sides(20, 16, 0, 16) },
        { ...specFilter(ctx, "ram", "pbByRam"), margin: sides(16, 16, 0, 16) },
      ],
    },
  };
}

/** Over the shop: the categories as chips and a black loadout banner. */
function shopTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "categories", name: ctx.w("pbMenu"), source: "products", style: "chips", color: K.ink, dark_color: K.darkInk, padding: sides(4, 12, 4, 12) },
    {
      id: id(),
      type: "row",
      name: ctx.w("pbShopTitle"),
      gap: 12,
      cross: "center",
      corners: CUT(18),
      padding: sides(14, 16, 14, 16),
      margin: sides(6, 16, 6, 16),
      background: BLACK,
      dark_background: BLACK,
      border_color: NEON.cyan,
      dark_border_color: NEON.cyan,
      border_width: 1,
      action: ownPage(ctx, BATTLE_BUILD_PAGE),
      children: [
        { id: id(), type: "column", width: "fill", gap: 1, children: [say(ctx, "pbShopKicker", { family: CHANGA, size: 11, weight: 800, letter_spacing: 2 }, { ...on(NEON.cyan), max_lines: 1 }), say(ctx, "pbShopTitle", face(19), { ...on("#FFFFFF"), max_lines: 2 })] },
        { id: id(), type: "icon", icon: "memory", icon_size: 26, ...on(NEON.magenta) },
      ],
    },
    { id: id(), type: "listing_filters", name: ctx.w("pbShopTitle"), color: K.ink, dark_color: K.darkInk, padding: sides(2, 16, 4, 16) },
  ];
}

function cartTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "coupon", name: ctx.w("pcCoupon"), code: COMPUTERS_COUPON_CODE, coupon: { look: "ticket", bind: "public" }, radius: 6, color: NEON.magenta, margin: sides(10, 16, 4, 16) },
    { id: id(), type: "column", gap: 10, padding: sides(12, 14, 12, 14), margin: sides(8, 16, 4, 16), ...card({ corners: CUT(14) }), children: [installmentsTag(ctx, { color: K.muted, dark_color: K.darkMuted, background: K.page, dark_background: K.darkPage })] },
  ];
}

function ordersTop(ctx: SectionContext): StudioNode[] {
  const entry = (title: SectionWord, text: SectionWord, highlight = false) => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    head(ctx, "pcTrack", null, null, sides(10, 16, 8, 16)),
    {
      id: idOf(ctx)(),
      type: "timeline",
      name: ctx.w("pcTrack"),
      timeline: { style: "vertical", source: "latest_order" },
      color: K.ink,
      dark_color: K.darkInk,
      ...card({ corners: CUT(20) }),
      padding: sides(16, 14, 16, 14),
      margin: sides(0, 16, 6, 16),
      entries: [entry("pcTrack1", "pcTrack1Text", true), entry("pcTrack2", "pcTrack2Text"), entry("pcTrack3", "pcTrack3Text"), entry("pcTrack4", "pcTrack4Text")],
    },
  ];
}

function battleOver(screenName: string, ctx: SectionContext): StudioNode[] | null {
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

/** The battle station's tabs: the computers shop's five, with a controller for Home and a chip for the shop. */
export function battleTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  return computersTabs(tabs).map((t) => {
    const target = t.target.type === "screen" ? t.target.screen : null;
    if (t.id === "home") return { ...t, icon: "sports_esports" };
    if (target === "search") return { ...t, icon: "memory" };
    if (target === "cart") return { ...t, icon: "shopping_cart" };
    if (target === "orders") return { ...t, icon: "inventory_2" };
    return t;
  });
}

function battleProductPage(ctx: SectionContext): { slug: string; title: SectionWord; studio: StudioPage } {
  const id = idOf(ctx);
  const part = (p: ProductPagePart): StudioNode => productPart(ctx, p);
  const ink = { color: K.ink, dark_color: K.darkInk } as const;
  const neonInk = on("#F1F3FA");
  const magenta = { accent: NEON.magenta, dark_accent: NEON.magenta } as const;
  // The spec block is white by day: the app draws a table's stripes and labels in its own day colours.
  const blackCard = (children: StudioNode[], edge: string = NEON.magenta, day: string = BLACK): StudioNode => ({
    id: id(),
    type: "column",
    gap: 10,
    corners: CUT(22),
    padding: sides(16, 16, 16, 16),
    background: day,
    dark_background: BLACK,
    border_color: edge,
    dark_border_color: edge,
    border_width: 1.5,
    surface: { glow: edge },
    children,
  });
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
        gap: 12,
        padding: sides(56, 16, 24, 16),
        children: [
          // 227 The part in a black cut-corner frame that glows, its photos with their thumbnails.
          blackCard([part({ type: "product_gallery", look: "thumbs", radius: 0, node: { aspect_ratio: 4 / 3 } })]),
          part({ type: "product_title", look: "rating", ...magenta, node: { ...ink, font: face(25), margin: sides(4, 2, 0, 2) } }),
          part({ type: "product_price", look: "from", node: { color: "#B80F86", dark_color: NEON.magenta, font: face(24), margin: sides(0, 2, 0, 2) } }),
          part({ type: "product_variants", look: "grid", ...magenta, node: { ...ink } }),
          // The spec block: black, a cyan edge, its code and title, the table in light words.
          blackCard(
            [
              { id: id(), type: "row", gap: 8, cross: "end", children: [say(ctx, "pbSpecsTitle", face(18), { color: K.ink, dark_color: "#F1F3FA", max_lines: 1 }), say(ctx, "pbSpecsCode", { family: CHANGA, size: 12, weight: 800, letter_spacing: 1 }, { color: "#0A7F94", dark_color: NEON.cyan, max_lines: 1 })] },
              part({ type: "product_specs", look: "table", rows: 12, node: { color: K.ink, dark_color: "#F1F3FA" } }),
            ],
            NEON.cyan,
            "#FFFFFF",
          ),
          part({ type: "product_quantity", look: "stepper", node: { ...ink } }),
          part({ type: "product_delivery", look: "rows", ...magenta, node: { ...ink, ...card({ corners: CUT(16) }), padding: sides(12, 14, 12, 14) } }),
          part({ type: "product_reviews", look: "bars", ...magenta, node: { ...ink } }),
          part({ type: "product_description", look: "accordion", node: { ...ink } }),
          part({ type: "product_related", look: "carousel", related: "related", text: "pbFitTitle", rows: 8, node: { ...ink, margin: sides(0, 0, 84, 0) } }),
          part({ type: "product_buy", look: "buy_now", ...magenta, node: { pin: "bottom", ...neonInk, corners: CUT(18), padding: sides(10, 14, 10, 14), background: BLACK, dark_background: BLACK, border_color: NEON.cyan, dark_border_color: NEON.cyan, border_width: 1 } }),
        ],
      },
    },
  };
}

const BATTLE_SCREENS = signatureScreens({
  style: "photo",
  photo: P("setup-purple"),
  title: { en: "Ready, player?", ar: "مستعد أيها اللاعب؟", tr: "Hazır mısın oyuncu?" },
  subtitle: { en: "Sign in for your builds, your orders and your warranty.", ar: "سجّل الدخول لتجميعاتك وطلباتك وضمانك.", tr: "Sistemleriniz, siparişleriniz ve garantiniz için giriş yapın." },
  menu: "night",
  accent: NEON.magenta,
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** C's bar: black by day and by night, floating, the open tab glowing cyan. */
export const BATTLE_BAR = signatureBar(K, { design: "glow", background: BLACK, dark_background: BLACK, active: NEON.cyan, dark_active: NEON.cyan, inactive: "#7D8396", dark_inactive: "#7D8396", labels: "always", radius: 20, margin: 14 });

export const BATTLE_C: SignatureDesign = {
  demo: "computers",
  variant: "c",
  template: { id: "computers_signature_c", icon: "memory", fits: { types: ["store"], plain: true } },
  home: battleHome,
  over: battleOver,
  tabs: battleTabs,
  pages: (ctx) => [
    // 227 Its own product page (228.7): the part in neon cut-corner frames.
    battleProductPage(ctx),
    { slug: BATTLE_MENU_PAGE, title: "pbMenu", studio: battleMenuPage(ctx) },
    { slug: BATTLE_BUILD_PAGE, title: "pbBuildPage", studio: battleBuildPage(ctx) },
  ],
  bar: BATTLE_BAR,
  look: { header: signatureHeader(K, "glass"), background: K.page, dark_background: K.darkPage },
  chrome: { header: "glass", system: "photo" },
  isNew: true,
  project: {
    primary: "#C4108F",
    appearance: { secondary_color: "#0B0C12", font: "Lexend", font_family: CHANGA, dark_background: K.darkPage, dark_surface: K.darkSurface },
    screens: BATTLE_SCREENS,
  },
};
