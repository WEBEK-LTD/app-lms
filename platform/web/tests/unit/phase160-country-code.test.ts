import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App, CatalogSettings, HostedSettings } from "@/lib/data/types";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS } from "@/lib/data/types";
import { appCountryCode, callingCodeOf, countryCodeChosen, countryOfCurrency, derivedCountryCode, PLATFORM_COUNTRY_CODE, shopCountryCode } from "@/lib/hosted/country-code";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { en, ar, tr } from "@/i18n/dashboard/signin";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/**
 * 160.8 Leqaa's tester: a shop in MAD that delivers only to Morocco opened
 * its sign-in on +90. The code sign-in shows first is the owner's choice,
 * else the shop's country (where it delivers, else its currency), else the
 * owner's own country, and only then the platform's default; apps saved
 * before with the platform's +90 get the better one by themselves.
 */

const catalog = (over: Partial<CatalogSettings>): CatalogSettings => ({ ...DEFAULT_CATALOG_SETTINGS, ...over });
const hosted = (over: Partial<HostedSettings>): HostedSettings => ({ ...DEFAULT_HOSTED_SETTINGS, ...over });

describe("160.8 the app's default country code", () => {
  it("reads countries and currencies", () => {
    expect(callingCodeOf("MA")).toBe("+212");
    expect(callingCodeOf("eg")).toBe("+20");
    expect(callingCodeOf("TR")).toBe("+90");
    expect(callingCodeOf("ZZ")).toBeNull();
    expect(callingCodeOf(null)).toBeNull();
    expect(countryOfCurrency("MAD")).toBe("MA");
    expect(countryOfCurrency("egp")).toBe("EG");
    expect(countryOfCurrency("SAR")).toBe("SA");
    // Shared by many countries: no country.
    expect(countryOfCurrency("EUR")).toBeNull();
    expect(countryOfCurrency("XOF")).toBeNull();
    expect(countryOfCurrency("??")).toBeNull();
  });

  it("knows a code the owner chose from one the settings only carried", () => {
    expect(countryCodeChosen(null)).toBe(false);
    // Saved before 160: the platform's own +90 wasn't a choice, any other was.
    expect(countryCodeChosen(hosted({ defaultCountryCode: "+90" }))).toBe(false);
    expect(countryCodeChosen(hosted({ defaultCountryCode: "+20" }))).toBe(true);
    // Saved from 160: as the form said.
    expect(countryCodeChosen(hosted({ defaultCountryCode: "+90", countryCodeChosen: true }))).toBe(true);
    expect(countryCodeChosen(hosted({ defaultCountryCode: "+212", countryCodeChosen: false }))).toBe(false);
  });

  it("takes the shop's country from where it delivers, else its currency", () => {
    expect(shopCountryCode({ catalogSettings: null })).toBeNull();
    expect(shopCountryCode({ catalogSettings: catalog({ currency: "MAD", areas: [{ country: "MA", cities: null }] }) })).toBe("+212");
    // The first country it delivers to, in the owner's order.
    expect(shopCountryCode({ catalogSettings: catalog({ currency: "USD", areas: [{ country: "AE", cities: ["Dubai"] }, { country: "SA", cities: null }] }) })).toBe("+971");
    expect(shopCountryCode({ catalogSettings: catalog({ currency: "EGP" }) })).toBe("+20");
    // The platform's default currency and a shared one say nothing.
    expect(shopCountryCode({ catalogSettings: catalog({ currency: "TRY" }) })).toBeNull();
    expect(shopCountryCode({ catalogSettings: catalog({ currency: "EUR" }) })).toBeNull();
  });

  it("follows the owner's choice, then the shop, then the owner's country, then the platform", () => {
    const morocco = catalog({ currency: "MAD", areas: [{ country: "MA", cities: null }] });
    // Leqaa's tester: the settings carried +90, nobody chose it.
    expect(appCountryCode({ hostedSettings: hosted({ defaultCountryCode: "+90" }), catalogSettings: morocco }, "TR")).toEqual({ code: "+212", source: "shop" });
    expect(appCountryCode({ hostedSettings: null, catalogSettings: morocco })).toEqual({ code: "+212", source: "shop" });
    // The owner's choice wins, also +90 typed on purpose.
    expect(appCountryCode({ hostedSettings: hosted({ defaultCountryCode: "+33", countryCodeChosen: true }), catalogSettings: morocco }, "MA")).toEqual({ code: "+33", source: "chosen" });
    expect(appCountryCode({ hostedSettings: hosted({ defaultCountryCode: "+90", countryCodeChosen: true }), catalogSettings: morocco })).toEqual({ code: "+90", source: "chosen" });
    // A code set before 160 other than +90 was the owner's.
    expect(appCountryCode({ hostedSettings: hosted({ defaultCountryCode: "+20" }), catalogSettings: morocco })).toEqual({ code: "+20", source: "chosen" });
    // No shop country: the owner's own.
    expect(appCountryCode({ hostedSettings: hosted({}), catalogSettings: null }, "EG")).toEqual({ code: "+20", source: "owner" });
    // Nothing known: the platform's.
    expect(appCountryCode({ hostedSettings: null, catalogSettings: null }, null)).toEqual({ code: PLATFORM_COUNTRY_CODE, source: "platform" });
    expect(derivedCountryCode({ catalogSettings: morocco }, "EG")).toEqual({ code: "+212", source: "shop" });
  });

  it("says where it comes from on App sign-in, in the dashboard's three languages", () => {
    for (const lang of [en, ar, tr]) {
      expect(lang.countryCodeFromShop.length).toBeGreaterThan(10);
      expect(lang.countryCodeFromOwner.length).toBeGreaterThan(10);
    }
  });
});

describe("160.8 the hosted config's default country code", () => {
  let store: MemoryStore;
  let app: App;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", appName: "Leqaa", websiteDoneAt: NOW, connector: { kind: "catalog" } };
    await store.createApp(app);
  });

  async function defaultCode(over: Partial<App>, ownerCountry: string | null = null): Promise<string> {
    app = { ...app, ...over };
    await store.updateApp(app.id, over, NOW);
    const ctx: HostedContext = {
      store,
      app,
      active: true,
      now: NOW,
      ip: "203.0.113.40",
      secret: "test-hosted-secret",
      sender: new LogSender(),
      push: false,
      assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
      platformUrl: "https://yallapp.test",
      ownerCountry,
    };
    const result = await handleHosted(ctx, { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "android", app_version: "1.0.0" }), body: undefined, token: null });
    expectContract("GET", "/config", result);
    expect(result.status).toBe(200);
    return (result.body as { auth: { default_country_code: string } }).auth.default_country_code;
  }

  it("a MAD shop delivering to Morocco opens on +212, though its settings carried +90", async () => {
    const morocco = catalog({ currency: "MAD", areas: [{ country: "MA", cities: null }] });
    expect(await defaultCode({ hostedSettings: hosted({ defaultCountryCode: "+90" }), catalogSettings: morocco }, "TR")).toBe("+212");
  });

  it("the owner's choice, the owner's country, then the platform's", async () => {
    expect(await defaultCode({ hostedSettings: hosted({ defaultCountryCode: "+90", countryCodeChosen: true }), catalogSettings: catalog({ currency: "MAD" }) })).toBe("+90");
    expect(await defaultCode({ hostedSettings: hosted({ defaultCountryCode: "+90" }), catalogSettings: null }, "EG")).toBe("+20");
    expect(await defaultCode({ hostedSettings: null, catalogSettings: null }, null)).toBe("+90");
  });
});
