import type { DataStore } from "../data/store";
import type { App, AppLayoutRecord } from "../data/types";
import { DEFAULT_HOSTED_SETTINGS } from "../data/types";
import { appUrl } from "../env";
import { withLook } from "../fonts/look";
import { defaultLayout } from "../pages/defaults";
import { appDefaults, loadLayout, saveDraft, type DesignMode } from "../pages/layout";
import { itemSourcesFor } from "../pages/sources";
import type { Appearance, LayoutContent } from "../pages/types";
import type { ParseResult } from "../pages/validate";
import { seedForDesign } from "../samples/server";
import { siteAddress } from "./academy";
import { isStudioProject } from "./section";
import { DEMO_SLUGS, STUDIO_DEMO_TYPES, type StudioDemoId } from "../demo/constants";
import { templatesFor, type SectionContext, type SectionWord, type TemplateInfo } from "./sections";
import { startLayout } from "./start";

/**
 * 124.6 The Studio templates for a whole project (lib/studio/academy.ts:
 * the premium academy) in App setup's Branding step, beside the page
 * designs: offered to a Studio project of a kind that has them, first and
 * recommended. Taken, the project becomes what a new project from the
 * template is (lib/studio/new-project.ts): its pages, tabs, bar and look,
 * its sign-in screen and account menu, and sample entries for its lists;
 * or, for an app with pages of its own, only its look.
 */

const PREFIX = "studio-";

/** The template's real picture, as the app draws its home (public/screens). */
const PICTURES: Record<string, string> = {
  academy_premium: "/screens/premium-home.png",
};

/** 130 A Signature look's picture: `<demo's address>-sig-<look>-home.png` (lib/demo/picker.ts LOOK_SHOTS), the eighteen alike. */
function lookPicture(id: string): string | null {
  const m = /^(.+)_signature_([ab])$/.exec(id);
  const demo = m && (STUDIO_DEMO_TYPES as readonly string[]).includes(m[1]!) ? (m[1] as StudioDemoId) : null;
  return demo ? `/screens/${DEMO_SLUGS[demo]}-sig-${m![2]}-home.png` : null;
}

/** The Branding step's id for a template (`studio-academy_premium`). */
export function projectDesignId(templateId: string): string {
  return `${PREFIX}${templateId}`;
}

/** The templates for the whole project this app may take: a Studio project's, of a kind that has them; none for a regular app. */
export function projectTemplatesFor(app: Pick<App, "section" | "appType"> & { vertical?: App["vertical"] }): TemplateInfo[] {
  if (!isStudioProject(app)) return [];
  return templatesFor({ type: app.appType, vertical: app.vertical ?? null }).filter((t) => t.project);
}

/** The template a Branding step's design id names, when this app may take it. */
export function projectTemplateOf(app: Pick<App, "section" | "appType"> & { vertical?: App["vertical"] }, designId: string): TemplateInfo | null {
  if (!designId.startsWith(PREFIX)) return null;
  return projectTemplatesFor(app).find((t) => projectDesignId(t.id) === designId) ?? null;
}

/** The Branding step's id of the template the app last started from (its `design`), or null. */
export function chosenProjectDesign(app: Pick<App, "section" | "appType" | "design"> & { vertical?: App["vertical"] }): string | null {
  const template = projectTemplatesFor(app).find((t) => t.id === app.design);
  return template ? projectDesignId(template.id) : null;
}

/** The template's real picture, or null. */
export function projectTemplatePicture(template: Pick<TemplateInfo, "id">): string | null {
  return PICTURES[template.id] ?? lookPicture(template.id);
}

/** What the template's words are written with: the app's words (lib/studio/app-words.ts) in the dashboard's language. */
export interface ProjectTemplateWords {
  w: (word: SectionWord) => string;
  lang: "en" | "ar" | "tr";
}

/** The draft the template makes for the app, as a new project from it starts (lib/studio/new-project.ts); `look` the Branding step's template and font, last. */
export async function projectTemplateLayout(
  store: DataStore,
  app: App,
  template: TemplateInfo,
  now: Date,
  words: ProjectTemplateWords,
  look: Partial<Appearance> = {},
): Promise<LayoutContent> {
  const record = await loadLayout(store, app, now);
  const ready = { ...defaultLayout(app, await appDefaults(store), now), languages: record.draft.languages };
  // The owner's website, for a Blog tab: the app's own, else the one from sign-up.
  const site = siteAddress(app.siteUrl) ?? siteAddress((await store.getClientById(app.clientId))?.siteUrl);
  const ctx: SectionContext = {
    brand: app.primaryColor,
    source: itemSourcesFor(app)[0] ?? null,
    app: app.appName ?? "",
    w: words.w,
    lang: words.lang,
    picture: (file: string) => `${appUrl()}/design-pictures/${file}`,
  };
  const layout = startLayout(app, template, ready, now, ctx, site);
  return { ...layout, appearance: withLook(layout.appearance, look) };
}

/**
 * Takes the template: everything (its draft, its screens, the app's design
 * and sample entries for its lists), or (`mode` "look") only its look, the
 * pages, screens and the design the app started from staying. What's
 * published stays either way.
 */
export async function applyProjectTemplate(
  store: DataStore,
  app: App,
  template: TemplateInfo,
  now: Date,
  words: ProjectTemplateWords,
  options: { mode?: DesignMode; look?: Partial<Appearance> } = {},
): Promise<ParseResult<AppLayoutRecord>> {
  const project = template.project;
  if (!project) return { ok: false, errors: ["This template isn't one for the whole project."] };
  const look = options.look ?? {};
  if (options.mode === "look") {
    const record = await loadLayout(store, app, now);
    return saveDraft(store, app, { ...record.draft, appearance: withLook(withLook(record.draft.appearance, project.appearance), look) }, now);
  }
  const saved = await saveDraft(store, app, await projectTemplateLayout(store, app, template, now, words, look), now);
  if (!saved.ok) return saved;
  const screens = project.screens(appUrl());
  await store.updateApp(app.id, { design: template.id, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...(app.hostedSettings ?? {}), studioScreens: screens } }, now);
  // Content kept in Yallapp: the empty lists its pages show get sample entries.
  await seedForDesign(store, app.id, saved.value.draft.pages, now);
  return saved;
}
