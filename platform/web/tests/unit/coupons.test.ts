import { describe, expect, it } from "vitest";
import { checkCoupon, couponFormValues, couponPrice, findCoupon, MIN_CARD_CENTS, readCouponForm } from "@/lib/billing/coupons";
import { activateWithFreeCoupon, completePlanPayment, startPlanPayment } from "@/lib/billing/plan-payment";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { Coupon, CouponRedemption } from "@/lib/data/types";
import type { IyzicoKeys } from "@/lib/payments/iyzico";
import { PLAN_INFO, plansWith } from "@/lib/plans";
import { days, KEY, licenseOf, NOW, setupClient } from "./helpers";

const IYZICO: IyzicoKeys = { apiKey: "yallapp-api", secretKey: "yallapp-secret", sandbox: true };
const PLANS = plansWith({
  pro: { ...PLAN_INFO.pro, highlights: [...PLAN_INFO.pro.highlights], features: [...PLAN_INFO.pro.features], priceCents: 480000, currency: "TRY", billingMonths: 12 },
  starter: { ...PLAN_INFO.starter, highlights: [], features: [], priceCents: 20000, currency: "USD", billingMonths: 1 },
});

function coupon(patch: Partial<Coupon> = {}): Coupon {
  return {
    id: "c0ffee00-0000-4000-8000-000000000001",
    code: "WELCOME20",
    note: "",
    discount: { kind: "percent", percent: 20 },
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
    ...patch,
  };
}

function use(patch: Partial<CouponRedemption> = {}): CouponRedemption {
  return {
    couponId: coupon().id,
    paymentId: `p-${Math.random()}`,
    clientId: "client-1",
    code: "WELCOME20",
    plan: "pro",
    fullCents: 480000,
    discountCents: 96000,
    currency: "TRY",
    status: "redeemed",
    createdAt: days(-1),
    redeemedAt: days(-1),
    ...patch,
  };
}

const client = { id: "client-1", activatedAt: null };

describe("coupon prices", () => {
  it("takes a percentage or a fixed amount in the plan's currency", () => {
    expect(couponPrice({ kind: "percent", percent: 20 }, PLANS.pro)).toEqual({ fullCents: 480000, discountCents: 96000, amountCents: 384000 });
    expect(couponPrice({ kind: "percent", percent: 33 }, { priceCents: 999, currency: "TRY" })).toEqual({ fullCents: 999, discountCents: 330, amountCents: 669 });
    expect(couponPrice({ kind: "fixed", amounts: { TRY: 50000, USD: 1000 } }, PLANS.pro)).toEqual({ fullCents: 480000, discountCents: 50000, amountCents: 430000 });
    expect(couponPrice({ kind: "fixed", amounts: { USD: 1000 } }, PLANS.starter)).toEqual({ fullCents: 20000, discountCents: 1000, amountCents: 19000 });
    // No amount in the plan's currency: the coupon doesn't apply.
    expect(couponPrice({ kind: "fixed", amounts: { EUR: 1000 } }, PLANS.pro)).toBeNull();
  });

  it("never goes below iyzico's minimum, and is free only at the whole price", () => {
    expect(couponPrice({ kind: "fixed", amounts: { TRY: 479950 } }, PLANS.pro)).toEqual({ fullCents: 480000, discountCents: 480000 - MIN_CARD_CENTS, amountCents: MIN_CARD_CENTS });
    expect(couponPrice({ kind: "percent", percent: 100 }, PLANS.pro)).toEqual({ fullCents: 480000, discountCents: 480000, amountCents: 0 });
    expect(couponPrice({ kind: "fixed", amounts: { TRY: 9_000_000 } }, PLANS.pro)).toEqual({ fullCents: 480000, discountCents: 480000, amountCents: 0 });
  });
});

describe("coupon rules", () => {
  const check = (c: Coupon | null, redemptions: CouponRedemption[] = [], plan = PLANS.pro, who: { id: string; activatedAt: Date | null } = client) =>
    checkCoupon({ coupon: c, plan, client: who, redemptions, now: NOW });

  it("applies an active coupon", () => {
    expect(check(coupon())).toMatchObject({ ok: true, amountCents: 384000, discountCents: 96000 });
  });

  it("refuses unknown, switched off, early and expired coupons", () => {
    expect(check(null)).toEqual({ ok: false, error: "This coupon code isn't valid." });
    expect(check(coupon({ active: false }))).toEqual({ ok: false, error: "This coupon code isn't valid." });
    expect(check(coupon({ validFrom: days(1) }))).toEqual({ ok: false, error: "This coupon isn't valid yet." });
    expect(check(coupon({ validUntil: days(-1) }))).toEqual({ ok: false, error: "This coupon has expired." });
    expect(check(coupon({ validFrom: days(-1), validUntil: days(1) })).ok).toBe(true);
  });

  it("applies to the chosen plans and billing periods only", () => {
    expect(check(coupon({ plans: ["starter"] }))).toEqual({ ok: false, error: "This coupon doesn't apply to the Pro plan." });
    expect(check(coupon({ periods: [1] }))).toEqual({ ok: false, error: "This coupon doesn't apply to yearly billing." });
    expect(check(coupon({ plans: ["pro"], periods: [12] })).ok).toBe(true);
    expect(check(coupon({ discount: { kind: "fixed", amounts: { USD: 500 } } }))).toEqual({ ok: false, error: "This coupon doesn't apply to payments in TRY." });
  });

  it("keeps first-payment coupons for clients never activated", () => {
    expect(check(coupon({ firstPaymentOnly: true })).ok).toBe(true);
    expect(check(coupon({ firstPaymentOnly: true }), [], PLANS.pro, { id: "client-1", activatedAt: days(-30) })).toEqual({
      ok: false,
      error: "This coupon is for a first payment only.",
    });
  });

  it("counts used and recent pending uses against the limits, not failed or abandoned ones", () => {
    const limited = coupon({ maxRedemptions: 2, maxPerClient: 1 });
    expect(check(limited, [use({ clientId: "other" })]).ok).toBe(true);
    expect(check(limited, [use({ clientId: "other" }), use({ clientId: "third" })])).toEqual({ ok: false, error: "This coupon has been used up." });
    expect(check(limited, [use()])).toEqual({ ok: false, error: "You've already used this coupon." });
    expect(check(limited, [use({ status: "pending", createdAt: new Date(NOW.getTime() - 10 * 60_000), redeemedAt: null })])).toEqual({
      ok: false,
      error: "You've already used this coupon.",
    });
    expect(check(limited, [use({ status: "pending", createdAt: new Date(NOW.getTime() - 2 * 3600_000), redeemedAt: null }), use({ status: "failed" })]).ok).toBe(true);
  });
});

describe("the admin's coupon form", () => {
  const form = (values: Record<string, string>, plans = ["starter", "pro"], periods = ["1", "12"]) => readCouponForm({ values, plans, periods });

  it("reads a coupon, storing every plan or period ticked as all", () => {
    expect(
      form({ code: " welcome 20 ", note: "Launch", kind: "percent", percent: "20", validFrom: "2026-10-01", validUntil: "2026-10-31", maxRedemptions: "100", maxPerClient: "1", firstPaymentOnly: "on", active: "on" }),
    ).toEqual({
      ok: true,
      coupon: {
        code: "WELCOME20",
        note: "Launch",
        discount: { kind: "percent", percent: 20 },
        plans: null,
        periods: null,
        validFrom: new Date("2026-10-01T00:00:00.000Z"),
        validUntil: new Date("2026-10-31T23:59:59.999Z"),
        maxRedemptions: 100,
        maxPerClient: 1,
        firstPaymentOnly: true,
        active: true,
      },
    });
    expect(form({ code: "PRO500", kind: "fixed", amountTRY: "500", amountUSD: "", amountEUR: "19,90" }, ["pro"], ["12"])).toMatchObject({
      ok: true,
      coupon: { discount: { kind: "fixed", amounts: { TRY: 50000, EUR: 1990 } }, plans: ["pro"], periods: [12], active: false, maxRedemptions: null },
    });
  });

  it("says what's wrong", () => {
    expect(form({ code: "x", kind: "percent", percent: "120", validFrom: "2026-10-10", validUntil: "2026-10-01", maxPerClient: "0" }, [], [])).toEqual({
      ok: false,
      errors: {
        code: "Use 3 to 40 letters, digits, - or _.",
        percent: "Enter a whole percentage from 1 to 100.",
        plans: "Choose at least one plan.",
        periods: "Choose at least one billing period.",
        validUntil: "Choose a day on or after the first day.",
        maxPerClient: "Enter a whole number, or leave it empty for no limit.",
      },
    });
    expect(form({ code: "FIXED", kind: "fixed" })).toEqual({ ok: false, errors: { amountTRY: "Enter the amount off in at least one currency." } });
  });

  it("shows a saved coupon as it reads it", () => {
    const saved = coupon({ discount: { kind: "fixed", amounts: { TRY: 50000 } }, plans: ["pro"], validUntil: new Date("2026-10-31T23:59:59.999Z") });
    const values = couponFormValues(saved);
    expect(values).toMatchObject({ kind: "fixed", amountTRY: "500.00", plans: "pro", periods: "1,12", validUntil: "2026-10-31" });
    const { firstPaymentOnly, active, plans, periods, ...text } = values;
    const read = form({ ...text, ...(firstPaymentOnly ? { firstPaymentOnly: "on" } : {}), ...(active ? { active: "on" } : {}) }, plans.split(","), periods.split(","));
    expect(read).toMatchObject({ ok: true, coupon: { discount: saved.discount, plans: saved.plans, validUntil: saved.validUntil } });
  });
});

describe("plan payments with a coupon", () => {
  function fakeIyzico() {
    const started: Record<string, unknown>[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      if (url.endsWith("/checkoutform/initialize/auth/ecom")) {
        started.push(body);
        return Response.json({ status: "success", token: "iyzi-1", paymentPageUrl: "https://iyzico.test/pay/iyzi-1" });
      }
      const first = started[0]!;
      return Response.json({ status: "success", paymentStatus: "SUCCESS", paymentId: "9001", paidPrice: Number(first.paidPrice), basketId: first.basketId });
    }) as unknown as typeof fetch;
    return { fetcher, started };
  }

  it("charges the lowered price and records the use with the payment", async () => {
    const setup = await setupClient({ activate: false });
    await setup.store.createCoupon(coupon());
    const check = await findCoupon(setup.store, { code: "welcome20", plan: PLANS.pro, client: setup.client, now: NOW });
    expect(check).toMatchObject({ ok: true, amountCents: 384000 });
    if (!check.ok) return;
    const iyzico = fakeIyzico();
    let token = "";
    await startPlanPayment({
      store: setup.store,
      keys: IYZICO,
      fetcher: iyzico.fetcher,
      now: NOW,
      client: setup.client,
      user: setup.user,
      plan: PLANS.pro,
      billing: { city: "Istanbul", address: "Bağdat Caddesi 1, Kadıköy" },
      ip: "203.0.113.5",
      callbackUrl: (t) => {
        token = t;
        return `https://yallapp.test/api/pay/plan/${t}`;
      },
      coupon: check,
    });
    expect(iyzico.started[0]).toMatchObject({ price: "3840.00", paidPrice: "3840.00", basketItems: [{ price: "3840.00" }] });
    const payment = (await setup.store.getPlanPaymentByToken(sha256Hex(token)))!;
    expect(payment.amountCents).toBe(384000);
    expect(await setup.store.listCouponRedemptions({ couponId: coupon().id })).toMatchObject([{ paymentId: payment.id, status: "pending", fullCents: 480000, discountCents: 96000 }]);

    const outcome = await completePlanPayment({ store: setup.store, keys: IYZICO, fetcher: iyzico.fetcher, now: NOW, payment, iyzicoToken: "iyzi-1", encryptionKey: KEY });
    expect(outcome.kind).toBe("paid");
    expect(await setup.store.listCouponRedemptions({ clientId: setup.client.id })).toMatchObject([{ status: "redeemed", redeemedAt: NOW }]);
    expect((await setup.store.getClientById(setup.client.id))!.status).toBe("active");
  });

  it("activates without a card payment when the coupon takes the whole price", async () => {
    const setup = await setupClient({ activate: false });
    await setup.store.createCoupon(coupon({ code: "FREEPRO", discount: { kind: "percent", percent: 100 }, maxPerClient: 1 }));
    const check = await findCoupon(setup.store, { code: "FreePro", plan: PLANS.pro, client: setup.client, now: NOW });
    if (!check.ok) throw new Error(check.error);
    const outcome = await activateWithFreeCoupon({ store: setup.store, client: setup.client, plan: PLANS.pro, coupon: check, encryptionKey: KEY, now: NOW });
    expect(outcome.activation.created).toBe(true);
    expect(outcome.payment).toMatchObject({ amountCents: 0, status: "paid", paymentId: null, paidAt: NOW });
    expect(await setup.store.listPlanPayments({ clientId: setup.client.id, limit: 5 })).toMatchObject([{ amountCents: 0, status: "paid" }]);
    expect(await setup.store.listCouponRedemptions({ clientId: setup.client.id })).toMatchObject([{ code: "FREEPRO", status: "redeemed", discountCents: 480000 }]);
    const license = (await licenseOf(setup.store, setup.client.id))!;
    expect(license.plan).toBe("pro");
    expect(license.expiresAt.getUTCFullYear()).toBe(NOW.getUTCFullYear() + 1);
    // The coupon was for one use per client.
    const again = await findCoupon(setup.store, { code: "FREEPRO", plan: PLANS.pro, client: setup.client, now: NOW });
    expect(again).toEqual({ ok: false, error: "You've already used this coupon." });
  });

  it("keeps coupon codes unique, in any case", async () => {
    const setup = await setupClient({ activate: false });
    expect(await setup.store.createCoupon(coupon())).toBe(true);
    expect(await setup.store.createCoupon(coupon({ id: "c0ffee00-0000-4000-8000-000000000002" }))).toBe(false);
    expect(await findCoupon(setup.store, { code: "nope", plan: PLANS.pro, client: setup.client, now: NOW })).toEqual({ ok: false, error: "This coupon code isn't valid." });
  });
});
