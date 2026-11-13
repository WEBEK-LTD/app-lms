import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ar, en, tr } from "@/i18n/dashboard/studio";
import { StudioView } from "@/components/studio/view";
import { newApp } from "@/lib/app/setup";
import { STUDIO_PREMIUM_CARD_TYPES, STUDIO_PREMIUM_CONTENT_TYPES, type StudioNode, type StudioPage } from "@/lib/pages/types";
import { translated } from "@/lib/pages/translate";
import { parseStudioPage } from "@/lib/pages/validate";
import { ELEMENTS, newNode } from "@/lib/studio/elements";
import { planPrice, statNumber } from "@/lib/studio/premium-content";

/**
 * 129.11–129.20 Studio's premium content, trust and commerce elements: in
 * the Premium group of the Elements panel, each starting as a valid
 * element (a plan's price left for the owner), checked strictly and kept
 * from known fields only, each entry's texts translated, drawn on the
 * canvas as the app draws them, and old pages unchanged.
 */

const NOW = new Date("2026-11-13T10:00:00Z");
const app = { ...newApp("c", null, NOW, "lms", null), section: "studio" as const };
const TYPES = [...STUDIO_PREMIUM_CONTENT_TYPES, ...STUDIO_PREMIUM_CARD_TYPES];

function parse(children: unknown[], languages = { default: "en", available: ["en", "ar"] }) {
  return parseStudioPage({ body: { id: "root", type: "column", children } }, app, languages);
}

function kept(children: unknown[]): StudioNode[] {
  const parsed = parse(children);
  expect(parsed.ok ? [] : parsed.errors).toEqual([]);
  return parsed.ok ? parsed.value.body.children! : [];
}

function errors(children: unknown[]): string {
  const parsed = parse(children);
  expect(parsed.ok).toBe(false);
  return parsed.ok ? "" : parsed.errors.join(" ");
}

let ids = 0;
const make = (type: StudioNode["type"], preset?: "glass_card") => newNode(type, { source: "courses", brand: "#1D2B4F", text: (w) => w, newId: () => `p${++ids}`, preset });

const WORDS = { price: "Price", addPicture: "Add a picture", addVideo: "Add a video", send: "Send", search: "Search", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds", copy: "Copy" };
const LOOK = { name: "Nour", logoUrl: null, brand: "#1D2B4F", accent: "#E8B04B", font: "Alexandria", tabs: [], activeTab: null };

function draw(children: StudioNode[], o: { dark?: boolean; lang?: string; editing?: boolean } = {}): string {
  const page: StudioPage = { body: { id: "root", type: "column", children } };
  const editing = o.editing
    ? { selectedId: null, hoveredId: null, drop: null, onSelect: () => {}, onHover: () => {}, onDragOver: () => {}, onDrop: () => {}, onDragStartNode: () => {}, dropLabel: "", tagOf: () => "" }
    : undefined;
  return renderToStaticMarkup(createElement(StudioView, { page, lang: o.lang ?? "en", defaultLang: "en", dark: o.dark ?? false, look: LOOK, pickable: { items: {}, categories: {} }, words: WORDS, editing }));
}

describe("129.11–129.20 the premium library in the editor", () => {
  it("offers every premium element and the glass card in the Premium group, named in every language", () => {
    const premium = ELEMENTS.filter((e) => e.group === "premium");
    // The one Premium group also holds the premium motion & media elements (129.1–129.8, studio-premium-motion.test.ts).
    expect(premium.map((e) => e.preset ?? e.type)).toEqual(expect.arrayContaining([...TYPES, "glass_card"]));
    expect(premium.every((e) => !e.only)).toBe(true);
    for (const dict of [en, ar, tr] as Record<string, unknown>[]) {
      expect(typeof dict.groupPremium).toBe("string");
      expect(typeof dict.el_glass_card).toBe("string");
      for (const t of TYPES) expect(typeof dict[`el_${t}`], t).toBe("string");
    }
  });

  it("has every word the premium controls and canvas ask for, in English, Arabic and Turkish", () => {
    const src = ["src/app/studio/editor/premium-controls.tsx", "src/app/studio/editor/editor.tsx"].map((f) => readFileSync(path.resolve(__dirname, "../..", f), "utf8")).join("\n");
    const keys = new Set([...src.matchAll(/studio\.(pm[a-z]*_\w+|pm_\w+)/g)].map((m) => m[1]!));
    // Keys built at run time: each style, each network, each entry list, each size.
    const dynamic = Object.keys(en).filter((k) => /^pm_(tst|rev|stats|progress|timeline|shape|badge|cta|net|entries|size)_/.test(k) || /^pm[wn]_/.test(k));
    expect(dynamic.length).toBeGreaterThan(60);
    for (const [lang, dict] of Object.entries({ en, ar, tr }) as [string, Record<string, unknown>][]) {
      expect([...keys, ...dynamic].filter((k) => !k.endsWith("_") && typeof dict[k] !== "string"), lang).toEqual([]);
    }
  });

  it("starts each element valid, with no price made up", () => {
    const nodes = [...TYPES.map((t) => make(t)), make("column", "glass_card")];
    const back = kept(nodes);
    expect(back.map((n) => n.type)).toEqual([...TYPES, "column"]);
    const pricing = back.find((n) => n.type === "pricing")!;
    expect(pricing.entries!.every((e) => e.price === undefined && e.price_yearly === undefined)).toBe(true);
    expect(pricing.entries!.filter((e) => e.highlight)).toHaveLength(1);
    expect(pricing.pricing).toEqual({ yearly: true });
    expect(back.find((n) => n.type === "cta_bar")).toMatchObject({ pin: "bottom", cta: { style: "bar" } });
    expect(back.find((n) => n.type === "cta_bar")!.title).toBeUndefined();
    expect(back.at(-1)!.surface).toMatchObject({ glass: 18, border: { from: "#FFFFFF", to: "#1D2B4F" }, soft: 2 });
    // A profile card holds its badges and buttons.
    expect(back.find((n) => n.type === "profile_card")!.children!.flatMap((c) => c.children!.map((x) => x.type))).toEqual(["badge_text", "badge_text", "button", "button"]);
  });
});

describe("129.11–129.20 checked strictly, kept from known fields only", () => {
  it("keeps a testimonial list with its options and each entry's translations", () => {
    const [node] = kept([
      {
        id: "q",
        type: "testimonials",
        testimonials: { style: "stacked", reviews: { source: "courses", id: "12" }, extra: 1 },
        entries: [{ text: " Great ", title: "Mona", subtitle: "Cairo", value: 5, image_url: "https://example.com/m.jpg", junk: "x", translations: { ar: { text: "رائع", title: "منى" } } }],
      },
    ]);
    expect(node!.testimonials).toEqual({ style: "stacked", reviews: { source: "courses", id: "12" } });
    expect(node!.entries).toEqual([{ text: "Great", title: "Mona", subtitle: "Cairo", value: 5, image_url: "https://example.com/m.jpg", translations: { ar: { text: "رائع", title: "منى" } } }]);
  });

  it("refuses stars over 5, a quote without words, and a list of nothing", () => {
    expect(errors([{ id: "q", type: "testimonials", entries: [{ text: "x", value: 6 }] }])).toContain("the number must be 0 to 5.");
    expect(errors([{ id: "q", type: "testimonials", entries: [{ title: "Mona" }] }])).toContain("each quote needs its words.");
    expect(errors([{ id: "q", type: "testimonials" }])).toContain("add a quote, or choose whose reviews it shows.");
    expect(errors([{ id: "s", type: "stats", entries: [] }])).toContain("add at least one entry.");
  });

  it("keeps prices as whole cents in a platform currency, and refuses others", () => {
    const [node] = kept([{ id: "p", type: "pricing", pricing: { currency: "EGP", yearly: true }, entries: [{ title: "Pro", price: 45000, price_yearly: null, highlight: true }] }]);
    expect(node!.pricing).toEqual({ currency: "EGP", yearly: true });
    expect(node!.entries).toEqual([{ title: "Pro", price: 45000, highlight: true }]);
    expect(errors([{ id: "p", type: "pricing", entries: [{ title: "Pro", price: 4.5 }] }])).toContain("a price is a whole number of cents");
    expect(errors([{ id: "p", type: "pricing", pricing: { currency: "XYZ" }, entries: [{ title: "Pro" }] }])).toContain("choose the plans' currency.");
    // The default currency is left out.
    expect(kept([{ id: "p", type: "pricing", pricing: { currency: "TRY" }, entries: [{ title: "Pro" }] }])[0]!.pricing).toBeUndefined();
  });

  it("bounds the lists: 12 entries, texts by their limits, shares 0 to 100", () => {
    const many = Array.from({ length: 13 }, () => ({ title: "x", value: 1 }));
    expect(errors([{ id: "s", type: "stats", entries: many }])).toContain("a list has at most 12 entries.");
    expect(errors([{ id: "b", type: "progress", entries: [{ title: "x", value: 101 }] }])).toContain("the number must be 0 to 100.");
    expect(errors([{ id: "t", type: "timeline", entries: [{ title: "x".repeat(121) }] }])).toContain("The title can have at most 120 characters.");
    expect(errors([{ id: "g", type: "bento", entries: [{ title: "x", size: "huge" }] }])).toContain("choose the tile's size.");
  });

  it("keeps a profile card's cover, shape and social links, once each, https only", () => {
    const [node] = kept([
      { id: "c", type: "profile_card", title: "Salma", text: "Teacher", image_url: "https://example.com/a.jpg", profile: { cover_url: "https://example.com/c.jpg", shape: "square", socials: [{ network: "instagram", url: "https://instagram.com/s" }] }, children: [] },
    ]);
    expect(node).toMatchObject({ title: "Salma", text: "Teacher", image_url: "https://example.com/a.jpg", profile: { cover_url: "https://example.com/c.jpg", shape: "square", socials: [{ network: "instagram", url: "https://instagram.com/s" }] } });
    expect(errors([{ id: "c", type: "profile_card", profile: { socials: [{ network: "instagram", url: "http://x.com" }] } }])).toContain("each social link needs its network, once, and its full https address.");
  });

  it("needs a badge's words and look, and a bar's look", () => {
    expect(errors([{ id: "b", type: "badge_text", badge: { style: "pill" } }])).toContain("add the badge's words.");
    expect(errors([{ id: "b", type: "badge_text", text: "New", badge: { style: "neon" } }])).toContain("choose how the badge looks.");
    expect(errors([{ id: "c", type: "cta_bar", text: "Go" }])).toContain("choose a bar, a card or a floating button.");
    const [badge, bar] = kept([
      { id: "b", type: "badge_text", text: "New", icon: "bolt", badge: { style: "text" }, translations: { ar: { text: "جديد" } } },
      { id: "c", type: "cta_bar", title: "₺450", text: "Order", cta: { style: "fab" }, pin: "bottom", action: { type: "screen", screen: "courses" } },
    ]);
    expect(badge).toMatchObject({ text: "New", icon: "bolt", badge: { style: "text" }, translations: { ar: { text: "جديد" } } });
    expect(bar).toMatchObject({ title: "₺450", text: "Order", cta: { style: "fab" }, pin: "bottom", action: { type: "screen", screen: "courses" } });
  });

  it("keeps a layout's premium card style, bounded, and on layouts only", () => {
    const [node] = kept([{ id: "g", type: "column", surface: { glass: 18, tint: 0.2, border: { from: "#ffffff", to: "#E8B04B", width: 2 }, glow: "#E8B04B", soft: 3, extra: 1 }, children: [] }]);
    expect(node!.surface).toEqual({ glass: 18, tint: 0.2, border: { from: "#FFFFFF", to: "#E8B04B", width: 2 }, glow: "#E8B04B", soft: 3 });
    expect(errors([{ id: "g", type: "column", surface: { glass: 80 }, children: [] }])).toContain("the glass's blur must be 4 to 40.");
    expect(errors([{ id: "g", type: "row", surface: { soft: 4 }, children: [] }])).toContain("choose a soft shadow of level 1, 2 or 3.");
    // Not a layout: not kept.
    expect(kept([{ id: "t", type: "text", text: "x", surface: { glass: 10 } }])[0]!.surface).toBeUndefined();
  });

  it("leaves an old page as it was", () => {
    const old = [{ id: "c", type: "column", radius: 20, background: "#FFFFFF", children: [{ id: "t", type: "text", text: "As before" }] }];
    expect(kept(old)).toEqual([{ id: "c", type: "column", radius: 20, background: "#FFFFFF", children: [{ id: "t", type: "text", text: "As before" }] }]);
  });
});

describe("129.11–129.20 served and drawn", () => {
  it("serves each entry's texts in the language asked for", () => {
    const entry = { title: "Pro", text: "One", translations: { ar: { title: "برو", text: "" } } };
    expect(translated(entry, "ar", "en")).toEqual({ title: "برو", text: "One" });
    const hosted = readFileSync(path.resolve(__dirname, "../../src/lib/hosted/pages/index.ts"), "utf8");
    expect(hosted).toContain("entries: own.entries.map((entry) => translated(entry, pc.lang, def))");
  });

  it("writes prices as the platform writes them, cents only when there are some", () => {
    expect(planPrice(45000, undefined)).toBe("₺450");
    expect(planPrice(45050, { currency: "USD" })).toBe("$450.50");
    expect(planPrice(null, undefined)).toBeNull();
    expect(statNumber(12500)).toBe("12,500");
    expect(statNumber(4.94)).toBe("4.9");
  });

  it("draws each element on the canvas, light, dark and in Arabic", () => {
    const nodes = TYPES.map((t) => make(t));
    for (const o of [{}, { dark: true }, { lang: "ar" }]) {
      const html = draw(nodes, o);
      for (const n of nodes) expect(html, `${n.type} ${JSON.stringify(o)}`).toContain(`data-studio-node="${n.id}"`);
      expect(html).toContain('data-studio-testimonials="carousel"');
      expect(html).toContain('data-studio-pricing=""');
      expect(html).toContain('data-studio-stats="plain"');
      expect(html).toContain('data-studio-progress="bars"');
      expect(html).toContain('data-studio-timeline="vertical"');
      expect(html).toContain('data-studio-profile-card=""');
      expect(html).toContain('data-studio-bento=""');
      expect(html).toContain('data-studio-badge="gradient"');
      expect(html).toContain('data-studio-cta="bar"');
    }
    expect(draw(nodes, { lang: "ar" })).toContain('dir="rtl"');
  });

  it("shows an empty price and a missing label to the owner only", () => {
    const nodes = [make("pricing"), make("cta_bar")];
    expect(draw(nodes, { editing: true })).toContain("data-studio-premium-placeholder");
    expect(draw(nodes)).not.toContain("data-studio-premium-placeholder");
    expect(draw(nodes)).not.toContain("₺");
  });

  it("draws a set price, the popular plan, rings, steps across and a glass card", () => {
    const html = draw([
      { id: "p", type: "pricing", entries: [{ title: "Pro", price: 59900, highlight: true, text: "A\nB" }] },
      { id: "r", type: "progress", progress: { style: "rings" }, entries: [{ title: "Lessons", value: 80 }] },
      { id: "t", type: "timeline", timeline: { style: "horizontal" }, entries: [{ title: "A", highlight: true }, { title: "B" }] },
      { ...make("column", "glass_card"), id: "g" },
    ]);
    expect(html).toContain("₺599");
    expect(html).toContain('data-studio-plan="popular"');
    expect(html).toContain('data-studio-progress="rings"');
    expect(html).toContain('data-studio-timeline="horizontal"');
    expect(html).toContain('aria-current="step"');
    expect(html).toMatch(/data-studio-node="g"/);
    expect(html).toContain("backdrop-filter:blur(18px)");
  });
});

describe("129 what the Signature boards need, as generic options", () => {
  it("keeps a ring's size, ticks and knob, segments, and bounds them", () => {
    const [ring, lessons] = kept([
      { id: "r", type: "progress", progress: { style: "rings", size: 226, stroke: 8, ticks: 18, knob: true }, entries: [{ value: 61, image_url: "https://example.com/p.jpg", subtitle: "Lesson 12 of 18", gradient: { from: "#E6C26E", to: "#B8862F" } }] },
      { id: "s", type: "progress", progress: { style: "segments", segments: 18 }, entries: [{ value: 61 }] },
    ]);
    expect(ring!.progress).toEqual({ style: "rings", size: 226, stroke: 8, ticks: 18, knob: true });
    expect(ring!.entries![0]).toMatchObject({ image_url: "https://example.com/p.jpg", subtitle: "Lesson 12 of 18" });
    expect(lessons!.progress).toEqual({ style: "segments", segments: 18 });
    expect(errors([{ id: "r", type: "progress", progress: { size: 600 }, entries: [{ value: 1 }] }])).toContain("a ring's size must be 40 to 320.");
    expect(errors([{ id: "r", type: "progress", progress: { ticks: 100 }, entries: [{ value: 1 }] }])).toContain("the tick marks must be 0 to 60.");
  });

  it("keeps a day's times column, its active card, monospaced dates, and a trip's legs", () => {
    const [day, trip] = kept([
      { id: "d", type: "timeline", timeline: { times: true, card: true, mono: true }, entries: [{ title: "Maths", subtitle: "08:00", label: "NOW", value: 40, highlight: true }] },
      { id: "t", type: "timeline", timeline: { style: "bars" }, entries: [{ title: "Tue 17", subtitle: "SFR 471", icon: "flight" }] },
    ]);
    expect(day!.timeline).toEqual({ times: true, mono: true, card: true });
    expect(day!.entries![0]).toMatchObject({ label: "NOW", value: 40 });
    expect(trip!.timeline).toEqual({ style: "bars" });
  });

  it("keeps a hero number's options, bento captions and rows, a card bar's icon", () => {
    const [hero, grid, sign] = kept([
      { id: "h", type: "stats", stats: { still: true, start: true }, font: { size: 96, weight: 900 }, entries: [{ value: 6, suffix: " min" }] },
      { id: "b", type: "bento", bento: { caption: "glass", row: 96 }, columns: 3, entries: [{ title: "Grill", size: "full", subtitle: "EGP 240" }] },
      { id: "c", type: "cta_bar", cta: { style: "card", lead: "draw" }, title: "Sign: Science museum trip\nNext Thursday", text: "Sign" },
    ]);
    expect(hero!.stats).toEqual({ still: true, start: true });
    expect(hero!.font).toMatchObject({ size: 96 });
    expect(grid!.bento).toEqual({ caption: "glass", row: 96 });
    expect(grid!.entries![0]!.size).toBe("full");
    expect(sign!.cta).toEqual({ style: "card", lead: "draw" });
    expect(sign!.title).toBe("Sign: Science museum trip\nNext Thursday");
    expect(errors([{ id: "b", type: "bento", bento: { caption: "neon" }, entries: [{ title: "x" }] }])).toContain("choose how the tiles' words sit.");
  });

  it("keeps a ticket's perforation and a texture on any layout, bounded", () => {
    const [pass] = kept([{ id: "p", type: "column", surface: { ticket: { at: 58, axis: "vertical", notch: 12 }, pattern: "grain", pattern_strength: 0.12 }, children: [] }]);
    expect(pass!.surface).toEqual({ ticket: { at: 58, axis: "vertical", notch: 12 }, pattern: "grain", pattern_strength: 0.12 });
    expect(errors([{ id: "p", type: "column", surface: { ticket: { at: 100 } }, children: [] }])).toContain("a ticket needs where its perforation is");
    expect(errors([{ id: "p", type: "column", surface: { pattern: "plaid" }, children: [] }])).toContain("choose the texture.");
  });

  it("draws a ring's ticks and knob around its photo, segments, a ticket's notches and line, and a texture", () => {
    const html = draw([
      { id: "r", type: "progress", progress: { style: "rings", size: 226, ticks: 18, knob: true }, entries: [{ value: 61, image_url: "https://example.com/p.jpg", subtitle: "Lesson 12 of 18" }] },
      { id: "s", type: "progress", progress: { style: "segments", segments: 18 }, entries: [{ value: 61 }] },
      { id: "p", type: "column", surface: { ticket: { at: 58 }, pattern: "dots" }, children: [] },
      { id: "t", type: "timeline", timeline: { times: true, card: true, mono: true }, entries: [{ title: "Maths", subtitle: "08:00", label: "NOW", value: 40, highlight: true }] },
      { id: "c", type: "cta_bar", cta: { style: "card", lead: "draw" }, title: "Sign\nNext Thursday", text: "Sign" },
    ]);
    expect(html.match(/<line /g)).toHaveLength(18);
    expect(html).toContain("data-studio-progress-knob");
    expect(html).toContain("Lesson 12 of 18");
    expect(html).toContain('data-studio-progress="segments"');
    expect(html).toContain('data-studio-ticket="horizontal"');
    expect(html).toContain("radial-gradient(circle at 0 58%");
    expect(html).toContain('data-studio-pattern="dots"');
    expect(html).toContain("data-studio-step-card");
    expect(html).toContain("JetBrains Mono");
    expect(html).toContain('data-studio-cta="card"');
  });

  it("draws the small dock: icons only, the open one a filled circle", () => {
    const page: StudioPage = { body: { id: "root", type: "column", children: [] } };
    const tabs = [
      { id: "home", label: "Home", icon: "home", target: { type: "page" as const, page_slug: "home" } },
      { id: "me", label: "Account", icon: "person", target: { type: "screen" as const, screen: "account" as const } },
    ];
    const html = renderToStaticMarkup(createElement(StudioView, { page, lang: "en", defaultLang: "en", dark: false, look: { ...LOOK, tabs, activeTab: "home", tabBar: { design: "dock" } }, pickable: { items: {}, categories: {} }, words: WORDS }));
    expect(html).toContain('data-studio-tab-bar-design="dock"');
    expect(html.match(/data-studio-tab-design="dock"/g)).toHaveLength(2);
    expect(html).not.toContain("data-studio-tab-name");
  });
});
