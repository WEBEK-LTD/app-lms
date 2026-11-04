/**
 * 114 The blocks an email is built from: each one's starting content, the
 * brand's look an email starts with, and the checks a saved design passes.
 */

import type { MailBlock, MailBlockType, MailContent, MailDoc, MailLang, MailTheme } from "./types";

/** Yallapp's look (docs/BRAND.md): Ivory around, white inside, Midnight text and buttons, Ember (text) links. */
export const BRAND_THEME: MailTheme = {
  background: "#F4EFE6",
  body: "#FFFFFF",
  text: "#0E0D24",
  muted: "#5B5873",
  brand: "#0E0D24",
  accent: "#C2410C",
  font: "brand",
  width: 600,
  radius: 16,
};

export const MAIL_BLOCK_TYPES: readonly MailBlockType[] = [
  "header", "heading", "text", "image", "button", "divider", "spacer", "columns", "imageText",
  "social", "video", "quote", "cards", "coupon", "badges", "list", "html", "footer",
];

let counter = 0;
export function blockId(): string {
  counter = (counter + 1) % 1_000_000;
  return `b${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** A new block of this type, with content to start from. */
export function newBlock(type: MailBlockType): MailBlock {
  const id = blockId();
  switch (type) {
    case "header":
      return { id, type, logo: "dark", links: [], style: { padding: [28, 32, 12, 32] } };
    case "heading":
      return { id, type, level: 1, text: "A heading that says it all" };
    case "text":
      return { id, type, text: "<p>Write your message here. Keep it short and friendly, and say what the reader gets.</p>" };
    case "image":
      return { id, type, src: "", alt: "", href: "", width: 600, style: { padding: [8, 32, 8, 32], radius: 12 } };
    case "button":
      return { id, type, button: { label: "Get started", url: "{{sign_in_link}}" }, style: { align: "center", padding: [12, 32, 20, 32] } };
    case "divider":
      return { id, type, size: 1, style: { padding: [16, 32, 16, 32], borderColor: "#E7E2D8" } };
    case "spacer":
      return { id, type, size: 24 };
    case "columns": {
      const zero: [number, number, number, number] = [0, 0, 0, 0];
      const point = (title: string): MailBlock[] => [
        { id: blockId(), type: "heading", level: 3, text: title, style: { padding: zero } },
        { id: blockId(), type: "text", text: "<p>A line or two about it.</p>", style: { padding: [6, 0, 0, 0] } },
      ];
      return { id, type, columns: [point("First point"), point("Second point")] };
    }
    case "imageText":
      return { id, type, src: "", alt: "", imageSide: "left", title: "Show and tell", text: "<p>A picture on one side, a few words on the other.</p>", button: { label: "Learn more", url: "https://" } };
    case "social":
      return { id, type, social: [{ network: "facebook", url: "https://" }, { network: "instagram", url: "https://" }, { network: "linkedin", url: "https://" }], style: { align: "center" } };
    case "video":
      return { id, type, src: "", alt: "Watch the video", href: "https://", style: { padding: [8, 32, 8, 32], radius: 12 } };
    case "quote":
      return { id, type, text: "Yallapp turned our website into an app our customers use every day.", title: "Customer name", caption: "Business, city" };
    case "cards":
      return {
        id,
        type,
        cards: [
          { title: "First", text: "What it is, in a line.", kicker: "", button: null },
          { title: "Second", text: "What it is, in a line.", kicker: "", button: null },
        ],
      };
    case "coupon":
      return { id, type, text: "Your code", code: "{{discount}}", button: { label: "Use it now", url: "{{sign_in_link}}" } };
    case "badges":
      return { id, type, stores: [{ store: "google_play", url: "https://" }, { store: "app_store", url: "https://" }], style: { align: "center" } };
    case "list":
      return { id, type, items: ["The first thing they get", "The second thing", "The third thing"] };
    case "html":
      return { id, type, html: '<p style="margin:0">Your own HTML</p>' };
    case "footer":
      return { id, type, text: "Yallapp turns websites into mobile apps.", style: { align: "center" } };
  }
}

export function emptyDoc(theme: MailTheme = BRAND_THEME): MailDoc {
  return { version: 1, theme: { ...theme }, blocks: [newBlock("header"), newBlock("heading"), newBlock("text"), newBlock("button")] };
}

export function emptyContent(lang: MailLang): MailContent {
  return { subject: "", preview: "", mode: "blocks", dir: lang === "ar" ? "rtl" : "ltr", doc: emptyDoc(), html: null };
}

/** Every block, also the ones inside columns. */
export function* allBlocks(blocks: MailBlock[]): Generator<MailBlock> {
  for (const block of blocks) {
    yield block;
    if (block.columns) for (const column of block.columns) yield* allBlocks(column);
  }
}

/** A copy with new ids (duplicating a block or a whole design). */
export function cloneBlock(block: MailBlock): MailBlock {
  const copy: MailBlock = JSON.parse(JSON.stringify(block));
  const renew = (b: MailBlock) => {
    b.id = blockId();
    b.columns?.forEach((column) => column.forEach(renew));
  };
  renew(copy);
  return copy;
}

const COLOR = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;
export function isColor(value: unknown): value is string {
  return typeof value === "string" && COLOR.test(value);
}

/**
 * Whether a design read from the admin's request has the shape the renderer
 * expects (it never trusts the page): known types, colors as #hex, numbers in range.
 */
export function validDoc(doc: unknown): doc is MailDoc {
  if (!doc || typeof doc !== "object") return false;
  const d = doc as MailDoc;
  if (d.version !== 1 || !Array.isArray(d.blocks) || d.blocks.length > 200) return false;
  const t = d.theme;
  if (!t || ![t.background, t.body, t.text, t.muted, t.brand, t.accent].every(isColor)) return false;
  if (typeof t.width !== "number" || t.width < 480 || t.width > 720 || typeof t.radius !== "number" || t.radius < 0 || t.radius > 40) return false;
  return d.blocks.every((b) => validBlock(b, 0));
}

function validBlock(block: MailBlock, depth: number): boolean {
  if (!block || typeof block !== "object" || typeof block.id !== "string" || !MAIL_BLOCK_TYPES.includes(block.type)) return false;
  const s = block.style;
  if (s) {
    for (const key of ["color", "background", "surface", "borderColor"] as const) if (s[key] !== undefined && !isColor(s[key])) return false;
    if (s.padding !== undefined && !(Array.isArray(s.padding) && s.padding.length === 4 && s.padding.every((p) => typeof p === "number" && p >= 0 && p <= 120))) return false;
    if (s.radius !== undefined && !(typeof s.radius === "number" && s.radius >= 0 && s.radius <= 60)) return false;
    if (s.fontSize !== undefined && !(typeof s.fontSize === "number" && s.fontSize >= 10 && s.fontSize <= 64)) return false;
  }
  if (block.columns) {
    if (block.type !== "columns" || depth > 0 || block.columns.length < 1 || block.columns.length > 3) return false;
    if (!block.columns.every((column) => Array.isArray(column) && column.length <= 20 && column.every((b) => b.type !== "columns" && validBlock(b, depth + 1)))) return false;
  }
  if (block.size !== undefined && !(typeof block.size === "number" && block.size >= 0 && block.size <= 200)) return false;
  return true;
}
