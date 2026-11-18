import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { KEY } from "../helpers";
import { KINDS } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { demoKind } from "@/lib/demo/constants";
import { connectorFor } from "@/lib/hosted/connectors";
import { pickableContent } from "@/lib/hosted/pages/pickable";
import "@/lib/hosted/pages/sources";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { loadLayout, publishLayout, saveDraft } from "@/lib/pages/layout";
import type { LayoutContent } from "@/lib/pages/types";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import type { AppCheckDeps } from "@/lib/studio/app-check";
import { appWords } from "@/lib/studio/app-words";
import { makeStudioProject } from "@/lib/studio/new-project";
import { studioSourcesFor } from "@/lib/studio/section";
import { TEMPLATES, templatesFor, type SectionWord } from "@/lib/studio/sections";

/**
 * 182 A real owner's project for the app check's tests: made from a Studio
 * template as /studio/new makes it (English, with Arabic and Turkish on),
 * published, and read through the hosted API as a phone reads it. The same
 * way the template guard (166) makes its projects, kept apart from its files.
 */

process.env.YALLAPP_BLOBS_DIR ??= mkdtempSync(join(tmpdir(), "app-check-"));

export const CHECK_NOW = new Date("2026-11-18T10:00:00Z");
const PLATFORM_URL = "https://yallapp.test";

export interface CheckProject {
  store: MemoryStore;
  app: App;
  draft: LayoutContent;
}

let owners = 0;

export async function checkProject(templateId: string): Promise<CheckProject> {
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error(`No template ${templateId}`);
  // The kind an owner picks it for, as the template guard does: its demo's, else the first kind /studio/new lists it for, else a store.
  const kind = template.demo
    ? demoKind(template.demo)
    : !template.fits
      ? KINDS.find((k) => k.id === "store")!
      : KINDS.find((k) => templatesFor({ type: k.engine, vertical: k.vertical }).some((t) => t.id === template.id))!;
  const store = new MemoryStore();
  clearPlatformSettingsCache();
  await store.setPlatformSetting("exchangeRates", { rates: { USD: 1, TRY: 34.2, EGP: 48.5 }, date: "2026-11-18", fetchedAt: CHECK_NOW.toISOString(), source: "ExchangeRate-API" }, "daily job", CHECK_NOW);
  owners += 1;
  const { client } = await registerClient(store, { name: "Check Owner", email: `check-${owners}@owner.test`, whatsapp: "+905446731942", siteUrl: "https://owner.test", password: null }, CHECK_NOW);
  const sources = studioSourcesFor(kind);
  const made = await makeStudioProject(
    store,
    {
      clientId: client.id,
      name: "Rose Corner",
      kind,
      source: sources.includes("catalog") ? "catalog" : sources[0]!,
      template,
      words: appWords("en", "Rose Corner") as (word: SectionWord) => string,
      lang: "en",
      languages: { default: "en", available: ["en", "ar", "tr"] },
    },
    CHECK_NOW,
  );
  const app = (await store.getAppById(made.id))!;
  const p: CheckProject = { store, app, draft: (await loadLayout(store, app, CHECK_NOW)).draft };
  await publishAs(p);
  return p;
}

/** Saves `layout` as the editor does, then publishes, as the owner does. */
export async function publishAs(p: CheckProject, layout?: LayoutContent): Promise<void> {
  if (layout) {
    const saved = await saveDraft(p.store, p.app, layout, CHECK_NOW);
    if (!saved.ok) throw new Error(`Saving the draft failed: ${saved.errors.slice(0, 3).join("; ")}`);
  }
  const draft = (await loadLayout(p.store, p.app, CHECK_NOW)).draft;
  const published = await publishLayout(p.store, p.app, draft, "owner@owner.test", CHECK_NOW);
  if (!published.ok) throw new Error(`Publishing failed: ${published.errors.slice(0, 3).join("; ")}`);
  p.draft = draft;
  p.app = (await p.store.getAppById(p.app.id))!;
}

/** The check's dependencies for the project: its hosted API, read-only, and its store's entries. */
export function checkDeps(p: CheckProject): AppCheckDeps {
  const assetUrl = (id: string) => `${PLATFORM_URL}/api/v1/assets/${id}`;
  const ctx: HostedContext = {
    store: p.store,
    app: p.app,
    active: true,
    now: CHECK_NOW,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender: null,
    push: false,
    assetUrl,
    platformUrl: PLATFORM_URL,
    connector: connectorFor(p.app, KEY, { store: p.store, assetUrl, platformUrl: PLATFORM_URL, food: true, rides: true }),
  };
  return {
    serve: (path, lang) => handleHosted(ctx, { method: "GET", path, query: new URLSearchParams({ platform: "android" }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) }),
    pickable: () => pickableContent(p.app, { store: p.store, key: KEY, assetUrl, platformUrl: PLATFORM_URL }, CHECK_NOW),
  };
}
