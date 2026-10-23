/**
 * 81.4 Import: what an owner brings, as a table of named columns. A CSV
 * file (a spreadsheet saved as CSV, with commas, semicolons or tabs, in
 * UTF-8, with or without its byte order mark), or a feed: a product feed in
 * RSS or Atom (Google Merchant Center's, which most shop platforms make, with
 * its `g:` fields), or a link to a CSV (a Google Sheet published as CSV).
 */

export interface Table {
  /** The header row, as written. */
  columns: string[];
  rows: string[][];
}

export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 500;

export class ImportFormatError extends Error {
  constructor(
    readonly code: "empty" | "too_large" | "too_many_rows" | "not_a_table" | "not_a_feed",
    message: string,
  ) {
    super(message);
    this.name = "ImportFormatError";
  }
}

/** The delimiter of the header line: the one of comma, semicolon and tab it has most of (outside quotes). */
function delimiterOf(text: string): string {
  const line = text.split(/\r?\n/, 1)[0] ?? "";
  const counts = { ",": 0, ";": 0, "\t": 0 };
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && char in counts) counts[char as keyof typeof counts]++;
  }
  const [best, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]!;
  return count > 0 ? best : ",";
}

/** CSV as RFC 4180 writes it: quoted fields with doubled quotes and line breaks inside. */
export function parseCsv(input: string): Table {
  if (input.length > IMPORT_MAX_BYTES) throw new ImportFormatError("too_large", `The file is too large. The limit is ${IMPORT_MAX_BYTES / 1024 / 1024} MB.`);
  const text = input.replace(/^﻿/, "");
  if (!text.trim()) throw new ImportFormatError("empty", "The file is empty.");
  const delimiter = delimiterOf(text);
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === "") quoted = true;
    else if (char === delimiter) {
      record.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
      if (records.length > IMPORT_MAX_ROWS + 1) throw new ImportFormatError("too_many_rows", `Import at most ${IMPORT_MAX_ROWS} rows at a time.`);
    } else field += char;
  }
  if (field !== "" || record.length) {
    record.push(field);
    records.push(record);
  }
  const filled = records.filter((r) => r.some((cell) => cell.trim() !== ""));
  const [header, ...rows] = filled;
  if (!header || header.length < 2) throw new ImportFormatError("not_a_table", "This isn't a table with a header row. Save your spreadsheet as CSV, with the column names in the first row.");
  if (rows.length > IMPORT_MAX_ROWS) throw new ImportFormatError("too_many_rows", `Import at most ${IMPORT_MAX_ROWS} rows at a time.`);
  return { columns: header.map((c) => c.trim()), rows: rows.map((r) => header.map((_, i) => (r[i] ?? "").trim())) };
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function xmlText(value: string): string {
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(value);
  const raw = cdata ? cdata[1]! : value;
  const decoded = cdata
    ? raw
    : raw.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
        if (code[0] === "#") {
          const n = code[1]?.toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
          return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : whole;
        }
        return ENTITIES[code.toLowerCase()] ?? whole;
      });
  return decoded.trim();
}

/** A feed's items, each field by its tag name without a namespace (`g:price` → `price`; the plain one wins over `g:` only when that is missing). */
export function parseFeed(input: string): Table {
  if (input.length > IMPORT_MAX_BYTES) throw new ImportFormatError("too_large", `The feed is too large. The limit is ${IMPORT_MAX_BYTES / 1024 / 1024} MB.`);
  const items = [...input.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => m[2]!);
  if (!items.length) throw new ImportFormatError("not_a_feed", "No products were found in this feed. Use a product feed (RSS or Atom), or a CSV link.");
  if (items.length > IMPORT_MAX_ROWS) throw new ImportFormatError("too_many_rows", `Import at most ${IMPORT_MAX_ROWS} items at a time.`);
  const records = items.map((item) => {
    const fields = new Map<string, string>();
    for (const m of item.matchAll(/<([a-z][\w-]*:)?([a-z][\w-]*)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1?\2>)/gi)) {
      const prefix = (m[1] ?? "").toLowerCase();
      const name = m[2]!.toLowerCase();
      // Atom's <link href="…"/>.
      const value = m[4] !== undefined ? xmlText(m[4]) : (/\bhref\s*=\s*"([^"]*)"/i.exec(m[3] ?? "")?.[1] ?? "");
      if (!value) continue;
      // Google's own field is the product's (g:title, g:price); a plain one fills in where it has none.
      if (prefix === "g:" || !fields.has(name)) fields.set(name, value);
      // Only the first of a repeated field (additional_image_link aside).
    }
    return fields;
  });
  const columns = [...new Set(records.flatMap((r) => [...r.keys()]))];
  return { columns, rows: records.map((r) => columns.map((c) => r.get(c) ?? "")) };
}

/** A file or a fetched body: a feed when it is XML, CSV otherwise. */
export function parseImport(text: string, contentType = ""): Table {
  const start = text.replace(/^﻿/, "").trimStart().slice(0, 200);
  return /xml|rss|atom/i.test(contentType) || start.startsWith("<") ? parseFeed(text) : parseCsv(text);
}
