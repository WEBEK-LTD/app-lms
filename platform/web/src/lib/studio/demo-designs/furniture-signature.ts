import type { Action, StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { idOf } from "./parts";
import { sides, signatureBar, signatureHeader, type SignatureInk } from "./food-signature-parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import {
  KIT_CUSTOM_PAGE,
  KIT_MENU_PAGE,
  face,
  kitCartTop,
  kitCategories,
  kitCustomCard,
  kitCustomPage,
  kitDeal,
  kitDeliverySlots,
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
  kitShopTheLook,
  kitShopTop,
  kitTabs,
  kitTiles,
  ownPage,
  say,
  shop,
  type KitLook,
} from "./shop-kit-parts";

/**
 * 210 Rukn (رُكن), the furniture house (lib/demo/kits/furniture.ts), in its
 * two Signature looks, each the whole app (its home, the category menu, the
 * made-to-measure request, the shop, the cart and the orders):
 *
 * - A · RUKN: modern white and wood. Warm linen by day, espresso walnut on
 *   the buttons; a deep brown night in sand. Almarai, soft round corners.
 *   The rooms as circles, the season's hero, the promises (free delivery and
 *   assembly, the warranty, the delivery date, installments coming soon),
 *   shop by room, new arrivals with their size in cm, a complete set to
 *   shop from its photo, the fabrics to choose before deciding (samples on
 *   request), the weekend's offers, the delivery and assembly booking, the
 *   most loved, the customers' words.
 * - B · KANAF: quiet luxury in deep green. Cool stone by day, a near-black
 *   green night in mint. IBM Plex Sans Arabic, tighter corners. The rooms
 *   as tiles, the season's hero, delivered within 48 hours, whole spaces,
 *   build your sofa piece by piece (the made-to-measure request), what
 *   customers love, the services (delivery on your date, free assembly, the
 *   ways to pay with installments coming soon, the warranty), inspiration
 *   from customers' homes, pieces worth their place, the rating and the
 *   showroom.
 *
 * Installments are only ever "coming soon": a tag, never a way to pay nor a
 * price a month. The lists, the categories, the sale, the delivery days and
 * the prices are the shop's own; the owner's words are in [brackets] (the
 * demo fills them, lib/studio/demo-templates.ts DEMO_FACTS).
 */

// ——— The two looks' colours and faces ———

/** A · RUKN: warm linen and espresso walnut by day; a deep brown night in sand. */
export const RUKN_INK: SignatureInk = {
  page: "#F5F1EA",
  darkPage: "#12100E",
  surface: "#FFFDF9",
  darkSurface: "#1C1916",
  ink: "#241D17",
  darkInk: "#F4EEE7",
  muted: "#62584E",
  darkMuted: "#C2B7AB",
  line: "#E6DDD1",
  darkLine: "#2E2823",
  accent: "#6A4834",
  darkAccent: "#E2C29F",
  fill: "#4A3326",
  darkFill: "#DDBB96",
  onFill: "#FFFFFF",
  darkOnFill: "#21170F",
};

/** B · KANAF: cool stone and deep green by day; a near-black green night in mint. */
export const KANAF_INK: SignatureInk = {
  page: "#F1F2EF",
  darkPage: "#0D1110",
  surface: "#FFFFFF",
  darkSurface: "#161B1A",
  ink: "#141816",
  darkInk: "#EBF0EE",
  muted: "#525A56",
  darkMuted: "#AEB7B3",
  line: "#E0E3DE",
  darkLine: "#242C2A",
  accent: "#1D5A50",
  darkAccent: "#96D4C4",
  fill: "#1D4842",
  darkFill: "#8DCBBB",
  onFill: "#FFFFFF",
  darkOnFill: "#0C221E",
};

const DIR = "furniture-photos";
const LOOK_A: KitLook = { k: RUKN_INK, tint: { day: "#ECE4D8", night: "#2A2520" }, family: "Almarai", look: "a", dir: DIR, radius: 18, heavy: 800 };
const LOOK_B: KitLook = { k: KANAF_INK, tint: { day: "#E6E9E4", night: "#1E2523" }, family: "IBM Plex Sans Arabic", look: "b", dir: DIR, radius: 14, heavy: 700 };

const ALL = { word: "skSeeAll" as SectionWord, action: shop };

/** The ways in the promises and the services: one tag, installments coming soon. */
const SOON: SectionWord = "installmentsSoon";

// ——— A · RUKN ———

/** The fabrics to touch before deciding: five swatches, samples sent free (asked for on the made-to-measure page). */
function swatches(ctx: SectionContext, l: KitLook): StudioNode {
  const id = idOf(ctx);
  const sw: readonly [string, SectionWord][] = [
    ["#EFE9DF", "fuSwatch1"],
    ["#D9C7A8", "fuSwatch2"],
    ["#6B7A4B", "fuSwatch3"],
    ["#2E3E5C", "fuSwatch4"],
    ["#7A4A33", "fuSwatch5"],
  ];
  return {
    id: id(),
    type: "column",
    name: ctx.w("fuFabricTitle"),
    gap: 14,
    radius: l.radius + 8,
    padding: sides(18, 16, 18, 16),
    margin: sides(22, 16, 4, 16),
    background: l.tint.day,
    dark_background: l.tint.night,
    children: [
      { id: id(), type: "column", gap: 5, children: [say(ctx, l, "fuFabricTitle", face(l, 19), { max_lines: 2 }), say(ctx, l, "fuFabricText", { size: 13, line_height: 1.45 }, { muted: true, max_lines: 3 })] },
      {
        id: id(),
        type: "row",
        gap: 8,
        children: sw.map(([colour, word]) => ({
          id: id(),
          type: "column" as const,
          name: ctx.w(word),
          width: "fill" as const,
          gap: 6,
          cross: "center" as const,
          children: [
            { id: id(), type: "row" as const, width: 54, height: 54, radius: 14, background: colour, dark_background: colour, border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1, children: [] },
            say(ctx, l, word, { size: 11 }, { muted: true, text_align: "center", max_lines: 2 }),
          ],
        })),
      },
      {
        id: id(),
        type: "row",
        gap: 10,
        cross: "center",
        children: [
          {
            id: id(),
            type: "button",
            name: ctx.w("fuFabricButton"),
            text: ctx.w("fuFabricButton"),
            icon: "arrow_forward",
            icon_position: "end",
            width: "hug",
            height: 44,
            radius: 22,
            padding: sides(0, 18, 0, 18),
            background: l.k.fill,
            dark_background: l.k.darkFill,
            color: l.k.onFill,
            dark_color: l.k.darkOnFill,
            font: { size: 13.5, weight: 700 },
            motion: { press: "shrink" },
            action: ownPage(ctx, KIT_CUSTOM_PAGE),
          },
          { id: id(), type: "row", width: "fill", gap: 5, cross: "center", align: "end", children: [{ id: id(), type: "icon", icon: "local_shipping", icon_size: 16, color: l.k.muted, dark_color: l.k.darkMuted }, say(ctx, l, "fuFabricTime", { size: 12 }, { muted: true, max_lines: 1 })] },
        ],
      },
    ],
  };
}

const ROOM_TILES = [
  { photo: "room-living", title: "fuRoomLiving" },
  { photo: "room-bedroom", title: "fuRoomBedroom" },
  { photo: "room-dining", title: "fuRoomDining" },
  { photo: "room-office", title: "fuRoomOffice" },
] as const satisfies readonly { photo: string; title: SectionWord }[];

const NAJD_SPOTS = [
  { x: 8, y: 50, label: "fuSpotSofa" },
  { x: 58, y: 26, label: "fuSpotArmchair" },
  { x: 40, y: 72, label: "fuSpotTable" },
] as const satisfies readonly { x: number; y: number; label: SectionWord }[];

const REVIEWS = [
  { quote: "fuReview1", name: "fuReviewName1", place: "fuReviewPlace1" },
  { quote: "fuReview2", name: "fuReviewName2", place: "fuReviewPlace2" },
  { quote: "fuReview3", name: "fuReviewName3", place: "fuReviewPlace3" },
] as const satisfies readonly { quote: SectionWord; name: SectionWord; place: SectionWord }[];

function ruknHome(ctx: SectionContext): StudioPage {
  const l = LOOK_A;
  return {
    header: kitHomeHeader(ctx, l, "fuWordmark", "fuLocation"),
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: idOf(ctx)(),
      type: "column",
      padding: sides(0, 0, 96, 0),
      children: [
        kitSearch(ctx, l, "fuSearch"),
        kitCategories(ctx, l, "circles"),
        kitHero(
          ctx,
          l,
          [
            { photo: "hero-living", kicker: "fuHeroKicker1", title: "fuHeroTitle1", line: "fuHeroLine1" },
            { photo: "hero-bedroom", kicker: "fuHeroKicker2", title: "fuHeroTitle2", line: "fuHeroLine2" },
            { photo: "hero-garden", kicker: "fuHeroKicker3", title: "fuHeroTitle3", line: "fuHeroLine3" },
          ],
          "fuHeroButton",
        ),
        kitPromises(ctx, l, [
          { icon: "local_shipping", title: "fuPromiseDelivery", line: "skPromiseDeliveryLine" },
          { icon: "verified", title: "fuPromiseWarranty", line: "skPromiseWarrantyLine" },
          { icon: "event_available", title: "skPromiseDate", line: "skPromiseDateLine", tag: SOON },
        ]),
        kitHead(ctx, l, "fuRooms", { word: "fuAllRooms", action: shop }, "fuRoomsLine"),
        kitTiles(ctx, l, ROOM_TILES, true),
        kitHead(ctx, l, "fuNew", ALL, "fuNewLine"),
        kitProducts(ctx, l, { word: "fuNew", size: [160, 180] }),
        ...kitShopTheLook(ctx, l, { photo: "set-najd", spots: NAJD_SPOTS, title: "fuSetsTitle", line: "fuSetsLine", name: "skLookName", height: 220 }),
        swatches(ctx, l),
        kitDeal(ctx, l, "fuWeekend", "carousel"),
        kitDeliverySlots(ctx, l, { title: "fuSlotsTitle", text: "fuSlotsText", assembly: true, dark: true }),
        kitHead(ctx, l, "fuLoved", ALL),
        kitProducts(ctx, l, { word: "fuLoved", sort: "popular", layout: "grid", limit: 4, size: [170, 190] }),
        kitHead(ctx, l, "fuReviewsTitle", null, "fuReviewsLine"),
        kitReviews(ctx, l, REVIEWS),
      ],
    },
  };
}

// ——— B · KANAF ———

/** Delivered within 48 hours: wide cards (the photo, the tag, the name and the price) of the pieces ready in the warehouse. */
function fastCards(ctx: SectionContext, l: KitLook): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "items",
    name: ctx.w("fuFast"),
    source: "products",
    layout: "carousel",
    gap: 10,
    padding: sides(0, 16, 0, 16),
    query: { limit: 6, category_id: null, featured: true, sort: "popular", ids: [] },
    card: {
      id: id(),
      type: "row",
      width: 260,
      height: 96,
      gap: 10,
      cross: "center",
      radius: l.radius + 2,
      padding: sides(8, 8, 8, 8),
      background: l.k.surface,
      dark_background: l.k.darkSurface,
      border_color: l.k.line,
      dark_border_color: l.k.darkLine,
      border_width: 1,
      children: [
        { id: id(), type: "image", bind: "image", width: 80, height: 80, radius: 12, fit: "cover", background: l.tint.day, dark_background: l.tint.night },
        {
          id: id(),
          type: "column",
          width: "fill",
          gap: 3,
          children: [
            { id: id(), type: "row", gap: 3, cross: "center", children: [{ id: id(), type: "icon", icon: "bolt", icon_size: 13, color: l.k.accent, dark_color: l.k.darkAccent }, say(ctx, l, "fuFastTag", { size: 10.5, weight: 600 }, { accent: true, max_lines: 1 })] },
            { id: id(), type: "text", bind: "title", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 13.5, weight: 700 } },
            { id: id(), type: "text", bind: "price", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 14, weight: 700 } },
          ],
        },
      ],
    },
  };
}

/** The services two by two: delivery on your date, free assembly, the ways to pay (installments coming soon), the warranty. */
function services(ctx: SectionContext, l: KitLook): StudioNode {
  const id = idOf(ctx);
  const items: readonly { icon: string; title: SectionWord; line: SectionWord; tag?: SectionWord }[] = [
    { icon: "calendar_month", title: "fuServiceDate", line: "fuServiceDateLine" },
    { icon: "settings", title: "fuServiceAssembly", line: "fuServiceAssemblyLine" },
    { icon: "payments", title: "fuServicePay", line: "fuServicePayLine", tag: SOON },
    { icon: "verified", title: "fuPromiseWarranty", line: "skPromiseWarrantyLine" },
  ];
  return {
    id: id(),
    type: "grid",
    name: ctx.w("fuServices"),
    columns: 2,
    gap: 10,
    padding: sides(22, 16, 4, 16),
    children: items.map((it) => ({
      id: id(),
      type: "column" as const,
      name: ctx.w(it.title),
      gap: 6,
      radius: l.radius + 4,
      padding: sides(14, 14, 14, 14),
      background: l.k.surface,
      dark_background: l.k.darkSurface,
      border_color: l.k.line,
      dark_border_color: l.k.darkLine,
      border_width: 1,
      children: [
        { id: id(), type: "row" as const, width: 40, height: 40, radius: 12, align: "center" as const, cross: "center" as const, background: l.tint.day, dark_background: l.tint.night, children: [{ id: id(), type: "icon" as const, icon: it.icon, icon_size: 21, color: l.k.accent, dark_color: l.k.darkAccent }] },
        say(ctx, l, it.title, { size: 13.5, weight: 700 }, { max_lines: 2, margin: sides(4, 0, 0, 0) }),
        say(ctx, l, it.line, { size: 11.5 }, { muted: true, max_lines: 2 }),
        ...(it.tag
          ? [
              {
                id: id(),
                type: "row" as const,
                name: ctx.w(it.tag),
                gap: 4,
                cross: "center" as const,
                self_align: "start" as const,
                radius: 10,
                padding: sides(3, 8, 3, 8),
                background: l.tint.day,
                dark_background: l.tint.night,
                children: [{ id: id(), type: "icon" as const, icon: "schedule", icon_size: 13, color: l.k.ink, dark_color: l.k.darkInk }, say(ctx, l, it.tag, { size: 10.5, weight: 600 }, { max_lines: 1 })],
              },
            ]
          : []),
      ],
    })),
  };
}

/** Inspiration from customers' homes: tall photo cards, each the room's name and what is in it, opening the shop. */
function inspiration(ctx: SectionContext, l: KitLook): StudioNode {
  const id = idOf(ctx);
  const cards: readonly [string, SectionWord, SectionWord][] = [
    ["bed-warm", "fuInspo1", "fuInspoLine1"],
    ["dining-classic", "fuInspo2", "fuInspoLine2"],
    ["out-lounge", "fuInspo3", "fuInspoLine3"],
  ];
  return {
    id: id(),
    type: "row",
    name: ctx.w("fuInspo"),
    gap: 10,
    scroll: true,
    padding: sides(0, 16, 4, 16),
    children: cards.map(([photo, title, line]) => ({
      id: id(),
      type: "photo_hero" as const,
      name: ctx.w(title),
      width: 170,
      image_url: kitPhoto(ctx, l, photo),
      height: 220,
      radius: l.radius + 4,
      background: l.k.darkPage,
      scrim: { color: "#000000", from: 0, middle: 0.12, at: 50, to: 0.72 },
      align: "end" as const,
      padding: sides(12, 12, 12, 12),
      action: shop,
      children: [say(ctx, l, title, face(l, 15), { color: "#FFFFFF", dark_color: "#FFFFFF", max_lines: 2 }), say(ctx, l, line, { size: 11 }, { color: "#FFFFFF", dark_color: "#FFFFFF", opacity: 0.88, max_lines: 1 })],
    })),
  };
}

/** The rating: its number, how many said so and one of them, its stars (the owner's words). */
function rating(ctx: SectionContext, l: KitLook): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("fuRatingTitle"),
    gap: 14,
    cross: "center",
    radius: l.radius + 4,
    padding: sides(16, 16, 16, 16),
    margin: sides(22, 16, 4, 16),
    background: l.tint.day,
    dark_background: l.tint.night,
    children: [
      say(ctx, l, "fuRatingValue", face(l, 34), { accent: true, max_lines: 1 }),
      {
        id: id(),
        type: "column",
        width: "fill",
        gap: 4,
        children: [
          say(ctx, l, "fuRatingTitle", { size: 14, weight: 700 }, { max_lines: 2 }),
          say(ctx, l, "fuRatingQuote", { size: 12, line_height: 1.4 }, { muted: true, max_lines: 3 }),
          { id: id(), type: "row", gap: 2, children: [1, 2, 3, 4, 5].map(() => ({ id: id(), type: "icon" as const, icon: "star", icon_size: 15, color: l.k.accent, dark_color: l.k.darkAccent })) },
        ],
      },
    ],
  };
}

/** The showroom: a map of where it is, its name and hours, and the way there. */
function showroom(ctx: SectionContext, l: KitLook): StudioNode {
  const id = idOf(ctx);
  const directions: Action = { type: "url", url: "https://www.google.com/maps/search/?api=1&query=24.8243,46.6400", open_in: "browser" };
  return {
    id: id(),
    type: "column",
    name: ctx.w("fuShowroom"),
    gap: 0,
    radius: l.radius + 6,
    margin: sides(14, 16, 4, 16),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    children: [
      { id: id(), type: "map", name: ctx.w("fuShowroom"), map: { lat: 24.8243, lng: 46.64, zoom: 14 }, height: 140 },
      {
        id: id(),
        type: "row",
        gap: 12,
        cross: "center",
        padding: sides(14, 16, 14, 16),
        children: [
          { id: id(), type: "column", width: "fill", gap: 3, children: [say(ctx, l, "fuShowroom", { size: 15, weight: 700 }, { max_lines: 2 }), say(ctx, l, "fuShowroomLine", { size: 12 }, { accent: true, max_lines: 1 })] },
          {
            id: id(),
            type: "button",
            name: ctx.w("fuDirections"),
            text: ctx.w("fuDirections"),
            icon: "directions",
            width: "hug",
            height: 42,
            radius: 12,
            padding: sides(0, 14, 0, 14),
            background: l.k.surface,
            dark_background: l.k.darkSurface,
            color: l.k.ink,
            dark_color: l.k.darkInk,
            border_color: l.k.line,
            dark_border_color: l.k.darkLine,
            border_width: 1,
            font: { size: 13, weight: 600 },
            action: directions,
          },
        ],
      },
    ],
  };
}

const SPACE_TILES = [
  { photo: "room-office", title: "fuRoomOffice", line: "fuSpaceOffice" },
  { photo: "room-bedroom", title: "fuRoomBedroom", line: "fuSpaceBedroom" },
  { photo: "room-dining", title: "fuRoomDining", line: "fuSpaceDining" },
  { photo: "room-outdoor", title: "fuRoomOutdoor", line: "fuSpaceOutdoor" },
] as const satisfies readonly { photo: string; title: SectionWord; line: SectionWord }[];

const SOFA_CARD = {
  title: "fuSofaTitle",
  text: "fuSofaText",
  options: [
    { icon: "straighten", title: "fuSofaStraight", line: "fuSofaStraightLine" },
    { icon: "category", title: "fuSofaArm", line: "fuSofaArmLine" },
    { icon: "dashboard", title: "fuSofaCorner", line: "fuSofaCornerLine" },
  ],
  time: "fuSofaTime",
  button: "fuSofaButton",
  photo: "sofa-grey",
} as const satisfies Parameters<typeof kitCustomCard>[2];

function kanafHome(ctx: SectionContext): StudioPage {
  const l = LOOK_B;
  return {
    header: kitHomeHeader(ctx, l, "fuWordmark", "fuLocationB"),
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: idOf(ctx)(),
      type: "column",
      padding: sides(0, 0, 96, 0),
      children: [
        { ...kitSearch(ctx, l, "fuSearchB"), radius: 14 },
        kitCategories(ctx, l, "chips"),
        kitHero(
          ctx,
          l,
          [
            { photo: "hero-garden", kicker: "fuHeroKicker3", title: "fuHeroTitle3", line: "fuHeroLine3" },
            { photo: "hero-living", kicker: "fuHeroKicker1", title: "fuHeroTitle1", line: "fuHeroLine1" },
            { photo: "hero-bedroom", kicker: "fuHeroKicker2", title: "fuHeroTitle2", line: "fuHeroLine2" },
          ],
          "fuHeroButton",
          226,
        ),
        kitHead(ctx, l, "fuFast", ALL, undefined, "fuFastKicker"),
        fastCards(ctx, l),
        kitHead(ctx, l, "fuSpaces", { word: "fuAllRooms", action: shop }, undefined, "fuSpacesKicker"),
        kitTiles(ctx, l, SPACE_TILES),
        kitCustomCard(ctx, l, SOFA_CARD),
        kitHead(ctx, l, "fuLove", ALL, undefined, "fuLoveKicker"),
        kitProducts(ctx, l, { word: "fuLove", sort: "popular", size: [170, 170] }),
        services(ctx, l),
        // The delivery and assembly booking: the shop's next days and times, kept for the checkout.
        kitDeliverySlots(ctx, l, { title: "fuSlotsTitle", text: "fuSlotsText", assembly: true }),
        kitHead(ctx, l, "fuInspo", ALL, undefined, "fuInspoKicker"),
        inspiration(ctx, l),
        kitHead(ctx, l, "fuPieces", ALL, undefined, "fuPiecesKicker"),
        kitProducts(ctx, l, { word: "fuPieces", featured: true, layout: "grid", limit: 4, size: [170, 180] }),
        rating(ctx, l),
        showroom(ctx, l),
      ],
    },
  };
}

// ——— Over the shop, the cart and the orders; the category menu and the made-to-measure request ———

function over(l: KitLook) {
  return (screenName: string, ctx: SectionContext): StudioNode[] | null => {
    switch (screenName) {
      case "search":
        return kitShopTop(ctx, l, { photo: l.look === "a" ? "hero-living" : "hero-garden", kicker: "fuShopKicker", title: "fuShopTitle" });
      case "cart":
        return kitCartTop(ctx, l, FURNITURE_COUPON_CODE, { icon: "event_available", word: "fuCartNote" });
      case "orders":
        return kitOrdersTop(ctx, l, [
          { title: "fuTrack1", text: "fuTrack1Text" },
          { title: "fuTrack2", text: "fuTrack2Text" },
          { title: "fuTrack3", text: "fuTrack3Text" },
          { title: "fuTrack4", text: "fuTrack4Text" },
        ]);
      default:
        return null;
    }
  };
}

/** The demo's code shown in the app (lib/demo/kits/furniture.ts makes it). */
export const FURNITURE_COUPON_CODE = "RUKN10";

/** The made-to-measure request's fields (the owner's to change): the piece, its size W × D × H, the material or fabric, the colour, the details, the name and phone. */
const CUSTOM_FIELDS: Parameters<typeof kitCustomPage>[2]["form"]["fields"] = [
  { kind: "text", label: "fuFieldPiece", required: true },
  { kind: "text", label: "fuFieldSize", required: true },
  { kind: "choice", label: "fuFieldMaterial", options: ["fuSwatch1", "fuSwatch2", "fuMaterialVelvet", "fuSwatch5", "fuMaterialWood"] },
  { kind: "text", label: "skFieldColour" },
  { kind: "long_text", label: "fuFieldDetails", required: true },
  { kind: "text", label: "skFieldName", required: true },
  { kind: "phone", label: "skFieldPhone", required: true },
];

function customPage(ctx: SectionContext, l: KitLook): StudioPage {
  return kitCustomPage(ctx, l, {
    title: "fuCustomTitle",
    intro: "fuCustomIntro",
    steps: [
      { title: "fuStep1", text: "fuStep1Text" },
      { title: "fuStep2", text: "fuStep2Text" },
      { title: "fuStep3", text: "fuStep3Text" },
      { title: "fuStep4", text: "fuStep4Text" },
    ],
    form: { fields: CUSTOM_FIELDS, submit: "fuCustomSend", success: "fuCustomSent" },
  });
}

function menuPage(ctx: SectionContext, l: KitLook): StudioPage {
  return kitMenuPage(ctx, l, {
    wordmark: "fuWordmark",
    search: "fuMenuSearch",
    quick: [
      { word: "fuOffers", icon: "local_offer" },
      { word: "fuNewQuick", icon: "new_releases" },
      { word: "fuSetsQuick", icon: "category" },
    ],
    contactLine: "fuContactLine",
  });
}

const pages = (l: KitLook) => (ctx: SectionContext) => [
  { slug: KIT_MENU_PAGE, title: "skCategoryMenu" as SectionWord, studio: menuPage(ctx, l) },
  { slug: KIT_CUSTOM_PAGE, title: "fuCustomTitle" as SectionWord, studio: customPage(ctx, l) },
];

// ——— The sign-in screens, the bars and the two looks ———

const P = (name: string) => `/${DIR}/${name}.jpg`;

const RUKN_SCREENS = signatureScreens({
  style: "photo",
  photo: P("bed-warm"),
  title: { en: "Welcome home", ar: "أهلًا بك في بيتك", tr: "Evinize hoş geldiniz" },
  subtitle: { en: "Sign in to follow your orders and your delivery day.", ar: "سجّل الدخول لتتابع طلباتك وموعد توصيلها.", tr: "Siparişlerinizi ve teslimat gününüzü takip etmek için giriş yapın." },
  menu: "cover",
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

const KANAF_SCREENS = signatureScreens({
  style: "photo",
  photo: P("out-rattan2"),
  title: { en: "Spaces made to last", ar: "مساحات صُنعت لتدوم", tr: "Uzun ömürlü mekânlar" },
  subtitle: { en: "Sign in for your orders, your delivery date and your designs.", ar: "سجّل الدخول لطلباتك وموعد التوصيل وتصاميمك.", tr: "Siparişleriniz, teslimat tarihiniz ve tasarımlarınız için giriş yapın." },
  menu: "night",
  accent: KANAF_INK.fill,
  first: ["orders", "notifications", "settings", "help", "privacy", "terms"],
});

/** A's floating bar: espresso by day and by night, the open tab in cream. */
const RUKN_BAR = signatureBar(RUKN_INK, { design: "float", background: "#3A2A20", dark_background: "#241F1B", active: "#FFFFFF", dark_active: "#F4EEE7", inactive: "#B9AC9F", dark_inactive: "#9A8F83", labels: "active", radius: 30, margin: 12 });
/** B's floating bar: white by day, deep green-black by night, the open tab green. */
const KANAF_BAR = signatureBar(KANAF_INK, { design: "float", background: "#FFFFFF", dark_background: "#1A201E", active: KANAF_INK.fill, dark_active: KANAF_INK.darkFill, inactive: "#7E8581", dark_inactive: "#828C88", labels: "active", radius: 24, margin: 12 });

export const FURNITURE_A: SignatureDesign = {
  demo: "furniture",
  variant: "a",
  template: { id: "furniture_signature_a", icon: "chair", fits: { types: ["store"], plain: true } },
  home: ruknHome,
  over: over(LOOK_A),
  tabs: kitTabs,
  pages: pages(LOOK_A),
  bar: RUKN_BAR,
  look: { header: signatureHeader(RUKN_INK, "glass"), background: RUKN_INK.page, dark_background: RUKN_INK.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    // Look A is the demo: its main colour the demo's (lib/demo/content.ts).
    appearance: { secondary_color: "#6A4834", font: "DM Sans", font_family: LOOK_A.family, dark_background: RUKN_INK.darkPage, dark_surface: RUKN_INK.darkSurface },
    screens: RUKN_SCREENS,
  },
};

export const FURNITURE_B: SignatureDesign = {
  demo: "furniture",
  variant: "b",
  template: { id: "furniture_signature_b", icon: "living", fits: { types: ["store"], plain: true } },
  home: kanafHome,
  over: over(LOOK_B),
  tabs: kitTabs,
  pages: pages(LOOK_B),
  bar: KANAF_BAR,
  look: { header: signatureHeader(KANAF_INK, "glass"), background: KANAF_INK.page, dark_background: KANAF_INK.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    primary: KANAF_INK.fill,
    appearance: { secondary_color: "#141816", font: "Outfit", font_family: LOOK_B.family, dark_background: KANAF_INK.darkPage, dark_surface: KANAF_INK.darkSurface },
    screens: KANAF_SCREENS,
  },
};

// ——— Rukn's own parts as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;

const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};

export const FURNITURE_SECTIONS: readonly SectionInfo[] = [
  // Choose the fabric before you decide: five swatches, the samples asked for on the made-to-measure request (on its own, the shop).
  { id: "fu_fabric_swatches", icon: "format_paint", isNew: true, fits: STORE_PLAIN, make: one((ctx) => swatches({ ...ctx, ownPages: false }, LOOK_A)) },
  // Build your sofa piece by piece: the made-to-measure card in KANAF's green.
  { id: "fu_build_sofa", icon: "living", isNew: true, fits: STORE_PLAIN, make: one((ctx) => kitCustomCard({ ...ctx, ownPages: false }, LOOK_B, SOFA_CARD)) },
  // Delivered within 48 hours: wide cards of the pieces ready to go.
  { id: "fu_fast_delivery", icon: "bolt", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [kitHead(ctx, LOOK_B, "fuFast", ALL, undefined, "fuFastKicker"), fastCards(ctx, LOOK_B)]) },
  // The services two by two, the ways to pay with installments coming soon.
  { id: "fu_services", icon: "verified", isNew: true, fits: STORE_PLAIN, make: one((ctx) => services(ctx, LOOK_B)) },
  // Inspiration from customers' homes.
  { id: "fu_inspiration", icon: "photo_camera", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [kitHead(ctx, LOOK_B, "fuInspo", ALL, undefined, "fuInspoKicker"), inspiration(ctx, LOOK_B)]) },
  // The rating and the showroom.
  { id: "fu_showroom", icon: "storefront", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [rating(ctx, LOOK_B), showroom(ctx, LOOK_B)]) },
];
