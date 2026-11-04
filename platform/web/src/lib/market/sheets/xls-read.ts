import { SheetError } from "./table";

/**
 * 115.8 The first worksheet of an old Excel file (.xls, Excel 97–2003:
 * BIFF8 in a compound file) as rows of text: shared and inline strings,
 * numbers (RK, MULRK, NUMBER), formulas' cached results and booleans.
 */

const SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const END_OF_CHAIN = 0xfffffffe;
const FREE = 0xffffffff;

export function isCompoundFile(bytes: Uint8Array): boolean {
  return bytes.length >= 512 && SIGNATURE.every((b, i) => bytes[i] === b);
}

const damaged = () => new SheetError("unreadable", "The .xls file couldn't be read. Open it in Excel and save it as .xlsx, then try again.");

/** The compound file's stream named Workbook (or Book). */
function workbookStream(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sectorSize = 1 << view.getUint16(0x1e, true);
  const miniSectorSize = 1 << view.getUint16(0x20, true);
  const fatSectors = view.getUint32(0x2c, true);
  const firstDir = view.getUint32(0x30, true);
  const miniCutoff = view.getUint32(0x38, true);
  const firstMiniFat = view.getUint32(0x3c, true);
  let difatSector = view.getUint32(0x44, true);
  const sectorAt = (n: number) => {
    const at = (n + 1) * sectorSize;
    if (at + sectorSize > bytes.length) throw damaged();
    return at;
  };
  // The FAT's sectors: 109 in the header, then the DIFAT chain.
  const fatList: number[] = [];
  for (let i = 0; i < 109 && fatList.length < fatSectors; i++) fatList.push(view.getUint32(0x4c + i * 4, true));
  let guard = 0;
  while (fatList.length < fatSectors && difatSector !== END_OF_CHAIN && difatSector !== FREE && guard++ < 10_000) {
    const at = sectorAt(difatSector);
    const per = sectorSize / 4 - 1;
    for (let i = 0; i < per && fatList.length < fatSectors; i++) fatList.push(view.getUint32(at + i * 4, true));
    difatSector = view.getUint32(at + per * 4, true);
  }
  const fat: number[] = [];
  for (const s of fatList) {
    const at = sectorAt(s);
    for (let i = 0; i < sectorSize / 4; i++) fat.push(view.getUint32(at + i * 4, true));
  }
  const chain = (start: number, table: number[]) => {
    const out: number[] = [];
    for (let s = start, n = 0; s !== END_OF_CHAIN && s !== FREE; s = table[s] ?? END_OF_CHAIN) {
      if (n++ > table.length) throw damaged();
      out.push(s);
    }
    return out;
  };
  const readChain = (start: number, size: number) => {
    const out = new Uint8Array(size);
    let off = 0;
    for (const s of chain(start, fat)) {
      if (off >= size) break;
      const at = sectorAt(s);
      const n = Math.min(sectorSize, size - off);
      out.set(bytes.subarray(at, at + n), off);
      off += n;
    }
    return out;
  };
  const dirSectors = chain(firstDir, fat);
  const dir = new Uint8Array(dirSectors.length * sectorSize);
  dirSectors.forEach((s, i) => dir.set(bytes.subarray(sectorAt(s), sectorAt(s) + sectorSize), i * sectorSize));
  const dv = new DataView(dir.buffer);
  const entries: { name: string; type: number; start: number; size: number }[] = [];
  for (let at = 0; at + 128 <= dir.length; at += 128) {
    const nameLength = dv.getUint16(at + 0x40, true);
    const name = new TextDecoder("utf-16le").decode(dir.subarray(at, at + Math.max(0, nameLength - 2)));
    entries.push({ name, type: dir[at + 0x42]!, start: dv.getUint32(at + 0x74, true), size: dv.getUint32(at + 0x78, true) });
  }
  const root = entries.find((e) => e.type === 5);
  const book = entries.find((e) => e.type === 2 && (e.name === "Workbook" || e.name === "Book"));
  if (!root || !book) throw damaged();
  if (book.size >= miniCutoff) return readChain(book.start, book.size);
  // A small workbook lives in the mini stream.
  const miniStream = readChain(root.start, root.size);
  const miniFat: number[] = [];
  for (const s of chain(firstMiniFat, fat)) {
    const at = sectorAt(s);
    for (let i = 0; i < sectorSize / 4; i++) miniFat.push(view.getUint32(at + i * 4, true));
  }
  const out = new Uint8Array(book.size);
  let off = 0;
  for (const s of chain(book.start, miniFat)) {
    if (off >= book.size) break;
    const n = Math.min(miniSectorSize, book.size - off);
    out.set(miniStream.subarray(s * miniSectorSize, s * miniSectorSize + n), off);
    off += n;
  }
  return out;
}

function rkNumber(rk: number): number {
  let value: number;
  if (rk & 0x02) value = rk >> 2;
  else {
    const buf = new DataView(new ArrayBuffer(8));
    buf.setUint32(4, rk & 0xfffffffc, true);
    value = buf.getFloat64(0, true);
  }
  return rk & 0x01 ? value / 100 : value;
}

const numberText = (n: number) => String(Number(n.toPrecision(15)));

/** A BIFF8 string from `parts` (a record and its CONTINUEs): each continuation starts with a new flags byte for the characters. */
class Reader {
  part = 0;
  at = 0;
  constructor(readonly parts: Uint8Array[]) {}
  private get data() {
    return this.parts[this.part]!;
  }
  private ensure() {
    while (this.at >= this.data.length && this.part < this.parts.length - 1) {
      this.part++;
      this.at = 0;
    }
  }
  u8() {
    this.ensure();
    return this.data[this.at++] ?? 0;
  }
  u16() {
    return this.u8() | (this.u8() << 8);
  }
  u32() {
    return (this.u16() | (this.u16() << 16)) >>> 0;
  }
  skip(n: number) {
    for (let i = 0; i < n; i++) this.u8();
  }
  string(cch: number, flags: number): string {
    let high = flags & 0x01;
    let out = "";
    for (let i = 0; i < cch; i++) {
      if (this.at >= this.data.length && this.part < this.parts.length - 1) {
        this.part++;
        this.at = 0;
        high = this.u8() & 0x01;
      }
      out += String.fromCharCode(high ? this.u16() : this.u8());
    }
    return out;
  }
  /** XLUnicodeRichExtendedString (in the SST). */
  richString(): string {
    const cch = this.u16();
    const flags = this.u8();
    const runs = flags & 0x08 ? this.u16() : 0;
    const ext = flags & 0x04 ? this.u32() : 0;
    const text = this.string(cch, flags);
    this.skip(runs * 4 + ext);
    return text;
  }
}

function unicodeString(data: Uint8Array, at: number, lengthBytes: 1 | 2): string {
  const cch = lengthBytes === 2 ? data[at]! | (data[at + 1]! << 8) : data[at]!;
  const flags = data[at + lengthBytes]!;
  return new Reader([data.subarray(at + lengthBytes + 1)]).string(cch, flags);
}

export function readXlsRows(bytes: Uint8Array): string[][] {
  const stream = workbookStream(bytes);
  const view = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
  const records: { type: number; data: Uint8Array; at: number }[] = [];
  for (let at = 0; at + 4 <= stream.length; ) {
    const type = view.getUint16(at, true);
    const length = view.getUint16(at + 2, true);
    records.push({ type, data: stream.subarray(at + 4, at + 4 + length), at });
    at += 4 + length;
  }
  if (!records.length || records[0]!.type !== 0x0809) throw damaged();
  const shared: string[] = [];
  let firstSheetAt: number | null = null;
  for (let i = 0; i < records.length; i++) {
    const r = records[i]!;
    if (r.type === 0x0085 && firstSheetAt === null) {
      const kind = r.data[5];
      if (kind === 0) firstSheetAt = new DataView(r.data.buffer, r.data.byteOffset).getUint32(0, true);
    } else if (r.type === 0x00fc) {
      const parts = [r.data];
      for (let j = i + 1; j < records.length && records[j]!.type === 0x003c; j++) parts.push(records[j]!.data);
      const reader = new Reader(parts);
      reader.u32();
      const unique = reader.u32();
      for (let n = 0; n < unique; n++) shared.push(reader.richString());
    } else if (r.type === 0x000a) break;
  }
  if (firstSheetAt === null) throw damaged();
  const rows: string[][] = [];
  const put = (row: number, col: number, text: string) => {
    while (rows.length <= row) rows.push([]);
    const cells = rows[row]!;
    while (cells.length < col) cells.push("");
    cells[col] = text;
  };
  let inSheet = false;
  let pendingFormula: { row: number; col: number } | null = null;
  for (const r of records) {
    if (!inSheet) {
      if (r.at === firstSheetAt) inSheet = true;
      continue;
    }
    const d = new DataView(r.data.buffer, r.data.byteOffset, r.data.byteLength);
    const row = r.data.length >= 4 ? d.getUint16(0, true) : 0;
    const col = r.data.length >= 4 ? d.getUint16(2, true) : 0;
    switch (r.type) {
      case 0x00fd:
        put(row, col, shared[d.getUint32(6, true)] ?? "");
        break;
      case 0x0203:
        put(row, col, numberText(d.getFloat64(6, true)));
        break;
      case 0x027e:
        put(row, col, numberText(rkNumber(d.getUint32(6, true))));
        break;
      case 0x00bd: {
        const last = d.getUint16(r.data.length - 2, true);
        for (let c = col, at = 4; c <= last; c++, at += 6) put(row, c, numberText(rkNumber(d.getUint32(at + 2, true))));
        break;
      }
      case 0x0204:
        put(row, col, unicodeString(r.data, 6, 2));
        break;
      case 0x0205:
        put(row, col, r.data[7] ? "" : r.data[6] ? "TRUE" : "FALSE");
        break;
      case 0x0006: {
        if (d.getUint16(12, true) === 0xffff) {
          const kind = r.data[6];
          if (kind === 0) pendingFormula = { row, col };
          else if (kind === 1) put(row, col, r.data[8] ? "TRUE" : "FALSE");
        } else put(row, col, numberText(d.getFloat64(6, true)));
        break;
      }
      case 0x0207:
        if (pendingFormula) {
          put(pendingFormula.row, pendingFormula.col, unicodeString(r.data, 0, 2));
          pendingFormula = null;
        }
        break;
      case 0x000a:
        return rows;
    }
  }
  return rows;
}
