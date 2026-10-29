import type { DesignFileFont, DesignFilePicture } from "@/lib/studio/design-file";
import { DESIGN_FILE_LIMITS } from "@/lib/studio/design-file";

/**
 * 108.2 What the editor does in the browser with design files: reads the
 * pictures and fonts a design uses into the file, and gives the file to
 * download. No server code here.
 */

/** An own font of the project, with the addresses of its files. */
export interface OwnFontFiles {
  family: string;
  previewUrl: string;
  files: { weight: number | null; kind: "ttf" | "otf"; url: string }[];
}

const PICTURE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function toBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

export function fromBase64(data: string): Uint8Array<ArrayBuffer> {
  const text = atob(data);
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i);
  return out;
}

/** A picture the design uses, read into the file; null when it can't be (another site that doesn't allow it): its address stays. */
export async function readPicture(url: string): Promise<DesignFilePicture | null> {
  try {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!PICTURE_TYPES.includes(blob.type) || blob.size > DESIGN_FILE_LIMITS.pictureBytes) return null;
    return { type: blob.type, data: toBase64(new Uint8Array(await blob.arrayBuffer())) };
  } catch {
    return null;
  }
}

export async function readFont(font: OwnFontFiles): Promise<DesignFileFont | null> {
  const files: DesignFileFont["files"] = [];
  for (const file of font.files) {
    try {
      const response = await fetch(file.url, { credentials: "same-origin" });
      if (!response.ok) continue;
      files.push({ weight: file.weight, kind: file.kind, data: toBase64(new Uint8Array(await response.arrayBuffer())) });
    } catch {
      // Left out: the design shows the app's font for it.
    }
  }
  return files.length ? { family: font.family, files } : null;
}

/** The file given to the browser to save. */
export function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** A name for the file from a title: letters, digits and dashes. */
export function fileName(title: string, extension: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "design"}${extension}`;
}

/** "2.4 MB" */
export function sizeText(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Whether a font can be used in the look: a free font (asked of the catalog). */
export async function isFreeFont(family: string): Promise<boolean> {
  const found = await fetch(`/api/v1/fonts?${new URLSearchParams({ q: family, limit: "5" })}`)
    .then((r) => (r.ok ? (r.json() as Promise<{ fonts: { family: string }[] }>) : { fonts: [] }))
    .catch(() => ({ fonts: [] }));
  return found.fonts.some((f) => f.family.toLowerCase() === family.toLowerCase());
}
