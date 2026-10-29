import type { Languages } from "../../pages/types";
import { DESIGN_FILE_LIMITS, readDesignFile, type DesignFile, type DesignFileError, type DesignFilePicture } from "../design-file";
import { newNodeId } from "../elements";
import { screensToDesign, type ReadScreens } from "./design";
import type { DesignFrame, DesignShape } from "./frame";
import { readSvg, type SvgVector } from "./svg";

/**
 * 108.2 A file chosen in "Import a design", read into a design (pages,
 * pictures and fonts) whatever it was made with. Runs in the browser.
 * 108.3 SVG from any tool: one screen per file (several files at once).
 */

/** The files the import window takes, as they are listed to the owner. */
export const IMPORT_FORMATS = [".svg", ".yallapp", ".json"] as const;

export type ImportError = DesignFileError | "format" | "mixed";

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
  if (extension === ".yallapp" || extension === ".json") {
    const read = readDesignFile(await file.text());
    if (!read.ok) return { ok: false, error: read.error === "not_ours" ? (extension === ".json" ? "format" : "not_ours") : read.error };
    return { ok: true, read: { design: read.file, file: file.name, cut: 0 } };
  }
  return { ok: false, error: "format" };
}

/** The frame with its picture keys renamed. */
function rekey(frame: DesignFrame, to: (key: string) => string): DesignFrame {
  const walk = (s: DesignShape): DesignShape => ({ ...s, ...(s.picture && !/^https:\/\//.test(s.picture) ? { picture: to(s.picture) } : {}), ...(s.children ? { children: s.children.map(walk) } : {}) });
  return { ...frame, shapes: frame.shapes.map(walk) };
}
