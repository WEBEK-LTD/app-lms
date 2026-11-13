/**
 * 127 "Make it yours" on /start: the colour taken from the owner's logo,
 * the swatches offered with it, and the app icon made from the logo (or
 * from the name's first letter) as a store icon wants it: 1024 × 1024, an
 * 8-bit RGB PNG with no transparency. Plain code, run in the browser on the
 * logo's pixels (a canvas) and in the unit tests.
 */

/** The colours offered after the logo's: the designs' Forest, Ember, Midnight, Rose and Gold. */
export const BRAND_SWATCHES = ["#1F5C4A", "#FF5A1F", "#34336B", "#B4235A", "#B8913A"] as const;

const hex2 = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");

export function toHex(r: number, g: number, b: number): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase();
}

export function fromHex(colour: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(colour.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Hue (0 to 360), saturation and lightness (0 to 1). */
function hsl(r: number, g: number, b: number): [number, number, number] {
  const [x, y, z] = [r / 255, g / 255, b / 255];
  const max = Math.max(x, y, z);
  const min = Math.min(x, y, z);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === x ? (y - z) / d + (y < z ? 6 : 0) : max === y ? (z - x) / d + 2 : (x - y) / d + 4;
  return [h * 60, s, l];
}

/**
 * The logo's main colour that isn't white, black or grey: its pixels
 * (RGBA, as a canvas gives them) are grouped by hue and lightness, the
 * transparent, near-white, near-black and greyish ones left out, and the
 * group with the most pixels gives its average. Null for a logo without
 * any such colour (a black logo), which keeps the demo's colour.
 */
export function dominantColour(rgba: ArrayLike<number>): string | null {
  const groups = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const r = rgba[i]!;
    const g = rgba[i + 1]!;
    const b = rgba[i + 2]!;
    if (rgba[i + 3]! < 128) continue;
    const [h, s, l] = hsl(r, g, b);
    if (s < 0.22 || l < 0.08 || l > 0.94) continue;
    const key = Math.floor(h / 15) * 10 + Math.min(9, Math.floor(l * 10));
    const group = groups.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    group.n += 1;
    group.r += r;
    group.g += g;
    group.b += b;
    groups.set(key, group);
  }
  let best: { n: number; r: number; g: number; b: number } | null = null;
  for (const group of groups.values()) if (!best || group.n > best.n) best = group;
  return best ? toHex(best.r / best.n, best.g / best.n, best.b / best.n) : null;
}

/** How far apart two colours look (0 the same). */
function distance(a: string, b: string): number {
  const x = fromHex(a);
  const y = fromHex(b);
  if (!x || !y) return Infinity;
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

/** Five swatches: the logo's colour (else the demo's) first, then the others that don't look the same as one already in. */
export function swatchesFor(first: string): string[] {
  const out = [first.toUpperCase()];
  for (const colour of [...BRAND_SWATCHES, ...MORE_SWATCHES]) if (out.length < 5 && out.every((c) => distance(c, colour) > 40)) out.push(colour);
  return out;
}

/** When a logo's colour is close to one of the approved swatches: the next ones offered. */
const MORE_SWATCHES = ["#0E7490", "#6D28D9", "#24476B"] as const;

/** Whether light text reads on the colour (the icon's letter, the preview's bar). */
export function isDark(colour: string): boolean {
  const c = fromHex(colour);
  if (!c) return true;
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.4;
}

let table: Uint32Array | null = null;
function crc32(bytes: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/**
 * An 8-bit RGB PNG of `rgba` (a canvas's pixels; their alpha is dropped,
 * so draw on a solid background first). `deflate` is zlib's (the browser's
 * CompressionStream("deflate"), or node:zlib in tests).
 */
export async function encodeRgbPng(rgba: ArrayLike<number>, width: number, height: number, deflate: (data: Uint8Array) => Promise<Uint8Array>): Promise<Uint8Array> {
  const stride = width * 3;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4;
      const to = row + 1 + x * 3;
      raw[to] = rgba[from]!;
      raw[to + 1] = rgba[from + 1]!;
      raw[to + 2] = rgba[from + 2]!;
    }
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", await deflate(raw)), chunk("IEND", new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** The browser's zlib deflate, for `encodeRgbPng`. */
export async function browserDeflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
