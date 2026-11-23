import type { Action, StudioEntry, StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { sides, sigEntry, signatureBar, signatureHeader, type SignatureInk } from "./food-signature-parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import {
  face,
  KIT_CUSTOM_PAGE,
  KIT_MENU_PAGE,
  kitCartTop,
  kitCategories,
  kitCustomCard,
  kitCustomPage,
  kitGift,
  kitHead,
  kitHero,
  kitHomeHeader,
  kitMenuPage,
  kitOrdersTop,
  kitPhoto,
  kitProducts,
  kitPromises,
  kitReviews,
  kitSearch,
  kitShopTop,
  kitStory,
  kitTabs,
  ownPage,
  say,
  shop,
  type KitLook,
} from "./shop-kit-parts";

/**
 * 210 Ghurza (غُرزة, "a stitch"), Studio's crochet and handmade type: a
 * Studio demo of the store kind (lib/demo/kits/crochet.ts) and its two
 * Signature looks, each a whole store project built only from Studio's
 * elements and the shop types' parts (./shop-kit-parts.ts), as approved
 * (a small header, a search pill, the categories, a compact hero carousel
 * of about 210 px with the next card peeking, tight sections, a floating
 * bar):
 *
 * A · GHURZA, warm handmade: terracotta on beige paper, El Messiri, soft
 * round corners; a warm coffee-brown night.
 * B · HABKA, colourful and playful: plum and berry on a pale pink-grey,
 * Rubik, tighter corners; a plum-black night.
 *
 * Both have what a crochet shop needs: the custom order (a card opening its
 * own page with the steps and the request form, kept as the shop's request
 * in the dashboard and Yallapp Business), the days each piece takes to make
 * on its cards, the maker's story, yarn and tools by the shop's categories
 * (an element named like a category opens it), the workshops (seats sold as
 * the shop's products in its Workshops category: a store app has no courses
 * of its own) and gifts wrapped by hand. The owner's words are in
 * [brackets] (the demo fills them, lib/studio/demo-templates.ts DEMO_FACTS).
 */

// ——— The two looks' colours and faces ———

/** A · GHURZA: beige paper and coffee ink, terracotta; a coffee-brown night. */
export const GHURZA_INK: SignatureInk = {
  page: "#F7F1E8",
  darkPage: "#16110E",
  surface: "#FFFCF7",
  darkSurface: "#221A16",
  ink: "#2B211B",
  darkInk: "#F4EAE1",
  muted: "#6B5D52",
  darkMuted: "#C4B5A8",
  line: "#EADFD1",
  darkLine: "#3A2E26",
  accent: "#A4502F",
  darkAccent: "#E8A27F",
  fill: "#A4502F",
  darkFill: "#B85C39",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const A = GHURZA_INK;

/** B · HABKA: a pale pink-grey and plum ink, berry; a plum-black night. */
export const HABKA_INK: SignatureInk = {
  page: "#FAF8F6",
  darkPage: "#121012",
  surface: "#FFFFFF",
  darkSurface: "#1D181C",
  ink: "#1F1A1D",
  darkInk: "#F3EDF0",
  muted: "#625A5F",
  darkMuted: "#BDB3B8",
  line: "#ECE6E9",
  darkLine: "#322A30",
  accent: "#6E2F55",
  darkAccent: "#E7A9CB",
  fill: "#6E2F55",
  darkFill: "#9A4A7A",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const B = HABKA_INK;

const LOOK_A: KitLook = { k: A, tint: { day: "#F4E4D8", night: "#33231B" }, family: "El Messiri", look: "a", dir: "crochet-photos", radius: 22, heavy: 700 };
const LOOK_B: KitLook = { k: B, tint: { day: "#F2E6EC", night: "#2A2128" }, family: "Rubik", look: "b", dir: "crochet-photos", radius: 16, heavy: 700 };

/** The yarn colours a swatch row shows (the shop's own shades). */
const SWATCHES = {
  cotton: ["#D9837B", "#9DB89A", "#DDBE8C", "#EDE5D8"],
  merino: ["#1E2B4A", "#C2382F", "#8E8A85", "#3B3B3D"],
  raffia: ["#B58E5A", "#D9C29A", "#6B4A2B", "#2A2420"],
  habka: ["#6E2F55", "#E8DCCB", "#8A94A0", "#A5A831", "#B6573A", "#2F4A40", "#D9A1A0"],
  season: ["#DDBACB", "#B47C9C", "#8C4A71", "#6E2F55"],
} as const;

const white = { color: "#FFFFFF", dark_color: "#FFFFFF" } as const;

/** A row of yarn swatches: small pills (A) or rounded squares (B). */
function swatches(ctx: SectionContext, colours: readonly string[], size: { width: number | "fill"; height: number; radius: number }, gap = 6): StudioNode {
  const id = idOf(ctx);
  return { id: id(), type: "row", gap, children: colours.map((c) => ({ id: id(), type: "row" as const, width: size.width, height: size.height, radius: size.radius, background: c, dark_background: c, children: [] })) };
}

/** A small chip: an icon and its words on the look's tint (or a glass on a dark card). */
function chip(ctx: SectionContext, l: KitLook, icon: string, word: SectionWord, onDark = false): StudioNode {
  const id = idOf(ctx);
  const ink = onDark ? white : { color: l.k.ink, dark_color: l.k.darkInk };
  return {
    id: id(),
    type: "row",
    name: ctx.w(word),
    gap: 5,
    cross: "center",
    radius: 12,
    padding: sides(5, 10, 5, 8),
    ...(onDark ? { background: "#45362D", dark_background: "#3B2D25" } : { background: l.tint.day, dark_background: l.tint.night }),
    children: [
      { id: id(), type: "icon", icon, icon_size: 15, ...ink },
      { ...say(ctx, l, word, { size: 12, weight: 600 }, { max_lines: 1 }), ...ink },
    ],
  };
}

/** A button in the look's fill. */
function fillButton(ctx: SectionContext, l: KitLook, word: SectionWord, action: Action, o: { icon?: string; height?: number; width?: "hug" | "fill" } = {}): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "button",
    name: ctx.w(word),
    text: ctx.w(word),
    ...(o.icon ? { icon: o.icon, icon_position: "end" as const } : {}),
    width: o.width ?? "hug",
    height: o.height ?? 44,
    radius: l.look === "a" ? 22 : 14,
    padding: sides(0, 18, 0, 18),
    background: l.k.fill,
    dark_background: l.k.darkFill,
    color: l.k.onFill,
    dark_color: l.k.darkOnFill,
    font: { family: l.family, size: 14, weight: 700 },
    motion: { press: "shrink" },
    action,
  };
}

// ——— A · GHURZA ———

/** Shop by yarn: a card per yarn, named like the shop's category (it opens it), with its shades. */
function yarnCards(ctx: SectionContext, l: KitLook): StudioNode {
  const id = idOf(ctx);
  const card = (photo: string, title: SectionWord, line: SectionWord, colours: readonly string[]): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(title),
    width: 150,
    gap: 6,
    radius: l.radius,
    padding: sides(8, 8, 12, 8),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    action: shop,
    children: [
      ...(kitPhoto(ctx, l, photo) ? [{ id: id(), type: "image" as const, image_url: kitPhoto(ctx, l, photo)!, width: 134, height: 110, radius: l.radius - 6, fit: "cover" as const }] : []),
      { ...say(ctx, l, title, face(l, 15.5), { max_lines: 1 }), padding: sides(4, 2, 0, 2) },
      { ...say(ctx, l, line, { size: 11.5 }, { muted: true, max_lines: 1 }), padding: sides(0, 2, 0, 2) },
      { ...swatches(ctx, colours, { width: 28, height: 8, radius: 4 }, 5), padding: sides(4, 2, 0, 2) },
    ],
  });
  return {
    id: id(),
    type: "row",
    name: ctx.w("crYarnTitle"),
    gap: 10,
    scroll: true,
    padding: sides(0, 16, 4, 16),
    children: [card("yarn-ball-white", "crCottonYarn", "crCottonLine", SWATCHES.cotton), card("knit-textures", "crMerinoYarn", "crMerinoLine", SWATCHES.merino), card("straw-close", "crRaffia", "crRaffiaLine", SWATCHES.raffia)],
  };
}

/** A's workshop: a dark card, its date, title and what it includes, its seat and the photo at its end; named like the shop's Workshops (it opens them). */
function workshopCard(ctx: SectionContext, l: KitLook): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("crWorkshops"),
    gap: 0,
    radius: l.radius + 4,
    margin: sides(0, 16, 4, 16),
    background: "#2B211B",
    dark_background: "#2A1F19",
    border_color: "#2B211B",
    dark_border_color: l.k.darkLine,
    border_width: 1,
    action: shop,
    children: [
      {
        id: id(),
        type: "column",
        width: "fill",
        gap: 8,
        padding: sides(16, 14, 16, 16),
        children: [
          { id: id(), type: "row", gap: 5, cross: "center", children: [{ id: id(), type: "icon", icon: "calendar_month", icon_size: 15, color: "#E8A27F", dark_color: "#E8A27F" }, { ...say(ctx, l, "crWorkshopDate", { size: 12, weight: 600 }, { max_lines: 1 }), color: "#E8A27F", dark_color: "#E8A27F" }] },
          { ...say(ctx, l, "crWorkshop1", face(l, 18, { line_height: 1.3 }), { max_lines: 2 }), ...white },
          { id: id(), type: "row", gap: 6, scroll: true, children: [chip(ctx, l, "schedule", "crWorkshop1Hours", true), chip(ctx, l, "location_on", "crWorkshop1Place", true)] },
          chip(ctx, l, "inventory_2", "crToolsIncluded", true),
          { ...fillButton(ctx, l, "crBookSeat", shop, { height: 40 }), margin: sides(6, 0, 0, 0) },
        ],
      },
      ...(kitPhoto(ctx, l, "knit-coffee") ? [{ id: id(), type: "image" as const, image_url: kitPhoto(ctx, l, "knit-coffee")!, width: 118, height: 236, fit: "cover" as const, corners: { top_end: l.radius + 4, bottom_end: l.radius + 4 } }] : []),
    ],
  };
}

/** A's custom-order card (its options: the design, the colour and yarn, the size). */
function customCard(ctx: SectionContext, l: KitLook): StudioNode {
  return kitCustomCard(ctx, l, {
    title: "crCustomTitle",
    text: "crCustomText",
    photo: "hoop-yarn",
    options: [
      { icon: "edit_note", title: "crCustomDesign", line: "crCustomDesignLine" },
      { icon: "auto_awesome", title: "crCustomColour", line: "crCustomColourLine" },
      { icon: "straighten", title: "crCustomSize", line: "crCustomSizeLine" },
    ],
    time: "skCustomTime",
    button: "skCustomButton",
  });
}

function ghurzaHome(ctx: SectionContext): StudioPage {
  const l = LOOK_A;
  const id = idOf(ctx);
  return {
    header: kitHomeHeader(ctx, l, "crWordmark", "crWordmarkLine"),
    background: A.page,
    dark_background: A.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 96, 0),
      children: [
        kitSearch(ctx, l, "crSearch"),
        kitCategories(ctx, l, "circles"),
        kitHero(
          ctx,
          l,
          [
            { photo: "wide-cozy-sweater", kicker: "crHeroKicker1", title: "crHeroTitle1", line: "crHeroLine1" },
            { photo: "wide-scarves-stack", kicker: "crHeroKicker2", title: "crHeroTitle2", line: "crHeroLine2" },
            { photo: "wide-red-scarf", kicker: "crHeroKicker3", title: "crHeroTitle3", line: "crHeroLine3" },
          ],
          "crShopCollection",
        ),
        customCard(ctx, l),
        kitHead(ctx, l, "crNewTitle", { word: "skSeeAll", action: shop }, "crNewLine"),
        kitProducts(ctx, l, { word: "crNewTitle", size: [158, 196] }),
        kitHead(ctx, l, "crStoryTitle", null, "crStoryLine"),
        kitStory(ctx, l, {
          photo: "wide-knit-flatlay",
          quote: "skStoryQuote",
          name: "skStoryName",
          role: "skStoryRole",
          stats: [
            { value: "skStat3", label: "skStat3Label" },
            { value: "skStat2", label: "skStat2Label" },
            { value: "skStat1", label: "skStat1Label" },
          ],
        }),
        kitHead(ctx, l, "crYarnTitle", { word: "crYarnGuide", action: shop }),
        yarnCards(ctx, l),
        kitHead(ctx, l, "crLovedTitle", { word: "skSeeAll", action: shop }),
        kitProducts(ctx, l, { word: "crLovedTitle", sort: "popular", layout: "grid", limit: 4, size: [166, 196] }),
        kitHead(ctx, l, "crWorkshopsTitle", { word: "crAllWorkshops", action: shop }, "crWorkshopsLine"),
        workshopCard(ctx, l),
        kitHead(ctx, l, "crReviewsTitle", null, "crReviewsLine"),
        kitReviews(ctx, l, [
          { quote: "crReview1", name: "crReview1Name", place: "crReview1Place" },
          { quote: "crReview2", name: "crReview2Name", place: "crReview2Place" },
          { quote: "crReview3", name: "crReview3Name", place: "crReview3Place" },
        ]),
        kitGift(ctx, l, { title: "crGiftTitle", line: "crGiftLine" }),
      ],
    },
  };
}

// ——— B · HABKA ———

/** B's greeting under the header: a hello and the workshop's news. */
function greeting(ctx: SectionContext, l: KitLook): StudioNode {
  return { id: idOf(ctx)(), type: "column", name: ctx.w("crGreeting"), gap: 3, padding: sides(4, 16, 8, 16), children: [say(ctx, l, "crGreeting", face(l, 24, { weight: 700 }), { max_lines: 1 }), say(ctx, l, "crGreetingLine", { size: 13 }, { muted: true, max_lines: 1 })] };
}

/** B's search row: the pill and a "Design" button opening the custom order. */
function searchRow(ctx: SectionContext, l: KitLook): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("crSearchB"),
    gap: 8,
    cross: "center",
    padding: sides(4, 16, 6, 16),
    children: [{ ...kitSearch(ctx, l, "crSearchB", sides(0, 0, 0, 0)), width: "fill", radius: 16 }, { ...fillButton(ctx, l, "crDesign", ownPage(ctx, KIT_CUSTOM_PAGE), { height: 50 }), icon: "edit_note", icon_position: "start" as const, radius: 16 }],
  };
}

/** "Your custom order": the person's newest order step by step (its bars), the first lit with none. */
function customProgress(ctx: SectionContext, l: KitLook): StudioNode {
  const step = (title: SectionWord, text: SectionWord, icon: string, highlight = false): StudioEntry => sigEntry(ctx, { title, text }, { icon, ...(highlight ? { highlight: true } : {}) });
  return {
    id: idOf(ctx)(),
    type: "timeline",
    name: ctx.w("crYourOrder"),
    timeline: { style: "bars", source: "latest_order" },
    color: l.k.ink,
    dark_color: l.k.darkInk,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    radius: l.radius + 6,
    padding: sides(16, 14, 16, 14),
    margin: sides(0, 16, 4, 16),
    entries: [step("crTrack1", "crTrack1Short", "check_circle", true), step("crTrack2", "crTrack2Short", "sync"), step("crTrack3", "crTrack3Short", "redeem"), step("crTrack4", "crTrack4Short", "local_shipping")],
  };
}

/** B's "Design your own piece": the kinds of piece, the yarn's shades, the time and the start. */
function designCard(ctx: SectionContext, l: KitLook): StudioNode {
  const id = idOf(ctx);
  const kind = (icon: string, word: SectionWord, lit: boolean): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    gap: 6,
    cross: "center",
    radius: 16,
    padding: sides(12, 4, 12, 4),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    ...(lit ? { border_color: l.k.fill, dark_border_color: l.k.darkAccent, border_width: 2 } : {}),
    action: ownPage(ctx, KIT_CUSTOM_PAGE),
    children: [{ id: id(), type: "icon", icon, icon_size: 24, color: l.k.accent, dark_color: l.k.darkAccent }, say(ctx, l, word, { size: 12.5, weight: lit ? 700 : 500 }, { text_align: "center", max_lines: 1 })],
  });
  return {
    id: id(),
    type: "column",
    name: ctx.w("crDesignTitle"),
    gap: 12,
    radius: l.radius + 8,
    padding: sides(18, 16, 18, 16),
    margin: sides(22, 16, 4, 16),
    background: l.tint.day,
    dark_background: l.tint.night,
    children: [
      { id: id(), type: "column", gap: 4, children: [say(ctx, l, "crDesignTitle", face(l, 20), { max_lines: 2 }), say(ctx, l, "crDesignText", { size: 13, line_height: 1.45 }, { muted: true, max_lines: 2 })] },
      say(ctx, l, "crPieceKind", { size: 12.5, weight: 600 }, { muted: true, max_lines: 1 }),
      { id: id(), type: "row", gap: 8, children: [kind("bed", "crKindBlanket", true), kind("checkroom", "crKindCardigan", false), kind("shopping_bag", "crKindBag", false), kind("child_care", "crKindToy", false)] },
      say(ctx, l, "crYarnColour", { size: 12.5, weight: 600 }, { muted: true, max_lines: 1 }),
      swatches(ctx, SWATCHES.habka, { width: "fill", height: 34, radius: 10 }, 7),
      { id: id(), type: "divider", height: 1, background: l.k.line, dark_background: l.k.darkLine, margin: sides(2, 0, 2, 0) },
      {
        id: id(),
        type: "row",
        gap: 10,
        cross: "center",
        children: [
          { id: id(), type: "row", width: "fill", gap: 5, cross: "center", children: [{ id: id(), type: "icon", icon: "schedule", icon_size: 16, color: l.k.muted, dark_color: l.k.darkMuted }, say(ctx, l, "skCustomTime", { size: 12.5 }, { muted: true, max_lines: 2 })] },
          fillButton(ctx, l, "crStartDesign", ownPage(ctx, KIT_CUSTOM_PAGE), { icon: "arrow_forward" }),
        ],
      },
    ],
  };
}

/** The colour of the season: the yarn and its shades over the season's words, opening the shop's merino. */
function seasonColour(ctx: SectionContext, l: KitLook): StudioNode {
  const id = idOf(ctx);
  const hex = (value: string): StudioNode => ({ id: id(), type: "text", text: value, font: { size: 11.5, weight: 500 }, color: l.k.muted, dark_color: l.k.darkMuted, radius: 8, padding: sides(4, 8, 4, 8), background: l.tint.day, dark_background: l.tint.night });
  return {
    id: id(),
    type: "column",
    name: ctx.w("crMerinoYarn"),
    gap: 0,
    radius: l.radius + 8,
    margin: sides(22, 16, 4, 16),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    action: shop,
    children: [
      {
        id: id(),
        type: "row",
        height: 120,
        gap: 0,
        children: [
          ...(kitPhoto(ctx, l, "yarn-balls") ? [{ id: id(), type: "image" as const, image_url: kitPhoto(ctx, l, "yarn-balls")!, width: 140, height: 120, fit: "cover" as const, corners: { top_start: l.radius + 8 } }] : []),
          ...SWATCHES.season.map((c, i) => ({ id: id(), type: "row" as const, width: "fill" as const, height: 120, background: c, dark_background: c, ...(i === SWATCHES.season.length - 1 ? { corners: { top_end: l.radius + 8 } } : {}), children: [] })),
        ],
      },
      {
        id: id(),
        type: "column",
        gap: 6,
        padding: sides(14, 16, 16, 16),
        children: [
          say(ctx, l, "crSeasonKicker", { size: 12 }, { muted: true, max_lines: 1 }),
          say(ctx, l, "crSeasonTitle", face(l, 20), { max_lines: 1 }),
          say(ctx, l, "crSeasonText", { size: 13, line_height: 1.5 }, { muted: true, max_lines: 3 }),
          { id: id(), type: "row", gap: 6, margin: sides(4, 0, 0, 0), children: SWATCHES.season.map(hex) },
        ],
      },
    ],
  };
}

/** The toolkit: kits, yarn and tools as cards, each named like the shop's category (it opens it). */
function toolkit(ctx: SectionContext, l: KitLook): StudioNode {
  const id = idOf(ctx);
  const card = (photo: string, title: SectionWord, line: SectionWord, tag: SectionWord): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(title),
    width: 270,
    gap: 12,
    cross: "center",
    radius: l.radius + 4,
    padding: sides(10, 10, 10, 10),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    action: shop,
    children: [
      ...(kitPhoto(ctx, l, photo) ? [{ id: id(), type: "image" as const, image_url: kitPhoto(ctx, l, photo)!, width: 84, height: 84, radius: 12, fit: "cover" as const }] : []),
      {
        id: id(),
        type: "column",
        width: "fill",
        gap: 4,
        children: [
          say(ctx, l, title, face(l, 15), { max_lines: 1 }),
          say(ctx, l, line, { size: 12 }, { muted: true, max_lines: 2 }),
          { ...say(ctx, l, tag, { size: 11, weight: 600 }, { accent: true, max_lines: 1 }), radius: 8, padding: sides(3, 8, 3, 8), background: l.tint.day, dark_background: l.tint.night },
        ],
      },
    ],
  });
  return {
    id: id(),
    type: "row",
    name: ctx.w("crToolkitTitle"),
    gap: 10,
    scroll: true,
    padding: sides(0, 16, 4, 16),
    children: [card("blue-yarn", "crKits", "crKitsLine", "crBeginner"), card("yarn-ball-white", "crCottonYarn", "crCottonLine", "crBestSeller"), card("hoop-yarn", "crHooks", "crHooksLine", "crReadyToShip")],
  };
}

/** The workshop's story as a wide photo: its quote, who says it. */
function storyBanner(ctx: SectionContext, l: KitLook): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w("crStoryKicker"),
    image_url: kitPhoto(ctx, l, "wide-knit-coffee"),
    height: 230,
    radius: l.radius + 8,
    background: l.k.darkPage,
    scrim: { color: "#1F0E18", from: 0.05, middle: 0.3, at: 40, to: 0.85 },
    align: "end",
    padding: sides(16, 18, 16, 18),
    margin: sides(22, 16, 4, 16),
    children: [
      { ...say(ctx, l, "crStoryKicker", { size: 12, weight: 600 }, { max_lines: 1 }), color: "#E7A9CB", dark_color: "#E7A9CB" },
      { ...say(ctx, l, "skStoryQuote", face(l, 16, { weight: 600, line_height: 1.5 }), { max_lines: 3, margin: sides(4, 0, 0, 0) }), ...white },
      { ...say(ctx, l, "skStoryName", { size: 12.5, weight: 700 }, { max_lines: 1, margin: sides(6, 0, 0, 0) }), ...white },
    ],
  };
}

/** The month's workshops as a list of rows, each named like the shop's Workshops (it opens them). */
function workshopList(ctx: SectionContext, l: KitLook): StudioNode {
  const id = idOf(ctx);
  const row = (title: SectionWord, line: SectionWord, icon: string): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w("crWorkshops"),
    gap: 12,
    cross: "center",
    padding: sides(12, 0, 12, 0),
    action: shop,
    children: [
      { id: id(), type: "row", width: 52, height: 52, radius: 14, align: "center", cross: "center", background: l.tint.day, dark_background: l.tint.night, children: [{ id: id(), type: "icon", icon, icon_size: 24, color: l.k.accent, dark_color: l.k.darkAccent }] },
      { id: id(), type: "column", width: "fill", gap: 3, children: [say(ctx, l, title, { family: l.family, size: 14.5, weight: 700 }, { max_lines: 1 }), say(ctx, l, line, { size: 12 }, { muted: true, max_lines: 1 })] },
      { ...say(ctx, l, "crBook", { size: 12.5, weight: 700 }, { accent: true, max_lines: 1 }), radius: 10, padding: sides(6, 12, 6, 12), background: l.tint.day, dark_background: l.tint.night },
    ],
  });
  const divider = (): StudioNode => ({ id: id(), type: "divider", height: 1, background: l.k.line, dark_background: l.k.darkLine });
  return {
    id: id(),
    type: "column",
    name: ctx.w("crWorkshopsMonth"),
    gap: 0,
    radius: l.radius + 8,
    padding: sides(4, 14, 4, 14),
    margin: sides(0, 16, 4, 16),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    children: [row("crWorkshop1", "crWorkshop1Line", "school"), divider(), row("crWorkshop2", "crWorkshop2Line", "play_circle"), divider(), row("crWorkshop3", "crWorkshop3Line", "bed")],
  };
}

/** Customers' photos: their words under the photo of the piece at home. */
function customerPhotos(ctx: SectionContext, l: KitLook): StudioNode {
  const entry = (photo: string, quote: SectionWord, name: SectionWord, place: SectionWord): StudioEntry => {
    const url = kitPhoto(ctx, l, photo);
    return sigEntry(ctx, { text: quote, title: name, subtitle: place }, { value: 5, ...(url ? { image_url: url } : {}) });
  };
  return {
    id: idOf(ctx)(),
    type: "testimonials",
    name: ctx.w("crPhotosTitle"),
    testimonials: { style: "carousel" },
    color: l.k.ink,
    dark_color: l.k.darkInk,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    radius: l.radius + 6,
    padding: sides(0, 16, 0, 16),
    entries: [entry("slippers", "crReview1", "crReview1Name", "crReview1Place"), entry("red-scarf", "crReview2", "crReview2Name", "crReview2Place"), entry("teddy-sweater", "crReview3", "crReview3Name", "crReview3Place")],
  };
}

function habkaHome(ctx: SectionContext): StudioPage {
  const l = LOOK_B;
  const id = idOf(ctx);
  return {
    header: kitHomeHeader(ctx, l, "crWordmark", "crWordmarkLineB"),
    background: B.page,
    dark_background: B.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 96, 0),
      children: [
        greeting(ctx, l),
        searchRow(ctx, l),
        kitCategories(ctx, l, "chips"),
        kitHero(
          ctx,
          l,
          [
            { photo: "wide-scarves-stack", kicker: "crHeroKicker1", title: "crHeroTitle2", line: "crHeroLine2" },
            { photo: "wide-mittens-coffee", kicker: "crHeroKickerB2", title: "crHeroTitleB2", line: "crHeroLineB2" },
            { photo: "wide-hoop-yarn", kicker: "crWorkshops", title: "crHeroTitleB3", line: "crHeroLineB3" },
          ],
          "crDiscover",
        ),
        kitHead(ctx, l, "crYourOrder", { word: "crTrackLink", action: screen("orders") }),
        customProgress(ctx, l),
        designCard(ctx, l),
        kitHead(ctx, l, "crArrivals", { word: "skSeeAll", action: shop }, "crArrivalsLine"),
        kitProducts(ctx, l, { word: "crArrivals", size: [160, 200] }),
        seasonColour(ctx, l),
        kitHead(ctx, l, "crToolkitTitle", { word: "crYarnShop", action: shop }, "crToolkitLine"),
        toolkit(ctx, l),
        storyBanner(ctx, l),
        kitHead(ctx, l, "crWorkshopsMonth", { word: "crAllWorkshops", action: shop }),
        workshopList(ctx, l),
        kitHead(ctx, l, "crPhotosTitle", { word: "skSeeAll", action: shop }, "crReviewsLine"),
        customerPhotos(ctx, l),
        kitPromises(ctx, l, [
          { icon: "waving_hand", title: "skStat1Label", line: "crPromiseHand" },
          { icon: "local_shipping", title: "crPromiseShip", line: "crPromiseShipLine" },
          { icon: "payments", title: "crPromiseCash", line: "crPromiseCashLine" },
        ]),
      ],
    },
  };
}

// ——— The pages after the home (both looks) ———

const over = (l: KitLook) => (screenName: string, ctx: SectionContext): StudioNode[] | null => {
  switch (screenName) {
    case "search":
      return kitShopTop(ctx, l, { photo: l.look === "a" ? "wide-scarves-stack" : "wide-red-scarf", kicker: "crHeroKicker1", title: "crHeroTitle1" });
    case "cart":
      return kitCartTop(ctx, l, CROCHET_COUPON_CODE, { icon: "redeem", word: "crCartNote" });
    case "orders":
      return kitOrdersTop(ctx, l, [
        { title: "crTrack1", text: "crTrack1Text" },
        { title: "crTrack2", text: "crTrack2Text" },
        { title: "crTrack3", text: "crTrack3Text" },
        { title: "crTrack4", text: "crTrack4Text" },
      ]);
    default:
      return null;
  }
};

/** The custom order's request: the piece, its size, the yarn's colour, the details, the name and phone. */
const CUSTOM_FORM: Parameters<typeof kitCustomPage>[2]["form"] = {
  fields: [
    { kind: "choice", label: "crFieldPiece", required: true, options: ["crKindBlanket", "crKindCardigan", "crKindScarf", "crKindBag", "crKindToy", "crKindOther"] },
    { kind: "text", label: "crFieldSize" },
    { kind: "text", label: "crFieldColour", required: true },
    { kind: "long_text", label: "skFieldDetails" },
    { kind: "text", label: "skFieldName", required: true },
    { kind: "phone", label: "skFieldPhone", required: true },
  ],
  submit: "skCustomSend",
  success: "skCustomSent",
};

const pages = (l: KitLook) => (ctx: SectionContext) => [
  {
    slug: KIT_MENU_PAGE,
    title: "skCategoryMenu" as SectionWord,
    studio: kitMenuPage(ctx, l, {
      wordmark: "crWordmark",
      search: "crSearchMenu",
      quick: [
        { word: "crNewTitle", icon: "new_releases" },
        { word: "crWorkshops", icon: "school" },
        { word: "crYarnTitle", icon: "spa" },
      ],
      contactLine: "crContactLine",
    }),
  },
  {
    slug: KIT_CUSTOM_PAGE,
    title: "crCustomPage" as SectionWord,
    studio: kitCustomPage(ctx, l, {
      title: "crCustomPage",
      intro: "crCustomIntro",
      steps: [
        { title: "crStep1", text: "crStep1Text" },
        { title: "crStep2", text: "crStep2Text" },
        { title: "crStep3", text: "crStep3Text" },
        { title: "crStep4", text: "crStep4Text" },
      ],
      form: CUSTOM_FORM,
    }),
  },
];

/** The demo's code shown in the app (lib/demo/kits/crochet.ts makes it). */
export const CROCHET_COUPON_CODE = "GHURZA10";

// ——— The sign-in screens, the bars and the two looks ———

const FIRST = ["orders", "notifications", "settings", "help", "privacy", "terms"] as const;

const GHURZA_SCREENS = signatureScreens({
  style: "photo",
  photo: "/crochet-photos/hero.jpg",
  title: { en: "Welcome to the workshop", ar: "أهلًا بكِ في المشغل", tr: "Atölyeye hoş geldiniz" },
  subtitle: { en: "Sign in to follow your orders and your custom pieces.", ar: "سجّلي الدخول لتتابعي طلباتكِ وقطعكِ الخاصة.", tr: "Siparişlerinizi ve size özel parçalarınızı takip etmek için giriş yapın." },
  menu: "cover",
  first: FIRST,
});

const HABKA_SCREENS = signatureScreens({
  style: "photo",
  photo: "/crochet-photos/green-sweater.jpg",
  title: { en: "Stitch by stitch", ar: "غرزة بعد غرزة", tr: "İlmek ilmek" },
  subtitle: { en: "Sign in to design your piece and follow it as it is made.", ar: "سجّلي الدخول لتصمّمي قطعتكِ وتتابعيها وهي تُصنع.", tr: "Parçanızı tasarlamak ve yapılışını izlemek için giriş yapın." },
  menu: "night",
  accent: B.fill,
  first: FIRST,
});

/** A's floating bar: cream by day, coffee by night, the open tab on terracotta's tint. */
export const GHURZA_BAR = signatureBar(A, { design: "float", background: "#FFFCF7", dark_background: "#241C18", active: A.fill, dark_active: A.darkAccent, inactive: A.muted, dark_inactive: "#A8998D", labels: "active", radius: 30, margin: 12 });
/** B's floating bar: white by day, plum-black by night, the open tab plum. */
export const HABKA_BAR = signatureBar(B, { design: "float", background: "#FFFFFF", dark_background: "#201B1F", active: B.fill, dark_active: B.darkAccent, inactive: B.muted, dark_inactive: "#9C9298", labels: "active", radius: 28, margin: 12 });

export const CROCHET_A: SignatureDesign = {
  demo: "crochet",
  variant: "a",
  template: { id: "crochet_signature_a", icon: "spa", fits: { types: ["store"], plain: true } },
  home: ghurzaHome,
  over: over(LOOK_A),
  tabs: kitTabs,
  pages: pages(LOOK_A),
  bar: GHURZA_BAR,
  look: { header: signatureHeader(A, "glass"), background: A.page, dark_background: A.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    // Look A is the demo: its main colour the demo's (lib/demo/content.ts).
    appearance: { secondary_color: "#5E6B4E", font_family: LOOK_A.family, dark_background: A.darkPage, dark_surface: A.darkSurface },
    screens: GHURZA_SCREENS,
  },
};

export const CROCHET_B: SignatureDesign = {
  demo: "crochet",
  variant: "b",
  template: { id: "crochet_signature_b", icon: "auto_awesome", fits: { types: ["store"], plain: true } },
  home: habkaHome,
  over: over(LOOK_B),
  tabs: kitTabs,
  pages: pages(LOOK_B),
  bar: HABKA_BAR,
  look: { header: signatureHeader(B, "glass"), background: B.page, dark_background: B.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    primary: B.fill,
    appearance: { secondary_color: "#D9A1A0", font_family: LOOK_B.family, dark_background: B.darkPage, dark_surface: B.darkSurface },
    screens: HABKA_SCREENS,
  },
};

// ——— Ghurza's own parts as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;
const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};
const alone = (ctx: SectionContext): SectionContext => ({ ...ctx, ownPages: false });

export const CROCHET_SECTIONS: readonly SectionInfo[] = [
  // Design your own piece: the kinds, the yarn's shades and the start (on its own, the shop).
  { id: "cr_design_piece", icon: "edit_note", isNew: true, fits: STORE_PLAIN, make: one((ctx) => designCard(alone(ctx), LOOK_B)) },
  // The person's custom order step by step (their newest order).
  { id: "cr_order_progress", icon: "sync", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [kitHead(ctx, LOOK_B, "crYourOrder", { word: "crTrackLink", action: screen("orders") }), customProgress(ctx, LOOK_B)]) },
  // Shop by yarn: a card per yarn with its shades, each opening its category.
  { id: "cr_yarn_cards", icon: "spa", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [kitHead(ctx, LOOK_A, "crYarnTitle", { word: "crYarnGuide", action: shop }), yarnCards(ctx, LOOK_A)]) },
  // The colour of the season.
  { id: "cr_season_colour", icon: "auto_awesome", isNew: true, fits: STORE_PLAIN, make: one((ctx) => seasonColour(ctx, LOOK_B)) },
  // A workshop as a dark card, and the month's workshops as a list (seats sold as the shop's products).
  { id: "cr_workshop", icon: "school", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [kitHead(ctx, LOOK_A, "crWorkshopsTitle", { word: "crAllWorkshops", action: shop }, "crWorkshopsLine"), workshopCard(ctx, LOOK_A)]) },
  { id: "cr_workshop_list", icon: "event", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [kitHead(ctx, LOOK_B, "crWorkshopsMonth", { word: "crAllWorkshops", action: shop }), workshopList(ctx, LOOK_B)]) },
];
