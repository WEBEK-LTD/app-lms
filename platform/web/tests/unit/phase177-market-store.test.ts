import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { DEFAULT_HOSTED_SETTINGS } from "@/lib/data/types";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { DEFAULT_MARKET_SETTINGS } from "@/lib/market/settings";
import { derivedCountryCode, serviceCountryCode } from "@/lib/hosted/country-code";
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
