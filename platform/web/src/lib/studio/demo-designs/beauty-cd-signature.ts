import type { Action, LayoutTab, StudioEntry, StudioFont, StudioNode, StudioPage, StudioSides, Translations } from "../../pages/types";
import { APP_WORDS } from "../app-words";
import type { SectionContext, SectionInfo, SectionWord } from "../sections";
import { idOf, screen } from "./parts";
import { signatureScreens, type SignatureDesign } from "./signature";
import { inked, sides, sigEntry, sigPhoto, sigTexts, signatureBar, signatureHeader, type SignatureInk } from "./food-signature-parts";
import { PRODUCT_PAGE_SLUG, productPart, type ProductPagePart } from "../product-page";
import { STUDIO_PRODUCT_SCREEN } from "../../pages/types";

/**
 * 224 Velours (cosmetics) templates C and D, the owner's third round (23
 * November 2026): two whole store projects that share nothing with looks A
 * and B (./beauty-signature.ts) nor with any other type's templates, each
 * built only from Studio's elements so every part is the owner's to change.
 *
 * C · THE RITUAL CLINIC (the type's main template): clinical white and a
 * cool teal, Zain. A centred clinic wordmark with its lab number, the skin
 * test first (the `quiz` element as frosted glass over a photo), the
 * morning and night routine as numbered steps (two `tabs`), ingredient
 * chips with their strength, lab cards numbered like formulas, the
 * expert's note; a segmented bar.
 *
 * D · THE SHADE STUDIO: deep plum and black with gloss, Kufam. The hero is
 * the shade carousel itself (the `swatches` element on a glossy plum card
 * under a big shade name), a vertical strip of tutorial reels, a before
 * and after (`before_after`), tall gloss cards and mood tiles; a glowing
 * dock.
 *
 * Both: the category menu (every main category a row of cards with its
 * sub-categories; the account, orders, wishlist, language and contact at
 * its foot), the shop, cart and orders in the look, their tabs and bar,
 * their sign-in and account menu.
 */

const P = (name: string) => `/beauty-photos/${name}.jpg`;
const shop: Action = screen("search");
const pageOf = (slug: string): Action => ({ type: "page", page_slug: slug });
const ownPage = (ctx: SectionContext, slug: string): Action => (ctx.ownPages === false ? shop : pageOf(slug));
/** The category menu's page (both templates have it). */
export const CD_MENU_PAGE = "menu";
const WHITE = { color: "#FFFFFF", dark_color: "#FFFFFF" } as const;

/** A template's ink, its quiet fill, its face and its name. */
interface Look {
  k: SignatureInk;
  tint: { day: string; night: string };
  family: string;
  look: "c" | "d";
}

const say = (ctx: SectionContext, l: Look, word: SectionWord, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode => inked(ctx, l.k, ctx.w(word), { family: l.family, ...font }, extra);
const raw = (ctx: SectionContext, l: Look, text: string, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode => inked(ctx, l.k, text, { family: l.family, ...font }, extra);
const icon = (ctx: SectionContext, name: string, size: number, ink: { color: string; dark_color: string }, extra: Partial<StudioNode> = {}): StudioNode => ({ id: idOf(ctx)(), type: "icon", icon: name, icon_size: size, ...ink, ...extra });
const image = (ctx: SectionContext, l: Look, photo: string, look: Partial<StudioNode>): StudioNode => {
  const url = sigPhoto(ctx, P(photo));
  return url ? { id: idOf(ctx)(), type: "image", image_url: url, fit: "cover", ...look } : { id: idOf(ctx)(), type: "column", background: l.tint.day, dark_background: l.tint.night, ...look, children: [] };
};

/** A tab renamed in Studio's three languages. */
function tabOf(ctx: SectionContext | null, t: LayoutTab, word: SectionWord, iconName: string): LayoutTab {
  const translations: Record<string, { label: string }> = {};
  for (const lang of ["ar", "tr"] as const) translations[lang] = { label: APP_WORDS[lang][word as keyof typeof APP_WORDS.en] };
  void ctx;
  return { ...t, label: APP_WORDS.en[word as keyof typeof APP_WORDS.en], icon: iconName, translations: translations as Translations };
}

// ——— C · THE RITUAL CLINIC ———

/** C: clinical white and a cool teal; a blue-black night. */
export const CLINIC_INK: SignatureInk = {
  page: "#F4F6F7",
  darkPage: "#0B1013",
  surface: "#FFFFFF",
  darkSurface: "#141B20",
  ink: "#10171C",
  darkInk: "#EAF1F4",
  muted: "#55626B",
  darkMuted: "#9AAAB3",
  line: "#DDE3E7",
  darkLine: "#25323A",
  accent: "#2C6E74",
  darkAccent: "#7FC7CC",
  fill: "#10171C",
  darkFill: "#EAF1F4",
  onFill: "#FFFFFF",
  darkOnFill: "#0B1013",
};
const C = CLINIC_INK;
const LOOK_C: Look = { k: C, tint: { day: "#E3EFF0", night: "#16292D" }, family: "Zain", look: "c" };

/** C's section title: the title at the start, its lab code (Latin capitals, spaced) at the end. */
function clinicHead(ctx: SectionContext, l: Look, title: SectionWord, code: SectionWord | null, padding: StudioSides = sides(26, 16, 12, 16)): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "row",
    name: ctx.w(title),
    cross: "end",
    gap: 10,
    padding,
    children: [say(ctx, l, title, { size: 23, weight: 800, line_height: 1.1 }, { width: "fill", max_lines: 1 }), ...(code ? [say(ctx, l, code, { size: 11.5, weight: 500, letter_spacing: 1.6 }, { muted: true, max_lines: 1 })] : [])],
  };
}

/** The skin test's questions and results (look A and B's words): each answer counts for the result in its place. */
const QUIZ_QUESTIONS: readonly [SectionWord, readonly SectionWord[]][] = [
  ["btQ1", ["btQ1A1", "btQ1A2", "btQ1A3", "btQ1A4"]],
  ["btQ2", ["btQ2A1", "btQ2A2", "btQ2A3", "btQ2A4"]],
  ["btQ3", ["btQ3A1", "btQ3A2", "btQ3A3", "btQ3A4"]],
  ["btQ4", ["btQ4A1", "btQ4A2", "btQ4A3", "btQ4A4"]],
];
const QUIZ_RESULTS: readonly [SectionWord, SectionWord, string, string][] = [
  ["btSkinDry", "btSkinDryText", "spa", "routine-dry"],
  ["btSkinCombination", "btSkinCombinationText", "auto_awesome", "routine-morning"],
  ["btSkinOily", "btSkinOilyText", "diamond", "routine-oily"],
  ["btSkinSensitive", "btSkinSensitiveText", "healing", "routine-calm"],
];

function questionEntry(ctx: SectionContext, question: SectionWord, answers: readonly SectionWord[]): StudioEntry {
  const lang = ctx.lang ?? "en";
  const translations: Record<string, Record<string, string>> = {};
  for (const x of (["en", "ar", "tr"] as const).filter((y) => y !== lang)) translations[x] = { title: APP_WORDS[x][question as keyof typeof APP_WORDS.en], text: answers.map((a) => APP_WORDS[x][a as keyof typeof APP_WORDS.en]).join("\n") };
  return { title: ctx.w(question), text: answers.map((a) => ctx.w(a)).join("\n"), translations: translations as Translations };
}

/** The skin test first: the `quiz` element as frosted glass over a face, its kicker over it. */
function clinicQuiz(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { text: "vcQuizTitle", title: "vcQuizButton" });
  const results: StudioEntry[] = QUIZ_RESULTS.map(([name, text, ic, photo]) => {
    const url = sigPhoto(ctx, P(photo));
    return { ...sigEntry(ctx, { title: name, text, label: "btQuizShop" }), icon: ic, ...(url ? { image_url: url } : {}), action: shop };
  });
  const photo = sigPhoto(ctx, P("hero-calm"));
  return {
    id: id(),
    type: "column",
    name: ctx.w("vcQuizTitle"),
    gap: 0,
    align: "end",
    min_height: 300,
    radius: 26,
    padding: sides(64, 12, 12, 12),
    margin: sides(6, 16, 0, 16),
    background: l.tint.day,
    dark_background: l.tint.night,
    ...(photo ? { image_background_url: photo } : {}),
    children: [
      {
        id: id(),
        type: "column",
        gap: 0,
        radius: 20,
        padding: sides(14, 4, 4, 4),
        surface: { glass: 22, tint: 0.62, soft: 2 },
        children: [
          { ...say(ctx, l, "vcQuizKicker", { size: 12, weight: 700, letter_spacing: 1 }, { accent: true, max_lines: 1 }), padding: sides(0, 12, 0, 12) },
          {
            id: id(),
            type: "quiz",
            name: ctx.w("vcQuizTitle"),
            text: t.text,
            title: t.title,
            translations: t.translations,
            entries: results,
            quiz: { questions: QUIZ_QUESTIONS.map(([q, a]) => questionEntry(ctx, q, a)) },
            font: { family: l.family },
            color: l.k.ink,
            dark_color: l.k.darkInk,
            padding: sides(4, 12, 10, 12),
          },
        ],
      },
    ],
  };
}

/** One numbered step of the routine: its number in a teal ring, the product's photo, its words and its measure. */
function routineStep(ctx: SectionContext, l: Look, n: number, photo: string, title: SectionWord, line: SectionWord, last: boolean): StudioNode[] {
  const id = idOf(ctx);
  const row: StudioNode = {
    id: id(),
    type: "row",
    name: ctx.w(title),
    gap: 12,
    cross: "center",
    padding: sides(11, 0, 11, 0),
    action: shop,
    children: [
      {
        id: id(),
        type: "row",
        width: 32,
        height: 32,
        radius: 16,
        align: "center",
        cross: "center",
        border_color: l.k.accent,
        dark_border_color: l.k.darkAccent,
        border_width: 1.5,
        children: [raw(ctx, l, String(n).padStart(2, "0"), { size: 13, weight: 800 }, { accent: true })],
      },
      image(ctx, l, photo, { width: 48, height: 48, radius: 12 }),
      { id: id(), type: "column", width: "fill", gap: 1, children: [say(ctx, l, title, { size: 16, weight: 700 }, { max_lines: 1 }), say(ctx, l, line, { size: 13 }, { muted: true, max_lines: 1 })] },
      icon(ctx, "chevron_left", 20, { color: l.k.muted, dark_color: l.k.darkMuted }),
    ],
  };
  return last ? [row] : [row, { id: id(), type: "divider", height: 1, background: l.k.line, dark_background: l.k.darkLine }];
}

const MORNING: readonly [string, SectionWord, SectionWord][] = [
  ["olive-soap", "vcM1", "vcM1Text"],
  ["vitamin-c", "vcM2", "vcM2Text"],
  ["gel-cream", "vcM3", "vcM3Text"],
  ["spf", "vcM4", "vcM4Text"],
];
const NIGHT: readonly [string, SectionWord, SectionWord][] = [
  ["coconut-balm", "vcN1", "vcN1Text"],
  ["retinol", "vcN2", "vcN2Text"],
  ["hyaluronic", "vcN3", "vcN3Text"],
  ["deep-cream", "vcN4", "vcN4Text"],
];

/** The routine: morning and night as two tabs, each its numbered steps. */
function clinicRoutine(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const steps = (list: typeof MORNING, word: SectionWord, ic: string): StudioNode => ({ id: id(), type: "column", name: ctx.w(word), title: ctx.w(word), icon: ic, gap: 0, children: list.flatMap(([photo, title, line], i) => routineStep(ctx, l, i + 1, photo, title, line, i === list.length - 1)) });
  return {
    id: id(),
    type: "column",
    name: ctx.w("vcRoutineTitle"),
    gap: 6,
    radius: 22,
    padding: sides(10, 14, 6, 14),
    margin: sides(0, 16, 0, 16),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    children: [{ id: id(), type: "tabs", name: ctx.w("vcRoutineTitle"), gap: 6, color: l.k.ink, dark_color: l.k.darkInk, children: [steps(MORNING, "btMorning", "wb_sunny"), steps(NIGHT, "btEvening", "dark_mode")] }],
  };
}

/** Ingredient chips: the strength in teal, the ingredient's name; each opens the shop. */
function ingredientChips(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const chip = (word: SectionWord, strength: string | null, lit: boolean): StudioNode => ({
    id: id(),
    type: "row",
    name: ctx.w(word),
    gap: 6,
    cross: "center",
    radius: 99,
    padding: sides(7, 13, 7, 13),
    action: shop,
    ...(lit ? { background: l.tint.day, dark_background: l.tint.night } : { background: l.k.surface, dark_background: l.k.darkSurface, border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1 }),
    children: [...(strength ? [raw(ctx, l, strength, { size: 13.5, weight: 800 }, { accent: true })] : []), say(ctx, l, word, { size: 14, weight: 500 }, { max_lines: 1 })],
  });
  return {
    id: id(),
    type: "column",
    name: ctx.w("vcIngTitle"),
    gap: 8,
    padding: sides(0, 16, 0, 16),
    children: [
      { id: id(), type: "row", gap: 8, children: [chip("vcIng1", "10%", true), chip("vcIng2", "2%", false)] },
      { id: id(), type: "row", gap: 8, children: [chip("vcIng3", "0.3%", false), chip("vcIng4", "15%", false)] },
      { id: id(), type: "row", gap: 8, children: [chip("vcIng5", null, false), chip("vcIng6", null, false)] },
    ],
  };
}

/** A lab card: a formula strip (FORMULA, the product's line), its photo, name, a teal strength bar, its price and an add button. */
function labCard(ctx: SectionContext, l: Look, width: number): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    width,
    gap: 0,
    radius: 18,
    background: l.k.surface,
    dark_background: l.k.darkSurface,
    border_color: l.k.line,
    dark_border_color: l.k.darkLine,
    border_width: 1,
    children: [
      {
        id: id(),
        type: "row",
        gap: 6,
        cross: "center",
        padding: sides(9, 11, 9, 11),
        children: [say(ctx, l, "vcFormula", { size: 10.5, weight: 600, letter_spacing: 1.4 }, { muted: true, max_lines: 1 }), { id: id(), type: "text", bind: "subtitle", max_lines: 1, width: "fill", text_align: "end", color: l.k.accent, dark_color: l.k.darkAccent, font: { family: l.family, size: 11, weight: 600 } }],
      },
      { id: id(), type: "divider", height: 1, background: l.k.line, dark_background: l.k.darkLine },
      {
        id: id(),
        type: "stack",
        width,
        height: 156,
        children: [
          { id: id(), type: "image", bind: "image", width, height: 156, fit: "cover", background: "#E9EDEF", dark_background: "#1B242A" },
          { id: id(), type: "text", bind: "sale", font: { size: 11, weight: 800 }, color: "#FFFFFF", dark_color: "#0B1013", background: l.k.accent, dark_background: l.k.darkAccent, radius: 8, padding: sides(3, 7, 3, 7), place: { x: 5, y: 5 } },
        ],
      },
      {
        id: id(),
        type: "column",
        gap: 6,
        padding: sides(10, 11, 11, 11),
        children: [
          { id: id(), type: "text", bind: "title", max_lines: 2, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 15.5, weight: 700, line_height: 1.15 } },
          { id: id(), type: "row", height: 4, radius: 2, background: l.k.line, dark_background: l.k.darkLine, children: [{ id: id(), type: "row", width: Math.round(width * 0.45), height: 4, radius: 2, background: l.k.accent, dark_background: l.k.darkAccent, children: [] }] },
          {
            id: id(),
            type: "row",
            gap: 6,
            cross: "center",
            children: [
              { id: id(), type: "column", width: "fill", gap: 0, children: [{ id: id(), type: "text", bind: "price", max_lines: 1, color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 16, weight: 800 } }, { id: id(), type: "text", bind: "was_price", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 11.5 } }] },
              icon(ctx, "add", 18, { color: l.k.onFill, dark_color: l.k.darkOnFill }, { radius: 9, padding: sides(6, 6, 6, 6), background: l.k.fill, dark_background: l.k.darkFill }),
            ],
          },
        ],
      },
    ],
  };
}

function labGrid(ctx: SectionContext, l: Look, word: SectionWord, sort: "newest" | "popular" = "popular"): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w(word), source: "products", layout: "grid", columns: 2, gap: 10, padding: sides(0, 16, 0, 16), query: { limit: 4, category_id: null, featured: false, sort, ids: [] }, card: labCard(ctx, l, 174) };
}

/** The expert's note: her photo in a circle, her words on the teal tint. */
function expertNote(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: ctx.w("vcNoteKicker"),
    gap: 12,
    cross: "center",
    radius: 22,
    padding: sides(16, 16, 16, 16),
    margin: sides(22, 16, 0, 16),
    background: l.tint.day,
    dark_background: l.tint.night,
    children: [image(ctx, l, "routine-morning", { width: 60, height: 60, radius: 30 }), { id: id(), type: "column", width: "fill", gap: 3, children: [say(ctx, l, "vcNoteKicker", { size: 12.5, weight: 700 }, { accent: true }), say(ctx, l, "vcNote", { size: 15, line_height: 1.45 }, { max_lines: 3 })] }],
  };
}

/** Three promises as a thin ruled strip. */
function clinicTrust(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const cell = (ic: string, word: SectionWord): StudioNode => ({ id: id(), type: "column", width: "fill", gap: 5, cross: "center", padding: sides(14, 4, 14, 4), children: [icon(ctx, ic, 22, { color: l.k.accent, dark_color: l.k.darkAccent }), say(ctx, l, word, { size: 12.5, weight: 600 }, { text_align: "center", max_lines: 2 })] });
  const rule = (): StudioNode => ({ id: id(), type: "row", width: 1, height: 44, background: l.k.line, dark_background: l.k.darkLine, self_align: "center", children: [] });
  return { id: id(), type: "row", name: ctx.w("vcTrust1"), gap: 0, margin: sides(14, 16, 0, 16), radius: 18, border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1, children: [cell("verified_user", "vcTrust1"), rule(), cell("verified", "vcTrust2"), rule(), cell("support_agent", "vcTrust3")] };
}

function clinicHome(ctx: SectionContext): StudioPage {
  const l = LOOK_C;
  const t = sigTexts(ctx, { title: "vcWordmark", subtitle: "vcWordmarkLine" });
  return {
    header: { type: "logo_center", ...t, buttons: ["menu", "cart"], menu_page: CD_MENU_PAGE, background: C.page, dark_background: C.darkPage, color: C.ink, dark_color: C.darkInk },
    background: C.page,
    dark_background: C.darkPage,
    body: {
      id: idOf(ctx)(),
      type: "column",
      padding: sides(0, 0, 104, 0),
      children: [
        clinicQuiz(ctx, l),
        clinicHead(ctx, l, "vcRoutineTitle", "vcRoutineCode"),
        clinicRoutine(ctx, l),
        clinicHead(ctx, l, "vcIngTitle", "vcIngCode"),
        ingredientChips(ctx, l),
        clinicHead(ctx, l, "vcLabTitle", "vcLabCode"),
        labGrid(ctx, l, "vcLabTitle"),
        expertNote(ctx, l),
        clinicTrust(ctx, l),
      ],
    },
  };
}

// ——— D · THE SHADE STUDIO ———

/** D: blush paper and plum by day, black and a hot pink by night; the hero's gloss plum both. */
export const SHADE_INK: SignatureInk = {
  page: "#FBF3F6",
  darkPage: "#0A0508",
  surface: "#FFFFFF",
  darkSurface: "#1A0D16",
  ink: "#2A0E22",
  darkInk: "#FBEFF5",
  muted: "#7A5A6E",
  darkMuted: "#B897AA",
  line: "#EBD9E2",
  darkLine: "#2E1626",
  accent: "#9B1B5A",
  darkAccent: "#FF6FA8",
  fill: "#2A0E22",
  darkFill: "#FF3D8B",
  onFill: "#FFFFFF",
  darkOnFill: "#FFFFFF",
};
const D = SHADE_INK;
const LOOK_D: Look = { k: D, tint: { day: "#F3E2EA", night: "#24101D" }, family: "Kufam", look: "d" };
const GLOSS = { from: "#5A1240", to: "#1E0818", angle: 160 } as const;

/** D's title: big, tight display type; a pink link at its end. */
function shadeHead(ctx: SectionContext, l: Look, title: SectionWord, link: { word: SectionWord; action: Action } | null): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "row",
    name: ctx.w(title),
    cross: "end",
    gap: 10,
    padding: sides(28, 18, 12, 18),
    children: [say(ctx, l, title, { size: 27, weight: 900, line_height: 1.05, letter_spacing: -0.4 }, { width: "fill", max_lines: 2 }), ...(link ? [say(ctx, l, link.word, { size: 13, weight: 700 }, { accent: true, max_lines: 1, action: link.action })] : [])],
  };
}

const SHADES: readonly [string, string, SectionWord, SectionWord][] = [
  ["01", "#E8A29A", "vdShade1", "vdShade1Text"],
  ["04", "#C2575F", "vdShade2", "vdShade2Text"],
  ["07", "#7B1E3E", "vdShade3", "vdShade3Text"],
  ["09", "#A3122A", "vdShade4", "vdShade4Text"],
  ["12", "#4A1028", "vdShade5", "vdShade5Text"],
  ["03", "#D77B6A", "vdShade6", "vdShade6Text"],
];

/** The hero: a glossy plum card, the lips in an arch, the big shade name, and the shade carousel (`swatches`) under them. */
function shadeHero(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { text: "vdChooseShade" });
  return {
    id: id(),
    type: "column",
    name: ctx.w("vdHeroKicker"),
    gap: 14,
    padding: sides(18, 18, 20, 18),
    corners: { bottom_start: 34, bottom_end: 34 },
    gradient: GLOSS,
    background: "#3A0C2A",
    dark_background: "#120610",
    surface: { glow: "#FF6FA8", pattern: "grain", pattern_strength: 0.05 },
    children: [
      {
        id: id(),
        type: "row",
        gap: 16,
        cross: "end",
        children: [
          image(ctx, l, "velvet-lips", { width: 146, height: 190, corners: { top_start: 73, top_end: 73, bottom_start: 18, bottom_end: 18 } }),
          {
            id: id(),
            type: "column",
            width: "fill",
            gap: 6,
            children: [
              { ...say(ctx, l, "vdHeroKicker", { size: 11.5, weight: 600, letter_spacing: 1.5 }, { max_lines: 2 }), color: "#FFB3D1", dark_color: "#FFB3D1" },
              { ...say(ctx, l, "vdHeroShade", { size: 42, weight: 900, line_height: 1 }, { max_lines: 2 }), ...WHITE },
              { ...say(ctx, l, "vdHeroLine", { size: 13, line_height: 1.4 }, { max_lines: 2 }), color: "#F3D6E4", dark_color: "#F3D6E4" },
              {
                id: id(),
                type: "button",
                name: ctx.w("vdTryShade"),
                text: ctx.w("vdTryShade"),
                icon: "arrow_back",
                icon_position: "end",
                width: "hug",
                height: 42,
                radius: 21,
                padding: sides(0, 16, 0, 16),
                margin: sides(6, 0, 0, 0),
                background: "#FFFFFF",
                dark_background: "#FFFFFF",
                color: "#2A0E22",
                dark_color: "#2A0E22",
                font: { family: l.family, size: 13.5, weight: 800 },
                action: shop,
              },
            ],
          },
        ],
      },
      {
        id: id(),
        type: "swatches",
        name: ctx.w("vdChooseShade"),
        // No button of its own: "Try the shade" above it opens the shop, in the look's face.
        text: t.text,
        translations: t.translations,
        action: shop,
        swatches: { shape: "circle", size: 52 },
        entries: SHADES.map(([code, hex, name, line]) => ({ ...sigEntry(ctx, { title: name, text: line }), subtitle: code, color: hex, ...(code === "07" ? { highlight: true } : {}) })),
        font: { family: l.family },
        color: "#FFFFFF",
        dark_color: "#FFFFFF",
        background: "#4A1A3A",
        dark_background: "#241020",
        radius: 22,
        padding: sides(14, 14, 14, 14),
      },
    ],
  };
}

/** A tall reel: its photo under a shade, a play button, its title and its length. */
function reel(ctx: SectionContext, l: Look, photo: string, title: SectionWord, length: string, width = 126, height = 224): StudioNode {
  const id = idOf(ctx);
  // A cover takes its row's whole width: held in a column of the reel's width.
  return { id: id(), type: "column", name: ctx.w(title), width, gap: 0, children: [{
    id: id(),
    type: "photo_hero",
    name: ctx.w(title),
    image_url: sigPhoto(ctx, P(photo)),
    height,
    radius: 22,
    background: "#2A0E22",
    scrim: { color: "#14040E", from: 0.05, middle: 0.2, at: 45, to: 0.88 },
    align: "between",
    padding: sides(10, 10, 12, 10),
    action: shop,
    children: [
      { id: id(), type: "row", gap: 0, children: [icon(ctx, "play_arrow", 20, WHITE, { radius: 99, padding: sides(5, 5, 5, 5), surface: { glass: 10, tint: 0.2 } })] },
      { id: id(), type: "column", gap: 2, children: [{ ...say(ctx, l, title, { size: 13.5, weight: 800, line_height: 1.25 }, { max_lines: 3 }), ...WHITE }, { ...raw(ctx, l, length, { size: 11 }), color: "#F3D6E4", dark_color: "#F3D6E4" }] },
    ],
  }] };
}

function reelStrip(ctx: SectionContext, l: Look): StudioNode {
  return {
    id: idOf(ctx)(),
    type: "row",
    name: ctx.w("vdReelsTitle"),
    gap: 10,
    scroll: true,
    padding: sides(0, 18, 0, 18),
    children: [reel(ctx, l, "eyeliner", "vdReel1", "0:58"), reel(ctx, l, "smoky-palette", "vdReel2", "1:24"), reel(ctx, l, "shade-face", "vdReel3", "0:45"), reel(ctx, l, "blush", "vdReel4", "1:05")],
  };
}

/** Before and after: two faces, the divider to drag, their words the labels. */
function beforeAfter(ctx: SectionContext, l: Look): StudioNode {
  const before = sigTexts(ctx, { caption: "vdBefore" });
  const after = sigTexts(ctx, { caption: "vdAfter" });
  const a = sigPhoto(ctx, P("routine-calm"));
  const b = sigPhoto(ctx, P("routine-morning"));
  // Without Yallapp's photos at hand (a page made alone), a quiet shape for the owner's own two.
  if (!a || !b) return { id: idOf(ctx)(), type: "column", name: ctx.w("vdBeforeAfter"), height: 260, radius: 26, margin: sides(0, 18, 0, 18), background: l.tint.day, dark_background: l.tint.night, children: [] };
  return {
    id: idOf(ctx)(),
    type: "before_after",
    name: ctx.w("vdBeforeAfter"),
    images: [{ image_url: a, ...before }, { image_url: b, ...after }],
    compare: { at: 50 },
    aspect_ratio: 1.33,
    radius: 26,
    margin: sides(0, 18, 0, 18),
    background: l.k.surface,
    dark_background: l.k.darkSurface,
  };
}

/** A tall gloss card: the photo with soft corners, the name, its line and the price in pink. */
function glossCard(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "column",
    width: 168,
    gap: 3,
    children: [
      {
        id: id(),
        type: "stack",
        width: 168,
        height: 212,
        children: [
          { id: id(), type: "image", bind: "image", width: 168, height: 212, radius: 26, fit: "cover", background: l.tint.day, dark_background: l.tint.night },
          { id: id(), type: "text", bind: "sale", font: { size: 11, weight: 800 }, color: "#FFFFFF", dark_color: "#FFFFFF", background: "#FF3D8B", dark_background: "#FF3D8B", radius: 99, padding: sides(4, 9, 4, 9), place: { x: 6, y: 5 } },
        ],
      },
      { id: id(), type: "text", bind: "title", max_lines: 1, padding: sides(6, 2, 0, 2), color: l.k.ink, dark_color: l.k.darkInk, font: { family: l.family, size: 14.5, weight: 800 } },
      { id: id(), type: "text", bind: "subtitle", max_lines: 1, padding: sides(0, 2, 0, 2), color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 11.5 } },
      { id: id(), type: "row", gap: 6, cross: "center", padding: sides(0, 2, 0, 2), children: [{ id: id(), type: "text", bind: "price", max_lines: 1, color: l.k.accent, dark_color: l.k.darkAccent, font: { family: l.family, size: 14.5, weight: 800 } }, { id: id(), type: "text", bind: "was_price", max_lines: 1, color: l.k.muted, dark_color: l.k.darkMuted, font: { size: 11.5 } }] },
    ],
  };
}

function glossRow(ctx: SectionContext, l: Look): StudioNode {
  return { id: idOf(ctx)(), type: "items", name: ctx.w("vdGlossTitle"), source: "products", layout: "carousel", gap: 12, padding: sides(0, 18, 0, 18), query: { limit: 8, category_id: null, featured: true, sort: "popular", ids: [] }, card: glossCard(ctx, l) };
}

/** The moods as gradient tiles, two by two, each opening the shop. */
function moodTiles(ctx: SectionContext, l: Look): StudioNode {
  const id = idOf(ctx);
  const tile = (word: SectionWord, from: string, to: string): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: "fill",
    height: 96,
    align: "end",
    radius: 22,
    padding: sides(12, 14, 12, 14),
    gradient: { from, to, angle: 135 },
    background: to,
    dark_background: to,
    action: shop,
    children: [{ ...say(ctx, l, word, { size: 21, weight: 900 }, { max_lines: 1 }), ...WHITE }],
  });
  return {
    id: id(),
    type: "column",
    name: ctx.w("vdMoodTitle"),
    gap: 10,
    padding: sides(0, 18, 0, 18),
    children: [
      { id: id(), type: "row", gap: 10, children: [tile("vdMood1", "#E8A29A", "#B5525C"), tile("vdMood2", "#4A1028", "#120610")] },
      { id: id(), type: "row", gap: 10, children: [tile("vdMood3", "#C2575F", "#7B1E3E"), tile("vdMood4", "#D9B38C", "#8A5A3C")] },
    ],
  };
}

function shadeHome(ctx: SectionContext): StudioPage {
  const l = LOOK_D;
  const t = sigTexts(ctx, { title: "vdWordmark" });
  return {
    header: { type: "logo_actions", ...t, buttons: ["menu", "search", "cart"], menu_page: CD_MENU_PAGE, background: "#3A0C2A", dark_background: "#120610", color: "#FFFFFF", dark_color: "#FFFFFF" },
    background: D.page,
    dark_background: D.darkPage,
    body: {
      id: idOf(ctx)(),
      type: "column",
      padding: sides(0, 0, 110, 0),
      children: [
        shadeHero(ctx, l),
        shadeHead(ctx, l, "vdReelsTitle", { word: "vdAllLessons", action: shop }),
        reelStrip(ctx, l),
        shadeHead(ctx, l, "vdBeforeAfter", null),
        beforeAfter(ctx, l),
        shadeHead(ctx, l, "vdGlossTitle", { word: "vdShop", action: shop }),
        glossRow(ctx, l),
        shadeHead(ctx, l, "vdMoodTitle", null),
        moodTiles(ctx, l),
      ],
    },
  };
}

// ——— The pages after the home (both) ———

/** The category menu: the search, then (C) the skin types or (D) the shades as quick ways in, every main category a row of cards, then the account, orders, wishlist, language and contact as a list. */
function menuPage(ctx: SectionContext, l: Look): StudioPage {
  const id = idOf(ctx);
  const t = sigTexts(ctx, { title: l.look === "c" ? "vcWordmark" : "vdWordmark" });
  const clinic = l.look === "c";
  const quick = (word: SectionWord, lead: StudioNode): StudioNode => ({
    id: id(),
    type: "column",
    name: ctx.w(word),
    width: 74,
    gap: 6,
    cross: "center",
    action: shop,
    children: [lead, say(ctx, l, word, { size: 12, weight: 600 }, { text_align: "center", max_lines: 1 })],
  });
  const quicks: StudioNode[] = clinic
    ? QUIZ_RESULTS.map(([word, , ic]) => quick(word, icon(ctx, ic, 22, { color: l.k.accent, dark_color: l.k.darkAccent }, { radius: 16, padding: sides(15, 15, 15, 15), background: l.k.surface, dark_background: l.k.darkSurface, border_color: l.k.line, dark_border_color: l.k.darkLine, border_width: 1 })))
    : SHADES.slice(0, 4).map(([, hex, word]) => quick(word, { id: id(), type: "row", width: 52, height: 52, radius: 26, background: hex, dark_background: hex, surface: { glow: "#FFFFFF" }, children: [] }));
  const line = (word: SectionWord, ic: string, action: Action, last = false): StudioNode[] => [
    {
      id: id(),
      type: "row",
      name: ctx.w(word),
      gap: 12,
      cross: "center",
      padding: sides(13, 4, 13, 4),
      action,
      children: [icon(ctx, ic, 22, { color: l.k.accent, dark_color: l.k.darkAccent }), say(ctx, l, word, { size: 15, weight: 600 }, { width: "fill", max_lines: 1 }), icon(ctx, "chevron_left", 20, { color: l.k.muted, dark_color: l.k.darkMuted })],
    },
    ...(last ? [] : [{ id: id(), type: "divider" as const, height: 1, background: l.k.line, dark_background: l.k.darkLine }]),
  ];
  return {
    header: { type: "title", title: t.title, translations: t.translations, buttons: ["search", "cart"], ...signatureHeader(l.k, clinic ? "glass" : "large") },
    background: l.k.page,
    dark_background: l.k.darkPage,
    body: {
      id: id(),
      type: "column",
      padding: sides(0, 0, 32, 0),
      children: [
        {
          id: id(),
          type: "search",
          name: ctx.w(clinic ? "vcSearch" : "vdSearch"),
          text: ctx.w(clinic ? "vcSearch" : "vdSearch"),
          source: "products",
          radius: clinic ? 14 : 99,
          height: 48,
          background: l.k.surface,
          dark_background: l.k.darkSurface,
          color: l.k.muted,
          dark_color: l.k.darkMuted,
          border_color: l.k.line,
          dark_border_color: l.k.darkLine,
          border_width: 1,
          margin: sides(6, 16, 4, 16),
        },
        { ...say(ctx, l, clinic ? "vcSkinTypes" : "vdShadesMenu", { size: 13, weight: 700, letter_spacing: 0.4 }, { muted: true, max_lines: 1 }), padding: sides(16, 18, 8, 18) },
        { id: id(), type: "row", name: ctx.w(clinic ? "vcSkinTypes" : "vdShadesMenu"), align: "between", padding: sides(0, 16, 6, 16), children: quicks },
        {
          id: id(),
          type: "categories",
          name: ctx.w("btCategoryMenu"),
          source: "products",
          style: "rows",
          category_menu: clinic ? { look: "lead", numbers: true, radius: 14 } : { look: "label", numbers: false, radius: 28 },
          color: l.k.ink,
          dark_color: l.k.darkInk,
          padding: sides(10, 0, 6, 0),
        },
        {
          id: id(),
          type: "column",
          name: ctx.w(clinic ? "vcMenuMore" : "btAccount"),
          gap: 0,
          radius: 20,
          padding: sides(2, 14, 2, 14),
          margin: sides(14, 16, 0, 16),
          background: l.k.surface,
          dark_background: l.k.darkSurface,
          border_color: l.k.line,
          dark_border_color: l.k.darkLine,
          border_width: 1,
          children: [...line("btAccount", "person", screen("account")), ...line("btOrders", "package_2", screen("orders")), ...line("vcWishlist", "favorite", screen("favorites")), ...line("btLanguage", "language", screen("settings"), true)],
        },
        {
          id: id(),
          type: "row",
          name: ctx.w("btContact"),
          gap: 12,
          cross: "center",
          radius: 20,
          padding: sides(14, 16, 14, 16),
          margin: sides(10, 16, 0, 16),
          ...(clinic ? { background: l.tint.day, dark_background: l.tint.night } : { gradient: GLOSS, background: "#3A0C2A", dark_background: "#3A0C2A" }),
          action: screen("account"),
          children: [
            icon(ctx, "support_agent", 22, clinic ? { color: l.k.accent, dark_color: l.k.darkAccent } : WHITE),
            { id: id(), type: "column", width: "fill", gap: 2, children: [{ ...say(ctx, l, "btContact", { size: 14.5, weight: 700 }), ...(clinic ? {} : WHITE) }, { ...say(ctx, l, clinic ? "vcContactLine" : "vdContactLine", { size: 12.5 }, { muted: true, max_lines: 2 }), ...(clinic ? {} : { color: "#F3D6E4", dark_color: "#F3D6E4" }) }] },
            icon(ctx, "chat", 20, clinic ? { color: l.k.ink, dark_color: l.k.darkInk } : WHITE),
          ],
        },
      ],
    },
  };
}

/** Over the shop: C its ingredient chips under a lab line; D the shades as a strip. */
function shopTop(ctx: SectionContext, l: Look): StudioNode[] {
  if (l.look === "c") return [{ ...say(ctx, l, "vcShopKicker", { size: 12, weight: 600, letter_spacing: 0.6 }, { accent: true, max_lines: 1 }), padding: sides(8, 16, 8, 16) }, ingredientChips(ctx, l), { id: idOf(ctx)(), type: "categories", name: ctx.w("btCategories"), source: "products", style: "chips", padding: sides(10, 12, 4, 12) }];
  return [
    { ...say(ctx, l, "vdShopKicker", { size: 22, weight: 900, line_height: 1.1 }, { max_lines: 1 }), padding: sides(8, 18, 10, 18) },
    { id: idOf(ctx)(), type: "row", name: ctx.w("vdShadesMenu"), gap: 10, scroll: true, padding: sides(0, 18, 6, 18), children: SHADES.map(([, hex, word]) => ({ id: idOf(ctx)(), type: "column" as const, name: ctx.w(word), gap: 4, cross: "center" as const, action: shop, children: [{ id: idOf(ctx)(), type: "row" as const, width: 44, height: 44, radius: 22, background: hex, dark_background: hex, children: [] }, say(ctx, l, word, { size: 11 }, { muted: true, max_lines: 1 })] })) },
    { id: idOf(ctx)(), type: "categories", name: ctx.w("btCategories"), source: "products", style: "circles", padding: sides(6, 12, 4, 12) },
  ];
}

/** Over the cart: the shop's code and the template's note. */
function cartTop(ctx: SectionContext, l: Look): StudioNode[] {
  const id = idOf(ctx);
  return [
    { id: id(), type: "coupon", name: ctx.w("btCoupon"), code: BEAUTY_CD_COUPON_CODE, coupon: { look: l.look === "c" ? "glass" : "ticket", bind: "public" }, radius: l.look === "c" ? 16 : 24, color: l.look === "c" ? l.k.accent : "#9B1B5A", margin: sides(10, 16, 4, 16) },
    {
      id: id(),
      type: "row",
      name: ctx.w(l.look === "c" ? "vcCartNote" : "vdCartNote"),
      gap: 12,
      cross: "center",
      radius: 18,
      padding: sides(12, 14, 12, 14),
      margin: sides(8, 16, 4, 16),
      background: l.tint.day,
      dark_background: l.tint.night,
      children: [icon(ctx, l.look === "c" ? "fact_check" : "auto_awesome", 22, { color: l.k.accent, dark_color: l.k.darkAccent }), say(ctx, l, l.look === "c" ? "vcCartNote" : "vdCartNote", { size: 13.5, weight: 600, line_height: 1.4 }, { width: "fill", max_lines: 3 })],
    },
  ];
}

/** Over the orders: how an order travels (the person's newest order, else the first step lit). */
function ordersTop(ctx: SectionContext, l: Look): StudioNode[] {
  const step = (title: SectionWord, text: SectionWord, highlight = false): StudioEntry => sigEntry(ctx, { title, text }, highlight ? { highlight: true } : {});
  return [
    { ...say(ctx, l, "btTrack", { size: l.look === "c" ? 21 : 24, weight: l.look === "c" ? 800 : 900 }, { max_lines: 1 }), padding: sides(10, 16, 8, 16) },
    {
      id: idOf(ctx)(),
      type: "timeline",
      name: ctx.w("btTrack"),
      timeline: { style: l.look === "c" ? "vertical" : "bars", source: "latest_order" },
      color: l.k.ink,
      dark_color: l.k.darkInk,
      background: l.k.surface,
      dark_background: l.k.darkSurface,
      radius: l.look === "c" ? 18 : 26,
      padding: sides(16, 14, 16, 14),
      margin: sides(0, 16, 6, 16),
      border_color: l.k.line,
      dark_border_color: l.k.darkLine,
      border_width: 1,
      entries: [step("btTrack1", "btTrack1Text", true), step("btTrack2", "btTrack2Text"), step("btTrack3", "btTrack3Text"), step("btTrack4", "btTrack4Text")],
    },
  ];
}

/** The demo's code shown in the app (lib/demo/beauty.ts makes it). */
export const BEAUTY_CD_COUPON_CODE = "VELOURS10";

const over = (l: Look) => (screenName: string, ctx: SectionContext): StudioNode[] | null => {
  switch (screenName) {
    case "search":
      return shopTop(ctx, l);
    case "cart":
      return cartTop(ctx, l);
    case "orders":
      return ordersTop(ctx, l);
    default:
      return null;
  }
};


// ——— 228.7 Each template's own product page ———

const part = (ctx: SectionContext, p: ProductPagePart): StudioNode => productPart(ctx, p);
const productPageOfLook = (ctx: SectionContext, l: Look, page: Omit<StudioPage, "screen" | "show_tabs" | "body"> & { children: StudioNode[] }) => {
  const { children, ...rest } = page;
  return {
    slug: PRODUCT_PAGE_SLUG,
    title: "pProductPage" as SectionWord,
    studio: { background: l.k.page, dark_background: l.k.darkPage, ...rest, show_tabs: false, screen: STUDIO_PRODUCT_SCREEN, body: { id: idOf(ctx)(), type: "column", gap: 0, children } } satisfies StudioPage,
  };
};

/**
 * C · the formula sheet: the photo and its thumbnails on the lab's tinted
 * plate (its formula number and a tested seal over them), the name and
 * price in Zain, the actives as chips with their strength, the sizes as
 * chips, how to use it as three numbered steps on frosted glass, the
 * formula's facts as lines, its rating, the routine to complete it and the
 * price beside Add to my routine at the foot.
 */
function clinicProductPage(ctx: SectionContext, l: Look) {
  const id = idOf(ctx);
  const k = l.k;
  const ink = { color: k.ink, dark_color: k.darkInk } as const;
  const teal = { accent: k.accent, dark_accent: k.darkAccent } as const;
  const step = (n: number, title: SectionWord, line: SectionWord, last: boolean): StudioNode[] => {
    const row: StudioNode = {
      id: id(),
      type: "row",
      name: ctx.w(title),
      gap: 12,
      cross: "center",
      padding: sides(10, 0, 10, 0),
      children: [
        { id: id(), type: "row", width: 30, height: 30, radius: 15, align: "center", cross: "center", border_color: k.accent, dark_border_color: k.darkAccent, border_width: 1.5, children: [raw(ctx, l, String(n).padStart(2, "0"), { size: 12.5, weight: 800 }, { accent: true })] },
        { id: id(), type: "column", width: "fill", gap: 1, children: [say(ctx, l, title, { size: 15.5, weight: 700 }, { max_lines: 1 }), say(ctx, l, line, { size: 13 }, { muted: true, max_lines: 2 })] },
      ],
    };
    return last ? [row] : [row, { id: id(), type: "divider", height: 1, background: k.line, dark_background: k.darkLine }];
  };
  return productPageOfLook(ctx, l, {
    // No header: the sheet's own title in its top band, beside the app's back button.
    children: [
      { id: id(), type: "row", name: ctx.w("vcpSheet"), height: 52, align: "center", cross: "center", padding: sides(0, 64, 0, 64), children: [say(ctx, l, "vcpSheet", { size: 15.5, weight: 700, letter_spacing: 0.3 }, { max_lines: 1 })] },
      {
        id: id(),
        type: "column",
        name: ctx.w("vcpSheet"),
        gap: 10,
        radius: 26,
        padding: sides(12, 12, 12, 12),
        margin: sides(4, 16, 0, 16),
        background: l.tint.day,
        dark_background: l.tint.night,
        children: [
          {
            id: id(),
            type: "row",
            gap: 8,
            cross: "center",
            padding: sides(2, 4, 0, 4),
            children: [
              raw(ctx, l, "FORMULA · LAB 07", { size: 11.5, weight: 700, letter_spacing: 1.6 }, { accent: true, width: "fill", max_lines: 1 }),
              { id: id(), type: "row", gap: 4, cross: "center", radius: 99, padding: sides(4, 10, 4, 10), surface: { glass: 16, tint: 0.7, soft: 1 }, children: [icon(ctx, "verified", 14, { color: k.accent, dark_color: k.darkAccent }), say(ctx, l, "vcpTested", { size: 11.5, weight: 600 }, { max_lines: 1 })] },
            ],
          },
          part(ctx, { type: "product_gallery", look: "thumbs", radius: 18, node: { aspect_ratio: 1 } }),
        ],
      },
      part(ctx, { type: "product_title", look: "plain", node: { ...ink, font: { family: l.family, size: 26, weight: 800, line_height: 1.2 }, margin: sides(18, 18, 0, 18) } }),
      part(ctx, { type: "product_price", look: "single", node: { color: k.accent, dark_color: k.darkAccent, font: { family: l.family, size: 21, weight: 800 }, margin: sides(4, 18, 0, 18) } }),
      clinicHead(ctx, l, "vcpActives", null, sides(22, 16, 10, 16)),
      ingredientChips(ctx, l),
      part(ctx, { type: "product_variants", look: "chips", ...teal, text: "vcpSize", node: { ...ink, margin: sides(20, 18, 0, 18) } }),
      part(ctx, { type: "product_quantity", look: "stepper", node: { ...ink, margin: sides(14, 18, 0, 18) } }),
      {
        id: id(),
        type: "column",
        name: ctx.w("vcpUse"),
        gap: 2,
        radius: 22,
        padding: sides(14, 16, 6, 16),
        margin: sides(22, 16, 0, 16),
        background: l.tint.day,
        dark_background: l.tint.night,
        surface: { glass: 18, tint: 0.5, soft: 2 },
        children: [say(ctx, l, "vcpUse", { size: 18, weight: 800 }, { max_lines: 1 }), ...step(1, "vcpU1", "vcpU1Text", false), ...step(2, "vcpU2", "vcpU2Text", false), ...step(3, "vcpU3", "vcpU3Text", true)],
      },
      part(ctx, { type: "product_specs", look: "list", text: "vcpFacts", node: { ...ink, margin: sides(24, 18, 0, 18) } }),
      part(ctx, { type: "product_description", look: "accordion", node: { ...ink, margin: sides(14, 18, 0, 18), border_color: k.line, dark_border_color: k.darkLine } }),
      part(ctx, { type: "product_reviews", look: "summary", ...teal, node: { ...ink, margin: sides(20, 18, 0, 18) } }),
      part(ctx, { type: "product_related", look: "grid", related: "complete_look", rows: 4, text: "vcpRoutine", node: { ...ink, margin: sides(24, 6, 16, 6) } }),
      part(ctx, {
        type: "product_buy",
        look: "price",
        accent: k.accent,
        dark_accent: k.darkAccent,
        text: "vcpAdd",
        node: { pin: "bottom", radius: 16, padding: sides(10, 16, 10, 16), background: k.surface, dark_background: k.darkSurface, border_color: k.line, dark_border_color: k.darkLine, border_width: 1, ...ink },
      }),
    ],
  });
}

/**
 * D · the shade card: the photos on the gloss plum panel, the shade's kicker and name in white display type,
 * the shades as round swatches across the panel's foot, the price with the
 * one before it; then the shade on real skin (before and after), how to
 * wear it as tutorial reels, the description to open, the stars star by
 * star, what to wear it with, and Get the shade with Buy now at the foot.
 */
function shadeProductPage(ctx: SectionContext, l: Look) {
  const id = idOf(ctx);
  const k = l.k;
  const ink = { color: k.ink, dark_color: k.darkInk } as const;
  const pink = { accent: "#FF3D8B", dark_accent: "#FF6FA8" } as const;
  return productPageOfLook(ctx, l, {
    // No header: the app's back button over the photos.
    children: [
      {
        id: id(),
        type: "column",
        name: ctx.w("vdpKicker"),
        gap: 6,
        padding: sides(0, 0, 18, 0),
        corners: { bottom_start: 34, bottom_end: 34 },
        gradient: GLOSS,
        background: "#3A0C2A",
        dark_background: "#120610",
        surface: { glow: "#FF6FA8", pattern: "grain", pattern_strength: 0.05 },
        children: [
          part(ctx, { type: "product_gallery", look: "pager", node: { aspect_ratio: 0.9 } }),
          { ...say(ctx, l, "vdpKicker", { size: 11.5, weight: 600, letter_spacing: 2 }, { max_lines: 1, margin: sides(12, 20, 0, 20) }), color: "#FFB3D1", dark_color: "#FFB3D1" },
          part(ctx, { type: "product_title", look: "plain", node: { ...WHITE, font: { family: l.family, size: 30, weight: 900, line_height: 1.05, letter_spacing: -0.3 }, margin: sides(0, 20, 0, 20) } }),
          part(ctx, { type: "product_price", look: "sale", node: { color: "#FFD6E7", dark_color: "#FFD6E7", font: { family: l.family, size: 19, weight: 800 }, margin: sides(2, 20, 0, 20) } }),
          // The shades on a blush card at the panel's foot, their names in the page's ink.
          part(ctx, { type: "product_variants", look: "swatches", ...pink, text: "vdpChoose", node: { ...ink, margin: sides(10, 14, 0, 14), padding: sides(12, 12, 12, 12), radius: 22, background: "#FFF4F8", dark_background: "#241020" } }),
        ],
      },
      shadeHead(ctx, l, "vdpOnSkin", null),
      beforeAfter(ctx, l),
      shadeHead(ctx, l, "vdpApply", null),
      { id: id(), type: "row", name: ctx.w("vdpApply"), gap: 10, scroll: true, padding: sides(0, 18, 0, 18), children: [reel(ctx, l, "shade-face", "vdReel3", "0:45", 150, 200), reel(ctx, l, "blush", "vdReel4", "1:05", 150, 200), reel(ctx, l, "eyeliner", "vdReel1", "0:58", 150, 200)] },
      part(ctx, { type: "product_description", look: "accordion", node: { ...ink, margin: sides(22, 18, 0, 18), border_color: k.line, dark_border_color: k.darkLine } }),
      part(ctx, { type: "product_reviews", look: "bars", ...pink, node: { ...ink, margin: sides(22, 18, 0, 18) } }),
      part(ctx, { type: "product_related", look: "carousel", related: "complete_look", rows: 6, text: "vdpWearWith", node: { ...ink, margin: sides(24, 0, 16, 0) } }),
      part(ctx, {
        type: "product_buy",
        look: "buy_now",
        accent: k.fill,
        dark_accent: k.darkFill,
        text: "vdpBuy",
        node: { pin: "bottom", radius: 24, padding: sides(10, 14, 10, 14), background: k.surface, dark_background: k.darkSurface, border_color: k.line, dark_border_color: k.darkLine, border_width: 1, ...ink },
      }),
    ],
  });
}

const pages = (l: Look) => (ctx: SectionContext) => [
  { slug: CD_MENU_PAGE, title: "btCategoryMenu" as SectionWord, studio: menuPage(ctx, l) },
  // 228.7 Each template's own product page.
  l.look === "c" ? clinicProductPage(ctx, l) : shadeProductPage(ctx, l),
];

const screenOf = (t: LayoutTab) => (t.target.type === "screen" ? t.target.screen : null);

/** C's five tabs: Home, the Lab (the shop), Cart, Orders, Account. */
export function clinicTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const out = structuredClone([...tabs]).map((t) => (t.id === "home" ? { ...t, icon: "home" } : screenOf(t) === "search" ? tabOf(null, t, "vcLabTitle", "healing") : screenOf(t) === "cart" ? { ...t, label: "Cart", icon: "shopping_bag" } : screenOf(t) === "account" ? { ...t, icon: "person" } : t));
  const account = out.findIndex((t) => screenOf(t) === "account");
  if (!out.some((t) => screenOf(t) === "orders")) out.splice(account < 0 ? out.length : account, 0, { id: "orders", label: "Orders", icon: "receipt_long", target: screen("orders") });
  return out;
}

/** D's five tabs: Home, Shades (the shop), Wishlist, Cart, Account. */
export function shadeTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  const out = structuredClone([...tabs]).map((t) => (t.id === "home" ? { ...t, icon: "home" } : screenOf(t) === "search" ? tabOf(null, t, "vdShadesMenu", "auto_awesome") : screenOf(t) === "cart" ? { ...t, label: "Cart", icon: "shopping_bag" } : screenOf(t) === "account" ? { ...t, icon: "person" } : t));
  const cart = out.findIndex((t) => screenOf(t) === "cart");
  if (!out.some((t) => screenOf(t) === "favorites")) out.splice(cart < 0 ? out.length : cart, 0, tabOf(null, { id: "wishlist", label: "Wishlist", icon: "favorite", target: screen("favorites") }, "vcWishlist", "favorite"));
  return out;
}

// ——— The sign-in screens, the bars and the two templates ———

const FIRST = ["orders", "notifications", "settings", "help", "privacy", "terms"] as const;

const CLINIC_SCREENS = signatureScreens({
  style: "photo",
  photo: P("hero-lab"),
  title: { en: "Your skin, by the numbers", ar: "بشرتكِ بالأرقام", tr: "Cildiniz, rakamlarla" },
  subtitle: { en: "Sign in for your skin test, your routine and your orders.", ar: "سجّلي الدخول لاختبار بشرتكِ وروتينكِ وطلباتكِ.", tr: "Cilt testiniz, rutininiz ve siparişleriniz için giriş yapın." },
  menu: "cover",
  first: FIRST,
});

const SHADE_SCREENS = signatureScreens({
  style: "photo",
  photo: P("velvet-lips"),
  title: { en: "Find your shade", ar: "اعثري على ظلّكِ", tr: "Tonunuzu bulun" },
  subtitle: { en: "Sign in to keep your shades, your lessons and your orders.", ar: "سجّلي الدخول لتحفظي ظلالكِ ودروسكِ وطلباتكِ.", tr: "Tonlarınızı, derslerinizi ve siparişlerinizi saklamak için giriş yapın." },
  menu: "night",
  accent: "#9B1B5A",
  first: FIRST,
});

/** C's bar: a segmented track across a white card, the open tab on the teal tint with its name. */
export const CLINIC_BAR = signatureBar(C, { design: "segment", background: "#FFFFFF", dark_background: "#141B20", active: C.accent, dark_active: C.darkAccent, inactive: C.muted, dark_inactive: C.darkMuted, labels: "always", radius: 18, margin: 12 });
/** D's bar: a black capsule glowing pink, the open tab a glowing pink circle. */
export const SHADE_BAR = signatureBar(D, { design: "glow", background: "#14070F", dark_background: "#14070F", active: "#FF3D8B", dark_active: "#FF3D8B", inactive: "#9C7A8D", dark_inactive: "#9C7A8D", labels: "never", radius: 32, margin: 16 });

export const VELOURS_C: SignatureDesign = {
  demo: "beauty",
  variant: "c",
  template: { id: "beauty_signature_c", icon: "healing", fits: { types: ["store"], plain: true } },
  home: clinicHome,
  over: over(LOOK_C),
  tabs: clinicTabs,
  pages: pages(LOOK_C),
  bar: CLINIC_BAR,
  look: { header: signatureHeader(C, "glass"), background: C.page, dark_background: C.darkPage },
  chrome: { header: "glass", system: "glass" },
  isNew: true,
  project: {
    primary: C.accent,
    appearance: { secondary_color: "#10171C", font_family: "Zain", dark_background: C.darkPage, dark_surface: C.darkSurface },
    screens: CLINIC_SCREENS,
  },
};

export const VELOURS_D: SignatureDesign = {
  demo: "beauty",
  variant: "d",
  template: { id: "beauty_signature_d", icon: "auto_awesome", fits: { types: ["store"], plain: true } },
  home: shadeHome,
  over: over(LOOK_D),
  tabs: shadeTabs,
  pages: pages(LOOK_D),
  bar: SHADE_BAR,
  look: { header: signatureHeader(D, "large"), background: D.page, dark_background: D.darkPage },
  chrome: { header: "large", home: "glass", system: "photo" },
  isNew: true,
  project: {
    primary: D.accent,
    appearance: { secondary_color: "#FF3D8B", font_family: "Kufam", dark_background: D.darkPage, dark_surface: D.darkSurface },
    screens: SHADE_SCREENS,
  },
};

// ——— C's and D's own parts as ready sections for any store (marked new) ———

const STORE_PLAIN = { types: ["store"], plain: true } as const;
const one = (make: (ctx: SectionContext) => StudioNode | StudioNode[]) => (ctx: SectionContext): StudioNode => {
  const made = make(ctx);
  return Array.isArray(made) ? { id: idOf(ctx)(), type: "column", gap: 0, children: made } : made;
};
void ownPage;

export const BEAUTY_CD_SECTIONS: readonly SectionInfo[] = [
  // C: the skin test as frosted glass over a photo, the numbered routine, the ingredient chips and the lab cards.
  { id: "vc_glass_quiz", icon: "quiz", isNew: true, fits: STORE_PLAIN, make: one((ctx) => clinicQuiz(ctx, LOOK_C)) },
  { id: "vc_numbered_routine", icon: "format_list_numbered", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [clinicHead(ctx, LOOK_C, "vcRoutineTitle", "vcRoutineCode"), clinicRoutine(ctx, LOOK_C)]) },
  { id: "vc_ingredients", icon: "healing", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [clinicHead(ctx, LOOK_C, "vcIngTitle", "vcIngCode"), ingredientChips(ctx, LOOK_C)]) },
  { id: "vc_lab_cards", icon: "fact_check", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [clinicHead(ctx, LOOK_C, "vcLabTitle", "vcLabCode"), labGrid(ctx, LOOK_C, "vcLabTitle")]) },
  // D: the shade hero, the reels, before and after, the mood tiles.
  { id: "vd_shade_hero", icon: "auto_awesome", isNew: true, fits: STORE_PLAIN, make: one((ctx) => shadeHero(ctx, LOOK_D)) },
  { id: "vd_reels", icon: "play_circle", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [shadeHead(ctx, LOOK_D, "vdReelsTitle", { word: "vdAllLessons", action: shop }), reelStrip(ctx, LOOK_D)]) },
  { id: "vd_before_after", icon: "compare_arrows", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [shadeHead(ctx, LOOK_D, "vdBeforeAfter", null), beforeAfter(ctx, LOOK_D)]) },
  { id: "vd_moods", icon: "celebration", isNew: true, fits: STORE_PLAIN, make: one((ctx) => [shadeHead(ctx, LOOK_D, "vdMoodTitle", null), moodTiles(ctx, LOOK_D)]) },
];
