import type { Action, LayoutTab, StudioEntry, StudioFont, StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { sides, sigEntry, sigTexts, signatureBar, type SignatureInk } from "./food-signature-parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { kitPhoto, say, shop, type KitLook } from "./shop-kit-parts";

/**
 * 225 Rukn's look D, MANZIL (منزل), room by room: the house walked through
 * one room at a time. Oat paper and deep navy by day, a navy night lit in
 * ochre; Noto Sans Arabic; big soft corners.
 *
 * - The header: the title and the search in it.
 * - A sticky segmented room switcher pinned under the header (living,
 *   bedroom, dining, office, outdoor), each segment named like the shop's
 *   room so it opens it.
 * - Every room a real switch (Studio's `tabs`): the room's large photo, what
 *   is in it and its sub-categories, each opening it.
 * - The material swatch strip (oak, walnut, linen, bouclé).
 * - Large horizontal cards: wide photos of the pieces, their size and price.
 * - The delivery and assembly timeline (order, prepared, delivered on your
 *   day, assembled), then the booking of the shop's days.
 * - A room's pieces as long list cards.
 * - The segment bar: a floating track, the open tab in a soft segment.
 *
 * Installments are only ever "coming soon". The owner's words are in
 * [brackets].
 */

export const MANZIL_INK: SignatureInk = {
  page: "#F3F1EC",
  darkPage: "#0F131C",
  surface: "#FFFFFF",
  darkSurface: "#181E2B",
  ink: "#1B2233",
  darkInk: "#EEF0F5",
  muted: "#596071",
  darkMuted: "#AAB0BF",
  line: "#E2DED5",
  darkLine: "#283042",
  accent: "#9A6A2C",
  darkAccent: "#E3B868",
  fill: "#1F2A44",
  darkFill: "#E3B868",
  onFill: "#FFFFFF",
  darkOnFill: "#1A1408",
};

const L: KitLook = { k: MANZIL_INK, tint: { day: "#E8E3D8", night: "#1F2636" }, family: "Noto Sans Arabic", look: "d", dir: "furniture-photos", radius: 22, heavy: 800 };
const K = MANZIL_INK;
const MENU_PAGE = "menu";

const font = (size: number, weight: StudioFont["weight"] = 400, extra: Partial<StudioFont> = {}): StudioFont => ({ family: L.family, size, weight, ...extra });

const ROOMS = [
  { word: "fuRoomLiving", short: "mnSegLiving", icon: "airline_seat_recline_extra", photo: "room-living", line: "mnRoomLivingLine", subs: ["mnSubSofas", "mnSubArmchairs", "mnSubCoffee", "mnSubTv"] },
  { word: "fuRoomBedroom", short: "mnSegBedroom", icon: "bed", photo: "room-bedroom", line: "mnRoomBedroomLine", subs: ["mnSubBeds", "mnSubWardrobes", "mnSubNightstands"] },
  { word: "fuRoomDining", short: "mnSegDining", icon: "restaurant", photo: "room-dining", line: "mnRoomDiningLine", subs: ["mnSubDiningTables", "mnSubDiningChairs"] },
  { word: "fuRoomOffice", short: "mnSegOffice", icon: "computer", photo: "room-office", line: "mnRoomOfficeLine", subs: ["mnSubDesks", "mnSubOfficeChairs"] },
  { word: "fuRoomOutdoor", short: "mnSegOutdoor", icon: "yard", photo: "room-outdoor", line: "mnRoomOutdoorLine", subs: ["mnSubOutLounge", "mnSubOutDining"] },
] as const satisfies readonly { word: SectionWord; short: SectionWord; icon: string; photo: string; line: SectionWord; subs: readonly SectionWord[] }[];

/** A section's title with its line under it and a link in the accent. */
function head(ctx: SectionContext, title: SectionWord, line?: SectionWord, link?: { word: SectionWord; action: Action }): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(title),
    gap: 12,
    cross: "end",
    padding: sides(28, 16, 12, 16),
    children: [
      { id: id(), type: "column", width: "fill", gap: 2, children: [say(ctx, L, title, font(19, 800), { max_lines: 2 }), ...(line ? [say(ctx, L, line, font(12), { muted: true, max_lines: 2 })] : [])] },
      ...(link ? [{ ...say(ctx, L, link.word, font(12.5, 700), { accent: true, max_lines: 1 }), name: ctx.w(link.word), action: link.action }] : []),
    ],
  };
}

/** The room switcher pinned under the header: a soft track, five segments (icon over a short name), the first lit; each opens its room. */
function switcher(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("mnSwitcher"),
    pin: "top",
    gap: 4,
    padding: sides(5, 5, 5, 5),
    margin: sides(2, 12, 4, 12),
    radius: 18,
    background: L.tint.day,
    dark_background: L.tint.night,
    shadow: "light",
    children: ROOMS.map((r, i) => ({
      id: id(),
      type: "column" as const,
      name: ctx.w(r.word),
      width: "fill" as const,
      gap: 1,
      cross: "center" as const,
      radius: 13,
      padding: sides(7, 2, 6, 2),
      action: shop,
      ...(i === 0 ? { background: K.fill, dark_background: K.darkFill } : {}),
      children: [
        { id: id(), type: "icon" as const, icon: r.icon, icon_size: 20, color: i === 0 ? K.onFill : K.muted, dark_color: i === 0 ? K.darkOnFill : K.darkMuted },
        { id: id(), type: "text" as const, text: ctx.w(r.short), max_lines: 1, text_align: "center" as const, color: i === 0 ? K.onFill : K.muted, dark_color: i === 0 ? K.darkOnFill : K.darkMuted, font: font(10.5, 600) },
      ],
    })),
  };
}

/** One room's pane: its large photo (named like the room, opening it) with what it holds, its sub-categories as chips (each opening its own). */
function roomPane(ctx: SectionContext, r: (typeof ROOMS)[number]): StudioNode {
  const id = idOf(ctx);
  const url = kitPhoto(ctx, L, r.photo);
  return {
    id: id(),
    type: "column",
    name: ctx.w(r.short),
    title: ctx.w(r.short),
    gap: 0,
    radius: 26,
    background: K.surface,
    dark_background: K.darkSurface,
    children: [
      url
        ? { id: id(), type: "image", name: ctx.w(r.word), image_url: url, height: 220, radius: 26, fit: "cover", action: shop }
        : { id: id(), type: "row", height: 220, radius: 26, background: L.tint.day, dark_background: L.tint.night, children: [] },
      {
        id: id(),
        type: "column",
        gap: 3,
        padding: sides(14, 16, 16, 16),
        children: [
          { ...say(ctx, L, r.word, font(22, 800), { max_lines: 1 }), name: ctx.w(r.word), action: shop },
          say(ctx, L, r.line, font(12.5), { muted: true, max_lines: 2 }),
          {
            id: id(),
            type: "row",
            gap: 6,
            scroll: true,
            margin: sides(10, 0, 0, 0),
            children: r.subs.map((s) => ({
              id: id(),
              type: "row" as const,
              name: ctx.w(s),
              radius: 11,
              padding: sides(6, 12, 6, 12),
              border_color: K.line,
              dark_border_color: K.darkLine,
              border_width: 1,
              action: shop,
              children: [say(ctx, L, s, font(12, 600), { max_lines: 1 })],
            })),
          },
        ],
      },
    ],
  };
}

/** Every room, switched in place (Studio's tabs: the room's names as its segments). */
function rooms(ctx: SectionContext): StudioNode {
  return { id: idOf(ctx)(), type: "tabs", name: ctx.w("mnRooms"), gap: 12, padding: sides(10, 16, 0, 16), children: ROOMS.map((r) => roomPane(ctx, r)) };
}

const MATERIALS = [
  { word: "mnOak", line: "mnOakLine", from: "#CFA068", to: "#A87842" },
  { word: "mnWalnut", line: "mnWalnutLine", from: "#6E4832", to: "#45291A" },
  { word: "mnLinen", line: "mnLinenLine", from: "#EAE3D6", to: "#DCD2C1" },
  { word: "mnBoucle", line: "mnBoucleLine", from: "#FBF8F2", to: "#E3DACB" },
  { word: "mnVelvet", line: "mnVelvetLine", from: "#3F5B49", to: "#28402F" },
] as const satisfies readonly { word: SectionWord; line: SectionWord; from: string; to: string }[];

/** The material swatch strip: a soft square of each, its name and a word on it; samples on request (the shop). */
function materials(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("mnMaterials"),
    gap: 10,
    scroll: true,
    padding: sides(0, 16, 0, 16),
    children: MATERIALS.map((m) => ({
      id: id(),
      type: "column" as const,
      name: ctx.w(m.word),
      width: 88,
      gap: 3,
      action: shop,
      children: [
        { id: id(), type: "row" as const, width: 88, height: 88, radius: 20, gradient: { from: m.from, to: m.to, angle: 135 }, border_color: K.line, dark_border_color: K.darkLine, border_width: 1, children: [] },
        say(ctx, L, m.word, font(13, 700), { max_lines: 1, margin: sides(5, 0, 0, 0) }),
        say(ctx, L, m.line, font(11), { muted: true, max_lines: 1 }),
      ],
    })),
  };
}

/** Large horizontal cards: the piece's wide photo, its name, size and price, the installments tag. */
function wideCards(ctx: SectionContext, word: SectionWord, sort: "newest" | "price_desc", featured = false): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w(word),
    source: "products",
    layout: "carousel",
    gap: 12,
    padding: sides(0, 16, 0, 16),
    query: { limit: 6, category_id: null, featured, sort, ids: [] },
    card: {
      id: id(),
      type: "column",
      width: 296,
      gap: 0,
      radius: 22,
      background: K.surface,
      dark_background: K.darkSurface,
      border_color: K.line,
      dark_border_color: K.darkLine,
      border_width: 1,
      children: [
        {
          id: id(),
          type: "stack",
          width: 296,
          height: 172,
          children: [
            { id: id(), type: "image", bind: "image", width: 296, height: 172, radius: 22, fit: "cover", background: L.tint.day, dark_background: L.tint.night },
            { id: id(), type: "text", bind: "sale", font: font(11, 800), color: K.onFill, background: K.fill, dark_color: K.darkOnFill, dark_background: K.darkFill, radius: 9, padding: sides(3, 8, 3, 8), place: { x: 4, y: 6 } },
          ],
        },
        {
          id: id(),
          type: "row",
          gap: 10,
          cross: "center",
          padding: sides(12, 14, 14, 14),
          children: [
            {
              id: id(),
              type: "column",
              width: "fill",
              gap: 2,
              children: [
                { id: id(), type: "text", bind: "title", max_lines: 1, color: K.ink, dark_color: K.darkInk, font: font(15, 700) },
                { id: id(), type: "text", bind: "subtitle", max_lines: 1, color: K.muted, dark_color: K.darkMuted, font: font(11.5) },
              ],
            },
            {
              id: id(),
              type: "column",
              gap: 0,
              cross: "end",
              children: [
                { id: id(), type: "text", bind: "price", max_lines: 1, color: K.ink, dark_color: K.darkInk, font: font(15, 800) },
                { id: id(), type: "text", bind: "was_price", max_lines: 1, color: K.muted, dark_color: K.darkMuted, font: font(11) },
              ],
            },
          ],
        },
      ],
    },
  };
}

/** The pieces as long list cards: a photo at the side, the name, the size and the price. */
function listCards(ctx: SectionContext, word: SectionWord): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w(word),
    source: "products",
    layout: "list",
    gap: 10,
    padding: sides(0, 16, 0, 16),
    query: { limit: 4, category_id: null, featured: true, sort: "price_asc", ids: [] },
    card: {
      id: id(),
      type: "row",
      gap: 12,
      cross: "center",
      radius: 20,
      padding: sides(8, 8, 8, 8),
      background: K.surface,
      dark_background: K.darkSurface,
      border_color: K.line,
      dark_border_color: K.darkLine,
      border_width: 1,
      children: [
        { id: id(), type: "image", bind: "image", width: 124, height: 94, radius: 14, fit: "cover", background: L.tint.day, dark_background: L.tint.night },
        {
          id: id(),
          type: "column",
          width: "fill",
          gap: 2,
          children: [
            { id: id(), type: "text", bind: "title", max_lines: 2, color: K.ink, dark_color: K.darkInk, font: font(14, 700) },
            { id: id(), type: "text", bind: "subtitle", max_lines: 1, color: K.muted, dark_color: K.darkMuted, font: font(11.5) },
            { id: id(), type: "text", bind: "price", max_lines: 1, color: K.ink, dark_color: K.darkInk, font: font(15, 800), margin: sides(4, 0, 0, 0) },
          ],
        },
        { id: id(), type: "icon", icon: "add_circle", icon_size: 28, color: K.accent, dark_color: K.darkAccent },
      ],
    },
  };
}

/** From the order to the assembly: four steps on the navy card, then the shop's days to choose (kept for the checkout). */
function journey(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("mnJourney"),
    gap: 14,
    radius: 26,
    padding: sides(18, 16, 18, 16),
    margin: sides(0, 16, 0, 16),
    background: K.fill,
    dark_background: K.darkSurface,
    children: [
      { id: id(), type: "column", gap: 3, children: [say(ctx, L, "mnJourneyTitle", font(17, 800), { color: "#FFFFFF", dark_color: K.darkInk, max_lines: 2 }), say(ctx, L, "mnJourneyLine", font(12), { color: "#FFFFFF", dark_color: K.darkMuted, opacity: 0.86, max_lines: 2 })] },
      {
        id: id(),
        type: "timeline",
        name: ctx.w("mnJourney"),
        timeline: { style: "horizontal" },
        color: "#FFFFFF",
        dark_color: K.darkAccent,
        entries: (["mnStep1", "mnStep2", "mnStep3", "mnStep4"] as const).map((w, i): StudioEntry => sigEntry(ctx, { title: w, text: `${w}Text` as SectionWord }, i === 0 ? { highlight: true } : {})),
      },
      { id: id(), type: "row", height: 1, background: "#FFFFFF", dark_background: K.darkLine, opacity: 0.25, children: [] },
      say(ctx, L, "mnSlotsTitle", font(14, 700), { color: "#FFFFFF", dark_color: K.darkInk, max_lines: 2 }),
      { id: id(), type: "delivery_slots", name: ctx.w("mnSlotsTitle"), delivery_slots: { days: 5, assembly: true }, color: "#FFFFFF", dark_color: K.darkInk, border_color: K.darkAccent, dark_border_color: K.darkAccent },
    ],
  };
}

function home(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "fuWordmark", subtitle: "mnTagline" });
  return {
    header: { type: "title", ...t, buttons: ["menu", "search", "cart"], menu_page: MENU_PAGE, background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 100, 0),
      children: [
        switcher(ctx),
        rooms(ctx),
        head(ctx, "mnMaterials", "mnMaterialsLine"),
        materials(ctx),
        head(ctx, "mnWide", "mnWideLine", { word: "skSeeAll", action: shop }),
        wideCards(ctx, "mnWide", "newest"),
        head(ctx, "mnJourney"),
        journey(ctx),
        head(ctx, "mnLoved", "mnLovedLine", { word: "skSeeAll", action: shop }),
        listCards(ctx, "mnLoved"),
        head(ctx, "mnOutdoor", "mnOutdoorLine", { word: "skSeeAll", action: shop }),
        wideCards(ctx, "mnOutdoor", "price_desc", true),
      ],
    },
  };
}

// ——— The pages after the home ———

function over(screenName: string, ctx: SectionContext): StudioNode[] | null {
  const id = idOf(ctx);
  switch (screenName) {
    case "search":
      return [{ ...switcher(ctx), pin: "none", margin: sides(6, 12, 8, 12) }];
    case "cart":
      return [
        { id: id(), type: "coupon", name: ctx.w("skCoupon"), code: FURNITURE_D_CODE, coupon: { look: "glass", bind: "public" }, radius: 20, color: K.fill, margin: sides(10, 16, 4, 16) },
        {
          id: id(),
          type: "row",
          name: ctx.w("mnCartNote"),
          gap: 12,
          cross: "center",
          radius: 20,
          padding: sides(12, 14, 12, 14),
          margin: sides(8, 16, 4, 16),
          background: L.tint.day,
          dark_background: L.tint.night,
          children: [{ id: id(), type: "icon", icon: "build", icon_size: 22, color: K.accent, dark_color: K.darkAccent }, say(ctx, L, "mnCartNote", font(13, 600, { line_height: 1.4 }), { width: "fill", max_lines: 3 })],
        },
      ];
    case "orders":
      return [
        head(ctx, "skTrack"),
        {
          id: id(),
          type: "timeline",
          name: ctx.w("skTrack"),
          timeline: { style: "horizontal", source: "latest_order" },
          color: K.ink,
          dark_color: K.darkInk,
          background: K.surface,
          dark_background: K.darkSurface,
          radius: 22,
          padding: sides(16, 14, 16, 14),
          margin: sides(0, 16, 6, 16),
          entries: (["fuTrack1", "fuTrack2", "fuTrack3", "fuTrack4"] as const).map((w, i) => sigEntry(ctx, { title: w, text: `${w}Text` as SectionWord }, i === 0 ? { highlight: true } : {})),
        },
      ];
    default:
      return null;
  }
}

const FURNITURE_D_CODE = "RUKN10";

/** The category menu: the search, the room switcher, every room a row of its sub-categories' cards, then the account's ways in and the contact. */
function menuPage(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: "fuWordmark" });
  const way = (word: SectionWord, icon: string, action: Action): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(word),
    gap: 12,
    cross: "center",
    padding: sides(13, 4, 13, 4),
    action,
    children: [
      { id: id(), type: "row", width: 38, height: 38, radius: 12, align: "center", cross: "center", background: L.tint.day, dark_background: L.tint.night, children: [{ id: id(), type: "icon", icon, icon_size: 20, color: K.ink, dark_color: K.darkInk }] },
      say(ctx, L, word, font(14, 600), { width: "fill", max_lines: 1 }),
      { id: id(), type: "icon", icon: "chevron_right", icon_size: 20, color: K.muted, dark_color: K.darkMuted },
    ],
  });
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["cart"], background: K.page, dark_background: K.darkPage, color: K.ink, dark_color: K.darkInk, style: "search" },
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        { id: id(), type: "search", name: ctx.w("mnMenuSearch"), text: ctx.w("mnMenuSearch"), source: "products", radius: 14, height: 48, background: K.surface, dark_background: K.darkSurface, color: K.muted, dark_color: K.darkMuted, border_color: K.line, dark_border_color: K.darkLine, border_width: 1, margin: sides(4, 16, 8, 16) },
        { ...switcher(ctx), pin: "none" },
        { id: id(), type: "categories", name: ctx.w("skCategoryMenu"), source: "products", style: "rows", category_menu: { look: "lead", radius: 20 }, color: K.ink, dark_color: K.darkInk, padding: sides(10, 0, 6, 0) },
        {
          id: id(),
          type: "column",
          name: ctx.w("skMenuAccount"),
          gap: 0,
          radius: 22,
          padding: sides(4, 12, 4, 12),
          margin: sides(14, 16, 0, 16),
          background: K.surface,
          dark_background: K.darkSurface,
          children: [way("skAccount", "person", screen("account")), way("skOrders", "package_2", screen("orders")), way("mnWishlist", "favorite", screen("favorites")), way("skLanguage", "language", screen("settings")), way("skContact", "support_agent", screen("account"))],
        },
      ],
    },
  };
}

/** Five tabs: Home, the rooms (the shop), Cart, Orders, Account. */
export function manzilTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const out = structuredClone([...tabs]).map((t) => {
    const target = t.target.type === "screen" ? t.target.screen : null;
    if (t.id === "home") return { ...t, icon: "home" };
    if (target === "search") return { ...t, label: "Shop", icon: "category" };
    if (target === "cart") return { ...t, label: "Cart", icon: "shopping_bag" };
    if (target === "account") return { ...t, icon: "person" };
    return t;
  });
  const account = out.findIndex((t) => t.target.type === "screen" && t.target.screen === "account");
  const orders: LayoutTab = { id: "orders", label: "Orders", icon: "local_shipping", target: { type: "screen", screen: "orders" } };
  if (!out.some((t) => t.target.type === "screen" && t.target.screen === "orders")) out.splice(account < 0 ? out.length : account, 0, orders);
  return out;
}

const MANZIL_SCREENS = signatureScreens({
  style: "card",
  photo: "/furniture-photos/room-living.jpg",
  title: { en: "Room by room", ar: "غرفة غرفة", tr: "Oda oda" },
  subtitle: { en: "Sign in for your orders, your delivery day and your assembly.", ar: "سجّل الدخول لطلباتك وموعد التوصيل والتركيب.", tr: "Siparişleriniz, teslimat gününüz ve kurulumunuz için giriş yapın." },
  menu: "card",
  accent: K.fill,
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** Its own bar: a deep navy island across the foot, the open tab's name in ochre. */
const MANZIL_BAR = signatureBar(K, { design: "island", background: "#1F2A44", dark_background: "#0A0E16", active: "#E3B868", dark_active: "#E3B868", inactive: "#A9B0C2", dark_inactive: "#8F96A6", labels: "active", radius: 26, margin: 14 });

export const FURNITURE_D: SignatureDesign = {
  demo: "furniture",
  variant: "d",
  template: { id: "furniture_signature_d", icon: "home_work", fits: { types: ["store"], plain: true } },
  home,
  over,
  tabs: manzilTabs,
  pages: (ctx) => [{ slug: MENU_PAGE, title: "skCategoryMenu", studio: menuPage(ctx) }],
  bar: MANZIL_BAR,
  look: { header: { background: K.page, color: K.ink, dark_background: K.darkPage, dark_color: K.darkInk }, background: K.page, dark_background: K.darkPage },
  chrome: { header: "search", home: "glass", system: "glass" },
  isNew: true,
  project: {
    primary: K.fill,
    appearance: { secondary_color: K.accent, font: "DM Sans", font_family: "Noto Sans Arabic", arabic_font: "Noto Sans Arabic", dark_background: K.darkPage, dark_surface: K.darkSurface },
    screens: MANZIL_SCREENS,
  },
};
