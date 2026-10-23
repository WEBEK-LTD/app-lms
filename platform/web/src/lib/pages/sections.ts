import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, SavedSection } from "../data/types";
import { defaultLayout } from "./defaults";
import { appDefaults } from "./layout";
import { parseLayoutContent } from "./validate";

/**
 * 84.3 Saved sections: blocks the owner saves together from a page, to add
 * again to any page of the account's apps. Saved as checked for the app
 * they came from; added as copies with new IDs, without the blocks the
 * other app doesn't have (section-blocks.ts; the draft's own check does
 * the rest).
 */

export const SECTION_LIMITS = { maxSections: 30, maxBlocks: 10, nameChars: 60 } as const;

export type SaveSectionError = "name" | "blocks" | "too_many_blocks" | "limit" | "invalid";

export async function saveSection(
  store: DataStore,
  app: App,
  input: { name: unknown; blocks: unknown },
  by: string | null,
  now: Date,
): Promise<{ ok: true; section: SavedSection } | { ok: false; error: SaveSectionError; detail?: string }> {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > SECTION_LIMITS.nameChars) return { ok: false, error: "name" };
  const blocks = Array.isArray(input.blocks) ? input.blocks : [];
  if (blocks.length === 0) return { ok: false, error: "blocks" };
  if (blocks.length > SECTION_LIMITS.maxBlocks) return { ok: false, error: "too_many_blocks" };
  if ((await store.listSavedSections(app.clientId)).length >= SECTION_LIMITS.maxSections) return { ok: false, error: "limit" };
  // Checked as a page of this app: the same rules as publishing.
  const layout = defaultLayout(app, await appDefaults(store), now);
  const [home, ...rest] = layout.pages;
  const parsed = parseLayoutContent({ ...layout, pages: [{ ...home!, blocks }, ...rest] }, { app, now });
  if (!parsed.ok) return { ok: false, error: "invalid", detail: parsed.errors[0] };
  const section: SavedSection = { id: newId(), clientId: app.clientId, name, blocks: parsed.value.pages[0]!.blocks, createdAt: now, createdBy: by };
  await store.createSavedSection(section);
  return { ok: true, section };
}
