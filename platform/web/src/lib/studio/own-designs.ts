import type { BlobStore } from "../blobs";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { StudioDesign } from "../data/types";
import { picturesIn, readDesignFile } from "./design-file";

/**
 * 108.7 An account's own whole designs for Studio, saved from a project or
 * kept from an import, offered with Yallapp's in the designs window. The
 * design file is kept in the file store (its pictures at their addresses,
 * already saved with the account), the list in the data store.
 */

export const OWN_DESIGN_LIMITS = {
  designs: 30,
  /** A design kept here has no pictures inside it: a few hundred KB at most. */
  bytes: 4 * 1024 * 1024,
} as const;

export type OwnDesignError = "not_ours" | "pictures_inside" | "too_big" | "limit" | "name";

export interface OwnDesignDeps {
  store: DataStore;
  blobs: BlobStore;
  now: Date;
}

export function ownDesignView(d: StudioDesign) {
  return { id: d.id, name: d.name, source: d.source, pages: d.pages };
}

export type OwnDesignView = ReturnType<typeof ownDesignView>;

export async function saveOwnDesign(deps: OwnDesignDeps, clientId: string, input: { name: string; source: StudioDesign["source"]; text: string; by: string | null }): Promise<{ ok: true; design: StudioDesign } | { ok: false; error: OwnDesignError }> {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name || name.length > 80) return { ok: false, error: "name" };
  if (input.text.length > OWN_DESIGN_LIMITS.bytes) return { ok: false, error: "too_big" };
  const read = readDesignFile(input.text);
  if (!read.ok) return { ok: false, error: "not_ours" };
  // Its pictures are saved with the account first: only their addresses are kept here.
  if (Object.keys(read.file.pictures).length || read.file.fonts.length) return { ok: false, error: "pictures_inside" };
  if (read.file.pages.some((p) => picturesIn(p.studio).some((url) => !/^https?:\/\//.test(url)))) return { ok: false, error: "pictures_inside" };
  if ((await deps.store.listStudioDesigns(clientId)).length >= OWN_DESIGN_LIMITS.designs) return { ok: false, error: "limit" };
  const id = newId();
  const blobKey = `studio-designs/${clientId}/${id}.json`;
  const data = Buffer.from(JSON.stringify({ ...read.file, name }), "utf8");
  await deps.blobs.put(blobKey, data, "application/json");
  const design: StudioDesign = { id, clientId, name, source: input.source, pages: read.file.pages.length || 1, blobKey, sizeBytes: data.length, createdAt: deps.now, createdBy: input.by };
  await deps.store.createStudioDesign(design);
  return { ok: true, design };
}

/** The design file's text, if the design is this account's. */
export async function loadOwnDesign(deps: Pick<OwnDesignDeps, "store" | "blobs">, clientId: string, id: string): Promise<string | null> {
  const design = await deps.store.getStudioDesign(clientId, id);
  if (!design) return null;
  const blob = await deps.blobs.get(design.blobKey);
  return blob ? blob.data.toString("utf8") : null;
}

export async function removeOwnDesign(deps: Pick<OwnDesignDeps, "store" | "blobs">, clientId: string, id: string): Promise<boolean> {
  const design = await deps.store.getStudioDesign(clientId, id);
  if (!design || !(await deps.store.deleteStudioDesign(clientId, id))) return false;
  await deps.blobs.delete(design.blobKey).catch(() => {});
  return true;
}
