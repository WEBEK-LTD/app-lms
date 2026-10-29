import type { Art, Shape } from "./art";
import { PICTURES, type PictureName } from "./pictures";

/**
 * 110.3 The drawn pictures of the ready-made designs' pages (lib/pages/designs):
 * the people of their teams, their photo galleries and their cards. Drawn
 * like the demo apps' (lib/demo/art.ts): flat shapes, nothing that looks
 * like a photo of a person. Saved as public/design-pictures/art-<name>.png by
 * tests/unit/design-art.test.ts (`YALLAPP_DRAW_PICTURES=1`); the designs
 * name them `picture:art-<name>.png`.
 */

export interface DesignPicture {
  art: Art;
  width: number;
  height: number;
}

const c = (x: number, y: number, r: number, color: string, alpha?: number): Shape => ({ kind: "circle", x, y, r, color, alpha });
const r = (x: number, y: number, w: number, h: number, radius: number, color: string, alpha?: number): Shape => ({ kind: "rect", x, y, w, h, r: radius, color, alpha });
const p = (points: [number, number][], color: string, alpha?: number): Shape => ({ kind: "poly", points, color, alpha });

const WHITE = "#FFFFFF";
const CREAM = "#F4EFE6";
const INK = "#2B2950";

// People: a head and shoulders, with hair cut short or long, a headscarf, a beard or glasses.

type Hair = "short" | "long" | "scarf";

function someone(skin: string, top: string, hair: string, style: Hair, extra: { beard?: boolean; glasses?: boolean; coat?: boolean } = {}): Shape[] {
  const shapes: Shape[] = [];
  if (style === "long") shapes.push(r(33, 30, 34, 40, 14, hair));
  if (style === "scarf") shapes.push(c(50, 42, 20, hair), r(30, 42, 40, 30, 12, hair));
  shapes.push(r(24, 62, 52, 50, 24, extra.coat ? WHITE : top));
  if (extra.coat) shapes.push(p([[44, 62], [56, 62], [50, 76]], top), r(49, 76, 2, 24, 1, "#D5DCE0"));
  shapes.push(c(50, style === "scarf" ? 44 : 42, style === "scarf" ? 12.5 : 15, skin));
  if (style !== "scarf") shapes.push(p([[35, 40], [38, 27], [50, 22], [62, 27], [65, 40], [60, 32], [40, 32]], hair));
  if (extra.beard) shapes.push(p([[37, 45], [63, 45], [60, 53], [50, 58], [40, 53]], hair), c(50, 44, 6, skin));
  if (extra.glasses) {
    for (const x of [44, 56]) shapes.push(c(x, 42, 4, "#2B2B2B"), c(x, 42, 2.8, skin));
    shapes.push(r(47.5, 41.4, 5, 1.2, 0.6, "#2B2B2B"));
  }
  return shapes;
}

const PERSON_SIZE = { width: 256, height: 256 };
const PHOTO_SIZE = { width: 640, height: 480 };

const PEOPLE: Record<string, Art> = {
  "person-1": { from: "#E7F2EF", to: "#A9D1C7", shapes: someone("#E9C4A8", "#2F6F62", "#3B2A1E", "long") },
  "person-2": { from: "#E3ECF6", to: "#A8C4DE", shapes: someone("#C99B7D", "#24476B", "#2B2B2B", "short", { beard: true }) },
  "person-3": { from: "#F7E4EA", to: "#D98CA0", shapes: someone("#D9A88A", "#C0566B", "#5A361E", "long") },
  "person-4": { from: "#ECEFEA", to: "#B8C6B9", shapes: someone("#B98466", "#5D6B66", "#1E1A17", "short") },
  "person-5": { from: "#F1ECF6", to: "#C9B9DE", shapes: someone("#E8C4A0", "#6A4C93", "#B03A5B", "scarf") },
  "person-6": { from: "#FFF1D9", to: "#F3BF62", shapes: someone("#C68E63", "#E39B2E", "#1F1A17", "short", { glasses: true }) },
  "person-7": { from: "#E3EEF8", to: "#8DB8DF", shapes: someone("#F0D2B6", "#2E7BC2", "#A0522D", "long") },
  "person-8": { from: "#DCEBDD", to: "#9DBF86", shapes: someone("#A9734F", "#3E7A4A", "#1E1A17", "short", { beard: true }) },
  "person-9": { from: "#E6F2EA", to: "#7DB894", shapes: someone("#E9C4A8", "#8A3B2B", "#2F6F62", "scarf") },
  "person-10": { from: "#FBE8D8", to: "#E59A5C", shapes: someone("#C99B7D", "#F2B544", "#3B2A1E", "long", { glasses: true }) },
  "person-11": { from: "#E9E2F2", to: "#B7A8D6", shapes: someone("#B98466", INK, "#2B2B2B", "short") },
  "person-12": { from: "#EEF4FA", to: "#BFD5EA", shapes: someone("#D9A88A", "#7FA7C9", "#5A361E", "short", { glasses: true, beard: true }) },
  "doctor-1": { from: "#E6F0F5", to: "#A9C9DA", shapes: someone("#E9C4A8", "#2C6A8A", "#3B2A1E", "long", { coat: true }) },
  "doctor-2": { from: "#EEF4FA", to: "#BFD5EA", shapes: someone("#C99B7D", "#5D6B66", "#2B2B2B", "short", { coat: true, beard: true }) },
  "doctor-3": { from: "#F1ECF6", to: "#C9B9DE", shapes: someone("#E8C4A0", "#6A4C93", "#24476B", "scarf", { coat: true }) },
  "doctor-4": { from: "#EDF3EE", to: "#B9D3BF", shapes: someone("#B98466", "#3F7F5B", "#1E1A17", "short", { coat: true, glasses: true }) },
};

// Places and things, in a 100 × 100 square with room on each side (the pictures are 4:3).

const floor = (color: string, y = 80): Shape => r(-80, y, 260, 40, 0, color);

function plant(x: number, y: number, pot = "#C2643A", leaf = "#4F8A5B"): Shape[] {
  return [c(x - 4, y - 10, 6, leaf), c(x + 4, y - 12, 6, leaf), c(x, y - 18, 6, "#5E9C64"), r(x - 6, y - 6, 12, 12, 2, pot)];
}

function car(body: string, glass: string, dx = 0, dy = 0, s = 1): Shape[] {
  const at = (x: number, y: number): [number, number] => [50 + (x - 50) * s + dx, 58 + (y - 58) * s + dy];
  const [bx, by] = at(16, 50);
  const [wx1, wy] = at(32, 68);
  const [wx2] = at(68, 68);
  return [
    p([at(30, 50), at(38, 36), at(64, 36), at(74, 50)], body),
    p([at(34, 49), at(40, 39), at(50, 39), at(50, 49)], glass),
    p([at(53, 49), at(53, 39), at(62, 39), at(69, 49)], glass),
    r(bx, by, 68 * s, 18 * s, 6 * s, body),
    r(at(80, 54)[0], at(80, 54)[1], 4 * s, 4 * s, 2 * s, "#F2B544"),
    c(wx1, wy, 8 * s, INK),
    c(wx1, wy, 3.5 * s, "#D6D2CC"),
    c(wx2, wy, 8 * s, INK),
    c(wx2, wy, 3.5 * s, "#D6D2CC"),
  ];
}

const road = (): Shape[] => [r(-80, 78, 260, 26, 0, INK, 0.8), ...[0, 1, 2, 3, 4].map((i) => r(-60 + i * 50, 89, 24, 3, 1.5, WHITE))];

/** A head with hair messy (before) or cut and shaped (after), for a salon's before-and-after. */
function hairdo(after: boolean): Shape[] {
  const hair = "#5A361E";
  const messy: Shape[] = [c(34, 34, 10, hair), c(46, 26, 11, hair), c(60, 27, 10, hair), c(68, 38, 9, hair), c(30, 48, 8, hair), c(71, 52, 7, hair), c(52, 20, 6, hair, 0.8)];
  const neat: Shape[] = [r(33, 26, 34, 44, 15, hair), p([[33, 40], [38, 24], [52, 18], [66, 26], [67, 40], [58, 30], [40, 32]], "#6B4226")];
  return [...(after ? neat : messy), r(26, 66, 48, 40, 20, after ? "#C0566B" : "#8A8A8A"), c(50, 46, 14, "#E9C4A8"), ...(after ? [c(70, 22, 3, WHITE, 0.9), c(76, 30, 2, WHITE, 0.7)] : [])];
}

/** A shop front with a striped awning. */
function shopFront(awning: string, wall: string): Shape[] {
  return [
    floor("#C9B892", 84),
    r(10, 30, 80, 54, 2, wall),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => r(10 + i * 10, 24, 10, 14, 0, i % 2 ? WHITE : awning)),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => c(15 + i * 10, 38, 5, i % 2 ? WHITE : awning)),
    r(16, 48, 36, 30, 2, "#9CC3DD"),
    r(58, 48, 24, 36, 2, "#5D6B66"),
    c(62, 66, 1.4, "#F2B544"),
    r(20, 64, 10, 14, 2, "#C0566B", 0.8),
    r(34, 58, 12, 20, 2, "#F2B544", 0.8),
  ];
}

const DRAWN: Record<string, Art> = {
  // Places
  "place-shop": { from: "#FBE9D6", to: "#F2D2AE", shapes: shopFront("#C0566B", CREAM) },
  "place-cafe": {
    from: "#F1E4D6",
    to: "#C9A27E",
    shapes: [
      floor("#8A5A2B"),
      r(16, 18, 30, 22, 2, "#9CC3DD"),
      r(54, 18, 30, 22, 2, "#9CC3DD"),
      r(48, 0, 2, 22, 1, INK),
      p([[42, 22], [56, 22], [52, 30], [46, 30]], "#F2B544"),
      r(14, 58, 30, 4, 2, "#5A361E"),
      r(27, 62, 4, 18, 1, "#5A361E"),
      r(58, 58, 30, 4, 2, "#5A361E"),
      r(71, 62, 4, 18, 1, "#5A361E"),
      r(22, 50, 8, 8, 2, WHITE),
      r(64, 50, 8, 8, 2, WHITE),
      ...plant(100, 80),
    ],
  },
  "place-salon": {
    from: "#F7E4EA",
    to: "#E8B4C2",
    shapes: [
      floor("#C9A27E"),
      r(30, 12, 40, 44, 20, "#B98466"),
      r(34, 16, 32, 36, 16, "#DCEBF2"),
      c(42, 26, 4, WHITE, 0.6),
      r(30, 54, 40, 4, 2, "#5A361E"),
      r(36, 58, 28, 10, 4, "#C0566B"),
      r(34, 62, 32, 14, 5, "#C0566B"),
      r(48, 76, 4, 6, 1, INK),
      r(40, 80, 20, 3, 1.5, INK),
      ...plant(90, 80),
    ],
  },
  "place-office": {
    from: "#E3ECF6",
    to: "#A8C4DE",
    shapes: [
      floor("#5D6B66", 82),
      r(8, 14, 34, 26, 2, WHITE),
      p([[10, 38], [20, 26], [28, 32], [34, 24], [40, 38]], "#7FA7C9"),
      r(18, 56, 64, 4, 2, "#8A5A2B"),
      r(22, 60, 4, 22, 1, "#8A5A2B"),
      r(74, 60, 4, 22, 1, "#8A5A2B"),
      r(34, 38, 32, 18, 2, INK),
      r(36, 40, 28, 13, 1, "#9CC3DD"),
      r(46, 55, 8, 2, 1, INK),
      r(64, 48, 8, 8, 2, CREAM),
      ...plant(96, 82),
    ],
  },
  "place-clinic": {
    from: "#E6F0F5",
    to: "#A9C9DA",
    shapes: [
      floor("#B7C4CC"),
      r(40, 12, 20, 20, 4, "#2C6A8A"),
      r(47, 15, 6, 14, 1, WHITE),
      r(43, 19, 14, 6, 1, WHITE),
      r(14, 50, 72, 30, 3, WHITE),
      r(14, 50, 72, 6, 3, "#2C6A8A"),
      r(24, 62, 18, 3, 1.5, "#5D6B66", 0.6),
      r(24, 68, 12, 3, 1.5, "#5D6B66", 0.6),
      ...plant(100, 80, "#2C6A8A"),
      r(-14, 62, 11, 18, 3, "#7FA7C9"),
      r(-1, 62, 11, 18, 3, "#7FA7C9"),
    ],
  },
  "place-gym": {
    from: "#ECEBFA",
    to: "#A8A3E3",
    shapes: [
      floor("#2B3A4A"),
      r(6, 40, 4, 40, 1, "#5D6B66"),
      r(46, 40, 4, 40, 1, "#5D6B66"),
      r(6, 52, 44, 3, 1.5, "#5D6B66"),
      r(6, 66, 44, 3, 1.5, "#5D6B66"),
      ...[12, 22, 32].map((x) => c(x + 2, 49, 4, INK)),
      ...[12, 22, 32].map((x) => c(x + 2, 63, 4, "#B5471B")),
      c(70, 70, 9, INK),
      r(64, 56, 12, 4, 2, INK),
      r(64, 56, 3, 10, 1.5, INK),
      r(73, 56, 3, 10, 1.5, INK),
      r(84, 20, 26, 18, 2, WHITE, 0.7),
    ],
  },
  "place-studio": {
    from: "#EAF3EC",
    to: "#C7E0CD",
    shapes: [
      floor("#C9A27E"),
      r(30, 10, 40, 40, 2, WHITE),
      r(32, 12, 17, 36, 1, "#DCEBF2"),
      r(51, 12, 17, 36, 1, "#DCEBF2"),
      r(4, 72, 40, 6, 3, "#2E7D5B"),
      r(54, 72, 40, 6, 3, "#A3B18A"),
      c(94, 62, 5, "#F2B544", 0.8),
      ...plant(4, 72),
    ],
  },
  "place-stage": {
    from: "#3B2A5E",
    to: "#14112A",
    shapes: [
      p([[18, 0], [34, 0], [44, 72], [8, 72]], "#F2B544", 0.16),
      p([[66, 0], [82, 0], [92, 72], [56, 72]], "#F2B544", 0.16),
      r(-80, 66, 260, 10, 0, "#5B2A86"),
      r(-80, 76, 260, 30, 0, "#2B2041"),
      ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => c(-10 + i * 15, 86, 5, "#14112A")),
      r(46, 46, 2, 20, 1, "#D6D2CC"),
      c(47, 44, 3, "#D6D2CC"),
    ],
  },
  "place-hall": {
    from: "#F4EEE6",
    to: "#E2CDB5",
    shapes: [
      floor("#B7A48C"),
      ...[0, 1, 2].map((i) => r(4 + i * 32, 22, 24, 36, 12, "#9CC3DD")),
      ...[0, 1, 2, 3].map((i) => r(4 + i * 28, 66, 18, 4, 2, WHITE)),
      ...[0, 1, 2, 3].map((i) => r(11 + i * 28, 70, 4, 10, 1, "#8A5A2B")),
      c(50, 8, 4, "#F2B544"),
    ],
  },
  // Before and after
  "hair-before": { from: "#ECEFEA", to: "#B8C6B9", shapes: hairdo(false) },
  "hair-after": { from: "#F7E4EA", to: "#D98CA0", shapes: hairdo(true) },
  "room-before": {
    from: "#ECEFEA",
    to: "#C9C9C0",
    shapes: [
      floor("#A89A86"),
      p([[34, 20], [58, 16], [60, 32], [36, 36]], WHITE),
      r(18, 56, 60, 22, 7, "#8A8A8A"),
      r(10, 70, 16, 12, 2, "#C9955B"),
      r(70, 66, 18, 16, 2, "#C9955B"),
      ...[22, 40, 58, 84].map((x, i) => c(x, 84 + (i % 2) * 3, 3, "#5D6B66")),
      p([[86, 38], [96, 32], [98, 44], [88, 48]], "#E39B2E", 0.8),
    ],
  },
  // School
  "school-classroom": {
    from: "#E9F2E6",
    to: "#BFD8B8",
    shapes: [
      floor("#C9A27E"),
      r(14, 10, 72, 34, 2, "#2F5D46"),
      r(20, 18, 30, 2, 1, WHITE, 0.8),
      r(20, 24, 22, 2, 1, WHITE, 0.8),
      c(68, 26, 6, WHITE, 0.25),
      ...[0, 1, 2].map((i) => r(6 + i * 32, 60, 24, 4, 2, "#8A5A2B")),
      ...[0, 1, 2].map((i) => r(10 + i * 32, 64, 3, 14, 1, "#8A5A2B")),
      ...[0, 1, 2].map((i) => r(24 + i * 32, 64, 3, 14, 1, "#8A5A2B")),
      ...[0, 1, 2].map((i) => r(12 + i * 32, 54, 10, 6, 1, ["#E39B2E", "#2E7BC2", "#C0566B"][i]!)),
    ],
  },
  "school-library": {
    from: "#F4EEE6",
    to: "#E2CDB5",
    shapes: [
      floor("#8A5A2B", 84),
      ...[0, 1, 2].flatMap((row) => [
        r(4, 14 + row * 24, 92, 3, 1, "#5A361E"),
        ...Array.from({ length: 11 }, (_, i) => r(6 + i * 8.2, 14 + row * 24 - 16 + (i % 3), 6, 16 - (i % 3), 1, ["#C0566B", "#2E7BC2", "#E39B2E", "#3E7A4A", "#6A4C93"][(i + row) % 5]!)),
      ]),
      r(30, 70, 40, 4, 2, "#5A361E"),
      r(34, 74, 3, 10, 1, "#5A361E"),
      r(63, 74, 3, 10, 1, "#5A361E"),
      p([[40, 70], [50, 64], [60, 70]], WHITE),
    ],
  },
  "school-sports": {
    from: "#D9EBF7",
    to: "#9CC3DD",
    shapes: [
      r(-80, 66, 260, 40, 0, "#6FA35E"),
      r(-80, 66, 260, 2, 0, WHITE, 0.8),
      r(70, 30, 3, 38, 1, WHITE),
      r(98, 30, 3, 38, 1, WHITE),
      r(70, 30, 31, 3, 1, WHITE),
      c(36, 72, 8, WHITE),
      p([[33, 67], [39, 67], [41, 72], [36, 76], [31, 72]], INK),
      c(16, 18, 9, "#F2B544"),
    ],
  },
  "school-lab": {
    from: "#E3EEF8",
    to: "#A8C4DE",
    shapes: [
      floor("#5D6B66"),
      r(4, 62, 92, 6, 2, WHITE),
      r(26, 30, 8, 16, 2, "#D5DCE0"),
      p([[24, 46], [36, 46], [44, 62], [16, 62]], "#D5DCE0"),
      p([[20, 54], [40, 54], [44, 62], [16, 62]], "#3E7A4A"),
      r(56, 36, 6, 26, 3, "#D5DCE0"),
      r(56, 48, 6, 14, 3, "#C0566B"),
      r(68, 36, 6, 26, 3, "#D5DCE0"),
      r(68, 52, 6, 10, 3, "#2E7BC2"),
      c(30, 24, 2.4, "#3E7A4A", 0.6),
      c(34, 18, 1.8, "#3E7A4A", 0.5),
    ],
  },
  "school-art": {
    from: "#FFF3E2",
    to: "#F4C98E",
    shapes: [
      floor("#C9A27E"),
      p([[38, 84], [48, 20], [52, 20], [62, 84]], "#8A5A2B"),
      r(28, 24, 44, 34, 2, WHITE),
      c(42, 38, 7, "#2E7BC2", 0.8),
      c(56, 44, 8, "#C0566B", 0.8),
      r(36, 48, 28, 4, 2, "#3E7A4A", 0.8),
      r(76, 60, 26, 16, 8, CREAM),
      ...["#C0566B", "#2E7BC2", "#F2B544", "#3E7A4A"].map((color, i) => c(82 + i * 5, 66 + (i % 2) * 4, 2.4, color)),
    ],
  },
  "school-bus": {
    from: "#FFF1D9",
    to: "#F3D6A0",
    shapes: [
      ...road(),
      r(10, 34, 80, 40, 6, "#F2B544"),
      ...[0, 1, 2, 3].map((i) => r(16 + i * 15, 40, 11, 12, 2, "#9CC3DD")),
      r(76, 40, 10, 22, 2, "#9CC3DD"),
      r(10, 58, 80, 3, 1, INK, 0.6),
      c(26, 76, 7, INK),
      c(26, 76, 3, "#D6D2CC"),
      c(74, 76, 7, INK),
      c(74, 76, 3, "#D6D2CC"),
    ],
  },
  // Shop items
  "item-dress": { from: "#F7E4EA", to: "#E8B4C2", shapes: [r(46, 16, 8, 6, 2, "#8A8A8A"), p([[40, 22], [60, 22], [58, 40], [72, 84], [28, 84], [42, 40]], "#B03A5B"), r(40, 38, 20, 4, 2, "#7A2340")] },
  "item-shirt": {
    from: "#E3ECF6",
    to: "#A8C4DE",
    shapes: [p([[36, 22], [44, 18], [56, 18], [64, 22], [82, 36], [74, 46], [66, 40], [66, 82], [34, 82], [34, 40], [26, 46], [18, 36]], "#24476B"), p([[44, 18], [50, 28], [56, 18]], WHITE), ...[40, 52, 64].map((y) => c(50, y, 1.6, WHITE))],
  },
  "item-bag": { from: "#FBE8D8", to: "#E59A5C", shapes: [r(38, 20, 24, 24, 12, "#8A5A2B"), r(42, 24, 16, 20, 8, "#FBE8D8"), r(24, 40, 52, 42, 6, "#A0522D"), r(24, 40, 52, 8, 4, "#8A3B2B"), r(46, 50, 8, 6, 2, "#F2B544")] },
  "item-shoes": {
    from: "#ECEFEA",
    to: "#B8C6B9",
    shapes: [p([[14, 66], [20, 46], [30, 46], [36, 56], [56, 62], [60, 72], [14, 72]], INK), r(14, 72, 46, 5, 2, WHITE), p([[44, 52], [50, 34], [60, 34], [66, 44], [84, 50], [88, 60], [44, 60]], "#C0566B"), r(44, 60, 44, 5, 2, WHITE)],
  },
  "item-phone": { from: "#E9E2F2", to: "#B7A8D6", shapes: [r(34, 12, 32, 76, 7, INK), r(37, 18, 26, 62, 3, "#9CC3DD"), p([[37, 60], [50, 46], [63, 60], [63, 80], [37, 80]], "#6A4C93", 0.6), r(45, 83, 10, 2, 1, "#5D6B66")] },
  "item-laptop": { from: "#E3EEF8", to: "#8DB8DF", shapes: [r(20, 24, 60, 40, 3, "#5D6B66"), r(23, 27, 54, 34, 1, "#DCEBF2"), r(28, 34, 24, 4, 2, "#2E7BC2"), r(28, 42, 36, 3, 1.5, "#5D6B66", 0.5), p([[10, 66], [90, 66], [84, 72], [16, 72]], "#8A8A8A")] },
  "item-headphones": {
    from: "#FFF1D9",
    to: "#F3BF62",
    shapes: [r(26, 20, 48, 48, 24, INK), r(32, 26, 36, 46, 18, "#FFF1D9"), r(20, 48, 16, 26, 7, INK), r(64, 48, 16, 26, 7, INK), r(24, 52, 8, 18, 4, "#E39B2E"), r(68, 52, 8, 18, 4, "#E39B2E")],
  },
  "item-watch": { from: "#EAF3EC", to: "#A9D1B5", shapes: [r(40, 10, 20, 80, 8, "#2E7D5B"), r(32, 32, 36, 36, 10, INK), r(35, 35, 30, 30, 8, "#DCEBF2"), r(49, 42, 2, 10, 1, INK), r(49, 50, 9, 2, 1, INK)] },
  "item-fruit": { from: "#FFF1D9", to: "#F4C98E", shapes: [r(18, 54, 64, 26, 10, "#B98250"), c(34, 48, 10, "#C8423B"), c(52, 44, 11, "#F2B544"), c(68, 50, 9, "#6E9E4F"), r(33, 34, 2, 6, 1, "#5A361E"), c(44, 56, 8, "#E0552F"), c(60, 58, 7, "#C8423B")] },
  "item-veg": { from: "#E6F2EA", to: "#9DBF86", shapes: [p([[30, 30], [36, 30], [40, 80], [26, 80]], "#E0552F"), c(33, 26, 6, "#4F8A5B"), c(56, 56, 16, "#5E9C64"), c(56, 56, 10, "#7DB894"), c(76, 66, 10, "#6A4C93"), r(75, 52, 2, 6, 1, "#4F8A5B")] },
  "item-bread": { from: "#FBE9D6", to: "#E7B98E", shapes: [r(18, 44, 64, 30, 15, "#C2843A"), ...[0, 1, 2].map((i) => p([[32 + i * 14, 50], [38 + i * 14, 48], [34 + i * 14, 62], [28 + i * 14, 64]], "#F2D2AE", 0.8)), r(20, 74, 60, 4, 2, "#8A5A2B")] },
  // Cars
  "car-yellow": { from: "#FFF6D9", to: "#F3D6A0", shapes: [...road(), ...car("#F5B400", INK, 0, 8)] },
  "car-dark": { from: "#DCE3EA", to: "#9AABBD", shapes: [...road(), ...car(INK, "#9CC3DD", 0, 8)] },
  "car-teal": { from: "#D9F1EC", to: "#8FD3C6", shapes: [...road(), ...car("#1F9D8A", "#BFE6DF", 0, 8)] },
  // Partners' emblems: shapes only, no names.
  "emblem-1": { from: "#E6F2EA", to: "#E6F2EA", shapes: [c(50, 50, 30, "#3E7A4A"), p([[50, 28], [64, 50], [50, 72], [36, 50]], WHITE)] },
  "emblem-2": { from: "#E3EEF8", to: "#E3EEF8", shapes: [r(22, 22, 56, 56, 14, "#2E7BC2"), c(50, 50, 14, WHITE), c(50, 50, 7, "#2E7BC2")] },
  "emblem-3": { from: "#FFF1D9", to: "#FFF1D9", shapes: [p([[50, 18], [82, 74], [18, 74]], "#E39B2E"), p([[50, 42], [62, 66], [38, 66]], WHITE)] },
  "emblem-4": { from: "#F7E4EA", to: "#F7E4EA", shapes: [c(40, 50, 20, "#C0566B", 0.9), c(60, 50, 20, "#6A4C93", 0.9)] },
};

/** Demo pictures (lib/demo/pictures.ts) the designs' pages show too. */
const REUSED: PictureName[] = [
  "course-ux",
  "course-arabic",
  "course-excel",
  "course-photo",
  "course-marketing",
  "course-english",
  "course-python",
  "course-business",
  "product-roses",
  "product-coffee",
  "product-candle",
  "product-gift",
  "product-tea",
  "service-cut",
  "service-colour",
  "service-massage",
  "service-nails",
  "service-facial",
  "visit-checkup",
  "visit-followup",
  "visit-dental",
  "visit-children",
  "visit-physio",
  "class-yoga",
  "class-spin",
  "class-hiit",
  "class-pilates",
  "class-pt",
  "coach-selin",
  "coach-can",
  "coach-mira",
  "home-zamalek",
  "home-maadi",
  "home-newcairo",
  "home-zayed",
  "home-heliopolis",
  "home-garden-city",
  "room-living",
  "room-kitchen",
  "room-bedroom",
  "article-harbour",
  "article-market",
  "article-tram",
  "article-stadium",
  "article-books",
  "article-bridge",
  "event-jazz",
  "event-film",
  "event-ceramics",
  "event-talk",
  "event-photo",
  "dish-breakfast",
  "dish-simit",
  "dish-wrap",
  "dish-burger",
  "dish-soup",
  "dish-cheesecake",
  "dish-baklava",
  "drink-coffee",
  "drink-latte",
  "campaign-parcels",
  "campaign-volunteers",
  "campaign-lunch",
  "service-sameday",
  "service-express",
  "service-documents",
  "banner-delivery",
  "banner-food",
  "banner-rides",
];

const PEOPLE_FROM_DEMO = new Set<string>(["coach-selin", "coach-can", "coach-mira"]);

/** Every picture, by its file in public/design-pictures. */
export const DESIGN_ART: Record<string, DesignPicture> = Object.fromEntries([
  ...Object.entries(PEOPLE).map(([name, art]) => [`art-${name}.png`, { art, ...PERSON_SIZE }] as const),
  ...Object.entries(DRAWN).map(([name, art]) => [`art-${name}.png`, { art, ...PHOTO_SIZE }] as const),
  ...REUSED.map((name) => [`art-${name}.png`, { art: PICTURES[name], ...(PEOPLE_FROM_DEMO.has(name) ? PERSON_SIZE : PHOTO_SIZE) }] as const),
]);
