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

