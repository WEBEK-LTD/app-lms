import type { LayoutBlock, StudioEntry, StudioNode, StudioPage } from "../pages/types";
import type { ShopTypeDemo, StudioDemoId } from "../demo/constants";
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
  // 131.20 Leqaa, the flower shop, is its Signature look A, rose hour (lib/studio/demo-designs/leqaa-signature.ts).
  flowers: "flowers_signature_a",
  // 208 Lujain, the clothes shop, is its Signature look A, the boutique (lib/studio/demo-designs/clothes-signature.ts).
  clothes: "clothes_signature_a",
  // 209 Cosmetics: Velours is its Signature look A, plum and gold (lib/studio/demo-designs/beauty-signature.ts).
  beauty: "beauty_signature_a",
  // 209 Kids' clothes: Toota is its Signature look A, soft pastels (lib/studio/demo-designs/kids-signature.ts).
  kids: "kids_signature_a",
  // 209 Toys
  // 209 Toot, the toy shop; 226 now its main look C, the adventure map (lib/studio/demo-designs/toys-c-signature.ts).
  toys: "toys_signature_c",
  // 210 Sakan, Ghurza and Rukn are their Signature looks A (lib/studio/demo-designs/decor-, crochet-, furniture-signature.ts).
  decor: "decor_signature_a",
  crochet: "crochet_signature_a",
  furniture: "furniture_signature_a",
  // 211 Madar, the electronics shop, is its Signature look A, MADAR (lib/studio/demo-designs/electronics-signature.ts).
  electronics: "electronics_signature_a",
  // 211 Nova, the mobiles shop; 226 now its main look C, the keynote (lib/studio/demo-designs/mobiles-c-signature.ts).
  mobiles: "mobiles_signature_c",
  // 211 Nawah, computers and gaming, is its Signature look A, NAWAH (lib/studio/demo-designs/computers-signature.ts).
  computers: "computers_signature_a",
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
  // 131.20 Leqaa's, its look A's (lib/studio/demo-designs/leqaa-signature.ts LEQAA_A_INK).
  flowers: { surface: "#FFFFFF", nightSurface: "#21121A", line: "#F0DDD9", nightLine: "#3A2530", muted: "#7B5E67", nightMuted: "#C9AEB6" },
  // 208 Lujain's, its look A's (lib/studio/demo-designs/clothes-signature.ts LUJAIN_INK).
  clothes: { surface: "#FFFFFF", nightSurface: "#191917", line: "#E4DFD6", nightLine: "#2E2C28", muted: "#5F5B55", nightMuted: "#B6B0A6" },
  // 209 Cosmetics: Velours's, its look A's (lib/studio/demo-designs/beauty-signature.ts VELOURS_INK).
  beauty: { surface: "#FFFFFF", nightSurface: "#1E1A1C", line: "#EFE3DF", nightLine: "#2E2629", muted: "#6F5F63", nightMuted: "#C7B9BD" },
  // 209 Kids' clothes: Toota's, its look A's (lib/studio/demo-designs/kids-signature.ts TOOTA_INK).
  kids: { surface: "#FFFDF9", nightSurface: "#1F1916", line: "#EADFD3", nightLine: "#30271F", muted: "#6B5D55", nightMuted: "#C7B9AF" },
  // 209 Toys
  // 209 Toot's, its look A's (lib/studio/demo-designs/toys-signature.ts TOOT_INK).
  toys: { surface: "#FFFCF7", nightSurface: "#1E1A1D", line: "#E9E0D3", nightLine: "#2E282B", muted: "#685D57", nightMuted: "#BCB2AD" },
  // 210 Sakan's, Ghurza's and Rukn's: their look A's.
  decor: { surface: "#FBFAF6", nightSurface: "#1B1C18", line: "#E1DBCF", nightLine: "#2C2E26", muted: "#62635A", nightMuted: "#B4B3A7" },
  crochet: { surface: "#FFFCF7", nightSurface: "#221A16", line: "#EADFD1", nightLine: "#3A2E26", muted: "#6B5D52", nightMuted: "#C4B5A8" },
  furniture: { surface: "#FFFFFF", nightSurface: "#211C18", line: "#E8E1D8", nightLine: "#36302A", muted: "#6B625A", nightMuted: "#B8AEA4" },
  // 211 Madar's, its look A's (lib/studio/demo-designs/electronics-signature.ts MADAR_INK).
  electronics: { surface: "#FFFFFF", nightSurface: "#15171B", line: "#E2E5EA", nightLine: "#25282E", muted: "#4E5561", nightMuted: "#B4BAC4" },
  // 211 Nova's, its look A's (lib/studio/demo-designs/mobiles-signature.ts NOVA_INK).
  mobiles: { surface: "#FFFFFF", nightSurface: "#15171C", line: "#E2E5EA", nightLine: "#262A31", muted: "#525864", nightMuted: "#AEB3BD" },
  // 211 Nawah's, its look A's (lib/studio/demo-designs/computers-signature.ts NAWAH_INK).
  computers: { surface: "#FFFFFF", nightSurface: "#14171D", line: "#E1E4E9", nightLine: "#242931", muted: "#4A5161", nightMuted: "#B4BAC6" },
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
/** 131.20 Leqaa (a template's demo, as the premium academy) has none: its looks are a store's first templates. */
/** 208 Nor the shop types' demos (Lujain; 209 Toot): their looks are a store's first templates too. */
export const DEMO_ICONS: Record<Exclude<StudioDemoId, "premium_academy" | "flowers" | ShopTypeDemo>, string> = {
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
    // 176.1 Sofra's own restaurants, dishes and their prices in pounds (lib/demo/content.ts): a business's own app has the template's words, without them.
    sofTonight1: { en: "Tonight at Sahara Grill", ar: "الليلة في صحارى جريل", tr: "Bu akşam Sahara Grill'de" },
    sofDish1Line: { en: "Kofta, shish tawook and lamb chops · EGP 240", ar: "كفتة وشيش طاووق وريش ضاني · 240 ج.م", tr: "Köfte, şiş tavuk ve kuzu pirzola · 240 EGP" },
    sofTonight2: { en: "Stone-baked at Forno Zamalek", ar: "من فرن الحجر في فورنو الزمالك", tr: "Forno Zamalek'te taş fırında" },
    sofDish2Line: { en: "Tomato, mozzarella and basil · EGP 140", ar: "طماطم وموتزاريلا وريحان · 140 ج.م", tr: "Domates, mozzarella ve fesleğen · 140 EGP" },
    sofTonight3: { en: "Made at home at Bayt El Koshary", ar: "كما في البيت في بيت الكشري", tr: "Bayt El Koshary'de ev usulü" },
    sofDish3Line: { en: "Rice, lentils, pasta and crispy onions · EGP 55", ar: "أرز وعدس ومكرونة وبصل مقرمش · 55 ج.م", tr: "Pirinç, mercimek, makarna ve çıtır soğan · 55 EGP" },
    sofDeliveryFee: { en: "Delivery EGP 25", ar: "التوصيل 25 ج.م", tr: "Teslimat 25 EGP" },
    sofForno: { en: "Forno Zamalek", ar: "فورنو الزمالك", tr: "Forno Zamalek" },
    sofSahara: { en: "Sahara Grill", ar: "صحارى جريل", tr: "Sahara Grill" },
    sofPrice140: { en: "EGP 140", ar: "140 ج.م", tr: "140 EGP" },
    sofPrice150: { en: "EGP 150", ar: "150 ج.م", tr: "150 EGP" },
    sofGrillChip: { en: "Mixed grill · EGP 240", ar: "مشويات مشكّلة · 240 ج.م", tr: "Karışık ızgara · 240 EGP" },
    sofEgyptianLine: { en: "Bayt El Koshary · Koshary EGP 55", ar: "بيت الكشري · كشري 55 ج.م", tr: "Bayt El Koshary · Koşari 55 EGP" },
    sofTicker: { en: "Koshary EGP 55\nMixed grill EGP 240\nMargherita EGP 140\nShish tawook EGP 150", ar: "كشري 55 ج.م\nمشويات مشكّلة 240 ج.م\nمارجريتا 140 ج.م\nشيش طاووق 150 ج.م", tr: "Koşari 55 EGP\nKarışık ızgara 240 EGP\nMargherita 140 EGP\nŞiş tavuk 150 EGP" },
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
    // 176.1 Sahm's own prices in pounds: a business's own app has the template's words, without them.
    sahSameDayPrice: { en: "+EGP 0", ar: "+0 ج.م", tr: "+0 EGP" },
    sahExpressPrice: { en: "+EGP 45", ar: "+45 ج.م", tr: "+45 EGP" },
    sahDocumentsPrice: { en: "+EGP 15", ar: "+15 ج.م", tr: "+15 EGP" },
    sahSendFrom: { en: "Send a parcel · from EGP 40", ar: "أرسل طردًا · من 40 ج.م", tr: "Paket gönder · 40 EGP'den" },
    sahFrom40: { en: "EGP 40+", ar: "40+ ج.م", tr: "40+ EGP" },
  },
  // 131.20 Leqaa's own words where its looks leave the owner brackets: its cut-off in Cairo, its signature bouquet (lib/demo/flowers.ts), its name in each language.
  flowers: {
    lqWordmark: { en: "Leqaa", ar: "لقاء", tr: "Leqaa" },
    lqCutoff: { en: "Order before 4 pm and it arrives today, anywhere in Cairo.", ar: "اطلب قبل الرابعة عصرًا ويصل اليوم إلى أي مكان في القاهرة.", tr: "Saat 16.00'dan önce sipariş verin, bugün Kahire'nin her yerine ulaşsın." },
    lqBouquetTitle: { en: "Blush Garden", ar: "حديقة الورد", tr: "Pembe Bahçe" },
    lqBouquetLine: { en: "Blush roses, lisianthus and eucalyptus, made on the day it is delivered.", ar: "ورد وردي وليزيانثوس وأوكالبتوس، تُصنع في يوم توصيلها.", tr: "Pembe güller, lisianthus ve okaliptüs; teslim edildiği gün hazırlanır." },
  },
  // 211 Nawah's own words where its looks leave the owner brackets: its services, its warranty and returns, how to reach it (lib/demo/computers.ts).
  computers: {
    pcServiceBuildText: { en: "Every build assembled and tested for 24 hours", ar: "كل تجميعة تُجمَّع وتُختبر 24 ساعة", tr: "Her toplama kurulur ve 24 saat test edilir" },
    pcServiceWarrantyText: { en: "Up to 3 years, serviced in Jeddah", ar: "حتى 3 سنوات، والصيانة في جدة", tr: "3 yıla kadar, servis Cidde'de" },
    pcServiceDeliveryText: { en: "Within a day in Jeddah, 2 to 3 days elsewhere", ar: "خلال يوم في جدة، ومن يومين إلى 3 أيام لغيرها", tr: "Cidde'de bir gün içinde, diğer şehirlere 2–3 gün" },
    pcContactLine: { en: "Tech support every day, 10 am to midnight", ar: "دعم فني يوميًا من 10 صباحًا حتى منتصف الليل", tr: "Teknik destek her gün 10.00–24.00" },
    pcWarrantyNote: { en: "Returns within 14 days, and up to 3 years of warranty on every device.", ar: "إرجاع خلال 14 يومًا، وضمان حتى 3 سنوات على كل جهاز.", tr: "14 gün içinde iade ve her cihazda 3 yıla kadar garanti." },
  },
  // 208 Lujain's own words where its looks leave the owner brackets: its look, its drop, its promises and its exchanges (lib/demo/clothes.ts).
  clothes: {
    clLookName: { en: "Classic black with a soft touch", ar: "أسود كلاسيكي بلمسة ناعمة", tr: "Yumuşak dokunuşlu klasik siyah" },
    clDropKicker: { en: "Drop 07 · Limited pieces", ar: "الإصدار 07 · قطع محدودة", tr: "Drop 07 · Sınırlı parça" },
    clTicker: { en: "Free delivery over 500 SAR · Exchanges within 14 days · New pieces every week", ar: "توصيل مجاني فوق 500 ر.س · استبدال خلال 14 يومًا · قطع جديدة كل أسبوع", tr: "500 SAR üzeri ücretsiz teslimat · 14 gün içinde değişim · Her hafta yeni parçalar" },
    clContactLine: { en: "Customer care every day, 9 am to 11 pm", ar: "خدمة العملاء يوميًا من 9 صباحًا إلى 11 مساءً", tr: "Müşteri hizmetleri her gün 09.00–23.00" },
    clEditTitle: { en: "Day dresses, the new season", ar: "فساتين النهار للموسم الجديد", tr: "Yeni sezonun gündüz elbiseleri" },
    clExchangeNote: { en: "Free exchange within 14 days, picked up from your door.", ar: "استبدال مجاني خلال 14 يومًا، نستلم القطعة من باب منزلكِ.", tr: "14 gün içinde ücretsiz değişim, kapınızdan alınır." },
  },
  // 209 Cosmetics: Velours's own words where its looks leave the owner brackets: its delivery, its returns, its hours and its edit (lib/demo/beauty.ts).
  beauty: {
    btTrustDeliveryText: { en: "Free over 150 AED", ar: "مجاني فوق 150 د.إ", tr: "150 AED üzeri ücretsiz" },
    btTrustReturnsText: { en: "Unopened, within 14 days", ar: "غير مفتوحة، خلال 14 يومًا", tr: "Açılmamış, 14 gün içinde" },
    btContactLine: { en: "Beauty advisers every day, 10 am to 11 pm", ar: "مستشارات الجمال يوميًا من 10 صباحًا إلى 11 مساءً", tr: "Güzellik danışmanları her gün 10.00–23.00" },
    btEditTitle: { en: "Glow serums at their best prices", ar: "سيرومات الإشراق بأفضل أسعارها", tr: "Işıltı serumları en iyi fiyatlarıyla" },
    btReturnsNote: { en: "Unopened products go back within 14 days, collected from your door.", ar: "تُرجع المنتجات غير المفتوحة خلال 14 يومًا، ونستلمها من باب منزلكِ.", tr: "Açılmamış ürünler 14 gün içinde kapınızdan alınarak iade edilir." },
  },
  // 209 Kids' clothes: Toota's own words where its looks leave the owner brackets: its look of the week, its promises, its exchanges, its gift wrapping and its hours (lib/demo/kids.ts).
  kids: {
    kdLookName: { en: "Weekend in the fields: check, wool and denim", ar: "عطلة في الحقول: كاروه وصوف ودنيم", tr: "Tarlada hafta sonu: ekose, yün ve denim" },
    kdPromise3Line: { en: "Within 30 days if the size isn't right", ar: "خلال 30 يومًا إن لم يناسب المقاس", tr: "Beden uymazsa 30 gün içinde" },
    kdContactLine: { en: "Every day, 9 am to 11 pm", ar: "يوميًا من 9 صباحًا إلى 11 مساءً", tr: "Her gün 09.00–23.00" },
    kdEditTitle: { en: "Whole outfits, sold as one", ar: "إطلالات كاملة تُباع معًا", tr: "Tek parça satılan komple kombinler" },
    kdExchangeNote: { en: "Free exchange within 30 days if the size isn't right.", ar: "استبدال مجاني خلال 30 يومًا إن لم يناسب المقاس.", tr: "Beden uymazsa 30 gün içinde ücretsiz değişim." },
    kdGiftNote: { en: "A newborn gift? Add gift wrapping and a card, and write its message at checkout.", ar: "هدية لمولود؟ أضيفي التغليف وبطاقة، واكتبي رسالتها عند الدفع.", tr: "Yenidoğan hediyesi mi? Hediye paketi ve kart ekleyin, mesajını ödemede yazın." },
  },
  // 209 Toys
  // 209 Toot's own words where its looks leave the owner brackets: its wraps, its newborn box, its returns and its offer (lib/demo/toys.ts).
  toys: {
    tyWrapBLine: { en: "A black box with a gold ribbon and a card, from 15 AED", ar: "صندوق أسود بشريط ذهبي وبطاقة، من 15 د.إ", tr: "Altın kurdeleli siyah kutu ve kart, 15 AED'den" },
    tyBoxPrice: { en: "399 AED", ar: "399 د.إ", tr: "399 AED" },
    tyStat4: { en: "30", ar: "30", tr: "30" },
    tyStat4Text: { en: "Days to return a toy for free, picked up from your door", ar: "يومًا لإرجاع اللعبة مجانًا من باب بيتك", tr: "Oyuncağı ücretsiz iade için gün, kapınızdan alınır" },
    tyContactLine: { en: "Every day, 9 am to 10 pm", ar: "يوميًا من 9 صباحًا إلى 10 مساءً", tr: "Her gün 09.00–22.00" },
    tyEditTitle: { en: "Free delivery over 200 AED", ar: "توصيل مجاني فوق 200 د.إ", tr: "200 AED üzeri ücretsiz teslimat" },
    tyCartNote: { en: "Gift wrapping and a card in the cart · Free returns within 30 days", ar: "التغليف والبطاقة من السلة · إرجاع مجاني خلال 30 يومًا", tr: "Hediye paketi ve kart sepette · 30 gün içinde ücretsiz iade" },
  },
  // 210 Rukn's own words where its looks leave the owner brackets: its district in Riyadh, the Najd set, its promises, its rating and showroom (lib/demo/kits/furniture.ts).
  furniture: {
    fuLocation: { en: "Delivering to Riyadh, Al Yasmin", ar: "التوصيل إلى الرياض، حي الياسمين", tr: "Riyad, Al Yasmin'e teslimat" },
    fuLocationB: { en: "Riyadh · Delivery tomorrow", ar: "الرياض · التوصيل غدًا", tr: "Riyad · Yarın teslimat" },
    skLookName: { en: "The Najd majlis set", ar: "طقم المجلس «نجد»", tr: "Najd oturma takımı" },
    skPromiseDeliveryLine: { en: "On orders over 1,500 SAR", ar: "للطلبات فوق 1,500 ر.س", tr: "1.500 SAR üzeri siparişlerde" },
    skPromiseWarrantyLine: { en: "10 years on the wooden frames", ar: "10 سنوات على الهياكل الخشبية", tr: "Ahşap iskelette 10 yıl" },
    fuFabricTime: { en: "Arrives in 3 days", ar: "تصلك خلال 3 أيام", tr: "3 günde elinizde" },
    fuSofaTime: { en: "Made in 14–21 days", ar: "تُصنع خلال 14–21 يومًا", tr: "14–21 günde yapılır" },
    fuRatingValue: { en: "4.8", ar: "4.8", tr: "4,8" },
    fuRatingTitle: { en: "From more than 2,400 verified ratings", ar: "من أكثر من 2,400 تقييم موثّق", tr: "2.400'den fazla doğrulanmış puandan" },
    fuRatingQuote: { en: "“The assembly was quick and the team very professional.” Lama, Riyadh", ar: "«كان التركيب سريعًا والفريق محترفًا جدًا.» لمى، الرياض", tr: "“Kurulum hızlıydı, ekip çok profesyoneldi.” Lama, Riyad" },
    fuShowroom: { en: "Rukn showroom, Al Yasmin, Riyadh", ar: "معرض ركن، حي الياسمين، الرياض", tr: "Rukn showroomu, Al Yasmin, Riyad" },
    fuShowroomLine: { en: "Open today until 11 pm", ar: "مفتوح اليوم حتى 11 مساءً", tr: "Bugün 23.00'e kadar açık" },
    fuContactLine: { en: "Customer care every day, 9 am to 11 pm", ar: "خدمة العملاء يوميًا من 9 صباحًا إلى 11 مساءً", tr: "Müşteri hizmetleri her gün 09.00–23.00" },
  },
  // 210 Sakan's own words where its looks leave the owner brackets: its styled corner, its story and numbers, its promises (lib/demo/kits/decor.ts).
  decor: {
    skLookName: { en: "The Sabah dining corner", ar: "زاوية «صباح» للطعام", tr: "Sabah yemek köşesi" },
    skPromiseDeliveryLine: { en: "Over 1,000 SAR", ar: "فوق 1,000 ر.س", tr: "1.000 SAR üzeri" },
    dcStoryQuote: { en: "Every piece is chosen from small studios across the region and tested to last for years, not seasons.", ar: "نختار كل قطعة من مشاغل صغيرة في المنطقة، ونختبرها لتدوم سنوات لا مواسم.", tr: "Her parçayı bölgedeki küçük atölyelerden seçiyor, mevsimlerce değil yıllarca dayanması için deniyoruz." },
    skStoryName: { en: "Hessa Al-Rashid", ar: "حصة الراشد", tr: "Hessa Al-Rashid" },
    skStoryRole: { en: "Founder of Sakan", ar: "مؤسِّسة سكن", tr: "Sakan'ın kurucusu" },
    dcStatStudios: { en: "30", ar: "30", tr: "30" },
    dcStatRating: { en: "4.8", ar: "4.8", tr: "4.8" },
    dcContactLine: { en: "Customer care every day, 9 am to 11 pm", ar: "خدمة العملاء يوميًا من 9 صباحًا إلى 11 مساءً", tr: "Müşteri hizmetleri her gün 09.00–23.00" },
  },
  // 210 Ghurza's own words where its looks leave the owner brackets: its name and city, its maker and numbers, its workshop, its delivery (lib/demo/kits/crochet.ts).
  crochet: {
    crWordmark: { en: "Ghurza", ar: "غُرزة", tr: "Ghurza" },
    crWordmarkLine: { en: "Handmade crochet · Cairo", ar: "كروشيه يدوي · القاهرة", tr: "El yapımı tığ işi · Kahire" },
    skCustomTime: { en: "Ready in 7–14 days", ar: "جاهزة خلال 7–14 يومًا", tr: "7–14 günde hazır" },
    skStoryQuote: { en: "Every piece takes days of my time, and more of my heart. I love knowing it will keep a home warm.", ar: "كل قطعة تأخذ من وقتي أيامًا، ومن قلبي أكثر. أحب أن أعرف أنها ستُدفئ بيتًا ما.", tr: "Her parça günlerimi, kalbimden de fazlasını alıyor. Bir evi ısıtacağını bilmek hoşuma gidiyor." },
    skStoryName: { en: "Umm Youssef · Head of the workshop", ar: "أم يوسف · رئيسة المشغل", tr: "Ümmü Yusuf · Atölye şefi" },
    skStoryRole: { en: "Crocheting for 22 years · Mansoura", ar: "تحيك منذ 22 عامًا · المنصورة", tr: "22 yıldır örüyor · Mansure" },
    skStat2: { en: "4,800", ar: "4,800", tr: "4.800" },
    skStat3: { en: "12", ar: "12", tr: "12" },
    crWorkshopDate: { en: "Every first Saturday · 4 pm", ar: "أول سبت من كل شهر · 4 مساءً", tr: "Her ayın ilk cumartesi · 16.00" },
    crWorkshop1Place: { en: "Zamalek", ar: "الزمالك", tr: "Zamalek" },
    crReviewsLine: { en: "4.9 from 2,300 reviews", ar: "4.9 من 2,300 تقييم", tr: "2.300 yorumdan 4,9" },
    crPromiseShipLine: { en: "In 2 to 4 days", ar: "خلال 2 إلى 4 أيام", tr: "2–4 gün içinde" },
    crContactLine: { en: "WhatsApp · 10 am to 10 pm", ar: "واتساب · من 10 صباحًا إلى 10 مساءً", tr: "WhatsApp · 10.00–22.00" },
  },
  // 211 Madar's own words where its looks leave the owner brackets: its launch, its star of the season, its area, its hours, its offer and its returns (lib/demo/electronics.ts).
  electronics: {
    elHeroKicker1: { en: "New launch · ZENRA", ar: "إطلاق جديد · ZENRA", tr: "Yeni lansman · ZENRA" },
    elStarKicker: { en: "LUMORA · OLED C5", ar: "LUMORA · OLED C5", tr: "LUMORA · OLED C5" },
    elStarTitle: { en: "True black and colours that never fade, 65 inches", ar: "سواد حقيقي وألوان لا تنطفئ بشاشة 65 بوصة", tr: "Gerçek siyah ve solmayan renkler, 65 inç" },
    elDeliverTo: { en: "Delivering to Riyadh, Al Malqa", ar: "التوصيل إلى الرياض، حي الملقا", tr: "Teslimat: Riyad, Al Malqa" },
    elContactLine: { en: "Every day, 9 am to 11 pm", ar: "يوميًا من 9 صباحًا حتى 11 مساءً", tr: "Her gün 09.00–23.00" },
    elEditTitle: { en: "Laptops for work and study, up to 15% off", ar: "لابتوبات للعمل والدراسة بخصم حتى 15%", tr: "İş ve okul için dizüstüler, %15'e varan indirim" },
    elReturnsNote: { en: "Returns within 14 days in the original box; the maker's warranty through us.", ar: "إرجاع خلال 14 يومًا في العلبة الأصلية، وضمان الوكيل عن طريقنا.", tr: "Orijinal kutusunda 14 gün içinde iade; üretici garantisi bizim üzerimizden." },
  },
  // 211 Nova's own words where its looks leave the owner brackets: its new phone, its trade-in, its brands, its bundle, its numbers and its returns (lib/demo/mobiles.ts).
  mobiles: {
    mbHeroKicker1: { en: "Veyra X3 Pro · Just in", ar: "Veyra X3 Pro · وصل حديثًا", tr: "Veyra X3 Pro · Yeni geldi" },
    mbTradeHeroLine: { en: "Up to 14,500 EGP for your device, off your new one at once", ar: "حتى 14,500 ج.م قيمة جهازك، خصمًا فوريًا من جهازك الجديد", tr: "Cihazınız için 14.500 EGP'ye kadar, yenisinden anında düşülür" },
    mbBrand1: { en: "Veyra", ar: "Veyra", tr: "Veyra" },
    mbBrand2: { en: "Orbit", ar: "Orbit", tr: "Orbit" },
    mbBrand3: { en: "Lumen", ar: "Lumen", tr: "Lumen" },
    mbBrand4: { en: "Kaira", ar: "Kaira", tr: "Kaira" },
    mbBundleLine: { en: "The Veyra X3 Pro, its leather case and a wireless charger: 54,950 EGP, 2,098 EGP less than apart.", ar: "Veyra X3 Pro مع جرابه الجلدي وشاحن لاسلكي: 54,950 ج.م، أقل بـ 2,098 ج.م من شرائها منفصلة.", tr: "Veyra X3 Pro, deri kılıfı ve kablosuz şarj cihazı: 54.950 EGP, ayrı ayrı almaktan 2.098 EGP daha az." },
    mbStat2: { en: "4.9", ar: "4.9", tr: "4,9" },
    mbStat2Line: { en: "From 38 thousand ratings", ar: "من 38 ألف تقييم", tr: "38 bin değerlendirmeden" },
    mbStat3: { en: "24 hours", ar: "24 ساعة", tr: "24 saat" },
    mbStat3Line: { en: "Delivery inside Cairo", ar: "توصيل داخل القاهرة", tr: "Kahire içinde teslimat" },
    mbStat4: { en: "9 branches", ar: "9 فروع", tr: "9 şube" },
    mbStat4Line: { en: "In Cairo and Giza", ar: "في القاهرة والجيزة", tr: "Kahire ve Giza'da" },
    mbContactLine: { en: "Customer care every day, 10 am to midnight", ar: "خدمة العملاء يوميًا من 10 صباحًا حتى منتصف الليل", tr: "Müşteri hizmetleri her gün 10.00–24.00" },
    mbEditTitle: { en: "The Orbit Nine 5G, 3,500 EGP off", ar: "Orbit Nine 5G بخصم 3,500 ج.م", tr: "Orbit Nine 5G, 3.500 EGP indirimli" },
    mbReturnsNote: { en: "Returns within 14 days, unopened or faulty, collected from your door.", ar: "الإرجاع خلال 14 يومًا للجهاز غير المفتوح أو المعيب، نستلمه من باب منزلك.", tr: "Açılmamış ya da arızalı ürünlerde 14 gün içinde iade, kapınızdan alınır." },
    // 226 Its looks C (the keynote: the star phone, its colours and figures) and D (the deals hub: free delivery).
    mbKeyHeroName: { en: "Veyra X3 Pro", ar: "Veyra X3 Pro", tr: "Veyra X3 Pro" },
    mbKeyHeroLine: { en: "More light. More detail.", ar: "ضوء أكثر. تفاصيل أكثر.", tr: "Daha çok ışık. Daha çok ayrıntı." },
    mbKeyFrom: { en: "From 54,999 EGP", ar: "ابتداءً من 54,999 ج.م", tr: "54.999 EGP'den başlayan fiyatlarla" },
    mbKeySw1: { en: "Titanium", ar: "تيتانيوم", tr: "Titanyum" },
    mbKeySw2: { en: "Black", ar: "أسود", tr: "Siyah" },
    mbKeySw3: { en: "Silver", ar: "فضي", tr: "Gümüş" },
    mbKeySw4: { en: "Blue", ar: "أزرق", tr: "Mavi" },
    mbKeySwLine: { en: "A titanium frame, IP68", ar: "إطار من التيتانيوم ومقاومة IP68", tr: "Titanyum çerçeve, IP68" },
    mbKeyWhy: { en: "A camera to carry everywhere.", ar: "كاميرا ترافقك في كل مكان.", tr: "Her yere taşınacak bir kamera." },
    mbKeySpec1: { en: "200 MP", ar: "200 ميغابكسل", tr: "200 MP" },
    mbKeySpec1Line: { en: "The main camera, with a 5x periscope", ar: "الكاميرا الرئيسية، مع تقريب بصري 5x", tr: "Ana kamera, 5x periskopla" },
    mbKeySpec2: { en: "6.7″", ar: "6.7 بوصة", tr: "6.7″" },
    mbKeySpec2Line: { en: "An OLED display that reaches 2,600 nits outdoors", ar: "شاشة OLED تصل إلى 2,600 شمعة في الخارج", tr: "Dışarıda 2.600 nit'e ulaşan OLED ekran" },
    mbKeySpec3: { en: "5,000 mAh", ar: "5,000 مللي أمبير", tr: "5.000 mAh" },
    mbKeySpec3Line: { en: "Two days of ordinary use, 65 W charging", ar: "يومان من الاستخدام العادي، وشحن 65 واط", tr: "İki gün normal kullanım, 65 W şarj" },
    mbHubCartLine: { en: "Free delivery inside the city on orders over 5,000 EGP.", ar: "توصيل مجاني داخل المدينة للطلبات فوق 5,000 ج.م.", tr: "5.000 EGP üzerindeki siparişlerde şehir içi ücretsiz teslimat." },
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
  // 131.20 A word with the app's name in it, as the demo's page has it (Leqaa's wordmark).
  const named = DEMO_APP_NAMES[id];
  if (named) for (const [word, words] of Object.entries(facts)) for (const l of DEMO_LANGS) byText.set(STUDIO_WORDS[l][word as SectionWord].replaceAll("{app}", named), words!);
  const others = DEMO_LANGS.filter((l) => l !== lang);
  const fill = (node: StudioNode): StudioNode => {
    const words = node.text ? byText.get(node.text) : undefined;
    const translations = Object.fromEntries(others.map((l) => [l, { text: words?.[l] ?? "" }])) as StudioNode["translations"];
    const out: StudioNode = words ? { ...node, text: words[lang], translations } : { ...node };
    if (node.children) out.children = node.children.map(fill);
    if (node.card) out.card = fill(node.card);
    // 130.12 And a premium element's entries (Safra B's stays): their title and text; 176.1 and their line (Sofra B's grill).
    if (node.entries) {
      out.entries = node.entries.map((entry) => {
        const own = (["title", "text", "subtitle"] as const).map((f) => [f, entry[f] ? byText.get(entry[f]!) : undefined] as const).filter(([, words]) => words);
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
  // 131.20 And the header's title (Leqaa B's wordmark in its petal header).
  const header = page.header;
  const titled = header?.title ? byText.get(header.title) : undefined;
  const filledHeader = header && titled ? { ...header, title: titled[lang], translations: Object.fromEntries(others.map((l) => [l, { ...(header.translations?.[l] ?? {}), title: titled[l] }])) as NonNullable<StudioPage["header"]>["translations"] } : header;
  return { ...page, ...(filledHeader !== header ? { header: filledHeader } : {}), body: fill(page.body) };
}

/** 131.20 The demos whose words carry the app's name, by that name (the demo app's). */
// 209 Kids' clothes, cosmetics and toys: Toota's, Velours' and Toot's too; 210 home decor's, crochet's and furniture's; 211 Madar's, Nova's and Nawah's.
const DEMO_APP_NAMES: Partial<Record<StudioDemoId, string>> = { flowers: "Leqaa", clothes: "Lujain", kids: "Toota", beauty: "Velours", toys: "Toot", decor: "Sakan", crochet: "Ghurza", furniture: "Rukn", electronics: "Madar", mobiles: "Nova", computers: "Nawah" };
