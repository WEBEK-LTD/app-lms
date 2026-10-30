import type { Art, Shape } from "./art";

/**
 * Every picture the demo apps use, drawn in a 100 × 100 square (lib/demo/art.ts):
 * course covers, products, services, the team, homes and rooms, banners and
 * app icons. Flat shapes only; nothing that looks like a photo.
 */

const c = (x: number, y: number, r: number, color: string, alpha?: number): Shape => ({ kind: "circle", x, y, r, color, alpha });
const r = (x: number, y: number, w: number, h: number, radius: number, color: string, alpha?: number): Shape => ({ kind: "rect", x, y, w, h, r: radius, color, alpha });
const p = (points: [number, number][], color: string, alpha?: number): Shape => ({ kind: "poly", points, color, alpha });

/** A brush stroke: round dots close together along a line through `points`. */
function stroke(points: [number, number][], width: number, color: string): Shape[] {
  const out: Shape[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (width / 3)));
    for (let s = 0; s < steps; s++) out.push(c(x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps, width / 2, color));
  }
  const [lx, ly] = points[points.length - 1]!;
  out.push(c(lx, ly, width / 2, color));
  return out;
}

const WHITE = "#FFFFFF";
const CREAM = "#F4EFE6";

// Shared drawings, placed with an offset (dx) so banners can put them to the side.

function cap(color: string, accent: string, dx = 0, dy = 0): Shape[] {
  return [
    p([[34 + dx, 50 + dy], [66 + dx, 50 + dy], [66 + dx, 62 + dy], [50 + dx, 68 + dy], [34 + dx, 62 + dy]], color, 0.85),
    p([[50 + dx, 28 + dy], [82 + dx, 42 + dy], [50 + dx, 56 + dy], [18 + dx, 42 + dy]], color),
    r(76 + dx, 42 + dy, 1.6, 16, 0.8, accent),
    c(76.8 + dx, 59 + dy, 2.8, accent),
  ];
}

function tulip(x: number, y: number, color: string, stem: string): Shape[] {
  return [
    p([[x - 0.9, y + 8], [x + 0.9, y + 8], [x + 0.9, y + 40], [x - 0.9, y + 40]], stem),
    p([[x, y + 22], [x + 9, y + 14], [x + 1, y + 28]], stem),
    p([[x - 6, y - 6], [x - 3, y], [x, y - 7], [x + 3, y], [x + 6, y - 6], [x + 6, y + 4], [x, y + 10], [x - 6, y + 4]], color),
  ];
}

function house(roof: string, wall: string, door: string, glass: string, dx = 0): Shape[] {
  return [
    r(24 + dx, 48, 52, 36, 2, wall),
    p([[18 + dx, 50], [50 + dx, 26], [82 + dx, 50]], roof),
    r(46 + dx, 66, 9, 18, 1, door),
    r(30 + dx, 57, 10, 9, 1, glass),
    r(61 + dx, 57, 10, 9, 1, glass),
  ];
}

function building(wall: string, glass: string, door: string): Shape[] {
  const windows: Shape[] = [];
  for (let col = 0; col < 3; col++) for (let row = 0; row < 6; row++) windows.push(r(35 + col * 11, 27 + row * 8.5, 7, 5.5, 1, glass));
  return [r(30, 21, 40, 66, 2, wall), ...windows, r(45, 79, 10, 8, 1, door)];
}

const ground = (color: string): Shape => r(-80, 86, 260, 20, 0, color);

function palm(x: number): Shape[] {
  return [
    p([[x - 1.2, 86], [x + 1.2, 86], [x + 2.5, 58], [x + 0.5, 58]], "#8A5A2B"),
    p([[x + 1.5, 58], [x - 12, 54], [x - 2, 52]], "#4F8A5B"),
    p([[x + 1.5, 58], [x + 14, 54], [x + 4, 51]], "#4F8A5B"),
    p([[x + 1.5, 58], [x - 6, 47], [x + 2, 50]], "#5E9C64"),
    p([[x + 1.5, 58], [x + 9, 46], [x + 3, 50]], "#5E9C64"),
  ];
}

function avatar(skin: string, shirt: string, hair: string): Shape[] {
  return [r(24, 62, 52, 50, 24, shirt), c(50, 42, 15, skin), p([[35, 40], [38, 27], [50, 22], [62, 27], [65, 40], [60, 32], [40, 32]], hair)];
}

/** 21 Someone in a white coat over a coloured top, for the clinic's team. */
function coat(skin: string, top: string, hair: string): Shape[] {
  return [...avatar(skin, WHITE, hair), p([[44, 62], [56, 62], [50, 76]], top), r(49, 76, 2, 24, 1, "#D5DCE0")];
}

/** 21 A clipboard with lines, for the clinic's intake form. */
function clipboard(board: string, paper: string, ink: string, dx = 0): Shape[] {
  return [
    r(30 + dx, 22, 40, 58, 5, board),
    r(34 + dx, 28, 32, 48, 3, paper),
    r(42 + dx, 18, 16, 9, 3, ink),
    r(39 + dx, 40, 22, 3, 1.5, ink, 0.55),
    r(39 + dx, 48, 18, 3, 1.5, ink, 0.55),
    r(39 + dx, 56, 22, 3, 1.5, ink, 0.55),
    r(39 + dx, 64, 12, 3, 1.5, ink, 0.55),
  ];
}

/** 27 A dumbbell lying flat, for the gym. */
function dumbbell(color: string, bar: string, dx = 0, dy = 0, s = 1): Shape[] {
  return [
    r(30 * s + dx, 47 * s + dy, 40 * s, 6 * s, 3 * s, bar),
    r(20 * s + dx, 34 * s + dy, 10 * s, 32 * s, 3 * s, color),
    r(70 * s + dx, 34 * s + dy, 10 * s, 32 * s, 3 * s, color),
    r(13 * s + dx, 40 * s + dy, 7 * s, 20 * s, 2.5 * s, color),
    r(80 * s + dx, 40 * s + dy, 7 * s, 20 * s, 2.5 * s, color),
  ];
}

/** 27 A coach in a sports top with a headband. */
function coach(skin: string, top: string, hair: string, band: string): Shape[] {
  return [...avatar(skin, top, hair), r(35, 30, 30, 4, 2, band), r(36, 68, 28, 3, 1.5, WHITE, 0.6)];
}

/** 29 A heart, its top centre at (x, y), `s` times 10 units across. */
function heart(x: number, y: number, s: number, color: string): Shape[] {
  return [
    c(x - 6 * s, y + 6 * s, 7 * s, color),
    c(x + 6 * s, y + 6 * s, 7 * s, color),
    p([[x - 12.8 * s, y + 9 * s], [x + 12.8 * s, y + 9 * s], [x, y + 24 * s]], color),
  ];
}

/** 29 An open cardboard parcel, moved by (dx, dy) and scaled about its centre. */
function parcel(dx: number, dy: number, s = 1): Shape[] {
  const at = (x: number, y: number): [number, number] => [50 + (x - 50) * s + dx, 66 + (y - 66) * s + dy];
  const box = (x: number, y: number, w: number, h: number, color: string): Shape => {
    const [x0, y0] = at(x, y);
    return r(x0, y0, w * s, h * s, 2 * s, color);
  };
  return [
    p([at(22, 52), at(36, 44), at(50, 52)], "#B98250"),
    p([at(50, 52), at(64, 44), at(78, 52)], "#B98250"),
    box(22, 52, 56, 34, "#C9955B"),
    box(22, 52, 56, 4, "#A8743F"),
    box(44, 60, 12, 10, "#F4EFE6"),
  ];
}

/** Studio demos: a car seen from the side, moved by (dx, dy) and scaled about its centre. */
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
    c(wx1, wy, 8 * s, "#2B2950"),
    c(wx1, wy, 3.5 * s, "#D6D2CC"),
    c(wx2, wy, 8 * s, "#2B2950"),
    c(wx2, wy, 3.5 * s, "#D6D2CC"),
  ];
}

/** Studio demos: a scooter with a delivery box, moved by (dx, dy). */
function scooter(body: string, box: string, dx = 0, dy = 0): Shape[] {
  return [
    r(18 + dx, 30 + dy, 26, 22, 4, box),
    r(22 + dx, 36 + dy, 18, 3, 1.5, WHITE, 0.8),
    p([[26 + dx, 56 + dy], [60 + dx, 56 + dy], [70 + dx, 40 + dy], [76 + dx, 40 + dy], [66 + dx, 62 + dy], [26 + dx, 62 + dy]], body),
    r(66 + dx, 32 + dy, 4, 12, 2, body),
    r(62 + dx, 30 + dy, 12, 3, 1.5, "#2B2950"),
    c(30 + dx, 68 + dy, 8, "#2B2950"),
    c(30 + dx, 68 + dy, 3.5, "#D6D2CC"),
    c(72 + dx, 68 + dy, 8, "#2B2950"),
    c(72 + dx, 68 + dy, 3.5, "#D6D2CC"),
  ];
}

/** 110.5 A map pin, its round head at (x, y). */
function pin(x: number, y: number, color: string): Shape[] {
  return [c(x, y, 9, color), p([[x - 8, y + 4], [x + 8, y + 4], [x, y + 20]], color), c(x, y, 3.5, "#F5B700")];
}

/** 110.5 A school with its flag, moved by dx. */
function school(wall: string, door: string, accent: string, dx = 0): Shape[] {
  return [
    r(24 + dx, 46, 52, 34, 2, wall),
    p([[20 + dx, 48], [50 + dx, 28], [80 + dx, 48]], wall),
    r(49.2 + dx, 14, 1.6, 15, 0.8, wall),
    p([[50.8 + dx, 14], [61 + dx, 17.5], [50.8 + dx, 21]], accent),
    c(50 + dx, 42, 4, accent),
    r(45 + dx, 62, 10, 18, 1, door),
    r(30 + dx, 54, 9, 8, 1, accent),
    r(61 + dx, 54, 9, 8, 1, accent),
    r(30 + dx, 66, 9, 8, 1, accent),
    r(61 + dx, 66, 9, 8, 1, accent),
  ];
}

/** 110.5 An open book. */
function book(x: number, y: number): Shape[] {
  return [p([[x - 16, y], [x, y + 4], [x, y + 20], [x - 16, y + 16]], WHITE), p([[x, y + 4], [x + 16, y], [x + 16, y + 16], [x, y + 20]], "#F4EFE6"), r(x - 0.6, y + 4, 1.2, 16, 0.6, "#C9A24B")];
}

/** 110.5 Three people, the one in front in another colour: a group of teachers. */
function group(color: string, front: string): Shape[] {
  return [c(30, 44, 9, color), r(18, 56, 24, 26, 12, color), c(70, 44, 9, color), r(58, 56, 24, 26, 12, color), c(50, 38, 11, front), r(35, 52, 30, 32, 15, front)];
}

/** 29 A shape moved by (dx, dy). */
function shift(shape: Shape, dx: number, dy: number): Shape {
  if (shape.kind === "poly") return { ...shape, points: shape.points.map(([x, y]) => [x + dx, y + dy] as [number, number]) };
  return { ...shape, x: shape.x + dx, y: shape.y + dy };
}

function tooth(x: number, y: number, s: number, color: string): Shape[] {
  return [
    r(x - 12 * s, y - 10 * s, 24 * s, 18 * s, 8 * s, color),
    p([[x - 12 * s, y], [x - 4 * s, y], [x - 6 * s, y + 18 * s], [x - 10 * s, y + 18 * s]], color),
    p([[x + 4 * s, y], [x + 12 * s, y], [x + 10 * s, y + 18 * s], [x + 6 * s, y + 18 * s]], color),
  ];
}

/** 26 A plate seen from above, for the café's dishes. */
function plate(rim: string, inner: string, dx = 0, dy = 0): Shape[] {
  return [c(50 + dx, 54 + dy, 34, rim), c(50 + dx, 54 + dy, 27, inner)];
}

/** 26 A cup on a saucer, for the café's drinks and its banner. */
function cup(color: string, drink: string, dx = 0, dy = 0): Shape[] {
  return [
    r(22 + dx, 74 + dy, 56, 6, 3, "#E9E2D6"),
    r(30 + dx, 42 + dy, 36, 34, 8, color),
    r(32 + dx, 42 + dy, 32, 6, 3, drink),
    ...stroke([[66 + dx, 50 + dy], [74 + dx, 52 + dy], [74 + dx, 60 + dy], [66 + dx, 64 + dy]], 3.5, color),
  ];
}

export const PICTURES = {
  // Academy (Nour Academy)
  "course-ux": {
    from: "#E8E0F6",
    to: "#B9A6E0",
    shapes: [
      r(20, 24, 60, 48, 5, WHITE),
      r(20, 24, 60, 10, 5, "#5B3FA0"),
      r(20, 29, 60, 5, 0, "#5B3FA0"),
      c(26, 29, 1.6, WHITE),
      c(31, 29, 1.6, WHITE),
      r(26, 40, 20, 26, 3, "#5B3FA0", 0.22),
      r(50, 40, 24, 6, 2, "#5B3FA0", 0.65),
      r(50, 50, 24, 4, 2, "#5B3FA0", 0.3),
      r(50, 57, 16, 4, 2, "#5B3FA0", 0.3),
      p([[62, 58], [62, 80], [67, 75], [71, 83], [75, 81], [71, 74], [78, 73]], "#2B2950"),
    ],
  },
  "course-arabic": {
    from: "#F6E3C6",
    to: "#D99A4E",
    shapes: [
      ...stroke([[18, 62], [28, 50], [38, 58], [48, 66], [58, 56], [66, 44], [74, 50], [82, 40]], 7, "#7A4A12"),
      c(30, 74, 2.5, "#7A4A12"),
      c(56, 74, 2.5, "#7A4A12"),
      p([[70, 14], [80, 24], [56, 48], [50, 50], [52, 44]], "#3B2A1E"),
      p([[52, 44], [56, 48], [50, 50]], "#F2B544"),
    ],
  },
  "course-excel": {
    from: "#DCEFE2",
    to: "#7FC09B",
    shapes: [
      r(22, 20, 56, 60, 4, WHITE),
      r(22, 20, 56, 10, 4, "#1E6B44"),
      r(22, 26, 56, 4, 0, "#1E6B44"),
      ...[38, 54].map((x) => r(x, 30, 0.8, 50, 0, "#1E6B44", 0.25)),
      ...[40, 50, 60, 70].map((y) => r(22, y, 56, 0.8, 0, "#1E6B44", 0.25)),
      r(42, 60, 6, 16, 1, "#2F8A5B"),
      r(51, 50, 6, 26, 1, "#2F8A5B"),
      r(60, 42, 6, 34, 1, "#1E6B44"),
      r(69, 54, 6, 22, 1, "#2F8A5B"),
    ],
  },
  "course-photo": {
    from: "#D3E4F2",
    to: "#4A78A8",
    shapes: [
      r(34, 27, 16, 10, 3, "#1F3B5C"),
      r(20, 33, 60, 40, 8, "#1F3B5C"),
      c(50, 53, 14, WHITE),
      c(50, 53, 10, "#4A78A8"),
      c(46, 49, 3, WHITE, 0.75),
      c(70, 41, 2.5, WHITE),
    ],
  },
  "course-marketing": {
    from: "#FCEFCB",
    to: "#D69E1E",
    shapes: [
      r(20, 43, 12, 14, 2, "#7A5310"),
      p([[30, 43], [62, 26], [62, 74], [30, 57]], "#7A5310"),
      p([[36, 56], [44, 58], [46, 74], [38, 74]], "#5A3D0B"),
      c(71, 38, 2.4, WHITE),
      c(74, 50, 2.4, WHITE),
      c(71, 62, 2.4, WHITE),
    ],
  },
  "course-english": {
    from: "#F9E1DC",
    to: "#E38A74",
    shapes: [
      r(16, 22, 46, 28, 8, WHITE),
      p([[24, 48], [34, 48], [22, 60]], WHITE),
      c(29, 36, 2.6, "#C8553D"),
      c(39, 36, 2.6, "#C8553D"),
      c(49, 36, 2.6, "#C8553D"),
      r(38, 46, 46, 28, 8, "#7E2E1F"),
      p([[70, 72], [62, 72], [76, 84]], "#7E2E1F"),
      r(46, 56, 30, 3, 1.5, WHITE, 0.6),
      r(46, 63, 20, 3, 1.5, WHITE, 0.6),
    ],
  },
  "course-python": {
    from: "#DCEAF4",
    to: "#2B6A8F",
    shapes: [
      r(18, 22, 64, 56, 6, "#14283A"),
      r(18, 22, 64, 9, 6, "#2B4A63"),
      r(18, 27, 64, 4, 0, "#2B4A63"),
      c(24, 26.5, 1.5, "#E0505F"),
      c(29, 26.5, 1.5, "#F2B544"),
      c(34, 26.5, 1.5, "#7FD4A8"),
      p([[26, 40], [36, 46], [26, 52], [26, 48.5], [31, 46], [26, 43.5]], "#7FD4A8"),
      r(39, 49, 14, 3, 1.5, "#7FD4A8"),
      r(26, 60, 34, 2.6, 1.3, WHITE, 0.45),
      r(26, 66, 24, 2.6, 1.3, WHITE, 0.45),
    ],
  },
  "course-business": {
    from: "#E3E9F7",
    to: "#5B74B5",
    shapes: [
      r(22, 30, 56, 42, 6, "#25356B"),
      r(40, 22, 20, 12, 4, "#25356B"),
      r(44, 26, 12, 6, 2, "#E3E9F7"),
      r(22, 46, 56, 4, 0, "#5B74B5"),
      r(46, 43, 8, 10, 2, "#F2B544"),
    ],
  },
  "banner-academy": { from: "#2B2950", to: "#0E0D24", shapes: cap(CREAM, "#F2B544", 62, 2) },

  // Store (Lale Flowers)
  "product-roses": {
    from: "#FBE3E8",
    to: "#E89AAE",
    shapes: [
      p([[49, 50], [51, 50], [51, 84], [49, 84]], "#3E7A4A"),
      p([[42, 52], [44, 52], [47, 84], [45, 84]], "#3E7A4A"),
      p([[56, 52], [58, 52], [55, 84], [53, 84]], "#3E7A4A"),
      c(38, 46, 9, "#C8506F"),
      c(62, 46, 9, "#C8506F"),
      c(50, 38, 11, "#B03A5B"),
      c(50, 38, 5.5, "#8E2342"),
      c(38, 46, 4, "#A33656"),
      c(62, 46, 4, "#A33656"),
      p([[30, 58], [70, 58], [58, 88], [42, 88]], CREAM),
      p([[50, 70], [42, 65], [42, 75]], "#B03A5B"),
      p([[50, 70], [58, 65], [58, 75]], "#B03A5B"),
      c(50, 70, 2, "#8E2342"),
    ],
  },
  "product-orchid": {
    from: "#F1EBF6",
    to: "#C9B6DE",
    shapes: [
      p([[49, 64], [51, 64], [55, 26], [53, 26]], "#4F7A45"),
      p([[50, 64], [32, 58], [36, 54]], "#5E8C4A"),
      p([[50, 64], [68, 60], [64, 56]], "#5E8C4A"),
      ...[
        [54, 28],
        [62, 40],
        [46, 44],
      ].flatMap(([x, y]) => [c(x! - 4.5, y!, 4.6, WHITE), c(x! + 4.5, y!, 4.6, WHITE), c(x!, y! - 4.5, 4.6, WHITE), c(x!, y! + 4.5, 4.6, WHITE), c(x!, y!, 2.6, "#B05BA0")]),
      r(36, 62, 28, 6, 2, WHITE),
      r(38, 66, 24, 18, 4, CREAM),
    ],
  },
  "product-coffee": {
    from: "#F1E4D6",
    to: "#B07F57",
    shapes: [
      r(16, 68, 68, 6, 3, "#6B4226"),
      p([[42, 30], [58, 30], [55, 50], [45, 50]], "#C08A3E"),
      r(57, 33, 15, 3, 1.5, "#8A5A22"),
      r(22, 50, 18, 18, 4, WHITE),
      r(24, 50, 14, 3, 1.5, "#5A361E"),
      c(41, 58, 3.5, WHITE),
      r(60, 50, 18, 18, 4, WHITE),
      r(62, 50, 14, 3, 1.5, "#5A361E"),
      c(79, 58, 3.5, WHITE),
    ],
  },
  "product-delight": {
    from: "#FAEDF0",
    to: "#E3A5B8",
    shapes: [
      r(20, 40, 60, 40, 5, WHITE),
      r(18, 33, 64, 10, 4, "#B03A5B"),
      ...[0, 1, 2].flatMap((i) =>
        [0, 1].flatMap((j) => [r(27 + i * 16, 50 + j * 13, 12, 10, 2, (i + j) % 2 ? "#E58FA8" : "#F2A7BC"), c(30 + i * 16, 53 + j * 13, 0.9, WHITE), c(35 + i * 16, 56 + j * 13, 0.9, WHITE)]),
      ),
    ],
  },
  "product-candle": {
    from: "#F3EBE1",
    to: "#C9A27E",
    shapes: [
      r(34, 44, 32, 38, 6, CREAM),
      r(38, 58, 24, 12, 2, "#9C5B2E"),
      r(49.3, 36, 1.4, 8, 0.5, "#3B2A1E"),
      p([[50, 20], [55.5, 31], [50, 38], [44.5, 31]], "#F2B544"),
      c(50, 32.5, 2.3, "#FFF3C4"),
    ],
  },
  "product-tulips": {
    from: "#E6F3E2",
    to: "#9CCB8F",
    shapes: [...tulip(38, 32, "#E0505F", "#3E7A4A"), ...tulip(52, 26, "#F2B544", "#3E7A4A"), ...tulip(64, 34, "#C8506F", "#3E7A4A"), p([[28, 62], [74, 62], [62, 90], [40, 90]], CREAM)],
  },
  "product-gift": {
    from: "#E4ECF9",
    to: "#8FA9DA",
    shapes: [
      r(28, 46, 44, 34, 4, "#2F4F8F"),
      r(25, 38, 50, 10, 3, "#3E63A8"),
      r(47, 38, 6, 42, 0, "#F2B544"),
      c(44, 34, 5, "#F2B544"),
      c(56, 34, 5, "#F2B544"),
      c(50, 36.5, 2.6, "#D99A1E"),
    ],
  },
  "product-tea": {
    from: "#EAF0DF",
    to: "#A9BF7F",
    shapes: [
      r(34, 34, 32, 48, 5, "#4F6B2E"),
      r(32, 29, 36, 9, 3, "#3C5422"),
      c(50, 58, 10, CREAM),
      p([[50, 50], [56, 58], [50, 66], [44, 58]], "#6E8F3E"),
    ],
  },
  "banner-store": {
    from: "#FBE3E8",
    to: "#B03A5B",
    shapes: [...tulip(108, 36, "#B03A5B", "#2F5D3A"), ...tulip(122, 30, CREAM, "#2F5D3A"), ...tulip(136, 38, "#F2B544", "#2F5D3A"), p([[98, 66], [146, 66], [134, 96], [110, 96]], WHITE)],
  },

  // Bookings (Studio Nur)
  "service-cut": {
    from: "#E7F2EF",
    to: "#A9D1C7",
    shapes: [
      p([[45, 52], [76, 20], [80, 23], [53, 56]], "#2F6F62"),
      p([[55, 52], [24, 20], [20, 23], [47, 56]], "#3E8676"),
      c(36, 68, 9, "#2F6F62"),
      c(36, 68, 5, "#C9E3DC"),
      c(64, 68, 9, "#2F6F62"),
      c(64, 68, 5, "#C9E3DC"),
      p([[44, 56], [50, 54], [41, 62]], "#2F6F62"),
      p([[56, 56], [50, 54], [59, 62]], "#2F6F62"),
      c(50, 54, 2, WHITE),
    ],
  },
  "service-colour": {
    from: "#F7E4EA",
    to: "#D98CA0",
    shapes: [
      r(26, 58, 40, 18, 9, "#2F6F62"),
      r(28, 56, 36, 6, 3, "#C0566B"),
      p([[60, 26], [64, 24], [74, 52], [70, 54]], "#8A5A2B"),
      r(58, 18, 10, 9, 2, "#3B2A1E"),
      p([[40, 24], [46, 36], [40, 42], [34, 36]], "#C0566B"),
    ],
  },
  "service-massage": {
    from: "#ECEFEA",
    to: "#B8C6B9",
    shapes: [
      r(28, 66, 44, 14, 7, "#5D6B66"),
      r(33, 54, 34, 12, 6, "#7D8B86"),
      r(38, 44, 24, 10, 5, "#9AA8A3"),
      p([[62, 30], [76, 22], [70, 36]], "#4F8A5B"),
      p([[60, 34], [64, 22], [68, 32]], "#5E9C64"),
      c(26, 40, 3, "#F2B544", 0.7),
    ],
  },
  "service-nails": {
    from: "#FAE6EA",
    to: "#E8A3B0",
    shapes: [r(40, 46, 20, 32, 5, "#C0566B"), r(44, 28, 12, 20, 3, "#2B2B2B"), r(44, 52, 3, 18, 1.5, WHITE, 0.5), c(66, 34, 3, "#C0566B", 0.6), c(72, 44, 2, "#C0566B", 0.5)],
  },
  "service-facial": {
    from: "#FBEFE6",
    to: "#E6C2A6",
    shapes: [r(34, 24, 32, 46, 16, "#F1D2BF"), r(30, 20, 40, 12, 6, WHITE), c(43, 44, 4.5, "#8FC79A"), c(57, 44, 4.5, "#8FC79A"), r(44, 58, 12, 3, 1.5, "#C98F7A"), p([[70, 64], [84, 58], [78, 72]], "#5E9C64")],
  },
  "service-brows": {
    from: "#F2ECE6",
    to: "#CDBBA9",
    shapes: [p([[24, 44], [48, 34], [76, 40], [74, 45], [48, 40], [27, 49]], "#3B2A1E"), r(34, 54, 32, 12, 6, WHITE), c(50, 60, 4.5, "#3B2A1E"), c(48.5, 58.5, 1.2, WHITE)],
  },
  "staff-elif": { from: "#E7F2EF", to: "#A9D1C7", shapes: avatar("#E9C4A8", "#2F6F62", "#3B2A1E") },
  "staff-selin": { from: "#F7E4EA", to: "#D98CA0", shapes: avatar("#D9A88A", "#C0566B", "#5A361E") },
  "staff-deniz": { from: "#ECEFEA", to: "#B8C6B9", shapes: avatar("#C99B7D", "#5D6B66", "#2B2B2B") },
  "banner-bookings": {
    from: "#E7F2EF",
    to: "#2F6F62",
    shapes: [r(104, 26, 44, 46, 6, WHITE), r(104, 26, 44, 12, 6, "#1F4D44"), r(104, 32, 44, 6, 0, "#1F4D44"), r(113, 20, 3, 12, 1.5, "#1F4D44"), r(136, 20, 3, 12, 1.5, "#1F4D44"), p([[114, 54], [120, 60], [134, 46], [137, 49], [120, 66], [111, 57]], "#2F6F62")],
  },

  // Clinic (Kardelen Clinic, 21)
  "visit-checkup": { from: "#E6F0F5", to: "#A9C9DA", shapes: clipboard("#2C6A8A", WHITE, "#2C6A8A") },
  "visit-followup": {
    from: "#EDF3EE",
    to: "#B9D3BF",
    shapes: [r(26, 28, 48, 46, 7, WHITE), r(26, 28, 48, 12, 7, "#3F7F5B"), r(26, 34, 48, 6, 0, "#3F7F5B"), p([[38, 56], [46, 64], [62, 48], [66, 52], [46, 72], [34, 60]], "#3F7F5B")],
  },
  "visit-dental": { from: "#EEF4FA", to: "#BFD5EA", shapes: [...tooth(50, 44, 1.3, WHITE), c(72, 30, 3, WHITE, 0.8), c(78, 38, 2, WHITE, 0.6)] },
  "visit-children": { from: "#FFF3E2", to: "#F4C98E", shapes: [...tooth(46, 48, 1, WHITE), p([[72, 22], [75, 30], [83, 30], [77, 35], [79, 43], [72, 38], [65, 43], [67, 35], [61, 30], [69, 30]], "#E39B2E")] },
  "visit-physio": {
    from: "#F1ECF6",
    to: "#C9B9DE",
    shapes: [c(50, 54, 22, "#6A4C93"), c(50, 54, 22, WHITE, 0.15), r(30, 52, 40, 4, 2, WHITE, 0.5), c(76, 28, 7, "#6A4C93", 0.6)],
  },
  "doctor-ayse": { from: "#E6F0F5", to: "#A9C9DA", shapes: coat("#E9C4A8", "#2C6A8A", "#3B2A1E") },
  "doctor-kerem": { from: "#EEF4FA", to: "#BFD5EA", shapes: coat("#C99B7D", "#5D6B66", "#2B2B2B") },
  "doctor-leyla": { from: "#F1ECF6", to: "#C9B9DE", shapes: coat("#B98466", "#6A4C93", "#1E1A17") },
  "banner-clinic": { from: "#E6F0F5", to: "#2C6A8A", shapes: [...clipboard(WHITE, "#F4F8FA", "#2C6A8A", 76), c(140, 30, 9, "#F2B544", 0.85)] },

  // Gym & fitness (Pulse Studio, 27)
  "class-yoga": {
    from: "#EAF3EC",
    to: "#A9D1B5",
    shapes: [r(14, 70, 72, 7, 3.5, "#2E7D5B"), c(50, 30, 7, "#2E7D5B"), p([[50, 38], [56, 54], [72, 66], [68, 70], [50, 60], [32, 70], [28, 66], [44, 54]], "#2E7D5B"), ...stroke([[30, 44], [50, 40], [70, 44]], 4, "#2E7D5B")],
  },
  "class-spin": {
    from: "#FCE9DF",
    to: "#F2A47E",
    shapes: [c(30, 64, 14, "#B5471B"), c(30, 64, 9, "#FCE9DF"), c(72, 64, 14, "#B5471B"), c(72, 64, 9, "#FCE9DF"), p([[30, 64], [48, 40], [52, 40], [72, 64], [68, 64], [50, 46], [34, 64]], "#3B2A1E"), r(44, 34, 14, 5, 2.5, "#3B2A1E"), r(62, 36, 12, 4, 2, "#3B2A1E")],
  },
  "class-hiit": {
    from: "#FFF1D9",
    to: "#F3BF62",
    shapes: [...stroke([[38, 36], [38, 28], [44, 22], [56, 22], [62, 28], [62, 36]], 5, "#3B2A1E"), c(50, 58, 22, "#3B2A1E"), r(42, 54, 16, 4, 2, "#F3BF62", 0.6), p([[76, 16], [70, 30], [76, 30], [72, 42], [84, 24], [78, 24], [82, 16]], "#B5471B")],
  },
  "class-pilates": { from: "#EFEAF7", to: "#C3B4E3", shapes: [c(50, 54, 26, "#5B4A9E"), c(42, 46, 8, WHITE, 0.25), r(14, 80, 72, 5, 2.5, "#5B4A9E", 0.4)] },
  "class-pt": { from: "#E9EEF3", to: "#AFC0D2", shapes: dumbbell("#2B3A4A", "#7D8C99") },
  "coach-selin": { from: "#EAF3EC", to: "#A9D1B5", shapes: coach("#E9C4A8", "#2E7D5B", "#3B2A1E", "#F3BF62") },
  "coach-can": { from: "#FCE9DF", to: "#F2A47E", shapes: coach("#C99B7D", "#B5471B", "#1E1A17", WHITE) },
  "coach-mira": { from: "#EFEAF7", to: "#C3B4E3", shapes: coach("#B98466", "#5B4A9E", "#2B2B2B", "#F3BF62") },
  "banner-fitness": { from: "#ECEBFA", to: "#4338A8", shapes: [...dumbbell(WHITE, "#D9D7F5", 70, 0, 1), c(150, 26, 8, "#F3BF62", 0.9)] },

  // Real estate (Nile Homes)
  "home-zamalek": { from: "#CFE4F3", to: "#F0D7B0", shapes: [ground("#B7C99A"), ...building(CREAM, "#7FA7C9", "#8A5A2B"), ...palm(80)] },
  "home-maadi": { from: "#D9EBDF", to: "#EFDDBE", shapes: [ground("#9DBF86"), ...house("#A0522D", CREAM, "#6B4226", "#7FA7C9"), c(86, 60, 8, "#5E8C4A"), r(85, 64, 2, 22, 1, "#8A5A22")] },
  "home-newcairo": { from: "#F6E0CB", to: "#CADDEE", shapes: [ground("#C7B08A"), ...house("#5D6B66", WHITE, "#2B2B2B", "#9CC3DD"), ...palm(16)] },
  "home-zayed": { from: "#E9E2F2", to: "#F3D6BC", shapes: [ground("#B7C99A"), ...building(WHITE, "#A9C6DE", "#5D6B66")] },
  "home-heliopolis": { from: "#F8DDC4", to: "#BCD2E8", shapes: [ground("#C9B892"), ...building("#EBD9BF", "#7FA7C9", "#8A5A2B"), ...palm(20), ...palm(82)] },
  "home-garden-city": { from: "#DDEBDA", to: "#F2E1C4", shapes: [ground("#8FB37A"), ...house("#8A3B2B", "#F6EBDD", "#5A361E", "#7FA7C9"), c(14, 64, 9, "#4F7A45"), r(13, 68, 2, 18, 1, "#6B4226")] },
  "room-living": {
    from: "#F4EEE6",
    to: "#E1D3C1",
    shapes: [r(-80, 80, 260, 30, 0, "#C9A27E"), r(38, 22, 24, 16, 1, WHITE), p([[40, 36], [47, 28], [52, 33], [56, 29], [60, 36]], "#7FA7C9"), r(22, 54, 56, 22, 7, "#2F6F62"), r(26, 50, 22, 12, 5, "#3E8676"), r(52, 50, 22, 12, 5, "#3E8676"), r(80, 40, 2, 38, 1, "#3B2A1E"), p([[74, 40], [88, 40], [84, 30], [78, 30]], "#F2B544")],
  },
  "room-kitchen": {
    from: "#EEF1F3",
    to: "#D4DCE2",
    shapes: [r(-80, 84, 260, 30, 0, "#B7A48C"), r(14, 58, 72, 26, 2, CREAM), r(14, 56, 72, 4, 1, "#5D6B66"), ...[0, 1, 2].map((i) => r(20 + i * 22, 64, 16, 16, 2, "#E3D8C8")), r(14, 20, 72, 18, 2, CREAM), r(44, 44, 12, 8, 2, "#2B2B2B"), c(34, 52, 4, "#A0522D")],
  },
  "room-bedroom": {
    from: "#F2EEF6",
    to: "#D8CFE3",
    shapes: [r(-80, 84, 260, 30, 0, "#BFA88E"), r(20, 44, 60, 16, 4, "#8A5A2B"), r(18, 58, 64, 22, 4, WHITE), r(26, 52, 20, 9, 4, "#ECE4D8"), r(54, 52, 20, 9, 4, "#ECE4D8"), r(18, 66, 64, 14, 4, "#7FA7C9"), c(88, 50, 5, "#F2B544", 0.8)],
  },
  "banner-realestate": { from: "#CFE4F3", to: "#F0D7B0", shapes: [ground("#B7C99A"), ...house("#A0522D", CREAM, "#6B4226", "#7FA7C9", 70), ...palm(140)] },

  // 23 News & blog (The Harbour Post)
  "article-harbour": {
    from: "#CFE4F3",
    to: "#9CC3DD",
    shapes: [
      r(-80, 70, 260, 40, 0, "#4F86B0"),
      c(78, 24, 9, "#F2B544"),
      p([[22, 66], [58, 66], [52, 74], [28, 74]], "#8A3B2B"),
      r(39, 40, 2, 26, 1, "#5A361E"),
      p([[41, 42], [56, 62], [41, 62]], CREAM),
      p([[60, 70], [84, 70], [80, 76], [64, 76]], "#2F6F62"),
      r(71, 54, 1.6, 16, 0.8, "#2B2B2B"),
      p([[72.6, 56], [82, 68], [72.6, 68]], WHITE),
    ],
  },
  "article-market": {
    from: "#F6E0CB",
    to: "#EBC9A4",
    shapes: [
      r(-80, 84, 260, 20, 0, "#C9A27E"),
      p([[12, 40], [50, 28], [88, 40]], "#B03A5B"),
      r(14, 40, 72, 6, 1, "#F4EFE6"),
      r(16, 46, 2, 38, 1, "#5A361E"),
      r(82, 46, 2, 38, 1, "#5A361E"),
      r(20, 64, 60, 8, 2, "#8A5A2B"),
      ...[0, 1, 2, 3, 4].map((i) => c(26 + i * 12, 61, 4.5, ["#E0552F", "#F2B544", "#3E7A4A", "#C24A6B", "#E0552F"][i]!)),
    ],
  },
  "article-tram": {
    from: "#E9E2F2",
    to: "#CADDEE",
    shapes: [
      ground("#9A9A9A"),
      r(-80, 82, 260, 2, 0, "#5D6B66"),
      r(-80, 26, 260, 1.2, 0, "#2B2B2B"),
      r(24, 44, 52, 34, 5, "#B03A5B"),
      r(28, 50, 12, 10, 1.5, "#CFE4F3"),
      r(44, 50, 12, 10, 1.5, "#CFE4F3"),
      r(60, 50, 12, 10, 1.5, "#CFE4F3"),
      r(24, 66, 52, 3, 0, CREAM),
      c(34, 80, 4, "#2B2B2B"),
      c(66, 80, 4, "#2B2B2B"),
      p([[48, 44], [52, 44], [56, 27], [54, 27]], "#2B2B2B"),
    ],
  },
  "article-stadium": {
    from: "#D9EBDF",
    to: "#A9D1C7",
    shapes: [
      r(10, 34, 80, 50, 4, "#4F8A5B"),
      r(14, 38, 72, 42, 2, "#5E9C64"),
      r(49.4, 38, 1.2, 42, 0, WHITE),
      c(50, 59, 8, WHITE, 0.9),
      c(50, 59, 6.6, "#5E9C64"),
      r(14, 52, 8, 14, 0, WHITE, 0.9),
      r(78, 52, 8, 14, 0, WHITE, 0.9),
      c(64, 66, 3, WHITE),
    ],
  },
  "article-books": {
    from: "#F4EEE6",
    to: "#E1D3C1",
    shapes: [
      r(-80, 80, 260, 30, 0, "#8A5A2B"),
      r(22, 40, 10, 40, 1.5, "#24476B"),
      r(33, 34, 8, 46, 1.5, "#B03A5B"),
      r(42, 44, 12, 36, 1.5, "#2F6F62"),
      p([[56, 80], [64, 42], [72, 44], [64, 80]], "#F2B544"),
      r(70, 50, 10, 30, 1.5, "#5D6B66"),
    ],
  },
  "article-bridge": {
    from: "#F8DDC4",
    to: "#BCD2E8",
    shapes: [
      r(-80, 74, 260, 30, 0, "#7FA7C9"),
      r(-80, 58, 260, 4, 0, "#5D6B66"),
      r(24, 26, 4, 48, 1, "#5D6B66"),
      r(72, 26, 4, 48, 1, "#5D6B66"),
      ...stroke([[-10, 30], [26, 58]], 1.2, "#2B2B2B"),
      ...stroke([[26, 28], [50, 56], [74, 28]], 1.2, "#2B2B2B"),
      ...stroke([[74, 28], [110, 58]], 1.2, "#2B2B2B"),
      c(84, 20, 7, "#F2B544", 0.9),
    ],
  },
  "banner-news": {
    from: "#24476B",
    to: "#0E0D24",
    shapes: [
      r(66, 28, 46, 52, 3, CREAM),
      r(71, 34, 36, 6, 1, "#24476B"),
      r(71, 44, 16, 14, 1, "#9CC3DD"),
      ...[0, 1, 2].map((i) => r(90, 44 + i * 5, 17, 2, 1, "#5D6B66")),
      ...[0, 1, 2, 3].map((i) => r(71, 62 + i * 4.5, 36, 2, 1, "#5D6B66")),
    ],
  },

  // 28 Events & tickets: the culture centre's events and banner.
  "event-jazz": {
    from: "#3B2A5E",
    to: "#14112A",
    shapes: [
      p([[30, 0], [70, 0], [86, 86], [14, 86]], "#F2B544", 0.16),
      r(-80, 80, 260, 30, 0, "#2B2041"),
      ...stroke([[40, 30], [40, 62], [46, 70], [56, 70], [60, 62]], 3.4, "#F2B544"),
      r(36, 24, 8, 8, 2, "#F2B544"),
      c(62, 60, 6, "#F2B544"),
      ...[0, 1, 2].map((i) => r(44.5, 38 + i * 7, 2.6, 2.6, 1.3, "#14112A")),
    ],
  },
  "event-film": {
    from: "#F4EEE6",
    to: "#E2CDB5",
    shapes: [
      r(16, 22, 68, 44, 3, "#2B2B2B"),
      r(20, 26, 60, 36, 1, "#9CC3DD"),
      p([[20, 62], [42, 40], [56, 52], [66, 44], [80, 58], [80, 62]], "#24476B"),
      c(68, 34, 5, "#F2B544"),
      ...[0, 1, 2, 3, 4, 5].map((i) => r(14 + i * 13, 74, 8, 8, 4, "#B03A5B", 0.85)),
    ],
  },
  "event-ceramics": {
    from: "#F6E0CB",
    to: "#E7B98E",
    shapes: [
      r(-80, 78, 260, 30, 0, "#8A5A2B"),
      p([[34, 78], [30, 56], [36, 40], [44, 34], [56, 34], [64, 40], [70, 56], [66, 78]], "#C2643A"),
      r(40, 30, 20, 6, 2, "#A9512C"),
      r(34, 52, 32, 4, 2, "#F4EFE6", 0.7),
      c(80, 30, 6, "#F2B544", 0.9),
    ],
  },
  "event-talk": {
    from: "#DCE8F2",
    to: "#A8C4DE",
    shapes: [
      r(18, 22, 64, 42, 4, "#24476B"),
      r(22, 26, 56, 34, 2, WHITE),
      c(50, 38, 6, "#F2B544"),
      r(40, 46, 20, 9, 4.5, "#F2B544"),
      r(46, 64, 8, 10, 1, "#24476B"),
      r(32, 74, 36, 4, 2, "#24476B"),
    ],
  },
  "event-photo": {
    from: "#1F2A44",
    to: "#0E0D24",
    shapes: [
      ...[0, 1, 2, 3, 4, 5, 6].map((i) => c(10 + i * 13, 14 + (i % 3) * 6, 0.9, WHITE, 0.8)),
      r(-80, 70, 260, 40, 0, "#2B3A5C"),
      r(26, 40, 48, 32, 5, "#F4EFE6"),
      r(40, 34, 20, 8, 3, "#F4EFE6"),
      c(50, 56, 11, "#24476B"),
      c(50, 56, 6, "#9CC3DD"),
      c(66, 46, 2.5, "#F2B544"),
    ],
  },
  "banner-events": {
    from: "#5B2A86",
    to: "#1D1240",
    shapes: [
      p([[64, 0], [84, 0], [100, 86], [48, 86]], "#F2B544", 0.18),
      r(48, 70, 70, 16, 2, "#2B2041"),
      c(74, 52, 7, "#F4EFE6"),
      r(66, 60, 16, 12, 6, "#F4EFE6"),
      r(88, 46, 2, 26, 1, "#F2B544"),
      c(89, 44, 3.4, "#F2B544"),
    ],
  },

  // App icons: a white drawing on the app's colour.
  "icon-academy": { from: "#2E5A86", to: "#1A3655", shapes: cap(WHITE, "#F2B544") },
  "icon-store": {
    from: "#C24A6B",
    to: "#8E2342",
    shapes: [
      ...stroke([[38, 40], [38, 32], [42, 26], [50, 23], [58, 26], [62, 32], [62, 40]], 4, WHITE),
      r(24, 38, 52, 40, 7, WHITE),
      r(49, 54, 2, 14, 1, "#3E7A4A"),
      p([[42, 46], [45.5, 51], [50, 45], [54.5, 51], [58, 46], [58, 54], [50, 60], [42, 54]], "#B03A5B"),
    ],
  },
  "icon-bookings": {
    from: "#3A8072",
    to: "#235449",
    shapes: [r(24, 28, 52, 48, 8, WHITE), r(24, 28, 52, 13, 8, "#CFE6E0"), r(24, 35, 52, 6, 0, "#CFE6E0"), r(34, 20, 4, 14, 2, WHITE), r(62, 20, 4, 14, 2, WHITE), p([[36, 56], [44, 64], [64, 46], [68, 50], [44, 72], [32, 60]], "#2F6F62")],
  },
  "icon-realestate": { from: "#B06A35", to: "#7A4220", shapes: [r(28, 50, 44, 30, 3, WHITE), p([[20, 52], [50, 26], [80, 52]], WHITE), r(45, 62, 10, 18, 2, "#9C5B2E")] },
  "icon-clinic": { from: "#3A86AD", to: "#1F5672", shapes: [r(42, 22, 16, 56, 5, WHITE), r(22, 42, 56, 16, 5, WHITE)] },
  "icon-news": {
    from: "#2E5A86",
    to: "#1A3655",
    shapes: [r(24, 26, 52, 50, 5, WHITE), r(30, 32, 40, 7, 1.5, "#24476B"), r(30, 44, 17, 15, 1.5, "#9CC3DD"), r(51, 44, 19, 3, 1.5, "#5D6B66"), r(51, 50, 19, 3, 1.5, "#5D6B66"), r(51, 56, 19, 3, 1.5, "#5D6B66"), r(30, 64, 40, 3, 1.5, "#5D6B66")],
  },
  // Restaurant (Defne Café, 26)
  "dish-breakfast": {
    from: "#FBF0DC",
    to: "#E8B66A",
    shapes: [
      ...plate(WHITE, "#F7F1E6"),
      c(40, 46, 9, WHITE),
      c(40, 46, 4, "#F2B544"),
      r(53, 38, 16, 10, 3, "#F4E3B0"),
      c(62, 62, 5, "#C8423B"),
      c(52, 66, 5, "#C8423B"),
      ...[0, 1, 2].map((i) => c(36 + i * 6, 64 + (i % 2) * 3, 2.6, "#3B3B32")),
      r(56, 50, 12, 5, 2.5, "#6E9E4F"),
    ],
  },
  "dish-simit": {
    from: "#FBEEDB",
    to: "#D59A55",
    shapes: [c(50, 52, 28, "#B66A2A"), c(50, 52, 13, "#F6E6CC"), ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => c(50 + 21 * Math.cos(i * 0.785), 52 + 21 * Math.sin(i * 0.785), 1.3, CREAM)), r(18, 80, 64, 6, 3, "#8A5A2B", 0.4)],
  },
  "dish-wrap": {
    from: "#EEF4E2",
    to: "#9DBB6E",
    shapes: [
      ...plate(WHITE, "#F5F6EF"),
      p([[28, 62], [60, 30], [74, 44], [42, 76]], "#E9C98A"),
      p([[60, 30], [74, 44], [70, 30]], "#6E9E4F"),
      c(66, 37, 3, "#C8423B"),
      ...[0, 1, 2].map((i) => r(30 + i * 5, 34 - i * 2, 3, 14, 1.5, "#F2C14E")),
    ],
  },
  "dish-burger": {
    from: "#FCEBDC",
    to: "#E08E52",
    shapes: [
      p([[24, 48], [30, 32], [50, 26], [70, 32], [76, 48]], "#D58A3C"),
      ...[0, 1, 2, 3].map((i) => c(38 + i * 8, 36 - (i % 2) * 3, 1.1, CREAM)),
      r(22, 48, 56, 5, 2.5, "#6E9E4F"),
      r(24, 53, 52, 4, 2, "#F2B544"),
      r(23, 57, 54, 9, 4, "#5A3220"),
      r(25, 66, 50, 10, 4, "#D58A3C"),
    ],
  },
  "dish-soup": {
    from: "#FCEADB",
    to: "#E39A5F",
    shapes: [...plate(WHITE, "#F7F0E6"), c(50, 54, 21, "#E08A3C"), c(44, 50, 2, "#B5552A"), c(56, 58, 2, "#B5552A"), r(60, 46, 10, 3, 1.5, "#6E9E4F"), p([[70, 80], [86, 64], [89, 67], [74, 83]], "#C9C2B6")],
  },
  "dish-cheesecake": {
    from: "#F7EEE6",
    to: "#C99A7A",
    shapes: [r(18, 76, 64, 6, 3, WHITE), p([[24, 74], [76, 74], [76, 50], [24, 40]], "#F2DDB4"), p([[24, 40], [76, 50], [76, 46], [30, 36]], "#6B3E22"), c(64, 42, 4, "#9C2F3E"), c(56, 40, 3, "#B03A5B")],
  },
  "dish-baklava": {
    from: "#F3EEDC",
    to: "#B9A55E",
    shapes: [
      ...plate(WHITE, "#F6F2E6"),
      ...[0, 1].flatMap((i) => [0, 1].flatMap((j) => [p([[32 + i * 20, 44 + j * 20], [48 + i * 20, 40 + j * 20], [52 + i * 20, 52 + j * 20], [36 + i * 20, 56 + j * 20]], "#D9A441"), c(42 + i * 20, 48 + j * 20, 2.6, "#5E8C3A")])),
    ],
  },
  "drink-coffee": { from: "#F1E4D6", to: "#A87650", shapes: [...cup(WHITE, "#5A361E"), c(48, 34, 2, "#A87650", 0.5), c(54, 28, 1.6, "#A87650", 0.4)] },
  "drink-juice": {
    from: "#FFF1D6",
    to: "#F2A93B",
    shapes: [p([[34, 26], [66, 26], [62, 82], [38, 82]], "#FFFFFF", 0.7), p([[36, 36], [64, 36], [61, 80], [39, 80]], "#F5A524"), c(66, 28, 9, "#F7B733"), c(66, 28, 6, "#FBD27A"), r(52, 14, 3, 30, 1.5, "#3E7A4A")],
  },
  "drink-latte": {
    from: "#EFE6DC",
    to: "#9C7A5C",
    shapes: [p([[36, 24], [64, 24], [61, 82], [39, 82]], "#FFFFFF", 0.65), p([[37, 30], [63, 30], [62, 50], [38, 50]], "#F4EDE2"), p([[38, 50], [62, 50], [61, 80], [39, 80]], "#9C6B43"), r(42, 34, 6, 6, 1, WHITE, 0.8), r(51, 40, 6, 6, 1, WHITE, 0.8), r(56, 12, 3, 26, 1.5, "#2F6F62")],
  },
  "banner-restaurant": {
    from: "#FBEADB",
    to: "#B5552A",
    shapes: [...plate(WHITE, "#F7F1E6", 62, 0), c(102, 46, 9, WHITE), c(102, 46, 4, "#F2B544"), r(115, 38, 16, 10, 3, "#F4E3B0"), c(124, 62, 5, "#C8423B"), c(114, 66, 5, "#C8423B"), r(118, 50, 12, 5, 2.5, "#6E9E4F")],
  },
  "icon-restaurant": {
    from: "#C9693A",
    to: "#8A3B12",
    shapes: [c(50, 52, 24, WHITE), c(50, 52, 17, "#F6E0D2"), r(19, 26, 3, 50, 1.5, WHITE), r(14, 26, 2, 14, 1, WHITE), r(24, 26, 2, 14, 1, WHITE), p([[80, 26], [86, 30], [86, 50], [82, 50], [82, 76], [79, 76]], WHITE)],
  },
  "icon-fitness": { from: "#5650C4", to: "#2E2A80", shapes: dumbbell(WHITE, "#D9D7F5") },
  // 28 A ticket with its notches.
  "icon-events": {
    from: "#6E3AA0",
    to: "#3F1D66",
    shapes: [
      r(20, 32, 60, 36, 5, WHITE),
      c(20, 50, 6, "#5B2A86"),
      c(80, 50, 6, "#5B2A86"),
      ...[0, 1, 2, 3].map((i) => r(59, 36 + i * 8, 1.6, 4, 0.8, "#5B2A86")),
      r(30, 42, 22, 4, 2, "#F2B544"),
      r(30, 52, 16, 3, 1.5, "#5D6B66"),
    ],
  },

  // 29 Charity & donations (Bereket Food Bank)
  "campaign-parcels": {
    from: "#F4EEE6",
    to: "#E7D7BF",
    shapes: [ground("#C9A27E"), r(30, 28, 12, 26, 3, "#F4EFE6"), r(30, 34, 12, 6, 0, "#E39B2E"), r(44, 22, 7, 32, 2.5, "#F2B544"), r(53, 30, 14, 24, 3, "#3E7A4A"), ...parcel(0, 0)],
  },
  "campaign-volunteers": {
    from: "#DCEBDD",
    to: "#B9D6BE",
    shapes: [
      ground("#8FB89A"),
      ...[
        [-22, "#E8C4A0", "#2F6B3A", "#3A2A1E"],
        [22, "#C68E63", "#E39B2E", "#1F1A17"],
      ].flatMap(([dx, skin, shirt, hair]) => avatar(skin as string, shirt as string, hair as string).map((s) => shift(s, dx as number, 4))),
      ...parcel(0, 16, 0.6),
    ],
  },
  "campaign-lunch": {
    from: "#FBE9D6",
    to: "#F2D2AE",
    shapes: [
      r(-80, 74, 260, 30, 0, "#C9955B"),
      ...stroke([[40, 30], [43, 24], [40, 18]], 1.6, WHITE),
      ...stroke([[52, 30], [55, 24], [52, 18]], 1.6, WHITE),
      p([[26, 50], [74, 50], [66, 70], [34, 70]], WHITE),
      r(26, 45, 48, 7, 3.5, "#E0552F"),
      r(40, 70, 20, 4, 2, WHITE),
      r(78, 58, 16, 10, 5, "#D9A25B"),
      c(16, 62, 7, "#C24A6B"),
      r(15.4, 52, 1.4, 4, 0.7, "#5A361E"),
    ],
  },
  "banner-charity": {
    from: "#2F6B3A",
    to: "#18391F",
    shapes: [...parcel(46, 10, 0.9), ...heart(92, 20, 0.9, "#E39B2E")],
  },
  "icon-charity": { from: "#3A8A4A", to: "#1F4F28", shapes: heart(50, 34, 1.7, WHITE) },

  // Yallapp Studio's demos: a parcel company (Sahm Express), food delivery (Sofra Eats) and rides (Masar).
  "icon-delivery": { from: "#2E7BC2", to: "#174C7E", shapes: parcel(0, -6, 0.95) },
  "banner-delivery": {
    from: "#DDEBF7",
    to: "#2E7BC2",
    shapes: [r(-80, 80, 260, 24, 0, "#174C7E", 0.35), ...parcel(36, 6, 0.8), ...parcel(70, 12, 0.6), ...stroke([[-20, 30], [20, 30]], 2, WHITE), ...stroke([[-30, 42], [16, 42]], 2, WHITE)],
  },
  "service-sameday": { from: "#E3EEF8", to: "#8DB8DF", shapes: [...parcel(0, -4, 0.9), c(76, 26, 12, "#F2B544"), r(75.2, 18, 1.6, 9, 0.8, WHITE), r(75.2, 25.2, 7, 1.6, 0.8, WHITE)] },
  "service-express": { from: "#FBE8D8", to: "#E59A5C", shapes: [...parcel(8, -4, 0.85), ...stroke([[8, 46], [28, 46]], 3, WHITE), ...stroke([[4, 58], [24, 58]], 3, WHITE), ...stroke([[10, 70], [26, 70]], 3, WHITE)] },
  "service-documents": { from: "#E6F2EA", to: "#7DB894", shapes: [r(28, 22, 44, 56, 4, WHITE), r(36, 32, 28, 4, 2, "#2F6F62"), r(36, 42, 28, 3, 1.5, "#5D6B66"), r(36, 50, 22, 3, 1.5, "#5D6B66"), r(36, 58, 26, 3, 1.5, "#5D6B66"), c(62, 68, 6, "#C24A6B")] },
  "icon-food": { from: "#E2623A", to: "#A33716", shapes: scooter(WHITE, "#FFD7C2", 0, -4) },
  "banner-food": {
    from: "#FCE6DA",
    to: "#E2623A",
    shapes: [...plate(WHITE, "#F7F1E6", 60, 0), r(98, 44, 22, 14, 6, "#B5552A"), c(104, 50, 3, "#6E9E4F"), c(112, 48, 3, "#C8423B"), ...scooter("#2B2950", "#F2B544", -46, 10)],
  },
  "icon-rides": { from: "#1F9D8A", to: "#0E5C50", shapes: car(WHITE, "#BFE6DF", 0, -2, 0.95) },
  "banner-rides": {
    from: "#D9F1EC",
    to: "#1F9D8A",
    shapes: [r(-80, 78, 260, 26, 0, "#2B2950", 0.75), ...[0, 1, 2, 3, 4].map((i) => r(-60 + i * 50, 89, 24, 3, 1.5, WHITE)), ...car("#F2B544", "#2B2950", 60, 8, 0.95), c(-10, 26, 9, WHITE), ...stroke([[-10, 35], [-10, 60]], 2, WHITE)],
  },

  // 110.5 More of Studio's demos: a live taxi app (Lamha Taxi), a school (Nakhla School) and an academy with many teachers (Rawaq Academy).
  "icon-taxi": { from: "#2A3560", to: "#1C2541", shapes: [r(42, 27, 16, 7, 2.5, WHITE), ...car("#F5B700", "#1C2541", 0, 0, 0.95)] },
  "banner-taxi": {
    from: "#FFF4D1",
    to: "#F5B700",
    shapes: [
      r(-80, 78, 260, 26, 0, "#1C2541", 0.85),
      ...[0, 1, 2, 3, 4].map((i) => r(-60 + i * 50, 89, 24, 3, 1.5, WHITE)),
      r(82, 33, 16, 7, 2.5, WHITE),
      ...car("#F5B700", "#1C2541", 40, 10, 0.95),
      ...pin(-6, 22, "#1C2541"),
      ...pin(140, 30, WHITE),
    ],
  },
  "icon-school": { from: "#2C639A", to: "#1A3A5C", shapes: school(WHITE, "#1F4E79", "#F2B544") },
  "banner-school": {
    from: "#E6EEF6",
    to: "#8DB0D3",
    shapes: [ground("#7FA36B"), ...school("#1F4E79", WHITE, "#F2B544", 62), c(-12, 24, 10, "#F2B544", 0.9), ...book(118, 64)],
  },
  "icon-teachers": { from: "#3B7A64", to: "#24503F", shapes: group(WHITE, "#F2B544") },
  "banner-teachers": {
    from: "#E7F1EC",
    to: "#2E5E4E",
    shapes: [
      r(56, 18, 64, 40, 4, "#24503F"),
      r(56, 54, 64, 4, 1, "#8A5A2B"),
      r(64, 28, 30, 3, 1.5, WHITE, 0.8),
      r(64, 36, 40, 3, 1.5, WHITE, 0.6),
      r(64, 44, 22, 3, 1.5, WHITE, 0.6),
      ...group(CREAM, "#F2B544").map((x) => shift(x, 36, 26)),
    ],
  },
  "teacher-hannah": { from: "#FBEAE3", to: "#E9A98F", shapes: avatar("#F1D2BC", "#C8553D", "#B9783F") },
  "teacher-omar": { from: "#E6EEF7", to: "#A9C1DE", shapes: avatar("#C99B7D", "#25356B", "#2B2B2B") },
  "teacher-yasmin": { from: "#FCF1DA", to: "#EDC77A", shapes: [...avatar("#D9A88A", "#D69E1E", "#3B2A1E"), p([[33, 44], [35, 26], [50, 20], [65, 26], [67, 44], [70, 66], [62, 60], [60, 34], [40, 34], [38, 60], [30, 66]], "#6B2E55")] },
  "teacher-emre": { from: "#E3EEF8", to: "#8DB8DF", shapes: avatar("#E0B896", "#4A78A8", "#5A361E") },
  "teacher-mert": { from: "#E2F0F6", to: "#9CC7DB", shapes: avatar("#C99B7D", "#2B6A8F", "#1E1A17") },
  "teacher-salma": { from: "#F7E9D7", to: "#E1B582", shapes: avatar("#B98466", "#2F6B3A", "#1E1A17") },
} satisfies Record<string, Art>;

export type PictureName = keyof typeof PICTURES;
