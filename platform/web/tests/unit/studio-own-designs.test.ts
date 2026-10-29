import { describe, expect, it } from "vitest";
import type { BlobStore } from "@/lib/blobs";
import { MemoryStore } from "@/lib/data/memory";
import { writeDesignFile } from "@/lib/studio/design-file";
import { loadOwnDesign, OWN_DESIGN_LIMITS, removeOwnDesign, saveOwnDesign } from "@/lib/studio/own-designs";
import { NOW } from "./helpers";

function memoryBlobs(): BlobStore & { keys: () => string[] } {
  const files = new Map<string, { data: Buffer; contentType: string }>();
  return {
    put: async (key, data, contentType) => void files.set(key, { data, contentType }),
    get: async (key) => files.get(key) ?? null,
    delete: async (key) => void files.delete(key),
    keys: () => [...files.keys()],
  };
}

const design = (pictures: Record<string, { type: string; data: string }> = {}, image = "https://yallapp.test/api/v1/assets/a1") =>
  writeDesignFile({
    kind: "project",
    name: "Spring",
    made_at: "",
    languages: { default: "en", available: ["en"] },
    pages: [{ slug: "home", title: "Home", studio: { body: { id: "r", type: "column", children: [{ id: "i", type: "image", image_url: image }] } } }],
    pictures,
    fonts: [],
  });

describe("108.7 an account's own whole designs", () => {
  it("keeps one, opens it again and deletes it, only for its account", async () => {
    const deps = { store: new MemoryStore(), blobs: memoryBlobs(), now: NOW };
    const saved = await saveOwnDesign(deps, "c1", { name: "  My   spring ", source: "saved", text: design(), by: "owner@example.com" });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.design).toMatchObject({ name: "My spring", source: "saved", pages: 1 });
    expect(deps.blobs.keys()).toEqual([`studio-designs/c1/${saved.design.id}.json`]);
    expect(JSON.parse((await loadOwnDesign(deps, "c1", saved.design.id))!).name).toBe("My spring");
    // Another account can't open or delete it.
    expect(await loadOwnDesign(deps, "c2", saved.design.id)).toBeNull();
    expect(await removeOwnDesign(deps, "c2", saved.design.id)).toBe(false);
    expect(await removeOwnDesign(deps, "c1", saved.design.id)).toBe(true);
    expect(deps.blobs.keys()).toEqual([]);
    expect(await deps.store.listStudioDesigns("c1")).toEqual([]);
  });

  it("refuses what isn't a design, pictures inside, no name, and more than it keeps", async () => {
    const deps = { store: new MemoryStore(), blobs: memoryBlobs(), now: NOW };
    expect(await saveOwnDesign(deps, "c1", { name: "x", source: "saved", text: "{}", by: null })).toEqual({ ok: false, error: "not_ours" });
    expect(await saveOwnDesign(deps, "c1", { name: "x", source: "imported", text: design({ "picture:1": { type: "image/png", data: "AA==" } }, "picture:1"), by: null })).toEqual({ ok: false, error: "pictures_inside" });
    expect(await saveOwnDesign(deps, "c1", { name: " ", source: "saved", text: design(), by: null })).toEqual({ ok: false, error: "name" });
    for (let i = 0; i < OWN_DESIGN_LIMITS.designs; i += 1) await saveOwnDesign(deps, "c1", { name: `D${i}`, source: "saved", text: design(), by: null });
    expect(await saveOwnDesign(deps, "c1", { name: "one more", source: "saved", text: design(), by: null })).toEqual({ ok: false, error: "limit" });
  });
});
