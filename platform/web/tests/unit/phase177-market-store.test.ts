import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { DEFAULT_HOSTED_SETTINGS } from "@/lib/data/types";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { DEFAULT_MARKET_SETTINGS } from "@/lib/market/settings";
import { derivedCountryCode, serviceCountryCode } from "@/lib/hosted/country-code";
import { FoodConnector } from "@/lib/hosted/connectors/food";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { publishLayout, servedLayout } from "@/lib/pages/layout";
import { itemSourcesFor } from "@/lib/pages/sources";
import { appWords } from "@/lib/studio/app-words";
import { TEMPLATES, type SectionContext } from "@/lib/studio/sections";
import { startLayout } from "@/lib/studio/start";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/**
 * 177 QA of the marketplace (Zad) and the classic store
 * (docs/qa/2026-11-18-market-store/NOTES.md).
 */

const marketplace = { vertical: "marketplace" as const, connector: { kind: "restaurants" as const } };

describe("177.1 a marketplace's sign-in opens on its own country's code", () => {
  it("takes the marketplace's country, else its delivery currency's", () => {
    const saudi = { ...DEFAULT_DELIVERY_SETTINGS, currency: "SAR", marketApp: { ...DEFAULT_MARKET_SETTINGS, country: "SA" } };
    expect(serviceCountryCode(marketplace, saudi)).toBe("+966");
    // Food delivery (the same engine, no marketplace): the currency's country.
    expect(serviceCountryCode({ vertical: null, connector: { kind: "restaurants" } }, { ...DEFAULT_DELIVERY_SETTINGS, currency: "MAD" })).toBe("+212");
    // Nothing saved: nothing to go by.
    expect(serviceCountryCode(marketplace, null)).toBeNull();
    expect(derivedCountryCode({ catalogSettings: null, ...marketplace }, "TR", saudi)).toEqual({ code: "+966", source: "shop" });
    // Without settings, the owner's country, as before.
    expect(derivedCountryCode({ catalogSettings: null, ...marketplace }, "TR", null)).toEqual({ code: "+90", source: "owner" });
  });

  describe("the hosted config", () => {
    let store: MemoryStore;
    let app: App;

    beforeEach(async () => {
      ({ store } = await setupClient());
      const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
      app = { ...newApp(client.id, null, NOW, "food"), backend: "hosted", appName: "Souq Nour", websiteDoneAt: NOW, ...marketplace, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS } };
      await store.createApp(app);
    });

    it("an Egyptian marketplace (Zad's settings) opens on +20, not the platform's +90", async () => {
      await store.saveDeliverySettings(app.id, { ...DEFAULT_DELIVERY_SETTINGS, marketApp: { ...DEFAULT_MARKET_SETTINGS, country: "EG" } }, NOW);
      const ctx: HostedContext = {
        store,
        app,
        active: true,
        now: NOW,
        ip: "203.0.113.177",
        secret: "test-hosted-secret",
        sender: new LogSender(),
        push: false,
        assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
        platformUrl: "https://yallapp.test",
        ownerCountry: null,
      };
      const result = await handleHosted(ctx, { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "android", app_version: "1.0.0" }), body: undefined, token: null });
      expectContract("GET", "/config", result);
      expect((result.body as { auth: { default_country_code: string } }).auth.default_country_code).toBe("+20");
    });
  });
});

describe("177.2 Zad's posters don't tell customers a code the marketplace doesn't have", () => {
  let store: MemoryStore;
  let app: App;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = { ...newApp(client.id, null, NOW, "food"), backend: "hosted", appName: "Souq Nour", websiteDoneAt: NOW, ...marketplace };
    await store.createApp(app);
  });

  const publish = async (look: "a") => {
    let n = 0;
    const made: SectionContext = { brand: app.primaryColor, source: itemSourcesFor(app)[0] ?? null, app: app.appName!, lang: "en", w: appWords("en", app.appName!), picture: (f) => `https://yallapp.test/design-pictures/${f}`, newId: () => `zd-${++n}`, kind: { type: app.appType, vertical: "marketplace" } };
    const template = TEMPLATES.find((t) => t.id === `marketplace_signature_${look}`)!;
    const layout = startLayout(app, template, defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), NOW, made);
    expect(JSON.stringify(layout)).toContain("FRESH15");
    expect(JSON.stringify(layout)).toContain("ZAD20");
    const published = await publishLayout(store, app, layout, "owner@souq.test", NOW);
    expect(published.ok ? [] : published.errors).toEqual([]);
  };
  const coupon = (code: string, active = true) =>
    store.createMarketCoupon({ appId: app.id, code, title: code, kind: "percent", value: 15, maxDiscount: null, minOrder: 100_00, currency: "EGP", paidBy: "owner", firstOrderOnly: false, vendorIds: [], vendorKinds: [], departmentIds: [], usesLimit: null, perUserLimit: null, startsAt: null, endsAt: null, active, createdAt: NOW, updatedAt: NOW });

  it("look A: a template code goes with its chip until the marketplace has the coupon", async () => {
    await publish("a");
    const before = JSON.stringify(await servedLayout(store, app));
    expect(before).not.toContain("FRESH15");
    expect(before).not.toContain("ZAD20");
    // The offer's own words stay (the owner edits them in Studio); only the code and its minimum go.
    expect(before).toContain("Fruit & veg");
    await coupon("FRESH15");
    await coupon("ZAD20", false);
    const after = JSON.stringify(await servedLayout(store, app));
    expect(after).toContain("FRESH15");
    // A paused coupon is no code to type.
    expect(after).not.toContain("ZAD20");
  });

  it("Yallapp's own Zad demo keeps its codes", async () => {
    app = { ...app, demo: true };
    await store.updateApp(app.id, { demo: true }, NOW);
    await publish("a");
    expect(JSON.stringify(await servedLayout(store, app))).toContain("FRESH15");
  });
});

describe("177.3 the marketplace's checkout and orders in the customer's language", () => {
  let store: MemoryStore;
  let app: App;
  let grocery = 0;
  let apples = 0;
  let sender: LogSender;
  let now = NOW;
  const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "food");
    app = { ...base, backend: "hosted", appName: "Souq Nour", websiteDoneAt: NOW, ...marketplace, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, defaultCountryCode: "+20" } };
    await store.createApp(app);
    await store.saveDeliverySettings(app.id, { ...DEFAULT_DELIVERY_SETTINGS, currency: "EGP", cash: true, timezone: "Africa/Cairo", marketApp: { ...DEFAULT_MARKET_SETTINGS, requirePhotos: false } }, NOW);
    const everyDay = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((day) => ({ day, opens: "00:00", closes: "23:59" }));
    grocery = (
      await store.createRestaurant(
        {
          appId: app.id,
          name: "Zad Market",
          description: null,
          logoAssetId: null,
          coverAssetId: null,
          cuisines: [],
          address: { address: "Mohandessin, Giza", details: null, lat: 30.05, lng: 31.2 },
          phone: "+20225775935",
          hours: everyDay,
          prepMinutes: 20,
          minOrderCents: 50_00,
          maxKm: null,
          commissionBp: 1000,
          active: true,
          position: 1,
          kind: "grocery",
          delivery: { by: "app", feeKind: "fixed", fee: 0, perKm: 0, freeOver: null, minItems: null, maxItems: null, pickup: true, scheduling: false },
        },
        { sections: [], nextId: 1 },
        NOW,
      )
    ).id;
    const made = await store.createMarketProduct(
      { appId: app.id, vendorId: grocery, departmentId: null, aisleId: null, name: "Red apples", description: null, brand: null, sku: "apples", barcode: null, imageAssetId: null, imageUrl: null, price: 90_00, wasPrice: 110_00, unit: "kg", step: 0.5, maxQuantity: null, stock: null, inStock: true, tags: [], position: 1 },
      NOW,
    );
    if (!made.ok) throw new Error("product");
    apples = made.product.id;
    sender = new LogSender();
    now = NOW;
  });

  const call = async (method: string, route: string, options: { token?: string; body?: unknown; lang?: string; query?: Record<string, string> } = {}) => {
    const ctx: HostedContext = {
      store,
      app,
      active: true,
      now,
      ip: "203.0.113.177",
      secret: "test-hosted-secret",
      sender,
      push: false,
      assetUrl: ASSETS,
      platformUrl: "https://yallapp.test",
      connector: new FoodConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test", food: true }),
    };
    const result = await handleHosted(ctx, { method, path: route.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null, headers: new Headers(options.lang ? { "accept-language": options.lang } : {}) });
    expectContract(method, route.replace(/\/\d+$/, "/{order_id}"), result);
    return result;
  };

  const customer = async () => {
    now = new Date(now.getTime() + 61_000);
    const device = { id: "install-177", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone: "1005550177" } });
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: (requested.body as { request_id: string }).request_id, code: sender.sent.get("+201005550177")!, device } });
    const registered = await call("POST", "/auth/register", { body: { signup_token: (verified.body as { signup_token: string }).signup_token, name: "Omar Fathy", device } });
    return (registered.body as { access_token: string }).access_token;
  };

  it("the price lines, the weighing note and a refused code in Arabic and Turkish; English as before", async () => {
    const token = await customer();
    const cart = { vendor_id: grocery, lines: [{ product_id: apples, quantity: 1 }], fulfilment: "pickup", coupon_code: "FRESH15" };
    type Quote = { price: { kind: string; label: string }[]; warnings: string[]; quote_id: string };
    const en = (await call("POST", "/market/quote", { token, body: cart })).body as Quote;
    expect(en.price.map((l) => l.label)).toEqual(["Items", "Discounts", "Total"]);
    expect(en.warnings).toEqual(["Items sold by weight are weighed when picked: the price can change a little, never by more than 10%.", "This code isn't valid."]);
    const ar = (await call("POST", "/market/quote", { token, body: cart, lang: "ar" })).body as Quote;
    expect(ar.price.map((l) => l.label)).toEqual(["المنتجات", "الخصومات", "الإجمالي"]);
    expect(ar.warnings).toEqual(["تُوزن المنتجات المبيعة بالوزن عند تجهيزها: قد يتغير السعر قليلًا، ولا يزيد التغيّر على 10%.", "هذا الرمز غير صالح."]);
    const tr = (await call("POST", "/market/quote", { token, body: cart, lang: "tr" })).body as Quote;
    expect(tr.price.map((l) => l.label)).toEqual(["Ürünler", "İndirimler", "Toplam"]);
    expect(tr.warnings[1]).toBe("Bu kod geçerli değil.");
    // The order the customer opens, in their language too.
    const placed = await call("POST", "/market/orders", { token, query: { platform: "android" }, lang: "ar", body: { ...cart, coupon_code: undefined, quote_id: (await call("POST", "/market/quote", { token, body: { ...cart, coupon_code: undefined } })).body && ((await call("POST", "/market/quote", { token, body: { ...cart, coupon_code: undefined } })).body as Quote).quote_id, payment: "cash" } });
    expect(placed.status, JSON.stringify(placed.body)).toBe(201);
    expect((placed.body as { order: { price: { label: string }[] } }).order.price.map((l) => l.label)).toEqual(["المنتجات", "الخصومات", "الإجمالي"]);
  });

  it("a refusal in Turkish: under the place's smallest order", async () => {
    const token = await customer();
    const small = await call("POST", "/market/quote", { token, lang: "tr", body: { vendor_id: grocery, lines: [{ product_id: apples, quantity: 0.5 }], fulfilment: "pickup" } });
    expect(small.status).toBe(409);
    expect((small.body as { message: string }).message).toBe("Bu işletmenin en düşük sipariş tutarına ulaşmak için biraz daha ekleyin.");
  });
});
