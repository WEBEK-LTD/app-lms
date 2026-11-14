import type { Action, LayoutTab, StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { inked, sides, sigPhoto, signatureBar, signatureHeader, signatureScreens, surfaceDisc, type SignatureDesign, type SignatureInk } from "./signature";

/**
 * 130.5–130.6 Sahm Express's Signature looks (the owner approved both on
 * 13 November 2026, boards R2-Sahm-A and R2-Sahm-B), each a whole courier
 * project: its tabs (Home, Send, My shipments, Account), every page after
 * the home in the look.
 *
 * A · Waybill: the city's name set large over a fine blueprint grid, the
 * send form as a waybill (a ticket perforated across: the pickup and where
 * to, then the services with their times and prices, then "Send a parcel
 * from EGP 40"), the person's shipment on its way as a dark card with the
 * courier's photo, its reference, the minutes large and its four stages
 * named on a line (`tracking` `steps`, the person's own); a frosted bar.
 *
 * Every part an ordinary Studio element; the services, their times and
 * prices are the demo's own (lib/demo/content.ts DEMO_DELIVERY_SERVICES,
 * DELIVERY_DEMO_SETTINGS: from EGP 40), the photos Yallapp's
 * (public/stories/delivery).
 */

const send: Action = screen("send_parcel");

// ——— A · Waybill ———

export const SAHM_A_INK: SignatureInk = {
  page: "#F1F4F8",
  darkPage: "#070D16",
  surface: "#FFFFFF",
  darkSurface: "#0F1A28",
  ink: "#0D1B2A",
  darkInk: "#EAF1F8",
  muted: "#526070",
  darkMuted: "#9FB0C2",
  line: "#DCE3EC",
  darkLine: "#1E2D40",
  accent: "#1F6FB2",
  darkAccent: "#6DB3F2",
  fill: "#1F6FB2",
  darkFill: "#F2B544",
  onFill: "#FFFFFF",
  darkOnFill: "#0D1B2A",
};
const A = SAHM_A_INK;
const SIGNAL = "#E79B12";
const GOLD = "#F2B544";
const MONO = "JetBrains Mono";

/** The name with its gold full stop, and the bell. */
function wordmark(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("brandName"),
    gap: 2,
    cross: "center",
    padding: sides(18, 16, 0, 16),
    children: [
      inked(ctx, A, ctx.w("brandName"), { size: 22, weight: 800, letter_spacing: -0.9 }, { max_lines: 1 }),
      { id: id(), type: "text", text: ".", width: "fill", color: SIGNAL, dark_color: GOLD, font: { size: 22, weight: 800 } },
      surfaceDisc(ctx, A, "notifications", screen("notifications")),
    ],
  };
}

/** One end of the way: its dot, its label in mono, the place, a button at its end. */
function wayEnd(ctx: SectionContext, icon: string, color: [string, string], label: SectionWord, place: SectionWord, end: string, quiet: boolean): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(label),
    gap: 12,
    cross: "center",
    action: send,
    children: [
      { id: id(), type: "icon", icon, icon_size: 22, color: color[0], dark_color: color[1] },
      {
        id: id(),
        type: "column",
        width: "fill",
        gap: 2,
        children: [
          inked(ctx, A, ctx.w(label), { family: MONO, size: 11, weight: 700, letter_spacing: 2, uppercase: true }, { muted: true }),
          inked(ctx, A, ctx.w(place), { size: 19, weight: 800, letter_spacing: -0.4 }, quiet ? { muted: true, max_lines: 1 } : { max_lines: 1 }),
        ],
      },
      { id: id(), type: "icon", icon: end, icon_size: 22, color: A.muted, dark_color: A.darkMuted },
    ],
  };
}

/** A service as a tile: its name, its time large and its price beside it; the first one chosen. */
function serviceTile(ctx: SectionContext, name: SectionWord, time: SectionWord, price: SectionWord, chosen: boolean): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w(name),
    width: "fill",
    gap: 6,
    radius: 18,
    padding: sides(12, 8, 12, 10),
    background: chosen ? "#EAF2FB" : A.surface,
    dark_background: chosen ? "#132A44" : A.darkSurface,
    border_color: chosen ? A.accent : A.line,
    dark_border_color: chosen ? A.darkAccent : A.darkLine,
    border_width: chosen ? 2 : 1,
    action: send,
    children: [
      inked(ctx, A, ctx.w(name), { size: 12.5, weight: 700, letter_spacing: -0.2 }, { max_lines: 1 }),
      inked(ctx, A, ctx.w(time), { size: 22, weight: 800, letter_spacing: -0.6, line_height: 1 }),
      inked(ctx, A, ctx.w(price), { size: 11, weight: 600 }, { muted: true, max_lines: 1 }),
    ],
  };
}

/** The send form as a waybill: the pickup and where to, perforated, then the services and the button with the lowest price. */
function waybill(ctx: SectionContext, margin = sides(18, 16, 0, 16)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("deliverySend"),
    radius: 28,
    gap: 0,
    background: A.surface,
    dark_background: A.darkSurface,
    border_color: A.line,
    dark_border_color: A.darkLine,
    border_width: 1,
    shadow: "strong",
    surface: { ticket: { at: 47, axis: "horizontal", notch: 12 }, soft: 3 },
    padding: sides(20, 16, 16, 16),
    margin,
    children: [
      wayEnd(ctx, "radio_button_checked", [A.accent, A.darkAccent], "sahPickupLabel", "deliveryFrom", "my_location", false),
      { id: id(), type: "spacer", height: 20 },
      wayEnd(ctx, "location_on", [SIGNAL, GOLD], "sahDropLabel", "deliveryWhereTo", "link", true),
      { id: id(), type: "spacer", height: 44 },
      {
        id: id(),
        type: "row",
        name: ctx.w("deliverySameDay"),
        gap: 8,
        children: [
          serviceTile(ctx, "deliverySameDay", "sahSameDayTime", "sahSameDayPrice", true),
          serviceTile(ctx, "deliveryExpress", "sahExpressTime", "sahExpressPrice", false),
          serviceTile(ctx, "sahDocuments", "sahDocumentsTime", "sahDocumentsPrice", false),
        ],
      },
      {
        id: id(),
        type: "button",
        text: ctx.w("sahSendFrom"),
        icon: "send",
        width: "fill",
        height: 52,
        radius: 16,
        background: A.fill,
        dark_background: A.darkFill,
        color: A.onFill,
        dark_color: A.darkOnFill,
        shadow: "medium",
        font: { size: 16, weight: 800 },
        margin: sides(14, 0, 0, 0),
        action: send,
      },
    ],
  };
}

/** The person's shipment on its way as a dark card: the courier's photo, the reference, the minutes and the four stages named on a line. */
export function sahmAShipment(ctx: SectionContext, margin = sides(14, 16, 0, 16)): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "tracking",
    name: ctx.w("sahOnTheWay"),
    tracking: { kind: "shipment", style: "steps", accent: GOLD, dark_accent: GOLD },
    image_url: sigPhoto(ctx, "/stories/delivery/delivery-rider.jpg"),
    visibility: "signed_in",
    width: "fill",
    radius: 26,
    background: "#0D1B2A",
    dark_background: "#13263C",
    color: "#FFFFFF",
    shadow: "strong",
    surface: { pattern: "dots", pattern_strength: 0.06 },
    padding: sides(16, 16, 14, 16),
    margin,
  };
}

/** The approved home: the name, the city large, the waybill, the shipment on its way. */
export function sahmAHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const display = { size: 46, weight: 800 as const, line_height: 0.98, letter_spacing: -2.2 };
  return {
    background: A.page,
    dark_background: A.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 24, 0),
      children: [
        {
          id: id(),
          type: "column",
          name: ctx.w("sahHead1"),
          // The blueprint's fine grid under the name and the headline.
          surface: { pattern: "grid", pattern_strength: 0.06 },
          padding: sides(0, 0, 4, 0),
          children: [
            wordmark(ctx),
            {
              id: id(),
              type: "column",
              padding: sides(18, 16, 0, 16),
              children: [inked(ctx, A, ctx.w("sahHead1"), display), inked(ctx, A, ctx.w("sahHead2"), display, { accent: true })],
            },
          ],
        },
        waybill(ctx),
        sahmAShipment(ctx),
      ],
    },
  };
}

/** Over sending and the shipments, the one on its way (nothing without one). */
export function sahmAPage(screenName: string, ctx: SectionContext): StudioNode[] | null {
  switch (screenName) {
    case "send_parcel":
    case "shipments":
      return [sahmAShipment(ctx, sides(10, 16, 6, 16))];
    default:
      return null;
  }
}

/** The kind's tabs with the boards' icons: Home, Send, My shipments, Account. */
function sahmTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  return structuredClone([...tabs]).map((t) => {
    const s = t.target.type === "screen" ? t.target.screen : null;
    return s === "send_parcel" ? { ...t, icon: "send" } : s === "shipments" ? { ...t, icon: "package_2" } : s === "account" ? { ...t, icon: "person" } : t;
  });
}

const SAHM_SIGN_IN = {
  title: { en: "Your parcel, across town today", ar: "طردك يصل عبر المدينة اليوم", tr: "Paketiniz bugün şehrin öbür ucunda" },
  subtitle: {
    en: "Sign in to send your parcels and follow them.",
    ar: "سجّل الدخول لترسل طرودك وتتابعها.",
    tr: "Paketlerinizi göndermek ve takip etmek için giriş yapın.",
  },
};

const SAHM_A_SCREENS = signatureScreens({
  style: "card",
  photo: "/stories/delivery/delivery-handover.jpg",
  ...SAHM_SIGN_IN,
  menu: "tiles",
  first: ["shipments", "notifications", "settings", "help", "privacy", "terms"],
});

const SAHM_A_BAR = signatureBar(A, { design: "glass", labels: "always", radius: 26, margin: 12 });

export const SAHM_A: SignatureDesign = {
  demo: "delivery",
  variant: "a",
  name: "sigSahmA",
  template: { id: "delivery_signature_a", icon: "receipt_long", fits: { types: ["delivery"] } },
  home: sahmAHome,
  over: sahmAPage,
  tabs: sahmTabs,
  bar: SAHM_A_BAR,
  look: { header: signatureHeader(A, "brand"), background: A.page, dark_background: A.darkPage },
  chrome: { header: "brand", screens: "brand" },
  project: {
    primary: A.fill,
    tab_bar: SAHM_A_BAR,
    appearance: { secondary_color: GOLD, font: "Plus Jakarta Sans" },
    tabs: (tabs) => sahmTabs(tabs),
    screens: SAHM_A_SCREENS,
  },
};


// ——— B · Live route ———

/**
 * B · Live route (board R2-Sahm-B): the city as a living map full-bleed,
 * the person's shipment drawn on it (`map_drawing.route` `live`: done
 * solid to the courier's photo, dashed to the drop-off, the pickup's
 * street on a chip, the courier's minutes in a bubble), the name on a
 * frosted chip and the location and bell over it; a sheet hanging over
 * the map's foot with the shipment's reference, the minutes large and its
 * stages as segments (`tracking` `hero`), a dark command to send a parcel
 * from the street with its lowest price, and the services as photo tiles
 * with their times and prices; a dark floating pill, gold by night.
 */
export const SAHM_B_INK: SignatureInk = {
  page: "#F7F9FC",
  darkPage: "#08111C",
  surface: "#FFFFFF",
  darkSurface: "#15243A",
  ink: "#0D1B2A",
  darkInk: "#EAF1F8",
  muted: "#526070",
  darkMuted: "#9FB0C2",
  line: "#C3CDD8",
  darkLine: "#2C3D52",
  accent: "#1F6FB2",
  darkAccent: "#6DB3F2",
  fill: "#F2B544",
  darkFill: "#F2B544",
  onFill: "#0D1B2A",
  darkOnFill: "#0D1B2A",
};
const B = SAHM_B_INK;
const OUTFIT = "Outfit";

/** A frosted chip or round button over the map. */
function mapChip(ctx: SectionContext, child: StudioNode, extra: Partial<StudioNode>): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "row",
    height: 44,
    cross: "center",
    align: "center",
    background: B.surface,
    dark_background: "#0C1623",
    border_color: "#FFFFFF",
    dark_border_color: "#22334A",
    border_width: 1,
    shadow: "medium",
    surface: { glass: 14, tint: 0.78 },
    ...extra,
    children: [child],
  };
}

/** The person's shipment on its way in the sheet: its reference and state, the courier and the minutes, its stages as segments. */
export function sahmBShipment(ctx: SectionContext, margin = sides(0, 0, 0, 0)): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "tracking",
    name: ctx.w("sahOnTheWay"),
    tracking: { kind: "shipment", style: "hero", accent: B.accent, dark_accent: B.darkAccent },
    visibility: "signed_in",
    width: "fill",
    color: B.ink,
    dark_color: B.darkInk,
    margin,
  };
}

/** A service as a photo tile: its time large and its name over a shade, its price on a gold chip. */
function servicePhoto(ctx: SectionContext, path: string, time: SectionWord, name: SectionWord, price: SectionWord | null): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "photo_hero",
    name: ctx.w(name),
    image_url: sigPhoto(ctx, path),
    width: "fill",
    height: 96,
    radius: 22,
    background: "#0D1B2A",
    scrim: { color: "#000000", from: 0.05, middle: 0.2, at: 40, to: 0.8 },
    align: "between",
    padding: sides(8, 8, 10, 10),
    action: send,
    children: [
      price
        ? { id: id(), type: "text", text: ctx.w(price), self_align: "end", color: "#0D1B2A", background: GOLD, radius: 12, padding: sides(3, 8, 3, 8), font: { size: 11, weight: 800 } }
        : { id: id(), type: "spacer", height: 18 },
      {
        id: id(),
        type: "column",
        children: [
          { id: id(), type: "text", text: ctx.w(time), color: "#FFFFFF", font: { family: OUTFIT, size: 20, weight: 700, line_height: 1 } },
          { id: id(), type: "text", text: ctx.w(name), color: "#FFFFFF", max_lines: 1, font: { size: 12, weight: 700 } },
        ],
      },
    ],
  };
}

/** The dark command to send a parcel: a gold tile with the arrow, the street it leaves from, the lowest price. */
function sendCommand(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("deliverySend"),
    gap: 12,
    cross: "center",
    radius: 26,
    background: "#0D1B2A",
    dark_background: GOLD,
    shadow: "strong",
    padding: sides(8, 16, 8, 8),
    margin: sides(14, 0, 0, 0),
    action: send,
    children: [
      {
        id: id(),
        type: "row",
        width: 48,
        height: 48,
        radius: 16,
        align: "center",
        cross: "center",
        background: GOLD,
        dark_background: "#0D1B2A",
        children: [{ id: id(), type: "icon", icon: "send", icon_size: 22, color: "#0D1B2A", dark_color: GOLD }],
      },
      {
        id: id(),
        type: "column",
        width: "fill",
        children: [
          { id: id(), type: "text", text: ctx.w("deliverySend"), color: "#FFFFFF", dark_color: "#0D1B2A", font: { family: OUTFIT, size: 17, weight: 700 } },
          { id: id(), type: "text", text: ctx.w("sahFromStreet"), color: "#B9C6D4", dark_color: "#4A3A12", max_lines: 1, font: { size: 12 } },
        ],
      },
      { id: id(), type: "text", text: ctx.w("sahFrom40"), color: "#FFFFFF", dark_color: "#0D1B2A", font: { family: MONO, size: 12, weight: 700 } },
    ],
  };
}

/** The sheet over the map's foot: the shipment, the command, the services. */
function sheet(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("deliverySend"),
    width: "fill",
    corners: { top_start: 28, top_end: 28, bottom_end: 0, bottom_start: 0 },
    background: B.page,
    dark_background: B.darkPage,
    shadow: "strong",
    padding: sides(12, 16, 8, 16),
    children: [
      { id: id(), type: "row", width: 40, height: 4, radius: 2, self_align: "center", background: B.line, dark_background: B.darkLine, margin: sides(0, 0, 12, 0), children: [] },
      sahmBShipment(ctx),
      sendCommand(ctx),
      {
        id: id(),
        type: "row",
        name: ctx.w("deliverySameDay"),
        gap: 8,
        margin: sides(12, 0, 0, 0),
        children: [
          servicePhoto(ctx, "/stories/delivery/delivery-boxes.jpg", "sahSameDayTime", "deliverySameDay", null),
          servicePhoto(ctx, "/stories/delivery/delivery-rider.jpg", "sahExpressTime", "deliveryExpress", "sahExpressPrice"),
          servicePhoto(ctx, "/stories/delivery/delivery-handover.jpg", "sahDocumentsTime", "sahDocuments", "sahDocumentsPrice"),
        ],
      },
    ],
  };
}

/** The living map with the shipment's route, the chips over it, the sheet over its foot. */
function routeMap(ctx: SectionContext): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "map_header",
    name: ctx.w("sahOnTheWay"),
    height: 470,
    background: "#E8EDF2",
    dark_background: "#0C1623",
    padding: sides(18, 16, 16, 16),
    align: "start",
    overlap: 28,
    image_url: sigPhoto(ctx, "/stories/delivery/delivery-rider.jpg"),
    map_drawing: {
      style: "natural",
      accent: GOLD,
      chip: "#0D1B2A",
      route: {
        points: [
          { x: 78, y: 26 },
          { x: 78, y: 62 },
          { x: 30, y: 62 },
        ],
        at: 48,
        eta: ctx.w("sahEta"),
        icon: "two_wheeler",
        color: B.accent,
        dark_color: B.darkAccent,
        live: "shipment",
      },
    },
    children: [
      {
        id: id(),
        type: "row",
        gap: 8,
        cross: "center",
        children: [
          mapChip(ctx, inked(ctx, B, ctx.w("brandName"), { size: 18, weight: 800, letter_spacing: -0.6 }, { max_lines: 1 }), { radius: 22, padding: sides(0, 16, 0, 16) }),
          { id: id(), type: "spacer", width: "fill", height: 1 },
          mapChip(ctx, { id: id(), type: "icon", icon: "notifications", icon_size: 22, color: B.ink, dark_color: B.darkInk }, { width: 44, radius: 22, action: screen("notifications") }),
        ],
      },
      sheet(ctx),
    ],
  };
}

/** The approved home: the living map with the shipment's route and the sheet over its foot. */
export function sahmBHome(ctx: SectionContext): StudioPage {
  return {
    background: B.page,
    dark_background: B.darkPage,
    body: { id: idOf(ctx)(), type: "column", padding: sides(0, 0, 24, 0), children: [routeMap(ctx)] },
  };
}

/** Over sending, the dark command's services; over the shipments, the one on its way in the sheet's look. */
export function sahmBPage(screenName: string, ctx: SectionContext): StudioNode[] | null {
  switch (screenName) {
    case "send_parcel":
    case "shipments":
      return [{ ...sahmBShipment(ctx, sides(10, 16, 6, 16)), background: B.surface, dark_background: B.darkSurface, radius: 22, padding: sides(14, 16, 12, 16) }];
    default:
      return null;
  }
}

const SAHM_B_SCREENS = signatureScreens({
  style: "photo",
  photo: "/stories/delivery/delivery-rider.jpg",
  ...SAHM_SIGN_IN,
  menu: "night",
  accent: GOLD,
  first: ["shipments", "notifications", "settings", "help", "privacy", "terms"],
});

const SAHM_B_BAR = signatureBar(B, { design: "float", background: "#0D1B2A", dark_background: "#15243A", active: GOLD, dark_active: GOLD, inactive: "#C9D4E0", dark_inactive: "#C2CFDD", labels: "active", radius: 30, margin: 14 });

export const SAHM_B: SignatureDesign = {
  demo: "delivery",
  variant: "b",
  name: "sigSahmB",
  template: { id: "delivery_signature_b", icon: "route", fits: { types: ["delivery"] } },
  home: sahmBHome,
  over: sahmBPage,
  tabs: sahmTabs,
  bar: SAHM_B_BAR,
  look: { header: signatureHeader(B, "glass"), background: B.page, dark_background: B.darkPage },
  chrome: { header: "glass", screens: "photo" },
  project: {
    primary: B.accent,
    tab_bar: SAHM_B_BAR,
    appearance: { secondary_color: GOLD, font: "DM Sans" },
    tabs: (tabs) => sahmTabs(tabs),
    screens: SAHM_B_SCREENS,
  },
};
