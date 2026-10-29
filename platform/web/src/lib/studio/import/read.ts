import type { Languages } from "../../pages/types";
import { DESIGN_FILE_LIMITS, readDesignFile, type DesignFile, type DesignFileError, type DesignFilePicture } from "../design-file";
import { newNodeId } from "../elements";
import { screensToDesign, type ReadScreens } from "./design";
import { readFig } from "./fig";
import type { DesignFrame, DesignShape } from "./frame";
import { readPenpot, readPenpotJson } from "./penpot";
import { readSketch, type DesignRead } from "./sketch";
import { readSvg, type SvgVector } from "./svg";
import { openZip } from "./zip";

/**
 * 108.2 A file chosen in "Import a design", read into a design (pages,
 * pictures and fonts) whatever it was made with. Runs in the browser.
 * 108.3 SVG from any tool: one screen per file (several files at once).
 * 108.5 Figma's own file (`.fig`), on a best effort. 108.6 Sketch and Penpot.
 */

/** The files the import window takes, as they are listed to the owner. */
export const IMPORT_FORMATS = [".svg", ".fig", ".sketch", ".penpot", ".json", ".yallapp"] as const;

export type ImportError = DesignFileError | "format" | "mixed" | "fig";

export interface ImportRead {
  design: DesignFile;
  /** The file's name (or the first one's, and how many more), to show. */
  file: string;
  /** Elements left out to stay within what a page can hold. */
  cut: number;
  /** 108.4 Pictures that couldn't be brought (from Figma). */
  missing?: number;
}

/** Draws a drawing as a picture (the browser's canvas); null when it can't. */
export type DrawVector = (vector: SvgVector) => Promise<DesignFilePicture | null>;

export interface ImportFile {
  name: string;
  size: number;
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

/** Base64 of bytes, in the browser and in tests. */
function base64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

/** Screens read from a tool's file, their drawings drawn, made into a design. */
async function fromScreens(read: DesignRead, name: string, ctx: { languages: Languages; draw: DrawVector }): Promise<ImportRead> {
  const pictures = { ...read.pictures };
  for (const vector of read.vectors) {
    const picture = await ctx.draw(vector);
    if (picture) pictures[vector.key] = picture;
  }
  const { design, cut } = screensToDesign({ frames: read.frames, pictures }, baseName(name), ctx.languages, newNodeId);
  return { design, file: name, cut };
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

const baseName = (name: string) => name.replace(/\.[a-z0-9]+$/i, "");

/** What the files hold, or why they can't be read. */
export async function readImport(files: readonly ImportFile[], ctx: { languages: Languages; draw: DrawVector }): Promise<{ ok: true; read: ImportRead } | { ok: false; error: ImportError }> {
  if (!files.length) return { ok: false, error: "empty" };
  if (files.reduce((sum, f) => sum + f.size, 0) > DESIGN_FILE_LIMITS.bytes) return { ok: false, error: "too_big" };
  const extensions = new Set(files.map((f) => extensionOf(f.name)));
  const shown = files.length > 1 ? `${files[0]!.name} +${files.length - 1}` : files[0]!.name;
  if (extensions.size === 1 && extensions.has(".svg")) {
    const screens: ReadScreens = { frames: [], pictures: {} };
    for (const [i, file] of files.slice(0, DESIGN_FILE_LIMITS.pages).entries()) {
      const read = readSvg(await file.text(), baseName(file.name));
      if (!read) return { ok: false, error: "broken" };
      // Each file's pictures under their own keys.
      const own = (key: string) => `f${i}:${key}`;
      for (const [key, picture] of Object.entries(read.pictures)) screens.pictures[own(key)] = picture;
      for (const vector of read.vectors) {
        const picture = await ctx.draw(vector);
        if (picture) screens.pictures[own(vector.key)] = picture;
      }
      screens.frames.push(rekey(read.frame, own));
    }
    const { design, cut } = screensToDesign(screens, baseName(files[0]!.name), ctx.languages, newNodeId);
    return { ok: true, read: { design, file: shown, cut } };
  }
  if (files.length > 1) return { ok: false, error: "mixed" };
  const file = files[0]!;
  const extension = extensionOf(file.name);
  const screens = async (read: DesignRead | null): Promise<{ ok: true; read: ImportRead } | { ok: false; error: ImportError }> =>
    read && read.frames.length ? { ok: true, read: await fromScreens(read, file.name, ctx) } : { ok: false, error: read ? "empty" : "broken" };
  if (extension === ".fig") {
    const read = await readFig(new Uint8Array(await file.arrayBuffer()), base64);
    return read.ok ? screens(read.read) : { ok: false, error: "fig" };
  }
  if (extension === ".sketch" || extension === ".penpot") {
    const zip = openZip(new Uint8Array(await file.arrayBuffer()));
    if (!zip) return { ok: false, error: "broken" };
    return screens(extension === ".sketch" ? await readSketch(zip, base64) : await readPenpot(zip, base64));
  }
  if (extension === ".yallapp" || extension === ".json") {
    const text = await file.text();
    const read = readDesignFile(text);
    if (read.ok) return { ok: true, read: { design: read.file, file: file.name, cut: 0 } };
    // 108.6 A Penpot page's shapes as JSON.
    if (read.error === "not_ours" && extension === ".json") {
      let value: unknown = null;
      try {
        value = JSON.parse(text);
      } catch {
        return { ok: false, error: "format" };
      }
      const penpot = readPenpotJson(value);
      return penpot ? screens(penpot) : { ok: false, error: "format" };
    }
    return { ok: false, error: read.error };
  }
  return { ok: false, error: "format" };
}

/** The frame with its picture keys renamed. */
function rekey(frame: DesignFrame, to: (key: string) => string): DesignFrame {
  const walk = (s: DesignShape): DesignShape => ({ ...s, ...(s.picture && !/^https:\/\//.test(s.picture) ? { picture: to(s.picture) } : {}), ...(s.children ? { children: s.children.map(walk) } : {}) });
  return { ...frame, shapes: frame.shapes.map(walk) };
}
