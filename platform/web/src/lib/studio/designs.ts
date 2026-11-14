import type { Appearance, ITEMS_LAYOUTS, Languages, LayoutContent, LayoutPage, LayoutTab, STUDIO_CATEGORY_STYLES, StudioHeaderType, StudioNode, StudioPage, TabBarStyle } from "../pages/types";
import type { StudioDemoId } from "../demo/constants";
import { DEMO_BRANDS } from "../demo/content";
import { DEMO_TAB_BARS } from "../demo/screens";
import { demoPageTabs, demoScreenPages, demoTabPages } from "./demo-pages";
import { demoTemplateId, studioDemoOf } from "./demo-templates";
import { DESIGN_FILE_FORMAT, DESIGN_FILE_VERSION, type DesignFile } from "./design-file";
import { TEMPLATES, templatesFor, type ProjectKind, type SectionContext } from "./sections";
// 130.23 The whole designs' premium chrome.
import { THEME_CHROME } from "./demo-designs/chrome";
// 130 A demo's Signature look B as a whole design, after the demo.
import { signatureDesign } from "./demo-designs";
import { signatureTemplateId, type SignatureLook } from "./demo-designs/signature";
// 130.30 The whole designs, premium for every kind.
import { isPremiumDesign, premiumAbout, premiumCoverPath, premiumHome, PREMIUM_BARS, PREMIUM_PALETTES, type PremiumDesignId } from "./premium-designs";
import { yallappPhoto } from "./photo-food";

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

/**
 * None has the header that lies over the page's top: on a page that doesn't start with a picture, it covers its title.
 * 130.30 Each is premium for every kind (lib/studio/premium-designs.ts): its own home for the kind, its colours by day
 * and a designed night, a premium header on every page, its floating bar and the system screens' look. The ids stay:
 * a project that applied one keeps what it saved; applying it again gives the premium one.
 */
export const DESIGN_THEMES: readonly DesignTheme[] = [
  { id: "warm", accent: PREMIUM_PALETTES.warm.brand, background: PREMIUM_PALETTES.warm.page, font: "Cairo", header: "logo_center", round: 1, layout: { home: 0, items: "grid", across: 2, categories: "tiles" } },
  { id: "fresh", accent: PREMIUM_PALETTES.fresh.brand, background: PREMIUM_PALETTES.fresh.page, font: "Tajawal", header: "logo_actions", round: 1.5, layout: { home: 1, items: "carousel", across: 1.2, categories: "chips" } },
  { id: "evening", accent: PREMIUM_PALETTES.evening.brand, background: PREMIUM_PALETTES.evening.page, font: "Alexandria", header: "title_search", round: 0.6, layout: { home: 2, items: "list", across: 1, categories: "circles" } },
  { id: "ocean", accent: PREMIUM_PALETTES.ocean.brand, background: PREMIUM_PALETTES.ocean.page, font: "Almarai", header: "logo_actions", round: 1.2, layout: { home: 0, items: "carousel", across: 2, categories: "pictures" } },
  { id: "classic", accent: PREMIUM_PALETTES.classic.brand, background: PREMIUM_PALETTES.classic.page, font: "Markazi Text", header: "logo_actions", round: 0.8, layout: { home: "brand", items: "list", across: 1, categories: "chips" } },
  { id: "rose", accent: PREMIUM_PALETTES.rose.brand, background: PREMIUM_PALETTES.rose.page, font: "El Messiri", header: "logo_center", round: 1.3, layout: { home: 1, items: "grid", across: 2, categories: "circles" } },
];

/** 130.30 A premium design's home, made for the project's kind (lib/studio/premium-designs.ts), before the kind's own pages. */
export const PREMIUM_HOME = "premium_home";

/** A Studio demo's look: its colour and font, its pages' own header, corners and background; 130 in its Signature look B, that look's. */
export function demoTheme(demo: StudioDemoId, look?: SignatureLook): DesignTheme {
  const brand = DEMO_BRANDS[demo];
  const own = look === "b" ? signatureDesign(demo, "b")?.project : undefined;
  return { id: "demo", accent: own?.primary ?? brand.primaryColor, background: null, font: own?.appearance?.font ?? brand.font, round: 1 };
}

/**
 * What a Studio demo's whole design sets besides its pages, as the demo
 * app has it (lib/demo/setup.ts demoLayout): its look, 119 its bar's design
 * and its tabs, 120 those after the home opening the demo's pages drawn
 * around their screens (at the tabs' ids, as the design's pages are).
 */
export function demoProjectLook(demo: StudioDemoId, tabs: readonly LayoutTab[], lang: SectionContext["lang"] = "en", look?: SignatureLook): { appearance: Partial<Appearance>; tabs: LayoutTab[]; tab_bar: TabBarStyle } {
  const brand = DEMO_BRANDS[demo];
  // 130 Its Signature look B: that look's font and second colour, tabs and bar.
  const b = look === "b" ? signatureDesign(demo, "b") : undefined;
  return {
    appearance: { template: brand.template, font: brand.font, corners: brand.corners, cards: brand.cards, secondary_color: brand.secondaryColor, ...(b?.project.appearance ?? {}) },
    tabs: demoPageTabs(tabs, { lang, demo, ...(b ? { look: "b" as const } : {}) }),
    tab_bar: structuredClone(b ? b.bar : DEMO_TAB_BARS[demo]),
  };
}

export interface WholeDesign {
  id: string;
  theme: DesignTheme;
  /** The templates its pages are made from, the first one its home. */
  templates: string[];
  /** Templates = demos: the Studio demo this design is, shown first and recommended. */
  demo?: StudioDemoId;
  /** 130 With `demo`: its Signature look B, right after the demo (its look A). */
  look?: "b";
  /** 120.4 The project's type and kind, for the demo's pages around its screens. */
  kind?: { appType: string; vertical: string | null };
  /** 130.30 The kind a premium design's home and about page are made for (null: a project without one). */
  project?: ProjectKind | null;
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
  // 123 A template for the whole project (the premium academy) is a project of its own, never a page of another look.
  const own = templatesFor(kind)
    // 130 A Signature look is a whole app of its own, never a page of another look.
    .filter((tpl) => tpl.fits && !tpl.project && !tpl.look)
    .slice(0, 3)
    .map((tpl) => tpl.id);
  const demo = studioDemoOf(kind);
  // The demo's pages only: its home (the only page the demo has), nothing generated around it.
  // 130 Its two Signature looks first: the demo (its look A), then its look B; the six premium designs after them.
  const first: WholeDesign[] =
    demo && kind
      ? [
          { id: `demo-${demo}`, theme: demoTheme(demo), templates: [demoTemplateId(demo)], demo, kind: { appType: kind.type, vertical: kind.vertical ?? null } },
          ...(signatureDesign(demo, "b") ? [{ id: `demo-${demo}-b`, theme: demoTheme(demo, "b"), templates: [signatureTemplateId(demo, "b")], demo, look: "b" as const, kind: { appType: kind.type, vertical: kind.vertical ?? null } }] : []),
        ]
      : [];
  // 130.30 Each look premium: its home made for the kind first, then the kind's pages, the about page and contact.
  return [...first, ...DESIGN_THEMES.map((theme) => ({ id: `yallapp-${theme.id}`, theme, templates: [PREMIUM_HOME, ...pagesFor(own, theme.layout)], project: kind }))];
}

/** 120.4 How many pages a whole design has: a demo's, its home, its tabs' pages and those around its other screens. */
export function designPageCount(design: WholeDesign, demoTabs?: readonly LayoutTab[] | null): number {
  if (!design.demo || !demoTabs) return design.templates.length;
  const ctx: SectionContext = { brand: "#000000", source: null, w: () => "", newId: () => "n", demo: design.demo, ...(design.look ? { look: design.look } : {}) };
  return design.templates.length + demoTabPages(demoTabs, ctx).length + demoScreenPages(design.kind ?? { appType: "" }, demoTabs, ctx, new Set(["home"])).length;
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

/** A page in a design's look, laid out its way. 130.30 A premium look's by night too, its header in its colours. */
export function themedPage(page: StudioPage, theme: DesignTheme): StudioPage {
  const body = rounded(page.body, theme.round);
  const palette = isPremiumDesign(theme.id) ? PREMIUM_PALETTES[theme.id] : null;
  const style = page.header?.style ?? THEME_CHROME[theme.id]?.pages;
  const colours =
    palette && style
      ? style === "brand"
        ? { background: palette.brand, dark_background: palette.deep, color: "#FFFFFF", dark_color: "#FFFFFF" }
        : style === "photo"
          ? {}
          : { background: palette.page, dark_background: palette.darkPage, color: palette.ink, dark_color: palette.darkInk }
      : {};
  return {
    ...page,
    ...(theme.background ? { background: theme.background } : {}),
    ...(palette ? { dark_background: palette.darkPage } : {}),
    ...(page.header && theme.header ? { header: { ...page.header, type: theme.header, ...(THEME_CHROME[theme.id] && !page.header.style ? { style: THEME_CHROME[theme.id]!.pages } : {}), ...colours } } : {}),
    body: theme.layout ? laidOut(body, theme.layout) : body,
  };
}

/** 130.30 A premium design's page: its home and about page made for the kind, the kind's pages in its look. */
function designPage(design: WholeDesign, id: string, made: SectionContext): StudioPage {
  const theme = design.theme;
  if (isPremiumDesign(theme.id) && !design.demo) {
    const kind = design.project ?? null;
    if (id === PREMIUM_HOME) return premiumHome(theme.id, kind, made, theme.header ?? "logo_actions");
    if (id === "brand") return premiumAbout(theme.id, kind, made, theme.header ?? "logo_actions", THEME_CHROME[theme.id]?.pages ?? "large");
    // A premium header on every page: one without a header gets the look's.
    const page = TEMPLATES.find((x) => x.id === id)!.make(made);
    return themedPage(page.header ? page : { ...page, header: { type: theme.header ?? "logo_actions", buttons: ["notifications", "account"] } }, theme);
  }
  return themedPage(TEMPLATES.find((x) => x.id === id)!.make(made), theme);
}

/** 130.30 What a premium design sets besides its pages: its second colour, its floating bar and the system screens' look (the photo look on the kind's photo). */
function premiumLook(theme: DesignTheme, kind: ProjectKind | null, ctx: SectionContext): Pick<NonNullable<DesignFile["look"]>, "secondary_color" | "tab_bar" | "screens"> {
  const id = theme.id as PremiumDesignId;
  const system = structuredClone(THEME_CHROME[id]!.system);
  const photo = system.look === "photo" ? yallappPhoto(ctx, premiumCoverPath(kind)) : null;
  if (photo) system.image_url = photo;
  return { secondary_color: PREMIUM_PALETTES[id].accent, tab_bar: structuredClone(PREMIUM_BARS[id]), screens: { system } };
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
  // 130 A demo's look B by the look's own name.
  if (design.demo && design.look) return words.template(signatureTemplateId(design.demo, design.look));
  return design.demo && words.demo ? words.demo(DEMO_BRANDS[design.demo].appName) : words.theme(design.theme.id);
}

/**
 * A whole design made for this project, as a design file (its pages with
 * the project's name and lists). 120 A demo's has the demo's pages after its
 * home too, one per tab of `demoTabs` (the demo's own) opening a screen.
 */
export function makeDesign(design: WholeDesign, ctx: SectionContext, words: DesignWords, languages: Languages, demoTabs?: readonly LayoutTab[] | null): DesignFile {
  // 128 A demo's pages in its own look (lib/studio/demo-designs).
  const made: SectionContext = { ...ctx, brand: design.theme.accent, ...(design.demo ? { demo: design.demo } : {}), ...(design.look ? { look: design.look } : {}) };
  const pages: DesignFile["pages"] = design.templates.map((id, i) => ({ slug: i === 0 ? "home" : id, title: i === 0 ? words.home : words.template(id), studio: designPage(design, id, made) }));
  if (design.demo && demoTabs) {
    pages.push(...demoTabPages(demoTabs, made));
    // 120.4 And every other screen of the app.
    pages.push(...demoScreenPages(design.kind ?? { appType: "", vertical: null }, demoTabs, made, new Set(pages.map((p) => p.slug))));
  }
  return {
    format: DESIGN_FILE_FORMAT,
    version: DESIGN_FILE_VERSION,
    kind: "project",
    name: designName(design, words),
    made_at: "",
    languages,
    pages,
    look: {
      font: design.theme.font,
      secondary_color: design.demo ? ((design.look ? signatureDesign(design.demo, design.look)?.project.appearance?.secondary_color : undefined) ?? DEMO_BRANDS[design.demo].secondaryColor) : design.theme.accent,
      // 130.23 The system screens in the design's premium look (a demo's come with the demo's screens).
      ...(!design.demo && THEME_CHROME[design.theme.id] ? { screens: { system: structuredClone(THEME_CHROME[design.theme.id]!.system) } } : {}),
      // 130.30 A premium design's second colour, floating bar and the photo look on the kind's photo.
      ...(!design.demo && isPremiumDesign(design.theme.id) ? premiumLook(design.theme, design.project ?? null, ctx) : {}),
    },
    pictures: {},
    fonts: [],
    ...(design.demo ? { demo: design.demo } : {}),
    ...(design.demo && design.look ? { demo_look: design.look } : {}),
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
  /** Templates = demos: a demo's whole design for the project also sets the demo's look, bar and tabs (demoProjectLook). */
  demo?: { appearance: Partial<Appearance>; tabs: LayoutTab[]; tab_bar?: TabBarStyle };
  /** 120 The design file's own address of each of `fitted` (the demo's tabs open its pages at them). */
  designSlugs?: readonly string[];
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
  if (!opts.demo && look?.tabs?.length) return applyProjectFile(current, fitted, look, opts);
  const slugs = new Map<string, string | null>(fitted.map((p, i) => [p.slug, studioPages[i]?.slug ?? p.slug]));
  const mapped = new Map(studioPages.slice(0, fitted.length).map((p, i) => [p.slug, fitted[i]!]));
  const pages = current.pages.map((p) => {
    const from = mapped.get(p.slug);
    if (!from) return p;
    const studio = studioOf(p, from);
    // 120 A demo's page keeps its own name too: its tab opens it.
    const named = opts.demo ? { title: from.title, translations: from.translations } : {};
    const next = { ...p, ...named, studio: { ...studio, body: relink(studio.body, slugs) }, updated_at: opts.now };
    if (!next.translations) delete next.translations;
    return next;
  });
  const added = fitted.slice(studioPages.length).map((p) => ({ ...p, studio: { ...p.studio!, body: relink(p.studio!.body, slugs) } }));
  const appearance = { ...current.appearance, ...(look?.font ? { font_family: look.font } : {}), ...(look?.secondary_color !== undefined ? { secondary_color: look.secondary_color } : {}) };
  // 130.30 A premium design's floating bar.
  const bar = !opts.demo && look?.tab_bar ? { tab_bar: structuredClone(look.tab_bar) } : {};
  if (opts.demo) {
    // The demo's look as the demo app has it: one of the app's own fonts, none to download.
    Object.assign(appearance, opts.demo.appearance);
    if (opts.demo.appearance.font) delete appearance.font_family;
  }
  // 120 The demo's tabs open its pages where they now are.
  const at = new Map<string, string>();
  (opts.designSlugs ?? []).forEach((own, i) => {
    const page = fitted[i];
    if (page) at.set(own, slugs.get(page.slug) ?? page.slug);
  });
  const tabs = opts.demo?.tabs.map((tab) => (tab.target.type === "page" && tab.target.page_slug && at.has(tab.target.page_slug) ? { ...structuredClone(tab), target: { ...tab.target, page_slug: at.get(tab.target.page_slug)! } } : structuredClone(tab)));
  return {
    ...current,
    pages: [...pages, ...added],
    appearance,
    ...(tabs ? { tabs } : {}),
    ...bar,
    ...(opts.demo?.tab_bar ? { tab_bar: structuredClone(opts.demo.tab_bar) } : {}),
  };
}

/**
 * 124.11 A project's own file (exported from Studio, kept in "Mine", or
 * bought from another owner): the whole app as it was made. Each of its
 * pages takes the project's page drawn around the same screen, else at the
 * same address, else (the first) the project's first page; the others are
 * added, and the project's pages the file doesn't have stay. Its tabs open
 * its pages where they now are (a tab whose page isn't there goes), and its
 * tab bar, font and second colour become the project's. The main colour and
 * the screens' looks are the app's, not the draft's: the editor saves them
 * (applyDesignLookAction).
 */
function applyProjectFile(current: LayoutContent, fitted: LayoutPage[], look: NonNullable<DesignFile["look"]>, opts: ApplyOptions): LayoutContent {
  const studioPages = current.pages.filter((p) => p.studio);
  const own = opts.designSlugs ?? fitted.map((p) => p.slug);
  const taken = new Set<string>();
  const target = fitted.map((page, i) => {
    const screen = page.studio?.screen;
    const found =
      (screen ? studioPages.find((p) => !taken.has(p.slug) && p.studio?.screen === screen) : undefined) ??
      studioPages.find((p) => !taken.has(p.slug) && !p.studio?.screen && !screen && (p.slug === own[i] || p.slug === page.slug)) ??
      (i === 0 && !screen ? studioPages.find((p) => !taken.has(p.slug) && !p.studio?.screen) : undefined);
    if (found) taken.add(found.slug);
    return found?.slug ?? null;
  });
  // Where each of the file's pages is now: links between them follow.
  const slugs = new Map<string, string | null>(fitted.map((p, i) => [p.slug, target[i] ?? p.slug]));
  const at = new Map<string, string>(own.map((slug, i) => [slug, target[i] ?? fitted[i]?.slug ?? slug]));
  const into = new Map(fitted.map((p, i) => [target[i], p] as const).filter((x): x is [string, LayoutPage] => x[0] !== null));
  const pages = current.pages.map((p) => {
    const from = into.get(p.slug);
    if (!from?.studio) return p;
    const body = opts.keep && p.studio ? keepContent(p.studio.body, from.studio.body) : from.studio.body;
    const next: LayoutPage = { ...p, title: from.title, translations: from.translations, studio: { ...from.studio, body: relink(body, slugs) }, updated_at: opts.now };
    if (!next.translations) delete next.translations;
    return next;
  });
  const added = fitted.filter((_, i) => target[i] === null).map((p) => ({ ...p, studio: { ...p.studio!, body: relink(p.studio!.body, slugs) } }));
  const all = [...pages, ...added];
  const tabs = (look.tabs ?? [])
    .map((tab) => {
      const copy = structuredClone(tab);
      if (copy.target.type === "page" && copy.target.page_slug) copy.target = { ...copy.target, page_slug: at.get(copy.target.page_slug) ?? copy.target.page_slug };
      return copy;
    })
    .filter((tab) => tab.target.type !== "page" || all.some((p) => p.slug === tab.target.page_slug));
  const appearance = {
    ...current.appearance,
    ...(look.font ? { font_family: look.font } : {}),
    ...(look.arabic_font ? { arabic_font: look.arabic_font } : {}),
    ...(look.secondary_color !== undefined ? { secondary_color: look.secondary_color } : {}),
  };
  return { ...current, pages: all, appearance, ...(tabs.length ? { tabs } : {}), ...(look.tab_bar ? { tab_bar: structuredClone(look.tab_bar) } : {}) };
}
