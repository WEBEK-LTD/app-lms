import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { MemoryStore } from "@/lib/data/memory";
import { DESIGNS } from "@/lib/pages/designs";
import { designCatalog, designsForApp, findDesign } from "@/lib/pages/designs/catalog";
import { addDesignFromApp, deleteTeamDesign, editTeamDesign, setBuiltInDesignHidden, TEAM_DESIGN_LIMITS } from "@/lib/pages/designs/team";
import { saveDesignDraft, saveDraft, loadLayout } from "@/lib/pages/layout";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { NOW } from "./helpers";

/** 84.4 The team adds and edits designs in the admin. */
describe("84.4 the team's designs", () => {
  beforeEach(() => clearPlatformSettingsCache());

  async function storeApp() {
    const store = new MemoryStore();
    const app = { ...newApp("client-1", null, NOW, "store"), backend: "hosted" as const };
    await store.createApp(app);
    return { store, app };
  }

  it("makes a design from an app's draft, for the app's kind, and owners can apply it", async () => {
    const { store, app } = await storeApp();
    const draft = (await loadLayout(store, app, NOW)).draft;
    // The team builds it in Pages & look: a second page and a hand-picked list.
    const items = draft.pages[0]!.blocks.find((b) => b.type === "items");
    const pages = [
      { ...draft.pages[0]!, blocks: draft.pages[0]!.blocks.map((b) => (b === items ? { ...b, query: { ...b.query!, ids: ["42"] } } : b)) },
      { slug: "story", title: "Our story", show_title: true, updated_at: NOW.toISOString(), blocks: [{ id: "s", type: "text" as const, visibility: "everyone" as const, title: null, html: "<p>Since 1990.</p>" }] },
    ];
    expect((await saveDraft(store, app, { ...draft, appearance: { ...draft.appearance, template: "bold", secondary_color: "#22AA55" }, pages }, NOW)).ok).toBe(true);

    const added = await addDesignFromApp(store, app, { name: "Market stall", description: "Bold colours and a story page." }, "team@yallapp.test", NOW);
    if (!added.ok) throw new Error(added.error);
    expect(added.design).toMatchObject({ kind: "store", name: "Market stall", look: { template: "bold", secondary_color: "#22AA55" } });
    expect(added.design.id).toMatch(/^team-/);
    // The app's own picks don't travel.
    expect(added.design.pages[0]!.blocks.find((b) => b.type === "items")?.query?.ids).toEqual([]);

    const forStores = await designsForApp(store, { appType: "store", vertical: null });
    expect(forStores.at(-1)!.id).toBe(added.design.id);
    expect(await designsForApp(store, { appType: "lms", vertical: null })).not.toContainEqual(expect.objectContaining({ id: added.design.id }));
    // It gets the company pages and colours like the built-in ones, and applies like them.
    const found = (await findDesign(store, added.design.id))!;
    expect(found.pages.map((p) => p.slug)).toEqual(["home", "story", "about", "contact"]);
    const other = { ...newApp("client-2", null, NOW, "store"), backend: "hosted" as const };
    await store.createApp(other);
    const applied = await saveDesignDraft(store, other, found, NOW);
    expect(applied.ok).toBe(true);
  });

  it("checks the name, the line and the draft, and keeps at most 60", async () => {
    const { store, app } = await storeApp();
    expect(await addDesignFromApp(store, app, { name: "", description: "x" }, "t", NOW)).toEqual({ ok: false, error: "name" });
    expect(await addDesignFromApp(store, app, { name: "A", description: "x".repeat(111) }, "t", NOW)).toEqual({ ok: false, error: "description" });
    expect(await addDesignFromApp(store, null, { name: "A", description: "B" }, "t", NOW)).toEqual({ ok: false, error: "app" });
    for (let i = 0; i < TEAM_DESIGN_LIMITS.max; i++) expect((await addDesignFromApp(store, app, { name: `D${i}`, description: "B" }, "t", NOW)).ok).toBe(true);
    expect(await addDesignFromApp(store, app, { name: "One more", description: "B" }, "t", NOW)).toEqual({ ok: false, error: "limit" });
  });

  it("renames, deletes and hides", async () => {
    const { store, app } = await storeApp();
    const added = await addDesignFromApp(store, app, { name: "Stall", description: "One line." }, "t", NOW);
    if (!added.ok) throw new Error(added.error);
    expect(await editTeamDesign(store, added.design.id, { name: "Market", description: "Another line." }, "t", NOW)).toEqual({ ok: true });
    expect((await findDesign(store, added.design.id))!.name).toBe("Market");
    expect(await editTeamDesign(store, "team-nope", { name: "X", description: "Y" }, "t", NOW)).toEqual({ ok: false, error: "not_found" });

    const builtIn = DESIGNS.find((d) => d.kind === "store")!;
    expect(await setBuiltInDesignHidden(store, builtIn.id, true, "t", NOW)).toBe(true);
    expect((await designCatalog(store)).some((d) => d.id === builtIn.id)).toBe(false);
    expect(await findDesign(store, builtIn.id)).toBeNull();
    expect(await setBuiltInDesignHidden(store, builtIn.id, false, "t", NOW)).toBe(true);
    expect(await findDesign(store, builtIn.id)).not.toBeNull();
    // Only built-in designs can be hidden.
    expect(await setBuiltInDesignHidden(store, added.design.id, true, "t", NOW)).toBe(false);

    expect(await deleteTeamDesign(store, added.design.id, "t", NOW)).toBe(true);
    expect(await findDesign(store, added.design.id)).toBeNull();
    expect(await deleteTeamDesign(store, added.design.id, "t", NOW)).toBe(false);
  });
});
