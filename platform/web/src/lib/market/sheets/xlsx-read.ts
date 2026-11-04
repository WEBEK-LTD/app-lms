import { SheetError } from "./table";
import { readZip } from "./zip";

/** 115.8 The first worksheet of an .xlsx as rows of text (shared and inline strings, numbers, booleans). */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function xmlText(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()]!,
  );
}

/** "AB" → 27 (0-based). */
function columnIndex(ref: string): number {
  let n = 0;
  for (const ch of ref) {
    const code = ch.charCodeAt(0);
    if (code < 65 || code > 90) break;
    n = n * 26 + (code - 64);
  }
  return n - 1;
}

function joinedText(fragment: string): string {
  let out = "";
  for (const m of fragment.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g)) out += m[1] ?? "";
  return xmlText(out);
}

function numberText(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  // Excel keeps 0.1 + 0.2 as 0.30000000000000004: show what Excel shows.
  return String(Number(n.toPrecision(15)));
}

export function readXlsxRows(bytes: Uint8Array): string[][] {
  const files = readZip(bytes);
  const read = (name: string) => {
    const file = files.get(name);
    return file ? new TextDecoder().decode(file()) : null;
  };
  const workbook = read("xl/workbook.xml");
  const rels = read("xl/_rels/workbook.xml.rels") ?? "";
  let sheetPath = "xl/worksheets/sheet1.xml";
  const firstSheet = workbook ? /<sheet\b[^>]*\br:id="([^"]+)"/.exec(workbook) : null;
  if (firstSheet) {
    const rel = new RegExp(`<Relationship\\b[^>]*\\bId="${firstSheet[1]}"[^>]*\\bTarget="([^"]+)"`).exec(rels) ?? new RegExp(`<Relationship\\b[^>]*\\bTarget="([^"]+)"[^>]*\\bId="${firstSheet[1]}"`).exec(rels);
    if (rel) sheetPath = rel[1]!.startsWith("/") ? rel[1]!.slice(1) : `xl/${rel[1]!.replace(/^\.\//, "")}`;
  }
  const sheet = read(sheetPath);
  if (sheet === null) throw new SheetError("unreadable", "The Excel file has no sheet this reader can find.");
  const shared: string[] = [];
  const sst = read("xl/sharedStrings.xml");
  if (sst) for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(joinedText(m[1]!));
  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b[^>]*\/>/g)) {
    const body = rowMatch[2];
    const r = /\br="(\d+)"/.exec(rowMatch[1] ?? "");
    const rowIndex = r ? Number(r[1]) - 1 : rows.length;
    while (rows.length < rowIndex) rows.push([]);
    const row: string[] = [];
    if (body) {
      for (const c of body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1]!;
        const ref = /\br="([A-Z]+)\d*"/.exec(attrs);
        const col = ref ? columnIndex(ref[1]!) : row.length;
        const type = /\bt="([^"]+)"/.exec(attrs)?.[1] ?? "n";
        const inner = c[2] ?? "";
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        let text = "";
        if (type === "s") text = v !== undefined ? (shared[Number(v)] ?? "") : "";
        else if (type === "inlineStr") text = joinedText(inner);
        else if (type === "b") text = v === "1" ? "TRUE" : "FALSE";
        else if (type === "str" || type === "e") text = xmlText(v ?? "");
        else text = v !== undefined ? numberText(v) : "";
        while (row.length < col) row.push("");
        row[col] = text;
      }
    }
    rows.push(row);
  }
  return rows;
}
