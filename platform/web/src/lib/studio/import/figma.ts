import type { StudioAlign, StudioCross } from "../../pages/types";
import type { Box, DesignFrame, DesignShape } from "./frame";

/**
 * 108.4 A Figma frame (from Figma's REST API, `/v1/files/:key/nodes`) read
 * as a screen: frames with auto layout keep their rows and columns, boxes
 * their colours, corners, borders and shadows, texts their fonts; pictures
 * are Figma's image fills, and drawings (vectors, icons) are drawn by Figma.
 * The same reader serves Figma's own file (`.fig`, 108.5), whose nodes have
 * the same names.
 */

type Node = Record<string, unknown>;

/** What needs fetching from Figma for the screen: image fills by their reference, drawings by their node. */
export interface FigmaNeeds {
  /** `figma-image:<ref>` keys. */
  images: Set<string>;
  /** `figma-render:<node id>` keys. */
  renders: Set<string>;
}

const CONTAINER = new Set(["FRAME", "GROUP", "COMPONENT", "COMPONENT_SET", "INSTANCE", "SECTION"]);
const DRAWING = new Set(["VECTOR", "BOOLEAN_OPERATION", "STAR", "REGULAR_POLYGON", "POLYGON"]);

const record = (v: unknown): Node | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Node) : null);
const list = (v: unknown): Node[] => (Array.isArray(v) ? v.map(record).filter((x): x is Node => x !== null) : []);
const numberOf = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

export function figmaHex(color: unknown): string | null {
  const c = record(color);
  if (!c) return null;
  const channel = (v: unknown) => Math.round(Math.min(1, Math.max(0, numberOf(v) ?? 0)) * 255);
  return `#${[c.r, c.g, c.b].map((v) => channel(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function boxOf(node: Node, origin: { x: number; y: number }): Box | null {
  const b = record(node.absoluteBoundingBox);
  const [x, y, w, h] = [numberOf(b?.x), numberOf(b?.y), numberOf(b?.width), numberOf(b?.height)];
  if (x === undefined || y === undefined || w === undefined || h === undefined) return null;
  return { x: x - origin.x, y: y - origin.y, w, h };
}

const shown = (paint: Node) => paint.visible !== false && (numberOf(paint.opacity) ?? 1) > 0.01;

function paints(node: Node, needs: FigmaNeeds): Pick<DesignShape, "fill" | "fillOpacity" | "gradient" | "picture"> {
  const fills = list(node.fills).filter(shown);
  const image = fills.find((f) => f.type === "IMAGE" && typeof f.imageRef === "string");
  const solid = [...fills].reverse().find((f) => f.type === "SOLID");
  const gradient = fills.find((f) => f.type === "GRADIENT_LINEAR");
  const out: Pick<DesignShape, "fill" | "fillOpacity" | "gradient" | "picture"> = {};
  if (image) {
    const key = `figma-image:${image.imageRef as string}`;
    needs.images.add(key);
    out.picture = key;
  }
  if (gradient) {
    const stops = list(gradient.gradientStops);
    const handles = list(gradient.gradientHandlePositions);
    const from = figmaHex(stops[0]?.color);
    const to = figmaHex(stops[stops.length - 1]?.color);
    if (from && to) {
      const [a, b] = [handles[0], handles[1]];
      const angle = a && b ? Math.round(((Math.atan2((numberOf(b.y) ?? 1) - (numberOf(a.y) ?? 0), (numberOf(b.x) ?? 0) - (numberOf(a.x) ?? 0)) * 180) / Math.PI + 90 + 360) % 360) : 180;
      out.gradient = { from, to, angle };
    }
  } else if (solid) {
    const hex = figmaHex(solid.color);
    if (hex) out.fill = hex;
    const alpha = (numberOf(record(solid.color)?.a) ?? 1) * (numberOf(solid.opacity) ?? 1);
    if (alpha < 0.99) out.fillOpacity = alpha;
  }
  return out;
}

function style(node: Node): Partial<DesignShape> {
  const out: Partial<DesignShape> = {};
  const radii = Array.isArray(node.rectangleCornerRadii) ? (node.rectangleCornerRadii as unknown[]).map((v) => numberOf(v) ?? 0) : null;
  if (radii && radii.length === 4 && new Set(radii).size > 1) out.corners = radii as [number, number, number, number];
  else if (numberOf(node.cornerRadius)) out.radius = numberOf(node.cornerRadius);
  const stroke = list(node.strokes).filter(shown).find((s) => s.type === "SOLID");
  const weight = numberOf(node.strokeWeight) ?? 1;
  if (stroke && weight > 0) {
    const color = figmaHex(stroke.color);
    if (color) out.stroke = { color, width: weight };
  }
  if (list(node.effects).some((e) => e.visible !== false && (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW"))) out.shadow = true;
  const opacity = numberOf(node.opacity);
  if (opacity !== undefined && opacity < 0.99) out.opacity = opacity;
  return out;
}

const ALIGN: Record<string, StudioAlign> = { MIN: "start", CENTER: "center", MAX: "end", SPACE_BETWEEN: "between" };
const CROSS: Record<string, StudioCross> = { MIN: "start", CENTER: "center", MAX: "end", BASELINE: "start" };

function layoutOf(node: Node): DesignShape["layout"] | undefined {
  const mode = node.layoutMode;
  if (mode !== "HORIZONTAL" && mode !== "VERTICAL") return undefined;
  return {
    dir: mode === "HORIZONTAL" ? "row" : "column",
    gap: numberOf(node.itemSpacing) ?? 0,
    padding: [numberOf(node.paddingTop) ?? 0, numberOf(node.paddingRight) ?? 0, numberOf(node.paddingBottom) ?? 0, numberOf(node.paddingLeft) ?? 0],
    align: ALIGN[String(node.primaryAxisAlignItems)] ?? "start",
    cross: CROSS[String(node.counterAxisAlignItems)] ?? "start",
  };
}

/** Only drawings inside (an icon, a logo made of shapes): drawn by Figma as one picture. */
function drawingOnly(node: Node): boolean {
  const kids = list(node.children).filter((c) => c.visible !== false);
  if (!kids.length) return DRAWING.has(String(node.type));
  return kids.every((c) => DRAWING.has(String(c.type)) || ((CONTAINER.has(String(c.type)) || c.type === "ELLIPSE" || c.type === "RECTANGLE") && drawingOnly(c))) && kids.some((c) => DRAWING.has(String(c.type)) || drawingOnly(c));
}

function shape(node: Node, origin: { x: number; y: number }, needs: FigmaNeeds, budget: { left: number }): DesignShape | null {
  if (node.visible === false || budget.left <= 0) return null;
  budget.left -= 1;
  const box = boxOf(node, origin);
  if (!box || box.w <= 0 || box.h <= 0) return null;
  const type = String(node.type);
  const name = typeof node.name === "string" ? node.name.slice(0, 120) : undefined;
  const id = typeof node.id === "string" ? node.id : null;

  if (type === "TEXT") {
    const s = record(node.style) ?? {};
    const color = figmaHex(list(node.fills).filter(shown).find((f) => f.type === "SOLID")?.color);
    const size = numberOf(s.fontSize);
    const lineHeight = numberOf(s.lineHeightPx);
    const align = s.textAlignHorizontal;
    return {
      kind: "text",
      box,
      ...(name ? { name } : {}),
      text: String(node.characters ?? ""),
      ...(color ? { color } : {}),
      font: {
        ...(typeof s.fontFamily === "string" ? { family: s.fontFamily } : {}),
        ...(size ? { size } : {}),
        ...(numberOf(s.fontWeight) ? { weight: numberOf(s.fontWeight) } : {}),
        ...(s.italic === true ? { italic: true } : {}),
        ...(align === "CENTER" ? { align: "center" as const } : align === "RIGHT" ? { align: "right" as const } : align === "LEFT" ? { align: "left" as const } : {}),
        ...(lineHeight && size ? { lineHeight: lineHeight / size } : {}),
        ...(numberOf(s.letterSpacing) ? { letterSpacing: numberOf(s.letterSpacing) } : {}),
        ...(s.textDecoration === "UNDERLINE" ? { underline: true } : s.textDecoration === "STRIKETHROUGH" ? { strike: true } : {}),
        ...(s.textCase === "UPPER" ? { uppercase: true } : {}),
      },
      ...(numberOf(node.opacity) !== undefined && numberOf(node.opacity)! < 0.99 ? { opacity: numberOf(node.opacity) } : {}),
    };
  }
  if (id && (DRAWING.has(type) || (CONTAINER.has(type) && drawingOnly(node) && box.w <= 240 && box.h <= 240))) {
    const key = `figma-render:${id}`;
    needs.renders.add(key);
    return { kind: "picture", box, picture: key, ...(name ? { name } : {}) };
  }
  if (type === "LINE") {
    const stroke = style(node).stroke;
    return stroke ? { kind: "line", box: { ...box, h: Math.max(box.h, stroke.width) }, stroke } : null;
  }
  if (type === "RECTANGLE" || type === "ELLIPSE") {
    const fill = paints(node, needs);
    const kind = fill.picture && !fill.fill && !fill.gradient && type === "RECTANGLE" ? "picture" : type === "ELLIPSE" ? "ellipse" : "rect";
    return { kind, box, ...(name ? { name } : {}), ...fill, ...style(node) };
  }
  if (CONTAINER.has(type)) {
    const children = list(node.children)
      .map((c) => shape(c, origin, needs, budget))
      .filter((c): c is DesignShape => c !== null);
    const layout = layoutOf(node);
    return { kind: "frame", box, ...(name ? { name } : {}), ...paints(node, needs), ...style(node), ...(layout ? { layout } : {}), children };
  }
  return null;
}

/** A frame of the file as a screen, with what must be fetched for its pictures. */
export function figmaFrame(node: Node, needs: FigmaNeeds, maxNodes = 3000): DesignFrame | null {
  const b = record(node.absoluteBoundingBox);
  const origin = { x: numberOf(b?.x) ?? 0, y: numberOf(b?.y) ?? 0 };
  const width = numberOf(b?.width);
  const height = numberOf(b?.height);
  if (!width || !height) return null;
  const budget = { left: maxNodes };
  const background = paints(node, needs).fill;
  const shapes = list(node.children)
    .map((c) => shape(c, origin, needs, budget))
    .filter((c): c is DesignShape => c !== null);
  return { name: typeof node.name === "string" ? node.name.slice(0, 60) : "Screen", width, height, ...(background ? { background } : {}), shapes };
}

/** The frame's picture keys replaced (by the saved pictures' addresses); those without one dropped. */
export function withFigmaPictures(frame: DesignFrame, pictures: ReadonlyMap<string, string>): DesignFrame {
  const walk = (s: DesignShape): DesignShape | null => {
    let next: DesignShape = s;
    if (s.picture) {
      const url = pictures.get(s.picture);
      if (url) next = { ...s, picture: url };
      else {
        const { picture: _gone, ...rest } = s;
        if (s.kind === "picture") return null;
        next = rest;
      }
    }
    return next.children ? { ...next, children: next.children.map(walk).filter((c): c is DesignShape => c !== null) } : next;
  };
  return { ...frame, shapes: frame.shapes.map(walk).filter((c): c is DesignShape => c !== null) };
}
