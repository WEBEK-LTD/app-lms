import { decompress as zstd } from "fzstd";
import type { DesignFilePicture } from "../design-file";
import { figmaFrame, withFigmaPictures, type FigmaNeeds } from "./figma";
import type { DesignFrame } from "./frame";
import { decodeMessage, decodeSchema } from "./kiwi";
import { fontFromPostScript, pictureType, type DesignRead } from "./sketch";
import type { SvgVector } from "./svg";
import { isZip, openZip } from "./zip";

/**
 * 108.5 Figma's own file (`.fig`), read on a best effort: Figma doesn't
 * document it. It is a ZIP holding `canvas.fig` (Kiwi, see kiwi.ts) and the
 * pictures, or the Kiwi file alone. Its nodes are made into the shape of
 * Figma's REST API, so the Figma link's reader (figma.ts) reads them; the
 * pictures come from the file and drawings are drawn from their outlines.
 * Instances are drawn from their components with their texts overridden.
 */

type Node = Record<string, unknown>;

const record = (v: unknown): Node | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Node) : null);
const list = (v: unknown): Node[] => (Array.isArray(v) ? v.map(record).filter((x): x is Node => x !== null) : []);
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const guidOf = (g: unknown) => {
  const r = record(g);
  return r ? `${num(r.sessionID)}:${num(r.localID)}` : "";
};
const hex = (bytes: unknown) => (bytes instanceof Uint8Array ? [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("") : "");

export type FigError = "not_fig" | "newer";

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  if (data[0] === 0x28 && data[1] === 0xb5 && data[2] === 0x2f && data[3] === 0xfd) return zstd(data);
  const stream = new Blob([data as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** The Kiwi file's schema and message chunks. */
function chunks(bytes: Uint8Array): Uint8Array[] | null {
  const head = new TextDecoder().decode(bytes.subarray(0, 8));
  if (head !== "fig-kiwi" && !head.startsWith("fig-")) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: Uint8Array[] = [];
  let at = 12;
  while (at + 4 <= bytes.length && out.length < 4) {
    const size = view.getUint32(at, true);
    at += 4;
    if (at + size > bytes.length) return null;
    out.push(bytes.subarray(at, at + size));
    at += size;
  }
  return out.length >= 2 ? out : null;
}

/** An outline from the file's geometry blob, as an SVG path (in the node's own space, moved by x, y). */
export function figPath(blob: Uint8Array, x: number, y: number): string {
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  let at = 0;
  let d = "";
  const f = () => {
    const v = view.getFloat32(at, true);
    at += 4;
    return v;
  };
  const p = () => `${x + f()} ${y + f()}`;
  while (at < blob.length) {
    const cmd = blob[at++];
    if (cmd === 0) d += "Z";
    else if (cmd === 1) d += `M${p()}`;
    else if (cmd === 2) d += `L${p()}`;
    else if (cmd === 3) d += `Q${p()} ${p()}`;
    else if (cmd === 4) d += `C${p()} ${p()} ${p()}`;
    else break;
  }
  return d;
}

const TYPES: Record<string, string> = { ROUNDED_RECTANGLE: "RECTANGLE", SYMBOL: "COMPONENT" };

/** A Kiwi paint as Figma's REST API writes it. */
function paint(p: Node): Node {
  return {
    type: p.type,
    visible: p.visible !== false,
    opacity: num(p.opacity, 1),
    ...(record(p.color) ? { color: p.color } : {}),
    ...(record(p.image) ? { imageRef: hex(record(p.image)!.hash) } : {}),
    ...(Array.isArray(p.stops) ? { gradientStops: p.stops } : {}),
  };
}

class FigReader {
  byGuid = new Map<string, Node>();
  children = new Map<string, Node[]>();
  outlines = new Map<string, { d: string; fill: string }[]>();
  private n = 0;
  constructor(
    nodes: Node[],
    private readonly blobs: Uint8Array[],
  ) {
    for (const node of nodes) {
      const id = guidOf(node.guid);
      if (!id) continue;
      this.byGuid.set(id, node);
      const parent = guidOf(record(node.parentIndex)?.guid);
      if (parent) (this.children.get(parent) ?? this.children.set(parent, []).get(parent)!).push(node);
    }
    for (const kids of this.children.values()) kids.sort((a, b) => String(record(a.parentIndex)?.position ?? "").localeCompare(String(record(b.parentIndex)?.position ?? "")));
  }

  /** A node and what is in it, as the REST API's node, at its place on the canvas. */
  rest(node: Node, ox: number, oy: number, depth: number, overrides: Map<string, string>, prefix = ""): Node | null {
    if (node.visible === false || depth > 40) return null;
    this.n += 1;
    if (this.n > 6000) return null;
    const t = record(node.transform) ?? {};
    const size = record(node.size) ?? {};
    const x = ox + num(t.m02);
    const y = oy + num(t.m12);
    const w = num(size.x);
    const h = num(size.y);
    const guid = guidOf(node.guid);
    const id = `${prefix}${guid}`;
    const type = TYPES[String(node.type)] ?? String(node.type);
    const out: Node = {
      id,
      type,
      name: node.name,
      visible: true,
      absoluteBoundingBox: { x, y, width: w, height: h },
      fills: list(node.fillPaints).map(paint),
      strokes: list(node.strokePaints).map(paint),
      strokeWeight: num(node.strokeWeight, 1),
      opacity: num(node.opacity, 1),
      effects: list(node.effects).map((e) => ({ type: e.type, visible: e.visible !== false })),
    };
    if (node.rectangleCornerRadiiIndependent) out.rectangleCornerRadii = [num(node.rectangleTopLeftCornerRadius), num(node.rectangleTopRightCornerRadius), num(node.rectangleBottomRightCornerRadius), num(node.rectangleBottomLeftCornerRadius)];
    else if (num(node.cornerRadius)) out.cornerRadius = num(node.cornerRadius);
    if (node.stackMode === "HORIZONTAL" || node.stackMode === "VERTICAL") {
      Object.assign(out, {
        layoutMode: node.stackMode,
        itemSpacing: num(node.stackSpacing),
        paddingLeft: num(node.stackHorizontalPadding),
        paddingRight: num(node.stackPaddingRight, num(node.stackHorizontalPadding)),
        paddingTop: num(node.stackVerticalPadding),
        paddingBottom: num(node.stackPaddingBottom, num(node.stackVerticalPadding)),
        primaryAxisAlignItems: node.stackPrimaryAlignItems === "SPACE_EVENLY" ? "SPACE_BETWEEN" : node.stackPrimaryAlignItems,
        counterAxisAlignItems: node.stackCounterAlignItems,
      });
    }
    if (type === "TEXT") {
      const font = record(node.fontName) ?? {};
      const style = String(font.style ?? "");
      const weight = fontFromPostScript(`x-${style.replace(/\s+/g, "")}`).weight;
      const size2 = num(node.fontSize, 14);
      const letter = record(node.letterSpacing);
      const line = record(node.lineHeight);
      out.characters = overrides.get(guid) ?? String(record(node.textData)?.characters ?? "");
      out.style = {
        fontFamily: font.family,
        fontSize: size2,
        fontWeight: weight,
        italic: /italic/i.test(style),
        textAlignHorizontal: node.textAlignHorizontal,
        ...(letter && num(letter.value) ? { letterSpacing: letter.units === "PERCENT" ? (num(letter.value) / 100) * size2 : num(letter.value) } : {}),
        ...(line && num(line.value) && line.units !== "RAW" ? { lineHeightPx: line.units === "PERCENT" ? (num(line.value) / 100) * size2 : num(line.value) } : {}),
        textDecoration: node.textDecoration,
        textCase: node.textCase,
      };
      return out;
    }
    // Outlines kept for drawing it as a picture, if it is one.
    const geometry = list(node.fillGeometry);
    if (geometry.length) {
      const fill = list(node.fillPaints).find((p) => p.type === "SOLID" && p.visible !== false);
      const c = record(fill?.color);
      const color = c ? `rgb(${Math.round(num(c.r) * 255)},${Math.round(num(c.g) * 255)},${Math.round(num(c.b) * 255)})` : "#000";
      const paths = geometry.map((g) => this.blobs[num(g.commandsBlob, -1)]).filter((b): b is Uint8Array => b instanceof Uint8Array);
      this.outlines.set(id, paths.map((b) => ({ d: figPath(b, x, y), fill: color })));
    }
    let kids = this.children.get(guid) ?? [];
    let own = overrides;
    let childPrefix = prefix;
    // An instance: its component's children, its texts overridden.
    if (type === "INSTANCE") {
      const symbol = this.byGuid.get(guidOf(record(node.symbolData)?.symbolID));
      if (symbol && !kids.length) {
        kids = this.children.get(guidOf(symbol.guid)) ?? [];
        own = new Map(overrides);
        for (const o of list(record(node.symbolData)?.symbolOverrides)) {
          const path = list(record(o.guidPath)?.guids);
          const text = record(o.textData)?.characters;
          if (path.length && typeof text === "string") own.set(guidOf(path[path.length - 1]), text);
        }
        childPrefix = `${id};`;
      }
    }
    out.children = kids.map((k) => this.rest(k, x, y, depth + 1, own, childPrefix)).filter((k): k is Node => k !== null);
    return out;
  }

  /** The outlines of a node and everything in it, as a drawing. */
  drawing(id: string, node: Node): SvgVector | null {
    const parts: { d: string; fill: string }[] = [];
    const walk = (n: Node) => {
      parts.push(...(this.outlines.get(String(n.id)) ?? []));
      list(n.children).forEach(walk);
    };
    walk(node);
    const b = record(node.absoluteBoundingBox);
    const w = num(b?.width);
    const h = num(b?.height);
    if (!parts.length || w < 1 || h < 1) return null;
    return { key: `figma-render:${id}`, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${num(b?.x)} ${num(b?.y)} ${w} ${h}" width="${Math.ceil(w)}" height="${Math.ceil(h)}">${parts.map((p) => `<path d="${p.d}" fill="${p.fill}"/>`).join("")}</svg>`, w, h };
  }
}

function findNode(root: Node, id: string): Node | null {
  if (root.id === id) return root;
  for (const c of list(root.children)) {
    const f = findNode(c, id);
    if (f) return f;
  }
  return null;
}

/** The file's screens (the frames on its pages), or why it can't be read. */
export async function readFig(bytes: Uint8Array, toBase64: (b: Uint8Array) => string): Promise<{ ok: true; read: DesignRead } | { ok: false; error: FigError }> {
  let canvas = bytes;
  const images = new Map<string, DesignFilePicture>();
  if (isZip(bytes)) {
    const zip = openZip(bytes);
    const inner = zip ? await zip.read("canvas.fig") : null;
    if (!zip || !inner) return { ok: false, error: "not_fig" };
    canvas = inner;
    for (const name of zip.entries.keys()) {
      if (!name.startsWith("images/") || images.size >= 120 || zip.entries.get(name)!.size > 5 * 1024 * 1024) continue;
      const data = await zip.read(name);
      const type = data ? pictureType(data) : null;
      if (data && type) images.set(name.slice("images/".length), { type, data: toBase64(data) });
    }
  }
  const parts = chunks(canvas);
  if (!parts) return { ok: false, error: "not_fig" };
  let message: Record<string, unknown>;
  try {
    const schema = decodeSchema(await inflate(parts[0]!));
    message = decodeMessage(schema, await inflate(parts[1]!));
  } catch {
    return { ok: false, error: "newer" };
  }
  const blobs = list(message.blobs).map((b) => b.bytes as Uint8Array);
  const reader = new FigReader(list(message.nodeChanges), blobs);
  const doc = [...reader.byGuid.values()].find((n) => n.type === "DOCUMENT");
  if (!doc) return { ok: false, error: "not_fig" };
  const pages = (reader.children.get(guidOf(doc.guid)) ?? []).filter((p) => p.type === "CANVAS" && !/internal only/i.test(String(p.name ?? "")));
  const frames: DesignFrame[] = [];
  const pictures: Record<string, DesignFilePicture> = {};
  const vectors: SvgVector[] = [];
  for (const page of pages) {
    for (const top of reader.children.get(guidOf(page.guid)) ?? []) {
      if (frames.length >= 40 || !["FRAME", "SYMBOL", "INSTANCE", "SECTION"].includes(String(top.type))) continue;
      const rest = reader.rest(top, 0, 0, 0, new Map());
      if (!rest) continue;
      const needs: FigmaNeeds = { images: new Set(), renders: new Set() };
      const frame = figmaFrame(rest, needs);
      if (!frame) continue;
      const found = new Map<string, string>();
      for (const key of needs.images) {
        const picture = images.get(key.slice("figma-image:".length));
        if (picture) {
          pictures[key] = picture;
          found.set(key, key);
        }
      }
      for (const key of needs.renders) {
        const node = findNode(rest, key.slice("figma-render:".length));
        const v = node ? reader.drawing(key.slice("figma-render:".length), node) : null;
        if (v) {
          vectors.push(v);
          found.set(key, key);
        }
      }
      frames.push(withFigmaPictures(frame, found));
    }
  }
  return { ok: true, read: { frames, pictures, vectors } };
}
