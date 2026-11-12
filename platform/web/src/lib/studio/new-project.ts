import "server-only";
import { ENGINES, type KindInfo } from "../app/kinds";
import { ownContentSetup } from "../app/own-content";
import { newApp } from "../app/setup";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { DEFAULT_HOSTED_SETTINGS } from "../data/types";
import { DEMO_BRANDS } from "../demo/content";
import { demoStudioScreens } from "../demo/screens";
import { appUrl } from "../env";
import { defaultLayout } from "../pages/defaults";
import { appDefaults, saveDraft } from "../pages/layout";
import { itemSourcesFor } from "../pages/sources";
import type { Languages } from "../pages/types";
import { seedForDesign } from "../samples/server";
import type { SectionWord, TemplateInfo } from "./sections";
import type { StudioSource } from "./section";
import { siteAddress } from "./academy";
import { startLayout } from "./start";

export interface NewStudioProject {
  clientId: string;
  name: string;
  kind: KindInfo;
  source: StudioSource;
  template: TemplateInfo;
  /** The template's words (`studio.w_<word>`) in the dashboard's language. */
  words: (word: SectionWord) => string;
  lang: "en" | "ar" | "tr";
  /** What the owner chose besides (the app-builder bot: the main colour, the logo); never the project's kind or section. */
  extra?: Pick<Partial<App>, "primaryColor" | "splashColor" | "logoAssetId" | "brandingDoneAt" | "reviewPrompt" | "chatSettings" | "catalogSettings">;
  /** The app's languages, when chosen (else the defaults'). */
  languages?: Languages;
}

/**
 * A new Studio project (the three steps of /studio/new and the app-builder
 * bot): content kept in Yallapp is set up at once, its first draft is the
 * chosen template (lib/studio/start.ts: a demo's template is the whole
 * demo), and the empty lists its pages show get sample entries, the demo's
 * own when it starts from a demo. Returns the project, saved.
 */
export async function makeStudioProject(store: DataStore, input: NewStudioProject, now: Date): Promise<App> {
  const { kind, template, name } = input;
  // Templates = demos: a demo's template starts the project in the demo's colour and look too.
  const demo = template.demo ?? null;
  // 123 A template for the whole project starts it in its colour, with its screens.
  const project = template.project ?? null;
  const fresh = newApp(input.clientId, null, now, kind.engine, kind.vertical);
  const screens = demo ? demoStudioScreens(demo, appUrl()) : project ? project.screens(appUrl()) : null;
  const base: App = {
    ...fresh,
    section: "studio",
    appName: name,
    ...(demo ? { primaryColor: DEMO_BRANDS[demo].primaryColor } : project ? { primaryColor: project.primary } : {}),
    // 120 The demo's sign-in screen and account menu too (lib/studio/screens.ts), as the demo has them.
    ...(screens ? { hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...(fresh.hostedSettings ?? {}), studioScreens: screens } } : {}),
    ...input.extra,
  };
  const app: App =
    input.source === "catalog"
      ? { ...base, backend: "hosted", ...ownContentSetup(ENGINES[kind.engine].ownContent.kind, base), websiteDoneAt: now }
      : base;
  await store.createApp(app);
  const defaults = defaultLayout(app, await appDefaults(store), now);
  const ready = input.languages ? { ...defaults, languages: input.languages } : defaults;
  // 123 The owner's website from sign-up, for a template's Blog tab.
  const site = project ? siteAddress((await store.getClientById(input.clientId))?.siteUrl) : null;
  // The demo's pages and look; its home is the demo's Studio page.
  const layout = startLayout(app, template, ready, now, {
    brand: app.primaryColor,
    source: itemSourcesFor(app)[0] ?? null,
    app: name,
    w: input.words,
    lang: input.lang,
    // 112.4 Yallapp's pictures in the template's sliders and sections.
    picture: (file: string) => `${appUrl()}/design-pictures/${file}`,
  }, site);
  const saved = await saveDraft(store, app, layout, now);
  // The ready-made pages then; the project is made all the same.
  if (!saved.ok) console.error("[studio] new project draft", saved.errors.slice(0, 3).join("; "));
  // 110.2 Content kept in Yallapp: the empty lists its pages show get sample entries, a demo's own when it starts from the demo.
  else await seedForDesign(store, app.id, saved.value.draft.pages, now, demo);
  return app;
}
