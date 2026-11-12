import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { en as studioEn } from "@/i18n/dashboard/studio";
import { StudioView } from "@/components/studio/view";
import { fontsOfPage } from "@/components/studio/fonts";
import type { StudioNode, StudioPage } from "@/lib/pages/types";
import { TEMPLATES, type SectionWord } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";
import { sampleEntries } from "@/lib/studio/sample-entries";
import { NOW } from "./helpers";

/**
 * 124.6 Studio's canvas lays a page out as the app does (mobile
 * studio_page.dart): an element that hugs across its column sits at its
 * start (the premium academy's "Browse courses" pill, not a full-width
 * bar); on a layer, an element is as tall as what it holds unless it fills
 * a later layer's height (a course's badge, not a stripe down the cover);
 * a card's text bound to what the entry hasn't leaves no empty pill; and
 * the page names the fonts it is drawn in, for the canvas to load.
 */

const WORDS = { price: "Price", addPicture: "Add a picture", addVideo: "Add a video", send: "Send", search: "Search", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds", copy: "Copy" };
const LOOK = { name: "Nour Academy", logoUrl: null, brand: "#1D2B4F", font: "Alexandria", tabs: [], activeTab: null };

function draw(page: StudioPage): string {
  return renderToStaticMarkup(createElement(StudioView, { page, lang: "en", defaultLang: "en", dark: false, look: LOOK, pickable: { items: {}, categories: {}, samples: sampleEntries(NOW) }, words: WORDS }));
}

/** An element's style on the canvas, by property (`align-self`). */
function styleOf(html: string, id: string): Record<string, string> {
  const style = new RegExp(`<div style="([^"]*)" data-studio-node="${id}"`).exec(html)?.[1] ?? "";
  return Object.fromEntries(
    style
      .split(";")
      .filter(Boolean)
      .map((rule) => [rule.slice(0, rule.indexOf(":")), rule.slice(rule.indexOf(":") + 1)]),
  );
}

const academyHome = (): StudioPage => {
  let n = 0;
  return TEMPLATES.find((t) => t.id === "academy_premium")!.make({ brand: "#1D2B4F", source: "courses", w: (word: SectionWord) => String(studioEn[`w_${word}`]), newId: () => `n${++n}`, lang: "en", picture: (f) => `/design-pictures/${f}` });
};

describe("124.6 the canvas lays a page out as the app", () => {
  it("draws the banner's button hugging its words at the start, on its gold, at the banner's foot", () => {
    const page = academyHome();
    const nodes = allNodes(page);
    const button = nodes.find((x) => x.type === "button")!;
    const column = nodes.find((x) => x.type === "column" && x.children?.includes(button))!;
    const root = draw(page);
    expect(styleOf(root, button.id)["align-self"]).toBe("flex-start");
    expect(styleOf(root, button.id).background).toContain("linear-gradient");
    // The banner's words fill its height, so they sit at its foot (its column is the banner's height).
    expect(column.height).toBe(206);
    expect(styleOf(root, column.id)["justify-content"]).toBe("flex-end");
  });

  it("draws a layer's later element as tall as what it holds, a filling one over the whole layer", () => {
    const badgeRow: StudioNode = { id: "row", type: "row", padding: { top: 12, end: 12, bottom: 12, start: 12 }, children: [{ id: "badge", type: "text", text: "New" }] };
    const cover: StudioNode = { id: "cover", type: "stack", height: 112, children: [{ id: "pic", type: "image", width: "fill", height: 112 }, badgeRow, { id: "shade", type: "column", height: "fill", children: [] }] };
    const root = draw({ body: { id: "body", type: "column", children: [cover] } });
    expect(styleOf(root, "row")["align-self"]).toBe("start");
    expect(styleOf(root, "row")["justify-self"]).toBe("stretch");
    expect(styleOf(root, "shade")["align-self"]).toBe("stretch");
    // On a layer aligned to its end, at its end.
    const end = draw({ body: { id: "body", type: "column", children: [{ ...cover, cross: "end" }] } });
    expect(styleOf(end, "row")["align-self"]).toBe("end");
  });

  it("leaves out a card's text bound to what the entry hasn't (a course without a badge)", () => {
    const page = academyHome();
    const html = draw(page);
    const badge = allNodes(page).find((x) => x.bind === "badge")!;
    // The samples have no badge: no gold pill drawn for it, the titles there.
    expect(html).not.toContain(`data-studio-node="${badge.id}"`);
    expect(html).toContain("UX Design Fundamentals");
    // A title of one line at most is cut off there.
    expect(html).toContain("display:-webkit-box;-webkit-box-orient:vertical;white-space:pre-wrap;-webkit-line-clamp:1");
  });

  it("124.7 draws a school's news as cards of words: the date chip, the title and its lines, no picture tile", () => {
    let n = 0;
    const page = TEMPLATES.find((t) => t.id === "school")!.make({ brand: "#1F4E79", source: "school_news", w: (word: SectionWord) => String(studioEn[`w_${word}`]), newId: () => `n${++n}`, lang: "en", picture: (f) => `/design-pictures/${f}` });
    const news = allNodes(page).find((x) => x.type === "items")!;
    const school = { items: { school_news: [{ id: "1", title: "Parents' evening on Thursday", subtitle: "Teachers will meet parents in the classrooms.", badge: "2026-11-11", imageUrl: null }] }, categories: {} };
    const html = renderToStaticMarkup(createElement(StudioView, { page, lang: "en", defaultLang: "en", dark: false, look: { ...LOOK, brand: "#1F4E79" }, pickable: school, words: WORDS }));
    for (const words of ["What&#x27;s new", "Parents&#x27; evening on Thursday", "Teachers will meet parents in the classrooms.", "2026-11-11"]) expect(html).toContain(words);
    expect(news.card).toBeTruthy();
    expect(allNodes({ body: news.card! }).some((x) => x.type === "image" || x.bind === "image")).toBe(false);
  });

  it("names the fonts the page is drawn in: the look's and each element's", () => {
    expect(fontsOfPage(academyHome().body, "DM Sans")).toEqual(["DM Sans", "Alexandria"]);
    expect(fontsOfPage(null, null)).toEqual([]);
  });
});
