import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ENGINES, KINDS, mainScreenOf, mainScreenOfApp, type KindInfo } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { connectorFor } from "@/lib/hosted/connectors";
import { LogSender } from "@/lib/hosted/otp-sender";
import "@/lib/hosted/pages/sources";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { loadLayout, publishLayout, saveDraft } from "@/lib/pages/layout";
import { appOpensScreen } from "@/lib/pages/sources";
import { ACTION_TYPES, SCREENS, type Action, type LayoutContent, type StudioNode, type StudioPage } from "@/lib/pages/types";
import { appWords } from "@/lib/studio/app-words";
import { mainScreenButtons, withMainScreen } from "@/lib/studio/main-screen";
import { makeStudioProject } from "@/lib/studio/new-project";
import { studioSourcesFor } from "@/lib/studio/section";
import { TEMPLATES, type SectionWord } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";
import { KEY } from "./helpers";

/**
 * 183 `brand`, the template for every project: its hero's "Start now" opens
 * the screen the kind's customers came for (lib/app/kinds.ts `mainScreenOf`),
 * when the project is made and, for projects made before, when the hosted
 * API serves the page. The owner's own link always wins.
 */

const BLOBS = mkdtempSync(join(tmpdir(), "phase183-"));
process.env.YALLAPP_BLOBS_DIR = BLOBS;
afterAll(() => rmSync(BLOBS, { recursive: true, force: true }));

const NOW = new Date("2026-11-18T10:00:00Z");
const BRAND = TEMPLATES.find((t) => t.id === "brand")!;
const PLATFORM = "https://yallapp.test";

/** The screen each kind's "Start now" opens, as the coordinator decided it. */
const EXPECTED: Record<string, string> = {
  store: "search",
  marketplace: "search",
  restaurant: "search",
  food: "restaurants",
  academy: "courses",
  instructors: "courses",
  bookings: "services",
  clinic: "services",
  services: "services",
  fitness: "classes",
  events: "events",
  real_estate: "courses",
  news: "articles",
  charity: "campaigns",
  travel: "explore",
  community: "community_feed",
  rides: "ride",
  taxi: "ride",
  school: "school",
  delivery: "send_parcel",
};

let store: MemoryStore;
let clients = 0;
beforeEach(() => {
  store = new MemoryStore();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

function contextOf(app: App): HostedContext {
  const assetUrl = (id: string) => `${PLATFORM}/api/v1/assets/${id}`;
  return {
    store,
    app,
    active: true,
    now: NOW,
    ip: "203.0.113.9",
    secret: "s",
    sender: new LogSender(),
    push: false,
    assetUrl,
    platformUrl: PLATFORM,
    connector: connectorFor(app, KEY, { store, assetUrl, platformUrl: PLATFORM, food: true, rides: true }),
  };
}

/** A project made from `brand` for `kind`, as /studio/new makes it, published as it starts. */
async function brandProject(kind: KindInfo): Promise<App> {
  clients += 1;
  const { client } = await registerClient(store, { name: "Owner", email: `owner-${clients}@brand.test`, whatsapp: "+905446731942", siteUrl: "https://owner.test", password: null }, NOW);
  const sources = studioSourcesFor(kind);
  const source = sources.includes("catalog") ? "catalog" : sources[0]!;
  const made = await makeStudioProject(
    store,
    { clientId: client.id, name: "Brand", kind, source, template: BRAND, words: appWords("en", "Brand") as (word: SectionWord) => string, lang: "en", languages: { default: "en", available: ["en", "ar", "tr"] } },
    NOW,
  );
  const app = (await store.getAppById(made.id))!;
  return publish(app);
}

async function publish(app: App, layout?: LayoutContent): Promise<App> {
  if (layout) {
    const saved = await saveDraft(store, app, layout, NOW);
    if (!saved.ok) throw new Error(saved.errors.join("; "));
  }
  const draft = (await loadLayout(store, app, NOW)).draft;
  const published = await publishLayout(store, app, draft, "owner@brand.test", NOW);
  if (!published.ok) throw new Error(published.errors.join("; "));
  return (await store.getAppById(app.id))!;
}

async function draftOf(app: App): Promise<LayoutContent> {
  return structuredClone((await loadLayout(store, app, NOW)).draft);
}

/** The hero's "Start now" in a Studio page. */
function startNow(page: Pick<StudioPage, "body">): StudioNode {
  const button = allNodes(page).find((n) => n.type === "button" && n.text === "Start now");
  if (!button) throw new Error("No Start now button");
  return button;
}

async function servedStartNow(app: App, lang = "en"): Promise<StudioNode> {
  const result = await handleHosted(contextOf(app), { method: "GET", path: ["pages", "home"], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) });
  expect(result.status).toBe(200);
  const studio = (result.body as { studio: StudioPage }).studio;
  const node = allNodes(studio).find((n) => n.type === "button" && n.text === (lang === "ar" ? "ابدأ الآن" : lang === "tr" ? "Hemen başla" : "Start now"));
  if (!node) throw new Error(`No Start now button in ${lang}`);
  return node;
}

describe("183 mainScreenOf", () => {
  it("names every kind, with an action type and a screen the contract and the kind's app have", () => {
    expect(Object.keys(EXPECTED).sort()).toEqual(KINDS.map((k) => k.id).sort());
    for (const kind of KINDS) {
      const action = mainScreenOf(kind);
      expect(action, kind.id).toEqual({ type: "screen", screen: EXPECTED[kind.id] });
      expect(ACTION_TYPES).toContain(action.type);
      expect(SCREENS as readonly string[]).toContain(action.screen);
      expect(appOpensScreen({ appType: kind.engine, vertical: kind.vertical }, action.screen), kind.id).toBe(true);
      expect(mainScreenOfApp({ appType: kind.engine, vertical: kind.vertical })).toEqual(action);
    }
  });

  it("falls back to the kind's first tab that isn't Home, then Home's first list, never null", () => {
    const store = KINDS.find((k) => k.id === "store")!;
    const fitness = KINDS.find((k) => k.id === "fitness")!;
    const home = { id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" } as Action };
    expect(mainScreenOf({ ...fitness, id: "gym_unknown", tabs: [home, ...fitness.tabs!] })).toEqual({ type: "screen", screen: "classes" });
    expect(mainScreenOf({ ...store, id: "store_unknown" })).toEqual(ENGINES.store.pages.tabs[0]!.target);
    // No tab: the screen of Home's first list (a store's products: none of that name, so its first screen).
    const noTabs = { ...store, id: "bare", tabs: [] as never[] };
    const engine = ENGINES.store.pages;
    const saved = engine.tabs;
    engine.tabs = [];
    try {
      const action = mainScreenOf(noTabs);
      expect(action).not.toBeNull();
      expect(action.type).toBe("screen");
      expect(appOpensScreen({ appType: "store", vertical: null }, action.screen)).toBe(true);
    } finally {
      engine.tabs = saved;
    }
  });
});

describe("183 a project made from brand: Start now opens the kind's main screen", () => {
  for (const kind of KINDS) {
    it(`${kind.id}: made with ${EXPECTED[kind.id]}, and served so in every language`, async () => {
      const app = await brandProject(kind);
      const home = (await draftOf(app)).pages.find((p) => p.slug === "home")!.studio!;
      expect(startNow(home).action).toEqual({ type: "screen", screen: EXPECTED[kind.id] });
      for (const lang of ["en", "ar", "tr"]) expect((await servedStartNow(app, lang)).action, lang).toEqual({ type: "screen", screen: EXPECTED[kind.id] });
    });
  }
});

describe("183 a project made before: served with the kind's main screen", () => {
  for (const kind of KINDS) {
    it(`${kind.id}: Start now with no action is served opening ${EXPECTED[kind.id]}`, async () => {
      let app = await brandProject(kind);
      const draft = await draftOf(app);
      const home = draft.pages.find((p) => p.slug === "home")!.studio!;
      // As brand made it before 183.
      startNow(home).action = null;
      app = await publish(app, draft);
      const stored = (await draftOf(app)).pages.find((p) => p.slug === "home")!.studio!;
      expect(startNow(stored).action ?? null).toBeNull();
      expect((await servedStartNow(app)).action).toEqual({ type: "screen", screen: EXPECTED[kind.id] });
    });
  }

  it("the owner's own link always wins", async () => {
    let app = await brandProject(KINDS.find((k) => k.id === "store")!);
    const draft = await draftOf(app);
    const own: Action = { type: "url", url: "https://owner.test/start", open_in: "in_app" };
    startNow(draft.pages.find((p) => p.slug === "home")!.studio!).action = own;
    app = await publish(app, draft);
    expect((await servedStartNow(app)).action).toEqual(own);
    const cart: Action = { type: "screen", screen: "cart" };
    const again = await draftOf(app);
    startNow(again.pages.find((p) => p.slug === "home")!.studio!).action = cart;
    app = await publish(app, again);
    expect((await servedStartNow(app)).action).toEqual(cart);
  });
});

describe("183 withMainScreen", () => {
  const main: Action = { type: "screen", screen: "search" };
  const body: StudioNode = {
    id: "root",
    type: "column",
    children: [
      { id: "b1", type: "button", text: "Go", action: null },
      { id: "b2", type: "button", text: "Mine", action: { type: "screen", screen: "cart" } },
      { id: "t1", type: "text", text: "Words" },
      { id: "list", type: "items", source: "products", card: { id: "card", type: "column", children: [{ id: "b3", type: "button", text: "Buy" }] } },
    ],
  };

  it("gives the page's buttons that open nothing the main screen, never a card's, and keeps the owner's", () => {
    expect([...mainScreenButtons(body)]).toEqual(["b1"]);
    const served = withMainScreen(body, main);
    const byId = new Map(allNodes({ body: served }).map((n) => [n.id, n]));
    expect(byId.get("b1")!.action).toEqual(main);
    expect(byId.get("b2")!.action).toEqual({ type: "screen", screen: "cart" });
    expect(byId.get("t1")!.action).toBeUndefined();
    expect(byId.get("b3")!.action).toBeUndefined();
    // The stored page is left as it was.
    expect(body.children![0]!.action).toBeNull();
  });
});
