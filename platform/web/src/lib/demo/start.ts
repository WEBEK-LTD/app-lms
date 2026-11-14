import "server-only";
import { ENGINES } from "../app/kinds";
import { ownContentSetup } from "../app/own-content";
import { newApp } from "../app/setup";
import { startFromDemoDesign } from "../bot/create";
import type { DataStore } from "../data/store";
import { DEFAULT_HOSTED_SETTINGS, type App, type FirstSteps } from "../data/types";
import { loadLayout, saveDraft } from "../pages/layout";
import { languagesForPlan } from "../pages/plan";
import type { Languages } from "../pages/types";
import { planFitsSection, type PlanInfo } from "../plans";
import { countList } from "../samples/lists";
import { makeStudioProject } from "../studio/new-project";
import { appWords } from "../studio/app-words";
import { isStudioDemo, demoKind, type DemoId } from "./constants";
import { DEMO_BRANDS } from "./content";
import { demoItems, studioDemoTemplate } from "./picker";
import type { SignatureLook } from "../studio/demo-designs/signature";

/**
 * 127 An app started from one of our demos on /start, complete: a demo of
 * the App editor makes a regular app on the demo's design (its pages, tabs,
 * menu, look) with the demo's own entries, opened in the dashboard's
 * editor; a Studio demo makes a Studio project from the demo's template
 * (the whole demo: its pages, tabs, bar, sign-in screen and account menu)
 * with the demo's entries and the demo's own words where the template asks
 * for the owner's, opened in Studio's editor. The products stay apart: one
 * never makes the other. The owner's name, logo, icon and colour are on it,
 * and its first steps (FirstSteps) start.
 */

export interface DemoStart {
  demo: DemoId;
  name: string;
  /** The main colour (#RRGGBB). */
  colour: string;
  logoAssetId: string | null;
  iconAssetId: string | null;
  /** 130 A Studio demo's Signature look to start from (its whole app in that look); missing, the demo itself (its look A). */
  look?: SignatureLook;
}

export interface DemoMaker {
  clientId: string;
  /** The new app's plan, when one is known already (the account's first app); null otherwise. */
  plan: PlanInfo | null;
  /** The language Studio's template words are written in: the app's main one, the demo's first, unless given. */
  lang?: StudioLang;
}

type StudioLang = "en" | "ar" | "tr";

/** The demo's main language, when Studio has its words in it (else English). */
function mainLang(demo: DemoId): StudioLang {
  const first = DEMO_BRANDS[demo].languages[0];
  return first === "ar" || first === "tr" ? first : "en";
}

export interface DemoMade {
  app: App;
  /** The editor it opens in. */
  open: string;
}

export const DEMO_NAME_MAX = 30;

/** The demo's languages, at most the plan's. */
function demoLanguages(demo: DemoId, plan: PlanInfo | null): Languages {
  const [first, ...rest] = DEMO_BRANDS[demo].languages;
  return languagesForPlan({ default: first!, available: [first!, ...rest] }, plan);
}

/** The name under the icon: the name when it fits, else its first word, cut to fit. */
export function shortNameOf(name: string): string {
  if (name.length <= 12) return name;
  return (name.split(/\s+/)[0] ?? name).slice(0, 12);
}

export function firstStepsOf(app: Pick<App, "hostedSettings">): FirstSteps | null {
  return app.hostedSettings?.firstSteps ?? null;
}

/** The demo an app started from on /start (its entries marked `sample` are that demo's); null for any other app. */
export function startedFromDemo(app: Pick<App, "hostedSettings">): DemoId | null {
  const demo = firstStepsOf(app)?.demo;
  return demo && demo in DEMO_BRANDS ? (demo as DemoId) : null;
}

export async function makeFromDemo(store: DataStore, maker: DemoMaker, input: DemoStart, now: Date): Promise<DemoMade> {
  const steps: FirstSteps = { demo: input.demo, startedAt: now.toISOString(), done: [], hiddenAt: null };
  const brand = DEMO_BRANDS[input.demo];
  // What the owner chose, and their first steps; the branding is done when the icon is made.
  const own: Partial<App> = {
    primaryColor: input.colour,
    splashColor: brand.splashColor,
    logoAssetId: input.logoAssetId,
    iconAssetId: input.iconAssetId,
    shortName: shortNameOf(input.name),
    font: brand.font,
    template: brand.template,
    ...(input.iconAssetId ? { brandingDoneAt: now } : {}),
  };
  if (isStudioDemo(input.demo)) {
    const plan = maker.plan && planFitsSection(maker.plan.id, "studio") ? maker.plan : null;
    // The template's words in the app's main language (the demo's), the others kept as translations.
    const lang = maker.lang ?? mainLang(input.demo);
    const made = await makeStudioProject(
      store,
      {
        clientId: maker.clientId,
        name: input.name,
        kind: demoKind(input.demo),
        source: "catalog",
        template: studioDemoTemplate(input.demo, input.look),
        words: appWords(lang, input.name),
        lang,
        languages: demoLanguages(input.demo, plan),
        fromDemo: input.demo,
        // The owner's colour in the pages the template draws, not the demo's.
        extra: { primaryColor: input.colour, splashColor: brand.splashColor, logoAssetId: input.logoAssetId, ...(input.iconAssetId ? { brandingDoneAt: now } : {}) },
      },
      now,
    );
    const saved = (await store.getAppById(made.id)) ?? made;
    await store.updateApp(saved.id, { ...own, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...(saved.hostedSettings ?? {}), firstSteps: steps } }, now);
    return { app: (await store.getAppById(saved.id)) ?? saved, open: "/studio/editor?from=demo" };
  }
  const plan = maker.plan && planFitsSection(maker.plan.id, "regular") ? maker.plan : null;
  const kind = demoKind(input.demo);
  const fresh = newApp(maker.clientId, null, now, kind.engine, kind.vertical);
  const named: App = { ...fresh, appName: input.name, ...own };
  // The demo's content is kept in Yallapp, as "I don't have a website" on the Website step.
  const app: App = {
    ...named,
    siteUrl: null,
    backend: "hosted",
    ...ownContentSetup(ENGINES[kind.engine].ownContent.kind, named),
    websiteDoneAt: now,
    hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...(named.hostedSettings ?? {}), firstSteps: steps },
  };
  await store.createApp(app);
  // The languages first: the design keeps the draft's, and the entries are the demo's.
  const record = await loadLayout(store, app, now);
  await saveDraft(store, app, { ...record.draft, languages: demoLanguages(input.demo, plan) }, now);
  await startFromDemoDesign(store, app, now, { colour: true });
  return { app: (await store.getAppById(app.id)) ?? app, open: "/dashboard/pages?from=demo" };
}

/** The steps an app started from a demo has, in their order. */
export const FIRST_STEPS = ["brand", "items", "photos", "stores"] as const;
export type FirstStep = (typeof FIRST_STEPS)[number];

export interface FirstStepsView {
  demo: DemoId;
  /** The steps done, read from the app (and `photos` from the owner's own tick). */
  done: Record<FirstStep, boolean>;
  /** The demo's entries still in the app's main list, and the owner's own there. */
  samples: number;
  own: number;
}

/**
 * Where an app started from a demo is in its first steps; null when it
 * didn't start from one, or the owner hid them, or every step is done.
 */
export async function firstStepsView(store: DataStore, app: App): Promise<FirstStepsView | null> {
  const steps = firstStepsOf(app);
  const demo = startedFromDemo(app);
  if (!steps || !demo || steps.hiddenAt) return null;
  const { list } = demoItems(demo);
  const counted = await countList(store, app, list);
  const done: Record<FirstStep, boolean> = {
    brand: Boolean(app.appName && app.iconAssetId),
    items: counted.own > 0 || counted.samples === 0,
    photos: steps.done.includes("photos"),
    stores: Boolean(app.listingDoneAt && app.publishingDoneAt),
  };
  if (FIRST_STEPS.every((s) => done[s])) return null;
  return { demo, done, samples: counted.samples, own: counted.own };
}
