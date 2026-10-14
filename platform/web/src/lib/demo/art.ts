import { deflateSync } from "node:zlib";

/**
 * Pictures for the demo apps (roadmap 16), drawn here: a soft two-colour
 * background with a flat drawing made of circles, rounded rectangles and
 * polygons. No photos, nothing downloaded: every picture is ours. They are
 * PNG files (the app shows PNG and JPEG), the same every time for the same
 * drawing, so refreshing the demos reuses them.
 */

export type Rgb = [number, number, number];

/**
 * A shape in a 100 × 100 design square, centred in the picture (the
 * background fills the whole picture). `alpha` from 0 to 1.
 */
export type Shape =
  | { kind: "circle"; x: number; y: number; r: number; color: string; alpha?: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number; r?: number; color: string; alpha?: number }
  | { kind: "poly"; points: [number, number][]; color: string; alpha?: number };

export interface Art {
  /** Top-left and bottom-right colours of the background. */
  from: string;
  to: string;
  shapes: Shape[];
}

export function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

class Canvas {
  readonly pixels: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.pixels = new Uint8Array(width * height * 3);
  }

  gradient(from: Rgb, to: Rgb): void {
    const span = this.width + this.height - 2 || 1;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const t = (x + y) / span;
        const i = (y * this.width + x) * 3;
        this.pixels[i] = Math.round(from[0] + (to[0] - from[0]) * t);
        this.pixels[i + 1] = Math.round(from[1] + (to[1] - from[1]) * t);
        this.pixels[i + 2] = Math.round(from[2] + (to[2] - from[2]) * t);
      }
    }
  }

  blend(x: number, y: number, color: Rgb, alpha: number): void {
    if (alpha <= 0 || x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const a = Math.min(1, alpha);
    const i = (y * this.width + x) * 3;
    for (let c = 0; c < 3; c++) this.pixels[i + c] = Math.round(this.pixels[i + c]! * (1 - a) + color[c]! * a);
  }

  /** Fills where `coverage` (0 to 1, from a signed distance) is above 0, inside the bounding box. */
  fill(box: { x0: number; y0: number; x1: number; y1: number }, color: Rgb, alpha: number, coverage: (px: number, py: number) => number): void {
    const x0 = Math.max(0, Math.floor(box.x0) - 1);
    const y0 = Math.max(0, Math.floor(box.y0) - 1);
    const x1 = Math.min(this.width - 1, Math.ceil(box.x1) + 1);
    const y1 = Math.min(this.height - 1, Math.ceil(box.y1) + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const c = coverage(x + 0.5, y + 0.5);
        if (c > 0) this.blend(x, y, color, c * alpha);
      }
    }
  }
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function insidePolygon(points: [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]!;
    const [xj, yj] = points[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Draws `art` at `width` × `height` and returns the raw RGB pixels. */
export function renderArt(art: Art, width: number, height: number): Uint8Array {
  const canvas = new Canvas(width, height);
  canvas.gradient(hexToRgb(art.from), hexToRgb(art.to));
  const side = Math.min(width, height);
  const unit = side / 100;
  const ox = (width - side) / 2;
  const oy = (height - side) / 2;
  const X = (v: number) => ox + v * unit;
  const Y = (v: number) => oy + v * unit;
  for (const shape of art.shapes) {
    const color = hexToRgb(shape.color);
    const alpha = shape.alpha ?? 1;
    if (shape.kind === "circle") {
      const cx = X(shape.x);
      const cy = Y(shape.y);
      const r = shape.r * unit;
      canvas.fill({ x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r }, color, alpha, (px, py) => clamp01(r - Math.hypot(px - cx, py - cy) + 0.5));
    } else if (shape.kind === "rect") {
      const x0 = X(shape.x);
      const y0 = Y(shape.y);
      const w = shape.w * unit;
      const h = shape.h * unit;
      const r = Math.min((shape.r ?? 0) * unit, w / 2, h / 2);
      const cx = x0 + w / 2;
      const cy = y0 + h / 2;
      canvas.fill({ x0, y0, x1: x0 + w, y1: y0 + h }, color, alpha, (px, py) => {
        // Signed distance to a rounded rectangle.
        const qx = Math.abs(px - cx) - (w / 2 - r);
        const qy = Math.abs(py - cy) - (h / 2 - r);
        const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
        return clamp01(0.5 - outside);
      });
    } else {
      const points = shape.points.map(([x, y]) => [X(x), Y(y)] as [number, number]);
      const xs = points.map((p) => p[0]);
      const ys = points.map((p) => p[1]);
      const box = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
      // Pixels whose corners agree are fully in or out; the others get 4 × 4 samples for smooth edges.
      canvas.fill(box, color, alpha, (px, py) => {
        const corners = [
          insidePolygon(points, px - 0.5, py - 0.5),
          insidePolygon(points, px + 0.5, py - 0.5),
          insidePolygon(points, px - 0.5, py + 0.5),
          insidePolygon(points, px + 0.5, py + 0.5),
        ];
        if (corners.every(Boolean)) return 1;
        if (!corners.some(Boolean) && !insidePolygon(points, px, py)) return 0;
        let hits = 0;
        for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) if (insidePolygon(points, px - 0.5 + (sx + 0.5) / 4, py - 0.5 + (sy + 0.5) / 4)) hits++;
        return hits / 16;
      });
    }
  }
  return canvas.pixels;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** An 8-bit RGB PNG (no transparency, as app icons need). */
export function encodePng(pixels: Uint8Array, width: number, height: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(2, 9); // colour type: RGB
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    // Filter "Sub": each byte minus the one to its left; flat drawings compress far better.
    const row = y * (stride + 1);
    raw[row] = 1;
    for (let i = 0; i < stride; i++) {
      const value = pixels[y * stride + i]!;
      const left = i >= 3 ? pixels[y * stride + i - 3]! : 0;
      raw[row + 1 + i] = (value - left) & 0xff;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function artPng(art: Art, width: number, height: number): Buffer {
  return encodePng(renderArt(art, width, height), width, height);
}
