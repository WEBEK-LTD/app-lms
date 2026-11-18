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
import { withSale } from "@/lib/selling/flash-sales";
import type { StoreFlashSale } from "@/lib/data/types";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { NOW, setupClient } from "./helpers";
import { formatDateTime } from "@/components/ui";

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

  it("168 says what the day still needs in the customer's language", async () => {
    const body = { delivery_date: SATURDAY, recipient: { name: "", phone: "", ...MEDINA } };
    const en = (await quote(body)).body as { delivery_problem: { message: string } };
    expect(en.delivery_problem.message).toBe("Choose a delivery time.");
    for (const lang of ["ar", "tr"]) {
      const asked = (await quote(body, lang)).body as { delivery_problem: { code: string; message: string } };
      expect(asked.delivery_problem.message).not.toBe("Choose a delivery time.");
      expect(asked.delivery_problem.message.length).toBeGreaterThan(5);
    }
    expect(((await quote(body, "ar")).body as { delivery_problem: { message: string } }).delivery_problem.message).toMatch(/[\u0600-\u06FF]/);
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

describe("168 a flash sale on a product with sizes, and the sale's name", () => {
  const sale: StoreFlashSale = {
    id: 4,
    appId: "a",
    title: "Eid roses",
    titles: { ar: "ورود العيد", tr: "Bayram gülleri" },
    productIds: [7],
    categoryId: null,
    discount: { kind: "percent", percent: 20 },
    startsAt: new Date("2026-11-18T00:00:00Z"),
    endsAt: new Date("2026-11-21T00:00:00Z"),
    limit: 10,
    sold: 0,
    platformCode: null,
    active: true,
    createdAt: new Date("2026-11-17T00:00:00Z"),
    updatedAt: new Date("2026-11-17T00:00:00Z"),
  };
  const now = new Date("2026-11-18T12:00:00Z");
  const sized = {
    id: 7,
    price: { amount: "300.00", regular_amount: null, currency: "MAD", formatted: "MAD 300.00 – MAD 500.00", on_sale: false, range: true, max_amount: "500.00" },
  };

  it("lists a product with sizes on sale, both ends at the sale's price, its cheapest size's sale", () => {
    const out = withSale(sized, [sale], now) as { price: Record<string, unknown>; sale: Record<string, unknown> };
    expect(out.price).toMatchObject({ amount: "240.00", max_amount: "400.00", on_sale: true, range: true });
    expect(out.price.formatted).toMatch(/240\.00.*400\.00/);
    expect(out.sale).toMatchObject({ was: "300.00", now: "240.00", percent_off: 20, flash_sale_id: 4, remaining: 10, title: "Eid roses", titles: { ar: "ورود العيد", tr: "Bayram gülleri" } });
    // Not in the sale, or the sale over: as it was.
    expect((withSale({ ...sized, id: 8 }, [sale], now) as { sale: unknown }).sale).toBeNull();
    expect((withSale(sized, [sale], new Date("2026-11-22T00:00:00Z")) as { sale: unknown }).sale).toBeNull();
  });

  it("a simple product's sale carries the sale's name too; the source's own sale has none", () => {
    const simple = { id: 7, price: { amount: "450.00", regular_amount: null, currency: "MAD", formatted: "MAD 450.00", on_sale: false, range: false } };
    expect((withSale(simple, [sale], now) as { sale: Record<string, unknown> }).sale).toMatchObject({ now: "360.00", title: "Eid roses" });
    const own = { id: 9, price: { amount: "80.00", regular_amount: "100.00", currency: "MAD", formatted: "MAD 80.00", on_sale: true, range: false } };
    expect((withSale(own, [sale], now) as { sale: Record<string, unknown> }).sale).not.toHaveProperty("title");
  });
});

describe("168 the owner's order times in the shop's time zone", () => {
  const paid = new Date("2026-11-18T05:30:00Z");
  it("writes the shop's own date and time, with its offset", () => {
    // Istanbul is three hours ahead of UTC, so the date can change; Casablanca as the time zone data has it.
    expect(formatDateTime(paid, "en", "Europe/Istanbul")).toBe("18 Nov 2026, 08:30 GMT+3");
    expect(formatDateTime(new Date("2026-11-18T22:30:00Z"), "en", "Europe/Istanbul")).toBe("19 Nov 2026, 01:30 GMT+3");
    expect(formatDateTime(paid, "en", "Africa/Casablanca")).toMatch(/^18 Nov 2026, 0[56]:30 GMT(\+[01])?$/);
    expect(formatDateTime(paid, "ar", "Europe/Istanbul")).toContain("GMT+3");
    // Without a zone, or with one it doesn't know: UTC, as before.
    expect(formatDateTime(paid, "en")).toBe("18 Nov 2026, 05:30 UTC");
    expect(formatDateTime(paid, "en", "Not/AZone")).toBe("18 Nov 2026, 05:30 UTC");
  });
});

describe("168 the payment page in the customer's language", async () => {
  const { fill, payErrors, payLangOf, payMessage, payWords } = await import("@/lib/catalog/pay-words");
  const placeholders = (text: string) => [...text.matchAll(/\{([a-z]+)\}/g)].map((m) => m[1]).sort();

  it("takes the order's language: Arabic, Turkish, else English", () => {
    expect(payLangOf({ lang: "ar" })).toBe("ar");
    expect(payLangOf({ lang: "tr-TR" })).toBe("tr");
    expect(payLangOf({ lang: "fr" })).toBe("en");
    expect(payLangOf({ lang: null })).toBe("en");
    expect(payLangOf(null)).toBe("en");
  });

  it("has every word in Arabic and Turkish, with the same values to fill", () => {
    const en = payWords("en");
    for (const lang of ["ar", "tr"] as const) {
      const words = payWords(lang);
      expect(Object.keys(words).sort()).toEqual(Object.keys(en).sort());
      for (const [key, text] of Object.entries(en)) {
        const own = words[key as keyof typeof en];
        expect(own.trim().length, `${lang} ${key}`).toBeGreaterThan(0);
        expect(placeholders(own), `${lang} ${key}`).toEqual(placeholders(text));
      }
    }
    // Arabic is Arabic; Turkish isn't the English.
    expect(payWords("ar").fullName).toMatch(/[؀-ۿ]/);
    expect(payWords("tr").pay).not.toBe(payWords("en").pay);
    expect(fill(payWords("ar").pay, { total: "MAD 394.60" })).toBe("ادفع MAD 394.60");
  });

  it("answers the form's checks in the customer's language", () => {
    expect(payMessage("Enter your city.", "ar")).toBe("أدخل مدينتك.");
    expect(payMessage("Enter your city.", "tr")).toBe("Şehrinizi girin.");
    expect(payMessage("Enter your city.", "en")).toBe("Enter your city.");
    // A message it doesn't know stays as it is.
    expect(payMessage("Something new.", "ar")).toBe("Something new.");
    expect(payErrors({ name: "Enter your first and last name.", phone: "Enter a valid mobile number." }, "tr")).toEqual({ name: "Adınızı ve soyadınızı girin.", phone: "Geçerli bir cep telefonu numarası girin." });
  });
});
