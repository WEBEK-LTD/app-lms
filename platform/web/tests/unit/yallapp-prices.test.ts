import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { cardPlanOptions } from "@/lib/billing/card-plans";
import { checkCoupon } from "@/lib/billing/coupons";
import { completePlanPayment, startPlanPayment } from "@/lib/billing/plan-payment";
import { paymentLine } from "@/lib/billing/plan-mail";
import {
  chargedPrice,
  chargeLine,
  displayCurrencyFor,
  formatAmount,
  formatMoney,
  loweredOffer,
  offerFor,
  readRate,
  shownPrice,
  usdCentsOf,
} from "@/lib/billing/prices";
import { planReceiptRows, receiptNumber } from "@/lib/billing/receipt";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { Coupon } from "@/lib/data/types";
import { acceptLanguageRegion, countryFromHeaders, visitorCountry } from "@/lib/geo";
import { COUNTRY_VARY_HEADERS, PRICED_PAGES } from "@/lib/geo-vary";
import type { PaymentAccount } from "@/lib/payments/provider";
import { callbackUrls } from "@/lib/payments/routes";
import { PLAN_INFO, planPrice, planPriceOf, plansWith } from "@/lib/plans";
import { yallappBilling, yallappPlanAccount } from "@/lib/settings/platform";
import { fakeKashier } from "./fake-providers";
import { KEY, NOW, setupClient } from "./helpers";

/** Roadmap 52: Yallapp's prices in pounds for Egypt and dollars elsewhere, charged in pounds through Kashier. */

/** Intl keeps "EGP" and the amount together with a no-break space. */
const nbsp = (text: string) => text.replace(/EGP /g, `EGP${String.fromCharCode(0xa0)}`);
const PRICE = { egpCents: 150000, usdCents: null };

describe("52 the visitor's currency", () => {
  it("is pounds for Egypt and dollars for every other or unknown country", () => {
    expect(displayCurrencyFor("EG")).toBe("EGP");
    expect(displayCurrencyFor("eg")).toBe("EGP");
    expect(displayCurrencyFor("TR")).toBe("USD");
    expect(displayCurrencyFor("US")).toBe("USD");
    expect(displayCurrencyFor(null)).toBe("USD");
  });

  it("reads the country from the host's headers, then the browser's language region", () => {
    const b64 = Buffer.from(JSON.stringify({ country: { code: "EG" } })).toString("base64");
    expect(countryFromHeaders(new Headers({ "x-nf-geo": b64 }), undefined)).toBe("EG");
    expect(countryFromHeaders(new Headers({ "x-nf-geo": JSON.stringify({ country: { code: "SA" } }) }), undefined)).toBe("SA");
    expect(countryFromHeaders(new Headers({ "x-country": "eg" }), undefined)).toBe("EG");
    expect(countryFromHeaders(new Headers({ "cf-ipcountry": "AE" }), undefined)).toBe("AE");
    expect(countryFromHeaders(new Headers({ "cf-ipcountry": "T1" }), undefined)).toBeNull();
    // Netlify's header comes before the others.
    expect(countryFromHeaders(new Headers({ "x-nf-geo": b64, "x-country": "TR", "cf-ipcountry": "DE" }), undefined)).toBe("EG");
    // Our proxy's header only with its secret.
    const secret = "s".repeat(32);
    expect(countryFromHeaders(new Headers({ "x-yallapp-client-country": "EG", "x-country": "NL" }), secret)).toBe("NL");
    expect(countryFromHeaders(new Headers({ "x-yallapp-client-country": "EG", "x-yallapp-proxy-secret": secret, "x-country": "NL" }), secret)).toBe("EG");

    expect(acceptLanguageRegion("ar-EG,ar;q=0.9,en;q=0.8")).toBe("EG");
    expect(acceptLanguageRegion("en;q=0.9,ar-EG;q=0.8,en-GB;q=0.5")).toBe("EG");
    expect(acceptLanguageRegion("en-GB;q=0.4,ar-EG;q=0.8")).toBe("EG");
    expect(acceptLanguageRegion("zh-Hant-TW")).toBe("TW");
    expect(acceptLanguageRegion("es-419,en")).toBeNull();
    expect(acceptLanguageRegion("ar-EG;q=0")).toBeNull();
    expect(acceptLanguageRegion(null)).toBeNull();
    expect(visitorCountry(new Headers({ "accept-language": "ar-EG" }), undefined)).toBe("EG");
    expect(visitorCountry(new Headers({ "accept-language": "ar-EG", "x-country": "US" }), undefined)).toBe("US");
    expect(visitorCountry(new Headers(), undefined)).toBeNull();
  });
});

describe("52 pounds and dollars", () => {
  it("derives the dollar price from the rate, rounded to whole dollars, unless the team set one", () => {
    expect(usdCentsOf(PRICE, 50)).toBe(3000);
    expect(usdCentsOf({ egpCents: 149900, usdCents: null }, 48.5)).toBe(3100);
    expect(usdCentsOf({ egpCents: 140000, usdCents: null }, 48.5)).toBe(2900);
    expect(usdCentsOf({ egpCents: 1000, usdCents: null }, 50)).toBe(100);
    expect(usdCentsOf({ egpCents: 150000, usdCents: 2900 }, 50)).toBe(2900);
    expect(usdCentsOf(PRICE, null)).toBeNull();
    expect(usdCentsOf(PRICE, 0)).toBeNull();
  });

  it("shows pounds in Egypt and dollars elsewhere, and pounds while there's no dollar price", () => {
    expect(shownPrice(PRICE, "EGP", 50)).toEqual({ cents: 150000, currency: "EGP" });
    expect(shownPrice(PRICE, "USD", 50)).toEqual({ cents: 3000, currency: "USD" });
    expect(shownPrice(PRICE, "USD", null)).toEqual({ cents: 150000, currency: "EGP" });
  });

  it("charges pounds through Kashier and Fawaterk, and the dollar price through iyzico", () => {
    expect(chargedPrice(PRICE, "kashier", 50)).toEqual({ cents: 150000, currency: "EGP" });
    expect(chargedPrice(PRICE, "fawaterk", null)).toEqual({ cents: 150000, currency: "EGP" });
    expect(chargedPrice(PRICE, "iyzico", 50)).toEqual({ cents: 3000, currency: "USD" });
    expect(chargedPrice(PRICE, "iyzico", null)).toBeNull();
  });

  it("formats pounds as EGP and dollars with $, without zero decimals", () => {
    expect(formatMoney({ cents: 150000, currency: "EGP" })).toBe(nbsp("EGP 1,500"));
    expect(formatMoney({ cents: 149950, currency: "EGP" })).toBe(nbsp("EGP 1,499.50"));
    expect(formatMoney({ cents: 2900, currency: "USD" })).toBe("$29");
    expect(formatMoney({ cents: 2320, currency: "USD" })).toBe("$23.20");
    expect(formatAmount(480000, "TRY")).toBe("₺4,800.00");
  });

  it("tells a client outside Egypt what is charged", () => {
    const abroad = offerFor(PRICE, "USD", "kashier", 50)!;
    expect(abroad).toEqual({
      shown: { cents: 3000, currency: "USD" },
      charged: { cents: 150000, currency: "EGP" },
      line: nbsp("You'll be charged EGP 1,500 (about $30); your bank may convert it."),
    });
    expect(offerFor(PRICE, "EGP", "kashier", 50)).toMatchObject({ line: null });
    expect(chargeLine({ cents: 3000, currency: "USD" }, { cents: 3000, currency: "USD" })).toBeNull();
    expect(offerFor(PRICE, "USD", "iyzico", null)).toBeNull();
  });

  it("reads the team's rate", () => {
    expect(readRate("")).toBeNull();
    expect(readRate("48.5")).toBe(48.5);
    expect(readRate(" 1,050 ")).toBe(1050);
    expect(readRate("0")).toBeUndefined();
    expect(readRate("abc")).toBeUndefined();
  });
});

describe("52 coupons in pounds and dollars", () => {
  const coupon = (discount: Coupon["discount"]): Coupon => ({
    id: "c0ffee00-0000-4000-8000-000000000052",
    code: "NILE",
    note: "",
    discount,
    plans: null,
    periods: null,
    validFrom: null,
    validUntil: null,
    maxRedemptions: null,
    maxPerClient: null,
    firstPaymentOnly: false,
    active: true,
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: "admin@yallapp.test",
  });
  const plan = plansWith({ growth: { ...PLAN_INFO.growth, priceCents: 150000, onRequest: false, billingMonths: 12 } }).growth;
  const offer = offerFor(planPriceOf(plan)!, "USD", "kashier", 50)!;

  it("lowers the charge in pounds, and the dollar price shown in the same proportion", () => {
    const percent = checkCoupon({ coupon: coupon({ kind: "percent", percent: 20 }), plan, charged: offer.charged, client: { id: "c", activatedAt: null }, redemptions: [], now: NOW });
    if (!percent.ok) throw new Error(percent.error);
    expect(percent).toMatchObject({ fullCents: 150000, amountCents: 120000 });
    expect(loweredOffer(offer, percent.amountCents)).toEqual({
      shown: { cents: 2400, currency: "USD" },
      charged: { cents: 120000, currency: "EGP" },
      line: nbsp("You'll be charged EGP 1,200 (about $24); your bank may convert it."),
    });

    const fixed = checkCoupon({ coupon: coupon({ kind: "fixed", amounts: { EGP: 25000 } }), plan, charged: offer.charged, client: { id: "c", activatedAt: null }, redemptions: [], now: NOW });
    if (!fixed.ok) throw new Error(fixed.error);
    expect(loweredOffer(offer, fixed.amountCents).shown).toEqual({ cents: 2500, currency: "USD" });
    // Rounded to the cent.
    expect(loweredOffer(offer, 99999).shown).toEqual({ cents: 2000, currency: "USD" });
    expect(loweredOffer({ ...offer, shown: { cents: 2900, currency: "USD" } }, 100000).shown).toEqual({ cents: 1933, currency: "USD" });
    // In Egypt the shown price is the charge.
    const home = offerFor(planPriceOf(plan)!, "EGP", "kashier", 50)!;
    expect(loweredOffer(home, 120000)).toEqual({ shown: { cents: 120000, currency: "EGP" }, charged: { cents: 120000, currency: "EGP" }, line: null });

    const dollarsOnly = checkCoupon({ coupon: coupon({ kind: "fixed", amounts: { USD: 500 } }), plan, charged: offer.charged, client: { id: "c", activatedAt: null }, redemptions: [], now: NOW });
    expect(dollarsOnly).toEqual({ ok: false, error: "This coupon doesn't apply to payments in EGP." });
  });
});

describe("52 plans and payments", () => {
  const PLANS = plansWith({
    growth: { ...PLAN_INFO.growth, priceCents: 150000, onRequest: false, billingMonths: 12 },
    pro: { ...PLAN_INFO.pro, priceCents: 480000, usdCents: 9900, onRequest: true, billingMonths: 12 },
  });

  it("keeps \"On request\" plans out of card payments, and shows each price in the client's currency", () => {
    expect(planPrice(PLANS.growth, { display: "EGP", egpPerUsd: 50 })).toEqual({ price: nbsp("EGP 1,500"), period: "year" });
    expect(planPrice(PLANS.growth, { display: "USD", egpPerUsd: 50 })).toEqual({ price: "$30", period: "year" });
    expect(planPrice(PLANS.pro, { display: "USD", egpPerUsd: 50 })).toEqual({ price: "On request", period: null });
    const options = cardPlanOptions(PLANS, null, "kashier", { display: "USD", egpPerUsd: 50 });
    expect(options).toEqual([
      expect.objectContaining({ id: "growth", price: "$30", period: "year", charge: nbsp("You'll be charged EGP 1,500 (about $30); your bank may convert it.") }),
    ]);
    expect(cardPlanOptions(PLANS, null, "kashier", { display: "EGP", egpPerUsd: 50 })[0]).toMatchObject({ price: nbsp("EGP 1,500"), charge: null });
  });

  it("uses Kashier for Yallapp's plans until the team chooses another gateway", async () => {
    const { store } = await setupClient();
    expect(await yallappBilling(store, { fresh: true })).toEqual({ planProvider: "kashier", egpPerUsd: null });
    expect(await yallappPlanAccount(store, KEY)).toBeNull();
    await store.setPlatformSetting("billing", { planProvider: "iyzico", egpPerUsd: 48.5 }, "owner@yallapp.test", NOW);
    expect(await yallappBilling(store, { fresh: true })).toEqual({ planProvider: "iyzico", egpPerUsd: 48.5 });
  });

  it("charges a client outside Egypt in pounds, and keeps the dollar price for the receipt", async () => {
    const setup = await setupClient({ activate: false });
    const kashier = fakeKashier();
    const account: PaymentAccount = { provider: "kashier", keys: { merchantId: "MID-1234-567", apiKey: "api", secretKey: "secret", sandbox: true } };
    const offer = offerFor(planPriceOf(PLANS.growth)!, "USD", "kashier", 50)!;
    let token = "";
    await startPlanPayment({
      store: setup.store,
      account,
      fetcher: kashier.fetcher,
      now: NOW,
      client: setup.client,
      user: setup.user,
      plan: PLANS.growth,
      billing: { city: "London", address: "1 Baker Street" },
      ip: "203.0.113.5",
      callbackUrls: (t) => ((token = t), callbackUrls("https://yallapp.test", "plan", "kashier", t)),
      offer,
    });
    expect(kashier.calls[0]!.body).toMatchObject({ amount: "1500.00", currency: "EGP" });
    const payment = (await setup.store.getPlanPaymentByToken(sha256Hex(token)))!;
    expect(payment).toMatchObject({ amountCents: 150000, currency: "EGP", shownCents: 3000, shownCurrency: "USD" });
    kashier.pay("sess1abcdef");
    const outcome = await completePlanPayment({ store: setup.store, account, fetcher: kashier.fetcher, now: NOW, payment, encryptionKey: KEY });
    expect(outcome.kind).toBe("paid");
    expect((await setup.store.getClientById(setup.client.id))!.paymentNote).toContain(nbsp("Paid EGP 1,500 by card (Kashier"));

    const paid = { ...payment, status: "paid" as const, paymentId: "TX-1", paidAt: NOW };
    const rows = Object.fromEntries(planReceiptRows({ payment: paid, planName: "Growth", appName: "Nile Academy", billedTo: { name: "Mona", email: "mona@example.com" }, paidOn: "12 Oct 2026" }));
    expect(rows).toMatchObject({
      Receipt: receiptNumber(paid),
      "Issued by": "Yallapp, Cairo, Egypt",
      Plan: "Growth, 1 year",
      "Amount charged": nbsp("EGP 1,500"),
      "Price shown": "About $30. Your bank may have converted the charge at its own rate.",
      "Paid with": "Card, through Kashier (reference TX-1)",
    });
    expect(receiptNumber(paid)).toMatch(/^YA-[0-9A-F]{8}$/);
    expect(paymentLine(paid, "https://yallapp.test")).toBe(nbsp(`Paid: EGP 1,500 (about $30) by card through Kashier.\nReceipt: https://yallapp.test/dashboard/license/receipts/${paid.id}\n\n`));
    // In Egypt there's nothing to convert.
    const home = { ...paid, shownCents: null, shownCurrency: null };
    expect(Object.fromEntries(planReceiptRows({ payment: home, planName: "Growth", appName: "A", billedTo: { name: "M", email: "m@x.test" }, paidOn: "" }))).not.toHaveProperty("Price shown");
  });
});

describe("52 caches keep one copy per country", () => {
  it("keys Netlify's cache on the country headers on the pages that show prices", async () => {
    const rules = await nextConfig.headers!();
    for (const page of PRICED_PAGES) {
      const rule = rules.find((r) => r.source === page);
      expect(rule, page).toBeDefined();
      expect(rule!.headers).toEqual([{ key: "Netlify-Vary", value: "header=X-Yallapp-Client-Country|X-Country|CF-IPCountry|Accept-Language,country=eg" }]);
    }
    // Every header the country is read from is in the key (Netlify's own geolocation through country=eg).
    expect(COUNTRY_VARY_HEADERS).toEqual(["X-Yallapp-Client-Country", "X-Country", "CF-IPCountry", "Accept-Language"]);
  });
});
