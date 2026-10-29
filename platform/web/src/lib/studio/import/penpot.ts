import type { DesignFilePicture } from "../design-file";
import type { StudioAlign, StudioCross } from "../../pages/types";
import type { Box, DesignFrame, DesignShape } from "./frame";
import { pictureType, type DesignRead } from "./sketch";
import { hexColor } from "./svg";
import type { SvgVector } from "./svg";
import type { Zip } from "./zip";

/**
 * 108.6 A Penpot file (`.penpot` from Penpot 2, a ZIP of JSON, or a page's
 * shapes as JSON) read as screens: each board at the top of a page a
 * screen; boards with flex layout keep their rows and columns, texts their
 * fonts, pictures are taken from the file, paths drawn as pictures.
 */

type Obj = Record<string, unknown>;

const ROOT = "00000000-0000-0000-0000-000000000000";
const record = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const list = (v: unknown): Obj[] => (Array.isArray(v) ? v.map(record).filter((x): x is Obj => x !== null) : []);
const num = (v: unknown, d = 0) => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : d;
};

/** A field by its name in Penpot's JSON, camel case or with dashes. */
function get(o: Obj | null | undefined, name: string): unknown {
  if (!o) return undefined;
  if (o[name] !== undefined) return o[name];
  const dashed = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  return o[dashed] ?? o[`:${dashed}`];
}

const ALIGN: Record<string, StudioAlign> = { start: "start", center: "center", end: "end", "space-between": "between", "space-around": "around", "space-evenly": "around" };
const CROSS: Record<string, StudioCross> = { start: "start", center: "center", end: "end", stretch: "stretch" };

class PenpotReader {
  pictures: Record<string, DesignFilePicture> = {};
  vectors: SvgVector[] = [];
  private n = 0;
  constructor(
    readonly objects: Map<string, Obj>,
    private readonly media: Map<string, DesignFilePicture>,
  ) {}

  picture(id: unknown): string | null {
    const found = typeof id === "string" ? this.media.get(id) : undefined;
    if (!found) return null;
    this.n += 1;
    const key = `picture:${this.n}`;
    this.pictures[key] = found;
    return key;
  }

  style(o: Obj): Partial<DesignShape> {
    const out: Partial<DesignShape> = {};
    const fills = list(get(o, "fills"));
    const image = fills.find((f) => record(get(f, "fillImage")));
    const color = [...fills].reverse().find((f) => typeof get(f, "fillColor") === "string");
    if (image) {
      const key = this.picture(get(record(get(image, "fillImage")), "id"));
      if (key) out.picture = key;
    }
    if (color) {
      const hex = hexColor(String(get(color, "fillColor")));
      if (hex) out.fill = hex;
    }
    const stroke = list(get(o, "strokes")).find((s) => typeof get(s, "strokeColor") === "string");
    if (stroke && num(get(stroke, "strokeWidth"), 1) > 0) {
      const hex = hexColor(String(get(stroke, "strokeColor")));
      if (hex) out.stroke = { color: hex, width: num(get(stroke, "strokeWidth"), 1) };
    }
    const radii = ["r1", "r2", "r3", "r4"].map((r) => num(get(o, r)));
    if (radii.some((r) => r > 0)) {
      if (new Set(radii).size > 1) out.corners = radii as [number, number, number, number];
      else out.radius = radii[0];
    } else if (num(get(o, "rx")) > 0) out.radius = num(get(o, "rx"));
    if (list(get(o, "shadow")).some((s) => get(s, "hidden") !== true)) out.shadow = true;
    const opacity = num(get(o, "opacity"), 1);
    if (opacity < 0.99) out.opacity = opacity;
    return out;
  }

  path(o: Obj): string | null {
    const content = get(o, "content");
    if (typeof content === "string") return content;
    const segments = list(content);
    if (!segments.length) return null;
    return segments
      .map((s) => {
        const p = record(get(s, "params")) ?? {};
        const cmd = String(get(s, "command") ?? "");
        if (cmd === "move-to") return `M${num(p.x)} ${num(p.y)}`;
        if (cmd === "line-to") return `L${num(p.x)} ${num(p.y)}`;
        if (cmd === "curve-to") return `C${num(get(p, "c1x"))} ${num(get(p, "c1y"))} ${num(get(p, "c2x"))} ${num(get(p, "c2y"))} ${num(p.x)} ${num(p.y)}`;
        if (cmd === "close-path") return "Z";
        return "";
      })
      .join("");
  }

  shape(id: string, ox: number, oy: number, depth: number): DesignShape[] {
    const o = this.objects.get(id);
    if (!o || get(o, "hidden") === true || depth > 30) return [];
    const box: Box = { x: num(get(o, "x")) - ox, y: num(get(o, "y")) - oy, w: num(get(o, "width")), h: num(get(o, "height")) };
    if (box.w <= 0 || box.h <= 0) return [];
    const name = typeof get(o, "name") === "string" ? { name: String(get(o, "name")).slice(0, 120) } : {};
    const kids = () => (Array.isArray(get(o, "shapes")) ? (get(o, "shapes") as unknown[]) : []).flatMap((k) => (typeof k === "string" ? this.shape(k, ox, oy, depth + 1) : []));
    switch (String(get(o, "type"))) {
      case "frame":
      case "group": {
        const flex = get(o, "layout") === "flex";
        const dir = String(get(o, "layoutFlexDir") ?? "column");
        const gap = record(get(o, "layoutGap"));
        const pad = record(get(o, "layoutPadding"));
        return [
          {
            kind: "frame",
            box,
            ...name,
            ...this.style(o),
            ...(flex
              ? {
                  layout: {
                    dir: dir.startsWith("row") ? ("row" as const) : ("column" as const),
                    gap: num(get(gap, dir.startsWith("row") ? "columnGap" : "rowGap")),
                    padding: [num(get(pad, "p1")), num(get(pad, "p2")), num(get(pad, "p3")), num(get(pad, "p4"))] as [number, number, number, number],
                    align: ALIGN[String(get(o, "layoutJustifyContent"))] ?? "start",
                    cross: CROSS[String(get(o, "layoutAlignItems"))] ?? "start",
                  },
                }
              : {}),
            children: kids(),
          },
        ];
      }
      case "rect":
        return [{ kind: this.style(o).picture && !this.style(o).fill ? "picture" : "rect", box, ...name, ...this.style(o) }];
      case "circle":
        return [{ kind: "ellipse", box, ...name, ...this.style(o) }];
      case "image": {
        const key = this.picture(get(record(get(o, "metadata")), "id"));
        return key ? [{ kind: "picture", box, ...name, picture: key, ...this.style(o) }] : [];
      }
      case "text": {
        const leaves: Obj[] = [];
        const paragraphs: string[] = [];
        let align: string | undefined;
        const walk = (node: Obj) => {
          if (get(node, "type") === "paragraph") {
            align ??= typeof get(node, "textAlign") === "string" ? String(get(node, "textAlign")) : undefined;
            const own = list(get(node, "children"));
            leaves.push(...own);
            paragraphs.push(own.map((l) => String(get(l, "text") ?? "")).join(""));
            return;
          }
          list(get(node, "children")).forEach(walk);
        };
        const content = record(get(o, "content"));
        if (content) walk(content);
        const text = paragraphs.join("\n").trim();
        const leaf = leaves[0] ?? {};
        const fill = list(get(leaf, "fills"))[0];
        const color = hexColor(String(get(leaf, "fillColor") ?? get(fill, "fillColor") ?? ""));
        if (!text) return [];
        const decoration = String(get(leaf, "textDecoration") ?? "");
        return [
          {
            kind: "text",
            box,
            ...name,
            text,
            ...(color ? { color } : {}),
            font: {
              ...(typeof get(leaf, "fontFamily") === "string" ? { family: String(get(leaf, "fontFamily")) } : {}),
              size: num(get(leaf, "fontSize"), 14),
              weight: num(get(leaf, "fontWeight"), 400),
              ...(get(leaf, "fontStyle") === "italic" ? { italic: true } : {}),
              ...(align === "center" ? { align: "center" as const } : align === "right" ? { align: "right" as const } : {}),
              ...(num(get(leaf, "lineHeight")) ? { lineHeight: num(get(leaf, "lineHeight")) } : {}),
              ...(num(get(leaf, "letterSpacing")) ? { letterSpacing: num(get(leaf, "letterSpacing")) } : {}),
              ...(decoration === "underline" ? { underline: true } : decoration === "line-through" ? { strike: true } : {}),
              ...(get(leaf, "textTransform") === "uppercase" ? { uppercase: true } : {}),
            },
          },
        ];
      }
      case "path":
      case "bool": {
        const d = this.path(o);
        if (!d) return [];
        this.n += 1;
        const key = `drawing:${this.n}`;
        const ax = num(get(o, "x"));
        const ay = num(get(o, "y"));
        const fill = this.style(o).fill ?? "none";
        const stroke = this.style(o).stroke;
        this.vectors.push({
          key,
          svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ax} ${ay} ${box.w} ${box.h}" width="${Math.ceil(box.w)}" height="${Math.ceil(box.h)}"><path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke.color}" stroke-width="${stroke.width}"` : ""}/></svg>`,
          w: box.w,
          h: box.h,
        });
        return [{ kind: "picture", box, ...name, picture: key }];
      }
      default:
        return kids();
    }
  }
}

/** The shapes of one page: from the page's own `objects`, or the page's folder of shape files. */
async function pageObjects(zip: Zip, pageFile: string): Promise<Map<string, Obj>> {
  const objects = new Map<string, Obj>();
  const text = await zip.text(pageFile);
  try {
    const page = record(text ? JSON.parse(text) : null);
    const own = record(get(page, "objects"));
    if (own) for (const [id, o] of Object.entries(own)) if (record(o)) objects.set(id, o as Obj);
  } catch {
    // The shapes may still be in their own files.
  }
  if (!objects.size) {
    const folder = pageFile.replace(/\.json$/, "/");
    for (const name of zip.entries.keys()) {
      if (!name.startsWith(folder) || !name.endsWith(".json")) continue;
      const shapeText = await zip.text(name);
      try {
        const o = record(shapeText ? JSON.parse(shapeText) : null);
        if (o && typeof get(o, "id") === "string") objects.set(String(get(o, "id")), o);
      } catch {
        // Left out.
      }
    }
  }
  return objects;
}

function boards(objects: Map<string, Obj>, reader: PenpotReader): DesignFrame[] {
  const out: DesignFrame[] = [];
  for (const [id, o] of objects) {
    if (id === ROOT || get(o, "type") !== "frame" || get(o, "hidden") === true) continue;
    const parent = String(get(o, "parentId") ?? ROOT);
    if (parent !== ROOT) continue;
    const width = num(get(o, "width"));
    const height = num(get(o, "height"));
    if (!width || !height || out.length >= 40) continue;
    const ox = num(get(o, "x"));
    const oy = num(get(o, "y"));
    const own = reader.style(o);
    const shapes = (Array.isArray(get(o, "shapes")) ? (get(o, "shapes") as unknown[]) : []).flatMap((k) => (typeof k === "string" ? reader.shape(k, ox, oy, 1) : []));
    out.push({ name: String(get(o, "name") ?? "Screen").slice(0, 60), width, height, ...(own.fill ? { background: own.fill } : {}), shapes });
  }
  return out;
}

/** The file's boards as screens, or null when it isn't a Penpot file this can read. */
export async function readPenpot(zip: Zip, toBase64: (b: Uint8Array) => string): Promise<DesignRead | null> {
  const manifest = await zip.text("manifest.json");
  if (!manifest || !/penpot/i.test(manifest)) return null;
  const media = new Map<string, DesignFilePicture>();
  for (const name of zip.entries.keys()) {
    const m = /^(?:files\/[^/]+\/)?(?:objects|media)\/([0-9a-f-]{36})(?:\.[a-z]+)?$/.exec(name);
    if (!m || media.size >= 120 || zip.entries.get(name)!.size > 5 * 1024 * 1024) continue;
    const bytes = await zip.read(name);
    const type = bytes ? pictureType(bytes) : null;
    if (bytes && type) media.set(m[1]!, { type, data: toBase64(bytes) });
  }
  const frames: DesignFrame[] = [];
  const pictures: Record<string, DesignFilePicture> = {};
  const vectors: SvgVector[] = [];
  const pageFiles = [...zip.entries.keys()].filter((n) => /^files\/[^/]+\/pages\/[^/]+\.json$/.test(n)).sort();
  for (const pageFile of pageFiles) {
    const reader = new PenpotReader(await pageObjects(zip, pageFile), media);
    const read = boards(reader.objects, reader);
    // Each page's keys apart.
    const prefix = `p${frames.length}`;
    frames.push(...read.map((f) => rekeyFrame(f, prefix)));
    for (const [k, v] of Object.entries(reader.pictures)) pictures[`${prefix}:${k}`] = v;
    vectors.push(...reader.vectors.map((v) => ({ ...v, key: `${prefix}:${v.key}` })));
    if (frames.length >= 40) break;
  }
  return { frames: frames.slice(0, 40), pictures, vectors };
}

/** A page's shapes as JSON (`objects`, by ID), read as screens. */
export function readPenpotJson(value: unknown): DesignRead | null {
  const objects = record(get(record(value), "objects"));
  if (!objects || !Object.values(objects).some((o) => typeof get(record(o), "type") === "string")) return null;
  const map = new Map<string, Obj>();
  for (const [id, o] of Object.entries(objects)) if (record(o)) map.set(id, o as Obj);
  const reader = new PenpotReader(map, new Map());
  return { frames: boards(map, reader), pictures: reader.pictures, vectors: reader.vectors };
}

function rekeyFrame(frame: DesignFrame, prefix: string): DesignFrame {
  const walk = (s: DesignShape): DesignShape => ({ ...s, ...(s.picture ? { picture: `${prefix}:${s.picture}` } : {}), ...(s.children ? { children: s.children.map(walk) } : {}) });
  return { ...frame, shapes: frame.shapes.map(walk) };
}
