import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { demoKind, type StudioDemoId } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { demoLayout } from "@/lib/demo/setup";
import { workedInCustomersApp } from "@/lib/delivery/courier-app";
import { twoAppsOf } from "@/lib/delivery/two-apps";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { randomUUID } from "node:crypto";
import type { Build } from "@/lib/data/types";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { loadLayout, publishLayout, withoutStrings } from "@/lib/pages/layout";
import { PLAN_INFO } from "@/lib/plans";
import { appWords } from "@/lib/studio/app-words";
import { makeStudioProject } from "@/lib/studio/new-project";
import { TEMPLATES } from "@/lib/studio/sections";

/**
 * 176.1 A food or delivery business's own app never shows Sofra's or Sahm's
 * restaurants and prices: the Signature looks wrote the demo's dishes with
 * their prices in Egyptian pounds ("Tomato, mozzarella and basil · EGP 140",
 * "Delivery EGP 25", "Send a parcel · from EGP 40", the band's prices) as
 * the template's own words, so a restaurant in Istanbul selling in lira told
 * its customers EGP prices of restaurants it doesn't have, in every
 * language. They are the demos' facts now: Yallapp's demo apps keep them, a
 * project from the template has words without them, and an app made before
 * is served without them.
 */

const BLOBS = mkdtempSync(join(tmpdir(), "phase176-"));
process.env.YALLAPP_BLOBS_DIR = BLOBS;
afterAll(() => rmSync(BLOBS, { recursive: true, force: true }));

const NOW = new Date("2026-11-18T10:00:00Z");
/** The demos' own: their pounds and their restaurants and street. */
const DEMO_WORDS = /EGP|ج\.م|Zamalek|الزمالك|Forno|فورنو|Sahara|صحارى|Koshary EGP|Bayt El Koshary|بيت الكشري|Abbas|عباس/;

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

/** Every text the app is sent, but a layer's name and the cards of a list (the business's own data, its removable samples). */
function texts(value: unknown, key = ""): string[] {
  if (typeof value === "string") return key === "name" ? [] : [value];
  if (Array.isArray(value)) return value.flatMap((v) => texts(v));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => (k === "items" ? [] : texts(v, k)));
  return [];
}

function contextOf(app: App): HostedContext {
  const assetUrl = (id: string) => `https://yallapp.test/a/${id}`;
  return { store, app, active: true, now: NOW, plan: PLAN_INFO.studio_1, ip: "203.0.113.9", secret: "s", sender: new LogSender(), push: false, assetUrl, platformUrl: "https://yallapp.test", connector: new CatalogConnector({ store, app, assetUrl, platformUrl: "https://yallapp.test" }) };
}

async function servedTexts(app: App, lang: string): Promise<string[]> {
  const get = (path: string) =>
    handleHosted(contextOf(app), { method: "GET", path: path.split("/").filter(Boolean), query: new URLSearchParams({ platform: "android" }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) });
  const nav = await get("/pages");
  expect(nav.status).toBe(200);
  const slugs = (nav.body as { pages: { slug: string }[] }).pages.map((p) => p.slug);
  const out: string[] = [];
  for (const slug of slugs) out.push(...texts((await get(`/pages/${slug}`)).body));
  return out;
}

/** A business's project from the template, in lira, its draft published as Studio's editor publishes it. */
async function business(kindId: "food" | "delivery", templateId: string, fromDemo: StudioDemoId | null): Promise<App> {
  const { client } = await registerClient(store, { name: "Lezzet", email: `${templateId}-${fromDemo ?? "steps"}@lezzet.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  const template = TEMPLATES.find((t) => t.id === templateId)!;
  const languages = { default: "en", available: ["en", "ar", "tr"] };
  const made = await makeStudioProject(store, { clientId: client.id, name: "Lezzet", kind: kindById(kindId)!, source: "catalog", template, words: appWords("en", "Lezzet"), lang: "en", languages, fromDemo }, NOW);
  const app = (await store.getAppById(made.id))!;
  const draft = JSON.parse(JSON.stringify(withoutStrings((await loadLayout(store, app, NOW)).draft)));
  expect((await publishLayout(store, app, draft, "owner@lezzet.test", NOW, PLAN_INFO.studio_1)).ok).toBe(true);
  return app;
}

const LOOKS = [
  ["food", "food_signature_a", "food"],
  ["food", "food_signature_b", "food"],
  ["delivery", "delivery_signature_a", "delivery"],
  ["delivery", "delivery_signature_b", "delivery"],
] as const;

describe("176.1 a business's own food or delivery app: no demo restaurants, no demo prices", () => {
  it.each(LOOKS)("%s %s, started in Studio's steps and from the demo on /start: none in English, Arabic or Turkish", async (kind, template, demo) => {
    for (const from of [null, demo]) {
      const app = await business(kind, template, from);
      for (const lang of ["en", "ar", "tr"]) {
        const shown = await servedTexts(app, lang);
        expect(shown.filter((t) => DEMO_WORDS.test(t)), `${template} from ${from ?? "steps"} in ${lang}`).toEqual([]);
        // And no bracket for the owner reaches a customer.
        expect(shown.filter((t) => /\[[^\]]*\p{L}[^\]]*\]/u.test(t)), `${template} ${lang}`).toEqual([]);
      }
    }
  });

  it("the look keeps its parts: Sofra A's hero and dishes, B's bento and band, Sahm's services and button", async () => {
    const a = await servedTexts(await business("food", "food_signature_a", "food"), "en");
    expect(a).toEqual(expect.arrayContaining(["Tonight on the grill", "Kofta, shish tawook and lamb chops", "Margherita", "Shish tawook"]));
    const b = await servedTexts(await business("food", "food_signature_b", null), "ar");
    // The grill's tile stays: its line says how it's made, not the demo's restaurant (the bento keeps its four tiles).
    expect(b).toEqual(expect.arrayContaining(["مشوي على الفحم", "مشويات مشكّلة", "كشري وفول وطعمية", "كشري\nمشويات مشكّلة\nمارجريتا\nشيش طاووق"]));
    const sahm = await servedTexts(await business("delivery", "delivery_signature_a", "delivery"), "tr");
    expect(sahm).toEqual(expect.arrayContaining(["Şimdi paket gönder", "Ekspres"]));
  });

  it.each([
    ["food", ["Tonight at Sahara Grill", "Tomato, mozzarella and basil · EGP 140", "Delivery EGP 25", "EGP 140"]],
    ["delivery", ["Send a parcel · from EGP 40", "+EGP 45"]],
  ] as const)("Yallapp's %s demo app keeps its own restaurants and prices", async (id, words) => {
    const kind = demoKind(id);
    const demo: App = { ...newApp("demo-client", null, NOW, kind.engine, kind.vertical), demo: true, section: "studio", backend: "hosted", appName: DEMO_BRANDS[id].appName, brandingDoneAt: NOW };
    const layout = await demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, demo, "banner-asset");
    const all = texts(layout.pages.map((p) => p.studio));
    expect(all).toEqual(expect.arrayContaining([...words]));
  });

  it("an app made before, its pages still holding the demo's prices, is served without them", async () => {
    const app = await business("food", "food_signature_a", null);
    const draft = JSON.parse(JSON.stringify(withoutStrings((await loadLayout(store, app, NOW)).draft)));
    // The words a project from the template had until now.
    const was: Record<string, string> = { "Tonight on the grill": "Tonight at Sahara Grill", "Kofta, shish tawook and lamb chops": "Kofta, shish tawook and lamb chops · EGP 240", "[Your first dish's price]": "EGP 140", "[Your delivery fee]": "Delivery EGP 25" };
    const back = (v: unknown): unknown => (typeof v === "string" ? (was[v] ?? v) : Array.isArray(v) ? v.map(back) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "translations" ? undefined : back(x)])) : v);
    const old = back(draft) as typeof draft;
    expect(JSON.stringify(old)).toContain("EGP 140");
    expect((await publishLayout(store, app, old, "owner@lezzet.test", NOW, PLAN_INFO.studio_1)).ok).toBe(true);
    const shown = await servedTexts(app, "en");
    expect(shown.filter((t) => DEMO_WORDS.test(t))).toEqual([]);
    expect(shown).toEqual(expect.arrayContaining(["Tonight on the grill", "Kofta, shish tawook and lamb chops"]));
  });
});

describe("176.3 Sofra's address row without the customer's area", () => {
  it("in a business's app, no \"Deliver to\" over a lone chevron: the search and the bell stay at the row's end", async () => {
    const app = await business("food", "food_signature_a", null);
    for (const lang of ["en", "ar", "tr"]) {
      const home = await handleHosted(contextOf(app), { method: "GET", path: ["pages", "home"], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) });
      type Node = { type: string; text?: string; icon?: string; width?: unknown; action?: unknown; children?: Node[] };
      const all = (n: Node): Node[] => [n, ...(n.children ?? []).flatMap(all)];
      const nodes = all((home.body as { studio: { body: Node } }).studio.body);
      expect(nodes.filter((n) => n.text === "Deliver to" || n.text === "التوصيل إلى" || n.text === "Teslimat adresi"), lang).toEqual([]);
      expect(nodes.filter((n) => n.icon === "expand_more"), lang).toEqual([]);
      const row = nodes.find((n) => n.type === "row" && (n.children ?? []).some((c) => all(c).some((x) => x.icon === "notifications")))!;
      expect(row.children!.map((c) => (c.type === "spacer" ? `spacer ${String(c.width)}` : (all(c).find((x) => x.icon)?.icon ?? c.type)))).toEqual(["spacer fill", "search", "notifications"]);
    }
  });

  it("Yallapp's demo app keeps its address: Home · Zamalek under \"Deliver to\"", async () => {
    const kind = demoKind("food");
    const demo: App = { ...newApp("demo-client", null, NOW, kind.engine, kind.vertical), demo: true, section: "studio", backend: "hosted", appName: DEMO_BRANDS.food.appName, brandingDoneAt: NOW };
    const layout = await demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, demo, "banner-asset");
    expect(texts(layout.pages.find((p) => p.slug === "home")!.studio)).toEqual(expect.arrayContaining(["Deliver to", "Home · Zamalek"]));
  });
});

describe("176.4 a new food or delivery company isn't told its couriers worked in its customers' app", () => {
  it("\"same\" is every new company's setting: the notice only once the customers' app was built", async () => {
    expect(workedInCustomersApp(DEFAULT_DELIVERY_SETTINGS, false)).toBe(false);
    expect(workedInCustomersApp(DEFAULT_DELIVERY_SETTINGS, true)).toBe(true);
    expect(workedInCustomersApp({ courierApp: "bundle" }, true)).toBe(false);
    const app = await business("food", "food_signature_a", "food");
    expect((await store.getDeliverySettings(app.id))?.courierApp ?? DEFAULT_DELIVERY_SETTINGS.courierApp).toBe("same");
    expect((await twoAppsOf(store, app, PLAN_INFO.studio_1))?.before).toBe(false);
    await store.createBuild({
      id: randomUUID(), clientId: app.clientId, appId: app.id, versionName: "1.0.0", status: "ready",
      stages: { queued: "done", android: "done", ios: "skipped", upload_play: "skipped", upload_testflight: "skipped" },
      config: {} as Build["config"], storeListing: { storeTitle: "", shortDescription: "", fullDescription: "", supportEmail: "", privacyUrl: "" },
      autoPublish: false, artifacts: [], message: null, logUrl: null, createdAt: NOW, startedAt: NOW, finishedAt: NOW, updatedAt: NOW,
    } as Omit<Build, "number" | "versionCode">);
    expect((await twoAppsOf(store, app, PLAN_INFO.studio_1))?.before).toBe(true);
  });
});
