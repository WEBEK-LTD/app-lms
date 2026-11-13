import type { StudioHeaderStyle, StudioNode, StudioPage, Translations } from "../../pages/types";
import type { StudioDemoId } from "../../demo/constants";
import { ar as studioAr, en as studioEn, tr as studioTr } from "../../../i18n/dashboard/studio";
import type { TemplateProject } from "../academy";
import type { Fits, SectionContext, SectionWord, TemplateInfo } from "../sections";
import type { DemoDesign } from "./index";

/**
 * 130 The Signature looks (the owner, 13 November 2026): two approved looks,
 * A and B, for each Studio demo, each a real template of the demo's kind.
 * A look is a whole project: its home (`home`), its pages after the home
 * in its colours with its own elements over their screens (`design`, as a
 * demo's own design is), its tabs, its premium bar, its sign-in screen and
 * account menu and its font (`project`), and the premium header and system
 * screens' looks it asks for (`chrome`). A project started from one keeps
 * the look's id (`SectionContext.look`), so every page lib/studio/demo-pages.ts
 * draws for it is in the look. Each demo's looks are in its own file of
 * this folder; the registry below lists them.
 */

/**
 * 130 What a look asks of the premium chrome (the header styles and the
 * system screens' looks the premium chrome engineer adds, rows
 * 130.20–130.29): the header style of its pages after the home and the
 * look its system screens take (account, settings, notifications,
 * language, edit profile, help, the lists, sign-in and code entry, empty
 * and loading states), named as that work names them.
 */
export interface SignatureChrome {
  /** The header of the pages after the home. */
  header: StudioHeaderStyle;
  /** The home's header. */
  home: StudioHeaderStyle;
  /** The system screens' look, by the board: the account's hero, grouped rows in inset cards, shimmer in the look's tones. */
  screens: "photo" | "card" | "glass" | "night";
}

export interface SignatureLook {
  /** `<demo>_signature_<a|b>`: also the template's id (its name: studio.tpl_<id>). */
  id: string;
  demo: StudioDemoId;
  letter: "a" | "b";
  icon: string;
  fits: Fits;
  home: (ctx: SectionContext) => StudioPage;
  /** Its pages after the home, as a demo's own design has them. */
  design: Omit<DemoDesign, "template" | "home">;
  project: TemplateProject;
  chrome: SignatureChrome;
}

type Lang = "en" | "ar" | "tr";
const LANGS: readonly Lang[] = ["en", "ar", "tr"];
const WORDS = { en: studioEn, ar: studioAr, tr: studioTr };

/** One of Studio's words in each of its languages. */
export function wordsOf(word: SectionWord): Record<Lang, string> {
  return Object.fromEntries(LANGS.map((l) => [l, String(WORDS[l][`w_${word}`])])) as Record<Lang, string>;
}

/**
 * A context that remembers the words it wrote, and the page made with it
 * with Studio's other languages as translations: of its texts and titles
 * (as lib/studio/demo-templates.ts `translating` does) and of the premium
 * elements' entries and stories too.
 */
export function lookWords(ctx: SectionContext): { ctx: SectionContext; translate: (node: StudioNode) => StudioNode } {
  const written = new Map<string, SectionWord>();
  const lang: Lang = ctx.lang ?? "en";
  const others = LANGS.filter((l) => l !== lang);
  const w = (word: SectionWord) => {
    const value = ctx.w(word);
    written.set(value, word);
    return value;
  };
  const other = (value: string | null | undefined, l: Lang): string | null => {
    const word = value ? written.get(value) : undefined;
    if (!word) return null;
    const text = String(WORDS[l][`w_${word}`]);
    if (text.includes("{app}") && !ctx.app) return null;
    return text.replaceAll("{app}", ctx.app ?? "");
  };
  /** The translations of `fields` of `thing`, or null when none of them is one of the words. */
  const of = (thing: Record<string, unknown>, fields: readonly string[]): Translations | null => {
    const out: Translations = {};
    let any = false;
    for (const l of others) {
      const row: Record<string, string> = {};
      for (const f of fields) {
        const t = other(thing[f] as string | null | undefined, l);
        if (t !== null) {
          row[f] = t;
          any = true;
        }
      }
      out[l] = row;
    }
    return any ? out : null;
  };
  const translate = (node: StudioNode): StudioNode => {
    const out: StudioNode = { ...node };
    const own = of(node as unknown as Record<string, unknown>, ["text", "title"]);
    if (own) out.translations = own;
    if (node.entries) out.entries = node.entries.map((e) => ({ ...e, ...(of(e as Record<string, unknown>, ["title", "subtitle", "text", "label"]) ? { translations: of(e as Record<string, unknown>, ["title", "subtitle", "text", "label"])! } : {}) }));
    if (node.slides) out.slides = node.slides.map((s) => ({ ...s, ...(of(s as unknown as Record<string, unknown>, ["heading", "subheading"]) ? { translations: of(s as unknown as Record<string, unknown>, ["heading", "subheading"])! } : {}) }));
    if (node.children) out.children = node.children.map(translate);
    if (node.card) out.card = translate(node.card);
    return out;
  };
  return { ctx: { ...ctx, w }, translate };
}

/** A look as a template of its kind: its home in the dashboard's language with Studio's others as translations, the whole project with it. */
export function signatureTemplate(look: SignatureLook): TemplateInfo {
  return {
    id: look.id,
    icon: look.icon,
    fits: look.fits,
    look: look.id,
    project: look.project,
    make: (ctx: SectionContext) => {
      const { ctx: words, translate } = lookWords(ctx);
      const page = look.home({ ...words, look: look.id });
      const header = page.header ? { ...page.header, style: look.chrome.home } : page.header;
      return { ...page, ...(header ? { header } : {}), body: translate(page.body) };
    },
  };
}
