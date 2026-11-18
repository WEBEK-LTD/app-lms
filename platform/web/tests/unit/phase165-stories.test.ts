import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { MemoryStore } from "@/lib/data/memory";
import type { App, AppLayoutRecord } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handlePages } from "@/lib/hosted/pages";
import type { HostedContext } from "@/lib/hosted/service";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { itemSourcesFor } from "@/lib/pages/sources";
import type { LayoutContent, StudioNode, StudioPage } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import { ensureStoriesSeeded, parseStory, servedStories, SHOP_ACTION, storyAction, storyLive, type StoryRules } from "@/lib/stories";
import { dashboardStoryElements, storiesSourceOf, storyElementKind } from "@/lib/stories/elements";
import { storyOrder } from "@/lib/stories/order";
import { appWords } from "@/lib/studio/app-words";
import type { SectionContext } from "@/lib/studio/sections";
import { TEMPLATES } from "@/lib/studio/sections";
import { startLayout } from "@/lib/studio/start";
import { allNodes, mapTree } from "@/lib/studio/tree";
import { appStoriesStoreSuite, NOW, storiesApp, storyOf } from "./app-stories-store-suite";

/**
 * 165 Dashboard › Stories: the stories of the flower shop's home (its hero's
 * slides, its rings and look B's chips) managed in the dashboard and served
 * into those Studio elements in the language asked for; the stories an app
 * made from the template already has copied there once, nothing visible
 * changing.
 */

function leqaaApp(): App {
  return { ...newApp("client", null, NOW, "store"), section: "studio", backend: "hosted", appName: "Leqaa", connector: { kind: "catalog" }, primaryColor: "#8E2445" };
}

function contextOf(app: App): SectionContext {
  let n = 0;
  return { brand: app.primaryColor, source: itemSourcesFor(app)[0] ?? null, app: app.appName!, lang: "en", w: appWords("en", app.appName!), picture: (f) => `${appUrl()}/design-pictures/${f}`, newId: () => `lq-${++n}`, kind: { type: app.appType, vertical: null } };
}

/** A store started from Leqaa's look A or B, in English, Arabic and Turkish. */
function leqaaLayout(app: App, look: "a" | "b"): LayoutContent {
  const template = TEMPLATES.find((t) => t.id === `flowers_signature_${look}`)!;
  const layout = startLayout(app, template, defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), NOW, contextOf(app));
  return { ...layout, languages: { default: "en", available: ["en", "ar", "tr"] } };
}

/** The same design as an app made before 165 has it: no story source, no story parts, its slides' words in its own language only. */
function before165(layout: LayoutContent): LayoutContent {
  const strip = (body: StudioNode) =>
    mapTree(body, (n) => {
      const { stories_source: _s, story_part: part, ...rest } = n;
      void _s;
      // The slides' words had no other languages then.
      if (part && part !== "ring" && part !== "icon") delete rest.translations;
      return rest;
    })!;
  return { ...layout, pages: layout.pages.map((p) => (p.studio ? { ...p, studio: { ...p.studio, body: strip(p.studio.body) } } : p)) };
}

/** The same design with every story element as designed in Studio (what the app showed before 165). */
function asDesigned(layout: LayoutContent): LayoutContent {
  const mark = (body: StudioNode) => mapTree(body, (n) => (n.type === "stories" || n.type === "slider" || (n.type === "row" && n.scroll) ? { ...n, stories_source: "studio" as const } : n))!;
  return { ...layout, pages: layout.pages.map((p) => (p.studio ? { ...p, studio: { ...p.studio, body: mark(p.studio.body) } } : p)) };
}

async function published(store: MemoryStore, app: App, layout: LayoutContent) {
  const record: AppLayoutRecord = { appId: app.id, draft: layout, draftUpdatedAt: NOW, published: { version: "v1", ...layout }, publishedAt: NOW, publishedBy: "owner@test", publishCount: 1 };
  await store.saveAppLayout(record);
}

function context(store: MemoryStore, app: App, now = NOW): HostedContext {
  return { store, app, active: true, now, ip: "203.0.113.9", secret: "test-hosted-secret", sender: new LogSender(), push: false, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" } as HostedContext;
}

async function home(store: MemoryStore, app: App, lang: string, now = NOW): Promise<StudioPage> {
  const fresh = (await store.getAppById(app.id))!;
  const slug = (await store.getAppLayout(app.id))!.published!.pages[0]!.slug;
  const result = await handlePages(context(store, fresh, now), { method: "GET", path: ["pages", slug], query: new URLSearchParams({ platform: "android" }), body: null, token: null, headers: new Headers({ "accept-language": lang }) }, null);
  expect(result?.status).toBe(200);
  return (result!.body as { studio: StudioPage }).studio;
}

const sliderOf = (page: StudioPage) => allNodes(page).find((n) => n.type === "slider")!;
const ringsOf = (page: StudioPage) => allNodes(page).find((n) => n.type === "stories")!;

const RULES: StoryRules = { app: leqaaApp(), languages: ["en", "ar", "tr"], slugs: new Set(["bouquet"]) };
const valid = { media: { kind: "image", imageUrl: "https://files.test/love.jpg" }, texts: { en: { title: "Love, said in flowers", ring: "Love", button: "Send flowers", kicker: "For love" }, ar: { title: "الحب بالورد" }, tr: { title: "Aşk, çiçeklerle" } }, icon: "favorite" };

describe("165 the app's stories in the memory store", () => {
  appStoriesStoreSuite(() => new MemoryStore());
});

describe("165 checking a story the dashboard sends", () => {
  it("keeps a photo or a video, the words in the app's languages and Arabic and Turkish, the icon, the button, the category and the dates", () => {
    const r = parseStory({ ...valid, texts: { ...valid.texts, fr: { title: "x" } }, action: { type: "screen", screen: "courses", category_id: "12" }, categoryId: "12", startsAt: "2026-11-20T09:00:00.000Z", endsAt: "2026-11-30T09:00:00.000Z", enabled: false }, RULES);
    expect(r).toEqual({
      ok: true,
      value: {
        enabled: false,
        startsAt: new Date("2026-11-20T09:00:00.000Z"),
        endsAt: new Date("2026-11-30T09:00:00.000Z"),
        media: { kind: "image", imageUrl: "https://files.test/love.jpg", videoUrl: null },
        // French isn't one of the app's languages: left out.
        texts: valid.texts,
        icon: "favorite",
        action: { type: "screen", screen: "courses", category_id: "12" },
        categoryId: "12",
      },
    });
    const video = parseStory({ ...valid, media: { kind: "video", imageUrl: "", videoUrl: "https://files.test/v.mp4" } }, RULES);
    expect(video.ok && video.value.media).toEqual({ kind: "video", imageUrl: null, videoUrl: "https://files.test/v.mp4" });
    // Yallapp's own photos (the template's) are kept too.
    expect(parseStory({ ...valid, media: { kind: "image", imageUrl: `${appUrl()}/flower-photos/tulips.jpg` } }, RULES).ok).toBe(true);
  });

  it("says what is missing or wrong, in the dashboard's words", () => {
    const errors = (input: Record<string, unknown>) => {
      const r = parseStory(input, RULES);
      return r.ok ? [] : r.errors;
    };
    expect(errors({ ...valid, media: { kind: "image", imageUrl: "" } })).toEqual(["stories.errPhoto"]);
    expect(errors({ ...valid, media: { kind: "video", imageUrl: "https://files.test/p.jpg" } })).toEqual(["stories.errVideo"]);
    expect(errors({ ...valid, media: { kind: "image", imageUrl: "http://elsewhere.test/a.jpg" } })).toEqual(["stories.errMediaLink"]);
    expect(errors({ ...valid, texts: { ar: { title: "الحب" } } })).toEqual(["stories.errTitle"]);
    expect(errors({ ...valid, texts: { en: { title: "x".repeat(81) } } })).toEqual(["stories.errTooLong"]);
    expect(errors({ ...valid, icon: "Not An Icon" })).toEqual(["stories.errIcon"]);
    expect(errors({ ...valid, action: { type: "page", page_slug: "nowhere" } })).toEqual(["stories.errAction"]);
    expect(errors({ ...valid, action: { type: "screen", screen: "orders", category_id: "12" } })).toEqual(["stories.errAction"]);
    expect(errors({ ...valid, action: { type: "url", url: "javascript:alert(1)" } })).toEqual(["stories.errAction"]);
    expect(errors({ ...valid, categoryId: "bad id!" })).toEqual(["stories.errCategory"]);
    expect(errors({ ...valid, startsAt: "2026-11-30T00:00:00Z", endsAt: "2026-11-20T00:00:00Z" })).toEqual(["stories.errDates"]);
    expect(errors({ ...valid, startsAt: "soon" })).toEqual(["stories.errDates"]);
  });

  it("opens what the owner chose; with nothing chosen the shop (on the story's category), never Home", () => {
    expect(SHOP_ACTION).toEqual({ type: "screen", screen: "courses" });
    expect(storyAction({ action: null, categoryId: null })).toEqual(SHOP_ACTION);
    expect(storyAction({ action: null, categoryId: "7" })).toEqual({ type: "screen", screen: "courses", category_id: "7" });
    expect(storyAction({ action: { type: "page", page_slug: "bouquet" }, categoryId: "7" })).toEqual({ type: "page", page_slug: "bouquet" });
  });

  it("shows a story while it is on and between its dates; reorders by the ids given", () => {
    const at = (d: string) => new Date(d);
    expect(storyLive({ enabled: true, startsAt: null, endsAt: null }, NOW)).toBe(true);
    expect(storyLive({ enabled: false, startsAt: null, endsAt: null }, NOW)).toBe(false);
    expect(storyLive({ enabled: true, startsAt: at("2026-11-19T00:00:00Z"), endsAt: null }, NOW)).toBe(false);
    expect(storyLive({ enabled: true, startsAt: null, endsAt: NOW }, NOW)).toBe(false);
    expect(storyOrder([{ id: 1 }, { id: 2 }, { id: 3 }], [3, 3, 9, 1])).toEqual([3, 1, 2]);
  });

  it("is kept in a Studio page's action and its story elements' source and parts", () => {
    const app = leqaaApp();
    const layout = leqaaLayout(app, "a");
    const checked = parseLayoutContent(layout, { app, now: NOW });
    expect(checked.ok ? [] : checked.errors).toEqual([]);
    if (!checked.ok) return;
    const nodes = allNodes(checked.value.pages[0]!.studio!);
    expect(nodes.filter((n) => n.stories_source === "dashboard").map((n) => n.type).sort()).toEqual(["slider", "stories"]);
    expect(nodes.filter((n) => n.story_part).map((n) => n.story_part)).toEqual(expect.arrayContaining(["kicker", "title", "line", "icon", "button"]));
  });
});

describe("165 the template's story elements", () => {
  it("are the hero's slides, the rings and look B's chips, from the dashboard by default; any other app's as designed", () => {
    const app = leqaaApp();
    const a = leqaaLayout(app, "a").pages[0]!.studio!.body;
    expect(dashboardStoryElements(a).map((e) => e.kind)).toEqual(["slides", "rings"]);
    const b = leqaaLayout(app, "b").pages[0]!.studio!.body;
    expect(dashboardStoryElements(b).map((e) => e.kind)).toEqual(["chips"]);
    // Made before 165, without a source: still known by the template's names.
    expect(dashboardStoryElements(before165(leqaaLayout(app, "a")).pages[0]!.studio!.body).map((e) => e.kind)).toEqual(["slides", "rings"]);
    expect(dashboardStoryElements(before165(leqaaLayout(app, "b")).pages[0]!.studio!.body).map((e) => e.kind)).toEqual(["chips"]);
    // Another app's stories and sliders stay as designed.
    const own: StudioNode = { id: "s", type: "stories", name: "Offers", slides: [{ image_url: null, heading: "A", subheading: null, action: null }] };
    expect(storiesSourceOf(own)).toBe("studio");
    expect(storyElementKind({ id: "x", type: "slider", name: "Promos", children: [{ id: "y", type: "photo_hero" }] })).toBeNull();
    expect(storiesSourceOf({ ...own, stories_source: "dashboard" })).toBe("dashboard");
  });
});

describe("165 existing apps: their Studio stories copied into the dashboard once", () => {
  for (const [name, made] of [
    ["a new app from the template", (l: LayoutContent) => l],
    ["an app made before 165 (Leqaa, KechFlora)", before165],
  ] as const) {
    it(`copies ${name}'s five occasions with their photos, words in every language they have and buttons`, async () => {
      const store = new MemoryStore();
      const app = await storiesApp(store);
      await published(store, app, made(leqaaLayout(app, "a")));
      expect(await ensureStoriesSeeded(store, app, NOW)).toBe(5);
      const stories = await store.listAppStories(app.id);
      expect(stories.map((s) => s.texts.en?.ring)).toEqual(["Love", "Birthday", "Sympathy", "New baby", "Congratulations"]);
      expect(stories[0]).toMatchObject({
        position: 0,
        enabled: true,
        media: { kind: "image", imageUrl: `${appUrl()}/flower-photos/blush-bouquet.jpg`, videoUrl: null },
        icon: "favorite",
        action: { type: "screen", screen: "search" },
        texts: { en: { kicker: "For love", title: expect.any(String), line: expect.any(String), button: "Send flowers", ring: "Love" }, ar: { ring: "حب" } },
      });
      // The ring names are in every language the rings had.
      expect(stories.every((s) => s.texts.ar?.ring && s.texts.tr?.ring)).toBe(true);
      if (made === before165) expect(stories[0]!.texts.ar?.title).toBeUndefined();
      else expect(stories[0]!.texts.ar?.title).toBeTruthy();
      // Once: again changes nothing, and a story the owner removed stays removed.
      await store.deleteAppStory(app.id, stories[4]!.id);
      expect(await ensureStoriesSeeded(store, (await store.getAppById(app.id))!, NOW)).toBe(0);
      expect(await ensureStoriesSeeded(store, { ...app, storiesSeededAt: null }, NOW)).toBe(0);
      expect((await store.listAppStories(app.id)).length).toBe(4);
    });
  }

  it("leaves an app without the template's elements unmarked, to look again once it has them", async () => {
    const store = new MemoryStore();
    const app = await storiesApp(store);
    await published(store, app, asDesigned(leqaaLayout(app, "a")));
    expect(await ensureStoriesSeeded(store, app, NOW)).toBe(0);
    expect((await store.getAppById(app.id))?.storiesSeededAt ?? null).toBeNull();
  });

  it("serves exactly what the app showed before, until the owner edits", async () => {
    for (const lang of ["en", "ar", "tr"]) {
      const store = new MemoryStore();
      const app = await storiesApp(store);
      const old = before165(leqaaLayout(app, "a"));
      await published(store, app, asDesigned(old));
      const was = await home(store, app, lang);
      await published(store, app, old);
      const now = await home(store, app, lang);
      expect((await store.listAppStories(app.id)).length).toBe(5);
      // The hero's slides: the same, to the last part.
      const plain = ({ stories_source: _s, ...n }: StudioNode) => (void _s, n);
      expect(plain(sliderOf(now))).toEqual(plain(sliderOf(was)));
      // The rings: the same photos, names, rings and taps (new apps also get each story's words for their viewer).
      const pick = (n: StudioNode) => n.slides!.map((s) => ({ image_url: s.image_url, heading: s.heading, subheading: s.subheading, action: s.action, ring: s.ring, ring_color: s.ring_color }));
      expect(pick(ringsOf(now))).toEqual(pick(ringsOf(was)));
    }
  });
});

describe("165 serving the dashboard's stories in each language", () => {
  async function edited() {
    const store = new MemoryStore();
    const app = await storiesApp(store);
    await published(store, app, leqaaLayout(app, "a"));
    await ensureStoriesSeeded(store, app, NOW);
    const [love, birthday, ...rest] = await store.listAppStories(app.id);
    for (const s of rest) await store.deleteAppStory(app.id, s.id);
    await store.updateAppStory(app.id, love!.id, { texts: { en: { title: "Roses for her", ring: "Love", kicker: "For love", button: "See roses", line: "Hand-tied today" }, ar: { title: "ورد ليها", ring: "حب", button: "شوف الورد" }, tr: { title: "Ona güller", ring: "Aşk" } }, action: { type: "screen", screen: "courses", category_id: "12" }, updatedAt: NOW });
    await store.updateAppStory(app.id, birthday!.id, { action: null, categoryId: null, media: { kind: "video", imageUrl: "https://files.test/poster.jpg", videoUrl: "https://files.test/birthday.mp4" }, updatedAt: NOW });
    const added = (await store.createAppStory(storyOf(app.id, 9, { texts: { en: { title: "Later", ring: "Later" } }, startsAt: new Date("2026-12-01T00:00:00Z") })))!;
    const off = (await store.createAppStory(storyOf(app.id, 10, { texts: { en: { title: "Off", ring: "Off" } }, enabled: false })))!;
    // The owner moved Birthday first.
    await store.reorderAppStories(app.id, [birthday!.id, love!.id, added.id, off.id], NOW);
    return { store, app, love: love!, birthday: birthday! };
  }

  it("fills the hero's slides and the rings in English, Arabic and Turkish, in the owner's order, only the stories shown now", async () => {
    const { store, app, love, birthday } = await edited();
    for (const [lang, title, ring, button] of [
      ["en", "Roses for her", "Love", "See roses"],
      ["ar", "ورد ليها", "حب", "شوف الورد"],
      // No Turkish button: the main language's.
      ["tr", "Ona güller", "Aşk", "See roses"],
    ] as const) {
      const page = await home(store, app, lang);
      const slides = sliderOf(page).children!;
      expect(slides).toHaveLength(2);
      const [first, second] = slides;
      // Birthday is first, as a video under its photo; its button opens the shop as designed.
      expect(first).toMatchObject({ type: "video_hero", video_url: "https://files.test/birthday.mp4", image_url: "https://files.test/poster.jpg" });
      expect(allNodes({ body: second! }).filter((n) => n.story_part === "title").map((n) => n.text)).toEqual([title]);
      const btn = allNodes({ body: second! }).find((n) => n.story_part === "button")!;
      expect(btn).toMatchObject({ text: button, action: { type: "screen", screen: "courses", category_id: "12" } });
      expect(second).toMatchObject({ type: "photo_hero", action: { type: "screen", screen: "courses", category_id: "12" } });
      // Ids stay unique on the page.
      const ids = allNodes(page).map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
      const rings = ringsOf(page).slides!;
      expect(rings.map((r) => r.heading)).toEqual([lang === "en" ? "Birthday" : lang === "ar" ? "عيد ميلاد" : "Doğum günü", ring].map((x, i) => (i === 0 ? rings[0]!.heading : x)));
      expect(rings[1]).toMatchObject({ heading: ring, title, button_label: button, action: { type: "screen", screen: "courses", category_id: "12" } });
      expect(rings[0]).toMatchObject({ video_url: "https://files.test/birthday.mp4" });
      expect(rings[0]!.heading).toBeTruthy();
    }
    void love;
    void birthday;
  });

  it("opens the shop from a story with nothing chosen, never Home", async () => {
    const { store, app, birthday } = await edited();
    await store.updateAppStory(app.id, birthday.id, { action: null, updatedAt: NOW });
    const rings = ringsOf(await home(store, app, "en")).slides!;
    expect(rings[0]!.action).toEqual({ type: "screen", screen: "courses" });
    const slide = sliderOf(await home(store, app, "en")).children![0]!;
    expect(slide.action).toEqual({ type: "screen", screen: "courses" });
  });

  it("shows a scheduled story from its start, and leaves the elements out while no story is shown", async () => {
    const { store, app } = await edited();
    const later = new Date("2026-12-02T00:00:00Z");
    expect(sliderOf(await home(store, app, "en", later)).children).toHaveLength(3);
    for (const s of await store.listAppStories(app.id)) await store.updateAppStory(app.id, s.id, { enabled: false, updatedAt: NOW });
    const page = await home(store, app, "en");
    expect(allNodes(page).some((n) => n.type === "slider" || n.type === "stories")).toBe(false);
  });

  it("fills look B's chips with each story's ring name and icon", async () => {
    const store = new MemoryStore();
    const app = await storiesApp(store);
    await published(store, app, leqaaLayout(app, "b"));
    await ensureStoriesSeeded(store, app, NOW);
    const [first] = await store.listAppStories(app.id);
    await store.updateAppStory(app.id, first!.id, { texts: { en: { ring: "Valentine" }, ar: { ring: "عيد الحب" } }, icon: "redeem", updatedAt: NOW });
    const row = allNodes(await home(store, app, "ar")).find((n) => n.type === "row" && n.stories_source === "dashboard")!;
    expect(row.children).toHaveLength(5);
    const chip = row.children![0]!;
    expect(chip.children!.map((c) => (c.type === "icon" ? c.icon : c.text))).toEqual(["redeem", "عيد الحب"]);
    expect(chip.action).toEqual({ type: "screen", screen: "search" });
  });

  it("serves the words a story has: the main language's where another has none", () => {
    const story = { ...storyOf("app", 0, { texts: { en: { title: "Roses", button: "Shop" }, ar: { title: "ورد" } } }), id: 1 };
    expect(servedStories([story], "ar", "en", NOW)[0]).toMatchObject({ title: "ورد", button: "Shop" });
    expect(servedStories([story], "tr", "en", NOW)[0]).toMatchObject({ title: "Roses", button: "Shop" });
  });
});
