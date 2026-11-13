import type { LayoutBlock, StudioNode, StudioPage } from "../pages/types";
import type { StudioDemoId } from "../demo/constants";
import { ar as studioAr, en as studioEn, tr as studioTr } from "../../i18n/dashboard/studio";
import { newNodeId } from "./elements";
import type { SectionContext, SectionWord } from "./sections";

/**
 * Templates = demos, for Yallapp Studio. Each Studio demo is made from its
 * kind's own designed page (lib/studio/sections.ts `demoStudioPage`), never
 * from a page generated for it: 128 Sofra Eats's, Zad's, Sahm Express's,
 * Masar Rides's and Lamha Taxi's homes are the premium templates approved on
 * 13 November 2026 (lib/studio/demo-designs, with lib/studio/photo-food.ts
 * and photo-market.ts), the others their kind's first template (the
 * school's, the teachers'; 126 Safra's travel's own, in the same registry). The demo app (lib/demo/setup.ts), the demo's template a
 * project starts from and the "Like our demo" whole design
 * (lib/studio/designs.ts) are that one page, so a client gets what the demo
 * shows. tests/unit/studio-demo-templates.test.ts fails when they drift
 * apart.
 */

const pad = (v: number, h: number) => ({ top: v, end: h, bottom: v, start: h });

function idOf(ctx: SectionContext): string {
  return (ctx.newId ?? newNodeId)();
}

/** The kind's own template each Studio demo's home is (lib/studio/sections.ts TEMPLATES). */
export const DEMO_HOME_TEMPLATES: Record<StudioDemoId, string> = {
  // 128 The premium homes approved on 13 November 2026 (lib/studio/demo-designs): Sofra Eats's and Zad's photo-first, Sahm's courier in the city, Masar's ride at night, Lamha's taxi map, Nakhla School's day, Rawaq Academy's teachers.
  delivery: "delivery_city",
  food: "food_photo",
  marketplace: "market_photo",
  rides: "ride_night",
  taxi: "taxi_map",
  school: "school_today",
  instructors: "teachers_photo",
  // 126 Safra's Explore: travel's own template (128 in the same registry, lib/studio/demo-designs/safra-travel.ts).
  travel: "travel",
  // 123 The premium academy's home is its template's.
  premium_academy: "academy_premium",
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" };

/**
 * A text block's paragraphs as plain words, read one character at a time:
 * its headings (h1 to h6) and paragraphs (p), every other tag dropped and
 * the few entities a demo's texts use written out. The words go into a
 * Studio text, never back into HTML.
 */
export function paragraphsOf(html: string): { heading: boolean; text: string }[] {
  const out: { heading: boolean; text: string }[] = [];
  let current: { heading: boolean; text: string } | null = null;
  let i = 0;
  while (i < html.length) {
    const c = html[i]!;
    if (c === "<") {
      const end = html.indexOf(">", i);
      if (end === -1) break;
      const tag = html.slice(i + 1, end).trim().toLowerCase();
      const name = tag.replace("/", "").split(" ")[0] ?? "";
      const block = name === "p" || (name.length === 2 && name[0] === "h" && name[1]! >= "1" && name[1]! <= "6");
      if (block && !tag.startsWith("/")) current = { heading: name !== "p", text: "" };
      else if (block && current) {
        const words = current.text.trim();
        if (words) out.push({ heading: current.heading, text: words });
        current = null;
      }
      i = end + 1;
      continue;
    }
    if (c === "&") {
      const end = html.indexOf(";", i);
      const name = end === -1 ? "" : html.slice(i + 1, end);
      if (name in ENTITIES) {
        if (current) current.text += ENTITIES[name];
        i = end + 1;
        continue;
      }
    }
    if (current) current.text += c;
    i += 1;
  }
  return out;
}

/** 128 Each Studio demo's quiet colours by day and by night, its approved board's: the cards', their line's and the muted text's. */
export const DEMO_NOTE_COLORS: Record<StudioDemoId, { surface: string; nightSurface: string; line: string; nightLine: string; muted: string; nightMuted: string }> = {
  food: { surface: "#FFFFFF", nightSurface: "#241913", line: "#EFE4DA", nightLine: "#3A2A21", muted: "#6E5A50", nightMuted: "#C5B2A6" },
  marketplace: { surface: "#FFFFFF", nightSurface: "#16231C", line: "#E5E0D6", nightLine: "#26352D", muted: "#5D6B63", nightMuted: "#A9BAB0" },
  delivery: { surface: "#FFFFFF", nightSurface: "#132030", line: "#DEE5EE", nightLine: "#22324A", muted: "#566475", nightMuted: "#A7B4C2" },
  rides: { surface: "#FFFFFF", nightSurface: "#0F2422", line: "#DCE6E4", nightLine: "#1F3735", muted: "#556866", nightMuted: "#A2BAB6" },
  taxi: { surface: "#FFFFFF", nightSurface: "#1C2541", line: "#E2DED6", nightLine: "#333D5E", muted: "#5B6276", nightMuted: "#AEB4C6" },
  school: { surface: "#FFFFFF", nightSurface: "#122033", line: "#DFE5EC", nightLine: "#22334A", muted: "#56657A", nightMuted: "#A6B3C3" },
  instructors: { surface: "#FFFFFF", nightSurface: "#15221C", line: "#E2E0D6", nightLine: "#24352D", muted: "#5A665F", nightMuted: "#A9B7AF" },
  premium_academy: { surface: "#FFFFFF", nightSurface: "#161C33", line: "#E3DFD6", nightLine: "#262D48", muted: "#5A5F73", nightMuted: "#A8AEC4" },
  // 126 Safra's, its pages' (lib/studio/demo-designs/safra-travel.ts SAFRA_INK).
  travel: { surface: "#FFFFFF", nightSurface: "#1B2338", line: "#E6DFD2", nightLine: "#2A3350", muted: "#5F6472", nightMuted: "#B4B8C6" },
};

/**
 * A text block (the demo's note on how to sign in) as a Studio element,
 * shown to the same people: 128 a small quiet card in the demo's own
 * colours by day and by night, its words in each of the block's languages,
 * for the end of the demo's home (never between the parts of its approved
 * design). `inset`: the space either side, none when the page has its own.
 */
export function studioNoteOf(ctx: SectionContext, id: StudioDemoId, block: LayoutBlock, inset = 16): StudioNode | null {
  if (block.type !== "text") return null;
  const words = (html: string | null | undefined) =>
    paragraphsOf(html ?? "")
      .map((part) => part.text)
      .join(" ");
  const text = words(block.html);
  if (!text) return null;
  const translations = Object.fromEntries(
    Object.entries(block.translations ?? {})
      .map(([lang, texts]) => [lang, { text: words(texts.html) }] as const)
      .filter(([, t]) => t.text),
  );
  const c = DEMO_NOTE_COLORS[id];
  return {
    id: idOf(ctx),
    type: "row",
    gap: 10,
    cross: "start",
    padding: pad(12, 14),
    margin: { top: 18, end: inset, bottom: 8, start: inset },
    radius: 16,
    background: c.surface,
    dark_background: c.nightSurface,
    border_color: c.line,
    dark_border_color: c.nightLine,
    border_width: 1,
    visibility: block.visibility,
    children: [
      { id: idOf(ctx), type: "icon", icon: "info", icon_size: 18, color: c.muted, dark_color: c.nightMuted },
      { id: idOf(ctx), type: "text", text, width: "fill", font: { size: 13, line_height: 1.45 }, color: c.muted, dark_color: c.nightMuted, ...(Object.keys(translations).length ? { translations } : {}) },
    ],
  };
}

type DemoLang = "en" | "ar" | "tr";
const DEMO_LANGS: readonly DemoLang[] = ["en", "ar", "tr"];
const STUDIO_WORDS = { en: studioEn, ar: studioAr, tr: studioTr };

/**
 * A context that remembers the words it wrote, and the page those words
 * made with the other languages as translations: the template is made in
 * the dashboard's language (`ctx.lang`) and keeps Studio's own English,
 * Arabic and Turkish for its texts, so the demo shows in each of its
 * languages and so does a project started from it.
 */
export function translating(ctx: SectionContext): { ctx: SectionContext; translate: (body: StudioNode) => StudioNode } {
  const written = new Map<string, SectionWord>();
  const w = (word: SectionWord) => {
    const value = ctx.w(word);
    written.set(value, word);
    return value;
  };
  const lang: DemoLang = ctx.lang ?? "en";
  const others = DEMO_LANGS.filter((l) => l !== lang);
  const all = (value: string | null | undefined): Record<string, string> | null => {
    const word = value ? written.get(value) : undefined;
    if (!word) return null;
    const out: Record<string, string> = {};
    for (const l of others) {
      const text = String(STUDIO_WORDS[l][`w_${word}`]);
      // A word with the app's name in it needs the name.
      if (text.includes("{app}") && !ctx.app) return null;
      out[l] = text.replaceAll("{app}", ctx.app ?? "");
    }
    return out;
  };
  const translate = (node: StudioNode): StudioNode => {
    const out: StudioNode = { ...node };
    const texts = all(node.text);
    const titles = node.type === "market" ? all(node.title) : null;
    if (texts || titles) {
      const translations: Record<string, Record<string, string>> = {};
      for (const l of others) translations[l] = { ...(texts ? { text: texts[l]! } : {}), ...(titles ? { title: titles[l]! } : {}) };
      out.translations = translations as StudioNode["translations"];
    }
    if (node.children) out.children = node.children.map(translate);
    if (node.card) out.card = translate(node.card);
    return out;
  };
  return { ctx: { ...ctx, w }, translate };
}

/** The demos' own templates; 123 the premium academy is a template already (lib/studio/sections.ts academy_premium). */
export const DEMO_ICONS: Record<Exclude<StudioDemoId, "premium_academy">, string> = {
  delivery: "local_shipping",
  food: "delivery_dining",
  marketplace: "storefront",
  rides: "local_taxi",
  taxi: "map",
  school: "school",
  instructors: "groups",
  travel: "travel_explore",
};

/** The Studio template id of a demo: `demo_<demo>`. */
export function demoTemplateId(id: StudioDemoId): string {
  return `demo_${id}`;
}

const DEMO_VERTICALS: readonly string[] = ["taxi", "instructors", "marketplace"];
const DEMO_TYPES: readonly string[] = ["delivery", "food", "rides", "school", "travel"];

/** The Studio demo of a project's kind: its vertical's, else its type's; none for a kind without one. */
export function studioDemoOf(kind: { type: string; vertical?: string | null } | null): StudioDemoId | null {
  if (!kind) return null;
  if (kind.vertical) return DEMO_VERTICALS.includes(kind.vertical) ? (kind.vertical as StudioDemoId) : null;
  return DEMO_TYPES.includes(kind.type) ? (kind.type as StudioDemoId) : null;
}

/**
 * 124.7 What a demo says of itself where its template asks the owner for
 * their own words in brackets ("[Your address and opening hours]"): the
 * demo app shows them, in its three languages; a project started from the
 * template in Studio's own steps keeps the brackets for the owner to fill.
 * 127 A project started from the demo on /start gets the demo's words
 * instead: no brackets left in its editor.
 */
export const DEMO_FACTS: Partial<Record<StudioDemoId, Partial<Record<SectionWord, Record<"en" | "ar" | "tr", string>>>>> = {
  // 128 Sofra Eats delivers to the demo number's home in Zamalek, as its orders go.
  food: {
    fpArea: { en: "Home · Zamalek", ar: "المنزل · الزمالك", tr: "Ev · Zamalek" },
  },
  // 128 Zad Market's own offer this week (lib/demo/marketplace.ts).
  marketplace: {
    mpOffer: { en: "Fresh fruit, 15% off", ar: "فاكهة طازجة بخصم 15%", tr: "Taze meyve %15 indirimli" },
  },
  // Sahm Express by Tahrir Square, where its contact map is; open as late as its same-day parcels arrive.
  delivery: {
    contactText: {
      en: "Downtown Cairo, by Tahrir Square · Every day, 09:00 to 22:00",
      ar: "وسط القاهرة، بجوار ميدان التحرير · يوميًا من 09:00 إلى 22:00",
      tr: "Kahire şehir merkezi, Tahrir Meydanı'nın yanında · Her gün 09.00–22.00",
    },
    // 128 Where the approved home's route card picks up: the demo's own street, where its parcels leave from.
    deliveryFrom: { en: "Abbas El Akkad St.", ar: "شارع عباس العقاد", tr: "Abbas El Akkad Caddesi" },
  },
};

/**
 * `page` with the demo's own words (`DEMO_FACTS`) in place of its template's
 * brackets. The template's words are found in any of Studio's languages;
 * the demo's go in `lang` (the page's own language), with the other two as
 * translations.
 */
export function withDemoFacts(id: StudioDemoId, page: StudioPage, lang: DemoLang = "en"): StudioPage {
  const facts = DEMO_FACTS[id];
  if (!facts) return page;
  const byText = new Map<string, Record<DemoLang, string>>();
  for (const [word, words] of Object.entries(facts)) for (const l of DEMO_LANGS) byText.set(String(STUDIO_WORDS[l][`w_${word as SectionWord}`]), words!);
  const others = DEMO_LANGS.filter((l) => l !== lang);
  const fill = (node: StudioNode): StudioNode => {
    const words = node.text ? byText.get(node.text) : undefined;
    const translations = Object.fromEntries(others.map((l) => [l, { text: words?.[l] ?? "" }])) as StudioNode["translations"];
    const out: StudioNode = words ? { ...node, text: words[lang], translations } : { ...node };
    if (node.children) out.children = node.children.map(fill);
    if (node.card) out.card = fill(node.card);
    return out;
  };
  return { ...page, body: fill(page.body) };
}
