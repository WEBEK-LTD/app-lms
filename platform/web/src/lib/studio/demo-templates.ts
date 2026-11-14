import type { LayoutBlock, StudioEntry, StudioNode, StudioPage } from "../pages/types";
import type { StudioDemoId } from "../demo/constants";
import { APP_WORDS } from "./app-words";
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
  // 128 The premium homes approved on 13 November 2026 (lib/studio/demo-designs); 130 every demo is now its Signature look A (lib/studio/demo-designs/signature.ts), the 128 homes stay templates of their kinds.
  // 130.5 Sahm Express is its Signature look A, the waybill (lib/studio/demo-designs/sahm-signature.ts).
  delivery: "delivery_signature_a",
  // 130.1 Sofra Eats is its Signature look A, the editorial menu (lib/studio/demo-designs/sofra-signature.ts).
  food: "food_signature_a",
  // 130.3 Zad is its Signature look A, the market arches (lib/studio/demo-designs/zad-signature.ts).
  marketplace: "marketplace_signature_a",
  // 130.7 Masar Rides is its Signature look A, the living map (lib/studio/demo-designs/masar-signature.ts).
  rides: "rides_signature_a",
  // 130.9 Lamha Taxi is its Signature look A, the two-ink cab (lib/studio/demo-designs/lamha-signature.ts).
  taxi: "taxi_signature_a",
  // 130.13 Nakhla School is its Signature look A, the morning edition (lib/studio/demo-designs/nakhla-signature.ts).
  school: "school_signature_a",
  // 130.15 Rawaq Academy is its Signature look A, the faculty index (lib/studio/demo-designs/rawaq-signature.ts).
  instructors: "instructors_signature_a",
  // 126 Safra's Explore: travel's own template (128 in the same registry, lib/studio/demo-designs/safra-travel.ts).
  // 130.12 Safra is its Signature look A, the cover story (lib/studio/demo-designs/safra-signature.ts).
  travel: "travel_signature_a",
  // 123 The premium academy's home is its template's; 130.17 its Signature look A, night cinema (lib/studio/demo-designs/ufuq-signature.ts).
  premium_academy: "premium_academy_signature_a",
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
const STUDIO_WORDS = APP_WORDS;

/**
 * A context that remembers the words it wrote, and the page those words
 * made with the other languages as translations: the template is made in
 * the dashboard's language (`ctx.lang`) and keeps the app words' English,
 * Arabic and Turkish for its texts, so the demo shows in each of its
 * languages and so does a project started from it.
 */
export function translating(ctx: SectionContext): { ctx: SectionContext; translate: (body: StudioNode) => StudioNode; page: (page: StudioPage) => StudioPage } {
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
      const text = STUDIO_WORDS[l][word];
      // A word with the app's name in it needs the name.
      if (text.includes("{app}") && !ctx.app) return null;
      out[l] = text.replaceAll("{app}", ctx.app ?? "");
    }
    return out;
  };
  const translate = (node: StudioNode): StudioNode => {
    const out: StudioNode = { ...node };
    const texts = all(node.text);
    // 130.11 And a greeting's words without a name; 130 any element's title the template wrote (a call to action's, a card's).
    const titles = all(node.title);
    if (texts || titles) {
      const translations: Record<string, Record<string, string>> = {};
      for (const l of others) translations[l] = { ...((node.translations?.[l] as Record<string, string> | undefined) ?? {}), ...(texts ? { text: texts[l]! } : {}), ...(titles ? { title: titles[l]! } : {}) };
      out.translations = translations as StudioNode["translations"];
    }
    if (node.children) out.children = node.children.map(translate);
    // 130 A premium element's list (130.12 a bento's tiles, a story, a stat; a story's heading): their words in Studio's other languages too, keeping the ones they have.
    const listed = <T extends { translations?: StudioEntry["translations"] }>(item: T, names: readonly string[]): T => {
      const fields = names.map((f) => [f, all((item as Record<string, unknown>)[f] as string | null | undefined)] as const).filter(([, words]) => words);
      if (!fields.length) return item;
      const translations: Record<string, Record<string, string>> = {};
      for (const l of others) translations[l] = { ...((item.translations?.[l] as Record<string, string> | undefined) ?? {}), ...Object.fromEntries(fields.map(([f, words]) => [f, words![l]!])) };
      return { ...item, translations: translations as StudioEntry["translations"] };
    };
    if (node.entries) out.entries = node.entries.map((entry) => listed(entry, ["title", "subtitle", "text", "label"]));
    if (node.slides) out.slides = node.slides.map((slide) => listed(slide, ["heading", "subheading", "label"]));
    if (node.card) out.card = translate(node.card);
    return out;
  };
  // 128.11 The whole page: its elements and its header's title the template wrote (the premium academy's greeting, signed out), in the other languages too.
  const page = (made: StudioPage): StudioPage => {
    const titles = made.header ? all(made.header.title) : null;
    const header =
      made.header && titles
        ? { ...made.header, translations: Object.fromEntries(others.map((l) => [l, { ...(made.header!.translations?.[l] ?? {}), title: titles[l]! }])) as NonNullable<StudioPage["header"]>["translations"] }
        : made.header;
    return { ...made, ...(header !== undefined ? { header } : {}), body: translate(made.body) };
  };
  return { ctx: { ...ctx, w }, translate, page };
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
  // ——— 130.13–130.18 The Signature looks' brackets, in the demo's own words ———
  // Nakhla School's week (lib/demo/school-life.ts): the parents' evening, the class trip, sports day.
  school: {
    nkNewsLines: {
      en: "Parents' evening for Grade 5 in the main hall\nGrade 5 A: Science museum trip\nSports day: come in your sports kit",
      ar: "لقاء أولياء أمور الصف الخامس في القاعة الرئيسية\nالصف 5 أ: رحلة إلى متحف العلوم\nاليوم الرياضي: تعالوا بالزي الرياضي",
      tr: "5. sınıflar için veli akşamı ana salonda\n5 A: Bilim müzesi gezisi\nSpor günü: spor kıyafetinizle gelin",
    },
  },
  // ——— end 130.13–130.18 ———
  // 128 Zad Market's own offer this week (lib/demo/marketplace.ts).
  marketplace: {
    mpOffer: { en: "Fresh fruit, 15% off", ar: "فاكهة طازجة بخصم 15%", tr: "Taze meyve %15 indirimli" },
    // 130.3 130.4 Zad's own offers and aisle on its Signature looks: its market's name, a shop on it (lib/demo/marketplace.ts) and its district.
    zadOfferKicker: { en: "Zad Market offer", ar: "عرض زاد ماركت", tr: "Zad Market fırsatı" },
    zadOffer2Kicker: { en: "Zad's own code", ar: "رمز زاد", tr: "Zad'ın kodu" },
    zadOffer3Kicker: { en: "Nile Pizza Co.", ar: "نايل بيتزا", tr: "Nile Pizza Co." },
    zadBKicker: { en: "Zad Market · Mohandessin", ar: "زاد ماركت · المهندسين", tr: "Zad Market · Mohandessin" },
    // 130.4 Where Zad's Night aisle look delivers, the demo number's home.
    zadBTo: { en: "to Home, Garden City", ar: "إلى المنزل، جاردن سيتي", tr: "Ev, Garden City'ye" },
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
    // 130.5 The Waybill look's headline names the demo's city.
    sahHead1: { en: "Across Cairo,", ar: "عبر القاهرة،", tr: "Kahire'nin her yerine," },
  },
  // 130.12 Safra's own stays on its look B's bento (lib/travel/samples.ts TRAVEL_HOTELS): their names and their nights' prices.
  travel: {
    sigStayOne: { en: "Safra Caldera Suites", ar: "Safra Caldera Suites", tr: "Safra Caldera Suites" },
    sigStayOneText: { en: "Cave suites on the cliff · $262 a night", ar: "أجنحة كهفية على المنحدر · 262 دولارًا لليلة", tr: "Uçurumda mağara süitler · gecelik 262 $" },
    sigStayTwo: { en: "Safra Skyline Hotel", ar: "Safra Skyline Hotel", tr: "Safra Skyline Hotel" },
    sigStayTwoText: { en: "$134 a night", ar: "134 دولارًا لليلة", tr: "Gecelik 134 $" },
    sigStayThree: { en: "Safra Old Town House", ar: "Safra Old Town House", tr: "Safra Old Town House" },
    sigStayThreeText: { en: "$96 a night", ar: "96 دولارًا لليلة", tr: "Gecelik 96 $" },
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
  for (const [word, words] of Object.entries(facts)) for (const l of DEMO_LANGS) byText.set(STUDIO_WORDS[l][word as SectionWord], words!);
  const others = DEMO_LANGS.filter((l) => l !== lang);
  const fill = (node: StudioNode): StudioNode => {
    const words = node.text ? byText.get(node.text) : undefined;
    const translations = Object.fromEntries(others.map((l) => [l, { text: words?.[l] ?? "" }])) as StudioNode["translations"];
    const out: StudioNode = words ? { ...node, text: words[lang], translations } : { ...node };
    if (node.children) out.children = node.children.map(fill);
    if (node.card) out.card = fill(node.card);
    // 130.12 And a premium element's entries (Safra B's stays): their title and text.
    if (node.entries) {
      out.entries = node.entries.map((entry) => {
        const own = (["title", "text"] as const).map((f) => [f, entry[f] ? byText.get(entry[f]!) : undefined] as const).filter(([, words]) => words);
        if (!own.length) return entry;
        const filled: StudioEntry = { ...entry };
        const translations: Record<string, Record<string, string>> = {};
        for (const l of others) translations[l] = { ...((entry.translations?.[l] as Record<string, string> | undefined) ?? {}) };
        for (const [f, words] of own) {
          filled[f] = words![lang];
          for (const l of others) translations[l]![f] = words![l];
        }
        return { ...filled, translations: translations as StudioEntry["translations"] };
      });
    }
    return out;
  };
  return { ...page, body: fill(page.body) };
}
