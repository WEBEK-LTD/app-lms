import { describe, expect, it } from "vitest";
import type { LayoutContent, LayoutPage, LayoutTab } from "@/lib/pages/types";
import { readDesignFile, writeDesignFile } from "@/lib/studio/design-file";
import { applyWholeDesign } from "@/lib/studio/designs";

/** 124.11 A project's own file brings the whole app: its pages where they belong, its tabs and bar, its look and its screens' looks. */

const languages = { default: "en" as const, available: ["en" as const] };
const page = (slug: string, text: string, opts: { screen?: string; link?: string } = {}): LayoutPage => ({
  slug,
  title: slug.toUpperCase(),
  show_title: false,
  updated_at: "2026-01-01T00:00:00.000Z",
  blocks: [],
  studio: {
    ...(opts.screen ? { screen: opts.screen as never } : {}),
    body: { id: `${slug}-root`, type: "column", children: [{ id: `${slug}-t`, type: "text", text }, ...(opts.link ? [{ id: `${slug}-b`, type: "button" as const, text: "Go", action: { type: "page" as const, page_slug: opts.link } }] : [])] },
  },
});
const tabs: LayoutTab[] = [
  { id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" } },
  { id: "promo", label: "Offers", icon: "sell", target: { type: "page", page_slug: "offers" } },
  { id: "learning", label: "My courses", icon: "play_circle", target: { type: "screen", screen: "my_courses" } },
  { id: "call", label: "Call", icon: "videocam", target: { type: "url", url: "https://call.example.com/join/1", open_in: "in_app" } },
];
const look = {
  font: "Alexandria",
  arabic_font: "Alexandria",
  primary_color: "#002F5D",
  secondary_color: "#D50313",
  tabs,
  tab_bar: { design: "glass" as const, radius: 26, margin: 16, avatar: true },
  screens: { looks: { my_courses: "premium" as const }, course_card: { style: "premium" as const, radius: 18, hide: [] } },
};

describe("124.11 a project's own file", () => {
  it("keeps the tab bar and the screens' looks when written and read back", () => {
    const text = writeDesignFile({ kind: "project", name: "Bedo Pro", made_at: "", languages, pages: [{ slug: "home", title: "Home", studio: page("home", "Hi").studio! }], look, pictures: {}, fonts: [] });
    const read = readDesignFile(text);
    expect(read.ok && read.file.look).toEqual(look);
  });

  it("puts each page where it belongs, adds the rest, and takes its tabs, bar and look", () => {
    // The owner deleted every page but the home; one page of their own is left.
    const current = {
      appearance: { font: "Cairo", secondary_color: "#111111" } as never,
      languages,
      tabs: [{ id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" } }],
      pages: [page("home", "Old home"), page("mine", "Mine stays"), page("courses-old", "Old catalog", { screen: "courses" })],
    } as unknown as LayoutContent;
    // As designPages makes them: new addresses (designSlugs are the file's own).
    const fitted = [page("home-2", "Welcome", { link: "offers-2" }), page("offers-2", "Half price", { link: "home-2" }), page("explore", "", { screen: "courses" }), page("my-courses", "", { screen: "my_courses" })];
    const next = applyWholeDesign(current, fitted, look, { mode: "project", openSlug: "home", pageIndex: 0, keep: false, now: "now", designSlugs: ["home", "offers", "courses", "learning"] });
    expect(next.pages.map((p) => `${p.slug}${p.studio?.screen ? `:${p.studio.screen}` : ""}`)).toEqual(["home", "mine", "courses-old:courses", "offers-2", "my-courses:my_courses"]);
    expect(next.pages[0]!.studio!.body.children![0]!.text).toBe("Welcome");
    expect(next.pages[0]!.title).toBe("HOME-2");
    // The project's own page stays; the catalog takes the file's.
    expect(next.pages[1]!.studio!.body.children![0]!.text).toBe("Mine stays");
    expect(next.pages[2]!.studio!.body.children![0]!.text).toBe("");
    // Links follow the pages to where they are now.
    expect(next.pages[0]!.studio!.body.children![1]!.action).toEqual({ type: "page", page_slug: "offers-2" });
    expect(next.pages[3]!.studio!.body.children![1]!.action).toEqual({ type: "page", page_slug: "home" });
    // The file's tabs, opening its pages where they are.
    expect(next.tabs.map((t) => (t.target.type === "page" ? `${t.id}>${t.target.page_slug}` : t.id))).toEqual(["home>home", "promo>offers-2", "learning", "call"]);
    expect(next.tab_bar).toEqual(look.tab_bar);
    expect(next.appearance).toMatchObject({ font_family: "Alexandria", arabic_font: "Alexandria", secondary_color: "#D50313" });
  });

  it("drops a tab whose page the file doesn't bring", () => {
    const current = { appearance: {} as never, languages, tabs: [], pages: [page("home", "Old")] } as unknown as LayoutContent;
    const next = applyWholeDesign(current, [page("home-2", "New")], look, { mode: "project", openSlug: "home", pageIndex: 0, keep: false, now: "now", designSlugs: ["home"] });
    expect(next.tabs.map((t) => t.id)).toEqual(["home", "learning", "call"]);
  });

  it("keeps the project's texts when asked", () => {
    const current = { appearance: {} as never, languages, tabs: [], pages: [page("home", "My words")] } as unknown as LayoutContent;
    const next = applyWholeDesign(current, [page("home-2", "Theirs")], look, { mode: "project", openSlug: "home", pageIndex: 0, keep: true, now: "now", designSlugs: ["home"] });
    expect(next.pages[0]!.studio!.body.children![0]!.text).toBe("My words");
  });
});
