import type { Action, StudioEntry, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigImage, sigPhoto, sigTexts, signatureBar, signatureHeader, type SignatureInk } from "./food-signature-parts";
import { APP_WORDS } from "../app-words";
import { clothesTabs, MENU_PAGE } from "./clothes-signature";

/**
 * 209 Toot (تُوت), Studio's toys type (lib/studio/shop-types.ts): a Studio
 * demo of the store kind and its two Signature looks, each a whole store
 * project (its home, its menu, its shop, cart and orders, its tabs, its
 * floating bar, its sign-in screen and account), built only from Studio's
 * elements so every part is the owner's to change, as the owner approved
 * them (a real native phone app: a small header with the menu button, a
 * search pill, the categories, a compact hero carousel of about 210 px with
 * the next card peeking, tight sections and a floating bar).
 *
 * A · TOOT, playful and colourful: plum and gold on warm cream, round
 * photo circles and soft cards, Baloo Bhaijaan 2; a plum night.
 * B · MUKAAB, calm and educational (Montessori): one clear blue on cool
 * grey, square tiles and numbered kickers, Rubik; a blue-black night.
 *
 * Both share the parts a toy shop needs, each a reusable element: the
 * category menu (the `categories` element drawn as `rows`: every main
 * category of the shop a row of cards, its "All" card first, its
 * sub-categories after it), shopping by age (each age a tile or a chip
 * named as the shop's age category, which it opens), the gift finder (the
 * `quiz` element: three questions, each answer counting for one of the
 * ages, the result opening it), the gift wraps, "gifts under a price"
 * (`items` with `max_price`), the shop's flash sale with its live countdown
 * and the shop's safety promises. Nothing is made up: the lists, the
 * categories, the sale and the prices are the shop's own; the owner's words
 * are in [brackets] (the demo fills them, lib/studio/demo-templates.ts).
 */

// ——— The two looks' colours and faces ———

/** A · TOOT: warm cream and plum by day, a deep plum night. */
export const TOOT_INK: SignatureInk = {
  page: "#F7F2EA",
  darkPage: "#141113",
  surface: "#FFFCF7",
  darkSurface: "#1E1A1D",
  ink: "#2B2421",
  darkInk: "#F3EDE9",
  muted: "#685D57",
  darkMuted: "#BCB2AD",
  line: "#E9E0D3",
  darkLine: "#2E282B",
  accent: "#7B2D4E",
  darkAccent: "#EAA9C5",
  fill: "#7B2D4E",
  darkFill: "#97436C",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const A = TOOT_INK;
/** A's soft tint (the gift finder, the icons' discs) and its photo tiles' backdrop. */
const A_TINT = { day: "#F4E4EA", night: "#36202B" };
const A_TILE = { day: "#F1E9DD", night: "#282326" };
/** A's safety green. */
const A_GOOD = { day: "#3E7A5C", night: "#86C9A4", soft: "#E3EFE6", darkSoft: "#1D2B23" };
const BALOO = "Baloo Bhaijaan 2";

/** B · MUKAAB: cool grey and one clear blue by day, a blue-black night. */
export const MUKAAB_INK: SignatureInk = {
  page: "#F2F3F6",
  darkPage: "#0B0D12",
  surface: "#FFFFFF",
  darkSurface: "#151820",
  ink: "#12151C",
  darkInk: "#F1F3F8",
  muted: "#505767",
  darkMuted: "#AAB1C0",
  line: "#E2E5EB",
  darkLine: "#232834",
  accent: "#2F4FE0",
  darkAccent: "#9CB0FF",
  fill: "#2F4FE0",
  darkFill: "#4462F0",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const B = MUKAAB_INK;
const B_TINT = { day: "#E7EBFE", night: "#1A2146" };
const B_TILE = { day: "#EAECF1", night: "#1E222D" };
/** B's night card (the lab, the gift finder's button, the wrap banner): near black by day and by night. */
const B_NIGHT = { day: "#12151C", night: "#1A1E2A" };
const RUBIK = "Rubik";

/** Toot's photos (public/toys-photos, CC0 from StockSnap, credited in CREDITS.md). */
const P = (name: string) => `/toys-photos/${name}.jpg`;

const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
/** The category menu where the whole look is made (the demo, a project started from it); where its home is made alone, the shop. */
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));

/** The look's ink, its tints and its face. */
interface Look {
  k: SignatureInk;
  tint: { day: string; night: string };
  tile: { day: string; night: string };
  family: string;
  look: "a" | "b";
}
const LOOK_A: Look = { k: A, tint: A_TINT, tile: A_TILE, family: BALOO, look: "a" };
const LOOK_B: Look = { k: B, tint: B_TINT, tile: B_TILE, family: RUBIK, look: "b" };

/** The ages, "By age"'s sub-categories, by the words that name them (lib/demo/toys.ts TOYS_AGES): each opens its age. */
export const TOYS_AGE_WORDS = ["tyAge0", "tyAge1", "tyAge3", "tyAge6", "tyAge9"] as const satisfies readonly SectionWord[];

// ——— What both looks are made of ———

const face = (l: Look, size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: l.family, size, weight: 700, line_height: 1.2, ...extra });

function say(ctx: SectionContext, l: Look, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, l.k, ctx.w(word), font, extra);
}

/** White words on a photo. */
const onPhoto = { color: "#FFFFFF", dark_color: "#FFFFFF" } as const;

/** A section's title (a small kicker with a dash over it in B), a line under it, a quieter link at its end. */
function headOf(ctx: SectionContext, l: Look, title: SectionWord, link: { word: SectionWord; action: Action } | null, line?: SectionWord, kicker?: SectionWord, padding: StudioSides = sides(24, 16, 12, 16)): StudioNode {
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
          ...(kicker ? [say(ctx, l, kicker, { size: 12, weight: 600 }, { accent: true, max_lines: 1 })] : []),
          say(ctx, l, title, face(l, l.look === "a" ? 21 : 22, { weight: l.look === "a" ? 700 : 600 }), { max_lines: 2 }),
          ...(line ? [say(ctx, l, line, { size: 12.5 }, { muted: true, max_lines: 2 })] : []),
        ],
      },
      ...(link
        ? [
            {
              id: id(),
              type: "row" as const,
              name: ctx.w(link.word),
              height: l.look === "a" ? 30 : 38,
              radius: l.look === "a" ? 15 : 12,
              gap: 4,
              cross: "center" as const,
              padding: sides(0, 12, 0, 12),
              ...(l.look === "b" ? { background: l.k.surface, dark_background: l.k.darkSurface, border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1 } : {}),
              action: link.action,
              children: [say(ctx, l, link.word, { size: 12.5, weight: 600 }, l.look === "a" ? { accent: true } : {})],
            },
          ]
        : []),
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
    radius: l.look === "a" ? 25 : 16,
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

/** One hero card: a photo under a shade, its kicker, headline and a button. */
function heroCard(ctx: SectionContext, l: Look, photo: string, kicker: SectionWord, title: SectionWord, button: SectionWord): StudioNode {
  const id = idOf(ctx);
  const shade = l.look === "a" ? "#2B2421" : "#0B0D12";
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w(title),
    image_url: sigPhoto(ctx, P(photo)),
    height: 210,
    radius: l.look === "a" ? 26 : 20,
    background: shade,
    scrim: { color: shade, from: 0.15, middle: 0.2, at: 45, to: 0.75 },
    align: "end",
    padding: sides(16, 18, 16, 18),
    action: shop,
    children: [
      say(ctx, l, kicker, { size: 11.5, weight: 600, letter_spacing: 0.4 }, { ...onPhoto, opacity: 0.92, max_lines: 1 }),
      say(ctx, l, title, face(l, l.look === "a" ? 24 : 23, { weight: l.look === "a" ? 700 : 600, line_height: 1.15 }), { ...onPhoto, max_lines: 2, margin: sides(6, 0, 0, 0) }),
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
        background: l.k.fill,
        dark_background: l.k.darkFill,
        color: "#FFFFFF",
        dark_color: "#FFFFFF",
        font: { size: 13.5, weight: 700 },
        motion: { press: "shrink" },
        action: shop,
      },
    ],
  };
}

/** The compact hero carousel: cards about 210 px tall, the next one peeking, its place under them. */
function heroCarousel(ctx: SectionContext, l: Look, cards: readonly [string, SectionWord, SectionWord][], button: SectionWord): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "slider",
    name: ctx.w("tyHeroName"),
    height: 210,
    per_view: 1.12,
    gap: 10,
    autoplay: true,
    interval_ms: 5000,
    dots: true,
    indicator: l.look === "a" ? "dots" : "count",
    padding: sides(12, 16, 4, 16),
    children: cards.map(([photo, kicker, title]) => heroCard(ctx, l, photo, kicker, title, button)),
  };
}

/** A product card: its photo with the sale's share off, its name and its price (struck through before while on sale). */
function productCard(ctx: SectionContext, l: Look, width: StudioNode["width"], height: number): StudioNode {
  const id = idOf(ctx);
  const a = l.look === "a";
  return {
    id: id(),
    type: "column",
    width,
    gap: 4,
    children: [
      {
        id: id(),
        type: "stack",
        width,
        height,
        children: [
          { id: id(), type: "image", bind: "image", width, height, radius: a ? 22 : 18, fit: "cover", background: l.tile.day, dark_background: l.tile.night },
          { id: id(), type: "text", bind: "sale", font: { size: 11, weight: 700 }, color: "#FFFFFF", dark_color: "#FFFFFF", background: l.k.fill, dark_background: l.k.darkFill, radius: a ? 10 : 8, padding: sides(3, 8, 3, 8), place: { x: 6, y: 5 } },
        ],
      },
      { id: id(), type: "text", bind: "title", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: a ? 15 : 14, weight: a ? 600 : 500 }, margin: sides(4, 0, 0, 0) },
      {
        id: id(),
        type: "row",
        gap: 6,
        cross: "center",
        children: [
          { id: id(), type: "text", bind: "price", max_lines: 1, color: a ? l.k.ink : l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 15, weight: 700 } },
          { id: id(), type: "text", bind: "was_price", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 12 } },
        ],
      },
    ],
  };
}

/** A row of the shop's products. */
function productRow(ctx: SectionContext, l: Look, name: SectionWord, query: { sort: "newest" | "popular"; featured?: boolean; max_price?: number }): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "items",
    name: ctx.w(name),
    source: "products",
    layout: "carousel",
    gap: 12,
    padding: sides(0, 16, 0, 16),
    query: { limit: 8, category_id: null, featured: query.featured ?? false, sort: query.sort, ids: [], ...(query.max_price ? { max_price: query.max_price } : {}) },
    card: productCard(ctx, l, l.look === "a" ? 156 : 160, l.look === "a" ? 190 : 176),
  };
}

/** Two columns of the shop's products. */
function productGrid(ctx: SectionContext, l: Look, name: SectionWord): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "items",
    name: ctx.w(name),
    source: "products",
    layout: "grid",
    columns: 2,
    gap: 12,
    padding: sides(0, 16, 0, 16),
    query: { limit: 4, category_id: null, featured: true, sort: "popular", ids: [] },
    card: productCard(ctx, l, "fill", l.look === "a" ? 196 : 180),
  };
}

/** "Gifts under a price": the shop's products at that price or under (`max_price`, the shop's currency), wrapped with a card. */
function underPrice(ctx: SectionContext, l: Look, price: 100 | 200, kicker?: SectionWord): StudioNode[] {
  const title: SectionWord = price === 100 ? "tyUnder100" : "tyUnder200";
  return [headOf(ctx, l, title, { word: "tySeeAll", action: shop }, l.look === "a" ? "tyUnderLine" : undefined, kicker), productRow(ctx, l, title, { sort: "popular", max_price: price })];
}

/** The shop's flash sale (the `flash_sale` element: the sale ending soonest, its toys at was and now prices, a live countdown and the stock left; left out while none is on). */
function dealCard(ctx: SectionContext, l: Look, look: "banner" | "carousel"): StudioNode {
  const t = sigTexts(ctx, { text: "tyDeal" });
  return {
    id: idOf(ctx)(),
    type: "flash_sale",
    name: ctx.w("tyDeal"),
    text: t.text,
    translations: t.translations,
    flash_sale: { look, limit: 6, countdown: true, stock_bar: true, accent: l.k.fill },
    radius: l.look === "a" ? 26 : 20,
    margin: sides(22, 16, 4, 16),
  };
}

// ——— Shopping by age ———

/** A's ages as tall photo tiles, each named as the shop's age category (and so opening it). */
function ageTiles(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const photos = ["sleeping-baby", "toddler-play", "toddler-bear", "girl-drawing", "football-boy"];
  // A slider of photo tiles, a little over two and a half in view (photo tiles in a scrolling row aren't drawn by the app).
  return {
    id: id(),
    type: "slider",
    name: ctx.w("tyByAgeTitle"),
    height: 150,
    per_view: 2.6,
    gap: 10,
    dots: false,
    padding: sides(0, 16, 0, 16),
    children: TOYS_AGE_WORDS.map((word, i) => ({
      id: id(),
      type: "photo_hero" as const,
      name: ctx.w(word),
      image_url: sigPhoto(ctx, P(photos[i]!)),
      height: 150,
      radius: 22,
      background: l.tile.day,
      scrim: { color: "#2B2421", from: 0, middle: 0.05, at: 55, to: 0.72 },
      align: "end" as const,
      padding: sides(10, 10, 10, 10),
      action: shop,
      children: [say(ctx, l, word, face(l, 16, { line_height: 1.1 }), { ...onPhoto, max_lines: 2 })],
    })),
  };
}

/** B's ages as square chips in a card under the search, each named as the shop's age category (and so opening it). */
function ageChips(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("tyAgeBoxTitle"),
    gap: 10,
    margin: sides(6, 16, 0, 16),
    children: [
      say(ctx, l, "tyAgeBoxTitle", { size: 13, weight: 500 }, { muted: true, max_lines: 1 }),
      {
        id: id(),
        type: "row",
        name: ctx.w("tyByAgeTitle"),
        gap: 8,
        scroll: true,
        children: TOYS_AGE_WORDS.map((word, i) => ({
          id: id(),
          type: "column" as const,
          name: ctx.w(word),
          width: 84,
          height: 64,
          radius: 16,
          align: "center" as const,
          cross: "center" as const,
          padding: sides(6, 8, 6, 8),
          ...(i === 2
            ? { background: l.k.fill, dark_background: l.k.darkFill }
            : { background: l.k.surface, dark_background: l.k.darkSurface, border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1 }),
          action: shop,
          children: [
            {
              ...say(ctx, l, word, face(l, 14.5, { weight: 600, line_height: 1.15 }), { max_lines: 2, text_align: "center" }),
              ...(i === 2 ? { color: "#FFFFFF", dark_color: "#FFFFFF" } : {}),
            },
          ],
        })),
      },
    ],
  };
}

// ——— Safety first ———

/** A's "Their safety first": a shield, the promise and four of its parts in tiles. */
function safetyCard(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const cell = (icon: string, word: SectionWord): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(word),
    gap: 8,
    cross: "center",
    radius: 16,
    padding: sides(12, 12, 12, 12),
    background: l.k.page,
    dark_background: l.k.darkPage,
    children: [
      { id: id(), type: "icon", icon, icon_size: 20, color: A_GOOD.day, dark_color: A_GOOD.night },
      say(ctx, l, word, { size: 12.5, weight: 500, line_height: 1.3 }, { width: "fill", max_lines: 2 }),
    ],
  });
  return {
    id: id(),
    type: "column",
    name: ctx.w("tySafeTitle"),
    gap: 12,
    radius: 26,
    padding: sides(16, 14, 14, 14),
    margin: sides(24, 16, 4, 16),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    children: [
      {
        id: id(),
        type: "row",
        gap: 12,
        cross: "center",
        children: [
          { id: id(), type: "icon", icon: "verified", icon_size: 24, color: A_GOOD.day, dark_color: A_GOOD.night, background: A_GOOD.soft, dark_background: A_GOOD.darkSoft, radius: 99, padding: sides(10, 10, 10, 10) },
          { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, l, "tySafeTitle", face(l, 18)), say(ctx, l, "tySafeLine", { size: 12.5 }, { muted: true, max_lines: 2 })] },
        ],
      },
      {
        id: id(),
        type: "grid",
        columns: 2,
        gap: 8,
        children: [cell("yard", "tySafe1"), cell("check_circle", "tySafe2"), cell("task_alt", "tySafe3"), cell("workspace_premium", "tySafe4")],
      },
    ],
  };
}

/** B's "Safe before it is fun": four promises in numbers. */
function promises(ctx: SectionContext, l: Look): StudioNode[] {
  const id = idOf(ctx);
  const stat = (icon: string, value: SectionWord, text: SectionWord): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(value),
    gap: 6,
    radius: 20,
    padding: sides(14, 14, 14, 14),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    children: [
      { id: id(), type: "icon", icon, icon_size: 22, color: l.k.accent, dark_color: l.k.darkAccent },
      say(ctx, l, value, face(l, 24, { weight: 600 }), { max_lines: 1, margin: sides(6, 0, 0, 0) }),
      say(ctx, l, text, { size: 12.5, line_height: 1.35 }, { muted: true, max_lines: 3 }),
    ],
  });
  return [
    headOf(ctx, l, "tyPromiseTitle", null, undefined, "tyPromiseKicker"),
    {
      id: id(),
      type: "grid",
      name: ctx.w("tyPromiseTitle"),
      columns: 2,
      gap: 10,
      padding: sides(0, 16, 0, 16),
      children: [stat("verified", "tyStat1", "tyStat1Text"), stat("fact_check", "tyStat2", "tyStat2Text"), stat("local_florist", "tyStat3", "tyStat3Text"), stat("sync", "tyStat4", "tyStat4Text")],
    },
  ];
}

// ——— Birthday gifts: the gift finder and the wraps ———

/** The gift finder's answers, in the order of its results (the ages): answer i counts for age i. */
const QUIZ_AGES = ["tyQuizAge1", "tyQuizAge2", "tyQuizAge3", "tyQuizAge4", "tyQuizAge5"] as const satisfies readonly SectionWord[];
const QUIZ_LOVES = ["tyQuizLove1", "tyQuizLove2", "tyQuizLove3", "tyQuizLove4", "tyQuizLove5"] as const satisfies readonly SectionWord[];
const QUIZ_BUDGETS = ["tyQuizBudget1", "tyQuizBudget2", "tyQuizBudget3", "tyQuizBudget4", "tyQuizBudget5"] as const satisfies readonly SectionWord[];

/** One of the gift finder's questions: its words, and its answers one per line, in Studio's other languages too. */
function question(ctx: SectionContext, title: SectionWord, answers: readonly SectionWord[]): StudioEntry {
  const lang = ctx.lang ?? "en";
  const translations: Record<string, Record<string, string>> = {};
  for (const l of (["en", "ar", "tr"] as const).filter((x) => x !== lang)) translations[l] = { title: APP_WORDS[l][title], text: answers.map((a) => APP_WORDS[l][a]).join("\n") };
  return { title: ctx.w(title), text: answers.map((a) => ctx.w(a)).join("\n"), translations: translations as StudioEntry["translations"] };
}

/**
 * The gift finder (the `quiz` element): the child's age, what they love
 * and the budget, each answer counting for the age in its place; the
 * result is one of the shop's ages, named as its category (and so opening it).
 */
function giftQuiz(ctx: SectionContext, l: Look): StudioNode {
  const t = sigTexts(ctx, { text: l.look === "a" ? "tyGiftTitle" : "tyGiftBTitle", title: "tyGiftButton" });
  const icons = ["child_care", "category", "celebration", "auto_stories", "travel_explore"];
  const photos = ["sleeping-baby", "toddler-play", "toddler-bear", "girl-drawing", "football-boy"];
  const results: StudioEntry[] = TOYS_AGE_WORDS.map((word, i) => ({
    ...sigEntry(ctx, { title: word, text: (["tyResult0", "tyResult1", "tyResult3", "tyResult6", "tyResult9"] as const)[i]!, label: "tyResultButton" }),
    icon: icons[i]!,
    image_url: sigPhoto(ctx, P(photos[i]!)),
    action: shop,
  }));
  return {
    id: idOf(ctx)(),
    type: "quiz",
    name: ctx.w("tyGiftTitle"),
    text: t.text,
    title: t.title,
    translations: t.translations,
    entries: results,
    quiz: { questions: [question(ctx, "tyQuizAge", QUIZ_AGES), question(ctx, "tyQuizLove", QUIZ_LOVES), question(ctx, "tyQuizBudget", QUIZ_BUDGETS)] },
    color: l.k.ink,
    dark_color: l.k.darkInk,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    radius: l.look === "a" ? 20 : 16,
    padding: sides(14, 14, 14, 14),
    font: { family: l.family },
  };
}

/** The three wraps (the shop's add-ons, offered with every toy in the cart) as photo cards. */
function wrapCards(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const card = (photo: string, word: SectionWord, lit: boolean): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    gap: 6,
    action: shop,
    children: [
      sigImage(ctx, l.k, P(photo), { width: "fill", height: 86, radius: 16, background: l.tile.day, dark_background: l.tile.night, ...(lit ? { border_color: l.k.fill, dark_border_color: l.k.darkAccent, border_width: 2 } : {}) }),
      say(ctx, l, word, { size: 12.5, weight: 600 }, { max_lines: 1 }),
      say(ctx, l, "tyWrapNote", { size: 11 }, { muted: true, max_lines: 1 }),
    ],
  });
  return {
    id: id(),
    type: "column",
    name: ctx.w("tyWrapTitle"),
    gap: 8,
    children: [
      { id: id(), type: "row", cross: "end", gap: 8, children: [say(ctx, l, "tyWrapTitle", face(l, 15), { width: "fill", max_lines: 1 }), say(ctx, l, "tyWrapLine", { size: 11.5 }, { muted: true, max_lines: 1 })] },
      { id: id(), type: "row", gap: 8, children: [card("gift-kraft", "tyWrapKraft", true), card("gift-black", "tyWrapBlack", false), card("gift-white", "tyWrapWhite", false)] },
    ],
  };
}

/** A's birthday card: a photo and the promise, the gift finder, then the wraps, on the soft plum tint. */
function giftBox(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("tyGiftTitle"),
    gap: 14,
    radius: 28,
    padding: sides(14, 14, 16, 14),
    margin: sides(24, 16, 4, 16),
    background: l.tint.day,
    dark_background: l.tint.night,
    children: [
      {
        id: id(),
        type: "row",
        gap: 12,
        cross: "center",
        children: [
          sigImage(ctx, l.k, P("gift-confetti"), { width: 92, height: 92, radius: 20 }),
          {
            id: id(),
            type: "column",
            width: "fill",
            gap: 3,
            children: [say(ctx, l, "tyBirthday", { size: 12, weight: 600 }, { accent: true, max_lines: 1 }), say(ctx, l, "tyGiftTitle", face(l, 19), { max_lines: 2 }), say(ctx, l, "tyGiftLine", { size: 12.5 }, { muted: true, max_lines: 2 })],
          },
        ],
      },
      giftQuiz(ctx, l),
      wrapCards(ctx, l),
    ],
  };
}

/** B's gift assistant: a photo header, the gift finder, then a dark banner of the wrapping and the card. */
function giftAssistant(ctx: SectionContext, l: Look): StudioNode[] {
  const id = idOf(ctx);
  return [
    {
      id: id(),
      type: "column",
      name: ctx.w("tyGiftBTitle"),
      gap: 0,
      radius: 24,
      margin: sides(24, 16, 0, 16),
      background: l.k.surface,
      dark_background: l.k.darkSurface,
      border_color: l.k.line,
      dark_border_color: l.k.darkLine,
      border_width: 1,
      children: [
        {
          id: id(),
          type: "photo_hero",
          name: ctx.w("tyGiftBKicker"),
          image_url: sigPhoto(ctx, P("gift-white-wide")),
          height: 132,
          radius: 0,
          background: B_TILE.day,
          scrim: { color: "#0B0D12", from: 0, middle: 0.1, at: 45, to: 0.6 },
          align: "end",
          padding: sides(14, 16, 14, 16),
          children: [say(ctx, l, "tyGiftBKicker", { size: 12, weight: 600 }, { ...onPhoto, max_lines: 1 }), say(ctx, l, "tyGiftBTitle", face(l, 20, { weight: 600 }), { ...onPhoto, max_lines: 2, margin: sides(4, 0, 0, 0) })],
        },
        { ...giftQuiz(ctx, l), radius: 0, background: l.k.surface, dark_background: l.k.darkSurface },
      ],
    },
    {
      id: id(),
      type: "row",
      name: ctx.w("tyWrapBTitle"),
      gap: 12,
      cross: "center",
      radius: 22,
      padding: sides(12, 14, 12, 12),
      margin: sides(10, 16, 4, 16),
      background: B_NIGHT.day,
      dark_background: B_NIGHT.night,
      action: shop,
      children: [
        sigImage(ctx, l.k, P("gift-black"), { width: 64, height: 64, radius: 14 }),
        { id: id(), type: "column", width: "fill", gap: 3, children: [say(ctx, l, "tyWrapBTitle", face(l, 15, { weight: 600 }), { ...onPhoto, max_lines: 2 }), say(ctx, l, "tyWrapBLine", { size: 12 }, { color: "#AAB1C0", dark_color: "#AAB1C0", max_lines: 2 })] },
        { id: id(), type: "icon", icon: "arrow_forward", icon_size: 20, color: "#9CB0FF", dark_color: "#9CB0FF" },
      ],
    },
  ];
}

// ——— A's own: learn through play and the parents' guide ———

/** Learn through play: the skills a toy grows, six tiles (each opens the shop). */
function skills(ctx: SectionContext, l: Look): StudioNode[] {
  const id = idOf(ctx);
  const tile = (icon: string, word: SectionWord): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    gap: 8,
    cross: "center",
    radius: 20,
    padding: sides(14, 6, 12, 6),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    action: shop,
    children: [
      { id: id(), type: "icon", icon, icon_size: 22, color: l.k.accent, dark_color: l.k.darkAccent, background: l.tint.day, dark_background: l.tint.night, radius: 99, padding: sides(10, 10, 10, 10) },
      say(ctx, l, word, { family: l.family, size: 13, weight: 600, line_height: 1.25 }, { max_lines: 2, text_align: "center" }),
    ],
  });
  return [
    headOf(ctx, l, "tySkillsTitle", null, "tySkillsLine"),
    {
      id: id(),
      type: "grid",
      name: ctx.w("tySkillsTitle"),
      columns: 3,
      gap: 8,
      padding: sides(0, 16, 0, 16),
      children: [tile("waving_hand", "tySkillMotor"), tile("quiz", "tySkillLogic"), tile("forum", "tySkillLanguage"), tile("auto_stories", "tySkillCreative"), tile("travel_explore", "tySkillScience"), tile("groups", "tySkillTogether")],
    },
  ];
}

/** The parents' guide: two stories as photo cards, each kicker the category it opens. */
function guide(ctx: SectionContext, l: Look): StudioNode[] {
  const id = idOf(ctx);
  const card = (photo: string, kicker: SectionWord, title: SectionWord, read: SectionWord): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(title),
    width: 236,
    gap: 6,
    action: shop,
    children: [
      {
        id: id(),
        type: "stack",
        width: 236,
        height: 148,
        children: [
          sigImage(ctx, l.k, P(photo), { width: 236, height: 148, radius: 20, background: l.tile.day, dark_background: l.tile.night }),
          { ...say(ctx, l, kicker, { size: 11, weight: 600 }, { max_lines: 1, color: l.k.ink, dark_color: l.k.ink }), background: "#FFFFFF", dark_background: "#FFFFFF", radius: 10, padding: sides(3, 9, 3, 9), place: { x: 5, y: 6 } },
        ],
      },
      say(ctx, l, title, face(l, 14.5, { weight: 600 }), { max_lines: 2 }),
      { id: id(), type: "row", gap: 4, cross: "center", children: [{ id: id(), type: "icon", icon: "schedule", icon_size: 14, color: l.k.muted, dark_color: l.k.darkMuted }, say(ctx, l, read, { size: 11.5 }, { muted: true, max_lines: 1 })] },
    ],
  });
  return [
    headOf(ctx, l, "tyGuideTitle", null, "tyGuideLine"),
    { id: id(), type: "row", name: ctx.w("tyGuideTitle"), gap: 12, scroll: true, padding: sides(0, 16, 0, 16), children: [card("tent-family", "tyPlayTents", "tyGuide1", "tyRead4"), card("family-play", "tyByAge", "tyGuide2", "tyRead6")] },
  ];
}

// ——— B's own: the category tiles, the lab and the ready box ———

/** B's "What do they love to play?": the shop's main categories as square photo tiles. */
function categoryTiles(ctx: SectionContext, l: Look): StudioNode[] {
  return [
    headOf(ctx, l, "tyTilesTitle", { word: "tyAll", action: ownPage(ctx, MENU_PAGE) }, undefined, "tyTilesKicker"),
    { id: idOf(ctx)(), type: "categories", name: ctx.w("tyTilesTitle"), source: "products", style: "tiles", color: l.k.ink, dark_color: l.k.darkInk, padding: sides(0, 12, 4, 12) },
  ];
}

/** B's lab: a dark card for the shop's science toys, its subjects as chips and its category a tap away. */
function labCard(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const chip = (icon: string, word: SectionWord): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(word),
    height: 34,
    radius: 10,
    gap: 6,
    cross: "center",
    padding: sides(0, 10, 0, 10),
    border_color: "#3A4152",
    dark_border_color: "#3A4152",
    border_width: 1,
    children: [{ id: id(), type: "icon", icon, icon_size: 16, color: "#9CB0FF", dark_color: "#9CB0FF" }, say(ctx, l, word, { size: 12.5, weight: 500 }, { ...onPhoto, max_lines: 1 })],
  });
  return {
    id: id(),
    type: "column",
    name: ctx.w("tyLabTitle"),
    gap: 0,
    radius: 24,
    margin: sides(24, 16, 4, 16),
    background: B_NIGHT.day,
    dark_background: B_NIGHT.night,
    children: [
      sigImage(ctx, l.k, P("telescope-globe-wide"), { width: "fill", height: 170, radius: 0, background: B_TILE.day }),
      {
        id: id(),
        type: "column",
        gap: 8,
        padding: sides(14, 16, 16, 16),
        children: [
          say(ctx, l, "tyLabKicker", { size: 12, weight: 600 }, { color: "#9CB0FF", dark_color: "#9CB0FF", max_lines: 1 }),
          say(ctx, l, "tyLabTitle", face(l, 21, { weight: 600 }), { ...onPhoto, max_lines: 2 }),
          say(ctx, l, "tyLabLine", { size: 13 }, { color: "#AAB1C0", dark_color: "#AAB1C0", max_lines: 2 }),
          { id: id(), type: "row", gap: 8, scroll: true, margin: sides(4, 0, 4, 0), children: [chip("nights_stay", "tyLabAstro"), chip("public", "tyLabGeo"), chip("straighten", "tyLabEng"), chip("auto_awesome", "tyLabExp")] },
          {
            id: id(),
            type: "button",
            name: ctx.w("tyStem"),
            text: ctx.w("tyStem"),
            icon: "arrow_forward",
            icon_position: "end",
            width: "hug",
            height: 42,
            radius: 12,
            padding: sides(0, 16, 0, 16),
            self_align: "start",
            background: B.fill,
            dark_background: B.darkFill,
            color: "#FFFFFF",
            dark_color: "#FFFFFF",
            font: { size: 13.5, weight: 600 },
            motion: { press: "shrink" },
            action: shop,
          },
        ],
      },
    ],
  };
}

/** B's ready box: the newborn box, four photos with pluses, its price and the gift boxes a tap away. */
function readyBox(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const photo = (name: string): StudioNode => sigImage(ctx, l.k, P(name), { width: "fill", height: 72, radius: 14, background: l.k.surface, dark_background: l.k.darkSurface });
  const plus = (): StudioNode => ({ id: id(), type: "icon", icon: "add", icon_size: 16, color: l.k.accent, dark_color: l.k.darkAccent });
  return {
    id: id(),
    type: "column",
    name: ctx.w("tyBoxTitle"),
    gap: 12,
    radius: 24,
    padding: sides(16, 16, 16, 16),
    margin: sides(24, 16, 4, 16),
    background: l.tint.day,
    dark_background: l.tint.night,
    children: [
      {
        id: id(),
        type: "row",
        gap: 10,
        cross: "start",
        children: [
          { id: id(), type: "column", width: "fill", gap: 3, children: [say(ctx, l, "tyBoxKicker", { size: 12, weight: 600 }, { accent: true, max_lines: 1 }), say(ctx, l, "tyBoxTitle", face(l, 20, { weight: 600 }), { max_lines: 1 }), say(ctx, l, "tyBoxLine", { size: 12.5 }, { muted: true, max_lines: 2 })] },
          { ...say(ctx, l, "tyBoxSave", { size: 12, weight: 700 }, { max_lines: 1 }), color: "#FFFFFF", dark_color: "#FFFFFF", background: l.k.fill, dark_background: l.k.darkFill, radius: 10, padding: sides(4, 10, 4, 10) },
        ],
      },
      { id: id(), type: "row", gap: 6, cross: "center", children: [photo("crib-mobile"), plus(), photo("bear-mint"), plus(), photo("bead-maze"), plus(), photo("gift-kraft")] },
      {
        id: id(),
        type: "row",
        gap: 10,
        cross: "center",
        children: [
          say(ctx, l, "tyBoxPrice", face(l, 20, { weight: 600 }), { width: "fill", max_lines: 1 }),
          {
            id: id(),
            type: "button",
            name: ctx.w("tyGiftBoxes"),
            text: ctx.w("tyGiftBoxes"),
            icon: "redeem",
            width: "hug",
            height: 42,
            radius: 12,
            padding: sides(0, 16, 0, 16),
            background: l.k.fill,
            dark_background: l.k.darkFill,
            color: "#FFFFFF",
            dark_color: "#FFFFFF",
            font: { size: 13.5, weight: 600 },
            motion: { press: "shrink" },
            action: shop,
          },
        ],
      },
    ],
  };
}

/** The home's header: the wordmark at its start, the menu (the category menu) and the bell at its end. */
function homeHeader(ctx: SectionContext, l: Look): StudioPage["header"] {
  const t = sigTexts(ctx, { title: "tyWordmark" });
  return { type: "logo_actions", title: t.title, translations: t.translations, buttons: ["menu", "notifications"], menu_page: MENU_PAGE, background: l.k.page, dark_background: l.k.darkPage, color: l.k.ink, dark_color: l.k.darkInk };
}

// ——— A · TOOT ———

export function tootHome(ctx: SectionContext): StudioPage {
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
        searchPill(ctx, l, "tySearch"),
        { id: id(), type: "categories", name: ctx.w("tyCategories"), source: "products", style: "circles", color: l.k.ink, dark_color: l.k.darkInk, padding: sides(8, 12, 4, 12) },
        heroCarousel(
          ctx,
          l,
          [
            ["teepee", "tyHeroKicker1", "tyHeroTitle1"],
            ["girl-drawing-wide", "tyHeroKicker2", "tyHeroTitle2"],
            ["kite-wide", "tyHeroKicker3", "tyHeroTitle3"],
          ],
          "tyShopCollection",
        ),
        headOf(ctx, l, "tyByAgeTitle", { word: "tyByAge", action: shop }, "tyByAgeLine"),
        ageTiles(ctx, l),
        safetyCard(ctx, l),
        headOf(ctx, l, "tyNewIn", { word: "tySeeAll", action: shop }, "tyNewInLine"),
        productRow(ctx, l, "tyNewIn", { sort: "newest" }),
        dealCard(ctx, l, "carousel"),
        giftBox(ctx, l),
        headOf(ctx, l, "tyLoved", { word: "tySeeAll", action: shop }, "tyLovedLine"),
        productGrid(ctx, l, "tyLoved"),
        ...underPrice(ctx, l, 100),
        ...skills(ctx, l),
        ...guide(ctx, l),
      ],
    },
  };
}

// ——— B · MUKAAB ———

export function mukaabHome(ctx: SectionContext): StudioPage {
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
        searchPill(ctx, l, "tySearchB"),
        ageChips(ctx, l),
        heroCarousel(
          ctx,
          l,
          [
            ["tent-family", "tyHeroKickerB1", "tyHeroTitleB1"],
            ["globes-wide", "tyHeroKickerB2", "tyHeroTitleB2"],
            ["bubbles-girl-wide", "tyHeroKickerB3", "tyHeroTitleB3"],
          ],
          "tyDiscover",
        ),
        ...categoryTiles(ctx, l),
        labCard(ctx, l),
        headOf(ctx, l, "tyTrending", { word: "tySeeAll", action: shop }, undefined, "tyTrendingKicker"),
        productRow(ctx, l, "tyTrending", { sort: "popular" }),
        dealCard(ctx, l, "banner"),
        ...giftAssistant(ctx, l),
        headOf(ctx, l, "tyTopRated", { word: "tySeeAll", action: shop }, undefined, "tyTopRatedKicker"),
        productGrid(ctx, l, "tyTopRated"),
        ...underPrice(ctx, l, 200, "tyUnderKicker"),
        readyBox(ctx, l),
        ...promises(ctx, l),
      ],
    },
  };
}

// ——— The pages after the home (both looks) ———

/**
 * The category menu (the header's menu button opens it): the search on top,
 * quick ways in (the ages, the birthday gifts, what's new, the offers),
 * every main category of the shop a row of cards (its "All" card, then its
 * sub-categories), then the account, the orders, the language and how
 * to reach the shop.
 */
export function toysMenuPage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "tyWordmark" });
  const quick = (word: SectionWord, icon: string, lit: boolean): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(word),
    height: 42,
    radius: l.look === "a" ? 21 : 12,
    gap: 7,
    cross: "center",
    padding: sides(0, 16, 0, 14),
    action: shop,
    ...(lit ? { background: l.k.fill, dark_background: l.k.darkFill } : { background: l.k.surface, dark_background: l.k.darkSurface, border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1 }),
    children: [
      { id: id(), type: "icon", icon, icon_size: 18, color: lit ? l.k.onFill : l.k.ink, dark_color: lit ? l.k.darkOnFill : l.k.darkInk },
      { id: id(), type: "text", text: ctx.w(word), max_lines: 1, font: { size: 13.5, weight: 600 }, color: lit ? l.k.onFill : l.k.ink, dark_color: lit ? l.k.darkOnFill : l.k.darkInk },
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
    padding: sides(14, 4, 12, 4),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    action,
    children: [
      { id: id(), type: "icon", icon, icon_size: 22, color: l.k.accent, dark_color: l.k.darkAccent },
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
        searchPill(ctx, l, "tySearchAll", sides(6, 16, 4, 16)),
        {
          id: id(),
          type: "row",
          name: ctx.w("tyQuick"),
          gap: 8,
          scroll: true,
          padding: sides(8, 16, 8, 16),
          children: [quick("tyByAge", "child_care", true), quick("tyBirthday", "cake", false), quick("tyNewIn", "new_releases", false), quick("tyOffers", "percent", false)],
        },
        {
          id: id(),
          type: "categories",
          name: ctx.w("tyCategoryMenu"),
          source: "products",
          style: "rows",
          category_menu: { look: l.look === "a" ? "lead" : "label", radius: l.look === "a" ? 22 : 16 },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          padding: sides(6, 0, 6, 0),
        },
        { id: id(), type: "divider", height: 1, background: l.k.line, dark_background: l.k.darkLine, margin: sides(14, 16, 14, 16) },
        {
          id: id(),
          type: "row",
          name: ctx.w("tyMenuAccount"),
          gap: 8,
          padding: sides(0, 16, 0, 16),
          children: [tile("tyAccount", "person", screen("account")), tile("tyOrders", "package_2", screen("orders")), tile("tyLanguage", "language", screen("settings"))],
        },
        {
          id: id(),
          type: "row",
          name: ctx.w("tyContact"),
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
            { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, l, "tyContact", { size: 14, weight: 700 }), say(ctx, l, "tyContactLine", { size: 12 }, { muted: true, max_lines: 2 })] },
            { id: id(), type: "icon", icon: "chat", icon_size: 20, color: l.k.ink, dark_color: l.k.darkInk },
          ],
        },
      ],
    },
  };
}

/** Over the shop: its categories as chips, and a banner of the gift wrapping. */
function shopTop(ctx: SectionContext, l: Look): StudioNode[] {
  return [
    { id: idOf(ctx)(), type: "categories", name: ctx.w("tyCategories"), source: "products", padding: sides(4, 12, 4, 12) },
    { ...heroCard(ctx, l, l.look === "a" ? "wooden-figures" : "globes-wide", "tyEditKicker", "tyEditTitle", "tyShopEdit"), height: 160, margin: sides(6, 16, 6, 16) },
  ];
}

/** Over the cart: the shop's code for a first order, and the wraps, the card and the returns. */
function cartTop(ctx: SectionContext, l: Look): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "coupon", name: ctx.w("tyCoupon"), code: TOYS_COUPON_CODE, coupon: { look: l.look === "a" ? "ticket" : "glass", bind: "public" }, radius: 18, color: l.k.fill, margin: sides(10, 16, 4, 16) },
    {
      id: id(),
      type: "row",
      name: ctx.w("tyCartNote"),
      gap: 12,
      cross: "center",
      radius: 18,
      padding: sides(12, 14, 12, 14),
      margin: sides(8, 16, 4, 16),
      background: l.tint.day,
      dark_background: l.tint.night,
      children: [
        { id: id(), type: "icon", icon: "redeem", icon_size: 22, color: l.k.accent, dark_color: l.k.darkAccent },
        say(ctx, l, "tyCartNote", { size: 13, weight: 600, line_height: 1.4 }, { width: "fill", max_lines: 3 }),
      ],
    },
  ];
}

/** Over the orders: how an order travels (the person's newest order on its way, else the first step lit). */
function ordersTop(ctx: SectionContext, l: Look): StudioNode[] {
  const step = (title: SectionWord, text: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    headOf(ctx, l, "tyTrack", null, undefined, undefined, sides(10, 16, 6, 16)),
    {
      id: idOf(ctx)(),
      type: "timeline",
      name: ctx.w("tyTrack"),
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
      entries: [step("tyTrack1", "tyTrack1Text", true), step("tyTrack2", "tyTrack2Text"), step("tyTrack3", "tyTrack3Text"), step("tyTrack4", "tyTrack4Text")],
    },
  ];
}

/** The demo's code shown in the app (lib/demo/toys.ts makes it). */
export const TOYS_COUPON_CODE = "TOOT10";

function toysOver(l: Look) {
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

function toysPages(l: Look) {
  return (ctx: SectionContext) => [{ slug: MENU_PAGE, title: "tyCategoryMenu" as SectionWord, studio: toysMenuPage(ctx, l) }];
}

// ——— The sign-in screens, the account menus, the bars and the two looks ———

const TOOT_SCREENS = signatureScreens({
  style: "photo",
  photo: P("teepee"),
  title: { en: "Welcome, let's play", ar: "أهلًا بك، هيا نلعب", tr: "Hoş geldiniz, hadi oynayalım" },
  subtitle: { en: "Sign in to follow your orders and your gifts.", ar: "سجّل الدخول لتتابع طلباتك وهداياك.", tr: "Siparişlerinizi ve hediyelerinizi takip etmek için giriş yapın." },
  menu: "cover",
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

const MUKAAB_SCREENS = signatureScreens({
  style: "photo",
  photo: P("tent-family"),
  title: { en: "Learning starts with play", ar: "التعلّم يبدأ باللعب", tr: "Öğrenmek oyunla başlar" },
  subtitle: { en: "Sign in for your orders and toys picked for your child's age.", ar: "سجّل الدخول لطلباتك وألعاب مختارة لعمر طفلك.", tr: "Siparişleriniz ve çocuğunuzun yaşına göre seçilen oyuncaklar için giriş yapın." },
  menu: "night",
  accent: B.fill,
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** A's floating bar: a warm brown-black glass by day and by night, the open tab a plum pill with its name. */
export const TOOT_BAR = signatureBar(A, { design: "float", background: "#2B2421", dark_background: "#2C2629", active: A.fill, dark_active: A.darkFill, inactive: "#D9CFC1", dark_inactive: "#BCB2AD", labels: "active", radius: 30, margin: 12 });
/** B's floating bar: near black by day and by night, the open tab blue. */
export const MUKAAB_BAR = signatureBar(B, { design: "float", background: "#12151C", dark_background: "#1A1E2A", active: B.fill, dark_active: B.darkFill, inactive: "#AAB1C0", dark_inactive: "#7E8697", labels: "active", radius: 24, margin: 12 });

export const TOOT_A: SignatureDesign = {
  demo: "toys",
  variant: "a",
  template: { id: "toys_signature_a", icon: "toys", fits: { types: ["store"], plain: true } },
  home: tootHome,
  over: toysOver(LOOK_A),
  tabs: clothesTabs,
  pages: toysPages(LOOK_A),
  bar: TOOT_BAR,
  look: { header: signatureHeader(A, "glass"), background: A.page, dark_background: A.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    // Look A is the demo: its main colour the demo's (lib/demo/content.ts).
    appearance: { secondary_color: "#C08A3E", font: "Lexend", font_family: BALOO, dark_background: A.darkPage, dark_surface: A.darkSurface },
    screens: TOOT_SCREENS,
  },
};

export const MUKAAB_B: SignatureDesign = {
  demo: "toys",
  variant: "b",
  template: { id: "toys_signature_b", icon: "school", fits: { types: ["store"], plain: true } },
  home: mukaabHome,
  over: toysOver(LOOK_B),
  tabs: clothesTabs,
  pages: toysPages(LOOK_B),
  bar: MUKAAB_BAR,
  look: { header: signatureHeader(B, "glass"), background: B.page, dark_background: B.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    primary: B.fill,
    appearance: { secondary_color: "#12151C", font: "Manrope", font_family: RUBIK, dark_background: B.darkPage, dark_surface: B.darkSurface },
    screens: MUKAAB_SCREENS,
  },
};

// ——— Every part of the two looks as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;

const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};

/** Alone in any store's page: its taps open the shop, as a store has none of the look's own pages. */
const alone = (ctx: SectionContext): SectionContext => ({ ...ctx, ownPages: false });

export const TOYS_SECTIONS: readonly SectionInfo[] = [
  // The category menu: every main category a row of cards, its "All" card first (A's lead cards, B's labelled rows).
  { id: "ty_category_menu", icon: "menu_open", isNew: true, fits: STORE_PLAIN, make: one((ctx) => toysMenuPage(ctx, LOOK_A).body.children!.find((n) => n.type === "categories")!) },
  { id: "ty_category_menu_label", icon: "view_list", isNew: true, fits: STORE_PLAIN, make: one((ctx) => toysMenuPage(ctx, LOOK_B).body.children!.find((n) => n.type === "categories")!) },
  // The compact hero carousel, the next card peeking.
  { id: "ty_peek_hero", icon: "view_carousel", isNew: true, fits: STORE_PLAIN, make: one((ctx) => heroCarousel(ctx, LOOK_A, [["teepee", "tyHeroKicker1", "tyHeroTitle1"], ["kite-wide", "tyHeroKicker3", "tyHeroTitle3"]], "tyShopCollection")) },
  // Shop by age: A's photo tiles and B's chips, each opening the shop's age category of its name.
  { id: "ty_age_tiles", icon: "child_care", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "tyByAgeTitle", { word: "tyByAge", action: shop }, "tyByAgeLine"), ageTiles(ctx, LOOK_A)]) },
  { id: "ty_age_chips", icon: "family_restroom", isNew: true, fits: STORE_PLAIN, make: one((ctx) => ageChips(ctx, LOOK_B)) },
  // Safety first: A's card and B's promises in numbers.
  { id: "ty_safety", icon: "verified_user", isNew: true, fits: STORE_PLAIN, make: one((ctx) => safetyCard(ctx, LOOK_A)) },
  { id: "ty_promises", icon: "workspace_premium", isNew: true, fits: STORE_PLAIN, make: one((ctx) => promises(ctx, LOOK_B)) },
  // The toy of the day: the shop's flash sale with its countdown.
  { id: "ty_deal", icon: "bolt", isNew: true, fits: STORE_PLAIN, make: one((ctx) => dealCard(ctx, LOOK_A, "carousel")) },
  // Birthday gifts: the gift finder (a quiz whose results are the ages) with the wraps, and B's assistant.
  { id: "ty_gift_finder", icon: "quiz", isNew: true, fits: STORE_PLAIN, make: one((ctx) => giftBox(ctx, LOOK_A)) },
  { id: "ty_gift_assistant", icon: "cake", isNew: true, fits: STORE_PLAIN, make: one((ctx) => giftAssistant(ctx, LOOK_B)) },
  // Gifts under a price: the shop's products at 100 or under, and at 200 or under.
  { id: "ty_under_100", icon: "sell", isNew: true, fits: STORE_PLAIN, make: one((ctx) => underPrice(ctx, LOOK_A, 100)) },
  { id: "ty_under_200", icon: "local_offer", isNew: true, fits: STORE_PLAIN, make: one((ctx) => underPrice(ctx, LOOK_B, 200, "tyUnderKicker")) },
  // Learn through play, the parents' guide, B's category tiles, its lab and its ready box.
  { id: "ty_skills", icon: "pan_tool", isNew: true, fits: STORE_PLAIN, make: one((ctx) => skills(ctx, LOOK_A)) },
  { id: "ty_guide", icon: "menu_book", isNew: true, fits: STORE_PLAIN, make: one((ctx) => guide(ctx, LOOK_A)) },
  { id: "ty_tiles", icon: "dashboard", isNew: true, fits: STORE_PLAIN, make: one((ctx) => categoryTiles(alone(ctx), LOOK_B)) },
  { id: "ty_lab", icon: "rocket_launch", isNew: true, fits: STORE_PLAIN, make: one((ctx) => labCard(ctx, LOOK_B)) },
  { id: "ty_ready_box", icon: "inventory_2", isNew: true, fits: STORE_PLAIN, make: one((ctx) => readyBox(ctx, LOOK_B)) },
];
