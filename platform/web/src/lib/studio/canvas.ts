import type { Action, ItemSource, LayoutPage, StudioCanvas, StudioLayer, StudioLayerType } from "../pages/types";
import { STUDIO_LIMITS } from "../pages/types";

/**
 * 103 Yallapp Studio in the dashboard: new layers, keeping them on the
 * canvas, and the canvases a Studio page can start from. The canvas is the
 * phone's width in design units; the app scales it to the screen.
 */

export const STUDIO_WIDTH = 390;
/** Moves and sizes snap to this many design units. */
export const STUDIO_GRID = 4;

let counter = 0;
/** A short ID for a new layer. */
export function newLayerId(): string {
  counter = (counter + 1) % 1296;
  return `l${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

/** The layer kept inside the canvas, at least 8 units each way, its numbers rounded to tenths. */
export function clampLayer(layer: StudioLayer, canvas: Pick<StudioCanvas, "width" | "height">): StudioLayer {
  const round = (n: number) => Math.round(n * 10) / 10;
  const w = round(Math.min(Math.max(layer.w, 8), canvas.width));
  const h = round(Math.min(Math.max(layer.h, 8), canvas.height));
  const x = round(Math.min(Math.max(layer.x, 0), canvas.width - w));
  const y = round(Math.min(Math.max(layer.y, 0), canvas.height - h));
  return { ...layer, x, y, w, h };
}

export const snap = (n: number) => Math.round(n / STUDIO_GRID) * STUDIO_GRID;

/** A new layer of a kind, in the middle of what the owner sees (`top`, in design units). */
export function newLayer(type: StudioLayerType, canvas: StudioCanvas, options: { top: number; primary: string; sources: ItemSource[]; words: Record<"text" | "button", string> }): StudioLayer {
  const size: Record<StudioLayerType, [number, number]> = { box: [200, 120], text: [300, 40], image: [300, 200], button: [180, 48], icon: [40, 40], items: [STUDIO_WIDTH, 260] };
  const [w, h] = size[type];
  const base: StudioLayer = { id: newLayerId(), type, x: snap((canvas.width - w) / 2), y: snap(options.top + 24), w, h };
  const layer: StudioLayer = (() => {
    switch (type) {
      case "box":
        return { ...base, fill: "#F1ECE3", radius: 16 };
      case "text":
        return { ...base, text: options.words.text, font_size: 20, font_weight: 700, align: "start" };
      case "button":
        return { ...base, text: options.words.button, font_size: 16, font_weight: 700, align: "center", fill: options.primary.toUpperCase(), color: "#FFFFFF", radius: 24 };
      case "image":
        return { ...base, image_url: null, fit: "cover", radius: 16 };
      case "icon":
        return { ...base, icon: "star", color: options.primary.toUpperCase() };
      case "items":
        return { ...base, x: 0, source: options.sources[0], layout: "carousel", query: { category_id: null, featured: false, ids: [], sort: "newest", limit: 8 } };
    }
  })();
  return clampLayer(layer, canvas);
}

/** What a layer is called in the layers list: its text, else its kind. */
export function layerName(layer: StudioLayer, kinds: Record<StudioLayerType, string>): string {
  const text = layer.text?.trim();
  return text ? (text.length > 28 ? `${text.slice(0, 27)}…` : text) : kinds[layer.type];
}

/** Moves the layer one step towards the front (+1) or the back (-1). */
export function reorder(layers: StudioLayer[], id: string, step: 1 | -1): StudioLayer[] {
  const i = layers.findIndex((l) => l.id === id);
  const j = i + step;
  if (i < 0 || j < 0 || j >= layers.length) return layers;
  const next = [...layers];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

// Starting canvases (Studio templates)

export const STUDIO_TEMPLATES = ["blank", "welcome", "offer", "delivery"] as const;
export type StudioTemplate = (typeof STUDIO_TEMPLATES)[number];

export interface TemplateWords {
  welcome: string;
  welcomeText: string;
  start: string;
  popular: string;
  offer: string;
  offerText: string;
  shop: string;
  send: string;
  sendText: string;
  track: string;
  trackText: string;
}

/** A starting canvas in the app's main colour, its lists from the app's first source, its first button to `first`. */
export function templateCanvas(template: StudioTemplate, options: { primary: string; sources: ItemSource[]; first: Action | null; words: TemplateWords }): StudioCanvas {
  const primary = options.primary.toUpperCase();
  const source = options.sources[0];
  const list = (y: number, layout: "carousel" | "grid"): StudioLayer[] =>
    source ? [{ id: newLayerId(), type: "items", x: 0, y, w: STUDIO_WIDTH, h: layout === "grid" ? 520 : 260, source, layout, query: { category_id: null, featured: false, ids: [], sort: "newest", limit: layout === "grid" ? 6 : 8 } }] : [];
  const text = (y: number, value: string, size: number, weight: 400 | 700 | 800, color: string | null, h = 40): StudioLayer => ({
    id: newLayerId(),
    type: "text",
    x: 24,
    y,
    w: 342,
    h,
    text: value,
    font_size: size,
    font_weight: weight,
    align: "start",
    ...(color ? { color } : {}),
  });
  const button = (y: number, value: string, fill: string, color: string, action: Action | null): StudioLayer => ({
    id: newLayerId(),
    type: "button",
    x: 24,
    y,
    w: 180,
    h: 52,
    text: value,
    font_size: 16,
    font_weight: 700,
    align: "center",
    fill,
    color,
    radius: 26,
    ...(action ? { action } : {}),
  });
  const w = options.words;
  switch (template) {
    case "blank":
      return { width: STUDIO_WIDTH, height: 800, background: null, layers: [] };
    case "welcome":
      return {
        width: STUDIO_WIDTH,
        height: source ? 700 : 400,
        background: null,
        layers: [
          { id: newLayerId(), type: "box", x: 0, y: 0, w: STUDIO_WIDTH, h: 320, fill: primary },
          text(72, w.welcome, 32, 800, "#FFFFFF", 84),
          text(164, w.welcomeText, 16, 400, "#FFFFFF", 48),
          button(236, w.start, "#FFFFFF", primary, options.first),
          ...(source ? [text(344, w.popular, 20, 700, null, 32), ...list(388, "carousel")] : []),
        ],
      };
    case "offer":
      return {
        width: STUDIO_WIDTH,
        height: source ? 860 : 300,
        background: null,
        layers: [
          { id: newLayerId(), type: "box", x: 16, y: 24, w: 358, h: 220, fill: primary, radius: 24, shadow: true },
          { ...text(48, w.offer, 28, 800, "#FFFFFF", 72), x: 40, w: 310 },
          { ...text(124, w.offerText, 15, 400, "#FFFFFF", 40), x: 40, w: 310 },
          { ...button(172, w.shop, "#FFFFFF", primary, options.first), x: 40, w: 150, h: 48 },
          { id: newLayerId(), type: "icon", x: 300, y: 48, w: 48, h: 48, icon: "shopping_bag", color: "#FFFFFF" },
          ...list(272, "grid"),
        ],
      };
    case "delivery": {
      const card = (y: number, icon: string, title: string, body: string): StudioLayer[] => [
        { id: newLayerId(), type: "box", x: 16, y, w: 358, h: 112, fill: "#FFFFFF", radius: 20, border_color: "#E4DED3", border_width: 1 },
        { id: newLayerId(), type: "icon", x: 36, y: y + 32, w: 48, h: 48, icon, color: primary },
        { ...text(y + 24, title, 18, 700, null, 28), x: 100, w: 254 },
        { ...text(y + 56, body, 14, 400, "#6B6880", 40), x: 100, w: 254 },
      ];
      return {
        width: STUDIO_WIDTH,
        height: 620,
        background: "#FAF7F2",
        layers: [
          { id: newLayerId(), type: "box", x: 0, y: 0, w: STUDIO_WIDTH, h: 260, fill: primary },
          text(64, w.send, 30, 800, "#FFFFFF", 80),
          text(152, w.sendText, 16, 400, "#FFFFFF", 48),
          ...card(292, "local_shipping", w.send, w.sendText),
          ...card(424, "location_on", w.track, w.trackText),
        ],
      };
    }
  }
}

/** A new Studio page from a template, with an address no other page has. */
export function studioPage(title: string, slugs: readonly string[], canvas: StudioCanvas, now: Date): LayoutPage {
  const base =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "studio";
  let slug = base;
  for (let n = 2; slugs.includes(slug); n++) slug = `${base}-${n}`;
  return { slug, title: title.slice(0, 60) || "Studio", show_title: false, updated_at: now.toISOString(), blocks: [], canvas };
}

/** Within the limits a canvas's height may have. */
export const clampHeight = (h: number) => Math.min(Math.max(Math.round(h), STUDIO_LIMITS.minHeight), STUDIO_LIMITS.maxHeight);
