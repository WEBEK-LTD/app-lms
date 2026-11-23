import { createHash } from "node:crypto";
import { messagesFor } from "@/i18n";
import { KINDS } from "../app/kinds";
import { newApp } from "../app/setup";
import { wordsLangOf } from "../app/start-language";
import type { BlobStore } from "../blobs";
import type { DataStore } from "../data/store";
import { DEFAULT_HOSTED_SETTINGS, designerPageDefaults, type App, type MarketTemplate, type MarketTemplatePatch, type MarketTemplateVersion, type TemplateDesigner } from "../data/types";
import { demoClientId } from "../demo/apps";
import { demoKind, STUDIO_DEMO_TYPES, type StudioDemoId } from "../demo/constants";
import { DEMO_BRANDS } from "../demo/content";
import { studioDemoTemplate } from "../demo/picker";
import { demoStudioScreens } from "../demo/screens";
import { appUrl } from "../env";
import { inMainLanguage } from "../pages/builtin";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "../pages/defaults";
import { itemSourcesFor } from "../pages/sources";
import type { Appearance, Languages, LayoutContent, StudioNode, StudioPage } from "../pages/types";
import { appWords } from "../studio/app-words";
import { mainLookOf, signatureLooksOf } from "../studio/demo-designs";
import type { SignatureLook } from "../studio/demo-designs/signature";
import { withDemoFacts } from "../studio/demo-templates";
import { writeDesignFile, type DesignFile } from "../studio/design-file";
import { templatesFor } from "../studio/sections";
import { startLayout } from "../studio/start";
import { seededUuid } from "./assets";
import { designerSlug } from "./designers";
import { HOUSE_DESIGNER_ID } from "./house-photo";
import { MAX_TEMPLATE_KINDS } from "./kinds";
import { coverOf, elementCount, layoutDesign } from "./snapshot";
import { TEMPLATE_LANGS } from "./templates";

/**
 * 190 Yallapp's own Studio demos on Studio Market, free (the owner, 18
 * November 2026): every look a new Studio project starts from on
 * /start?for=studio (each Studio demo's Signature looks A and B, look A the
 * demo itself) is a published, free template by "Yallapp", found, filtered
 * and applied like any free template (a free licence, My templates, back to
 * the previous design), with no money, plans, payouts or review.
 *
 * - The designer: Yallapp's own designer profile on the demo account (the
 *   account Admin › Demo apps made, platform setting `demo`, left out of the
 *   admin's numbers): a designer must belong to an account (the database
 *   says so), and that account is already Yallapp's own, so none is made.
 *   Until the demo apps are made there's no listing. Its status is the
 *   team's: suspended, the templates are off the market.
 * - Seeded on read (`ensureHouseTemplates`, where the market's catalog and
 *   its public pages are read), as rows like any template's: a buyer's
 *   licence and the templates on their apps need them. Their ids come from
 *   the demo and look, a version's from its design: the same code finds the
 *   same rows, and a demo changed in code makes a new version (on the next
 *   read), which buyers get from My templates as an update. Only these ids
 *   are ever written: never a designer's template.
 * - A version is the project /start makes from the look, as a design file
 *   (its pages, tabs, bar, colours, fonts and screens' looks) and, next to
 *   it, the rest of its appearance a design file doesn't carry
 *   (`TemplateLook`: corners, cards, its night colours); applied with the
 *   buyer's app's name where the demo writes the app's name (houseFileFor).
 */

/** A fixed date: the house designs are made from code, the same each time. */
const MADE_AT = new Date("2026-11-18T00:00:00Z");

export { HOUSE_DESIGNER_ID };

/** Shown on the market; the first free address of these. */
export const HOUSE_DESIGNER = { name: "Yallapp", slugs: ["yallapp", "yallapp-studio", "yallapp-demos"], country: "EG" } as const;

export const HOUSE_TAGS: readonly string[] = ["yallapp", "demo"];

export interface HouseLook {
  demo: StudioDemoId;
  look: SignatureLook;
}

/** Every Studio demo's looks in Studio's order (223 C, D, A, B; the main look, the demo itself, first): what /start?for=studio starts a project from. */
export function houseLooks(): HouseLook[] {
  return STUDIO_DEMO_TYPES.flatMap((demo) => signatureLooksOf(demo).map((look) => ({ demo, look })));
}

export function houseTemplateId(demo: StudioDemoId, look: SignatureLook): string {
  return seededUuid(`yallapp:studio-market:template:${demo}:${look}`);
}

const LOOK_OF = new Map(houseLooks().map((l) => [houseTemplateId(l.demo, l.look), l]));

/** The demo look a template is, when it is one of Yallapp's own; null for a designer's. */
export function houseLookOf(templateId: string): HouseLook | null {
  return LOOK_OF.get(templateId) ?? null;
}

// ——— The design: the project /start makes from the look ———

/** A demo's languages as a project started from it has them: its own, its first the main one. */
function demoLanguagesOf(demo: StudioDemoId): Languages {
  const [first, ...rest] = DEMO_BRANDS[demo].languages;
  return { default: first!, available: [first!, ...rest] };
}

/** Counted ids: the same design gives the same file. */
function counter(): () => string {
  let n = 0;
  return () => `y${(n += 1).toString(36)}`;
}

/** Every element's id renumbered in reading order (the ids made without `newId` too). */
function renumbered(page: StudioPage, next: () => string): StudioPage {
  const walk = (node: StudioNode): StudioNode => {
    const out: StudioNode = { ...node, id: next() };
    if (node.children) out.children = node.children.map(walk);
    if (node.card) out.card = walk(node.card);
    return out;
  };
  return { ...page, body: walk(page.body) };
}

/**
 * The project a new Studio project started from the demo's look is
 * (lib/demo/start.ts makeFromDemo through lib/studio/new-project.ts
 * makeStudioProject), named `name` (the demo's own when missing): its main
 * colour, sign-in screen and account menu, and its first draft, the look's
 * pages, tabs, bar and look, with the demo's own words where the template
 * asks for the owner's. Its content (its lists' entries) isn't a design.
 */
export function houseProject(demo: StudioDemoId, look: SignatureLook, platform: string, name?: string | null): { app: App; layout: LayoutContent } {
  const kind = demoKind(demo);
  const brand = DEMO_BRANDS[demo];
  const appName = name?.trim() || brand.appName;
  const template = studioDemoTemplate(demo, look);
  const project = template.project ?? null;
  const languages = demoLanguagesOf(demo);
  const lang = wordsLangOf(languages, "en");
  const fresh = newApp("yallapp", null, MADE_AT, kind.engine, kind.vertical);
  const app: App = {
    ...fresh,
    id: houseTemplateId(demo, look),
    section: "studio",
    backend: "hosted",
    appName,
    primaryColor: project?.primary ?? brand.primaryColor,
    hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...(fresh.hostedSettings ?? {}), studioScreens: demoStudioScreens(demo, platform, template.look) },
    ...(project ? { design: template.id } : {}),
  };
  const ready = inMainLanguage({ ...defaultLayout(app, BUILT_IN_APP_DEFAULTS, MADE_AT), languages });
  const layout = startLayout(app, template, ready, MADE_AT, {
    brand: app.primaryColor,
    source: itemSourcesFor(app)[0] ?? null,
    app: appName,
    w: appWords(lang, appName),
    lang,
    newId: counter(),
    picture: (file: string) => `${platform}/design-pictures/${file}`,
  });
  const ids = counter();
  return { app, layout: { ...layout, pages: layout.pages.map((p) => (p.studio ? { ...p, studio: renumbered(withDemoFacts(demo, p.studio, lang), ids) } : p)) } };
}

/**
 * 190 What a version's design file doesn't carry of the project's
 * appearance: its template, bundled font, corners, cards and colours by
 * night, kept next to the design file and set on the app with it (its free
 * fonts and second colour too, as the file has them). A free font or a
 * colour by night the look doesn't have, the app doesn't keep either: a new
 * project from the look has none.
 */
export type TemplateLook = Partial<Pick<Appearance, "template" | "font" | "font_family" | "arabic_font" | "secondary_color" | "corners" | "cards" | "dark_background" | "dark_surface">>;

export interface TemplateLookFile {
  format: "yallapp-template-look";
  version: 1;
  appearance: TemplateLook;
}

/** Where a version's look is kept (next to its design file). */
export function lookKey(version: Pick<MarketTemplateVersion, "blobKey">): string {
  return version.blobKey.replace(/\.json$/, "") + ".look.json";
}

export async function readTemplateLook(blobs: BlobStore, version: Pick<MarketTemplateVersion, "blobKey">): Promise<TemplateLook | null> {
  const blob = await blobs.get(lookKey(version));
  if (!blob) return null;
  try {
    const value = JSON.parse(blob.data.toString("utf8")) as TemplateLookFile;
    return value?.format === "yallapp-template-look" && value.appearance && typeof value.appearance === "object" ? value.appearance : null;
  } catch {
    return null;
  }
}

/** The look over the appearance the design made: the look's own, and none of the free fonts or night colours it doesn't have. */
export function withTemplateLook(appearance: Appearance, look: TemplateLook): Appearance {
  const { font_family: _font, arabic_font: _arabic, dark_background: _night, dark_surface: _surface, ...rest } = appearance;
  void _font;
  void _arabic;
  void _night;
  void _surface;
  return { ...rest, ...look };
}

/** The look's project as a design file and its look; null when it doesn't pass the page checker (the tests keep every look passing). */
export function houseDesign(demo: StudioDemoId, look: SignatureLook, platform: string, name?: string | null): { file: DesignFile; look: TemplateLook } | null {
  const { app, layout } = houseProject(demo, look, platform, name);
  const made = layoutDesign(app, layout, DEMO_BRANDS[demo].appName, [], MADE_AT);
  if (!made.ok) return null;
  const a = layout.appearance;
  return {
    file: { ...made.file, made_at: MADE_AT.toISOString() },
    look: {
      template: a.template,
      font: a.font,
      ...(a.font_family ? { font_family: a.font_family } : {}),
      ...(a.arabic_font ? { arabic_font: a.arabic_font } : {}),
      secondary_color: a.secondary_color,
      corners: a.corners,
      cards: a.cards,
      ...(a.dark_background ? { dark_background: a.dark_background } : {}),
      ...(a.dark_surface ? { dark_surface: a.dark_surface } : {}),
    },
  };
}

// ——— The listing: texts, kinds, the version ———

/** The kinds a new Studio project of which starts from the look (lib/studio/sections.ts templatesFor), up to three. */
export function houseKinds(demo: StudioDemoId, look: SignatureLook): string[] {
  const id = studioDemoTemplate(demo, look).id;
  return KINDS.filter((k) => templatesFor({ type: k.engine, vertical: k.vertical }).some((t) => t.id === id))
    .map((k) => k.id)
    .slice(0, MAX_TEMPLATE_KINDS);
}

/** A look's own name and line in a language (i18n/messages `marketHouse.looks`). */
function lookWords(lang: (typeof TEMPLATE_LANGS)[number], demo: StudioDemoId, look: SignatureLook): { name: string; text: string } {
  const looks = messagesFor(lang).marketHouse.looks;
  return looks[`${demo}_${look}` as keyof typeof looks];
}

/** The look's title, short line and description in each of the market's languages (i18n/messages `marketHouse`). */
export function houseTexts(demo: StudioDemoId, look: SignatureLook): MarketTemplate["texts"] {
  const app = DEMO_BRANDS[demo].appName;
  const out: MarketTemplate["texts"] = {};
  for (const lang of TEMPLATE_LANGS) {
    const m = messagesFor(lang).marketHouse;
    const own = lookWords(lang, demo, look);
    out[lang] = {
      title: m.title.replace("{app}", app).replace("{look}", own.name),
      // 223 The demo itself is its main look (C where it has one); every other look another of its looks.
      short: (look === mainLookOf(demo) ? m.shortA : m.shortB).replace("{app}", app),
      description: `${own.text}\n\n${m.about}`,
    };
  }
  return out;
}

/** A look's listing as this code makes it: its template's id, its texts and kinds, and its version (its id from its design). */
export interface HouseVersion extends HouseLook {
  templateId: string;
  slug: string;
  texts: MarketTemplate["texts"];
  kinds: string[];
  versionId: string;
  hash: string;
  text: string;
  file: DesignFile;
  appearance: TemplateLook;
}

const made = new Map<string, HouseVersion[]>();

/** Every look's listing at Yallapp's address (made once a process: the code doesn't change while it runs). */
export function houseVersions(platform: string = appUrl()): HouseVersion[] {
  const known = made.get(platform);
  if (known) return known;
  const all = houseLooks().flatMap(({ demo, look }): HouseVersion[] => {
    const design = houseDesign(demo, look, platform);
    if (!design) {
      console.error(`[studio-market] Yallapp's ${demo} look ${look} doesn't pass the page checker: not on the market.`);
      return [];
    }
    const templateId = houseTemplateId(demo, look);
    const text = writeDesignFile(design.file);
    const hash = createHash("sha256").update(text).update("\n").update(JSON.stringify(design.look)).digest("hex");
    const texts = houseTexts(demo, look);
    return [
      {
        demo,
        look,
        templateId,
        slug: designerSlug(`${DEMO_BRANDS[demo].appName} ${lookWords("en", demo, look).name}`),
        texts,
        kinds: houseKinds(demo, look),
        versionId: seededUuid(`yallapp:studio-market:version:${templateId}:${hash}`),
        hash,
        text,
        file: design.file,
        appearance: design.look,
      },
    ];
  });
  made.set(platform, all);
  return all;
}

/**
 * 190 A version of one of Yallapp's own as it goes on an app: made again
 * with the app's name where the demo writes the app's name (as a project
 * started from the demo with that name has it), when this code still makes
 * that version; null otherwise (the version as kept is used).
 */
export function houseFileFor(version: Pick<MarketTemplateVersion, "id" | "templateId">, appName: string | null | undefined, platform: string = appUrl()): { file: DesignFile; look: TemplateLook } | null {
  const own = houseLookOf(version.templateId);
  const current = own ? houseVersions(platform).find((v) => v.templateId === version.templateId) : undefined;
  if (!own || !current || current.versionId !== version.id) return null;
  const kept = () => ({ file: structuredClone(current.file), look: { ...current.appearance } });
  if (!appName?.trim() || appName.trim() === DEMO_BRANDS[own.demo].appName) return kept();
  return houseDesign(own.demo, own.look, platform, appName) ?? kept();
}

// ——— Seeding on read ———

export interface HouseDeps {
  store: DataStore;
  blobs: BlobStore;
  now: Date;
  /** Yallapp's address, for the demos' pictures; missing, the platform's. */
  platform?: string;
}

/** The designer Yallapp's own are listed by: its profile on the demo account (made once), or the profile the team gave that account. */
async function houseDesigner(store: DataStore, clientId: string, now: Date): Promise<TemplateDesigner | null> {
  const known = (await store.getTemplateDesigner(HOUSE_DESIGNER_ID)) ?? (await store.getTemplateDesignerByClient(clientId));
  if (known) return known;
  for (const slug of HOUSE_DESIGNER.slugs) {
    const designer: TemplateDesigner = { id: HOUSE_DESIGNER_ID, clientId, name: HOUSE_DESIGNER.name, slug, country: HOUSE_DESIGNER.country, bio: null, status: "active", termsAcceptedAt: now, createdAt: now, updatedAt: now, ...designerPageDefaults() };
    const created = await store.createTemplateDesigner(designer);
    if (created) return created;
    // Made meanwhile by another request, or the address is another designer's: the next one.
    const raced = (await store.getTemplateDesigner(HOUSE_DESIGNER_ID)) ?? (await store.getTemplateDesignerByClient(clientId));
    if (raced) return raced;
  }
  return null;
}

/** The look's template, made published and free (its version follows); null when no address is free for it. */
async function createHouseTemplate(deps: HouseDeps, designer: TemplateDesigner, v: HouseVersion): Promise<MarketTemplate | null> {
  const { store, now } = deps;
  for (const slug of [v.slug, `${v.slug}-yallapp`, `${v.slug}-${v.templateId.slice(0, 8)}`]) {
    const template: MarketTemplate = {
      id: v.templateId,
      designerId: designer.id,
      clientId: designer.clientId,
      sourceAppId: null,
      slug,
      status: "published",
      texts: v.texts,
      kinds: v.kinds,
      tags: [...HOUSE_TAGS],
      free: true,
      plans: [],
      afterEnd: "keep",
      screens: [],
      rightsConfirmedAt: now,
      noteToTeam: null,
      currentVersionId: null,
      reviewVersionId: null,
      submittedAt: null,
      // Never reviewed nor approved (the review queue's "approved this week" leaves it out), nor one of the week's new designs.
      publishedAt: null,
      views: 0,
      createdAt: now,
      updatedAt: now,
    };
    if (await store.createMarketTemplate(template)) return template;
    const raced = await store.getMarketTemplate(v.templateId);
    if (raced) return raced;
  }
  return null;
}

/** The version's row (its design file and look kept first), once: its id, or null when it couldn't be made now. */
async function houseVersionRow(deps: HouseDeps, template: MarketTemplate, v: HouseVersion): Promise<string | null> {
  const { store, blobs, now } = deps;
  if (template.currentVersionId === v.versionId || (await store.getMarketTemplateVersion(v.versionId))) return v.versionId;
  const blobKey = `studio-market/${template.id}/yallapp-${v.hash.slice(0, 16)}.json`;
  const data = Buffer.from(v.text, "utf8");
  await blobs.put(blobKey, data, "application/json");
  const look: TemplateLookFile = { format: "yallapp-template-look", version: 1, appearance: v.appearance };
  await blobs.put(lookKey({ blobKey }), Buffer.from(JSON.stringify(look), "utf8"), "application/json");
  for (let attempt = 0; attempt < 2; attempt++) {
    const version: MarketTemplateVersion = {
      id: v.versionId,
      templateId: template.id,
      number: (await store.lastMarketTemplateVersion(template.id)) + 1,
      blobKey,
      sizeBytes: data.length,
      pages: v.file.pages.length,
      elements: v.file.pages.reduce((n, p) => n + elementCount(p.studio.body), 0),
      languages: v.file.languages.available,
      cover: coverOf(v.file),
      createdAt: now,
      createdBy: null,
    };
    try {
      await store.createMarketTemplateVersion(version);
      return v.versionId;
    } catch (error) {
      // Another request made it (or took its number) meanwhile.
      if (await store.getMarketTemplateVersion(v.versionId)) return v.versionId;
      if (attempt) throw error;
    }
  }
  return null;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** What the template has that the code doesn't: the patch that makes it the code's. */
function houseChanges(template: MarketTemplate, v: HouseVersion, versionId: string): MarketTemplatePatch & { status?: "published" } {
  const want: MarketTemplatePatch & { status: "published" } = {
    status: "published",
    texts: v.texts,
    kinds: v.kinds,
    tags: [...HOUSE_TAGS],
    free: true,
    plans: [],
    afterEnd: "keep",
    screens: [],
    currentVersionId: versionId,
    reviewVersionId: null,
  };
  return Object.fromEntries(Object.entries(want).filter(([key, value]) => !same(template[key as keyof MarketTemplate], value))) as MarketTemplatePatch & { status?: "published" };
}

/**
 * 190 Yallapp's own demos on the market, as this code makes them: each
 * look's template made once, its version the code's (a new one when the
 * demo changed), its texts, kinds and price (free) the code's. Called where
 * the market is read; cheap when nothing changed (one read of the designer
 * and one of the templates). Nothing without the demo account. How many
 * templates it changed.
 */
export async function ensureHouseTemplates(deps: HouseDeps): Promise<number> {
  const clientId = await demoClientId(deps.store);
  if (!clientId) return 0;
  const designer = await houseDesigner(deps.store, clientId, deps.now);
  if (!designer) return 0;
  const versions = houseVersions(deps.platform ?? appUrl());
  const existing = new Map((await deps.store.listMarketTemplates({ ids: versions.map((v) => v.templateId) })).map((t) => [t.id, t]));
  let changed = 0;
  for (const v of versions) {
    const known = existing.get(v.templateId);
    // The quick look: as the code makes it already.
    if (known && !Object.keys(houseChanges(known, v, v.versionId)).length) continue;
    try {
      const template = known ?? (await createHouseTemplate(deps, designer, v));
      if (!template) continue;
      const versionId = await houseVersionRow(deps, template, v);
      if (!versionId) continue;
      const patch = houseChanges(template, v, versionId);
      if (Object.keys(patch).length && (await deps.store.updateMarketTemplate(template.id, patch, deps.now))) changed += 1;
      else if (!known) changed += 1;
    } catch (error) {
      console.error(`[studio-market] Yallapp's ${v.demo} look ${v.look}`, error);
    }
  }
  return changed;
}

/** `ensureHouseTemplates` where the market is read: never in the page's way. */
export async function houseTemplatesReady(store: DataStore, blobs: BlobStore, now: Date): Promise<void> {
  try {
    await ensureHouseTemplates({ store, blobs, now });
  } catch (error) {
    console.error("[studio-market] Yallapp's own templates", error);
  }
}
