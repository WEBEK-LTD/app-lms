import type { StudioNode, StudioPage } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { bordered, idOf, pad, photo, photoBanner, roundButton, screen, type DemoInk } from "./parts";

/**
 * 128 Masar Rides (Studio's rides demo) as the owner approved it on 13
 * November (the Masar board): the city at night with the person's
 * greeting, "Where to tonight?" and the search over the photo, the saved
 * places, the driver on the way (their photo, car, rating, plate and a
 * call button) and the car classes; light and dark. Its Ride tab is this
 * page, then My rides and the account.
 */

export const MASAR_INK: DemoInk = {
  page: "#F2F6F5",
  darkPage: "#071615",
  surface: "#FFFFFF",
  darkSurface: "#0F2422",
  ink: "#0B2422",
  darkInk: "#E7F4F2",
  muted: "#556866",
  darkMuted: "#A2BAB6",
  line: "#DCE6E4",
  darkLine: "#1F3735",
};
const K = MASAR_INK;
/** The board's deep teal: the driver's card, the "Now" chip's words. */
const DEEP = "#0E4A44";

/** The driver on the way: their photo (the element's while they have none), car, rating and plate, and a call button. */
export function driverCard(ctx: SectionContext, margin = { top: 14, end: 16, bottom: 0, start: 16 }): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "tracking",
    tracking: { kind: "ride", style: "driver" },
    visibility: "signed_in",
    image_url: photo(ctx, "/stories/rides/rides-driver.jpg"),
    background: DEEP,
    color: "#FFFFFF",
    radius: 22,
    padding: pad(12, 12),
    margin,
  };
}

export function masarHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const ride = screen("ride");
  const text = (value: string, extra: Partial<StudioNode>): StudioNode => ({ id: id(), type: "text", text: value, ...extra });
  const place = (icon: string, word: SectionWord): StudioNode =>
    bordered(ctx, K, { type: "row", width: "hug", height: 38, radius: 19, gap: 6, cross: "center", padding: pad(0, 13), children: [{ id: id(), type: "icon", icon, icon_size: 18, color: ctx.brand }, text(ctx.w(word), { font: { size: 13, weight: 700 }, color: K.ink, dark_color: K.darkInk })] }, { action: ride });
  const kind = (icon: string, name: SectionWord, line: SectionWord, chosen: boolean): StudioNode =>
    bordered(
      ctx,
      K,
      {
        type: "column",
        radius: chosen ? 18 : 19,
        padding: pad(12, 12),
        children: [
          { id: id(), type: "icon", icon, icon_size: 24, color: chosen ? ctx.brand : K.muted, dark_color: chosen ? ctx.brand : K.darkMuted },
          text(ctx.w(name), { font: { size: 14, weight: 800 }, margin: { top: 6 }, color: K.ink, dark_color: K.darkInk }),
          text(ctx.w(line), { font: { size: 12 }, color: K.muted, dark_color: K.darkMuted }),
        ],
      },
      chosen ? { border: ctx.brand, thickness: 2, width: "fill", action: ride } : { width: "fill", action: ride },
    );
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
          name: ctx.w("rideHeadline"),
          image_url: photo(ctx, "/stories/rides/rides-night-city.jpg"),
          height: 360,
          background: "#041E1C",
          scrim: { color: "#041E1C", from: 0.45, middle: 0.09, at: 40, to: 0.92 },
          align: "between",
          padding: { top: 22, end: 16, bottom: 22, start: 16 },
          children: [
            {
              id: id(),
              type: "row",
              gap: 10,
              cross: "center",
              padding: { start: 2, end: 2 },
              children: [{ id: id(), type: "greeting", width: "fill", color: "#FFFFFF", font: { size: 15, weight: 700 } }, roundButton(ctx, "notifications", screen("notifications"))],
            },
            {
              id: id(),
              type: "column",
              gap: 16,
              children: [
                text(ctx.w("rideHeadline"), { color: "#FFFFFF", font: { size: 34, weight: 800, line_height: 1.02, letter_spacing: -1 }, padding: { start: 2, end: 2 } }),
                {
                  id: id(),
                  type: "row",
                  name: ctx.w("rideSearch"),
                  height: 58,
                  radius: 20,
                  gap: 10,
                  cross: "center",
                  padding: pad(0, 16),
                  overlay: { color: "#FFFFFF", opacity: 0.16 },
                  color: "#FFFFFF",
                  action: ride,
                  children: [
                    { id: id(), type: "icon", icon: "search", icon_size: 22 },
                    text(ctx.w("rideSearch"), { width: "fill", font: { size: 16, weight: 600 } }),
                    {
                      id: id(),
                      type: "row",
                      height: 34,
                      radius: 17,
                      gap: 4,
                      cross: "center",
                      padding: pad(0, 12),
                      background: "#FFFFFF",
                      color: DEEP,
                      children: [{ id: id(), type: "icon", icon: "schedule", icon_size: 16 }, text(ctx.w("rideNow"), { font: { size: 12, weight: 800 } })],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: id(),
          type: "row",
          name: ctx.w("rideHome"),
          gap: 8,
          scroll: true,
          padding: { top: 14, end: 16, bottom: 0, start: 16 },
          children: [place("home", "rideHome"), place("work", "rideOffice"), place("flight", "rideAirport")],
        },
        driverCard(ctx),
        {
          id: id(),
          type: "row",
          name: ctx.w("rideEconomy"),
          gap: 10,
          cross: "stretch",
          padding: { top: 14, end: 16, bottom: 0, start: 16 },
          children: [kind("directions_car", "rideEconomy", "rideEconomyText", true), kind("airline_seat_recline_extra", "rideComfort", "rideComfortText", false), kind("airport_shuttle", "rideVan", "rideVanText", false)],
        },
      ],
    },
  };
}

/** Over the ride screen, the driver on the way; over My rides, the ride home at night. */
export function masarPage(screenName: string, ctx: SectionContext): StudioNode[] | null {
  if (screenName === "ride") return [driverCard(ctx, { top: 12, end: 16, bottom: 4, start: 16 })];
  if (screenName === "my_rides") return [photoBanner(ctx, { path: "/stories/rides/rides-arrive-home.jpg", title: ctx.w("rideRidesBanner"), text: ctx.w("rideRidesBannerText"), scrim: "#041E1C" })];
  return null;
}
