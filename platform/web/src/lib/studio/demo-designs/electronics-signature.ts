import type { Action, LayoutTab, StudioEntry, StudioFont, StudioNode, StudioPage, StudioSides } from "../../pages/types";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { installmentsTag } from "../installments";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigPhoto, sigTexts, signatureBar, signatureHeader, type SignatureInk } from "./food-signature-parts";
import { clothesTabs } from "./clothes-signature";

/**
 * 211 Madar (مدار), Studio's electronics type (lib/studio/shop-types.ts): a
 * Studio demo of the store kind and its two Signature looks, each a whole
 * store project (its home, its menu, its trade-in and compare pages, its
 * shop, cart and orders, its tabs, its floating bar, its sign-in screen and
 * account), built only from Studio's elements so every part is the owner's
 * to change, as the owner approved them (a real native phone app: a small
 * header, a search pill, the categories, a compact hero carousel of about
 * 210 px with the next card peeking, tight sections and a floating bar).
 *
 * A · MADAR: clean cool white, one deep blue, IBM Plex Sans Arabic; a near
 * black night.
 * B · NABD: lime on near-black cards over warm stone, Noto Kufi Arabic; a
 * near-black night, the lime kept for what is lit.
 *
 * Both use the electronics shop's own parts, each a reusable element: the
 * category menu (the header's menu button), the deal of the day with its
 * countdown, the trade-in estimator (`trade_in`: a card here, the whole
 * estimator on its page, the customer's request landing in Store ›
 * Trade-in), two products compared spec by spec (`compare`), a product's
 * specifications (`spec_table`), "Installments coming soon" (never a way
 * to pay) and what was seen lately. Nothing is made up: the lists, the
 * categories, the sale, the trade-in prices and the specs are the shop's
 * own; the owner's words are in [brackets] (the demo fills them,
 * lib/studio/demo-templates.ts).
 */

// ——— The two looks' colours and faces ———

/** A · MADAR: cool white and ink by day, one deep blue; near black by night. */
export const MADAR_INK: SignatureInk = {
  page: "#F4F5F7",
  darkPage: "#0A0B0D",
  surface: "#FFFFFF",
  darkSurface: "#15171B",
  ink: "#0E1116",
  darkInk: "#F2F4F7",
  muted: "#4E5561",
  darkMuted: "#B4BAC4",
  line: "#E2E5EA",
  darkLine: "#25282E",
  accent: "#2449C8",
  darkAccent: "#93AEFF",
  fill: "#2F5BEA",
  darkFill: "#3D6BFF",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const A = MADAR_INK;
const A_TINT = { day: "#ECEEF1", night: "#1E2126" };
const PLEX = "IBM Plex Sans Arabic";

/** B · NABD: warm stone and near-black cards, lime for what is lit; near black by night. */
export const NABD_INK: SignatureInk = {
  page: "#EEEFEA",
  darkPage: "#09090A",
  surface: "#FFFFFF",
  darkSurface: "#141517",
  ink: "#121314",
  darkInk: "#F1F2EE",
  muted: "#4A4D50",
  darkMuted: "#B3B6B1",
  line: "#DADCD5",
  darkLine: "#242528",
  accent: "#3D6000",
  darkAccent: "#C6F24E",
  fill: "#C6F24E",
  darkFill: "#C6F24E",
  onFill: "#121314",
  darkOnFill: "#121314",
};
const B = NABD_INK;
const B_TINT = { day: "#E3E5DF", night: "#1C1D20" };
/** B's dark cards (the deal, the bundle, the bar), the same by day and by night. */
const B_CARD = { day: "#141517", night: "#17181B", line: "#26272B" };
const KUFI = "Noto Kufi Arabic";
const LIME = "#C6F24E";

/** Madar's photos (public/electronics-photos, CC0 from StockSnap, credited in CREDITS.md). */
const P = (name: string) => `/electronics-photos/${name}.jpg`;

const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
/** The shop's trade-in (`flow: trade_in`): the estimator where the shop has set it up, else the shop. */
const tradeIn: Action = { type: "screen", screen: "search", flow: "trade_in" };
/** One of the look's own pages where the whole look is made; where its home is made alone (another store's template, a ready section) the shop. */
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));
export const MENU_PAGE = "menu";
export const TRADE_PAGE = "trade-in";
export const COMPARE_PAGE = "compare";

interface Look {
  k: SignatureInk;
  tint: { day: string; night: string };
  family: string;
  look: "a" | "b";
}
const LOOK_A: Look = { k: A, tint: A_TINT, family: PLEX, look: "a" };
const LOOK_B: Look = { k: B, tint: B_TINT, family: KUFI, look: "b" };

// ——— What both looks are made of ———

const face = (l: Look, size: number, extra: Partial<StudioFont> = {}): StudioFont => ({ family: l.family, size, weight: 700, line_height: 1.25, ...extra });

function say(ctx: SectionContext, l: Look, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  return inked(ctx, l.k, ctx.w(word), font, extra);
}

/** A section's title (a small kicker over it in B, a line under it in A), a quieter link at its end. */
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
          ...(kicker ? [say(ctx, l, kicker, { size: 11, weight: 700, letter_spacing: 1.2 }, { accent: true, max_lines: 1 })] : []),
          say(ctx, l, title, face(l, l.look === "a" ? 20 : 21, { weight: 700 }), { max_lines: 2 }),
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
              action: link.action,
              ...(l.look === "a" ? {} : { border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1 }),
              children: [say(ctx, l, link.word, { size: 12.5, weight: 600 }, l.look === "a" ? { accent: true } : {})],
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
    radius: l.look === "a" ? 26 : 18,
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

/** One hero card: a photo under a dark shade, its kicker, headline and a button (A blue, B a lime disc). */
function heroCard(ctx: SectionContext, l: Look, photo: string, kicker: SectionWord, title: SectionWord, button: SectionWord, action: Action = shop): StudioNode {
  const id = idOf(ctx);
  const shade = l.look === "a" ? "#0E1116" : "#09090A";
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w(title),
    image_url: sigPhoto(ctx, P(photo)),
    height: 210,
    radius: l.look === "a" ? 24 : 22,
    background: shade,
    scrim: { color: shade, from: 0.15, middle: 0.35, at: 45, to: 0.85 },
    align: "end",
    padding: sides(16, 18, 16, 18),
    action,
    children: [
      say(ctx, l, kicker, { size: 11.5, weight: 600, letter_spacing: 0.4 }, { color: l.look === "a" ? "#C9D6FF" : LIME, dark_color: l.look === "a" ? "#C9D6FF" : LIME, max_lines: 1 }),
      say(ctx, l, title, face(l, l.look === "a" ? 23 : 22, { weight: 700, line_height: 1.18 }), { color: "#FFFFFF", dark_color: "#FFFFFF", max_lines: 2, margin: sides(6, 0, 0, 0) }),
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
function heroCarousel(ctx: SectionContext, l: Look, cards: readonly [string, SectionWord, SectionWord][], button: SectionWord): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "slider",
    name: ctx.w("elHeroName"),
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

/** A product card: its photo on a soft tile with the sale's share off, its key specs, its name and its price (struck through before while on sale). */
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
          { id: id(), type: "image", bind: "image", width, height, radius: l.look === "a" ? 18 : 16, fit: "cover", background: l.tint.day, dark_background: l.tint.night },
          { id: id(), type: "text", bind: "sale", font: { size: 11, weight: 800 }, color: l.k.onFill, dark_color: l.k.darkOnFill, background: l.k.fill, dark_background: l.k.darkFill, radius: 8, padding: sides(3, 7, 3, 7), place: { x: 6, y: 5 } },
        ],
      },
      { id: id(), type: "text", bind: "subtitle", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 11, weight: 500 } },
      { id: id(), type: "text", bind: "title", max_lines: 2, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 13.5, weight: 600, line_height: 1.3 } },
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

/** The shop's products as a row of cards (newest, or the most bought). */
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
    card: productCard(ctx, l, 156, 176),
  };
}

/** The shop's products as a grid of two (the best sellers). */
function productGrid(ctx: SectionContext, l: Look, name: SectionWord, sort: "newest" | "popular"): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "items",
    name: ctx.w(name),
    source: "products",
    layout: "grid",
    columns: 2,
    gap: 12,
    padding: sides(0, 16, 0, 16),
    query: { limit: 4, category_id: null, featured: false, sort, ids: [] },
    card: productCard(ctx, l, 170, 176),
  };
}

/** The shop's flash sale (the `flash_sale` element: was and now, a live countdown and the stock left; left out while none is on). */
function dealCard(ctx: SectionContext, l: Look, look: "banner" | "carousel"): StudioNode {
  const t = sigTexts(ctx, { text: "elDeal" });
  return {
    id: idOf(ctx)(),
    type: "flash_sale",
    name: ctx.w("elDeal"),
    text: t.text,
    translations: t.translations,
    flash_sale: { look, limit: 6, countdown: true, stock_bar: true, accent: l.look === "a" ? A.fill : "#3D6000" },
    radius: 24,
    margin: sides(22, 16, 4, 16),
  };
}

/** One service: its icon in a soft disc, its name and its line. */
function serviceTile(ctx: SectionContext, l: Look, icon: string, title: SectionWord, line: SectionWord, soon = false): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w(title),
    width: "fill",
    gap: 4,
    cross: "center",
    padding: sides(12, 4, 12, 4),
    children: [
      { id: id(), type: "icon", icon, icon_size: 22, color: soon ? l.k.muted : l.k.accent, dark_color: soon ? l.k.darkMuted : l.k.darkAccent },
      say(ctx, l, title, { size: 10.5, weight: 700, line_height: 1.2 }, { text_align: "center", max_lines: 2 }),
      say(ctx, l, line, { size: 10.5, weight: 500 }, { muted: true, text_align: "center", max_lines: 2 }),
    ],
  };
}

/** A's services in one card: fast delivery, free installation, the warranty and installments (coming soon only). */
function servicesStrip(ctx: SectionContext, l: Look): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "row",
    name: ctx.w("elServices"),
    gap: 0,
    radius: 22,
    padding: sides(4, 4, 4, 4),
    margin: sides(18, 16, 4, 16),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    children: [
      serviceTile(ctx, l, "local_shipping", "elFast", "elFastText"),
      serviceTile(ctx, l, "home_work", "elInstall", "elInstallText"),
      serviceTile(ctx, l, "verified", "elWarranty", "elWarrantyText"),
      serviceTile(ctx, l, "calendar_month", "elInstallments", "elSoon", true),
    ],
  };
}

/** The interests as photo tiles, two by two (each opens the shop). */
function interestTiles(ctx: SectionContext, l: Look, tiles: readonly [string, SectionWord, SectionWord][]): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "grid",
    name: ctx.w("elInterest"),
    columns: 2,
    gap: 10,
    padding: sides(0, 16, 0, 16),
    children: tiles.map(([photo, kicker, title]) => ({
      id: id(),
      type: "photo_hero" as const,
      name: ctx.w(title),
      image_url: sigPhoto(ctx, P(photo)),
      height: 150,
      radius: 20,
      background: "#0E1116",
      scrim: { color: "#000000", from: 0, middle: 0.15, at: 45, to: 0.78 },
      align: "end" as const,
      padding: sides(12, 12, 12, 12),
      action: shop,
      children: [
        say(ctx, l, kicker, { size: 10.5, weight: 600 }, { color: "#FFFFFF", dark_color: "#FFFFFF", opacity: 0.88, max_lines: 1 }),
        say(ctx, l, title, face(l, 16, { weight: 700 }), { color: "#FFFFFF", dark_color: "#FFFFFF", max_lines: 2 }),
      ],
    })),
  };
}

/** A's star of the season: a wide photo of the screen, its kicker and headline, its facts as chips, "Installments coming soon" and a button. */
function starCard(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const chip = (icon: string, word: SectionWord): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(word),
    height: 30,
    radius: 10,
    gap: 5,
    cross: "center",
    padding: sides(0, 10, 0, 9),
    background: l.tint.day,
    dark_background: l.tint.night,
    children: [
      { id: id(), type: "icon", icon, icon_size: 16, color: l.k.accent, dark_color: l.k.darkAccent },
      say(ctx, l, word, { size: 12, weight: 600 }, { max_lines: 1 }),
    ],
  });
  return {
    id: id(),
    type: "column",
    name: ctx.w("elStar"),
    gap: 0,
    radius: 24,
    margin: sides(0, 16, 0, 16),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    children: [
      ...(sigPhoto(ctx, P("w-tv-room")) ? [{ id: id(), type: "image" as const, image_url: sigPhoto(ctx, P("w-tv-room")), height: 190, fit: "cover" as const, radius: 0, background: l.tint.day, dark_background: l.tint.night }] : []),
      {
        id: id(),
        type: "column",
        gap: 10,
        padding: sides(14, 16, 16, 16),
        children: [
          say(ctx, l, "elStarKicker", { size: 11, weight: 700, letter_spacing: 1.2 }, { muted: true, max_lines: 1 }),
          say(ctx, l, "elStarTitle", face(l, 19), { max_lines: 3 }),
          { id: id(), type: "row", gap: 6, scroll: true, children: [chip("live_tv", "elStar4k"), chip("bolt", "elStarFast"), chip("auto_awesome", "elStarHdr"), chip("home_work", "elStarMount")] },
          installmentsTag(ctx, { color: l.k.muted, dark_color: l.k.darkMuted, background: l.tint.day, dark_background: l.tint.night }),
          {
            id: id(),
            type: "button",
            name: ctx.w("elShopNow"),
            text: ctx.w("elShopNow"),
            icon: "shopping_bag",
            width: "hug",
            height: 44,
            radius: 22,
            padding: sides(0, 20, 0, 20),
            self_align: "start",
            background: l.k.fill,
            dark_background: l.k.darkFill,
            color: l.k.onFill,
            dark_color: l.k.darkOnFill,
            font: { size: 14, weight: 700 },
            motion: { press: "shrink" },
            action: shop,
          },
        ],
      },
    ],
  };
}

/** The trade-in card (the `trade_in` element: the shop's trade-in estimator a tap away; nothing until the shop takes trade-ins). */
function tradeCard(ctx: SectionContext, l: Look, title: SectionWord): StudioNode {
  const t = sigTexts(ctx, { text: title });
  return {
    id: idOf(ctx)(),
    type: "trade_in",
    name: ctx.w(title),
    text: t.text,
    translations: t.translations,
    tech: { look: "card", accent: l.look === "a" ? A.fill : LIME },
    ...(l.look === "a" ? { background: "#16244F", dark_background: "#121A33", color: "#FFFFFF", dark_color: "#FFFFFF" } : { background: LIME, dark_background: LIME, color: "#121314", dark_color: "#121314" }),
    radius: 24,
    padding: sides(18, 18, 18, 18),
    margin: sides(22, 16, 4, 16),
    action: tradeIn,
  };
}

/** Two of the shop's products side by side, spec by spec (the `compare` element). */
function compareBlock(ctx: SectionContext, l: Look): StudioNode {
  // Its title is the section's over it; five specs, those both share first.
  return {
    id: idOf(ctx)(),
    type: "compare",
    name: ctx.w("elCompare"),
    tech: { accent: l.look === "a" ? A.fill : "#3D6000", rows: 5 },
    color: l.k.ink,
    dark_color: l.k.darkInk,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    radius: 22,
    padding: sides(14, 14, 14, 14),
    margin: sides(0, 16, 0, 16),
  };
}

/** A product's specifications as a table (the `spec_table` element: the shop's first featured product with specs, else the one picked). */
function specTable(ctx: SectionContext, l: Look, rows = 8): StudioNode {
  const t = sigTexts(ctx, { text: "elSpecs" });
  return {
    id: idOf(ctx)(),
    type: "spec_table",
    name: ctx.w("elSpecs"),
    text: t.text,
    translations: t.translations,
    tech: { rows },
    color: l.k.ink,
    dark_color: l.k.darkInk,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    radius: 22,
    padding: sides(14, 16, 14, 16),
    margin: sides(10, 16, 0, 16),
  };
}

/** The brands the shop carries, as quiet wordmarks in a row that slides (each opens the shop). */
function brandsRow(ctx: SectionContext, l: Look, brands: readonly string[]): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("elBrands"),
    gap: 8,
    scroll: true,
    padding: sides(0, 16, 0, 16),
    children: brands.map((b) => ({
      id: id(),
      type: "row" as const,
      name: b,
      height: 58,
      radius: 16,
      align: "center" as const,
      cross: "center" as const,
      padding: sides(0, 22, 0, 22),
      background: l.k.surface,
      dark_background: l.k.darkSurface,
      border_color: l.k.line,
      dark_border_color: l.k.darkLine,
      border_width: 1,
      action: shop,
      children: [{ id: id(), type: "text" as const, text: b, max_lines: 1, font: { size: 14, weight: 700, letter_spacing: 3 }, color: l.k.ink, dark_color: l.k.darkInk }],
    })),
  };
}

const BRANDS = ["ZENRA", "ARCLINE", "LUMORA", "RYOKU", "AUREL", "HAUSEN", "KOVA", "VELLO"] as const;

/** What this person opened lately (kept on their phone). */
function recent(ctx: SectionContext, l: Look): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w("elRecent"), source: "products", layout: "carousel", recent: true, gap: 10, padding: sides(0, 16, 0, 16), query: { limit: 10, category_id: null, featured: false, sort: "newest", ids: [] }, card: productCard(ctx, l, 112, 120) };
}

/** The home's header: the wordmark at its start, the menu (the category menu), the bell and the bag at its end. */
function homeHeader(ctx: SectionContext, l: Look): StudioPage["header"] {
  const t = sigTexts(ctx, { title: "elWordmark" });
  return { type: "logo_actions", title: t.title, translations: t.translations, buttons: ["menu", "notifications", "cart"], menu_page: MENU_PAGE, background: l.k.page, dark_background: l.k.darkPage, color: l.k.ink, dark_color: l.k.darkInk };
}

// ——— A · MADAR ———

export function madarHome(ctx: SectionContext): StudioPage {
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
        searchPill(ctx, l, "elSearch"),
        { id: id(), type: "categories", name: ctx.w("elCategories"), source: "products", style: "circles", color: l.k.ink, dark_color: l.k.darkInk, padding: sides(8, 12, 4, 12) },
        heroCarousel(
          ctx,
          l,
          [
            ["w-phone-camera", "elHeroKicker1", "elHeroTitle1"],
            ["w-laptop-glow", "elHeroKicker2", "elHeroTitle2"],
            ["w-vr-headset", "elHeroKicker3", "elHeroTitle3"],
          ],
          "elOrderNow",
        ),
        servicesStrip(ctx, l),
        headOf(ctx, l, "elNewIn", { word: "elSeeAll", action: shop }, "elNewInLine"),
        productRow(ctx, l, "elNewIn"),
        dealCard(ctx, l, "carousel"),
        headOf(ctx, l, "elInterest", { word: "elAllCategories", action: ownPage(ctx, MENU_PAGE) }),
        interestTiles(ctx, l, [
          ["gamepad-blue", "elGamingKicker", "elGaming"],
          ["camera-night", "elCreatorsKicker", "elCreators"],
          ["laptop-plant", "elWorkKicker", "elWork"],
          ["tv-room", "elCinemaKicker", "elCinema"],
        ]),
        headOf(ctx, l, "elStar", null, "elStarLine"),
        starCard(ctx, l),
        tradeCard(ctx, l, "elTradeTitle"),
        headOf(ctx, l, "elBrands", { word: "elAll", action: shop }),
        brandsRow(ctx, l, BRANDS),
        headOf(ctx, l, "elBest", { word: "elSeeAll", action: shop }, "elBestLine"),
        productGrid(ctx, l, "elBest", "popular"),
        headOf(ctx, l, "elCompare", { word: "elCompareMore", action: ownPage(ctx, COMPARE_PAGE) }, "elCompareLine"),
        compareBlock(ctx, l),
        headOf(ctx, l, "elRecent", null),
        recent(ctx, l),
      ],
    },
  };
}

// ——— B · NABD ———

/** B's line over the search: where it delivers and how soon. */
function deliverLine(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const l = LOOK_B;
  return {
    id: id(),
    type: "row",
    name: ctx.w("elDeliverTo"),
    gap: 6,
    cross: "center",
    padding: sides(2, 16, 6, 16),
    children: [
      { id: id(), type: "icon", icon: "location_on", icon_size: 18, color: B.ink, dark_color: B.darkInk },
      say(ctx, l, "elDeliverTo", { size: 12.5, weight: 600 }, { width: "fill", max_lines: 1 }),
      {
        id: id(),
        type: "text",
        text: ctx.w("elWithin"),
        max_lines: 1,
        font: { size: 11.5, weight: 700 },
        color: "#3D6000",
        dark_color: LIME,
        background: "#E6F4C4",
        dark_background: "#1D2511",
        radius: 8,
        padding: sides(3, 8, 3, 8),
      },
    ],
  };
}

/** B's search: the pill and a dark square that opens the shop's filters. */
function searchRow(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("elSearchB"),
    gap: 8,
    cross: "center",
    padding: sides(0, 16, 6, 16),
    children: [
      { ...searchPill(ctx, LOOK_B, "elSearchB", sides(0, 0, 0, 0)), width: "fill" },
      { id: id(), type: "icon", name: ctx.w("elAllCategories"), icon: "tune", icon_size: 22, color: LIME, dark_color: "#121314", background: B_CARD.day, dark_background: LIME, radius: 16, padding: sides(14, 14, 14, 14), action: shop },
    ],
  };
}

/** B's top five: the best sellers as a numbered list on a white card. */
function topList(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w("elTopNow"),
    source: "products",
    layout: "list",
    gap: 0,
    radius: 24,
    padding: sides(6, 14, 6, 14),
    margin: sides(0, 16, 0, 16),
    background: B.surface,
    dark_background: B.darkSurface,
    query: { limit: 5, category_id: null, featured: false, sort: "popular", ids: [] },
    card: {
      id: id(),
      type: "row",
      gap: 12,
      cross: "center",
      padding: sides(10, 0, 10, 0),
      children: [
        { id: id(), type: "image", bind: "image", width: 58, height: 58, radius: 14, fit: "cover", background: B_TINT.day, dark_background: B_TINT.night },
        {
          id: id(),
          type: "column",
          width: "fill",
          gap: 3,
          children: [
            { id: id(), type: "text", bind: "title", max_lines: 1, color: B.ink, dark_color: B.darkInk, font: { family: KUFI, size: 13.5, weight: 600 } },
            { id: id(), type: "text", bind: "subtitle", max_lines: 1, color: B.muted, dark_color: B.darkMuted, font: { size: 11.5 } },
            { id: id(), type: "text", bind: "price", max_lines: 1, color: B.ink, dark_color: B.darkInk, font: { family: KUFI, size: 14, weight: 700 } },
          ],
        },
        { id: id(), type: "icon", icon: "add", icon_size: 20, color: B.ink, dark_color: B.darkInk, border_color: B.line, dark_border_color: B.darkLine, border_width: 1, radius: 99, padding: sides(7, 7, 7, 7) },
      ],
    },
  };
}

/** B's bundle card: a desk set on a near-black card, its photos two by two and a lime button. */
function bundleCard(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const l = LOOK_B;
  // A tile without the platform's photo at hand (a page made without pictures) is a dark tile.
  const photo = (name: string, height: number): StudioNode => {
    const url = sigPhoto(ctx, P(name));
    return url ? { id: id(), type: "image", image_url: url, width: "fill", height, radius: 14, fit: "cover", background: B_CARD.line, dark_background: B_CARD.line } : { id: id(), type: "row", width: "fill", height, radius: 14, background: B_CARD.line, dark_background: B_CARD.line, children: [] };
  };
  return {
    id: id(),
    type: "column",
    name: ctx.w("elBundleTitle"),
    gap: 12,
    radius: 26,
    padding: sides(18, 18, 18, 18),
    margin: sides(22, 16, 4, 16),
    background: B_CARD.day,
    dark_background: B_CARD.night,
    border_color: B_CARD.line,
    dark_border_color: B_CARD.line,
    border_width: 1,
    children: [
      say(ctx, l, "elBundleKicker", { size: 11.5, weight: 700 }, { color: LIME, dark_color: LIME, max_lines: 1 }),
      say(ctx, l, "elBundleTitle", face(l, 18), { color: "#FFFFFF", dark_color: "#FFFFFF", max_lines: 3 }),
      {
        id: id(),
        type: "row",
        gap: 8,
        children: [
          { id: id(), type: "column", width: "fill", gap: 8, children: [photo("hp-studio", 96), photo("keyboard-slim", 96)] },
          { id: id(), type: "column", width: "fill", gap: 8, children: [photo("laptop-chart", 200)] },
        ],
      },
      {
        id: id(),
        type: "button",
        name: ctx.w("elBundleButton"),
        text: ctx.w("elBundleButton"),
        icon: "shopping_bag",
        width: "hug",
        height: 44,
        radius: 16,
        padding: sides(0, 18, 0, 18),
        self_align: "start",
        background: LIME,
        dark_background: LIME,
        color: "#121314",
        dark_color: "#121314",
        font: { size: 14, weight: 700 },
        motion: { press: "shrink" },
        action: shop,
      },
    ],
  };
}

/** B's services, two by two: free installation, the shop's care, fast delivery and installments (coming soon only). */
function servicesGrid(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const l = LOOK_B;
  const tile = (icon: string, title: SectionWord, line: SectionWord, soon = false): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(title),
    gap: 10,
    cross: "center",
    radius: 20,
    padding: sides(14, 12, 14, 12),
    background: B.surface,
    dark_background: B.darkSurface,
    border_color: B.line,
    dark_border_color: B.darkLine,
    border_width: 1,
    children: [
      { id: id(), type: "icon", icon, icon_size: 20, color: soon ? B.muted : "#3D6000", dark_color: soon ? B.darkMuted : LIME, background: soon ? B_TINT.day : "#E6F4C4", dark_background: soon ? B_TINT.night : "#1D2511", radius: 12, padding: sides(8, 8, 8, 8) },
      { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, l, title, { size: 13, weight: 700 }, { max_lines: 1 }), say(ctx, l, line, { size: 11 }, { muted: true, max_lines: 2 })] },
    ],
  });
  return {
    id: id(),
    type: "grid",
    name: ctx.w("elServicesB"),
    columns: 2,
    gap: 10,
    padding: sides(0, 16, 0, 16),
    children: [tile("home_work", "elInstall", "elInstallText"), tile("verified", "elCare", "elCareText"), tile("bolt", "elFast", "elFastBText"), tile("calendar_month", "elInstallments", "elSoon", true)],
  };
}

export function nabdHome(ctx: SectionContext): StudioPage {
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
        deliverLine(ctx),
        searchRow(ctx),
        { id: id(), type: "categories", name: ctx.w("elCategories"), source: "products", color: B.ink, dark_color: B.darkInk, padding: sides(4, 12, 4, 12) },
        heroCarousel(
          ctx,
          l,
          [
            ["w-laptop-glow", "elHeroKicker2", "elHeroTitle2"],
            ["w-phone-camera", "elHeroKicker1", "elHeroTitle1"],
            ["w-gamepad-blue", "elHeroKicker3", "elHeroTitle3"],
          ],
          "elDiscover",
        ),
        headOf(ctx, l, "elShopCategories", { word: "elAllCategories", action: ownPage(ctx, MENU_PAGE) }),
        { id: id(), type: "categories", name: ctx.w("elShopCategories"), source: "products", style: "pictures", columns: 2, color: B.ink, dark_color: B.darkInk, padding: sides(0, 12, 0, 12) },
        dealCard(ctx, l, "banner"),
        headOf(ctx, l, "elTopNow", { word: "elAll", action: shop }, "elTopLine", "elTopKicker"),
        topList(ctx),
        headOf(ctx, l, "elNewArrivals", { word: "elSeeAll", action: shop }),
        productGrid(ctx, l, "elNewArrivals", "newest"),
        bundleCard(ctx),
        tradeCard(ctx, l, "elTradeBTitle"),
        headOf(ctx, l, "elCompare", { word: "elCompareMore", action: ownPage(ctx, COMPARE_PAGE) }, "elCompareLine"),
        compareBlock(ctx, l),
        headOf(ctx, l, "elServicesB", null),
        servicesGrid(ctx),
        headOf(ctx, l, "elBrands", null),
        brandsRow(ctx, l, BRANDS),
        headOf(ctx, l, "elRecent", null),
        recent(ctx, l),
      ],
    },
  };
}

// ——— The pages after the home (both looks) ———

/**
 * The category menu (the header's menu button opens it): the search on top,
 * quick ways in (offers, what's new, trade-in, installation), every main
 * category of the shop a row of cards (its "All" card, then its
 * sub-categories), then the account, the orders, the language and how to
 * reach the shop.
 */
export function categoryMenuPage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "elWordmark" });
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
        searchPill(ctx, l, "elSearchAll", sides(6, 16, 4, 16)),
        {
          id: id(),
          type: "row",
          name: ctx.w("elQuickOffers"),
          gap: 8,
          scroll: true,
          padding: sides(8, 16, 8, 16),
          children: [quick("elQuickOffers", "local_offer", true, shop), quick("elNewIn", "new_releases", false, shop), quick("elQuickTrade", "sync", false, ownPage(ctx, TRADE_PAGE)), quick("elQuickInstall", "home_work", false, shop)],
        },
        {
          id: id(),
          type: "categories",
          name: ctx.w("elCategoryMenu"),
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
          name: ctx.w("elMenuAccount"),
          gap: 8,
          padding: sides(0, 16, 0, 16),
          children: [tile("elAccount", "person", screen("account")), tile("elOrders", "package_2", screen("orders")), tile("elLanguage", "language", screen("settings"))],
        },
        {
          id: id(),
          type: "row",
          name: ctx.w("elContact"),
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
            { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, l, "elContact", { size: 14, weight: 700 }), say(ctx, l, "elContactLine", { size: 12 }, { muted: true, max_lines: 2 })] },
            { id: id(), type: "icon", icon: "chat", icon_size: 20, color: l.k.ink, dark_color: l.k.darkInk },
          ],
        },
      ],
    },
  };
}

/** The trade-in page: the whole estimator (the `trade_in` element, `full`), then how it works. */
export function tradeInPage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "elTradePage", text: "elTradeTitle" });
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
        { ...say(ctx, l, "elTradeLine", { size: 14, line_height: 1.5 }, { muted: true }), padding: sides(8, 16, 4, 16) },
        {
          id: id(),
          type: "trade_in",
          name: ctx.w("elTradeTitle"),
          text: t.text,
          tech: { look: "full", accent: l.look === "a" ? A.fill : "#3D6000" },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          background: l.k.surface,
          dark_background: l.k.darkSurface,
          border_color: l.k.line,
          dark_border_color: l.k.darkLine,
          border_width: 1,
          radius: 24,
          padding: sides(16, 16, 16, 16),
          margin: sides(12, 16, 4, 16),
        },
        headOf(ctx, l, "elTradeSteps", null),
        {
          id: id(),
          type: "timeline",
          name: ctx.w("elTradeSteps"),
          timeline: { style: "vertical" },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          background: l.k.surface,
          dark_background: l.k.darkSurface,
          radius: 20,
          padding: sides(14, 14, 14, 14),
          margin: sides(0, 16, 0, 16),
          entries: [step("elTradeStep1", "elTradeStep1Text", true), step("elTradeStep2", "elTradeStep2Text"), step("elTradeStep3", "elTradeStep3Text")],
        },
      ],
    },
  };
}

/** The compare page: two products side by side, then the first one's whole specifications. */
export function comparePage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "elComparePage" });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], ...signatureHeader(l.k, "glass") },
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [{ ...say(ctx, l, "elCompareLine", { size: 14, line_height: 1.5 }, { muted: true }), padding: sides(8, 16, 10, 16) }, compareBlock(ctx, l), headOf(ctx, l, "elSpecs", null), { ...specTable(ctx, l, 12), margin: sides(0, 16, 0, 16) }],
    },
  };
}

/** Over the shop: its categories as chips, and a banner of the week's offer. */
function shopTop(ctx: SectionContext, l: Look): StudioNode[] {
  return [
    { id: idOf(ctx)(), type: "categories", name: ctx.w("elCategories"), source: "products", padding: sides(4, 12, 4, 12) },
    { ...heroCard(ctx, l, l.look === "a" ? "w-laptop-chart" : "w-gamepad-hands", "elEditKicker", "elEditTitle", "elShopEdit"), height: 160, margin: sides(6, 16, 6, 16) },
  ];
}

/** Over the cart: the shop's code and its returns and warranty, with installments coming soon. */
function cartTop(ctx: SectionContext, l: Look): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "coupon", name: ctx.w("elCoupon"), code: ELECTRONICS_COUPON_CODE, coupon: { look: l.look === "a" ? "ticket" : "glass", bind: "public" }, radius: 18, color: l.look === "a" ? A.fill : "#121314", margin: sides(10, 16, 4, 16) },
    {
      id: id(),
      type: "column",
      name: ctx.w("elReturnsNote"),
      gap: 10,
      radius: 18,
      padding: sides(12, 14, 12, 14),
      margin: sides(8, 16, 4, 16),
      background: l.tint.day,
      dark_background: l.tint.night,
      children: [
        {
          id: id(),
          type: "row",
          gap: 12,
          cross: "center",
          children: [{ id: id(), type: "icon", icon: "verified", icon_size: 22, color: l.k.ink, dark_color: l.k.darkInk }, say(ctx, l, "elReturnsNote", { size: 13, weight: 600, line_height: 1.4 }, { width: "fill", max_lines: 3 })],
        },
        installmentsTag(ctx, { color: l.k.muted, dark_color: l.k.darkMuted, background: l.k.surface, dark_background: l.k.darkSurface }),
      ],
    },
  ];
}

/** Over the orders: how an order travels (the person's newest order on its way, else the first step lit). */
function ordersTop(ctx: SectionContext, l: Look): StudioNode[] {
  const step = (title: SectionWord, text: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    headOf(ctx, l, "elTrack", null, undefined, undefined, sides(10, 16, 6, 16)),
    {
      id: idOf(ctx)(),
      type: "timeline",
      name: ctx.w("elTrack"),
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
      entries: [step("elTrack1", "elTrack1Text", true), step("elTrack2", "elTrack2Text"), step("elTrack3", "elTrack3Text"), step("elTrack4", "elTrack4Text")],
    },
  ];
}

/** The demo's code shown in the app (lib/demo/electronics.ts makes it). */
export const ELECTRONICS_COUPON_CODE = "MADAR10";

function electronicsOver(l: Look) {
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

function electronicsPages(l: Look) {
  return (ctx: SectionContext) => [
    { slug: MENU_PAGE, title: "elCategoryMenu" as SectionWord, studio: categoryMenuPage(ctx, l) },
    { slug: TRADE_PAGE, title: "elTradePage" as SectionWord, studio: tradeInPage(ctx, l) },
    { slug: COMPARE_PAGE, title: "elComparePage" as SectionWord, studio: comparePage(ctx, l) },
  ];
}

/** The five tabs of the floating bar: Home, Shop, Cart, Orders, Account (the clothes type's). */
export function electronicsTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  return clothesTabs(tabs);
}

// ——— The sign-in screens, the bars and the two looks ———

const MADAR_SCREENS = signatureScreens({
  style: "photo",
  photo: P("w-laptop-plant"),
  title: { en: "Welcome to {app}", ar: "أهلًا بك في {app}", tr: "{app}'a hoş geldiniz" },
  subtitle: { en: "Sign in to follow your orders and your warranty.", ar: "سجّل الدخول لتتابع طلباتك وضمانك.", tr: "Siparişlerinizi ve garantinizi takip etmek için giriş yapın." },
  menu: "cover",
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

const NABD_SCREENS = signatureScreens({
  style: "photo",
  photo: P("w-laptop-glow"),
  title: { en: "Your tech, your pulse", ar: "أجهزتك على نبضك", tr: "Teknolojiniz, nabzınız" },
  subtitle: { en: "Sign in for your orders, your warranty and trade-ins.", ar: "سجّل الدخول لطلباتك وضمانك والاستبدال.", tr: "Siparişleriniz, garantiniz ve takaslarınız için giriş yapın." },
  menu: "night",
  accent: "#3D6000",
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** A's floating bar: white by day, near black by night, the open tab deep blue with its name. */
export const MADAR_BAR = signatureBar(A, { design: "float", background: "#FFFFFF", dark_background: "#1C1E23", active: A.fill, dark_active: "#3D6BFF", inactive: "#5B6270", dark_inactive: "#A0A6B0", labels: "active", radius: 30, margin: 12 });
/** B's floating bar: near black by day and by night, the open tab lime. */
export const NABD_BAR = signatureBar(B, { design: "float", background: B_CARD.day, dark_background: "#1E1F22", active: LIME, dark_active: LIME, inactive: "#B3B6B1", dark_inactive: "#878B87", labels: "active", radius: 30, margin: 12 });

export const MADAR_A: SignatureDesign = {
  demo: "electronics",
  variant: "a",
  template: { id: "electronics_signature_a", icon: "devices", fits: { types: ["store"], plain: true } },
  home: madarHome,
  over: electronicsOver(LOOK_A),
  tabs: electronicsTabs,
  pages: electronicsPages(LOOK_A),
  bar: MADAR_BAR,
  look: { header: signatureHeader(A, "glass"), background: A.page, dark_background: A.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    // Look A is the demo: its main colour the demo's (lib/demo/content.ts).
    appearance: { secondary_color: "#0E1116", font: "DM Sans", font_family: PLEX, dark_background: A.darkPage, dark_surface: A.darkSurface },
    screens: MADAR_SCREENS,
  },
};

export const NABD_B: SignatureDesign = {
  demo: "electronics",
  variant: "b",
  template: { id: "electronics_signature_b", icon: "bolt", fits: { types: ["store"], plain: true } },
  home: nabdHome,
  over: electronicsOver(LOOK_B),
  tabs: electronicsTabs,
  pages: electronicsPages(LOOK_B),
  bar: NABD_BAR,
  look: { header: signatureHeader(B, "glass"), background: B.page, dark_background: B.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    // Near black for the app's own buttons (white words on it); the lime stays for what the look lights.
    primary: "#121314",
    appearance: { secondary_color: "#3D6000", font: "Outfit", font_family: KUFI, dark_background: B.darkPage, dark_surface: B.darkSurface },
    screens: NABD_SCREENS,
  },
};

// ——— Every part of the two looks as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;

const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};

export const ELECTRONICS_SECTIONS: readonly SectionInfo[] = [
  // The trade-in card and the whole estimator.
  { id: "el_trade_in", icon: "sync", isNew: true, fits: STORE_PLAIN, make: one((ctx) => tradeCard(ctx, LOOK_A, "elTradeTitle")) },
  { id: "el_trade_in_full", icon: "payments", isNew: true, fits: STORE_PLAIN, make: one((ctx) => tradeInPage(ctx, LOOK_A).body.children!.find((n) => n.type === "trade_in")!) },
  // Two products compared, and a product's specifications.
  { id: "el_compare", icon: "compare", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "elCompare", null, "elCompareLine"), compareBlock(ctx, LOOK_A)]) },
  { id: "el_spec_table", icon: "list_alt", isNew: true, fits: STORE_PLAIN, make: one((ctx) => specTable(ctx, LOOK_A)) },
  // The services strip (with installments coming soon) and B's services grid.
  { id: "el_services", icon: "verified_user", isNew: true, fits: STORE_PLAIN, make: one((ctx) => servicesStrip(ctx, LOOK_A)) },
  { id: "el_services_grid", icon: "grid_view", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_B, "elServicesB", null), servicesGrid(ctx)]) },
  // The star of the season, the interests as photo tiles, the brands.
  { id: "el_star", icon: "star", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "elStar", null, "elStarLine"), starCard(ctx, LOOK_A)]) },
  { id: "el_interests", icon: "dashboard", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "elInterest", null), interestTiles(ctx, LOOK_A, [["gamepad-blue", "elGamingKicker", "elGaming"], ["camera-night", "elCreatorsKicker", "elCreators"]])]) },
  { id: "el_brands", icon: "sell", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_A, "elBrands", null), brandsRow(ctx, LOOK_A, BRANDS.slice(0, 5))]) },
  // B's top five, its bundle card and the deal of the day.
  { id: "el_top_list", icon: "format_list_numbered", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [headOf(ctx, LOOK_B, "elTopNow", null, "elTopLine", "elTopKicker"), topList(ctx)]) },
  { id: "el_bundle", icon: "work", isNew: true, fits: STORE_PLAIN, make: one((ctx) => bundleCard(ctx)) },
  { id: "el_deal", icon: "bolt", isNew: true, fits: STORE_PLAIN, make: one((ctx) => dealCard(ctx, LOOK_A, "carousel")) },
];
