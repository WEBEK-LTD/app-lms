/**
 * 115 A ZIP of product photos read in the browser (the panel's bulk photos):
 * the pictures in it, each up to `maxEach` bytes, inflated with the
 * browser's own DecompressionStream so a large ZIP never has to reach the
 * server in one request. Other files, folders and macOS extras are left out.
 */

export const ZIP_PHOTO_NAME = /\.(jpe?g|png|webp)$/i;

export async function photosInZip(bytes: Uint8Array, maxEach: number, maxFiles = 5000): Promise<{ files: { name: string; data: Uint8Array }[]; skipped: string[] }> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65_535); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("This ZIP can't be read.");
  const entries = Math.min(view.getUint16(end + 10, true), maxFiles);
  let at = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const files: { name: string; data: Uint8Array }[] = [];
  const skipped: string[] = [];
  for (let n = 0; n < entries; n++) {
    if (at + 46 > bytes.length || view.getUint32(at, true) !== 0x02014b50) throw new Error("This ZIP is damaged.");
    const method = view.getUint16(at + 10, true);
    const compressed = view.getUint32(at + 20, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extraLength + commentLength;
    const base = name.split("/").pop() ?? "";
    if (!base || base.startsWith(".") || name.startsWith("__MACOSX/") || !ZIP_PHOTO_NAME.test(base)) continue;
    if (size > maxEach || (method !== 0 && method !== 8) || local + 30 > bytes.length || view.getUint32(local, true) !== 0x04034b50) {
      skipped.push(base);
      continue;
    }
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const raw = bytes.subarray(start, start + compressed);
    const data = method === 0 ? raw : await inflate(raw, maxEach);
    if (!data) skipped.push(base);
    else files.push({ name: base, data });
  }
  return { files, skipped };
}

/** Deflated bytes inflated, or null past `max` (a ZIP that lied about its size). */
async function inflate(raw: Uint8Array, max: number): Promise<Uint8Array | null> {
  const stream = new Blob([raw as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) {
        await reader.cancel();
        return null;
      }
      parts.push(value);
    }
  } catch {
    return null;
  }
  const out = new Uint8Array(size);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

/** Files split into batches under `maxBytes` and `maxFiles` each (one request each). */
export function photoBatches<T extends { data: { byteLength: number } }>(files: T[], maxBytes: number, maxFiles: number): T[][] {
  const batches: T[][] = [];
  let current: T[] = [];
  let bytes = 0;
  for (const f of files) {
    if (current.length && (bytes + f.data.byteLength > maxBytes || current.length >= maxFiles)) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(f);
    bytes += f.data.byteLength;
  }
  if (current.length) batches.push(current);
  return batches;
}
