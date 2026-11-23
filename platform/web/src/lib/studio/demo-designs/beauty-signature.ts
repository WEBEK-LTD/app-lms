import type { Action, LayoutTab, StudioEntry, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigPhoto, sigTexts, signatureBar, signatureHeader, type SignatureInk } from "./food-signature-parts";
import { clothesTabs } from "./clothes-signature";

/**
 * 209 Velours (فيلور), Studio's cosmetics type (lib/studio/shop-types.ts):
 * a Studio demo of the store kind and its two Signature looks, each a whole
 * store project (its home, its category menu, its skin quiz, its shop, cart
 * and orders, its tabs, its floating bar, its sign-in screen and account),
 * built only from Studio's elements so every part is the owner's to change,
 * as the owner approved them on 23 November 2026 (a native phone app: a
 * small header with the menu button, a search pill, the categories, a
 * compact hero carousel of 210 px with the next card peeking, tight
 * sections and a floating bar of five tabs).
 *
 * A · VELOURS, luxury: plum and blush with a touch of gold, Readex Pro;
 * blush paper by day, a deep plum-black by night.
 * B · NAQA LAB, the clinic: porcelain and ink with a cobalt accent, IBM
 * Plex Sans Arabic; near black by night.
 *
 * Both share what a cosmetics shop needs, each a reusable element: the
 * category menu (every main category a row of cards, the skin types and
 * the brands among them), the shade finder (`swatches`: the foundation's
 * shades, the preselected one's words and a button), "Know your skin
 * type" (`quiz`: four questions, each answer counting for Dry,
 * Combination, Oily or Sensitive, each result opening its category of the
 * shop by its name), the daily routine (its steps and the shop's
 * ready-made routines, the featured products, at their sale price under
 * the sum), the flash deals with their countdown, the trust strip
 * (genuine, expiry, cruelty-free, returns) and the brands. Nothing is made
 * up: the lists, the categories, the sale and the prices are the shop's
 * own; the owner's words are in [brackets] (the demo fills them,
 * lib/studio/demo-templates.ts).
 */

// ——— The two looks' colours and faces ———

/** A · VELOURS: blush paper and plum ink by day, a plum-black night in rose. */
export const VELOURS_INK: SignatureInk = {
  page: "#FBF7F5",
  darkPage: "#141113",
  surface: "#FFFFFF",
  darkSurface: "#1E1A1C",
  ink: "#2A1D21",
  darkInk: "#F4ECEE",
  muted: "#6F5F63",
  darkMuted: "#C7B9BD",
  line: "#EFE3DF",
  darkLine: "#2E2629",
  accent: "#6D1B3B",
  darkAccent: "#EFA6C3",
  fill: "#6D1B3B",
  darkFill: "#8A2A50",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const A = VELOURS_INK;
/** A's blush (the soft cards, the chips) and its gold (the stars, the club's mark). */
const A_TINT = { day: "#F4E7E3", night: "#282124" };
const A_GOLD = { day: "#B9853F", night: "#D9A85E" };
/** A's deep plum cards (the quiz, the routine's foot): white words on them by day and by night. */
const A_PLUM = { day: "#6D1B3B", night: "#4A1028" };
const READEX = "Readex Pro";

/** B · NAQA LAB: porcelain and ink, cobalt; a near-black night. */
export const NAQA_INK: SignatureInk = {
  page: "#F2F4F5",
  darkPage: "#0B0E10",
  surface: "#FFFFFF",
  darkSurface: "#141A1D",
  ink: "#0F1A20",
  darkInk: "#E8EEF0",
  muted: "#46535A",
  darkMuted: "#A9B5BB",
  line: "#E0E5E8",
  darkLine: "#222B30",
  accent: "#2840C8",
  darkAccent: "#9EB0FF",
  fill: "#2840C8",
  darkFill: "#4560F0",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const B = NAQA_INK;
const B_TINT = { day: "#E9EDEF", night: "#1C2428" };
/** B's ink card (the first ingredient, the SPF banner): ink by day, porcelain by night, its words the other. */
const B_INV = { day: "#0F1A20", night: "#E8EEF0", onDay: "#FFFFFF", onNight: "#0F1A20" };
const PLEX = "IBM Plex Sans Arabic";

/** Velours's photos (public/beauty-photos, CC0 from StockSnap, credited in CREDITS.md). */
const P = (name: string) => `/beauty-photos/${name}.jpg`;

const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
/** One of the look's own pages (the category menu, the skin quiz) where the whole look is made (the demo, a project started from it); where its home is made alone, the shop. */
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));
/** The category menu's page and the skin quiz's (both looks have them). */
export const MENU_PAGE = "menu";
export const QUIZ_PAGE = "skin-quiz";

/** The look's ink, its tint and its face. */
interface Look {
  k: SignatureInk;
  tint: { day: string; night: string };
  family: string;
  look: "a" | "b";
}
const LOOK_A: Look = { k: A, tint: A_TINT, family: READEX, look: "a" };
const LOOK_B: Look = { k: B, tint: B_TINT, family: PLEX, look: "b" };

// ——— What both looks are made of ———

const face = (l: Look, size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: l.family, size, weight: l.look === "a" ? 600 : 700, line_height: 1.25, ...extra });

function say(ctx: SectionContext, l: Look, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, l.k, ctx.w(word), { family: l.family, ...font }, extra);
}

/** White words on a photo or a deep card, by day and by night. */
const WHITE = { color: "#FFFFFF", dark_color: "#FFFFFF" } as const;

/** A section's title (B: a small cobalt kicker over it), a quieter link at its end. */
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
          ...(kicker ? [say(ctx, l, kicker, { size: 10.5, weight: 700, letter_spacing: 1.4, uppercase: true }, { accent: true, max_lines: 1 })] : []),
          say(ctx, l, title, face(l, l.look === "a" ? 19 : 20), { max_lines: 2 }),
          ...(line ? [say(ctx, l, line, { size: 12, weight: 400 }, { muted: true, max_lines: 2 })] : []),
        ],
      },
      ...(link
        ? [
            {
              id: id(),
              type: "row" as const,
              name: ctx.w(link.word),
              height: 30,
              gap: 2,
              cross: "center" as const,
              action: link.action,
              children: [
                say(ctx, l, link.word, { size: 12.5, weight: 600 }, { accent: true, max_lines: 1 }),
                { id: id(), type: "icon" as const, icon: "arrow_forward", icon_size: 16, color: l.k.accent, dark_color: l.k.darkAccent },
              ],
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
    radius: l.look === "a" ? 26 : 14,
    height: l.look === "a" ? 52 : 48,
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

/** The shop's main categories as chips under the search (each opens the shop on it). */
function categoryChips(ctx: SectionContext, l: Look): StudioNode {
  return { id: idOf(ctx)(), type: "categories", name: ctx.w("btCategories"), source: "products", style: "chips", color: l.k.ink, dark_color: l.k.darkInk, padding: sides(6, 12, 4, 12) };
}

/** One hero card: a photo under a shade, its kicker, headline and a button. */
function heroCard(ctx: SectionContext, l: Look, photo: string, kicker: SectionWord, title: SectionWord, button: SectionWord): StudioNode {
  const id = idOf(ctx);
  const shade = l.look === "a" ? "#3A1424" : "#0F1A20";
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w(title),
    image_url: sigPhoto(ctx, P(photo)),
    height: 210,
    radius: l.look === "a" ? 24 : 20,
    background: shade,
    scrim: { color: shade, from: 0.05, middle: 0.2, at: 45, to: 0.8 },
    align: "end",
    padding: sides(16, 18, 16, 18),
    action: shop,
    children: [
      {
        id: id(),
        type: "row",
        name: ctx.w(kicker),
        width: "hug",
        radius: 10,
        padding: sides(4, 9, 4, 9),
        ...(l.look === "a" ? { background: "#F5E3E8", dark_background: "#F5E3E8" } : { background: "#E6EAFB", dark_background: "#E6EAFB" }),
        children: [say(ctx, l, kicker, { size: 11, weight: 600 }, { color: l.look === "a" ? "#6D1B3B" : "#2840C8", dark_color: l.look === "a" ? "#6D1B3B" : "#2840C8", max_lines: 1 })],
      },
      say(ctx, l, title, face(l, l.look === "a" ? 22 : 22, { weight: 700, line_height: 1.2 }), { ...WHITE, max_lines: 2, margin: sides(8, 0, 0, 0) }),
      {
        id: id(),
        type: "button",
        name: ctx.w(button),
        text: ctx.w(button),
        icon: "arrow_forward",
        icon_position: "end",
        width: "hug",
        height: 38,
        radius: l.look === "a" ? 19 : 12,
        padding: sides(0, 16, 0, 16),
        self_align: "start",
        margin: sides(12, 0, 0, 0),
        ...(l.look === "a" ? { background: A.fill, dark_background: A.darkFill } : { background: B.fill, dark_background: B.darkFill }),
        color: "#FFFFFF",
        dark_color: "#FFFFFF",
        font: { family: l.family, size: 13, weight: 600 },
        motion: { press: "shrink" },
        action: shop,
      },
    ],
  };
}

/** The compact hero carousel: cards 210 px tall, the next one peeking, dots under them. */
function heroCarousel(ctx: SectionContext, l: Look, cards: readonly [string, SectionWord, SectionWord][], button: SectionWord): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "slider",
    name: ctx.w("btHeroName"),
    height: 210,
    per_view: 1.12,
    gap: 10,
    autoplay: true,
    interval_ms: 5000,
    dots: true,
    indicator: l.look === "a" ? "dots" : "progress",
    padding: sides(10, 16, 4, 16),
    children: cards.map(([photo, kicker, title]) => heroCard(ctx, l, photo, kicker, title, button)),
  };
}

/** A product card on the look's surface: its photo on a soft backdrop with the sale's share off, its name, its price (and the price before, struck through, while on sale) and an add button. */
function productCard(ctx: SectionContext, l: Look, width: number, height: number): StudioNode {
  const id = idOf(ctx);
  const inner = width - 16;
  return {
    id: id(),
    type: "column",
    width,
    gap: 6,
    radius: l.look === "a" ? 22 : 18,
    padding: sides(8, 8, 10, 8),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    children: [
      {
        id: id(),
        type: "stack",
        width: inner,
        height,
        children: [
          { id: id(), type: "image", bind: "image", width: inner, height, radius: l.look === "a" ? 16 : 12, fit: "cover", background: l.tint.day, dark_background: l.tint.night },
          { id: id(), type: "text", bind: "sale", font: { size: 11, weight: 700 }, color: "#FFFFFF", background: l.k.fill, dark_color: "#FFFFFF", dark_background: l.k.darkFill, radius: 8, padding: sides(3, 7, 3, 7), place: { x: 6, y: 5 } },
        ],
      },
      { id: id(), type: "text", bind: "title", max_lines: 2, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 13, weight: 500, line_height: 1.35 }, padding: sides(2, 2, 0, 2) },
      {
        id: id(),
        type: "row",
        gap: 6,
        cross: "center",
        padding: sides(0, 2, 0, 2),
        children: [
          {
            id: id(),
            type: "column",
            width: "fill",
            gap: 1,
            children: [
              { id: id(), type: "text", bind: "price", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 14.5, weight: 700 } },
              { id: id(), type: "text", bind: "was_price", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 11.5 } },
            ],
          },
          {
            id: id(),
            type: "icon",
            icon: "add",
            icon_size: 20,
            radius: l.look === "a" ? 99 : 10,
            padding: sides(7, 7, 7, 7),
            color: "#FFFFFF",
            dark_color: l.look === "a" ? "#FFFFFF" : "#0F1A20",
            background: l.look === "a" ? A.fill : B.ink,
            dark_background: l.look === "a" ? A.darkFill : B.darkInk,
          },
        ],
      },
    ],
  };
}

/** The shop's products as a row of cards (best sellers, the newest). */
function productRow(ctx: SectionContext, l: Look, name: SectionWord, sort: "newest" | "popular"): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "items",
    name: ctx.w(name),
    source: "products",
    layout: "carousel",
    gap: 12,
    padding: sides(0, 16, 0, 16),
    query: { limit: 8, category_id: null, featured: false, sort, ids: [] },
    card: productCard(ctx, l, 168, 168),
  };
}

/** B's grid of the most wanted products, two by two. */
function productGrid(ctx: SectionContext, l: Look): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "items",
    name: ctx.w("btPicks"),
    source: "products",
    layout: "grid",
    columns: 2,
    gap: 12,
    padding: sides(0, 16, 0, 16),
    query: { limit: 4, category_id: null, featured: false, sort: "popular", ids: [] },
    card: productCard(ctx, l, 171, 160),
  };
}

/** The shop's flash sale (the `flash_sale` element: the sale ending soonest, its products at was and now prices, a live countdown and the stock left; left out while none is on). */
function dealCard(ctx: SectionContext, l: Look, look: "banner" | "carousel"): StudioNode {
  const t = sigTexts(ctx, { text: "btDeal" });
  return {
    id: idOf(ctx)(),
    type: "flash_sale",
    name: ctx.w("btDeal"),
    text: t.text,
    translations: t.translations,
    flash_sale: { look, limit: 6, countdown: true, stock_bar: true, accent: l.look === "a" ? A.fill : B.fill },
    radius: 24,
    margin: sides(22, 16, 4, 16),
  };
}

/** The eight shades the home's shade finder shows (the foundation's, lib/demo/beauty.ts FOUNDATION_SHADES), 3W preselected. */
const FINDER_SHADES: readonly [code: string, hex: string, name: SectionWord, line: SectionWord][] = [
  ["1N", "#F3D9C6", "btShade1", "btShade1Text"],
  ["2C", "#EDCBB2", "btShade2", "btShade2Text"],
  ["2W", "#E3B898", "btShade3", "btShade3Text"],
  ["3W", "#D7A887", "btShade4", "btShade4Text"],
  ["4N", "#C89272", "btShade5", "btShade5Text"],
  ["5W", "#B17A5A", "btShade6", "btShade6Text"],
  ["6C", "#8F5C40", "btShade7", "btShade7Text"],
  ["7N", "#6B412D", "btShade8", "btShade8Text"],
];

/** The shade finder (the `swatches` element): the foundation's shades, the one tapped showing its name and its line, a button to the shop. */
function shadeFinder(ctx: SectionContext, l: Look): StudioNode {
  const t = sigTexts(ctx, { text: "btShadeTitle", title: "btShadeButton" });
  return {
    id: idOf(ctx)(),
    type: "swatches",
    name: ctx.w("btShadeTitle"),
    text: t.text,
    title: t.title,
    translations: t.translations,
    action: shop,
    swatches: { shape: "circle", size: 36 },
    entries: FINDER_SHADES.map(([code, hex, name, line]) => ({ ...sigEntry(ctx, { title: name, text: line }), subtitle: code, color: hex, ...(code === "3W" ? { highlight: true } : {}) })),
    font: { family: l.family },
    color: l.k.ink,
    dark_color: l.k.darkInk,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    radius: l.look === "a" ? 26 : 20,
    padding: sides(16, 16, 16, 16),
    margin: sides(0, 16, 0, 16),
  };
}

/** The quiz's four questions: each answer counts for the result in its place (Dry, Combination, Oily, Sensitive). */
const QUIZ_QUESTIONS: readonly [question: SectionWord, answers: SectionWord][] = [
  ["btQ1", "btQ1Answers"],
  ["btQ2", "btQ2Answers"],
  ["btQ3", "btQ3Answers"],
  ["btQ4", "btQ4Answers"],
];
/** Its results: each a skin type, named as the shop's category of it (so it opens it), with what that skin needs. */
const QUIZ_RESULTS: readonly [name: SectionWord, text: SectionWord, icon: string, photo: string][] = [
  ["btSkinDry", "btSkinDryText", "wb_sunny", "routine-dry"],
  ["btSkinCombination", "btSkinCombinationText", "donut_large", "routine-morning"],
  ["btSkinOily", "btSkinOilyText", "blur_on", "routine-oily"],
  ["btSkinSensitive", "btSkinSensitiveText", "healing", "routine-calm"],
];

/** "Know your skin type" (the `quiz` element): the questions one at a time, then the skin type with the most answers, its words and a button to its products. */
function skinQuiz(ctx: SectionContext, l: Look, dense = false): StudioNode {
  const t = sigTexts(ctx, { text: "btQuizTitle", title: "btQuizButton" });
  const results: StudioEntry[] = QUIZ_RESULTS.map(([name, text, icon, photo]) => {
    const url = sigPhoto(ctx, P(photo));
    return { ...sigEntry(ctx, { title: name, text, label: "btQuizShop" }), icon, ...(url ? { image_url: url } : {}), action: shop };
  });
  return {
    id: idOf(ctx)(),
    type: "quiz",
    name: ctx.w("btQuizTitle"),
    text: t.text,
    title: t.title,
    translations: t.translations,
    entries: results,
    quiz: { questions: QUIZ_QUESTIONS.map(([question, answers]) => sigEntry(ctx, { title: question, text: answers })) },
    font: { family: l.family },
    ...(l.look === "a"
      ? { color: "#FFFFFF", dark_color: "#FFFFFF", background: A_PLUM.day, dark_background: A_PLUM.night }
      : { color: B.ink, dark_color: B.darkInk, background: B.surface, dark_background: B.darkSurface, border_color: B.line, dark_border_color: B.darkLine, border_width: 1 }),
    radius: l.look === "a" ? 26 : 20,
    padding: sides(18, 16, 18, 16),
    margin: dense ? sides(8, 16, 4, 16) : sides(0, 16, 0, 16),
  };
}

/** The daily routine's steps, morning and evening. */
const MORNING: readonly [SectionWord, SectionWord][] = [
  ["btStepCleanse", "btStepCleanseText"],
  ["btStepTreat", "btStepTreatText"],
  ["btStepMoisturise", "btStepMoisturiseText"],
  ["btStepProtect", "btStepProtectText"],
];
const EVENING: readonly [SectionWord, SectionWord][] = [
  ["btStepRemove", "btStepRemoveText"],
  ["btStepRepair", "btStepRepairText"],
  ["btStepNourish", "btStepNourishText"],
];

/**
 * The daily routine: its steps morning and evening (tabs), then the
 * shop's ready-made routines (its featured products: the routines sold
 * together for less than their products), each opening its page.
 */
function routineCard(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const steps = (list: readonly [SectionWord, SectionWord][], tab: SectionWord, icon: string): StudioNode => ({
    id: id(),
    type: "column",
    title: ctx.w(tab),
    icon,
    padding: sides(6, 0, 4, 0),
    children: [
      {
        id: id(),
        type: "timeline",
        name: ctx.w(tab),
        timeline: { style: l.look === "a" ? "horizontal" : "vertical" },
        color: l.k.ink,
        dark_color: l.k.darkInk,
        entries: list.map(([title, text], i) => sigEntry(ctx, { title, text }, i === 0 ? { highlight: true } : {})),
      },
    ],
  });
  const sets: StudioNode = {
    id: id(),
    type: "items",
    name: ctx.w("btRoutineSets"),
    source: "products",
    layout: "list",
    gap: 10,
    query: { limit: 2, category_id: null, featured: true, sort: "popular", ids: [] },
    card: {
      id: id(),
      type: "row",
      gap: 12,
      cross: "center",
      radius: 18,
      padding: sides(8, 12, 8, 8),
      background: l.tint.day,
      dark_background: l.tint.night,
      children: [
        { id: id(), type: "image", bind: "image", width: 56, height: 56, radius: 14, fit: "cover" },
        {
          id: id(),
          type: "column",
          width: "fill",
          gap: 3,
          children: [
            { id: id(), type: "text", bind: "title", max_lines: 2, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 13, weight: 600, line_height: 1.3 } },
            {
              id: id(),
              type: "row",
              gap: 6,
              cross: "center",
              children: [
                { id: id(), type: "text", bind: "price", max_lines: 1, color: l.k.accent, dark_color: l.k.darkAccent, font: { family: l.family, size: 14, weight: 700 } },
                { id: id(), type: "text", bind: "was_price", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 11.5 } },
              ],
            },
          ],
        },
        { id: id(), type: "icon", icon: "shopping_bag", icon_size: 20, radius: l.look === "a" ? 99 : 10, padding: sides(9, 9, 9, 9), color: "#FFFFFF", dark_color: "#FFFFFF", background: l.k.fill, dark_background: l.k.darkFill },
      ],
    },
  };
  return {
    id: id(),
    type: "column",
    name: ctx.w("btRoutineTitle"),
    gap: 12,
    radius: l.look === "a" ? 26 : 20,
    padding: sides(16, 16, 16, 16),
    margin: sides(0, 16, 0, 16),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    children: [
      { id: id(), type: "tabs", name: ctx.w("btRoutineTitle"), gap: 10, color: l.k.ink, dark_color: l.k.darkInk, children: [steps(MORNING, "btMorning", "light_mode"), steps(EVENING, "btEvening", "dark_mode")] },
      { id: id(), type: "divider", height: 1, background: l.k.line, dark_background: l.k.darkLine },
      {
        id: id(),
        type: "row",
        gap: 8,
        cross: "center",
        children: [
          { id: id(), type: "icon", icon: "redeem", icon_size: 18, color: l.k.accent, dark_color: l.k.darkAccent },
          say(ctx, l, "btRoutineSets", { size: 14, weight: 600 }, { width: "fill", max_lines: 1 }),
          say(ctx, l, "btRoutineSave", { size: 11.5, weight: 500 }, { accent: true, max_lines: 1 }),
        ],
      },
      sets,
    ],
  };
}

/** A's care rituals as photo tiles, two by two: each named as one of the shop's categories, so it opens it. */
function ritualTiles(ctx: SectionContext, l: Look, tiles: readonly [string, SectionWord, SectionWord][]): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "grid",
    name: ctx.w("btRituals"),
    columns: 2,
    gap: 10,
    padding: sides(0, 16, 0, 16),
    children: tiles.map(([photo, kicker, title], i) => ({
      id: id(),
      type: "photo_hero" as const,
      name: ctx.w(title),
      image_url: sigPhoto(ctx, P(photo)),
      height: i === 0 ? 200 : 150,
      radius: 22,
      background: "#3A1424",
      scrim: { color: "#28101A", from: 0, middle: 0.1, at: 50, to: 0.74 },
      align: "end" as const,
      padding: sides(12, 12, 12, 12),
      action: shop,
      children: [
        say(ctx, l, kicker, { size: 10.5, weight: 400 }, { ...WHITE, opacity: 0.9, max_lines: 1 }),
        say(ctx, l, title, face(l, 16, { weight: 600 }), { ...WHITE, max_lines: 2 }),
      ],
    })),
  };
}

/** The shop's brands as round marks with their names under them: each named as the brand's category of the shop, so it opens it. */
const BRAND_MARKS: readonly [mark: string, name: SectionWord][] = [
  ["RL", "btBrandRose"],
  ["NS", "btBrandNoor"],
  ["V", "btBrandVela"],
  ["MA", "btBrandAura"],
  ["NL", "btBrandNaqa"],
  ["PF", "btBrandPure"],
];
function brandCircles(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("btBrands"),
    gap: 12,
    scroll: true,
    padding: sides(0, 16, 4, 16),
    children: BRAND_MARKS.map(([mark, name]) => ({
      id: id(),
      type: "column" as const,
      name: ctx.w(name),
      width: 84,
      gap: 7,
      cross: "center" as const,
      action: shop,
      children: [
        {
          id: id(),
          type: "row" as const,
          width: 76,
          height: 76,
          radius: 38,
          align: "center" as const,
          cross: "center" as const,
          background: l.k.surface,
          dark_background: l.k.darkSurface,
          border_color: l.k.line,
          dark_border_color: l.k.darkLine,
          border_width: 1,
          children: [{ id: id(), type: "text" as const, text: mark, font: { family: l.family, size: 19, weight: 300 as const, letter_spacing: 1.5 }, color: l.k.accent, dark_color: l.k.darkAccent }],
        },
        say(ctx, l, name, { size: 11.5, weight: 500 }, { muted: true, max_lines: 1, text_align: "center" }),
      ],
    })),
  };
}

/** The trust strip: genuine products, the expiry on every page, cruelty-free brands, delivery and returns (the owner's words in brackets). */
function trustStrip(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const item = (icon: string, title: SectionWord, text: SectionWord): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(title),
    width: 210,
    gap: 10,
    cross: "center",
    radius: l.look === "a" ? 20 : 16,
    padding: sides(12, 14, 12, 12),
    background: l.tint.day,
    dark_background: l.tint.night,
    children: [
      { id: id(), type: "icon", icon, icon_size: 20, radius: l.look === "a" ? 99 : 10, padding: sides(9, 9, 9, 9), color: l.k.accent, dark_color: l.k.darkAccent, background: l.k.surface, dark_background: l.k.darkSurface },
      { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, l, title, { size: 13, weight: 600 }, { max_lines: 1 }), say(ctx, l, text, { size: 11.5 }, { muted: true, max_lines: 2 })] },
    ],
  });
  return {
    id: id(),
    type: "row",
    name: ctx.w("btTrust"),
    gap: 10,
    scroll: true,
    padding: sides(0, 16, 4, 16),
    children: [
      item("verified", "btTrustGenuine", "btTrustGenuineText"),
      item("event_available", "btTrustExpiry", "btTrustExpiryText"),
      item("favorite", "btTrustCruelty", "btTrustCrueltyText"),
      item("local_shipping", "btTrustDelivery", "btTrustDeliveryText"),
      item("sync", "btTrustReturns", "btTrustReturnsText"),
    ],
  };
}

/** The home's header: the wordmark at its start, the menu (the category menu), the bell and the bag at its end. */
function homeHeader(ctx: SectionContext, l: Look): StudioPage["header"] {
  const t = sigTexts(ctx, { title: "btWordmark" });
  return { type: "logo_actions", title: t.title, translations: t.translations, buttons: ["menu", "notifications", "cart"], menu_page: MENU_PAGE, background: l.k.page, dark_background: l.k.darkPage, color: l.k.ink, dark_color: l.k.darkInk };
}

// ——— A · VELOURS ———

const A_HEROES: readonly [string, SectionWord, SectionWord][] = [
  ["hero-glow", "btHeroKicker1", "btHeroTitle1"],
  ["hero-lips", "btHeroKicker2", "btHeroTitle2"],
  ["hero-cream", "btHeroKicker3", "btHeroTitle3"],
];
const A_RITUALS: readonly [string, SectionWord, SectionWord][] = [
  ["bath-salts", "btRitualBathKicker", "btCatBathSalts"],
  ["candle-amber", "btRitualCandleKicker", "btCatCandles"],
  ["balm-stick", "btRitualLipsKicker", "btCatLips"],
  ["perfume", "btRitualPerfumeKicker", "btCatPerfume"],
];

export function veloursHome(ctx: SectionContext): StudioPage {
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
        searchPill(ctx, l, "btSearch"),
        categoryChips(ctx, l),
        heroCarousel(ctx, l, A_HEROES, "btDiscover"),
        dealCard(ctx, l, "carousel"),
        headOf(ctx, l, "btBest", { word: "btSeeAll", action: shop }, "btBestLine"),
        productRow(ctx, l, "btBest", "popular"),
        headOf(ctx, l, "btShadeHead", null, "btShadeLine"),
        shadeFinder(ctx, l),
        headOf(ctx, l, "btQuizHead", { word: "btQuizAll", action: ownPage(ctx, QUIZ_PAGE) }),
        skinQuiz(ctx, l),
        headOf(ctx, l, "btRoutineTitle", null, "btRoutineLine"),
        routineCard(ctx, l),
        headOf(ctx, l, "btRituals", { word: "btShopAll", action: ownPage(ctx, MENU_PAGE) }),
        ritualTiles(ctx, l, A_RITUALS),
        headOf(ctx, l, "btBrands", { word: "btAllBrands", action: ownPage(ctx, MENU_PAGE) }),
        brandCircles(ctx, l),
        headOf(ctx, l, "btTrust", null),
        trustStrip(ctx, l),
      ],
    },
  };
}

// ——— B · NAQA LAB ———

const B_HEROES: readonly [string, SectionWord, SectionWord][] = [
  ["hero-lab", "btHeroKickerB1", "btHeroTitleB1"],
  ["hero-calm", "btHeroKickerB2", "btHeroTitleB2"],
  ["spf-banner", "btHeroKickerB3", "btHeroTitleB3"],
];

/** B's tiles by skin type and need, four by two: each named as one of the shop's categories, so it opens it. */
const B_CONCERNS: readonly [icon: string, name: SectionWord][] = [
  ["wb_sunny", "btSkinDry"],
  ["donut_large", "btSkinCombination"],
  ["blur_on", "btSkinOily"],
  ["healing", "btSkinSensitive"],
  ["layers", "btCatSerums"],
  ["spa", "btCatMoisturisers"],
  ["light_mode", "btCatSunscreen"],
  ["auto_awesome", "btCatCleansers"],
];
function concernTiles(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "grid",
    name: ctx.w("btConcerns"),
    columns: 4,
    gap: 8,
    padding: sides(0, 16, 0, 16),
    children: B_CONCERNS.map(([icon, name], i) => {
      const lit = i === 0;
      return {
        id: id(),
        type: "column" as const,
        name: ctx.w(name),
        height: 84,
        gap: 6,
        align: "center" as const,
        cross: "center" as const,
        radius: 16,
        padding: sides(10, 4, 10, 4),
        action: shop,
        ...(lit ? { background: B_INV.day, dark_background: B_INV.night } : { background: B.surface, dark_background: B.darkSurface, border_color: B.line, dark_border_color: B.darkLine, border_width: 1 }),
        children: [
          { id: id(), type: "icon" as const, icon, icon_size: 22, color: lit ? B_INV.onDay : B.accent, dark_color: lit ? B_INV.onNight : B.darkAccent },
          say(ctx, l, name, { size: 11.5, weight: 600 }, lit ? { color: B_INV.onDay, dark_color: B_INV.onNight, max_lines: 2, text_align: "center" } : { max_lines: 2, text_align: "center" }),
        ],
      };
    }),
  };
}

/** B's active ingredients as cards to slide: each one's share, name and what it does (the first an ink card). */
const B_INGREDIENTS: readonly [share: string, name: SectionWord, text: SectionWord][] = [
  ["10%", "btIngNia", "btIngNiaText"],
  ["0.3%", "btIngRet", "btIngRetText"],
  ["2%", "btIngHa", "btIngHaText"],
  ["15%", "btIngVitC", "btIngVitCText"],
];
function ingredientCards(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("btIngredients"),
    gap: 10,
    scroll: true,
    padding: sides(0, 16, 4, 16),
    children: B_INGREDIENTS.map(([share, name, text], i) => {
      const lit = i === 0;
      const on = lit ? { color: B_INV.onDay, dark_color: B_INV.onNight } : {};
      return {
        id: id(),
        type: "column" as const,
        name: ctx.w(name),
        width: 152,
        height: 180,
        gap: 6,
        radius: 20,
        padding: sides(16, 14, 14, 14),
        action: shop,
        ...(lit ? { background: B_INV.day, dark_background: B_INV.night } : { background: B.surface, dark_background: B.darkSurface, border_color: B.line, dark_border_color: B.darkLine, border_width: 1 }),
        children: [
          { id: id(), type: "text" as const, text: share, font: { family: PLEX, size: 32, weight: 700 as const }, color: lit ? B_INV.onDay : B.accent, dark_color: lit ? B_INV.onNight : B.darkAccent },
          say(ctx, l, name, { size: 15, weight: 700 }, { ...on, max_lines: 1 }),
          say(ctx, l, text, { size: 12, line_height: 1.4 }, lit ? { ...on, opacity: 0.8, max_lines: 3 } : { muted: true, max_lines: 3 }),
        ],
      };
    }),
  };
}

/** B's SPF banner: an ink card over a photo, the day's reminder and a button named as the shop's sunscreen category, so it opens it. */
function spfBanner(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const bar = (color: string): StudioNode => ({ id: id(), type: "row", width: "fill", height: 5, radius: 3, background: color, dark_background: color, children: [] });
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w("btSpfTitle"),
    image_url: sigPhoto(ctx, P("spf-banner")),
    height: 214,
    radius: 22,
    background: "#0F1A20",
    scrim: { color: "#0F1A20", from: 0.95, middle: 0.8, at: 55, to: 0.1, angle: 90 },
    padding: sides(18, 18, 18, 18),
    margin: sides(24, 16, 0, 16),
    action: shop,
    children: [
      {
        id: id(),
        type: "column",
        width: 200,
        gap: 8,
        children: [
          say(ctx, l, "btSpfKicker", { size: 11, weight: 600 }, { ...WHITE, opacity: 0.8, max_lines: 1 }),
          say(ctx, l, "btSpfTitle", face(l, 18), { ...WHITE, max_lines: 3 }),
          { id: id(), type: "row", gap: 4, children: ["#4BA36B", "#9BC14B", "#E6C33A", "#E8902F", "#D9542B", "#B53A6E"].map(bar) },
          {
            id: id(),
            type: "button",
            name: ctx.w("btCatSunscreen"),
            text: ctx.w("btCatSunscreen"),
            icon: "arrow_forward",
            icon_position: "end",
            width: "hug",
            height: 36,
            radius: 10,
            padding: sides(0, 14, 0, 14),
            self_align: "start",
            margin: sides(4, 0, 0, 0),
            background: "#FFFFFF",
            dark_background: "#FFFFFF",
            color: "#0F1A20",
            dark_color: "#0F1A20",
            font: { family: PLEX, size: 13, weight: 600 },
            action: shop,
          },
        ],
      },
    ],
  };
}

export function naqaHome(ctx: SectionContext): StudioPage {
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
        searchPill(ctx, l, "btSearchB", sides(6, 16, 6, 16)),
        heroCarousel(ctx, l, B_HEROES, "btShopNow"),
        headOf(ctx, l, "btConcerns", { word: "btSeeAll", action: ownPage(ctx, MENU_PAGE) }, undefined, "btConcernsKicker"),
        concernTiles(ctx, l),
        headOf(ctx, l, "btQuizHead", { word: "btQuizAll", action: ownPage(ctx, QUIZ_PAGE) }, undefined, "btQuizKicker"),
        skinQuiz(ctx, l),
        headOf(ctx, l, "btIngredients", null, undefined, "btIngredientsKicker"),
        ingredientCards(ctx, l),
        headOf(ctx, l, "btPicks", { word: "btSeeAll", action: shop }, undefined, "btPicksKicker"),
        productGrid(ctx, l),
        headOf(ctx, l, "btRoutineB", null, undefined, "btRoutineKicker"),
        routineCard(ctx, l),
        headOf(ctx, l, "btShadeHead", null, undefined, "btShadeKicker"),
        shadeFinder(ctx, l),
        dealCard(ctx, l, "banner"),
        spfBanner(ctx, l),
        headOf(ctx, l, "btTrust", null, undefined, "btTrustKicker"),
        trustStrip(ctx, l),
      ],
    },
  };
}

// ——— The pages after the home (both looks) ———

/**
 * The category menu (the header's menu button opens it): the search on top,
 * quick ways in (the new products, the offers, the skin quiz, the
 * routines), every main category of the shop a row of cards (the skin
 * types and the brands among them), then the account, the orders, the
 * language and how to reach the shop.
 */
export function categoryMenuPage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "btWordmark" });
  const quick = (word: SectionWord, icon: string, lit: boolean, action: Action): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: 78,
    gap: 7,
    cross: "center",
    action,
    children: [
      {
        id: id(),
        type: "icon",
        icon,
        icon_size: 24,
        radius: l.look === "a" ? 99 : 16,
        padding: sides(17, 17, 17, 17),
        ...(lit ? { background: l.k.fill, dark_background: l.k.darkFill, color: l.k.onFill, dark_color: l.k.darkOnFill } : { background: l.k.surface, dark_background: l.k.darkSurface, border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1, color: l.k.accent, dark_color: l.k.darkAccent }),
      },
      { id: id(), type: "text", text: ctx.w(word), max_lines: 1, text_align: "center", font: { family: l.family, size: 11.5, weight: 500 }, color: l.k.muted, dark_color: l.k.darkMuted },
    ],
  });
  const tile = (word: SectionWord, icon: string, action: Action): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    gap: 6,
    cross: "center",
    radius: l.look === "a" ? 20 : 16,
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
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...signatureHeader(l.k, "glass") },
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        searchPill(ctx, l, "btSearchAll", sides(6, 16, 4, 16)),
        {
          id: id(),
          type: "row",
          name: ctx.w("btQuick"),
          align: "between",
          padding: sides(12, 18, 8, 18),
          children: [quick("btNewIn", "new_releases", false, shop), quick("btOffers", "percent", false, shop), quick("btQuizShort", "quiz", true, ownPage(ctx, QUIZ_PAGE)), quick("btCatRoutines", "redeem", false, shop)],
        },
        {
          id: id(),
          type: "categories",
          name: ctx.w("btCategoryMenu"),
          source: "products",
          style: "rows",
          category_menu: l.look === "a" ? { look: "label", numbers: false, radius: 22 } : { look: "lead", radius: 18 },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          padding: sides(10, 0, 6, 0),
        },
        { id: id(), type: "divider", height: 1, background: l.k.line, dark_background: l.k.darkLine, margin: sides(14, 16, 14, 16) },
        {
          id: id(),
          type: "row",
          name: ctx.w("btMenuAccount"),
          gap: 8,
          padding: sides(0, 16, 0, 16),
          children: [tile("btAccount", "person", screen("account")), tile("btOrders", "package_2", screen("orders")), tile("btLanguage", "language", screen("settings"))],
        },
        {
          id: id(),
          type: "row",
          name: ctx.w("btContact"),
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
            { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, l, "btContact", { size: 14, weight: 600 }), say(ctx, l, "btContactLine", { size: 12 }, { muted: true, max_lines: 2 })] },
            { id: id(), type: "icon", icon: "chat", icon_size: 20, color: l.k.ink, dark_color: l.k.darkInk },
          ],
        },
      ],
    },
  };
}

/** The skin quiz's own page (the menu's quick way in opens it): a few words, the quiz, and the promise under it. */
export function skinQuizPage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "btQuizPage" });
  const photo = sigPhoto(ctx, P("quiz"));
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...signatureHeader(l.k, "glass") },
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        ...(photo ? [{ id: id(), type: "image" as const, name: ctx.w("btQuizPage"), image_url: photo, height: 180, radius: l.look === "a" ? 26 : 20, fit: "cover" as const, margin: sides(6, 16, 4, 16) }] : []),
        { ...say(ctx, l, "btQuizIntro", { size: 14, line_height: 1.5 }, { muted: true }), padding: sides(10, 16, 4, 16) },
        skinQuiz(ctx, l, true),
        {
          id: id(),
          type: "row",
          name: ctx.w("btQuizNote"),
          gap: 12,
          cross: "center",
          radius: 18,
          padding: sides(12, 14, 12, 14),
          margin: sides(12, 16, 0, 16),
          background: l.tint.day,
          dark_background: l.tint.night,
          children: [
            { id: id(), type: "icon", icon: "verified", icon_size: 22, color: l.k.accent, dark_color: l.k.darkAccent },
            say(ctx, l, "btQuizNote", { size: 12.5, weight: 500, line_height: 1.4 }, { width: "fill", max_lines: 3 }),
          ],
        },
      ],
    },
  };
}

/** Over the shop: its categories as chips, and a banner of the week's edit. */
function shopTop(ctx: SectionContext, l: Look): StudioNode[] {
  return [
    { id: idOf(ctx)(), type: "categories", name: ctx.w("btCategories"), source: "products", style: "chips", padding: sides(4, 12, 4, 12) },
    { ...heroCard(ctx, l, l.look === "a" ? "hero-cream" : "hero-lab", "btEditKicker", "btEditTitle", "btShopEdit"), height: 160, margin: sides(6, 16, 6, 16) },
  ];
}

/** Over the cart: the shop's code for a first order, then its promise (genuine, the expiry on every page) and its returns. */
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
    margin: sides(8, 16, 0, 16),
    background: l.tint.day,
    dark_background: l.tint.night,
    children: [{ id: id(), type: "icon", icon, icon_size: 22, color: l.k.accent, dark_color: l.k.darkAccent }, say(ctx, l, word, { size: 13, weight: 500, line_height: 1.4 }, { width: "fill", max_lines: 3 })],
  });
  return [
    { id: id(), type: "coupon", name: ctx.w("btCoupon"), code: BEAUTY_COUPON_CODE, coupon: { look: l.look === "a" ? "ticket" : "glass", bind: "public" }, radius: 18, color: l.k.fill, margin: sides(10, 16, 4, 16) },
    note("verified", "btGenuineNote"),
    { ...note("sync", "btReturnsNote"), margin: sides(8, 16, 4, 16) },
  ];
}

/** Over the orders: how an order travels (the person's newest order on its way, else the first step lit). */
function ordersTop(ctx: SectionContext, l: Look): StudioNode[] {
  const step = (title: SectionWord, text: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    headOf(ctx, l, "btTrack", null, undefined, undefined, sides(10, 16, 6, 16)),
    {
      id: idOf(ctx)(),
      type: "timeline",
      name: ctx.w("btTrack"),
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
      entries: [step("btTrack1", "btTrack1Text", true), step("btTrack2", "btTrack2Text"), step("btTrack3", "btTrack3Text"), step("btTrack4", "btTrack4Text")],
    },
  ];
}

/** The demo's code shown in the app (lib/demo/beauty.ts makes it). */
export const BEAUTY_COUPON_CODE = "VELOURS10";

function beautyOver(l: Look) {
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

function beautyPages(l: Look) {
  return (ctx: SectionContext) => [
    { slug: MENU_PAGE, title: "btCategoryMenu" as SectionWord, studio: categoryMenuPage(ctx, l) },
    { slug: QUIZ_PAGE, title: "btQuizPage" as SectionWord, studio: skinQuizPage(ctx, l) },
  ];
}

/** The five tabs of the floating bar: Home, Shop, Cart, Orders, Account (as the clothes type's). */
export function beautyTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  return clothesTabs(tabs);
}

// ——— The sign-in screens, the account menus, the bars and the two looks ———

const VELOURS_SCREENS = signatureScreens({
  style: "photo",
  photo: P("welcome"),
  title: { en: "Welcome to your beauty house", ar: "أهلًا بكِ في دار جمالكِ", tr: "Güzellik evinize hoş geldiniz" },
  subtitle: { en: "Sign in to follow your orders, your shades and your routine.", ar: "سجّلي الدخول لتتابعي طلباتكِ ودرجاتكِ وروتينكِ.", tr: "Siparişlerinizi, tonlarınızı ve rutininizi takip etmek için giriş yapın." },
  menu: "cover",
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

const NAQA_SCREENS = signatureScreens({
  style: "photo",
  photo: P("hero-calm"),
  title: { en: "Skincare that works", ar: "عناية تعمل لبشرتكِ", tr: "İşe yarayan cilt bakımı" },
  subtitle: { en: "Sign in for your skin type, your routine and your orders.", ar: "سجّلي الدخول لنوع بشرتكِ وروتينكِ وطلباتكِ.", tr: "Cilt tipiniz, rutininiz ve siparişleriniz için giriş yapın." },
  menu: "night",
  accent: B.fill,
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** A's floating bar: white by day, plum-black by night, the open tab a blush pill in plum with its name. */
export const VELOURS_BAR = signatureBar(A, { design: "float", background: "#FFFFFF", dark_background: "#221C1F", active: A.fill, dark_active: "#EFA6C3", inactive: "#8F7F83", dark_inactive: "#A99A9E", labels: "active", radius: 30, margin: 12 });
/** B's floating bar: ink by day and by night, the open tab a porcelain pill. */
export const NAQA_BAR = signatureBar(B, { design: "float", background: "#0F1A20", dark_background: "#1C2428", active: "#FFFFFF", dark_active: "#E8EEF0", inactive: "#9AA8AF", dark_inactive: "#8E9BA2", labels: "active", radius: 30, margin: 12 });

export const VELOURS_A: SignatureDesign = {
  demo: "beauty",
  variant: "a",
  template: { id: "beauty_signature_a", icon: "spa", fits: { types: ["store"], plain: true } },
  home: veloursHome,
  over: beautyOver(LOOK_A),
  tabs: beautyTabs,
  pages: beautyPages(LOOK_A),
  bar: VELOURS_BAR,
  look: { header: signatureHeader(A, "glass"), background: A.page, dark_background: A.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    // Look A is the demo: its main colour the demo's (lib/demo/content.ts).
    appearance: { secondary_color: A_GOLD.day, font: "Lexend", font_family: READEX, dark_background: A.darkPage, dark_surface: A.darkSurface },
    screens: VELOURS_SCREENS,
  },
};

export const NAQA_B: SignatureDesign = {
  demo: "beauty",
  variant: "b",
  template: { id: "beauty_signature_b", icon: "healing", fits: { types: ["store"], plain: true } },
  home: naqaHome,
  over: beautyOver(LOOK_B),
  tabs: beautyTabs,
  pages: beautyPages(LOOK_B),
  bar: NAQA_BAR,
  look: { header: signatureHeader(B, "glass"), background: B.page, dark_background: B.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    primary: B.fill,
    appearance: { secondary_color: "#0F1A20", font: "Manrope", font_family: PLEX, dark_background: B.darkPage, dark_surface: B.darkSurface },
    screens: NAQA_SCREENS,
  },
};

// ——— Every part of the two looks as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;

const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};

/** A part of a page on its own (in any store's page its own pages' links open the shop: a store has no skin quiz page of its own). */
const alone = (ctx: SectionContext): SectionContext => ({ ...ctx, ownPages: false });

export const BEAUTY_SECTIONS: readonly SectionInfo[] = [
  // The category menu: every main category a row of cards (A's titled rows, B's tall card first).
  { id: "bt_category_menu", icon: "menu_open", isNew: true, fits: STORE_PLAIN, make: one((ctx) => categoryMenuPage(ctx, LOOK_A).body.children!.find((n) => n.type === "categories")!) },
  { id: "bt_category_menu_lead", icon: "view_list", isNew: true, fits: STORE_PLAIN, make: one((ctx) => categoryMenuPage(ctx, LOOK_B).body.children!.find((n) => n.type === "categories")!) },
  // The compact hero carousels, the next card peeking.
  { id: "bt_peek_hero", icon: "view_carousel", isNew: true, fits: STORE_PLAIN, make: one((ctx) => heroCarousel(ctx, LOOK_A, A_HEROES, "btDiscover")) },
  { id: "bt_peek_hero_lab", icon: "view_carousel", isNew: true, fits: STORE_PLAIN, make: one((ctx) => heroCarousel(ctx, LOOK_B, B_HEROES, "btShopNow")) },
  // The flash deals with their countdown.
  { id: "bt_deal", icon: "bolt", isNew: true, fits: STORE_PLAIN, make: one((ctx) => dealCard(ctx, LOOK_A, "carousel")) },
  // The best sellers as cards, and B's grid.
  { id: "bt_best", icon: "trending_up", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "btBest", { word: "btSeeAll", action: shop }, "btBestLine"), productRow(ctx, LOOK_A, "btBest", "popular")]) },
  { id: "bt_picks", icon: "grid_view", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_B, "btPicks", { word: "btSeeAll", action: shop }, undefined, "btPicksKicker"), productGrid(ctx, LOOK_B)]) },
  // The shade finder.
  { id: "bt_shades", icon: "palette", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "btShadeHead", null, "btShadeLine"), shadeFinder(ctx, LOOK_A)]) },
  // Know your skin type: A's plum card, B's clinic card.
  { id: "bt_quiz", icon: "quiz", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "btQuizHead", null), skinQuiz(ctx, LOOK_A)]) },
  { id: "bt_quiz_lab", icon: "quiz", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_B, "btQuizHead", null, undefined, "btQuizKicker"), skinQuiz(ctx, LOOK_B)]) },
  // The daily routine and the ready-made routines.
  { id: "bt_routine", icon: "light_mode", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "btRoutineTitle", null, "btRoutineLine"), routineCard(ctx, LOOK_A)]) },
  { id: "bt_routine_steps", icon: "timeline", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_B, "btRoutineB", null, undefined, "btRoutineKicker"), routineCard(ctx, LOOK_B)]) },
  // The care rituals as photo tiles, the brands as round marks.
  { id: "bt_rituals", icon: "dashboard", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(alone(ctx), LOOK_A, "btRituals", { word: "btShopAll", action: shop }), ritualTiles(ctx, LOOK_A, A_RITUALS)]) },
  { id: "bt_brands", icon: "workspace_premium", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "btBrands", { word: "btAllBrands", action: shop }), brandCircles(ctx, LOOK_A)]) },
  // The trust strip: genuine, expiry, cruelty-free, delivery and returns.
  { id: "bt_trust", icon: "verified", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "btTrust", null), trustStrip(ctx, LOOK_A)]) },
  // B's tiles by skin type and need, its active ingredients and its SPF banner.
  { id: "bt_concerns", icon: "grid_view", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(alone(ctx), LOOK_B, "btConcerns", { word: "btSeeAll", action: shop }, undefined, "btConcernsKicker"), concernTiles(ctx, LOOK_B)]) },
  { id: "bt_ingredients", icon: "layers", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_B, "btIngredients", null, undefined, "btIngredientsKicker"), ingredientCards(ctx, LOOK_B)]) },
  { id: "bt_spf", icon: "light_mode", isNew: true, fits: STORE_PLAIN, make: one((ctx) => spfBanner(ctx, LOOK_B)) },
];
