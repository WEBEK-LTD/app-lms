import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { APP_TYPES } from "@/lib/app/kinds";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { loadLayout, publishLayout, saveDraftKeepingIncomplete } from "@/lib/pages/layout";
import { newBlock, samplePictures } from "@/lib/pages/model";
import { parkedBlocks, withParked } from "@/lib/pages/parked";
import { blockTypesFor, itemSourcesFor, screenOptionsFor } from "@/lib/pages/sources";
import type { BlockType } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import { NOW, setupClient } from "./helpers";

/** The blocks that need the owner's own content to show: a video, a web page, a map's place, profiles and contact details. */
const OWN_CONTENT: BlockType[] = ["video", "embed", "map", "social", "contact"];

describe("1.1 new blocks start with sample content; the draft always saves", () => {
  const pictures = samplePictures("https://yallapp.test/");

  it("starts every block the app can add with content the app shows, except the ones that need the owner's own", () => {
    const failing = new Set<string>();
    for (const appType of APP_TYPES) {
      const app = newApp("c", "https://site.test", NOW, appType);
      const screens = screenOptionsFor(app);
      for (const type of blockTypesFor(app)) {
        const block = newBlock(type, itemSourcesFor(app), screens, pictures);
        const ready = defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW);
        const draft = { ...ready, pages: ready.pages.map((p, i) => (i === 0 ? { ...p, blocks: [block] } : p)) };
        const parsed = parseLayoutContent(draft, { app, now: NOW, ownFonts: [] });
        if (!parsed.ok) failing.add(`${type}: ${parsed.errors.join(" ")}`);
      }
    }
    expect([...failing].map((f) => f.split(":")[0]).sort()).toEqual([...OWN_CONTENT].sort());
    // Without the pictures (and for the ones above), an empty block to fill in, as before.
    expect(newBlock("banner", ["courses"])).toMatchObject({ type: "banner", image_url: "", heading: "" });
    expect(newBlock("video", ["courses"], [], pictures)).toMatchObject({ type: "video", url: "" });
    expect(newBlock("slider", ["courses"], [], pictures).slides?.[0]?.image_url).toBe("https://yallapp.test/design-pictures/ocean-waves.jpg");
  });

  it("saves the draft without the blocks still to fill in, says which they are, and publishes only when they're done", async () => {
    const { store, client } = await setupClient();
    const app = { ...newApp(client.id, "https://academy.test", NOW, "lms"), websiteDoneAt: NOW };
    await store.createApp(app);
    const draft = (await loadLayout(store, app, NOW)).draft;
    const home = draft.pages[0]!;
    const empty = { ...newBlock("banner", ["courses"]), id: "b-empty" };
    const sample = { ...newBlock("text", ["courses"], [], pictures), id: "b-sample" };
    const input = { ...draft, pages: [{ ...home, blocks: [...home.blocks, sample, empty] }, ...draft.pages.slice(1)] };

    const saved = await saveDraftKeepingIncomplete(store, app, input, NOW);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.incomplete).toEqual([{ page: home.slug, id: "b-empty", errors: [expect.stringContaining("Banner")] }]);
    const stored = (await loadLayout(store, app, NOW)).draft.pages[0]!.blocks.map((b) => b.id);
    expect(stored).toContain("b-sample");
    expect(stored).not.toContain("b-empty");

    // Another problem than a block's: nothing is saved, as before.
    const broken = await saveDraftKeepingIncomplete(store, app, { ...input, languages: { default: "xx", available: ["xx"] } }, NOW);
    expect(broken.ok).toBe(false);

    // Publishing checks every block.
    const published = await publishLayout(store, app, input, "owner@academy.test", NOW);
    expect(published.ok).toBe(false);
    if (published.ok) return;
    expect(published.blocks?.map((b) => b.id)).toEqual(["b-empty"]);

    // The editor keeps the block in the browser and puts it back where it was.
    const parked = parkedBlocks(input, saved.incomplete);
    expect(parked).toEqual([{ page: home.slug, after: "b-sample", block: empty }]);
    const back = withParked(saved.value.draft, JSON.parse(JSON.stringify(parked)));
    expect(back?.pages[0]!.blocks.map((b) => b.id)).toEqual(input.pages[0]!.blocks.map((b) => b.id));
    expect(withParked(back!, parked)).toBeNull();
    expect(withParked(saved.value.draft, [{ page: "gone", after: null, block: empty }])).toBeNull();
    expect(withParked(saved.value.draft, "not a list")).toBeNull();
  });
});

