import type { Action, LayoutTab, StudioEntry, StudioFont, StudioHeaderButton, StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigPhoto, sigTexts, signatureBar, type SignatureInk } from "./food-signature-parts";
import { mixedProductPage } from "./product-page-mix";

/**
 * 223 Lujain's template C, RUNWAY (the owner, 23 November 2026): the clothes
 * type's main template, the demo itself, an app-native lookbook as the best
 * fashion apps have it, drawn from its own parts (none of the shop kit's,
 * none of A's or B's):
 *
 * - the home opens on an edge-to-edge slider of the season's looks, 640
 *   points tall, under a transparent header with a tiny centred wordmark;
 * - the categories as text-only tabs over a hairline, the burgundy line
 *   under the first;
 * - big, quiet type (Reem Kufi, light) and the pieces as tall 3:4 photos
 *   with no box around them;
 * - an editor's quote on a full-bleed photo, an index of the categories as
 *   lines of text, the size guide as one quiet line;
 * - ivory and black by day, near-black and ivory by night, one burgundy;
 * - a minimal bar of icons and words, no pill.
 *
 * The category menu (the header's menu button) is a page of its own: the
 * search, every main category a row of cards (its sub-categories sliding in
 * it), then the account, the orders, the wishlist, the language and a
 * stylist to talk to as lines of text. Every word in Studio's three
 * languages (lib/studio/words/clothes-cd.ts); every part an element the
 * owner can change.
 */

/** Ivory and black, one burgundy; near-black and ivory by night. */
export const RUNWAY_INK: SignatureInk = {
  page: "#F6F2EA",
  darkPage: "#0D0C0B",
  surface: "#FFFFFF",
  darkSurface: "#171513",
  ink: "#141211",
  darkInk: "#F2EDE4",
  muted: "#5F5850",
  darkMuted: "#A89E92",
  line: "#E2DBCF",
  darkLine: "#2A2622",
  accent: "#7A1F30",
  darkAccent: "#D9798A",
  fill: "#141211",
  darkFill: "#F2EDE4",
  onFill: "#F6F2EA",
  darkOnFill: "#141211",
};
const K = RUNWAY_INK;
const FACE = "Reem Kufi";
/** The face of everything that isn't display: names, prices, tabs, links, the bar (sturdier than Reem Kufi at small sizes; the project's Arabic font). */
const UI = "Noto Kufi Arabic";
const WHITE = "#FFFFFF";

/** Lujain's photos (public/clothes-photos, CC0, credited in CREDITS.md). */
const P = (name: string) => `/clothes-photos/${name}.jpg`;

const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));
export const RUNWAY_MENU_PAGE = "menu";
export const RUNWAY_SIZE_PAGE = "size-guide";

const face = (size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: FACE, size, weight: 400, line_height: 1.2, ...extra });

function say(ctx: SectionContext, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, K, ctx.w(word), font, extra);
}

/** Words on a photo: white by day and by night. */
function onPhoto(ctx: SectionContext, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> = {}): StudioNode {
  return { id: idOf(ctx)(), type: "text", text: ctx.w(word), font, color: WHITE, dark_color: WHITE, ...extra };
}

/** A word underlined by a hairline (the runway's links: no button, no pill). */
function underlined(ctx: SectionContext, word: SectionWord, action: Action, white = false, muted = false): StudioNode {
  const id = idOf(ctx);
  const [day, night] = white ? [WHITE, WHITE] : muted ? [K.muted, K.darkMuted] : [K.ink, K.darkInk];
  return {
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "hug",
    gap: 4,
    self_align: "start",
    action,
    children: [
      { id: id(), type: "text", text: ctx.w(word), max_lines: 1, font: { family: UI, size: 13, weight: 500, letter_spacing: 0.6 }, color: day, dark_color: night },
      { id: id(), type: "divider", height: 1, background: day, dark_background: night },
    ],
  };
}

/** A link on a photo: its words and a thin arrow, in white. */
function onPhotoLink(ctx: SectionContext, word: SectionWord): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(word),
    width: "hug",
    gap: 8,
    cross: "center",
    self_align: "start",
    action: shop,
    children: [onPhoto(ctx, word, { family: UI, size: 13.5, weight: 500, letter_spacing: 0.8 }, { max_lines: 1 }), { id: id(), type: "icon", icon: "arrow_forward", icon_size: 18, color: WHITE, dark_color: WHITE }],
  };
}

/** A section's title in big light type, a quiet underlined link at its end. */
function headOf(ctx: SectionContext, title: SectionWord, link: { word: SectionWord; action: Action } | null, line?: SectionWord): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    cross: "end",
    gap: 12,
    padding: sides(38, 22, 16, 22),
    children: [
      {
        id: id(),
        type: "column",
        width: "fill",
        gap: 4,
        children: [say(ctx, title, face(28, { weight: 300, line_height: 1.15 }), { max_lines: 2 }), ...(line ? [say(ctx, line, { family: UI, size: 12.5 }, { muted: true, max_lines: 2 })] : [])],
      },
      ...(link ? [underlined(ctx, link.word, link.action, false, true)] : []),
    ],
  };
}

// ——— The home ———

/** One look of the runway: the photo edge to edge, its kicker, its title in light type, "Discover the look" underlined. */
function look(ctx: SectionContext, photo: string, kicker: SectionWord, title: SectionWord): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "photo_hero",
    name: ctx.w(title),
    image_url: sigPhoto(ctx, P(photo)),
    height: 640,
    radius: 0,
    background: "#141211",
    scrim: { color: "#000000", from: 0.34, middle: 0, at: 30, to: 0.66 },
    align: "end",
    padding: sides(0, 24, 64, 24),
    action: shop,
    children: [
      onPhoto(ctx, kicker, { family: UI, size: 11, weight: 500, letter_spacing: 2.4, uppercase: true }, { opacity: 0.88, max_lines: 1 }),
      onPhoto(ctx, title, face(38, { weight: 400, line_height: 1.14 }), { max_lines: 3, margin: sides(10, 0, 14, 0) }),
      onPhotoLink(ctx, "rwyDiscoverLook"),
    ],
  };
}

/** The season's looks, edge to edge under the header: one at a time, the progress line at their foot. */
export function runwayLooks(ctx: SectionContext): StudioNode {
  const looks: [string, SectionWord, SectionWord][] = [
    ["camel-dress", "rwyLook1Kicker", "rwyLook1Title"],
    ["stripe-dress", "rwyLook2Kicker", "rwyLook2Title"],
    ["olive-jacket", "rwyLook3Kicker", "rwyLook3Title"],
    ["fur-jacket", "rwyLook4Kicker", "rwyLook4Title"],
  ];
  const first = sigPhoto(ctx, P(looks[0]![0]));
  return {
    id: idOf(ctx)(),
    type: "slider",
    name: ctx.w("rwyLooks"),
    height: 640,
    per_view: 1,
    gap: 0,
    autoplay: true,
    interval_ms: 6000,
    indicator: "progress",
    indicator_look: { at: "bottom", inset: 22, color: WHITE, count: "padded" },
    // The first look under the slides while they load, and its shade: the page opens on a cover, under the header.
    background: "#141211",
    ...(first ? { image_background_url: first } : {}),
    scrim: { color: "#000000", from: 0.34, middle: 0, at: 30, to: 0.66 },
    children: looks.map(([photo, kicker, title]) => look(ctx, photo, kicker, title)),
  };
}

/** The categories as text-only tabs over a hairline, the first one marked by a burgundy line; each named as the demo's category, so it opens it. */
function categoryTabs(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const tab = (word: SectionWord, on: boolean): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "hug",
    gap: 10,
    action: shop,
    children: [
      { id: id(), type: "text", text: ctx.w(word), max_lines: 1, font: { family: UI, size: 15, weight: on ? 700 : 500 }, color: on ? K.ink : K.muted, dark_color: on ? K.darkInk : K.darkMuted },
      { id: id(), type: "divider", height: 1.5, background: on ? K.accent : K.page, dark_background: on ? K.darkAccent : K.darkPage },
    ],
  });
  return {
    id: id(),
    type: "column",
    name: ctx.w("rwyTabs"),
    padding: sides(22, 0, 0, 0),
    children: [
      { id: id(), type: "row", gap: 26, scroll: true, padding: sides(0, 22, 0, 22), children: [tab("rwyDresses", true), tab("rwyAbayas", false), tab("rwyCoats", false), tab("rwyShoes", false), tab("rwyBags", false), tab("rwyAccessories", false)] },
      { id: id(), type: "divider", height: 1, background: K.line, dark_background: K.darkLine },
    ],
  };
}

/** A piece: its photo at 3:4 with no box, its name and a heart, its price (the sale's in burgundy, the old one struck). */
function piece(ctx: SectionContext, width: number | "fill"): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    width,
    gap: 4,
    children: [
      { id: id(), type: "image", bind: "image", width: "fill", aspect_ratio: 0.75, radius: 0, fit: "cover", background: K.line, dark_background: K.darkLine },
      {
        id: id(),
        type: "row",
        gap: 6,
        cross: "center",
        margin: sides(8, 0, 0, 0),
        children: [
          { id: id(), type: "text", bind: "title", width: "fill", max_lines: 1, font: { family: UI, size: 14, weight: 500 }, color: K.ink, dark_color: K.darkInk },
          { id: id(), type: "icon", icon: "favorite", icon_size: 18, color: K.ink, dark_color: K.darkInk },
        ],
      },
      {
        id: id(),
        type: "row",
        gap: 6,
        cross: "center",
        children: [
          { id: id(), type: "text", bind: "price", max_lines: 1, font: { family: UI, size: 14, weight: 700 }, color: K.ink, dark_color: K.darkInk },
          { id: id(), type: "text", bind: "was_price", max_lines: 1, font: { family: UI, size: 11.5 }, color: K.muted, dark_color: K.darkMuted },
        ],
      },
    ],
  };
}

/** The newest pieces two by two, tall and boxless. */
function newGrid(ctx: SectionContext): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w("rwyNewIn"), source: "products", layout: "grid", columns: 2, gap: 14, padding: sides(0, 22, 0, 22), query: { limit: 4, category_id: null, featured: false, sort: "newest", ids: [] }, card: piece(ctx, "fill") };
}

/** The editor's quote on a full-bleed photo. */
function editorQuote(ctx: SectionContext): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "photo_hero",
    name: ctx.w("rwyEditorKicker"),
    image_url: sigPhoto(ctx, P("editor-hat")),
    height: 440,
    radius: 0,
    background: "#141211",
    scrim: { color: "#000000", from: 0, middle: 0.1, at: 50, to: 0.7 },
    align: "end",
    padding: sides(0, 24, 30, 24),
    margin: sides(42, 0, 0, 0),
    action: shop,
    children: [
      onPhoto(ctx, "rwyEditorKicker", { family: UI, size: 11, weight: 500, letter_spacing: 2.4, uppercase: true }, { opacity: 0.88, max_lines: 1 }),
      onPhoto(ctx, "rwyEditorQuote", face(24, { weight: 300, line_height: 1.35 }), { max_lines: 4, margin: sides(10, 0, 16, 0) }),
      onPhotoLink(ctx, "rwyEditorLink"),
    ],
  };
}

/** The most wanted, in a row of tall pieces. */
function wanted(ctx: SectionContext): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w("rwyWanted"), source: "products", layout: "carousel", gap: 12, padding: sides(0, 22, 0, 22), query: { limit: 8, category_id: null, featured: false, sort: "price_desc", ids: [] }, card: piece(ctx, 150) };
}

/** The index: each main category a line of text with an arrow, hairlines between (each named as the demo's category, so it opens it). */
function categoryIndex(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const line = (word: SectionWord, n: string): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    action: shop,
    children: [
      {
        id: id(),
        type: "row",
        gap: 14,
        cross: "center",
        padding: sides(16, 0, 16, 0),
        children: [
          { id: id(), type: "text", text: n, font: { family: UI, size: 11, weight: 500, letter_spacing: 1.6 }, color: K.accent, dark_color: K.darkAccent },
          say(ctx, word, face(20, { weight: 300 }), { width: "fill", max_lines: 1 }),
          { id: id(), type: "icon", icon: "arrow_forward", icon_size: 20, color: K.ink, dark_color: K.darkInk },
        ],
      },
      { id: id(), type: "divider", height: 1, background: K.line, dark_background: K.darkLine },
    ],
  });
  return {
    id: id(),
    type: "column",
    name: ctx.w("rwyIndex"),
    padding: sides(0, 22, 0, 22),
    children: [
      { id: id(), type: "divider", height: 1, background: K.line, dark_background: K.darkLine },
      line("rwyDresses", "01"),
      line("rwyAbayas", "02"),
      line("rwyCoats", "03"),
      line("rwyShoes", "04"),
      line("rwyBags", "05"),
    ],
  };
}

/** The size guide as one quiet line: a ruler, the words, "Size guide" underlined. */
function fitLine(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("rwyFit"),
    gap: 14,
    cross: "start",
    padding: sides(22, 0, 22, 0),
    margin: sides(34, 22, 0, 22),
    border_color: K.ink,
    dark_border_color: K.darkInk,
    border_width: 1,
    action: ownPage(ctx, RUNWAY_SIZE_PAGE),
    children: [
      { id: id(), type: "icon", icon: "straighten", icon_size: 24, color: K.ink, dark_color: K.darkInk, margin: sides(0, 0, 0, 18) },
      {
        id: id(),
        type: "column",
        width: "fill",
        gap: 6,
        padding: sides(0, 18, 0, 0),
        children: [say(ctx, "rwyFit", face(19, { weight: 400 })), say(ctx, "rwyFitLine", { family: UI, size: 12.5, line_height: 1.5 }, { muted: true, max_lines: 3 }), { ...underlined(ctx, "rwyFitLink", ownPage(ctx, RUNWAY_SIZE_PAGE)), margin: sides(6, 0, 0, 0) }],
      },
    ],
  };
}

/** What this person opened lately, small and boxless. */
function recent(ctx: SectionContext): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w("rwyRecent"), source: "products", layout: "carousel", recent: true, gap: 10, padding: sides(0, 22, 0, 22), query: { limit: 10, category_id: null, featured: false, sort: "newest", ids: [] }, card: piece(ctx, 112) };
}

export function runwayHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "rwyWordmark" });
  return {
    // The tiny wordmark in the middle, over the looks; the menu opens the category menu.
    header: { type: "transparent", title: t.title, translations: t.translations, buttons: ["menu", "search", "cart"], menu_page: RUNWAY_MENU_PAGE, color: WHITE, dark_color: WHITE },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 110, 0),
      children: [
        runwayLooks(ctx),
        categoryTabs(ctx),
        headOf(ctx, "rwyNewIn", { word: "rwyViewAll", action: shop }),
        newGrid(ctx),
        editorQuote(ctx),
        headOf(ctx, "rwyWanted", { word: "rwyViewAll", action: shop }),
        wanted(ctx),
        headOf(ctx, "rwyIndex", null, "rwyIndexLine"),
        categoryIndex(ctx),
        fitLine(ctx),
        headOf(ctx, "rwyRecent", null),
        recent(ctx),
      ],
    },
  };
}

// ——— The pages after the home ———

/** The pages' header: the wordmark (or the page's title) over a black band, in the runway's photo look. */
function pageHeader(ctx: SectionContext, word: SectionWord, buttons: StudioHeaderButton[]): StudioPage["header"] {
  const t = sigTexts(ctx, { title: word });
  return { type: "title", title: t.title, translations: t.translations, buttons, background: K.fill, color: K.onFill, dark_background: K.darkSurface, dark_color: K.darkInk, style: "photo" };
}

/** A line of the menu's foot: its icon, its words, an arrow, a hairline under it. */
function menuLine(ctx: SectionContext, word: SectionWord, icon: string, action: Action, line?: SectionWord): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w(word),
    action,
    children: [
      {
        id: id(),
        type: "row",
        gap: 14,
        cross: "center",
        padding: sides(15, 0, 15, 0),
        children: [
          { id: id(), type: "icon", icon, icon_size: 22, color: K.ink, dark_color: K.darkInk },
          { id: id(), type: "column", width: "fill", gap: 3, children: [say(ctx, word, { family: UI, size: 15, weight: 500 }, { max_lines: 1 }), ...(line ? [say(ctx, line, { family: UI, size: 12 }, { muted: true, max_lines: 2 })] : [])] },
          { id: id(), type: "icon", icon: "arrow_forward", icon_size: 18, color: K.muted, dark_color: K.darkMuted },
        ],
      },
      { id: id(), type: "divider", height: 1, background: K.line, dark_background: K.darkLine },
    ],
  };
}

/** The category menu: the search, every main category a row of cards, then the account, orders, wishlist, language and a stylist as lines. */
export function runwayMenuPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    header: pageHeader(ctx, "rwyWordmark", ["search", "cart"]),
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 36, 0),
      children: [
        {
          id: id(),
          type: "search",
          name: ctx.w("rwySearchAll"),
          text: ctx.w("rwySearchAll"),
          source: "products",
          radius: 25,
          height: 50,
          background: K.surface,
          dark_background: K.darkSurface,
          color: K.muted,
          dark_color: K.darkMuted,
          margin: sides(14, 22, 8, 22),
        },
        {
          id: id(),
          type: "categories",
          name: ctx.w("rwyMenu"),
          source: "products",
          style: "rows",
          category_menu: { look: "lead", radius: 0, numbers: true },
          color: K.ink,
          dark_color: K.darkInk,
          padding: sides(10, 0, 10, 0),
        },
        {
          id: id(),
          type: "column",
          name: ctx.w("rwyAccount"),
          padding: sides(16, 22, 0, 22),
          children: [
            { id: id(), type: "divider", height: 1, background: K.line, dark_background: K.darkLine },
            menuLine(ctx, "rwyAccount", "person", screen("account")),
            menuLine(ctx, "rwyOrders", "package_2", screen("orders")),
            menuLine(ctx, "rwyWishlist", "favorite", screen("favorites")),
            menuLine(ctx, "rwyLanguage", "language", screen("settings")),
            menuLine(ctx, "rwyContact", "support_agent", screen("account"), "rwyContactLine"),
          ],
        },
      ],
    },
  };
}

/** The size guide: the shop's chart (the `size_chart` element) between hairlines, and how to measure. */
export function runwaySizePage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const step = (title: SectionWord, text: SectionWord): StudioEntry => sigEntry(ctx, { title, text });
  return {
    header: pageHeader(ctx, "rwySizeGuide", ["cart"]),
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 36, 0),
      children: [
        { ...say(ctx, "rwyFitLine", { family: UI, size: 14, line_height: 1.6 }, { muted: true }), padding: sides(16, 22, 6, 22) },
        { id: id(), type: "size_chart", name: ctx.w("rwySizeChart"), text: ctx.w("rwySizeChart"), color: K.ink, dark_color: K.darkInk, background: K.page, dark_background: K.darkPage, border_color: K.ink, dark_border_color: K.darkInk, border_width: 1, radius: 0, padding: sides(14, 14, 14, 14), margin: sides(12, 22, 4, 22) },
        headOf(ctx, "rwyMeasure", null),
        { id: id(), type: "timeline", name: ctx.w("rwyMeasure"), timeline: { style: "vertical" }, color: K.ink, dark_color: K.darkInk, background: K.page, dark_background: K.darkPage, padding: sides(0, 22, 0, 22), entries: [step("rwyBust", "rwyBustText"), step("rwyWaist", "rwyWaistText"), step("rwyHips", "rwyHipsText")] },
      ],
    },
  };
}

/** Over the shop (the listing): its line, the categories as text tabs, the sizes to filter by. */
function shopTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    { ...say(ctx, "rwyCollectionLine", { family: UI, size: 13 }, { muted: true, max_lines: 2 }), padding: sides(14, 22, 0, 22) },
    categoryTabs(ctx),
    { id: id(), type: "listing_filters", name: ctx.w("rwySizeChart"), color: K.ink, dark_color: K.darkInk, padding: sides(10, 22, 6, 22) },
  ];
}

/** Over the bag: the exchanges in one line between hairlines, a finishing touch. */
function cartTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    {
      id: id(),
      type: "row",
      name: ctx.w("rwyReturns"),
      gap: 12,
      cross: "center",
      padding: sides(14, 0, 14, 0),
      margin: sides(8, 22, 4, 22),
      border_color: K.line,
      dark_border_color: K.darkLine,
      border_width: 1,
      children: [{ id: id(), type: "icon", icon: "sync", icon_size: 20, color: K.accent, dark_color: K.darkAccent, margin: sides(0, 0, 0, 14) }, say(ctx, "rwyReturns", { family: UI, size: 13, line_height: 1.45 }, { width: "fill", max_lines: 3, padding: sides(0, 14, 0, 0) })],
    },
    headOf(ctx, "rwyFinish", null),
    { id: id(), type: "items", name: ctx.w("rwyFinish"), source: "products", layout: "carousel", gap: 10, padding: sides(0, 22, 6, 22), query: { limit: 6, category_id: null, featured: false, sort: "popular", ids: [] }, card: piece(ctx, 112) },
  ];
}

/** Over the orders: where the person's newest order is, as a bar of steps. */
function ordersTop(ctx: SectionContext): StudioNode[] {
  const step = (title: SectionWord, text: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    headOf(ctx, "rwyTrack", null),
    {
      id: idOf(ctx)(),
      type: "timeline",
      name: ctx.w("rwyTrack"),
      timeline: { style: "bars", source: "latest_order" },
      color: K.ink,
      dark_color: K.darkInk,
      background: K.page,
      dark_background: K.darkPage,
      padding: sides(0, 22, 8, 22),
      entries: [step("clTrack1", "clTrack1Text", true), step("clTrack2", "clTrack2Text"), step("clTrack3", "clTrack3Text"), step("clTrack4", "clTrack4Text")],
    },
  ];
}

function runwayOver(screenName: string, ctx: SectionContext): StudioNode[] | null {
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

/** Five tabs, words under icons: Home, Discover, Wishlist, Bag, Account. */
export function runwayTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const out = structuredClone([...tabs]).map((t) => {
    const target = t.target.type === "screen" ? t.target.screen : null;
    if (t.id === "home") return { ...t, icon: "home" };
    if (target === "search") return { ...t, label: "Discover", icon: "search" };
    if (target === "cart") return { ...t, label: "Bag", icon: "shopping_bag" };
    if (target === "account") return { ...t, icon: "person" };
    return t;
  });
  const cart = out.findIndex((t) => t.target.type === "screen" && t.target.screen === "cart");
  const wishlist: LayoutTab = { id: "wishlist", label: "Wishlist", icon: "favorite", target: { type: "screen", screen: "favorites" } };
  if (!out.some((t) => t.target.type === "screen" && t.target.screen === "favorites")) out.splice(cart < 0 ? out.length : cart, 0, wishlist);
  return out;
}

/** The minimal bar: across the foot on the page's ivory, icons with their words, the open one in ink; no pill. */
export const RUNWAY_BAR = signatureBar(K, { design: "minimal", background: K.page, dark_background: K.darkPage, active: K.ink, dark_active: K.darkInk, inactive: K.muted, dark_inactive: K.darkMuted, labels: "always", font: UI });

const RUNWAY_SCREENS = signatureScreens({
  style: "photo",
  photo: P("camel-dress"),
  title: { en: "Welcome to the runway", ar: "أهلًا بكِ على المنصّة", tr: "Podyuma hoş geldiniz" },
  subtitle: { en: "Sign in to keep your looks, your sizes and your orders.", ar: "سجّلي الدخول لتحتفظي بإطلالاتكِ ومقاساتكِ وطلباتكِ.", tr: "Görünümlerinizi, bedenlerinizi ve siparişlerinizi saklamak için giriş yapın." },
  menu: "cover",
  first: ["orders", "wishlist", "notifications", "settings", "help", "privacy", "terms"],
});

/**
 * 228.7 RUNWAY's own product page: the piece's photos one under the other,
 * edge to edge at 3:4 under the back button (a lookbook, not a carousel);
 * then quiet type on ivory: its name in the house's sturdy face, its price
 * from the lowest size, a hairline, the sizes as text chips in black, the
 * words left open, the details as a list, and "Wear it with" as a grid of
 * two; at the foot a minimal bar, flat ivory under a hairline, the price
 * beside Add to bag. No stars, no quantity, no carousel.
 */
function runwayProductPage(ctx: SectionContext) {
  const ink = { color: K.ink, dark_color: K.darkInk } as const;
  const black = { accent: K.fill, dark_accent: K.darkFill } as const;
  const gap = (top: number, bottom = 0) => sides(top, 22, bottom, 22);
  const hairline: StudioNode = { id: idOf(ctx)(), type: "divider", height: 1, background: K.line, dark_background: K.darkLine, margin: gap(22) };
  return mixedProductPage(ctx, { background: K.page, dark_background: K.darkPage }, [
      { type: "product_gallery", look: "stacked", radius: 0, node: { aspect_ratio: 3 / 4 } },
      { type: "product_title", look: "plain", node: { ...ink, font: { family: UI, size: 19, weight: 500, line_height: 1.35, letter_spacing: 0.2 }, margin: gap(26) } },
      { type: "product_price", look: "from", node: { color: K.muted, dark_color: K.darkMuted, font: { family: UI, size: 15, weight: 500, letter_spacing: 0.4 }, margin: gap(6) } },
      hairline,
      { type: "product_variants", look: "grid" /* 228.7 "chips" once the app draws a chip hugging its words (it stretches it across the row today) */, ...black, node: { ...ink, margin: gap(20) } },
      { type: "product_description", look: "plain", node: { ...ink, margin: gap(28) } },
      { type: "product_specs", look: "list", text: "rwyDetails", ...black, node: { ...ink, margin: gap(24) } },
      { type: "product_related", look: "grid", related: "complete_look", rows: 4, text: "rwyWearWith", node: { ...ink, margin: sides(34, 22, 24, 22) } },
      {
        type: "product_buy",
        look: "price",
        text: "rwyAddToBag",
        ...black,
        node: { pin: "bottom", radius: 2, padding: sides(12, 22, 12, 22), background: K.page, dark_background: K.darkPage, border_color: K.line, dark_border_color: K.darkLine, border_width: 1, ...ink },
      },
  ]);
}

export const RUNWAY_C: SignatureDesign = {
  demo: "clothes",
  variant: "c",
  template: { id: "clothes_signature_c", icon: "checkroom", fits: { types: ["store"], plain: true } },
  home: runwayHome,
  over: runwayOver,
  tabs: runwayTabs,
  pages: (ctx) => [
    { slug: RUNWAY_MENU_PAGE, title: "rwyMenu", studio: runwayMenuPage(ctx) },
    { slug: RUNWAY_SIZE_PAGE, title: "rwySizeGuide", studio: runwaySizePage(ctx) },
    // 228.7 Its own product page.
    runwayProductPage(ctx),
  ],
  bar: RUNWAY_BAR,
  look: { header: { background: K.fill, color: K.onFill, dark_background: K.darkSurface, dark_color: K.darkInk }, background: K.page, dark_background: K.darkPage },
  chrome: { header: "photo", system: "photo" },
  isNew: true,
  project: {
    primary: K.fill,
    appearance: { secondary_color: K.accent, font: "DM Sans", font_family: FACE, arabic_font: UI, dark_background: K.darkPage, dark_surface: K.darkSurface },
    screens: RUNWAY_SCREENS,
  },
};
