import type { DesignFilePicture } from "../design-file";
import type { Box, DesignFont, DesignFrame, DesignShape } from "./frame";
import { elementsOf, localName, parseXml, textOf, writeXml, type XmlElement } from "./xml";

/**
 * 108.3 An SVG exported from any design tool (Figma, Adobe XD, Sketch,
 * Penpot, Illustrator, Affinity, Canva) read as a screen: rectangles,
 * circles and lines become boxes, texts stay texts, embedded pictures are
 * kept, and drawings (paths) are drawn as pictures by the browser
 * (`vectors`). In Figma, untick "Outline text" so texts stay texts.
 */

export interface SvgVector {
  key: string;
  /** A whole SVG drawing just this part, at its size. */
  svg: string;
  w: number;
  h: number;
}

export interface SvgRead {
  frame: DesignFrame;
  /** Pictures embedded in the file, by key. */
  pictures: Record<string, DesignFilePicture>;
  /** Drawings to draw as pictures (their keys are used in `frame`). */
  vectors: SvgVector[];
}

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(m: Matrix, n: Matrix): Matrix {
  return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
}

function numbers(text: string): number[] {
  return (text.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []).map(Number);
}

export function parseTransform(text: string | undefined): Matrix {
  let m = IDENTITY;
  if (!text) return m;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  for (let r = re.exec(text); r; r = re.exec(text)) {
    const v = numbers(r[2]!);
    let t: Matrix = IDENTITY;
    if (r[1] === "matrix" && v.length === 6) t = v as Matrix;
    else if (r[1] === "translate") t = [1, 0, 0, 1, v[0] ?? 0, v[1] ?? 0];
    else if (r[1] === "scale") t = [v[0] ?? 1, 0, 0, v[1] ?? v[0] ?? 1, 0, 0];
    else if (r[1] === "rotate") {
      const a = ((v[0] ?? 0) * Math.PI) / 180;
      const [cx, cy] = [v[1] ?? 0, v[2] ?? 0];
      t = multiply(multiply([1, 0, 0, 1, cx, cy], [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]), [1, 0, 0, 1, -cx, -cy]);
    } else if (r[1] === "skewX") t = [1, 0, Math.tan(((v[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
    else if (r[1] === "skewY") t = [1, Math.tan(((v[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
    m = multiply(m, t);
  }
  return m;
}

const apply = (m: Matrix, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const angleOf = (m: Matrix) => (Math.atan2(m[1], m[0]) * 180) / Math.PI;
const scaleOf = (m: Matrix) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;

/** A box moved by a transform; a turned box keeps its own size and gets the turn. */
function placeBox(m: Matrix, x: number, y: number, w: number, h: number): { box: Box; rotation: number } {
  const rotation = angleOf(m);
  if (Math.abs(rotation) < 0.5 || Math.abs(Math.abs(rotation) - 180) < 0.5) {
    const pts = [apply(m, x, y), apply(m, x + w, y), apply(m, x, y + h), apply(m, x + w, y + h)];
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return { box: { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }, rotation: 0 };
  }
  const s = scaleOf(m);
  const [cx, cy] = apply(m, x + w / 2, y + h / 2);
  return { box: { x: cx - (w * s) / 2, y: cy - (h * s) / 2, w: w * s, h: h * s }, rotation };
}

/** The box around a path (its control points included: a little generous on curves). */
export function pathBox(d: string): Box | null {
  const tokens = d.match(/[a-df-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? [];
  const xs: number[] = [];
  const ys: number[] = [];
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let cmd = "";
  let i = 0;
  const next = () => Number(tokens[i++]);
  const add = (px: number, py: number) => {
    xs.push(px);
    ys.push(py);
  };
  while (i < tokens.length) {
    if (/[a-z]/i.test(tokens[i]!)) cmd = tokens[i++]!;
    else if (!cmd) return null;
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case "M":
      case "L":
      case "T": {
        x = ox + next();
        y = oy + next();
        add(x, y);
        if (cmd.toUpperCase() === "M") {
          sx = x;
          sy = y;
          cmd = rel ? "l" : "L";
        }
        break;
      }
      case "H":
        x = ox + next();
        add(x, y);
        break;
      case "V":
        y = oy + next();
        add(x, y);
        break;
      case "C":
        add(ox + next(), oy + next());
        add(ox + next(), oy + next());
        x = ox + next();
        y = oy + next();
        add(x, y);
        break;
      case "S":
      case "Q":
        add(ox + next(), oy + next());
        x = ox + next();
        y = oy + next();
        add(x, y);
        break;
      case "A": {
        const rx = Math.abs(next());
        const ry = Math.abs(next());
        i += 3;
        const px0 = x;
        const py0 = y;
        x = ox + next();
        y = oy + next();
        add(x, y);
        add(Math.min(px0, x) - rx * 0, Math.min(py0, y));
        // The arc may bulge beyond its ends by up to its radii.
        add((px0 + x) / 2 - rx, (py0 + y) / 2 - ry);
        add((px0 + x) / 2 + rx, (py0 + y) / 2 + ry);
        break;
      }
      case "Z":
        x = sx;
        y = sy;
        break;
      default:
        return null;
    }
    if (xs.some((v) => Number.isNaN(v)) || ys.some((v) => Number.isNaN(v))) return null;
  }
  if (!xs.length) return null;
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

/** Colours as #RRGGBB (named ones the tools use, rgb(), #rgb). */
export function hexColor(value: string | undefined): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "none" || v === "transparent") return null;
  const named: Record<string, string> = { white: "#FFFFFF", black: "#000000", red: "#FF0000", blue: "#0000FF", green: "#008000", gray: "#808080", grey: "#808080" };
  if (named[v]) return named[v]!;
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) return `#${[...m[1]!].map((c) => c + c).join("")}`.toUpperCase();
  m = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/.exec(v);
  if (m) return `#${m[1]!}`.toUpperCase();
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(v);
  if (rgb) return `#${[rgb[1], rgb[2], rgb[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  return null;
}

type Style = Record<string, string>;

const INHERITED = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "font-family", "font-size", "font-weight", "font-style", "text-anchor", "letter-spacing", "text-decoration", "text-transform", "line-height", "color", "visibility"];

function styleOf(el: XmlElement, classes: Map<string, Style>, inherited: Style): Style {
  const out: Style = {};
  for (const key of INHERITED) if (inherited[key] !== undefined) out[key] = inherited[key]!;
  for (const cls of (el.attrs.class ?? "").split(/\s+/)) {
    const rule = cls ? classes.get(cls) : undefined;
    if (rule) Object.assign(out, rule);
  }
  for (const [k, v] of Object.entries(el.attrs)) if (k !== "style" && k !== "class" && k !== "transform") out[k] = v;
  for (const decl of (el.attrs.style ?? "").split(";")) {
    const colon = decl.indexOf(":");
    if (colon > 0) out[decl.slice(0, colon).trim()] = decl.slice(colon + 1).trim();
  }
  return out;
}

function cssRules(text: string): Map<string, Style> {
  const rules = new Map<string, Style>();
  const re = /([^{}]+)\{([^}]*)\}/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const decls: Style = {};
    for (const decl of m[2]!.split(";")) {
      const colon = decl.indexOf(":");
      if (colon > 0) decls[decl.slice(0, colon).trim()] = decl.slice(colon + 1).trim();
    }
    for (const sel of m[1]!.split(",")) {
      const cls = /^\s*\.([\w-]+)\s*$/.exec(sel);
      if (cls) rules.set(cls[1]!, { ...(rules.get(cls[1]!) ?? {}), ...decls });
    }
  }
  return rules;
}

const num = (v: string | undefined, fallback = 0) => {
  const n = v === undefined ? NaN : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

const DATA_URL = /^data:(image\/(?:png|jpe?g|webp|svg\+xml))(;base64)?,(.*)$/s;

class Reader {
  defs = new Map<string, XmlElement>();
  classes = new Map<string, Style>();
  pictures: Record<string, DesignFilePicture> = {};
  vectors: SvgVector[] = [];
  defsXml = "";
  private n = 0;

  constructor(private readonly root: XmlElement) {
    for (const el of walk(root)) {
      if (el.attrs.id) this.defs.set(el.attrs.id, el);
      if (localName(el) === "style") for (const [k, v] of cssRules(textOf(el))) this.classes.set(k, v);
      if (localName(el) === "defs") this.defsXml += elementsOf(el).map(writeXml).join("");
    }
  }

  key(prefix: string): string {
    this.n += 1;
    return `${prefix}:${this.n}`;
  }

  ref(value: string | undefined): XmlElement | null {
    const m = /url\(\s*['"]?#([^'")]+)['"]?\s*\)/.exec(value ?? "") ?? /^#(.+)$/.exec(value ?? "");
    return m ? (this.defs.get(m[1]!) ?? null) : null;
  }

  /** A picture from an `<image>` (embedded, or at an https address). */
  pictureOf(image: XmlElement): string | null {
    const href = image.attrs.href ?? image.attrs["xlink:href"] ?? "";
    const m = DATA_URL.exec(href);
    if (m) {
      if (m[1] === "image/svg+xml") return null;
      const key = this.key("picture");
      const type = m[1] === "image/jpg" ? "image/jpeg" : m[1]!;
      const data = m[2] ? m[3]!.replace(/\s+/g, "") : btoaText(decodeURIComponent(m[3]!));
      this.pictures[key] = { type, data };
      return key;
    }
    return /^https:\/\//.test(href) ? href : null;
  }

  /** What fills a shape: a colour, a gradient or a picture. */
  paint(style: Style): Pick<DesignShape, "fill" | "fillOpacity" | "gradient" | "picture"> {
    const fill = style.fill;
    if (fill === undefined) return { fill: "#000000" };
    const target = this.ref(fill);
    if (target) {
      const kind = localName(target);
      if (kind === "linearGradient" || kind === "radialGradient") {
        const stops = elementsOf(resolveHref(target, this.defs)).filter((e) => localName(e) === "stop");
        const color = (e: XmlElement | undefined) => (e ? hexColor(styleOf(e, this.classes, {})["stop-color"]) : null);
        const from = color(stops[0]);
        const to = color(stops[stops.length - 1]);
        if (!from || !to) return from ? { fill: from } : {};
        if (from === to) return { fill: from };
        const [x1, y1, x2, y2] = [num(target.attrs.x1), num(target.attrs.y1), num(target.attrs.x2, 1), num(target.attrs.y2)];
        const angle = kind === "linearGradient" ? Math.round(((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + 90 + 360) % 360) : 180;
        return { gradient: { from, to, angle } };
      }
      if (kind === "pattern") {
        for (const el of walk(target)) {
          const image = localName(el) === "image" ? el : localName(el) === "use" ? this.ref(el.attrs.href ?? el.attrs["xlink:href"]) : null;
          if (image && localName(image) === "image") {
            const key = this.pictureOf(image);
            if (key) return { picture: key };
          }
        }
      }
      return {};
    }
    const hex = hexColor(fill);
    const opacity = num(style["fill-opacity"], 1);
    return hex ? { fill: hex, ...(opacity < 0.99 ? { fillOpacity: opacity } : {}) } : {};
  }

  stroke(style: Style, scale: number): DesignShape["stroke"] | undefined {
    const color = hexColor(style.stroke);
    const width = num(style["stroke-width"], 1) * scale;
    return color && width > 0 ? { color, width } : undefined;
  }

  font(style: Style, scale: number): DesignFont {
    const weight = style["font-weight"];
    const decoration = style["text-decoration"] ?? "";
    const size = num(style["font-size"], 16) * scale;
    const family = (style["font-family"] ?? "").split(",")[0]!.replace(/['"]/g, "").trim();
    const anchor = style["text-anchor"];
    const lineHeight = style["line-height"] ? num(style["line-height"]) / (style["line-height"].endsWith("px") ? size / scale : 1) : undefined;
    return {
      ...(family ? { family: family.replace(/-(Regular|Bold|Medium|SemiBold|Semibold|Light|Black|ExtraBold|Thin)$/i, "") } : {}),
      size,
      ...(weight ? { weight: weight === "bold" ? 700 : weight === "normal" ? 400 : num(weight, 400) } : {}),
      ...(style["font-style"] === "italic" ? { italic: true } : {}),
      ...(anchor === "middle" ? { align: "center" as const } : anchor === "end" ? { align: "right" as const } : {}),
      ...(lineHeight && lineHeight > 0 ? { lineHeight } : {}),
      ...(style["letter-spacing"] ? { letterSpacing: num(style["letter-spacing"]) * scale } : {}),
      ...(/underline/.test(decoration) ? { underline: true } : {}),
      ...(/line-through/.test(decoration) ? { strike: true } : {}),
      ...(style["text-transform"] === "uppercase" ? { uppercase: true } : {}),
    };
  }

  /** A part of the drawing made into a picture the browser draws. */
  vector(el: XmlElement, m: Matrix, style: Style, box: Box): DesignShape | null {
    if (box.w < 1 || box.h < 1) return null;
    const key = this.key("drawing");
    const keep = Object.fromEntries(Object.entries(style).filter(([k]) => INHERITED.includes(k)));
    const attrs = Object.entries(keep)
      .map(([k, v]) => ` ${k}="${v.replace(/"/g, "&quot;")}"`)
      .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${Math.ceil(box.w)}" height="${Math.ceil(box.h)}"><defs>${this.defsXml}</defs><g transform="matrix(${m.join(" ")})"${attrs}>${writeXml(el)}</g></svg>`;
    this.vectors.push({ key, svg, w: box.w, h: box.h });
    return { kind: "picture", picture: key, box, name: el.attrs.id };
  }

  /** The box an element covers, for drawings. */
  extent(el: XmlElement, m: Matrix): Box | null {
    const kind = localName(el);
    let local: Box | null = null;
    if (kind === "path") local = pathBox(el.attrs.d ?? "");
    else if (kind === "polygon" || kind === "polyline") {
      const v = numbers(el.attrs.points ?? "");
      const xs = v.filter((_, i) => i % 2 === 0);
      const ys = v.filter((_, i) => i % 2 === 1);
      if (xs.length) local = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    } else if (kind === "rect" || kind === "image" || kind === "use" || kind === "foreignObject") local = { x: num(el.attrs.x), y: num(el.attrs.y), w: num(el.attrs.width), h: num(el.attrs.height) };
    else if (kind === "circle") {
      const r = num(el.attrs.r);
      local = { x: num(el.attrs.cx) - r, y: num(el.attrs.cy) - r, w: 2 * r, h: 2 * r };
    } else if (kind === "ellipse") local = { x: num(el.attrs.cx) - num(el.attrs.rx), y: num(el.attrs.cy) - num(el.attrs.ry), w: 2 * num(el.attrs.rx), h: 2 * num(el.attrs.ry) };
    else if (kind === "line") {
      const [x1, y1, x2, y2] = [num(el.attrs.x1), num(el.attrs.y1), num(el.attrs.x2), num(el.attrs.y2)];
      local = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
    } else if (kind === "g" || kind === "a" || kind === "svg") {
      const boxes = elementsOf(el)
        .map((c) => this.extent(c, multiply(m, parseTransform(c.attrs.transform))))
        .filter((b): b is Box => b !== null);
      if (!boxes.length) return null;
      const x = Math.min(...boxes.map((b) => b.x));
      const y = Math.min(...boxes.map((b) => b.y));
      return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
    }
    if (!local) return null;
    return placeBox(m, local.x, local.y, local.w, local.h).box;
  }

  shapes(el: XmlElement, m: Matrix, inherited: Style): DesignShape[] {
    const out: DesignShape[] = [];
    for (const child of elementsOf(el)) out.push(...this.shape(child, m, inherited));
    return out;
  }

  shape(el: XmlElement, parent: Matrix, inherited: Style): DesignShape[] {
    const kind = localName(el);
    if (["defs", "style", "title", "desc", "metadata", "clipPath", "mask", "symbol", "linearGradient", "radialGradient", "pattern", "filter", "script"].includes(kind)) return [];
    const style = styleOf(el, this.classes, inherited);
    if (style.display === "none" || style.visibility === "hidden") return [];
    const m = multiply(parent, parseTransform(el.attrs.transform));
    const scale = scaleOf(m);
    const opacity = num(style.opacity, 1);
    const named = el.attrs.id ?? el.attrs["data-name"] ?? el.attrs["inkscape:label"];
    const done = (s: DesignShape): DesignShape[] => [{ ...s, ...(named && !s.name ? { name: named } : {}), ...(opacity < 0.99 ? { opacity } : {}) }];

    switch (kind) {
      case "svg":
      case "g":
      case "a":
      case "switch": {
        const kids = elementsOf(el);
        // Only drawing inside (an icon, a logo): one picture.
        const drawing = kids.length > 0 && [...walk(el)].every((d) => ["path", "polygon", "polyline", "circle", "ellipse", "line", "g", "rect", "use", "defs", "clipPath", "mask"].includes(localName(d))) && [...walk(el)].some((d) => ["path", "polygon", "polyline"].includes(localName(d)));
        if (drawing) {
          const box = this.extent(el, m);
          const v = box && box.w <= 220 && box.h <= 220 ? this.vector({ ...el, attrs: { ...el.attrs, transform: "" } }, m, style, box) : null;
          if (v) return done(v);
        }
        const children = this.shapes(el, m, style);
        const filtered = el.attrs.filter && this.ref(el.attrs.filter) ? children.map((c, i) => (i === 0 && (c.kind === "rect" || c.kind === "frame") ? { ...c, shadow: true } : c)) : children;
        return named && /\S/.test(named) && filtered.length > 1 ? [{ kind: "frame", name: named, box: union(filtered.map((c) => c.box)), children: filtered }] : filtered;
      }
      case "use": {
        const target = this.ref(el.attrs.href ?? el.attrs["xlink:href"]);
        if (!target) return [];
        const moved = multiply(m, [1, 0, 0, 1, num(el.attrs.x), num(el.attrs.y)]);
        if (localName(target) === "symbol") return this.shapes(target, moved, style);
        return this.shape({ ...target, attrs: { ...target.attrs, id: el.attrs.id ?? target.attrs.id ?? "" } }, moved, style);
      }
      case "rect": {
        const w = num(el.attrs.width);
        const h = num(el.attrs.height);
        if (w <= 0 || h <= 0) return [];
        const { box, rotation } = placeBox(m, num(el.attrs.x), num(el.attrs.y), w, h);
        const rx = num(el.attrs.rx, num(el.attrs.ry)) * scale;
        return done({ kind: "rect", box, ...this.paint(style), ...(rx ? { radius: rx } : {}), ...(this.stroke(style, scale) ? { stroke: this.stroke(style, scale) } : {}), ...(rotation ? { rotation } : {}) });
      }
      case "circle":
      case "ellipse": {
        const rx = kind === "circle" ? num(el.attrs.r) : num(el.attrs.rx);
        const ry = kind === "circle" ? num(el.attrs.r) : num(el.attrs.ry);
        if (rx <= 0 || ry <= 0) return [];
        const { box } = placeBox(m, num(el.attrs.cx) - rx, num(el.attrs.cy) - ry, 2 * rx, 2 * ry);
        return done({ kind: "ellipse", box, ...this.paint(style), ...(this.stroke(style, scale) ? { stroke: this.stroke(style, scale) } : {}) });
      }
      case "line": {
        const box = this.extent(el, m);
        const stroke = this.stroke(style, scale);
        if (!box || !stroke) return [];
        return done({ kind: "line", box: { ...box, h: Math.max(box.h, stroke.width), w: Math.max(box.w, stroke.width) }, stroke });
      }
      case "path":
      case "polygon":
      case "polyline": {
        const box = this.extent(el, m);
        const v = box ? this.vector({ ...el, attrs: { ...el.attrs, transform: "" } }, m, style, box) : null;
        return v ? done(v) : [];
      }
      case "image": {
        const w = num(el.attrs.width);
        const h = num(el.attrs.height);
        const href = el.attrs.href ?? el.attrs["xlink:href"] ?? "";
        if (w <= 0 || h <= 0) return [];
        const { box } = placeBox(m, num(el.attrs.x), num(el.attrs.y), w, h);
        if (/^data:image\/svg\+xml/.test(href)) {
          const v = this.vector(el, IDENTITY, {}, box);
          return v ? done(v) : [];
        }
        const key = this.pictureOf(el);
        return key ? done({ kind: "picture", box, picture: key }) : [];
      }
      case "text":
        return this.text(el, m, style, scale, done);
      case "foreignObject": {
        const text = textOf(el).replace(/[ \t]+/g, " ").trim();
        if (!text) return [];
        const { box } = placeBox(m, num(el.attrs.x), num(el.attrs.y), num(el.attrs.width), num(el.attrs.height));
        const inner = [...walk(el)].map((e) => styleOf(e, this.classes, {})).reduce<Style>((a, b) => ({ ...a, ...b }), style);
        const color = hexColor(inner.color ?? inner.fill);
        return done({ kind: "text", box, text, ...(color ? { color } : {}), font: this.font({ ...inner, "text-anchor": inner["text-align"] === "center" ? "middle" : inner["text-align"] === "right" ? "end" : "start" }, scale) });
      }
      default:
        return this.shapes(el, m, style);
    }
  }

  text(el: XmlElement, m: Matrix, style: Style, scale: number, done: (s: DesignShape) => DesignShape[]): DesignShape[] {
    // Lines: each tspan at its own height; tspans on one line join.
    const lines: { y: number; x: number; text: string }[] = [];
    let x0 = num(el.attrs.x);
    let y0 = num(el.attrs.y);
    const pieces = el.children.length ? el.children : [""];
    for (const piece of pieces) {
      if (typeof piece === "string") {
        if (piece.trim()) add(x0, y0, piece);
        continue;
      }
      const s = styleOf(piece, this.classes, style);
      const px2 = piece.attrs.x !== undefined ? num(piece.attrs.x) : x0;
      const py = piece.attrs.y !== undefined ? num(piece.attrs.y) : piece.attrs.dy !== undefined ? y0 + num(piece.attrs.dy) : y0;
      x0 = px2;
      y0 = py;
      if (s.display !== "none") add(px2, py, textOf(piece));
    }
    function add(x: number, y: number, text: string) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.y - y) < 0.5) last.text += text;
      else lines.push({ x, y, text });
    }
    const text = lines
      .map((l) => l.text.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n");
    if (!text) return [];
    const font = this.font(style, 1);
    const size = font.size ?? 16;
    const height = lines.length > 1 ? (lines[lines.length - 1]!.y - lines[0]!.y) / (lines.length - 1) : size * (font.lineHeight ?? 1.2);
    const longest = Math.max(...text.split("\n").map((l) => l.length));
    const w = longest * size * 0.55;
    const anchorShift = font.align === "center" ? w / 2 : font.align === "right" ? w : 0;
    const top = lines[0]!.y - size * 0.8;
    const { box } = placeBox(m, Math.min(...lines.map((l) => l.x)) - anchorShift, top, w, height * lines.length);
    const color = hexColor(style.fill ?? "#000000");
    const lineHeight = lines.length > 1 ? height / size : font.lineHeight;
    return done({ kind: "text", box, text, ...(color ? { color } : {}), font: { ...this.font(style, scale), ...(lineHeight ? { lineHeight } : {}) } });
  }
}

function* walk(el: XmlElement): Generator<XmlElement> {
  for (const child of elementsOf(el)) {
    yield child;
    yield* walk(child);
  }
}

function resolveHref(el: XmlElement, defs: Map<string, XmlElement>): XmlElement {
  const href = el.attrs.href ?? el.attrs["xlink:href"];
  const target = href?.startsWith("#") ? defs.get(href.slice(1)) : undefined;
  return target && !elementsOf(el).length ? target : el;
}

function union(boxes: Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
}

function btoaText(text: string): string {
  return typeof btoa === "function" ? btoa(unescape(encodeURIComponent(text))) : Buffer.from(text, "utf8").toString("base64");
}

/** The SVG read as a screen, or null when it isn't one. */
export function readSvg(text: string, name: string): SvgRead | null {
  const root = parseXml(text);
  if (!root || localName(root) !== "svg") return null;
  const view = numbers(root.attrs.viewBox ?? "");
  const width = view.length === 4 ? view[2]! : num(root.attrs.width);
  const height = view.length === 4 ? view[3]! : num(root.attrs.height);
  if (!(width > 0 && height > 0)) return null;
  const reader = new Reader(root);
  const origin: Matrix = view.length === 4 ? [1, 0, 0, 1, -view[0]!, -view[1]!] : IDENTITY;
  const shapes = reader.shapes(root, origin, {});
  return { frame: { name, width, height, shapes }, pictures: reader.pictures, vectors: reader.vectors };
}
