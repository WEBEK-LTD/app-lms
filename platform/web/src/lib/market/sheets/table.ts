/**
 * 115.8 A spreadsheet read into rows of text, whatever it came as: Excel
 * (.xlsx, .xls), CSV, TSV, JSON or a Google Sheet's CSV. The first row is
 * the header. No dependency: the readers are in this folder.
 */

export interface SheetTable {
  columns: string[];
  rows: string[][];
}

/** Large catalogs are fine; past this the file is refused rather than cut. */
export const SHEET_MAX_ROWS = 100_000;
export const SHEET_MAX_BYTES = 30 * 1024 * 1024;

export class SheetError extends Error {
  constructor(
    readonly code: "too_large" | "too_many_rows" | "empty" | "unreadable" | "unsupported",
    message: string,
  ) {
    super(message);
    this.name = "SheetError";
  }
}

/** Rows of cells to a table: the first non-empty row is the header; empty rows go; every row as wide as the header. */
export function toTable(cells: string[][]): SheetTable {
  const rows = cells.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ""));
  if (rows.length === 0) throw new SheetError("empty", "The file has no rows.");
  if (rows.length - 1 > SHEET_MAX_ROWS) throw new SheetError("too_many_rows", `The file has more than ${SHEET_MAX_ROWS.toLocaleString("en")} rows. Split it in two.`);
  const header = rows[0]!;
  let width = header.length;
  while (width > 0 && header[width - 1] === "") width--;
  if (width === 0) throw new SheetError("empty", "The first row should name the columns.");
  const columns = header.slice(0, width).map((c, i) => c || `Column ${i + 1}`);
  return { columns, rows: rows.slice(1).map((r) => Array.from({ length: width }, (_, i) => r[i] ?? "")) };
}

/** CSV or TSV: the separator is found from the header (comma, semicolon or tab); quotes as Excel writes them. */
export function parseDelimited(input: string): SheetTable {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const counts = { ",": 0, ";": 0, "\t": 0 } as Record<string, number>;
  let quoted = false;
  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch in counts) counts[ch]! += 1;
  }
  const sep = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]![1] > 0 ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0]![0] : ",") as string;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") inQuotes = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      if (rows.length > SHEET_MAX_ROWS + 1) throw new SheetError("too_many_rows", `The file has more than ${SHEET_MAX_ROWS.toLocaleString("en")} rows. Split it in two.`);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return toTable(rows);
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(cellText).filter(Boolean).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** JSON: a list of objects, or an object holding one (items, products, data, rows). */
export function parseJsonTable(input: string): SheetTable {
  let data: unknown;
  try {
    data = JSON.parse(input.replace(/^﻿/, ""));
  } catch {
    throw new SheetError("unreadable", "The JSON file couldn't be read. Check that it is valid JSON.");
  }
  if (data && !Array.isArray(data) && typeof data === "object") {
    const holder = data as Record<string, unknown>;
    data = ["items", "products", "data", "rows"].map((k) => holder[k]).find(Array.isArray) ?? Object.values(holder).find(Array.isArray);
  }
  if (!Array.isArray(data) || data.length === 0) throw new SheetError("empty", "The JSON file should hold a list of products.");
  if (data.length > SHEET_MAX_ROWS) throw new SheetError("too_many_rows", `The file has more than ${SHEET_MAX_ROWS.toLocaleString("en")} rows. Split it in two.`);
  const columns: string[] = [];
  for (const item of data.slice(0, 1000)) {
    if (item && typeof item === "object" && !Array.isArray(item)) for (const k of Object.keys(item)) if (!columns.includes(k)) columns.push(k);
  }
  if (columns.length === 0) throw new SheetError("empty", "The JSON file should hold a list of products.");
  return { columns, rows: data.map((item) => columns.map((c) => (item && typeof item === "object" ? cellText((item as Record<string, unknown>)[c]).trim() : ""))) };
}
