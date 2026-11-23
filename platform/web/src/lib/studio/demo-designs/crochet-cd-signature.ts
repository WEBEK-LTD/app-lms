import type { Action, FormField, LayoutTab, StudioEntry, StudioFont, StudioNode, StudioPage, Translations } from "../../pages/types";
import { APP_WORDS } from "../app-words";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigPhoto, sigTexts, signatureBar, signatureHeader, type SignatureInk } from "./food-signature-parts";

/**
 * 224 Ghurza (crochet and handmade) templates C and D, the owner's third
 * round (23 November 2026): two whole store projects that share nothing
 * with looks A and B (./crochet-signature.ts) nor with any other type's
 * templates, each built only from Studio's elements so every part is the
 * owner's to change.
 *
 * C · THE MAKERS' MARKET (the type's main template): textured paper, cards
 * framed and stitched (rows of short stitches across their top and foot),
 * Aref Ruqaa for the headlines and Noto Naskh Arabic for the text. A
 * centred calligraphic wordmark, a framed lead story, the yarn's colours to
 * pick (`swatches`), "Who made it?" cards of the makers, how a piece is
 * made to order (you order, we make it, we ship it) opening the custom
 * order, the workshop's pieces with their price on a hanging tag, a
 * maker's words between two stitched lines; a folder-tab bar.
 *
 * D · THE COZY STUDIO: dusty rose and soft large photos, Mada. A photo
 * from edge to edge under a header that lies over it, a switch between the
 * ready pieces and the kits to make yourself (`tabs`), the pattern of the
 * week, the month's classes as dated cards (their seats are the shop's
 * Workshops), the kits in circles; a bubble bar.
 *
 * Both: the category menu (every main category a row of cards with its
 * sub-categories; the account, orders, wishlist, language and contact at
 * its foot), the shop, cart and orders in the look, their tabs and bar,
 * their sign-in and account menu. C has its custom-order page (the `form`
 * element as the shop's custom-order request).
 */

const P = (name: string) => `/crochet-photos/${name}.jpg`;
const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));
export const GC_MENU_PAGE = "menu";
export const GC_CUSTOM_PAGE = "custom-order";
const WHITE = { color: "#FFFFFF", dark_color: "#FFFFFF" } as const;

interface Look {
  k: SignatureInk;
  tint: { day: string; night: string };
  /** The headlines' face, and the text's. */
  display: string;
  family: string;
  look: "c" | "d";
}

const say = (ctx: SectionContext, l: Look, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode => inked(ctx, l.k, ctx.w(word), { family: l.family, ...font }, extra);
const head = (ctx: SectionContext, l: Look, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode => inked(ctx, l.k, ctx.w(word), { family: l.display, ...font }, extra);
const icon = (ctx: SectionContext, name: string, size: number, ink: { color: string; dark_color: string }, extra: Partial<StudioNode> = {}): StudioNode => ({ id: idOf(ctx)(), type: "icon", icon: name, icon_size: size, ...ink, ...extra });
const image = (ctx: SectionContext, l: Look, photo: string, look: Partial<StudioNode>): StudioNode => {
  const url = sigPhoto(ctx, P(photo));
  return url ? { id: idOf(ctx)(), type: "image", image_url: url, fit: "cover", ...look } : { id: idOf(ctx)(), type: "column", background: l.tint.day, dark_background: l.tint.night, ...look, children: [] };
};

function tabOf(t: LayoutTab, word: SectionWord, iconName: string): LayoutTab {
  const translations: Record<string, { label: string }> = {};
  for (const lang of ["ar", "tr"] as const) translations[lang] = { label: APP_WORDS[lang][word as keyof typeof APP_WORDS.en] };
  return { ...t, label: APP_WORDS.en[word as keyof typeof APP_WORDS.en], icon: iconName, translations: translations as Translations };
}
const screenOf = (t: LayoutTab) => (t.target.type === "screen" ? t.target.screen : null);

// ——— C · THE MAKERS' MARKET ———

/** C: warm paper and coffee ink, a brick accent; a dark walnut night. */
export const MARKET_INK: SignatureInk = {
  page: "#F1E8D8",
  darkPage: "#1C1611",
  surface: "#FBF6EC",
  darkSurface: "#27201A",
  ink: "#3A2A1E",
  darkInk: "#F1E6D6",
  muted: "#6F5B4B",
  darkMuted: "#BCA993",
  line: "#C9B394",
  darkLine: "#5A4A3A",
  accent: "#9A3B26",
  darkAccent: "#E39B7C",
  fill: "#9A3B26",
  darkFill: "#C4623F",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const C = MARKET_INK;
const LOOK_C: Look = { k: C, tint: { day: "#E7D9C2", night: "#2F2720" }, display: "Aref Ruqaa", family: "Noto Naskh Arabic", look: "c" };

/** A row of short stitches, the thread's colour, across a card's top or foot. */
function stitches(ctx: SectionContext, l: Look, count = 22): StudioNode {
  const id = idOf(ctx);
  return { id: id(), type: "row", align: "between", cross: "center", height: 4, children: Array.from({ length: count }, () => ({ id: id(), type: "row" as const, width: 7, height: 2, radius: 1, background: l.k.line, dark_background: l.k.darkLine, children: [] })) };
}

/** A card framed and stitched: the paper's surface, a stitched line across its top and foot, what it holds between them. */
function stitched(ctx: SectionContext, l: Look, name: string, children: StudioNode[], o: { width?: number | "fill"; margin?: ReturnType<typeof sides>; padding?: ReturnType<typeof sides>; action?: Action; count?: number } = {}): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "column",
    name,
    width: o.width ?? "fill",
    gap: 10,
    radius: 6,
    padding: o.padding ?? sides(10, 12, 10, 12),
    ...(o.margin ? { margin: o.margin } : {}),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    ...(o.action ? { action: o.action } : {}),
    children: [stitches(ctx, l, o.count), ...children, stitches(ctx, l, o.count)],
  };
}

/** C's section title: calligraphic, an underlined link at its end. */
function marketHead(ctx: SectionContext, l: Look, title: SectionWord, link: { word: SectionWord; action: Action } | null, line?: SectionWord): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    cross: "end",
    gap: 10,
    padding: sides(26, 18, 12, 18),
    children: [
      { id: id(), type: "column", width: "fill", gap: 2, children: [head(ctx, l, title, { size: 26, weight: 700, line_height: 1.25 }, { max_lines: 2 }), ...(line ? [say(ctx, l, line, { size: 13 }, { muted: true, max_lines: 1 })] : [])] },
      ...(link ? [say(ctx, l, link.word, { size: 13, weight: 600, underline: true }, { accent: true, max_lines: 1, action: link.action })] : []),
    ],
  };
}

/** The framed lead story: the flat lay, a two-line calligraphic headline and its line. */
function leadStory(ctx: SectionContext, l: Look): StudioNode {
  return stitched(
    ctx,
    l,
    ctx.w("gcLeadTitle"),
    [
      image(ctx, l, "wide-knit-flatlay", { width: "fill", height: 220, radius: 3 }),
      head(ctx, l, "gcLeadTitle", { size: 26, weight: 700, line_height: 1.35 }, { max_lines: 3, padding: sides(2, 4, 0, 4) }),
      say(ctx, l, "gcLeadLine", { size: 14, line_height: 1.6 }, { muted: true, max_lines: 3, padding: sides(0, 4, 0, 4) }),
    ],
    { margin: sides(4, 16, 0, 16), action: ownPage(ctx, GC_CUSTOM_PAGE) },
  );
}

const YARNS: readonly [string, SectionWord][] = [
  ["#C9A27E", "gcY1"],
  ["#9A3B26", "gcY2"],
  ["#7D8B6A", "gcY3"],
  ["#EFE6D6", "gcY4"],
  ["#2F3E55", "gcY5"],
  ["#D9A1A0", "gcY6"],
];

/** The yarn-colour picker (`swatches`): the yarns as round swatches, the one tapped named, a button to order in it. */
function yarnPicker(ctx: SectionContext, l: Look): StudioNode {
  const t = sigTexts(ctx, { text: "gcYarnTitle", title: "gcOrderButton" });
  return {
    id: idOf(ctx)(),
    type: "swatches",
    name: ctx.w("gcYarnTitle"),
    text: t.text,
    title: t.title,
    translations: t.translations,
    action: ownPage(ctx, GC_CUSTOM_PAGE),
    swatches: { shape: "circle", size: 44 },
    entries: YARNS.map(([hex, word], i) => ({ ...sigEntry(ctx, { title: word }), color: hex, ...(i === 1 ? { highlight: true } : {}) })),
    font: { family: l.family },
    color: l.k.ink,
    dark_color: l.k.darkInk,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    radius: 6,
    padding: sides(14, 14, 14, 14),
    margin: sides(0, 16, 0, 16),
  };
}

const MAKERS: readonly [string, SectionWord, SectionWord, SectionWord, SectionWord, readonly string[]][] = [
  ["cozy-sweater", "gcMaker1", "gcMaker1Line", "gcMaker1Stats", "gcMaker1Days", ["scarves-stack", "red-scarf", "fluffy-blanket"]],
  ["beanie-girl", "gcMaker2", "gcMaker2Line", "gcMaker2Stats", "gcMaker2Days", ["teddy-sweater", "snowman-plush", "bunny-knit"]],
  ["green-sweater", "gcMaker3", "gcMaker3Line", "gcMaker3Stats", "gcMaker3Days", ["straw-hat", "basket-room", "straw-close"]],
];

/** "Who made it?": each maker's card, her photo and name, her craft, three of her pieces, her count and her days. */
function makerCards(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const card = ([photo, name, line, stats, days, pieces]: (typeof MAKERS)[number]): StudioNode =>
    stitched(
      ctx,
      l,
      ctx.w(name),
      [
        {
          id: id(),
          type: "row",
          gap: 10,
          cross: "center",
          children: [
            image(ctx, l, photo, { width: 52, height: 52, radius: 26, border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 2 }),
            { id: id(), type: "column", width: "fill", gap: 0, children: [head(ctx, l, name, { size: 21, weight: 700, line_height: 1.2 }, { max_lines: 1 }), say(ctx, l, line, { size: 12 }, { muted: true, max_lines: 1 })] },
          ],
        },
        { id: id(), type: "row", gap: 6, children: pieces.map((p) => image(ctx, l, p, { width: "fill", height: 74, radius: 3 })) },
        {
          id: id(),
          type: "row",
          gap: 6,
          cross: "center",
          children: [icon(ctx, "star", 14, { color: l.k.accent, dark_color: l.k.darkAccent }), say(ctx, l, stats, { size: 12 }, { muted: true, max_lines: 1, width: "fill" }), icon(ctx, "schedule", 14, { color: l.k.muted, dark_color: l.k.darkMuted }), say(ctx, l, days, { size: 12 }, { muted: true, max_lines: 1 })],
        },
      ],
      { width: 248, action: shop, count: 20 },
    );
  return { id: id(), type: "row", name: ctx.w("gcMakersTitle"), gap: 12, scroll: true, padding: sides(0, 16, 4, 16), children: MAKERS.map(card) };
}

/** How a piece is made to order: three stitched circles joined by stitches, then the button to the custom order. */
function madeToOrder(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const step = (ic: string, title: SectionWord, text: SectionWord, lit: boolean): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(title),
    width: 84,
    gap: 4,
    cross: "center",
    children: [
      { id: id(), type: "row", width: 46, height: 46, radius: 23, align: "center", cross: "center", ...(lit ? { background: l.k.fill, dark_background: l.k.darkFill } : { background: l.tint.day, dark_background: l.tint.night }), children: [icon(ctx, ic, 22, lit ? WHITE : { color: l.k.accent, dark_color: l.k.darkAccent })] },
      say(ctx, l, title, { size: 14, weight: 700 }, { text_align: "center", max_lines: 1 }),
      say(ctx, l, text, { size: 12 }, { muted: true, text_align: "center", max_lines: 1 }),
    ],
  });
  const join = (): StudioNode => ({ ...stitches(ctx, l, 5), width: "fill", margin: sides(21, 0, 0, 0) });
  return stitched(
    ctx,
    l,
    ctx.w("gcHowTitle"),
    [
      say(ctx, l, "gcHowLine", { size: 14 }, { muted: true, max_lines: 1, padding: sides(0, 4, 0, 4) }),
      { id: id(), type: "row", gap: 0, children: [step("edit_note", "gcStep1", "gcStep1Text", true), join(), step("handyman", "gcStep2", "gcStep2Text", false), join(), step("local_shipping", "gcStep3", "gcStep3Text", false)] },
      {
        id: id(),
        type: "button",
        name: ctx.w("gcOrderButton"),
        text: ctx.w("gcOrderButton"),
        icon: "arrow_back",
        icon_position: "end",
        width: "fill",
        height: 48,
        radius: 4,
        background: l.k.fill,
        dark_background: l.k.darkFill,
        color: "#FFFFFF",
        dark_color: "#FFFFFF",
        font: { family: l.family, size: 15, weight: 700 },
        action: ownPage(ctx, GC_CUSTOM_PAGE),
      },
    ],
    { margin: sides(0, 16, 0, 16), padding: sides(10, 14, 12, 14) },
  );
}

/** A piece on its hanging tag: the photo, its price on a tag tilted over its corner, the name in calligraphy, its line. */
function tagCard(ctx: SectionContext, l: Look, width: number): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    width,
    gap: 2,
    children: [
      {
        id: id(),
        type: "stack",
        width,
        height: 206,
        children: [
          { id: id(), type: "image", bind: "image", width, height: 206, radius: 4, fit: "cover", background: l.tint.day, dark_background: l.tint.night },
          {
            id: id(),
            type: "text",
            bind: "price",
            max_lines: 1,
            rotation: -4,
            font: { family: l.family, size: 13, weight: 700 },
            color: l.k.ink,
            dark_color: l.k.darkInk,
            background: l.k.surface,
            dark_background: l.k.darkSurface,
            border_color: l.k.line,
            dark_border_color: l.k.darkLine,
            border_width: 1,
            corners: { top_end: 12, bottom_end: 12 },
            padding: sides(3, 10, 3, 8),
            place: { x: 0, y: 12 },
          },
          { id: id(), type: "text", bind: "sale", font: { size: 11, weight: 800 }, color: "#FFFFFF", dark_color: "#FFFFFF", background: l.k.fill, dark_background: l.k.darkFill, radius: 3, padding: sides(3, 7, 3, 7), place: { x: 4, y: 86 } },
        ],
      },
      { id: id(), type: "text", bind: "title", max_lines: 2, padding: sides(6, 2, 0, 2), color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.display, size: 18, weight: 700, line_height: 1.25 } },
      { id: id(), type: "text", bind: "subtitle", max_lines: 1, padding: sides(0, 2, 0, 2), color: l.k.muted, dark_color: l.k.darkMuted, font: { family: l.family, size: 12 } },
    ],
  };
}

function tagGrid(ctx: SectionContext, l: Look): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w("gcPiecesTitle"), source: "products", layout: "grid", columns: 2, gap: 14, padding: sides(0, 18, 0, 18), query: { limit: 4, category_id: null, featured: true, sort: "newest", ids: [] }, card: tagCard(ctx, l, 171) };
}

/** A maker's words between two stitched lines, centred. */
function makerQuote(ctx: SectionContext, l: Look): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "column",
    name: ctx.w("gcQuoteName"),
    gap: 10,
    cross: "center",
    padding: sides(0, 18, 0, 18),
    margin: sides(28, 0, 0, 0),
    children: [stitches(ctx, l, 26), head(ctx, l, "gcQuote", { size: 22, weight: 400, line_height: 1.6 }, { text_align: "center", max_lines: 4 }), say(ctx, l, "gcQuoteName", { size: 13 }, { muted: true, text_align: "center", max_lines: 1 }), stitches(ctx, l, 26)],
  };
}

function marketHome(ctx: SectionContext): StudioPage {
  const l = LOOK_C;
  const t = sigTexts(ctx, { title: "gcWordmark", subtitle: "gcWordmarkLine" });
  return {
    header: { type: "logo_center", ...t, buttons: ["menu", "cart"], menu_page: GC_MENU_PAGE, background: C.page, dark_background: C.darkPage, color: C.ink, dark_color: C.darkInk },
    background: C.page,
    dark_background: C.darkPage,
    body: {
      id: idOf(ctx)(),
      type: "column",
      padding: sides(0, 0, 104, 0),
      surface: { pattern: "grain", pattern_strength: 0.07 },
      children: [
        leadStory(ctx, l),
        marketHead(ctx, l, "gcYarnTitle", null),
        yarnPicker(ctx, l),
        marketHead(ctx, l, "gcMakersTitle", { word: "gcAllMakers", action: shop }),
        makerCards(ctx, l),
        marketHead(ctx, l, "gcHowTitle", null),
        madeToOrder(ctx, l),
        marketHead(ctx, l, "gcPiecesTitle", { word: "gcAllPieces", action: shop }),
        tagGrid(ctx, l),
        makerQuote(ctx, l),
      ],
    },
  };
}

// ——— D · THE COZY STUDIO ———

/** D: dusty rose and cocoa ink by day; a rose-brown night. */
export const COZY_INK: SignatureInk = {
  page: "#F6ECEA",
  darkPage: "#1A1314",
  surface: "#FFFFFF",
  darkSurface: "#251B1D",
  ink: "#3B2A2C",
  darkInk: "#F5E6E5",
  muted: "#7A6462",
  darkMuted: "#BFA5A4",
  line: "#EADAD7",
  darkLine: "#3A2B2E",
  accent: "#7E4B4D",
  darkAccent: "#E8B9B5",
  fill: "#C98F8C",
  darkFill: "#E0A9A5",
  onFill: "#FFFFFF",
  darkOnFill: "#1A1314",
};
const D = COZY_INK;
const LOOK_D: Look = { k: D, tint: { day: "#EBD3D0", night: "#33252A" }, display: "Mada", family: "Mada", look: "d" };

function cozyHead(ctx: SectionContext, l: Look, title: SectionWord, link: { word: SectionWord; action: Action } | null): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "row",
    name: ctx.w(title),
    cross: "end",
    gap: 10,
    padding: sides(28, 20, 12, 20),
    children: [say(ctx, l, title, { size: 23, weight: 800, line_height: 1.15 }, { width: "fill", max_lines: 2 }), ...(link ? [say(ctx, l, link.word, { size: 13, weight: 600 }, { accent: true, max_lines: 1, action: link.action })] : [])],
  };
}

/** The photo from edge to edge, the header over it; the studio's words at its foot. */
function cozyHero(ctx: SectionContext, l: Look): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "photo_hero",
    name: ctx.w("gdHeroTitle"),
    image_url: sigPhoto(ctx, P("cozy-sweater")),
    height: 470,
    corners: { bottom_start: 40, bottom_end: 40 },
    background: "#3B2A2C",
    scrim: { color: "#281416", from: 0.35, middle: 0.05, at: 50, to: 0.78 },
    align: "end",
    padding: sides(24, 22, 30, 22),
    action: shop,
    children: [{ ...say(ctx, l, "gdHeroTitle", { size: 34, weight: 900, line_height: 1.1 }, { max_lines: 2 }), ...WHITE }, { ...say(ctx, l, "gdHeroLine", { size: 14.5, line_height: 1.5 }, { max_lines: 2, margin: sides(6, 0, 0, 0) }), color: "#F6E6E4", dark_color: "#F6E6E4" }],
  };
}

/** A soft photo card: the photo with large corners, its name and its price. */
function softCard(ctx: SectionContext, l: Look, width: number, height: number): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    width,
    gap: 2,
    children: [
      { id: id(), type: "image", bind: "image", width, height, radius: 28, fit: "cover", background: l.tint.day, dark_background: l.tint.night },
      { id: id(), type: "text", bind: "title", max_lines: 1, padding: sides(8, 4, 0, 4), color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 15, weight: 600 } },
      { id: id(), type: "row", gap: 6, cross: "center", padding: sides(0, 4, 0, 4), children: [{ id: id(), type: "text", bind: "price", max_lines: 1, color: l.k.accent, dark_color: l.k.darkAccent, font: { family: l.family, size: 14.5, weight: 800 } }, { id: id(), type: "text", bind: "was_price", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 12 } }] },
    ],
  };
}

const KITS: readonly [string, SectionWord][] = [
  ["blue-yarn", "gdKit1"],
  ["teddy-sweater", "gdKit2"],
  ["yarn-balls", "gdKit3"],
];

/** A kit in a circle, named like the shop's Kits (it opens them). */
function kitCircle(ctx: SectionContext, l: Look, photo: string, word: SectionWord): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("crKits"),
    width: 150,
    gap: 3,
    cross: "center",
    action: shop,
    children: [image(ctx, l, photo, { width: 146, height: 146, radius: 73 }), say(ctx, l, word, { size: 15, weight: 600 }, { text_align: "center", max_lines: 1, margin: sides(6, 0, 0, 0) }), say(ctx, l, "gdKitLine", { size: 12 }, { muted: true, text_align: "center", max_lines: 1 })],
  };
}

/** The switch: the ready pieces (two columns of soft photo cards) and the kits to make yourself (the kits in circles). */
function readyOrKits(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("gdReady"),
    gap: 0,
    radius: 30,
    padding: sides(8, 8, 14, 8),
    margin: sides(16, 16, 0, 16),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    surface: { soft: 2 },
    children: [
      {
        id: id(),
        type: "tabs",
        name: ctx.w("gdReady"),
        gap: 14,
        color: l.k.accent,
        dark_color: l.k.darkAccent,
        font: { family: l.family, size: 14.5, weight: 600 },
        children: [
          { id: id(), type: "column", name: ctx.w("gdReady"), title: ctx.w("gdReady"), icon: "checkroom", gap: 0, children: [{ id: id(), type: "items", name: ctx.w("gdReadyTitle"), source: "products", layout: "grid", columns: 2, gap: 12, padding: sides(0, 6, 0, 6), query: { limit: 4, category_id: null, featured: true, sort: "popular", ids: [] }, card: softCard(ctx, l, 160, 196) }] },
          { id: id(), type: "row", name: ctx.w("gdKits"), title: ctx.w("gdKits"), icon: "inventory_2", gap: 12, scroll: true, padding: sides(0, 6, 0, 6), children: KITS.map(([p, w]) => kitCircle(ctx, l, p, w)) },
        ],
      },
    ],
  };
}

/** The pattern of the week: the photo at the start, its week, title, level and time, a dark pill to get it. */
function patternOfWeek(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const chip = (word: SectionWord): StudioNode => ({ ...say(ctx, l, word, { size: 12, weight: 500 }, { max_lines: 1 }), radius: 99, padding: sides(4, 10, 4, 10), background: l.k.surface, dark_background: l.k.darkSurface });
  return {
    id: id(),
    type: "row",
    name: ctx.w("gdPatternHead"),
    gap: 0,
    radius: 30,
    margin: sides(0, 20, 0, 20),
    background: l.tint.day,
    dark_background: l.tint.night,
    action: shop,
    children: [
      image(ctx, l, "knit-coffee", { width: 146, height: 224, corners: { top_start: 30, bottom_start: 30 } }),
      {
        id: id(),
        type: "column",
        width: "fill",
        gap: 7,
        padding: sides(18, 16, 16, 16),
        children: [
          say(ctx, l, "gdPatternKicker", { size: 12, weight: 700 }, { accent: true, max_lines: 2 }),
          say(ctx, l, "gdPatternTitle", { size: 21, weight: 900, line_height: 1.15 }, { max_lines: 3 }),
          { id: id(), type: "row", gap: 6, children: [chip("gdLevel"), chip("gdHours")] },
          { id: id(), type: "spacer", height: 4 },
          {
            id: id(),
            type: "button",
            name: ctx.w("gdDownload"),
            text: ctx.w("gdDownload"),
            width: "fill",
            height: 42,
            radius: 21,
            background: l.k.ink,
            dark_background: l.k.darkInk,
            color: l.k.page,
            dark_color: l.k.darkPage,
            font: { family: l.family, size: 14, weight: 700 },
            action: shop,
          },
        ],
      },
    ],
  };
}

const CLASSES: readonly [string, string, SectionWord, SectionWord, SectionWord][] = [
  ["wide-hoop-yarn", "06", "gdClass1", "gdClass1When", "gdClass1Seats"],
  ["wide-mittens-coffee", "13", "gdClass2", "gdClass2When", "gdClass2Seats"],
  ["wide-knit-coffee", "20", "gdClass3", "gdClass3When", "gdClass3Seats"],
];

/** A class's card: its photo with the date on a white tile, its title, when and where, its seats; named like the shop's Workshops (it opens them). */
function classCard(ctx: SectionContext, l: Look, [photo, day, title, when, seats]: (typeof CLASSES)[number]): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("crWorkshops"),
    width: 272,
    gap: 0,
    radius: 28,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    action: shop,
    children: [
      {
        id: id(),
        type: "stack",
        width: 272,
        height: 140,
        children: [
          image(ctx, l, photo, { width: 272, height: 140, corners: { top_start: 28, top_end: 28 } }),
          {
            id: id(),
            type: "column",
            width: 56,
            gap: 0,
            cross: "center",
            radius: 16,
            padding: sides(6, 0, 6, 0),
            background: l.k.surface,
            dark_background: l.k.darkSurface,
            place: { x: 4, y: 8 },
            children: [inked(ctx, l.k, day, { family: l.family, size: 22, weight: 900, line_height: 1 }), say(ctx, l, "gdMonth", { size: 11 }, { muted: true, max_lines: 1 })],
          },
        ],
      },
      {
        id: id(),
        type: "column",
        gap: 4,
        padding: sides(12, 14, 14, 14),
        children: [
          say(ctx, l, title, { size: 16, weight: 800 }, { max_lines: 1 }),
          { id: id(), type: "row", gap: 5, cross: "center", children: [icon(ctx, "event", 15, { color: l.k.muted, dark_color: l.k.darkMuted }), say(ctx, l, when, { size: 12.5 }, { muted: true, max_lines: 1 })] },
          { ...say(ctx, l, seats, { size: 13, weight: 700 }, { accent: true, max_lines: 1 }), radius: 99, padding: sides(7, 14, 7, 14), margin: sides(6, 0, 0, 0), background: l.tint.day, dark_background: l.tint.night },
        ],
      },
    ],
  };
}

function classRow(ctx: SectionContext, l: Look): StudioNode {
  return { id: idOf(ctx)(), type: "row", name: ctx.w("gdClassesTitle"), gap: 12, scroll: true, padding: sides(0, 20, 4, 20), children: CLASSES.map((c) => classCard(ctx, l, c)) };
}

function cozyHome(ctx: SectionContext): StudioPage {
  const l = LOOK_D;
  return {
    header: { type: "transparent", buttons: ["menu", "cart"], menu_page: GC_MENU_PAGE },
    background: D.page,
    dark_background: D.darkPage,
    body: {
      id: idOf(ctx)(),
      type: "column",
      padding: sides(0, 0, 110, 0),
      children: [
        cozyHero(ctx, l),
        readyOrKits(ctx, l),
        cozyHead(ctx, l, "gdPatternHead", null),
        patternOfWeek(ctx, l),
        cozyHead(ctx, l, "gdClassesTitle", { word: "gdCalendar", action: shop }),
        classRow(ctx, l),
      ],
    },
  };
}

// ——— The pages after the home (both) ———

/** The category menu: the search, every main category a row of cards (its sub-categories sliding in it), then the account, orders, wishlist, language and contact. */
function menuPage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const market = l.look === "c";
  const t = sigTexts(ctx, { title: market ? "gcWordmark" : "gdWordmark" });
  const entry = (word: SectionWord, ic: string, action: Action): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    gap: 5,
    cross: "center",
    padding: sides(12, 4, 12, 4),
    radius: market ? 4 : 22,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    ...(market ? { border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1 } : {}),
    action,
    children: [icon(ctx, ic, 22, { color: l.k.accent, dark_color: l.k.darkAccent }), say(ctx, l, word, { size: 12, weight: 600 }, { text_align: "center", max_lines: 1 })],
  });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["search", "cart"], ...signatureHeader(l.k, market ? "large" : "photo") },
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      ...(market ? { surface: { pattern: "grain" as const, pattern_strength: 0.07 } } : {}),
      children: [
        {
          id: id(),
          type: "search",
          name: ctx.w(market ? "gcSearch" : "gdSearch"),
          text: ctx.w(market ? "gcSearch" : "gdSearch"),
          source: "products",
          radius: market ? 4 : 99,
          height: 48,
          background: l.k.surface,
          dark_background: l.k.darkSurface,
          color: l.k.muted,
          dark_color: l.k.darkMuted,
          border_color: l.k.line,
          dark_border_color: l.k.darkLine,
          border_width: 1,
          margin: sides(6, 16, 4, 16),
        },
        ...(market ? [{ ...stitches(ctx, l, 26), margin: sides(12, 16, 0, 16) }] : []),
        {
          id: id(),
          type: "categories",
          name: ctx.w("skCategoryMenu"),
          source: "products",
          style: "rows",
          category_menu: market ? { look: "label", numbers: true, radius: 4 } : { look: "lead", numbers: false, radius: 30 },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          padding: sides(10, 0, 6, 0),
        },
        ...(market ? [{ ...stitches(ctx, l, 26), margin: sides(8, 16, 0, 16) }] : []),
        { id: id(), type: "row", name: ctx.w("skMenuAccount"), gap: 8, padding: sides(14, 16, 0, 16), children: [entry("skAccount", "person", screen("account")), entry("skOrders", "package_2", screen("orders")), entry("gcWishlist", "favorite", screen("favorites")), entry("skLanguage", "language", screen("settings"))] },
        {
          id: id(),
          type: "row",
          name: ctx.w("skContact"),
          gap: 12,
          cross: "center",
          radius: market ? 4 : 26,
          padding: sides(14, 16, 14, 16),
          margin: sides(10, 16, 0, 16),
          background: l.tint.day,
          dark_background: l.tint.night,
          action: screen("account"),
          children: [icon(ctx, "support_agent", 22, { color: l.k.accent, dark_color: l.k.darkAccent }), { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, l, "skContact", { size: 14.5, weight: 700 }), say(ctx, l, market ? "gcContactLine" : "gdContactLine", { size: 12.5 }, { muted: true, max_lines: 2 })] }, icon(ctx, "chat", 20, { color: l.k.ink, dark_color: l.k.darkInk })],
        },
      ],
    },
  };
}

/** The custom-order request's fields (the owner's to change). */
const CUSTOM_FIELDS: readonly { kind: FormField["kind"]; label: SectionWord; required?: boolean; options?: readonly SectionWord[] }[] = [
  { kind: "choice", label: "crFieldPiece", required: true, options: ["crKindBlanket", "crKindCardigan", "crKindScarf", "crKindBag", "crKindToy", "crKindOther"] },
  { kind: "text", label: "crFieldSize" },
  { kind: "text", label: "crFieldColour", required: true },
  { kind: "long_text", label: "skFieldDetails" },
  { kind: "text", label: "skFieldName", required: true },
  { kind: "phone", label: "skFieldPhone", required: true },
];

/** C's custom-order page: what happens, the three steps, then the request (the `form` element as the shop's custom-order request). */
function customPage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "gcCustomPage" });
  const fields: FormField[] = CUSTOM_FIELDS.map((f, i) => ({ id: `f${i + 1}`, kind: f.kind, label: ctx.w(f.label), required: Boolean(f.required), options: f.options ? f.options.map((w) => ctx.w(w)) : null }));
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...signatureHeader(l.k, "large") },
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      surface: { pattern: "grain", pattern_strength: 0.07 },
      children: [
        say(ctx, l, "gcCustomIntro", { size: 14.5, line_height: 1.7 }, { muted: true, padding: sides(8, 18, 14, 18) }),
        madeToOrder({ ...ctx, ownPages: false }, l),
        marketHead(ctx, l, "gcCustomForm", null),
        {
          id: id(),
          type: "form",
          name: ctx.w("gcCustomForm"),
          form: { fields, submit_label: ctx.w("skCustomSend"), success_text: ctx.w("skCustomSent"), send_to: "email", request: "custom_order" },
          font: { family: l.family },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          background: l.k.surface,
          dark_background: l.k.darkSurface,
          border_color: l.k.line,
          dark_border_color: l.k.darkLine,
          border_width: 1,
          radius: 6,
          padding: sides(16, 16, 16, 16),
          margin: sides(0, 16, 4, 16),
        },
      ],
    },
  };
}

/** Over the shop: C a calligraphic line, the yarns and the categories as chips; D the switch's two sides as round tiles. */
function shopTop(ctx: SectionContext, l: Look): StudioNode[] {
  const id = idOf(ctx);
  if (l.look === "c") return [{ ...head(ctx, l, "gcShopKicker", { size: 22, weight: 700 }, { max_lines: 1 }), padding: sides(6, 16, 6, 16) }, { ...stitches(ctx, l, 26), margin: sides(0, 16, 6, 16) }, { id: id(), type: "categories", name: ctx.w("skCategories"), source: "products", style: "chips", padding: sides(4, 12, 4, 12) }];
  return [
    { ...say(ctx, l, "gdShopKicker", { size: 22, weight: 800 }, { max_lines: 1 }), padding: sides(8, 20, 10, 20) },
    { id: id(), type: "row", name: ctx.w("gdKits"), gap: 10, scroll: true, padding: sides(0, 20, 6, 20), children: KITS.map(([p, w]) => ({ id: id(), type: "column" as const, name: ctx.w("crKits"), gap: 4, cross: "center" as const, action: shop, children: [image(ctx, l, p, { width: 72, height: 72, radius: 36 }), say(ctx, l, w, { size: 12 }, { max_lines: 1 })] })) },
    { id: id(), type: "categories", name: ctx.w("skCategories"), source: "products", style: "pictures", padding: sides(6, 12, 4, 12) },
  ];
}

function cartTop(ctx: SectionContext, l: Look): StudioNode[] {
  const id = idOf(ctx);
  const word: SectionWord = l.look === "c" ? "gcCartNote" : "gdCartNote";
  return [
    { id: id(), type: "coupon", name: ctx.w("skCoupon"), code: CROCHET_CD_COUPON_CODE, coupon: { look: l.look === "c" ? "ticket" : "glass", bind: "public" }, radius: l.look === "c" ? 6 : 26, color: l.k.fill, margin: sides(10, 16, 4, 16) },
    {
      id: id(),
      type: "row",
      name: ctx.w(word),
      gap: 12,
      cross: "center",
      radius: l.look === "c" ? 4 : 22,
      padding: sides(12, 14, 12, 14),
      margin: sides(8, 16, 4, 16),
      background: l.tint.day,
      dark_background: l.tint.night,
      children: [icon(ctx, l.look === "c" ? "redeem" : "event", 22, { color: l.k.accent, dark_color: l.k.darkAccent }), say(ctx, l, word, { size: 13.5, weight: 600, line_height: 1.5 }, { width: "fill", max_lines: 3 })],
    },
  ];
}

function ordersTop(ctx: SectionContext, l: Look): StudioNode[] {
  const step = (title: SectionWord, text: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    { ...(l.look === "c" ? head(ctx, l, "skTrack", { size: 24, weight: 700 }, { max_lines: 1 }) : say(ctx, l, "skTrack", { size: 22, weight: 800 }, { max_lines: 1 })), padding: sides(10, 16, 8, 16) },
    {
      id: idOf(ctx)(),
      type: "timeline",
      name: ctx.w("skTrack"),
      timeline: { style: l.look === "c" ? "vertical" : "bars", source: "latest_order" },
      color: l.k.ink,
      dark_color: l.k.darkInk,
      background: l.k.surface,
      dark_background: l.k.darkSurface,
      radius: l.look === "c" ? 6 : 28,
      padding: sides(16, 14, 16, 14),
      margin: sides(0, 16, 6, 16),
      border_color: l.k.line,
      dark_border_color: l.k.darkLine,
      border_width: 1,
      entries: [step("crTrack1", "crTrack1Text", true), step("crTrack2", "crTrack2Text"), step("crTrack3", "crTrack3Text"), step("crTrack4", "crTrack4Text")],
    },
  ];
}

/** The demo's code shown in the app (lib/demo/kits/crochet.ts makes it). */
export const CROCHET_CD_COUPON_CODE = "GHURZA10";

const over = (l: Look) => (screenName: string, ctx: SectionContext): StudioNode[] | null => {
  switch (screenName) {
    case "search":
      return shopTop(ctx, l);
    case "cart":
      return cartTop(ctx, l);
    case "orders":
      return ordersTop(ctx, l);
    default:
      return null;
  }
};

/** C's five tabs: the Market (home), the Pieces (the shop), Cart, Orders, Account. */
export function marketTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const out = structuredClone([...tabs]).map((t) => (t.id === "home" ? tabOf(t, "gcMarket", "storefront") : screenOf(t) === "search" ? tabOf(t, "gcPieces", "grid_view") : screenOf(t) === "cart" ? { ...t, label: "Cart", icon: "shopping_bag" } : screenOf(t) === "account" ? { ...t, icon: "person" } : t));
  const account = out.findIndex((t) => screenOf(t) === "account");
  if (!out.some((t) => screenOf(t) === "orders")) out.splice(account < 0 ? out.length : account, 0, { id: "orders", label: "Orders", icon: "receipt_long", target: screen("orders") });
  return out;
}

/** D's five tabs: Home, Shop, Wishlist, Cart, Account. */
export function cozyTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const out = structuredClone([...tabs]).map((t) => (t.id === "home" ? { ...t, icon: "home" } : screenOf(t) === "search" ? { ...t, label: "Shop", icon: "inventory_2" } : screenOf(t) === "cart" ? { ...t, label: "Cart", icon: "shopping_bag" } : screenOf(t) === "account" ? { ...t, icon: "person" } : t));
  const cart = out.findIndex((t) => screenOf(t) === "cart");
  if (!out.some((t) => screenOf(t) === "favorites")) out.splice(cart < 0 ? out.length : cart, 0, tabOf({ id: "wishlist", label: "Wishlist", icon: "favorite", target: screen("favorites") }, "gcWishlist", "favorite"));
  return out;
}

// ——— The sign-in screens, the bars and the two templates ———

const FIRST = ["orders", "notifications", "settings", "help", "privacy", "terms"] as const;

const MARKET_SCREENS = signatureScreens({
  style: "photo",
  photo: P("knit-flatlay"),
  title: { en: "Welcome to the makers' market", ar: "أهلًا بكِ في سوق الصنّاع", tr: "Zanaatkâr pazarına hoş geldiniz" },
  subtitle: { en: "Sign in to follow your pieces as they are made.", ar: "سجّلي الدخول لتتابعي قطعكِ وهي تُصنع.", tr: "Parçalarınızı yapılırken izlemek için giriş yapın." },
  menu: "cover",
  first: FIRST,
});

const COZY_SCREENS = signatureScreens({
  style: "photo",
  photo: P("cozy-sweater"),
  title: { en: "Make something warm", ar: "اصنعي شيئًا دافئًا", tr: "Sıcak bir şey yapın" },
  subtitle: { en: "Sign in for your kits, your classes and your orders.", ar: "سجّلي الدخول لعلبكِ وورشكِ وطلباتكِ.", tr: "Kitleriniz, atölyeleriniz ve siparişleriniz için giriş yapın." },
  menu: "night",
  accent: D.accent,
  first: FIRST,
});

/** C's bar: a folder's tab, the open tab raised on the paper in brick, the others in coffee. */
export const MARKET_BAR = signatureBar(C, { design: "folder", background: C.surface, dark_background: C.darkSurface, active: C.accent, dark_active: C.darkAccent, inactive: C.ink, dark_inactive: C.darkInk, labels: "always", radius: 14, margin: 10 });
/** D's bar: white bubbles on the rose, the open tab a soft rose bubble with its name. */
export const COZY_BAR = signatureBar(D, { design: "bubble", background: "#FFFFFF", dark_background: "#251B1D", active: D.accent, dark_active: D.darkAccent, inactive: D.muted, dark_inactive: D.darkMuted, labels: "active", radius: 30, margin: 16 });

export const GHURZA_C: SignatureDesign = {
  demo: "crochet",
  variant: "c",
  template: { id: "crochet_signature_c", icon: "storefront", fits: { types: ["store"], plain: true } },
  home: marketHome,
  over: over(LOOK_C),
  tabs: marketTabs,
  pages: (ctx) => [
    { slug: GC_MENU_PAGE, title: "skCategoryMenu" as SectionWord, studio: menuPage(ctx, LOOK_C) },
    { slug: GC_CUSTOM_PAGE, title: "gcCustomPage" as SectionWord, studio: customPage(ctx, LOOK_C) },
  ],
  bar: MARKET_BAR,
  look: { header: signatureHeader(C, "large"), background: C.page, dark_background: C.darkPage },
  chrome: { header: "large", home: "brand", system: "large" },
  isNew: true,
  project: {
    primary: C.accent,
    appearance: { secondary_color: "#6F5B4B", font_family: "Aref Ruqaa", arabic_font: "Noto Naskh Arabic", dark_background: C.darkPage, dark_surface: C.darkSurface },
    screens: MARKET_SCREENS,
  },
};

export const GHURZA_D: SignatureDesign = {
  demo: "crochet",
  variant: "d",
  template: { id: "crochet_signature_d", icon: "checkroom", fits: { types: ["store"], plain: true } },
  home: cozyHome,
  over: over(LOOK_D),
  tabs: cozyTabs,
  pages: (ctx) => [{ slug: GC_MENU_PAGE, title: "skCategoryMenu" as SectionWord, studio: menuPage(ctx, LOOK_D) }],
  bar: COZY_BAR,
  look: { header: signatureHeader(D, "photo"), background: D.page, dark_background: D.darkPage },
  chrome: { header: "photo", system: "photo" },
  isNew: true,
  project: {
    primary: D.fill,
    appearance: { secondary_color: D.accent, font_family: "Mada", dark_background: D.darkPage, dark_surface: D.darkSurface },
    screens: COZY_SCREENS,
  },
};

// ——— C's and D's own parts as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;
const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};
const alone = (ctx: SectionContext): SectionContext => ({ ...ctx, ownPages: false });

export const CROCHET_CD_SECTIONS: readonly SectionInfo[] = [
  // C: the makers' cards, made to order step by step, the yarn picker, the pieces on hanging tags.
  { id: "gc_makers", icon: "groups", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [marketHead(ctx, LOOK_C, "gcMakersTitle", { word: "gcAllMakers", action: shop }), makerCards(ctx, LOOK_C)]) },
  { id: "gc_made_to_order", icon: "handyman", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [marketHead(ctx, LOOK_C, "gcHowTitle", null), madeToOrder(alone(ctx), LOOK_C)]) },
  { id: "gc_yarn_picker", icon: "auto_awesome", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [marketHead(ctx, LOOK_C, "gcYarnTitle", null), yarnPicker(alone(ctx), LOOK_C)]) },
  { id: "gc_tag_cards", icon: "sell", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [marketHead(ctx, LOOK_C, "gcPiecesTitle", { word: "gcAllPieces", action: shop }), tagGrid(ctx, LOOK_C)]) },
  // D: ready pieces or kits, the pattern of the week, the dated classes.
  { id: "gd_ready_or_kits", icon: "swap_horiz", isNew: true, fits: STORE_PLAIN, make: one((ctx) => readyOrKits(ctx, LOOK_D)) },
  { id: "gd_pattern_week", icon: "auto_stories", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [cozyHead(ctx, LOOK_D, "gdPatternHead", null), patternOfWeek(ctx, LOOK_D)]) },
  { id: "gd_classes", icon: "event", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [cozyHead(ctx, LOOK_D, "gdClassesTitle", { word: "gdCalendar", action: shop }), classRow(ctx, LOOK_D)]) },
];
