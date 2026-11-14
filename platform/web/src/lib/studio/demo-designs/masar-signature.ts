import type { StudioNode, StudioPage, TabBarStyle } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, pad, photo, photoBanner, screen, type DemoInk } from "./parts";
import { filler, glass, inked, inkIcon, roundOf, type SignatureDesign, type SignatureLooks } from "./signature";

/**
 * 130.7 130.8 Masar Rides's Signature looks, map first (the R2-Masar
 * boards): A "Living map", the whole home a living map of the city
 * (129.21 `natural`) with the person's ride drawn live on it, frosted glass
 * over it (the greeting, the driver on the way, the car classes and
 * "Where to?"), a frosted floating bar; B "Horizon", the city tilted to a
 * foggy horizon (129.22) under a big "Where to?" with the person's name, a
 * sheet over its foot with the driver's minutes, the car classes' fares in
 * columns and "Where to?" on ink. The demo's own car classes and fares
 * (lib/demo/content.ts RIDES_DEMO_TYPES); light and dark as the boards.
 */

type Ink = { color: string; dark: string };

// ——— A: Living map ———

const A: DemoInk = {
  page: "#EDF0EA",
  darkPage: "#0C1716",
  surface: "#FFFFFF",
  darkSurface: "#0F2422",
  ink: "#0B2422",
  darkInk: "#E9F5F3",
  muted: "#4C5F5C",
  darkMuted: "#A3BDB8",
  line: "#D0DCDA",
  darkLine: "#1F3735",
};
const A_INK: Ink = { color: A.ink, dark: A.darkInk };
const A_MUTED: Ink = { color: A.muted, dark: A.darkMuted };
/** The board's teal by day and its mint by night: the route, the chosen class, the call. */
const A_ACCENT: Ink = { color: "#0F766C", dark: "#5FD3C2" };
const A_ON_ACCENT: Ink = { color: "#FFFFFF", dark: "#04201D" };
const GOLD = "#F2B544";

/** The demo's car classes: their icon, seats and the fare they start from (RIDES_DEMO_TYPES). */
const CLASSES: { icon: string; name: SectionWord; seats: number; fare: number }[] = [
  { icon: "directions_car", name: "rideEconomy", seats: 4, fare: 35 },
  { icon: "local_taxi", name: "rideComfort", seats: 4, fare: 50 },
  { icon: "airport_shuttle", name: "rideVan", seats: 7, fare: 80 },
];

/** The city's districts on the drawn map, in the demo's Cairo. */
const DISTRICTS: { x: number; y: number; word: SectionWord }[] = [
  { x: 28, y: 70, word: "sigZamalek" },
  { x: 80, y: 46, word: "sigDowntown" },
  { x: 80, y: 63, word: "sigTahrir" },
];

/** The driver on the way (128's `tracking` of the person's ride): their photo, car, rating and plate, a call; nothing without a ride. */
function driverGlass(ctx: SectionContext, extra: Partial<StudioNode> = {}): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w("sigOnTheWay"),
    visibility: "signed_in",
    radius: 24,
    padding: pad(12, 12),
    ...glass(0.78),
    ...extra,
    children: [
      {
        id: id(),
        type: "tracking",
        tracking: { kind: "ride", style: "driver" },
        visibility: "signed_in",
        image_url: photo(ctx, "/stories/rides/rides-driver.jpg"),
        color: A.ink,
        dark_color: A.darkInk,
      },
    ],
  };
}

/** "Where to?" on glass: the search on the accent, the words large, "Now" in an outlined pill; opens the ride. */
function whereTo(ctx: SectionContext, extra: Partial<StudioNode> = {}): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("taxiWhereTo"),
    height: 68,
    radius: 26,
    gap: 12,
    cross: "center",
    padding: pad(0, 10),
    action: screen("ride"),
    ...glass(0.86),
    ...extra,
    children: [
      { id: id(), type: "row", width: 46, height: 46, radius: 18, align: "center", cross: "center", self_align: "center", background: A_ACCENT.color, dark_background: A_ACCENT.dark, children: [inkIcon(ctx, "search", 24, A_ON_ACCENT)] },
      inked(ctx, ctx.w("taxiWhereTo"), A_INK, { size: 20, weight: 800, letter_spacing: -0.4 }, { width: "fill" }),
      {
        id: id(),
        type: "row",
        height: 40,
        radius: 20,
        gap: 5,
        cross: "center",
        self_align: "center",
        padding: pad(0, 12),
        border_color: "#C9D3D1",
        dark_border_color: "#2B4744",
        border_width: 1,
        children: [inkIcon(ctx, "schedule", 18, A_ACCENT), inked(ctx, ctx.w("rideNow"), A_INK, { size: 13, weight: 700 })],
      },
    ],
  };
}

/** A car class on glass (the first chosen, on the accent): its icon and seats, its name and the fare it starts from. */
function classCard(ctx: SectionContext, c: (typeof CLASSES)[number], chosen: boolean): StudioNode {
  const id = idOf(ctx);
  const ink = chosen ? A_ON_ACCENT : A_INK;
  const soft = chosen ? { color: "#E6F4F1", dark: "#0B3A35" } : A_MUTED;
  return {
    id: id(),
    type: "column",
    name: ctx.w(c.name),
    width: "fill",
    height: 98,
    radius: 22,
    align: "between",
    padding: pad(11, 12),
    action: screen("ride"),
    ...(chosen ? { background: A_ACCENT.color, dark_background: A_ACCENT.dark, shadow: "medium" as const } : glass(0.74)),
    children: [
      {
        id: id(),
        type: "row",
        cross: "center",
        children: [inkIcon(ctx, c.icon, 22, ink), filler(ctx), inkIcon(ctx, "person", 14, soft), inked(ctx, String(c.seats), soft, { size: 11, weight: 700 })],
      },
      {
        id: id(),
        type: "column",
        children: [
          inked(ctx, ctx.w(c.name), ink, { size: 13, weight: 700 }),
          { id: id(), type: "row", gap: 3, cross: "end", children: [inked(ctx, ctx.w("sigFareFrom"), soft, { size: 11, weight: 700 }), inked(ctx, String(c.fare), ink, { size: 20, weight: 800, letter_spacing: -0.6, line_height: 1.1 })] },
        ],
      },
    ],
  };
}

function masarAHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const round = (icon: string, action: StudioNode["action"]) => roundOf(ctx, icon, action, { ink: A_INK, ...glass(0.74) });
  return {
    background: A.page,
    dark_background: A.darkPage,
    body: {
      id: id(),
      type: "column",
      children: [
        {
          id: id(),
          type: "map_header",
          name: ctx.w("taxiWhereTo"),
          height: 676,
          background: A.page,
          dark_background: A.darkPage,
          align: "between",
          padding: { top: 8, end: 16, bottom: 18, start: 16 },
          map_drawing: {
            style: "natural",
            accent: GOLD,
            chip: "#21403C",
            markers: [
              { x: 14, y: 28 },
              { x: 30, y: 62 },
              { x: 92, y: 30 },
              { x: 80, y: 66 },
              { x: 4, y: 60 },
              { x: 54, y: 57 },
            ],
            places: [
              { x: 30, y: 30, label: ctx.w("rideHome"), icon: "home" },
              { x: 78, y: 54, label: ctx.w("rideOffice"), icon: "work" },
              { x: 68, y: 31, label: ctx.w("rideAirport"), icon: "flight" },
            ],
            labels: DISTRICTS.map((d) => ({ x: d.x, y: d.y, text: ctx.w(d.word) })),
            route: { points: [{ x: 80, y: 37 }, { x: 46, y: 39 }, { x: 41, y: 46 }], eta: ctx.w("sigThreeMin"), to_label: ctx.w("sigPickup"), color: A_ACCENT.color, dark_color: "#3FC7B4", live: "ride" },
          },
          children: [
            {
              id: id(),
              type: "column",
              gap: 10,
              children: [
                {
                  id: id(),
                  type: "row",
                  gap: 10,
                  cross: "center",
                  children: [
                    round("person", screen("account")),
                    {
                      id: id(),
                      type: "row",
                      height: 44,
                      radius: 22,
                      gap: 8,
                      cross: "center",
                      padding: pad(0, 16),
                      ...glass(0.74),
                      children: [
                        { id: id(), type: "row", width: 8, height: 8, radius: 4, self_align: "center", background: GOLD, children: [] },
                        { id: id(), type: "greeting", color: A.ink, dark_color: A.darkInk, font: { size: 14, weight: 700 } },
                      ],
                    },
                    filler(ctx),
                    round("notifications", screen("notifications")),
                  ],
                },
                driverGlass(ctx),
              ],
            },
            {
              id: id(),
              type: "column",
              gap: 10,
              children: [
                { id: id(), type: "row", name: ctx.w("rideEconomy"), gap: 8, cross: "stretch", children: CLASSES.map((c, i) => classCard(ctx, c, i === 0)) },
                whereTo(ctx),
              ],
            },
          ],
        },
      ],
    },
  };
}

/** Over the ride screen, the driver on the way on glass; over My rides, the ride home at night. */
function masarAOver(screenName: string, ctx: SectionContext): StudioNode[] | null {
  if (screenName === "ride") return [driverGlass(ctx, { margin: { top: 12, end: 16, bottom: 4, start: 16 } })];
  if (screenName === "my_rides") return [photoBanner(ctx, { path: "/stories/rides/rides-arrive-home.jpg", title: ctx.w("rideRidesBanner"), text: ctx.w("rideRidesBannerText"), scrim: "#041E1C" })];
  return null;
}

/** A: frosted glass floating over the page, the open tab's icon and name in the teal. */
const A_BAR: TabBarStyle = {
  design: "glass",
  margin: 12,
  radius: 26,
  labels: "active",
  background: "#FFFFFF",
  dark_background: "#0F2422",
  active: A_ACCENT.color,
  dark_active: A_ACCENT.dark,
  inactive: A.muted,
  dark_inactive: A.darkMuted,
};

const LIVING_MAP: SignatureDesign = {
  template: { id: "rides_signature_a", icon: "map", fits: { types: ["rides"] } },
  home: masarAHome,
  over: masarAOver,
  look: { header: { background: A.page, color: A.ink, dark_background: A.darkPage, dark_color: A.darkInk }, background: A.page, dark_background: A.darkPage },
  bar: A_BAR,
  screens: {
    style: "premium",
    photo: "/stories/rides/rides-night-city.jpg",
    title: { en: "Where to today?", ar: "إلى أين اليوم؟", tr: "Bugün nereye?" },
    subtitle: {
      en: "Sign in to see the fare before you ride and follow your driver on the map.",
      ar: "سجّل الدخول لترى الأجرة قبل أن تركب وتتابع سائقك على الخريطة.",
      tr: "Binmeden önce ücreti görmek ve sürücünüzü haritada izlemek için giriş yapın.",
    },
    menu: "cover",
  },
  chrome: { header: "glass", screens: "glass" },
};

export const MASAR_LOOKS: SignatureLooks = { a: LIVING_MAP };
