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
    expect(premium.map((e) => e.preset ?? e.type).sort()).toEqual([...TYPES, "glass_card"].sort());
    expect(premium.every((e) => !e.only)).toBe(true);
    for (const dict of [en, ar, tr] as Record<string, unknown>[]) {
      expect(typeof dict.groupPremium).toBe("string");
      expect(typeof dict.preset_glass_card).toBe("string");
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
    expect(errors([{ id: "c", type: "cta_bar", text: "Go" }])).toContain("choose a bar or a floating button.");
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
