import { describe, expect, it } from "vitest";
import { cardPlans, completePlanPayment, extendedUntil, readBilling, startPlanPayment } from "@/lib/billing/plan-payment";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { IyzicoKeys } from "@/lib/payments/iyzico";
import { PLAN_INFO, plansWith } from "@/lib/plans";
import { days, KEY, licenseOf, NOW, setupClient } from "./helpers";

const IYZICO: IyzicoKeys = { apiKey: "yallapp-api", secretKey: "yallapp-secret", sandbox: true };
const PLANS = plansWith({ pro: { ...PLAN_INFO.pro, highlights: [...PLAN_INFO.pro.highlights], features: [...PLAN_INFO.pro.features], priceCents: 24000000, usdCents: 480000, onRequest: false, billingMonths: 12 } });
// 52 With iyzico (the team's choice), the dollar price is charged.
const OFFER = { charged: { cents: 480000, currency: "USD" as const }, shown: { cents: 480000, currency: "USD" as const } };

/** A fake iyzico: records the started payment and answers its detail as configured. */
function fakeIyzico(detail: (basketId: string, price: string) => Record<string, unknown>) {
  const started: Record<string, unknown>[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    if (url.endsWith("/checkoutform/initialize/auth/ecom")) {
      started.push(body);
      return Response.json({ status: "success", token: "iyzi-1", paymentPageUrl: "https://iyzico.test/pay/iyzi-1" });
    }
    const first = started[0]!;
    return Response.json(detail(String(first.basketId), String(first.price)));
  }) as unknown as typeof fetch;
  return { fetcher, started };
}

async function start(setup: Awaited<ReturnType<typeof setupClient>>, fetcher: typeof fetch) {
  let token = "";
  const url = await startPlanPayment({
    store: setup.store,
    account: { provider: "iyzico", keys: IYZICO },
    fetcher,
    now: NOW,
    client: setup.client,
    user: setup.user,
    plan: PLANS.pro,
    billing: { city: "Istanbul", address: "Bağdat Caddesi 1, Kadıköy" },
    ip: "203.0.113.5",
    callbackUrls: (t) => {
      token = t;
      return { returnUrl: `https://yallapp.test/api/pay/plan/${t}`, webhookUrl: null };
    },
    offer: OFFER,
  });
  const payment = (await setup.store.getPlanPaymentByToken(sha256Hex(token)))!;
  return { url, payment };
}

describe("plan payments", () => {
  it("offers only plans with a card price", () => {
    expect(cardPlans(PLAN_INFO)).toEqual([]);
    expect(cardPlans(PLANS).map((p) => p.id)).toEqual(["pro"]);
  });

  it("asks for a billing address", () => {
    expect(readBilling({ city: "I", address: "short" })).toEqual({
      ok: false,
      errors: { city: "Enter your city.", address: "Enter your billing address." },
    });
    expect(readBilling({ city: "Istanbul", address: "Bağdat Caddesi 1" })).toEqual({ ok: true, billing: { city: "Istanbul", address: "Bağdat Caddesi 1" } });
  });

  it("extends from the current end, or from today when it ended", () => {
    expect(extendedUntil(new Date("2026-12-20T23:59:59.999Z"), 12, NOW).toISOString()).toBe("2027-12-20T23:59:59.999Z");
    expect(extendedUntil(new Date("2026-01-01T00:00:00Z"), 1, NOW).toISOString()).toBe("2026-11-12T23:59:59.999Z");
    expect(extendedUntil(null, 1, new Date("2027-01-31T10:00:00Z")).toISOString()).toBe("2027-02-28T23:59:59.999Z");
  });

  it("activates a pending client once iyzico confirms the payment", async () => {
    const setup = await setupClient({ activate: false });
    const iyzico = fakeIyzico((basketId, price) => ({ status: "success", paymentStatus: "SUCCESS", paymentId: "9001", paidPrice: Number(price), basketId }));
    const { url, payment } = await start(setup, iyzico.fetcher);
    expect(url).toBe("https://iyzico.test/pay/iyzi-1");
    expect(iyzico.started[0]).toMatchObject({ price: "4800.00", paidPrice: "4800.00", currency: "USD", basketId: payment.id });
    expect(payment).toMatchObject({ status: "pending", plan: "pro", months: 12, amountCents: 480000 });

    const outcome = await completePlanPayment({ store: setup.store, account: { provider: "iyzico", keys: IYZICO }, fetcher: iyzico.fetcher, now: NOW, payment, iyzicoToken: "iyzi-1", encryptionKey: KEY });
    expect(outcome.kind).toBe("paid");
    if (outcome.kind !== "paid") return;
    expect(outcome.activation.created).toBe(true);
    expect(outcome.activeUntil.toISOString()).toBe("2027-10-12T23:59:59.999Z");
    expect((await setup.store.getClientById(setup.client.id))?.status).toBe("active");
    const license = await licenseOf(setup.store, setup.client.id);
    expect(license).toMatchObject({ plan: "pro", expiresAt: outcome.activeUntil });
    expect((await setup.store.getClientById(setup.client.id))?.paymentNote).toContain("by card (iyzico 9001)");

    // iyzico may call back twice: the second does nothing.
    const again = (await setup.store.getPlanPaymentByToken(payment.tokenHash))!;
    expect(again.status).toBe("paid");
    expect(
      (await completePlanPayment({ store: setup.store, account: { provider: "iyzico", keys: IYZICO }, fetcher: iyzico.fetcher, now: NOW, payment: again, iyzicoToken: "iyzi-1", encryptionKey: KEY })).kind,
    ).toBe("already_paid");
    expect((await licenseOf(setup.store, setup.client.id))?.expiresAt).toEqual(outcome.activeUntil);
  });

  it("extends an active client's license and keeps the key", async () => {
    const setup = await setupClient({ plan: "starter", activeUntil: days(20) });
    const iyzico = fakeIyzico((basketId, price) => ({ status: "success", paymentStatus: "SUCCESS", paymentId: "9002", paidPrice: Number(price), basketId }));
    const { payment } = await start(setup, iyzico.fetcher);
    const outcome = await completePlanPayment({ store: setup.store, account: { provider: "iyzico", keys: IYZICO }, fetcher: iyzico.fetcher, now: NOW, payment, iyzicoToken: "iyzi-1", encryptionKey: KEY });
    expect(outcome.kind === "paid" && outcome.activation.created).toBe(false);
    expect(outcome.kind === "paid" && outcome.activation.licenseKey).toBe(setup.licenseKey);
    const license = await licenseOf(setup.store, setup.client.id);
    expect(license?.plan).toBe("pro");
    expect(license?.expiresAt.toISOString()).toBe("2027-11-01T23:59:59.999Z");
  });

  it("changes nothing when iyzico doesn't confirm this payment and amount", async () => {
    for (const detail of [
      () => ({ status: "success", paymentStatus: "FAILURE", paymentId: "1", paidPrice: 4800, basketId: "x" }),
      (basketId: string) => ({ status: "success", paymentStatus: "SUCCESS", paymentId: "1", paidPrice: 1, basketId }),
      () => ({ status: "success", paymentStatus: "SUCCESS", paymentId: "1", paidPrice: 4800, basketId: "another-payment" }),
      () => ({ status: "failure", errorMessage: "Invalid token" }),
    ]) {
      const setup = await setupClient({ activate: false });
      const iyzico = fakeIyzico(detail);
      const { payment } = await start(setup, iyzico.fetcher);
      const outcome = await completePlanPayment({ store: setup.store, account: { provider: "iyzico", keys: IYZICO }, fetcher: iyzico.fetcher, now: NOW, payment, iyzicoToken: "iyzi-1", encryptionKey: KEY });
      expect(outcome.kind).toBe("failed");
      expect((await setup.store.getClientById(setup.client.id))?.status).toBe("pending");
      expect(await licenseOf(setup.store, setup.client.id)).toBeNull();
      expect((await setup.store.listPlanPayments({ clientId: setup.client.id, limit: 5 }))[0]?.status).toBe("failed");
    }
  });
});
