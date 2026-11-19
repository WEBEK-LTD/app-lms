import { beforeEach, describe, expect, it, vi } from "vitest";
import { DOCS } from "@/content/docs";
import { MemoryStore } from "@/lib/data/memory";
import { NOW } from "./helpers";

/**
 * 195 The documentation's menu and search read every article's texts. One
 * or two queries each (73 articles) held the site's one database connection
 * with more queries waiting than it takes ("Queue limit reached"), failing
 * the page and the session read beside it. Now one query for them all.
 */
const state = vi.hoisted(() => ({ store: null as unknown as MemoryStore, lists: 0, gets: 0 }));
vi.mock("@/lib/data", () => ({ getStore: async () => state.store }));

const { getSiteContent, getSiteContents } = await import("@/lib/content/get");
const { docsNavGroups } = await import("@/components/docs-shell");

beforeEach(() => {
  const store = new MemoryStore();
  state.lists = 0;
  state.gets = 0;
  const list = store.listSiteContent.bind(store);
  const get = store.getSiteContent.bind(store);
  store.listSiteContent = async () => ((state.lists += 1), list());
  store.getSiteContent = async (key: string) => ((state.gets += 1), get(key));
  state.store = store;
});

describe("195 the documentation reads its articles in one query", () => {
  it("gives each article what the one-page read gives, the team's edits and their translations included", async () => {
    const [first, second] = DOCS;
    await state.store.setSiteContent(first!.key, { title: "Edited title" }, "admin@yallapp.test", NOW);
    await state.store.setSiteContent(`${second!.key}.ar`, { title: "عنوان معدّل" }, "admin@yallapp.test", NOW);
    for (const lang of ["en", "ar", "tr"] as const) {
      const all = await getSiteContents(DOCS.map((d) => d.key), lang);
      expect(all).toHaveLength(DOCS.length);
      for (const [i, d] of DOCS.entries()) expect(all[i]).toEqual(await getSiteContent(d.key, lang));
    }
    expect((await getSiteContents([first!.key], "en"))[0]!.title).toBe("Edited title");
  });

  it("the menu of every article is one query, whatever the language", async () => {
    expect(DOCS.length).toBeGreaterThan(50);
    for (const lang of ["en", "ar", "tr"] as const) {
      state.lists = 0;
      state.gets = 0;
      const groups = await docsNavGroups(lang);
      expect(groups.flatMap((g) => g.links).length).toBeGreaterThanOrEqual(DOCS.length);
      expect(state.lists).toBe(1);
      expect(state.gets).toBe(0);
    }
  });

  it("with the database unreadable, the articles' own texts", async () => {
    state.store.listSiteContent = async () => {
      throw new Error("Queue limit reached.");
    };
    const all = await getSiteContents(DOCS.map((d) => d.key), "en");
    expect(all.every((t) => typeof t.title === "string" && t.title.length > 0)).toBe(true);
  });
});
