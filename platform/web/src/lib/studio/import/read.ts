import { DESIGN_FILE_LIMITS, readDesignFile, type DesignFile, type DesignFileError } from "../design-file";

/**
 * 108.2 A file chosen in "Import a design", read into a design (pages,
 * pictures and fonts) whatever it was made with. Runs in the browser.
 */

/** The files the import window takes, as they are listed to the owner. */
export const IMPORT_FORMATS = [".yallapp", ".json"] as const;

export type ImportError = DesignFileError | "format";

export interface ImportRead {
  design: DesignFile;
  /** The file's name, to show. */
  file: string;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

/** What the file holds, or why it can't be read. */
export async function readImport(file: { name: string; size: number; text: () => Promise<string> }): Promise<{ ok: true; read: ImportRead } | { ok: false; error: ImportError }> {
  if (file.size > DESIGN_FILE_LIMITS.bytes) return { ok: false, error: "too_big" };
  const extension = extensionOf(file.name);
  if (extension === ".yallapp" || extension === ".json") {
    const read = readDesignFile(await file.text());
    if (!read.ok) return { ok: false, error: read.error === "not_ours" ? (extension === ".json" ? "format" : "not_ours") : read.error };
    return { ok: true, read: { design: read.file, file: file.name } };
  }
  return { ok: false, error: "format" };
}
