import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { encryptOwnPayment } from "@/lib/catalog/settings";
import type { App, CatalogSettings } from "@/lib/data/types";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { handleHosted, type HostedContext, type HostedRequest } from "@/lib/hosted/service";
import { customerCurrencyAllowed, customerCurrencyConfigJson, customerCurrencyRule } from "@/lib/money/display";
import { ratesOf, type Rates } from "@/lib/money/rates";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

/**
 * 149 Prices in the customer's currency, per app: the owner's switch (on
 * by default) and the list of currencies allowed (empty: any). The hosted
 * API is the rule's source: no `display`, no charge and no `/currencies`
 * entry outside it, whatever the app sends; the config tells the app.
 */

const RATES: Rates = ratesOf({ rates: { USD: 1, EGP: 48.5, KWD: 0.306, JPY: 151.2, EUR: 0.92 }, date: "2026-10-12", fetchedAt: NOW.toISOString(), source: "ExchangeRate-API" }, null);

async function shop(settings: Partial<CatalogSettings> = {}) {
  const { store, client } = await setupClient({ plan: "growth" });
  clearPlatformSettingsCache();
  await store.setPlatformSetting("exchangeRates", { rates: RATES.perDollar, date: "2026-10-12", fetchedAt: NOW.toISOString(), source: "ExchangeRate-API" }, "daily job", NOW);
  const draft: App = {
    ...newApp(client.id, null, NOW, "store"),
    backend: "hosted",
    appName: "Nile Bakes",
    websiteDoneAt: NOW,
    connector: { kind: "catalog" },
    catalogSettings: { currency: "EGP", shippingCents: 0, freeShippingOverCents: null, payment: null, ...settings },
  };
  await store.createApp(draft);
  await store.updateApp(draft.id, { catalogSettings: { ...draft.catalogSettings!, payment: encryptOwnPayment(draft.id, { provider: "stripe", secretKey: "sk_test_51Abcdefghijklmnop", sandbox: true }, KEY) } }, NOW);
  const app = (await store.getAppById(draft.id))!;
  const product = await store.createCatalogProduct(
    { appId: app.id, name: "Basbousa tray", description: "", priceCents: 60000, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null },
    NOW,
  );
  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now: NOW,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender: { send: async () => undefined } as unknown as HostedContext["sender"],
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: new CatalogConnector({ store, app, assetUrl: (id) => id, platformUrl: "https://yallapp.test" }),
  });
  const call = (method: string, path: string, { currency, query = "", body }: { currency?: string; query?: string; body?: unknown } = {}) =>
    handleHosted(context(), {
      method,
      path: path.split("/").filter(Boolean),
      query: new URLSearchParams(query),
      body,
      token: null,
      headers: new Headers(currency ? { "x-currency": currency } : {}),
    } as HostedRequest);
  const lines = [{ product_id: product.id, quantity: 1 }];
  return { store, app, call, lines };
}

const priceOf = (body: unknown) => (body as { items: { price: Record<string, unknown> }[] }).items[0]!.price;
const codesOf = (body: unknown) => (body as { items: { code: string }[] }).items.map((i) => i.code);

describe("149 the rule", () => {
  it("is on, for any currency, until the owner saves one; the shop's own is always allowed", () => {
    expect(customerCurrencyRule(null)).toEqual({ enabled: true, currencies: [] });
    expect(customerCurrencyRule({})).toEqual({ enabled: true, currencies: [] });
    const list = customerCurrencyRule({ showInCustomerCurrency: true, customerCurrencies: ["USD", "KWD", "USD", "kwd", "XAU"] });
    expect(list).toEqual({ enabled: true, currencies: ["USD", "KWD"] });
    expect(customerCurrencyAllowed(list, "USD")).toBe(true);
    expect(customerCurrencyAllowed(list, "JPY")).toBe(false);
    expect(customerCurrencyAllowed(list, "EGP", "EGP")).toBe(true);
    const off = customerCurrencyRule({ showInCustomerCurrency: false, customerCurrencies: ["USD"] });
    expect(customerCurrencyAllowed(off, "USD")).toBe(false);
    expect(customerCurrencyAllowed(off, "EGP", "EGP")).toBe(true);
    // The list is kept while off, but the app is told none.
    expect(customerCurrencyConfigJson(off)).toEqual({ enabled: false, currencies: [] });
  });
});

describe("149 a shop in Egyptian pounds", () => {
  it("as before 149 by default: prices in any currency, every currency listed, and the config says so", async () => {
    const { call } = await shop();
    expect(priceOf((await call("GET", "/store/products", { currency: "JPY" })).body)).toHaveProperty("display.currency", "JPY");
    expect(codesOf((await call("GET", "/currencies")).body)).toEqual(expect.arrayContaining(["EGP", "USD", "KWD", "JPY", "EUR"]));
    const config = await call("GET", "/config", { query: "platform=android&app_version=1.0.0" });
    expectContract("GET", "/config", config);
    expect(config.body).toMatchObject({ customer_currency: { enabled: true, currencies: [] } });
  });

  it("switched off: no display for any currency, nothing charged in it, the shop's currency alone listed", async () => {
    const { store, app, call, lines } = await shop({ showInCustomerCurrency: false, chargeInCustomerCurrency: true, customerCurrencies: ["USD"] });
    const plain = await call("GET", "/store/products");
    const usd = await call("GET", "/store/products", { currency: "USD" });
    expectContract("GET", "/store/products", usd);
    // Exactly as for an app that asked for none.
    expect(usd.body).toEqual(plain.body);
    expect(priceOf(usd.body)).not.toHaveProperty("display");
    const cart = await call("POST", "/store/cart", { currency: "USD", body: { lines } });
    expectContract("POST", "/store/cart", cart);
    expect(cart.body).not.toHaveProperty("display");
    expect(cart.body).toMatchObject({ charge: { currency: "EGP", in_customer_currency: false, reason: null } });
    const link = await call("POST", "/store/checkout-link", { currency: "USD", query: "platform=android", body: { lines } });
    expectContract("POST", "/store/checkout-link", link);
    expect(link.body).toMatchObject({ charge: { currency: "EGP", in_customer_currency: false } });
    const order = (await store.listCatalogOrders({ appId: app.id, limit: 5, offset: 0 })).items[0]!;
    expect(order.customerCurrency ?? null).toBeNull();
    const list = await call("GET", "/currencies", { currency: "USD" });
    expectContract("GET", "/currencies", list);
    expect(codesOf(list.body)).toEqual(["EGP"]);
    const config = await call("GET", "/config", { query: "platform=ios&app_version=1.0.0" });
    expectContract("GET", "/config", config);
    expect(config.body).toMatchObject({ customer_currency: { enabled: false, currencies: [] } });
  });

  it("only some currencies: shown and charged in those, the others answered as none, the list the shop's first then those", async () => {
    const { store, app, call, lines } = await shop({ chargeInCustomerCurrency: true, customerCurrencies: ["USD", "JPY"] });
    expect(priceOf((await call("GET", "/store/products", { currency: "USD" })).body)).toMatchObject({ display: { currency: "USD", formatted: "$12.37" } });
    const plain = await call("GET", "/store/products");
    const kwd = await call("GET", "/store/products", { currency: "KWD" });
    expect(kwd.body).toEqual(plain.body);
    // ?currency= follows the same rule as the header.
    expect(priceOf((await call("GET", "/store/products", { query: "currency=KWD" })).body)).not.toHaveProperty("display");

    // 135.7 Charged in dollars (Stripe takes them); never in dinars, not in the list.
    const dollars = await call("POST", "/store/checkout-link", { currency: "USD", query: "platform=android", body: { lines } });
    expect(dollars.body).toMatchObject({ charge: { currency: "USD", in_customer_currency: true } });
    const dinars = await call("POST", "/store/checkout-link", { currency: "KWD", query: "platform=android", body: { lines } });
    expectContract("POST", "/store/checkout-link", dinars);
    expect(dinars.body).toMatchObject({ charge: { currency: "EGP", total: "E£600.00", in_customer_currency: false, reason: null } });
    const cart = await call("POST", "/store/cart", { currency: "KWD", body: { lines } });
    expect(cart.body).not.toHaveProperty("display");
    const [last, first] = (await store.listCatalogOrders({ appId: app.id, limit: 5, offset: 0 })).items;
    const byCurrency = [first!, last!].sort((a, b) => a.id - b.id);
    expect(byCurrency[0]!.customerCurrency).toMatchObject({ currency: "USD", charged: true });
    expect(byCurrency[1]!.customerCurrency ?? null).toBeNull();

    const list = await call("GET", "/currencies");
    expectContract("GET", "/currencies", list);
    expect(codesOf(list.body)).toEqual(["EGP", "USD", "JPY"]);
    const config = await call("GET", "/config", { query: "platform=android&app_version=1.0.0" });
    expectContract("GET", "/config", config);
    expect(config.body).toMatchObject({ customer_currency: { enabled: true, currencies: ["USD", "JPY"] } });
  });

  it("the shop's own currency asked for is the shop's prices, as before", async () => {
    const { call } = await shop({ customerCurrencies: ["USD"] });
    const egp = await call("GET", "/store/products", { currency: "EGP" });
    expect(priceOf(egp.body)).not.toHaveProperty("display");
  });

  it("the connector itself never converts outside the rule", async () => {
    const { store, app, lines } = await shop({ customerCurrencies: ["USD"], chargeInCustomerCurrency: true });
    const connector = new CatalogConnector({ store, app, assetUrl: (id) => id, platformUrl: "https://yallapp.test" });
    const ask = (currency: string) =>
      connector.handle({ method: "GET", path: ["store", "products"], query: new URLSearchParams(), body: undefined, user: null, now: NOW, display: { currency, rates: RATES } });
    const cart = (currency: string) =>
      connector.handle({ method: "POST", path: ["store", "cart"], query: new URLSearchParams(), body: { lines }, user: null, now: NOW, display: { currency, rates: RATES } });
    expect(await cart("KWD")).toMatchObject({ body: { charge: { currency: "EGP", in_customer_currency: false, reason: null } } });
    expect(await cart("USD")).toMatchObject({ body: { charge: { currency: "USD", in_customer_currency: true } } });
    expect((await ask("KWD"))?.status).toBe(200);
  });
});
