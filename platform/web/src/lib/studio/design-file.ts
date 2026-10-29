import type { Action, Languages, LanguageCode, LayoutPage, LayoutTab, StudioNode, StudioPage, Translations } from "../pages/types";
import { uniqueSlug } from "../pages/model";
import { forPaste, type PasteContext } from "./clipboard";

/**
 * 108.2 Yallapp's own design file (`.yallapp`): a page, an element with what
 * it holds (a section), or a whole project's pages and look, with the
 * pictures and the project's own fonts inside it, so it opens in any project
 * of any account. JSON; the pictures and fonts as base64.
 */

export const DESIGN_FILE_FORMAT = "yallapp-design";
export const DESIGN_FILE_VERSION = 1;
export const DESIGN_FILE_EXTENSION = ".yallapp";

export const DESIGN_FILE_LIMITS = {
  /** The whole file (pictures and fonts in it). */
  bytes: 80 * 1024 * 1024,
  pages: 40,
  pictures: 120,
  /** A picture is saved like a Figma picture: at most 5 MB. */
  pictureBytes: 5 * 1024 * 1024,
  fonts: 10,
  fontFiles: 4,
  fontFileBytes: 5 * 1024 * 1024,
} as const;

export type DesignKind = "page" | "section" | "project";

export interface DesignFilePage {
  /** Its address in the project it came from: links between the file's pages follow it. */
  slug: string;
  title: string;
  translations?: Translations;
  studio: StudioPage;
}

export interface DesignFilePicture {
  /** image/png, image/jpeg or image/webp. */
  type: string;
  /** Base64. */
  data: string;
}

export interface DesignFileFont {
  family: string;
  files: { weight: number | null; kind: "ttf" | "otf"; data: string }[];
}

export interface DesignFileLook {
  /** The font of the look (a free font or one of `fonts`). */
  font?: string;
  arabic_font?: string;
  primary_color?: string;
  secondary_color?: string | null;
  tabs?: LayoutTab[];
}

export interface DesignFile {
  format: typeof DESIGN_FILE_FORMAT;
  version: number;
  kind: DesignKind;
  name: string;
  made_at: string;
  /** The languages its texts are in. */
  languages: Languages;
  pages: DesignFilePage[];
  /** For a section: the element. */
  section?: StudioNode;
  look?: DesignFileLook;
  /** By the address the design uses for it. */
  pictures: Record<string, DesignFilePicture>;
  fonts: DesignFileFont[];
}

export type DesignFileError = "not_ours" | "too_new" | "broken" | "empty" | "too_big";

const PICTURE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/** Every picture address a page or element uses. */
export function picturesIn(page: StudioPage | null, node?: StudioNode): string[] {
  const out = new Set<string>();
  const walk = (n: StudioNode) => {
    if (n.image_url) out.add(n.image_url);
    if (n.image_background_url) out.add(n.image_background_url);
    n.children?.forEach(walk);
    if (n.card) walk(n.card);
  };
  if (page) {
    if (page.header?.logo_url) out.add(page.header.logo_url);
    walk(page.body);
  }
  if (node) walk(node);
  return [...out];
}

/** The fonts a page or element names. */
export function fontsIn(page: StudioPage | null, node?: StudioNode): string[] {
  const out = new Set<string>();
  const walk = (n: StudioNode) => {
    if (n.font?.family) out.add(n.font.family);
    n.children?.forEach(walk);
    if (n.card) walk(n.card);
  };
  if (page) walk(page.body);
  if (node) walk(node);
  return [...out];
}

function mapNode(node: StudioNode, fn: (n: StudioNode) => StudioNode): StudioNode {
  const out = fn({ ...node });
  if (out.children) out.children = out.children.map((c) => mapNode(c, fn));
  if (out.card) out.card = mapNode(out.card, fn);
  return out;
}

/** The pictures at their new addresses; one without a new address waits to be added again, like a new picture. */
export function withPictures(node: StudioNode, moved: ReadonlyMap<string, string>): StudioNode {
  return mapNode(node, (n) => {
    if (n.image_url) {
      const to = moved.get(n.image_url);
      n.image_url = to ?? null;
    }
    if (n.image_background_url) {
      const to = moved.get(n.image_background_url);
      if (to) n.image_background_url = to;
      else {
        delete n.image_background_url;
        delete n.overlay;
      }
    }
    return n;
  });
}

const TRANSLATED = ["text", "title"] as const;

/**
 * The texts in another project's languages: its main language's text where
 * the file has it (else the file's own main text), and translations only
 * for the languages the project has.
 */
export function inLanguages(node: StudioNode, from: Languages, to: Languages): StudioNode {
  return mapNode(node, (n) => {
    if (!TRANSLATED.some((f) => n[f]) && !n.translations) return n;
    const value = (lang: LanguageCode, field: (typeof TRANSLATED)[number]): string | undefined => {
      if (lang === from.default) return n[field] ?? undefined;
      return n.translations?.[lang]?.[field] || undefined;
    };
    const next: StudioNode = { ...n };
    for (const field of TRANSLATED) {
      const main = value(to.default, field) ?? value(from.default, field);
      if (main !== undefined) next[field] = main;
    }
    const translations: Partial<Translations> = {};
    for (const lang of to.available) {
      if (lang === to.default) continue;
      const entry: Record<string, string> = {};
      for (const field of TRANSLATED) {
        const v = value(lang, field);
        if (v !== undefined) entry[field] = v;
      }
      if (Object.keys(entry).length) translations[lang] = entry;
    }
    if (Object.keys(translations).length) next.translations = translations as Translations;
    else delete next.translations;
    return next;
  });
}

function pageTranslations(page: DesignFilePage, from: Languages, to: Languages): { title: string; translations?: Translations } {
  const value = (lang: LanguageCode) => (lang === from.default ? page.title : page.translations?.[lang]?.title);
  const translations: Partial<Translations> = {};
  for (const lang of to.available) if (lang !== to.default && value(lang)) translations[lang] = { title: value(lang)! };
  return { title: value(to.default) || page.title, ...(Object.keys(translations).length ? { translations: translations as Translations } : {}) };
}

/** The file's text, made from what is exported. */
export function writeDesignFile(design: Omit<DesignFile, "format" | "version">): string {
  return JSON.stringify({ format: DESIGN_FILE_FORMAT, version: DESIGN_FILE_VERSION, ...design });
}

const record = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

function readStudioPage(v: unknown): StudioPage | null {
  const page = record(v);
  const body = record(page?.body);
  if (!page || !body || typeof body.id !== "string" || typeof body.type !== "string") return null;
  return page as unknown as StudioPage;
}

/**
 * The file read back. Only its shape is checked here: what it designs goes
 * through the page checker when the draft is saved, like anything made in
 * the editor.
 */
export function readDesignFile(text: string): { ok: true; file: DesignFile } | { ok: false; error: DesignFileError } {
  if (text.length > DESIGN_FILE_LIMITS.bytes * 1.4) return { ok: false, error: "too_big" };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: "not_ours" };
  }
  const v = record(value);
  if (!v || v.format !== DESIGN_FILE_FORMAT) return { ok: false, error: "not_ours" };
  if (typeof v.version !== "number" || v.version > DESIGN_FILE_VERSION) return { ok: false, error: "too_new" };
  const kind = v.kind;
  if (kind !== "page" && kind !== "section" && kind !== "project") return { ok: false, error: "broken" };
  const languages = record(v.languages);
  if (!languages || typeof languages.default !== "string" || !Array.isArray(languages.available)) return { ok: false, error: "broken" };

  const pages: DesignFilePage[] = [];
  for (const p of Array.isArray(v.pages) ? v.pages.slice(0, DESIGN_FILE_LIMITS.pages) : []) {
    const page = record(p);
    const studio = readStudioPage(page?.studio);
    if (!page || !studio || typeof page.slug !== "string" || typeof page.title !== "string") return { ok: false, error: "broken" };
    pages.push({ slug: page.slug, title: page.title.slice(0, 60), ...(record(page.translations) ? { translations: page.translations as Translations } : {}), studio });
  }
  const sectionRecord = record(v.section);
  const section = sectionRecord && typeof sectionRecord.id === "string" && typeof sectionRecord.type === "string" ? (sectionRecord as unknown as StudioNode) : undefined;
  if (kind === "section" ? !section : pages.length === 0) return { ok: false, error: "empty" };

  const pictures: Record<string, DesignFilePicture> = {};
  for (const [url, p] of Object.entries(record(v.pictures) ?? {}).slice(0, DESIGN_FILE_LIMITS.pictures)) {
    const picture = record(p);
    if (!picture || typeof picture.type !== "string" || !PICTURE_TYPES.has(picture.type) || typeof picture.data !== "string") continue;
    if (picture.data.length > (DESIGN_FILE_LIMITS.pictureBytes * 4) / 3 + 4 || !BASE64.test(picture.data)) continue;
    pictures[url] = { type: picture.type, data: picture.data };
  }

  const fonts: DesignFileFont[] = [];
  for (const f of Array.isArray(v.fonts) ? v.fonts.slice(0, DESIGN_FILE_LIMITS.fonts) : []) {
    const font = record(f);
    if (!font || typeof font.family !== "string" || !Array.isArray(font.files)) continue;
    const files: DesignFileFont["files"] = [];
    for (const x of font.files.slice(0, DESIGN_FILE_LIMITS.fontFiles)) {
      const file = record(x);
      if (!file || (file.kind !== "ttf" && file.kind !== "otf") || typeof file.data !== "string" || !BASE64.test(file.data)) continue;
      if (file.data.length > (DESIGN_FILE_LIMITS.fontFileBytes * 4) / 3 + 4) continue;
      files.push({ weight: typeof file.weight === "number" ? file.weight : null, kind: file.kind, data: file.data });
    }
    if (files.length) fonts.push({ family: font.family.slice(0, 40), files });
  }

  const look = record(v.look);
  return {
    ok: true,
    file: {
      format: DESIGN_FILE_FORMAT,
      version: v.version,
      kind,
      name: typeof v.name === "string" ? v.name.slice(0, 80) : "",
      made_at: typeof v.made_at === "string" ? v.made_at : "",
      languages: { default: languages.default as LanguageCode, available: (languages.available as unknown[]).filter((l): l is LanguageCode => typeof l === "string") },
      pages,
      ...(section ? { section } : {}),
      ...(look
        ? {
            look: {
              ...(typeof look.font === "string" ? { font: look.font } : {}),
              ...(typeof look.arabic_font === "string" ? { arabic_font: look.arabic_font } : {}),
              ...(typeof look.primary_color === "string" ? { primary_color: look.primary_color } : {}),
              ...(typeof look.secondary_color === "string" ? { secondary_color: look.secondary_color } : {}),
              ...(Array.isArray(look.tabs) ? { tabs: look.tabs as LayoutTab[] } : {}),
            },
          }
        : {}),
      pictures,
      fonts,
    },
  };
}

/** Where an imported design goes. */
export type DesignPlace = "new_pages" | "this_page" | "section";

export interface DesignFit extends Omit<PasteContext, "pageSlugs"> {
  /** The project's pages, to give the new ones their own addresses. */
  pages: readonly LayoutPage[];
  languages: Languages;
  /** The picture addresses after saving them in this project. */
  pictures: ReadonlyMap<string, string>;
  now: string;
}

/**
 * The file's pages made to fit this project: new addresses for the pages
 * (links between them follow), new IDs, what points at what the project
 * hasn't left out, pictures at their new addresses, the texts in its
 * languages.
 */
export function designPages(file: DesignFile, fit: DesignFit): LayoutPage[] {
  const taken = fit.pages.map((p) => p.slug);
  const slugs = new Map<string, string>();
  for (const page of file.pages) {
    const slug = uniqueSlug(page.title || page.slug, taken);
    taken.push(slug);
    slugs.set(page.slug, slug);
  }
  const ctx: PasteContext = { ...fit, pageSlugs: taken };
  const relink = (node: StudioNode): StudioNode =>
    mapNode(node, (n) => {
      if (n.action?.type === "page" && n.action.page_slug && slugs.has(n.action.page_slug)) n.action = { ...n.action, page_slug: slugs.get(n.action.page_slug)! } as Action;
      return n;
    });
  return file.pages.map((page) => {
    const body = forPaste(inLanguages(withPictures(relink(page.studio.body), fit.pictures), file.languages, fit.languages), ctx);
    const header = page.studio.header ? { ...page.studio.header } : page.studio.header;
    if (header?.logo_url) {
      const to = fit.pictures.get(header.logo_url);
      if (to) header.logo_url = to;
      else delete header.logo_url;
    }
    const { title, translations } = pageTranslations(page, file.languages, fit.languages);
    return {
      slug: slugs.get(page.slug)!,
      title,
      ...(translations ? { translations } : {}),
      show_title: false,
      updated_at: fit.now,
      blocks: [],
      studio: { ...page.studio, header, body },
    };
  });
}

/** The file's section (or its first page's elements) made to fit this project, to add to the open page. */
export function designSection(file: DesignFile, fit: DesignFit): StudioNode {
  const source = file.section ?? file.pages[0]!.studio.body;
  const ctx: PasteContext = { ...fit, pageSlugs: fit.pages.map((p) => p.slug) };
  return forPaste(inLanguages(withPictures(source, fit.pictures), file.languages, fit.languages), ctx);
}

/** The design with these fonts shown in the app's font instead. */
export function withoutFonts(file: DesignFile, families: ReadonlySet<string>): DesignFile {
  if (!families.size) return file;
  const strip = (node: StudioNode): StudioNode =>
    mapNode(node, (n) => {
      if (n.font?.family && families.has(n.font.family)) {
        const { family: _family, ...rest } = n.font;
        if (Object.keys(rest).length) n.font = rest;
        else delete n.font;
      }
      return n;
    });
  return {
    ...file,
    pages: file.pages.map((p) => ({ ...p, studio: { ...p.studio, body: strip(p.studio.body) } })),
    ...(file.section ? { section: strip(file.section) } : {}),
    ...(file.look?.font && families.has(file.look.font) ? { look: { ...file.look, font: undefined } } : {}),
  };
}
