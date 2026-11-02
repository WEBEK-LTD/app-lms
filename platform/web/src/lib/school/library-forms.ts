import type { SchoolBook, SchoolLibrarySettings } from "../data/types";
import { ImportFormatError, parseCsv } from "../import/table";
import { copyCode, LIBRARY_LIMITS } from "./library";

/**
 * 113.11 The dashboard's library forms, checked: a book, its copies'
 * codes, books from a CSV file, and the library's days. Messages are
 * English; the dashboard translates them (`library.known`).
 */

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const str = (form: Record<string, string>, name: string) => (form[name] ?? "").trim();

function limited(form: Record<string, string>, name: string, max: number, errors: Record<string, string>, empty: string | null): string {
  const value = str(form, name);
  if (!value && empty) errors[name] = empty;
  else if (value.length > max) errors[name] = `Keep it under ${max} characters.`;
  return value;
}

/** An ISBN as it is kept: its digits (and a final X), when it has 10 or 13 of them; null otherwise. */
export function isbnOf(text: string): string | null {
  const plain = text.replace(/[\s-]/g, "").toUpperCase();
  if (/^\d{13}$/.test(plain) || /^\d{9}[\dX]$/.test(plain)) return plain;
  return null;
}

export type BookForm = Pick<SchoolBook, "title" | "author" | "isbn" | "shelf" | "category" | "language" | "description">;

function bookFields(form: Record<string, string>, errors: Record<string, string>): BookForm {
  const title = limited(form, "title", LIBRARY_LIMITS.title, errors, "Enter the book's title.");
  const author = limited(form, "author", LIBRARY_LIMITS.author, errors, "Enter the author, or Unknown.");
  const isbnText = str(form, "isbn");
  const isbn = isbnText ? isbnOf(isbnText) : null;
  if (isbnText && !isbn) errors.isbn = "Enter the ISBN's 10 or 13 digits, or leave it empty.";
  const shelf = limited(form, "shelf", LIBRARY_LIMITS.shelf, errors, null);
  const category = limited(form, "category", LIBRARY_LIMITS.category, errors, null);
  const language = limited(form, "language", LIBRARY_LIMITS.language, errors, null);
  const description = limited(form, "description", LIBRARY_LIMITS.description, errors, null);
  return { title, author, isbn, shelf: shelf || null, category: category || null, language: language || null, description: description || null };
}

export function parseBookForm(form: Record<string, string>): Parsed<BookForm> {
  const errors: Record<string, string> = {};
  const value = bookFields(form, errors);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value };
}

export function bookFormValues(book: SchoolBook | null, fileLink: string): Record<string, string> {
  return {
    title: book?.title ?? "",
    author: book?.author ?? "",
    isbn: book?.isbn ?? "",
    shelf: book?.shelf ?? "",
    category: book?.category ?? "",
    language: book?.language ?? "",
    description: book?.description ?? "",
    file: fileLink,
  };
}

/** Copies' codes written one per line, or with commas or spaces between them. */
export function parseCopyCodes(text: string): { ok: true; codes: string[] } | { ok: false; error: string } {
  const codes = [...new Set(text.split(/[\s,;|]+/).map(copyCode).filter(Boolean))];
  if (codes.length === 0) return { ok: false, error: "Enter the copies' codes, one per line." };
  if (codes.some((c) => c.length > LIBRARY_LIMITS.code)) return { ok: false, error: `Keep each code under ${LIBRARY_LIMITS.code} characters.` };
  if (codes.length > LIBRARY_LIMITS.copiesPerBook) return { ok: false, error: `A book can have up to ${LIBRARY_LIMITS.copiesPerBook} copies.` };
  return { ok: true, codes };
}

/** Codes for new copies the school didn't label: the book's number and the copy's, like B12-3. */
export function madeCodes(bookId: number, taken: ReadonlySet<string>, count: number): string[] {
  const out: string[] = [];
  for (let n = 1; out.length < count && n < 10_000; n++) {
    const code = `B${bookId}-${n}`;
    if (!taken.has(code)) out.push(code);
  }
  return out;
}

export function parseLibrarySettings(form: Record<string, string>): Parsed<SchoolLibrarySettings> {
  const errors: Record<string, string> = {};
  const number = (name: string, min: number, max: number, message: string) => {
    const n = Number(str(form, name));
    if (!Number.isInteger(n) || n < min || n > max) errors[name] = message;
    return n;
  };
  const loanDays = number("loanDays", 1, LIBRARY_LIMITS.maxLoanDays, `Enter the loan days, from 1 to ${LIBRARY_LIMITS.maxLoanDays}.`);
  const holdDays = number("holdDays", 1, LIBRARY_LIMITS.maxHoldDays, `Enter the days a book is held, from 1 to ${LIBRARY_LIMITS.maxHoldDays}.`);
  const maxLoans = number("maxLoans", 1, LIBRARY_LIMITS.maxLoans, `Enter the books one person borrows at once, from 1 to ${LIBRARY_LIMITS.maxLoans}.`);
  const remindDays = number("remindDays", 0, LIBRARY_LIMITS.maxRemindDays, `Enter the days before the due date, from 0 to ${LIBRARY_LIMITS.maxRemindDays}.`);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { loanDays, holdDays, maxLoans, remindDays } };
}

// Books from a sheet

export const BOOKS_CSV_EXAMPLE = [
  "title,author,isbn,shelf,category,language,copies,codes",
  "The Little Prince,Antoine de Saint-Exupéry,9780156012195,A3,Stories,English,2,LP-1|LP-2",
  "Kalila wa Dimna,Ibn al-Muqaffa,,B1,Stories,Arabic,3,",
].join("\n");

const COLUMN_NAMES: Record<string, string[]> = {
  title: ["title", "book", "name"],
  author: ["author", "writer"],
  isbn: ["isbn"],
  shelf: ["shelf", "place"],
  category: ["category", "subject"],
  language: ["language", "lang"],
  description: ["description", "about"],
  copies: ["copies", "count"],
  codes: ["codes", "copy codes", "barcodes"],
};

export interface BookRow {
  line: number;
  book: BookForm;
  copies: number;
  codes: string[];
}

export function parseBooksCsv(text: string): { ok: true; rows: BookRow[]; problems: string[] } | { ok: false; message: string } {
  let table;
  try {
    table = parseCsv(text);
  } catch (e) {
    if (e instanceof ImportFormatError) return { ok: false, message: e.message };
    throw e;
  }
  const at = (name: string) => table.columns.findIndex((c) => COLUMN_NAMES[name]!.includes(c.trim().toLowerCase()));
  const columns = Object.fromEntries(Object.keys(COLUMN_NAMES).map((k) => [k, at(k)]));
  if (columns.title! < 0) return { ok: false, message: "The file needs the column title (and author, isbn, shelf, category, language, copies or codes if you have them)." };
  const rows: BookRow[] = [];
  const problems: string[] = [];
  table.rows.forEach((cells, i) => {
    const line = i + 2;
    const cell = (name: string) => (columns[name]! >= 0 ? (cells[columns[name]!] ?? "").trim() : "");
    if (cells.every((c) => !c.trim())) return;
    const errors: Record<string, string> = {};
    const book = bookFields({ title: cell("title"), author: cell("author") || "Unknown", isbn: cell("isbn"), shelf: cell("shelf"), category: cell("category"), language: cell("language"), description: cell("description") }, errors);
    const codes: ReturnType<typeof parseCopyCodes> = cell("codes") ? parseCopyCodes(cell("codes")) : { ok: true, codes: [] };
    const copiesText = cell("copies");
    const copies = copiesText ? Number(copiesText) : codes.ok ? Math.max(1, codes.codes.length) : 1;
    if (!codes.ok) errors.codes = codes.error;
    else if (!Number.isInteger(copies) || copies < 0 || copies > LIBRARY_LIMITS.copiesPerBook) errors.copies = `The copies are from 0 to ${LIBRARY_LIMITS.copiesPerBook}.`;
    if (Object.keys(errors).length) {
      problems.push(`Line ${line}: ${Object.values(errors)[0]}`);
      return;
    }
    rows.push({ line, book, copies: Math.max(copies, codes.ok ? codes.codes.length : 0), codes: codes.ok ? codes.codes : [] });
  });
  return { ok: true, rows, problems };
}
