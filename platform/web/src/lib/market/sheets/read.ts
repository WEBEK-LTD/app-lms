import { isCompoundFile, readXlsRows } from "./xls-read";
import { readXlsxRows } from "./xlsx-read";
import { parseDelimited, parseJsonTable, SHEET_MAX_BYTES, SheetError, toTable, type SheetTable } from "./table";

/** 115.8 Any catalog file as a table, by what it is (its first bytes), its name and its type. */
export function readSheet(bytes: Uint8Array, name = "", contentType = ""): SheetTable {
  if (bytes.length > SHEET_MAX_BYTES) throw new SheetError("too_large", `The file is too large. The limit is ${SHEET_MAX_BYTES / 1024 / 1024} MB.`);
  if (bytes.length === 0) throw new SheetError("empty", "The file is empty.");
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return toTable(readXlsxRows(bytes));
  if (isCompoundFile(bytes)) return toTable(readXlsRows(bytes));
  const text = new TextDecoder("utf-8").decode(bytes);
  const lower = name.toLowerCase();
  if (/\.json$/.test(lower) || /json/.test(contentType) || /^\s*[[{]/.test(text.replace(/^﻿/, ""))) return parseJsonTable(text);
  if (/<html|<!doctype html/i.test(text.slice(0, 500))) throw new SheetError("unsupported", "This is a web page, not a spreadsheet. For a Google Sheet, share it with anyone who has the link.");
  return parseDelimited(text);
}

export { SheetError, type SheetTable } from "./table";
