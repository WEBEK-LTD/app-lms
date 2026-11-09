import type { Appearance, ITEMS_LAYOUTS, Languages, LayoutContent, LayoutPage, LayoutTab, STUDIO_CATEGORY_STYLES, StudioHeaderType, StudioNode, StudioPage } from "../pages/types";
import type { StudioDemoId } from "../demo/constants";
import { DEMO_BRANDS } from "../demo/content";
import { demoTemplateId, studioDemoOf } from "./demo-templates";
import { DESIGN_FILE_FORMAT, DESIGN_FILE_VERSION, type DesignFile } from "./design-file";
import { TEMPLATES, templatesFor, type ProjectKind, type SectionContext } from "./sections";

/**
 * 108.7 Whole designs: every page of a project, its header and its look at
 * once. Yallapp's own are made for the project's type from its templates,
 * in six looks (a colour, a background, a font, a header and how round the
 * corners are), each laid out its own way: another first page, its pages in
 * another order and its lists and categories shown differently. The
 * project's own designs (saved or imported) are kept by the account
 * (lib/studio/own-designs.ts).
 *
 * Templates = demos: a kind with a Studio demo gets the demo first, marked
 * recommended: the demo's own pages as the demo shows them, its colours,
 * font, corners and cards, and its tabs, nothing added.
 */

/** How a design lays its pages out: which of the kind's templates is its first page, and how its lists and categories show. */
export interface DesignLayout {
  /** The kind's own template its first page is (counted from 0, the next ones after it), or the brand page first. */
  home: number | "brand";
  items: (typeof ITEMS_LAYOUTS)[number];
  /** Grid columns, or how many cards a carousel shows at a time. */
  across: number;
  categories: (typeof STUDIO_CATEGORY_STYLES)[number];
}

export interface DesignTheme {
  id: "warm" | "fresh" | "evening" | "ocean" | "classic" | "rose" | "demo";
  /** The colour of buttons and highlights. */
  accent: string;
  /** The pages' background; null keeps the templates' own (a demo's). */
  background: string | null;
  /** A free font that draws Arabic, or the demo's. */
  font: string;
  /** The pages' header; missing, each page's own (a demo's). */
  header?: StudioHeaderType;
  /** How round the corners are, against the templates' own. */
  round: number;
  /** Left out: the templates as they are (a demo's). */
  layout?: DesignLayout;
}

/** None has the header that lies over the page's top: on a page that doesn't start with a picture, it covers its title. */
export const DESIGN_THEMES: readonly DesignTheme[] = [
  { id: "warm", accent: "#C2410C", background: "#FFF7ED", font: "Cairo", header: "logo_center", round: 1, layout: { home: 0, items: "grid", across: 2, categories: "tiles" } },
  { id: "fresh", accent: "#15803D", background: "#F0FDF4", font: "Tajawal", header: "logo_actions", round: 1.5, layout: { home: 1, items: "carousel", across: 1.2, categories: "chips" } },
  { id: "evening", accent: "#6D28D9", background: "#F5F3FF", font: "Rubik", header: "title_search", round: 0.6, layout: { home: 2, items: "list", across: 1, categories: "circles" } },
  { id: "ocean", accent: "#0369A1", background: "#F0F9FF", font: "Almarai", header: "logo_actions", round: 1.2, layout: { home: 0, items: "carousel", across: 2, categories: "pictures" } },
  { id: "classic", accent: "#0E0D24", background: "#FBF8F2", font: "IBM Plex Sans Arabic", header: "logo_actions", round: 0.8, layout: { home: "brand", items: "list", across: 1, categories: "chips" } },
  { id: "rose", accent: "#BE185D", background: "#FFF1F2", font: "Readex Pro", header: "logo_center", round: 1.3, layout: { home: 1, items: "grid", across: 2, categories: "circles" } },
];

/** A Studio demo's look: its colour and font, its pages' own header, corners and background. */
export function demoTheme(demo: StudioDemoId): DesignTheme {
  const brand = DEMO_BRANDS[demo];
  return { id: "demo", accent: brand.primaryColor, background: null, font: brand.font, round: 1 };
}

/**
 * What a Studio demo's whole design sets besides its pages, as the demo
 * app has it (lib/demo/setup.ts demoLayout): its look and its tabs.
 */
export function demoProjectLook(demo: StudioDemoId, tabs: readonly LayoutTab[]): { appearance: Partial<Appearance>; tabs: LayoutTab[] } {
  const brand = DEMO_BRANDS[demo];
  return { appearance: { template: brand.template, font: brand.font, corners: brand.corners, cards: brand.cards, secondary_color: brand.secondaryColor }, tabs: structuredClone([...tabs]) };
}

export interface WholeDesign {
  id: string;
  theme: DesignTheme;
  /** The templates its pages are made from, the first one its home. */
  templates: string[];
  /** Templates = demos: the Studio demo this design is, shown first and recommended. */
  demo?: StudioDemoId;
}

/** The pages of a design laid out this way: its first page, then the kind's other templates, the brand page and contact. */
function pagesFor(own: readonly string[], layout: DesignLayout | undefined): string[] {
  if (!own.length) return ["brand", "contact"];
  if (layout?.home === "brand") return ["brand", ...own, "contact"];
  const first = layout ? layout.home % own.length : 0;
  return [own[first]!, ...own.filter((_, i) => i !== first), "brand", "contact"];
}

/**
 * The project type's whole designs: (templates = demos) its demo first,
 * then its own templates (up to three) and a brand and contact page in
 * each of the six looks, each laid out its own way.
 */
export function designsFor(kind: ProjectKind | null): WholeDesign[] {
  const own = templatesFor(kind)
    .filter((tpl) => tpl.fits)
    .slice(0, 3)
    .map((tpl) => tpl.id);
  const demo = studioDemoOf(kind);
  // The demo's pages only: its home (the only page the demo has), nothing generated around it.
  const first: WholeDesign[] = demo ? [{ id: `demo-${demo}`, theme: demoTheme(demo), templates: [demoTemplateId(demo)], demo }] : [];
  return [...first, ...DESIGN_THEMES.map((theme) => ({ id: `yallapp-${theme.id}`, theme, templates: pagesFor(own, theme.layout) }))];
}

/** A page's lists and categories shown the design's way. A list with a card of its own keeps how it shows. */
function laidOut(node: StudioNode, layout: DesignLayout): StudioNode {
  const out: StudioNode = { ...node };
  if (out.type === "items" && !out.card) {
    out.layout = layout.items;
    delete out.columns;
    delete out.per_view;
    if (layout.items === "grid") out.columns = layout.across;
    if (layout.items === "carousel" && layout.across !== 1) out.per_view = layout.across;
  }
  if (out.type === "categories") {
    out.style = layout.categories;
    if (layout.categories !== "pictures") delete out.columns;
    else out.columns ??= 3;
  }
  if (out.children) out.children = out.children.map((c) => laidOut(c, layout));
  return out;
}

function rounded(node: StudioNode, round: number): StudioNode {
  const out: StudioNode = { ...node };
  if (out.radius) out.radius = Math.min(500, Math.round(out.radius * round));
  if (out.children) out.children = out.children.map((c) => rounded(c, round));
  if (out.card) out.card = rounded(out.card, round);
  return out;
}

/** A page in a design's look, laid out its way. */
export function themedPage(page: StudioPage, theme: DesignTheme): StudioPage {
  const body = rounded(page.body, theme.round);
  return {
    ...page,
    ...(theme.background ? { background: theme.background } : {}),
    ...(page.header && theme.header ? { header: { ...page.header, type: theme.header } } : {}),
    body: theme.layout ? laidOut(body, theme.layout) : body,
  };
}

export interface DesignWords {
  /** The first page's name. */
  home: string;
  /** A template's name. */
  template: (id: string) => string;
  /** A look's name. */
  theme: (id: DesignTheme["id"]) => string;
  /** Templates = demos: a demo's design's name, with the demo's. */
  demo?: (name: string) => string;
}

/** A whole design's name: its look's, or the demo's. */
export function designName(design: WholeDesign, words: DesignWords): string {
  return design.demo && words.demo ? words.demo(DEMO_BRANDS[design.demo].appName) : words.theme(design.theme.id);
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
    name: designName(design, words),
    made_at: "",
    languages,
    pages,
    look: { font: design.theme.font, secondary_color: design.demo ? DEMO_BRANDS[design.demo].secondaryColor : design.theme.accent },
    pictures: {},
    fonts: [],
    ...(design.demo ? { demo: design.demo } : {}),
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
  /** Templates = demos: a demo's whole design for the project also sets the demo's look and tabs (demoProjectLook). */
  demo?: { appearance: Partial<Appearance>; tabs: LayoutTab[] };
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
  const appearance = { ...current.appearance, ...(look?.font ? { font_family: look.font } : {}), ...(look?.secondary_color !== undefined ? { secondary_color: look.secondary_color } : {}) };
  if (opts.demo) {
    // The demo's look as the demo app has it: one of the app's own fonts, none to download.
    Object.assign(appearance, opts.demo.appearance);
    if (opts.demo.appearance.font) delete appearance.font_family;
  }
  return {
    ...current,
    pages: [...pages, ...added],
    appearance,
    ...(opts.demo ? { tabs: structuredClone(opts.demo.tabs) } : {}),
  };
}
