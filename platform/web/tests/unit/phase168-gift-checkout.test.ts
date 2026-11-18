import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { cityOptionalFor, readCustomer } from "@/lib/catalog/payment";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder, type CatalogSettings } from "@/lib/data/types";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { DEFAULT_GIFTS } from "@/lib/selling/gifts";
import { breakdownJson, quoteShipping, shippingLineLabel, shippingRulesOf } from "@/lib/selling/shipping";
import { catalogSettings } from "@/lib/catalog/settings";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { NOW, setupClient } from "./helpers";

/**
 * 168 The gift checkout end to end (docs/qa/2026-11-18-gift-checkout/NOTES.md):
 * a flower shop priced by distance, with delivery times, its gift checkout's
 * quote while the day waits for its time, the breakdown in the customer's
 * language, and the payment page that doesn't ask again for a city the
 * order never had.
 */

const KEY = Buffer.alloc(32, 7);
const FRI_11 = new Date("2026-11-20T08:00:00Z");
const SATURDAY = "2026-11-21";
const MEDINA = { lat: 31.6258, lng: -7.9891 };

describe("168 the gift checkout's quote and payment", () => {
  let store: MemoryStore;
  let app: App;
  let productId = 0;

  async function shop(patch: Partial<CatalogSettings> = {}) {
    ({ store } = await setupClient());
    clearPlatformSettingsCache();
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const fresh = newApp(client.id, null, NOW, "store");
    app = {
      ...fresh,
      backend: "hosted",
      websiteDoneAt: NOW,
      connector: { kind: "catalog" },
      catalogSettings: {
        ...DEFAULT_CATALOG_SETTINGS,
        currency: "MAD",
        shippingCents: 0,
        freeShippingOverCents: null,
        payment: encryptPaymentKeys(fresh.id, "api", "secret", true, KEY),
        gifts: { ...DEFAULT_GIFTS, checkout: "gift", message: true, recipient: true, anonymous: true },
        shippingMode: "distance",
        distancePricing: { origin: { lat: 31.6295, lng: -7.9811 }, baseCents: 2000, perKmCents: 400, maxKm: 30 },
        ...patch,
      },
    };
    await store.createApp(app);
    productId = (await store.createCatalogProduct({ appId: app.id, name: "Marrakech Red Roses", description: "", priceCents: 45000, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null }, NOW)).id;
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

  async function quote(body: Record<string, unknown>, lang?: string): Promise<HostedResult> {
    const headers = new Headers(lang ? { "accept-language": lang } : {});
    return handleHosted(context(), { method: "POST", path: ["store", "cart"], query: new URLSearchParams(), body: { lines: [{ product_id: productId, quantity: 1 }], ...body }, token: null, headers });
  }

  beforeEach(() => shop());

  it("keeps the place's shipping while the chosen day waits for its time", async () => {
    const placed = (await quote({ recipient: { name: "", phone: "", ...MEDINA } })).body as { shipping: string | null; total: string };
    expect(placed.shipping).not.toBeNull();
    // The day chosen, no time yet: the pin's shipping stays and the quote says what's missing.
    const waiting = (await quote({ delivery_date: SATURDAY, recipient: { name: "", phone: "", ...MEDINA } })).body as { shipping: string | null; total: string; delivery_problem: { message: string } | null };
    expect(waiting.shipping).toBe(placed.shipping);
    expect(waiting.total).toBe(placed.total);
    expect(waiting.delivery_problem?.message).toBe("Choose a delivery time.");
    // With its time, the slot's fee on top (the default evening slot has none: the same shipping).
    const timed = (await quote({ delivery_date: SATURDAY, delivery_slot: "s1", recipient: { name: "", phone: "", ...MEDINA } })).body as { shipping: string | null; delivery_problem: unknown };
    expect(timed.delivery_problem).toBeNull();
    expect(timed.shipping).toBe(placed.shipping);
  });

  it("writes the shipping breakdown in the customer's language, the owner's English kept", async () => {
    const rules = shippingRulesOf(catalogSettings(app));
    const quoted = quoteShipping(rules, { subtotalCents: 45000, physical: true, place: { country: null, city: null, ...MEDINA } });
    if (!quoted.ok) throw new Error(quoted.message);
    expect(quoted.breakdown.map((l) => l.label)).toEqual(["Base fee", expect.stringMatching(/^\d+(\.\d)? km$/)]);
    expect(breakdownJson(quoted.breakdown, "MAD", "ar").map((l) => l.label)).toEqual(["الرسوم الأساسية", expect.stringMatching(/^\d+(\.\d)? كم$/)]);
    expect(breakdownJson(quoted.breakdown, "MAD", "tr")[0]!.label).toBe("Sabit ücret");
    expect(breakdownJson(quoted.breakdown, "MAD", "en")[0]!.label).toBe("Base fee");
    // A line without words (a city's own price, a slot) keeps its label.
    expect(shippingLineLabel({ label: "Gueliz" }, "ar")).toBe("Gueliz");
    expect(shippingLineLabel({ label: "2.5 kg (1 kg included)", words: { kind: "kg", grams: 2500, includedKg: 1 } }, "ar")).toBe("2.5 كغ (يشمل 1 كغ)");
    expect(shippingLineLabel({ label: "Minimum fee", words: { kind: "minimum" } }, "tr")).toBe("Asgari ücret");
  });

  it("the cart's quote reads the language the app sends", async () => {
    const ar = (await quote({ delivery_date: SATURDAY, delivery_slot: "s1", recipient: { name: "", phone: "", ...MEDINA } }, "ar")).body as { shipping_breakdown: { label: string }[] };
    expect(ar.shipping_breakdown[0]!.label).toBe("الرسوم الأساسية");
  });

  it("doesn't ask the payment page for a city the gift's order never had", () => {
    const values = { name: "Salma Bennani", phone: "+212600000168", email: "salma@example.com", city: "", address: "Riad Laarous, Derb Sidi Bouloukat 12, Medina" };
    const gift = { delivery: { date: SATURDAY, slot: null, feeCents: 0, sender: null, recipient: { name: "Amina", phone: "+212611223344", address: values.address }, message: null, anonymous: false, place: { country: null, city: null, ...MEDINA }, shipping: null } } as unknown as Pick<CatalogOrder, "delivery">;
    expect(cityOptionalFor(gift)).toBe(true);
    const checked = readCustomer(app, values, { cityOptional: cityOptionalFor(gift) });
    expect(checked.ok).toBe(true);
    // Without a place: the city is asked, as before.
    expect(cityOptionalFor({ delivery: null } as unknown as Pick<CatalogOrder, "delivery">)).toBe(false);
    expect(readCustomer(app, values)).toMatchObject({ ok: false, errors: { city: "Enter your city." } });
    // A place that has its city: the city is asked (and comes filled in).
    expect(cityOptionalFor({ delivery: { ...gift.delivery!, place: { country: "MA", city: "Marrakech", lat: null, lng: null } } } as Pick<CatalogOrder, "delivery">)).toBe(false);
    // One letter typed is still too short.
    expect(readCustomer(app, { ...values, city: "M" }, { cityOptional: true })).toMatchObject({ ok: false });
  });
});
