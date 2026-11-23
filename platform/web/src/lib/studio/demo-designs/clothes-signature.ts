import type { Action, LayoutTab, StudioEntry, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigPhoto, sigTexts, signatureBar, signatureHeader, type SignatureInk } from "./food-signature-parts";

/**
 * 206 Lujain (لجين), Studio's clothes type (lib/studio/shop-types.ts): a
 * Studio demo of the store kind and its two Signature looks, each a whole
 * store project (its home, its menu, its shop, cart and orders, its tabs,
 * its floating bar, its sign-in screen and account), built only from
 * Studio's elements so every part is the owner's to change, as the owner
 * approved them on 23 November 2026 (a real native phone app: a small
 * header, a search pill, the categories, a compact hero carousel of about
 * 210 px with the next card peeking, tight sections and a floating bar).
 *
 * A · LUJAIN, the boutique: black and white, big photos, IBM Plex Sans
 * Arabic; warm paper by day, a deep charcoal by night.
 * B · NOUN, streetwear: electric blue on concrete grey, Changa; near black
 * by night.
 *
 * Both share the parts a clothes shop needs, each a reusable element: the
 * header's menu button opens the category menu (the `categories` element
 * drawn as `rows`: every main category of the shop a row of cards, its own
 * "All" card first, its sub-categories after it, with the search on top and
 * the account, orders, language and contact at the foot), the shop's flash
 * sale with its live countdown, "Shop the look" (a photo with numbered
 * spots, each opening its piece), the size confidence card (the shop's size
 * chart, a page of its own with the `size_chart` element) and what was seen
 * lately. Nothing is made up: the lists, the categories, the sale, the
 * chart and the prices are the shop's own; the owner's words are in
 * [brackets] (the demo fills them, lib/studio/demo-templates.ts).
 */

// ——— The two looks' colours and faces ———

/** A · LUJAIN: warm paper and black ink by day, a charcoal night in ivory. */
export const LUJAIN_INK: SignatureInk = {
  page: "#F8F6F1",
  darkPage: "#0F0F0E",
  surface: "#FFFFFF",
  darkSurface: "#191917",
  ink: "#121212",
  darkInk: "#F3F0EA",
  muted: "#5F5B55",
  darkMuted: "#B6B0A6",
  line: "#E4DFD6",
  darkLine: "#2E2C28",
  accent: "#9B2C2C",
  darkAccent: "#E58C84",
  fill: "#121212",
  darkFill: "#F3F0EA",
  onFill: "#FFFFFF",
  darkOnFill: "#121212",
};
const A = LUJAIN_INK;
/** A's tint (the size card, the chips). */
const A_TINT = { day: "#EEEAE3", night: "#23221F" };
const PLEX = "IBM Plex Sans Arabic";

/** B · NOUN: concrete grey and near-black ink, electric blue; a near-black night. */
export const NOUN_INK: SignatureInk = {
  page: "#EEEEEA",
  darkPage: "#0A0A0B",
  surface: "#FFFFFF",
  darkSurface: "#151517",
  ink: "#0B0B0C",
  darkInk: "#F3F3F0",
  muted: "#505156",
  darkMuted: "#B0B1B6",
  line: "#DADAD4",
  darkLine: "#2A2A2E",
  accent: "#2B3FF0",
  darkAccent: "#7E8BFF",
  fill: "#2B3FF0",
  darkFill: "#3A4DFF",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const B = NOUN_INK;
const B_TINT = { day: "#E3E3DE", night: "#1D1D20" };
const CHANGA = "Changa";

/** Lujain's photos (public/clothes-photos, CC0 from StockSnap, credited in CREDITS.md). */
const P = (name: string) => `/clothes-photos/${name}.jpg`;

const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
/** The category menu's page and the size guide's (both looks have them). */
export const MENU_PAGE = "menu";
export const SIZE_PAGE = "size-guide";

/** The look's ink, its tint and its face. */
interface Look {
  k: SignatureInk;
  tint: { day: string; night: string };
  family: string;
  look: "a" | "b";
}
const LOOK_A: Look = { k: A, tint: A_TINT, family: PLEX, look: "a" };
const LOOK_B: Look = { k: B, tint: B_TINT, family: CHANGA, look: "b" };

// ——— What both looks are made of ———

const face = (l: Look, size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: l.family, size, weight: 700, line_height: 1.2, ...extra });

function say(ctx: SectionContext, l: Look, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, l.k, ctx.w(word), font, extra);
}

/** A section's title (a small kicker over it in B), a quieter link at its end. */
function headOf(ctx: SectionContext, l: Look, title: SectionWord, link: { word: SectionWord; action: Action } | null, line?: SectionWord, kicker?: SectionWord, padding: StudioSides = sides(24, 16, 10, 16)): StudioNode {
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
          ...(kicker ? [say(ctx, l, kicker, { size: 11, weight: 700, letter_spacing: 1.6, uppercase: true }, { accent: true })] : []),
          say(ctx, l, title, face(l, l.look === "a" ? 21 : 24, { weight: l.look === "a" ? 700 : 800 }), { max_lines: 2 }),
          ...(line ? [say(ctx, l, line, { size: 12.5 }, { muted: true, max_lines: 2 })] : []),
        ],
      },
      ...(link
        ? [
            {
              id: id(),
              type: "row" as const,
              name: ctx.w(link.word),
              height: 32,
              radius: 16,
              gap: 4,
              cross: "center" as const,
              padding: sides(0, 12, 0, 12),
              border_color: l.k.line,
              dark_border_color: l.k.darkLine,
              border_width: 1,
              action: link.action,
              children: [say(ctx, l, link.word, { size: 12.5, weight: 600 })],
            },
          ]
        : []),
    ],
  };
}

/** The search pill: the shop's search, a rounded field on the look's surface. */
function searchPill(ctx: SectionContext, l: Look, word: SectionWord, margin = sides(4, 16, 6, 16)): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "search",
    name: ctx.w(word),
    text: ctx.w(word),
    source: "products",
    radius: 26,
    height: 50,
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

/** The shop's main categories as round photos under the search (each opens the shop on it). */
function categoryCircles(ctx: SectionContext, l: Look): StudioNode {
  return { id: idOf(ctx)(), type: "categories", name: ctx.w("clCategories"), source: "products", style: "circles", color: l.k.ink, dark_color: l.k.darkInk, padding: sides(8, 12, 4, 12) };
}

/** One hero card: a photo under a shade, its kicker, headline and a glass button. */
function heroCard(ctx: SectionContext, l: Look, photo: string, kicker: SectionWord, title: SectionWord, button: SectionWord): StudioNode {
  const id = idOf(ctx);
  const shade = l.look === "a" ? "#121212" : "#0B0B0C";
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w(title),
    image_url: sigPhoto(ctx, P(photo)),
    height: 210,
    radius: l.look === "a" ? 22 : 18,
    background: shade,
    scrim: { color: shade, from: 0.1, middle: 0.25, at: 45, to: 0.78 },
    align: "end",
    padding: sides(16, 18, 16, 18),
    action: shop,
    children: [
      say(ctx, l, kicker, { size: 11, weight: 600, letter_spacing: 1 }, { color: "#FFFFFF", dark_color: "#FFFFFF", opacity: 0.9, max_lines: 1 }),
      say(ctx, l, title, face(l, l.look === "a" ? 24 : 26, { weight: l.look === "a" ? 700 : 800, line_height: 1.12 }), { color: "#FFFFFF", dark_color: "#FFFFFF", max_lines: 2, margin: sides(6, 0, 0, 0) }),
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
        ...(l.look === "a"
          ? { color: "#FFFFFF", dark_color: "#FFFFFF", border_color: "#FFFFFF", border_width: 1, surface: { glass: 14, tint: 0.16 } }
          : { background: B.fill, dark_background: B.darkFill, color: "#FFFFFF", dark_color: "#FFFFFF" }),
        font: { size: 13.5, weight: 700 },
        motion: { press: "shrink" },
        action: shop,
      },
    ],
  };
}

/** The compact hero carousel: cards about 210 px tall, the next one peeking, dots under them. */
function heroCarousel(ctx: SectionContext, l: Look, cards: readonly [string, SectionWord, SectionWord][], button: SectionWord): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "slider",
    name: ctx.w("clHeroName"),
    height: 210,
    per_view: 1.12,
    gap: 10,
    autoplay: true,
    interval_ms: 5000,
    dots: true,
    indicator: "dots",
    padding: sides(10, 16, 4, 16),
    children: cards.map(([photo, kicker, title]) => heroCard(ctx, l, photo, kicker, title, button)),
  };
}

/** A product card: its photo with the sale's share off, its name and its price (struck through before while on sale). */
function productCard(ctx: SectionContext, l: Look, width: number, height: number): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    width,
    gap: 6,
    children: [
      {
        id: id(),
        type: "stack",
        width,
        height,
        children: [
          { id: id(), type: "image", bind: "image", width, height, radius: l.look === "a" ? 16 : 12, fit: "cover", background: l.tint.day, dark_background: l.tint.night },
          { id: id(), type: "text", bind: "sale", font: { size: 11, weight: 800 }, color: "#FFFFFF", background: l.look === "a" ? "#121212" : B.fill, dark_color: l.look === "a" ? "#121212" : "#FFFFFF", dark_background: l.look === "a" ? "#F3F0EA" : B.darkFill, radius: 8, padding: sides(3, 7, 3, 7), place: { x: 6, y: 5 } },
        ],
      },
      { id: id(), type: "text", bind: "title", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 13.5, weight: 500 } },
      {
        id: id(),
        type: "row",
        gap: 6,
        cross: "center",
        children: [
          { id: id(), type: "text", bind: "price", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 14, weight: 700 } },
          { id: id(), type: "text", bind: "was_price", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 12 } },
        ],
      },
    ],
  };
}

/** The shop's newest pieces as a row of cards. */
function newIn(ctx: SectionContext, l: Look, sort: "newest" | "popular" = "newest", featured = false): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "items",
    name: ctx.w(sort === "newest" ? "clNewIn" : "clTrending"),
    source: "products",
    layout: "carousel",
    gap: 12,
    padding: sides(0, 16, 0, 16),
    query: { limit: 8, category_id: null, featured, sort, ids: [] },
    card: productCard(ctx, l, 148, 190),
  };
}

/** The shop's flash sale (the `flash_sale` element: the sale ending soonest, its pieces at was and now prices, a live countdown and the stock left; left out while none is on). */
function dealCard(ctx: SectionContext, l: Look, look: "banner" | "carousel"): StudioNode {
  const t = sigTexts(ctx, { text: "clDeal" });
  return {
    id: idOf(ctx)(),
    type: "flash_sale",
    name: ctx.w("clDeal"),
    text: t.text,
    translations: t.translations,
    flash_sale: { look, limit: 6, countdown: true, stock_bar: true, accent: l.look === "a" ? "#121212" : B.fill },
    radius: 24,
    margin: sides(22, 16, 4, 16),
  };
}

/** "Shop the look": a photo with a numbered spot on each piece (each opens it), the pieces in a list beside the photo's story. */
function shopTheLook(ctx: SectionContext, l: Look, photo: string, spots: readonly [number, number][]): StudioNode[] {
  const id = idOf(ctx);
  const ids = (ctx.entries ?? []).slice(0, spots.length).map((e) => e.id);
  const spot = ([x, y]: [number, number], i: number): StudioNode => {
    const entry = ctx.entries?.[i];
    return {
      id: id(),
      type: "row",
      name: `${ctx.w("clLookTitle")} ${i + 1}`,
      width: 30,
      height: 30,
      radius: 15,
      align: "center",
      cross: "center",
      background: "#FFFFFF",
      dark_background: "#FFFFFF",
      border_color: l.look === "a" ? "#121212" : B.fill,
      border_width: 2,
      shadow: "medium",
      place: { x, y },
      motion: { loop: "pulse" },
      action: entry ? { type: "item", item: { source: "products", id: entry.id } } : shop,
      children: [{ id: id(), type: "text", text: String(i + 1), font: { size: 12.5, weight: 800 }, color: "#121212", dark_color: "#121212" }],
    };
  };
  return [
    headOf(ctx, l, "clLookTitle", { word: "clMoreLooks", action: shop }, "clLookLine", l.look === "b" ? "clLookKicker" : undefined),
    {
      id: id(),
      type: "column",
      name: ctx.w("clLookTitle"),
      gap: 12,
      radius: 24,
      padding: sides(12, 12, 14, 12),
      margin: sides(0, 16, 0, 16),
      background: l.k.surface,
      dark_background: l.k.darkSurface,
      border_color: l.k.line,
      dark_border_color: l.k.darkLine,
      border_width: 1,
      children: [
        {
          id: id(),
          type: "stack",
          height: 300,
          radius: 18,
          background: l.tint.day,
          dark_background: l.tint.night,
          ...(sigPhoto(ctx, P(photo)) ? { image_background_url: sigPhoto(ctx, P(photo)) } : {}),
          children: spots.map(spot),
        },
        say(ctx, l, "clLookName", face(l, 17), { max_lines: 2 }),
        {
          id: id(),
          type: "items",
          name: ctx.w("clLookPieces"),
          source: "products",
          layout: "list",
          gap: 10,
          query: { limit: spots.length, category_id: null, featured: ids.length === 0, sort: "popular", ids },
          card: {
            id: id(),
            type: "row",
            gap: 12,
            cross: "center",
            children: [
              { id: id(), type: "image", bind: "image", width: 56, height: 64, radius: 12, fit: "cover" },
              {
                id: id(),
                type: "column",
                width: "fill",
                gap: 3,
                children: [
                  { id: id(), type: "text", bind: "title", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { size: 13.5, weight: 600 } },
                  { id: id(), type: "text", bind: "price", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 13, weight: 700 } },
                ],
              },
              { id: id(), type: "icon", icon: "arrow_forward", icon_size: 20, color: l.k.ink, dark_color: l.k.darkInk },
            ],
          },
        },
      ],
    },
  ];
}

/** The collections as photo tiles, two by two (each opens the shop). */
function collectionTiles(ctx: SectionContext, l: Look, tiles: readonly [string, SectionWord, SectionWord][]): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "grid",
    name: ctx.w("clCollections"),
    columns: 2,
    gap: 10,
    padding: sides(0, 16, 0, 16),
    children: tiles.map(([photo, kicker, title], i) => ({
      id: id(),
      type: "photo_hero" as const,
      name: ctx.w(title),
      image_url: sigPhoto(ctx, P(photo)),
      height: l.look === "a" && i === 0 ? 220 : 160,
      radius: 18,
      background: "#121212",
      scrim: { color: "#000000", from: 0, middle: 0.1, at: 50, to: 0.7 },
      align: "end" as const,
      padding: sides(12, 12, 12, 12),
      action: shop,
      children: [
        say(ctx, l, kicker, { size: 10.5, weight: 600, letter_spacing: 0.8 }, { color: "#FFFFFF", dark_color: "#FFFFFF", opacity: 0.88, max_lines: 1 }),
        say(ctx, l, title, face(l, 17, { weight: 800 }), { color: "#FFFFFF", dark_color: "#FFFFFF", max_lines: 2 }),
      ],
    })),
  };
}

/** The size confidence card: the shop's chart a tap away (its own page), the fit as a meter from tight to loose. */
function fitCard(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const bar = (lit: boolean): StudioNode => ({ id: id(), type: "row", width: "fill", height: 4, radius: 2, background: lit ? l.k.ink : l.k.line, dark_background: lit ? l.k.darkInk : l.k.darkLine, children: [] });
  const label = (word: SectionWord, lit: boolean): StudioNode => say(ctx, l, word, { size: 11.5, weight: lit ? 700 : 500 }, { muted: !lit, width: "fill", text_align: "center", max_lines: 1 });
  return {
    id: id(),
    type: "column",
    name: ctx.w("clFitTitle"),
    gap: 12,
    radius: 24,
    padding: sides(18, 18, 18, 18),
    margin: sides(24, 16, 4, 16),
    background: l.tint.day,
    dark_background: l.tint.night,
    children: [
      {
        id: id(),
        type: "row",
        gap: 12,
        cross: "start",
        children: [
          { id: id(), type: "icon", icon: "straighten", icon_size: 22, color: l.k.ink, dark_color: l.k.darkInk, background: l.k.surface, dark_background: l.k.darkSurface, radius: 99, padding: sides(9, 9, 9, 9) },
          {
            id: id(),
            type: "column",
            width: "fill",
            gap: 4,
            children: [say(ctx, l, "clFitTitle", face(l, 17)), say(ctx, l, "clFitText", { size: 13, line_height: 1.45 }, { muted: true, max_lines: 3 })],
          },
        ],
      },
      { id: id(), type: "row", gap: 6, children: [bar(false), bar(true), bar(false)] },
      { id: id(), type: "row", gap: 6, children: [label("clFitTight", false), label("clFitTrue", true), label("clFitLoose", false)] },
      {
        id: id(),
        type: "button",
        name: ctx.w("clFitButton"),
        text: ctx.w("clFitButton"),
        icon: "straighten",
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
        action: pageOf(SIZE_PAGE),
      },
    ],
  };
}

/** What this person opened lately (kept on their phone). */
function recent(ctx: SectionContext, l: Look): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w("clRecent"), source: "products", layout: "carousel", recent: true, gap: 10, padding: sides(0, 16, 0, 16), query: { limit: 10, category_id: null, featured: false, sort: "newest", ids: [] }, card: productCard(ctx, l, 112, 140) };
}

/** The home's header: the wordmark at its start, the menu (the category menu), the bell and the bag at its end. */
function homeHeader(ctx: SectionContext, l: Look): StudioPage["header"] {
  const t = sigTexts(ctx, { title: "clWordmark" });
  return { type: "logo_actions", title: t.title, translations: t.translations, buttons: ["menu", "notifications", "cart"], menu_page: MENU_PAGE, background: l.k.page, dark_background: l.k.darkPage, color: l.k.ink, dark_color: l.k.darkInk };
}

// ——— A · LUJAIN ———

export function lujainHome(ctx: SectionContext): StudioPage {
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
        searchPill(ctx, l, "clSearch"),
        categoryCircles(ctx, l),
        heroCarousel(
          ctx,
          l,
          [
            ["hero-trench", "clHeroKicker1", "clHeroTitle1"],
            ["black-dress", "clHeroKicker2", "clHeroTitle2"],
            ["camel-dress", "clHeroKicker3", "clHeroTitle3"],
          ],
          "clShopCollection",
        ),
        headOf(ctx, l, "clNewIn", { word: "clSeeAll", action: shop }, "clNewInLine"),
        newIn(ctx, l),
        dealCard(ctx, l, "carousel"),
        ...shopTheLook(ctx, l, "look", [
          [62, 30],
          [52, 70],
          [30, 52],
        ]),
        headOf(ctx, l, "clCollections", { word: "clAllCollections", action: shop }),
        collectionTiles(ctx, l, [
          ["bridal-rack", "clBridalKicker", "clBridal"],
          ["camel-dress", "clDayKicker", "clDay"],
          ["accessories", "clAccessoriesKicker", "clAccessories"],
          ["abaya-sil", "clAbayasKicker", "clAbayas"],
        ]),
        fitCard(ctx, l),
        headOf(ctx, l, "clRecent", null),
        recent(ctx, l),
      ],
    },
  };
}

// ——— B · NOUN ———

/** B's ticker: the shop's promises between dots (the owner's words in brackets). */
function ticker(ctx: SectionContext): StudioNode {
  const t = sigTexts(ctx, { text: "clTicker" });
  return {
    id: idOf(ctx)(),
    type: "marquee",
    name: ctx.w("clTickerName"),
    text: t.text,
    translations: t.translations,
    icon: "bolt",
    marquee: { speed: 30, direction: "start" },
    font: { family: CHANGA, size: 14, weight: 700 },
    color: "#FFFFFF",
    dark_color: "#FFFFFF",
    background: B.ink,
    dark_background: "#1D1D20",
    padding: sides(10, 0, 10, 0),
    margin: sides(18, 0, 0, 0),
  };
}

/** B's best sellers this week as a numbered list. */
function topList(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w("clTop"),
    source: "products",
    layout: "list",
    gap: 0,
    radius: 22,
    padding: sides(6, 14, 6, 14),
    margin: sides(0, 16, 0, 16),
    background: B.surface,
    dark_background: B.darkSurface,
    query: { limit: 4, category_id: null, featured: false, sort: "popular", ids: [] },
    card: {
      id: id(),
      type: "row",
      gap: 12,
      cross: "center",
      padding: sides(10, 0, 10, 0),
      children: [
        { id: id(), type: "image", bind: "image", width: 52, height: 60, radius: 10, fit: "cover" },
        {
          id: id(),
          type: "column",
          width: "fill",
          gap: 3,
          children: [
            { id: id(), type: "text", bind: "title", max_lines: 1, color: B.ink, dark_color: B.darkInk, font: { family: CHANGA, size: 14, weight: 600 } },
            { id: id(), type: "text", bind: "price", max_lines: 1, color: B.accent, dark_color: B.darkAccent, font: { family: CHANGA, size: 14, weight: 800 } },
          ],
        },
        { id: id(), type: "icon", icon: "arrow_forward", icon_size: 20, color: B.ink, dark_color: B.darkInk },
      ],
    },
  };
}

export function nounHome(ctx: SectionContext): StudioPage {
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
        searchPill(ctx, l, "clSearchB"),
        categoryCircles(ctx, l),
        heroCarousel(
          ctx,
          l,
          [
            ["brick-jacket", "clDropKicker", "clDropTitle"],
            ["purple-tiles", "clHeroKickerB2", "clHeroTitleB2"],
            ["street-walk", "clHeroKickerB3", "clHeroTitleB3"],
          ],
          "clDiscover",
        ),
        headOf(ctx, l, "clNewWeek", { word: "clSeeAll", action: shop }, undefined, "clNewWeekKicker"),
        newIn(ctx, l),
        ticker(ctx),
        ...shopTheLook(ctx, l, "purple-tiles", [
          [30, 26],
          [62, 48],
          [40, 76],
        ]),
        dealCard(ctx, l, "banner"),
        headOf(ctx, l, "clByCategory", { word: "clSeeAll", action: pageOf(MENU_PAGE) }, undefined, "clByCategoryKicker"),
        collectionTiles(ctx, l, [
          ["dark-coat", "clOuterwear", "clCoats"],
          ["fleece", "clDenimKicker", "clDenim"],
          ["white-backpack", "clBagsKicker", "clBags"],
          ["sneak-feet", "clSneakersKicker", "clSneakers"],
        ]),
        headOf(ctx, l, "clTop", { word: "clSeeAll", action: shop }, undefined, "clTopKicker"),
        topList(ctx),
        headOf(ctx, l, "clMood", null, undefined, "clMoodKicker"),
        { id: id(), type: "categories", name: ctx.w("clMood"), source: "products", padding: sides(0, 12, 8, 12) },
        newIn(ctx, l, "popular", true),
        fitCard(ctx, l),
        headOf(ctx, l, "clRecent", null),
        recent(ctx, l),
      ],
    },
  };
}

// ——— The pages after the home (both looks) ———

/**
 * The category menu (the header's menu button opens it): the search on top,
 * quick ways in, every main category of the shop a row of cards (its "All"
 * card, then its sub-categories), then the account, the orders, the
 * language and how to reach the shop.
 */
export function categoryMenuPage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "clWordmark" });
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
    radius: 18,
    padding: sides(14, 6, 12, 6),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
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
        searchPill(ctx, l, "clSearchAll", sides(6, 16, 4, 16)),
        {
          id: id(),
          type: "row",
          name: ctx.w("clQuick"),
          gap: 8,
          scroll: true,
          padding: sides(8, 16, 8, 16),
          children: [quick("clTrending", "trending_up", true, shop), quick("clNewIn", "new_releases", false, shop), quick("clOffers", "local_offer", false, shop)],
        },
        {
          id: id(),
          type: "categories",
          name: ctx.w("clCategoryMenu"),
          source: "products",
          style: "rows",
          category_menu: { look: l.look === "a" ? "lead" : "label", radius: l.look === "a" ? 18 : 14 },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          padding: sides(6, 0, 6, 0),
        },
        { id: id(), type: "divider", height: 1, background: l.k.line, dark_background: l.k.darkLine, margin: sides(14, 16, 14, 16) },
        {
          id: id(),
          type: "row",
          name: ctx.w("clMenuAccount"),
          gap: 8,
          padding: sides(0, 16, 0, 16),
          children: [tile("clAccount", "person", screen("account")), tile("clOrders", "package_2", screen("orders")), tile("clLanguage", "language", screen("settings"))],
        },
        {
          id: id(),
          type: "row",
          name: ctx.w("clContact"),
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
            { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, l, "clContact", { size: 14, weight: 700 }), say(ctx, l, "clContactLine", { size: 12 }, { muted: true, max_lines: 2 })] },
            { id: id(), type: "icon", icon: "chat", icon_size: 20, color: l.k.ink, dark_color: l.k.darkInk },
          ],
        },
      ],
    },
  };
}

/** The size guide: the shop's size chart (the `size_chart` element) and how to measure. */
export function sizeGuidePage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "clFitButton" });
  const step = (title: SectionWord, text: SectionWord): StudioEntry => sigEntry(ctx, { title, text });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...signatureHeader(l.k, "glass") },
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { ...say(ctx, l, "clFitText", { size: 14, line_height: 1.5 }, { muted: true }), padding: sides(8, 16, 4, 16) },
        {
          id: id(),
          type: "size_chart",
          name: ctx.w("clSizeChart"),
          text: ctx.w("clSizeChart"),
          color: l.k.ink,
          dark_color: l.k.darkInk,
          background: l.k.surface,
          dark_background: l.k.darkSurface,
          border_color: l.k.line,
          dark_border_color: l.k.darkLine,
          border_width: 1,
          radius: 20,
          padding: sides(14, 14, 14, 14),
          margin: sides(12, 16, 4, 16),
        },
        headOf(ctx, l, "clMeasure", null),
        {
          id: id(),
          type: "timeline",
          name: ctx.w("clMeasure"),
          timeline: { style: "vertical" },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          background: l.k.surface,
          dark_background: l.k.darkSurface,
          radius: 20,
          padding: sides(14, 14, 14, 14),
          margin: sides(0, 16, 0, 16),
          entries: [step("clBust", "clBustText"), step("clWaist", "clWaistText"), step("clHips", "clHipsText")],
        },
      ],
    },
  };
}

/** Over the shop: its categories as chips, and a banner of the season's edit. */
function shopTop(ctx: SectionContext, l: Look): StudioNode[] {
  return [
    { id: idOf(ctx)(), type: "categories", name: ctx.w("clCategories"), source: "products", padding: sides(4, 12, 4, 12) },
    { ...heroCard(ctx, l, l.look === "a" ? "camel-dress" : "graffiti", "clEditKicker", "clEditTitle", "clShopEdit"), height: 160, margin: sides(6, 16, 6, 16) },
  ];
}

/** Over the cart: the shop's code for a first order and its exchanges. */
function cartTop(ctx: SectionContext, l: Look): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "coupon", name: ctx.w("clCoupon"), code: CLOTHES_COUPON_CODE, coupon: { look: l.look === "a" ? "ticket" : "glass", bind: "public" }, radius: 18, color: l.k.fill, margin: sides(10, 16, 4, 16) },
    {
      id: id(),
      type: "row",
      name: ctx.w("clExchangeNote"),
      gap: 12,
      cross: "center",
      radius: 18,
      padding: sides(12, 14, 12, 14),
      margin: sides(8, 16, 4, 16),
      background: l.tint.day,
      dark_background: l.tint.night,
      children: [
        { id: id(), type: "icon", icon: "sync", icon_size: 22, color: l.k.ink, dark_color: l.k.darkInk },
        say(ctx, l, "clExchangeNote", { size: 13, weight: 600, line_height: 1.4 }, { width: "fill", max_lines: 3 }),
      ],
    },
  ];
}

/** Over the orders: how an order travels (the person's newest order on its way, else the first step lit). */
function ordersTop(ctx: SectionContext, l: Look): StudioNode[] {
  const step = (title: SectionWord, text: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    headOf(ctx, l, "clTrack", null, undefined, undefined, sides(10, 16, 6, 16)),
    {
      id: idOf(ctx)(),
      type: "timeline",
      name: ctx.w("clTrack"),
      timeline: { style: "vertical", source: "latest_order" },
      color: l.k.ink,
      dark_color: l.k.darkInk,
      background: l.k.surface,
      dark_background: l.k.darkSurface,
      radius: 22,
      padding: sides(16, 14, 16, 14),
      margin: sides(0, 16, 6, 16),
      border_color: l.k.line,
      dark_border_color: l.k.darkLine,
      border_width: 1,
      entries: [step("clTrack1", "clTrack1Text", true), step("clTrack2", "clTrack2Text"), step("clTrack3", "clTrack3Text"), step("clTrack4", "clTrack4Text")],
    },
  ];
}

/** The demo's code shown in the app (lib/demo/clothes.ts makes it). */
export const CLOTHES_COUPON_CODE = "LUJAIN10";

function clothesOver(l: Look) {
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

function clothesPages(l: Look) {
  return (ctx: SectionContext) => [
    { slug: MENU_PAGE, title: "clCategoryMenu" as SectionWord, studio: categoryMenuPage(ctx, l) },
    { slug: SIZE_PAGE, title: "clFitButton" as SectionWord, studio: sizeGuidePage(ctx, l) },
  ];
}

/** The five tabs of the floating bar: Home, Shop, Cart, Orders, Account. */
export function clothesTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const out = structuredClone([...tabs]).map((t) => {
    const target = t.target.type === "screen" ? t.target.screen : null;
    if (t.id === "home") return { ...t, icon: "home" };
    if (target === "search") return { ...t, label: "Shop", icon: "grid_view" };
    if (target === "cart") return { ...t, label: "Cart", icon: "shopping_bag" };
    if (target === "account") return { ...t, icon: "person" };
    return t;
  });
  const account = out.findIndex((t) => t.target.type === "screen" && t.target.screen === "account");
  const orders: LayoutTab = { id: "orders", label: "Orders", icon: "package_2", target: { type: "screen", screen: "orders" } };
  if (!out.some((t) => t.target.type === "screen" && t.target.screen === "orders")) out.splice(account < 0 ? out.length : account, 0, orders);
  return out;
}

// ——— The sign-in screens, the account menus, the bars and the two looks ———

const LUJAIN_SCREENS = signatureScreens({
  style: "photo",
  photo: P("hero-trench"),
  title: { en: "Welcome to the house", ar: "أهلًا بكِ في الدار", tr: "Eve hoş geldiniz" },
  subtitle: { en: "Sign in to follow your orders and your sizes.", ar: "سجّلي الدخول لتتابعي طلباتكِ ومقاساتكِ.", tr: "Siparişlerinizi ve bedenlerinizi takip etmek için giriş yapın." },
  menu: "cover",
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

const NOUN_SCREENS = signatureScreens({
  style: "photo",
  photo: P("brick-jacket"),
  title: { en: "Join the drop", ar: "انضمي إلى الإصدار", tr: "Drop'a katıl" },
  subtitle: { en: "Sign in for new drops and your orders.", ar: "سجّلي الدخول للإصدارات الجديدة وطلباتكِ.", tr: "Yeni droplar ve siparişleriniz için giriş yapın." },
  menu: "night",
  accent: B.fill,
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** A's floating bar: white by day, charcoal by night, the open tab a black pill with its name. */
export const LUJAIN_BAR = signatureBar(A, { design: "float", background: "#FFFFFF", dark_background: "#201F1C", active: "#121212", dark_active: "#F3F0EA", inactive: "#5F5B55", dark_inactive: "#A29D94", labels: "active", radius: 30, margin: 12 });
/** B's floating bar: near black by day and by night, the open tab electric blue. */
export const NOUN_BAR = signatureBar(B, { design: "float", background: "#0B0B0C", dark_background: "#151517", active: B.fill, dark_active: B.darkFill, inactive: "#B0B1B6", dark_inactive: "#86878C", labels: "active", radius: 30, margin: 12 });

export const LUJAIN_A: SignatureDesign = {
  demo: "clothes",
  variant: "a",
  template: { id: "clothes_signature_a", icon: "checkroom", fits: { types: ["store"], plain: true } },
  home: lujainHome,
  over: clothesOver(LOOK_A),
  tabs: clothesTabs,
  pages: clothesPages(LOOK_A),
  bar: LUJAIN_BAR,
  look: { header: signatureHeader(A, "glass"), background: A.page, dark_background: A.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    // Look A is the demo: its main colour the demo's (lib/demo/content.ts).
    appearance: { secondary_color: "#9B2C2C", font: "DM Sans", font_family: PLEX, dark_background: A.darkPage, dark_surface: A.darkSurface },
    screens: LUJAIN_SCREENS,
  },
};

export const NOUN_B: SignatureDesign = {
  demo: "clothes",
  variant: "b",
  template: { id: "clothes_signature_b", icon: "apparel", fits: { types: ["store"], plain: true } },
  home: nounHome,
  over: clothesOver(LOOK_B),
  tabs: clothesTabs,
  pages: clothesPages(LOOK_B),
  bar: NOUN_BAR,
  look: { header: signatureHeader(B, "glass"), background: B.page, dark_background: B.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    primary: B.fill,
    appearance: { secondary_color: "#0B0B0C", font: "Outfit", font_family: CHANGA, dark_background: B.darkPage, dark_surface: B.darkSurface },
    screens: NOUN_SCREENS,
  },
};

// ——— Every part of the two looks as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;

const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};

export const CLOTHES_SECTIONS: readonly SectionInfo[] = [
  // The category menu: every main category a row of cards, its "All" card first.
  { id: "cl_category_menu", icon: "menu_open", isNew: true, fits: STORE_PLAIN, make: one((ctx) => categoryMenuPage(ctx, LOOK_A).body.children!.find((n) => n.type === "categories")!) },
  { id: "cl_category_menu_label", icon: "view_list", isNew: true, fits: STORE_PLAIN, make: one((ctx) => categoryMenuPage(ctx, LOOK_B).body.children!.find((n) => n.type === "categories")!) },
  // The compact hero carousel, the next card peeking.
  { id: "cl_peek_hero", icon: "view_carousel", isNew: true, fits: STORE_PLAIN, make: one((ctx) => heroCarousel(ctx, LOOK_A, [["hero-trench", "clHeroKicker1", "clHeroTitle1"], ["black-dress", "clHeroKicker2", "clHeroTitle2"]], "clShopCollection")) },
  // The deal of the day: the shop's flash sale with its countdown, as dark cards.
  { id: "cl_deal", icon: "bolt", isNew: true, fits: STORE_PLAIN, make: one((ctx) => dealCard(ctx, LOOK_A, "carousel")) },
  // Shop the look: numbered spots on a photo, the pieces under it.
  { id: "cl_shop_look", icon: "checkroom", isNew: true, fits: STORE_PLAIN, make: one((ctx) => shopTheLook(ctx, LOOK_A, "look", [[62, 30], [52, 70], [30, 52]])) },
  // The size confidence card, opening the size guide.
  { id: "cl_fit", icon: "straighten", isNew: true, fits: STORE_PLAIN, make: one((ctx) => fitCard(ctx, LOOK_A)) },
  // The shop's size chart.
  { id: "cl_size_chart", icon: "table_chart", isNew: true, fits: STORE_PLAIN, make: one((ctx) => sizeGuidePage(ctx, LOOK_A).body.children!.find((n) => n.type === "size_chart")!) },
  // The collections as photo tiles, and B's numbered best sellers and ticker.
  { id: "cl_collections", icon: "dashboard", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "clCollections", { word: "clAllCollections", action: shop }), collectionTiles(ctx, LOOK_A, [["bridal-rack", "clBridalKicker", "clBridal"], ["camel-dress", "clDayKicker", "clDay"]])]) },
  { id: "cl_top_list", icon: "format_list_numbered", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_B, "clTop", { word: "clSeeAll", action: shop }, undefined, "clTopKicker"), topList(ctx)]) },
  { id: "cl_ticker", icon: "text_rotation_none", isNew: true, fits: STORE_PLAIN, make: one(ticker) },
];
