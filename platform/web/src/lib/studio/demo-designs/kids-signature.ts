import type { Action, LayoutTab, StudioEntry, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigPhoto, sigTexts, signatureBar, signatureHeader, type SignatureInk } from "./food-signature-parts";

/**
 * 209 Toota (توتة), Studio's kids' clothes type (lib/studio/shop-types.ts):
 * a Studio demo of the store kind and its two Signature looks, each a whole
 * store project (its home, its category menu and size guide, its shop,
 * cart and orders, its tabs, its floating bar, its sign-in screen and
 * account), built only from Studio's elements so every part is the
 * owner's to change, as the owner approved them on 23 November 2026 (a
 * real native phone app: a small header with the menu, a search pill, the
 * categories, a compact hero carousel of about 210 px with the next card
 * peeking, tight sections and a floating bar of five tabs).
 *
 * A · TOOTA, soft pastels: cream paper, terracotta, blush, butter, sage and
 * sky tiles, Baloo Bhaijaan 2; a warm cocoa night.
 * B · MINIMO, playful and bright: deep navy on warm white, numbered
 * sections, Readex Pro; a blue-black night.
 *
 * What a kids' clothes shop needs, each a reusable element: the category
 * menu (the `categories` element drawn as `rows`: every main category of
 * the shop a row of cards, its "All" card first, its sub-categories after
 * it), shopping by age (the size guide a tap away), the size finder (the
 * `size_finder` element: the child's age chosen from the shop's size chart,
 * the size that fits with its height, weight and chest), the worlds of
 * girls, boys and baby (each tile named as the shop's category, so it opens
 * it), the newborn gift boxes (wrapping and a card added in the cart, the
 * message written at checkout), little gifts under a price (`max_price`),
 * the ready-made sets, the shop's flash sale with its countdown, the best
 * loved, the shop's promises, and the size guide page (the `size_finder`
 * and `size_chart` elements). Nothing is made up: the lists, the
 * categories, the sale, the chart and the prices are the shop's own; the
 * owner's words are in [brackets] (the demo fills them,
 * lib/studio/demo-templates.ts).
 */

// ——— The two looks' colours and faces ———

/** A · TOOTA: cream paper, cocoa ink and terracotta by day; a warm cocoa night. */
export const TOOTA_INK: SignatureInk = {
  page: "#F7F2EC",
  darkPage: "#15110F",
  surface: "#FFFDF9",
  darkSurface: "#1F1916",
  ink: "#2D2420",
  darkInk: "#F4ECE6",
  muted: "#6B5D55",
  darkMuted: "#C7B9AF",
  line: "#EADFD3",
  darkLine: "#30271F",
  accent: "#A4503F",
  darkAccent: "#EFA08C",
  fill: "#A4503F",
  darkFill: "#B35C4B",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const A = TOOTA_INK;
const BALOO = "Baloo Bhaijaan 2";
/** A's pastel tiles (by day, by night): blush, butter, sage, sky and sand. */
const PASTELS = [
  { day: "#F5E2DA", night: "#33231F" },
  { day: "#F4EACB", night: "#302A1C" },
  { day: "#E2E8D8", night: "#232A20" },
  { day: "#DDE7ED", night: "#1E272C" },
  { day: "#EFE4D4", night: "#2D251F" },
] as const;
/** A's deep cocoa card (the size finder). */
const A_DEEP = { day: "#3A2B26", night: "#2A1F1B" };

/** B · MINIMO: deep navy ink on warm white; a blue-black night with a soft periwinkle. */
export const MINIMO_INK: SignatureInk = {
  page: "#F5F3EE",
  darkPage: "#0E1117",
  surface: "#FFFFFF",
  darkSurface: "#161A22",
  ink: "#161D2E",
  darkInk: "#EDEFF3",
  muted: "#4B5365",
  darkMuted: "#B6BCC8",
  line: "#E4E0D8",
  darkLine: "#252B36",
  accent: "#27457A",
  darkAccent: "#A9C0EE",
  fill: "#27457A",
  darkFill: "#3D62A8",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const B = MINIMO_INK;
const READEX = "Readex Pro";
/** B's navy card (the size finder) and its gold. */
const B_NAVY = { day: "#1A2B4C", night: "#18233C" };

/** Toota's photos (public/kids-photos, CC0 from StockSnap, credited in CREDITS.md). */
const P = (name: string) => `/kids-photos/${name}.jpg`;

const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
/** One of the look's own pages (the category menu, the size guide) where the whole look is made; where its parts are made alone (another store's page, a ready section) the shop. */
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));
/** The category menu's page and the size guide's (both looks have them). */
export const KIDS_MENU_PAGE = "menu";
export const KIDS_SIZE_PAGE = "size-guide";

/** The look's ink, its tint and its face. */
interface Look {
  k: SignatureInk;
  tint: { day: string; night: string };
  family: string;
  look: "a" | "b";
}
const LOOK_A: Look = { k: A, tint: { day: "#EFE6DB", night: "#2A221E" }, family: BALOO, look: "a" };
const LOOK_B: Look = { k: B, tint: { day: "#ECE7DE", night: "#1E232C" }, family: READEX, look: "b" };

// ——— What both looks are made of ———

const face = (l: Look, size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: l.family, size, weight: 700, line_height: 1.25, ...extra });

function say(ctx: SectionContext, l: Look, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, l.k, ctx.w(word), font, extra);
}

/** A section's title (B's numbered kicker over it, A's quieter line under it), a link at its end. */
function headOf(ctx: SectionContext, l: Look, title: SectionWord, link: { word: SectionWord; action: Action } | null, line?: SectionWord, kicker?: SectionWord, padding: StudioSides = sides(26, 16, 12, 16)): StudioNode {
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
          ...(kicker ? [say(ctx, l, kicker, { family: l.family, size: 11, weight: 600, letter_spacing: 1.6, uppercase: true }, { accent: true, max_lines: 1 })] : []),
          say(ctx, l, title, face(l, l.look === "a" ? 22 : 21, { weight: l.look === "a" ? 700 : 600 }), { max_lines: 2 }),
          ...(line ? [say(ctx, l, line, { family: l.family, size: 12.5 }, { muted: true, max_lines: 2 })] : []),
        ],
      },
      ...(link ? [say(ctx, l, link.word, { family: l.family, size: 13, weight: 600 }, { accent: true, max_lines: 1, action: link.action, name: ctx.w(link.word) })] : []),
    ],
  };
}

/** The search pill: the shop's search, a rounded field on the look's surface. */
function searchPill(ctx: SectionContext, l: Look, word: SectionWord, margin = sides(6, 16, 6, 16)): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "search",
    name: ctx.w(word),
    text: ctx.w(word),
    source: "products",
    radius: l.look === "a" ? 26 : 16,
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

/** The shop's main categories under the search: A's round photos, B's chips (each opens the shop on it). */
function categoryStrip(ctx: SectionContext, l: Look): StudioNode {
  return { id: idOf(ctx)(), type: "categories", name: ctx.w("kdCategories"), source: "products", ...(l.look === "a" ? { style: "circles" as const } : {}), color: l.k.ink, dark_color: l.k.darkInk, padding: sides(8, 12, 4, 12) };
}

/**
 * One hero card: A's photo under a soft cream wash with its words in cocoa
 * (cream by night too, as the design has it), B's under a deep shade in
 * white; its kicker, headline and button.
 */
function heroCard(ctx: SectionContext, l: Look, photo: string, kicker: SectionWord, title: SectionWord, button: SectionWord): StudioNode {
  const id = idOf(ctx);
  const soft = l.look === "a";
  const ink = soft ? "#2D2420" : "#FFFFFF";
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w(title),
    image_url: sigPhoto(ctx, P(photo)),
    height: 210,
    radius: soft ? 28 : 20,
    background: soft ? "#EFE6DB" : "#161D2E",
    scrim: soft ? { color: "#F7F2EC", from: 0, middle: 0.35, at: 40, to: 0.94 } : { color: "#0E1117", from: 0.05, middle: 0.2, at: 45, to: 0.8 },
    align: "end",
    padding: sides(16, 18, 16, 18),
    action: shop,
    children: [
      say(ctx, l, kicker, { family: l.family, size: 11.5, weight: 600, letter_spacing: soft ? 0 : 1.4, uppercase: !soft }, { color: soft ? "#A4503F" : "#FFFFFF", dark_color: soft ? "#A4503F" : "#FFFFFF", opacity: soft ? 1 : 0.9, max_lines: 1 }),
      say(ctx, l, title, face(l, soft ? 22 : 24, { weight: soft ? 700 : 600, line_height: 1.2 }), { color: ink, dark_color: ink, max_lines: 2, margin: sides(4, 0, 0, 0) }),
      {
        id: id(),
        type: "button",
        name: ctx.w(button),
        text: ctx.w(button),
        icon: "arrow_forward",
        icon_position: "end",
        width: "hug",
        height: 38,
        radius: soft ? 19 : 12,
        padding: sides(0, 16, 0, 16),
        self_align: "start",
        margin: sides(10, 0, 0, 0),
        ...(soft ? { background: "#A4503F", dark_background: "#A4503F", color: "#FFFFFF", dark_color: "#FFFFFF" } : { background: "#FFFFFF", dark_background: "#FFFFFF", color: "#161D2E", dark_color: "#161D2E", border_width: 0 }),
        font: { family: l.family, size: 13.5, weight: 700 },
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
    name: ctx.w("kdHeroName"),
    height: 210,
    per_view: 1.12,
    gap: 10,
    autoplay: true,
    interval_ms: 5000,
    dots: true,
    indicator: "dots",
    padding: sides(12, 16, 4, 16),
    children: cards.map(([photo, kicker, title]) => heroCard(ctx, l, photo, kicker, title, button)),
  };
}

/** A product card: its photo with the sale's share off, its name and its price (struck through before while on sale). */
function productCard(ctx: SectionContext, l: Look, width: number | "fill", height: number): StudioNode {
  const id = idOf(ctx);
  const soft = l.look === "a";
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
          { id: id(), type: "image", bind: "image", width, height, radius: soft ? 22 : 16, fit: "cover", background: l.tint.day, dark_background: l.tint.night },
          { id: id(), type: "text", bind: "sale", font: { size: 11, weight: 700 }, color: "#FFFFFF", dark_color: "#FFFFFF", background: soft ? "#A4503F" : "#C2513A", dark_background: soft ? "#B35C4B" : "#C2513A", radius: 10, padding: sides(3, 8, 3, 8), place: { x: 6, y: 5 } },
        ],
      },
      { id: id(), type: "text", bind: "title", max_lines: 2, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 13.5, weight: 600, line_height: 1.3 } },
      {
        id: id(),
        type: "row",
        gap: 6,
        cross: "center",
        children: [
          { id: id(), type: "text", bind: "price", max_lines: 1, color: soft ? l.k.ink : l.k.accent, dark_color: soft ? l.k.darkInk : l.k.darkAccent, font: { family: l.family, size: 14.5, weight: 700 } },
          { id: id(), type: "text", bind: "was_price", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 12 } },
        ],
      },
    ],
  };
}

/** The shop's newest pieces as a row of cards. */
function newIn(ctx: SectionContext, l: Look): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "items",
    name: ctx.w("kdNewIn"),
    source: "products",
    layout: "carousel",
    gap: 12,
    padding: sides(0, 16, 0, 16),
    query: { limit: 8, category_id: null, featured: false, sort: "newest", ids: [] },
    card: productCard(ctx, l, 156, 196),
  };
}

/** The shop's flash sale (the `flash_sale` element: the sale ending soonest, its pieces at was and now prices, a live countdown and the stock left; left out while none is on). */
function dealCard(ctx: SectionContext, l: Look, look: "banner" | "carousel"): StudioNode {
  const t = sigTexts(ctx, { text: "kdDeal" });
  return {
    id: idOf(ctx)(),
    type: "flash_sale",
    name: ctx.w("kdDeal"),
    text: t.text,
    translations: t.translations,
    flash_sale: { look, limit: 6, countdown: true, stock_bar: true, accent: l.look === "a" ? "#A4503F" : "#C2513A" },
    radius: 24,
    margin: sides(24, 16, 4, 16),
  };
}

// ——— Shopping by age ———

/** The ages (A's five, B's six): the number, its unit, and A's sizes or B's stage. */
const AGES_A: readonly [SectionWord, SectionWord, SectionWord, string][] = [
  ["kdAge0", "kdMonths", "kdAgeSize0", "child_care"],
  ["kdAge6", "kdMonthsMany", "kdAgeSize6", "bed"],
  ["kdAge2", "kdYears", "kdAgeSize2", "toys"],
  ["kdAge4", "kdYears", "kdAgeSize4", "wb_sunny"],
  ["kdAge8", "kdYearsMany", "kdAgeSize8", "school"],
];
const AGES_B: readonly [SectionWord, SectionWord, SectionWord][] = [
  ["kdAge0", "kdMonths", "kdStage0"],
  ["kdAge6", "kdMonthsMany", "kdStage6"],
  ["kdAge2", "kdYears", "kdStage2"],
  ["kdAge46", "kdYears", "kdStage4"],
  ["kdAge69", "kdYears", "kdStage69"],
  ["kdAge912", "kdYearsMany", "kdStage912"],
];

/** A's ages: pastel tiles in a row that slides, each its icon, its ages, their unit and the sizes; each opens the shop. */
function ageTiles(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  const l = LOOK_A;
  const tile = ([age, unit, size, icon]: (typeof AGES_A)[number], i: number): StudioNode => ({
    id: id(),
    type: "column",
    name: `${ctx.w(age)} ${ctx.w(unit)}`,
    width: 116,
    height: 132,
    gap: 2,
    radius: 26,
    padding: sides(12, 14, 12, 14),
    background: PASTELS[i % PASTELS.length]!.day,
    dark_background: PASTELS[i % PASTELS.length]!.night,
    action: shop,
    children: [
      { id: id(), type: "icon", icon, icon_size: 18, color: A.accent, dark_color: A.darkAccent, background: "#FFFFFF", dark_background: "#15110F", radius: 99, padding: sides(6, 6, 6, 6), self_align: "start" },
      say(ctx, l, age, face(l, 26, { weight: 700, line_height: 1.1 }), { margin: sides(8, 0, 0, 0), max_lines: 1 }),
      say(ctx, l, unit, { family: BALOO, size: 13, weight: 500 }, { max_lines: 1 }),
      say(ctx, l, size, { family: BALOO, size: 11.5 }, { muted: true, max_lines: 1 }),
    ],
  });
  return [
    headOf(ctx, l, "kdByAge", { word: "kdSizeGuide", action: ownPage(ctx, KIDS_SIZE_PAGE) }, "kdByAgeLine"),
    { id: id(), type: "row", name: ctx.w("kdByAge"), gap: 10, scroll: true, padding: sides(0, 16, 0, 16), children: AGES_A.map(tile) },
  ];
}

/** B's ages: a grid of three by two, the toddlers' lit in navy; each opens the shop. */
function ageGrid(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  const l = LOOK_B;
  const tile = ([age, unit, stage]: (typeof AGES_B)[number], i: number): StudioNode => {
    const lit = i === 2;
    const ink = lit ? { color: "#FFFFFF", dark_color: "#FFFFFF" } : {};
    return {
      id: id(),
      type: "column",
      name: `${ctx.w(age)} ${ctx.w(unit)}`,
      height: 96,
      gap: 1,
      radius: 16,
      padding: sides(12, 12, 10, 12),
      action: shop,
      ...(lit ? { background: B.fill, dark_background: B.darkFill } : { background: B.surface, dark_background: B.darkSurface, border_color: B.line, dark_border_color: B.darkLine, border_width: 1 }),
      children: [
        say(ctx, l, age, face(l, 22, { weight: 500, line_height: 1.1 }), { accent: !lit, ...ink, max_lines: 1 }),
        say(ctx, l, unit, { family: READEX, size: 12.5, weight: 600 }, { ...ink, max_lines: 1 }),
        say(ctx, l, stage, { family: READEX, size: 11 }, { muted: !lit, ...ink, ...(lit ? { opacity: 0.8 } : {}), max_lines: 1, margin: sides(6, 0, 0, 0) }),
      ],
    };
  };
  return [
    headOf(ctx, l, "kdByAge", { word: "kdSizeGuide", action: ownPage(ctx, KIDS_SIZE_PAGE) }, undefined, "kdByAgeKicker"),
    { id: id(), type: "grid", name: ctx.w("kdByAge"), columns: 3, gap: 8, padding: sides(0, 16, 0, 16), children: AGES_B.map(tile) },
  ];
}

// ——— Girls, boys and baby ———

/** A photo tile named as one of the shop's main categories (its words the category's name, so it opens it), its line under it. */
function worldTile(ctx: SectionContext, l: Look, photo: string, title: SectionWord, line: SectionWord, height: number): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "photo_hero",
    name: ctx.w(title),
    image_url: sigPhoto(ctx, P(photo)),
    width: "fill",
    height,
    radius: l.look === "a" ? 24 : 18,
    background: "#2D2420",
    scrim: { color: "#1A1210", from: 0, middle: 0.12, at: 50, to: 0.72 },
    align: "end",
    padding: sides(14, 14, 14, 14),
    action: shop,
    children: [
      say(ctx, l, title, face(l, 19, { weight: 700 }), { color: "#FFFFFF", dark_color: "#FFFFFF", max_lines: 1 }),
      say(ctx, l, line, { family: l.family, size: 11.5, weight: 500 }, { color: "#FFFFFF", dark_color: "#FFFFFF", opacity: 0.88, max_lines: 1 }),
    ],
  };
}

/** A's worlds: girls and boys side by side, the babies' wide under them. */
function worlds(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  const l = LOOK_A;
  return [
    headOf(ctx, l, "kdWorlds", null, "kdWorldsLine"),
    {
      id: id(),
      type: "column",
      name: ctx.w("kdWorlds"),
      gap: 10,
      padding: sides(0, 16, 0, 16),
      children: [
        { id: id(), type: "row", gap: 10, children: [worldTile(ctx, l, "tiered-dress", "kdGirls", "kdGirlsLine", 200), worldTile(ctx, l, "denim-jacket", "kdBoys", "kdBoysLine", 200)] },
        worldTile(ctx, l, "newborn-knit", "kdBaby", "kdBabyLine", 128),
      ],
    },
  ];
}

/** B's "who are you shopping for": cards that slide, each named as a main category of the shop (so it opens it). */
function whoCards(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  const l = LOOK_B;
  const card = (photo: string, title: SectionWord, line: SectionWord): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(title),
    width: 150,
    gap: 4,
    action: shop,
    children: [
      { id: id(), type: "image", image_url: sigPhoto(ctx, P(photo)), width: 150, height: 184, radius: 18, fit: "cover", background: l.tint.day, dark_background: l.tint.night },
      { id: id(), type: "row", gap: 4, cross: "center", margin: sides(4, 0, 0, 0), children: [say(ctx, l, title, face(l, 15, { weight: 600 }), { max_lines: 1 }), { id: id(), type: "icon", icon: "arrow_forward", icon_size: 16, color: B.accent, dark_color: B.darkAccent }] },
      say(ctx, l, line, { family: READEX, size: 11.5 }, { muted: true, max_lines: 1 }),
    ],
  });
  return [
    headOf(ctx, l, "kdWho", null, undefined, "kdWhoKicker"),
    {
      id: id(),
      type: "row",
      name: ctx.w("kdWho"),
      gap: 10,
      scroll: true,
      padding: sides(0, 16, 0, 16),
      children: [card("tiered-dress", "kdGirls", "kdGirlsLine"), card("denim-jacket", "kdBoys", "kdBoysLine"), card("newborn-knit", "kdBaby", "kdBabyLine"), card("sparkle-sneakers", "kdShoes", "kdShoesLine")],
    },
  ];
}

// ——— Gifts ———

/** A's gift sets: boxes that slide, each its photo, its name, what is in it and the wrapping and card; the link opens the shop's newborn gifts. */
function giftSets(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  const l = LOOK_A;
  const box = (photo: string, title: SectionWord, inside: SectionWord, tag: SectionWord | null): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(title),
    width: 236,
    gap: 6,
    radius: 26,
    padding: sides(8, 8, 14, 8),
    background: A.surface,
    dark_background: A.darkSurface,
    border_color: A.line,
    dark_border_color: A.darkLine,
    border_width: 1,
    action: shop,
    children: [
      {
        id: id(),
        type: "stack",
        height: 150,
        children: [
          { id: id(), type: "image", image_url: sigPhoto(ctx, P(photo)), width: "fill", height: 150, radius: 20, fit: "cover", background: l.tint.day, dark_background: l.tint.night },
          ...(tag ? [{ ...say(ctx, l, tag, { family: BALOO, size: 11, weight: 600 }, { color: "#2D2420", dark_color: "#2D2420", background: "#FFFDF9", dark_background: "#FFFDF9", radius: 10, padding: sides(2, 9, 2, 9), max_lines: 1 }), place: { x: 6, y: 6 } }] : []),
        ],
      },
      say(ctx, l, title, face(l, 16, { weight: 700 }), { max_lines: 1, padding: sides(4, 6, 0, 6) }),
      say(ctx, l, inside, { family: BALOO, size: 12 }, { muted: true, max_lines: 2, padding: sides(0, 6, 0, 6) }),
      {
        id: id(),
        type: "row",
        gap: 6,
        cross: "center",
        padding: sides(4, 6, 0, 6),
        children: [
          { id: id(), type: "icon", icon: "redeem", icon_size: 16, color: A.accent, dark_color: A.darkAccent },
          say(ctx, l, "kdWrapCard", { family: BALOO, size: 12, weight: 600 }, { accent: true, max_lines: 1 }),
        ],
      },
    ],
  });
  return [
    headOf(ctx, l, "kdGifts", { word: "kdNewbornGifts", action: shop }, "kdGiftsLine"),
    {
      id: id(),
      type: "row",
      name: ctx.w("kdGifts"),
      gap: 12,
      scroll: true,
      padding: sides(0, 16, 0, 16),
      children: [box("gift-kraft", "kdGiftBox1", "kdGiftBox1Line", "kdMostWanted"), box("gift-pink", "kdGiftBox2", "kdGiftBox2Line", null), box("mittens", "kdGiftBox3", "kdGiftBox3Line", null)],
    },
  ];
}

/** B's newborn box: its photo beside what is in it, and a button named as the shop's newborn gifts (so it opens them). */
function giftBox(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  const l = LOOK_B;
  const check = (word: SectionWord): StudioNode => ({
    id: id(),
    type: "row",
    gap: 6,
    cross: "center",
    children: [{ id: id(), type: "icon", icon: "check", icon_size: 16, color: B.accent, dark_color: B.darkAccent }, say(ctx, l, word, { family: READEX, size: 12.5 }, { width: "fill", max_lines: 1 })],
  });
  return [
    headOf(ctx, l, "kdGiftsB", { word: "kdNewbornGifts", action: shop }, undefined, "kdGiftsKicker"),
    {
      id: id(),
      type: "row",
      name: ctx.w("kdGiftBox1"),
      gap: 0,
      radius: 22,
      margin: sides(0, 16, 0, 16),
      background: B.surface,
      dark_background: B.darkSurface,
      border_color: B.line,
      dark_border_color: B.darkLine,
      border_width: 1,
      children: [
        { id: id(), type: "image", image_url: sigPhoto(ctx, P("gift-pink")), width: 140, height: 212, fit: "cover", background: l.tint.day, dark_background: l.tint.night, corners: { top_start: 22, bottom_start: 22, top_end: 0, bottom_end: 0 } },
        {
          id: id(),
          type: "column",
          width: "fill",
          gap: 6,
          padding: sides(14, 14, 14, 14),
          children: [
            say(ctx, l, "kdBoxKicker", { family: READEX, size: 10.5, weight: 600, letter_spacing: 1.6, uppercase: true }, { accent: true, max_lines: 1 }),
            say(ctx, l, "kdGiftBox1", face(l, 17, { weight: 600 }), { max_lines: 2 }),
            check("kdBoxIn1"),
            check("kdBoxIn2"),
            check("kdBoxIn3"),
            {
              id: id(),
              type: "button",
              name: ctx.w("kdNewbornGifts"),
              text: ctx.w("kdNewbornGifts"),
              icon: "arrow_forward",
              icon_position: "end",
              width: "hug",
              height: 36,
              radius: 12,
              padding: sides(0, 14, 0, 14),
              self_align: "start",
              margin: sides(6, 0, 0, 0),
              background: B.fill,
              dark_background: B.darkFill,
              color: "#FFFFFF",
              dark_color: "#FFFFFF",
              font: { family: READEX, size: 13, weight: 600 },
              motion: { press: "shrink" },
              action: shop,
            },
          ],
        },
      ],
    },
  ];
}

/** Little gifts under a price: the shop's pieces at 500 or under (in its own currency), the best loved first. */
function giftsUnder(ctx: SectionContext, l: Look): StudioNode[] {
  return [
    headOf(ctx, l, "kdUnder", { word: "kdSeeAll", action: shop }, l.look === "a" ? "kdUnderLine" : undefined, undefined, sides(18, 16, 10, 16)),
    {
      id: idOf(ctx)(),
      type: "items",
      name: ctx.w("kdUnder"),
      source: "products",
      layout: "carousel",
      gap: 12,
      padding: sides(0, 16, 0, 16),
      query: { limit: 8, category_id: null, featured: false, sort: "popular", ids: [], max_price: 500 },
      card: productCard(ctx, l, 132, 160),
    },
  ];
}

// ——— School, occasions and the ready-made sets ———

function photoTile(ctx: SectionContext, l: Look, photo: string, title: SectionWord, line: SectionWord, height: number, extra: Partial<StudioNode> = {}): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "photo_hero",
    name: ctx.w(title),
    image_url: sigPhoto(ctx, P(photo)),
    width: "fill",
    height,
    radius: l.look === "a" ? 22 : 18,
    background: "#2D2420",
    scrim: { color: "#120D0B", from: 0, middle: 0.1, at: 50, to: 0.72 },
    align: "end",
    padding: sides(12, 12, 12, 12),
    action: shop,
    ...extra,
    children: [
      ...(extra.children ?? []),
      say(ctx, l, title, face(l, 16.5, { weight: 700 }), { color: "#FFFFFF", dark_color: "#FFFFFF", max_lines: 2 }),
      say(ctx, l, line, { family: l.family, size: 11.5 }, { color: "#FFFFFF", dark_color: "#FFFFFF", opacity: 0.88, max_lines: 1 }),
    ],
  };
}

/** A's bento: back to school tall, Eid looks and the ready-made sets (named as the shop's category, so it opens it) beside it. */
function occasions(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  const l = LOOK_A;
  return [
    headOf(ctx, l, "kdOccasions", { word: "kdSeeAll", action: shop }, "kdOccasionsLine"),
    {
      id: id(),
      type: "row",
      name: ctx.w("kdOccasions"),
      gap: 10,
      padding: sides(0, 16, 0, 16),
      children: [
        photoTile(ctx, l, "girl-desk", "kdSchool", "kdSchoolLine", 250),
        { id: id(), type: "column", width: "fill", gap: 10, children: [photoTile(ctx, l, "white-dresses", "kdEid", "kdEidLine", 120), photoTile(ctx, l, "summer-outfit", "kdSets", "kdSetsLine", 120)] },
      ],
    },
  ];
}

/** B's occasions: numbered photo cards that slide (the ready-made sets among them, named as the shop's category). */
function occasionCards(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  const l = LOOK_B;
  const card = (photo: string, n: string, title: SectionWord, line: SectionWord): StudioNode =>
    photoTile(ctx, l, photo, title, line, 236, {
      width: 172,
      children: [{ id: id(), type: "text", text: n, font: { family: READEX, size: 12, weight: 600 }, color: "#FFFFFF", dark_color: "#FFFFFF", opacity: 0.85, place: { x: 8, y: 6 } }],
    });
  return [
    headOf(ctx, l, "kdOccasions", { word: "kdSeeAll", action: shop }, undefined, "kdOccasionsKicker"),
    {
      id: id(),
      type: "row",
      name: ctx.w("kdOccasions"),
      gap: 10,
      scroll: true,
      padding: sides(0, 16, 0, 16),
      children: [card("white-dresses", "01", "kdEid", "kdEidLine"), card("girls-coats", "02", "kdSchool", "kdSchoolLine"), card("cupcake", "03", "kdParty", "kdPartyLine"), card("summer-outfit", "04", "kdSets", "kdSetsLine")],
    },
  ];
}

// ——— The size finder ———

/**
 * The size finder (the `size_finder` element): the child's age chosen from
 * the shop's size chart (Store › Delivery & offers › Clothes, its first
 * column the age), the size that fits with its height, weight and chest,
 * and a button to the shop; A's on a deep cocoa card, B's on navy.
 */
function sizeFinder(ctx: SectionContext, l: Look, margin: StudioSides = sides(26, 16, 4, 16)): StudioNode {
  const t = sigTexts(ctx, { text: "kdFinderTitle", title: "kdFinderButton" });
  const card = l.look === "a" ? A_DEEP : B_NAVY;
  return {
    id: idOf(ctx)(),
    type: "size_finder",
    name: ctx.w("kdFinderName"),
    text: t.text,
    title: t.title,
    translations: t.translations,
    action: shop,
    background: card.day,
    dark_background: card.night,
    color: "#FFFFFF",
    dark_color: "#FFFFFF",
    border_color: l.look === "a" ? "#B35C4B" : "#B7893A",
    dark_border_color: l.look === "a" ? "#EFA08C" : "#D9AE62",
    font: { family: l.family, size: 20, weight: l.look === "a" ? 700 : 600 },
    radius: l.look === "a" ? 28 : 22,
    padding: sides(20, 18, 18, 18),
    margin,
  };
}

// ——— The best loved, the look of the week and the shop's promises ———

/** A's best loved this month: the most bought, two by two. */
function loved(ctx: SectionContext): StudioNode[] {
  const l = LOOK_A;
  return [
    headOf(ctx, l, "kdLoved", { word: "kdSeeAll", action: shop }, "kdLovedLine"),
    { id: idOf(ctx)(), type: "items", name: ctx.w("kdLoved"), source: "products", layout: "grid", columns: 2, gap: 12, padding: sides(0, 16, 0, 16), query: { limit: 4, category_id: null, featured: false, sort: "popular", ids: [] }, card: productCard(ctx, l, "fill", 200) },
  ];
}

/** B's look of the week: a photo with a numbered spot on each piece (each opens it), the pieces in a list under it. */
function lookOfWeek(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  const l = LOOK_B;
  const spots: readonly [number, number][] = [
    [60, 40],
    [56, 22],
    [64, 72],
  ];
  const ids = (ctx.entries ?? []).slice(0, spots.length).map((e) => e.id);
  const spot = ([x, y]: readonly [number, number], i: number): StudioNode => {
    const entry = ctx.entries?.[i];
    return {
      id: id(),
      type: "row",
      name: `${ctx.w("kdLook")} ${i + 1}`,
      width: 30,
      height: 30,
      radius: 15,
      align: "center",
      cross: "center",
      background: "#FFFFFF",
      dark_background: "#FFFFFF",
      border_color: B.fill,
      border_width: 2,
      shadow: "medium",
      place: { x, y },
      motion: { loop: "pulse" },
      action: entry ? { type: "item", item: { source: "products", id: entry.id } } : shop,
      children: [{ id: id(), type: "text", text: String(i + 1), font: { size: 12.5, weight: 700 }, color: "#161D2E", dark_color: "#161D2E" }],
    };
  };
  return [
    headOf(ctx, l, "kdLook", { word: "kdMoreLooks", action: shop }, undefined, "kdLookKicker"),
    {
      id: id(),
      type: "column",
      name: ctx.w("kdLook"),
      gap: 12,
      radius: 22,
      padding: sides(10, 10, 12, 10),
      margin: sides(0, 16, 0, 16),
      background: B.surface,
      dark_background: B.darkSurface,
      border_color: B.line,
      dark_border_color: B.darkLine,
      border_width: 1,
      children: [
        { id: id(), type: "stack", height: 300, radius: 16, background: l.tint.day, dark_background: l.tint.night, ...(sigPhoto(ctx, P("plaid-jacket")) ? { image_background_url: sigPhoto(ctx, P("plaid-jacket")) } : {}), children: spots.map(spot) },
        say(ctx, l, "kdLookName", face(l, 16, { weight: 600 }), { max_lines: 2 }),
        {
          id: id(),
          type: "items",
          name: ctx.w("kdLookPieces"),
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
                  { id: id(), type: "text", bind: "title", max_lines: 1, color: B.ink, dark_color: B.darkInk, font: { family: READEX, size: 13.5, weight: 600 } },
                  { id: id(), type: "text", bind: "price", max_lines: 1, color: B.accent, dark_color: B.darkAccent, font: { family: READEX, size: 13.5, weight: 700 } },
                ],
              },
              { id: id(), type: "icon", icon: "arrow_forward", icon_size: 20, color: B.ink, dark_color: B.darkInk },
            ],
          },
        },
      ],
    },
  ];
}

const PROMISES: readonly [string, SectionWord, SectionWord][] = [
  ["spa", "kdPromise1", "kdPromise1Line"],
  ["verified_user", "kdPromise2", "kdPromise2Line"],
  ["sync", "kdPromise3", "kdPromise3Line"],
];

/** A's promises: three soft cards, each its icon in a blush circle, its word and its line. */
function promises(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const l = LOOK_A;
  return {
    id: id(),
    type: "row",
    name: ctx.w("kdPromises"),
    gap: 8,
    padding: sides(26, 16, 4, 16),
    children: PROMISES.map(([icon, word, line]) => ({
      id: id(),
      type: "column" as const,
      name: ctx.w(word),
      width: "fill" as const,
      gap: 4,
      cross: "center" as const,
      radius: 22,
      padding: sides(14, 8, 14, 8),
      background: A.surface,
      dark_background: A.darkSurface,
      border_color: A.line,
      dark_border_color: A.darkLine,
      border_width: 1,
      children: [
        { id: id(), type: "icon" as const, icon, icon_size: 20, color: A.accent, dark_color: A.darkAccent, background: "#F6E3DC", dark_background: "#3A231D", radius: 99, padding: sides(9, 9, 9, 9) },
        say(ctx, l, word, { family: BALOO, size: 13.5, weight: 700 }, { text_align: "center", max_lines: 1, margin: sides(4, 0, 0, 0) }),
        say(ctx, l, line, { family: BALOO, size: 11 }, { muted: true, text_align: "center", max_lines: 3 }),
      ],
    })),
  };
}

/** B's values: four in a row between fine lines, each its icon and its word. */
function values(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const l = LOOK_B;
  const one = (icon: string, word: SectionWord): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    gap: 6,
    cross: "center",
    children: [{ id: id(), type: "icon", icon, icon_size: 22, color: B.accent, dark_color: B.darkAccent }, say(ctx, l, word, { family: READEX, size: 11.5, weight: 600 }, { text_align: "center", max_lines: 2 })],
  });
  return {
    id: id(),
    type: "row",
    name: ctx.w("kdPromises"),
    gap: 6,
    padding: sides(16, 12, 16, 12),
    margin: sides(26, 16, 4, 16),
    border_color: B.line,
    dark_border_color: B.darkLine,
    border_width: 1,
    radius: 18,
    children: [one("spa", "kdPromise1"), one("verified_user", "kdValueSafe"), one("sync", "kdPromise3"), one("payments", "kdValueCash")],
  };
}

/** The home's header: the wordmark at its start, the menu (the category menu) and the bell at its end. */
function homeHeader(ctx: SectionContext, l: Look): StudioPage["header"] {
  const t = sigTexts(ctx, { title: "kdWordmark" });
  return { type: "logo_actions", title: t.title, translations: t.translations, buttons: ["menu", "notifications"], menu_page: KIDS_MENU_PAGE, background: l.k.page, dark_background: l.k.darkPage, color: l.k.ink, dark_color: l.k.darkInk };
}

// ——— A · TOOTA ———

export function tootaHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const l = LOOK_A;
  return {
    header: homeHeader(ctx, l),
    background: A.page,
    dark_background: A.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 100, 0),
      children: [
        searchPill(ctx, l, "kdSearch"),
        categoryStrip(ctx, l),
        heroCarousel(
          ctx,
          l,
          [
            ["baby-flatlay", "kdHeroKicker1", "kdHeroTitle1"],
            ["girls-coats", "kdHeroKicker2", "kdHeroTitle2"],
            ["knit-hat-green", "kdHeroKicker3", "kdHeroTitle3"],
          ],
          "kdShopNow",
        ),
        ...ageTiles(ctx),
        headOf(ctx, l, "kdNewIn", { word: "kdSeeAll", action: shop }, "kdNewInLine"),
        newIn(ctx, l),
        ...worlds(ctx),
        ...giftSets(ctx),
        ...occasions(ctx),
        dealCard(ctx, l, "carousel"),
        sizeFinder(ctx, l),
        ...loved(ctx),
        promises(ctx),
      ],
    },
  };
}

// ——— B · MINIMO ———

export function minimoHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const l = LOOK_B;
  return {
    header: homeHeader(ctx, l),
    background: B.page,
    dark_background: B.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 100, 0),
      children: [
        searchPill(ctx, l, "kdSearchB"),
        categoryStrip(ctx, l),
        heroCarousel(
          ctx,
          l,
          [
            ["knit-hat-green", "kdHeroKickerB1", "kdHeroTitleB1"],
            ["yellow-raincoat", "kdHeroKickerB2", "kdHeroTitleB2"],
            ["plaid-jacket", "kdHeroKickerB3", "kdHeroTitleB3"],
          ],
          "kdShop",
        ),
        ...ageGrid(ctx),
        headOf(ctx, l, "kdNewWeek", { word: "kdSeeAll", action: shop }, undefined, "kdNewKicker"),
        newIn(ctx, l),
        ...lookOfWeek(ctx),
        ...whoCards(ctx),
        ...giftBox(ctx),
        ...giftsUnder(ctx, l),
        ...occasionCards(ctx),
        dealCard(ctx, l, "banner"),
        sizeFinder(ctx, l),
        values(ctx),
      ],
    },
  };
}

// ——— The pages after the home (both looks) ———

/**
 * The category menu (the header's menu button opens it): the search on top,
 * quick ways in (B's ages too), every main category of the shop a row of
 * cards (its "All" card, then its sub-categories), then the account, the
 * orders, the language and how to reach the shop.
 */
export function kidsMenuPage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "kdWordmark" });
  const quick = (word: SectionWord, icon: string, lit: boolean, action: Action): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(word),
    height: 42,
    radius: l.look === "a" ? 21 : 14,
    gap: 7,
    cross: "center",
    padding: sides(0, 16, 0, 14),
    action,
    ...(lit ? { background: l.k.fill, dark_background: l.k.darkFill } : { background: l.k.surface, dark_background: l.k.darkSurface, border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1 }),
    children: [
      { id: id(), type: "icon", icon, icon_size: 18, color: lit ? l.k.onFill : l.k.accent, dark_color: lit ? l.k.darkOnFill : l.k.darkAccent },
      { id: id(), type: "text", text: ctx.w(word), max_lines: 1, font: { family: l.family, size: 13.5, weight: 600 }, color: lit ? l.k.onFill : l.k.ink, dark_color: lit ? l.k.darkOnFill : l.k.darkInk },
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
      { id: id(), type: "icon", icon, icon_size: 22, color: l.k.accent, dark_color: l.k.darkAccent },
      { id: id(), type: "text", text: ctx.w(word), max_lines: 1, text_align: "center", font: { family: l.family, size: 12.5, weight: 600 }, color: l.k.ink, dark_color: l.k.darkInk },
    ],
  });
  const size = ownPage(ctx, KIDS_SIZE_PAGE);
  const ages: StudioNode[] =
    l.look === "b"
      ? [
          {
            id: id(),
            type: "column",
            name: ctx.w("kdByAge"),
            gap: 8,
            radius: 18,
            padding: sides(12, 12, 12, 12),
            margin: sides(4, 16, 6, 16),
            background: B.surface,
            dark_background: B.darkSurface,
            border_color: B.line,
            dark_border_color: B.darkLine,
            border_width: 1,
            children: [
              say(ctx, l, "kdByAge", { family: READEX, size: 13, weight: 600 }, { muted: true, max_lines: 1 }),
              {
                id: id(),
                type: "row",
                gap: 6,
                children: AGES_B.map(([age, unit]) => ({
                  id: id(),
                  type: "column" as const,
                  name: `${ctx.w(age)} ${ctx.w(unit)}`,
                  width: "fill" as const,
                  gap: 0,
                  cross: "center" as const,
                  radius: 10,
                  padding: sides(6, 2, 6, 2),
                  background: B.page,
                  dark_background: B.darkPage,
                  action: shop,
                  children: [say(ctx, l, age, { family: READEX, size: 13, weight: 600 }, { accent: true, max_lines: 1 }), say(ctx, l, unit, { family: READEX, size: 10 }, { muted: true, max_lines: 1 })],
                })),
              },
            ],
          },
        ]
      : [];
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...signatureHeader(l.k, "glass") },
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        searchPill(ctx, l, "kdSearchAll", sides(6, 16, 4, 16)),
        {
          id: id(),
          type: "row",
          name: ctx.w("kdQuick"),
          gap: 8,
          scroll: true,
          padding: sides(8, 16, 8, 16),
          children: [quick("kdNewIn", "auto_awesome", true, shop), quick("kdByAgeShort", "cake", false, size), quick("kdOffers", "percent", false, shop), quick("kdSizeGuide", "straighten", false, size)],
        },
        ...ages,
        {
          id: id(),
          type: "categories",
          name: ctx.w("kdCategoryMenu"),
          source: "products",
          style: "rows",
          category_menu: { look: l.look === "a" ? "lead" : "label", radius: l.look === "a" ? 24 : 16, ...(l.look === "b" ? { numbers: true } : {}) },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          padding: sides(6, 0, 6, 0),
        },
        { id: id(), type: "divider", height: 1, background: l.k.line, dark_background: l.k.darkLine, margin: sides(14, 16, 14, 16) },
        {
          id: id(),
          type: "row",
          name: ctx.w("kdMenuAccount"),
          gap: 8,
          padding: sides(0, 16, 0, 16),
          children: [tile("kdAccount", "person", screen("account")), tile("kdOrders", "package_2", screen("orders")), tile("kdLanguage", "language", screen("settings"))],
        },
        {
          id: id(),
          type: "row",
          name: ctx.w("kdContact"),
          gap: 12,
          cross: "center",
          radius: 20,
          padding: sides(14, 16, 14, 16),
          margin: sides(10, 16, 0, 16),
          background: l.tint.day,
          dark_background: l.tint.night,
          action: screen("account"),
          children: [
            { id: id(), type: "icon", icon: "support_agent", icon_size: 22, color: l.k.accent, dark_color: l.k.darkAccent },
            { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, l, "kdContact", { family: l.family, size: 14, weight: 700 }), say(ctx, l, "kdContactLine", { family: l.family, size: 12 }, { muted: true, max_lines: 2 })] },
            { id: id(), type: "icon", icon: "chat", icon_size: 20, color: l.k.ink, dark_color: l.k.darkInk },
          ],
        },
      ],
    },
  };
}

/** The size guide: the size finder by age, the shop's size chart (the `size_chart` element) and how to measure a child. */
export function kidsSizeGuidePage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "kdSizeGuide" });
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
        { ...say(ctx, l, "kdFitText", { family: l.family, size: 14, line_height: 1.5 }, { muted: true }), padding: sides(8, 16, 4, 16) },
        sizeFinder(ctx, l, sides(12, 16, 4, 16)),
        headOf(ctx, l, "kdSizeChart", null, "kdSizeChartLine"),
        {
          id: id(),
          type: "size_chart",
          name: ctx.w("kdSizeChart"),
          text: ctx.w("kdSizeChart"),
          color: l.k.ink,
          dark_color: l.k.darkInk,
          background: l.k.surface,
          dark_background: l.k.darkSurface,
          border_color: l.k.line,
          dark_border_color: l.k.darkLine,
          border_width: 1,
          radius: 20,
          padding: sides(14, 14, 14, 14),
          margin: sides(0, 16, 4, 16),
        },
        headOf(ctx, l, "kdMeasure", null),
        {
          id: id(),
          type: "timeline",
          name: ctx.w("kdMeasure"),
          timeline: { style: "vertical" },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          background: l.k.surface,
          dark_background: l.k.darkSurface,
          radius: 20,
          padding: sides(14, 14, 14, 14),
          margin: sides(0, 16, 0, 16),
          entries: [step("kdHeight", "kdHeightText"), step("kdChest", "kdChestText"), step("kdBetween", "kdBetweenText")],
        },
      ],
    },
  };
}

/** Over the shop: its categories as chips, and a banner of the ready-made sets. */
function shopTop(ctx: SectionContext, l: Look): StudioNode[] {
  return [
    { id: idOf(ctx)(), type: "categories", name: ctx.w("kdCategories"), source: "products", padding: sides(4, 12, 4, 12) },
    { ...heroCard(ctx, l, l.look === "a" ? "summer-outfit" : "plaid-jacket", "kdEditKicker", "kdEditTitle", "kdShopSets"), height: 160, margin: sides(6, 16, 6, 16) },
  ];
}

/** Over the cart: the shop's code, the gift wrapping and card for a gift, and its exchanges. */
function cartTop(ctx: SectionContext, l: Look): StudioNode[] {
  const id = idOf(ctx);
  const note = (icon: string, word: SectionWord): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(word),
    gap: 12,
    cross: "center",
    radius: 18,
    padding: sides(12, 14, 12, 14),
    margin: sides(8, 16, 4, 16),
    background: l.tint.day,
    dark_background: l.tint.night,
    children: [{ id: id(), type: "icon", icon, icon_size: 22, color: l.k.accent, dark_color: l.k.darkAccent }, say(ctx, l, word, { family: l.family, size: 13, weight: 600, line_height: 1.4 }, { width: "fill", max_lines: 3 })],
  });
  return [
    { id: id(), type: "coupon", name: ctx.w("kdCoupon"), code: KIDS_COUPON_CODE, coupon: { look: l.look === "a" ? "ticket" : "glass", bind: "public" }, radius: 18, color: l.k.fill, margin: sides(10, 16, 4, 16) },
    note("redeem", "kdGiftNote"),
    note("sync", "kdExchangeNote"),
  ];
}

/** Over the orders: how an order travels (the person's newest order on its way, else the first step lit). */
function ordersTop(ctx: SectionContext, l: Look): StudioNode[] {
  const step = (title: SectionWord, text: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    headOf(ctx, l, "kdTrack", null, undefined, undefined, sides(10, 16, 6, 16)),
    {
      id: idOf(ctx)(),
      type: "timeline",
      name: ctx.w("kdTrack"),
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
      entries: [step("kdTrack1", "kdTrack1Text", true), step("kdTrack2", "kdTrack2Text"), step("kdTrack3", "kdTrack3Text"), step("kdTrack4", "kdTrack4Text")],
    },
  ];
}

/** The demo's code shown in the app (lib/demo/kids.ts makes it). */
export const KIDS_COUPON_CODE = "TOOTA10";

function kidsOver(l: Look) {
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

function kidsPages(l: Look) {
  return (ctx: SectionContext) => [
    { slug: KIDS_MENU_PAGE, title: "kdCategoryMenu" as SectionWord, studio: kidsMenuPage(ctx, l) },
    { slug: KIDS_SIZE_PAGE, title: "kdSizeGuide" as SectionWord, studio: kidsSizeGuidePage(ctx, l) },
  ];
}

/** The five tabs of the floating bar: Home, Shop, Cart, Orders, Account (A's shop a storefront and its orders a parcel, B's a grid and a receipt). */
function kidsTabs(l: Look) {
  return (tabs: readonly LayoutTab[]): LayoutTab[] => {
    const out = structuredClone([...tabs]).map((t) => {
      const target = t.target.type === "screen" ? t.target.screen : null;
      if (t.id === "home") return { ...t, icon: "home" };
      if (target === "search") return { ...t, label: "Shop", icon: l.look === "a" ? "storefront" : "grid_view" };
      if (target === "cart") return { ...t, label: "Cart", icon: "shopping_bag" };
      if (target === "account") return { ...t, icon: "person" };
      return t;
    });
    const account = out.findIndex((t) => t.target.type === "screen" && t.target.screen === "account");
    const orders: LayoutTab = { id: "orders", label: "Orders", icon: l.look === "a" ? "package_2" : "receipt_long", target: { type: "screen", screen: "orders" } };
    if (!out.some((t) => t.target.type === "screen" && t.target.screen === "orders")) out.splice(account < 0 ? out.length : account, 0, orders);
    return out;
  };
}

// ——— The sign-in screens, the account menus, the bars and the two looks ———

const TOOTA_SCREENS = signatureScreens({
  style: "photo",
  photo: P("baby-flatlay"),
  title: { en: "Welcome to Toota", ar: "أهلًا بكِ في توتة", tr: "Toota'ya hoş geldiniz" },
  subtitle: { en: "Sign in to follow your orders and your children's sizes.", ar: "سجّلي الدخول لتتابعي طلباتكِ ومقاسات أطفالكِ.", tr: "Siparişlerinizi ve çocuklarınızın bedenlerini takip etmek için giriş yapın." },
  menu: "cover",
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

const MINIMO_SCREENS = signatureScreens({
  style: "photo",
  photo: P("knit-hat-green"),
  title: { en: "Welcome to the club", ar: "أهلًا بكِ في النادي", tr: "Kulübe hoş geldiniz" },
  subtitle: { en: "Sign in for new arrivals in their size and your orders.", ar: "سجّلي الدخول لتصلكِ القطع الجديدة بمقاسهم وتتابعي طلباتكِ.", tr: "Bedenlerindeki yenilikler ve siparişleriniz için giriş yapın." },
  menu: "night",
  accent: B.fill,
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** A's floating bar: warm white by day, cocoa by night, the open tab in terracotta with its name. */
export const TOOTA_BAR = signatureBar(A, { design: "float", background: "#FFFDF9", dark_background: "#261F1C", active: "#A4503F", dark_active: "#EFA08C", inactive: "#6B5D55", dark_inactive: "#A09086", labels: "active", radius: 32, margin: 12 });
/** B's floating bar: deep navy by day and by night, the open tab in white. */
export const MINIMO_BAR = signatureBar(B, { design: "float", background: "#16213A", dark_background: "#1B2130", active: "#FFFFFF", dark_active: "#FFFFFF", inactive: "#9AA6BF", dark_inactive: "#8D94A3", labels: "active", radius: 24, margin: 12 });

export const TOOTA_A: SignatureDesign = {
  demo: "kids",
  variant: "a",
  template: { id: "kids_signature_a", icon: "child_care", fits: { types: ["store"], plain: true } },
  home: tootaHome,
  over: kidsOver(LOOK_A),
  tabs: kidsTabs(LOOK_A),
  pages: kidsPages(LOOK_A),
  bar: TOOTA_BAR,
  look: { header: signatureHeader(A, "glass"), background: A.page, dark_background: A.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    // Look A is the demo: its main colour the demo's (lib/demo/content.ts).
    appearance: { secondary_color: "#3A2B26", font: "Outfit", font_family: BALOO, dark_background: A.darkPage, dark_surface: A.darkSurface },
    screens: TOOTA_SCREENS,
  },
};

export const MINIMO_B: SignatureDesign = {
  demo: "kids",
  variant: "b",
  template: { id: "kids_signature_b", icon: "toys", fits: { types: ["store"], plain: true } },
  home: minimoHome,
  over: kidsOver(LOOK_B),
  tabs: kidsTabs(LOOK_B),
  pages: kidsPages(LOOK_B),
  bar: MINIMO_BAR,
  look: { header: signatureHeader(B, "glass"), background: B.page, dark_background: B.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    primary: B.fill,
    appearance: { secondary_color: "#B7893A", font: "Lexend", font_family: READEX, dark_background: B.darkPage, dark_surface: B.darkSurface },
    screens: MINIMO_SCREENS,
  },
};

// ——— Every part of the two looks as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;

const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};
/** On its own in any store's page a part opens the shop, never the look's own pages (a store has no size guide page of its own). */
const alone = (ctx: SectionContext): SectionContext => ({ ...ctx, ownPages: false });

export const KIDS_SECTIONS: readonly SectionInfo[] = [
  // The category menu: every main category a row of cards, its "All" card first (A's tall card, B's numbered rows).
  { id: "kd_category_menu", icon: "menu_open", isNew: true, fits: STORE_PLAIN, make: one((ctx) => kidsMenuPage(alone(ctx), LOOK_A).body.children!.find((n) => n.type === "categories")!) },
  { id: "kd_category_menu_label", icon: "view_list", isNew: true, fits: STORE_PLAIN, make: one((ctx) => kidsMenuPage(alone(ctx), LOOK_B).body.children!.find((n) => n.type === "categories")!) },
  // The compact hero carousels, the next card peeking: A's soft cream wash, B's deep shade.
  { id: "kd_peek_hero", icon: "view_carousel", isNew: true, fits: STORE_PLAIN, make: one((ctx) => heroCarousel(ctx, LOOK_A, [["baby-flatlay", "kdHeroKicker1", "kdHeroTitle1"], ["girls-coats", "kdHeroKicker2", "kdHeroTitle2"]], "kdShopNow")) },
  { id: "kd_peek_hero_b", icon: "view_carousel", isNew: true, fits: STORE_PLAIN, make: one((ctx) => heroCarousel(ctx, LOOK_B, [["knit-hat-green", "kdHeroKickerB1", "kdHeroTitleB1"], ["yellow-raincoat", "kdHeroKickerB2", "kdHeroTitleB2"]], "kdShop")) },
  // Shopping by age: A's pastel tiles, B's grid.
  { id: "kd_by_age", icon: "child_care", isNew: true, fits: STORE_PLAIN, make: one((ctx) => ageTiles(alone(ctx))) },
  { id: "kd_age_grid", icon: "grid_view", isNew: true, fits: STORE_PLAIN, make: one((ctx) => ageGrid(alone(ctx))) },
  // The size finder by age, and the shop's size chart.
  { id: "kd_size_finder", icon: "straighten", isNew: true, fits: STORE_PLAIN, make: one((ctx) => sizeFinder(ctx, LOOK_A)) },
  { id: "kd_size_finder_b", icon: "straighten", isNew: true, fits: STORE_PLAIN, make: one((ctx) => sizeFinder(ctx, LOOK_B)) },
  { id: "kd_size_chart", icon: "table_chart", isNew: true, fits: STORE_PLAIN, make: one((ctx) => kidsSizeGuidePage(ctx, LOOK_A).body.children!.find((n) => n.type === "size_chart")!) },
  // Girls, boys and baby: A's worlds, B's cards (each opens the shop's category of its name).
  { id: "kd_worlds", icon: "family_restroom", isNew: true, fits: STORE_PLAIN, make: one(worlds) },
  { id: "kd_who", icon: "view_carousel", isNew: true, fits: STORE_PLAIN, make: one(whoCards) },
  // The newborn gifts: A's boxes, B's box, little gifts under a price.
  { id: "kd_gift_sets", icon: "redeem", isNew: true, fits: STORE_PLAIN, make: one(giftSets) },
  { id: "kd_gift_box", icon: "redeem", isNew: true, fits: STORE_PLAIN, make: one(giftBox) },
  { id: "kd_gifts_under", icon: "sell", isNew: true, fits: STORE_PLAIN, make: one((ctx) => giftsUnder(ctx, LOOK_B)) },
  // School, occasions and the ready-made sets: A's bento, B's numbered cards.
  { id: "kd_occasions", icon: "dashboard", isNew: true, fits: STORE_PLAIN, make: one(occasions) },
  { id: "kd_occasion_cards", icon: "celebration", isNew: true, fits: STORE_PLAIN, make: one(occasionCards) },
  // The weekend's deals: the shop's flash sale with its countdown.
  { id: "kd_deal", icon: "bolt", isNew: true, fits: STORE_PLAIN, make: one((ctx) => dealCard(ctx, LOOK_A, "carousel")) },
  // The best loved two by two, the look of the week, the promises and the values.
  { id: "kd_loved", icon: "favorite", isNew: true, fits: STORE_PLAIN, make: one(loved) },
  { id: "kd_look", icon: "checkroom", isNew: true, fits: STORE_PLAIN, make: one(lookOfWeek) },
  { id: "kd_promises", icon: "verified_user", isNew: true, fits: STORE_PLAIN, make: one(promises) },
  { id: "kd_values", icon: "spa", isNew: true, fits: STORE_PLAIN, make: one(values) },
];
