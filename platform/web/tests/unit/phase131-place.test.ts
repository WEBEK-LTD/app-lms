import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogSettings } from "@/lib/data/types";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/**
 * 131 Where an order goes in the standard checkout (`place`): a shop that
 * delivers to some places only, prices by city or by distance takes it at
 * checkout as the gift checkout takes the recipient's; a shop priced by
 * distance sends the map the customer pins the place on, and searches it.
 */

const KEY = Buffer.alloc(32, 7);
const FRI_11 = new Date("2026-11-20T08:00:00Z");

describe("131 the standard checkout's place", () => {
  let store: MemoryStore;
  let app: App;
  let productId = 0;

  async function shop(patch: Partial<CatalogSettings>) {
    ({ store } = await setupClient());
    clearPlatformSettingsCache();
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const fresh = newApp(client.id, null, NOW, "store");
    app = {
      ...fresh,
      backend: "hosted",
      websiteDoneAt: NOW,
      connector: { kind: "catalog" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, shippingCents: 5000, freeShippingOverCents: null, payment: encryptPaymentKeys(fresh.id, "api", "secret", true, KEY), ...patch },
    };
    await store.createApp(app);
    productId = (await store.createCatalogProduct({ appId: app.id, name: "Tulips", description: "", priceCents: 40000, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null }, NOW)).id;
  }

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now: FRI_11,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender: new LogSender(),
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: new CatalogConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" }),
  });

  async function call(method: string, route: string, options: { body?: unknown; query?: Record<string, string> } = {}): Promise<HostedResult> {
    const result = await handleHosted(context(), { method, path: route.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: null });
    expectContract(method, route, result);
    return result;
  }
  const checkout = (extra: Record<string, unknown>) => call("POST", "/store/checkout-link", { body: { lines: [{ product_id: productId, quantity: 1 }], ...extra }, query: { platform: "android" } });

  describe("a shop that delivers to some cities, priced by city", () => {
    beforeEach(() => shop({ areas: [{ country: "TR", cities: ["İstanbul", "Ankara"] }], shippingMode: "city", cityPrices: [{ country: "TR", city: "Ankara", cents: 9000 }], otherCityCents: 6000 }));

    it("goes through with the place, as the gift checkout does with the recipient's", async () => {
      expect((await checkout({})).body).toMatchObject({ code: "invalid_request", message: "Choose the country it goes to." });
      expect((await checkout({ place: { country: "TR", city: "Izmir" } })).body).toMatchObject({ code: "outside_delivery_area" });
      const ok = await checkout({ place: { country: "TR", city: "ankara" } });
      expect(ok.status).toBe(200);
      const [order] = (await store.listCatalogOrders({ appId: app.id, offset: 0, limit: 5 })).items;
      expect(order!.shippingCents).toBe(9000);
      expect(order!.delivery?.place).toMatchObject({ country: "TR", city: "ankara" });
      // An older app sent the place as the recipient's: that still works.
      expect((await checkout({ recipient: { name: "", phone: "", country: "TR", city: "İstanbul" } })).status).toBe(200);
    });

    it("prices the cart by the place once chosen", async () => {
      const before = (await call("POST", "/store/cart", { body: { lines: [{ product_id: productId, quantity: 1 }] } })).body as { shipping: string | null; total_final: boolean };
      expect(before).toMatchObject({ shipping: null, total_final: false });
      const priced = (await call("POST", "/store/cart", { body: { lines: [{ product_id: productId, quantity: 1 }], place: { country: "TR", city: "İstanbul" } } })).body as { shipping: string | null; delivery_zone: string | null };
      expect(priced).toMatchObject({ shipping: "₺60.00", delivery_zone: "İstanbul" });
    });
  });

  describe("a shop priced by distance", () => {
    beforeEach(() => shop({ shippingMode: "distance", distancePricing: { origin: { lat: 41.0082, lng: 28.9784 }, baseCents: 3000, perKmCents: 500, maxKm: 40 } }));

    it("needs the pin, and measures the distance from the shop to it", async () => {
      expect((await checkout({})).status).toBe(400);
      const ok = await checkout({ place: { lat: 40.9862, lng: 29.0256 } });
      expect(ok.status).toBe(200);
      const [order] = (await store.listCatalogOrders({ appId: app.id, offset: 0, limit: 5 })).items;
      // 30 base and ~4.4 km at 5 a km.
      expect(order!.shippingCents).toBeGreaterThan(5000);
      expect(order!.shippingCents).toBeLessThan(5500);
    });

    it("sends the map to pin the place on, starting at the shop, and searches on it", async () => {
      const without = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { store: { shipping: Record<string, unknown> } };
      expect(without.store.shipping).toMatchObject({ needs_location: true, map: { tiles_url: null, search: false }, center: { lat: 41.0082, lng: 28.9784 } });
      await store.setPlatformSetting("maps", { tilesUrl: "https://tiles.yallapp.test/{z}/{x}/{y}.png", attribution: "© OpenStreetMap contributors" }, "admin@yallapp.test", NOW);
      clearPlatformSettingsCache();
      const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { store: { shipping: Record<string, unknown> } };
      expect(config.store.shipping.map).toEqual({ tiles_url: "https://tiles.yallapp.test/{z}/{x}/{y}.png", attribution: "© OpenStreetMap contributors", search: false, routes: false });
      // The place search is the platform map's: without its search server, it says so.
      expect((await call("GET", "/maps/places", { query: { q: "Moda" } })).body).toMatchObject({ code: "feature_disabled" });
    });
  });

  it("leaves a shop without areas, by city or by distance as it was", async () => {
    await shop({});
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { store: Record<string, unknown> };
    expect(config.store.shipping).toBeUndefined();
    expect((await checkout({})).status).toBe(200);
    // No map for it (a route the app doesn't ask a shop like this one).
    expect((await handleHosted(context(), { method: "GET", path: ["maps", "places"], query: new URLSearchParams({ q: "Moda" }), body: undefined, token: null })).status).toBe(404);
  });
});
