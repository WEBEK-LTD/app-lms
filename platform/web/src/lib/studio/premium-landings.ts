import type { ItemSource, StudioEntry, StudioHeader, StudioHeaderButton, StudioHeaderStyle, StudioHeaderType, StudioNode, StudioPage, Translations } from "../pages/types";
import { sortFor } from "../pages/sources";
import type { AppWord } from "./app-words";
import {
  DISPLAY_FONT,
  LANGS,
  MONO_FONT,
  badge,
  bento,
  button,
  gallery,
  head,
  inkOf,
  items,
  liveCard,
  makerOf,
  mutedOf,
  pad,
  packSteps,
  packWord,
  rise,
  slide,
  stories,
  surfaceOf,
  testimonials,
  text,
  ticker,
  type Field,
  type Maker,
  type PremiumPalette,
} from "./premium-designs";
import type { SectionContext, SectionInfo, TemplateInfo } from "./sections";

/**
 * 130.62 New premium landings: six home pages any project adds from
 * Studio's page templates (and their openings from its ready sections),
 * each its own composition of the premium library (Phase 129): a cinematic
 * photo cover with a story slider and the owner's numbers, a split
 * editorial opening over a ticker of the kind's places, an immersive
 * stories-first home, a bento dashboard round the person's live card, a
 * magazine cover over a parallax banner, and one hero product with a
 * sticky button. Kind-aware: the photos, words, screens and live card are
 * the project's kind's (as the premium whole designs', lib/studio/
 * premium-designs.ts), the lists the kind's own source. In the project's
 * own main colour, with a designed night; the facts are the owner's
 * [brackets] (no number, price or review invented); the words the app's
 * (lib/studio/app-words.ts), in the dashboard's language with the others
 * as translations.
 */

export const LANDING_IDS = ["land_cinema", "land_split", "land_stories", "land_bento", "land_magazine", "land_luxe"] as const;
export type LandingId = (typeof LANDING_IDS)[number];

// ——— The project's colour, by day and by night ———

const hex = (c: string) => (/^#[0-9a-f]{6}$/i.test(c) ? c.toUpperCase() : "#1F4E5F");
/** `a` toward `b` by `t` (0 to 1). */
function mix(a: string, b: string, t: number): string {
  const x = hex(a);
  const y = hex(b);
  const ch = (s: string, i: number) => parseInt(s.slice(i, i + 2), 16);
  return `#${[1, 3, 5]
    .map((i) => Math.round(ch(x, i) + (ch(y, i) - ch(x, i)) * t))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

/** A landing's palette: the project's main colour on quiet neutrals, a night designed round it (never inverted). */
export function landingPalette(brand: string): PremiumPalette {
  const b = hex(brand);
  return {
    brand: b,
    darkBrand: mix(b, "#FFFFFF", 0.35),
    accent: mix(b, "#FFFFFF", 0.55),
    deep: mix(b, "#000000", 0.72),
    page: "#FAFAF7",
    darkPage: "#0E0F12",
    surface: "#FFFFFF",
    darkSurface: "#191B20",
    ink: "#121316",
    darkInk: "#F3F3F0",
    muted: "#64666D",
    darkMuted: "#A2A4AB",
    line: "#E7E7E2",
    darkLine: "#2A2C33",
    shade: mix(b, "#000000", 0.88),
  };
}

function makerFor(ctx: SectionContext): Maker {
  return makerOf(ctx, ctx.kind ?? null, landingPalette(ctx.brand));
}

/** A landing's header: its premium style in the page's colours by day and by night. */
function header(m: Maker, type: StudioHeaderType, style: StudioHeaderStyle | null, buttons: StudioHeaderButton[]): StudioHeader {
  const { c } = m;
  if (!style) return { type, buttons };
  const colours = style === "brand" ? { background: c.brand, dark_background: c.deep, color: "#FFFFFF", dark_color: "#FFFFFF" } : { background: c.page, dark_background: c.darkPage, color: c.ink, dark_color: c.darkInk };
  return { type, buttons, ...colours, style };
}

function landing(m: Maker, top: StudioHeader, children: StudioNode[]): StudioPage {
  return { header: top, background: m.c.page, dark_background: m.c.darkPage, body: { id: m.id(), type: "column", padding: pad(0, 0, 28, 0), children } };
}

/** A small kicker in capitals in the mono face. */
function kicker(m: Maker, word: AppWord, color: string, dark = color): StudioNode {
  return text(m, word, { color, dark_color: dark, max_lines: 1, font: { size: 11.5, weight: 700, letter_spacing: 2.2, uppercase: true, family: MONO_FONT } });
}

/** The owner's numbers, set large: theirs to fill in, in [brackets] ("[Number] customers"), never a number made up. */
function numbers(m: Maker): StudioNode[] {
  const { c } = m;
  const cell = (w: AppWord): StudioNode => ({
    id: m.id(),
    type: "column",
    width: "fill",
    gap: 4,
    padding: pad(14, 12),
    radius: 18,
    ...surfaceOf(m),
    border_color: c.line,
    dark_border_color: c.darkLine,
    border_width: 1,
    children: [text(m, w, { max_lines: 3, font: { size: 15, weight: 800, line_height: 1.2, family: DISPLAY_FONT }, color: c.brand, dark_color: c.darkBrand })],
  });
  return [head(m, "pdLdNumbers", null), { id: m.id(), type: "row", gap: 10, padding: pad(0, 16), children: [cell("statsOne"), cell("statsTwo"), cell("statsThree")], motion: rise() }];
}

/** The kind's four places as one line of words, for a ticker, in every language. */
function placesLine(m: Maker): { value: string; translations: Translations } {
  const all = [1, 2, 3, 4].map((i) => m.say(packWord(m.p, `S${i}` as Field)));
  const translations: Translations = {};
  for (const l of LANGS) if (l !== m.lang) translations[l] = { text: all.map((s) => s.translations[l]!.text!).join("\n") };
  return { value: all.map((s) => s.value).join("\n"), translations };
}

// ——— 1 · Cinema: the photo cover, the stories, the story slider, the numbers ———

function cinemaCover(m: Maker): StudioNode {
  const { c } = m;
  return {
    id: m.id(),
    type: "photo_hero",
    image_url: m.photo(0),
    ken_burns: true,
    height: 600,
    background: c.deep,
    scrim: { color: c.shade, from: 0.45, middle: 0.06, at: 38, to: 0.94 },
    align: "end",
    gap: 12,
    padding: pad(24, 22, 34, 22),
    children: [
      badge(m, packWord(m.p, "Kicker"), "glass", { icon: "play_circle", color: "#FFFFFF", self_align: "start" }),
      text(m, packWord(m.p, "Headline"), { color: "#FFFFFF", font: { size: 44, weight: 800, line_height: 1.0, letter_spacing: -1.4, family: DISPLAY_FONT } }),
      text(m, packWord(m.p, "Line"), { color: "#FFFFFF", opacity: 0.85, font: { size: 15, line_height: 1.4 } }),
      { ...button(m, packWord(m.p, "Cta"), m.main, { background: "#FFFFFF", color: c.ink, icon: "arrow_forward", height: 50 }), margin: pad(6, 0, 0, 0) },
    ],
  };
}

function storySlider(m: Maker): StudioNode {
  const { c } = m;
  return {
    id: m.id(),
    type: "slider",
    height: 300,
    per_view: 1.12,
    gap: 12,
    autoplay: true,
    interval_ms: 5000,
    indicator: "progress",
    indicator_look: { at: "top", inset: 16, color: "#FFFFFF", count: "padded" },
    ken_burns: true,
    padding: pad(0, 0, 0, 16),
    margin: pad(0, 0, 4, 0),
    children: [1, 2, 3].map((i) => slide(m, i, { height: 300, radius: 26, kicker: packWord(m.p, "Kicker"), title: packWord(m.p, `S${i}` as Field), button: false, gold: c.accent, size: 26 })),
  };
}

function cinema(ctx: SectionContext): StudioPage {
  const m = makerFor(ctx);
  return landing(m, header(m, "transparent", null, ["notifications", "account"]), [
    cinemaCover(m),
    stories(m, "highlight", 70),
    head(m, "pdLdStories", null, { top: 14 }),
    storySlider(m),
    ...numbers(m),
    ...liveCard(m),
    ...items(m, "photo"),
    ...testimonials(m, "carousel"),
  ]);
}

// ——— 2 · Split editorial: words beside an arched photo, a ticker of the kind's places ———

function splitHero(m: Maker): StudioNode[] {
  const { c } = m;
  const words: StudioNode = {
    id: m.id(),
    type: "column",
    width: "fill",
    gap: 12,
    align: "center",
    children: [
      kicker(m, packWord(m.p, "Kicker"), c.brand, c.darkBrand),
      text(m, packWord(m.p, "Headline"), { font: { size: 32, weight: 800, line_height: 1.02, letter_spacing: -1.1, family: DISPLAY_FONT }, ...inkOf(m) }),
      text(m, packWord(m.p, "Line"), { font: { size: 14, line_height: 1.45 }, ...mutedOf(m) }),
      { ...button(m, packWord(m.p, "Cta"), m.main, { background: c.brand, darkBackground: c.darkBrand, color: "#FFFFFF", darkColor: c.darkPage, icon: "arrow_forward" }), margin: pad(4, 0, 0, 0) },
    ],
  };
  // The kind's photo in an arch; without the platform's photos, the arch in the project's colours.
  const shape = { width: 136, height: 300, corners: { top_start: 74, top_end: 74, bottom_end: 18, bottom_start: 18 } } as const;
  const photo = m.photo(0);
  const arch: StudioNode = photo
    ? { id: m.id(), type: "image", image_url: photo, fit: "cover", background: c.deep, dark_background: c.deep, ken_burns: true, ...shape }
    : { id: m.id(), type: "row", gradient: { from: c.brand, to: c.deep, angle: 160 }, children: [], ...shape };
  const line = placesLine(m);
  const band: StudioNode = {
    id: m.id(),
    type: "marquee",
    text: line.value,
    translations: line.translations,
    gap: 14,
    font: { size: 15, weight: 800, family: DISPLAY_FONT },
    padding: pad(12, 0),
    margin: pad(18, 0, 6, 0),
    marquee: { speed: 32, chips: true },
    color: c.ink,
    dark_color: c.darkInk,
    border_color: c.line,
    dark_border_color: c.darkLine,
  };
  return [{ id: m.id(), type: "row", gap: 16, cross: "center", padding: pad(10, 20, 4, 20), children: [words, arch], motion: rise() }, band];
}

function split(ctx: SectionContext): StudioPage {
  const m = makerFor(ctx);
  return landing(m, header(m, "logo_actions", "glass", ["search", "notifications", "account"]), [
    ...splitHero(m),
    ...liveCard(m),
    ...items(m, "editorial", { limit: 4 }),
    head(m, "pdLook", null),
    ...gallery(m, "bento"),
    ...testimonials(m, "stacked"),
  ]);
}

// ——— 3 · Stories first: large rings, then the first story full-bleed ———

function storiesOpening(m: Maker): StudioNode[] {
  const { c } = m;
  const cover: StudioNode = {
    id: m.id(),
    type: "photo_hero",
    image_url: m.photo(1),
    ken_burns: true,
    height: 520,
    radius: 30,
    margin: pad(6, 12, 0, 12),
    background: c.deep,
    scrim: { color: c.shade, from: 0.1, middle: 0.04, at: 45, to: 0.9 },
    align: "end",
    gap: 10,
    padding: pad(20, 22, 30, 22),
    ...(m.opens(0) ? { action: m.opens(0) } : {}),
    children: [
      { id: m.id(), type: "row", height: 4, width: 64, radius: 2, background: "#FFFFFF", dark_background: "#FFFFFF", opacity: 0.9, children: [] },
      kicker(m, packWord(m.p, "S1"), c.accent),
      text(m, packWord(m.p, "Headline"), { color: "#FFFFFF", font: { size: 36, weight: 800, line_height: 1.04, letter_spacing: -1, family: DISPLAY_FONT } }),
      { ...button(m, packWord(m.p, "Cta"), m.main, { background: "#FFFFFF", color: c.ink, icon: "arrow_forward" }), margin: pad(4, 0, 0, 0) },
    ],
    motion: rise(),
  };
  return [{ ...stories(m, "highlight", 84), padding: pad(14, 16, 10, 16) }, cover];
}

function storiesFirst(ctx: SectionContext): StudioPage {
  const m = makerFor(ctx);
  const { c } = m;
  return landing(m, header(m, "logo_actions", "brand", ["search", "notifications", "account"]), [
    ...storiesOpening(m),
    ...liveCard(m),
    head(m, "pdLook", null),
    ...gallery(m, "filmstrip"),
    ...items(m, "tall"),
    ticker(m, { background: c.brand, dark_background: c.deep, color: "#FFFFFF", dark_color: "#FFFFFF" }),
  ]);
}

// ——— 4 · Bento dashboard: the person's live card, the kind's places as tiles, what's new ———

function bentoOpening(m: Maker): StudioNode[] {
  const { c } = m;
  const live = liveCard(m, pad(10, 16, 4, 16));
  const news: StudioNode = {
    id: m.id(),
    type: "photo_hero",
    image_url: m.photo(4),
    height: 210,
    radius: 26,
    margin: pad(10, 16, 0, 16),
    background: c.deep,
    scrim: { color: c.shade, from: 0.05, to: 0.5 },
    align: "end",
    padding: pad(14, 14),
    children: [
      {
        id: m.id(),
        type: "column",
        gap: 6,
        radius: 20,
        padding: pad(14, 14),
        surface: { glass: 18, tint: 0.22, border: { from: "#FFFFFF", to: c.accent } },
        color: "#FFFFFF",
        children: [
          kicker(m, "pdLdNew", "#FFFFFF"),
          text(m, "pdLdNewLine", { color: "#FFFFFF", font: { size: 16, weight: 700, line_height: 1.3 } }),
        ],
      },
    ],
    motion: rise(),
  };
  return [...live, { ...bento(m, { caption: "plain", photos: false, row: 104 }), margin: pad(12, 16, 4, 16) }, news];
}

function dashboard(ctx: SectionContext): StudioPage {
  const m = makerFor(ctx);
  return landing(m, header(m, "greeting", null, ["notifications", "account"]), [...bentoOpening(m), ...items(m, "grid", { limit: 4 }), ...stepsOf(m)]);
}

/** How it works, across. */
function stepsOf(m: Maker): StudioNode[] {
  const entries: StudioEntry[] = packSteps(m.p).map((w, i) => {
    const s = m.say(w, "title");
    return { title: s.value, subtitle: `0${i + 1}`, translations: s.translations, ...(i === 0 ? { highlight: true } : {}) };
  });
  return [head(m, "stepsTitle", null), { id: m.id(), type: "timeline", timeline: { style: "horizontal", mono: true }, ...inkOf(m), margin: pad(0, 16, 8, 16), entries, motion: rise() }];
}

// ——— 5 · Magazine cover: the masthead, the cover on a parallax banner, the index ———

function masthead(m: Maker): StudioNode[] {
  const { c } = m;
  const name = m.ctx.app ? { id: m.id(), type: "text" as const, text: m.ctx.app } : text(m, packWord(m.p, "Kicker"), {});
  const rule = (): StudioNode => ({ id: m.id(), type: "row", height: 1, background: c.ink, dark_background: c.darkInk, children: [] });
  const cover: StudioNode = {
    id: m.id(),
    type: "parallax_banner",
    image_url: m.photo(0),
    parallax: { speed: 0.5 },
    height: 440,
    margin: pad(14, 0, 0, 0),
    background: c.deep,
    scrim: { color: c.shade, from: 0.1, middle: 0.05, at: 40, to: 0.88 },
    align: "end",
    gap: 10,
    padding: pad(20, 22, 28, 22),
    children: [
      kicker(m, packWord(m.p, "Kicker"), c.accent),
      text(m, packWord(m.p, "Headline"), { color: "#FFFFFF", font: { size: 40, weight: 800, line_height: 1.0, letter_spacing: -1.2, family: DISPLAY_FONT } }),
      text(m, packWord(m.p, "Line"), { color: "#FFFFFF", opacity: 0.85, font: { size: 14, line_height: 1.4 } }),
    ],
  };
  return [
    {
      id: m.id(),
      type: "column",
      gap: 8,
      padding: pad(8, 20, 0, 20),
      children: [
        rule(),
        { ...name, text_align: "center", max_lines: 1, font: { size: 46, weight: 800, letter_spacing: -1.6, line_height: 1.05, uppercase: true, family: DISPLAY_FONT }, ...inkOf(m) },
        { id: m.id(), type: "row", align: "between", children: [kicker(m, "pdLdIssue", c.muted, c.darkMuted), kicker(m, packWord(m.p, "S1"), c.brand, c.darkBrand)] },
        rule(),
      ],
    },
    cover,
  ];
}

function magazine(ctx: SectionContext): StudioPage {
  const m = makerFor(ctx);
  const { c } = m;
  return landing(m, header(m, "logo_actions", "glass", ["search", "account"]), [
    ...masthead(m),
    ticker(m, { chips: true, background: c.page, dark_background: c.darkPage, color: c.ink, dark_color: c.darkInk, margin: pad(16, 0, 0, 0) }),
    ...liveCard(m),
    ...items(m, "editorial", { limit: 5 }),
    head(m, "pdLook", null),
    ...gallery(m, "masonry", true),
    ...testimonials(m, "stacked"),
  ]);
}

// ——— 6 · Minimal luxe: one hero product, a few quiet words, a sticky button ———

function heroProduct(m: Maker): StudioNode[] {
  const { c } = m;
  const intro: StudioNode = {
    id: m.id(),
    type: "column",
    gap: 10,
    cross: "center",
    padding: pad(26, 28, 10, 28),
    children: [
      { ...kicker(m, "pdLdPick", c.brand, c.darkBrand), text_align: "center" },
      text(m, packWord(m.p, "Headline"), { text_align: "center", font: { size: 38, weight: 700, line_height: 1.04, letter_spacing: -1.2, family: DISPLAY_FONT }, ...inkOf(m) }),
    ],
    motion: rise(),
  };
  const source = m.ctx.source;
  // The list's first featured entry, large, its name and price under it as the app has them; without a list, the kind's photo.
  const one: StudioNode = source
    ? {
        id: m.id(),
        type: "items",
        source: source as ItemSource,
        layout: "list",
        gap: 0,
        padding: pad(0, 20, 4, 20),
        query: { limit: 1, category_id: null, featured: true, sort: sortFor(source as ItemSource, "popular"), ids: [] },
        card: {
          id: m.id(),
          type: "column",
          gap: 12,
          cross: "center",
          children: [
            { id: m.id(), type: "image", bind: "image", width: "fill", height: 360, radius: 32, fit: "cover" },
            { id: m.id(), type: "text", bind: "title", max_lines: 2, text_align: "center", font: { size: 20, weight: 700, family: DISPLAY_FONT }, ...inkOf(m) },
            { id: m.id(), type: "text", bind: "price", max_lines: 1, text_align: "center", font: { size: 14, weight: 600, family: MONO_FONT }, color: c.brand, dark_color: c.darkBrand },
          ],
        },
        motion: rise(),
      }
    : m.photo(0)
      ? { id: m.id(), type: "image", image_url: m.photo(0), width: "fill", height: 360, radius: 32, fit: "cover", margin: pad(0, 20), background: c.deep, dark_background: c.deep, motion: rise() }
      : { id: m.id(), type: "row", width: "fill", height: 360, radius: 32, margin: pad(0, 20), gradient: { from: c.brand, to: c.deep, angle: 160 }, children: [], motion: rise() };
  return [intro, one, text(m, packWord(m.p, "Line"), { text_align: "center", padding: pad(14, 36, 6, 36), font: { size: 14.5, line_height: 1.55 }, ...mutedOf(m) })];
}

function luxe(ctx: SectionContext): StudioPage {
  const m = makerFor(ctx);
  const { c } = m;
  const promises: StudioNode = {
    id: m.id(),
    type: "row",
    gap: 8,
    align: "center",
    padding: pad(10, 16, 4, 16),
    children: (["pdPromise1", "pdPromise2"] as const).map((w) => badge(m, w, "outline", { color: c.ink, dark_color: c.darkInk })),
  };
  const kick = m.say(packWord(m.p, "Kicker"), "title");
  const cta = m.say(packWord(m.p, "Cta"));
  const translations: Translations = {};
  for (const l of LANGS) if (l !== m.lang) translations[l] = { ...kick.translations[l], ...cta.translations[l] };
  // Pinned to the foot while the page scrolls, above the bar.
  const sticky: StudioNode = {
    id: m.id(),
    type: "cta_bar",
    title: kick.value,
    text: cta.value,
    translations,
    cta: { style: "bar" },
    pin: "bottom",
    icon: "arrow_forward",
    // Its button in the project's colour; the bar the page's card.
    background: c.brand,
    dark_background: c.brand,
    color: c.ink,
    dark_color: c.darkInk,
    ...(m.main ? { action: m.main } : {}),
  };
  return landing(m, header(m, "logo_center", "glass", ["menu", "account"]), [...heroProduct(m), promises, ...testimonials(m, "carousel"), sticky]);
}

// ——— The templates and the sections ———

const MAKE: Record<LandingId, (ctx: SectionContext) => StudioPage> = { land_cinema: cinema, land_split: split, land_stories: storiesFirst, land_bento: dashboard, land_magazine: magazine, land_luxe: luxe };
const ICONS: Record<LandingId, string> = { land_cinema: "movie", land_split: "view_column", land_stories: "amp_stories", land_bento: "space_dashboard", land_magazine: "auto_stories", land_luxe: "workspace_premium" };
/** Each landing's opening, as a ready section to drop on any page. */
const OPENINGS: Record<LandingId, (m: Maker) => StudioNode[]> = {
  land_cinema: (m) => [cinemaCover(m), stories(m, "highlight", 70)],
  land_split: splitHero,
  land_stories: storiesOpening,
  land_bento: bentoOpening,
  land_magazine: masthead,
  land_luxe: heroProduct,
};

/** 130.62 The six landings as page templates, for every project, marked new. */
export const LANDING_TEMPLATES: readonly TemplateInfo[] = LANDING_IDS.map((id) => ({ id, icon: ICONS[id], isNew: true, make: MAKE[id] }));

/** 130.62 Their openings as ready sections, for every project, marked new. */
export const LANDING_SECTIONS: readonly SectionInfo[] = LANDING_IDS.map((id) => ({
  id,
  icon: ICONS[id],
  isNew: true,
  make: (ctx: SectionContext): StudioNode => {
    const m = makerFor(ctx);
    return { id: m.id(), type: "column", gap: 4, children: OPENINGS[id](m) };
  },
}));
