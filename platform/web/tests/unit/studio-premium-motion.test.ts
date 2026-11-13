import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StudioView } from "@/components/studio/view";
import { newApp } from "@/lib/app/setup";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import type { StudioNode, StudioPage } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";
import { ELEMENTS, newNode } from "@/lib/studio/elements";

/**
 * 129.1–129.8 Studio's premium motion and media: each element (or look of
 * one) as the Elements panel's Premium group makes it, as the servers keep
 * it (strict and bounded, old pages unchanged) and as the canvas draws it.
 */

const NOW = new Date("2026-11-13T10:00:00Z");
const app = { ...newApp("c", null, NOW, "lms", null), section: "studio" as const };
const parse = (children: unknown[]) => parseStudioPage({ body: { id: "root", type: "column", children } }, app, { default: "en", available: ["en", "ar"] });
const WORDS = { price: "Price", addPicture: "Add a picture", addVideo: "Add a video", send: "Send", search: "Search", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds", copy: "Copy" };
const pickable = { items: {}, categories: {} } as unknown as Pickable;
const draw = (children: StudioNode[], options: { dark?: boolean; lang?: "en" | "ar" } = {}) =>
  renderToStaticMarkup(createElement(StudioView, { page: { body: { id: "root", type: "column", children } } as StudioPage, lang: options.lang ?? "en", defaultLang: "en", dark: options.dark ?? false, look: { name: "App", logoUrl: null, brand: "#1F7A4D", font: "Cairo", tabs: [], activeTab: null }, pickable, words: WORDS }));
let n = 0;
const make = (type: StudioNode["type"], preset?: string) => newNode(type, { source: null, brand: "#1F7A4D", text: (w) => w, preset, newId: () => `p${++n}` });
const ok = (children: unknown[]) => {
  const parsed = parse(children);
  expect(parsed.ok ? [] : parsed.errors).toEqual([]);
  return parsed.ok ? parsed.value.body.children! : [];
};
const errors = (children: unknown[]) => {
  const parsed = parse(children);
  return parsed.ok ? "" : parsed.errors.join(" ");
};

describe("129.1 the slider's premium looks", () => {
  it("are offered in the Premium group as looks of the slider", () => {
    const premium = ELEMENTS.filter((e) => e.group === "premium" && e.type === "slider").map((e) => e.preset);
    expect(premium).toEqual(["hero_slider", "card_carousel"]);
  });

  it("starts a hero slider as photos under a scrim with a headline and a button, lines filling, zooming slowly", () => {
    const hero = make("slider", "hero_slider");
    expect(hero).toMatchObject({ type: "slider", autoplay: true, indicator: "progress", ken_burns: true, per_view: 1 });
    expect(hero.children!.map((c) => c.type)).toEqual(["photo_hero", "photo_hero", "photo_hero"]);
    expect(hero.children![0]!.scrim).toBeTruthy();
    expect(hero.children![0]!.children!.map((c) => c.type)).toEqual(["text", "text", "button"]);
    const [kept] = ok([hero]);
    expect(kept).toMatchObject({ ken_burns: true, indicator: "progress", autoplay: true });
  });

  it("starts a card carousel peeking at the next card, its dots in a frosted pill", () => {
    const cards = make("slider", "card_carousel");
    expect(cards).toMatchObject({ per_view: 1.2, indicator: "pill", gap: 12 });
    expect(cards.children![0]!.radius).toBe(24);
    expect(ok([cards])[0]).toMatchObject({ per_view: 1.2, indicator: "pill" });
  });

  it("keeps a plain slider as it was, and refuses an unknown indicator", () => {
    const [plain] = ok([{ id: "s", type: "slider", children: [] }]);
    expect(plain).toEqual({ id: "s", type: "slider", children: [] });
    expect(errors([{ id: "s", type: "slider", indicator: "stars", children: [] }])).toContain("choose how the slider shows where it is.");
    // The block's slider keeps the block's indicators.
    expect(ok([{ id: "s", type: "slider", ken_burns: "yes", children: [] }])[0]!.ken_burns).toBeUndefined();
  });

  it("draws the pill over the slides and the zoom on the canvas", () => {
    const html = draw([make("slider", "card_carousel"), make("slider", "hero_slider")]);
    expect(html).toContain('data-studio-indicator="pill"');
    expect(html).toContain('data-studio-indicator="progress"');
    expect(html).toContain("data-studio-ken-burns");
    expect(html).toContain("@keyframes studio-ken-burns");
    expect(html).toContain("prefers-reduced-motion");
  });
});
