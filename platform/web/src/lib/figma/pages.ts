import { newBlockId } from "../pages/defaults";
import { uniqueSlug } from "../pages/model";
import type { ScreenOption } from "../pages/sources";
import { LAYOUT_LIMITS, type Action, type ItemSource, type LayoutBlock, type LayoutContent, type LayoutPage, type LayoutTab, type ScreenName } from "../pages/types";

/**
 * 97.5 A Figma frame made into a page of the app: its texts become Text
 * blocks, its buttons Button blocks, a search field a Search box, a picture
 * with a heading over it a Banner, and its pictures and anything without a
 * block like it Image blocks, drawn by Figma. The phone's status bar, the
 * top bar and the tab bar are the app's own: the tab bar's labels can become
 * the app's tabs. Close to the design, not a copy of it: the app shows its
 * own blocks, in the look.
 */

/** A frame's node in Figma's REST API, as far as the conversion reads it. */
export interface FigmaNode {
  id?: string;
  name?: string;
  type?: string;
  visible?: boolean;
  children?: FigmaNode[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number } | null;
  fills?: unknown;
  strokes?: unknown;
  cornerRadius?: number;
  characters?: string;
  style?: { fontSize?: number; fontWeight?: number; textAlignHorizontal?: string };
  layoutMode?: string;
}

/** A block as made from the frame; Images and Banners name the node Figma draws for them. */
export type FigmaPageBlock =
  | { kind: "text"; html: string }
  | { kind: "button"; label: string; style: "filled" | "outlined" | "text" }
  | { kind: "search"; placeholder: string }
  | { kind: "image"; node: string; ratio: number | null }
  | { kind: "banner"; node: string; heading: string; subheading: string | null };

export interface FigmaPageDraft {
  frameId: string;
  title: string;
  blocks: FigmaPageBlock[];
  /** The tab bar's labels, left to right; empty without one. */
  tabs: string[];
}

/** The most pictures drawn for one page, and for one import. */
export const FIGMA_PAGE_LIMITS = { frames: 10, picturesPerPage: 10, pictures: 30, nodes: 4000 } as const;

type Box = { x: number; y: number; width: number; height: number };

const CONTAINERS = new Set(["FRAME", "GROUP", "INSTANCE", "COMPONENT", "COMPONENT_SET", "SECTION"]);
const SHAPES = new Set(["VECTOR", "ELLIPSE", "STAR", "POLYGON", "BOOLEAN_OPERATION", "LINE", "REGULAR_POLYGON"]);

const STATUS_BAR = /status ?bar|notch|home ?indicator|dynamic ?island|system ?bar/i;
const TAB_BAR = /tab ?bar|bottom ?(nav|bar|menu|navigation)|navigation ?bar|nav ?bar|bottom ?tabs/i;
const TOP_BAR = /app ?bar|top ?bar|header|toolbar|navigation ?header|title ?bar/i;
const BUTTON = /button|btn|cta/i;
const SEARCH = /search/i;

function boxOf(node: FigmaNode): Box | null {
  const b = node.absoluteBoundingBox;
  return b && [b.x, b.y, b.width, b.height].every((n) => typeof n === "number" && Number.isFinite(n)) && b.width > 0 && b.height > 0 ? b : null;
}

function visibleFills(value: unknown): Record<string, unknown>[] {
  return (Array.isArray(value) ? value : []).filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null && (f as { visible?: unknown }).visible !== false);
}

const hasImageFill = (node: FigmaNode) => visibleFills(node.fills).some((f) => f.type === "IMAGE");
const hasSolidFill = (node: FigmaNode) => visibleFills(node.fills).some((f) => f.type === "SOLID" || String(f.type).startsWith("GRADIENT"));
const hasStroke = (node: FigmaNode) => visibleFills(node.strokes).length > 0;

function shown(node: FigmaNode): boolean {
  return node.visible !== false;
}

function descendants(node: FigmaNode, out: FigmaNode[] = [], budget = { left: FIGMA_PAGE_LIMITS.nodes }): FigmaNode[] {
  for (const child of node.children ?? []) {
    if (budget.left-- <= 0) break;
    if (!shown(child)) continue;
    out.push(child);
    descendants(child, out, budget);
  }
  return out;
}

const textsIn = (node: FigmaNode) => descendants(node).filter((n) => n.type === "TEXT" && (n.characters ?? "").trim());
const textOf = (node: FigmaNode) => (node.characters ?? "").replace(/\s+/g, " ").trim();

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** A text as a heading or a paragraph, by its size and weight. */
function textHtml(node: FigmaNode): string {
  const size = node.style?.fontSize ?? 14;
  const weight = node.style?.fontWeight ?? 400;
  const lines = (node.characters ?? "").trim().split(/\r?\n/).map((l) => escapeHtml(l.trim())).filter(Boolean).join("<br>");
  if (size >= 22) return `<h2>${lines}</h2>`;
  if (size >= 17 || (weight >= 600 && size >= 15)) return `<h3>${lines}</h3>`;
  return `<p>${lines}</p>`;
}

/** The children in reading order: top to bottom, then left to right. */
function inOrder(nodes: FigmaNode[]): FigmaNode[] {
  return [...nodes].sort((a, b) => {
    const p = boxOf(a);
    const q = boxOf(b);
    if (!p || !q) return 0;
    return Math.abs(p.y - q.y) > 4 ? p.y - q.y : p.x - q.x;
  });
}

/** Children side by side rather than one under another. */
function sideBySide(node: FigmaNode): boolean {
  if (node.layoutMode === "HORIZONTAL") return true;
  if (node.layoutMode === "VERTICAL") return false;
  const boxes = (node.children ?? []).filter(shown).map(boxOf).filter((b): b is Box => b !== null);
  if (boxes.length < 2) return false;
  let overlapping = 0;
  for (let i = 1; i < boxes.length; i += 1) {
    const a = boxes[i - 1]!;
    const b = boxes[i]!;
    const shared = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
    if (shared > Math.min(a.height, b.height) * 0.5) overlapping += 1;
  }
  return overlapping >= boxes.length / 2;
}

function looksLikeButton(node: FigmaNode, box: Box): boolean {
  if (!CONTAINERS.has(String(node.type)) && node.type !== "RECTANGLE") return false;
  if (box.height < 28 || box.height > 72 || box.width < 56) return false;
  const texts = textsIn(node);
  if (texts.length !== 1 || textOf(texts[0]!).length > 40) return false;
  if (descendants(node).some(hasImageFill)) return false;
  return BUTTON.test(node.name ?? "") || ((hasSolidFill(node) || hasStroke(node)) && (node.cornerRadius ?? 0) > 0);
}

function buttonStyle(node: FigmaNode): "filled" | "outlined" | "text" {
  if (hasSolidFill(node)) return "filled";
  return hasStroke(node) ? "outlined" : "text";
}

/** Reads a frame into blocks, in reading order. */
export function figmaFramePage(frame: FigmaNode): FigmaPageDraft {
  const frameBox = boxOf(frame) ?? { x: 0, y: 0, width: 390, height: 844 };
  const blocks: FigmaPageBlock[] = [];
  let tabs: string[] = [];
  let barTitle: string | null = null;
  let pictures = 0;

  const picture = (node: FigmaNode, box: Box) => {
    if (!node.id || pictures >= FIGMA_PAGE_LIMITS.picturesPerPage) return;
    pictures += 1;
    const ratio = box.width / box.height;
    blocks.push({ kind: "image", node: node.id, ratio: ratio >= 0.2 && ratio <= 5 ? Math.round(ratio * 100) / 100 : null });
  };

  const visit = (node: FigmaNode) => {
    if (!shown(node) || blocks.length >= LAYOUT_LIMITS.maxBlocks) return;
    const box = boxOf(node);
    if (!box) return;
    const name = node.name ?? "";
    const top = (box.y - frameBox.y) / frameBox.height;
    const bottom = (box.y + box.height - frameBox.y) / frameBox.height;
    // Outside the frame, or a line too small to read.
    if (bottom <= 0 || top >= 1 || box.width < 4 || box.height < 4) return;

    if (STATUS_BAR.test(name) && top < 0.1) return;
    if (TAB_BAR.test(name) && top > 0.7) {
      if (!tabs.length) {
        tabs = inOrder(textsIn(node))
          .map(textOf)
          .filter((label) => label.length > 0 && label.length <= 20)
          .slice(0, LAYOUT_LIMITS.maxTabs);
      }
      return;
    }
    if (TOP_BAR.test(name) && top < 0.2 && box.height < 140) {
      const largest = textsIn(node).sort((a, b) => (b.style?.fontSize ?? 0) - (a.style?.fontSize ?? 0))[0];
      if (largest && !barTitle) barTitle = textOf(largest).slice(0, 60);
      return;
    }

    if (node.type === "TEXT") {
      if (textOf(node)) blocks.push({ kind: "text", html: textHtml(node) });
      return;
    }
    if (SEARCH.test(name) && box.height <= 72) {
      const hint = textsIn(node)[0];
      blocks.push({ kind: "search", placeholder: (hint ? textOf(hint) : "Search").slice(0, 60) });
      return;
    }
    if (looksLikeButton(node, box)) {
      blocks.push({ kind: "button", label: textOf(textsIn(node)[0]!), style: buttonStyle(node) });
      return;
    }
    if (hasImageFill(node) && !node.children?.length) {
      picture(node, box);
      return;
    }
    if (SHAPES.has(String(node.type)) || (node.type === "RECTANGLE" && !hasImageFill(node))) {
      // Icons, lines and backgrounds belong to the look; a large drawing is a picture.
      if (box.width >= 120 && box.height >= 80 && SHAPES.has(String(node.type))) picture(node, box);
      return;
    }
    if (!CONTAINERS.has(String(node.type)) || !node.children?.length) return;

    const inside = descendants(node);
    const texts = inside.filter((n) => n.type === "TEXT" && textOf(n));
    // A wide picture with a heading over it (the picture apart from its texts).
    const image = inside.find((n) => hasImageFill(n) && !n.children?.length && (boxOf(n)?.width ?? 0) >= box.width * 0.8);
    if (image?.id && texts.length >= 1 && texts.length <= 3 && box.width >= frameBox.width * 0.8 && box.height >= 120 && box.height <= frameBox.height * 0.6) {
      const [heading, subheading] = [...texts].sort((a, b) => (b.style?.fontSize ?? 0) - (a.style?.fontSize ?? 0));
      if (pictures < FIGMA_PAGE_LIMITS.picturesPerPage) {
        pictures += 1;
        blocks.push({ kind: "banner", node: image.id, heading: textOf(heading!).slice(0, 120), subheading: subheading ? textOf(subheading).slice(0, 200) : null });
      }
      return;
    }
    // A row: of texts only (a heading and "See all"), its texts; of cards or icons, one picture of it.
    if (sideBySide(node)) {
      const drawn = inside.some((n) => hasImageFill(n) || SHAPES.has(String(n.type)) || n.type === "RECTANGLE");
      if (!drawn) {
        for (const text of inOrder(texts).slice(0, 1)) blocks.push({ kind: "text", html: textHtml(text) });
        return;
      }
      if (inside.length > 1) {
        picture(node, box);
        return;
      }
    }
    for (const child of inOrder(node.children)) visit(child);
  };

  for (const child of inOrder(frame.children ?? [])) visit(child);

  // Texts one after another make one Text block.
  const merged: FigmaPageBlock[] = [];
  for (const block of blocks) {
    const last = merged[merged.length - 1];
    if (block.kind === "text" && last?.kind === "text" && last.html.length + block.html.length <= LAYOUT_LIMITS.htmlChars) last.html += block.html;
    else merged.push(block);
  }
  const named = (frame.name ?? "").split("/").pop()!.trim();
  return { frameId: frame.id ?? "", title: (barTitle || named || "Page").slice(0, 60), blocks: merged.slice(0, LAYOUT_LIMITS.maxBlocks), tabs };
}

/** The pages' picture nodes, in order, at most `FIGMA_PAGE_LIMITS.pictures`. */
export function figmaPictureNodes(pages: FigmaPageDraft[]): string[] {
  const ids: string[] = [];
  for (const page of pages) {
    for (const block of page.blocks) {
      if ((block.kind === "image" || block.kind === "banner") && !ids.includes(block.node) && ids.length < FIGMA_PAGE_LIMITS.pictures) ids.push(block.node);
    }
  }
  return ids;
}

/** A page made from a frame, its pictures drawn: what the editor adds to the draft. */
export interface FigmaImportedPage {
  title: string;
  blocks: FigmaPageBlock[];
  /** The picture drawn for each node, as the account's file's address. */
  pictures: Record<string, string>;
}

const SCREEN_WORDS: [RegExp, ScreenName][] = [
  [/cart|basket|bag|sepet|سلة|عربة/i, "cart"],
  [/order|sipari|طلب/i, "orders"],
  [/search|ara\b|بحث/i, "search"],
  [/favou?rite|wish|saved|like|favori|مفضل/i, "favorites"],
  [/notification|alert|bildirim|إشعار/i, "notifications"],
  [/message|chat|inbox|mesaj|رسائل|محادث/i, "messages"],
  [/setting|ayar|إعداد/i, "settings"],
  [/account|profile|me\b|login|sign ?in|hesap|profil|giriş|حساب|دخول/i, "account"],
  [/my ?course|learning|kurslarım|دوراتي/i, "my_courses"],
  [/course|kurs|دورات/i, "courses"],
  [/appointment|booking|randevu|موعد|حجز/i, "appointments"],
  [/service|hizmet|خدم/i, "services"],
  [/ticket|bilet|تذاكر/i, "tickets"],
  [/event|etkinlik|فعالي/i, "events"],
  [/article|news|blog|haber|أخبار|مقال/i, "articles"],
  [/class|ders|حصص/i, "classes"],
  [/membership|üyelik|اشتراك/i, "memberships"],
  [/donat|bağış|تبرع/i, "my_donations"],
  [/campaign|kampanya|حمل/i, "campaigns"],
];

const TAB_ICONS: [RegExp, string][] = [
  [/home|ana ?sayfa|discover|explore|الرئيسية/i, "home"],
  [/shop|store|mağaza|متجر/i, "storefront"],
  [/cart|basket|bag|sepet|سلة/i, "shopping_cart"],
  [/order|sipari|طلب/i, "receipt_long"],
  [/search|ara\b|بحث/i, "search"],
  [/favou?rite|wish|saved|favori|مفضل/i, "favorite"],
  [/notification|alert|bildirim|إشعار/i, "notifications"],
  [/message|chat|inbox|mesaj|رسائل/i, "chat"],
  [/setting|ayar|إعداد/i, "settings"],
  [/account|profile|me\b|hesap|profil|حساب/i, "person"],
  [/course|learn|kurs|دورات/i, "school"],
  [/calendar|booking|appointment|randevu|موعد/i, "event"],
  [/categor|kategori|أقسام/i, "category"],
  [/map|location|harita|خريطة/i, "map"],
];

/** Where a label goes: a page of the same name, a screen the app opens, or the first page. */
function actionFor(label: string, pages: LayoutPage[], screens: readonly ScreenOption[], fallback: Action): Action {
  const key = label.trim().toLowerCase();
  const page = pages.find((p) => p.title.trim().toLowerCase() === key);
  if (page) return { type: "page", page_slug: page.slug };
  const screen = SCREEN_WORDS.find(([words, value]) => words.test(label) && screens.some((s) => s.value === value))?.[1];
  return screen ? { type: "screen", screen } : fallback;
}

/**
 * The draft with the imported pages added (after its own, up to the most
 * pages), their buttons and tabs linked to pages of the same name or the
 * screens their words name, and with `useTabs` the tab bar's labels as the
 * app's tabs.
 */
export function addFigmaPages(
  layout: LayoutContent,
  imported: FigmaImportedPage[],
  options: { screens: readonly ScreenOption[]; sources: readonly ItemSource[]; tabs: string[] | null; updatedAt: string },
): { layout: LayoutContent; added: string[] } {
  const taken = layout.pages.map((p) => p.slug);
  const room = Math.max(0, LAYOUT_LIMITS.maxPages - layout.pages.length);
  const pages: LayoutPage[] = imported.slice(0, room).map((page) => {
    const slug = uniqueSlug(page.title, taken);
    taken.push(slug);
    return { slug, title: page.title, show_title: false, updated_at: options.updatedAt, blocks: [] };
  });
  const all = [...layout.pages, ...pages];
  const home: Action = all[0] ? { type: "page", page_slug: all[0].slug } : { type: "screen", screen: options.screens[0]?.value ?? "account" };
  pages.forEach((page, i) => {
    const source = imported[i]!;
    const blocks: LayoutBlock[] = [];
    for (const b of source.blocks) {
      const base = { id: newBlockId(), visibility: "everyone" as const, title: null };
      if (b.kind === "text") blocks.push({ ...base, type: "text", html: b.html });
      else if (b.kind === "button") blocks.push({ ...base, type: "button", label: b.label.slice(0, 40), icon: null, style: b.style, action: actionFor(b.label, all, options.screens, home) });
      else if (b.kind === "search") {
        if (options.sources[0]) blocks.push({ ...base, type: "search", source: options.sources[0], placeholder: b.placeholder });
      } else {
        const url = source.pictures[b.node];
        if (!url) continue;
        if (b.kind === "banner") blocks.push({ ...base, type: "banner", image_url: url, heading: b.heading, subheading: b.subheading, action: null });
        else blocks.push({ ...base, type: "image", image_url: url, aspect_ratio: b.ratio, action: null });
      }
    }
    page.blocks = blocks.slice(0, LAYOUT_LIMITS.maxBlocks);
  });
  let tabs: LayoutTab[] = layout.tabs;
  const labels = (options.tabs ?? []).slice(0, LAYOUT_LIMITS.maxTabs);
  if (labels.length >= LAYOUT_LIMITS.minTabs) {
    tabs = labels.map((label) => ({
      id: newBlockId("t"),
      label,
      icon: TAB_ICONS.find(([words]) => words.test(label))?.[1] ?? "star",
      target: actionFor(label, all, options.screens, home),
    }));
  }
  return { layout: { ...layout, pages: all, tabs }, added: pages.map((p) => p.title) };
}
