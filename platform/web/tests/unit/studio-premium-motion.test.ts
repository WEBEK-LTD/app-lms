import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StudioView } from "@/components/studio/view";
import { newApp } from "@/lib/app/setup";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import type { StudioNode, StudioPage } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";
import { ELEMENTS, newNode } from "@/lib/studio/elements";
import { handleHosted, type HostedResult } from "@/lib/hosted/service";
import { LogSender } from "@/lib/hosted/otp-sender";
import { publishLayout } from "@/lib/pages/layout";
import { expectContract } from "./contract";
import { setupClient } from "./helpers";

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

/** One of each premium element, as the hosted API serves it ("129 premium elements on the hosted API"). */
const PREMIUM_PAGE: unknown[] = [
  { id: "st", type: "stories", slides: [{ image_url: "https://cdn.example.com/a.jpg", heading: "New", translations: { ar: { heading: "جديد" } } }] },
  { id: "vid", type: "video_hero", video_url: "https://cdn.example.com/loop.mp4", image_url: "https://cdn.example.com/poster.jpg", autoplay: true, glass: true, height: 400, scrim: { color: "#000000", from: 0.2, to: 0.8 }, children: [{ id: "vt", type: "text", text: "In motion", translations: { ar: { text: "بالحركة" } } }] },
  { id: "par", type: "parallax_banner", image_url: "https://cdn.example.com/photo.jpg", parallax: { speed: 0.3 }, children: [{ id: "pt", type: "text", text: "Crafted" }] },
  { id: "gal", type: "gallery", gallery: { layout: "bento", captions: true }, images: [{ image_url: "https://cdn.example.com/1.jpg", caption: "Garden", translations: { ar: { caption: "الحديقة" } } }] },
  { id: "ba", type: "before_after", compare: { at: 40 }, images: [{ image_url: "https://cdn.example.com/b.jpg", caption: "Before", translations: { ar: { caption: "قبل" } } }, { image_url: "https://cdn.example.com/a.jpg", caption: "After" }] },
  { id: "tick", type: "marquee", text: "Free delivery\nNew", translations: { ar: { text: "توصيل مجاني\nجديد" } }, images: [{ image_url: "https://cdn.example.com/logo.png", caption: "Logo", translations: { ar: { caption: "الشعار" } } }], marquee: { speed: 60, direction: "end" } },
];
type ServedNode = StudioNode & Record<string, unknown>;
/** What the others look like served, in English and in Arabic. */
function servedChecks(en: ServedNode[], ar: ServedNode[]) {
  expect(en.map((n) => n.type)).toEqual(ar.map((n) => n.type));
  const of = (list: ServedNode[], type: string) => list.find((n) => n.type === type)!;
  // 129.3 The ticker's words and its pictures' names.
  expect(of(en, "marquee")).toMatchObject({ text: "Free delivery\nNew", marquee: { speed: 60, direction: "end" }, images: [{ image_url: "https://cdn.example.com/logo.png", caption: "Logo" }] });
  expect(of(ar, "marquee")).toMatchObject({ text: "توصيل مجاني\nجديد", images: [{ caption: "الشعار" }] });
  // 129.5 and 129.6 The photos with their captions.
  expect(of(en, "gallery")).toMatchObject({ gallery: { layout: "bento", captions: true }, images: [{ caption: "Garden" }] });
  expect(of(ar, "gallery").images![0]!.caption).toBe("الحديقة");
  expect(of(en, "before_after")).toMatchObject({ compare: { at: 40 }, images: [{ caption: "Before" }, { caption: "After" }] });
  expect(of(ar, "before_after").images![0]!.caption).toBe("قبل");
  // 129.4 and 129.7 The banners with what lies over them.
  expect(of(en, "video_hero")).toMatchObject({ video_url: "https://cdn.example.com/loop.mp4", image_url: "https://cdn.example.com/poster.jpg", autoplay: true, glass: true, scrim: { color: "#000000", from: 0.2, to: 0.8 } });
  expect(of(ar, "video_hero").children![0]!.text).toBe("بالحركة");
  expect(of(en, "parallax_banner")).toMatchObject({ parallax: { speed: 0.3 }, children: [{ text: "Crafted" }] });
}

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

describe("129.2 stories", () => {
  it("are offered in the Premium group and start as four titled stories", () => {
    expect(ELEMENTS.find((e) => e.type === "stories")).toMatchObject({ group: "premium", icon: "amp_stories" });
    const node = make("stories");
    expect(node.slides!.map((s) => s.heading)).toEqual(["New", "Offers", "Today", "Tips"]);
    expect(node.interval_ms).toBe(5000);
    expect(ok([node])[0]!.slides).toHaveLength(4);
  });

  it("keeps each story's photo, title, line, link and translations, bounded", () => {
    const [kept] = ok([
      {
        id: "st",
        type: "stories",
        interval_ms: 6000,
        stories: { size: 80 },
        slides: [{ image_url: "https://cdn.example.com/a.jpg", heading: "New", subheading: "This week", action: { type: "screen", screen: "courses" }, translations: { ar: { heading: "جديد" }, xx: { heading: "?" } }, extra: true }],
      },
    ]);
    expect(kept).toEqual({
      id: "st",
      type: "stories",
      interval_ms: 6000,
      stories: { size: 80 },
      slides: [{ image_url: "https://cdn.example.com/a.jpg", heading: "New", subheading: "This week", action: { type: "screen", screen: "courses" }, translations: { ar: { heading: "جديد" } } }],
    });
    expect(errors([{ id: "st", type: "stories", slides: [] }])).toContain("add a story.");
    expect(errors([{ id: "st", type: "stories", slides: Array.from({ length: 21 }, () => ({ heading: "x" })) }])).toContain("at most 20");
    expect(errors([{ id: "st", type: "stories", slides: [{ heading: "x".repeat(41) }] }])).toContain("40");
    expect(errors([{ id: "st", type: "stories", stories: { size: 200 }, slides: [{ heading: "x" }] }])).toContain("52 to 96");
    expect(errors([{ id: "st", type: "stories", slides: [{ image_url: "javascript:alert(1)" }] }])).toContain("photo");
  });

  it("draws round photos in a ring with their titles, in the language being edited", () => {
    const node: StudioNode = { id: "st", type: "stories", slides: [{ image_url: "https://cdn.example.com/a.jpg", heading: "New", subheading: null, action: null, translations: { ar: { heading: "جديد" } } as never }] };
    const html = draw([node], { lang: "ar", dark: true });
    expect(html).toContain("data-studio-stories");
    expect(html).toContain("data-studio-story-ring");
    expect(html).toContain("جديد");
    expect(html).toContain('dir="rtl"');
  });
});

describe("129.3 the ticker", () => {
  it("is offered in the Premium group and starts as a dark band of words with a star between them", () => {
    expect(ELEMENTS.find((e) => e.type === "marquee")?.group).toBe("premium");
    const node = make("marquee");
    expect(node).toMatchObject({ icon: "star", background: "#0E0D24", dark_background: "#F4EFE6", marquee: { speed: 40 } });
    expect(node.text!.split("\n")).toHaveLength(3);
    const [kept] = ok([node]);
    expect(kept!.marquee).toBeUndefined();
    expect(kept!.text).toBe(node.text);
  });

  it("keeps its words, pictures, speed and direction, bounded", () => {
    const [kept] = ok([{ id: "t", type: "marquee", text: "A\nB", images: [{ image_url: "https://cdn.example.com/l.png" }], marquee: { speed: 120, direction: "end", pause_on_press: false, size: 48 } }]);
    expect(kept).toMatchObject({ images: [{ image_url: "https://cdn.example.com/l.png" }], marquee: { speed: 120, direction: "end", pause_on_press: false, size: 48 } });
    expect(kept!.images![0]).not.toHaveProperty("caption");
    expect(errors([{ id: "t", type: "marquee" }])).toContain("add the ticker's words or pictures.");
    expect(errors([{ id: "t", type: "marquee", text: "A", marquee: { speed: 1000 } }])).toContain("10 to 200");
    expect(errors([{ id: "t", type: "marquee", text: "A", marquee: { direction: "up" } }])).toContain("choose which way the ticker runs.");
    expect(errors([{ id: "t", type: "marquee", images: Array.from({ length: 31 }, () => ({ image_url: "https://cdn.example.com/l.png" })) }])).toContain("at most 30");
  });

  it("runs on the canvas toward the start, mirrored in Arabic, still when motion is reduced", () => {
    const html = draw([make("marquee")]);
    expect(html).toContain('data-studio-marquee="press"');
    expect(html).toContain("--studio-marquee-to:-50%");
    expect(html).toContain('aria-label="Free delivery, New arrivals every week, Members save 10%"');
    expect(draw([make("marquee")], { lang: "ar" })).toContain("--studio-marquee-to:50%");
    expect(html).toMatch(/prefers-reduced-motion[^}]*\{[^}]*\}[^}]*\[data-studio-marquee-track\] \{ animation: none; \}/);
  });
});

describe("129.4 and 129.7 the video and parallax banners", () => {
  it("are offered in the Premium group, holding words and a button over them", () => {
    expect(ELEMENTS.filter((e) => e.group === "premium").map((e) => e.type)).toEqual(expect.arrayContaining(["video_hero", "parallax_banner"]));
    const video = make("video_hero");
    expect(video).toMatchObject({ autoplay: true, height: 440, align: "end" });
    expect(video.scrim).toBeTruthy();
    expect(video.children!.map((c) => c.type)).toEqual(["text", "text", "button"]);
    const parallax = make("parallax_banner");
    expect(parallax).toMatchObject({ glass: true, parallax: { speed: 0.5 }, radius: 26 });
    const [v, p] = ok([video, parallax]);
    expect(v).toMatchObject({ autoplay: true });
    expect(v).not.toHaveProperty("video_url");
    expect(p).toMatchObject({ glass: true });
    expect(p).not.toHaveProperty("parallax");
  });

  it("keeps a video from the media library, its poster and the photo's speed, bounded", () => {
    const [v, p] = ok([
      { id: "v", type: "video_hero", video_url: "https://cdn.example.com/a.mp4", image_url: "https://cdn.example.com/a.jpg", children: [] },
      { id: "p", type: "parallax_banner", image_url: "https://cdn.example.com/b.jpg", parallax: { speed: 0.25 }, autoplay: true, children: [] },
    ]);
    expect(v).toEqual({ id: "v", type: "video_hero", video_url: "https://cdn.example.com/a.mp4", image_url: "https://cdn.example.com/a.jpg", children: [] });
    expect(p).toEqual({ id: "p", type: "parallax_banner", image_url: "https://cdn.example.com/b.jpg", parallax: { speed: 0.25 }, children: [] });
    expect(errors([{ id: "v", type: "video_hero", video_url: "ftp://cdn.example.com/a.mp4", children: [] }])).toContain("video");
    expect(errors([{ id: "p", type: "parallax_banner", parallax: { speed: 2 }, children: [] }])).toContain("0.1 to 0.9");
  });

  it("draws the poster, the video's button, the shade and the frosted panel on the canvas", () => {
    const video: StudioNode = { ...make("video_hero"), video_url: "https://cdn.example.com/a.mp4", image_url: "https://cdn.example.com/a.jpg", glass: true };
    const html = draw([video, make("parallax_banner")], { dark: true });
    expect(html).toContain('data-studio-banner="video_hero"');
    expect(html).toContain('data-studio-banner="parallax_banner"');
    expect(html).toContain('poster="https://cdn.example.com/a.jpg"');
    expect(html).toContain("muted");
    expect(html).toContain("data-studio-video-button");
    expect(html).toContain("data-studio-glass");
    expect(html).toContain("See it in motion");
  });
});

describe("129.5 the gallery", () => {
  const photos = (n: number) => Array.from({ length: n }, (_, i) => ({ image_url: `https://cdn.example.com/${i}.jpg`, caption: `Photo ${i}` }));

  it("is offered in the Premium group and starts as a bento waiting for its photos", () => {
    expect(ELEMENTS.find((e) => e.type === "gallery")?.group).toBe("premium");
    const node = make("gallery");
    expect(node.gallery).toEqual({ layout: "bento", radius: 18 });
    expect(errors([node])).toContain("add a photo.");
    expect(ok([{ ...node, images: photos(3) }])[0]).toMatchObject({ gallery: { layout: "bento", radius: 18 }, images: photos(3) });
  });

  it("keeps its layout, columns, corners and captions, bounded", () => {
    expect(ok([{ id: "g", type: "gallery", columns: 3, gallery: { layout: "masonry", captions: true, radius: 16 }, images: photos(2) }])[0]).toEqual({ id: "g", type: "gallery", columns: 3, gallery: { layout: "masonry", captions: true }, images: photos(2) });
    expect(errors([{ id: "g", type: "gallery", gallery: { layout: "carousel" }, images: photos(1) }])).toContain("choose how the gallery lays out its photos.");
    expect(errors([{ id: "g", type: "gallery", gallery: { layout: "bento", radius: 80 }, images: photos(1) }])).toContain("0 to 40");
    expect(errors([{ id: "g", type: "gallery", columns: 5, gallery: { layout: "masonry" }, images: photos(1) }])).toContain("2 to 3");
    expect(errors([{ id: "g", type: "gallery", gallery: { layout: "bento" }, images: photos(31) }])).toContain("at most 30");
  });

  it("draws each layout on the canvas, the captions over the photos", () => {
    const html = draw(
      (["masonry", "bento", "filmstrip"] as const).map((layout) => ({ id: `g-${layout}`, type: "gallery", gallery: { layout, captions: true }, images: photos(4) }) as StudioNode),
      { lang: "ar" },
    );
    for (const layout of ["masonry", "bento", "filmstrip"]) expect(html).toContain(`data-studio-gallery="${layout}"`);
    expect(html.match(/data-studio-gallery-photo/g)).toHaveLength(12);
    expect(html).toContain("Photo 3");
    expect(html).toContain("grid-column:span 2");
  });
});

describe("129.6 before and after", () => {
  const pair = [
    { image_url: "https://cdn.example.com/b.jpg", caption: "Before" },
    { image_url: "https://cdn.example.com/a.jpg", caption: "After" },
  ];

  it("is offered in the Premium group, two photos and where the divider starts", () => {
    expect(ELEMENTS.find((e) => e.type === "before_after")?.group).toBe("premium");
    expect(make("before_after")).toMatchObject({ aspect_ratio: 1.33, radius: 22, images: [] });
    expect(ok([{ id: "c", type: "before_after", compare: { at: 35 }, images: pair }])[0]).toEqual({ id: "c", type: "before_after", compare: { at: 35 }, images: pair });
    expect(ok([{ id: "c", type: "before_after", compare: { at: 50 }, images: pair }])[0]).not.toHaveProperty("compare");
    expect(errors([{ id: "c", type: "before_after", images: pair.slice(0, 1) }])).toContain("add the photo before and the photo after.");
    expect(errors([{ id: "c", type: "before_after", images: [...pair, pair[0]] }])).toContain("add the photo before and the photo after.");
    expect(errors([{ id: "c", type: "before_after", compare: { at: 99 }, images: pair }])).toContain("5 to 95%");
  });

  it("draws the photo after from the divider to the end side, mirrored in Arabic", () => {
    const node = { id: "c", type: "before_after", compare: { at: 30 }, images: pair } as StudioNode;
    expect(draw([node])).toContain("clip-path:inset(0 0 0 30%)");
    const ar = draw([node], { lang: "ar" });
    expect(ar).toContain("clip-path:inset(0 30% 0 0)");
    expect(ar).toContain("data-studio-compare-handle");
    expect(ar).toContain(">Before<");
  });
});

describe("129 premium elements on the hosted API", () => {
  it("serves their entries in the language asked for, as the contract says", async () => {
    const { store } = await setupClient();
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const hosted = { ...newApp(client.id, null, NOW, "lms"), backend: "hosted" as const, appName: "Lale" };
    await store.createApp(hosted);
    const body = { id: "root", type: "column", children: PREMIUM_PAGE };
    const layout = {
      appearance: { template: "bold", theme_mode: "light", user_can_change_mode: true, secondary_color: "#e8b04b", font: "Outfit", corners: "round", cards: "elevated" },
      languages: { default: "en", available: ["en", "ar"] },
      tabs: [
        { id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" } },
        { id: "account", label: "Account", icon: "person", target: { type: "screen", screen: "account" } },
      ],
      pages: [{ slug: "home", title: "Home", show_title: true, updated_at: NOW.toISOString(), blocks: [], studio: { body } }],
    };
    const published = await publishLayout(store, hosted, layout, "owner@lale.test", NOW);
    expect(published.ok ? [] : published.errors).toEqual([]);
    const get = async (lang: string): Promise<HostedResult> => {
      const result = await handleHosted(
        { store, app: hosted, active: true, now: NOW, ip: "203.0.113.9", secret: "test-hosted-secret", sender: new LogSender(), push: false, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test", connector: null },
        { method: "GET", path: ["pages", "home"], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) },
      );
      expectContract("GET", "/pages/{slug}", result);
      return result;
    };
    type Served = { studio: { body: { children: (StudioNode & Record<string, unknown>)[] } } };
    const en = ((await get("en")).body as Served).studio.body.children;
    const ar = ((await get("ar")).body as Served).studio.body.children;
    const stories = (list: typeof en) => list.find((n) => n.type === "stories")!;
    expect(stories(en).slides![0]).toEqual({ image_url: "https://cdn.example.com/a.jpg", heading: "New" });
    expect(stories(ar).slides![0]!.heading).toBe("جديد");
    expect(stories(ar).slides![0]).not.toHaveProperty("translations");
    servedChecks(en, ar);
  });
});
