import type { StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext } from "../sections";
import { bordered, idOf, pad, photo, photoBanner, roundButton, screen, type DemoInk } from "./parts";

/**
 * 128 Sahm Express (Studio's delivery demo) as the owner approved it on
 * 13 November (the Sahm board): a courier riding through the city under
 * the app's name and "Anything, anywhere in the city. Today.", the route
 * card hanging over the photo's foot (the pickup, where to, "Send a
 * parcel"), the person's shipment on its way with its stages, and the
 * same-day and express services as photo tiles; light and dark. Every
 * page after it in the same look (lib/studio/demo-designs/index.ts).
 */

export const SAHM_INK: DemoInk = {
  page: "#F3F6FA",
  darkPage: "#0A121C",
  surface: "#FFFFFF",
  darkSurface: "#132030",
  ink: "#0F1E2E",
  darkInk: "#EAF1F8",
  muted: "#566475",
  darkMuted: "#A7B4C2",
  line: "#DEE5EE",
  darkLine: "#22324A",
};
const K = SAHM_INK;
/** The board's gold: the full stop after the name, the drop-off's pin. */
const GOLD = "#F2B544";
const SOFT = { background: "#E3EEF8", dark_background: "#16263A" };

/** The person's shipment on its way: the soft card with its stages. */
export function shipmentCard(ctx: SectionContext, margin = { top: 14, end: 16, bottom: 0, start: 16 }): StudioNode {
  return { id: idOf(ctx)(), type: "tracking", tracking: { kind: "shipment" }, visibility: "signed_in", ...SOFT, color: K.ink, dark_color: K.darkInk, radius: 20, padding: pad(14, 14), margin };
}

/** A service as a photo tile with its name and how long it takes. */
function tile(ctx: SectionContext, path: string, title: string, text: string): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "photo_hero",
    name: title,
    image_url: photo(ctx, path),
    height: 120,
    radius: 20,
    background: "#0F1E2E",
    scrim: { color: "#000000", from: 0, middle: 0, at: 40, to: 0.75 },
    align: "end",
    padding: { top: 10, end: 12, bottom: 10, start: 12 },
    action: screen("send_parcel"),
    children: [
      { id: id(), type: "text", text: title, color: "#FFFFFF", font: { size: 15, weight: 800 } },
      { id: id(), type: "text", text, color: "#FFFFFF", font: { size: 11 } },
    ],
  };
}

export function sahmHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const send = screen("send_parcel");
  const text = (value: string, extra: Partial<StudioNode>): StudioNode => ({ id: id(), type: "text", text: value, ...extra });
  const route: StudioNode = {
    id: id(),
    type: "column",
    name: ctx.w("deliverySend"),
    gap: 10,
    padding: pad(16, 16),
    margin: { top: 0, end: 16, bottom: 0, start: 16 },
    radius: 24,
    background: K.surface,
    dark_background: K.darkSurface,
    shadow: "strong",
    action: send,
    children: [
      {
        id: id(),
        type: "row",
        gap: 10,
        cross: "center",
        children: [
          bordered(ctx, K, { type: "row", width: 4, height: 4, radius: 2 }, { border: ctx.brand, thickness: 3 }),
          {
            id: id(),
            type: "row",
            width: "fill",
            gap: 4,
            cross: "center",
            children: [text(ctx.w("deliveryPickup"), { font: { size: 14 }, color: K.muted, dark_color: K.darkMuted }), text(ctx.w("deliveryFrom"), { width: "fill", max_lines: 1, font: { size: 14, weight: 800 }, color: K.ink, dark_color: K.darkInk })],
          },
        ],
      },
      { id: id(), type: "row", width: 2, height: 12, background: K.line, dark_background: K.darkLine, margin: { top: 0, end: 0, bottom: 0, start: 4 }, children: [] },
      {
        id: id(),
        type: "row",
        gap: 10,
        cross: "center",
        children: [
          { id: id(), type: "icon", icon: "location_on", icon_size: 18, color: GOLD },
          text(ctx.w("deliveryWhereTo"), { width: "fill", font: { size: 14 }, color: K.muted, dark_color: K.darkMuted }),
        ],
      },
      {
        id: id(),
        type: "button",
        text: ctx.w("deliverySend"),
        icon: "send",
        icon_position: "start",
        width: "fill",
        height: 50,
        radius: 16,
        background: ctx.brand,
        color: "#FFFFFF",
        font: { size: 15, weight: 800 },
        text_align: "center",
        margin: { top: 4 },
        action: send,
        motion: { press: "shrink" },
      },
    ],
  };
  return {
    background: K.page,
    dark_background: K.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: { bottom: 24 },
      children: [
        {
          id: id(),
          type: "photo_hero",
          name: ctx.w("deliveryHeadline"),
          image_url: photo(ctx, "/stories/delivery/delivery-rider.jpg"),
          height: 300,
          background: "#08182C",
          scrim: { color: "#08182C", from: 0.5, middle: 0.1, at: 40, to: 0.85 },
          align: "between",
          padding: { top: 22, end: 18, bottom: 74, start: 18 },
          overlap: 56,
          children: [
            {
              id: id(),
              type: "row",
              cross: "center",
              align: "between",
              children: [
                {
                  id: id(),
                  type: "row",
                  cross: "center",
                  children: [text(ctx.w("brandName"), { color: "#FFFFFF", font: { size: 18, weight: 800, letter_spacing: -0.2 } }), { id: id(), type: "row", width: 5, height: 5, radius: 3, background: GOLD, self_align: "center", margin: { start: 2, top: 8 }, children: [] }],
                },
                roundButton(ctx, "notifications", screen("notifications")),
              ],
            },
            text(ctx.w("deliveryHeadline"), { color: "#FFFFFF", font: { size: 30, weight: 800, line_height: 1.05, letter_spacing: -0.6 } }),
            route,
          ],
        },
        shipmentCard(ctx),
        {
          id: id(),
          type: "grid",
          columns: 2,
          gap: 10,
          padding: { top: 14, end: 16, bottom: 0, start: 16 },
          children: [
            tile(ctx, "/stories/delivery/delivery-handover.jpg", ctx.w("deliverySameDay"), ctx.w("deliverySameDayText")),
            tile(ctx, "/stories/delivery/delivery-boxes.jpg", ctx.w("deliveryExpress"), ctx.w("deliveryExpressText")),
          ],
        },
      ],
    },
  };
}

/** Over the screens of its tabs: sending (a banner of the parcels ready to go) and the shipments (the one on its way, the handover). */
export function sahmPage(screenName: string, ctx: SectionContext): StudioNode[] | null {
  if (screenName === "send_parcel") {
    return [photoBanner(ctx, { path: "/stories/delivery/delivery-boxes.jpg", title: ctx.w("deliverySendBanner"), text: ctx.w("deliverySendBannerText"), scrim: "#08182C" })];
  }
  if (screenName === "shipments") {
    return [shipmentCard(ctx, { top: 12, end: 16, bottom: 0, start: 16 }), photoBanner(ctx, { path: "/stories/delivery/delivery-handover.jpg", title: ctx.w("deliveryShipmentsBanner"), text: ctx.w("deliveryShipmentsBannerText"), scrim: "#08182C" })];
  }
  return null;
}
