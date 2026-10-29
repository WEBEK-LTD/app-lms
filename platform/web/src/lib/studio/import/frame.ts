import { STUDIO_FONT_WEIGHTS, STUDIO_LIMITS, type StudioAlign, type StudioCross, type StudioFont, type StudioNode, type StudioPage, type StudioSides } from "../../pages/types";

/**
 * 108.3 A screen from any design tool, in one shape for all of them (SVG,
 * a Figma link, Figma, Sketch and Penpot files): boxes, texts, pictures and
 * shapes where the designer put them. `frameToPage` turns it into a Studio
 * page that fits every phone: what sits side by side becomes a row, what
 * is stacked a column, a box with things on it holds them, a small box with
 * one text a button; the phone's status bar and tab bar are the app's own
 * and are left out (the tab bar's labels are kept, for the app's tabs).
 */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DesignFont {
  family?: string;
  size?: number;
  weight?: number;
  italic?: boolean;
  align?: "left" | "center" | "right";
  /** A multiple of the size. */
  lineHeight?: number;
  letterSpacing?: number;
  underline?: boolean;
  strike?: boolean;
  uppercase?: boolean;
}

export type ShapeKind = "frame" | "text" | "picture" | "rect" | "ellipse" | "line";

export interface DesignShape {
  kind: ShapeKind;
  name?: string;
  /** Where it is in the screen, from its top left corner. */
  box: Box;
  /** Its colour, #RRGGBB. */
  fill?: string;
  fillOpacity?: number;
  gradient?: { from: string; to: string; angle: number };
  /** A picture filling it (the key of the design's pictures). */
  picture?: string;
  radius?: number;
  /** Top left, top right, bottom right, bottom left. */
  corners?: [number, number, number, number];
  stroke?: { color: string; width: number };
  shadow?: boolean;
  opacity?: number;
  rotation?: number;
  text?: string;
  /** A text's colour. */
  color?: string;
  font?: DesignFont;
  /** What the tool says about laying out its children (Figma's auto layout, Penpot's flex). */
  layout?: { dir: "row" | "column"; gap?: number; padding?: [number, number, number, number]; align?: StudioAlign; cross?: StudioCross };
  children?: DesignShape[];
}

export interface DesignFrame {
  name: string;
  width: number;
  height: number;
  background?: string;
  shapes: DesignShape[];
}

export interface FrameOptions {
  /** The project's main language reads right to left: what is on the right comes first. */
  rtl: boolean;
  newId: () => string;
}

export interface FramePage {
  studio: StudioPage;
  /** The tab bar's labels, left to right; empty without one. */
  tabs: string[];
  /** Elements left out to stay within what a page can hold. */
  cut: number;
}

const STATUS_BAR = /status ?bar|notch|home ?indicator|dynamic ?island|system ?bar/i;
const TAB_BAR = /tab ?bar|bottom ?(nav|bar|menu|navigation)|navigation ?bar|nav ?bar|bottom ?tabs/i;
const BUTTON = /button|btn|cta/i;
const TIME = /^\s*\d{1,2}[:.]\d{2}\s*$/;

const right = (b: Box) => b.x + b.w;
const bottom = (b: Box) => b.y + b.h;
const area = (b: Box) => Math.max(0, b.w) * Math.max(0, b.h);
const contains = (outer: Box, inner: Box, slack = 1) => inner.x >= outer.x - slack && inner.y >= outer.y - slack && right(inner) <= right(outer) + slack && bottom(inner) <= bottom(outer) + slack;
const overlapY = (a: Box, b: Box) => Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y);
const overlapX = (a: Box, b: Box) => Math.min(right(a), right(b)) - Math.max(a.x, b.x);
const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
};
const px = (n: number) => Math.max(0, Math.round(n));

function visual(s: DesignShape): boolean {
  return Boolean(s.fill || s.gradient || s.picture || s.stroke || s.shadow);
}

/** Groups without anything of their own give their children to what holds them; frames laid out by the tool stay. */
function flatten(shapes: DesignShape[]): DesignShape[] {
  const out: DesignShape[] = [];
  for (const s of shapes) {
    if (s.kind === "frame" && !s.layout && !visual(s) && s.children?.length) out.push(...flatten(s.children));
    else if (s.kind === "frame" && s.children?.length) out.push({ ...s, children: s.layout ? s.children : flatten(s.children) });
    else out.push(s);
  }
  return out;
}

/** The status bar, the home indicator and the tab bar: the app's own (found by their names before groups are undone, then by how they look). */
function withoutBars(frame: DesignFrame, tree: DesignShape[]): { shapes: DesignShape[]; tabs: string[] } {
  const texts = (s: DesignShape): DesignShape[] => (s.kind === "text" ? [s] : (s.children ?? []).flatMap(texts));
  let tabs: string[] = [];
  const named = (shapes: DesignShape[]): DesignShape[] =>
    shapes.flatMap((s) => {
      if (STATUS_BAR.test(s.name ?? "")) return [];
      if (TAB_BAR.test(s.name ?? "") && s.box.y > frame.height * 0.7) {
        if (!tabs.length) tabs = texts(s).sort((a, b) => a.box.x - b.box.x).map((t) => (t.text ?? "").trim()).filter(Boolean).slice(0, 5);
        return [];
      }
      return [s.children ? { ...s, children: named(s.children) } : s];
    });
  let kept = flatten(named(tree));
  // A time at the top: the status bar drawn by hand.
  const clock = kept.flatMap(texts).find((t) => TIME.test(t.text ?? "") && t.box.y < 40);
  if (clock) kept = kept.filter((s) => !(bottom(s.box) <= 50 && s.box.h < 50));
  kept = kept.filter((s) => !(s.kind !== "text" && s.box.y > frame.height - 40 && s.box.h <= 8 && s.box.w >= 60 && s.box.w <= 180));
  return { shapes: kept, tabs };
}

interface Item {
  shape: DesignShape;
  kids: Item[];
}

/** What sits on what: each shape goes into the smallest box drawn before it that holds it. */
function nest(shapes: DesignShape[]): Item[] {
  // A frame's own children are its first; what is drawn over it later joins them.
  const items = shapes.map((shape) => ({ shape, kids: shape.children?.length ? nest(shape.children) : ([] as Item[]) }));
  const top: Item[] = [];
  items.forEach((item, i) => {
    let parent: Item | null = null;
    for (let j = i - 1; j >= 0; j -= 1) {
      const c = items[j]!;
      if (!(c.shape.kind === "rect" || c.shape.kind === "frame" || (c.shape.kind === "picture" && item.shape.kind === "text") || c.shape.kind === "ellipse")) continue;
      if (c.shape.kind !== "frame" && !visual(c.shape)) continue;
      if (area(c.shape.box) <= area(item.shape.box) || !contains(c.shape.box, item.shape.box)) continue;
      if (!parent || area(c.shape.box) < area(parent.shape.box)) parent = c;
    }
    (parent ? parent.kids : top).push(item);
  });
  return top;
}

class Builder {
  count = 0;
  cut = 0;
  constructor(
    private readonly opts: FrameOptions,
    private readonly k: number,
  ) {}

  n(v: number): number {
    return px(v * this.k);
  }

  /** A shape and what sits on it. */
  node(item: Item, depth: number): StudioNode | null {
    if (this.count >= STUDIO_LIMITS.maxNodes - 2) {
      this.cut += 1;
      return null;
    }
    this.count += 1;
    const s = item.shape;
    const id = this.opts.newId();
    const name = s.name && s.name.length <= STUDIO_LIMITS.nameChars && !/^(rectangle|group|frame|vector|ellipse|text|image)\s*\d*$/i.test(s.name) ? s.name : undefined;
    const base: StudioNode = { id, type: "column", ...(name ? { name } : {}) };
    if (s.opacity !== undefined && s.opacity < 0.99) base.opacity = Math.round(s.opacity * 100) / 100;
    if (s.rotation && Math.abs(s.rotation) >= 0.5 && Math.abs(s.rotation) <= 180) base.rotation = Math.round(s.rotation * 10) / 10;

    if (s.kind === "text") return { ...base, type: "text", text: (s.text ?? "").slice(0, STUDIO_LIMITS.textChars), ...this.textStyle(s) };
    if (s.kind === "line" || (s.kind === "rect" && !item.kids.length && Math.min(s.box.h, s.box.w) <= 2 && Math.max(s.box.h, s.box.w) > 8)) {
      const color = s.fill ?? s.stroke?.color;
      return { ...base, type: "divider", ...(color ? { color } : {}), height: Math.max(1, Math.min(this.n(Math.min(s.box.h, s.box.w) || s.stroke?.width || 1), 20)) };
    }
    if (s.kind === "picture" && !item.kids.length) {
      return { ...base, type: "image", image_url: s.picture ?? null, height: this.n(s.box.h), fit: "cover", ...this.shapeStyle(s) };
    }
    // A small box with one text (and maybe a picture): a button.
    const texts = item.kids.filter((k) => k.shape.kind === "text");
    if (
      (s.kind === "rect" || s.kind === "frame") &&
      visual(s) &&
      texts.length === 1 &&
      item.kids.length <= 2 &&
      s.box.h <= 72 &&
      (BUTTON.test(s.name ?? "") || (s.radius ?? 0) > 0 || s.stroke) &&
      (texts[0]!.shape.text ?? "").length <= 40
    ) {
      const label = texts[0]!.shape;
      const style = this.textStyle(label);
      return {
        ...base,
        type: "button",
        text: (label.text ?? "").replace(/\s+/g, " ").trim(),
        ...(s.fill ? { background: s.fill } : {}),
        ...(label.color ? { color: label.color } : {}),
        ...(style.font ? { font: style.font } : {}),
        height: this.n(s.box.h),
        ...(s.radius !== undefined ? { radius: Math.min(this.n(s.radius), STUDIO_LIMITS.maxRadius) } : {}),
        ...(s.stroke ? { border_color: s.stroke.color, border_width: Math.min(Math.max(1, this.n(s.stroke.width)), STUDIO_LIMITS.maxBorder) } : {}),
        ...(s.shadow ? { shadow: "light" as const } : {}),
      };
    }

    const node: StudioNode = { ...base, ...this.shapeStyle(s) };
    if (s.picture) {
      node.image_background_url = s.picture;
      delete node.background;
    }
    if (!item.kids.length) {
      // A box on its own: its size and colour.
      node.height = this.n(s.box.h);
      if (s.kind === "ellipse") node.radius = Math.min(this.n(Math.min(s.box.w, s.box.h) / 2), STUDIO_LIMITS.maxRadius);
      return node;
    }
    if (depth >= STUDIO_LIMITS.maxDepth - 2) {
      this.cut += item.kids.length;
      node.height = this.n(s.box.h);
      return node;
    }
    if (s.layout) {
      node.type = s.layout.dir;
      Object.assign(node, this.laidOut(item, depth));
    } else Object.assign(node, this.arrange(item.kids, s.box, depth));
    // Room left below what it holds (a banner): its height kept as the least.
    const lowest = Math.max(...item.kids.map((k) => bottom(k.shape.box)));
    if (bottom(s.box) - lowest > 24 || s.picture) node.min_height = this.n(s.box.h);
    return node;
  }

  textStyle(s: DesignShape): Pick<StudioNode, "color" | "font" | "text_align"> {
    const f = s.font ?? {};
    const font: StudioFont = {};
    if (f.family) font.family = f.family.slice(0, 60);
    if (f.size) font.size = Math.min(STUDIO_LIMITS.maxFont, Math.max(STUDIO_LIMITS.minFont, this.n(f.size)));
    if (f.weight) font.weight = STUDIO_FONT_WEIGHTS.reduce((a, b) => (Math.abs(b - f.weight!) < Math.abs(a - f.weight!) ? b : a));
    if (f.lineHeight && f.lineHeight >= 0.8 && f.lineHeight <= 3) font.line_height = Math.round(f.lineHeight * 100) / 100;
    if (f.letterSpacing && Math.abs(f.letterSpacing) >= 0.1) font.letter_spacing = Math.min(20, Math.max(-5, Math.round(f.letterSpacing * this.k * 10) / 10));
    if (f.italic) font.italic = true;
    if (f.underline) font.underline = true;
    if (f.strike) font.strike = true;
    if (f.uppercase) font.uppercase = true;
    const align = f.align === "center" ? "center" : f.align === "right" ? (this.opts.rtl ? "start" : "end") : f.align === "left" && this.opts.rtl ? "end" : undefined;
    return { ...(s.color ? { color: s.color } : {}), ...(Object.keys(font).length ? { font } : {}), ...(align ? { text_align: align } : {}) };
  }

  shapeStyle(s: DesignShape): Partial<StudioNode> {
    const out: Partial<StudioNode> = {};
    if (s.gradient) out.gradient = s.gradient;
    else if (s.fill) out.background = s.fill;
    if (s.corners && new Set(s.corners).size > 1) {
      const [tl, tr, br, bl] = s.corners.map((c) => Math.min(this.n(c), STUDIO_LIMITS.maxRadius)) as [number, number, number, number];
      out.corners = this.opts.rtl ? { top_start: tr, top_end: tl, bottom_end: bl, bottom_start: br } : { top_start: tl, top_end: tr, bottom_end: br, bottom_start: bl };
    } else if (s.radius || s.corners?.[0]) out.radius = Math.min(this.n(s.radius ?? s.corners![0]), STUDIO_LIMITS.maxRadius);
    if (s.stroke && s.stroke.width > 0) {
      out.border_color = s.stroke.color;
      out.border_width = Math.min(Math.max(1, this.n(s.stroke.width)), STUDIO_LIMITS.maxBorder);
    }
    if (s.shadow) out.shadow = "light";
    return out;
  }

  /** The children of a frame the tool lays out itself (auto layout). */
  laidOut(item: Item, depth: number): Partial<StudioNode> {
    const l = item.shape.layout!;
    const kids = this.order(item.kids, l.dir);
    const out: Partial<StudioNode> = { children: this.many(kids, depth) };
    if (l.gap) out.gap = Math.min(this.n(l.gap), STUDIO_LIMITS.maxGap);
    if (l.padding) out.padding = this.sides(l.padding);
    if (l.align && l.align !== "start") out.align = l.align;
    if (l.cross) out.cross = l.cross;
    return out;
  }

  order(items: Item[], dir: "row" | "column"): Item[] {
    return [...items].sort((a, b) => (dir === "row" ? (this.opts.rtl ? right(b.shape.box) - right(a.shape.box) : a.shape.box.x - b.shape.box.x) : a.shape.box.y - b.shape.box.y));
  }

  many(items: Item[], depth: number): StudioNode[] {
    const out: StudioNode[] = [];
    for (const item of items) {
      if (out.length >= STUDIO_LIMITS.maxChildren) {
        this.cut += 1;
        continue;
      }
      const n = this.node(item, depth + 1);
      if (n) out.push(n);
    }
    return out;
  }

  sides([t, r, b, l]: [number, number, number, number]): StudioSides | undefined {
    const side = (v: number) => Math.min(this.n(v), STUDIO_LIMITS.maxSide);
    const out: StudioSides = {};
    if (t > 0.5) out.top = side(t);
    if (b > 0.5) out.bottom = side(b);
    const [start, end] = this.opts.rtl ? [r, l] : [l, r];
    if (start > 0.5) out.start = side(start);
    if (end > 0.5) out.end = side(end);
    return Object.keys(out).length ? out : undefined;
  }

  /**
   * Things placed freely in a box, laid out: bands of what shares the same
   * height on the screen go top to bottom; a band of several is a row.
   */
  arrange(items: Item[], box: Box, depth: number): Partial<StudioNode> {
    const sorted = [...items].sort((a, b) => a.shape.box.y - b.shape.box.y || a.shape.box.x - b.shape.box.x);
    const bands: { items: Item[]; top: number; bottom: number }[] = [];
    for (const item of sorted) {
      const b = item.shape.box;
      const band = bands[bands.length - 1];
      if (band && b.y < band.bottom - Math.min(4, b.h / 2)) {
        band.items.push(item);
        band.bottom = Math.max(band.bottom, bottom(b));
      } else bands.push({ items: [item], top: b.y, bottom: bottom(b) });
    }
    const left = Math.min(...items.map((i) => i.shape.box.x));
    const rightmost = Math.max(...items.map((i) => right(i.shape.box)));
    const pad: [number, number, number, number] = [Math.max(0, bands[0]!.top - box.y), Math.max(0, right(box) - rightmost), Math.max(0, bottom(box) - bands[bands.length - 1]!.bottom), Math.max(0, left - box.x)];
    // A box much taller than what it holds keeps the space below as its own height, not padding.
    if (pad[2] > 24) pad[2] = Math.min(pad[2], pad[0]);
    const inner: Box = { x: box.x + pad[3], y: box.y + pad[0], w: box.w - pad[1] - pad[3], h: box.h - pad[0] - pad[2] };
    const gaps = bands.slice(1).map((b, i) => b.top - bands[i]!.bottom);
    const even = gaps.length > 0 && gaps.every((g) => Math.abs(g - gaps[0]!) <= 2);
    const gap = even ? Math.max(0, gaps[0]!) : 0;
    const children: StudioNode[] = [];
    bands.forEach((band, i) => {
      if (children.length >= STUDIO_LIMITS.maxChildren) {
        this.cut += band.items.length;
        return;
      }
      const n = band.items.length === 1 ? this.placed(band.items[0]!, inner, depth) : this.band(band.items, inner, depth);
      if (!n) return;
      const above = i === 0 ? 0 : band.top - bands[i - 1]!.bottom;
      if (!even && above > 0.5) n.margin = { ...(n.margin ?? {}), top: Math.min(this.n(above), STUDIO_LIMITS.maxSide) };
      children.push(n);
    });
    const out: Partial<StudioNode> = { children };
    const padding = this.sides(pad);
    if (padding) out.padding = padding;
    if (gap > 0.5) out.gap = Math.min(this.n(gap), STUDIO_LIMITS.maxGap);
    return out;
  }

  /** One thing in a band of its own: full width, or its width placed left, centre or right. */
  placed(item: Item, inner: Box, depth: number): StudioNode | null {
    const n = this.node(item, depth + 1);
    if (!n) return null;
    const b = item.shape.box;
    const before = b.x - inner.x;
    const after = right(inner) - right(b);
    if (before <= 4 && after <= 4) {
      if (n.type !== "text" && n.type !== "divider") n.width = "fill";
      return n;
    }
    if (n.type !== "text") n.width = this.n(b.w);
    else if (b.w >= inner.w * 0.6) n.width = "fill";
    if (Math.abs(before - after) <= 4) n.self_align = "center";
    else {
      const leftSide = before < after;
      n.self_align = leftSide !== this.opts.rtl ? "start" : "end";
      const indent = leftSide ? before : after;
      if (indent > 2) n.margin = { ...(n.margin ?? {}), [leftSide !== this.opts.rtl ? "start" : "end"]: Math.min(this.n(indent), STUDIO_LIMITS.maxSide) };
    }
    return n;
  }

  /** Several things side by side: a row; things on top of each other: a stack. */
  band(items: Item[], inner: Box, depth: number): StudioNode | null {
    const byX = [...items].sort((a, b) => a.shape.box.x - b.shape.box.x);
    const overlapping = byX.some((a, i) => byX.slice(i + 1).some((b) => overlapX(a.shape.box, b.shape.box) > Math.min(a.shape.box.w, b.shape.box.w) * 0.3 && overlapY(a.shape.box, b.shape.box) > 0));
    const top = Math.min(...items.map((i) => i.shape.box.y));
    const bandLeft = Math.min(...items.map((i) => i.shape.box.x));
    const bandRight = Math.max(...items.map((i) => right(i.shape.box)));
    if (this.count >= STUDIO_LIMITS.maxNodes - 2) {
      this.cut += items.length;
      return null;
    }
    this.count += 1;
    if (overlapping) {
      const children: StudioNode[] = [];
      for (const item of items) {
        const n = this.node(item, depth + 2);
        if (!n) continue;
        const b = item.shape.box;
        n.self_align = "start";
        if (n.type !== "text") n.width = this.n(b.w);
        // Each in its place from the band's top and its start side.
        const fromStart = this.opts.rtl ? bandRight - right(b) : b.x - bandLeft;
        n.margin = { ...(n.margin ?? {}), top: Math.min(this.n(b.y - top), STUDIO_LIMITS.maxSide), start: Math.min(this.n(fromStart), STUDIO_LIMITS.maxSide) };
        children.push(n);
      }
      return { id: this.opts.newId(), type: "stack", width: "fill", children };
    }
    const ordered = this.opts.rtl ? [...byX].reverse() : byX;
    const gaps = byX.slice(1).map((b, i) => b.shape.box.x - right(byX[i]!.shape.box));
    const children: StudioNode[] = [];
    for (const item of ordered) {
      if (children.length >= STUDIO_LIMITS.maxChildren) {
        this.cut += 1;
        continue;
      }
      const n = this.node(item, depth + 2);
      if (!n) continue;
      const b = item.shape.box;
      if (n.type === "text") {
        if (b.w >= (bandRight - bandLeft) * 0.45) n.width = "fill";
      } else n.width = this.n(b.w);
      children.push(n);
    }
    const row: StudioNode = { id: this.opts.newId(), type: "row", children };
    const spread = bandLeft - inner.x <= 4 && right(inner) - bandRight <= 4;
    const even = gaps.every((g) => Math.abs(g - gaps[0]!) <= 3);
    if (spread && !even && children.length > 1) row.align = "between";
    else {
      if (gaps.length) row.gap = Math.min(this.n(Math.max(0, median(gaps))), STUDIO_LIMITS.maxGap);
      if (!spread) {
        const before = bandLeft - inner.x;
        const after = right(inner) - bandRight;
        if (Math.abs(before - after) <= 4) row.align = "center";
        else if ((before > after) !== this.opts.rtl) row.align = "end";
      }
    }
    const centres = items.map((i) => i.shape.box.y + i.shape.box.h / 2);
    const tops = items.map((i) => i.shape.box.y);
    const bottoms = items.map((i) => bottom(i.shape.box));
    const within = (v: number[]) => Math.max(...v) - Math.min(...v) <= 3;
    row.cross = within(centres) ? "center" : within(tops) ? "start" : within(bottoms) ? "end" : "center";
    return row;
  }
}

/** A screen as a Studio page. */
export function frameToPage(frame: DesignFrame, opts: FrameOptions): FramePage {
  // Phone screens keep their sizes; a bigger (or smaller) board is brought to a phone's width.
  const k = frame.width >= 300 && frame.width <= 480 ? 1 : 390 / Math.max(1, frame.width);
  const { shapes, tabs } = withoutBars(frame, frame.shapes.filter((s) => s.box.w > 0 && s.box.h > 0));
  // A box covering the whole screen is its background.
  let background = frame.background;
  const rest = [...shapes];
  const first = rest[0];
  if (first && (first.kind === "rect" || first.kind === "frame") && !first.children?.length && first.fill && !first.picture && first.box.w >= frame.width - 2 && first.box.h >= frame.height * 0.8) {
    background = first.fill;
    rest.shift();
  }
  const builder = new Builder(opts, k);
  const screen: Box = { x: 0, y: 0, w: frame.width, h: frame.height };
  const items = nest(rest);
  const body: StudioNode = { id: opts.newId(), type: "column", ...(items.length ? builder.arrange(items, { ...screen, h: Math.max(...items.map((i) => bottom(i.shape.box)), 1) }, 0) : { children: [] }) };
  return {
    studio: { body, ...(background ? { background } : {}) },
    tabs,
    cut: builder.cut,
  };
}
