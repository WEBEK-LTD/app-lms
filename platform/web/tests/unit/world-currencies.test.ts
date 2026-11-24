import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { centsToDecimal, formatCents, parsePrice } from "@/lib/catalog/money";
import { chargedAmount, chargedLines, completePayment, startPayment } from "@/lib/catalog/payment";
import { checkoutAccount, encryptOwnPayment } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import { MemoryStore } from "@/lib/data/memory";
import type { App, CatalogSettings } from "@/lib/data/types";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { centsStep, currencyCodeOf, currencyDigits, currencyName, currencyOptions, isCurrencyCode, ISO_CURRENCIES, matchesCurrency, PREFERRED_CURRENCIES, roundToCurrency } from "@/lib/money/currencies";
import { addDisplayPrices, requestedCurrency, Shown, type DisplayCurrency } from "@/lib/money/display";
import { convertCents, currentRates, fetchRates, rateBetween, ratesOf, rateText, refreshRates, type Rates } from "@/lib/money/rates";
import { paypalValue } from "@/lib/payments/paypal";
import { currencyList, providerTakes, takenCurrencies } from "@/lib/payments/provider";
import { stripeAmount } from "@/lib/payments/stripe";
import { chargedShare } from "@/lib/refunds/service";
import { callbackUrls } from "@/lib/payments/routes";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { expectContract } from "./contract";
import { fakeStripe } from "./fake-stripe-paypal";
import { KEY, NOW, setupClient } from "./helpers";

/** 135 Every currency: its digits, the picker's list, the gateways', the day's rates and prices in the customer's currency. */

/** The source's answer (ExchangeRate-API's open access endpoint), as it sends it. */
const SOURCE = {
  result: "success",
  provider: "https://www.exchangerate-api.com",
  time_last_update_unix: Math.floor(new Date("2026-10-12T00:02:31Z").getTime() / 1000),
  base_code: "USD",
  rates: { ...Object.fromEntries(ISO_CURRENCIES.slice(0, 30).map((code) => [code, 2])), USD: 1, EGP: 48.5, KWD: 0.306, JPY: 151.2, EUR: 0.92, TRY: 34.1, SAR: 3.75, AED: 3.6725, GBP: 0.79, FOK: 7.1, XAU: 0.0004 },
};

function sourceFetch(answer: unknown = SOURCE, status = 200): { fetcher: typeof fetch; urls: string[] } {
  const urls: string[] = [];
  const fetcher = (async (url: string | URL) => {
    urls.push(String(url));
    return new Response(JSON.stringify(answer), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { fetcher, urls };
}

const RATES: Rates = ratesOf({ rates: { USD: 1, EGP: 48.5, KWD: 0.306, JPY: 151.2, EUR: 0.92 }, date: "2026-10-12", fetchedAt: NOW.toISOString(), source: "ExchangeRate-API" }, null);

describe("135.1 every ISO 4217 currency", () => {
  it("is in the list, A–Z, without funds, metals or withdrawn codes", () => {
    expect(ISO_CURRENCIES.length).toBeGreaterThanOrEqual(150);
    expect([...ISO_CURRENCIES].sort()).toEqual(ISO_CURRENCIES);
    for (const code of ["EGP", "KWD", "JPY", "KRW", "BHD", "OMR", "JOD", "TND", "QAR", "XOF", "XCG", "ZWG"]) expect(isCurrencyCode(code)).toBe(true);
    for (const code of ["XAU", "XTS", "BOV", "HRK", "SLL", "kwd", "KW", "", null]) expect(isCurrencyCode(code)).toBe(false);
    expect(currencyCodeOf(" kwd ")).toBe("KWD");
    expect(currencyCodeOf("gold")).toBeNull();
  });

  it("has its minor units: none for the yen and the won, three for the dinars, two for the rest", () => {
    expect(["JPY", "KRW", "VND", "CLP", "ISK", "XAF"].map(currencyDigits)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(["KWD", "BHD", "OMR", "JOD", "TND", "IQD", "LYD"].map(currencyDigits)).toEqual([3, 3, 3, 3, 3, 3, 3]);
    expect(["EGP", "SAR", "AED", "TRY", "USD", "EUR", "GBP", "QAR"].map(currencyDigits)).toEqual([2, 2, 2, 2, 2, 2, 2, 2]);
    expect(centsStep("JPY")).toBe(100);
    expect(roundToCurrency(45049, "JPY")).toBe(45000);
    expect(roundToCurrency(45050, "JPY")).toBe(45100);
    expect(roundToCurrency(127, "KWD")).toBe(127);
  });

  it("is formatted with its own digits", () => {
    expect(formatCents(125, "KWD")).toBe("KWD\u00a01.250");
    expect(formatCents(125, "BHD")).toBe("BHD\u00a01.250");
    expect(formatCents(125000, "JPY")).toBe("¥1,250");
    expect(formatCents(60000, "EGP")).toBe("E£600");
    expect(formatCents(60000, "EGP", null, { exact: true })).toBe("E£600.00");
    expect(formatCents(45000, "TRY")).toBe("₺450");
    expect(centsToDecimal(125, "KWD")).toBe("1.250");
    expect(centsToDecimal(125000, "JPY")).toBe("1250");
    expect(centsToDecimal(45050)).toBe("450.50");
  });

  it("parses typed prices with its digits; without a currency, as before", () => {
    // Two digits, as before 135.
    expect(parsePrice("450")).toBe(45000);
    expect(parsePrice("450.5")).toBe(45050);
    expect(parsePrice("1,250")).toBe(125000);
    expect(parsePrice("1.250,00")).toBe(125000);
    expect(parsePrice("1,250.00", "EGP")).toBe(125000);
    // Three: "1.250" is a dinar and a quarter, kept to the hundredth.
    expect(parsePrice("1.250", "KWD")).toBe(125);
    expect(parsePrice("1,250", "KWD")).toBe(125);
    expect(parsePrice("12.5", "KWD")).toBe(1250);
    expect(parsePrice("1,250.500", "KWD")).toBe(125050);
    expect(parsePrice("KWD 2.5", "KWD")).toBe(250);
    expect(parsePrice("2.5kwd", "KWD")).toBe(250);
    // The currency is compared as text, never read as a pattern.
    expect(parsePrice("2.5", ".*")).toBe(250);
    expect(parsePrice("1.255", "KWD")).toBeNull();
    // None: whole yen, thousands either way.
    expect(parsePrice("1,250", "JPY")).toBe(125000);
    expect(parsePrice("1.250", "JPY")).toBe(125000);
    expect(parsePrice("450.00", "JPY")).toBe(45000);
    expect(parsePrice("450.5", "JPY")).toBeNull();
    expect(parsePrice("¥980", "JPY")).toBe(98000);
    expect(parsePrice("abc", "KWD")).toBeNull();
  });
});

describe("135.3 the picker's list", () => {
  it("puts the usual ones first, then the others A–Z by name, named in the dashboard's language", () => {
    const en = currencyOptions("en");
    expect(en.slice(0, PREFERRED_CURRENCIES.length).map((o) => o.code)).toEqual([...PREFERRED_CURRENCIES]);
    expect(en).toHaveLength(ISO_CURRENCIES.length);
    const rest = en.slice(PREFERRED_CURRENCIES.length).map((o) => o.name);
    expect(rest).toEqual([...rest].sort(new Intl.Collator("en").compare));
    expect(en.find((o) => o.code === "KWD")).toEqual({ code: "KWD", name: "Kuwaiti Dinar", symbol: "KWD", usual: true });
    expect(en.find((o) => o.code === "USD")?.symbol).toBe("$");
    expect(currencyName("KWD", "ar")).toBe("دينار كويتي");
    expect(currencyName("KWD", "tr")).toBe("Kuveyt dinarı");
    expect(currencyOptions("ar")[0]).toMatchObject({ code: "EGP", name: "جنيه مصري" });
    expect(currencyOptions("tr").find((o) => o.code === "TRY")?.name).toBe("Türk lirası");
    // A name the language lacks: the English one.
    expect(currencyName("VED", "tr")).toBe(currencyName("VED", "en"));
  });

  it("finds a currency by its name, code or sign", () => {
    const kwd = currencyOptions("en").find((o) => o.code === "KWD")!;
    expect(matchesCurrency(kwd, "kuwait")).toBe(true);
    expect(matchesCurrency(kwd, "kw")).toBe(true);
    expect(matchesCurrency(kwd, "yen")).toBe(false);
    const usd = currencyOptions("en").find((o) => o.code === "USD")!;
    expect(matchesCurrency(usd, "$")).toBe(true);
    expect(matchesCurrency(currencyOptions("ar").find((o) => o.code === "KWD")!, "كويت")).toBe(true);
  });
});

describe("135.4 the gateways' currencies", () => {
  it("say which each takes", () => {
    expect(providerTakes("stripe", "KWD")).toBe(true);
    expect(providerTakes("stripe", "JPY")).toBe(true);
    expect(providerTakes("stripe", "IQD")).toBe(false);
    expect(providerTakes("paypal", "JPY")).toBe(true);
    expect(providerTakes("paypal", "EGP")).toBe(false);
    expect(providerTakes("iyzico", "TRY")).toBe(true);
    expect(providerTakes("iyzico", "KWD")).toBe(false);
    expect(providerTakes("kashier", "EGP")).toBe(true);
    expect(providerTakes("fawaterk", "SAR")).toBe(true);
    // A long list is named by its first few.
    expect(takenCurrencies("stripe")).toHaveLength(9);
    expect(currencyList("paypal")).toMatch(/^USD, EUR, GBP, .+ or \+16$/);
    expect(currencyList("kashier")).toBe("EGP, USD or EUR");
  });

  it("get each currency's amount in their own units", () => {
    // Stripe: thousandths for the dinar, whole yen.
    expect(stripeAmount(125, "KWD")).toBe(1250);
    expect(stripeAmount(125000, "JPY")).toBe(1250);
    expect(stripeAmount(125050, "JPY")).toBeNull();
    expect(stripeAmount(1240, "USD")).toBe(1240);
    // PayPal: whole yen, two digits otherwise.
    expect(paypalValue(125000, "JPY")).toBe("1250");
    expect(paypalValue(125050, "JPY")).toBeNull();
    expect(paypalValue(1240, "USD")).toBe("12.40");
  });
});

describe("135.6 the day's rates", () => {
  it("are read from the source, ISO codes only, with their day", async () => {
    const { fetcher, urls } = sourceFetch();
    const read = await fetchRates(fetcher, "https://rates.test/v6/latest/USD");
    expect(urls).toEqual(["https://rates.test/v6/latest/USD"]);
    expect(read.date).toBe("2026-10-12");
    expect(read.rates).toMatchObject({ USD: 1, EGP: 48.5, KWD: 0.306 });
    expect(read.rates.XAU).toBeUndefined();
    expect(read.rates.FOK).toBeUndefined();
  });

  it("refuse an answer that isn't the table", async () => {
    await expect(fetchRates(sourceFetch({ result: "error", "error-type": "quota-reached" }).fetcher, "https://rates.test")).rejects.toThrow("The rates' source refused: quota-reached.");
    await expect(fetchRates(sourceFetch({}, 503).fetcher, "https://rates.test")).rejects.toThrow("HTTP 503");
    const down = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expect(fetchRates(down, "https://rates.test")).rejects.toThrow("can't be reached");
  });

  it("are saved by the daily job; a failed read keeps the last good ones and says when", async () => {
    const store = new MemoryStore();
    clearPlatformSettingsCache();
    const first = await refreshRates({ store, now: NOW, fetcher: sourceFetch().fetcher });
    expect(first).toMatchObject({ ok: true, date: "2026-10-12" });
    const later = new Date(NOW.getTime() + 86_400_000);
    const failed = await refreshRates({ store, now: later, fetcher: sourceFetch({}, 500).fetcher });
    expect(failed).toMatchObject({ ok: false, date: "2026-10-12", error: "The rates' source answered HTTP 500." });
    clearPlatformSettingsCache();
    const saved = (await store.listPlatformSettings()).find((s) => s.key === "exchangeRates")!.value as { rates: Record<string, number>; date: string; failedAt: string };
    expect(saved).toMatchObject({ date: "2026-10-12", failedAt: later.toISOString() });
    expect(saved.rates.EGP).toBe(48.5);
    expect((await currentRates(store)).perDollar.KWD).toBe(0.306);
  });

  it("take the team's rate over the day's, and convert through the dollar", () => {
    const rates = ratesOf({ rates: { USD: 1, EGP: 48.5, KWD: 0.306 }, date: "2026-10-12", fetchedAt: "", source: "" }, { rates: { EGP: 50, USD: 3, XAU: 2 } });
    expect(rates.perDollar).toEqual({ USD: 1, EGP: 50, KWD: 0.306 });
    expect(rates.overridden).toEqual(["EGP"]);
    expect(rateBetween(RATES, "EGP", "USD")).toBeCloseTo(1 / 48.5, 10);
    expect(rateBetween(RATES, "EGP", "EGP")).toBe(1);
    expect(rateBetween(RATES, "EGP", "GBP")).toBeNull();
    // 600.00 EGP: $12.37, KWD 3.79, ¥1,871 (whole yen).
    expect(convertCents(60000, rateBetween(RATES, "EGP", "USD")!, "USD")).toBe(1237);
    expect(convertCents(60000, rateBetween(RATES, "EGP", "KWD")!, "KWD")).toBe(379);
    expect(convertCents(60000, rateBetween(RATES, "EGP", "JPY")!, "JPY")).toBe(187100);
    expect(rateText(1 / 48.5, "EGP", "USD")).toBe("1 EGP = 0.02062 USD");
    expect(rateText(151.2, "USD", "JPY")).toBe("1 USD = 151.20 JPY");
  });
});

describe("135.5 prices in the customer's currency", () => {
  it("are asked for by the query or the header, an ISO code only", () => {
    expect(requestedCurrency(new URLSearchParams("currency=usd"), null)).toBe("USD");
    expect(requestedCurrency(new URLSearchParams(), new Headers({ "x-currency": "KWD" }))).toBe("KWD");
    expect(requestedCurrency(new URLSearchParams("currency=JPY"), new Headers({ "x-currency": "KWD" }))).toBe("JPY");
    expect(requestedCurrency(new URLSearchParams("currency=gold"), null)).toBeNull();
    expect(requestedCurrency(null, null)).toBeNull();
  });

  it("are added to every money object, the shop's amounts kept", () => {
    const display: DisplayCurrency = { currency: "USD", rates: RATES };
    const body = {
      items: [{ id: 1, price: { amount: "600.00", regular_amount: "700.00", regular_formatted: "E£700.00", currency: "EGP", formatted: "E£600.00", on_sale: true, range: false } }],
      cart: { subtotal: "E£600.00", subtotal_amount: "600.00", total: "E£650.00", total_amount: "650.00", currency: "EGP" },
      food: { total: "650.00", total_formatted: "E£650.00", currency: "EGP" },
      ranged: { amount: "100.00", max_amount: "200.00", currency: "EGP", formatted: "E£100.00 – E£200.00", range: true },
      order: { total: "E£600.00", customer_currency: { currency: "USD", total: "$12.40", total_amount: "12.40", rate: 0.0206, rate_date: "2026-10-11", charged: false, display: null } },
    };
    addDisplayPrices(body, display);
    expect(body.items[0]!.price).toMatchObject({
      amount: "600.00",
      formatted: "E£600.00",
      display: { currency: "USD", amount: "12.37", formatted: "$12.37", regular_amount: "14.43", regular_formatted: "$14.43", rate: 1 / 48.5, rate_date: "2026-10-12" },
    });
    expect(body.cart).toMatchObject({ display: { currency: "USD", subtotal_amount: "12.37", subtotal: "$12.37", total_amount: "13.40", total: "$13.40" } });
    expect(body.food).toMatchObject({ display: { total: "13.40", total_formatted: "$13.40" } });
    expect(body.ranged).toMatchObject({ display: { amount: "2.06", max_amount: "4.12", formatted: "$2.06 – $4.12" } });
    // The order's own day stays.
    expect(body.order.customer_currency.display).toBeNull();
    // KWD with three digits, the yen whole.
    const kwd = addDisplayPrices({ amount: "600.00", currency: "EGP", formatted: "E£600.00" }, { currency: "KWD", rates: RATES }) as unknown as { display: { formatted: string; amount: string } };
    expect(kwd.display).toMatchObject({ amount: "3.790", formatted: "KWD\u00a03.790" });
    const yen = addDisplayPrices({ amount: "600.00", currency: "EGP", formatted: "E£600.00" }, { currency: "JPY", rates: RATES }) as unknown as { display: { formatted: string } };
    expect(yen.display.formatted).toBe("¥1,871");
  });

  it("are left alone for the shop's own currency, one without a rate, or none asked", () => {
    const price = () => ({ amount: "600.00", currency: "EGP", formatted: "E£600.00" });
    expect(addDisplayPrices(price(), { currency: "EGP", rates: RATES })).not.toHaveProperty("display");
    expect(addDisplayPrices(price(), { currency: "GBP", rates: RATES })).not.toHaveProperty("display");
    expect(addDisplayPrices(price(), null)).not.toHaveProperty("display");
    expect(Shown.for("EGP", { currency: "GBP", rates: RATES })).toBeNull();
  });
});

describe("135.5–135.7 a shop in Egyptian pounds", () => {
  async function shop(settings: Partial<CatalogSettings> = {}) {
    const { store, client } = await setupClient({ plan: "growth" });
    clearPlatformSettingsCache();
    await store.setPlatformSetting("exchangeRates", { rates: RATES.perDollar, date: "2026-10-12", fetchedAt: NOW.toISOString(), source: "ExchangeRate-API" }, "daily job", NOW);
    let app: App = {
      ...newApp(client.id, null, NOW, "store"),
      backend: "hosted",
      appName: "Nile Bakes",
      websiteDoneAt: NOW,
      connector: { kind: "catalog" },
      catalogSettings: { currency: "EGP", shippingCents: 0, freeShippingOverCents: null, payment: null, ...settings },
    };
    await store.createApp(app);
    app = { ...app, catalogSettings: { ...app.catalogSettings!, payment: encryptOwnPayment(app.id, { provider: "stripe", secretKey: "sk_test_51Abcdefghijklmnop", sandbox: true }, KEY) } };
    await store.updateApp(app.id, { catalogSettings: app.catalogSettings }, NOW);
    const product = await store.createCatalogProduct(
      { appId: app.id, name: "Basbousa tray", description: "", priceCents: 60000, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null },
      NOW,
    );
    return { store, app, product };
  }

  const context = (store: MemoryStore, app: App): HostedContext => ({
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

  it("shows its prices in the customer's currency on the hosted API, as the contract says; an app asking for none sees pounds only", async () => {
    const { store, app } = await shop();
    const get = (path: string, query = "", headers?: Headers) =>
      handleHosted(context(store, app), { method: "GET", path: path.split("/").filter(Boolean), query: new URLSearchParams(query), body: undefined, token: null, headers });
    const plain = await get("/store/products");
    expectContract("GET", "/store/products", plain);
    expect((plain.body as { items: { price: object }[] }).items[0]!.price).not.toHaveProperty("display");
    const usd = await get("/store/products", "currency=USD");
    expectContract("GET", "/store/products", usd);
    expect((usd.body as { items: { price: object }[] }).items[0]!.price).toMatchObject({ amount: "600.00", currency: "EGP", formatted: "E£600", display: { currency: "USD", formatted: "$12.37", rate_date: "2026-10-12" } });
    const kwd = await get("/store/products", "", new Headers({ "x-currency": "KWD" }));
    expect((kwd.body as { items: { price: object }[] }).items[0]!.price).toMatchObject({ display: { currency: "KWD", amount: "3.790", formatted: "KWD\u00a03.790" } });
    // The picker's list, named in the app's language.
    const list = await handleHosted(context(store, app), { method: "GET", path: ["currencies"], query: new URLSearchParams(), body: undefined, token: null, headers: new Headers({ "accept-language": "ar" }) });
    expectContract("GET", "/currencies", list);
    expect(list.body).toMatchObject({ rate_date: "2026-10-12", items: expect.arrayContaining([{ code: "KWD", name: "دينار كويتي", symbol: "د.ك.", digits: 3, usual: true }]) });
    expect((list.body as { items: { code: string }[] }).items.map((i) => i.code)).not.toContain("GBP");
  });

  it("charges in pounds by default, the converted total shown as approximate", async () => {
    const { store, app, product } = await shop();
    const post = (path: string, body: unknown, query = "") =>
      handleHosted(context(store, app), { method: "POST", path: path.split("/").filter(Boolean), query: new URLSearchParams(query), body, token: null, headers: new Headers({ "x-currency": "USD" }) });
    const cart = await post("/store/cart", { lines: [{ product_id: product.id, quantity: 1 }] });
    expectContract("POST", "/store/cart", cart);
    expect(cart.body).toMatchObject({ total: "E£600", display: { total: "$12.37" }, charge: { currency: "EGP", total: "E£600", in_customer_currency: false, reason: null } });
    const link = await post("/store/checkout-link", { lines: [{ product_id: product.id, quantity: 1 }] }, "platform=android");
    expectContract("POST", "/store/checkout-link", link);
    const order = (await store.listCatalogOrders({ appId: app.id, limit: 5, offset: 0 })).items[0]!;
    expect(order).toMatchObject({ totalCents: 60000, currency: "EGP", customerCurrency: { currency: "USD", totalCents: 1237, rateDate: "2026-10-12", charged: false } });
    expect(chargedAmount(order)).toEqual({ cents: 60000, currency: "EGP", charged: false });
  });

  it("charges in the customer's currency when the shop says so and Stripe takes it, reads it back, and refunds a share of it", async () => {
    const { store, app, product } = await shop({ chargeInCustomerCurrency: true });
    const fresh = (await store.getAppById(app.id))!;
    const post = (currency: string) =>
      handleHosted(context(store, fresh), { method: "POST", path: ["store", "checkout-link"], query: new URLSearchParams("platform=android"), body: { lines: [{ product_id: product.id, quantity: 2 }] }, token: null, headers: new Headers({ "x-currency": currency }) });
    const link = await post("KWD");
    expect(link.body).toMatchObject({ charge: { currency: "KWD", total: "KWD\u00a07.570", in_customer_currency: true } });
    const order = (await store.listCatalogOrders({ appId: app.id, limit: 5, offset: 0 })).items[0]!;
    expect(order).toMatchObject({ totalCents: 120000, currency: "EGP", customerCurrency: { currency: "KWD", totalCents: 757, charged: true } });

    const stripe = fakeStripe();
    const account = (await checkoutAccount(store, fresh, KEY))!;
    const customer = { name: "Mona Adel", phone: "+201001234567", email: "mona@example.com", city: "Cairo", address: "12 Tahrir St" };
    await startPayment({ store, app: fresh, account, fetcher: stripe.fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: callbackUrls("https://yallapp.test", "order", "stripe", "t") });
    const started = (await store.getCatalogOrder(app.id, order.id))!;
    const session = stripe.sessions.get(started.providerRef!)!;
    // Thousandths of a dinar, as Stripe counts them.
    expect(session.currency).toBe("kwd");
    expect(session.amount_total).toBe(7570);
    stripe.pay(started.providerRef!);
    expect(await completePayment({ store, app: fresh, account, fetcher: stripe.fetcher, now: NOW, order: started })).toBe("paid");

    // A refund of half the pounds is half the dinars; the whole order, all of them.
    const charged = { currency: "KWD", totalCents: 757 };
    expect(chargedShare(60000, 120000, charged)).toBe(379);
    expect(chargedShare(120000, 120000, charged)).toBe(757);
    expect(chargedShare(120000, 120000, charged) - chargedShare(60000, 120000, charged)).toBe(378);
    // In yen, whole yen.
    expect(chargedShare(33333, 120000, { currency: "JPY", totalCents: 187100 })).toBe(52000);

    // A currency Stripe doesn't take: charged in pounds, and the app is told why.
    const iqd = { ...RATES.perDollar, IQD: 1310 };
    await store.setPlatformSetting("exchangeRates", { rates: iqd, date: "2026-10-12", fetchedAt: NOW.toISOString(), source: "ExchangeRate-API" }, "daily job", NOW);
    clearPlatformSettingsCache();
    expect((await post("IQD")).body).toMatchObject({ charge: { currency: "EGP", in_customer_currency: false, reason: "gateway" } });
  });

  it("spreads the lines over the charged total in whole units of it", () => {
    const lines = [
      { id: "a", name: "A", cents: 40000, category: "Products", digital: false },
      { id: "b", name: "B", cents: 20000, category: "Products", digital: false },
    ];
    const yen = chargedLines(lines, 187100, "JPY");
    expect(yen.map((l) => l.cents)).toEqual([124700, 62400]);
    expect(yen.reduce((n, l) => n + l.cents, 0)).toBe(187100);
    const kwd = chargedLines(lines, 379, "KWD");
    expect(kwd.reduce((n, l) => n + l.cents, 0)).toBe(379);
  });

  it("keeps an order's charge in the database's JSON", async () => {
    const store = new MemoryStore();
    const created = await store.createCatalogOrder({
      appId: "app-1",
      tokenHash: sha256Hex("x"),
      userId: null,
      status: "pending",
      lines: [],
      subtotalCents: 100,
      shippingCents: 0,
      totalCents: 100,
      currency: "EGP",
      customerCurrency: { currency: "USD", totalCents: 2, rate: 0.0206, rateDate: "2026-10-12", charged: false },
      customer: null,
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    });
    expect((await store.getCatalogOrder("app-1", created.id))!.customerCurrency).toMatchObject({ currency: "USD", charged: false });
  });
});
