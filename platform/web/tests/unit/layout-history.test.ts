import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { MemoryStore } from "@/lib/data/memory";
import { LAYOUT_VERSIONS_KEPT, layoutHistory, loadLayout, publishLayout, restoreLayoutVersion, saveDraft } from "@/lib/pages/layout";
import { NOW } from "./helpers";
import { layoutHistoryStoreSuite } from "./layout-history-store-suite";

/** 82.4 Publish history and going back to an earlier version. */

const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

describe("82.4 publishing keeps a history to go back to", () => {
  it("each publish is kept; one of them becomes the draft, and what's published stays until the next publish", async () => {
    const store = new MemoryStore();
    const app = { ...newApp("client-1", null, NOW, "store"), backend: "hosted" as const, connector: { kind: "catalog" as const } };
    await store.createApp(app);
    const draft = (await loadLayout(store, app, NOW)).draft;
    const named = (label: string) => ({ ...draft, tabs: draft.tabs.map((t, i) => (i === 0 ? { ...t, label } : t)) });

    expect((await publishLayout(store, app, named("Spring"), "owner@shop.test", later(1))).ok).toBe(true);
    expect((await publishLayout(store, app, named("Summer"), "manager@shop.test", later(2))).ok).toBe(true);
    expect(await layoutHistory(store, app.id)).toEqual([
      { number: 2, at: later(2).toISOString(), by: "manager@shop.test" },
      { number: 1, at: later(1).toISOString(), by: "owner@shop.test" },
    ]);

    // The owner keeps editing, then goes back to Spring as the draft.
    await saveDraft(store, app, named("Autumn"), later(3));
    const restored = await restoreLayoutVersion(store, app, 1, later(4));
    expect(restored).toMatchObject({ ok: true });
    const record = (await store.getAppLayout(app.id))!;
    expect(record.draft.tabs[0]!.label).toBe("Spring");
    expect(record.draft).not.toHaveProperty("version");
    // The app still has Summer until the next publish.
    expect(record.published!.tabs[0]!.label).toBe("Summer");
    expect(await restoreLayoutVersion(store, app, 7, later(5))).toBeNull();
  });

  it(`keeps the last ${LAYOUT_VERSIONS_KEPT}`, async () => {
    const store = new MemoryStore();
    const app = { ...newApp("client-1", null, NOW, "store"), backend: "hosted" as const, connector: { kind: "catalog" as const } };
    await store.createApp(app);
    for (let n = 1; n <= LAYOUT_VERSIONS_KEPT + 2; n++) await publishLayout(store, app, undefined, "owner@shop.test", later(n));
    const history = await layoutHistory(store, app.id);
    expect(history).toHaveLength(LAYOUT_VERSIONS_KEPT);
    expect(history[0]!.number).toBe(LAYOUT_VERSIONS_KEPT + 2);
    expect(history.at(-1)!.number).toBe(3);
  });
});

describe("82.4 publish history on the memory store", () => {
  const store = new MemoryStore();
  layoutHistoryStoreSuite(() => store);
});
