import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import type { StudioNode } from "@/lib/pages/types";
import { figPath, readFig } from "@/lib/studio/import/fig";
import { frameToPage } from "@/lib/studio/import/frame";
import { decodeMessage, decodeSchema, encodeSchema, type KiwiDefinition } from "@/lib/studio/import/kiwi";
import { readPenpot, readPenpotJson } from "@/lib/studio/import/penpot";
import { fontFromPostScript, readSketch, sketchPath } from "@/lib/studio/import/sketch";
import { openZip } from "@/lib/studio/import/zip";
import { zip } from "../e2e/zip";

const b64 = (b: Uint8Array) => Buffer.from(b).toString("base64");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

function all(node: StudioNode): StudioNode[] {
  return [node, ...(node.children ?? []).flatMap(all)];
}

let n = 0;
const page = (frame: Parameters<typeof frameToPage>[0]) => frameToPage(frame, { rtl: false, newId: () => `x${(n += 1)}` });

describe("108.5–108.6 design files from other tools", () => {
  it("reads a ZIP's entries, deflated", async () => {
    const z = openZip(zip({ "a.json": '{"ok":true}', "images/p.png": PNG }))!;
    expect([...z.entries.keys()]).toEqual(["a.json", "images/p.png"]);
    expect(await z.text("a.json")).toBe('{"ok":true}');
    expect(Buffer.from((await z.read("images/p.png"))!).equals(PNG)).toBe(true);
    expect(openZip(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it("reads a Sketch file: an artboard's texts, boxes, bitmap, symbol and drawing", async () => {
    const color = (red: number, green: number, blue: number) => ({ _class: "color", red, green, blue, alpha: 1 });
    const fill = (c: object) => ({ style: { fills: [{ isEnabled: true, fillType: 0, color: c }] } });
    const frame = (x: number, y: number, width: number, height: number) => ({ _class: "rect", x, y, width, height });
    const text = (id: string, string: string, y: number, name = "Cairo-Bold", size = 24) => ({
      _class: "text",
      do_objectID: id,
      name: string,
      frame: frame(24, y, 300, size * 1.4),
      attributedString: { string, attributes: [{ location: 0, length: string.length, attributes: { MSAttributedStringFontAttribute: { attributes: { name, size } }, MSAttributedStringColorAttribute: color(0.0549, 0.051, 0.1412), paragraphStyle: { alignment: 0 } } }] },
    });
    const master = { _class: "symbolMaster", symbolID: "S1", name: "Button", frame: frame(0, 0, 200, 48), layers: [{ _class: "rectangle", name: "bg", fixedRadius: 12, frame: frame(0, 0, 200, 48), ...fill(color(1, 0.353, 0.1216)) }, { ...text("T1", "Label", 12, "Cairo-SemiBold", 16), frame: frame(16, 12, 168, 22) }] };
    const sketchPage = {
      _class: "page",
      layers: [
        {
          _class: "artboard",
          name: "Home",
          frame: frame(0, 0, 390, 844),
          hasBackgroundColor: true,
          backgroundColor: color(0.9843, 0.9725, 0.949),
          layers: [
            text("A", "Welcome to Lale", 80),
            { _class: "bitmap", name: "Photo", frame: frame(24, 140, 342, 180), image: { _class: "MSJSONFileReference", _ref: "images/photo.png" } },
            { _class: "symbolInstance", name: "Order", symbolID: "S1", frame: frame(24, 340, 342, 52), overrideValues: [{ overrideName: "T1_stringValue", value: "Order now" }] },
            { _class: "shapePath", name: "Arrow", frame: frame(24, 420, 24, 24), isClosed: true, points: [{ point: "{0, 0}" }, { point: "{1, 0.5}" }, { point: "{0, 1}" }], ...fill(color(0, 0, 0)) },
          ],
        },
        master,
      ],
    };
    const file = zip({ "document.json": "{}", "meta.json": "{}", "pages/p1.json": JSON.stringify(sketchPage), "images/photo.png": PNG });
    const read = (await readSketch(openZip(file)!, b64))!;
    expect(read.frames.map((f) => f.name)).toEqual(["Home"]);
    expect(read.vectors).toHaveLength(1);
    expect(read.vectors[0]!.svg).toContain('d="M24 420L48 432L24 444L24 420Z"');
    const nodes = all(page(read.frames[0]!).studio.body);
    expect(nodes.find((x) => x.text === "Welcome to Lale")).toMatchObject({ font: { family: "Cairo", weight: 700, size: 24 }, color: "#0E0D24" });
    expect(nodes.find((x) => x.type === "image")?.image_url).toMatch(/^picture:/);
    // The symbol drawn from its master, its text overridden: a button.
    expect(nodes.find((x) => x.type === "button")).toMatchObject({ text: "Order now", background: "#FF5A1F", radius: 12 });
    expect(Object.values(read.pictures)).toEqual([{ type: "image/png", data: PNG.toString("base64") }]);
    expect(fontFromPostScript("OpenSans-SemiBoldItalic")).toEqual({ family: "Open Sans", weight: 600, italic: true });
    expect(sketchPath({ _class: "oval", frame: { width: 10, height: 10 } }, 0, 0)).toMatch(/^M5 0A5 5/);
  });

  it("reads a Penpot file: boards, flex layout, texts and pictures", async () => {
    const root = "00000000-0000-0000-0000-000000000000";
    const objects = {
      [root]: { id: root, type: "frame", shapes: ["b1"] },
      b1: { id: "b1", type: "frame", name: "Menu", parentId: root, x: 1000, y: 0, width: 390, height: 844, fills: [{ fillColor: "#FBF8F2", fillOpacity: 1 }], shapes: ["t1", "row", "img"] },
      t1: {
        id: "t1",
        type: "text",
        name: "Title",
        parentId: "b1",
        x: 1024,
        y: 60,
        width: 300,
        height: 40,
        content: { type: "root", children: [{ type: "paragraph-set", children: [{ type: "paragraph", textAlign: "left", children: [{ text: "Our menu", fontFamily: "Cairo", fontSize: "28", fontWeight: "700", fillColor: "#0E0D24" }] }] }] },
      },
      row: { id: "row", type: "frame", name: "Chips", parentId: "b1", x: 1000, y: 120, width: 390, height: 40, layout: "flex", layoutFlexDir: "row", layoutGap: { rowGap: 0, columnGap: 8 }, layoutPadding: { p1: 0, p2: 16, p3: 0, p4: 16 }, layoutAlignItems: "center", shapes: ["c1", "c2"] },
      c1: { id: "c1", type: "rect", parentId: "row", x: 1016, y: 120, width: 80, height: 40, rx: 20, fills: [{ fillColor: "#FF5A1F" }] },
      c2: { id: "c2", type: "rect", parentId: "row", x: 1104, y: 120, width: 80, height: 40, rx: 20, fills: [{ fillColor: "#1F4E5F" }] },
      img: { id: "img", type: "image", name: "Dish", parentId: "b1", x: 1024, y: 180, width: 342, height: 200, metadata: { id: "11111111-2222-3333-4444-555555555555", mtype: "image/png" } },
    };
    const file = zip({
      "manifest.json": JSON.stringify({ type: "penpot/export-files", version: 1, files: [{ id: "F" }] }),
      "files/F/pages/P.json": JSON.stringify({ id: "P", name: "Page 1", objects }),
      "objects/11111111-2222-3333-4444-555555555555.png": PNG,
    });
    const read = (await readPenpot(openZip(file)!, b64))!;
    expect(read.frames.map((f) => f.name)).toEqual(["Menu"]);
    expect(read.frames[0]!.background).toBe("#FBF8F2");
    const nodes = all(page(read.frames[0]!).studio.body);
    expect(nodes.find((x) => x.text === "Our menu")).toMatchObject({ font: { family: "Cairo", size: 28, weight: 700 }, color: "#0E0D24" });
    expect(nodes.find((x) => x.name === "Chips")).toMatchObject({ type: "row", gap: 8, cross: "center", padding: { start: 16, end: 16 } });
    expect(nodes.find((x) => x.type === "image")?.image_url).toMatch(/picture:/);
    // A page's shapes as JSON too.
    expect(readPenpotJson({ objects })?.frames).toHaveLength(1);
    expect(readPenpotJson({ hello: 1 })).toBeNull();
  });

  it("reads Kiwi, the format of Figma's own file", () => {
    const defs: KiwiDefinition[] = [
      { name: "Kind", kind: 0, fields: [{ name: "A", type: 0, isArray: false, value: 0 }, { name: "B", type: 0, isArray: false, value: 1 }] },
      { name: "Message", kind: 2, fields: [{ name: "kind", type: 0, isArray: false, value: 1 }, { name: "name", type: -6, isArray: false, value: 2 }, { name: "size", type: -5, isArray: false, value: 3 }, { name: "data", type: -2, isArray: true, value: 4 }] },
    ];
    const schema = decodeSchema(encodeSchema(defs));
    expect(schema).toEqual(defs);
    // kind B, name "Hi", size 1.5, data [7, 8]
    const message = new Uint8Array([1, 1, 2, 72, 105, 0, 3, ...varFloat(1.5), 4, 2, 7, 8, 0]);
    expect(decodeMessage(schema, message)).toEqual({ kind: "B", name: "Hi", size: 1.5, data: new Uint8Array([7, 8]) });
  });

  it("reads a Figma file (best effort): its frame, texts, auto layout and picture", async () => {
    const fig = figFile();
    const read = await readFig(zip({ "canvas.fig": fig, "meta.json": "{}", "images/abcd": PNG }), b64);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.read.frames.map((f) => f.name)).toEqual(["Home"]);
    const nodes = all(page(read.read.frames[0]!).studio.body);
    expect(nodes.find((x) => x.text === "Hello Figma")).toMatchObject({ font: { family: "Cairo", size: 24, weight: 700 } });
    expect(nodes.find((x) => x.type === "row")).toMatchObject({ gap: 12 });
    expect(Object.keys(read.read.pictures)).toEqual(["figma-image:abcd"]);
    expect(read.read.vectors).toHaveLength(1);
    expect(read.read.vectors[0]!.svg).toContain('viewBox="510 500 24 20"');
    expect(read.read.vectors[0]!.svg).toContain('d="M510 500L534 500L522 520Z"');
    // Not a Figma file.
    expect(await readFig(new Uint8Array([1, 2, 3, 4]), b64)).toEqual({ ok: false, error: "not_fig" });
    expect(figPath(new Uint8Array([0]), 0, 0)).toBe("Z");
  });
});

function varFloat(value: number): number[] {
  const f = new Float32Array([value]);
  let bits = new Int32Array(f.buffer)[0]!;
  bits = (bits >>> 23) | (bits << 9);
  if ((bits & 255) === 0) return [0];
  return [bits & 255, (bits >>> 8) & 255, (bits >>> 16) & 255, (bits >>> 24) & 255];
}

/** A small `canvas.fig`: Figma's Kiwi schema (the parts read) and a document with one frame. */
function figFile(): Uint8Array {
  const T = { bool: -1, byte: -2, uint: -4, float: -5, string: -6 };
  const defs: KiwiDefinition[] = [];
  const def = (name: string, kind: number, fields: [string, number, boolean?][]) => {
    defs.push({ name, kind, fields: fields.map(([fname, type, isArray], i) => ({ name: fname, type, isArray: isArray ?? false, value: kind === 0 ? i : i + 1 })) });
    return defs.length - 1;
  };
  const nodeType = def("NodeType", 0, [["DOCUMENT", 0], ["CANVAS", 0], ["FRAME", 0], ["TEXT", 0], ["ROUNDED_RECTANGLE", 0], ["VECTOR", 0]]);
  const paintType = def("PaintType", 0, [["SOLID", 0], ["IMAGE", 0]]);
  const stack = def("StackMode", 0, [["NONE", 0], ["HORIZONTAL", 0], ["VERTICAL", 0]]);
  const guid = def("GUID", 1, [["sessionID", T.uint], ["localID", T.uint]]);
  const parent = def("ParentIndex", 1, [["guid", guid], ["position", T.string]]);
  const vector = def("Vector", 1, [["x", T.float], ["y", T.float]]);
  const matrix = def("Matrix", 1, [["m00", T.float], ["m01", T.float], ["m02", T.float], ["m10", T.float], ["m11", T.float], ["m12", T.float]]);
  const color = def("Color", 1, [["r", T.float], ["g", T.float], ["b", T.float], ["a", T.float]]);
  const image = def("Image", 2, [["hash", T.byte, true]]);
  const paint = def("Paint", 2, [["type", paintType], ["color", color], ["visible", T.bool], ["opacity", T.float], ["image", image]]);
  const font = def("FontName", 1, [["family", T.string], ["style", T.string], ["postscript", T.string]]);
  const text = def("TextData", 2, [["characters", T.string]]);
  const path = def("Path", 2, [["commandsBlob", T.uint]]);
  const node = def("NodeChange", 2, [
    ["guid", guid],
    ["parentIndex", parent],
    ["type", nodeType],
    ["name", T.string],
    ["size", vector],
    ["transform", matrix],
    ["fillPaints", paint, true],
    ["textData", text],
    ["fontName", font],
    ["fontSize", T.float],
    ["stackMode", stack],
    ["stackSpacing", T.float],
    ["cornerRadius", T.float],
    ["fillGeometry", path, true],
  ]);
  const blob = def("Blob", 2, [["bytes", T.byte, true]]);
  def("Message", 2, [
    ["nodeChanges", node, true],
    ["blobs", blob, true],
  ]);

  const out: number[] = [];
  const uint = (v: number) => {
    do {
      let b = v & 127;
      v = Math.floor(v / 128);
      if (v) b |= 128;
      out.push(b);
    } while (v);
  };
  const str = (s: string) => out.push(...new TextEncoder().encode(s), 0);
  const float = (v: number) => out.push(...varFloat(v));
  const field = (id: number) => uint(id);
  const g = (s: number, l: number) => {
    uint(s);
    uint(l);
  };
  const pos = (x: number, y: number) => [1, 0, x, 0, 1, y].forEach(float);
  const nodeOf = (o: { s: number; l: number; parent?: [number, number, string]; type: number; name: string; size: [number, number]; at: [number, number]; fill?: () => void; extra?: () => void }) => {
    field(1);
    g(o.s, o.l);
    if (o.parent) {
      field(2);
      g(o.parent[0], o.parent[1]);
      str(o.parent[2]);
    }
    field(3);
    uint(o.type);
    field(4);
    str(o.name);
    field(5);
    float(o.size[0]);
    float(o.size[1]);
    field(6);
    pos(o.at[0], o.at[1]);
    o.fill?.();
    o.extra?.();
    uint(0);
  };
  const solid = (r: number, gg: number, b: number) => () => {
    field(7);
    uint(1);
    field(1);
    uint(0);
    field(2);
    [r, gg, b, 1].forEach(float);
    field(3);
    out.push(1);
    uint(0);
  };
  // The message.
  field(1);
  uint(8);
  nodeOf({ s: 0, l: 0, type: 0, name: "Document", size: [0, 0], at: [0, 0] });
  nodeOf({ s: 0, l: 1, parent: [0, 0, "a"], type: 1, name: "Page 1", size: [0, 0], at: [0, 0] });
  nodeOf({ s: 1, l: 1, parent: [0, 1, "a"], type: 2, name: "Home", size: [390, 844], at: [500, 100], fill: solid(0.98, 0.97, 0.95) });
  nodeOf({
    s: 1,
    l: 2,
    parent: [1, 1, "a"],
    type: 3,
    name: "Hello Figma",
    size: [300, 36],
    at: [24, 80],
    fill: solid(0.05, 0.05, 0.14),
    extra: () => {
      field(8);
      field(1);
      str("Hello Figma");
      uint(0);
      field(9);
      str("Cairo");
      str("Bold");
      str("Cairo-Bold");
      field(10);
      float(24);
    },
  });
  nodeOf({
    s: 1,
    l: 3,
    parent: [1, 1, "b"],
    type: 4,
    name: "Photo",
    size: [342, 180],
    at: [24, 140],
    fill: () => {
      field(7);
      uint(1);
      field(1);
      uint(1);
      field(5);
      field(1);
      uint(2);
      out.push(0xab, 0xcd);
      uint(0);
      uint(0);
    },
    extra: () => {
      field(13);
      float(16);
    },
  });
  nodeOf({
    s: 1,
    l: 4,
    parent: [1, 1, "c"],
    type: 2,
    name: "Chips",
    size: [390, 40],
    at: [0, 340],
    extra: () => {
      field(11);
      uint(1);
      field(12);
      float(12);
    },
  });
  nodeOf({ s: 1, l: 5, parent: [1, 4, "a"], type: 4, name: "Chip 1", size: [80, 40], at: [16, 0], fill: solid(1, 0.35, 0.12) });
  nodeOf({
    s: 1,
    l: 6,
    parent: [1, 1, "d"],
    type: 5,
    name: "Arrow",
    size: [24, 20],
    at: [10, 400],
    fill: solid(0, 0, 0),
    extra: () => {
      field(14);
      uint(1);
      field(1);
      uint(0);
      uint(0);
    },
  });
  // Blob 0: M0 0 L24 0 L12 20 Z
  field(2);
  uint(1);
  field(1);
  const f32 = (v: number) => [...new Uint8Array(new Float32Array([v]).buffer)];
  const outline = [1, ...f32(0), ...f32(0), 2, ...f32(24), ...f32(0), 2, ...f32(12), ...f32(20), 0];
  uint(outline.length);
  out.push(...outline);
  uint(0);
  uint(0);

  const schema = deflateRawSync(Buffer.from(encodeSchema(defs)));
  const data = deflateRawSync(Buffer.from(out));
  const head = Buffer.alloc(12);
  head.write("fig-kiwi", 0, "latin1");
  head.writeUInt32LE(15, 8);
  const len = (n2: number) => {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(n2, 0);
    return b;
  };
  return new Uint8Array(Buffer.concat([head, len(schema.length), schema, len(data.length), data]));
}
