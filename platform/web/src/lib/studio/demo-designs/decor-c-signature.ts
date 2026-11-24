import type { Action, LayoutTab, StudioEntry, StudioFont, StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { sides, sigEntry, sigTexts, signatureBar, type SignatureInk } from "./food-signature-parts";
import { productPageOf, productPart } from "../product-page";
import { signatureScreens, type SignatureDesign } from "./signature";
import { kitPhoto, ownPage, say, shop, type KitLook } from "./shop-kit-parts";

/**
 * 225 Sakan's look C, ATHAR (أثر), the gallery: the decor house hung as a
 * museum wall. Gallery white with black by day, a black wall by night;
 * Amiri for the titles and the labels' names, IBM Plex Sans Arabic for the
 * rest (both the project's fonts, so the app downloads both: IBM Plex Sans Arabic
 * its font, Amiri its Arabic font); generous white space, no corners, no shadows but the frames'.
 *
 * - A tiny centred wordmark between the menu and the bag.
 * - "Now showing": the exhibition's name in large Amiri, its dates.
 * - One framed piece on the wall (a thick mat, a thin frame) with its
 *   museum label: the name, the maker, the material, the size, the price.
 * - The collection as an asymmetric masonry: two columns of framed pieces,
 *   the second set lower, each with its label (name, size, price).
 * - The rooms as the gallery's halls (I, II, III…), each named like the
 *   shop's room so it opens it.
 * - The curator's note, then the new pieces on a quiet filmstrip.
 * - The text bar: names only, the open one underlined.
 *
 * The owner's words are in [brackets].
 */

export const ATHAR_INK: SignatureInk = {
  page: "#FFFFFF",
  darkPage: "#0B0B0B",
  surface: "#FFFFFF",
  darkSurface: "#171716",
  ink: "#0B0B0B",
  darkInk: "#F2F2EF",
  muted: "#66665F",
  darkMuted: "#A2A29B",
  line: "#E4E4DE",
  darkLine: "#2A2A28",
  accent: "#0B0B0B",
  darkAccent: "#F2F2EF",
  fill: "#0B0B0B",
  darkFill: "#F2F2EF",
  onFill: "#FFFFFF",
  darkOnFill: "#0B0B0B",
};

const L: KitLook = { k: ATHAR_INK, tint: { day: "#F6F6F3", night: "#121211" }, family: "IBM Plex Sans Arabic", look: "c", dir: "decor-photos", radius: 0, heavy: 400 };
const K = ATHAR_INK;
/** The wall the pieces hang on: a breath off the page. */
const WALL = { day: "#F7F7F4", night: "#121211" };
/** The frames: black by day, warm bone by night. */
const FRAME = { day: "#0B0B0B", night: "#E6E1D6" };
const MENU_PAGE = "menu";

const display = (size: number, weight: StudioFont["weight"] = 400, extra: Partial<StudioFont> = {}): StudioFont => ({ family: "Amiri", size, weight, line_height: 1.25, ...extra });
const text = (size: number, weight: StudioFont["weight"] = 400, extra: Partial<StudioFont> = {}): StudioFont => ({ family: L.family, size, weight, ...extra });

/** A section's head: a small spaced kicker over a large Amiri title. */
function head(ctx: SectionContext, kicker: SectionWord, title: SectionWord, link?: { word: SectionWord; action: Action }): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    gap: 12,
    cross: "end",
    padding: sides(44, 28, 18, 28),
    children: [
      { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, L, kicker, text(10.5, 500, { letter_spacing: 2 }), { muted: true, max_lines: 1 }), say(ctx, L, title, display(28), { max_lines: 2 })] },
      ...(link ? [{ ...say(ctx, L, link.word, text(12, 500, { underline: true }), { max_lines: 1 }), name: ctx.w(link.word), action: link.action }] : []),
    ],
  };
}

/** A piece in its frame: the mat inside a thin frame (its border), the photo in it. */
function framed(ctx: SectionContext, inner: StudioNode, mat: number, frame: number): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "column",
    gap: 0,
    padding: sides(mat, mat, mat, mat),
    background: K.surface,
    dark_background: K.darkSurface,
    border_color: FRAME.day,
    dark_border_color: FRAME.night,
    border_width: frame,
    children: [inner],
  };
}

/** The museum label: a rule at its start, the name in Amiri, its lines in small text. */
function label(ctx: SectionContext, name: SectionWord, lines: readonly SectionWord[], price?: SectionWord): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(name),
    gap: 12,
    margin: sides(22, 0, 0, 0),
    children: [
      { id: id(), type: "row", width: 2, background: K.ink, dark_background: K.darkInk, children: [] },
      {
        id: id(),
        type: "column",
        width: "fill",
        gap: 1,
        children: [
          say(ctx, L, name, display(19, 700), { max_lines: 2 }),
          ...lines.map((w) => say(ctx, L, w, text(11.5, 400, { line_height: 1.6 }), { muted: true, max_lines: 1 })),
          ...(price ? [say(ctx, L, price, text(12, 600), { max_lines: 1, margin: sides(4, 0, 0, 0) })] : []),
        ],
      },
    ],
  };
}

/** Now showing: the exhibition's kicker, its name in large Amiri, its dates; then the piece on the wall with its label. */
function exhibition(ctx: SectionContext): StudioNode[] {
  const id = idOf(ctx);
  const photo = kitPhoto(ctx, L, "sage-jars");
  const entry = ctx.entries?.[0];
  return [
    say(ctx, L, "atNow", text(11, 500, { letter_spacing: 2 }), { muted: true, max_lines: 1, padding: sides(26, 28, 14, 28) }),
    say(ctx, L, "atExhibition", display(44, 400, { line_height: 1.35 }), { max_lines: 2, padding: sides(0, 28, 0, 28) }),
    say(ctx, L, "atDates", text(12.5), { muted: true, max_lines: 2, padding: sides(8, 28, 0, 28) }),
    {
      id: id(),
      type: "column",
      name: ctx.w("atWall"),
      gap: 0,
      cross: "center",
      padding: sides(34, 50, 30, 50),
      margin: sides(28, 0, 0, 0),
      background: WALL.day,
      dark_background: WALL.night,
      action: entry ? { type: "item", item: { source: "products", id: entry.id } } : shop,
      children: [
        {
          ...framed(ctx, photo ? { id: id(), type: "image", image_url: photo, height: 250, fit: "cover" } : { id: id(), type: "row", height: 250, background: L.tint.day, dark_background: L.tint.night, children: [] }, 24, 3),
          shadow: "medium",
        },
        { ...label(ctx, "atPieceName", ["atPieceMaker", "atPieceMaterial", "atPieceSize"]), self_align: "stretch" },
      ],
    },
  ];
}

/** A framed card of the collection: the photo in its mat and frame, then its label (the name in Amiri, its size, its price). */
function framedCard(ctx: SectionContext, width: number, height: number): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    width,
    gap: 0,
    children: [
      framed(ctx, { id: id(), type: "image", bind: "image", width: width - 23, height, fit: "cover", background: L.tint.day, dark_background: L.tint.night }, 10, 1.5),
      {
        id: id(),
        type: "column",
        gap: 1,
        padding: sides(10, 0, 0, 0),
        children: [
          { id: id(), type: "text", bind: "title", max_lines: 2, color: K.ink, dark_color: K.darkInk, font: display(15.5, 700) },
          { id: id(), type: "text", bind: "subtitle", max_lines: 1, color: K.muted, dark_color: K.darkMuted, font: text(11) },
          {
            id: id(),
            type: "row",
            gap: 6,
            cross: "center",
            children: [
              { id: id(), type: "text", bind: "price", max_lines: 1, color: K.ink, dark_color: K.darkInk, font: text(12, 600) },
              { id: id(), type: "text", bind: "was_price", max_lines: 1, color: K.muted, dark_color: K.darkMuted, font: text(11) },
            ],
          },
        ],
      },
    ],
  };
}

/** The collection as an asymmetric masonry: two columns of framed pieces, the second hung lower, tall beside short. */
function masonry(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const column = (sort: "price_desc" | "price_asc", featured: boolean, height: number, top: number): StudioNode => ({
    id: id(),
    type: "items",
    name: ctx.w("atCollection"),
    source: "products",
    layout: "list",
    gap: 30,
    width: "fill",
    padding: sides(top, 0, 0, 0),
    query: { limit: 2, category_id: null, featured, sort, ids: [] },
    card: framedCard(ctx, 160, height),
  });
  return { id: id(), type: "row", name: ctx.w("atCollection"), gap: 18, cross: "start", padding: sides(0, 22, 0, 22), children: [column("price_desc", true, 200, 0), column("price_asc", false, 170, 56)] };
}

const HALLS = [
  ["I", "atHallLiving"],
  ["II", "atHallBedroom"],
  ["III", "atHallDining"],
  ["IV", "atHallReading"],
  ["V", "atHallPlants"],
] as const satisfies readonly [string, SectionWord][];

/** The halls: a Roman numeral, the room in Amiri (named like the shop's, opening it), a rule under each. */
function halls(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("atHalls"),
    gap: 0,
    margin: sides(0, 28, 0, 28),
    children: [
      { id: id(), type: "row", height: 1, background: K.ink, dark_background: K.darkInk, children: [] },
      ...HALLS.flatMap(([numeral, word]) => [
        {
          id: id(),
          type: "row" as const,
          name: ctx.w(word),
          gap: 18,
          cross: "center" as const,
          padding: sides(14, 0, 14, 0),
          action: shop,
          children: [
            { id: id(), type: "text" as const, text: numeral, width: 30, color: K.muted, dark_color: K.darkMuted, font: display(15) },
            say(ctx, L, word, display(22), { width: "fill", max_lines: 1 }),
            { id: id(), type: "icon" as const, icon: "arrow_forward", icon_size: 18, color: K.muted, dark_color: K.darkMuted },
          ],
        },
        { id: id(), type: "row" as const, height: 1, background: K.line, dark_background: K.darkLine, children: [] },
      ]),
    ],
  };
}

/** The curator's note: a quote in Amiri between two rules, who wrote it. */
function curator(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("atNoteBy"),
    gap: 12,
    padding: sides(26, 0, 26, 0),
    margin: sides(46, 28, 0, 28),
    border_color: K.line,
    dark_border_color: K.darkLine,
    border_width: 1,
    children: [say(ctx, L, "atNote", display(21, 400, { line_height: 1.6 }), { max_lines: 5, padding: sides(0, 18, 0, 18) }), say(ctx, L, "atNoteBy", text(12), { muted: true, max_lines: 1, padding: sides(0, 18, 0, 18) })],
  };
}

/** The new pieces as a quiet filmstrip of small framed works. */
function filmstrip(ctx: SectionContext): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w("atNew"), source: "products", layout: "carousel", gap: 22, padding: sides(0, 28, 0, 28), query: { limit: 8, category_id: null, featured: false, sort: "newest", ids: [] }, card: framedCard(ctx, 132, 132) };
}

/** The gallery's own top in place of the app's bar: a thin menu line, the tiny centred wordmark in Amiri over its spaced line, the bag. */
function galleryTop(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  const plain = (icon: string, name: SectionWord, action: Action): StudioNode => ({ id: id(), type: "row", name: ctx.w(name), width: 36, height: 36, align: "center", cross: "center", self_align: "center", action, children: [{ id: id(), type: "icon", icon, icon_size: 22, color: K.ink, dark_color: K.darkInk }] });
  return {
    id: id(),
    type: "row",
    name: ctx.w("dcWordmark"),
    gap: 8,
    cross: "center",
    padding: sides(10, 18, 6, 18),
    children: [
      plain("menu_open", "skCategoryMenu", ownPage(ctx, MENU_PAGE)),
      {
        id: id(),
        type: "column",
        width: "fill",
        gap: 2,
        cross: "center",
        children: [say(ctx, L, "dcWordmark", display(20, 400, { line_height: 1.1 }), { text_align: "center", max_lines: 1 }), say(ctx, L, "atWordmarkLine", text(9, 500, { letter_spacing: 3, uppercase: true }), { muted: true, text_align: "center", max_lines: 1 })],
      },
      plain("shopping_bag", "tabCart", screen("cart")),
    ],
  };
}

function home(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  return {
    // No bar of the app's: the gallery's own top (`galleryTop`).
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 60, 0),
      children: [
        galleryTop(ctx),
        ...exhibition(ctx),
        head(ctx, "atCollectionKicker", "atCollection", { word: "skSeeAll", action: shop }),
        masonry(ctx),
        head(ctx, "atHallsKicker", "atHalls"),
        halls(ctx),
        curator(ctx),
        head(ctx, "atNewKicker", "atNew", { word: "skSeeAll", action: shop }),
        filmstrip(ctx),
        head(ctx, "atVisitKicker", "atVisit"),
        say(ctx, L, "atVisitText", text(13, 400, { line_height: 1.7 }), { muted: true, max_lines: 4, padding: sides(0, 28, 0, 28) }),
      ],
    },
  };
}

// ——— The pages after the home ———

function over(screenName: string, ctx: SectionContext): StudioNode[] | null {
  const id = idOf(ctx);
  switch (screenName) {
    case "search":
      return [
        say(ctx, L, "atShopKicker", text(10.5, 500, { letter_spacing: 2 }), { muted: true, max_lines: 1, padding: sides(8, 20, 0, 20) }),
        say(ctx, L, "atShopTitle", display(30), { max_lines: 2, padding: sides(0, 20, 6, 20) }),
        {
          id: id(),
          type: "row",
          name: ctx.w("atHalls"),
          gap: 18,
          scroll: true,
          padding: sides(6, 20, 12, 20),
          children: HALLS.map(([numeral, word]) => ({
            id: id(),
            type: "row" as const,
            name: ctx.w(word),
            gap: 6,
            cross: "center" as const,
            action: shop,
            children: [{ id: id(), type: "text" as const, text: numeral, color: K.muted, dark_color: K.darkMuted, font: display(13) }, say(ctx, L, word, display(17), { max_lines: 1 })],
          })),
        },
      ];
    case "cart":
      return [
        { id: id(), type: "coupon", name: ctx.w("skCoupon"), code: DECOR_C_CODE, coupon: { look: "classic", bind: "public" }, radius: 0, color: K.fill, margin: sides(10, 16, 4, 16) },
        { ...label(ctx, "atCartNote", ["atCartNoteLine"]), margin: sides(16, 20, 6, 20) },
      ];
    case "orders":
      return [
        head(ctx, "atOrdersKicker", "skTrack"),
        {
          id: id(),
          type: "timeline",
          name: ctx.w("skTrack"),
          timeline: { style: "vertical", source: "latest_order" },
          color: K.ink,
          dark_color: K.darkInk,
          radius: 0,
          padding: sides(6, 28, 6, 28),
          entries: (["dcTrack1", "dcTrack2", "dcTrack3", "dcTrack4"] as const).map((w, i): StudioEntry => sigEntry(ctx, { title: w, text: `${w}Text` as SectionWord }, i === 0 ? { highlight: true } : {})),
        },
      ];
    default:
      return null;
  }
}

const DECOR_C_CODE = "SAKAN10";

/** The category menu as the gallery's plan: the search, every hall a row of its rooms' cards, then the visitor's ways in, in words only. */
function menuPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "dcWordmark" });
  const way = (word: SectionWord, action: Action): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(word),
    gap: 10,
    cross: "center",
    padding: sides(14, 0, 14, 0),
    border_color: K.line,
    dark_border_color: K.darkLine,
    action,
    children: [say(ctx, L, word, display(19), { width: "fill", max_lines: 1 }), { id: id(), type: "icon", icon: "arrow_forward", icon_size: 18, color: K.muted, dark_color: K.darkMuted }],
  });
  return {
    header: { type: "logo_center", title: t.title, translations: t.translations, buttons: ["search", "cart"], background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk, style: "brand" },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        say(ctx, L, "atMenuKicker", text(10.5, 500, { letter_spacing: 2 }), { muted: true, max_lines: 1, padding: sides(10, 24, 2, 24) }),
        say(ctx, L, "atMenuTitle", display(30), { max_lines: 1, padding: sides(0, 24, 10, 24) }),
        { id: id(), type: "search", name: ctx.w("atMenuSearch"), text: ctx.w("atMenuSearch"), source: "products", radius: 0, height: 46, background: K.page, dark_background: K.darkPage, color: K.muted, dark_color: K.darkMuted, border_color: K.ink, dark_border_color: K.darkInk, border_width: 1, margin: sides(4, 24, 14, 24) },
        { id: id(), type: "categories", name: ctx.w("skCategoryMenu"), source: "products", style: "rows", category_menu: { look: "label", numbers: false, radius: 0 }, color: K.ink, dark_color: K.darkInk, padding: sides(4, 0, 4, 0) },
        {
          id: id(),
          type: "column",
          name: ctx.w("skMenuAccount"),
          gap: 0,
          margin: sides(22, 24, 0, 24),
          children: [
            { id: id(), type: "row", height: 1, background: K.ink, dark_background: K.darkInk, children: [] },
            way("skAccount", screen("account")),
            way("skOrders", screen("orders")),
            way("atWishlist", screen("favorites")),
            way("skLanguage", screen("settings")),
            way("skContact", screen("account")),
          ],
        },
        say(ctx, L, "atVisitText", text(12, 400, { line_height: 1.7 }), { muted: true, max_lines: 3, padding: sides(14, 24, 0, 24) }),
      ],
    },
  };
}

/** Five tabs: the Gallery (home), the Collection (shop), Cart, Orders, Account. */
export function atharTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const out = structuredClone([...tabs]).map((t) => {
    const target = t.target.type === "screen" ? t.target.screen : null;
    if (t.id === "home") return { ...t, icon: "home" };
    if (target === "search") return { ...t, label: "Shop", icon: "photo_library" };
    if (target === "cart") return { ...t, label: "Cart", icon: "shopping_bag" };
    if (target === "account") return { ...t, icon: "person" };
    return t;
  });
  const account = out.findIndex((t) => t.target.type === "screen" && t.target.screen === "account");
  const orders: LayoutTab = { id: "orders", label: "Orders", icon: "package_2", target: { type: "screen", screen: "orders" } };
  if (!out.some((t) => t.target.type === "screen" && t.target.screen === "orders")) out.splice(account < 0 ? out.length : account, 0, orders);
  return out;
}

const ATHAR_SCREENS = signatureScreens({
  style: "premium",
  photo: "/decor-photos/ribbed-vase.jpg",
  title: { en: "Welcome to the gallery", ar: "أهلًا بك في المعرض", tr: "Galeriye hoş geldiniz" },
  subtitle: { en: "Sign in to keep the pieces you love and follow your orders.", ar: "سجّل الدخول لتحفظ القطع التي تحبها وتتابع طلباتك.", tr: "Sevdiğiniz parçaları saklamak ve siparişlerinizi takip etmek için giriş yapın." },
  menu: "cover",
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** The text bar: names only on the white wall, the open one in black. */
const ATHAR_BAR = signatureBar(K, { design: "text", background: K.page, dark_background: K.darkPage, active: K.ink, dark_active: K.darkInk, inactive: "#8A8A83", dark_inactive: "#7E7E78", labels: "always" });

/**
 * 228.7 ATHAR's own product page, the piece hung in the gallery: a wide
 * quiet wall at the top, the piece's photos framed (a white mat in a thin
 * black frame by day, bone by night) with generous space around it, then
 * its museum label at the frame's foot (a rule at its start, the name in
 * Amiri, its size and the house's lines in small text, the price), the
 * choices and Add to cart as a plain outlined bar in the flow, then "About
 * the piece" under the gallery's kicker, the reviews and the pieces of the
 * same hall in a grid of two. Nothing fixed at the foot.
 */
function galleryPiece(ctx: SectionContext) {
  const id = idOf(ctx);
  const ink = { color: K.ink, dark_color: K.darkInk } as const;
  const accent = { accent: K.fill, dark_accent: K.darkFill } as const;
  return productPageOf(ctx, {
    background: WALL.day,
    dark_background: WALL.night,
    parts: [
      { element: { id: id(), type: "spacer", height: 76 } },
      { element: { ...framed(ctx, productPart(ctx, { type: "product_gallery", radius: 0, node: { aspect_ratio: 4 / 5 } }), 22, 2), margin: sides(0, 40, 0, 40) } },
      {
        // The museum label: a rule at its start, the name, its size and lines, the price.
        element: {
          id: id(),
          type: "row",
          name: ctx.w("atpKicker"),
          gap: 12,
          margin: sides(30, 40, 0, 40),
          children: [
            { id: id(), type: "row", width: 2, background: K.ink, dark_background: K.darkInk, children: [] },
            {
              id: id(),
              type: "column",
              width: "fill",
              gap: 2,
              children: [
                productPart(ctx, { type: "product_title", node: { ...ink, font: display(20, 700), margin: undefined } }),
                productPart(ctx, { type: "product_delivery", title: "atpLabel", accent: K.muted, dark_accent: K.darkMuted, node: { color: K.muted, dark_color: K.darkMuted, margin: sides(6, 0, 0, 0) } }),
                productPart(ctx, { type: "product_price", node: { ...ink, font: text(14, 600), margin: sides(10, 0, 0, 0) } }),
              ],
            },
          ],
        },
      },
      { type: "product_variants", look: "grid", ...accent, node: { ...ink, margin: sides(34, 40, 0, 40) } },
      // In the flow, not fixed at the foot; square (1, as 0 is the button's own rounding in the app).
      { type: "product_buy", ...accent, node: { pin: "none", radius: 1, margin: sides(18, 40, 0, 40), padding: undefined, ...ink } },
      { element: head(ctx, "atpKicker", "atpAbout") },
      { type: "product_description", node: { ...ink, margin: sides(0, 28, 0, 28) } },
      { type: "product_reviews", ...accent, node: { ...ink, margin: sides(30, 28, 0, 28) } },
      { type: "product_related", look: "grid", rows: 4, text: "atpRelated", node: { ...ink, margin: sides(40, 12, 28, 12) } },
    ],
  });
}

export const DECOR_C: SignatureDesign = {
  demo: "decor",
  variant: "c",
  template: { id: "decor_signature_c", icon: "photo_library", fits: { types: ["store"], plain: true } },
  home,
  over,
  tabs: atharTabs,
  // 228.7 And its own product page.
  pages: (ctx) => [{ slug: MENU_PAGE, title: "skCategoryMenu", studio: menuPage(ctx) }, galleryPiece(ctx)],
  bar: ATHAR_BAR,
  look: { header: { background: K.page, color: K.ink, dark_background: K.darkPage, dark_color: K.darkInk }, background: K.page, dark_background: K.darkPage },
  chrome: { header: "brand", system: "brand" },
  isNew: true,
  project: {
    primary: K.fill,
    appearance: { secondary_color: "#66665F", font: "DM Sans", font_family: "IBM Plex Sans Arabic", arabic_font: "Amiri", dark_background: K.darkPage, dark_surface: K.darkSurface },
    screens: ATHAR_SCREENS,
  },
};
