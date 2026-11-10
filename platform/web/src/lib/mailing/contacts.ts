/**
 * 114 The admin's contacts: customers and leads who have no Yallapp account
 * (Admin › Email campaigns › Contacts). Added one by one, pasted (one per
 * line: `email, name, company`) or uploaded as a CSV file with a header row.
 * Every import is checked first (the preview, with each row's problems), then
 * adds only the new addresses: one already a contact, or a Yallapp account's,
 * is reported and left as it is. Each contact keeps where the admin knows them
 * from and who added them, having confirmed MAIL_CONTACT_AGREEMENT. Whether
 * one may be mailed is the same list as for accounts (lib/mailing/consent.ts).
 */

import { randomUUID } from "node:crypto";
import { parseCountry } from "../account/country";
import { MAIL_CONTACT_SOURCES, MAIL_LANGS, type MailContact, type MailContactSource, type MailLang, type MailSuppressionReason } from "./types";

export const CONTACT_LIMITS = {
  email: 191,
  name: 120,
  company: 160,
  tag: 40,
  tags: 20,
  sourceNote: 200,
  /** Rows in one paste or file. */
  rows: 5000,
  /** A file's size. */
  bytes: 2_000_000,
} as const;

const EMAIL = /^[^\s@,;:<>()[\]"\\]+@[^\s@,;:<>()[\]"\\]+\.[^\s@,;:<>()[\]"\\]{2,}$/u;

/** An address as typed, cleaned: no spaces, `mailto:` or `<…>`, lower case. */
export function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  let email = value.trim().replace(/^mailto:/i, "");
  const angled = /<([^<>]+)>/.exec(email);
  if (angled) email = angled[1]!;
  return email.trim().toLowerCase();
}

export function validEmail(email: string): boolean {
  return email.length <= CONTACT_LIMITS.email && EMAIL.test(email) && !email.includes("..");
}

// Control characters and the invisible marks that reorder text (a name can't hide or flip what's around it).
// ZWNJ and ZWJ stay: Persian and other scripts need them.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

/** A name or a company: one line, no hidden characters, at most `max` long (null when it's longer). */
export function cleanText(value: unknown, max: number): string | null {
  const text = typeof value === "string" ? value.normalize("NFC").replace(UNSAFE, " ").replace(/\s+/g, " ").trim() : "";
  return text.length > max ? null : text;
}

/** One tag: lower case letters, digits, spaces, `-`, `_` and `.` (any language), at most 40 long; "" when nothing's left. */
export function cleanTag(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N} _.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CONTACT_LIMITS.tag)
    .trim();
}

/** Tags from a list or a text (separated by commas, semicolons or `|`): unique, sorted, at most 20. */
export function cleanTags(value: unknown): string[] {
  const parts = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;|،]/) : [];
  const tags = [...new Set(parts.map(cleanTag).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return tags.slice(0, CONTACT_LIMITS.tags);
}

const LANG_NAMES: Record<string, MailLang> = {
  en: "en",
  eng: "en",
  english: "en",
  ingilizce: "en",
  "i̇ngilizce": "en",
  الإنجليزية: "en",
  الانجليزية: "en",
  ar: "ar",
  ara: "ar",
  arabic: "ar",
  arapça: "ar",
  arapca: "ar",
  عربي: "ar",
  العربية: "ar",
  tr: "tr",
  tur: "tr",
  turkish: "tr",
  türkçe: "tr",
  turkce: "tr",
  التركية: "tr",
};

/** "en", "Arabic", "Türkçe", "العربية"…: the email language, or null when it isn't one. */
export function parseLang(value: unknown): MailLang | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  if (MAIL_LANGS.includes(key as MailLang)) return key as MailLang;
  return LANG_NAMES[key] ?? LANG_NAMES[key.split(/[-_]/)[0]!] ?? null;
}

export function sourceLabel(source: MailContactSource, note?: string | null): string {
  const label = MAIL_CONTACT_SOURCES.find((s) => s.value === source)?.label ?? source;
  if (!note) return label;
  return source === "other" ? note : `${label}: ${note}`;
}

/** Where the admin knows them from: required, and "Other" needs its own words. */
export function checkSource(source: unknown, note: unknown): { ok: true; source: MailContactSource; sourceNote: string | null } | { ok: false; error: string } {
  if (!MAIL_CONTACT_SOURCES.some((s) => s.value === source)) return { ok: false, error: "Choose where you know them from." };
  const text = cleanText(note, CONTACT_LIMITS.sourceNote);
  if (text === null) return { ok: false, error: `Keep where they're from under ${CONTACT_LIMITS.sourceNote} characters.` };
  if (source === "other" && !text) return { ok: false, error: "Write where you know them from." };
  return { ok: true, source: source as MailContactSource, sourceNote: text || null };
}

// CSV ---------------------------------------------------------------------

const DELIMITERS = [",", ";", "\t", "،"] as const;

/** The separator a text uses, from its first line (outside quotes): comma, semicolon (Excel in Turkish), tab, or the Arabic comma. */
export function detectDelimiter(text: string): string {
  const counts = new Map<string, number>(DELIMITERS.map((d) => [d, 0]));
  let quoted = false;
  for (const ch of text) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === "\n" || ch === "\r")) break;
    else if (!quoted && counts.has(ch)) counts.set(ch, counts.get(ch)! + 1);
  }
  let best = ",";
  for (const d of DELIMITERS) if (counts.get(d)! > counts.get(best)!) best = d;
  return best;
}

/**
 * RFC 4180 rows: quoted fields may hold the separator, line breaks and
 * doubled quotes (""); the byte-order mark Excel writes goes; CRLF, LF and CR
 * all end a row. Each row keeps its first line's number (1-based).
 */
export function parseCsv(input: string, delimiter = detectDelimiter(input.replace(/^\ufeff/, ""))): { line: number; cells: string[] }[] {
  const text = input.replace(/^\ufeff/, "");
  const rows: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  let touched = false;
  const endCell = () => {
    cells.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    if (touched || cells.some((c) => c.trim())) rows.push({ line: rowLine, cells });
    cells = [];
    touched = false;
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else {
        if (ch === "\n" || (ch === "\r" && text[i + 1] !== "\n")) line++;
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && !cell.trim()) {
      // A quote opens a field only at its start (spaces before it don't count).
      cell = "";
      quoted = true;
      touched = true;
    } else if (ch === delimiter) {
      endCell();
      touched = true;
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRow();
      line++;
      rowLine = line;
    } else cell += ch;
  }
  if (cell || cells.length || touched) endRow();
  return rows.map((r) => ({ line: r.line, cells: r.cells.map((c) => c.trim()) }));
}

/** A CSV cell: quoted when it needs it; a formula-looking one (=, +, -, @) starts with ' so a spreadsheet shows it as text. */
export function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n;]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Imports ------------------------------------------------------------------

export type ContactImportFormat = "paste" | "csv";

/** A row as read, before it's checked. */
export interface ContactRowInput {
  line: number;
  email: string;
  name: string;
  company: string;
  lang: string;
  country: string;
  tags: string;
}

type Column = keyof Omit<ContactRowInput, "line"> | "first" | "last";

const HEADERS: Record<string, Column> = {
  email: "email",
  "e-mail": "email",
  "email address": "email",
  "e-mail address": "email",
  mail: "email",
  "e-posta": "email",
  eposta: "email",
  "البريد الإلكتروني": "email",
  "البريد الالكتروني": "email",
  البريد: "email",
  name: "name",
  "full name": "name",
  "contact name": "name",
  contact: "name",
  "ad soyad": "name",
  isim: "name",
  ad: "name",
  الاسم: "name",
  "first name": "first",
  "given name": "first",
  "last name": "last",
  surname: "last",
  "family name": "last",
  soyad: "last",
  company: "company",
  "company name": "company",
  business: "company",
  "business name": "company",
  organization: "company",
  organisation: "company",
  şirket: "company",
  sirket: "company",
  firma: "company",
  الشركة: "company",
  language: "lang",
  lang: "lang",
  dil: "lang",
  اللغة: "lang",
  country: "country",
  "country code": "country",
  ülke: "country",
  ulke: "country",
  الدولة: "country",
  البلد: "country",
  tags: "tags",
  tag: "tags",
  labels: "tags",
  etiketler: "tags",
  الوسوم: "tags",
};

function headerOf(cell: string): Column | null {
  const key = cell.replace(/^\ufeff/, "").trim().toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " ");
  return HEADERS[key] ?? null;
}

export interface ReadImport {
  rows: ContactRowInput[];
  /** What stops the whole import (no email column, too many rows). */
  error: string | null;
}

/** The rows of a paste (`email, name, company` per line; a first line naming the columns is skipped) or a CSV file with a header row. */
export function readContactImport(text: string, format: ContactImportFormat): ReadImport {
  if (text.length > CONTACT_LIMITS.bytes) return { rows: [], error: "The file is over 2 MB. Split it into smaller files." };
  const parsed = parseCsv(text);
  if (parsed.length === 0) return { rows: [], error: format === "csv" ? "The file is empty." : "Paste at least one contact." };
  let columns: (Column | null)[];
  let body = parsed;
  const header = parsed[0]!.cells.map(headerOf);
  if (format === "csv") {
    if (!header.includes("email")) {
      const looksLikeRow = parsed[0]!.cells.some((c) => validEmail(normalizeEmail(c)));
      return { rows: [], error: looksLikeRow ? "The first row must name the columns (email, name, company, language, country, tags). It looks like a contact: add a row of column names above it." : "No email column: the first row must name the columns, one of them email." };
    }
    columns = header;
    body = parsed.slice(1);
  } else {
    columns = ["email", "name", "company"];
    if (header[0] === "email") {
      columns = header;
      body = parsed.slice(1);
    }
  }
  if (body.length > CONTACT_LIMITS.rows) return { rows: [], error: `That's ${body.length.toLocaleString("en")} rows: import up to ${CONTACT_LIMITS.rows.toLocaleString("en")} at a time.` };
  const rows = body.map(({ line, cells }) => {
    const get = (column: Column) => {
      const index = columns.indexOf(column);
      return index >= 0 ? (cells[index] ?? "") : "";
    };
    const name = get("name") || [get("first"), get("last")].filter(Boolean).join(" ");
    return { line, email: get("email"), name, company: get("company"), lang: get("lang"), country: get("country"), tags: get("tags") };
  });
  return { rows, error: null };
}

export type ContactRowStatus = "new" | "duplicate" | "contact" | "account" | "error";

/** A row checked: what it would add, or why it won't be. */
export interface ContactImportRow {
  line: number;
  email: string;
  name: string;
  company: string | null;
  lang: MailLang;
  country: string | null;
  tags: string[];
  status: ContactRowStatus;
  /** Why it isn't added; for "new", nothing. */
  message: string | null;
}

export interface ImportDefaults {
  lang: MailLang;
  country: string | null;
  /** Added to every row's own tags. */
  tags: string[];
}

export function checkContactRow(row: ContactRowInput, defaults: ImportDefaults): ContactImportRow {
  const email = normalizeEmail(row.email);
  const problems: string[] = [];
  if (!email) problems.push("No email address");
  else if (!validEmail(email)) problems.push(`“${row.email.slice(0, 80)}” isn't an email address`);
  const name = cleanText(row.name, CONTACT_LIMITS.name);
  if (name === null) problems.push(`The name is over ${CONTACT_LIMITS.name} characters`);
  const company = cleanText(row.company, CONTACT_LIMITS.company);
  if (company === null) problems.push(`The company is over ${CONTACT_LIMITS.company} characters`);
  const lang = row.lang.trim() ? parseLang(row.lang) : defaults.lang;
  if (!lang) problems.push(`Unknown language “${row.lang.slice(0, 20)}”: use en, ar or tr`);
  const country = row.country.trim() ? parseCountry(row.country) : defaults.country;
  if (row.country.trim() && !country) problems.push(`Unknown country “${row.country.slice(0, 20)}”: use a two-letter code like EG or TR`);
  return {
    line: row.line,
    email: email || row.email.trim().slice(0, 191),
    name: name ?? "",
    company: company || null,
    lang: lang ?? defaults.lang,
    country,
    tags: cleanTags([...cleanTags(row.tags), ...defaults.tags]),
    status: problems.length ? "error" : "new",
    message: problems.length ? problems.join(". ") : null,
  };
}

/**
 * Checks every row: bad ones are errors, an address listed again is a
 * duplicate of its first line, and one that's a contact already or a Yallapp
 * account's is reported and not added. `contacts` and `accounts`: lower case.
 */
export function checkContactImport(rows: ContactRowInput[], defaults: ImportDefaults, existing: { contacts: Iterable<string>; accounts: Iterable<string> }): ContactImportRow[] {
  const contacts = new Set(existing.contacts);
  const accounts = new Set(existing.accounts);
  const seen = new Map<string, number>();
  return rows.map((input) => {
    const row = checkContactRow(input, defaults);
    if (row.status === "error") return row;
    const first = seen.get(row.email);
    if (first !== undefined) return { ...row, status: "duplicate", message: `Listed again (first on line ${first})` };
    seen.set(row.email, row.line);
    if (accounts.has(row.email)) return { ...row, status: "account", message: "Has a Yallapp account: campaigns to accounts reach them" };
    if (contacts.has(row.email)) return { ...row, status: "contact", message: "Already a contact" };
    return row;
  });
}

export function importSummary(rows: Pick<ContactImportRow, "status">[]): Record<ContactRowStatus, number> {
  const counts: Record<ContactRowStatus, number> = { new: 0, duplicate: 0, contact: 0, account: 0, error: 0 };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

/** The contact a checked row makes. */
export function contactOf(row: Pick<ContactImportRow, "email" | "name" | "company" | "lang" | "country" | "tags">, meta: { source: MailContactSource; sourceNote: string | null; addedBy: string; now: Date }): MailContact {
  return {
    id: randomUUID(),
    email: row.email,
    name: row.name,
    company: row.company,
    lang: row.lang,
    country: row.country,
    tags: row.tags,
    source: meta.source,
    sourceNote: meta.sourceNote,
    addedBy: meta.addedBy,
    addedAt: meta.now,
    updatedAt: meta.now,
    unsubscribedAt: null,
  };
}

// Status and export ------------------------------------------------------------

export type ContactMailStatus = "subscribed" | MailSuppressionReason;

export const CONTACT_STATUS_LABEL: Record<ContactMailStatus, string> = {
  subscribed: "Gets campaigns",
  unsubscribed: "Unsubscribed",
  bounced: "Bounced",
  complained: "Marked as spam",
  admin: "Kept out by the team",
};

/** The contacts as a CSV file (UTF-8 with its byte-order mark, so Excel shows Arabic and Turkish names right). */
export function contactsCsv(contacts: MailContact[], status: (email: string) => ContactMailStatus): string {
  const head = ["email", "name", "company", "language", "country", "tags", "source", "source_note", "status", "added_by", "added_at"];
  const lines = [head.join(",")];
  for (const c of contacts) {
    lines.push(
      [c.email, c.name, c.company, c.lang, c.country, c.tags.join("; "), MAIL_CONTACT_SOURCES.find((s) => s.value === c.source)?.label ?? c.source, c.sourceNote, CONTACT_STATUS_LABEL[status(c.email)], c.addedBy, c.addedAt.toISOString()]
        .map(csvCell)
        .join(","),
    );
  }
  return `\ufeff${lines.join("\r\n")}\r\n`;
}

// One contact, by hand ------------------------------------------------------------

export interface ContactInput {
  email: unknown;
  name?: unknown;
  company?: unknown;
  lang?: unknown;
  country?: unknown;
  tags?: unknown;
}

export type ContactFields = Pick<MailContact, "email" | "name" | "company" | "lang" | "country" | "tags">;

/** A contact typed in the form, checked: its fields, or what's wrong with each. */
export function cleanContactInput(input: ContactInput): { ok: true; fields: ContactFields } | { ok: false; errors: Partial<Record<keyof ContactFields, string>> } {
  const errors: Partial<Record<keyof ContactFields, string>> = {};
  const email = normalizeEmail(input.email);
  if (!email) errors.email = "Write the email address.";
  else if (!validEmail(email)) errors.email = "That isn't an email address.";
  const name = cleanText(input.name, CONTACT_LIMITS.name);
  if (name === null) errors.name = `Keep the name under ${CONTACT_LIMITS.name} characters.`;
  const company = cleanText(input.company, CONTACT_LIMITS.company);
  if (company === null) errors.company = `Keep the company under ${CONTACT_LIMITS.company} characters.`;
  const lang = parseLang(input.lang);
  if (!lang) errors.lang = "Choose English, Arabic or Turkish.";
  const countryText = typeof input.country === "string" ? input.country.trim() : "";
  const country = countryText ? parseCountry(countryText) : null;
  if (countryText && !country) errors.country = "Choose a country from the list.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, fields: { email, name: name ?? "", company: company || null, lang: lang!, country, tags: cleanTags(input.tags) } };
}
