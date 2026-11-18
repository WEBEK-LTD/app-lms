import { describe, expect, it } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import { currencyOfPhone, DEMO_TEMPLATE_MONEY, hintPointOf, startingCatalogSettings } from "@/lib/app/country-defaults";
import { ownContentSetup } from "@/lib/app/own-content";
import { newApp } from "@/lib/app/setup";
import { catalogSettings } from "@/lib/catalog/settings";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS } from "@/lib/data/types";
import { FLOWER_SHOP_DEMO } from "@/lib/demo/constants";
import { makeFromDemo } from "@/lib/demo/start";
import { deliveryOf } from "@/lib/selling/delivery";
import { NOW } from "./helpers";

/**
 * 175 A Moroccan shop got Turkish defaults (report #7): a new shop now
 * starts in its owner's country's currency and delivery time zone (their
 * WhatsApp number), else its template's, else the platform's; the map's
 * hint is in its city. An existing shop keeps what it saved.
 */
describe("175 a new shop's defaults from its owner's country", () => {
  it("the currency and the zone of the calling code", () => {
    expect(currencyOfPhone("+212 612 345 678")).toBe("MAD");
    expect(currencyOfPhone("+20 100 123 4567")).toBe("EGP");
    expect(currencyOfPhone("+90 544 673 1942")).toBe("TRY");
    expect(currencyOfPhone("+966 50 123 4567")).toBe("SAR");
    expect(currencyOfPhone("+1 415 555 0100")).toBeNull();
    expect(currencyOfPhone(null)).toBeNull();
    const kech = startingCatalogSettings({ whatsapp: "+212612345678" });
    expect(kech.currency).toBe("MAD");
    expect(kech.delivery?.timezone).toBe("Africa/Casablanca");
    // Unknown country: the template's, else the platform's.
    expect(startingCatalogSettings({ whatsapp: "+14155550100" }, DEMO_TEMPLATE_MONEY)).toMatchObject({ currency: "EGP", delivery: { timezone: "Africa/Cairo" } });
    expect(startingCatalogSettings(null)).toMatchObject({ currency: "TRY", delivery: { timezone: "Europe/Istanbul" } });
  });

  it("the delivery days start off, in the shop's zone, with the gift checkout's slots", () => {
    const app = { catalogSettings: startingCatalogSettings({ whatsapp: "+212612345678" }), vertical: null };
    expect(deliveryOf(app)).toBeNull();
    expect(deliveryOf(app, true)).toMatchObject({ enabled: true, timezone: "Africa/Casablanca" });
  });

  it("the map's hint in the shop's city", () => {
    expect(hintPointOf("Africa/Casablanca")).toEqual({ lat: "33.5731", lng: "-7.5898" });
    expect(hintPointOf("Africa/Cairo")).toEqual({ lat: "30.0444", lng: "31.2357" });
    expect(hintPointOf("Pacific/Auckland")).toEqual({ lat: "41.0369", lng: "28.9850" });
    expect(hintPointOf(null)).toEqual({ lat: "41.0369", lng: "28.9850" });
  });

  it("an existing shop keeps what it saved", () => {
    const app = { ...newApp("c1", null, NOW, "store", null), catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "USD" } };
    expect(ownContentSetup("catalog", app, startingCatalogSettings({ whatsapp: "+212612345678" })).catalogSettings).toEqual(app.catalogSettings);
    const fresh = newApp("c1", null, NOW, "store", null);
    expect(ownContentSetup("catalog", fresh, startingCatalogSettings({ whatsapp: "+212612345678" })).catalogSettings).toMatchObject({ currency: "MAD" });
  });

  it("a flower shop from Leqaa for an owner on +212: dirhams on Casablanca's time", { timeout: 60_000 }, async () => {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Karim Benali", email: "karim@kech.test", whatsapp: "+212 612 345 678", siteUrl: "", password: null }, NOW);
    const made = await makeFromDemo(store, { clientId: client.id, plan: null, lang: "en" }, { demo: FLOWER_SHOP_DEMO, name: "KechFlora", colour: "#9C2F52", logoAssetId: null, iconAssetId: null }, NOW);
    const app = (await store.getAppById(made.app.id))!;
    expect(catalogSettings(app).currency).toBe("MAD");
    expect(catalogSettings(app).delivery?.timezone).toBe("Africa/Casablanca");
    // An owner the calling code says nothing of: the demo's pounds and Cairo.
    const other = await registerClient(store, { name: "Sam Lee", email: "sam@shop.test", whatsapp: "+1 415 555 0100", siteUrl: "", password: null }, NOW);
    const theirs = await makeFromDemo(store, { clientId: other.client.id, plan: null, lang: "en" }, { demo: FLOWER_SHOP_DEMO, name: "Sam's Flowers", colour: "#9C2F52", logoAssetId: null, iconAssetId: null }, NOW);
    expect(catalogSettings((await store.getAppById(theirs.app.id))!)).toMatchObject({ currency: "EGP", delivery: { timezone: "Africa/Cairo" } });
  });
});
