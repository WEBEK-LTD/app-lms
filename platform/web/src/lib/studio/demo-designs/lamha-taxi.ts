import type { StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext } from "../sections";
import { idOf, pad, photoBanner, roundButton, screen, type DemoInk } from "./parts";

/**
 * 128 Lamha Taxi (Studio's taxi demo) as the owner approved it on 13
 * November (the Lamha board): the map with the free taxis around the
 * person and their own dot, the name on a navy pill, and a sheet over the
 * map's foot: "A taxi in a glance.", where to, the taxis near them, the
 * airport's fixed fare over a photo and "Book the nearest taxi"; light and
 * dark. The home has no bar under it, as approved: its buttons lead on
 * (the account beside the notifications), and My rides and the account
 * keep the dark island bar.
 */

export const LAMHA_INK: DemoInk = {
  page: "#F6F4EF",
  darkPage: "#151B2B",
  surface: "#FFFFFF",
  darkSurface: "#1C2541",
  ink: "#141B2E",
  darkInk: "#F1F2F7",
  muted: "#5B6276",
  darkMuted: "#AEB4C6",
  line: "#E2DED6",
  darkLine: "#333D5E",
};
const K = LAMHA_INK;
const NAVY = "#1C2541";
const YELLOW = "#F5B700";
/** The map's land by day and by night. */
const LAND = { background: "#ECE8DF", dark_background: "#151B2B" };
/** The free taxis on the drawn map in Studio (the app shows the real ones around the person). */
const TAXIS = [
  { x: 15.2, y: 22.8 },
  { x: 84.5, y: 35.5 },
  { x: 33.9, y: 76 },
  { x: 71.2, y: 73.8 },
  { x: 57.9, y: 29.1 },
];

export function lamhaHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const ride = screen("ride");
  const text = (value: string, extra: Partial<StudioNode>): StudioNode => ({ id: id(), type: "text", text: value, ...extra });
  const light = { background: K.surface, dark_background: NAVY, color: K.ink, dark_color: K.darkInk, shadow: "medium" as const, overlay: null };
  return {
    ...LAND,
    show_tabs: false,
    body: {
      id: id(),
      type: "column",
      children: [
        {
          id: id(),
          type: "map_header",
          name: ctx.w("taxiHeadline"),
          height: 400,
          ...LAND,
          map_drawing: { markers: TAXIS, icon: "local_taxi", accent: YELLOW, chip: NAVY, me: true, live: true },
          padding: { top: 20, end: 16, bottom: 0, start: 16 },
          overlap: 38,
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
                  height: 40,
                  radius: 20,
                  gap: 6,
                  cross: "center",
                  padding: pad(0, 16),
                  background: NAVY,
                  color: "#FFFFFF",
                  children: [{ id: id(), type: "row", width: 8, height: 8, radius: 4, self_align: "center", background: YELLOW, children: [] }, text(ctx.w("brandName"), { font: { size: 15, weight: 800 } })],
                },
                { id: id(), type: "row", gap: 10, children: [roundButton(ctx, "person", screen("account"), light), roundButton(ctx, "notifications", screen("notifications"), light)] },
              ],
            },
            {
              id: id(),
              type: "column",
              name: ctx.w("taxiHeadline"),
              gap: 10,
              padding: { top: 12, end: 16, bottom: 16, start: 16 },
              corners: { top_start: 30, top_end: 30 },
              background: K.surface,
              dark_background: NAVY,
              shadow: "strong",
              children: [
                { id: id(), type: "row", width: 40, height: 4, radius: 2, self_align: "center", background: K.line, dark_background: K.darkLine, children: [] },
                text(ctx.w("taxiHeadline"), { font: { size: 26, weight: 800, letter_spacing: -0.5 }, color: K.ink, dark_color: K.darkInk }),
                {
                  id: id(),
                  type: "row",
                  height: 56,
                  radius: 18,
                  gap: 10,
                  cross: "center",
                  padding: pad(0, 16),
                  background: "#F1EFEA",
                  dark_background: "#262F4F",
                  action: ride,
                  children: [
                    { id: id(), type: "icon", icon: "search", icon_size: 22, color: K.ink, dark_color: K.darkInk },
                    text(ctx.w("taxiWhereTo"), { width: "fill", font: { size: 16, weight: 600 }, color: K.muted, dark_color: K.darkMuted }),
                  ],
                },
                { id: id(), type: "tracking", tracking: { kind: "nearby_taxis", style: "line" }, color: K.muted, dark_color: K.darkMuted },
                photoBanner(ctx, { path: "/stories/rides/rides-waiting.jpg", eyebrow: ctx.w("rideAirport"), eyebrowColor: YELLOW, title: ctx.w("taxiAirportTitle"), scrim: NAVY, across: true, height: 118, margin: null, action: ride }),
                {
                  id: id(),
                  type: "button",
                  text: ctx.w("taxiBook"),
                  icon: "local_taxi",
                  icon_position: "start",
                  width: "fill",
                  height: 56,
                  radius: 18,
                  background: YELLOW,
                  color: NAVY,
                  font: { size: 16, weight: 800 },
                  text_align: "center",
                  action: ride,
                  motion: { press: "shrink" },
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

/** Over My rides, a ride at night from the back seat. */
export function lamhaPage(screenName: string, ctx: SectionContext): StudioNode[] | null {
  if (screenName === "my_rides") return [photoBanner(ctx, { path: "/stories/rides/rides-backseat.jpg", title: ctx.w("taxiRidesBanner"), text: ctx.w("rideRidesBannerText"), scrim: NAVY })];
  return null;
}
