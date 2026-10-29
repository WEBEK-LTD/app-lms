/**
 * 108.5 A small ZIP reader for the design files that are ZIP archives
 * (Figma's `.fig`, `.sketch`, `.penpot`): the list of entries from the
 * central directory, and an entry's bytes, stored or deflated (inflated by
 * the platform's DecompressionStream, in the browser and in Node alike).
 */

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  /** Where its local header starts. */
  offset: number;
}

export interface Zip {
  entries: Map<string, ZipEntry>;
  read: (name: string) => Promise<Uint8Array | null>;
  text: (name: string) => Promise<string | null>;
}

/** The most an entry may grow to once inflated. */
const MAX_ENTRY_BYTES = 200 * 1024 * 1024;

export function isZip(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

async function inflateRaw(data: Uint8Array, limit: number): Promise<Uint8Array> {
  const stream = new Blob([data as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new Error("too big");
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.byteLength;
  }
  return out;
}

/** The archive's entries, or null when it isn't a ZIP file this can read. */
export function openZip(bytes: Uint8Array): Zip | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // The end of central directory record, within the last 64 KB.
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) return null;
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const entries = new Map<string, ZipEntry>();
  for (let i = 0; i < count; i += 1) {
    if (at + 46 > bytes.length || view.getUint32(at, true) !== 0x02014b50) return null;
    const method = view.getUint16(at + 10, true);
    const compressedSize = view.getUint32(at + 20, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const offset = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    if (!name.endsWith("/")) entries.set(name, { name, method, compressedSize, size, offset });
    at += 46 + nameLength + extraLength + commentLength;
  }
  const read = async (name: string): Promise<Uint8Array | null> => {
    const entry = entries.get(name);
    if (!entry || entry.offset + 30 > bytes.length || view.getUint32(entry.offset, true) !== 0x04034b50) return null;
    const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true);
    const data = bytes.subarray(start, start + entry.compressedSize);
    try {
      if (entry.method === 0) return data;
      if (entry.method === 8) return await inflateRaw(data, Math.min(MAX_ENTRY_BYTES, Math.max(entry.size, 1) * 2 + 1024));
    } catch {
      return null;
    }
    return null;
  };
  return {
    entries,
    read,
    text: async (name) => {
      const data = await read(name);
      return data ? decoder.decode(data) : null;
    },
  };
}
