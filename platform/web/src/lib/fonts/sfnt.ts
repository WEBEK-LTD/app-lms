/**
 * 97.2 What a font file says about itself: its kind (TrueType or OpenType;
 * WOFF and collections are refused, the app can't load them), its family
 * name, its weight, whether it's italic and whether its maker allows
 * embedding it (the OS/2 table's fsType). Reads only the table directory and
 * the `name` and `OS/2` tables.
 */

export type FontKind = "ttf" | "otf";

export interface FontFacts {
  kind: FontKind;
  /** The family name in the file (name ID 16, else 1), when there is one. */
  family: string | null;
  /** 100 to 900; 400 when the file doesn't say. A variable file's default weight. */
  weight: number;
  /** A variable font (an `fvar` table): one file draws every weight. */
  variable: boolean;
  italic: boolean;
  /** fsType's "restricted licence embedding": the maker doesn't allow embedding it at all. */
  restricted: boolean;
}

export type FontProblem = "not_font" | "web_font" | "collection";

export function readFont(data: Buffer): { ok: true; facts: FontFacts } | { ok: false; problem: FontProblem } {
  if (data.length < 12) return { ok: false, problem: "not_font" };
  const tag = data.toString("latin1", 0, 4);
  if (tag === "wOFF" || tag === "wOF2") return { ok: false, problem: "web_font" };
  if (tag === "ttcf") return { ok: false, problem: "collection" };
  const kind: FontKind | null = data.readUInt32BE(0) === 0x00010000 || tag === "true" ? "ttf" : tag === "OTTO" ? "otf" : null;
  if (!kind) return { ok: false, problem: "not_font" };
  const count = data.readUInt16BE(4);
  if (count === 0 || count > 200 || 12 + count * 16 > data.length) return { ok: false, problem: "not_font" };
  const tables = new Map<string, { offset: number; length: number }>();
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16;
    const offset = data.readUInt32BE(at + 8);
    const length = data.readUInt32BE(at + 12);
    if (offset + length > data.length) return { ok: false, problem: "not_font" };
    tables.set(data.toString("latin1", at, at + 4), { offset, length });
  }
  // Every font the app can draw has these.
  if (!tables.has("cmap") || !tables.has("head")) return { ok: false, problem: "not_font" };

  let weight = 400;
  let italic = false;
  let restricted = false;
  const os2 = tables.get("OS/2");
  if (os2 && os2.length >= 64) {
    const raw = data.readUInt16BE(os2.offset + 4);
    if (raw >= 1 && raw <= 1000) weight = Math.min(900, Math.max(100, Math.round(raw / 100) * 100));
    // fsType bits 0-3: 2 is "restricted licence embedding"; installable, preview & print and editable allow it.
    restricted = (data.readUInt16BE(os2.offset + 8) & 0x000f) === 0x0002;
    italic = (data.readUInt16BE(os2.offset + 62) & 0x0001) === 1;
  }
  const head = tables.get("head")!;
  // macStyle bit 1: italic.
  if (head.length >= 46 && (data.readUInt16BE(head.offset + 44) & 0x0002) !== 0) italic = true;

  return { ok: true, facts: { kind, family: familyName(data, tables.get("name")), weight, variable: tables.has("fvar"), italic, restricted } };
}

/** Name ID 16 (typographic family), else 1, from a Windows Unicode or Mac Roman record. */
function familyName(data: Buffer, table: { offset: number; length: number } | undefined): string | null {
  if (!table || table.length < 6) return null;
  const count = data.readUInt16BE(table.offset + 2);
  const strings = table.offset + data.readUInt16BE(table.offset + 4);
  const found = new Map<number, string>();
  for (let i = 0; i < count; i++) {
    const at = table.offset + 6 + i * 12;
    if (at + 12 > table.offset + table.length) break;
    const platform = data.readUInt16BE(at);
    const nameId = data.readUInt16BE(at + 6);
    const length = data.readUInt16BE(at + 8);
    const start = strings + data.readUInt16BE(at + 10);
    if ((nameId !== 1 && nameId !== 16) || found.has(nameId) || start + length > data.length) continue;
    let text: string;
    if (platform === 3 || platform === 0) {
      const swapped = Buffer.from(data.subarray(start, start + length - (length % 2)));
      swapped.swap16();
      text = swapped.toString("utf16le");
    } else if (platform === 1) {
      text = data.toString("latin1", start, start + length);
    } else continue;
    if (text.trim()) found.set(nameId, text.trim());
  }
  return found.get(16) ?? found.get(1) ?? null;
}
