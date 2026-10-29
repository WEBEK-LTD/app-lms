import { describe, expect, it } from "vitest";
import type { LayoutPage, StudioPage } from "@/lib/pages/types";
import { designPages, designSection, fontsIn, inLanguages, picturesIn, readDesignFile, writeDesignFile, type DesignFile } from "@/lib/studio/design-file";

const pic = "https://yallapp.test/api/v1/assets/a1";
const home: StudioPage = {
  header: { type: "logo_actions", logo_url: pic },
  body: {
    id: "root",
    type: "column",
    children: [
      { id: "t", type: "text", text: "Welcome", translations: { ar: { text: "أهلًا" }, tr: { text: "Hoş geldin" } }, font: { family: "Lale Display" } },
      { id: "i", type: "image", image_url: pic },
      { id: "b", type: "column", image_background_url: "https://cdn.example.com/x.jpg", overlay: { color: "#000000", opacity: 0.3 }, children: [] },
      { id: "go", type: "button", text: "Menu", action: { type: "page", page_slug: "menu" } },
      { id: "away", type: "button", text: "Elsewhere", action: { type: "page", page_slug: "gone" } },
      { id: "l", type: "items", source: "courses", query: { limit: 4, category_id: "c1", featured: false, sort: "newest", ids: ["9"] } },
    ],
  },
};
const menu: StudioPage = { body: { id: "root", type: "column", children: [{ id: "m", type: "text", text: "Menu" }] } };

const design = (): DesignFile =>
  JSON.parse(
    writeDesignFile({
      kind: "project",
      name: "Lale",
      made_at: "2026-10-29T10:00:00.000Z",
      languages: { default: "en", available: ["en", "ar", "tr"] },
      pages: [
        { slug: "home", title: "Home", translations: { ar: { title: "الرئيسية" } } as never, studio: home },
        { slug: "menu", title: "Menu", studio: menu },
      ],
      look: { font: "Lale Display", primary_color: "#7A2E1D" },
      pictures: { [pic]: { type: "image/png", data: "iVBORw0KGgo=" } },
      fonts: [{ family: "Lale Display", files: [{ weight: 400, kind: "ttf", data: "AAEAAA==" }] }],
    }),
  ) as DesignFile;

let n = 0;
const fit = {
  sources: ["products"] as const,
  categorySources: [] as const,
  screens: [],
  newId: () => `n${(n += 1)}`,
  pages: [{ slug: "home" }, { slug: "menu" }] as LayoutPage[],
  languages: { default: "ar" as const, available: ["ar" as const, "en" as const] },
  pictures: new Map([
    [pic, "https://yallapp.test/api/v1/assets/new1"],
    ["https://cdn.example.com/x.jpg", "https://cdn.example.com/x.jpg"],
  ]),
  now: "2026-10-29T12:00:00.000Z",
};

describe("108.2 Yallapp's own design file", () => {
  it("lists the pictures and fonts a design needs", () => {
    expect(picturesIn(home).sort()).toEqual(["https://cdn.example.com/x.jpg", pic]);
    expect(fontsIn(home)).toEqual(["Lale Display"]);
  });

  it("reads back what it writes, and refuses what isn't one", () => {
    const text = JSON.stringify(design());
    const read = readDesignFile(text);
    expect(read.ok && read.file.pages.map((p) => p.slug)).toEqual(["home", "menu"]);
    expect(read.ok && read.file.fonts[0]!.family).toBe("Lale Display");
    expect(readDesignFile("{}")).toEqual({ ok: false, error: "not_ours" });
    expect(readDesignFile("not json")).toEqual({ ok: false, error: "not_ours" });
    expect(readDesignFile(JSON.stringify({ ...design(), version: 99 }))).toEqual({ ok: false, error: "too_new" });
    expect(readDesignFile(JSON.stringify({ ...design(), pages: [] }))).toEqual({ ok: false, error: "empty" });
    // A picture that isn't a picture is left out.
    const odd = readDesignFile(JSON.stringify({ ...design(), pictures: { x: { type: "text/html", data: "PGI+" } } }));
    expect(odd.ok && odd.file.pictures).toEqual({});
  });

  it("makes the pages fit the project: their own addresses, links between them, pictures, languages", () => {
    n = 0;
    const pages = designPages(design(), fit);
    expect(pages.map((p) => p.slug)).toEqual(["home-2", "menu-2"]);
    expect(pages[0]!.title).toBe("الرئيسية");
    expect(pages[0]!.translations).toEqual({ en: { title: "Home" } });
    const kids = pages[0]!.studio!.body.children!;
    // The main language's text is the project's; translations only for its languages.
    expect(kids[0]).toMatchObject({ text: "أهلًا", translations: { en: { text: "Welcome" } } });
    expect(kids[0]!.translations).not.toHaveProperty("tr");
    expect(kids[1]!.image_url).toBe("https://yallapp.test/api/v1/assets/new1");
    expect(kids[2]!.image_background_url).toBe("https://cdn.example.com/x.jpg");
    expect(pages[0]!.studio!.header!.logo_url).toBe("https://yallapp.test/api/v1/assets/new1");
    // A link to the file's other page follows it; one to a page neither has goes.
    expect(kids[3]!.action).toEqual({ type: "page", page_slug: "menu-2" });
    expect(kids[4]!.action).toBeUndefined();
    // A list of what this project hasn't shows its own.
    expect(kids[5]).toMatchObject({ source: "products", query: { category_id: null, ids: [] } });
    expect(kids.every((k) => k.id.startsWith("n"))).toBe(true);
  });

  it("gives a section with a picture it hasn't a place for a new picture", () => {
    const section = designSection({ ...design(), kind: "section", section: home.body.children![1] }, { ...fit, pictures: new Map() });
    expect(section).toMatchObject({ type: "image", image_url: null });
    const bg = designSection({ ...design(), kind: "section", section: home.body.children![2] }, { ...fit, pictures: new Map() });
    expect(bg).not.toHaveProperty("image_background_url");
    expect(bg).not.toHaveProperty("overlay");
  });

  it("keeps texts as they are when the languages are the same", () => {
    const same = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };
    expect(inLanguages(home.body.children![0]!, same, same)).toEqual(home.body.children![0]);
  });
});
