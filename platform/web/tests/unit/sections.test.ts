import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { MemoryStore } from "@/lib/data/memory";
import { sectionBlocks } from "@/lib/pages/section-blocks";
import { saveSection, SECTION_LIMITS } from "@/lib/pages/sections";
import { blockTypesFor } from "@/lib/pages/sources";
import type { LayoutBlock } from "@/lib/pages/types";
import { NOW } from "./helpers";
import { sectionsStoreSuite } from "./sections-store-suite";

/** 84.3 Saved sections: blocks saved together from a page, for any page of the account's apps. */
describe("84.3 saved sections", () => {
  sectionsStoreSuite(() => new MemoryStore());

  const text = (id: string, html = "<p>Hello</p>"): LayoutBlock => ({ id, type: "text", visibility: "everyone", title: null, html });
  const academyItems: LayoutBlock = {
    id: "courses",
    type: "items",
    visibility: "everyone",
    title: "Courses",
    source: "courses",
    layout: "carousel",
    see_all: null,
    query: { category_id: null, featured: false, sort: "newest", limit: 10, ids: [] },
  };

  it("saves valid blocks of a page under a name, checked like a publish", async () => {
    const store = new MemoryStore();
    const app = { ...newApp("client-1", null, NOW, "lms"), backend: "hosted" as const };
    const saved = await saveSection(store, app, { name: "  Welcome  ", blocks: [text("a"), academyItems] }, "owner@school.test", NOW);
    expect(saved).toMatchObject({ ok: true, section: { clientId: "client-1", name: "Welcome", createdBy: "owner@school.test" } });
    expect((await store.listSavedSections("client-1")).map((s) => s.blocks.map((b) => b.id))).toEqual([["a", "courses"]]);

    expect(await saveSection(store, app, { name: "", blocks: [text("a")] }, null, NOW)).toEqual({ ok: false, error: "name" });
    expect(await saveSection(store, app, { name: "x".repeat(61), blocks: [text("a")] }, null, NOW)).toEqual({ ok: false, error: "name" });
    expect(await saveSection(store, app, { name: "Empty", blocks: [] }, null, NOW)).toEqual({ ok: false, error: "blocks" });
    expect(await saveSection(store, app, { name: "Big", blocks: Array.from({ length: SECTION_LIMITS.maxBlocks + 1 }, (_, i) => text(`b${i}`)) }, null, NOW)).toEqual({ ok: false, error: "too_many_blocks" });
    const invalid = await saveSection(store, app, { name: "Broken", blocks: [text("a", "")] }, null, NOW);
    expect(invalid).toMatchObject({ ok: false, error: "invalid" });
    expect(String((invalid as { detail?: string }).detail)).toContain("add some text.");
  });

  it("keeps at most 30 sections an account", async () => {
    const store = new MemoryStore();
    const app = { ...newApp("client-2", null, NOW, "store"), backend: "hosted" as const };
    for (let i = 0; i < SECTION_LIMITS.maxSections; i++) expect((await saveSection(store, app, { name: `S${i}`, blocks: [text(`a${i}`)] }, null, NOW)).ok).toBe(true);
    expect(await saveSection(store, app, { name: "One more", blocks: [text("z")] }, null, NOW)).toEqual({ ok: false, error: "limit" });
  });

  it("adds copies with new IDs, without the blocks another app doesn't have", () => {
    const store = { ...newApp("client-3", null, NOW, "store"), backend: "hosted" as const };
    const { blocks, left } = sectionBlocks({ blocks: [text("a"), academyItems, { ...academyItems, id: "cl", type: "continue_learning" }] }, blockTypesFor(store));
    expect(left).toBe(1);
    expect(blocks.map((b) => b.type)).toEqual(["text", "items"]);
    expect(blocks.every((b) => b.id !== "a" && b.id !== "courses")).toBe(true);
    expect(new Set(blocks.map((b) => b.id)).size).toBe(2);
  });
});
