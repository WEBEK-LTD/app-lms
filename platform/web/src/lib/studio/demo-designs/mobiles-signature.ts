import type { Action, StudioEntry, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { installmentsTag } from "../installments";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigPhoto, sigTexts, signatureBar, signatureHeader, type SignatureInk } from "./food-signature-parts";
import { clothesTabs, MENU_PAGE } from "./clothes-signature";

/**
 * 211 Nova (نوفا), Studio's mobiles type (lib/studio/shop-types.ts): a
 * Studio demo of the store kind and its two Signature looks, each a whole
 * store project (its home, its category menu, its trade-in and compare
 * pages, its shop, cart and orders, its tabs, its floating bar, its sign-in
 * screen and account), built only from Studio's elements so every part is
 * the owner's to change, as the owner approved them on 23 November 2026 (a
 * small header, a search pill, the categories, a compact hero carousel of
 * about 210 px with the next card peeking, tight sections and a floating bar).
 *
 * A · NOVA: cool white, ink and one cobalt accent, Readex Pro; a deep
 * graphite night.
 * B · deep emerald on warm stone, IBM Plex Sans Arabic; a green-black night.
 *
 * Both are made of the mobiles shop's parts, each a reusable element: the
 * trade-in estimator (`trade_in`, inline or as a card that opens it), two
 * phones compared spec by spec (`compare`), the shop by storage
 * (`spec_filter`), the certified used devices with their grades, the deal of
 * the day with its countdown, the accessories that complete a phone, and
 * "Installments coming soon" (never a way to pay). Nothing is made up: the
 * lists, the categories, the sale, the trade-in prices and the specs are the
 * shop's own; the owner's words are in [brackets] (the demo fills them,
 * lib/studio/demo-templates.ts).
 */

// ——— The two looks' colours and faces ———

/** A · NOVA: cool white and ink by day, cobalt its one accent; graphite by night. */
export const NOVA_INK: SignatureInk = {
  page: "#F4F5F7",
  darkPage: "#0A0B0E",
  surface: "#FFFFFF",
  darkSurface: "#15171C",
  ink: "#0E1014",
  darkInk: "#F1F2F4",
  muted: "#525864",
  darkMuted: "#AEB3BD",
  line: "#E2E5EA",
  darkLine: "#262A31",
  accent: "#2149D1",
  darkAccent: "#8FA8FF",
  fill: "#2A55E5",
  darkFill: "#3D65F2",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const A = NOVA_INK;
const READEX = "Readex Pro";

/** B · deep emerald on warm stone; a green-black night. */
export const EMERALD_INK: SignatureInk = {
  page: "#F6F3EE",
  darkPage: "#0C110F",
  surface: "#FFFFFF",
  darkSurface: "#141B18",
  ink: "#14201C",
  darkInk: "#ECF1EE",
  muted: "#525C57",
  darkMuted: "#AAB4AF",
  line: "#E4DED4",
  darkLine: "#24302B",
  accent: "#0E5A4A",
  darkAccent: "#66CFAE",
  fill: "#0E5A4A",
  darkFill: "#147A63",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const B = EMERALD_INK;
const PLEX = "IBM Plex Sans Arabic";

/** Nova's photos (public/mobiles-photos, CC0 from StockSnap, credited in CREDITS.md). */
const P = (name: string) => `/mobiles-photos/${name}.jpg`;

const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
/** One of the look's own pages where the whole look is made; where its home is made alone (another store's template, a ready section) the shop. */
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));
/** The trade-in estimator where the shop takes trade-ins (an older app, or a shop without it: the shop). */
const tradeIn: Action = { type: "screen", screen: "search", flow: "trade_in" };
export const TRADE_PAGE = "trade-in";
export const COMPARE_PAGE = "compare";

/** The look's ink, its tints and its face. */
interface Look {
  k: SignatureInk;
  /** Card and chip backgrounds a step off the page. */
  tint: { day: string; night: string };
  /** The accent's soft wash (a chip, an icon's disc) and the words on it. */
  soft: { day: string; night: string; ink: string; darkInk: string };
  family: string;
  look: "a" | "b";
}
const LOOK_A: Look = { k: A, tint: { day: "#ECEEF2", night: "#1C1F25" }, soft: { day: "#E7EDFD", night: "#18213F", ink: "#1E43C0", darkInk: "#A9BCFF" }, family: READEX, look: "a" };
const LOOK_B: Look = { k: B, tint: { day: "#EDE8E0", night: "#1A2320" }, soft: { day: "#E1EDE8", night: "#14302A", ink: "#0B4A3D", darkInk: "#8EDDC3" }, family: PLEX, look: "b" };

// ——— What both looks are made of ———

const face = (l: Look, size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: l.family, size, weight: l.look === "a" ? 600 : 700, line_height: 1.25, ...extra });

function say(ctx: SectionContext, l: Look, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, l.k, ctx.w(word), font, extra);
}

/** The look's card: its surface, its line, its corners. */
const card = (l: Look, extra: Partial<StudioNode> = {}): Partial<StudioNode> => ({ background: l.k.surface, dark_background: l.k.darkSurface, border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1, radius: l.look === "a" ? 22 : 20, ...extra });

/** A section's title (B: a small kicker over it after a dash), its line, and a quieter link at its end. */
function headOf(ctx: SectionContext, l: Look, title: SectionWord, link: { word: SectionWord; action: Action } | null, line?: SectionWord, kicker?: SectionWord, padding: StudioSides = sides(26, 16, 10, 16)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    cross: "end",
    gap: 12,
    padding,
    children: [
      {
        id: id(),
        type: "column",
        width: "fill",
        gap: 3,
        children: [
          ...(kicker ? [say(ctx, l, kicker, { size: 11.5, weight: 600 }, { accent: true })] : []),
          say(ctx, l, title, face(l, l.look === "a" ? 20 : 21), { max_lines: 2 }),
          ...(line ? [say(ctx, l, line, { size: 12.5 }, { muted: true, max_lines: 2 })] : []),
        ],
      },
      ...(link
        ? [
            {
              id: id(),
              type: "row" as const,
              name: ctx.w(link.word),
              gap: 2,
              cross: "center" as const,
              height: 32,
              ...(l.look === "b" ? { radius: 16, padding: sides(0, 12, 0, 10), border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1 } : {}),
              action: link.action,
              children: [say(ctx, l, link.word, { size: 13, weight: 600 }, { accent: l.look === "a" })],
            },
          ]
        : []),
    ],
  };
}

/** The search pill: the shop's search on the look's surface. */
function searchPill(ctx: SectionContext, l: Look, word: SectionWord, margin = sides(4, 16, 6, 16)): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "search",
    name: ctx.w(word),
    text: ctx.w(word),
    source: "products",
    radius: l.look === "a" ? 24 : 18,
    height: 48,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    color: l.k.muted,
    dark_color: l.k.darkMuted,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    margin,
  };
}

/** The shop's main categories: round photos in a row (A), photo tiles four by two (B). */
function categoryRow(ctx: SectionContext, l: Look): StudioNode {
  return l.look === "a"
    ? { id: idOf(ctx)(), type: "categories", name: ctx.w("mbCategories"), source: "products", style: "circles", color: l.k.ink, dark_color: l.k.darkInk, padding: sides(10, 12, 4, 12) }
    : { id: idOf(ctx)(), type: "categories", name: ctx.w("mbCategories"), source: "products", style: "pictures", columns: 3, color: l.k.ink, dark_color: l.k.darkInk, padding: sides(10, 16, 4, 16) };
}

/** One hero card: a photo under a shade from its start, its kicker, headline and a button. */
function heroCard(ctx: SectionContext, l: Look, photo: string, kicker: SectionWord, title: SectionWord, button: SectionWord, action: Action, line?: SectionWord): StudioNode {
  const id = idOf(ctx);
  const shade = l.look === "a" ? "#06080C" : "#0B2A23";
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w(title),
    image_url: sigPhoto(ctx, P(photo)),
    height: 212,
    radius: l.look === "a" ? 24 : 22,
    background: shade,
    scrim: { color: shade, from: 0.2, middle: 0.45, at: 50, to: 0.86 },
    align: "end",
    padding: sides(16, 18, 16, 18),
    action,
    children: [
      say(ctx, l, kicker, { size: 11, weight: 600 }, { color: "#FFFFFF", dark_color: "#FFFFFF", opacity: 0.9, max_lines: 1 }),
      say(ctx, l, title, face(l, 22, { weight: 700, line_height: 1.2 }), { color: "#FFFFFF", dark_color: "#FFFFFF", max_lines: 2, margin: sides(6, 0, 0, 0) }),
      ...(line ? [say(ctx, l, line, { size: 12 }, { color: "#FFFFFF", dark_color: "#FFFFFF", opacity: 0.86, max_lines: 2, margin: sides(4, 0, 0, 0) })] : []),
      {
        id: id(),
        type: "button",
        name: ctx.w(button),
        text: ctx.w(button),
        icon: "arrow_forward",
        icon_position: "end",
        width: "hug",
        height: 38,
        radius: 19,
        padding: sides(0, 16, 0, 16),
        self_align: "start",
        margin: sides(12, 0, 0, 0),
        // Never a white pill on a coloured card: the look's fill, its words white.
        background: l.k.fill,
        dark_background: l.k.darkFill,
        color: "#FFFFFF",
        dark_color: "#FFFFFF",
        font: { size: 13.5, weight: 700 },
        motion: { press: "shrink" },
        action,
      },
    ],
  };
}

/** The compact hero carousel: cards about 210 px tall, the next one peeking, dots under them. */
function heroCarousel(ctx: SectionContext, l: Look, cards: readonly StudioNode[]): StudioNode {
  return { id: idOf(ctx)(), type: "slider", name: ctx.w("mbHeroName"), height: 212, per_view: 1.1, gap: 10, autoplay: true, interval_ms: 5000, dots: true, indicator: "dots", padding: sides(14, 16, 4, 16), children: [...cards] };
}

/** A product card: its photo on the look's tint with the share off, its name, its key specs (served as its subtitle) and its price. */
function productCard(ctx: SectionContext, l: Look, width: number, height: number, specs = true): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    width,
    gap: 5,
    children: [
      {
        id: id(),
        type: "stack",
        width,
        height,
        children: [
          { id: id(), type: "image", bind: "image", width, height, radius: l.look === "a" ? 20 : 16, fit: "cover", background: l.tint.day, dark_background: l.tint.night },
          { id: id(), type: "text", bind: "sale", font: { size: 11, weight: 700 }, color: "#FFFFFF", dark_color: "#FFFFFF", background: l.k.fill, dark_background: l.k.darkFill, radius: 8, padding: sides(3, 7, 3, 7), place: { x: 6, y: 5 } },
        ],
      },
      { id: id(), type: "text", bind: "title", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 14, weight: 600 }, margin: sides(4, 0, 0, 0) },
      ...(specs ? [{ id: id(), type: "text" as const, bind: "subtitle" as const, max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 11.5 } }] : []),
      {
        id: id(),
        type: "row",
        gap: 6,
        cross: "center",
        children: [
          { id: id(), type: "text", bind: "price", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 15, weight: 700 } },
          { id: id(), type: "text", bind: "was_price", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 12 } },
        ],
      },
    ],
  };
}

/** The shop's newest devices as a row of cards (B: its best sellers, two by two). */
function latest(ctx: SectionContext, l: Look, sort: "newest" | "popular" = "newest"): StudioNode {
  return sort === "newest"
    ? { id: idOf(ctx)(), type: "items", name: ctx.w("mbLatest"), source: "products", layout: "carousel", gap: 12, padding: sides(0, 16, 0, 16), query: { limit: 8, category_id: null, featured: false, sort, ids: [] }, card: productCard(ctx, l, 162, 196) }
    : { id: idOf(ctx)(), type: "items", name: ctx.w("mbBest"), source: "products", layout: "grid", columns: 2, gap: 12, padding: sides(0, 16, 0, 16), query: { limit: 4, category_id: null, featured: false, sort, ids: [] }, card: productCard(ctx, l, 160, 170) };
}

/** A small icon on the accent's soft wash. */
function softIcon(ctx: SectionContext, l: Look, icon: string, size = 20): StudioNode {
  return { id: idOf(ctx)(), type: "icon", icon, icon_size: size, color: l.soft.ink, dark_color: l.soft.darkInk, background: l.soft.day, dark_background: l.soft.night, radius: 12, padding: sides(8, 8, 8, 8) };
}

/** The trust strip: trade-in (opens the estimator), certified repair and the warranty, three tiles. */
function trustStrip(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const tile = (icon: string, title: SectionWord, line: SectionWord, action: Action | null): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(title),
    width: "fill",
    gap: 6,
    cross: "center",
    padding: sides(14, 8, 12, 8),
    ...card(l, { radius: 18 }),
    ...(action ? { action } : {}),
    children: [softIcon(ctx, l, icon), say(ctx, l, title, { size: 12.5, weight: 700 }, { text_align: "center", max_lines: 2 }), say(ctx, l, line, { size: 11 }, { muted: true, text_align: "center", max_lines: 2 })],
  });
  return { id: id(), type: "row", name: ctx.w("mbTrust1"), gap: 8, padding: sides(16, 16, 0, 16), children: [tile("sync", "mbTrust1", "mbTrust1Line", tradeIn), tile("fact_check", "mbTrust2", "mbTrust2Line", null), tile("verified", "mbTrust3", "mbTrust3Line", null)] };
}

/** The trade-in estimator: the device, its storage and its grade, then what it is worth, sent to the shop as a request (`trade_in`). */
function tradeInEstimator(ctx: SectionContext, l: Look, look: "full" | "card", margin = sides(22, 16, 4, 16)): StudioNode {
  const t = sigTexts(ctx, { text: look === "full" ? "mbTradeTitle" : "mbStepsTitle" });
  return {
    id: idOf(ctx)(),
    type: "trade_in",
    name: ctx.w(look === "full" ? "mbTradeTitle" : "mbStepsTitle"),
    text: t.text,
    translations: t.translations,
    tech: { look, accent: l.k.fill },
    color: l.k.ink,
    dark_color: l.k.darkInk,
    ...(look === "full" ? card(l) : { background: l.tint.day, dark_background: l.tint.night, radius: 24 }),
    padding: sides(16, 16, 16, 16),
    margin,
  };
}

/** B's trade-in in three steps: the steps, then the estimator's card. */
function tradeInSteps(ctx: SectionContext, l: Look): StudioNode[] {
  const id = idOf(ctx);
  const step = (icon: string, title: SectionWord, line: SectionWord): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(title),
    width: "fill",
    gap: 5,
    cross: "center",
    children: [softIcon(ctx, l, icon, 22), say(ctx, l, title, { size: 12.5, weight: 700 }, { text_align: "center", max_lines: 1 }), say(ctx, l, line, { size: 11 }, { muted: true, text_align: "center", max_lines: 2 })],
  });
  return [
    {
      id: id(),
      type: "column",
      name: ctx.w("mbStepsTitle"),
      gap: 14,
      radius: 26,
      padding: sides(18, 16, 16, 16),
      margin: sides(24, 16, 0, 16),
      background: l.tint.day,
      dark_background: l.tint.night,
      children: [
        say(ctx, l, "mbStepsTitle", face(l, 19), { max_lines: 2 }),
        say(ctx, l, "mbStepsLine", { size: 12.5, line_height: 1.45 }, { muted: true, max_lines: 2 }),
        { id: id(), type: "row", gap: 6, children: [step("devices", "mbStep1", "mbStep1Line"), step("fact_check", "mbStep2", "mbStep2Line"), step("payments", "mbStep3", "mbStep3Line")] },
        tradeInEstimator(ctx, l, "card", sides(0, 0, 0, 0)),
      ],
    },
  ];
}

/** The shop's flash sale (`flash_sale`: the sale ending soonest, its devices at was and now prices, a live countdown, the stock left; left out while none is on). */
function dealCard(ctx: SectionContext, l: Look, look: "banner" | "carousel"): StudioNode {
  const t = sigTexts(ctx, { text: "mbDeal" });
  return { id: idOf(ctx)(), type: "flash_sale", name: ctx.w("mbDeal"), text: t.text, translations: t.translations, flash_sale: { look, limit: 6, countdown: true, stock_bar: true, accent: l.k.fill }, radius: 24, margin: sides(24, 16, 4, 16) };
}

/** The grades of a used device: A+ like new, A excellent, B very good, three small cards. */
function gradeLegend(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const grade = (mark: string, title: SectionWord, line: SectionWord): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(title),
    width: "fill",
    gap: 4,
    padding: sides(12, 12, 12, 12),
    ...card(l, { radius: 16 }),
    children: [
      { id: id(), type: "text", text: mark, font: { size: 12, weight: 800 }, color: l.soft.ink, dark_color: l.soft.darkInk, background: l.soft.day, dark_background: l.soft.night, radius: 8, padding: sides(2, 8, 2, 8), self_align: "start" },
      say(ctx, l, title, { size: 13, weight: 700 }, { max_lines: 1, margin: sides(4, 0, 0, 0) }),
      say(ctx, l, line, { size: 11 }, { muted: true, max_lines: 1 }),
    ],
  });
  return { id: id(), type: "row", name: ctx.w("mbUsed"), gap: 8, padding: sides(0, 16, 10, 16), children: [grade("A+", "mbGradeAPlus", "mbGradeAPlusLine"), grade("A", "mbGradeA", "mbGradeALine"), grade("B", "mbGradeB", "mbGradeBLine")] };
}

/** The certified used devices (the shop's featured ones: the demo marks its used devices so): a wide card each, its grade, storage and battery as its spec line. */
function usedList(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w("mbUsed"),
    source: "products",
    layout: l.look === "a" ? "carousel" : "list",
    gap: 10,
    padding: sides(0, 16, 0, 16),
    query: { limit: 4, category_id: null, featured: true, sort: "newest", ids: [] },
    card: {
      id: id(),
      type: "row",
      gap: 12,
      cross: "center",
      padding: sides(10, 10, 10, 12),
      ...(l.look === "a" ? { width: 290 } : {}),
      ...card(l, { radius: 20 }),
      children: [
        {
          id: id(),
          type: "column",
          width: "fill",
          gap: 4,
          children: [
            { id: id(), type: "text", bind: "title", max_lines: 2, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 14, weight: 600 } },
            { id: id(), type: "text", bind: "subtitle", max_lines: 2, color: l.soft.ink, dark_color: l.soft.darkInk, font: { size: 11.5, weight: 600 } },
            {
              id: id(),
              type: "row",
              gap: 6,
              cross: "center",
              children: [
                { id: id(), type: "text", bind: "price", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 15, weight: 700 } },
                { id: id(), type: "text", bind: "was_price", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 12 } },
              ],
            },
          ],
        },
        { id: id(), type: "image", bind: "image", width: 92, height: 104, radius: 14, fit: "cover", background: l.tint.day, dark_background: l.tint.night },
      ],
    },
  };
}

/** Two phones compared spec by spec (`compare`: the owner's two, else the shop's first two with specs). */
function comparePair(ctx: SectionContext, l: Look, margin = sides(0, 16, 0, 16)): StudioNode {
  // Its title is the section's over it; six specs, those both share first.
  return { id: idOf(ctx)(), type: "compare", name: ctx.w("mbCompare"), tech: { accent: l.k.fill, rows: 6 }, color: l.k.ink, dark_color: l.k.darkInk, ...card(l), padding: sides(14, 12, 14, 12), margin };
}

/** The shop by storage (`spec_filter`: the storages its devices come in, each opening them). */
function byStorage(ctx: SectionContext, l: Look): StudioNode {
  const t = sigTexts(ctx, { text: "mbByStorage" });
  return { id: idOf(ctx)(), type: "spec_filter", name: ctx.w("mbByStorage"), text: t.text, translations: t.translations, tech: { spec: "storage", accent: l.k.fill }, color: l.k.ink, dark_color: l.k.darkInk, margin: sides(18, 16, 0, 16) };
}

/** The accessories as photo tiles, a tall one beside two (each opens the shop on it where it is a category of the shop). */
function accessoryTiles(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const tile = (photo: string, kicker: SectionWord, title: SectionWord, height: number): StudioNode => ({
    id: id(),
    type: "photo_hero",
    name: ctx.w(title),
    image_url: sigPhoto(ctx, P(photo)),
    height,
    radius: 20,
    background: "#14171C",
    scrim: { color: "#000000", from: 0, middle: 0.15, at: 50, to: 0.75 },
    align: "end",
    padding: sides(12, 12, 12, 12),
    action: shop,
    children: [
      say(ctx, l, kicker, { size: 10.5, weight: 600 }, { color: "#FFFFFF", dark_color: "#FFFFFF", opacity: 0.88, max_lines: 1 }),
      say(ctx, l, title, face(l, 16, { weight: 700 }), { color: "#FFFFFF", dark_color: "#FFFFFF", max_lines: 2 }),
    ],
  });
  return {
    id: id(),
    type: "row",
    name: ctx.w("mbExtras"),
    gap: 10,
    padding: sides(0, 16, 0, 16),
    children: [
      { ...tile("hp-woman", "mbTileAudioKicker", "mbTileAudio", 280), width: "fill" },
      { id: id(), type: "column", width: "fill", gap: 10, children: [tile("wireless-pad", "mbTileChargersKicker", "mbTileChargers", 135), tile("case-red", "mbTileCasesKicker", "mbTileCases", 135)] },
    ],
  };
}

/** The brands the shop sells as an authorised dealer: wordmarks on cards that slide (the owner's names in brackets). */
function brandStrip(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const brand = (word: SectionWord): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(word),
    width: 112,
    height: 58,
    align: "center",
    cross: "center",
    ...card(l, { radius: 16 }),
    action: shop,
    children: [say(ctx, l, word, { size: 14, weight: 700, letter_spacing: 2.4, uppercase: true }, { max_lines: 1, text_align: "center" })],
  });
  return { id: id(), type: "row", name: ctx.w("mbBrands"), gap: 8, scroll: true, padding: sides(0, 16, 0, 16), children: (["mbBrand1", "mbBrand2", "mbBrand3", "mbBrand4"] as const).map(brand) };
}

/** What this person opened lately (kept on their phone). */
function recent(ctx: SectionContext, l: Look): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w("mbRecent"), source: "products", layout: "carousel", recent: true, gap: 10, padding: sides(0, 16, 0, 16), query: { limit: 10, category_id: null, featured: false, sort: "newest", ids: [] }, card: productCard(ctx, l, 108, 120, false) };
}

/** B's bundle: the phone, a case and a charger at one price, the price in the owner's words and "Installments coming soon". */
function bundleCard(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const thumb = (photo: string): StudioNode => {
    const url = sigPhoto(ctx, P(photo));
    return url ? { id: id(), type: "image", image_url: url, width: "fill", height: 92, radius: 14, fit: "cover", background: l.tint.day, dark_background: l.tint.night } : { id: id(), type: "column", width: "fill", height: 92, radius: 14, background: l.tint.day, dark_background: l.tint.night, children: [] };
  };
  const plus = (): StudioNode => ({ id: id(), type: "icon", icon: "add", icon_size: 16, color: l.k.muted, dark_color: l.k.darkMuted });
  return {
    id: id(),
    type: "column",
    name: ctx.w("mbBundle"),
    gap: 12,
    padding: sides(16, 16, 16, 16),
    margin: sides(0, 16, 0, 16),
    ...card(l, { radius: 24 }),
    children: [
      { id: id(), type: "row", gap: 6, cross: "center", children: [thumb("phone-cam"), plus(), thumb("case-red"), plus(), thumb("wireless-pad")] },
      say(ctx, l, "mbBundleLine", { size: 13.5, weight: 600, line_height: 1.45 }, { max_lines: 3 }),
      installmentsTag(ctx, { color: l.soft.ink, dark_color: l.soft.darkInk, background: l.soft.day, dark_background: l.soft.night }),
      {
        id: id(),
        type: "button",
        name: ctx.w("mbBundleButton"),
        text: ctx.w("mbBundleButton"),
        icon: "shopping_bag",
        width: "hug",
        height: 42,
        radius: 21,
        padding: sides(0, 18, 0, 18),
        self_align: "start",
        background: l.k.fill,
        dark_background: l.k.darkFill,
        color: l.k.onFill,
        dark_color: l.k.darkOnFill,
        font: { size: 13.5, weight: 700 },
        motion: { press: "shrink" },
        action: shop,
      },
    ],
  };
}

/** B's numbers: four cards two by two (the owner's in brackets). */
function statsGrid(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const stat = (icon: string, value: SectionWord, line: SectionWord): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(value),
    gap: 4,
    padding: sides(14, 14, 14, 14),
    ...card(l, { radius: 20 }),
    children: [
      { id: id(), type: "icon", icon, icon_size: 20, color: l.k.accent, dark_color: l.k.darkAccent },
      say(ctx, l, value, face(l, 20), { max_lines: 1, margin: sides(6, 0, 0, 0) }),
      say(ctx, l, line, { size: 11.5 }, { muted: true, max_lines: 2 }),
    ],
  });
  return { id: id(), type: "grid", name: ctx.w("mbStatsName"), columns: 2, gap: 10, padding: sides(24, 16, 0, 16), children: [stat("verified", "mbStat1", "mbStat1Line"), stat("star", "mbStat2", "mbStat2Line"), stat("local_shipping", "mbStat3", "mbStat3Line"), stat("storefront", "mbStat4", "mbStat4Line")] };
}

/** The home's header: the wordmark at its start, the menu (the category menu) and the bell at its end. */
function homeHeader(ctx: SectionContext, l: Look): StudioPage["header"] {
  const t = sigTexts(ctx, { title: "mbWordmark" });
  return { type: "logo_actions", title: t.title, translations: t.translations, buttons: ["menu", "notifications"], menu_page: MENU_PAGE, background: l.k.page, dark_background: l.k.darkPage, color: l.k.ink, dark_color: l.k.darkInk };
}

// ——— A · NOVA ———

export function novaHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const l = LOOK_A;
  return {
    header: homeHeader(ctx, l),
    background: A.page,
    dark_background: A.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 96, 0),
      children: [
        searchPill(ctx, l, "mbSearch"),
        categoryRow(ctx, l),
        heroCarousel(ctx, l, [
          heroCard(ctx, l, "phone-cam-wide", "mbHeroKicker1", "mbHeroTitle1", "mbHeroButton", shop),
          heroCard(ctx, l, "phone-earbuds-wide", "mbHeroKicker2", "mbHeroTitle2", "mbHeroButton", shop),
          heroCard(ctx, l, "box-3-wide", "mbHeroKicker3", "mbHeroTitle3", "mbUsedShop", shop),
        ]),
        trustStrip(ctx, l),
        headOf(ctx, l, "mbLatest", { word: "mbSeeAll", action: shop }, "mbLatestLine"),
        latest(ctx, l),
        tradeInEstimator(ctx, l, "full"),
        dealCard(ctx, l, "carousel"),
        headOf(ctx, l, "mbUsed", { word: "mbUsedShop", action: shop }, "mbUsedLine"),
        gradeLegend(ctx, l),
        usedList(ctx, l),
        headOf(ctx, l, "mbCompare", { word: "mbCompareMore", action: ownPage(ctx, COMPARE_PAGE) }, "mbCompareLine"),
        comparePair(ctx, l),
        headOf(ctx, l, "mbExtras", { word: "mbAllAccessories", action: shop }),
        accessoryTiles(ctx, l),
        headOf(ctx, l, "mbBrands", { word: "mbAllBrands", action: shop }),
        brandStrip(ctx, l),
        headOf(ctx, l, "mbRecent", null),
        recent(ctx, l),
      ],
    },
  };
}

// ——— B · emerald ———

export function emeraldHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const l = LOOK_B;
  return {
    header: homeHeader(ctx, l),
    background: B.page,
    dark_background: B.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 96, 0),
      children: [
        searchPill(ctx, l, "mbSearchB"),
        categoryRow(ctx, l),
        heroCarousel(ctx, l, [
          heroCard(ctx, l, "box-1-wide", "mbTradeKicker", "mbTradeHeroTitle", "mbTradeHeroButton", tradeIn, "mbTradeHeroLine"),
          heroCard(ctx, l, "phone-cam-wide", "mbHeroKicker1", "mbHeroTitle1", "mbHeroButton", shop),
          heroCard(ctx, l, "watch-man-wide", "mbHeroKicker3", "mbHeroTitle3", "mbUsedShop", shop),
        ]),
        headOf(ctx, l, "mbBest", { word: "mbSeeAll", action: shop }, undefined, "mbBestKicker"),
        { id: id(), type: "categories", name: ctx.w("mbBest"), source: "products", padding: sides(0, 12, 8, 12) },
        latest(ctx, l, "popular"),
        ...tradeInSteps(ctx, l),
        headOf(ctx, l, "mbRenewed", { word: "mbSeeAll", action: shop }, undefined, "mbRenewedKicker"),
        usedList(ctx, l),
        dealCard(ctx, l, "banner"),
        headOf(ctx, l, "mbBundle", null, undefined, "mbBundleKicker"),
        bundleCard(ctx, l),
        headOf(ctx, l, "mbCompare", { word: "mbCompareMore", action: ownPage(ctx, COMPARE_PAGE) }, "mbCompareLine"),
        comparePair(ctx, l),
        statsGrid(ctx, l),
        headOf(ctx, l, "mbRecent", null),
        recent(ctx, l),
      ],
    },
  };
}

// ——— The pages after the home (both looks) ———

/**
 * The category menu (the header's menu button opens it): the search on top,
 * quick ways in (trade-in among them), every main category of the shop a
 * row of cards (its "All" card, then its sub-categories), then the account,
 * the orders, the language and how to reach the shop.
 */
export function mobilesMenuPage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "mbWordmark" });
  const quick = (word: SectionWord, icon: string, lit: boolean, action: Action): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(word),
    height: 42,
    radius: 21,
    gap: 7,
    cross: "center",
    padding: sides(0, 16, 0, 14),
    action,
    ...(lit ? { background: l.k.fill, dark_background: l.k.darkFill } : { background: l.k.surface, dark_background: l.k.darkSurface, border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1 }),
    children: [
      { id: id(), type: "icon", icon, icon_size: 18, color: lit ? l.k.onFill : l.k.ink, dark_color: lit ? l.k.darkOnFill : l.k.darkInk },
      { id: id(), type: "text", text: ctx.w(word), max_lines: 1, font: { size: 13.5, weight: 700 }, color: lit ? l.k.onFill : l.k.ink, dark_color: lit ? l.k.darkOnFill : l.k.darkInk },
    ],
  });
  const tile = (word: SectionWord, icon: string, action: Action): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    gap: 6,
    cross: "center",
    padding: sides(14, 6, 12, 6),
    ...card(l, { radius: 18 }),
    action,
    children: [
      { id: id(), type: "icon", icon, icon_size: 22, color: l.k.ink, dark_color: l.k.darkInk },
      { id: id(), type: "text", text: ctx.w(word), max_lines: 1, text_align: "center", font: { size: 12.5, weight: 600 }, color: l.k.ink, dark_color: l.k.darkInk },
    ],
  });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...signatureHeader(l.k, "glass") },
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        searchPill(ctx, l, "mbSearchAll", sides(6, 16, 4, 16)),
        {
          id: id(),
          type: "row",
          name: ctx.w("mbQuick"),
          gap: 8,
          scroll: true,
          padding: sides(8, 16, 8, 16),
          children: [quick("mbTrending", "trending_up", true, shop), quick("mbTrust1", "sync", false, tradeIn), quick("mbNewIn", "new_releases", false, shop), quick("mbOffers", "local_offer", false, shop)],
        },
        {
          id: id(),
          type: "categories",
          name: ctx.w("mbCategoryMenu"),
          source: "products",
          style: "rows",
          category_menu: { look: l.look === "a" ? "label" : "lead", radius: l.look === "a" ? 18 : 16 },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          padding: sides(6, 0, 6, 0),
        },
        { id: id(), type: "divider", height: 1, background: l.k.line, dark_background: l.k.darkLine, margin: sides(14, 16, 14, 16) },
        { id: id(), type: "row", name: ctx.w("mbMenuAccount"), gap: 8, padding: sides(0, 16, 0, 16), children: [tile("mbAccount", "person", screen("account")), tile("mbOrders", "package_2", screen("orders")), tile("mbLanguage", "language", screen("settings"))] },
        {
          id: id(),
          type: "row",
          name: ctx.w("mbContact"),
          gap: 12,
          cross: "center",
          radius: 20,
          padding: sides(14, 16, 14, 16),
          margin: sides(10, 16, 0, 16),
          background: l.tint.day,
          dark_background: l.tint.night,
          action: screen("account"),
          children: [
            { id: id(), type: "icon", icon: "support_agent", icon_size: 22, color: l.k.ink, dark_color: l.k.darkInk },
            { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, l, "mbContact", { size: 14, weight: 700 }), say(ctx, l, "mbContactLine", { size: 12 }, { muted: true, max_lines: 2 })] },
            { id: id(), type: "icon", icon: "chat", icon_size: 20, color: l.k.ink, dark_color: l.k.darkInk },
          ],
        },
      ],
    },
  };
}

/** The trade-in page: what it is, the estimator itself, and how it goes from there. */
export function tradeInPage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "mbTradePage" });
  const step = (title: SectionWord, text: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...signatureHeader(l.k, "glass") },
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { ...say(ctx, l, "mbTradePageLine", { size: 14, line_height: 1.5 }, { muted: true }), padding: sides(8, 16, 4, 16) },
        tradeInEstimator(ctx, l, "full", sides(12, 16, 4, 16)),
        headOf(ctx, l, "mbStepsTitle", null),
        {
          id: id(),
          type: "timeline",
          name: ctx.w("mbStepsTitle"),
          timeline: { style: "vertical" },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          ...card(l),
          padding: sides(14, 14, 14, 14),
          margin: sides(0, 16, 0, 16),
          entries: [step("mbStep1", "mbStep1Line", true), step("mbStep2", "mbStep2Line"), step("mbStep3", "mbStep3Line")],
        },
      ],
    },
  };
}

/** The compare page: two phones side by side, then the shop by storage. */
export function comparePage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "mbComparePage" });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...signatureHeader(l.k, "glass") },
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [{ ...say(ctx, l, "mbComparePageLine", { size: 14, line_height: 1.5 }, { muted: true }), padding: sides(8, 16, 12, 16) }, comparePair(ctx, l), byStorage(ctx, l), headOf(ctx, l, "mbLatest", { word: "mbSeeAll", action: shop }), latest(ctx, l)],
    },
  };
}

/** Over the shop: its categories as chips, the shop by storage, and a banner of the week's offer. */
function shopTop(ctx: SectionContext, l: Look): StudioNode[] {
  return [
    { id: idOf(ctx)(), type: "categories", name: ctx.w("mbCategories"), source: "products", padding: sides(4, 12, 4, 12) },
    { ...heroCard(ctx, l, l.look === "a" ? "phone-dark-wide" : "phone-wood-wide", "mbEditKicker", "mbEditTitle", "mbShopEdit", shop), height: 160, margin: sides(6, 16, 6, 16) },
  ];
}

/** Over the cart: the shop's code for a first order, its returns, and trade-in a tap away. */
function cartTop(ctx: SectionContext, l: Look): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "coupon", name: ctx.w("mbCoupon"), code: MOBILES_COUPON_CODE, coupon: { look: l.look === "a" ? "glass" : "ticket", bind: "public" }, radius: 18, color: l.k.fill, margin: sides(10, 16, 4, 16) },
    {
      id: id(),
      type: "row",
      name: ctx.w("mbReturnsNote"),
      gap: 12,
      cross: "center",
      radius: 18,
      padding: sides(12, 14, 12, 14),
      margin: sides(8, 16, 4, 16),
      background: l.tint.day,
      dark_background: l.tint.night,
      children: [
        { id: id(), type: "icon", icon: "history", icon_size: 22, color: l.k.ink, dark_color: l.k.darkInk },
        say(ctx, l, "mbReturnsNote", { size: 13, weight: 600, line_height: 1.4 }, { width: "fill", max_lines: 3 }),
      ],
    },
    {
      id: id(),
      type: "row",
      name: ctx.w("mbTradeTitle"),
      gap: 12,
      cross: "center",
      radius: 18,
      padding: sides(12, 14, 12, 14),
      margin: sides(4, 16, 4, 16),
      background: l.soft.day,
      dark_background: l.soft.night,
      action: ownPage(ctx, TRADE_PAGE),
      children: [
        { id: id(), type: "icon", icon: "sync", icon_size: 22, color: l.soft.ink, dark_color: l.soft.darkInk },
        { ...inked(ctx, l.k, ctx.w("mbTradeTitle"), { size: 13, weight: 700 }, { width: "fill", max_lines: 2 }), color: l.soft.ink, dark_color: l.soft.darkInk },
        { id: id(), type: "icon", icon: "arrow_forward", icon_size: 18, color: l.soft.ink, dark_color: l.soft.darkInk },
      ],
    },
  ];
}

/** Over the orders: how an order travels (the person's newest order on its way, else the first step lit). */
function ordersTop(ctx: SectionContext, l: Look): StudioNode[] {
  const step = (title: SectionWord, text: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    headOf(ctx, l, "mbTrack", null, undefined, undefined, sides(10, 16, 6, 16)),
    {
      id: idOf(ctx)(),
      type: "timeline",
      name: ctx.w("mbTrack"),
      timeline: { style: "vertical", source: "latest_order" },
      color: l.k.ink,
      dark_color: l.k.darkInk,
      ...card(l),
      padding: sides(16, 14, 16, 14),
      margin: sides(0, 16, 6, 16),
      entries: [step("mbTrack1", "mbTrack1Text", true), step("mbTrack2", "mbTrack2Text"), step("mbTrack3", "mbTrack3Text"), step("mbTrack4", "mbTrack4Text")],
    },
  ];
}

/** The demo's code shown in the app (lib/demo/mobiles.ts makes it). */
export const MOBILES_COUPON_CODE = "NOVA10";

function mobilesOver(l: Look) {
  return (screenName: string, ctx: SectionContext): StudioNode[] | null => {
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
}

function mobilesPages(l: Look) {
  return (ctx: SectionContext) => [
    { slug: MENU_PAGE, title: "mbCategoryMenu" as SectionWord, studio: mobilesMenuPage(ctx, l) },
    { slug: TRADE_PAGE, title: "mbTradePage" as SectionWord, studio: tradeInPage(ctx, l) },
    { slug: COMPARE_PAGE, title: "mbComparePage" as SectionWord, studio: comparePage(ctx, l) },
  ];
}

// ——— The sign-in screens, the account menus, the bars and the two looks ———

const NOVA_SCREENS = signatureScreens({
  style: "photo",
  photo: P("phone-cam-wide"),
  title: { en: "Welcome back", ar: "أهلًا بعودتك", tr: "Tekrar hoş geldiniz" },
  subtitle: { en: "Sign in to follow your orders and your trade-ins.", ar: "سجّل الدخول لتتابع طلباتك وطلبات الاستبدال.", tr: "Siparişlerinizi ve takaslarınızı izlemek için giriş yapın." },
  menu: "cover",
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

const EMERALD_SCREENS = signatureScreens({
  style: "photo",
  photo: P("box-1-wide"),
  title: { en: "Your next phone is here", ar: "هاتفك القادم بانتظارك", tr: "Sıradaki telefonunuz burada" },
  subtitle: { en: "Sign in for your orders, your trade-ins and your warranty.", ar: "سجّل الدخول لطلباتك والاستبدال والضمان.", tr: "Siparişleriniz, takaslarınız ve garantiniz için giriş yapın." },
  menu: "night",
  accent: B.fill,
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** A's floating bar: white glass by day, graphite by night, the open tab an ink pill with its name. */
export const NOVA_BAR = signatureBar(A, { design: "float", background: "#FFFFFF", dark_background: "#1E2026", active: "#0E1014", dark_active: "#3D65F2", inactive: "#666C77", dark_inactive: "#A3A8B2", labels: "active", radius: 30, margin: 12 });
/** B's floating bar: warm white by day, green-black by night, the open tab emerald. */
export const EMERALD_BAR = signatureBar(B, { design: "float", background: "#FFFDFA", dark_background: "#18201D", active: B.fill, dark_active: B.darkFill, inactive: "#6C7570", dark_inactive: "#9AA59F", labels: "active", radius: 30, margin: 12 });

export const NOVA_A: SignatureDesign = {
  demo: "mobiles",
  variant: "a",
  template: { id: "mobiles_signature_a", icon: "smartphone", fits: { types: ["store"], plain: true } },
  home: novaHome,
  over: mobilesOver(LOOK_A),
  tabs: clothesTabs,
  pages: mobilesPages(LOOK_A),
  bar: NOVA_BAR,
  look: { header: signatureHeader(A, "glass"), background: A.page, dark_background: A.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    // Look A is the demo: its main colour the demo's (lib/demo/content.ts).
    appearance: { secondary_color: A.fill, font: "Lexend", font_family: READEX, dark_background: A.darkPage, dark_surface: A.darkSurface },
    screens: NOVA_SCREENS,
  },
};

export const EMERALD_B: SignatureDesign = {
  demo: "mobiles",
  variant: "b",
  template: { id: "mobiles_signature_b", icon: "phone_iphone", fits: { types: ["store"], plain: true } },
  home: emeraldHome,
  over: mobilesOver(LOOK_B),
  tabs: clothesTabs,
  pages: mobilesPages(LOOK_B),
  bar: EMERALD_BAR,
  look: { header: signatureHeader(B, "glass"), background: B.page, dark_background: B.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    primary: B.fill,
    appearance: { secondary_color: "#14201C", font: "DM Sans", font_family: PLEX, dark_background: B.darkPage, dark_surface: B.darkSurface },
    screens: EMERALD_SCREENS,
  },
};

// ——— Every part of the two looks as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;

const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};

export const MOBILES_SECTIONS: readonly SectionInfo[] = [
  // Trade-in: the estimator inline, and B's three steps with the card that opens it.
  { id: "mb_trade_in", icon: "sync", isNew: true, fits: STORE_PLAIN, make: one((ctx) => tradeInEstimator(ctx, LOOK_A, "full")) },
  { id: "mb_trade_steps", icon: "format_list_numbered", isNew: true, fits: STORE_PLAIN, make: one((ctx) => tradeInSteps(ctx, LOOK_B)) },
  // Two phones compared spec by spec, and the shop by storage.
  { id: "mb_compare", icon: "compare", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "mbCompare", null, "mbCompareLine"), comparePair(ctx, LOOK_A)]) },
  { id: "mb_by_storage", icon: "table_chart", isNew: true, fits: STORE_PLAIN, make: one((ctx) => byStorage(ctx, LOOK_A)) },
  // The trust strip, the certified used devices with their grades, the accessories' tiles and the brands.
  { id: "mb_trust", icon: "verified", isNew: true, fits: STORE_PLAIN, make: one((ctx) => trustStrip(ctx, LOOK_A)) },
  { id: "mb_used", icon: "devices", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "mbUsed", { word: "mbUsedShop", action: shop }, "mbUsedLine"), gradeLegend(ctx, LOOK_A), usedList(ctx, LOOK_A)]) },
  { id: "mb_accessories", icon: "shopping_bag", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "mbExtras", { word: "mbAllAccessories", action: shop }), accessoryTiles(ctx, LOOK_A)]) },
  { id: "mb_brands", icon: "workspace_premium", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "mbBrands", null), brandStrip(ctx, LOOK_A)]) },
  // B's bundle with "Installments coming soon", and its numbers.
  { id: "mb_bundle", icon: "inventory_2", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_B, "mbBundle", null, undefined, "mbBundleKicker"), bundleCard(ctx, LOOK_B)]) },
  { id: "mb_stats", icon: "trending_up", isNew: true, fits: STORE_PLAIN, make: one((ctx) => statsGrid(ctx, LOOK_B)) },
];
