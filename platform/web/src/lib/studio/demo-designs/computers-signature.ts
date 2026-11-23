import type { Action, LayoutTab, StudioEntry, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { installmentsTag } from "../installments";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigPhoto, sigTexts, signatureBar, signatureHeader, type SignatureInk } from "./food-signature-parts";
import { clothesTabs } from "./clothes-signature";

/**
 * 211 Nawah (نواة), Studio's computers and gaming type (lib/studio/
 * shop-types.ts): a Studio demo of the store kind and its two Signature
 * looks, each a whole store project (its home, its menu, its shop, cart and
 * orders, its tabs, its floating bar, its sign-in screen and account), built
 * only from Studio's elements so every part is the owner's to change, as the
 * owner approved them (a real native phone app: a small header, a search
 * pill, the categories, a compact hero carousel of about 210 px with the
 * next card peeking, tight sections and a floating bar).
 *
 * A · NAWAH: cool white and one strong blue, IBM Plex Sans Arabic; a deep
 * graphite night.
 * B · SILICA: deep green on warm stone, numbered sections (01, 02…), Noto
 * Kufi Arabic; a green-black night.
 *
 * Both share the computers shop's own parts, each a reusable element (lib/
 * pages/types.ts STUDIO_TECH_TYPES, lib/selling/specs.ts and tech.ts): Build
 * your PC (`pc_builder`, and any button with `flow: pc_builder`), the shop
 * filtered by processor, memory, storage and graphics (`spec_filter`), a
 * product's specifications as a table (`spec_table`), ready builds side by
 * side (`compare`), and "Installments coming soon" (never a way to pay).
 * Nothing is made up: the lists, the categories, the sale, the specs and
 * the prices are the shop's own; the owner's words are in [brackets] (the
 * demo fills them, lib/studio/demo-templates.ts).
 */

// ——— The two looks' colours and faces ———

/** A · NAWAH: cool white and graphite ink, one strong blue; a graphite night. */
export const NAWAH_INK: SignatureInk = {
  page: "#F2F3F5",
  darkPage: "#0B0D11",
  surface: "#FFFFFF",
  darkSurface: "#14171D",
  ink: "#11141A",
  darkInk: "#EDEFF3",
  muted: "#4A5161",
  darkMuted: "#B4BAC6",
  line: "#E1E4E9",
  darkLine: "#242931",
  accent: "#2A52D8",
  darkAccent: "#9DB4FF",
  fill: "#2F5BEA",
  darkFill: "#3D66F0",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const A = NAWAH_INK;
/** A's tint (the services, the chips) and its deep cards (the deals, the gamer zone). */
const A_TINT = { day: "#E6ECFE", night: "#172041" };
const A_DEEP = { day: "#10131A", night: "#161A22" };
const PLEX = "IBM Plex Sans Arabic";

/** B · SILICA: warm stone and deep green; a green-black night. */
export const SILICA_INK: SignatureInk = {
  page: "#F4F4F1",
  darkPage: "#0D0F0E",
  surface: "#FFFFFF",
  darkSurface: "#161917",
  ink: "#151714",
  darkInk: "#ECEEEA",
  muted: "#4C514B",
  darkMuted: "#B3B9B1",
  line: "#E2E2DC",
  darkLine: "#262B27",
  accent: "#0B6E53",
  darkAccent: "#74DDBB",
  fill: "#0E7A5C",
  darkFill: "#2FB389",
  onFill: "#FFFFFF",
  darkOnFill: "#06140F",
};
const B = SILICA_INK;
const B_TINT = { day: "#DDF0E8", night: "#11291F" };
const B_DEEP = { day: "#141815", night: "#1A1F1B" };
const KUFI = "Noto Kufi Arabic";

/** Nawah's photos (public/computers-photos, CC0 from StockSnap, credited in CREDITS.md). */
const P = (name: string) => `/computers-photos/${name}.jpg`;

const shop: Action = screen("search");
/** Build your PC when the shop has it set up (`StoreConfig.pc_builder`); else, and in an older app, the shop. */
const build: Action = { type: "screen", screen: "search", flow: "pc_builder" };
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
/** One of the look's own pages where the whole look is made (the demo, a project started from it); where its home is made alone, the shop. */
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));
/** The category menu's page, Build your PC's and the filters' (both looks have them). */
export const MENU_PAGE = "menu";
export const BUILD_PAGE = "build-your-pc";
export const SPECS_PAGE = "find-by-spec";

/** The look's ink, its tint, its deep cards and its face. */
interface Look {
  k: SignatureInk;
  tint: { day: string; night: string };
  deep: { day: string; night: string };
  family: string;
  look: "a" | "b";
}
const LOOK_A: Look = { k: A, tint: A_TINT, deep: A_DEEP, family: PLEX, look: "a" };
const LOOK_B: Look = { k: B, tint: B_TINT, deep: B_DEEP, family: KUFI, look: "b" };

// ——— What both looks are made of ———

const face = (l: Look, size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: l.family, size, weight: 700, line_height: 1.25, ...extra });

function say(ctx: SectionContext, l: Look, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, l.k, ctx.w(word), font, extra);
}

/** White words over a photo or a deep card (by day and by night). */
const white = (extra: Partial<StudioNode> = {}): Partial<StudioNode> => ({ color: "#FFFFFF", dark_color: "#FFFFFF", ...extra });

/** A section's title (in B, its number over it), a quieter line under it, a link at its end. */
function headOf(ctx: SectionContext, l: Look, title: SectionWord, link: { word: SectionWord; action: Action } | null, line?: SectionWord, number?: string, padding: StudioSides = sides(24, 16, 10, 16)): StudioNode {
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
          ...(number && l.look === "b" ? [inked(ctx, l.k, number, { family: l.family, size: 11, weight: 700, letter_spacing: 1 }, { accent: true })] : []),
          say(ctx, l, title, face(l, l.look === "a" ? 19 : 20), { max_lines: 2 }),
          ...(line ? [say(ctx, l, line, { size: 12 }, { muted: true, max_lines: 2 })] : []),
        ],
      },
      ...(link
        ? [
            {
              id: id(),
              type: "row" as const,
              name: ctx.w(link.word),
              height: 32,
              gap: 4,
              cross: "center" as const,
              action: link.action,
              children: [say(ctx, l, link.word, { size: 12.5, weight: 600 }, { accent: true }), { id: id(), type: "icon" as const, icon: "arrow_forward", icon_size: 16, color: l.k.accent, dark_color: l.k.darkAccent }],
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
    radius: l.look === "a" ? 16 : 25,
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

/**
 * The shop filtered by a spec (`spec_filter`): the values the shop's
 * products take (16 GB, 32 GB…) as chips with how many have each, each
 * opening the shop filtered by it. `title`: its name over the chips.
 */
function specFilter(ctx: SectionContext, l: Look, spec: "cpu" | "ram" | "storage" | "gpu", title: SectionWord | null, margin = sides(4, 16, 4, 16)): StudioNode {
  const t = title ? sigTexts(ctx, { text: title }) : null;
  return {
    id: idOf(ctx)(),
    type: "spec_filter",
    name: ctx.w(title ?? SPEC_WORDS[spec]),
    ...(t ? { text: t.text, translations: t.translations } : {}),
    tech: { spec, accent: l.look === "a" ? A.fill : B.fill, rows: 6 },
    color: l.k.ink,
    dark_color: l.k.darkInk,
    margin,
  };
}
const SPEC_WORDS = { cpu: "pcSpecCpu", ram: "pcSpecRam", storage: "pcSpecStorage", gpu: "pcSpecGpu" } as const satisfies Record<string, SectionWord>;

/** The shop's main categories under the search: A as tiles, B as round photos (each opens the shop on it). */
function categoryRow(ctx: SectionContext, l: Look): StudioNode {
  return { id: idOf(ctx)(), type: "categories", name: ctx.w("pcCategories"), source: "products", style: l.look === "a" ? "tiles" : "circles", color: l.k.ink, dark_color: l.k.darkInk, padding: sides(10, 12, 4, 12) };
}

/** One hero card: a photo under a shade from its start, its kicker, headline and line, and a button in the look's colour. */
function heroCard(ctx: SectionContext, l: Look, photo: string, kicker: SectionWord, title: SectionWord, line: SectionWord, button: SectionWord, action: Action = shop): StudioNode {
  const id = idOf(ctx);
  const shade = l.look === "a" ? "#080A10" : "#0B0F0D";
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w(title),
    image_url: sigPhoto(ctx, P(photo)),
    height: 210,
    radius: l.look === "a" ? 24 : 22,
    background: shade,
    scrim: { color: shade, from: 0.2, middle: 0.45, at: 50, to: 0.88 },
    align: "end",
    padding: sides(16, 18, 16, 18),
    action,
    children: [
      say(ctx, l, kicker, { size: 11.5, weight: 600 }, { color: l.look === "a" ? "#AFC2FF" : "#8FE3C6", dark_color: l.look === "a" ? "#AFC2FF" : "#8FE3C6", max_lines: 1 }),
      say(ctx, l, title, face(l, l.look === "a" ? 22 : 21, { line_height: 1.2 }), white({ max_lines: 2, margin: sides(5, 0, 0, 0) })),
      say(ctx, l, line, { size: 12 }, white({ opacity: 0.82, max_lines: 1, margin: sides(4, 0, 0, 0) })),
      {
        id: id(),
        type: "button",
        name: ctx.w(button),
        text: ctx.w(button),
        icon: "arrow_forward",
        icon_position: "end",
        width: "hug",
        height: 38,
        radius: l.look === "a" ? 12 : 19,
        padding: sides(0, 16, 0, 16),
        self_align: "start",
        margin: sides(12, 0, 0, 0),
        background: l.k.fill,
        dark_background: l.k.darkFill,
        color: l.k.onFill,
        dark_color: l.k.darkOnFill,
        font: { size: 13.5, weight: 700 },
        motion: { press: "shrink" },
        action,
      },
    ],
  };
}

/** The compact hero carousel: cards 210 px tall, the next one peeking, dots under them. */
function heroCarousel(ctx: SectionContext, l: Look, cards: readonly [string, SectionWord, SectionWord, SectionWord, SectionWord, Action?][]): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "slider",
    name: ctx.w("pcHeroName"),
    height: 210,
    per_view: 1.1,
    gap: 10,
    autoplay: true,
    interval_ms: 5000,
    dots: true,
    indicator: "dots",
    padding: sides(14, 16, 4, 16),
    children: cards.map(([photo, kicker, title, line, button, action]) => heroCard(ctx, l, photo, kicker, title, line, button, action)),
  };
}

/** A product card: its photo with the sale's share off, its name, its key specs in one line (the spec line the shop serves) and its price. */
function productCard(ctx: SectionContext, l: Look, width: number, height: number): StudioNode {
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
          { id: id(), type: "image", bind: "image", width, height, radius: l.look === "a" ? 18 : 16, fit: "cover", background: l.k.line, dark_background: "#E7EAEE" },
          { id: id(), type: "text", bind: "sale", font: { size: 11, weight: 800 }, color: "#FFFFFF", background: l.look === "a" ? "#C42A3D" : B.fill, dark_color: l.look === "a" ? "#2A0D12" : B.darkOnFill, dark_background: l.look === "a" ? "#FF8796" : B.darkFill, radius: 8, padding: sides(3, 7, 3, 7), place: { x: 6, y: 5 } },
        ],
      },
      { id: id(), type: "text", bind: "title", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 13.5, weight: 600 } },
      { id: id(), type: "text", bind: "subtitle", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 11.5 } },
      {
        id: id(),
        type: "row",
        gap: 6,
        cross: "center",
        children: [
          { id: id(), type: "text", bind: "price", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 14.5, weight: 700 } },
          { id: id(), type: "text", bind: "was_price", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 11.5 } },
        ],
      },
    ],
  };
}

/** A row of the shop's products (the featured ones, or the newest). */
function productRow(ctx: SectionContext, l: Look, name: SectionWord, sort: "newest" | "popular" = "newest", featured = false): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "items",
    name: ctx.w(name),
    source: "products",
    layout: "carousel",
    gap: 12,
    padding: sides(0, 16, 0, 16),
    query: { limit: 8, category_id: null, featured, sort, ids: [] },
    card: productCard(ctx, l, 160, 150),
  };
}

/** Two by two: the shop's best sellers (the most wanted parts). */
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
    query: { limit: 4, category_id: null, featured: false, sort: "popular", ids: [] },
    card: productCard(ctx, l, 167, 150),
  };
}

/** The shop's hour deals (the `flash_sale` element: the sale ending soonest, was and now prices, a live countdown and the stock left; left out while none is on). */
function dealCard(ctx: SectionContext, l: Look, look: "banner" | "carousel"): StudioNode {
  const t = sigTexts(ctx, { text: "pcDeal" });
  return {
    id: idOf(ctx)(),
    type: "flash_sale",
    name: ctx.w("pcDeal"),
    text: t.text,
    translations: t.translations,
    flash_sale: { look, limit: 6, countdown: true, stock_bar: true, accent: l.look === "a" ? A.fill : B.fill },
    radius: 24,
    margin: sides(22, 16, 4, 16),
  };
}

/** Build your PC as a card (`pc_builder`): its parts in order and the button that starts it; nothing until the shop has it set up. */
function builderCard(ctx: SectionContext, l: Look): StudioNode {
  const t = sigTexts(ctx, { text: "pcBuildCard" });
  return {
    id: idOf(ctx)(),
    type: "pc_builder",
    name: ctx.w("pcBuildTitle"),
    text: t.text,
    translations: t.translations,
    tech: { accent: l.look === "a" ? A.fill : B.fill },
    color: l.k.ink,
    dark_color: l.k.darkInk,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    radius: 22,
    padding: sides(16, 16, 16, 16),
    margin: sides(0, 16, 0, 16),
  };
}

/** Uses as photo tiles, two by two (each opens the shop): creators, gaming, streaming, work and study. */
function purposeTiles(ctx: SectionContext, l: Look, tiles: readonly [string, SectionWord, SectionWord][]): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "grid",
    name: ctx.w("pcByUse"),
    columns: 2,
    gap: 10,
    padding: sides(0, 16, 0, 16),
    children: tiles.map(([photo, kicker, title]) => ({
      id: id(),
      type: "photo_hero" as const,
      name: ctx.w(title),
      image_url: sigPhoto(ctx, P(photo)),
      height: 116,
      radius: 18,
      background: "#0B0D11",
      scrim: { color: "#000000", from: 0.05, middle: 0.25, at: 45, to: 0.82 },
      align: "end" as const,
      padding: sides(10, 12, 10, 12),
      action: shop,
      children: [say(ctx, l, title, face(l, 15.5, { weight: 700 }), white({ max_lines: 1 })), say(ctx, l, kicker, { size: 10.5, weight: 500 }, white({ opacity: 0.85, max_lines: 1 }))],
    })),
  };
}

/** The gamer zone: a wide photo card over a deep ground, its line and a button, then the gaming gear. */
function gamerZone(ctx: SectionContext, l: Look): StudioNode[] {
  const id = idOf(ctx);
  return [
    {
      id: id(),
      type: "photo_hero",
      name: ctx.w("pcZoneTitle"),
      image_url: sigPhoto(ctx, P("zone-pad")),
      height: 184,
      radius: 22,
      background: "#0C2333",
      scrim: { color: "#06101A", from: 0.15, middle: 0.4, at: 50, to: 0.86 },
      align: "end",
      padding: sides(16, 18, 16, 18),
      margin: sides(24, 16, 10, 16),
      action: shop,
      children: [
        say(ctx, l, "pcZoneKicker", { size: 11.5, weight: 600 }, { color: "#A9C1FF", dark_color: "#A9C1FF", max_lines: 1 }),
        say(ctx, l, "pcZoneTitle", face(l, 20), white({ max_lines: 2, margin: sides(4, 0, 0, 0) })),
        say(ctx, l, "pcZoneLine", { size: 11.5 }, white({ opacity: 0.82, max_lines: 1, margin: sides(3, 0, 0, 0) })),
      ],
    },
    productRow(ctx, l, "pcZoneTitle", "popular"),
  ];
}

/** Nawah's services: free assembly and testing, the warranty, delivery and how to pay (with "Installments coming soon", never a way to pay). */
function services(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const card = (icon: string, title: SectionWord, text: SectionWord, tag = false): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(title),
    width: "fill",
    gap: 6,
    radius: 18,
    padding: sides(14, 14, 14, 14),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    children: [
      { id: id(), type: "icon", icon, icon_size: 22, color: l.k.accent, dark_color: l.k.darkAccent },
      say(ctx, l, title, { family: l.family, size: 13.5, weight: 700 }, { max_lines: 2 }),
      tag ? installmentsTag(ctx, { color: l.k.accent, dark_color: l.k.darkAccent, background: l.tint.day, dark_background: l.tint.night }) : say(ctx, l, text, { size: 11.5, line_height: 1.4 }, { muted: true, max_lines: 2 }),
    ],
  });
  return {
    id: id(),
    type: "column",
    name: ctx.w("pcServices"),
    gap: 10,
    padding: sides(0, 16, 0, 16),
    children: [
      { id: id(), type: "row", gap: 10, children: [card("settings", "pcServiceBuild", "pcServiceBuildText"), card("verified", "pcServiceWarranty", "pcServiceWarrantyText")] },
      { id: id(), type: "row", gap: 10, children: [card("local_shipping", "pcServiceDelivery", "pcServiceDeliveryText"), card("payments", "pcServicePay", "pcServicePay", true)] },
    ],
  };
}

/** What customers say: the owner's customers' own words, in [brackets]; never one made up. */
function reviews(ctx: SectionContext, l: Look): StudioNode {
  const quote = (text: SectionWord): StudioEntry => sigEntry(ctx, { text, title: "reviewName", subtitle: "pcQuoteRole" }, { value: null });
  return {
    id: idOf(ctx)(),
    type: "testimonials",
    name: ctx.w("pcReviews"),
    testimonials: { style: "carousel" },
    gap: 12,
    radius: 22,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    color: l.k.ink,
    dark_color: l.k.darkInk,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    padding: sides(0, 16, 0, 16),
    entries: [quote("reviewText"), quote("pcQuoteTwo")],
  };
}

/** What this person opened lately (kept on their phone). */
function recent(ctx: SectionContext, l: Look): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w("pcRecent"), source: "products", layout: "carousel", recent: true, gap: 10, padding: sides(0, 16, 0, 16), query: { limit: 10, category_id: null, featured: false, sort: "newest", ids: [] }, card: productCard(ctx, l, 120, 110) };
}

/** The home's header: the wordmark at its start, the menu (the category menu), the bell and the bag at its end. */
function homeHeader(ctx: SectionContext, l: Look): StudioPage["header"] {
  const t = sigTexts(ctx, { title: "pcWordmark" });
  return { type: "logo_actions", title: t.title, translations: t.translations, buttons: ["menu", "notifications", "cart"], menu_page: MENU_PAGE, background: l.k.page, dark_background: l.k.darkPage, color: l.k.ink, dark_color: l.k.darkInk };
}

// ——— A · NAWAH ———

export function nawahHome(ctx: SectionContext): StudioPage {
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
        searchPill(ctx, l, "pcSearch"),
        categoryRow(ctx, l),
        heroCarousel(ctx, l, [
          ["hero-glow", "pcHeroKicker1", "pcHeroTitle1", "pcHeroLine1", "pcOrderNow"],
          ["setup-purple", "pcHeroKicker2", "pcHeroTitle2", "pcHeroLine2", "pcDiscover"],
          ["mb-cpu", "pcHeroKicker3", "pcHeroTitle3", "pcHeroLine3", "pcStartBuild", build],
        ]),
        headOf(ctx, l, "pcBuildTitle", { word: "pcAllBuilds", action: ownPage(ctx, BUILD_PAGE) }, "pcBuildLine"),
        builderCard(ctx, l),
        dealCard(ctx, l, "carousel"),
        headOf(ctx, l, "pcLaptops", { word: "pcSeeAll", action: shop }, "pcLaptopsLine"),
        productRow(ctx, l, "pcLaptops", "newest", true),
        headOf(ctx, l, "pcByUse", null, "pcByUseLine"),
        purposeTiles(ctx, l, [
          ["monitor-studio", "pcUseCreateLine", "pcUseCreate"],
          ["pad-hands", "pcUseGameLine", "pcUseGame"],
          ["mic-studio", "pcUseStreamLine", "pcUseStream"],
          ["lap-plant", "pcUseStudyLine", "pcUseStudy"],
        ]),
        ...gamerZone(ctx, l),
        headOf(ctx, l, "pcParts", { word: "pcAllParts", action: shop }, "pcPartsLine"),
        productGrid(ctx, l, "pcParts"),
        headOf(ctx, l, "pcFindBySpec", { word: "pcAllFilters", action: ownPage(ctx, SPECS_PAGE) }, "pcFindBySpecLine"),
        specFilter(ctx, l, "gpu", "pcSpecGpu"),
        specFilter(ctx, l, "ram", "pcSpecRam", sides(10, 16, 4, 16)),
        headOf(ctx, l, "pcServices", null),
        services(ctx, l),
        headOf(ctx, l, "pcReviews", null),
        reviews(ctx, l),
        headOf(ctx, l, "pcRecent", null),
        recent(ctx, l),
      ],
    },
  };
}

// ——— B · SILICA ———

/** B's "Let us suggest your device": what it's mainly for, as four tiles (each opens the shop), and the filters by spec. */
function suggestCard(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const l = LOOK_B;
  const purpose = (icon: string, word: SectionWord, lit: boolean): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    gap: 6,
    cross: "center",
    radius: 16,
    padding: sides(12, 4, 10, 4),
    action: shop,
    ...(lit ? { background: B_TINT.day, dark_background: B_TINT.night, border_color: B.fill, dark_border_color: B.darkFill, border_width: 1.5 } : { background: B.page, dark_background: "#1E221F", border_color: B.line, dark_border_color: B.darkLine, border_width: 1 }),
    children: [
      { id: id(), type: "icon", icon, icon_size: 22, color: lit ? B.accent : B.ink, dark_color: lit ? B.darkAccent : B.darkInk },
      say(ctx, l, word, { size: 11.5, weight: lit ? 700 : 500 }, { text_align: "center", max_lines: 1 }),
    ],
  });
  return {
    id: id(),
    type: "column",
    name: ctx.w("pcSuggestTitle"),
    gap: 12,
    radius: 22,
    padding: sides(16, 14, 16, 14),
    margin: sides(0, 16, 0, 16),
    background: B.surface,
    dark_background: B.darkSurface,
    border_color: B.line,
    dark_border_color: B.darkLine,
    border_width: 1,
    children: [
      say(ctx, l, "pcSuggestQuestion", face(l, 15)),
      say(ctx, l, "pcSuggestLine", { size: 12 }, { muted: true, max_lines: 2 }),
      { id: id(), type: "row", gap: 8, children: [purpose("devices", "pcUseGame", true), purpose("star", "pcUseCreate", false), purpose("code", "pcUseCode", false), purpose("school", "pcUseStudy", false)] },
      specFilter(ctx, l, "gpu", null, sides(2, 0, 0, 0)),
      {
        id: id(),
        type: "button",
        name: ctx.w("pcSuggestButton"),
        text: ctx.w("pcSuggestButton"),
        icon: "arrow_forward",
        icon_position: "end",
        width: "fill",
        height: 46,
        radius: 14,
        background: B_DEEP.day,
        dark_background: B.darkFill,
        color: "#FFFFFF",
        dark_color: B.darkOnFill,
        font: { size: 14, weight: 700 },
        motion: { press: "shrink" },
        action: ownPage(ctx, SPECS_PAGE),
      },
    ],
  };
}

/** B's device of the week: the featured product's photo and its specifications as a table (`spec_table`). */
function deviceOfWeek(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const l = LOOK_B;
  return {
    id: id(),
    type: "column",
    name: ctx.w("pcWeekTitle"),
    gap: 0,
    radius: 22,
    margin: sides(0, 16, 0, 16),
    background: B.surface,
    dark_background: B.darkSurface,
    border_color: B.line,
    dark_border_color: B.darkLine,
    border_width: 1,
    children: [
      {
        id: id(),
        type: "photo_hero",
        name: ctx.w("pcWeekTitle"),
        image_url: sigPhoto(ctx, P("lap-chart")),
        height: 170,
        radius: 22,
        background: "#E9EAE5",
        scrim: { color: "#000000", from: 0, middle: 0, at: 50, to: 0.25 },
        align: "start",
        padding: sides(12, 12, 12, 12),
        action: shop,
        children: [say(ctx, l, "pcWeekBadge", { size: 11.5, weight: 700 }, { color: "#FFFFFF", dark_color: "#FFFFFF", background: B_DEEP.day, dark_background: B_DEEP.day, radius: 9, padding: sides(4, 9, 4, 9), self_align: "end" })],
      },
      {
        id: id(),
        type: "spec_table",
        name: ctx.w("pcWeekSpecs"),
        tech: { rows: 6, accent: B.fill },
        color: B.ink,
        dark_color: B.darkInk,
        padding: sides(12, 16, 14, 16),
      },
    ],
  };
}

/** B's gamer corner: tall photo cards (controllers, arcade sticks, headsets), each opening the shop. */
function gamerCorner(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const l = LOOK_B;
  const card = (photo: string, title: SectionWord, line: SectionWord): StudioNode => ({
    id: id(),
    type: "photo_hero",
    name: ctx.w(title),
    image_url: sigPhoto(ctx, P(photo)),
    width: 148,
    height: 200,
    radius: 18,
    background: "#141815",
    scrim: { color: "#000000", from: 0, middle: 0.2, at: 50, to: 0.82 },
    align: "end",
    padding: sides(12, 12, 12, 12),
    action: shop,
    children: [say(ctx, l, title, face(l, 15), white({ max_lines: 1 })), say(ctx, l, line, { size: 11 }, white({ opacity: 0.85, max_lines: 1 }))],
  });
  return {
    id: id(),
    type: "row",
    name: ctx.w("pcCorner"),
    gap: 10,
    scroll: true,
    padding: sides(0, 16, 0, 16),
    children: [card("pad-blue", "pcControllers", "pcControllersLine"), card("arcade", "pcArcade", "pcArcadeLine"), card("hp-dark", "pcHeadsets", "pcHeadsetsLine")],
  };
}

/** B's parts prices this week: the shop's parts on sale, as a list (each with its price before). */
function partsOnSale(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w("pcPartsWeek"),
    source: "products",
    layout: "list",
    gap: 0,
    radius: 22,
    padding: sides(4, 14, 4, 14),
    margin: sides(0, 16, 0, 16),
    background: B.surface,
    dark_background: B.darkSurface,
    border_color: B.line,
    dark_border_color: B.darkLine,
    border_width: 1,
    query: { limit: 4, category_id: null, featured: false, sort: "popular", ids: [], on_sale: true },
    card: {
      id: id(),
      type: "row",
      gap: 12,
      cross: "center",
      padding: sides(10, 0, 10, 0),
      children: [
        {
          id: id(),
          type: "stack",
          width: 64,
          height: 64,
          children: [
            { id: id(), type: "image", bind: "image", width: 64, height: 64, radius: 12, fit: "cover" },
            { id: id(), type: "text", bind: "sale", font: { size: 10, weight: 800 }, color: "#FFFFFF", background: B.fill, dark_color: B.darkOnFill, dark_background: B.darkFill, radius: 6, padding: sides(2, 5, 2, 5), place: { x: 4, y: 4 } },
          ],
        },
        {
          id: id(),
          type: "column",
          width: "fill",
          gap: 3,
          children: [
            { id: id(), type: "text", bind: "title", max_lines: 1, color: B.ink, dark_color: B.darkInk, font: { family: KUFI, size: 13.5, weight: 600 } },
            { id: id(), type: "text", bind: "subtitle", max_lines: 1, color: B.muted, dark_color: B.darkMuted, font: { size: 11.5 } },
            {
              id: id(),
              type: "row",
              gap: 6,
              cross: "center",
              children: [
                { id: id(), type: "text", bind: "price", max_lines: 1, color: B.ink, dark_color: B.darkInk, font: { family: KUFI, size: 14, weight: 700 } },
                { id: id(), type: "text", bind: "was_price", max_lines: 1, color: B.muted, dark_color: B.darkMuted, font: { size: 11.5 } },
              ],
            },
          ],
        },
        { id: id(), type: "icon", icon: "add_circle", icon_size: 22, color: B.accent, dark_color: B.darkAccent },
      ],
    },
  };
}

/** Ready builds side by side (`compare`): two or three of the shop's builds, spec by spec, each opening its page. */
function readyBuilds(ctx: SectionContext, l: Look): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "compare",
    name: ctx.w("pcTiers"),
    tech: { accent: l.look === "a" ? A.fill : B.fill, rows: 6 },
    color: l.k.ink,
    dark_color: l.k.darkInk,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    radius: 22,
    padding: sides(14, 12, 14, 12),
    margin: sides(0, 16, 0, 16),
  };
}

/** B's pledges as one card of three: the warranty, next-day delivery and how to pay (installments: coming soon). */
function pledges(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const l = LOOK_B;
  const cell = (icon: string, title: SectionWord, text: SectionWord | null): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(title),
    width: "fill",
    gap: 5,
    cross: "center",
    padding: sides(4, 4, 4, 4),
    children: [
      { id: id(), type: "icon", icon, icon_size: 22, color: B.accent, dark_color: B.darkAccent },
      say(ctx, l, title, { size: 12, weight: 700 }, { text_align: "center", max_lines: 2 }),
      text ? say(ctx, l, text, { size: 10.5 }, { muted: true, text_align: "center", max_lines: 2 }) : { ...installmentsTag(ctx, { color: B.accent, dark_color: B.darkAccent, background: B_TINT.day, dark_background: B_TINT.night }), self_align: "center" },
    ],
  });
  return {
    id: id(),
    type: "row",
    name: ctx.w("pcServices"),
    gap: 4,
    radius: 22,
    padding: sides(14, 8, 14, 8),
    margin: sides(24, 16, 0, 16),
    background: B.surface,
    dark_background: B.darkSurface,
    border_color: B.line,
    dark_border_color: B.darkLine,
    border_width: 1,
    children: [cell("verified", "pcServiceWarranty", "pcServiceWarrantyText"), cell("local_shipping", "pcServiceDelivery", "pcServiceDeliveryText"), cell("payments", "pcServicePay", null)],
  };
}

export function silicaHome(ctx: SectionContext): StudioPage {
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
        searchPill(ctx, l, "pcSearchB"),
        specFilter(ctx, l, "ram", null, sides(2, 16, 0, 16)),
        categoryRow(ctx, l),
        heroCarousel(ctx, l, [
          ["setup-purple", "pcHeroKickerB1", "pcHeroTitleB1", "pcHeroLineB1", "pcDiscover"],
          ["lap-night", "pcHeroKickerB2", "pcHeroTitleB2", "pcHeroLineB2", "pcOrderNow"],
          ["socket-gold", "pcHeroKicker3", "pcHeroTitle3", "pcHeroLine3", "pcStartBuild", build],
        ]),
        headOf(ctx, l, "pcSuggestTitle", null, undefined, "01"),
        suggestCard(ctx),
        headOf(ctx, l, "pcWeekTitle", { word: "pcDetails", action: shop }, undefined, "02"),
        deviceOfWeek(ctx),
        headOf(ctx, l, "pcCorner", { word: "pcShopAll", action: shop }, undefined, "03"),
        gamerCorner(ctx),
        headOf(ctx, l, "pcPartsWeek", { word: "pcAllOffers", action: shop }, undefined, "04"),
        partsOnSale(ctx),
        headOf(ctx, l, "pcTiers", { word: "pcCompareAll", action: ownPage(ctx, SPECS_PAGE) }, "pcTiersLine", "05"),
        readyBuilds(ctx, l),
        headOf(ctx, l, "pcBuildTitle", { word: "pcAllBuilds", action: ownPage(ctx, BUILD_PAGE) }, "pcBuildLine", "06"),
        builderCard(ctx, l),
        headOf(ctx, l, "pcNewIn", { word: "pcMore", action: shop }, undefined, "07"),
        productGrid(ctx, l, "pcNewIn"),
        dealCard(ctx, l, "banner"),
        pledges(ctx),
        headOf(ctx, l, "pcRecent", null),
        recent(ctx, l),
      ],
    },
  };
}

// ——— The pages after the home (both looks) ———

/**
 * The category menu (the header's menu button opens it): the search on top,
 * quick ways in (new, offers, Build your PC, find by spec), every main
 * category of the shop a row of cards (its "All" card, then its
 * sub-categories), then the account, the orders, the language and how to
 * reach the shop.
 */
export function computersMenuPage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "pcWordmark" });
  const quick = (word: SectionWord, icon: string, action: Action): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    gap: 6,
    cross: "center",
    radius: 16,
    padding: sides(12, 4, 10, 4),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    action,
    children: [
      { id: id(), type: "icon", icon, icon_size: 22, color: l.k.accent, dark_color: l.k.darkAccent },
      { id: id(), type: "text", text: ctx.w(word), max_lines: 1, text_align: "center", font: { size: 11.5, weight: 600 }, color: l.k.ink, dark_color: l.k.darkInk },
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
        searchPill(ctx, l, "pcSearchAll", sides(6, 16, 4, 16)),
        {
          id: id(),
          type: "row",
          name: ctx.w("pcQuick"),
          gap: 8,
          padding: sides(10, 16, 8, 16),
          children: [quick("pcNewIn", "verified", shop), quick("pcOffers", "percent", shop), quick("pcBuildShort", "devices", build), quick("pcFindShort", "tune", ownPage(ctx, SPECS_PAGE))],
        },
        {
          id: id(),
          type: "categories",
          name: ctx.w("pcCategoryMenu"),
          source: "products",
          style: "rows",
          category_menu: { look: l.look === "a" ? "lead" : "label", radius: l.look === "a" ? 18 : 16 },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          padding: sides(6, 0, 6, 0),
        },
        { id: id(), type: "divider", height: 1, background: l.k.line, dark_background: l.k.darkLine, margin: sides(14, 16, 14, 16) },
        {
          id: id(),
          type: "row",
          name: ctx.w("pcMenuAccount"),
          gap: 8,
          padding: sides(0, 16, 0, 16),
          children: [tile("pcAccount", "person", screen("account")), tile("pcOrders", "package_2", screen("orders")), tile("pcLanguage", "language", screen("settings"))],
        },
        {
          id: id(),
          type: "row",
          name: ctx.w("pcContact"),
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
            { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, l, "pcContact", { size: 14, weight: 700 }), say(ctx, l, "pcContactLine", { size: 12 }, { muted: true, max_lines: 2 })] },
            { id: id(), type: "icon", icon: "chat", icon_size: 20, color: l.k.ink, dark_color: l.k.darkInk },
          ],
        },
      ],
    },
  };
}

/** Build your PC: the builder card, how it checks the parts (a timeline), and the shop's ready builds. */
export function buildPage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "pcBuildTitle" });
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
        { ...say(ctx, l, "pcBuildIntro", { size: 14, line_height: 1.5 }, { muted: true }), padding: sides(8, 16, 12, 16) },
        builderCard(ctx, l),
        headOf(ctx, l, "pcChecksTitle", null, "pcChecksLine"),
        {
          id: id(),
          type: "timeline",
          name: ctx.w("pcChecksTitle"),
          timeline: { style: "vertical" },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          background: l.k.surface,
          dark_background: l.k.darkSurface,
          radius: 20,
          padding: sides(14, 14, 14, 14),
          margin: sides(0, 16, 0, 16),
          entries: [step("pcCheckSocket", "pcCheckSocketText"), step("pcCheckMemory", "pcCheckMemoryText"), step("pcCheckPower", "pcCheckPowerText"), step("pcCheckSize", "pcCheckSizeText")],
        },
        headOf(ctx, l, "pcTiers", null, "pcTiersLine"),
        readyBuilds(ctx, l),
        {
          id: id(),
          type: "button",
          name: ctx.w("pcStartBuild"),
          text: ctx.w("pcStartBuild"),
          icon: "devices",
          width: "fill",
          height: 50,
          radius: l.look === "a" ? 14 : 25,
          margin: sides(18, 16, 0, 16),
          background: l.k.fill,
          dark_background: l.k.darkFill,
          color: l.k.onFill,
          dark_color: l.k.darkOnFill,
          font: { size: 15, weight: 700 },
          motion: { press: "shrink" },
          action: build,
        },
      ],
    },
  };
}

/** Find by spec: the shop filtered by processor, memory, storage and graphics, a row of chips each. */
export function specsPage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "pcFindBySpec" });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...signatureHeader(l.k, "glass") },
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { ...say(ctx, l, "pcFindBySpecLine", { size: 14, line_height: 1.5 }, { muted: true }), padding: sides(8, 16, 4, 16) },
        ...(["cpu", "gpu", "ram", "storage"] as const).flatMap((spec) => [headOf(ctx, l, SPEC_WORDS[spec], null, undefined, undefined, sides(18, 16, 8, 16)), specFilter(ctx, l, spec, null)]),
        headOf(ctx, l, "pcTiers", null, "pcTiersLine"),
        readyBuilds(ctx, l),
      ],
    },
  };
}

/** Over the shop: the categories as chips, the filter by graphics card, and a banner of the builds. */
function shopTop(ctx: SectionContext, l: Look): StudioNode[] {
  return [
    { id: idOf(ctx)(), type: "categories", name: ctx.w("pcCategories"), source: "products", padding: sides(4, 12, 4, 12) },
    specFilter(ctx, l, "gpu", null, sides(4, 16, 4, 16)),
    { ...heroCard(ctx, l, l.look === "a" ? "setup-purple" : "desk-terrarium", "pcHeroKicker2", "pcHeroTitle2", "pcHeroLine2", "pcDiscover"), height: 160, margin: sides(6, 16, 6, 16) },
  ];
}

/** Over the cart: the shop's code for a first order and its warranty and returns. */
function cartTop(ctx: SectionContext, l: Look): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "coupon", name: ctx.w("pcCoupon"), code: COMPUTERS_COUPON_CODE, coupon: { look: l.look === "a" ? "ticket" : "glass", bind: "public" }, radius: 18, color: l.k.fill, margin: sides(10, 16, 4, 16) },
    {
      id: id(),
      type: "row",
      name: ctx.w("pcWarrantyNote"),
      gap: 12,
      cross: "center",
      radius: 18,
      padding: sides(12, 14, 12, 14),
      margin: sides(8, 16, 4, 16),
      background: l.tint.day,
      dark_background: l.tint.night,
      children: [
        { id: id(), type: "icon", icon: "verified", icon_size: 22, color: l.k.accent, dark_color: l.k.darkAccent },
        say(ctx, l, "pcWarrantyNote", { size: 13, weight: 600, line_height: 1.4 }, { width: "fill", max_lines: 3 }),
      ],
    },
  ];
}

/** Over the orders: how an order travels, a build tested before it ships (the person's newest order on its way, else the first step lit). */
function ordersTop(ctx: SectionContext, l: Look): StudioNode[] {
  const step = (title: SectionWord, text: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    headOf(ctx, l, "pcTrack", null, undefined, undefined, sides(10, 16, 6, 16)),
    {
      id: idOf(ctx)(),
      type: "timeline",
      name: ctx.w("pcTrack"),
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
      entries: [step("pcTrack1", "pcTrack1Text", true), step("pcTrack2", "pcTrack2Text"), step("pcTrack3", "pcTrack3Text"), step("pcTrack4", "pcTrack4Text")],
    },
  ];
}

/** The demo's code shown in the app (lib/demo/computers.ts makes it). */
export const COMPUTERS_COUPON_CODE = "NAWAH10";

function computersOver(l: Look) {
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

function computersPages(l: Look) {
  return (ctx: SectionContext) => [
    { slug: MENU_PAGE, title: "pcCategoryMenu" as SectionWord, studio: computersMenuPage(ctx, l) },
    { slug: BUILD_PAGE, title: "pcBuildTitle" as SectionWord, studio: buildPage(ctx, l) },
    { slug: SPECS_PAGE, title: "pcFindBySpec" as SectionWord, studio: specsPage(ctx, l) },
  ];
}

/** The five tabs of the floating bar: Home, Shop, Cart, Orders, Account (as the clothes shop's). */
export function computersTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  return clothesTabs(tabs);
}

// ——— The sign-in screens, the account menus, the bars and the two looks ———

const NAWAH_SCREENS = signatureScreens({
  style: "photo",
  photo: P("setup-purple"),
  title: { en: "Your setup starts here", ar: "جهازك يبدأ معنا", tr: "Kurulumun burada başlar" },
  subtitle: { en: "Sign in to follow your orders, your builds and your warranty.", ar: "سجّل الدخول لتتابع طلباتك وتجميعاتك وضمانك.", tr: "Siparişlerinizi, toplamalarınızı ve garantinizi izlemek için giriş yapın." },
  menu: "night",
  accent: A.fill,
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

const SILICA_SCREENS = signatureScreens({
  style: "photo",
  photo: P("socket-gold"),
  title: { en: "Build it with us", ar: "ابنِ جهازك معنا", tr: "Bizimle toplayın" },
  subtitle: { en: "Sign in for your orders, your builds and the deals of the hour.", ar: "سجّل الدخول لطلباتك وتجميعاتك وصفقات الساعة.", tr: "Siparişleriniz, toplamalarınız ve saatin fırsatları için giriş yapın." },
  menu: "cover",
  accent: B.fill,
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** A's floating bar: graphite by day and by night, the open tab blue with its name. */
export const NAWAH_BAR = signatureBar(A, { design: "float", background: "#10131A", dark_background: "#1E222B", active: A.fill, dark_active: A.darkFill, inactive: "#A3A9B6", dark_inactive: "#8C93A1", labels: "active", radius: 26, margin: 12 });
/** B's floating bar: frosted white by day, green-black by night, the open tab green. */
export const SILICA_BAR = signatureBar(B, { design: "float", background: "#FFFFFF", dark_background: "#1C201D", active: B.fill, dark_active: B.darkFill, inactive: "#5C6159", dark_inactive: "#9BA399", labels: "active", radius: 30, margin: 12 });

export const NAWAH_A: SignatureDesign = {
  demo: "computers",
  variant: "a",
  template: { id: "computers_signature_a", icon: "computer", fits: { types: ["store"], plain: true } },
  home: nawahHome,
  over: computersOver(LOOK_A),
  tabs: computersTabs,
  pages: computersPages(LOOK_A),
  bar: NAWAH_BAR,
  look: { header: signatureHeader(A, "glass"), background: A.page, dark_background: A.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    // Look A is the demo: its main colour the demo's (lib/demo/content.ts).
    appearance: { secondary_color: "#10131A", font: "Manrope", font_family: PLEX, dark_background: A.darkPage, dark_surface: A.darkSurface },
    screens: NAWAH_SCREENS,
  },
};

export const SILICA_B: SignatureDesign = {
  demo: "computers",
  variant: "b",
  template: { id: "computers_signature_b", icon: "devices", fits: { types: ["store"], plain: true } },
  home: silicaHome,
  over: computersOver(LOOK_B),
  tabs: computersTabs,
  pages: computersPages(LOOK_B),
  bar: SILICA_BAR,
  look: { header: signatureHeader(B, "glass"), background: B.page, dark_background: B.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    primary: B.fill,
    appearance: { secondary_color: "#141815", font: "DM Sans", font_family: KUFI, dark_background: B.darkPage, dark_surface: B.darkSurface },
    screens: SILICA_SCREENS,
  },
};

// ——— Every part of the two looks as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;

const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};

export const COMPUTERS_SECTIONS: readonly SectionInfo[] = [
  // Build your PC: the parts in order and its start button (nothing until the shop has it set up).
  { id: "pc_builder_card", icon: "construction", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf({ ...ctx, ownPages: false }, LOOK_A, "pcBuildTitle", null, "pcBuildLine"), builderCard(ctx, LOOK_A)]) },
  // The shop filtered by processor, memory, storage and graphics.
  { id: "pc_spec_filters", icon: "tune", isNew: true, fits: STORE_PLAIN, make: one((ctx) => (["cpu", "gpu", "ram", "storage"] as const).flatMap((spec) => [headOf(ctx, LOOK_A, SPEC_WORDS[spec], null, undefined, undefined, sides(14, 16, 6, 16)), specFilter(ctx, LOOK_A, spec, null)])) },
  // Ready builds side by side, spec by spec.
  { id: "pc_ready_builds", icon: "compare", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_B, "pcTiers", null, "pcTiersLine"), readyBuilds(ctx, LOOK_B)]) },
  // The device of the week: its photo and its specifications as a table.
  { id: "pc_device_week", icon: "table_chart", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_B, "pcWeekTitle", null), deviceOfWeek(ctx)]) },
  // The hero carousel, the next card peeking.
  { id: "pc_peek_hero", icon: "view_carousel", isNew: true, fits: STORE_PLAIN, make: one((ctx) => heroCarousel({ ...ctx, ownPages: false }, LOOK_A, [["hero-glow", "pcHeroKicker1", "pcHeroTitle1", "pcHeroLine1", "pcOrderNow"], ["setup-purple", "pcHeroKicker2", "pcHeroTitle2", "pcHeroLine2", "pcDiscover"]])) },
  // Laptops with their key specs on each card.
  { id: "pc_spec_cards", icon: "computer", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "pcLaptops", { word: "pcSeeAll", action: shop }, "pcLaptopsLine"), productRow(ctx, LOOK_A, "pcLaptops", "newest", true)]) },
  // Shop by use, the gamer zone and the gamer corner.
  { id: "pc_by_use", icon: "dashboard", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "pcByUse", null, "pcByUseLine"), purposeTiles(ctx, LOOK_A, [["monitor-studio", "pcUseCreateLine", "pcUseCreate"], ["pad-hands", "pcUseGameLine", "pcUseGame"], ["mic-studio", "pcUseStreamLine", "pcUseStream"], ["lap-plant", "pcUseStudyLine", "pcUseStudy"]])]) },
  { id: "pc_gamer_zone", icon: "devices", isNew: true, fits: STORE_PLAIN, make: one((ctx) => gamerZone(ctx, LOOK_A)) },
  { id: "pc_gamer_corner", icon: "view_carousel", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_B, "pcCorner", null), gamerCorner(ctx)]) },
  // Parts on sale this week, and the suggestion card.
  { id: "pc_parts_week", icon: "sell", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_B, "pcPartsWeek", null), partsOnSale(ctx)]) },
  { id: "pc_suggest", icon: "quiz", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf({ ...ctx, ownPages: false }, LOOK_B, "pcSuggestTitle", null), suggestCard({ ...ctx, ownPages: false })]) },
  // The services with "Installments coming soon", and B's pledges.
  { id: "pc_services", icon: "workspace_premium", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "pcServices", null), services(ctx, LOOK_A)]) },
  { id: "pc_pledges", icon: "verified_user", isNew: true, fits: STORE_PLAIN, make: one(pledges) },
];
