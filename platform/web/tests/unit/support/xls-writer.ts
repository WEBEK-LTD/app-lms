/** Test only: a small real .xls (BIFF8 in a compound file), so the reader is checked against the format's own bytes. */

type Cell = string | number;

const ENDOFCHAIN = 0xfffffffe;
const FREE = 0xffffffff;

function record(type: number, data: number[] | Uint8Array): Uint8Array {
  const body = data instanceof Uint8Array ? data : Uint8Array.from(data);
  const out = new Uint8Array(4 + body.length);
  const v = new DataView(out.buffer);
  v.setUint16(0, type, true);
  v.setUint16(2, body.length, true);
  out.set(body, 4);
  return out;
}

const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
const f64 = (n: number) => {
  const b = new DataView(new ArrayBuffer(8));
  b.setFloat64(0, n, true);
  return [...new Uint8Array(b.buffer)];
};
const wide = (s: string) => /[^\x00-\xff]/.test(s);
function chars(s: string, utf16: boolean): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (utf16) out.push(...u16(c));
    else out.push(c);
  }
  return out;
}

/** The SST split into records of at most `max` bytes, cutting inside strings the way Excel does (a flags byte opens each CONTINUE). */
function sstRecords(strings: string[], max: number): Uint8Array[] {
  const out: Uint8Array[] = [];
  let cur: number[] = [...u32(strings.length), ...u32(strings.length)];
  let type = 0x00fc;
  const flush = () => {
    out.push(record(type, cur));
    cur = [];
    type = 0x003c;
  };
  for (const s of strings) {
    const utf16 = wide(s);
    const header = [...u16(s.length), utf16 ? 1 : 0];
    if (cur.length + header.length + (utf16 ? 2 : 1) > max) flush();
    cur.push(...header);
    for (const ch of s) {
      const bytes = chars(ch, utf16);
      if (cur.length + bytes.length > max) {
        flush();
        cur.push(utf16 ? 1 : 0);
      }
      cur.push(...bytes);
    }
  }
  if (cur.length) flush();
  return out;
}

function rk(n: number): number | null {
  if (Number.isInteger(n) && n >= -(2 ** 29) && n < 2 ** 29) return ((n << 2) | 0x02) >>> 0;
  return null;
}

/** A workbook whose first sheet holds `rows`; strings in the SST, whole numbers as RK/MULRK, others as NUMBER. */
export function writeXls(rows: Cell[][], options: { sstMax?: number; labels?: boolean } = {}): Uint8Array {
  const strings: string[] = [];
  const index = new Map<string, number>();
  for (const row of rows) for (const c of row) if (typeof c === "string" && !index.has(c)) index.set(c, strings.push(c) - 1);
  const bofGlobals = record(0x0809, [...u16(0x0600), ...u16(0x0005), ...u16(0x0dbb), ...u16(0x07cc), ...u32(0), ...u32(0x0006)]);
  const name = "Sheet1";
  const boundsheetBody = (offset: number) => [...u32(offset), 0, 0, name.length, 0, ...chars(name, false)];
  const sst = sstRecords(strings, options.sstMax ?? 8224);
  const eof = record(0x000a, []);
  const globalsLength = bofGlobals.length + record(0x0085, boundsheetBody(0)).length + sst.reduce((n, r) => n + r.length, 0) + eof.length;
  const parts: Uint8Array[] = [bofGlobals, record(0x0085, boundsheetBody(globalsLength)), ...sst, eof];
  parts.push(record(0x0809, [...u16(0x0600), ...u16(0x0010), ...u16(0x0dbb), ...u16(0x07cc), ...u32(0), ...u32(0x0006)]));
  rows.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      const cell = row[c]!;
      if (typeof cell === "string") {
        if (options.labels) {
          const utf16 = wide(cell);
          parts.push(record(0x0204, [...u16(r), ...u16(c), ...u16(15), ...u16(cell.length), utf16 ? 1 : 0, ...chars(cell, utf16)]));
        } else parts.push(record(0x00fd, [...u16(r), ...u16(c), ...u16(15), ...u32(index.get(cell)!)]));
        c++;
        continue;
      }
      // A run of whole numbers: MULRK.
      let end = c;
      while (end + 1 < row.length && typeof row[end + 1] === "number" && rk(row[end + 1] as number) !== null && rk(cell) !== null) end++;
      if (end > c) {
        const body = [...u16(r), ...u16(c)];
        for (let k = c; k <= end; k++) body.push(...u16(15), ...u32(rk(row[k] as number)!));
        body.push(...u16(end));
        parts.push(record(0x00bd, body));
        c = end + 1;
        continue;
      }
      const asRk = rk(cell);
      if (asRk !== null) parts.push(record(0x027e, [...u16(r), ...u16(c), ...u16(15), ...u32(asRk)]));
      else parts.push(record(0x0203, [...u16(r), ...u16(c), ...u16(15), ...f64(cell)]));
      c++;
    }
  });
  parts.push(eof);
  const stream = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    stream.set(p, at);
    at += p.length;
  }
  return compoundFile(stream);
}

function compoundFile(stream: Uint8Array): Uint8Array {
  const SS = 512;
  const sectors: Uint8Array[] = [];
  const fat: number[] = [];
  const alloc = (data: Uint8Array) => {
    const start = sectors.length;
    const n = Math.max(1, Math.ceil(data.length / SS));
    for (let i = 0; i < n; i++) {
      const s = new Uint8Array(SS);
      s.set(data.subarray(i * SS, (i + 1) * SS));
      sectors.push(s);
      fat.push(i === n - 1 ? ENDOFCHAIN : start + i + 1);
    }
    return start;
  };
  sectors.push(new Uint8Array(SS));
  fat.push(0xfffffffd);
  const dirIndex = sectors.length;
  sectors.push(new Uint8Array(SS));
  fat.push(ENDOFCHAIN);
  const mini = stream.length < 4096;
  let rootStart = ENDOFCHAIN;
  let rootSize = 0;
  let bookStart: number;
  let miniFatStart = ENDOFCHAIN;
  let miniFatCount = 0;
  if (mini) {
    const count = Math.ceil(stream.length / 64);
    const miniFat = new Uint8Array(SS).fill(0xff);
    const mv = new DataView(miniFat.buffer);
    for (let i = 0; i < count; i++) mv.setUint32(i * 4, i === count - 1 ? ENDOFCHAIN : i + 1, true);
    miniFatStart = alloc(miniFat);
    miniFatCount = 1;
    const padded = new Uint8Array(count * 64);
    padded.set(stream);
    rootStart = alloc(padded);
    rootSize = padded.length;
    bookStart = 0;
  } else bookStart = alloc(stream);
  const dir = sectors[dirIndex]!;
  const dv = new DataView(dir.buffer);
  const entry = (i: number, name: string, type: number, start: number, size: number, child: number) => {
    const at = i * 128;
    for (let k = 0; k < name.length; k++) dv.setUint16(at + k * 2, name.charCodeAt(k), true);
    dv.setUint16(at + 0x40, (name.length + 1) * 2, true);
    dir[at + 0x42] = type;
    dir[at + 0x43] = 1;
    dv.setUint32(at + 0x44, FREE, true);
    dv.setUint32(at + 0x48, FREE, true);
    dv.setUint32(at + 0x4c, child, true);
    dv.setUint32(at + 0x74, start, true);
    dv.setUint32(at + 0x78, size, true);
  };
  entry(0, "Root Entry", 5, rootStart, rootSize, 1);
  entry(1, "Workbook", 2, bookStart, stream.length, FREE);
  if (fat.length > 128) throw new Error("test writer: too big");
  const fatSector = sectors[0]!;
  const fv = new DataView(fatSector.buffer);
  for (let i = 0; i < 128; i++) fv.setUint32(i * 4, fat[i] ?? FREE, true);
  const header = new Uint8Array(512);
  const hv = new DataView(header.buffer);
  header.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  hv.setUint16(0x18, 0x3e, true);
  hv.setUint16(0x1a, 3, true);
  hv.setUint16(0x1c, 0xfffe, true);
  hv.setUint16(0x1e, 9, true);
  hv.setUint16(0x20, 6, true);
  hv.setUint32(0x2c, 1, true);
  hv.setUint32(0x30, dirIndex, true);
  hv.setUint32(0x38, 4096, true);
  hv.setUint32(0x3c, miniFatStart, true);
  hv.setUint32(0x40, miniFatCount, true);
  hv.setUint32(0x44, ENDOFCHAIN, true);
  hv.setUint32(0x48, 0, true);
  for (let i = 0; i < 109; i++) hv.setUint32(0x4c + i * 4, i === 0 ? 0 : FREE, true);
  const out = new Uint8Array(512 + sectors.length * SS);
  out.set(header);
  sectors.forEach((s, i) => out.set(s, 512 + i * SS));
  return out;
}
