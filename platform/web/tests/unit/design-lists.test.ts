import { describe, expect, it } from "vitest";
import { ENGINES, KINDS } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App, AppType, AppVertical, DeliverySettings, RestaurantInput, VehicleTypeInput } from "@/lib/data/types";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { connectorFor } from "@/lib/hosted/connectors";
import { itemResolver } from "@/lib/hosted/pages/items";
import "@/lib/hosted/pages/sources";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { BUILT_IN_APP_DEFAULTS } from "@/lib/pages/defaults";
import { designById, DESIGNS } from "@/lib/pages/designs";
import { designLayout, publishLayout } from "@/lib/pages/layout";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

/** 110 The lists the ready-made designs show are served: a food app's restaurants, a ride or taxi app's vehicle types. */

const EVERY_DAY = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((day) => ({ day, opens: "00:00", closes: "23:59" }));
const NEVER = [] as RestaurantInput["hours"];
const SETTINGS: DeliverySettings = {
  ...DEFAULT_DELIVERY_SETTINGS,
  currency: "EGP",
  cuisines: [
    { id: "egyptian", name: "Egyptian" },
    { id: "grill", name: "Grill" },
  ],
  timezone: "Africa/Cairo",
};

const restaurant = (appId: string, patch: Partial<RestaurantInput> = {}): RestaurantInput => ({
  appId,
  name: "Abou Tarek",
  description: "Koshari since 1950",
  logoAssetId: "logo-1",
  coverAssetId: null,
  cuisines: ["egyptian"],
  address: { address: "Tahrir Square, Cairo", details: null, lat: 30.0444, lng: 31.2357 },
  phone: "+20225775935",
  hours: EVERY_DAY,
  prepMinutes: 20,
  minOrderCents: 60_00,
  maxKm: null,
  commissionBp: 1250,
  active: true,
  position: 1,
  ...patch,
});

const vehicle = (appId: string, patch: Partial<VehicleTypeInput> = {}): VehicleTypeInput => ({
  appId,
  name: "Economy",
  description: "Everyday rides",
  icon: "directions_car",
  imageAssetId: "car-1",
  seats: 4,
  baseCents: 15_00,
  perKmCents: 6_00,
  perMinuteCents: 1_00,
  minCents: 25_00,
  waitPerMinuteCents: 2_00,
  position: 1,
  active: true,
  ...patch,
});

describe("110 the designs' lists", () => {
  it("every list a design shows has a source the hosted API serves", () => {
    for (const design of DESIGNS) {
      const kind = KINDS.find((k) => k.id === design.kind)!;
      const engine = ENGINES[kind.engine].pages;
      for (const page of design.pages) {
        for (const block of page.blocks) {
          if (block.type !== "items") continue;
          // The engine's own list comes from its connector; every other list from a registered source.
          const fromConnector = engine.read !== null && block.source === engine.source;
          expect(fromConnector || itemResolver(block.source!) !== null, `${design.id} ${block.id} (${block.source})`).toBe(true);
        }
      }
    }
  });

  describe("on a hosted app", () => {
    let store: MemoryStore;
    let app: App;

    async function setUp(appType: AppType, vertical: AppVertical | null, connector: string) {
      ({ store } = await setupClient());
      const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
      app = { ...newApp(client.id, null, NOW, appType, vertical), backend: "hosted", appName: "Nile", connector: { kind: connector } as App["connector"] };
      await store.createApp(app);
      await store.saveDeliverySettings(app.id, SETTINGS, NOW);
    }

    async function home(designId: string): Promise<Record<string, unknown>[]> {
      const layout = designLayout(app, designById(designId)!, { appearance: { ...BUILT_IN_APP_DEFAULTS.appearance, secondary_color: null }, languages: { default: "en", available: ["en"] } }, NOW);
      const published = await publishLayout(store, app, layout, "owner@nile.test", NOW);
      expect(published.ok ? [] : published.errors).toEqual([]);
      const ctx: HostedContext = {
        store,
        app,
        active: true,
        now: NOW,
        ip: "203.0.113.9",
        secret: "test-hosted-secret",
        sender: new LogSender(),
        push: false,
        assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
        platformUrl: "https://yallapp.test",
        connector: connectorFor(app, KEY, { store, assetUrl: (id) => id, platformUrl: "https://yallapp.test", food: true, rides: true }),
      };
      const result = await handleHosted(ctx, { method: "GET", path: ["pages", "home"], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null, headers: new Headers({ "accept-language": "en" }) });
      expectContract("GET", "/pages/{slug}", result);
      return (result.body as { blocks: Record<string, unknown>[] }).blocks;
    }

    const items = (blocks: Record<string, unknown>[], source: string) => blocks.find((b) => b.type === "items" && b.source === source)?.items as Record<string, unknown>[] | undefined;

    it("serves a food app's restaurants: open ones first, then in the company's order, without hidden ones", async () => {
      await setUp("food", null, "restaurants");
      const abou = await store.createRestaurant(restaurant(app.id, { position: 2 }), { sections: [], nextId: 1 }, NOW);
      await store.createRestaurant(restaurant(app.id, { name: "Night Grill", cuisines: ["grill", "egyptian"], hours: NEVER, position: 0, coverAssetId: "cover-2" }), { sections: [], nextId: 1 }, NOW);
      await store.createRestaurant(restaurant(app.id, { name: "Hidden", active: false, position: 1 }), { sections: [], nextId: 1 }, NOW);
      await store.updateRestaurant(app.id, abou.id, { ratingSum: 9, ratingCount: 2 }, NOW);
      for (const id of ["food-city", "food-express", "food-neighbourhood"]) {
        const list = items(await home(id), "restaurants");
        expect(list, id).toBeDefined();
        expect(list!.map((i) => i.title)).toEqual(["Abou Tarek", "Night Grill"]);
        expect(list![0]).toMatchObject({ source: "restaurants", id: String(abou.id), subtitle: "Egyptian", badge: "★ 4.5", action: { type: "item", item: { source: "restaurants", id: String(abou.id) } } });
        expect(list![0]!.image_url).toMatch(/\/logo-1$/);
        expect(list![1]).toMatchObject({ subtitle: "Grill · Egyptian", badge: null });
        expect(list![1]!.image_url).toMatch(/\/cover-2$/);
      }
    });

    it("serves a ride or taxi app's vehicle types riders may choose, in the company's order", async () => {
      for (const [vertical, designs] of [
        [null, ["rides-city", "rides-quick", "rides-comfort"]],
        ["taxi", ["taxi-live", "taxi-city", "taxi-night"]],
      ] as const) {
        await setUp("rides", vertical, "rides");
        await store.createVehicleType(vehicle(app.id, { name: "Comfort", position: 2, imageAssetId: null, description: null }), NOW);
        const economy = await store.createVehicleType(vehicle(app.id), NOW);
        await store.createVehicleType(vehicle(app.id, { name: "No fares yet", baseCents: 0, perKmCents: 0, perMinuteCents: 0, minCents: 0, position: 0 }), NOW);
        await store.createVehicleType(vehicle(app.id, { name: "Hidden", active: false, position: 0 }), NOW);
        for (const id of designs) {
          const list = items(await home(id), "vehicle_types");
          expect(list, id).toBeDefined();
          expect(list!.map((i) => i.title)).toEqual(["Economy", "Comfort"]);
          expect(list![0]).toMatchObject({ source: "vehicle_types", id: String(economy.id), subtitle: "Everyday rides", action: { type: "item", item: { source: "vehicle_types", id: String(economy.id) } } });
          expect(list![0]!.image_url).toMatch(/\/car-1$/);
          expect(list![1]).toMatchObject({ subtitle: null, image_url: null });
        }
      }
    });

    it("leaves the list out while there's nothing to show", async () => {
      await setUp("food", null, "restaurants");
      expect(items(await home("food-city"), "restaurants")).toBeUndefined();
    });
  });
});
