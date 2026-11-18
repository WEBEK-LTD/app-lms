import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { makeFromDemo } from "@/lib/demo/start";
import { LogSender } from "@/lib/hosted/otp-sender";
import { pickableContent } from "@/lib/hosted/pages/pickable";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { publishLayout } from "@/lib/pages/layout";
import type { StudioNode, StudioPage } from "@/lib/pages/types";
import { APP_WORDS } from "@/lib/studio/app-words";
import { TEMPLATE_CLASS_WORDS, templateClassList } from "@/lib/studio/ride-classes";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

/**
 * 178 QA of the rides and taxi templates (docs/qa/2026-11-18-rides-taxi):
 * Masar Rides's and Lamha Taxi's homes, made as the owner makes them
 * (/start/rides, /start/taxi), then what the app fetches (`GET /pages`).
 */

const state: { store: MemoryStore; app: App | null } = { store: new MemoryStore(), app: null };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;

async function start(demo: "rides" | "taxi", look: "a" | "b", lang: "en" | "ar" = "en"): Promise<App> {
  const { store, client } = await setupClient({ email: `owner-${demo}-${look}-${lang}@masar.test` });
  state.store = store;
  const made = await makeFromDemo(store, { clientId: client.id, plan: null, lang }, { demo, name: demo === "rides" ? "Yol Rides" : "Yol Taksi", colour: "#0F766C", logoAssetId: null, iconAssetId: null, look }, NOW);
  state.app = made.app;
  const done = await publishLayout(store, made.app, undefined, "owner", NOW, null);
  expect(done.ok, done.ok ? "" : done.errors.join("; ")).toBe(true);
  return made.app;
}

function context(): HostedContext {
  return { store: state.store, app: state.app!, active: true, now: NOW, ip: "203.0.113.178", secret: "test-hosted-secret", sender: new LogSender(), push: false, assetUrl: ASSETS, platformUrl: "https://yallapp.test", connector: null };
}

async function fetchApp<T>(route: string, lang = "en"): Promise<T> {
  const fresh = { ...context(), app: (await state.store.getAppById(state.app!.id))! };
  const result = await handleHosted(fresh, { method: "GET", path: route.split("/").filter(Boolean), query: new URLSearchParams({ platform: "android", app_type: "rides" }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) });
  expect(result.status, route).toBe(200);
  expectContract("GET", route.startsWith("/pages/") ? "/pages/{slug}" : route, result);
  return result.body as T;
}

const home = async (lang = "en") => (await fetchApp<{ studio: StudioPage }>("/pages/home", lang)).studio;
const nodesOf = (node: StudioNode): StudioNode[] => [node, ...(node.children ?? []).flatMap(nodesOf)];
const textsOf = (n: StudioNode): string[] => nodesOf(n).flatMap((x) => (typeof x.text === "string" ? [x.text] : []));

/** The car classes' rows of a page: those the template drew (its cards) or what they became (a row whose cards open the ride). */
function classRows(studio: StudioPage): StudioNode[] {
  return nodesOf(studio.body).filter((n) => n.type === "row" && (n.children ?? []).filter((k) => k.type === "column" && k.action?.type === "screen" && k.action.screen === "ride").length >= 2);
}

/** Each card of a car classes' row: its texts. */
const cards = (row: StudioNode) => (row.children ?? []).filter((k) => k.type === "column").map(textsOf);

const CLASS_WORDS = new Set(TEMPLATE_CLASS_WORDS.flatMap((w) => (["en", "ar", "tr"] as const).map((l) => APP_WORDS[l][w])));

async function ownTypes(currency: string) {
  const id = state.app!.id;
  for (const t of await state.store.listVehicleTypes(id)) await state.store.deleteVehicleType(id, t.id, NOW);
  const base = { appId: id, description: null, icon: "directions_car", imageAssetId: null, perKmCents: 1800, perMinuteCents: 300, waitPerMinuteCents: 100, active: true };
  await state.store.createVehicleType({ ...base, name: "Sedan", seats: 4, baseCents: 4000, minCents: 12000, position: 0 }, NOW);
  await state.store.createVehicleType({ ...base, name: "Minivan", seats: 7, baseCents: 6000, minCents: 18050, position: 1 }, NOW);
  const saved = deliverySettingsOf(await state.store.getDeliverySettings(id));
  await state.store.saveDeliverySettings(id, { ...saved, currency }, NOW);
}

beforeEach(() => {
  state.app = null;
});

describe("178 the template's car classes are the company's vehicle types, at its fares and in its currency", () => {
  for (const [demo, look] of [["rides", "a"], ["rides", "b"], ["taxi", "a"], ["taxi", "b"]] as const) {
    it(`${demo} look ${look}: the owner's Sedan from ₺120 and Minivan from ₺180.50, in English, Arabic and Turkish`, async () => {
      await start(demo, look);
      const before = classRows(await home());
      expect(before.length, "the template draws its car classes").toBeGreaterThan(0);
      expect(templateClassList(before[0]!)).toBe(true);

      await ownTypes("TRY");
      for (const lang of ["en", "ar", "tr"] as const) {
        const rows = classRows(await home(lang));
        expect(rows.length, lang).toBe(before.length);
        for (const row of rows) {
          const shown = cards(row);
          expect(shown.length, lang).toBe(2);
          expect(shown[0], lang).toContain("Sedan");
          expect(shown[0], lang).toContain("120");
          expect(shown[1], lang).toContain("Minivan");
          expect(shown[1], lang).toContain("180.50");
          // The company's currency, never the template's pounds.
          const words = shown.flat();
          expect(words.some((t) => t.includes("₺")), `${lang}: ${words.join(" | ")}`).toBe(true);
          for (const t of words) {
            expect(t.includes("E£") || t.includes("ج.م"), `${lang}: ${t}`).toBe(false);
            expect(CLASS_WORDS.has(t), `${lang}: ${t}`).toBe(false);
          }
        }
      }
    });
  }

  it("with the demo's own types, in pounds, the cards stay as the template drew them; in lira, the same fares in lira", async () => {
    await start("rides", "a");
    const drawn = cards(classRows(await home())[0]!);
    expect(drawn.map((c) => c.filter((t) => /^\d+$/.test(t)))).toEqual([["4", "35"], ["4", "50"], ["7", "80"]]);
    expect(drawn[0]).toContain("from E£");
    const id = state.app!.id;
    await state.store.saveDeliverySettings(id, { ...deliverySettingsOf(await state.store.getDeliverySettings(id)), currency: "TRY" }, NOW);
    const lira = cards(classRows(await home())[0]!);
    expect(lira.map((c) => c[1] ?? "")).toEqual(drawn.map((c) => c[1] ?? ""));
    expect(lira[0]).toContain("from ₺");
    expect(lira.flat()).not.toContain("from E£");
  });

  it("Studio's canvas gets the same types to draw the cards as the app does", async () => {
    await start("taxi", "a");
    await ownTypes("TRY");
    const pickable = await pickableContent((await state.store.getAppById(state.app!.id))!, { store: state.store, key: KEY, assetUrl: ASSETS, platformUrl: "https://yallapp.test" }, NOW);
    expect(pickable.rideClasses).toEqual({ currency: "TRY", list: [expect.objectContaining({ name: "Sedan", minCents: 12000, seats: 4 }), expect.objectContaining({ name: "Minivan", minCents: 18050, seats: 7 })] });
  });

  it("the pages' version changes when the owner changes a vehicle type, so an open app asks for its pages again", async () => {
    await start("rides", "b");
    const first = (await fetchApp<{ version: string }>("/pages")).version;
    await ownTypes("EGP");
    const second = (await fetchApp<{ version: string }>("/pages")).version;
    expect(second).not.toBe(first);
  });
});

describe("178 a drawn map's words in the customer's language", () => {
  const mapsOf = (studio: StudioPage) => nodesOf(studio.body).filter((n) => n.map_drawing);
  const wordsOf = (studio: StudioPage) =>
    mapsOf(studio).flatMap((n) => {
      const d = n.map_drawing!;
      return [...(d.places ?? []).map((p) => p.label), ...(d.labels ?? []).map((l) => l.text), d.route?.to_label, d.route?.eta].filter((t): t is string => typeof t === "string");
    });

  for (const [demo, look] of [["rides", "a"], ["rides", "b"], ["taxi", "a"], ["taxi", "b"]] as const) {
    it(`${demo} look ${look}: an app made in English shows its map's places and districts in Arabic and Turkish`, async () => {
      await start(demo, look);
      const en = wordsOf(await home("en"));
      expect(en.length).toBeGreaterThan(0);
      for (const lang of ["ar", "tr"] as const) {
        const shown = wordsOf(await home(lang));
        expect(shown.length, lang).toBe(en.length);
        // Each of the template's words in the language asked for.
        const want = new Set(Object.values(APP_WORDS[lang]));
        for (const t of shown) expect(want.has(t), `${lang}: ${t}`).toBe(true);
      }
      const ar = wordsOf(await home("ar"));
      if (demo === "rides" && look === "a") expect(ar).toEqual(expect.arrayContaining([APP_WORDS.ar.rideHome, APP_WORDS.ar.rideOffice, APP_WORDS.ar.rideAirport, APP_WORDS.ar.sigZamalek]));
      // "Home" on the map is the saved place, never the Home tab's word.
      expect(ar).not.toContain(APP_WORDS.ar.tabHome);
    });
  }

  it("a word the owner wrote on the map stays as they wrote it", async () => {
    await start("rides", "a");
    const id = state.app!.id;
    const layout = (await state.store.getAppLayout(id))!;
    const own = JSON.parse(JSON.stringify(layout.published).replace('"text":"Zamalek"', '"text":"Kadıköy"'));
    await state.store.saveAppLayout({ ...layout, published: own });
    const ar = wordsOf(await home("ar"));
    expect(ar).toContain("Kadıköy");
  });
});

const MOBILE_FIXTURE = path.resolve(__dirname, "../../../../mobile/test/support/phase178_masar_pages.json");

describe("178 what the app draws", () => {
  it("is the Flutter test's fixture (mobile/test/support/phase178_masar_pages.json)", async () => {
    await start("rides", "a");
    await ownTypes("TRY");
    const served = {
      navigation: await fetchApp("/pages"),
      home: await fetchApp("/pages/home", "en"),
      home_ar: await fetchApp("/pages/home", "ar"),
      ride: await fetchApp("/pages/ride", "en"),
      rides: await fetchApp("/pages/rides", "en"),
    };
    // The elements' IDs are made at random with the project: numbered in order instead, so the file stays the same.
    const ids = new Map<string, string>();
    const stable = (key: string, value: unknown) =>
      key === "version" && typeof value === "string" ? "v178" : (key === "id" || key === "heads") && typeof value === "string" && /^n[0-9a-z]{1,8}(-[0-9a-z]+)*$/.test(value) ? (ids.get(value) ?? ids.set(value, `n${ids.size + 1}`).get(value)) : key === "updated_at" ? "2026-11-18T09:00:00.000Z" : value;
    const json = `${JSON.stringify(served, stable, 1)}\n`;
    // After a change: PHASE178_FIXTURE=1 npx vitest run tests/unit/phase178-rides-taxi.test.ts
    if (process.env.PHASE178_FIXTURE === "1" || !existsSync(MOBILE_FIXTURE)) writeFileSync(MOBILE_FIXTURE, json);
    expect(readFileSync(MOBILE_FIXTURE, "utf8"), "mobile/test/support/phase178_masar_pages.json is out of date").toBe(json);
  });
});
