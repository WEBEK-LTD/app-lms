import type { StudioMapStyle, StudioNode } from "../pages/types";

/**
 * 129.21–129.24 The Elements panel's premium maps: a `map_header` in one of
 * its premium looks (`map_drawing.style`, lib/studio/map-looks.ts), set up
 * as the owner's approved boards have it, ready for what goes over it.
 * Each is the one element type with its options; every option stays
 * editable in the inspector.
 */

export type PremiumMapId = "natural" | "horizon" | "two_ink" | "lens" | "route";

/** The sample words a new one starts with, in the editor's language. */
export type PremiumMapWords = (key: "home" | "office" | "pickup" | "eta" | "courier" | "street" | "downtown" | "oldTown" | "riverside" | "river") => string;

export interface PremiumMapInfo {
  id: PremiumMapId;
  icon: string;
  keywords: string;
  make: (o: { newId: () => string; words: PremiumMapWords }) => StudioNode;
}

const TAXIS = [
  { x: 14, y: 28 },
  { x: 86, y: 34 },
  { x: 30, y: 66 },
  { x: 72, y: 70 },
  { x: 58, y: 22 },
  { x: 8, y: 52 },
];

const map = (id: string, style: StudioMapStyle | null, height: number, extra: Partial<StudioNode>): StudioNode => ({
  id,
  type: "map_header",
  height,
  padding: { top: 16, end: 16, bottom: 16, start: 16 },
  children: [],
  ...extra,
  map_drawing: { ...(style ? { style } : {}), ...(extra.map_drawing ?? {}) },
});

export const PREMIUM_MAPS: readonly PremiumMapInfo[] = [
  {
    // 129.21 Masar A: a living map with saved places, a pickup and the car on its way to it.
    id: "natural",
    icon: "map",
    keywords: "living map natural river parks districts places pins pickup route car eta glass",
    make: ({ newId, words }) =>
      map(newId(), "natural", 520, {
        map_drawing: {
          accent: "#F2B544",
          chip: "#21403C",
          markers: TAXIS.slice(0, 5),
          me: true,
          me_at: { x: 41, y: 50 },
          places: [
            { x: 26, y: 22, label: words("home"), icon: "home" },
            { x: 72, y: 62, label: words("office"), icon: "work" },
          ],
          labels: [
            { x: 30, y: 82, text: words("oldTown") },
            { x: 74, y: 44, text: words("downtown") },
            { x: 62, y: 86, text: words("river") },
          ],
          route: { points: [{ x: 80, y: 33 }, { x: 45, y: 36 }, { x: 41, y: 50 }], to_label: words("pickup"), eta: words("eta"), color: "#0F766C", dark_color: "#3FC7B4", moving: true },
        },
      }),
  },
  {
    // 129.22 Masar B: the map tilted to a foggy horizon, a headline over the fog, standing pins.
    id: "horizon",
    icon: "landscape",
    keywords: "horizon perspective tilted 3d fog headline standing pins",
    make: ({ newId, words }) =>
      map(newId(), "horizon", 460, {
        map_drawing: {
          accent: "#F2B544",
          chip: "#21403C",
          markers: [
            { x: 20, y: 62 },
            { x: 88, y: 70 },
            { x: 64, y: 88 },
          ],
          me: true,
          me_at: { x: 50, y: 78 },
          labels: [{ x: 56, y: 92, text: words("downtown") }],
          route: { points: [{ x: 86, y: 58 }, { x: 86, y: 68 }, { x: 50, y: 68 }, { x: 50, y: 78 }], to_label: words("pickup"), eta: words("eta"), icon: "local_taxi", color: "#0F766C", dark_color: "#3FC7B4" },
        },
      }),
  },
  {
    // 129.23 Lamha A: two inks, the taxis as roof signs, a checker band at the foot.
    id: "two_ink",
    icon: "local_taxi",
    keywords: "two ink print yellow navy taxi roof sign checker band roundabout hatched",
    make: ({ newId, words }) =>
      map(newId(), "two_ink", 440, {
        map_drawing: {
          accent: "#F5B700",
          chip: "#1C2541",
          markers: TAXIS,
          me: true,
          me_at: { x: 50, y: 70 },
          live: true,
          labels: [
            { x: 42, y: 46, text: words("downtown") },
            { x: 8, y: 76, text: words("river") },
          ],
          route: { points: [{ x: 78, y: 64 }, { x: 50, y: 70 }], eta: words("eta") },
        },
      }),
  },
  {
    // 129.23 Lamha B: a radar lens with its minute rings, a slow sweep, taxis with their trails.
    id: "lens",
    icon: "radar",
    keywords: "radar lens circle rings minutes sweep nearby taxis trails",
    make: ({ newId, words }) =>
      map(newId(), "lens", 380, {
        map_drawing: {
          accent: "#F5B700",
          chip: "#1C2541",
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
            { x: 9, y: 30, text: words("oldTown") },
            { x: 70, y: 50, text: words("riverside") },
          ],
        },
      }),
  },
  {
    // 129.24 Sahm B: the shipment's route, done solid and the rest dashed, the courier pulsing on it; live in the app.
    id: "route",
    icon: "route",
    keywords: "live route tracking shipment ride courier driver progress pickup drop off",
    make: ({ newId, words }) =>
      map(newId(), null, 470, {
        background: "#E8EDF2",
        dark_background: "#0C1623",
        map_drawing: {
          accent: "#F2A12E",
          chip: "#0D1B2A",
          labels: [
            { x: 62, y: 24, text: words("downtown") },
            { x: 32, y: 94, text: words("oldTown") },
          ],
          route: { points: [{ x: 80, y: 36 }, { x: 80, y: 88 }, { x: 33, y: 88 }], at: 42, from_label: words("street"), eta: words("courier"), icon: "two_wheeler", color: "#1F6FB2", dark_color: "#6DB3F2", live: "shipment" },
        },
      }),
  },
];
