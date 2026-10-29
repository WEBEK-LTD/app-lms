import type { Languages, LayoutContent, LayoutPage, StudioHeaderType, StudioNode, StudioPage } from "../pages/types";
import { DESIGN_FILE_FORMAT, DESIGN_FILE_VERSION, type DesignFile } from "./design-file";
import { TEMPLATES, templatesFor, type ProjectKind, type SectionContext } from "./sections";

/**
 * 108.7 Whole designs: every page of a project, its header and its look at
 * once. Yallapp's own are made for the project's type from its templates,
 * in six looks (a colour, a background, a font, a header and how round the
 * corners are); the project's own designs (saved or imported) are kept by
 * the account (lib/studio/own-designs.ts).
 */

export interface DesignTheme {
  id: "warm" | "fresh" | "evening" | "ocean" | "classic" | "rose";
  /** The colour of buttons and highlights. */
  accent: string;
  background: string;
  /** A free font that draws Arabic. */
  font: string;
  header: StudioHeaderType;
  /** How round the corners are, against the templates' own. */
  round: number;
}

export const DESIGN_THEMES: readonly DesignTheme[] = [
  { id: "warm", accent: "#C2410C", background: "#FFF7ED", font: "Cairo", header: "logo_center", round: 1 },
  { id: "fresh", accent: "#15803D", background: "#F0FDF4", font: "Tajawal", header: "logo_actions", round: 1.5 },
  { id: "evening", accent: "#6D28D9", background: "#F5F3FF", font: "Rubik", header: "title_search", round: 0.6 },
  { id: "ocean", accent: "#0369A1", background: "#F0F9FF", font: "Almarai", header: "logo_actions", round: 1.2 },
  { id: "classic", accent: "#0E0D24", background: "#FBF8F2", font: "IBM Plex Sans Arabic", header: "transparent", round: 0.8 },
  { id: "rose", accent: "#BE185D", background: "#FFF1F2", font: "Readex Pro", header: "logo_center", round: 1.3 },
];

export interface WholeDesign {
  id: string;
  theme: DesignTheme;
  /** The templates its pages are made from, the first one its home. */
  templates: string[];
}

/** The project type's whole designs: its own templates (up to three) and a brand and contact page, in each look. */
export function designsFor(kind: ProjectKind | null): WholeDesign[] {
  const own = templatesFor(kind)
    .filter((tpl) => tpl.fits)
    .slice(0, 3)
    .map((tpl) => tpl.id);
  const templates = [...(own.length ? own : ["brand"]), ...(own.length ? ["brand"] : []), "contact"];
  return DESIGN_THEMES.map((theme) => ({ id: `yallapp-${theme.id}`, theme, templates }));
}

function rounded(node: StudioNode, round: number): StudioNode {
  const out: StudioNode = { ...node };
  if (out.radius) out.radius = Math.min(500, Math.round(out.radius * round));
  if (out.children) out.children = out.children.map((c) => rounded(c, round));
  if (out.card) out.card = rounded(out.card, round);
  return out;
}

/** A page in a design's look. */
export function themedPage(page: StudioPage, theme: DesignTheme): StudioPage {
  return {
    ...page,
    background: theme.background,
    ...(page.header ? { header: { ...page.header, type: theme.header } } : {}),
    body: rounded(page.body, theme.round),
  };
}

export interface DesignWords {
  /** The first page's name. */
  home: string;
  /** A template's name. */
  template: (id: string) => string;
  /** A look's name. */
  theme: (id: DesignTheme["id"]) => string;
}

/** A whole design made for this project, as a design file (its pages with the project's name and lists). */
export function makeDesign(design: WholeDesign, ctx: SectionContext, words: DesignWords, languages: Languages): DesignFile {
  const pages = design.templates.map((id, i) => {
    const tpl = TEMPLATES.find((x) => x.id === id)!;
    return { slug: i === 0 ? "home" : id, title: i === 0 ? words.home : words.template(id), studio: themedPage(tpl.make({ ...ctx, brand: design.theme.accent }), design.theme) };
  });
  return {
    format: DESIGN_FILE_FORMAT,
    version: DESIGN_FILE_VERSION,
    kind: "project",
    name: words.theme(design.theme.id),
    made_at: "",
    languages,
    pages,
    look: { font: design.theme.font, secondary_color: design.theme.accent },
    pictures: {},
    fonts: [],
  };
}

/** Texts and pictures of a page put into another page's design, in reading order (texts into texts with their translations, buttons' words into buttons, pictures into pictures). */
export function keepContent(from: StudioNode, into: StudioNode): StudioNode {
  const old: Record<"text" | "button" | "image", StudioNode[]> = { text: [], button: [], image: [] };
  const take = (n: StudioNode) => {
    if ((n.type === "text" || n.type === "button") && n.text) old[n.type].push(n);
    if (n.type === "image" && n.image_url) old.image.push(n);
    n.children?.forEach(take);
  };
  take(from);
  const put = (n: StudioNode): StudioNode => {
    const next: StudioNode = { ...n };
    const mine = n.type === "text" || n.type === "button" ? old[n.type].shift() : undefined;
    if (mine) {
      next.text = mine.text;
      if (mine.translations) next.translations = mine.translations;
      else delete next.translations;
    } else if (n.type === "image" && old.image.length) next.image_url = old.image.shift()!.image_url;
    if (n.children) next.children = n.children.map(put);
    return next;
  };
  return put(into);
}

function relink(node: StudioNode, slugs: ReadonlyMap<string, string | null>): StudioNode {
  const out: StudioNode = { ...node };
  if (out.action?.type === "page" && out.action.page_slug && slugs.has(out.action.page_slug)) {
    const to = slugs.get(out.action.page_slug);
    if (to) out.action = { ...out.action, page_slug: to };
    else delete out.action;
  }
  if (out.children) out.children = out.children.map((c) => relink(c, slugs));
  if (out.card) out.card = relink(out.card, slugs);
  return out;
}

export interface ApplyOptions {
  /** The whole project's design, or only the open page's (from the design's page at `pageIndex`). */
  mode: "project" | "page";
  /** The open page. */
  openSlug: string;
  pageIndex: number;
  /** The project's texts and pictures go into the new design. */
  keep: boolean;
  now: string;
}

/**
 * A whole design applied to the draft, its pages already made to fit the
 * project (designPages). For the project: its Studio pages take the
 * design's pages in order, keeping their addresses and names (so tabs and
 * links still work), the design's extra pages are added, and its font and
 * second colour become the look's. For one page: the open page takes the
 * chosen page. Links to the design's pages follow; the others go.
 */
export function applyWholeDesign(current: LayoutContent, fitted: LayoutPage[], look: DesignFile["look"], opts: ApplyOptions): LayoutContent {
  const studioPages = current.pages.filter((p) => p.studio);
  const studioOf = (target: LayoutPage, from: LayoutPage): StudioPage => ({ ...from.studio!, body: opts.keep && target.studio ? keepContent(target.studio.body, from.studio!.body) : from.studio!.body });
  if (opts.mode === "page") {
    const from = fitted[opts.pageIndex] ?? fitted[0];
    const open = current.pages.find((p) => p.slug === opts.openSlug);
    if (!from?.studio || !open) return current;
    const slugs = new Map<string, string | null>(fitted.map((p) => [p.slug, current.pages.some((c) => c.slug === p.slug) ? p.slug : null]));
    const studio = studioOf(open, from);
    return { ...current, pages: current.pages.map((p) => (p.slug === open.slug ? { ...p, studio: { ...studio, body: relink(studio.body, slugs) }, updated_at: opts.now } : p)) };
  }
  const slugs = new Map<string, string | null>(fitted.map((p, i) => [p.slug, studioPages[i]?.slug ?? p.slug]));
  const mapped = new Map(studioPages.slice(0, fitted.length).map((p, i) => [p.slug, fitted[i]!]));
  const pages = current.pages.map((p) => {
    const from = mapped.get(p.slug);
    if (!from) return p;
    const studio = studioOf(p, from);
    return { ...p, studio: { ...studio, body: relink(studio.body, slugs) }, updated_at: opts.now };
  });
  const added = fitted.slice(studioPages.length).map((p) => ({ ...p, studio: { ...p.studio!, body: relink(p.studio!.body, slugs) } }));
  return {
    ...current,
    pages: [...pages, ...added],
    appearance: { ...current.appearance, ...(look?.font ? { font_family: look.font } : {}), ...(look?.secondary_color !== undefined ? { secondary_color: look.secondary_color } : {}) },
  };
}
