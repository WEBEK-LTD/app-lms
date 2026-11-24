import type { Action, LayoutTab, StudioEntry, StudioFont, StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigImage, sigTexts, signatureBar, type SignatureInk } from "./food-signature-parts";
import { productPart } from "../product-page";
import { mixedProductPage } from "./product-page-mix";

/**
 * 223 Toota's template C, the STORY WORLD (the owner, 23 November 2026): the
 * kids' clothes type's main template, the demo itself, drawn from its own
 * parts (none of the shop kit's, none of A's or B's):
 *
 * - soft blobs of colour (peach, mint, sky, lilac, sun) and illustrated
 *   shapes drawn from Studio's own elements;
 * - Tooti, the mascot (an illustrated bunny in a knit jumper), greets on a
 *   card at the top with "Let's go";
 * - a big round age selector (0–2, 3–5, 6–9, 10+), each a bubble;
 * - scalloped, wavy edges between the sections, a band of mint under the
 *   new pieces, each piece's photo a round bubble on its own colour;
 * - Toota's worlds as blob cards named after the demo's main categories
 *   (a tap opens the category), the size finder by age, the most loved;
 * - a bouncy rounded bubble bar (Lemonada).
 *
 * Its category menu is a page of its own: the search, every main category
 * a row of round cards, then me, orders, favourites and language as
 * bubbles, and Toota's team. Every word in Studio's three languages
 * (lib/studio/words/kids-cd.ts).
 */

export const STORY_INK: SignatureInk = {
  page: "#FFF6EC",
  darkPage: "#1B1530",
  surface: "#FFFFFF",
  darkSurface: "#272040",
  ink: "#3A2952",
  darkInk: "#F6EEFF",
  muted: "#6A5A82",
  darkMuted: "#BCAED4",
  line: "#F0E2D2",
  darkLine: "#3A3157",
  accent: "#B23E6E",
  darkAccent: "#FF9EC0",
  fill: "#3A2952",
  darkFill: "#FFD2B8",
  onFill: "#FFF6EC",
  darkOnFill: "#1B1530",
};
const K = STORY_INK;
/** The blobs' colours, by day and by night. */
const PEACH = { day: "#FFD2B8", night: "#5A3A44" };
const MINT = { day: "#BFEBD9", night: "#24493F" };
const SKY = { day: "#C6E2FF", night: "#253E5C" };
const LILAC = { day: "#E4D6FF", night: "#3B2D5E" };
const SUN = { day: "#FFE7A3", night: "#4F4426" };
type Blob = typeof PEACH;
const FACE = "Lemonada";

const P = (name: string) => `/kids-photos/${name}.jpg`;

const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));
export const STORY_MENU_PAGE = "menu";
export const STORY_SIZE_PAGE = "size-guide";

const face = (size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: FACE, size, weight: 700, line_height: 1.35, ...extra });

function say(ctx: SectionContext, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, K, ctx.w(word), font, extra);
}

const blob = (b: Blob): Pick<StudioNode, "background" | "dark_background"> => ({ background: b.day, dark_background: b.night });

/** A round shape of a blob's colour (the illustrations are made of these). */
function dot(ctx: SectionContext, size: number, b: Blob, extra: Partial<StudioNode> = {}): StudioNode {
  return { id: idOf(ctx)(), type: "row", width: size, height: size, radius: size / 2, ...blob(b), children: [], ...extra };
}

/** A round button, a bubble with a soft drop under it. */
function bubble(ctx: SectionContext, icon: string, action: Action, size = 44): StudioNode {
  const id = idOf(ctx);
  return { id: id(), type: "row", width: size, height: size, radius: size / 2, align: "center", cross: "center", self_align: "center", background: K.surface, dark_background: K.darkSurface, shadow: "light", motion: { press: "bounce" }, action, children: [{ id: id(), type: "icon", icon, icon_size: 22, color: K.ink, dark_color: K.darkInk }] };
}

/** A section's title, a bubble with an arrow at its end. */
function headOf(ctx: SectionContext, title: SectionWord, action: Action | null): StudioNode {
  const id = idOf(ctx);
  return { id: id(), type: "row", name: ctx.w(title), cross: "center", gap: 12, padding: sides(20, 18, 12, 18), children: [say(ctx, title, face(20), { width: "fill", max_lines: 2 }), ...(action ? [bubble(ctx, "arrow_forward", action, 40)] : [])] };
}

/**
 * A wavy edge: a row of half-bubbles of `b` sitting on what follows (or
 * hanging from what comes before), each 40 points wide; twelve of them,
 * so the edge runs across any phone up to 480 points (the row slides, so
 * a narrower one never overflows).
 */
export function scallops(ctx: SectionContext, b: Blob, down = false, on?: Blob): StudioNode {
  const id = idOf(ctx);
  const half = 20;
  return {
    id: id(),
    type: "row",
    name: "~",
    height: half,
    scroll: true,
    margin: sides(down ? 0 : 18, 0, 0, 0),
    ...(on ? blob(on) : {}),
    children: Array.from({ length: 12 }, () => ({ id: id(), type: "row" as const, width: 40, height: half, ...blob(b), corners: down ? { bottom_start: half, bottom_end: half, top_start: 0, top_end: 0 } : { top_start: half, top_end: half, bottom_start: 0, bottom_end: 0 }, children: [] })),
  };
}

// ——— The home ———

/**
 * Tooti, the mascot: a bunny in a striped knit jumper holding a star, drawn
 * for the story world in its own colours (Yallapp's picture,
 * public/design-pictures/kids-tooti.png, on a transparent ground; the owner
 * can change it like any picture). Without the platform's pictures, a soft
 * sun blob in its place.
 */
function tooti(ctx: SectionContext): StudioNode {
  const url = ctx.picture?.("kids-tooti.png") ?? null;
  const look: Partial<StudioNode> = { name: ctx.w("stwMascot"), width: 124, height: 136 };
  return url ? { id: idOf(ctx)(), type: "image", image_url: url, fit: "contain", ...look } : { id: idOf(ctx)(), type: "row", radius: 60, ...blob(SUN), ...look, children: [] };
}

/** The greeting card: Tooti on a sky blob, its hello, the day's line and "Let's go". */
export function greetingCard(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "stack",
    name: ctx.w("stwHello"),
    min_height: 200,
    margin: sides(10, 16, 0, 16),
    ...blob(SKY),
    corners: { top_start: 36, top_end: 36, bottom_end: 12, bottom_start: 36 },
    children: [
      dot(ctx, 150, LILAC, { place: { x: 0, y: 100 }, corners: { top_start: 80, top_end: 70, bottom_end: 40, bottom_start: 0 } }),
      dot(ctx, 46, PEACH, { place: { x: 92, y: 8 } }),
      { ...tooti(ctx), place: { x: 4, y: 96 }, motion: { loop: "float" } },
      {
        id: id(),
        type: "column",
        gap: 6,
        padding: sides(20, 20, 22, 136),
        children: [
          say(ctx, "stwHello", { family: FACE, size: 13, weight: 600 }, { accent: true, max_lines: 1 }),
          say(ctx, "stwHelloTitle", face(21, { line_height: 1.4 }), { max_lines: 3 }),
          say(ctx, "stwHelloLine", { family: FACE, size: 12.5, line_height: 1.6 }, { muted: true, max_lines: 3 }),
          { id: id(), type: "button", name: ctx.w("stwStart"), text: ctx.w("stwStart"), icon: "arrow_forward", icon_position: "end", width: "hug", height: 42, radius: 21, self_align: "start", margin: sides(6, 0, 0, 0), padding: sides(0, 18, 0, 18), background: K.fill, dark_background: K.darkFill, color: K.onFill, dark_color: K.darkOnFill, font: { family: FACE, size: 13.5, weight: 600 }, motion: { press: "bounce" }, action: shop },
        ],
      },
    ],
  };
}

/** The age selector: four big blobs on a wave (0–2, 3–5, 6–9, 10+), each of its own shape and colour, with its unit, the stage's name under it. */
export function ageBubbles(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  // Each bubble a soft blob of its own shape, on a wave: the second and fourth a little lower.
  const SHAPES = [
    { corners: { top_start: 58, top_end: 22, bottom_end: 50, bottom_start: 30 }, width: 86, height: 76 },
    { corners: { top_start: 24, top_end: 56, bottom_end: 28, bottom_start: 52 }, width: 78, height: 84 },
    { corners: { top_start: 50, top_end: 30, bottom_end: 60, bottom_start: 20 }, width: 84, height: 78 },
    { corners: { top_start: 28, top_end: 52, bottom_end: 22, bottom_start: 58 }, width: 80, height: 82 },
  ];
  let i = 0;
  const age = (n: string, unit: SectionWord, stage: SectionWord, b: Blob, on: boolean): StudioNode => ({
    id: id(),
    type: "column",
    name: `${n} ${ctx.w(unit)}`,
    width: "fill",
    gap: 8,
    cross: "center",
    margin: sides(i % 2 ? 18 : 0, 0, i % 2 ? 0 : 18, 0),
    action: shop,
    children: [
      {
        id: id(),
        type: "column",
        ...SHAPES[i++ % 4]!,
        align: "center",
        cross: "center",
        ...blob(b),
        shadow: "light",
        motion: { press: "bounce" },
        ...(on ? { border_color: K.ink, dark_border_color: K.darkInk, border_width: 3 } : {}),
        children: [
          { id: id(), type: "text", text: n, max_lines: 1, font: { family: FACE, size: 19, weight: 700, line_height: 1.1 }, color: K.ink, dark_color: K.darkInk },
          { id: id(), type: "text", text: ctx.w(unit), max_lines: 1, font: { family: FACE, size: 10, weight: 500 }, color: K.ink, dark_color: K.darkInk },
        ],
      },
      say(ctx, stage, { family: FACE, size: 11.5, weight: 500 }, { muted: true, max_lines: 1, text_align: "center" }),
    ],
  });
  return { id: id(), type: "row", name: ctx.w("stwAges"), gap: 6, padding: sides(20, 12, 4, 12), children: [age("0–2", "stwYear", "stwBabies", PEACH, false), age("3–5", "stwYears", "stwLittle", MINT, true), age("6–9", "stwYears", "stwSchool", SKY, false), age("10+", "stwYears", "stwBig", LILAC, false)] };
}

/** A piece: its photo a round bubble on the sun's colour, its name, its price and a "+" bubble. */
function piece(ctx: SectionContext, size: number): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    width: size + 20,
    gap: 6,
    radius: 30,
    padding: sides(10, 10, 14, 10),
    ...blob(SUN),
    children: [
      { id: id(), type: "image", bind: "image", width: size, height: size, radius: size / 2, fit: "cover", self_align: "center", background: K.surface, dark_background: K.darkSurface },
      { id: id(), type: "text", bind: "title", max_lines: 1, margin: sides(4, 4, 0, 4), font: { family: FACE, size: 13, weight: 600 }, color: K.ink, dark_color: K.darkInk },
      {
        id: id(),
        type: "row",
        gap: 6,
        cross: "center",
        padding: sides(0, 4, 0, 4),
        children: [
          { id: id(), type: "text", bind: "price", width: "fill", max_lines: 1, font: { family: FACE, size: 14, weight: 700 }, color: K.ink, dark_color: K.darkInk },
          { id: id(), type: "row", width: 32, height: 32, radius: 16, align: "center", cross: "center", background: K.fill, dark_background: K.darkFill, children: [{ id: id(), type: "icon", icon: "add", icon_size: 18, color: K.onFill, dark_color: K.darkOnFill }] },
        ],
      },
    ],
  };
}

/** The new pieces on a mint band between two wavy edges. */
function newBand(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    scallops(ctx, MINT),
    {
      id: id(),
      type: "column",
      name: ctx.w("stwNewIn"),
      padding: sides(0, 0, 20, 0),
      ...blob(MINT),
      children: [headOf(ctx, "stwNewIn", shop), { id: id(), type: "items", name: ctx.w("stwNewIn"), source: "products", layout: "carousel", gap: 12, padding: sides(0, 16, 0, 16), query: { limit: 8, category_id: null, featured: false, sort: "newest", ids: [] }, card: piece(ctx, 136) }],
    },
    scallops(ctx, MINT, true),
  ];
}

/** Toota's worlds: a blob card for each main category (named as the demo's, so it opens it), its line, its photo in a round window. */
function worlds(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const world = (word: SectionWord, line: SectionWord, photo: string, b: Blob): StudioNode => ({
    id: id(),
    type: "stack",
    name: ctx.w(word),
    height: 184,
    ...blob(b),
    corners: { top_start: 32, top_end: 32, bottom_end: 32, bottom_start: 10 },
    motion: { press: "bounce" },
    action: shop,
    children: [
      sigImage(ctx, K, P(photo), { width: 92, height: 92, radius: 46, fit: "cover", place: { x: 100, y: 100 }, margin: sides(0, 10, 10, 0), background: K.surface, dark_background: K.darkSurface }),
      { id: id(), type: "column", gap: 2, padding: sides(14, 14, 0, 14), children: [say(ctx, word, face(16), { max_lines: 2 }), say(ctx, line, { family: FACE, size: 11.5 }, { muted: true, max_lines: 1 })] },
    ],
  });
  return {
    id: id(),
    type: "grid",
    name: ctx.w("stwWorlds"),
    columns: 2,
    gap: 12,
    padding: sides(0, 16, 0, 16),
    children: [world("stwGirls", "stwGirlsLine", "tiered-dress", LILAC), world("stwBoys", "stwBoysLine", "denim-jacket", SKY), world("stwBaby", "stwBabyLine", "newborn-knit", PEACH), world("stwGifts", "stwGiftsLine", "gift-pink", SUN)],
  };
}

/** The size finder by age (the shop's chart), on a lilac bubble. */
function finder(ctx: SectionContext): StudioNode {
  const t = sigTexts(ctx, { text: "stwFinder", title: "stwFinderButton" });
  return { id: idOf(ctx)(), type: "size_finder", name: t.text, text: t.text, title: t.title, translations: t.translations, action: shop, radius: 32, padding: sides(18, 18, 18, 18), margin: sides(24, 16, 0, 16), ...blob(LILAC), color: K.ink, dark_color: K.darkInk };
}

/** The most loved, as a list of round photos on soft rows. */
function loved(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w("stwLoved"),
    source: "products",
    layout: "list",
    gap: 10,
    padding: sides(0, 16, 0, 16),
    query: { limit: 3, category_id: null, featured: false, sort: "price_asc", ids: [] },
    card: {
      id: id(),
      type: "row",
      gap: 12,
      cross: "center",
      radius: 28,
      padding: sides(10, 10, 10, 10),
      background: K.surface,
      dark_background: K.darkSurface,
      children: [
        { id: id(), type: "image", bind: "image", width: 64, height: 64, radius: 32, fit: "cover", background: PEACH.day, dark_background: PEACH.night },
        { id: id(), type: "column", width: "fill", gap: 2, children: [{ id: id(), type: "text", bind: "title", max_lines: 1, font: { family: FACE, size: 13.5, weight: 600 }, color: K.ink, dark_color: K.darkInk }, { id: id(), type: "text", bind: "price", max_lines: 1, font: { family: FACE, size: 13.5, weight: 700 }, color: K.accent, dark_color: K.darkAccent }] },
        { id: id(), type: "icon", icon: "favorite", icon_size: 22, color: K.accent, dark_color: K.darkAccent, margin: sides(0, 6, 0, 0) },
      ],
    },
  };
}

export function storyHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "stwWordmark" });
  return {
    header: { type: "logo_actions", title: t.title, translations: t.translations, buttons: ["menu", "search", "notifications"], menu_page: STORY_MENU_PAGE, background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 110, 0),
      children: [
        greetingCard(ctx),
        ageBubbles(ctx),
        ...newBand(ctx),
        headOf(ctx, "stwWorlds", ownPage(ctx, STORY_MENU_PAGE)),
        worlds(ctx),
        finder(ctx),
        headOf(ctx, "stwLoved", shop),
        loved(ctx),
      ],
    },
  };
}

// ——— The pages after the home ———

function pageHeader(ctx: SectionContext, word: SectionWord): StudioPage["header"] {
  const t = sigTexts(ctx, { title: word });
  return { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], background: K.page, color: K.ink, dark_background: K.darkPage, dark_color: K.darkInk, style: "brand" };
}

/** A bubble of the menu's foot: its icon on its blob, its words. */
function menuBubble(ctx: SectionContext, word: SectionWord, icon: string, b: Blob, action: Action): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    gap: 8,
    cross: "center",
    action,
    children: [
      { id: id(), type: "row", width: 64, height: 64, radius: 32, align: "center", cross: "center", ...blob(b), shadow: "light", motion: { press: "bounce" }, children: [{ id: id(), type: "icon", icon, icon_size: 26, color: K.ink, dark_color: K.darkInk }] },
      say(ctx, word, { family: FACE, size: 12, weight: 600 }, { max_lines: 1, text_align: "center" }),
    ],
  };
}

export function storyMenuPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    header: pageHeader(ctx, "stwMenu"),
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { id: id(), type: "search", name: ctx.w("stwSearchAll"), text: ctx.w("stwSearchAll"), source: "products", radius: 28, height: 54, background: K.surface, dark_background: K.darkSurface, color: K.muted, dark_color: K.darkMuted, shadow: "light", margin: sides(10, 16, 6, 16) },
        { id: id(), type: "categories", name: ctx.w("stwMenu"), source: "products", style: "rows", category_menu: { look: "label", radius: 32 }, color: K.ink, dark_color: K.darkInk, padding: sides(10, 0, 6, 0) },
        scallops(ctx, LILAC),
        {
          id: id(),
          type: "column",
          name: ctx.w("stwAccount"),
          gap: 14,
          padding: sides(16, 12, 20, 12),
          ...blob(LILAC),
          children: [
            { id: id(), type: "row", gap: 6, children: [menuBubble(ctx, "stwAccount", "person", PEACH, screen("account")), menuBubble(ctx, "stwOrders", "package_2", MINT, screen("orders")), menuBubble(ctx, "stwWishlist", "favorite", SKY, screen("favorites")), menuBubble(ctx, "stwLanguage", "language", SUN, screen("settings"))] },
            {
              id: id(),
              type: "row",
              name: ctx.w("stwContact"),
              gap: 12,
              cross: "center",
              radius: 28,
              padding: sides(12, 14, 12, 14),
              background: K.surface,
              dark_background: K.darkSurface,
              action: screen("account"),
              children: [
                { id: id(), type: "icon", icon: "waving_hand", icon_size: 24, color: K.accent, dark_color: K.darkAccent },
                { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, "stwContact", { family: FACE, size: 14, weight: 700 }), say(ctx, "stwContactLine", { family: FACE, size: 11.5 }, { muted: true, max_lines: 2 })] },
                { id: id(), type: "icon", icon: "chat", icon_size: 20, color: K.ink, dark_color: K.darkInk },
              ],
            },
          ],
        },
      ],
    },
  };
}

export function storySizePage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    header: pageHeader(ctx, "stwSizeGuide"),
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [finder(ctx), { id: id(), type: "size_chart", name: ctx.w("stwSizeChart"), text: ctx.w("stwSizeChart"), color: K.ink, dark_color: K.darkInk, background: K.surface, dark_background: K.darkSurface, radius: 32, padding: sides(16, 14, 16, 14), margin: sides(14, 16, 4, 16) }],
    },
  };
}

/** Over the shop: its title, the ages as bubbles, the sizes to filter by. */
function shopTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [
    { ...say(ctx, "stwShop", face(22), { max_lines: 2 }), padding: sides(10, 18, 0, 18) },
    ageBubbles(ctx),
    { id: id(), type: "row", name: ctx.w("stwSizeGuide"), gap: 8, cross: "center", height: 40, radius: 20, self_align: "start", padding: sides(0, 14, 0, 12), margin: sides(12, 16, 0, 16), ...blob(LILAC), action: ownPage(ctx, STORY_SIZE_PAGE), children: [{ id: id(), type: "icon", icon: "straighten", icon_size: 18, color: K.ink, dark_color: K.darkInk }, say(ctx, "stwSizeGuide", { family: FACE, size: 12.5, weight: 600 }, { max_lines: 1 })] },
    { id: id(), type: "listing_filters", name: ctx.w("stwSizeChart"), color: K.ink, dark_color: K.darkInk, padding: sides(8, 16, 6, 16) },
  ];
}

/** Over the cart: the newborn gift's wrapping and card, on a peach bubble. */
function cartTop(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  return [{ id: id(), type: "row", name: ctx.w("stwCartNote"), gap: 12, cross: "center", radius: 28, padding: sides(14, 16, 14, 16), margin: sides(10, 16, 4, 16), ...blob(PEACH), children: [{ id: id(), type: "icon", icon: "redeem", icon_size: 24, color: K.ink, dark_color: K.darkInk }, say(ctx, "stwCartNote", { family: FACE, size: 12.5, weight: 500, line_height: 1.6 }, { width: "fill", max_lines: 3 })] }];
}

/** Over the orders: the parcel's journey, the newest order's steps on a sky bubble. */
function ordersTop(ctx: SectionContext): StudioNode[] {
  const step = (title: SectionWord, text: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    headOf(ctx, "stwTrack", null),
    { id: idOf(ctx)(), type: "timeline", name: ctx.w("stwTrack"), timeline: { style: "horizontal", source: "latest_order" }, color: K.ink, dark_color: K.darkInk, ...blob(SKY), radius: 32, padding: sides(18, 14, 18, 14), margin: sides(0, 16, 8, 16), entries: [step("kdTrack1", "kdTrack1Text", true), step("kdTrack2", "kdTrack2Text"), step("kdTrack3", "kdTrack3Text"), step("kdTrack4", "kdTrack4Text")] },
  ];
}

function storyOver(screenName: string, ctx: SectionContext): StudioNode[] | null {
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

/** Five tabs: Home, Shop, Wishlist, Cart, Account. */
export function storyTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const out = structuredClone([...tabs]).map((t) => {
    const target = t.target.type === "screen" ? t.target.screen : null;
    if (t.id === "home") return { ...t, icon: "home" };
    if (target === "search") return { ...t, label: "Shop", icon: "category" };
    if (target === "cart") return { ...t, label: "Cart", icon: "shopping_bag" };
    if (target === "account") return { ...t, icon: "child_care" };
    return t;
  });
  const cart = out.findIndex((t) => t.target.type === "screen" && t.target.screen === "cart");
  const loved: LayoutTab = { id: "favourites", label: "Wishlist", icon: "favorite", target: { type: "screen", screen: "favorites" } };
  if (!out.some((t) => t.target.type === "screen" && t.target.screen === "favorites")) out.splice(cart < 0 ? out.length : cart, 0, loved);
  return out;
}

/** The bouncy bubble bar: white and round, the open tab a peach bubble with its name. */
export const STORY_BAR = signatureBar(K, { design: "bubble", background: K.surface, dark_background: K.darkSurface, active: "#B23E6E", dark_active: "#FF9EC0", inactive: K.muted, dark_inactive: K.darkMuted, labels: "active", radius: 32, margin: 14, font: FACE });

const STORY_SCREENS = signatureScreens({
  style: "photo",
  photo: P("summer-outfit"),
  title: { en: "Welcome to a little world", ar: "أهلًا بك في عالمٍ صغير", tr: "Küçük bir dünyaya hoş geldiniz" },
  subtitle: { en: "Sign in to keep their sizes, favourites and orders.", ar: "سجّل الدخول لتحفظ مقاساتهم ومفضّلتهم وطلباتك.", tr: "Bedenlerini, favorilerini ve siparişlerinizi saklamak için giriş yapın." },
  menu: "cover",
  accent: "#B23E6E",
  first: ["orders", "wishlist", "notifications", "settings", "help", "privacy", "terms"],
});

/**
 * 228.7 The story world's own product page: the photo as a rounded card on
 * a sky blob that curves away under it; the name in round Lemonada and its
 * price; Tooti beside a speech bubble ("Pick their age…"); the ages as
 * round chips on a lilac bubble; the quantity as a pill; then a wavy edge
 * into a peach band with the words that open, the delivery card and the
 * stars' bars; the little friends' favourites; Into the basket a bubble
 * pinned at the foot.
 */
function storyProductPage(ctx: SectionContext) {
  const id = idOf(ctx);
  const ink = { color: K.ink, dark_color: K.darkInk } as const;
  const plum = { accent: K.fill, dark_accent: K.darkFill } as const;
  const gap = (top: number, bottom = 0) => sides(top, 18, bottom, 18);
  const stage: StudioNode = {
    id: id(),
    type: "column",
    name: ctx.w("stwWordmark"),
    padding: sides(10, 16, 22, 16),
    corners: { top_start: 0, top_end: 0, bottom_start: 48, bottom_end: 48 },
    ...blob(SKY),
    children: [productPart(ctx, { type: "product_gallery", look: "card", radius: 34, node: { aspect_ratio: 1 } })],
  };
  const mascot = tooti(ctx);
  const tip: StudioNode = {
    id: id(),
    type: "row",
    name: ctx.w("stwMascot"),
    gap: 10,
    cross: "center",
    margin: gap(18),
    children: [
      { ...mascot, width: 70, height: 78 },
      {
        id: id(),
        type: "column",
        width: "fill",
        padding: sides(12, 14, 12, 14),
        corners: { top_start: 22, top_end: 22, bottom_start: 6, bottom_end: 22 },
        background: K.surface,
        dark_background: K.darkSurface,
        shadow: "light",
        children: [say(ctx, "stwTootiTip", face(13, { weight: 600, line_height: 1.45 }))],
      },
    ],
  };
  const ages: StudioNode = {
    id: id(),
    type: "column",
    name: ctx.w("stwPickAge"),
    radius: 32,
    padding: sides(16, 16, 18, 16),
    margin: gap(14),
    ...blob(LILAC),
    children: [productPart(ctx, { type: "product_variants", look: "grid" /* 228.7 "chips" once the app draws a chip hugging its words (it stretches it across the row today) */, text: "stwPickAge", ...plum, node: { ...ink } })],
  };
  const band: StudioNode = {
    id: id(),
    type: "column",
    name: "~",
    gap: 16,
    padding: sides(8, 18, 26, 18),
    ...blob(PEACH),
    children: [
      productPart(ctx, { type: "product_description", look: "accordion", node: { ...ink, border_color: K.line, dark_border_color: K.darkLine } }),
      productPart(ctx, { type: "product_delivery", look: "card", ...plum, node: { ...ink, radius: 24, padding: sides(14, 14, 14, 14), background: K.surface, dark_background: K.darkSurface } }),
      productPart(ctx, { type: "product_reviews", look: "bars", accent: K.accent, dark_accent: K.darkAccent, node: { ...ink } }),
    ],
  };
  return mixedProductPage(ctx, { background: K.page, dark_background: K.darkPage }, [
    stage,
    { type: "product_title", look: "plain", node: { ...ink, font: face(21, { line_height: 1.4 }), margin: gap(18) } },
    { type: "product_price", look: "sale", node: { color: K.accent, dark_color: K.darkAccent, font: face(18), margin: gap(4) } },
    tip,
    ages,
    { type: "product_quantity", look: "pill", node: { ...ink, margin: gap(16) } },
    scallops(ctx, PEACH),
    band,
    { type: "product_related", look: "carousel", rows: 8, text: "stwAlsoLoved", node: { ...ink, margin: sides(24, 0, 20, 0) } },
    {
      type: "product_buy",
      look: "cart",
      text: "stwIntoBasket",
      ...plum,
      node: { pin: "bottom", radius: 32, padding: sides(10, 16, 12, 16), background: K.page, dark_background: K.darkPage, ...ink },
    },
  ]);
}

export const STORY_C: SignatureDesign = {
  demo: "kids",
  variant: "c",
  template: { id: "kids_signature_c", icon: "child_care", fits: { types: ["store"], plain: true } },
  home: storyHome,
  over: storyOver,
  tabs: storyTabs,
  pages: (ctx) => [
    { slug: STORY_MENU_PAGE, title: "stwMenu", studio: storyMenuPage(ctx) },
    { slug: STORY_SIZE_PAGE, title: "stwSizeGuide", studio: storySizePage(ctx) },
    // 228.7 Its own product page.
    storyProductPage(ctx),
  ],
  bar: STORY_BAR,
  look: { header: { background: K.page, color: K.ink, dark_background: K.darkPage, dark_color: K.darkInk }, background: K.page, dark_background: K.darkPage },
  chrome: { header: "brand", system: "brand" },
  isNew: true,
  project: {
    primary: K.fill,
    appearance: { secondary_color: "#B23E6E", font: "DM Sans", font_family: FACE, arabic_font: FACE, dark_background: K.darkPage, dark_surface: K.darkSurface },
    screens: STORY_SCREENS,
  },
};
