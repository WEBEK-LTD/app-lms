import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { MemoryStore } from "@/lib/data/memory";
import { designById } from "@/lib/pages/designs";
import { loadLayout, saveDesignDraft, saveDraft, withKeptPages } from "@/lib/pages/layout";
import { NOW } from "./helpers";

/** 99.2 An app with pages of its own moves to another design: its look only, or everything with its own pages kept. */
describe("99.2 switching to another design", () => {
  async function storeApp() {
    const store = new MemoryStore();
    const app = { ...newApp("client-1", null, NOW, "store"), backend: "hosted" as const };
    await store.createApp(app);
    const fashion = designById("store-fashion")!;
    expect((await saveDesignDraft(store, app, fashion, NOW)).ok).toBe(true);
    // The owner's own page, in the side menu under their own icon.
    const draft = (await loadLayout(store, app, NOW)).draft;
    const story = { slug: "story", title: "Our story", show_title: true, updated_at: NOW.toISOString(), translations: { ar: { title: "قصتنا" } }, blocks: [{ id: "s", type: "text" as const, visibility: "everyone" as const, title: null, html: "<p>Since 1990.</p>" }] };
    const menu = [...(draft.menu ?? []), { id: "menu-story", label: "Our story", icon: "auto_stories", target: { type: "page" as const, page_slug: "story" } }];
    expect((await saveDraft(store, app, { ...draft, pages: [...draft.pages, story], menu }, NOW)).ok).toBe(true);
    return { store, app: (await store.getAppById(app.id))! };
  }

  it("takes only the look: the pages, tabs and menu stay, and so does the design the app started from", async () => {
    const { store, app } = await storeApp();
    const before = (await loadLayout(store, app, NOW)).draft;
    const grocery = designById("store-grocery")!;
    const saved = await saveDesignDraft(store, app, grocery, NOW, { secondary_color: "#123456" }, { mode: "look" });
    if (!saved.ok) throw new Error(saved.errors.join(" "));
    expect(saved.value.samples).toBeNull();
    const draft = saved.value.record.draft;
    expect(draft.pages).toEqual(before.pages);
    expect(draft.tabs).toEqual(before.tabs);
    expect(draft.menu).toEqual(before.menu);
    expect(draft.appearance).toMatchObject({ template: "classic", corners: "round", cards: "elevated", font: "Plus Jakarta Sans", secondary_color: "#123456" });
    expect((await store.getAppById(app.id))!.design).toBe("store-fashion");
  });

  it("takes everything, and keeps the owner's pages the design doesn't have in the side menu, as they had it", async () => {
    const { store, app } = await storeApp();
    const grocery = designById("store-grocery")!;
    const saved = await saveDesignDraft(store, app, grocery, NOW, {}, { mode: "all", keepPages: true });
    if (!saved.ok) throw new Error(saved.errors.join(" "));
    const draft = saved.value.record.draft;
    expect(draft.pages.map((p) => p.slug)).toEqual(["home", "offers", "about", "contact", "story"]);
    expect(draft.menu?.find((m) => m.target.type === "page" && m.target.page_slug === "story")).toMatchObject({ id: "menu-story", icon: "auto_stories" });
    expect((await store.getAppById(app.id))!.design).toBe("store-grocery");

    // Without keeping them, the design's pages only.
    const plain = await saveDesignDraft(store, app, grocery, NOW, {}, { mode: "all" });
    expect(plain.ok && plain.value.record.draft.pages.map((p) => p.slug)).toEqual(["home", "offers", "about", "contact"]);
  });

  it("puts a kept page without a menu entry under its title (in each language), and keeps no more pages than an app can have", () => {
    const design = { appearance: {}, languages: {}, tabs: [], pages: [{ slug: "home" }], menu: [{ id: "menu-a", target: { type: "page", page_slug: "a" } }] } as never;
    const page = (slug: string) => ({ slug, title: `Page ${slug}`, show_title: true, updated_at: "x", blocks: [], ...(slug === "a" ? { translations: { tr: { title: "Sayfa a" } } } : {}) });
    const kept = withKeptPages(design, { pages: [page("home"), page("a")] });
    expect(kept.pages.map((p) => p.slug)).toEqual(["home", "a"]);
    // The design's own entry for it stays.
    expect(kept.menu).toHaveLength(1);
    const fresh = withKeptPages({ ...(design as object), menu: [] } as never, { pages: [page("a")] });
    expect(fresh.menu).toEqual([{ id: "menu-a", label: "Page a", icon: "description", target: { type: "page", page_slug: "a" }, translations: { tr: { label: "Sayfa a" } } }]);
    const many = withKeptPages(design, { pages: Array.from({ length: 30 }, (_, i) => page(`p${i}`)) });
    expect(many.pages).toHaveLength(20);
  });
});
