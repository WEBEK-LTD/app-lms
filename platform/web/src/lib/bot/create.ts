import "server-only";
import { ENGINES } from "../app/kinds";
import { ownContentSetup } from "../app/own-content";
import { newApp } from "../app/setup";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { demoIdOf } from "../demo/constants";
import { demoDesignId, demoOfDesign } from "../demo/look";
import { designsForApp } from "../pages/designs/catalog";
import { loadLayout, saveDesignDraft, saveDraft } from "../pages/layout";
import { languagesForPlan } from "../pages/plan";
import type { Languages } from "../pages/types";
import { planFitsSection, type PlanInfo } from "../plans";
import { seedForDesign } from "../samples/server";
import { makeStudioProject } from "../studio/new-project";
import { STUDIO_ONLY_KINDS } from "../studio/section";
import { templatesFor, TEMPLATES, type SectionWord } from "../studio/sections";
import type { BotAnswers } from "./answers";
import { featureSettings } from "./features";
import type { KindInfo } from "../app/kinds";

/**
 * The app the bot's answers make, with the platform's own steps: a kind
 * only Studio offers is a Studio project from its demo's template
 * (lib/studio/new-project.ts, lib/studio/start.ts: the whole demo); any
 * other kind a regular app, its content kept in Yallapp unless it has a
 * website, on its demo's design ("Like our demo", lib/demo/look.ts) with the
 * demo's own sample entries. Then the editor opens.
 */

export interface BotMaker {
  clientId: string;
  /** The new app's plan, when one is known already (the plan given for the account's first app); null otherwise. */
  plan: PlanInfo | null;
  /** Studio's template words in the dashboard's language. */
  words: (word: SectionWord) => string;
  lang: "en" | "ar" | "tr";
}

export interface BotMade {
  app: App;
  /** The editor: Pages & look, or the Studio editor. */
  open: string;
}

export function isStudioKind(kind: Pick<KindInfo, "id">): boolean {
  return STUDIO_ONLY_KINDS.has(kind.id);
}

/** The app's languages, at most its plan's. */
function languagesOf(answers: BotAnswers, plan: PlanInfo | null): Languages {
  const [first, ...rest] = answers.languages;
  return languagesForPlan({ default: first!, available: [first!, ...rest] }, plan);
}

export async function makeFromAnswers(store: DataStore, maker: BotMaker, answers: BotAnswers, kind: KindInfo, now: Date): Promise<BotMade> {
  if (isStudioKind(kind)) return makeStudio(store, maker, answers, kind, now);
  return makeRegular(store, maker, answers, kind, now);
}

async function makeStudio(store: DataStore, maker: BotMaker, answers: BotAnswers, kind: KindInfo, now: Date): Promise<BotMade> {
  // A Studio project is paid on a Studio plan only.
  const plan = maker.plan && planFitsSection(maker.plan.id, "studio") ? maker.plan : null;
  const templates = templatesFor({ type: kind.engine, vertical: kind.vertical });
  // The kind's demo (its template is the whole demo), or a university's own.
  const template = (answers.university ? templates.find((t) => t.id === "university") : templates.find((t) => t.demo)) ?? templates[0] ?? TEMPLATES.find((t) => t.id === "blank")!;
  const features = featureSettings({ appType: kind.engine, backend: "hosted", connector: null, catalogSettings: null }, answers.features, plan);
  const app = await makeStudioProject(
    store,
    {
      clientId: maker.clientId,
      name: answers.name,
      kind,
      source: "catalog",
      template,
      words: maker.words,
      lang: maker.lang,
      extra: {
        ...(answers.colour ? { primaryColor: answers.colour } : {}),
        logoAssetId: answers.logoAssetId,
        chatSettings: features.chatSettings,
        reviewPrompt: features.reviewPrompt,
      },
      languages: languagesOf(answers, plan),
    },
    now,
  );
  return { app, open: "/studio/editor" };
}

async function makeRegular(store: DataStore, maker: BotMaker, answers: BotAnswers, kind: KindInfo, now: Date): Promise<BotMade> {
  const plan = maker.plan && planFitsSection(maker.plan.id, "regular") ? maker.plan : null;
  const fresh = newApp(maker.clientId, answers.website, now, kind.engine, kind.vertical);
  const named: App = { ...fresh, appName: answers.name, logoAssetId: answers.logoAssetId, ...(answers.colour ? { primaryColor: answers.colour } : {}) };
  // No website: the content is kept in Yallapp (as "I don't have a website" on the Website step).
  const base: App = answers.website ? named : { ...named, siteUrl: null, backend: "hosted", ...ownContentSetup(ENGINES[kind.engine].ownContent.kind, named), websiteDoneAt: now };
  const app: App = { ...base, ...featureSettings(base, answers.features, plan) };
  await store.createApp(app);
  // The languages first: the design keeps the draft's, and the samples are written in the main one.
  const record = await loadLayout(store, app, now);
  await saveDraft(store, app, { ...record.draft, languages: languagesOf(answers, plan) }, now);
  // Start from the demo: the kind's demo design, else its first design.
  const designs = await designsForApp(store, app);
  const design = designs.find((d) => d.id === demoDesignId(demoIdOf(app))) ?? designs[0] ?? null;
  if (design) {
    // The demo's colours unless the owner chose one.
    const palette = answers.colour ? null : (design.palettes?.[0] ?? null);
    const withColour = palette?.primary ? { ...app, primaryColor: palette.primary } : app;
    if (palette?.primary) await store.updateApp(app.id, { primaryColor: palette.primary }, now);
    const saved = await saveDesignDraft(store, withColour, design, now, palette ? { secondary_color: palette.secondary } : {});
    if (!saved.ok) console.error("[bot] design", saved.errors.slice(0, 3).join("; "));
    // 110.2 The empty lists the design shows get the demo's own sample entries.
    else await seedForDesign(store, app.id, saved.value.record.draft.pages, now, demoOfDesign(design.id));
  }
  return { app: (await store.getAppById(app.id)) ?? app, open: "/dashboard/pages?from=bot" };
}
