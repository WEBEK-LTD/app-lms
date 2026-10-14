import { describe, expect, it } from "vitest";
import { readApiList } from "@/lib/app/api-check";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { ownApiBase, pickableContent } from "@/lib/hosted/pages/pickable";

const NOW = new Date("2026-10-14T10:00:00Z");

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const site = {
  "/courses": { items: [{ id: 12, title: "UX Design Fundamentals" }, { id: 15, title: "Arabic for Beginners" }] },
  "/categories": { items: [{ id: 3, name: "Design" }] },
};

function fakeSite(calls: string[]) {
  return {
    fetcher: async (url: string) => {
      calls.push(url);
      const path = new URL(url).pathname.replace("/wp-json/yallapp/v1", "");
      const body = site[path as keyof typeof site];
      return body ? json(body) : json({ code: "not_found" }, 404);
    },
    resolve: async () => ["93.184.216.34"],
  };
}

describe("the page editor reads a WordPress site's own entries", () => {
  it("knows where a WordPress site and an own API answer", () => {
    expect(ownApiBase({ backend: "wordpress", siteUrl: "https://academy.test/", apiBaseUrl: null })).toBe("https://academy.test/wp-json/yallapp/v1");
    expect(ownApiBase({ backend: "custom_api", siteUrl: null, apiBaseUrl: "https://api.shop.test/v1" })).toBe("https://api.shop.test/v1");
    expect(ownApiBase({ backend: "hosted", siteUrl: null, apiBaseUrl: null })).toBeNull();
    expect(ownApiBase({ backend: "wordpress", siteUrl: null, apiBaseUrl: null })).toBeNull();
  });

  it("lists the courses and categories from the plugin", async () => {
    const calls: string[] = [];
    const site = fakeSite(calls);
    const app = { backend: "wordpress", siteUrl: "https://academy.test", apiBaseUrl: null, appType: "lms" } as unknown as App;
    const pickable = await pickableContent(
      app,
      { store: new MemoryStore(), key: Buffer.alloc(32), assetUrl: (id) => id, platformUrl: "https://yallapp.test", readList: (base, path) => readApiList(base, path, site) },
      NOW,
    );
    expect(pickable.items.courses).toEqual([
      { id: "12", title: "UX Design Fundamentals" },
      { id: "15", title: "Arabic for Beginners" },
    ]);
    expect(pickable.categories.courses).toEqual([{ id: "3", name: "Design" }]);
    expect(calls.every((u) => u.startsWith("https://academy.test/wp-json/yallapp/v1/"))).toBe(true);
  });

  it("gives an empty list, never an error, when the site can't be read", async () => {
    const calls: string[] = [];
    const site = fakeSite(calls);
    expect(await readApiList("https://academy.test/wp-json/yallapp/v1", "/store/products", site)).toEqual([]);
    expect(await readApiList("http://academy.test/wp-json/yallapp/v1", "/courses", site)).toEqual([]);
    expect(await readApiList("https://academy.test/wp-json/yallapp/v1", "/courses", { ...site, resolve: async () => ["10.0.0.5"] })).toEqual([]);
    expect(await readApiList("https://academy.test/wp-json/yallapp/v1", "/courses", { ...site, fetcher: async () => Promise.reject(new Error("timeout")) })).toEqual([]);
  });
});
