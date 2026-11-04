import { describe, expect, it } from "vitest";
import type { MarketOrder } from "@/lib/data/types";
import { priceOrder } from "@/lib/market/money";
import { cashCollector, HOSTED_WALLETS, marketCheckout, paymentChoices, paymentSetupSteps, refundMarketPayment, DEFAULT_PAYMENT_SETTINGS } from "@/lib/market/payments";
import { NOW } from "./helpers";

const money = priceOrder({ items: [{ unitPrice: 15000, quantity: 1 }], deliveryFee: 2000, deliveryBy: "app", commission: { kind: "percent", value: 10 }, collectedBy: "owner", wallet: 3000 });
const order = { id: 42, vendorName: "Grill House", currency: "EGP", money, customerName: "Mariam", customerPhone: "+201001234567", userId: 7, paymentRef: "cs_test_1", createdAt: NOW, updatedAt: NOW } as Pick<MarketOrder, "id" | "vendorName" | "currency" | "money" | "customerName" | "customerPhone" | "userId" | "paymentRef" | "createdAt" | "updatedAt">;

describe("115.11 payments", () => {
  it("offers cash up to the owner's highest amount, cards, and Apple Pay and Google Pay where the gateway's page has them", () => {
    const methods = (s: Partial<typeof DEFAULT_PAYMENT_SETTINGS>, platform: "ios" | "android" | "web" = "ios", currency = "EGP", total = 17000) =>
      paymentChoices({ ...DEFAULT_PAYMENT_SETTINGS, ...s }, { currency, total, platform, walletBalance: 0 }).map((c) => `${c.method}${c.unavailable ? "!" : ""}`);
    expect(methods({})).toEqual(["cash"]);
    expect(methods({ cashMax: 10000 })).toEqual(["cash!"]);
    expect(methods({ gateway: "kashier", applePay: true, googlePay: true })).toEqual(["apple_pay", "card", "cash"]);
    expect(methods({ gateway: "kashier", applePay: true, googlePay: true }, "android")).toEqual(["card", "cash"]);
    expect(methods({ gateway: "stripe", applePay: true, googlePay: true }, "web", "USD")).toEqual(["apple_pay", "google_pay", "card", "cash"]);
    expect(methods({ gateway: "iyzico", applePay: true, cash: false }, "ios", "TRY")).toEqual(["card"]);
    // A gateway that doesn't take the currency: no card.
    expect(methods({ gateway: "iyzico" }, "ios", "EGP")).toEqual(["cash"]);
    expect(paymentChoices(DEFAULT_PAYMENT_SETTINGS, { currency: "EGP", total: 5000, platform: "ios", walletBalance: 9000 }).map((c) => c.method)).toEqual(["cash", "wallet"]);
    expect(HOSTED_WALLETS.paypal).toEqual({ applePay: false, googlePay: false });
  });

  it("knows who holds the cash", () => {
    expect(cashCollector({ fulfilment: "pickup", deliveryBy: null })).toBe("vendor");
    expect(cashCollector({ fulfilment: "delivery", deliveryBy: "vendor" })).toBe("vendor");
    expect(cashCollector({ fulfilment: "delivery", deliveryBy: "app" })).toBe("owner");
  });

  it("asks the gateway for what is left after the wallet", () => {
    const request = marketCheckout(order, { email: "mariam@example.com", city: "Cairo", address: "Street 9", ip: "203.0.113.5", returnUrl: "https://souk.example/pay/return", webhookUrl: null });
    expect(request).toMatchObject({ reference: "market-42", amountCents: money.payNow, currency: "EGP", customer: { id: "user-7", phone: "+201001234567" } });
    expect(money.payNow).toBe(money.total - 3000);
    expect(request.lines.reduce((s, l) => s + l.cents, 0)).toBe(request.amountCents);
  });

  it("refunds a complaint's amount through the gateway, never more than was paid online", async () => {
    const calls: string[] = [];
    const fetcher = (async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${new URL(url).pathname}`);
      return new Response(JSON.stringify({ id: "re_1", status: "succeeded" }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const account = { provider: "stripe" as const, keys: { secretKey: "sk_test_x", sandbox: true } };
    const done = await refundMarketPayment(account, order, { cents: 5000, refundedBefore: 0, paymentId: "pi_123", note: "Complaint 3", ip: "203.0.113.5", now: NOW }, { fetcher, urls: { stripe: "https://stripe.test" } });
    expect(done).toEqual({ ok: true, parts: [{ kind: "refund", transactionId: null, cents: 5000, reference: "re_1" }] });
    expect(calls).toEqual(["POST /v1/refunds"]);
    expect(await refundMarketPayment(account, order, { cents: money.payNow, refundedBefore: 5000, paymentId: "pi_123", note: "x", ip: "x", now: NOW }, { fetcher })).toMatchObject({ ok: false });
    expect(await refundMarketPayment({ provider: "fawaterk", keys: { apiKey: "k", vendorKey: "v", sandbox: true } } as never, order, { cents: 100, refundedBefore: 0, paymentId: "x", note: "x", ip: "x", now: NOW })).toMatchObject({ ok: false, error: expect.stringContaining("Fawaterk") });
  });

  it("tells the owner what to set up", () => {
    expect(paymentSetupSteps(DEFAULT_PAYMENT_SETTINGS)[0]).toMatch(/pay in cash/);
    const kashier = paymentSetupSteps({ ...DEFAULT_PAYMENT_SETTINGS, gateway: "kashier", applePay: true, googlePay: true });
    expect(kashier.join("\n")).toMatch(/Apple Pay merchant ID/);
    expect(kashier.join("\n")).toMatch(/doesn't offer Google Pay/);
    expect(paymentSetupSteps({ ...DEFAULT_PAYMENT_SETTINGS, gateway: "stripe", googlePay: true }).join("\n")).toMatch(/production access/);
  });
});
