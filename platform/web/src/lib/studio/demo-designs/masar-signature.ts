import type { StudioNode, StudioPage, TabBarStyle } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, pad, photo, photoBanner, screen, type DemoInk } from "./parts";
import { filler, glass, inked, inkIcon, roundOf, signatureScreens, type SignatureDesign } from "./signature";

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
  demo: "rides",
  variant: "a",
  template: { id: "rides_signature_a", icon: "map", fits: { types: ["rides"] } },
  home: masarAHome,
  over: masarAOver,
  look: { header: { background: A.page, color: A.ink, dark_background: A.darkPage, dark_color: A.darkInk }, background: A.page, dark_background: A.darkPage },
  bar: A_BAR,
  project: {
    screens: signatureScreens({
      style: "premium",
      photo: "/stories/rides/rides-night-city.jpg",
      title: { en: "Where to today?", ar: "إلى أين اليوم؟", tr: "Bugün nereye?" },
      subtitle: {
        en: "Sign in to see the fare before you ride and follow your driver on the map.",
        ar: "سجّل الدخول لترى الأجرة قبل أن تركب وتتابع سائقك على الخريطة.",
        tr: "Binmeden önce ücreti görmek ve sürücünüzü haritada izlemek için giriş yapın.",
      },
      menu: "cover",
    }),
  },
  chrome: { header: "glass", system: "glass" },
};

// ——— B: Horizon ———

const B: DemoInk = {
  page: "#F1EFE9",
  darkPage: "#061110",
  surface: "#FFFFFF",
  darkSurface: "#0C1C1B",
  ink: "#0B2422",
  darkInk: "#E9F5F3",
  muted: "#4C5F5C",
  darkMuted: "#A3BDB8",
  line: "#DCE1DE",
  darkLine: "#1F3735",
};
const B_INK: Ink = { color: B.ink, dark: B.darkInk };
const B_MUTED: Ink = { color: B.muted, dark: B.darkMuted };
const B_ACCENT: Ink = { color: "#0F766C", dark: "#5FD3C2" };
/** "Where to?": on ink by day, on mint by night. */
const B_CTA = { background: "#0B2422", dark: "#5FD3C2", ink: { color: "#FFFFFF", dark: "#04201D" }, chip: "#24403D", darkChip: "#4DB8A8" };

/** A saved place in a white pill (a dark one by night). */
function placeChip(ctx: SectionContext, icon: string, word: SectionWord): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w(word),
    width: "hug",
    height: 36,
    radius: 18,
    gap: 6,
    cross: "center",
    padding: { top: 0, end: 12, bottom: 0, start: 10 },
    background: B.surface,
    dark_background: "#0F2422",
    border_color: "#DCE1DE",
    dark_border_color: "#21403C",
    border_width: 1,
    shadow: "light",
    action: screen("ride"),
    children: [inkIcon(ctx, icon, 17, B_ACCENT), inked(ctx, ctx.w(word), B_INK, { size: 13, weight: 700 })],
  };
}

/** A car class's fare in its column: the class, "E£" and the fare large, the seats; the chosen one in the accent, underlined. */
function fareColumn(ctx: SectionContext, c: (typeof CLASSES)[number], chosen: boolean): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    name: ctx.w(c.name),
    width: "fill",
    gap: 2,
    padding: { top: 12, end: 0, bottom: 0, start: 0 },
    action: screen("ride"),
    children: [
      inked(ctx, ctx.w(c.name), chosen ? B_ACCENT : B_MUTED, { size: 11, weight: 800, letter_spacing: 1.1, uppercase: true }),
      { id: id(), type: "row", gap: 2, cross: "end", children: [inked(ctx, ctx.w("sigCurrency"), B_MUTED, { size: 13, weight: 700 }), inked(ctx, String(c.fare), B_INK, { size: 30, weight: 800, letter_spacing: -1.2, line_height: 1.05 })] },
      inked(ctx, ctx.w(c.seats === 7 ? "sigFromSevenSeats" : "sigFromFourSeats"), B_MUTED, { size: 11, weight: 600 }),
      { id: id(), type: "row", width: 28, height: 3, radius: 2, margin: { top: 9 }, ...(chosen ? { background: B_ACCENT.color, dark_background: B_ACCENT.dark } : {}), children: [] },
    ],
  };
}

/** A thin line by day and by night: across, or down between the fares. */
function hair(ctx: SectionContext, down = false): StudioNode {
  return { id: idOf(ctx)(), type: "row", ...(down ? { width: 1, height: "fill" as const, margin: { top: 0, end: 14, bottom: 0, start: 0 } } : { width: "fill" as const, height: 1 }), background: B.line, dark_background: B.darkLine, children: [] };
}

function masarBHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const ride = screen("ride");
  const fares: StudioNode[] = [];
  CLASSES.forEach((c, i) => {
    if (i > 0) fares.push(hair(ctx, true));
    fares.push(fareColumn(ctx, c, i === 0));
  });
  return {
    background: B.page,
    dark_background: B.darkPage,
    body: {
      id: id(),
      type: "column",
      children: [
        {
          id: id(),
          type: "map_header",
          name: ctx.w("taxiWhereTo"),
          height: 420,
          background: B.page,
          dark_background: B.darkPage,
          padding: { top: 8, end: 16, bottom: 0, start: 20 },
          gap: 14,
          overlap: 64,
          map_drawing: {
            style: "horizon",
            accent: GOLD,
            chip: "#21403C",
            markers: [
              { x: 18, y: 66 },
              { x: 90, y: 70 },
              { x: 64, y: 90 },
            ],
            me: true,
            me_at: { x: 52, y: 82 },
            labels: [{ x: 58, y: 93, text: ctx.w("sigGardenCity") }],
            route: { points: [{ x: 84, y: 71 }, { x: 84, y: 76 }, { x: 52, y: 76 }, { x: 52, y: 82 }], to_label: ctx.w("sigPickup"), eta: ctx.w("sigThreeMin"), icon: "local_taxi", color: B_ACCENT.color, dark_color: "#3FC7B4", live: "ride" },
          },
          children: [
            {
              id: id(),
              type: "row",
              gap: 10,
              cross: "center",
              children: [
                { id: id(), type: "row", width: 8, height: 8, radius: 4, self_align: "center", background: GOLD, children: [] },
                inked(ctx, ctx.w("brandName"), B_INK, { size: 15, weight: 800, letter_spacing: -0.2 }, { width: "fill" }),
                roundOf(ctx, "notifications", screen("notifications"), { ink: B_INK, background: B.surface, dark_background: "#0F2422", border_color: "#DCE1DE", dark_border_color: "#21403C", border_width: 1 }),
                roundOf(ctx, "person", screen("account"), { ink: { color: "#FFFFFF", dark: "#04201D" }, background: B.ink, dark_background: B.darkInk }),
              ],
            },
            {
              id: id(),
              type: "greeting",
              name: ctx.w("taxiWhereTo"),
              text: ctx.w("sigWhereToName"),
              title: ctx.w("taxiWhereTo"),
              color: B.ink,
              dark_color: B.darkInk,
              font: { size: 54, weight: 800, line_height: 0.96, letter_spacing: -2.6 },
            },
            { id: id(), type: "row", name: ctx.w("rideHome"), gap: 8, scroll: true, children: [placeChip(ctx, "home", "rideHome"), placeChip(ctx, "work", "rideOffice"), placeChip(ctx, "flight", "rideAirport")] },
            {
              id: id(),
              type: "column",
              name: ctx.w("sigOnTheWay"),
              // Room at its foot for the floating bar.
              padding: { top: 10, end: 20, bottom: 100, start: 20 },
              corners: { top_start: 32, top_end: 32 },
              background: B.surface,
              dark_background: B.darkSurface,
              shadow: "strong",
              children: [
                { id: id(), type: "row", width: 36, height: 4, radius: 2, self_align: "center", background: B.line, dark_background: B.darkLine, children: [] },
                { id: id(), type: "tracking", tracking: { kind: "ride", style: "headline" }, visibility: "signed_in", color: B.ink, dark_color: B.darkInk, margin: { top: 14, end: 0, bottom: 16, start: 0 } },
                hair(ctx),
                { id: id(), type: "row", name: ctx.w("rideEconomy"), height: 104, cross: "stretch", children: fares },
                hair(ctx),
                {
                  id: id(),
                  type: "row",
                  name: ctx.w("taxiWhereTo"),
                  height: 60,
                  radius: 20,
                  gap: 12,
                  cross: "center",
                  margin: { top: 14 },
                  padding: { top: 0, end: 8, bottom: 0, start: 18 },
                  background: B_CTA.background,
                  dark_background: B_CTA.dark,
                  shadow: "medium",
                  action: ride,
                  children: [
                    inkIcon(ctx, "search", 24, B_CTA.ink),
                    inked(ctx, ctx.w("taxiWhereTo"), B_CTA.ink, { size: 18, weight: 800, letter_spacing: -0.2 }, { width: "fill" }),
                    {
                      id: id(),
                      type: "row",
                      height: 44,
                      radius: 14,
                      gap: 5,
                      cross: "center",
                      self_align: "center",
                      padding: pad(0, 14),
                      background: B_CTA.chip,
                      dark_background: B_CTA.darkChip,
                      children: [inkIcon(ctx, "schedule", 18, B_CTA.ink), inked(ctx, ctx.w("rideNow"), B_CTA.ink, { size: 13, weight: 700 })],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

/** Over the ride screen, the driver's minutes large on the sheet's white; over My rides, the ride home at night. */
function masarBOver(screenName: string, ctx: SectionContext): StudioNode[] | null {
  if (screenName === "ride") {
    return [{ id: idOf(ctx)(), type: "tracking", tracking: { kind: "ride", style: "headline" }, visibility: "signed_in", color: B.ink, dark_color: B.darkInk, background: B.surface, dark_background: B.darkSurface, radius: 24, padding: pad(14, 16), margin: { top: 12, end: 16, bottom: 4, start: 16 }, shadow: "light" }];
  }
  if (screenName === "my_rides") return [photoBanner(ctx, { path: "/stories/rides/rides-arrive-home.jpg", title: ctx.w("rideRidesBanner"), text: ctx.w("rideRidesBannerText"), scrim: "#041E1C" })];
  return null;
}

/** B: a floating ink pill, the open tab a mint pill with its name. */
const B_BAR: TabBarStyle = {
  design: "float",
  margin: 12,
  radius: 24,
  labels: "active",
  background: B.ink,
  dark_background: "#0F2422",
  active: "#5FD3C2",
  dark_active: "#5FD3C2",
  inactive: "#A3BDB8",
  dark_inactive: "#A3BDB8",
};

const HORIZON: SignatureDesign = {
  demo: "rides",
  variant: "b",
  template: { id: "rides_signature_b", icon: "landscape", fits: { types: ["rides"] } },
  home: masarBHome,
  over: masarBOver,
  look: { header: { background: B.page, color: B.ink, dark_background: B.darkPage, dark_color: B.darkInk }, background: B.page, dark_background: B.darkPage },
  bar: B_BAR,
  project: {
    screens: signatureScreens({
      style: "photo",
      photo: "/stories/rides/rides-arrive-home.jpg",
      title: { en: "Where to, tonight?", ar: "إلى أين الليلة؟", tr: "Bu gece nereye?" },
      subtitle: {
        en: "Sign in to see the fare first and follow your driver to the door.",
        ar: "سجّل الدخول لترى الأجرة أولًا وتتابع سائقك حتى الباب.",
        tr: "Önce ücreti görmek ve sürücünüzü kapıya kadar izlemek için giriş yapın.",
      },
      menu: "night",
      accent: "#5FD3C2",
    }),
  },
  chrome: { header: "large", system: "large" },
};

export const MASAR_A = LIVING_MAP;
export const MASAR_B = HORIZON;

