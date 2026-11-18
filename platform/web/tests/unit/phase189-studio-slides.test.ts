import { describe, expect, it } from "vitest";
import type { StudioNode } from "@/lib/pages/types";
import { holds, shownSlide, slideParts, sliderOf, storiesSlider, storiesSliderOf } from "@/lib/studio/slides";

/**
 * 189 A slider's slides plain to find in Studio: the canvas shows the slide
 * holding what's selected, the inspector lists any slider's slides (and
 * what's on the open one) for whatever on it is selected, and anything on a
 * slide of the app's stories (a slider whose stories come from Dashboard ›
 * Stories) says so.
 */

const slide = (id: string): StudioNode => ({
  id,
  type: "photo_hero",
  image_url: `https://img.test/${id}.jpg`,
  children: [
    { id: `${id}-row`, type: "row", children: [{ id: `${id}-line`, type: "row", children: [] }, { id: `${id}-icon`, type: "icon", icon: "favorite", story_part: "icon" }] },
    { id: `${id}-kicker`, type: "text", text: "For love", story_part: "kicker" },
    { id: `${id}-title`, type: "text", text: "Say it with roses.", story_part: "title" },
    { id: `${id}-button`, type: "button", text: "Send flowers", story_part: "button" },
  ],
});

const stories: StudioNode = { id: "hero", type: "slider", stories_source: "dashboard", per_view: 1, children: ["s1", "s2", "s3", "s4", "s5"].map(slide) };
const designed: StudioNode = { id: "deals", type: "slider", per_view: 1, children: ["d1", "d2"].map(slide) };
const body: StudioNode = { id: "body", type: "column", children: [{ id: "stack", type: "stack", children: [stories] }, designed] };

describe("189 the slide shown while editing", () => {
  it("is the one holding the selection, else the first", () => {
    expect(shownSlide(stories, null)).toBe(0);
    expect(shownSlide(stories, "s3")).toBe(2);
    expect(shownSlide(stories, "s4-title")).toBe(3);
    expect(shownSlide(stories, "hero")).toBe(0);
    expect(shownSlide(stories, "elsewhere")).toBe(0);
    expect(holds(stories, "s5-button")).toBe(true);
    expect(holds(stories, "d1")).toBe(false);
  });
});

describe("189 the app's stories on a slide", () => {
  it("knows the slider, how many slides and which one, wherever on a slide the owner clicked", () => {
    expect(storiesSlider(stories)).toBe(true);
    expect(storiesSlider(designed)).toBe(false);
    expect(storiesSliderOf(body, "hero")).toMatchObject({ slider: { id: "hero" }, count: 5, index: null });
    expect(storiesSliderOf(body, "s2")).toMatchObject({ count: 5, index: 1 });
    expect(storiesSliderOf(body, "s5-title")).toMatchObject({ count: 5, index: 4 });
    expect(storiesSliderOf(body, "s1-button")).toMatchObject({ index: 0 });
  });

  it("is nothing for a slider designed in Studio, or outside any slider", () => {
    expect(storiesSliderOf(body, "d1-title")).toBeNull();
    expect(storiesSliderOf(body, "deals")).toBeNull();
    expect(storiesSliderOf(body, "stack")).toBeNull();
    expect(storiesSliderOf(body, null)).toBeNull();
    // Designed here instead: the owner's own slides, not the dashboard's.
    const own: StudioNode = { ...body, children: [{ ...stories, stories_source: "studio" }] };
    expect(storiesSliderOf(own, "s2")).toBeNull();
  });
});

describe("189 the inspector's list of a slider's slides", () => {
  it("finds the slider (stories or designed here) for the slider, a slide or anything on one", () => {
    expect(sliderOf(body, "hero")).toMatchObject({ slider: { id: "hero" }, parent: { id: "stack" }, index: null });
    expect(sliderOf(body, "s3")).toMatchObject({ slider: { id: "hero" }, index: 2 });
    expect(sliderOf(body, "s2-icon")).toMatchObject({ slider: { id: "hero" }, index: 1 });
    expect(sliderOf(body, "d2-title")).toMatchObject({ slider: { id: "deals" }, parent: { id: "body" }, index: 1 });
    expect(sliderOf(body, "stack")).toBeNull();
    expect(sliderOf(body, "body")).toBeNull();
    expect(sliderOf(body, undefined)).toBeNull();
  });

  it("is the innermost slider for a slider on a slide", () => {
    const inner: StudioNode = { id: "inner", type: "slider", children: [slide("i1"), slide("i2")] };
    const outer: StudioNode = { id: "outer", type: "slider", children: [{ ...slide("o1"), children: [inner] }, slide("o2")] };
    const page: StudioNode = { id: "page", type: "column", children: [outer] };
    expect(sliderOf(page, "i2-title")).toMatchObject({ slider: { id: "inner" }, index: 1 });
    // The inner slider itself selected: its own slides.
    expect(sliderOf(page, "inner")).toMatchObject({ slider: { id: "inner" }, index: null });
    expect(sliderOf(page, "o1")).toMatchObject({ slider: { id: "outer" }, index: 0 });
    expect(sliderOf(page, "o2-button")).toMatchObject({ slider: { id: "outer" }, index: 1 });
  });

  it("offers a slide's icons, words and buttons in order, not the rows holding them", () => {
    expect(slideParts(slide("s1")).map((n) => n.id)).toEqual(["s1-icon", "s1-kicker", "s1-title", "s1-button"]);
    expect(slideParts({ id: "bare", type: "photo_hero" })).toEqual([]);
  });
});
