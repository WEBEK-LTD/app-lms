import type { StudioMapDrawing, StudioMapStyle, StudioPlace } from "../pages/types";

/**
 * 129.21–129.24 The drawn map's premium looks, as data both drawers share:
 * Studio's canvas (components/studio/map-looks.tsx) and the app
 * (mobile/lib/modules/shared/pages/studio_map_looks.dart, the same numbers).
 * No map tiles: every look is drawn.
 *
 * - natural: a living map: a curved river with an island, cased streets and
 *   avenues, parks, a soft vignette (the Masar A board);
 * - horizon: the same city tilted in perspective to a foggy horizon, its
 *   pins standing on it (Masar B);
 * - two_ink: printed in two inks, the markers' accent and tile (navy on
 *   taxi-yellow by day, yellow on navy by night): hatched water, dotted
 *   parks, a roundabout, a checker band at its foot (Lamha A);
 * - lens: a round radar lens with dashed 1, 3 and 5 minute rings and a slow
 *   sweep (Lamha B).
 *
 * Paths are in a frame 375 wide whose height is the element's, written in
 * thousandths of it (`y` 0 to 1000), so a map fits its element whatever its
 * height; the lens is a 320 square; the horizon's plane is 900 × 1000.
 */

/** The look a style's markers have when the element doesn't say. */
export function markerLook(drawing: StudioMapDrawing): "tile" | "car" | "sign" | "token" {
  if (drawing.marker) return drawing.marker;
  switch (drawing.style) {
    case "natural":
    case "horizon":
      return "car";
    case "two_ink":
      return "sign";
    case "lens":
      return "token";
    default:
      return "tile";
  }
}

/** Which way each marker heads (a car's nose, a token's trail), by its place in the list. */
export const MAP_HEADINGS = [12, -80, 4, 92, -6, -82, -84, 30, 170, -100, 60, -30] as const;

/** #RRGGBB mixed towards `to` by `t` (0 to 1). */
export function mix(from: string, to: string, t: number): string {
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const ch = (shift: number) => Math.round(((a >> shift) & 255) + (((b >> shift) & 255) - ((a >> shift) & 255)) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1).toUpperCase()}`;
}

/** #RRGGBB at a strength, for CSS. */
export function rgba(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, opacity))})`;
}

/** A look's colours by day or by night. */
export interface MapPalette {
  land: string;
  water: string;
  park: string;
  road: string;
  casing: string;
  major: string;
  majorCasing: string;
  label: string;
  /** Labelled pins: their glass, its edge, their words, the disc and its icon. */
  glass: string;
  glassEdge: string;
  ink: string;
  pin: string;
  pinInk: string;
  /** The fog (horizon), the vignette's edge (natural), the band's second ink (two-ink). */
  edge: string;
}

/** The colours of a look: its land the element's background when it has one. */
export function mapPalette(style: StudioMapStyle | null | undefined, dark: boolean, accent: string, chip: string, land: string | null): MapPalette {
  const glassDay = { glass: "rgba(255, 255, 255, 0.86)", glassEdge: "rgba(255, 255, 255, 1)", ink: "#141B2E", pin: chip, pinInk: accent };
  const glassNight = { glass: "rgba(16, 23, 43, 0.8)", glassEdge: "rgba(255, 255, 255, 0.12)", ink: "#F1F2F7", pin: accent, pinInk: chip };
  switch (style) {
    case "natural":
      return dark
        ? { land: land ?? "#0C1716", water: "#05242A", park: "#0E2620", road: "#182A28", casing: "#0C1716", major: "#21433E", majorCasing: "#0A1312", label: "#86A39E", glass: "rgba(10, 24, 23, 0.66)", glassEdge: "rgba(160, 230, 220, 0.14)", ink: "#E9F5F3", pin: "#5FD3C2", pinInk: "#04201D", edge: "rgba(3, 8, 8, 0.6)" }
        : { land: land ?? "#EDF0EA", water: "#B5D9D2", park: "#CFE3CF", road: "#FFFFFF", casing: "#D5DDD6", major: "#FFFFFF", majorCasing: "#C6D1CA", label: "#4A5E5A", glass: "rgba(255, 255, 255, 0.74)", glassEdge: "rgba(255, 255, 255, 0.95)", ink: "#0B2422", pin: "#0B2422", pinInk: "#FFFFFF", edge: "rgba(206, 219, 213, 0.55)" };
    case "horizon":
      return dark
        ? { land: land ?? "#0B1A19", water: "#04262B", park: "#0D2A23", road: "#163230", casing: "#0B1A19", major: "#1F4C46", majorCasing: "#081413", label: "#7A9A95", glass: "#E9F5F3", glassEdge: "#E9F5F3", ink: "#04201D", pin: "#0F766C", pinInk: "#04201D", edge: land ?? "#061110" }
        : { land: land ?? "#E7EBE3", water: "#B7D9D2", park: "#CFE2CC", road: "#FFFFFF", casing: "#D3DAD1", major: "#FFFFFF", majorCasing: "#C3CDC4", label: "#56645F", glass: "#0B2422", glassEdge: "#0B2422", ink: "#FFFFFF", pin: "#5FD3C2", pinInk: "#FFFFFF", edge: land ?? "#F1EFE9" };
    case "two_ink": {
      // Day: the tile's ink on the accent; night: the accent on a deeper tile.
      const ground = land ?? (dark ? mix(chip, "#000000", 0.35) : accent);
      const ink = dark ? accent : chip;
      return {
        land: ground,
        water: dark ? mix(ground, accent, 0.33) : ink,
        park: dark ? mix(ground, accent, 0.47) : ink,
        road: dark ? mix(ground, accent, 0.47) : ink,
        casing: ink,
        major: ink,
        majorCasing: ink,
        label: ink,
        glass: dark ? accent : chip,
        glassEdge: dark ? accent : chip,
        ink: dark ? chip : "#FFFFFF",
        pin: dark ? chip : accent,
        pinInk: dark ? accent : chip,
        edge: dark ? chip : chip,
      };
    }
    case "lens":
      return dark
        ? { land: land ?? "#10172B", water: "#0C1F3A", park: "#122223", road: "#1D2742", casing: "#1D2742", major: "#2A3760", majorCasing: "#2A3760", label: "#8D96B0", ...glassNight, edge: "#0A0F1E" }
        : { land: land ?? "#EBEDF2", water: "#D3DCEA", park: "#DDE6D6", road: "#D2D7E2", casing: "#D2D7E2", major: "#B3BBCD", majorCasing: "#B3BBCD", label: "#4A5268", ...glassDay, edge: "#1C2541" };
    default:
      // The plain map's own colours (components/studio/covers.tsx MAP_COLORS).
      return dark
        ? { land: land ?? "#151B2B", water: "#1F3550", park: "#1B2A26", road: "#262E44", casing: "#262E44", major: "#262E44", majorCasing: "#262E44", label: "#8C93A8", ...glassNight, edge: "#151B2B" }
        : { land: land ?? "#ECE8DF", water: "#BCD7E2", park: "#D7E4CB", road: "#FFFFFF", casing: "#FFFFFF", major: "#FFFFFF", majorCasing: "#FFFFFF", label: "#6B6A60", ...glassDay, edge: "#ECE8DF" };
  }
}

/** 129.21 The living map, in the 375-wide frame (y in thousandths of its height). */
export const NATURAL = {
  water: "M 30 0 C 60 246 20 517 70 739 C 100 862 120 936 140 1000 L 330 1000 C 300 887 268 788 262 690 C 254 517 250 246 232 0 Z",
  island: "M 96 111 C 150 74 205 135 214 271 C 222 406 226 567 200 690 C 180 751 120 739 104 640 C 86 517 70 369 72 246 C 74 172 80 129 96 111 Z",
  /** x, y, width, height (y and height in thousandths), corner. */
  parks: [
    [96, 409, 56, 96, 18],
    [292, 207, 66, 57, 14],
    [128, 579, 58, 49, 14],
  ],
  streets: [
    "M 150 118 C 156 271 160 493 160 722",
    "M 92 185 L 206 204",
    "M 88 308 L 214 293",
    "M 100 640 L 204 616",
    "M 292 0 L 300 1000",
    "M 340 0 L 344 1000",
    "M 254 185 L 375 172",
    "M 256 291 L 375 278",
    "M 262 443 L 375 433",
    "M 266 616 L 375 606",
    "M 14 0 L 20 1000",
  ],
  avenues: ["M 0 392 L 375 347", "M 0 557 L 375 493", "M 40 825 L 375 751"],
} as const;

/** 129.23 The two-ink map (y in thousandths). */
export const TWO_INK = {
  water: "M 0 0 L 84 0 C 100 268 66 558 96 759 C 108 848 112 915 118 1000 L 0 1000 Z",
  shore: "M 84 0 C 100 268 66 558 96 759 C 108 848 112 915 118 1000",
  parks: [
    [148, 129, 64, 98, 10],
    [262, 670, 44, 143, 10],
  ],
  streets: [
    "M 236 527 L 375 335",
    "M 236 527 L 375 737",
    "M 236 527 L 236 0",
    "M 236 527 L 236 1000",
    "M 236 527 L 104 393",
    "M 236 527 L 120 737",
    "M 100 205 L 375 188",
    "M 112 866 L 375 848",
    "M 150 0 L 168 1000",
    "M 280 0 L 280 268",
  ],
  avenues: ["M 98 0 C 114 268 80 558 110 759 C 122 848 126 915 132 1000", "M 326 0 L 330 1000"],
  /** The roundabout's centre (y in thousandths) and radius. */
  roundabout: [236, 527, 28],
  /** The checker band's height at the map's foot, and its squares. */
  band: 16,
  square: 8,
} as const;

/** 129.23 The radar lens: its drawing in a 320 square, its rings' radii and minutes. */
export const LENS = {
  size: 320,
  river: "M 0 214 C 70 196 120 236 170 276 C 200 300 220 312 236 320 L 168 320 C 130 290 80 252 0 250 Z",
  park: [212, 60, 64, 46, 12],
  streets: ["M 0 40 L 320 70", "M 0 120 L 320 132", "M 0 180 L 320 176", "M 60 0 L 40 320", "M 120 0 L 112 210", "M 200 0 L 214 300", "M 268 0 L 290 320", "M 30 300 L 300 230"],
  avenues: ["M 0 196 C 70 178 124 214 178 254 C 210 278 236 296 262 320", "M 150 0 L 168 160 L 176 320"],
  rings: [
    [50, 1],
    [98, 3],
    [146, 5],
  ],
  /** Where the sweep's bright edge points (degrees clockwise from up) when still. */
  sweepAt: 50,
  /** One turn of the sweep, and of a vehicle driving the rest of its way. */
  turnMs: 8000,
} as const;

/** 129.22 The horizon's plane (900 × 1000), tilted back and seen from above its foot. */
export const HORIZON = {
  water: "M 160 0 C 240 320 120 640 200 1000 L 340 1000 C 260 640 380 320 300 0 Z",
  island: "M 214 250 C 262 300 280 420 252 540 C 232 604 202 566 198 480 C 192 400 192 300 214 250 Z",
  parks: [
    [680, 290, 96, 110, 22],
    [470, 590, 120, 84, 20],
    [40, 380, 80, 120, 20],
  ],
  streets: [
    "M 450 0 L 450 1000",
    "M 630 0 L 630 1000",
    "M 810 0 L 810 1000",
    "M 350 120 L 900 120",
    "M 350 260 L 900 260",
    "M 340 560 L 900 560",
    "M 340 700 L 900 700",
    "M 340 820 L 900 820",
    "M 350 960 L 900 960",
    "M 60 0 L 70 1000",
    "M 0 240 L 170 250",
    "M 0 660 L 150 650",
  ],
  avenues: ["M 322 0 C 402 320 282 640 362 1000", "M 0 470 L 900 430", "M 0 790 L 900 742"],
  /** The tilt, the viewer's distance and the plane's size. */
  tilt: 58,
  distance: 600,
  width: 900,
  depth: 1000,
} as const;

/** A path's commands with their points (M, L, C and Z, absolute). */
export type PathOp = { op: "M" | "L"; p: [number, number] } | { op: "C"; p: [number, number, number, number, number, number] } | { op: "Z" };

export function parsePath(d: string): PathOp[] {
  const tokens = d.split(/[\s,]+/).filter(Boolean);
  const ops: PathOp[] = [];
  for (let i = 0; i < tokens.length; ) {
    const op = tokens[i++]!;
    const n = (k: number) => tokens.slice(i, i + k).map(Number);
    if (op === "M" || op === "L") {
      ops.push({ op, p: n(2) as [number, number] });
      i += 2;
    } else if (op === "C") {
      ops.push({ op, p: n(6) as [number, number, number, number, number, number] });
      i += 6;
    } else ops.push({ op: "Z" });
  }
  return ops;
}

/** A path in thousandths of the frame's height, for a frame `height` high (SVG `d`). */
export function fitPath(d: string, height: number): string {
  const y = (v: number) => Math.round(((v * height) / 1000) * 100) / 100;
  return parsePath(d)
    .map((o) => (o.op === "Z" ? "Z" : o.op === "C" ? `C ${o.p[0]} ${y(o.p[1])} ${o.p[2]} ${y(o.p[3])} ${o.p[4]} ${y(o.p[5])}` : `${o.op} ${o.p[0]} ${y(o.p[1])}`))
    .join(" ");
}

/** The points along a path (each curve in 16 steps), as polygons (one per M). */
export function samplePath(d: string): [number, number][][] {
  const out: [number, number][][] = [];
  let line: [number, number][] = [];
  for (const o of parsePath(d)) {
    if (o.op === "M") {
      if (line.length) out.push(line);
      line = [o.p];
    } else if (o.op === "L") line.push(o.p);
    else if (o.op === "C") {
      const [x0, y0] = line[line.length - 1] ?? [0, 0];
      for (let k = 1; k <= 16; k++) {
        const t = k / 16;
        const u = 1 - t;
        line.push([u * u * u * x0 + 3 * u * u * t * o.p[0] + 3 * u * t * t * o.p[2] + t * t * t * o.p[4], u * u * u * y0 + 3 * u * u * t * o.p[1] + 3 * u * t * t * o.p[3] + t * t * t * o.p[5]]);
      }
    }
  }
  if (line.length) out.push(line);
  return out;
}

/** A rounded rectangle as points (each corner in 4 steps). */
export function roundedRect(x: number, y: number, w: number, h: number, r: number): [number, number][] {
  const pts: [number, number][] = [];
  const corners: [number, number, number][] = [
    [x + w - r, y + r, -90],
    [x + w - r, y + h - r, 0],
    [x + r, y + h - r, 90],
    [x + r, y + r, 180],
  ];
  for (const [cx, cy, from] of corners) {
    for (let k = 0; k <= 4; k++) {
      const a = ((from + (k * 90) / 4) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return pts;
}

/** A line `width` wide along `points`, as the outline of a band (left side, then the right side back). */
export function band(points: [number, number][], width: number): [number, number][] {
  const half = width / 2;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  points.forEach((p, i) => {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(points.length - 1, i + 1)]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    left.push([p[0] + nx * half, p[1] + ny * half]);
    right.push([p[0] - nx * half, p[1] - ny * half]);
  });
  return [...left, ...right.reverse()];
}

/**
 * 129.22 Where a point of the horizon's plane is seen, in a frame 375 wide
 * and `height` high: the plane's foot along the frame's foot, tilted back
 * from it, seen from `distance` above the middle of the frame's top
 * (CSS perspective 600 with its origin at 50% 0, rotateX(58deg) about the
 * plane's foot). `depth` is how near it is (1 at the foot).
 */
export function horizonPoint(u: number, v: number, height: number): { x: number; y: number; depth: number } {
  const tilt = (HORIZON.tilt * Math.PI) / 180;
  const dx = u - HORIZON.width / 2;
  const dy = v - HORIZON.depth;
  const z = dy * Math.sin(tilt);
  const f = HORIZON.distance / (HORIZON.distance - z);
  return { x: 187.5 + dx * f, y: (height + dy * Math.cos(tilt)) * f, depth: f };
}

/** 129.22 How near a spot `y` down the frame is on the plane (1 at its foot), for what stands there. */
export function horizonDepth(y: number, height: number): number {
  const tilt = (HORIZON.tilt * Math.PI) / 180;
  const d = HORIZON.distance;
  const dy = (d * (y - height)) / (d * Math.cos(tilt) + y * Math.sin(tilt));
  return d / (d - dy * Math.sin(tilt));
}

/** The plane's polygons as SVG `d`, seen in a frame `height` high. */
export function horizonPolygon(points: [number, number][], height: number): string {
  return (
    points
      .map(([u, v], i) => {
        const p = horizonPoint(u, v, height);
        return `${i ? "L" : "M"} ${Math.round(p.x * 100) / 100} ${Math.round(p.y * 100) / 100}`;
      })
      .join(" ") + " Z"
  );
}

/** 129.24 A route's length and the point and heading `share` (0 to 1) of the way along it. */
export function along(points: StudioPlace[], share: number): { x: number; y: number; heading: number; index: number } {
  const lens = points.slice(1).map((p, i) => Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y));
  const total = lens.reduce((a, b) => a + b, 0);
  let left = Math.max(0, Math.min(1, share)) * total;
  for (let i = 0; i < lens.length; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    if (left <= lens[i]! || i === lens.length - 1) {
      const t = lens[i]! ? Math.min(1, left / lens[i]!) : 0;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, heading: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI, index: i };
    }
    left -= lens[i]!;
  }
  const last = points[points.length - 1]!;
  return { x: last.x, y: last.y, heading: 0, index: Math.max(0, points.length - 2) };
}

/** 129.24 A route cut where the vehicle is: the part done and the part still to go. */
export function splitRoute(points: StudioPlace[], share: number): { done: StudioPlace[]; ahead: StudioPlace[]; at: { x: number; y: number; heading: number } } {
  const at = along(points, share);
  const here = { x: at.x, y: at.y };
  return { done: [...points.slice(0, at.index + 1), here], ahead: [here, ...points.slice(at.index + 1)], at };
}

/** 129.24 A line through points in pixels with its corners rounded (SVG `d`). */
export function roundedLine(points: [number, number][], radius = 18): string {
  if (points.length < 2) return "";
  const r2 = (v: number) => Math.round(v * 100) / 100;
  let d = `M ${r2(points[0]![0])} ${r2(points[0]![1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1]!;
    const [x, y] = points[i]!;
    const [nx, ny] = points[i + 1]!;
    const a = Math.hypot(x - px, y - py);
    const b = Math.hypot(nx - x, ny - y);
    const r = Math.min(radius, a / 2, b / 2);
    const sx = a ? x + ((px - x) / a) * r : x;
    const sy = a ? y + ((py - y) / a) * r : y;
    const ex = b ? x + ((nx - x) / b) * r : x;
    const ey = b ? y + ((ny - y) / b) * r : y;
    d += ` L ${r2(sx)} ${r2(sy)} Q ${r2(x)} ${r2(y)} ${r2(ex)} ${r2(ey)}`;
  }
  const last = points[points.length - 1]!;
  return `${d} L ${r2(last[0])} ${r2(last[1])}`;
}

/** The person's dot: where the element puts it, else a little under the middle (a lens: its centre). */
export function meSpot(drawing: StudioMapDrawing): StudioPlace {
  if (drawing.style === "lens") return { x: 50, y: 50 };
  return drawing.me_at ?? { x: 50, y: 56 };
}

/** 129.23 The lens's box in an element `w` × `h`: as wide as fits, at its foot. */
export function lensBox(w: number, h: number): { left: number; top: number; size: number } {
  const size = Math.max(120, Math.min(w - 48, h - 20));
  return { left: (w - size) / 2, top: h - 10 - size, size };
}
