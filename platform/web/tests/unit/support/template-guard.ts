import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { KEY } from "../helpers";
import { KINDS, type KindInfo } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { demoKind } from "@/lib/demo/constants";
import { connectorFor } from "@/lib/hosted/connectors";
import { LogSender } from "@/lib/hosted/otp-sender";
import { pickableContent, type Pickable } from "@/lib/hosted/pages/pickable";
import "@/lib/hosted/pages/sources";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { loadLayout, publishLayout, saveDraft } from "@/lib/pages/layout";
import type { LayoutContent, StudioNode, StudioPage } from "@/lib/pages/types";
import { removeAllSamples } from "@/lib/samples/remove";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { appWords } from "@/lib/studio/app-words";
import { makeStudioProject } from "@/lib/studio/new-project";
import { studioSourcesFor } from "@/lib/studio/section";
import { TEMPLATES, templatesFor, type SectionWord, type TemplateInfo } from "@/lib/studio/sections";

/**
 * 166 The template guard's harness: a project made from a Studio template
 * the way an owner's is (lib/studio/new-project.ts, as /studio/new makes
 * it), published as the owner publishes, and read the way a phone reads the
 * hosted API (`GET /pages`, then `GET /pages/{slug}`, lib/hosted/pages), in
 * each of Studio's languages. The templates are enumerated from `TEMPLATES`
 * (every demo's, every Signature look, every kind's own and the ones for
 * every project), so a new template is guarded as soon as it is added.
 */

// The sample entries' pictures go to a folder of their own.
process.env.YALLAPP_BLOBS_DIR ??= mkdtempSync(join(tmpdir(), "template-guard-"));

export const GUARD_NOW = new Date("2026-11-18T10:00:00Z");
export const GUARD_LANGS = ["en", "ar", "tr"] as const;
export type GuardLang = (typeof GUARD_LANGS)[number];
export const PLATFORM_URL = "https://yallapp.test";
/** The customer's own currency, other than every sample shop's, for the price checks. */
export const CUSTOMER_CURRENCY = "USD";
const RATES = { USD: 1, TRY: 34.2, EGP: 48.5, EUR: 0.92, GBP: 0.79, SAR: 3.75, AED: 3.67, KWD: 0.306 };

/** One template, with the kind of project an owner makes it for. */
export interface GuardCase {
  template: TemplateInfo;
  kind: KindInfo;
}

/**
 * The kind an owner picks the template for: a demo's (and its looks') own
 * kind; else the first kind /studio/new lists it for (`templatesFor`); the
 * templates for every project on a store, the kind with the most lists.
 */
export function kindFor(template: TemplateInfo): KindInfo {
  if (template.demo) return demoKind(template.demo);
  if (!template.fits) return KINDS.find((k) => k.id === "store")!;
  const kind = KINDS.find((k) => templatesFor({ type: k.engine, vertical: k.vertical }).some((t) => t.id === template.id));
  if (!kind) throw new Error(`No kind lists the ${template.id} template.`);
  return kind;
}

export const GUARD_CASES: readonly GuardCase[] = TEMPLATES.map((template) => ({ template, kind: kindFor(template) }));

/** A served page: its slug, the screen it's drawn around, and its Studio page as the app gets it. */
export interface ServedPage {
  slug: string;
  screen: string | null;
  studio: StudioPage | null;
  result: HostedResult;
}

export interface ServedApp {
  lang: GuardLang;
  navigation: Record<string, unknown>;
  navigationResult: HostedResult;
  pages: ServedPage[];
}

export interface GuardProject {
  case: GuardCase;
  store: MemoryStore;
  app: App;
  draft: LayoutContent;
  ctx: HostedContext;
}

let clients = 0;

/**
 * The project an owner gets from the template on /studio/new: its content
 * kept in Yallapp (else the kind's first source) with the sample entries its
 * lists get, in English with Arabic and Turkish on; published as it starts.
 */
export async function guardProject(c: GuardCase): Promise<GuardProject> {
  const store = new MemoryStore();
  clearPlatformSettingsCache();
  await store.setPlatformSetting("exchangeRates", { rates: RATES, date: "2026-11-18", fetchedAt: GUARD_NOW.toISOString(), source: "ExchangeRate-API" }, "daily job", GUARD_NOW);
  clients += 1;
  const { client } = await registerClient(store, { name: "Guard Owner", email: `guard-${clients}@owner.test`, whatsapp: "+905446731942", siteUrl: "https://owner.test", password: null }, GUARD_NOW);
  const sources = studioSourcesFor(c.kind);
  const source = sources.includes("catalog") ? "catalog" : sources[0]!;
  const words = appWords("en", "Guard Shop") as (word: SectionWord) => string;
  const made = await makeStudioProject(
    store,
    { clientId: client.id, name: "Guard Shop", kind: c.kind, source, template: c.template, words, lang: "en", languages: { default: "en", available: ["en", "ar", "tr"] } },
    GUARD_NOW,
  );
  const app = (await store.getAppById(made.id))!;
  const draft = (await loadLayout(store, app, GUARD_NOW)).draft;
  const p: GuardProject = { case: c, store, app, draft, ctx: contextFor(store, app) };
  await publish(p);
  return p;
}

export function contextFor(store: MemoryStore, app: App): HostedContext {
  const assetUrl = (id: string) => `${PLATFORM_URL}/api/v1/assets/${id}`;
  return {
    store,
    app,
    active: true,
    now: GUARD_NOW,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender: new LogSender(),
    push: false,
    assetUrl,
    platformUrl: PLATFORM_URL,
    connector: connectorFor(app, KEY, { store, assetUrl, platformUrl: PLATFORM_URL, food: true, rides: true }),
  };
}

/** Saves `layout` as the editor saves a draft, then publishes the draft, as the owner does. */
export async function publish(p: GuardProject, layout?: LayoutContent): Promise<void> {
  if (layout) {
    const saved = await saveDraft(p.store, p.app, layout, GUARD_NOW);
    if (!saved.ok) throw new Error(`${p.case.template.id}: saving the draft failed: ${saved.errors.slice(0, 5).join("; ")}`);
  }
  const draft = (await loadLayout(p.store, p.app, GUARD_NOW)).draft;
  const published = await publishLayout(p.store, p.app, draft, "owner@owner.test", GUARD_NOW);
  if (!published.ok) throw new Error(`${p.case.template.id}: publishing failed: ${published.errors.slice(0, 5).join("; ")}`);
  p.draft = draft;
  p.app = (await p.store.getAppById(p.app.id))!;
  p.ctx = contextFor(p.store, p.app);
}

/** "Remove all samples": the store then has none of its own entries. */
export async function withoutSamples(p: GuardProject): Promise<void> {
  await removeAllSamples({ store: p.store, deleteBlob: async () => undefined, now: GUARD_NOW }, p.app.id);
  p.app = (await p.store.getAppById(p.app.id))!;
  p.ctx = contextFor(p.store, p.app);
}

/** The entries and categories the store has, as Studio's inspector lists them. */
export async function pickable(p: GuardProject): Promise<Pickable> {
  return pickableContent(p.app, { store: p.store, key: KEY, assetUrl: p.ctx.assetUrl, platformUrl: PLATFORM_URL }, GUARD_NOW);
}

async function get(p: GuardProject, path: string[], lang: GuardLang): Promise<HostedResult> {
  return handleHosted(p.ctx, {
    method: "GET",
    path,
    query: new URLSearchParams({ platform: "android" }),
    body: undefined,
    token: null,
    headers: new Headers({ "accept-language": lang, "x-currency": CUSTOMER_CURRENCY }),
  });
}

/** The published app as a phone in `lang` reads it: `GET /pages`, then each page it lists. */
export async function serve(p: GuardProject, lang: GuardLang): Promise<ServedApp> {
  const navigationResult = await get(p, ["pages"], lang);
  if (navigationResult.status !== 200) throw new Error(`GET /pages answered ${navigationResult.status}`);
  const navigation = navigationResult.body as Record<string, unknown>;
  const pages: ServedPage[] = [];
  for (const entry of navigation.pages as { slug: string; screen?: string }[]) {
    const result = await get(p, ["pages", entry.slug], lang);
    if (result.status !== 200) throw new Error(`GET /pages/${entry.slug} answered ${result.status}`);
    const body = result.body as Record<string, unknown>;
    pages.push({ slug: entry.slug, screen: entry.screen ?? null, studio: (body.studio as StudioPage | undefined) ?? null, result });
  }
  return { lang, navigation, navigationResult, pages };
}

/** Every node of a Studio page, its cards' too, with where it is ("column#a/row#b/card"). */
export function nodesOf(page: Pick<StudioPage, "body">): { node: StudioNode; path: string }[] {
  const out: { node: StudioNode; path: string }[] = [];
  const walk = (node: StudioNode, path: string) => {
    out.push({ node, path });
    node.children?.forEach((c, i) => walk(c, `${path}/${c.type}#${c.id ?? i}`));
    if (node.card) walk(node.card, `${path}/card`);
  };
  walk(page.body, `${page.body.type}#${page.body.id}`);
  return out;
}

/**
 * The pages a phone opens first: Home, then the pages the tabs open (by
 * slug), and the Studio pages drawn around the screens the tabs open (a
 * shop's Shop tab, around its search).
 */
export function mainSlugs(app: ServedApp): string[] {
  const tabs = (app.navigation.tabs as { target: { type: string; page_slug?: string | null; screen?: string | null } }[]) ?? [];
  const screens = new Set(tabs.flatMap((t) => (t.target.type === "screen" && t.target.screen ? [t.target.screen] : [])));
  const slugs = [
    "home",
    ...tabs.flatMap((t) => (t.target.type === "page" && t.target.page_slug ? [t.target.page_slug] : [])),
    ...app.pages.filter((p) => p.screen && screens.has(p.screen)).map((p) => p.slug),
  ];
  return [...new Set(slugs)].filter((s) => app.pages.some((p) => p.slug === s && p.studio));
}
