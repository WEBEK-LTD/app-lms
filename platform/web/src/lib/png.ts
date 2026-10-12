/**
 * Reads what we need from a PNG header without decoding the image: size and
 * whether it can contain transparency (alpha channel or a tRNS chunk).
 */
export interface PngInfo {
  width: number;
  height: number;
  colorType: number;
  hasTransparency: boolean;
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function readPngInfo(data: Buffer): PngInfo | null {
  if (data.length < 33 || !data.subarray(0, 8).equals(SIGNATURE)) return null;
  if (data.toString("ascii", 12, 16) !== "IHDR") return null;
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  const colorType = data.readUInt8(25);
  // Colour types 4 (grey + alpha) and 6 (RGBA) carry an alpha channel.
  let hasTransparency = colorType === 4 || colorType === 6;
  let offset = 8;
  while (!hasTransparency && offset + 8 <= data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString("ascii", offset + 4, offset + 8);
    if (type === "tRNS") hasTransparency = true;
    if (type === "IDAT" || type === "IEND") break;
    offset += 12 + length;
  }
  return { width, height, colorType, hasTransparency };
}

export function isSvg(data: Buffer): boolean {
  const head = data.subarray(0, 1024).toString("utf8").replace(/^﻿/, "").trimStart();
  return /^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head);
}
