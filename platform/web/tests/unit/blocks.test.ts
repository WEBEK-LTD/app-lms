import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App, AppType } from "@/lib/data/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { BUILT_IN_APP_DEFAULTS } from "@/lib/pages/defaults";
import { BLOCK_GROUPS, BLOCK_HINTS, BLOCK_LABELS } from "@/lib/pages/labels";
import { publishLayout } from "@/lib/pages/layout";
import { newBlock, pageLinks, quickLinksFor, renamePageLinks, switchDefaultLanguage } from "@/lib/pages/model";
import { layoutForPlan } from "@/lib/pages/plan";
import { blockProblem, blockTypesFor, screenOptionsFor } from "@/lib/pages/sources";
import { translatedBlock } from "@/lib/pages/translate";
import { BLOCK_TYPES, type Layout, type LayoutBlock, type LayoutContent } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { PLAN_INFO, type PlanInfo } from "@/lib/plans";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/** 33 The new page blocks: what the editor, publishing, the plan and the hosted API do with them. */

beforeEach(() => clearPlatformSettingsCache());

const lmsHosted = { appType: "lms" as AppType, backend: "hosted" as const };

function layoutWith(blocks: unknown[], extraPages: unknown[] = []): Record<string, unknown> {
  return {
    appearance: { template: "classic", theme_mode: "system", user_can_change_mode: true, secondary_color: null, font: "Outfit", corners: "soft", cards: "outlined" },
    languages: { default: "en", available: ["en", "ar"] },
    tabs: [
      { id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" } },
      { id: "account", label: "Account", icon: "person", target: { type: "screen", screen: "account" } },
    ],
    pages: [{ slug: "home", title: "Home", show_title: true, updated_at: NOW.toISOString(), blocks }, ...extraPages],
  };
}

const parse = (blocks: unknown[], app: { appType: AppType; backend: App["backend"] } = lmsHosted, extraPages: unknown[] = []) => parseLayoutContent(layoutWith(blocks, extraPages), { app, now: NOW });
const errorsOf = (blocks: unknown[], app?: { appType: AppType; backend: App["backend"] }) => {
  const r = parse(blocks, app);
  return r.ok ? [] : r.errors;
};
const first = (blocks: unknown[], app?: { appType: AppType; backend: App["backend"] }): LayoutBlock => {
  const r = parse(blocks, app);
  if (!r.ok) throw new Error(r.errors.join("\n"));
  return r.value.pages[0]!.blocks[0]!;
};
const b = (type: string, fields: Record<string, unknown>) => ({ id: type.replace("_", "-"), type, visibility: "everyone", ...fields });

/** One of each new block, filled in, with Arabic texts on the entries. */
const ALL_NEW: Record<string, unknown>[] = [
  b("slider", {
    auto_advance: false,
    slides: [
      { image_url: "https://cdn.test/1.jpg", heading: "Autumn sale", subheading: "Up to 30% off", action: { type: "screen", screen: "courses" }, translations: { ar: { heading: "تخفيضات الخريف" } } },
      { heading: "New courses", action: null },
    ],
  }),
  b("quick_links", {
    style: "row",
    links: [
      { icon: "school", label: "Courses", action: { type: "screen", screen: "courses" }, translations: { ar: { label: "الدورات" } } },
      { icon: "info", label: "About", action: { type: "page", page_slug: "about" } },
    ],
  }),
  b("testimonials", { title: "Students", quotes: [{ text: "Great teachers.", name: "Leyla", role: "Student", rating: 5, photo_url: null, translations: { ar: { text: "معلمون رائعون" } } }] }),
  b("faq", { questions: [{ question: "How do I start?", answer: "Enroll.\nThen learn.", translations: { ar: { question: "كيف أبدأ؟" } } }] }),
  b("countdown", { heading: "Sale ends in", ends_at: "2026-12-01T18:00:00.000Z", ended_text: null, label: "Shop", action: { type: "screen", screen: "courses" } }),
  b("contact", { phone: "+20 100 123 4567", whatsapp: "+201001234567", email: "hi@nile.test", website: "https://nile.test", address: "12 Road 9, Maadi", latitude: "30.0444", longitude: 31.2357, translations: { ar: { address: "١٢ شارع ٩، المعادي" } } }),
  b("hours", {
    hours: [
      { day: "sat", opens: "10:00", closes: "14:00" },
      { day: "mon", opens: "09:00", closes: "17:00" },
      { day: "fri", opens: "18:00", closes: "02:00" },
    ],
    closed_dates: ["2026-12-25", "2026-12-25"],
    note: "Closed on holidays.",
  }),
  b("social", { profiles: [{ network: "instagram", url: "https://instagram.com/nile" }, { network: "whatsapp_channel", url: "https://whatsapp.com/channel/abc" }] }),
  b("team", { layout: "grid", people: [{ name: "Dr. Aya", role: "Dentist", bio: "Ten years of smiles.", photo_url: null, action: null, translations: { ar: { name: "د. آية" } } }] }),
  b("stats", { stats: [{ value: "12k+", label: "Students", translations: { ar: { label: "طالب" } } }, { value: "4.9", label: "Rating" }] }),
  b("notice", { tone: "warning", text: "Closed on Friday.", label: "Hours", action: { type: "page", page_slug: "about" }, translations: { ar: { text: "مغلق يوم الجمعة" } } }),
];
const ABOUT = { slug: "about", title: "About", show_title: true, updated_at: NOW.toISOString(), blocks: [] };

describe("33 new blocks: validation", () => {
  it("accepts one of each and keeps only their fields, normalised", () => {
    const parsed = parse(ALL_NEW, lmsHosted, [ABOUT]);
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    if (!parsed.ok) return;
    const [slider, links, quotes, faq, countdown, contact, hours, social, team, stats, notice] = parsed.value.pages[0]!.blocks;
    expect(slider).toMatchObject({ auto_advance: false, slides: [{ image_url: "https://cdn.test/1.jpg", heading: "Autumn sale", translations: { ar: { heading: "تخفيضات الخريف" } } }, { image_url: null, heading: "New courses", subheading: null, action: null }] });
    expect(links!.style).toBe("row");
    expect(links!.links![1]).toEqual({ icon: "info", label: "About", action: { type: "page", page_slug: "about" } });
    expect(quotes!.quotes![0]).toMatchObject({ rating: 5, role: "Student", translations: { ar: { text: "معلمون رائعون" } } });
    expect(faq!.questions![0]!.answer).toBe("Enroll.\nThen learn.");
    expect(countdown).toMatchObject({ ends_at: "2026-12-01T18:00:00Z", label: "Shop", ended_text: null });
    expect(contact).toMatchObject({ latitude: 30.0444, longitude: 31.2357, website: "https://nile.test", translations: { ar: { address: "١٢ شارع ٩، المعادي" } } });
    // Monday first; the same holiday once.
    expect(hours!.hours!.map((h) => h.day)).toEqual(["mon", "fri", "sat"]);
    expect(hours!.closed_dates).toEqual(["2026-12-25"]);
    expect(social!.profiles!.map((p) => p.network)).toEqual(["instagram", "whatsapp_channel"]);
    expect(team).toMatchObject({ layout: "grid", people: [{ name: "Dr. Aya", photo_url: null }] });
    expect(stats!.stats).toHaveLength(2);
    expect(notice).toMatchObject({ tone: "warning", label: "Hours" });
    // Nothing else is kept.
    expect(Object.keys(contact!).sort()).toEqual(["address", "email", "id", "latitude", "longitude", "phone", "title", "translations", "type", "visibility", "website", "whatsapp"]);
  });

  it("says what's wrong with each", () => {
    const errors = (type: string, fields: Record<string, unknown>) => errorsOf([b(type, fields)]);
    expect(errors("slider", { slides: [] })).toEqual(["Page \"Home\", block 1 (Slider): add a slide."]);
    expect(errors("slider", { slides: [{ heading: "" }] })).toEqual(['Page "Home", block 1 (Slider), slide 1: add an image or a heading.']);
    expect(errors("slider", { slides: Array.from({ length: 9 }, () => ({ heading: "x" })) })[0]).toContain("add at most 8 slides.");
    expect(errors("quick_links", { links: [{ icon: "Bad Icon", label: "", action: null }] })).toEqual([
      'Page "Home", block 1 (Quick links), link 1: choose an icon.',
      'Page "Home", block 1 (Quick links), link 1: add a label.',
      'Page "Home", block 1 (Quick links), link 1: choose what happens on tap.',
    ]);
    expect(errors("quick_links", { links: [{ icon: "home", label: "Cart", action: { type: "screen", screen: "cart" } }] })[0]).toContain('this app has no "Cart" screen');
    expect(errors("testimonials", { quotes: [{ text: "", name: "A", rating: 7 }] })).toEqual([
      'Page "Home", block 1 (Testimonials), quote 1: the rating must be 1 to 5 stars.',
      'Page "Home", block 1 (Testimonials), quote 1: add what they said.',
    ]);
    expect(errors("faq", { questions: [{ question: "Q?", answer: "" }] })).toEqual(['Page "Home", block 1 (Questions), question 1: add the answer.']);
    expect(errors("countdown", { heading: "Soon", ends_at: "someday" })).toEqual(['Page "Home", block 1 (Countdown): choose when the countdown ends.']);
    expect(errors("countdown", { heading: "Soon", ends_at: "2027-01-01T00:00:00Z", label: "Go" })).toEqual(['Page "Home", block 1 (Countdown): choose what the button opens, or remove its text.']);
    expect(errors("contact", {})).toEqual(['Page "Home", block 1 (Contact): add at least one way to reach you.']);
    expect(errors("contact", { phone: "call me", email: "nope", website: "javascript:alert(1)", latitude: 91 })).toEqual([
      'Page "Home", block 1 (Contact): the phone number must look like +20 100 123 4567.',
      'Page "Home", block 1 (Contact): the email address isn\'t valid.',
      'Page "Home", block 1 (Contact): enter the website\'s full address starting with https://.',
      'Page "Home", block 1 (Contact): the latitude must be a number from -90 to 90.',
    ]);
    expect(errors("contact", { address: "Here", latitude: 30 })).toEqual(['Page "Home", block 1 (Contact): enter both the latitude and the longitude, or neither.']);
    expect(errors("hours", { hours: [{ day: "mon", opens: "9am", closes: "17:00" }, { day: "funday", opens: "10:00", closes: "10:00" }], closed_dates: ["2026-02-30"] })).toEqual([
      'Page "Home", block 1 (Opening hours), time 1: times must look like 09:00 or 18:30.',
      'Page "Home", block 1 (Opening hours), time 2: choose the day.',
      'Page "Home", block 1 (Opening hours), time 2: the closing time must differ from the opening time.',
      'Page "Home", block 1 (Opening hours): 2026-02-30 isn\'t a date like 2026-12-31.',
    ]);
    expect(errors("hours", { hours: [] })).toEqual(['Page "Home", block 1 (Opening hours): add your opening times.']);
    expect(errors("social", { profiles: [{ network: "instagram", url: "https://i.test/a" }, { network: "instagram", url: "http://i.test/b" }] })).toEqual([
      'Page "Home", block 1 (Social links), profile 2: each network can be added once.',
      'Page "Home", block 1 (Social links), profile 2: enter the profile\'s full address starting with https://.',
    ]);
    expect(errors("team", { people: [{ name: "", photo_url: "ftp://x" }] })).toEqual([
      'Page "Home", block 1 (Team), person 1: add a name.',
      'Page "Home", block 1 (Team), person 1: The photo address must be a full https address.',
    ]);
    expect(errors("stats", { stats: [{ value: "1", label: "One" }] })).toEqual(['Page "Home", block 1 (Numbers): add at least 2 numbers.']);
    expect(errors("stats", { stats: Array.from({ length: 5 }, () => ({ value: "1", label: "x" })) })).toEqual(['Page "Home", block 1 (Numbers): add at most 4 numbers.']);
    expect(errors("notice", { tone: "loud", text: "" })).toEqual(['Page "Home", block 1 (Notice): add the notice\'s text.']);
    expect(first([b("notice", { tone: "loud", text: "Hi" })]).tone).toBe("info");
  });

  it("keeps entry translations of known texts only, within their limits", () => {
    const slider = first([b("slider", { slides: [{ heading: "Hi", translations: { ar: { heading: "مرحبا", html: "<b>x</b>" }, en: { heading: "ignored" }, xx: { heading: "?" } } }] })]);
    expect(slider.slides![0]!.translations).toEqual({ ar: { heading: "مرحبا" } });
    expect(errorsOf([b("stats", { stats: [{ value: "1", label: "a", translations: { tr: { value: "x".repeat(13) } } }, { value: "2", label: "b" }] })])).toEqual([
      'Page "Home", block 1 (Numbers), number 1: the tr text of value can have at most 12 characters.',
    ]);
  });

  it("is offered to every kind of app, with nothing about courses outside Academy apps", () => {
    const fresh = ["slider", "quick_links", "testimonials", "faq", "countdown", "contact", "hours", "social", "team", "stats", "notice"] as const;
    for (const appType of ["lms", "store", "booking", "real_estate", "news", "events", "donations"] as const) {
      for (const backend of ["hosted", "wordpress"] as const) {
        const types = blockTypesFor({ appType, backend });
        for (const type of fresh) expect(types, `${appType} ${type}`).toContain(type);
        expect(types.includes("continue_learning")).toBe(appType === "lms");
      }
    }
    // Every block type is in one group of "Add a block", with a label and a hint.
    expect(BLOCK_GROUPS.flatMap((g) => g.types).sort()).toEqual([...BLOCK_TYPES].sort());
    for (const type of BLOCK_TYPES) expect(BLOCK_LABELS[type] && BLOCK_HINTS[type], type).toBeTruthy();
  });

  it("starts each new block ready to fill in", () => {
    const screens = screenOptionsFor({ appType: "store" });
    expect(quickLinksFor(screens).map((l) => l.label)).toEqual(["All products", "Search", "Cart", "Orders"]);
    expect(newBlock("quick_links", ["products"], screens).links).toHaveLength(4);
    expect(newBlock("hours", ["products"]).hours).toHaveLength(5);
    expect(Date.parse(newBlock("countdown", ["products"]).ends_at!)).toBeGreaterThan(Date.now());
    // Blocks with only lists to fill are valid once their texts are written.
    const filled = { ...newBlock("stats", ["courses"]), stats: [{ value: "1", label: "a" }, { value: "2", label: "b" }] };
    expect(errorsOf([filled])).toEqual([]);
  });
});

describe("33 new blocks: links, languages and the plan", () => {
  const content = (): LayoutContent => {
    const parsed = parse(ALL_NEW, lmsHosted, [ABOUT]);
    if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
    return parsed.value;
  };

  it("follows a renamed page in quick links, slides, people and notices", () => {
    const renamed = renamePageLinks(content(), "about", "our-story");
    const blocks = renamed.pages[0]!.blocks;
    expect(blocks.find((x) => x.type === "quick_links")!.links![1]!.action).toEqual({ type: "page", page_slug: "our-story" });
    expect(blocks.find((x) => x.type === "notice")!.action).toEqual({ type: "page", page_slug: "our-story" });
    expect(pageLinks(content(), "about")).toEqual(["a block on Home"]);
  });

  it("marks a block whose entry opens a screen the app doesn't have", () => {
    // A layout from a Store app, opened after the app became an Academy app.
    const links = { ...content().pages[0]!.blocks.find((x) => x.type === "quick_links")!, links: [{ icon: "home", label: "Cart", action: { type: "screen" as const, screen: "cart" as const } }] };
    expect(blockProblem(links, screenOptionsFor({ appType: "lms" }), ["courses"])).toBe('This app has no "Cart" screen. Choose another screen.');
    expect(blockProblem(links, screenOptionsFor({ appType: "store" }), ["products"])).toBeNull();
    const person = { ...content().pages[0]!.blocks.find((x) => x.type === "team")!, people: [{ name: "A", role: null, bio: null, photo_url: null, action: { type: "course" as const, course_id: 3 } }] };
    expect(blockProblem(person, screenOptionsFor({ appType: "store" }), ["products"])).toBe("This app has no courses. Choose what happens on tap.");
  });

  it("swaps entry texts with their translations when the default language changes", () => {
    const swapped = switchDefaultLanguage(content(), "ar");
    const blocks = swapped.pages[0]!.blocks;
    const slide = blocks.find((x) => x.type === "slider")!.slides![0]!;
    expect(slide.heading).toBe("تخفيضات الخريف");
    expect(slide.translations).toEqual({ en: { heading: "Autumn sale", subheading: "Up to 30% off" } });
    // Without an Arabic text the English one stays, and becomes its translation.
    expect(blocks.find((x) => x.type === "stats")!.stats![1]).toMatchObject({ value: "4.9", translations: { en: { value: "4.9", label: "Rating" } } });
  });

  it("gives entries their texts in a language, without translations", () => {
    const team = content().pages[0]!.blocks.find((x) => x.type === "team")!;
    expect(translatedBlock(team, "ar", "en").people![0]).toEqual({ name: "د. آية", role: "Dentist", bio: "Ten years of smiles.", photo_url: null, action: null });
    expect(translatedBlock(team, "en", "en").people![0]!.name).toBe("Dr. Aya");
  });

  it("drops entries' links to lists the plan leaves out", () => {
    const wp = { ...newApp("c1", "https://shop.test", NOW, "store"), backend: "wordpress" as const };
    const blocks = [
      b("quick_links", {
        links: [
          { icon: "home", label: "Post", action: { type: "item", item: { source: "posts", id: "4" } } },
          { icon: "home", label: "Cart", action: { type: "screen", screen: "cart" } },
        ],
      }),
      b("slider", { slides: [{ heading: "A post", action: { type: "item", item: { source: "posts", id: "4" } } }] }),
    ];
    const parsed = parse(blocks, wp);
    if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
    const layout: Layout = { version: "v1", ...parsed.value };
    const limited: PlanInfo = { ...PLAN_INFO.growth, limits: { ...PLAN_INFO.growth.limits, sources: 1 } };
    const served = layoutForPlan(layout, wp, limited, BUILT_IN_APP_DEFAULTS);
    expect(served.pages[0]!.blocks[0]!.links!.map((l) => l.label)).toEqual(["Cart"]);
    expect(served.pages[0]!.blocks[1]!.slides![0]!.action).toBeNull();
    expect(layoutForPlan(layout, wp, PLAN_INFO.growth, BUILT_IN_APP_DEFAULTS)).toBe(layout);
  });
});

describe("33 new blocks on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let now: Date;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = { ...newApp(client.id, null, NOW, "lms"), backend: "hosted", appName: "Nile Academy" };
    await store.createApp(app);
    now = NOW;
  });

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender: new LogSender(),
    push: false,
    assetUrl: (id: string) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: null,
  });

  async function home(lang = "en"): Promise<HostedResult & { body: { blocks: Record<string, unknown>[] } }> {
    const result = await handleHosted(context(), {
      method: "GET",
      path: ["pages", "home"],
      query: new URLSearchParams({ platform: "android" }),
      body: undefined,
      token: null,
      headers: new Headers({ "accept-language": lang }),
    });
    expectContract("GET", "/pages/{slug}", result);
    return result as HostedResult & { body: { blocks: Record<string, unknown>[] } };
  }

  it("serves every new block in the app's shape, its entries in the language asked for", async () => {
    const extra = b("countdown", { id: "over", heading: "Was", ends_at: "2026-10-01T00:00:00Z", ended_text: "It's over." });
    const gone = b("countdown", { id: "gone", heading: "Gone", ends_at: "2026-10-01T00:00:00Z" });
    const published = await publishLayout(store, app, layoutWith([...ALL_NEW, { ...extra, id: "over" }, { ...gone, id: "gone" }], [ABOUT]), "owner@nile.test", NOW);
    expect(published.ok ? [] : published.errors).toEqual([]);

    const en = (await home()).body.blocks;
    // An ended countdown without a text after the end is left out.
    expect(en.map((x) => x.type)).toEqual(["slider", "quick_links", "testimonials", "faq", "countdown", "contact", "hours", "social", "team", "stats", "notice", "countdown"]);
    expect(en.at(-1)).toMatchObject({ id: "over", ended_text: "It's over." });
    expect(JSON.stringify(en)).not.toContain("translations");
    expect(JSON.stringify(en)).not.toContain("visibility");
    // Missing actions are left out, as `Action` isn't nullable.
    const slides = en[0]!.slides as Record<string, unknown>[];
    expect(slides[1]).toEqual({ image_url: null, heading: "New courses", subheading: null });

    const ar = (await home("ar")).body.blocks;
    expect((ar[0]!.slides as { heading: string }[])[0]!.heading).toBe("تخفيضات الخريف");
    expect((ar[1]!.links as { label: string }[]).map((l) => l.label)).toEqual(["الدورات", "About"]);
    expect((ar[3]!.questions as { question: string; answer: string }[])[0]).toEqual({ question: "كيف أبدأ؟", answer: "Enroll.\nThen learn." });
    expect(ar[5]!.address).toBe("١٢ شارع ٩، المعادي");
    expect(ar[10]!.text).toBe("مغلق يوم الجمعة");

    // After the end the countdown goes.
    now = new Date("2026-12-02T00:00:00Z");
    expect((await home()).body.blocks.filter((x) => x.type === "countdown").map((x) => x.id)).toEqual(["over"]);
  });
});
