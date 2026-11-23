import type { Action, StudioEntry, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { APP_WORDS } from "../app-words";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigImage, sigPhoto, sigTexts, signatureBar, type SignatureInk } from "./food-signature-parts";
import { clothesTabs, MENU_PAGE } from "./clothes-signature";
import { TOYS_AGE_WORDS, TOYS_COUPON_CODE } from "./toys-signature";

/**
 * 226 Toot's look C, the ADVENTURE MAP (the owner, 23 November 2026: every
 * type gets two new templates that look like no other): the toy shop as an
 * illustrated sea chart. Its home opens on a map card whose islands are the
 * shop's main categories (each island named as its category, and so opening
 * it), then a strip of stickers (a badge per island), the treasure chest
 * (the shop's code shown in the app), the ages as chunky coloured blocks,
 * the new treasures, the toy of the day, the gift quest (the `quiz`
 * element) and the heroes' favourites. Everything is chunky and drawn as if
 * pressed out of plastic: a thick ink outline and a solid "3D" foot under
 * every card and button (an outlined box on an ink box a few pixels taller).
 * Bright primaries (tomato red, sun yellow, leaf green, royal blue) on a
 * warm sand page; a navy night sea. Lalezar for display, Rubik for text.
 * Its bar has a big raised button in the middle (the bag). Built only from
 * Studio's elements; the islands, stickers and ages are the shop's own
 * categories, the chest its own code, the products and the sale its own.
 */

// ——— The look's colours and faces ———

export const MAP_INK: SignatureInk = {
  page: "#FFF6E3",
  darkPage: "#0F1030",
  surface: "#FFFFFF",
  darkSurface: "#1B1D47",
  ink: "#1D1A3A",
  darkInk: "#FFF6E3",
  muted: "#5C587A",
  darkMuted: "#B9B6DA",
  line: "#1D1A3A",
  darkLine: "#05061A",
  accent: "#D7322A",
  darkAccent: "#FFC629",
  fill: "#E5352C",
  darkFill: "#F2453D",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const K = MAP_INK;
/** The chunky outline and the foot under every card: ink by day, near black at night. */
const OUT = { day: K.line, night: K.darkLine };
/** The four primaries (and a grape for the fifth age), the same by day and by night. */
const RED = "#F2453D";
const YELLOW = "#FFC629";
const GREEN = "#22B062";
const BLUE = "#3D5AFE";
const GRAPE = "#8E44D9";
/** The islands' sands. */
const SANDS = ["#FFE08A", "#B8F0C9", "#FFC9C4", "#D9D2FF", "#BDE7FF"] as const;
const DISPLAY = "Lalezar";
const TEXT = "Rubik";

/** Toot's photos (public/toys-photos, CC0, credited in CREDITS.md). */
const P = (name: string) => `/toys-photos/${name}.jpg`;

const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));

const display = (size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: DISPLAY, size, weight: 400, line_height: 1.1, ...extra });
const text = (size: number, weight: NonNullable<StudioFont["weight"]> = 500, extra: Partial<StudioFont> = {}): StudioFont => ({ family: TEXT, size, weight, line_height: 1.35, ...extra });

function say(ctx: SectionContext, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, K, ctx.w(word), font, extra);
}

/** Words that stay dark on a bright fill, by day and by night. */
const onBright = { color: "#1D1A3A", dark_color: "#1D1A3A" } as const;
const onDark = { color: "#FFFFFF", dark_color: "#FFFFFF" } as const;

/**
 * The look's signature: a box pressed out of plastic. `inner` is drawn with
 * a thick ink outline on an ink box `depth` taller, the foot showing under it.
 */
function chunky(ctx: SectionContext, inner: Omit<StudioNode, "id"> & { id?: string }, o: { radius: number; depth?: number; width?: StudioNode["width"]; margin?: StudioSides; action?: Action; name?: string } ): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    ...(o.name ? { name: o.name } : inner.name ? { name: inner.name } : {}),
    ...(o.width !== undefined ? { width: o.width } : {}),
    radius: o.radius,
    padding: sides(0, 0, o.depth ?? 5, 0),
    background: OUT.day,
    dark_background: OUT.night,
    ...(o.margin ? { margin: o.margin } : {}),
    ...(o.action ? { action: o.action } : {}),
    motion: { press: "bounce" },
    children: [{ ...inner, id: inner.id ?? id(), width: "fill", radius: o.radius, border_color: OUT.day, dark_border_color: OUT.night, border_width: 2.5 } as StudioNode],
  };
}

/** A chunky button: its words on a fill, pressed out with its foot. */
function chunkyButton(ctx: SectionContext, word: SectionWord, fill: string, action: Action, o: { dark?: boolean; icon?: string; height?: number } = {}): StudioNode {
  const id = idOf(ctx);
  const ink = o.dark ? onBright : onDark;
  return chunky(
    ctx,
    {
      type: "row",
      name: ctx.w(word),
      height: o.height ?? 40,
      gap: 6,
      align: "center",
      cross: "center",
      padding: sides(0, 14, 0, 14),
      background: fill,
      dark_background: fill,
      children: [...(o.icon ? [{ id: id(), type: "icon" as const, icon: o.icon, icon_size: 18, ...ink }] : []), say(ctx, word, text(13.5, 700), { ...ink, max_lines: 1 })],
    },
    { radius: 14, depth: 4, width: "hug", action },
  );
}

/** A section's title in Lalezar, a line under it, a link at its end. */
function head(ctx: SectionContext, title: SectionWord, line?: SectionWord, link?: { word: SectionWord; action: Action }, padding: StudioSides = sides(28, 16, 12, 16)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    cross: "end",
    gap: 10,
    padding,
    children: [
      { id: id(), type: "column", width: "fill", gap: 4, children: [say(ctx, title, display(26), { max_lines: 2 }), ...(line ? [say(ctx, line, text(12.5, 400), { muted: true, max_lines: 2 })] : [])] },
      ...(link ? [say(ctx, link.word, text(13.5, 700), { color: BLUE, dark_color: "#8EA0FF", max_lines: 1, action: link.action })] : []),
    ],
  };
}

// ——— The map ———

/** One island: its photo on a blob of sand, its category's name on a flag under it (named as the category, so opening it). */
function island(ctx: SectionContext, word: SectionWord, photo: string, sand: string, place: { x: number; y: number }): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: 112,
    gap: 4,
    cross: "center",
    place,
    action: shop,
    motion: { press: "bounce", loop: "float" },
    children: [
      {
        id: id(),
        type: "row",
        width: 94,
        height: 78,
        corners: { top_start: 46, top_end: 34, bottom_end: 44, bottom_start: 30 },
        align: "center",
        cross: "center",
        background: sand,
        dark_background: sand,
        border_color: OUT.day,
        dark_border_color: OUT.night,
        border_width: 2.5,
        shadow: "medium",
        children: [sigImage(ctx, K, P(photo), { width: 60, height: 60, radius: 30, border_color: "#FFFFFF", dark_border_color: "#FFFFFF", border_width: 3 })],
      },
      { ...say(ctx, word, text(11.5, 700), { max_lines: 1, text_align: "center" }), background: K.surface, dark_background: K.darkSurface, border_color: OUT.day, dark_border_color: OUT.night, border_width: 2, radius: 10, padding: sides(2, 8, 2, 8) },
    ],
  };
}

/** A wave or the boat on the sea. */
const mark = (ctx: SectionContext, icon: string, size: number, place: { x: number; y: number }, opacity = 0.55): StudioNode => ({ id: idOf(ctx)(), type: "icon", icon, icon_size: size, color: "#FFFFFF", dark_color: "#FFFFFF", opacity, place });

/** The map card: the sea with five islands (the shop's main categories) and, at its foot, the way to the whole map (the category menu). */
function mapCard(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return chunky(
    ctx,
    {
      type: "column",
      name: ctx.w("tyMapIslands"),
      gap: 10,
      padding: sides(10, 10, 10, 10),
      gradient: { from: "#6CCDF2", to: "#1E8FD0", angle: 160 },
      background: "#3FB7E8",
      dark_background: "#16306E",
      children: [
        {
          id: id(),
          type: "stack",
          name: ctx.w("tyMapIslands"),
          width: "fill",
          height: 268,
          children: [
            mark(ctx, "auto_awesome", 22, { x: 40, y: 2 }),
            mark(ctx, "auto_awesome", 20, { x: 8, y: 44 }),
            mark(ctx, "auto_awesome", 20, { x: 74, y: 46 }),
            mark(ctx, "explore", 30, { x: 44, y: 82 }, 0.9),
            island(ctx, "tyMapCatWooden", "block-tower", SANDS[0], { x: 1, y: 0 }),
            island(ctx, "tyMapCatBuilding", "bricks-pile", SANDS[1], { x: 64, y: 3 }),
            island(ctx, "tyMapCatScience", "telescope-globe", SANDS[2], { x: 33, y: 31 }),
            island(ctx, "tyMapCatPlush", "bear-mint", SANDS[3], { x: 0, y: 56 }),
            island(ctx, "tyMapCatArts", "crayons-pastel", SANDS[4], { x: 66, y: 58 }),
          ],
        },
        {
          id: id(),
          type: "row",
          name: ctx.w("tyMapWhole"),
          gap: 8,
          cross: "center",
          radius: 16,
          padding: sides(8, 10, 8, 8),
          background: K.surface,
          dark_background: K.darkSurface,
          border_color: OUT.day,
          dark_border_color: OUT.night,
          border_width: 2,
          children: [
            { id: id(), type: "icon", icon: "explore", icon_size: 22, color: RED, dark_color: YELLOW },
            say(ctx, "tyMapIslands", display(17), { width: "fill", max_lines: 1 }),
            chunkyButton(ctx, "tyMapWhole", RED, ownPage(ctx, MENU_PAGE), { height: 34 }),
          ],
        },
      ],
    },
    { radius: 30, depth: 6, margin: sides(14, 16, 0, 16) },
  );
}

// ——— Stickers, the chest and the ages ———

/** The stickers: a badge per island, each a round chunky disc with its icon (named as its category, so opening it). */
function stickers(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  const sticker = (cat: SectionWord, word: SectionWord, icon: string, fill: string, dark = false): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(cat),
    width: 78,
    gap: 6,
    cross: "center",
    action: shop,
    children: [
      chunky(ctx, { type: "row", height: 64, align: "center", cross: "center", background: fill, dark_background: fill, children: [{ id: id(), type: "icon", icon, icon_size: 30, ...(dark ? onBright : onDark) }] }, { radius: 34, depth: 4, width: 68 }),
      say(ctx, word, text(11.5, 700), { max_lines: 1, text_align: "center" }),
    ],
  });
  return [
    head(ctx, "tyMapStickers", "tyMapStickersLine"),
    {
      id: id(),
      type: "row",
      name: ctx.w("tyMapStickers"),
      gap: 10,
      scroll: true,
      padding: sides(0, 16, 4, 16),
      children: [
        sticker("tyMapCatScience", "tyMapStk1", "travel_explore", YELLOW, true),
        sticker("tyMapCatBuilding", "tyMapStk2", "construction", GREEN),
        sticker("tyMapCatArts", "tyMapStk3", "star", RED),
        sticker("tyMapCatOutdoor", "tyMapStk4", "emoji_events", BLUE),
        sticker("tyMapCatPlush", "tyMapStk5", "favorite", GRAPE),
      ],
    },
  ];
}

/** The treasure chest: the shop's code for a first order (the `coupon` element, the shop's own) in a chunky yellow card. */
function chest(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return chunky(
    ctx,
    {
      type: "column",
      name: ctx.w("tyMapChest"),
      gap: 10,
      padding: sides(14, 14, 14, 14),
      background: YELLOW,
      dark_background: YELLOW,
      children: [
        {
          id: id(),
          type: "row",
          gap: 10,
          cross: "center",
          children: [
            { id: id(), type: "icon", icon: "redeem", icon_size: 34, ...onBright },
            { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, "tyMapChest", display(21), { ...onBright, max_lines: 1 }), say(ctx, "tyMapChestLine", text(12.5, 500), { ...onBright, max_lines: 1 })] },
          ],
        },
        { id: id(), type: "coupon", name: ctx.w("tyCoupon"), code: TOYS_COUPON_CODE, coupon: { look: "ticket", bind: "public" }, radius: 16, color: RED },
      ],
    },
    { radius: 24, depth: 5, margin: sides(18, 16, 0, 16) },
  );
}

/** The ages as chunky coloured blocks, each named as the shop's age category (and so opening it). */
function ages(ctx: SectionContext): StudioNode[] {
  const fills = [RED, YELLOW, GREEN, BLUE, GRAPE];
  return [
    head(ctx, "tyMapAges", "tyMapAgesLine"),
    {
      id: idOf(ctx)(),
      type: "row",
      name: ctx.w("tyMapAges"),
      gap: 10,
      scroll: true,
      padding: sides(0, 16, 4, 16),
      children: TOYS_AGE_WORDS.map((word, i) =>
        chunky(
          ctx,
          { type: "column", name: ctx.w(word), height: 66, align: "center", cross: "center", padding: sides(4, 8, 4, 8), background: fills[i]!, dark_background: fills[i]!, children: [say(ctx, word, display(17), { ...(i === 1 ? onBright : onDark), max_lines: 2, text_align: "center" })] },
          { radius: 18, depth: 5, width: 104, action: shop, name: ctx.w(word) },
        ),
      ),
    },
  ];
}

// ——— Products ———

/** A product as a chunky card: its photo with the sale's chip, its name, its price in Lalezar and a green plus. */
function toyCard(ctx: SectionContext, width: StudioNode["width"], photo: number): StudioNode {
  const id = idOf(ctx);
  return chunky(
    ctx,
    {
      type: "column",
      gap: 0,
      background: K.surface,
      dark_background: K.darkSurface,
      children: [
        {
          id: id(),
          type: "stack",
          width: "fill",
          height: photo,
          children: [
            { id: id(), type: "image", bind: "image", width: "fill", height: photo, corners: { top_start: 22, top_end: 22 }, fit: "cover", background: SANDS[0], dark_background: "#2B2D63" },
            { id: id(), type: "text", bind: "sale", font: text(11, 700), ...onBright, background: YELLOW, dark_background: YELLOW, border_color: OUT.day, dark_border_color: OUT.night, border_width: 2, radius: 10, padding: sides(2, 8, 2, 8), place: { x: 5, y: 6 } },
          ],
        },
        {
          id: id(),
          type: "column",
          gap: 6,
          padding: sides(10, 12, 12, 12),
          children: [
            { id: id(), type: "text", bind: "title", max_lines: 1, color: K.ink, dark_color: K.darkInk, font: text(14, 600) },
            {
              id: id(),
              type: "row",
              gap: 6,
              cross: "center",
              children: [
                { id: id(), type: "column", width: "fill", gap: 0, children: [{ id: id(), type: "text", bind: "price", max_lines: 1, color: K.ink, dark_color: K.darkInk, font: display(19) }, { id: id(), type: "text", bind: "was_price", max_lines: 1, color: K.muted, dark_color: K.darkMuted, font: text(11, 400) }] },
                chunky(ctx, { type: "row", height: 32, align: "center", cross: "center", background: GREEN, dark_background: GREEN, children: [{ id: id(), type: "icon", icon: "add", icon_size: 20, ...onDark }] }, { radius: 11, depth: 3, width: 34 }),
              ],
            },
          ],
        },
      ],
    },
    { radius: 24, depth: 6, width },
  );
}

function toyRow(ctx: SectionContext, name: SectionWord, sort: "newest" | "popular"): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w(name), source: "products", layout: "carousel", gap: 14, padding: sides(0, 16, 8, 16), query: { limit: 8, category_id: null, featured: false, sort, ids: [] }, card: toyCard(ctx, 168, 150) };
}

function toyGrid(ctx: SectionContext, name: SectionWord): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w(name), source: "products", layout: "grid", columns: 2, gap: 14, padding: sides(0, 16, 8, 16), query: { limit: 4, category_id: null, featured: true, sort: "popular", ids: [] }, card: toyCard(ctx, "fill", 150) };
}

/** The toy of the day: the shop's flash sale, its countdown and stock bar in the look's red (left out while none is on). */
function deal(ctx: SectionContext): StudioNode {
  const t = sigTexts(ctx, { text: "tyDeal" });
  return { id: idOf(ctx)(), type: "flash_sale", name: ctx.w("tyDeal"), text: t.text, translations: t.translations, flash_sale: { look: "carousel", limit: 6, countdown: true, stock_bar: true, accent: RED }, font: { family: TEXT }, radius: 24, margin: sides(26, 16, 0, 16) };
}

// ——— The gift quest ———

const QUIZ_AGES = ["tyQuizAge1", "tyQuizAge2", "tyQuizAge3", "tyQuizAge4", "tyQuizAge5"] as const satisfies readonly SectionWord[];
const QUIZ_LOVES = ["tyQuizLove1", "tyQuizLove2", "tyQuizLove3", "tyQuizLove4", "tyQuizLove5"] as const satisfies readonly SectionWord[];
const QUIZ_BUDGETS = ["tyQuizBudget1", "tyQuizBudget2", "tyQuizBudget3", "tyQuizBudget4", "tyQuizBudget5"] as const satisfies readonly SectionWord[];

function question(ctx: SectionContext, title: SectionWord, answers: readonly SectionWord[]): StudioEntry {
  const lang = ctx.lang ?? "en";
  const translations: Record<string, Record<string, string>> = {};
  for (const l of (["en", "ar", "tr"] as const).filter((x) => x !== lang)) translations[l] = { title: APP_WORDS[l][title], text: answers.map((a) => APP_WORDS[l][a]).join("\n") };
  return { title: ctx.w(title), text: answers.map((a) => ctx.w(a)).join("\n"), translations: translations as StudioEntry["translations"] };
}

/** The gift quest: a chunky blue card, its photo and words, then the gift finder (the `quiz` element: its results the shop's ages, each opening its category). */
function quest(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { text: "tyMapQuest", title: "tyGiftButton" });
  const results: StudioEntry[] = TOYS_AGE_WORDS.map((word, i) => ({
    ...sigEntry(ctx, { title: word, text: (["tyResult0", "tyResult1", "tyResult3", "tyResult6", "tyResult9"] as const)[i]!, label: "tyResultButton" }),
    icon: ["child_care", "toys", "celebration", "auto_stories", "travel_explore"][i]!,
    action: shop,
  }));
  return chunky(
    ctx,
    {
      type: "column",
      name: ctx.w("tyMapQuest"),
      gap: 12,
      padding: sides(14, 14, 14, 14),
      background: BLUE,
      dark_background: "#3049D6",
      children: [
        {
          id: id(),
          type: "row",
          gap: 12,
          cross: "center",
          children: [
            { id: id(), type: "column", width: "fill", gap: 4, children: [say(ctx, "tyMapQuest", display(25), { ...onDark, max_lines: 1 }), say(ctx, "tyMapQuestLine", text(12.5, 400), { ...onDark, opacity: 0.92, max_lines: 2 })] },
            sigImage(ctx, K, P("gift-confetti"), { width: 84, height: 84, radius: 42, border_color: "#FFFFFF", dark_border_color: "#FFFFFF", border_width: 3 }),
          ],
        },
        {
          id: id(),
          type: "quiz",
          name: ctx.w("tyMapQuest"),
          text: t.text,
          title: t.title,
          translations: t.translations,
          entries: results,
          quiz: { questions: [question(ctx, "tyQuizAge", QUIZ_AGES), question(ctx, "tyQuizLove", QUIZ_LOVES), question(ctx, "tyQuizBudget", QUIZ_BUDGETS)] },
          color: K.ink,
          dark_color: K.darkInk,
          background: K.surface,
          dark_background: K.darkSurface,
          radius: 18,
          padding: sides(14, 14, 14, 14),
          font: { family: TEXT },
        },
      ],
    },
    { radius: 26, depth: 6, margin: sides(26, 16, 0, 16) },
  );
}

/** Safe for every adventure: a chunky green strip. */
function safe(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return chunky(
    ctx,
    {
      type: "row",
      name: ctx.w("tyMapSafe"),
      gap: 12,
      cross: "center",
      padding: sides(12, 14, 12, 14),
      background: GREEN,
      dark_background: "#1C9353",
      children: [
        { id: id(), type: "icon", icon: "verified_user", icon_size: 30, ...onDark },
        { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, "tyMapSafe", display(19), { ...onDark, max_lines: 1 }), say(ctx, "tyMapSafeLine", text(12, 400), { ...onDark, max_lines: 2 })] },
      ],
    },
    { radius: 22, depth: 5, margin: sides(26, 16, 0, 16) },
  );
}

// ——— The home ———

function header(ctx: SectionContext): StudioPage["header"] {
  const t = sigTexts(ctx, { title: "tyWordmark" });
  return { type: "logo_actions", title: t.title, translations: t.translations, buttons: ["menu", "cart"], menu_page: MENU_PAGE, background: K.page, dark_background: K.darkPage, color: K.fill, dark_color: YELLOW, style: "brand" };
}

export function mapHome(ctx: SectionContext): StudioPage {
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
        { id: id(), type: "column", name: ctx.w("tyMapHello"), gap: 4, padding: sides(6, 16, 0, 16), children: [say(ctx, "tyMapHello", display(32, { line_height: 1.05 }), { max_lines: 2 }), say(ctx, "tyMapHelloLine", text(13.5, 400), { muted: true, max_lines: 2 })] },
        mapCard(ctx),
        ...stickers(ctx),
        chest(ctx),
        ...ages(ctx),
        head(ctx, "tyMapNew", "tyMapNewLine", { word: "tyMapAll", action: shop }),
        toyRow(ctx, "tyMapNew", "newest"),
        deal(ctx),
        quest(ctx),
        head(ctx, "tyMapLoved", "tyMapLovedLine", { word: "tyMapAll", action: shop }),
        toyGrid(ctx, "tyMapLoved"),
        safe(ctx),
      ],
    },
  };
}

// ——— The pages after the home ———

/** One of the menu's ways to the account, the orders, the wishlist and the language: a chunky tile. */
function menuTile(ctx: SectionContext, word: SectionWord, icon: string, fill: string, action: Action, dark = false): StudioNode {
  const id = idOf(ctx);
  return chunky(
    ctx,
    {
      type: "column",
      name: ctx.w(word),
      gap: 6,
      cross: "center",
      padding: sides(12, 4, 10, 4),
      background: K.surface,
      dark_background: K.darkSurface,
      children: [
        { id: id(), type: "row", width: 40, height: 40, radius: 20, align: "center", cross: "center", background: fill, dark_background: fill, children: [{ id: id(), type: "icon", icon, icon_size: 22, ...(dark ? onBright : onDark) }] },
        say(ctx, word, text(12, 700), { max_lines: 1, text_align: "center" }),
      ],
    },
    { radius: 18, depth: 4, width: "fill", action },
  );
}

/**
 * The category menu (the header's menu button opens it): the wordmark, the
 * search, every main category of the shop a row of chunky cards (its "All"
 * card, then its sub-categories, sliding), then the account, the orders,
 * the wishlist and the language as chunky tiles, and how to reach the shop.
 */
export function mapMenuPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "tyWordmark" });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["search"], background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk, style: "brand" },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 36, 0),
      children: [
        chunky(ctx, { type: "search", name: ctx.w("tySearchAll"), text: ctx.w("tySearchAll"), source: "products", height: 48, background: K.surface, dark_background: K.darkSurface, color: K.muted, dark_color: K.darkMuted }, { radius: 16, depth: 4, margin: sides(6, 16, 8, 16) }),
        { id: id(), type: "categories", name: ctx.w("tyCategoryMenu"), source: "products", style: "rows", category_menu: { look: "lead", radius: 22 }, color: K.ink, dark_color: K.darkInk, font: { family: DISPLAY }, padding: sides(6, 0, 6, 0) },
        {
          id: id(),
          type: "grid",
          name: ctx.w("tyMenuAccount"),
          columns: 4,
          gap: 8,
          padding: sides(18, 16, 0, 16),
          children: [menuTile(ctx, "tyAccount", "person", BLUE, screen("account")), menuTile(ctx, "tyOrders", "package_2", GREEN, screen("orders")), menuTile(ctx, "tyMapWishlist", "favorite", RED, screen("favorites")), menuTile(ctx, "tyLanguage", "language", YELLOW, screen("settings"), true)],
        },
        chunky(
          ctx,
          {
            type: "row",
            name: ctx.w("tyContact"),
            gap: 12,
            cross: "center",
            padding: sides(12, 14, 12, 14),
            background: YELLOW,
            dark_background: YELLOW,
            children: [
              { id: id(), type: "icon", icon: "support_agent", icon_size: 26, ...onBright },
              { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, "tyContact", display(18), { ...onBright, max_lines: 1 }), say(ctx, "tyContactLine", text(12, 500), { ...onBright, max_lines: 2 })] },
              { id: id(), type: "icon", icon: "chat", icon_size: 22, ...onBright },
            ],
          },
          { radius: 20, depth: 5, margin: sides(14, 16, 0, 16), action: screen("account") },
        ),
      ],
    },
  };
}

/** Over the shop (the listing): today's expedition, the categories as chips and the shop's filters. */
function listTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    head(ctx, "tyMapListTitle", "tyMapListLine", undefined, sides(10, 16, 8, 16)),
    { id: id(), type: "categories", name: ctx.w("tyCategories"), source: "products", style: "chips", color: K.ink, dark_color: K.darkInk, padding: sides(0, 12, 4, 12) },
    { id: id(), type: "listing_filters", name: ctx.w("tyMapListTitle"), padding: sides(4, 16, 8, 16) },
  ];
}

/** Over the cart: the treasure chest and a chunky note on the wraps and the card. */
function cartTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    chest(ctx),
    chunky(
      ctx,
      { type: "row", name: ctx.w("tyMapCartLine"), gap: 10, cross: "center", padding: sides(12, 14, 12, 14), background: K.surface, dark_background: K.darkSurface, children: [{ id: id(), type: "icon", icon: "redeem", icon_size: 24, color: RED, dark_color: YELLOW }, say(ctx, "tyMapCartLine", text(13, 600), { width: "fill", max_lines: 3 })] },
      { radius: 18, depth: 4, margin: sides(12, 16, 6, 16) },
    ),
  ];
}

/** Over the orders: the order's way as a horizontal track (the person's newest order, else the first step lit). */
function ordersTop(ctx: SectionContext): StudioNode[] {
  const step = (title: SectionWord, t: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text: t }, highlight ? { highlight: true } : {});
  return [
    head(ctx, "tyTrack", undefined, undefined, sides(10, 16, 8, 16)),
    chunky(
      ctx,
      {
        type: "timeline",
        name: ctx.w("tyTrack"),
        timeline: { style: "horizontal", source: "latest_order" },
        color: K.ink,
        dark_color: K.darkInk,
        background: K.surface,
        dark_background: K.darkSurface,
        padding: sides(14, 12, 14, 12),
        entries: [step("tyTrack1", "tyTrack1Text", true), step("tyTrack2", "tyTrack2Text"), step("tyTrack3", "tyTrack3Text"), step("tyTrack4", "tyTrack4Text")],
      },
      { radius: 22, depth: 5, margin: sides(0, 16, 8, 16) },
    ),
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

const MAP_SCREENS = signatureScreens({
  style: "card",
  photo: P("kite-wide"),
  title: { en: "Ready for an adventure?", ar: "مستعد للمغامرة؟", tr: "Maceraya hazır mısın?" },
  subtitle: { en: "Sign in to follow your orders and your gifts.", ar: "سجّل الدخول لتتابع طلباتك وهداياك.", tr: "Siparişlerinizi ve hediyelerinizi takip etmek için giriş yapın." },
  menu: "tiles",
  first: ["orders", "wishlist", "notifications", "settings", "help", "privacy", "terms"],
});

/** The bar: white with a thick ink line over it, the bag a big red button raised in the middle. */
export const MAP_BAR = signatureBar(K, { design: "notch", background: "#FFFFFF", dark_background: "#1B1D47", active: RED, dark_active: YELLOW, inactive: "#5C587A", dark_inactive: "#B9B6DA", labels: "always", center: "cart" });

export const MAP_C: SignatureDesign = {
  demo: "toys",
  variant: "c",
  template: { id: "toys_signature_c", icon: "map", fits: { types: ["store"], plain: true } },
  home: mapHome,
  over,
  tabs: clothesTabs,
  pages: (ctx) => [{ slug: MENU_PAGE, title: "tyCategoryMenu", studio: mapMenuPage(ctx) }],
  bar: MAP_BAR,
  look: { header: { background: K.page, color: K.ink, dark_background: K.darkPage, dark_color: K.darkInk }, background: K.page, dark_background: K.darkPage },
  chrome: { home: "brand", header: "brand", system: "brand" },
  isNew: true,
  project: {
    primary: K.fill,
    appearance: { secondary_color: BLUE, font: "Lexend", font_family: TEXT, dark_background: K.darkPage, dark_surface: K.darkSurface },
    screens: MAP_SCREENS,
  },
};

// ——— Its parts as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;
const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};
const alone = (ctx: SectionContext): SectionContext => ({ ...ctx, ownPages: false });

export const TOYS_C_SECTIONS: readonly SectionInfo[] = [
  // The adventure map: the shop's main categories as islands.
  { id: "ty_map", icon: "map", isNew: true, fits: STORE_PLAIN, make: one((ctx) => mapCard(alone(ctx))) },
  // The stickers: a chunky badge per category.
  { id: "ty_stickers", icon: "star", isNew: true, fits: STORE_PLAIN, make: one((ctx) => stickers(ctx)) },
  // The treasure chest: the shop's code in a chunky card.
  { id: "ty_chest", icon: "redeem", isNew: true, fits: STORE_PLAIN, make: one((ctx) => chest(ctx)) },
  // The ages as chunky blocks.
  { id: "ty_age_blocks", icon: "view_column", isNew: true, fits: STORE_PLAIN, make: one((ctx) => ages(ctx)) },
  // The gift quest.
  { id: "ty_gift_quest", icon: "quiz", isNew: true, fits: STORE_PLAIN, make: one((ctx) => quest(ctx)) },
];
