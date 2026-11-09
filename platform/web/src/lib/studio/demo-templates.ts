import type { LayoutBlock, StudioMarket, StudioNode, StudioPage } from "../pages/types";
import type { StudioDemoId } from "../demo/constants";
import { ar as studioAr, en as studioEn, tr as studioTr } from "../../i18n/dashboard/studio";
import { newNodeId } from "./elements";
import type { SectionContext, SectionWord } from "./sections";

/**
 * Templates = demos, for Yallapp Studio. Each Studio demo is made from its
 * kind's own designed page (lib/studio/sections.ts `demoStudioPage`), never
 * from a page generated for it: Zad's home is the marketplace home approved
 * in 115.14 (`marketHome`), the others their kind's first template (the
 * delivery company's, the restaurants', the ride company's, the school's,
 * the teachers'). The demo app (lib/demo/setup.ts), the demo's template a
 * project starts from and the "Like our demo" whole design
 * (lib/studio/designs.ts) are that one page, so a client gets what the demo
 * shows. tests/unit/studio-demo-templates.test.ts fails when they drift
 * apart.
 */

const pad = (v: number, h: number) => ({ top: v, end: h, bottom: v, start: h });

function idOf(ctx: SectionContext): string {
  return (ctx.newId ?? newNodeId)();
}

/** The kind's own template each Studio demo's home is (lib/studio/sections.ts TEMPLATES); Zad's is the approved marketplace home. */
export const DEMO_HOME_TEMPLATES: Record<StudioDemoId, string | "market_home"> = {
  delivery: "delivery",
  food: "food",
  marketplace: "market_home",
  rides: "ride",
  taxi: "ride",
  school: "school",
  instructors: "teachers",
};

/**
 * 115.14 The marketplace's home as it was approved (the market-home picture
 * of mobile/test/screenshots/market_screenshots_test.dart, from
 * mobile/test/support/market_fixtures.dart `homePage`): the address and
 * search on top under "Hungry? Order in minutes.", the kinds, today's
 * offers, the fastest places near you, the cuisines, the club, the
 * supermarkets and shops, ordering again and every restaurant. Each a
 * `market` element the app draws from the marketplace's data; the page
 * draws its own top, so it has no header.
 */
export function marketHome(ctx: SectionContext): StudioPage {
  const market = (section: StudioMarket, title: SectionWord | null, words: SectionWord | null = null, top = 26): StudioNode => ({
    id: idOf(ctx),
    type: "market",
    market: section,
    ...(title ? { title: ctx.w(title) } : {}),
    ...(words ? { text: ctx.w(words) } : {}),
    margin: { top, end: 0, bottom: 0, start: 0 },
  });
  return {
    background: "#F6F3EE",
    dark_background: "#0F0E1A",
    body: {
      id: idOf(ctx),
      type: "column",
      children: [
        market({ section: "address" }, "mHungry", null, 0),
        market({ section: "kinds" }, null, null, 14),
        market({ section: "offers" }, "mOffers"),
        market({ section: "vendors", style: "spotlight", kind: "restaurant", sort: "fastest", limit: 6 }, "mFastNear", "mFastNearText"),
        market({ section: "cuisines" }, "mMood"),
        market({ section: "club" }, "mClubFree", "mClubFreeText"),
        market({ section: "vendors", style: "tiles", kind: "grocery", limit: 6 }, "mShops", "mShopsText"),
        market({ section: "reorder" }, "mReorder"),
        market({ section: "vendors", style: "list", kind: "restaurant" }, "mAll"),
      ],
    },
  };
}

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

/** A text block (the demo's note on how to sign in) as a Studio element, shown to the same people. */
export function studioTextOf(ctx: SectionContext, block: LayoutBlock): StudioNode | null {
  if (block.type !== "text") return null;
  const children = paragraphsOf(block.html ?? "").map(
    (part): StudioNode => ({ id: idOf(ctx), type: "text", text: part.text, font: part.heading ? { size: 20, weight: 800, line_height: 1.25 } : { size: 15, line_height: 1.5 } }),
  );
  if (!children.length) return null;
  return { id: idOf(ctx), type: "column", gap: 6, padding: pad(8, 16), margin: pad(4, 0), visibility: block.visibility, children };
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

export const DEMO_ICONS: Record<StudioDemoId, string> = {
  delivery: "local_shipping",
  food: "delivery_dining",
  marketplace: "storefront",
  rides: "local_taxi",
  taxi: "map",
  school: "school",
  instructors: "groups",
};

/** The Studio template id of a demo: `demo_<demo>`. */
export function demoTemplateId(id: StudioDemoId): string {
  return `demo_${id}`;
}

const DEMO_VERTICALS: readonly string[] = ["taxi", "instructors", "marketplace"];
const DEMO_TYPES: readonly string[] = ["delivery", "food", "rides", "school"];

/** The Studio demo of a project's kind: its vertical's, else its type's; none for a kind without one. */
export function studioDemoOf(kind: { type: string; vertical?: string | null } | null): StudioDemoId | null {
  if (!kind) return null;
  if (kind.vertical) return DEMO_VERTICALS.includes(kind.vertical) ? (kind.vertical as StudioDemoId) : null;
  return DEMO_TYPES.includes(kind.type) ? (kind.type as StudioDemoId) : null;
}
