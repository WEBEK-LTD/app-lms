import { readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import { bidiRuns, hasArabic, mirrored } from "../arabic-shape";
import type { Lang } from "@/i18n/config";

/**
 * 71 A receipt as a PDF, made on the server with PDFKit (pure JavaScript; its
 * font engine, fontkit, applies the font's own OpenType forms, so Arabic
 * letters join as they should). The site's fonts are embedded (subset):
 * Bricolage Grotesque for Latin and Turkish, IBM Plex Sans Arabic for Arabic
 * (docs/BRAND.md), the static files in src/app/fonts/og. PDFKit doesn't run
 * the bidirectional algorithm, so each line is cut into runs in visual order
 * first (lib/arabic-shape.ts `bidiRuns`): a right-to-left run is handed over
 * in reading order and laid out from its end by fontkit, Latin words and
 * numbers keep reading left to right. An Arabic receipt is laid out right to
 * left: what is at the left of an English one is at the right.
 *
 * The receipt's content (lib/receipts/build.ts) comes already in its words;
 * this file only lays it out.
 */

export interface ReceiptParty {
  /** "From", "Billed to", "Donor". */
  label: string;
  name: string;
  /** Contact lines under the name. */
  lines: string[];
}

export interface ReceiptItem {
  name: string;
  /** A line under the name (a dish's options, "1 year"). */
  detail?: string | null;
  quantity?: number | null;
  /** Formatted, like "₺450.00". */
  amount: string;
}

export interface ReceiptTotal {
  label: string;
  value: string;
  /** The total. */
  strong?: boolean;
  /** A refund. */
  danger?: boolean;
}

export interface ReceiptDocument {
  lang: Lang;
  /** "Receipt", "Donation receipt". */
  title: string;
  /** "No. YA-1A2B3C4D". */
  numberLine: string;
  /** "Date: 21 October 2026, 14:05 (GMT+3)" and other lines under the number. */
  headerLines: string[];
  status: { label: string; tone: "paid" | "refunded" | "partly" | "demo" };
  seller: ReceiptParty;
  buyer: ReceiptParty | null;
  /** Label and value pairs: the app, the campaign, how an order is collected. */
  facts: [string, string][];
  columns: { item: string; quantity: string; amount: string };
  items: ReceiptItem[];
  totals: ReceiptTotal[];
  /** "Payment" and its rows: how it was paid, the provider's reference. */
  payment: { label: string; rows: [string, string][] };
  notes: string[];
  footer: string;
  /** A small accent (the top bar): Ember for Yallapp's receipts, the app's colour for a business's. */
  accent: string;
  /** The PDF's own title and author (its properties). */
  meta: { title: string; author: string };
}

export interface ReceiptFonts {
  latin: Buffer;
  latinBold: Buffer;
  arabic: Buffer;
  arabicBold: Buffer;
}

const FONT_DIR = "src/app/fonts/og";

let fonts: Promise<ReceiptFonts> | null = null;

/** The embedded fonts, read once per server instance (next.config.ts traces the folder for every route). */
export function receiptFonts(): Promise<ReceiptFonts> {
  fonts ??= (async () => {
    const read = (file: string) => readFile(path.join(process.cwd(), FONT_DIR, file));
    const [latin, latinBold, arabic, arabicBold] = await Promise.all([
      read("BricolageGrotesque-Medium.ttf"),
      read("BricolageGrotesque-ExtraBold.ttf"),
      read("IBMPlexSansArabic-Medium.ttf"),
      read("IBMPlexSansArabic-Bold.ttf"),
    ]);
    return { latin, latinBold, arabic, arabicBold };
  })().catch((e: unknown) => {
    fonts = null;
    throw e;
  });
  return fonts;
}

// docs/BRAND.md: Midnight text, Ember only as a small accent.
const INK = "#0E0D24";
const MUTED = "#5E5A73";
const LINE = "#E4DED3";
const SOFT = "#F4EFE6";
const DANGER = "#B42318";
const SUCCESS = "#1E7B4A";

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 50;
const CONTENT = PAGE.width - 2 * MARGIN;
const BOTTOM = PAGE.height - 70;

type Weight = "regular" | "bold";

/**
 * Without `features`, PDFKit lays a text out word by word and puts the words
 * back in reading order, which would turn an Arabic run's words around. With
 * them (none beyond the font's defaults), the font engine lays the whole run
 * out at once.
 */
const WHOLE_RUN = { features: [] as PDFKit.Mixins.OpenTypeFeatures[] };

interface TextOptions {
  /** From the start of the content (the left in English, the right in Arabic). */
  x?: number;
  width?: number;
  size?: number;
  weight?: Weight;
  color?: string;
  align?: "start" | "end";
  /** Space between lines, as a factor of the size. */
  leading?: number;
}

/** A hex colour, or the fallback. */
function colour(value: string | null | undefined, fallback: string): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

class Layout {
  readonly rtl: boolean;
  y = 0;

  constructor(
    private readonly doc: PDFKit.PDFDocument,
    lang: Lang,
  ) {
    this.rtl = lang === "ar";
  }

  private fontOf(text: string, rtl: boolean, weight: Weight): string {
    // Arabic text, and neutral characters inside it, in IBM Plex Sans Arabic; the rest in Bricolage Grotesque.
    const arabic = hasArabic(text) || (rtl && !/[A-Za-z0-9]/.test(text));
    return `${arabic ? "arabic" : "latin"}-${weight}`;
  }

  /** The pieces of one line in visual order, each with its font and width. */
  private pieces(line: string, size: number, weight: Weight) {
    return bidiRuns(line, this.rtl ? "rtl" : "ltr").map((run) => {
      const font = this.fontOf(run.text, run.rtl, weight);
      // A right-to-left run with Arabic letters goes to the font engine in reading order (it shapes it and lays it out from its end);
      // one without them (punctuation between Arabic words) is turned around here, with its brackets mirrored.
      const arabic = run.rtl && hasArabic(run.text);
      const text = run.rtl && !arabic ? [...run.text].reverse().map(mirrored).join("") : arabic ? [...run.text].map(mirrored).join("") : run.text;
      // The space drawn before the run's first glyph: for a run the font engine turns around, the spaces at its end.
      const lead = (arabic ? /\s*$/ : /^\s*/).exec(text)![0];
      const core = text.trim();
      this.doc.font(font).fontSize(size);
      return {
        font,
        core,
        lead: lead ? this.doc.widthOfString(lead, WHOLE_RUN) : 0,
        width: this.doc.widthOfString(text, WHOLE_RUN),
      };
    });
  }

  width(line: string, size: number, weight: Weight): number {
    return this.pieces(line, size, weight).reduce((sum, p) => sum + p.width, 0);
  }

  /** Lines of at most `width`, cut at spaces (a word longer than a line is cut where it must). */
  wrap(text: string, width: number, size: number, weight: Weight): string[] {
    const out: string[] = [];
    for (const paragraph of text.split("\n")) {
      let line = "";
      // Spaces inside a left-to-right span (a phone number) don't break the line.
      for (const word of paragraph.match(/(?:\u2066[^\u2069]*\u2069?|\S)+/g) ?? []) {
        const candidate = line ? `${line} ${word}` : word;
        if (this.width(candidate, size, weight) <= width) {
          line = candidate;
          continue;
        }
        if (line) out.push(line);
        line = word;
        while (this.width(line, size, weight) > width && line.length > 1) {
          let cut = line.length - 1;
          while (cut > 1 && this.width(line.slice(0, cut), size, weight) > width) cut--;
          out.push(line.slice(0, cut));
          line = line.slice(cut);
        }
      }
      out.push(line);
    }
    return out;
  }

  /** Draws one line with its baseline at `baseline`; `left` is the page's own left. */
  private drawLine(line: string, left: number, width: number, baseline: number, size: number, weight: Weight, color: string, align: "start" | "end") {
    const pieces = this.pieces(line, size, weight);
    const total = pieces.reduce((sum, p) => sum + p.width, 0);
    // Start is the left in a left-to-right receipt and the right in a right-to-left one.
    const atLeft = (align === "start") !== this.rtl;
    let x = atLeft ? left : left + width - total;
    for (const piece of pieces) {
      if (piece.core) {
        this.doc
          .font(piece.font)
          .fontSize(size)
          .fillColor(color)
          .text(piece.core, x + piece.lead, baseline, { ...WHOLE_RUN, lineBreak: false, baseline: "alphabetic" });
      }
      x += piece.width;
    }
  }

  /** The page's own left of a box `width` wide at `x` from the start. */
  private leftOf(x: number, width: number): number {
    return this.rtl ? MARGIN + CONTENT - x - width : MARGIN + x;
  }

  /** Text at the current height; returns the height it took, and moves down unless `stay`. */
  text(text: string, options: TextOptions = {}, stay = false): number {
    const size = options.size ?? 10.5;
    const weight = options.weight ?? "regular";
    const width = options.width ?? CONTENT - (options.x ?? 0);
    const step = size * (options.leading ?? (this.rtl || hasArabic(text) ? 1.55 : 1.35));
    const lines = this.wrap(text, width, size, weight);
    const left = this.leftOf(options.x ?? 0, width);
    lines.forEach((line, i) => {
      this.drawLine(line, left, width, this.y + size + i * step, size, weight, options.color ?? INK, options.align ?? "start");
    });
    const height = lines.length * step;
    if (!stay) this.y += height;
    return height;
  }

  rule(color = LINE, thickness = 0.8) {
    this.doc.moveTo(MARGIN, this.y).lineTo(MARGIN + CONTENT, this.y).lineWidth(thickness).strokeColor(color).stroke();
  }

  box(x: number, width: number, height: number, fill: string, radius = 0) {
    this.doc.roundedRect(this.leftOf(x, width), this.y, width, height, radius).fill(fill);
  }

  /** A new page when less than `height` is left. */
  room(height: number) {
    if (this.y + height <= BOTTOM) return;
    this.doc.addPage();
    this.y = MARGIN;
  }
}

/** The receipt as PDF bytes. */
export async function renderReceiptPdf(receipt: ReceiptDocument, fontFiles?: ReceiptFonts): Promise<Buffer> {
  const files = fontFiles ?? (await receiptFonts());
  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    // No built-in font: everything is drawn in the embedded ones.
    font: null as unknown as string,
    lang: receipt.lang,
    displayTitle: true,
    info: { Title: receipt.meta.title, Author: receipt.meta.author, Creator: "Yallapp", Producer: "Yallapp" },
  });
  doc.registerFont("latin-regular", files.latin);
  doc.registerFont("latin-bold", files.latinBold);
  doc.registerFont("arabic-regular", files.arabic);
  doc.registerFont("arabic-bold", files.arabicBold);
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const page = new Layout(doc, receipt.lang);
  const half = (CONTENT - 24) / 2;

  // A thin accent at the top.
  doc.rect(0, 0, PAGE.width, 6).fill(colour(receipt.accent, INK));
  page.y = 44;

  // The seller at the start, the title and number at the end.
  const top = page.y;
  page.text(receipt.seller.name, { width: half, size: 18, weight: "bold" });
  for (const line of receipt.seller.lines) page.text(line, { width: half, size: 9.5, color: MUTED });
  const sellerBottom = page.y;
  page.y = top;
  page.text(receipt.title, { x: half + 24, width: half, size: 20, weight: "bold", align: "end" });
  page.text(receipt.numberLine, { x: half + 24, width: half, size: 10.5, align: "end" });
  for (const line of receipt.headerLines) page.text(line, { x: half + 24, width: half, size: 9.5, color: MUTED, align: "end" });
  page.y += 4;
  // The status, as a small badge at the end.
  const tone = receipt.status.tone;
  const badgeColor = tone === "paid" ? SUCCESS : tone === "demo" ? MUTED : DANGER;
  const badgeWidth = page.width(receipt.status.label, 9.5, "bold") + 18;
  page.box(CONTENT - badgeWidth, badgeWidth, 19, SOFT, 9.5);
  page.y += 3;
  page.text(receipt.status.label, { x: CONTENT - badgeWidth, width: badgeWidth - 9, size: 9.5, weight: "bold", color: badgeColor, align: "end" });
  page.y = Math.max(page.y, sellerBottom) + 18;
  page.rule();
  page.y += 16;

  // Who it's for, and the facts.
  const partiesTop = page.y;
  if (receipt.buyer) {
    page.text(receipt.buyer.label, { width: half, size: 9, color: MUTED });
    page.text(receipt.buyer.name, { width: half, size: 11.5, weight: "bold" });
    for (const line of receipt.buyer.lines) page.text(line, { width: half, size: 10, color: MUTED });
  }
  const buyerBottom = page.y;
  page.y = partiesTop;
  for (const [label, value] of receipt.facts) {
    page.text(label, { x: half + 24, width: half, size: 9, color: MUTED });
    page.text(value, { x: half + 24, width: half, size: 10.5 });
    page.y += 3;
  }
  page.y = Math.max(page.y, buyerBottom) + 18;

  // The items.
  const qtyWidth = 50;
  const amountWidth = 110;
  const nameWidth = CONTENT - qtyWidth - amountWidth - 24;
  page.room(60);
  page.box(0, CONTENT, 24, SOFT, 4);
  page.y += 6;
  page.text(receipt.columns.item, { x: 10, width: nameWidth, size: 9, weight: "bold", color: MUTED }, true);
  page.text(receipt.columns.quantity, { x: nameWidth + 14, width: qtyWidth, size: 9, weight: "bold", color: MUTED, align: "end" }, true);
  page.text(receipt.columns.amount, { x: CONTENT - amountWidth - 10, width: amountWidth, size: 9, weight: "bold", color: MUTED, align: "end" });
  page.y += 10;
  for (const item of receipt.items) {
    const nameHeight = page.wrap(item.name, nameWidth, 10.5, "bold").length * 10.5 * 1.55 + (item.detail ? page.wrap(item.detail, nameWidth, 9.5, "regular").length * 9.5 * 1.55 : 0);
    page.room(nameHeight + 16);
    const start = page.y;
    page.text(item.name, { x: 10, width: nameWidth, size: 10.5, weight: "bold" });
    if (item.detail) page.text(item.detail, { x: 10, width: nameWidth, size: 9.5, color: MUTED });
    const end = page.y;
    page.y = start;
    if (item.quantity) page.text(String(item.quantity), { x: nameWidth + 14, width: qtyWidth, size: 10.5, align: "end" }, true);
    page.text(item.amount, { x: CONTENT - amountWidth - 10, width: amountWidth, size: 10.5, align: "end" });
    page.y = Math.max(page.y, end) + 8;
    page.rule();
    page.y += 8;
  }

  // The totals, at the end.
  const totalsWidth = 260;
  for (const total of receipt.totals) {
    page.room(24);
    const size = total.strong ? 12.5 : 10.5;
    const weight: Weight = total.strong ? "bold" : "regular";
    const color = total.danger ? DANGER : INK;
    page.text(total.label, { x: CONTENT - totalsWidth, width: totalsWidth - amountWidth - 10, size, weight, color }, true);
    page.text(total.value, { x: CONTENT - amountWidth - 10, width: amountWidth, size, weight, color, align: "end" });
    page.y += 4;
  }
  page.y += 14;

  // How it was paid.
  page.room(40 + receipt.payment.rows.length * 18);
  page.text(receipt.payment.label, { size: 11.5, weight: "bold" });
  page.y += 4;
  for (const [label, value] of receipt.payment.rows) {
    page.text(label, { width: 130, size: 9.5, color: MUTED }, true);
    page.text(value, { x: 140, width: CONTENT - 140, size: 10.5 });
    page.y += 3;
  }
  page.y += 10;
  for (const note of receipt.notes) {
    page.room(30);
    page.text(note, { size: 9.5, color: MUTED });
    page.y += 4;
  }

  // The footer, at the bottom of the last page.
  page.y = Math.max(page.y + 10, PAGE.height - 64);
  if (page.y > PAGE.height - 40) {
    doc.addPage();
    page.y = PAGE.height - 64;
  }
  page.rule();
  page.y += 10;
  page.text(receipt.footer, { size: 9, color: MUTED });

  readableLigatures(doc);
  doc.end();
  return done;
}

/**
 * A glyph that stands for several Arabic letters (lam with alef, and the
 * font's other ligatures) is drawn inside a right-to-left run, so a reader
 * that copies or searches the text turns the run back into reading order,
 * letters of the glyph included. Its text map (ToUnicode) gives them in
 * drawing order, so they come out in reading order after that turn. PDFKit
 * keeps the map on its font objects until the document ends.
 */
function readableLigatures(doc: PDFKit.PDFDocument): void {
  const families = (doc as unknown as { _fontFamilies?: Record<string, { unicode?: unknown }> })._fontFamilies ?? {};
  for (const key of ["arabic-regular", "arabic-bold"]) {
    const unicode = families[key]?.unicode;
    if (!Array.isArray(unicode)) continue;
    unicode.forEach((points: unknown, gid) => {
      if (Array.isArray(points) && points.length > 1) unicode[gid] = [...(points as number[])].reverse();
    });
  }
}
