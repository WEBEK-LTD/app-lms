/**
 * 43 Import and export of a language's translations, for owners who
 * translate in a spreadsheet or with a translator: CSV (`id,source,
 * translation,where`, UTF-8), JSON (`{ language, translations: { id: {
 * source, translation, where } } }`) and XLIFF 1.2. Rows are matched by
 * ID on import; the source is there for whoever translates. Pure, so the
 * Translations page and the tests share it.
 */

export interface ExchangeRow {
  id: string;
  source: string;
  translation: string;
  where?: string;
}

export type ExchangeFormat = "csv" | "json" | "xliff";

const CSV_HEADER = ["id", "source", "translation", "where"];

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) || /^\s|\s$/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: readonly ExchangeRow[]): string {
  const lines = [CSV_HEADER.join(","), ...rows.map((r) => [r.id, r.source, r.translation, r.where ?? ""].map(csvCell).join(","))];
  // A byte order mark, so spreadsheet apps read the file as UTF-8.
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** The cells of a CSV file (RFC 4180: quotes, doubled quotes, line breaks in quotes). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let i = 0; i < input.length; i += 1) {
    const c = input[i]!;
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else cell += c;
      continue;
    }
    if (c === '"' && cell === "") quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function toJson(rows: readonly ExchangeRow[], language: string): string {
  const translations: Record<string, { source: string; translation: string; where?: string }> = {};
  for (const r of rows) translations[r.id] = { source: r.source, translation: r.translation, ...(r.where ? { where: r.where } : {}) };
  return `${JSON.stringify({ language, translations }, null, 2)}\n`;
}

const XML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
const xml = (text: string) => text.replace(/[&<>"']/g, (c) => XML_ESCAPES[c]!);
const unxml = (text: string) =>
  text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, inner: string) => inner.replace(/[&<>]/g, (c) => XML_ESCAPES[c]!))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

export function toXliff(rows: readonly ExchangeRow[], sourceLanguage: string, targetLanguage: string): string {
  const units = rows.map(
    (r) =>
      `      <trans-unit id="${xml(r.id)}">\n        <source>${xml(r.source)}</source>\n        <target>${xml(r.translation)}</target>${r.where ? `\n        <note>${xml(r.where)}</note>` : ""}\n      </trans-unit>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">',
    `  <file source-language="${xml(sourceLanguage)}" target-language="${xml(targetLanguage)}" datatype="plaintext" original="app">`,
    "    <body>",
    ...units,
    "    </body>",
    "  </file>",
    "</xliff>",
    "",
  ].join("\n");
}

export interface ImportResult {
  /** Row ID, then its translation (empty ones left out). */
  translations: Record<string, string>;
  /** The file's language, when it says. */
  language: string | null;
  /** Why the file couldn't be read. */
  error: string | null;
}

/** Reads an exported file back; the format is told by the name, else by the content. */
export function parseImport(name: string, text: string): ImportResult {
  const body = text.replace(/^﻿/, "").trim();
  const format: ExchangeFormat = /\.json$/i.test(name) || body.startsWith("{") ? "json" : /\.(xliff|xlf|xml)$/i.test(name) || body.startsWith("<") ? "xliff" : "csv";
  const out: Record<string, string> = {};
  const keep = (id: unknown, translation: unknown) => {
    if (typeof id === "string" && id.trim() && typeof translation === "string" && translation.trim()) out[id.trim()] = translation.trim();
  };
  try {
    if (format === "json") {
      const data = JSON.parse(body) as unknown;
      const root = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
      if (!root) return { translations: {}, language: null, error: "The file isn't a translations file." };
      const list = root.translations && typeof root.translations === "object" ? (root.translations as Record<string, unknown>) : root;
      for (const [id, value] of Object.entries(list)) {
        if (id === "language" && list === root) continue;
        keep(id, value && typeof value === "object" ? (value as Record<string, unknown>).translation : value);
      }
      return { translations: out, language: typeof root.language === "string" ? root.language : null, error: null };
    }
    if (format === "xliff") {
      if (!/<xliff[\s>]/.test(body)) return { translations: {}, language: null, error: "The file isn't an XLIFF file." };
      for (const unit of body.matchAll(/<trans-unit\b[^>]*\bid="([^"]*)"[^>]*>([\s\S]*?)<\/trans-unit>/g)) {
        const target = /<target\b[^>]*>([\s\S]*?)<\/target>/.exec(unit[2]!);
        if (target) keep(unxml(unit[1]!), unxml(target[1]!));
      }
      const language = /target-language="([^"]*)"/.exec(body)?.[1] ?? null;
      return { translations: out, language, error: null };
    }
    const rows = parseCsv(body);
    const header = rows[0]?.map((h) => h.trim().toLowerCase()) ?? [];
    const idAt = header.indexOf("id");
    const translationAt = header.indexOf("translation");
    if (idAt === -1 || translationAt === -1) return { translations: {}, language: null, error: 'The file needs an "id" and a "translation" column.' };
    for (const row of rows.slice(1)) keep(row[idAt], row[translationAt]);
    return { translations: out, language: null, error: null };
  } catch {
    return { translations: {}, language: null, error: "The file can't be read. Export a file from this page and fill in its translation column." };
  }
}
