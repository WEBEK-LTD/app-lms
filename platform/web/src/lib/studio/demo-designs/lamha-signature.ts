import type { StudioNode, StudioPage, TabBarStyle } from "../../pages/types";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, pad, photo, photoBanner, screen, type DemoInk } from "./parts";
import { filler, inked, inkIcon, roundOf, signatureScreens, type SignatureDesign } from "./signature";

/**
 * 130.9 130.10 Lamha Taxi's Signature looks (the R2-Lamha boards), taxi
 * yellow and navy: A "Two-ink cab", the city printed in two inks (129.23
 * `two_ink`: navy on yellow by day, yellow on navy by night) with the free
 * taxis around the person as roof signs, live, and its checker band, over
 * a sheet: the nearest free taxi's minutes large with how many are around
 * and "Book it", "Where to?", the taxi classes and the airport's set price
 * on a ticket; B "Glance radar", "8 free taxis around you." large (their
 * count, live), the radar lens (129.23 `lens`) with the taxis around,
 * "Where to?" on navy, the classes as a segmented track and the airport
 * over its photo. The demo's own classes and fares (lib/demo/content.ts
 * TAXI_DEMO_TYPES); light and dark as the boards.
 */

type Ink = { color: string; dark: string };

const NAVY = "#1C2541";
const YELLOW = "#F5B700";
/** A navy fill by day that turns taxi yellow by night (the boards' chips and buttons), with its ink. */
const SWAP = { background: NAVY, dark: YELLOW, ink: { color: YELLOW, dark: NAVY } as Ink, text: { color: "#FFFFFF", dark: NAVY } as Ink };

/** The demo's taxi classes and the fares they start from (TAXI_DEMO_TYPES). */
const CLASSES: { name: SectionWord; fare: number }[] = [
  { name: "sigTaxiClass", fare: 35 },
  { name: "rideComfort", fare: 55 },
  { name: "sigXl", fare: 85 },
];

/** A class's fare: "from E£35". */
function fareRow(ctx: SectionContext, fare: number, ink: Ink, size: number, weight: 500 | 600 = 600): StudioNode {
  return { id: idOf(ctx)(), type: "row", width: "hug", gap: 2, children: [inked(ctx, ctx.w("sigFareFrom"), ink, { size, weight }), inked(ctx, String(fare), ink, { size, weight: 700 })] };
}

// ——— A: Two-ink cab ———

const A: DemoInk = {
  page: "#FFFDF6",
  darkPage: "#0E1324",
  surface: "#FFFFFF",
  darkSurface: "#1A2138",
  ink: "#141B2E",
  darkInk: "#F1F2F7",
  muted: "#5B6276",
  darkMuted: "#AEB4C6",
  line: "#E2DCCB",
  darkLine: "#2A3354",
};
const A_INK: Ink = { color: A.ink, dark: A.darkInk };
const A_MUTED: Ink = { color: A.muted, dark: A.darkMuted };

/** The free taxis printed on the map in Studio (the app draws the real ones around the person). */
const TAXIS = [
  { x: 33, y: 31 },
  { x: 81, y: 33 },
  { x: 52, y: 42 },
  { x: 43, y: 92 },
  { x: 72, y: 94 },
  { x: 95, y: 56 },
  { x: 58, y: 28 },
];

/** A round navy button (yellow by night) with its icon in the other ink. */
function swapRound(ctx: SectionContext, icon: string, action: StudioNode["action"]): StudioNode {
  return roundOf(ctx, icon, action, { ink: SWAP.ink, background: SWAP.background, dark_background: SWAP.dark });
}

function lamhaAHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const ride = screen("ride");
  const klass = (c: (typeof CLASSES)[number], chosen: boolean): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(c.name),
    width: "fill",
    height: 52,
    radius: 16,
    gap: 1,
    align: "center",
    padding: pad(0, 12),
    action: ride,
    ...(chosen ? { background: YELLOW } : { border_color: A.line, dark_border_color: A.darkLine, border_width: 1.5 }),
    children: [inked(ctx, ctx.w(c.name), chosen ? { color: NAVY, dark: NAVY } : A_INK, { size: 13, weight: 800 }), fareRow(ctx, c.fare, chosen ? { color: "#3D3206", dark: "#3D3206" } : A_MUTED, 12)],
  });
  return {
    background: A.page,
    dark_background: A.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: { bottom: 96 },
      children: [
        {
          id: id(),
          type: "map_header",
          name: ctx.w("taxiWhereTo"),
          height: 352,
          background: YELLOW,
          dark_background: "#121829",
          align: "between",
          padding: { top: 8, end: 16, bottom: 24, start: 16 },
          map_drawing: {
            style: "two_ink",
            accent: YELLOW,
            chip: NAVY,
            markers: TAXIS,
            me: true,
            me_at: { x: 40, y: 60 },
            live: true,
            labels: [
              { x: 36, y: 44, text: ctx.w("sigMaadi") },
              { x: 6, y: 72, text: ctx.w("sigNile") },
            ],
          },
          children: [
            {
              id: id(),
              type: "row",
              gap: 10,
              cross: "center",
              children: [
                {
                  id: id(),
                  type: "row",
                  height: 44,
                  radius: 22,
                  gap: 8,
                  cross: "center",
                  padding: { top: 0, end: 16, bottom: 0, start: 14 },
                  background: SWAP.background,
                  dark_background: SWAP.dark,
                  children: [inkIcon(ctx, "local_taxi", 20, SWAP.ink), inked(ctx, ctx.w("brandName"), SWAP.text, { size: 15, weight: 800 })],
                },
                filler(ctx),
                swapRound(ctx, "notifications", screen("notifications")),
                swapRound(ctx, "person", screen("account")),
              ],
            },
            { id: id(), type: "row", children: [filler(ctx), swapRound(ctx, "my_location", ride)] },
          ],
        },
        {
          id: id(),
          type: "column",
          name: ctx.w("taxiWhereTo"),
          gap: 12,
          padding: { top: 16, end: 16, bottom: 0, start: 16 },
          children: [
            {
              id: id(),
              type: "row",
              gap: 12,
              cross: "center",
              children: [
                { id: id(), type: "tracking", tracking: { kind: "nearby_taxis", style: "card" }, visibility: "signed_in", width: "fill", color: A.ink, dark_color: A.darkInk },
                {
                  id: id(),
                  type: "row",
                  name: ctx.w("sigBookIt"),
                  height: 52,
                  radius: 26,
                  gap: 6,
                  cross: "center",
                  self_align: "center",
                  padding: pad(0, 18),
                  background: SWAP.background,
                  dark_background: SWAP.dark,
                  action: ride,
                  children: [inked(ctx, ctx.w("sigBookIt"), SWAP.ink, { size: 15, weight: 800 }), inkIcon(ctx, "arrow_forward", 20, SWAP.ink)],
                },
              ],
            },
            {
              id: id(),
              type: "row",
              name: ctx.w("taxiWhereTo"),
              height: 56,
              radius: 18,
              gap: 10,
              cross: "center",
              padding: { top: 0, end: 6, bottom: 0, start: 16 },
              background: "#F3EFE3",
              dark_background: "#1A2138",
              action: ride,
              children: [
                inkIcon(ctx, "search", 22, A_INK),
                inked(ctx, ctx.w("taxiWhereTo"), A_INK, { size: 17, weight: 800 }, { width: "fill" }),
                {
                  id: id(),
                  type: "row",
                  height: 44,
                  radius: 14,
                  gap: 5,
                  cross: "center",
                  self_align: "center",
                  padding: pad(0, 12),
                  background: A.page,
                  dark_background: A.darkPage,
                  children: [inkIcon(ctx, "schedule", 18, A_INK), inked(ctx, ctx.w("rideNow"), A_INK, { size: 13, weight: 700 })],
                },
              ],
            },
            { id: id(), type: "row", name: ctx.w("sigTaxiClass"), gap: 8, children: CLASSES.map((c, i) => klass(c, i === 0)) },
            {
              id: id(),
              type: "row",
              name: ctx.w("sigAirportPrice"),
              height: 96,
              radius: 20,
              background: NAVY,
              dark_background: "#1C2541",
              shadow: "medium",
              cross: "stretch",
              action: ride,
              surface: { ticket: { at: 27, axis: "vertical", notch: 8 } },
              children: [
                { id: id(), type: "row", width: 96, height: "fill", image_background_url: photo(ctx, "/stories/rides/rides-backseat.jpg"), background: NAVY, name: ctx.w("rideAirport"), children: [] },
                {
                  id: id(),
                  type: "column",
                  width: "fill",
                  gap: 3,
                  align: "center",
                  padding: { top: 0, end: 8, bottom: 0, start: 14 },
                  children: [
                    inked(ctx, ctx.w("rideAirport"), { color: YELLOW, dark: YELLOW }, { size: 13, weight: 800, letter_spacing: 2.8, uppercase: true }),
                    inked(ctx, ctx.w("sigAirportPrice"), { color: "#FFFFFF", dark: "#FFFFFF" }, { size: 15, weight: 800, line_height: 1.15 }),
                    inked(ctx, ctx.w("sigAirportLine"), { color: "#C9CEDD", dark: "#C9CEDD" }, { size: 12, weight: 600 }, { max_lines: 1 }),
                  ],
                },
                {
                  id: id(),
                  type: "row",
                  width: 40,
                  height: 40,
                  radius: 20,
                  align: "center",
                  cross: "center",
                  self_align: "center",
                  margin: { top: 0, end: 14, bottom: 0, start: 0 },
                  background: YELLOW,
                  children: [inkIcon(ctx, "flight_takeoff", 22, { color: NAVY, dark: NAVY })],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

/** Over the ride screen, the nearest free taxi's minutes; over My rides, a ride at night from the back seat. */
function lamhaAOver(screenName: string, ctx: SectionContext): StudioNode[] | null {
  if (screenName === "ride") return [{ id: idOf(ctx)(), type: "tracking", tracking: { kind: "nearby_taxis", style: "card" }, visibility: "signed_in", color: A.ink, dark_color: A.darkInk, background: "#F3EFE3", dark_background: "#1A2138", radius: 20, padding: pad(12, 16), margin: { top: 12, end: 16, bottom: 4, start: 16 } }];
  if (screenName === "my_rides") return [photoBanner(ctx, { path: "/stories/rides/rides-backseat.jpg", title: ctx.w("taxiRidesBanner"), text: ctx.w("rideRidesBannerText"), scrim: NAVY })];
  return null;
}

const A_BAR: TabBarStyle = {
  design: "float",
  margin: 12,
  radius: 24,
  labels: "active",
  background: NAVY,
  dark_background: "#1A2138",
  active: YELLOW,
  dark_active: YELLOW,
  inactive: "#C9CEDD",
  dark_inactive: "#AEB4C6",
};

const TWO_INK: SignatureDesign = {
  demo: "taxi",
  variant: "a",
  template: { id: "taxi_signature_a", icon: "local_taxi", fits: { types: ["rides"] } },
  home: lamhaAHome,
  over: lamhaAOver,
  look: { header: { background: A.page, color: A.ink, dark_background: A.darkPage, dark_color: A.darkInk }, background: A.page, dark_background: A.darkPage },
  bar: A_BAR,
  project: {
    screens: signatureScreens({
      style: "photo",
      photo: "/stories/rides/rides-backseat.jpg",
      title: { en: "A taxi, moments away", ar: "سيارة أجرة على بُعد لحظات", tr: "Taksiniz birkaç dakika uzakta" },
      subtitle: {
        en: "See the free taxis around you, live on the map.",
        ar: "شاهد سيارات الأجرة المتاحة حولك مباشرةً على الخريطة.",
        tr: "Etrafınızdaki boş taksileri haritada canlı görün.",
      },
      menu: "night",
      accent: YELLOW,
    }),
  },
  chrome: { header: "brand", system: "brand" },
};

// ——— B: Glance radar ———

const B: DemoInk = {
  page: "#F6F5F1",
  darkPage: "#0A0F1E",
  surface: "#FFFFFF",
  darkSurface: "#151D33",
  ink: "#141B2E",
  darkInk: "#F1F2F7",
  muted: "#565D72",
  darkMuted: "#A9B0C4",
  line: "#D9D6CC",
  darkLine: "#2A3354",
};
const B_INK: Ink = { color: B.ink, dark: B.darkInk };
const B_MUTED: Ink = { color: B.muted, dark: B.darkMuted };
const WHITE: Ink = { color: "#FFFFFF", dark: "#FFFFFF" };

function lamhaBHome(ctx: SectionContext): StudioPage {
  const id = idOf(ctx);
  const ride = screen("ride");
  const klass = (c: (typeof CLASSES)[number], chosen: boolean): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(c.name),
    width: "fill",
    radius: 16,
    align: "center",
    cross: "center",
    action: ride,
    ...(chosen ? { background: YELLOW, shadow: "light" as const } : {}),
    children: [inked(ctx, ctx.w(c.name), chosen ? { color: NAVY, dark: NAVY } : B_INK, { size: 14, weight: 700 }), { ...fareRow(ctx, c.fare, chosen ? { color: "#3D3206", dark: "#3D3206" } : B_MUTED, 11, 500), self_align: "center" }],
  });
  const headline = { size: 44, weight: 800 as const, line_height: 1.02, letter_spacing: -1.8 };
  return {
    background: B.page,
    dark_background: B.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: { top: 8, bottom: 96 },
      children: [
        {
          id: id(),
          type: "row",
          gap: 10,
          cross: "center",
          padding: { top: 0, end: 16, bottom: 0, start: 20 },
          children: [
            { id: id(), type: "row", width: 10, height: 10, radius: 3, self_align: "center", background: YELLOW, children: [] },
            inked(ctx, ctx.w("brandName"), B_INK, { size: 15, weight: 800 }, { width: "fill" }),
            roundOf(ctx, "notifications", screen("notifications"), { ink: B_INK, border_color: B.line, dark_border_color: B.darkLine, border_width: 1 }),
            roundOf(ctx, "person", screen("account"), { ink: { color: YELLOW, dark: YELLOW }, background: NAVY, dark_background: "#1C2541" }),
          ],
        },
        // Their count large, live; signed out, the words alone.
        { id: id(), type: "tracking", tracking: { kind: "nearby_taxis", style: "headline" }, visibility: "signed_in", color: B.ink, dark_color: B.darkInk, font: headline, margin: { top: 18, end: 20, bottom: 0, start: 20 } },
        inked(ctx, ctx.w("sigTaxisAround"), B_INK, headline, { visibility: "signed_out", margin: { top: 18, end: 20, bottom: 0, start: 20 } }),
        {
          id: id(),
          type: "map_header",
          name: ctx.w("sigTaxisAround"),
          height: 300,
          background: B.page,
          dark_background: B.darkPage,
          margin: { top: 4 },
          map_drawing: {
            style: "lens",
            accent: YELLOW,
            chip: NAVY,
            markers: [
              { x: 62, y: 40 },
              { x: 19, y: 39 },
              { x: 56, y: 82 },
              { x: 78, y: 19 },
              { x: 8, y: 65 },
              { x: 92, y: 64 },
              { x: 34, y: 8 },
              { x: 35, y: 92 },
            ],
            me: true,
            live: true,
            labels: [
              { x: 9, y: 30, text: ctx.w("sigMohandessin") },
              { x: 70, y: 50, text: ctx.w("sigAgouza") },
            ],
          },
          children: [],
        },
        {
          id: id(),
          type: "column",
          gap: 12,
          padding: { top: 12, end: 16, bottom: 0, start: 16 },
          children: [
            {
              id: id(),
              type: "row",
              name: ctx.w("taxiWhereTo"),
              height: 56,
              radius: 28,
              gap: 12,
              cross: "center",
              padding: pad(0, 6),
              background: NAVY,
              dark_background: NAVY,
              border_color: NAVY,
              dark_border_color: "#6B5A1E",
              border_width: 1,
              shadow: "medium",
              action: ride,
              children: [
                { id: id(), type: "row", width: 44, height: 44, radius: 22, align: "center", cross: "center", self_align: "center", background: YELLOW, children: [inkIcon(ctx, "search", 22, { color: NAVY, dark: NAVY })] },
                inked(ctx, ctx.w("taxiWhereTo"), WHITE, { size: 18, weight: 700 }, { width: "fill" }),
                {
                  id: id(),
                  type: "row",
                  height: 44,
                  radius: 22,
                  gap: 5,
                  cross: "center",
                  self_align: "center",
                  padding: pad(0, 14),
                  background: "#2E3653",
                  dark_background: "#2E3653",
                  children: [inkIcon(ctx, "schedule", 18, { color: YELLOW, dark: YELLOW }), inked(ctx, ctx.w("rideNow"), WHITE, { size: 13, weight: 600 })],
                },
              ],
            },
            { id: id(), type: "row", name: ctx.w("sigTaxiClass"), height: 56, radius: 20, gap: 4, padding: pad(4, 4), cross: "stretch", background: "#E9E6DC", dark_background: "#151D33", children: CLASSES.map((c, i) => klass(c, i === 0)) },
            {
              id: id(),
              type: "photo_hero",
              name: ctx.w("sigAirportFare"),
              image_url: photo(ctx, "/stories/rides/rides-waiting.jpg"),
              height: 96,
              radius: 24,
              background: "#0A0F1E",
              scrim: { color: "#0A0F1E", from: 0.95, middle: 0.82, at: 58, to: 0.35, angle: 90 },
              padding: { top: 16, end: 16, bottom: 16, start: 18 },
              action: ride,
              children: [
                {
                  id: id(),
                  type: "row",
                  gap: 12,
                  cross: "center",
                  children: [
                    {
                      id: id(),
                      type: "column",
                      width: "fill",
                      gap: 3,
                      children: [
                        inked(ctx, ctx.w("sigAirportSetPrice"), { color: YELLOW, dark: YELLOW }, { size: 11, weight: 700, letter_spacing: 1.8, uppercase: true }),
                        inked(ctx, ctx.w("sigAirportFare"), WHITE, { size: 18, weight: 700, line_height: 1.15 }),
                        inked(ctx, ctx.w("sigAirportLine"), { color: "#C9CEDD", dark: "#C9CEDD" }, { size: 12, weight: 500 }, { max_lines: 1 }),
                      ],
                    },
                    { id: id(), type: "row", width: 44, height: 44, radius: 22, align: "center", cross: "center", self_align: "center", background: YELLOW, children: [inkIcon(ctx, "arrow_forward", 22, { color: NAVY, dark: NAVY })] },
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

/** Over the ride screen, the free taxis' count large; over My rides, waiting for a ride at night. */
function lamhaBOver(screenName: string, ctx: SectionContext): StudioNode[] | null {
  if (screenName === "ride") return [{ id: idOf(ctx)(), type: "tracking", tracking: { kind: "nearby_taxis", style: "headline" }, visibility: "signed_in", color: B.ink, dark_color: B.darkInk, font: { size: 30, weight: 800, letter_spacing: -1 }, margin: { top: 14, end: 20, bottom: 4, start: 20 } }];
  if (screenName === "my_rides") return [photoBanner(ctx, { path: "/stories/rides/rides-waiting.jpg", title: ctx.w("taxiRidesBanner"), text: ctx.w("rideRidesBannerText"), scrim: "#0A0F1E" })];
  return null;
}

const B_BAR: TabBarStyle = {
  design: "dock",
  margin: 16,
  radius: 28,
  background: NAVY,
  dark_background: "#151D33",
  active: YELLOW,
  dark_active: YELLOW,
  inactive: "#C9CEDD",
  dark_inactive: "#A9B0C4",
};

const GLANCE_RADAR: SignatureDesign = {
  demo: "taxi",
  variant: "b",
  template: { id: "taxi_signature_b", icon: "radar", fits: { types: ["rides"] } },
  home: lamhaBHome,
  over: lamhaBOver,
  look: { header: { background: B.page, color: B.ink, dark_background: B.darkPage, dark_color: B.darkInk }, background: B.page, dark_background: B.darkPage },
  bar: B_BAR,
  project: {
    screens: signatureScreens({
      style: "premium",
      photo: "/stories/rides/rides-waiting.jpg",
      title: { en: "Taxis around you, at a glance", ar: "سيارات الأجرة حولك في لمحة", tr: "Çevrenizdeki taksiler bir bakışta" },
      subtitle: {
        en: "Sign in to see the free taxis near you and book the nearest.",
        ar: "سجّل الدخول لترى سيارات الأجرة المتاحة قربك وتحجز الأقرب.",
        tr: "Yakınınızdaki boş taksileri görmek ve en yakınını çağırmak için giriş yapın.",
      },
      menu: "night",
      accent: YELLOW,
    }),
  },
  chrome: { header: "large", system: "large" },
};

export const LAMHA_A = TWO_INK;
export const LAMHA_B = GLANCE_RADAR;
