import type { DesignFilePicture } from "../design-file";
import type { Box, DesignFrame, DesignShape } from "./frame";
import type { SvgVector } from "./svg";
import type { Zip } from "./zip";

/**
 * 108.6 A Sketch file (`.sketch`, a ZIP of JSON) read as screens: each
 * artboard a screen; rectangles, ovals, texts and bitmaps as they are,
 * symbols drawn from their masters with their texts overridden, and other
 * shapes drawn as pictures from their points.
 */

type Layer = Record<string, unknown>;

export interface DesignRead {
  frames: DesignFrame[];
  pictures: Record<string, DesignFilePicture>;
  vectors: SvgVector[];
}

const record = (v: unknown): Layer | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Layer) : null);
const list = (v: unknown): Layer[] => (Array.isArray(v) ? v.map(record).filter((x): x is Layer => x !== null) : []);
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);

export function sketchHex(color: unknown): string | null {
  const c = record(color);
  if (!c) return null;
  const ch = (v: unknown) =>
    Math.round(Math.min(1, Math.max(0, num(v))) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(c.red)}${ch(c.green)}${ch(c.blue)}`.toUpperCase();
}

const WEIGHTS: [RegExp, number][] = [
  [/hairline|thin/i, 100],
  [/extra ?light|ultra ?light/i, 200],
  [/light/i, 300],
  [/semi ?bold|demi ?bold/i, 600],
  [/extra ?bold|ultra ?bold/i, 800],
  [/black|heavy/i, 900],
  [/bold/i, 700],
  [/medium/i, 500],
];

/** A font's PostScript name ("OpenSans-SemiBold") as its family and weight. */
export function fontFromPostScript(name: string): { family: string; weight: number; italic: boolean } {
  const [base, style = ""] = name.split("-");
  const family = (base ?? name)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/MT$|PS$/, "")
    .trim();
  const weight = WEIGHTS.find(([re]) => re.test(style))?.[1] ?? 400;
  return { family, weight, italic: /italic|oblique/i.test(style) };
}

function point(text: unknown): [number, number] {
  const m = /\{\s*(-?[\d.e-]+)\s*,\s*(-?[\d.e-]+)\s*\}/.exec(String(text ?? ""));
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
}

/** A shape's outline as an SVG path, from its points (normalised to its frame). */
export function sketchPath(layer: Layer, x: number, y: number): string | null {
  const frame = record(layer.frame);
  const w = num(frame?.width);
  const h = num(frame?.height);
  const cls = layer._class;
  if (cls === "oval") return `M${x + w / 2} ${y}A${w / 2} ${h / 2} 0 1 0 ${x + w / 2} ${y + h}A${w / 2} ${h / 2} 0 1 0 ${x + w / 2} ${y}Z`;
  const points = list(layer.points);
  if (!points.length) return cls === "rectangle" ? `M${x} ${y}H${x + w}V${y + h}H${x}Z` : null;
  const at = (p: string | unknown) => {
    const [px, py] = point(p);
    return `${x + px * w} ${y + py * h}`;
  };
  let d = `M${at(points[0]!.point)}`;
  const closed = layer.isClosed !== false;
  const count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    d += a.hasCurveFrom || b.hasCurveTo ? `C${at(a.curveFrom)} ${at(b.curveTo)} ${at(b.point)}` : `L${at(b.point)}`;
  }
  return closed ? `${d}Z` : d;
}

class SketchReader {
  pictures: Record<string, DesignFilePicture> = {};
  vectors: SvgVector[] = [];
  private n = 0;
  constructor(
    private readonly symbols: Map<string, Layer>,
    private readonly images: Map<string, DesignFilePicture>,
  ) {}

  key(prefix: string) {
    this.n += 1;
    return `${prefix}:${this.n}`;
  }

  picture(ref: unknown): string | null {
    const name = typeof ref === "string" ? ref : null;
    const found = name ? (this.images.get(name) ?? this.images.get(`${name}.png`) ?? null) : null;
    if (!found) return null;
    const key = this.key("picture");
    this.pictures[key] = found;
    return key;
  }

  style(layer: Layer): Partial<DesignShape> {
    const style = record(layer.style) ?? {};
    const out: Partial<DesignShape> = {};
    const fills = list(style.fills).filter((f) => f.isEnabled !== false);
    const image = fills.find((f) => f.fillType === 4 && record(f.image));
    const gradient = fills.find((f) => f.fillType === 1 && record(f.gradient));
    const solid = [...fills].reverse().find((f) => (f.fillType ?? 0) === 0);
    if (image) {
      const key = this.picture(record(image.image)?._ref);
      if (key) out.picture = key;
    }
    if (gradient) {
      const stops = list(record(gradient.gradient)?.stops);
      const from = sketchHex(stops[0]?.color);
      const to = sketchHex(stops[stops.length - 1]?.color);
      if (from && to) {
        const [x1, y1] = point(record(gradient.gradient)?.from);
        const [x2, y2] = point(record(gradient.gradient)?.to);
        out.gradient = { from, to, angle: Math.round(((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + 90 + 360) % 360) };
      }
    } else if (solid) {
      const hex = sketchHex(solid.color);
      if (hex) out.fill = hex;
    }
    const border = list(style.borders).find((b) => b.isEnabled !== false);
    if (border) {
      const color = sketchHex(border.color);
      if (color && num(border.thickness, 1) > 0) out.stroke = { color, width: num(border.thickness, 1) };
    }
    if (list(style.shadows).some((s) => s.isEnabled !== false)) out.shadow = true;
    const opacity = num(record(style.contextSettings)?.opacity, 1);
    if (opacity < 0.99) out.opacity = opacity;
    return out;
  }

  vector(layer: Layer, box: Box, paths: string[], fill: string | undefined): DesignShape | null {
    if (!paths.length || box.w < 1 || box.h < 1) return null;
    const key = this.key("drawing");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${Math.ceil(box.w)}" height="${Math.ceil(box.h)}"><path fill="${fill ?? "#000000"}" fill-rule="evenodd" d="${paths.join(" ")}"/></svg>`;
    this.vectors.push({ key, svg, w: box.w, h: box.h });
    return { kind: "picture", box, picture: key, ...(typeof layer.name === "string" ? { name: layer.name } : {}) };
  }

  layers(layers: Layer[], ox: number, oy: number, overrides: Map<string, string>, depth: number): DesignShape[] {
    return layers.flatMap((l) => this.layer(l, ox, oy, overrides, depth));
  }

  layer(layer: Layer, ox: number, oy: number, overrides: Map<string, string>, depth: number): DesignShape[] {
    if (layer.isVisible === false || depth > 30) return [];
    const frame = record(layer.frame);
    const box: Box = { x: ox + num(frame?.x), y: oy + num(frame?.y), w: num(frame?.width), h: num(frame?.height) };
    if (box.w <= 0 || box.h <= 0) return [];
    const name = typeof layer.name === "string" ? layer.name.slice(0, 120) : undefined;
    const named = name ? { name } : {};
    switch (layer._class) {
      case "group":
        return [{ kind: "frame", box, ...named, ...this.style(layer), children: this.layers(list(layer.layers), box.x, box.y, overrides, depth + 1) }];
      case "symbolInstance": {
        const master = this.symbols.get(String(layer.symbolID));
        if (!master) return [];
        const mf = record(master.frame);
        const sx = box.w / Math.max(1, num(mf?.width, box.w));
        const sy = box.h / Math.max(1, num(mf?.height, box.h));
        const own = new Map(overrides);
        for (const o of list(layer.overrideValues)) {
          const m = /^([^/]+)_stringValue$/.exec(String(o.overrideName ?? ""));
          if (m && typeof o.value === "string") own.set(m[1]!, o.value);
        }
        const kids = this.layers(list(master.layers), 0, 0, own, depth + 1).map((k) => scaled(k, sx, sy, box.x, box.y));
        return [{ kind: "frame", box, ...named, ...this.style(master), children: kids }];
      }
      case "text": {
        const attributed = record(layer.attributedString) ?? {};
        const text = overrides.get(String(layer.do_objectID)) ?? String(attributed.string ?? "");
        const attrs = record(list(attributed.attributes)[0]?.attributes) ?? {};
        const fontAttr = record(record(attrs.MSAttributedStringFontAttribute)?.attributes) ?? {};
        const font = fontFromPostScript(String(fontAttr.name ?? ""));
        const color = sketchHex(attrs.MSAttributedStringColorAttribute) ?? sketchHex(list(record(layer.style)?.fills)[0]?.color);
        const align = num(record(attrs.paragraphStyle)?.alignment);
        const kerning = num(attrs.kerning);
        const lineHeight = num(record(attrs.paragraphStyle)?.maximumLineHeight);
        const size = num(fontAttr.size, 16);
        return [
          {
            kind: "text",
            box,
            ...named,
            text,
            ...(color ? { color } : {}),
            font: {
              ...(font.family ? { family: font.family } : {}),
              size,
              weight: font.weight,
              ...(font.italic ? { italic: true } : {}),
              ...(align === 2 ? { align: "center" as const } : align === 1 ? { align: "right" as const } : {}),
              ...(kerning ? { letterSpacing: kerning } : {}),
              ...(lineHeight ? { lineHeight: lineHeight / size } : {}),
              ...(attrs.underlineStyle ? { underline: true } : {}),
              ...(attrs.strikethroughStyle ? { strike: true } : {}),
              ...(num(attrs.MSAttributedStringTextTransformAttribute) === 1 ? { uppercase: true } : {}),
            },
          },
        ];
      }
      case "bitmap": {
        const key = this.picture(record(layer.image)?._ref);
        return key ? [{ kind: "picture", box, ...named, picture: key, ...this.style(layer) }] : [];
      }
      case "rectangle": {
        const radius = num(layer.fixedRadius, num(list(layer.points)[0]?.cornerRadius));
        return [{ kind: "rect", box, ...named, ...this.style(layer), ...(radius ? { radius } : {}) }];
      }
      case "oval":
        return [{ kind: "ellipse", box, ...named, ...this.style(layer) }];
      case "shapeGroup": {
        const kids = list(layer.layers);
        // A rectangle or oval in a group of its own (older files): the group's style on it.
        if (kids.length === 1 && (kids[0]!._class === "rectangle" || kids[0]!._class === "oval")) {
          const inner = this.layer({ ...kids[0]!, style: layer.style, frame: { ...record(kids[0]!.frame), x: num(frame?.x) + num(record(kids[0]!.frame)?.x), y: num(frame?.y) + num(record(kids[0]!.frame)?.y) } }, ox, oy, overrides, depth + 1);
          return inner.map((s) => ({ ...s, ...named }));
        }
        const paths = kids.map((k) => sketchPath(k, box.x + num(record(k.frame)?.x), box.y + num(record(k.frame)?.y))).filter((p): p is string => p !== null);
        const v = this.vector(layer, box, paths, this.style(layer).fill);
        return v ? [v] : [];
      }
      case "shapePath":
      case "triangle":
      case "star":
      case "polygon": {
        const path = sketchPath(layer, box.x, box.y);
        const st = this.style(layer);
        if (!path) return [];
        // A straight line: a line.
        if ((box.h <= 2 || box.w <= 2) && list(layer.points).length === 2 && st.stroke) return [{ kind: "line", box: { ...box, h: Math.max(box.h, st.stroke.width), w: Math.max(box.w, st.stroke.width) }, stroke: st.stroke }];
        const v = this.vector(layer, box, [path], st.fill);
        return v ? [v] : [];
      }
      default:
        return [];
    }
  }
}

function scaled(s: DesignShape, sx: number, sy: number, ox: number, oy: number): DesignShape {
  return {
    ...s,
    box: { x: ox + s.box.x * sx, y: oy + s.box.y * sy, w: s.box.w * sx, h: s.box.h * sy },
    ...(s.children ? { children: s.children.map((c) => scaled(c, sx, sy, ox, oy)) } : {}),
  };
}

export function pictureType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp";
  return null;
}

/** The pictures in an archive's folder, by their name in it. */
export async function zipPictures(zip: Zip, folder: string, toBase64: (b: Uint8Array) => string, limit = 120): Promise<Map<string, DesignFilePicture>> {
  const out = new Map<string, DesignFilePicture>();
  for (const name of zip.entries.keys()) {
    if (!name.startsWith(folder) || out.size >= limit) continue;
    const entry = zip.entries.get(name)!;
    if (entry.size > 5 * 1024 * 1024) continue;
    const bytes = await zip.read(name);
    const type = bytes ? pictureType(bytes) : null;
    if (bytes && type) out.set(name, { type, data: toBase64(bytes) });
  }
  return out;
}

/** The file's artboards as screens, or null when it isn't a Sketch file. */
export async function readSketch(zip: Zip, toBase64: (b: Uint8Array) => string): Promise<DesignRead | null> {
  const documentText = await zip.text("document.json");
  if (!documentText) return null;
  const pageNames = [...zip.entries.keys()].filter((n) => /^pages\/[^/]+\.json$/.test(n));
  const pages: Layer[] = [];
  for (const name of pageNames) {
    const text = await zip.text(name);
    try {
      const page = record(text ? JSON.parse(text) : null);
      if (page) pages.push(page);
    } catch {
      // A page that can't be read is left out.
    }
  }
  const symbols = new Map<string, Layer>();
  const collect = (layers: Layer[]) => {
    for (const l of layers) {
      if (l._class === "symbolMaster" && typeof l.symbolID === "string") symbols.set(l.symbolID, l);
      collect(list(l.layers));
    }
  };
  pages.forEach((p) => collect(list(p.layers)));
  try {
    const doc = record(JSON.parse(documentText));
    for (const foreign of list(doc?.foreignSymbols)) {
      const master = record(foreign.symbolMaster);
      if (master && typeof master.symbolID === "string") symbols.set(master.symbolID, master);
    }
  } catch {
    // Without the document's symbols, instances of them are left out.
  }
  const reader = new SketchReader(symbols, await zipPictures(zip, "images/", toBase64));
  const frames: DesignFrame[] = [];
  for (const page of pages) {
    for (const board of list(page.layers).filter((l) => l._class === "artboard" && l.isVisible !== false)) {
      const f = record(board.frame);
      const width = num(f?.width);
      const height = num(f?.height);
      if (!width || !height || frames.length >= 40) continue;
      const background = board.hasBackgroundColor ? (sketchHex(board.backgroundColor) ?? undefined) : undefined;
      frames.push({ name: String(board.name ?? "Screen").slice(0, 60), width, height, ...(background ? { background } : {}), shapes: reader.layers(list(board.layers), 0, 0, new Map(), 0) });
    }
  }
  return { frames, pictures: reader.pictures, vectors: reader.vectors };
}
