import { inflateRawSync } from "node:zlib";
import { SheetError } from "./table";

/** 115.8 The files in a ZIP (an .xlsx), stored or deflated; read on demand by name. */
export function readZip(bytes: Uint8Array): Map<string, () => Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65_535); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new SheetError("unreadable", "The Excel file couldn't be read. Save it again as .xlsx and try once more.");
  const entries = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const files = new Map<string, () => Uint8Array>();
  for (let n = 0; n < entries; n++) {
    if (at + 46 > bytes.length || view.getUint32(at, true) !== 0x02014b50) throw new SheetError("unreadable", "The Excel file is damaged.");
    const method = view.getUint16(at + 10, true);
    const compressed = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    files.set(name, () => {
      if (view.getUint32(local, true) !== 0x04034b50) throw new SheetError("unreadable", "The Excel file is damaged.");
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const data = bytes.subarray(start, start + compressed);
      if (method === 0) return data;
      if (method === 8) return new Uint8Array(inflateRawSync(data));
      throw new SheetError("unsupported", "The Excel file uses a compression this reader doesn't know. Save it again as .xlsx.");
    });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}
