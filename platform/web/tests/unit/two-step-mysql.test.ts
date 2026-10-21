import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import { couponClaimLimits } from "@/lib/billing/coupons";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { Coupon, CouponRedemption, PlanPayment } from "@/lib/data/types";

/**
 * 70 On MySQL or MariaDB (migration 0050): sessions kept on the server, the
 * two-step secret and recovery codes (each code once, also when two requests
 * use it at the same moment), and a coupon's use limit under two payments
 * at once on two connections (roadmap 69.15). Runs only with
 * YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-10-21T09:00:00.000Z");

describe.skipIf(!url)("70 two-step sign-in, sessions and coupon limits on MySQL", () => {
  // Two pools: two connections, so the requests below really run at the same time.
  const poolA = createPool({ url: url!, ssl: "disabled" });
  const poolB = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(poolA);
  const other = new MysqlStore(poolB);
  afterAll(async () => {
    await poolA.end();
    await poolB.end();
  });

  const newClient = () => registerClient(store, { name: "Ada", email: `ada-${randomUUID()}@mysql.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);

  it("keeps sessions on the server: one, all of a person's, and the expired ones", async () => {
    const { user } = await newClient();
    const hash = () => randomUUID().replace(/-/g, "").padEnd(64, "0");
    const a = { idHash: hash(), userId: user.id, createdAt: NOW, expiresAt: new Date(NOW.getTime() + 3_600_000) };
    const b = { ...a, idHash: hash() };
    const old = { ...a, idHash: hash(), expiresAt: new Date(NOW.getTime() - 1000) };
    for (const s of [a, b, old]) await store.createUserSession(s);
    expect(await store.getUserSession(a.idHash)).toEqual(a);
    await store.deleteUserSession(a.idHash);
    expect(await store.getUserSession(a.idHash)).toBeNull();
    expect(await store.deleteExpiredUserSessions(NOW)).toBeGreaterThanOrEqual(1);
    expect(await store.getUserSession(old.idHash)).toBeNull();
    expect(await store.getUserSession(b.idHash)).toEqual(b);
    expect(await store.deleteUserSessions(user.id)).toBe(1);
    expect(await store.getUserSession(b.idHash)).toBeNull();
  });

  it("keeps a waiting setup until its first code, and takes each step and recovery code once", async () => {
    const { user } = await newClient();
    expect(await store.getTwoFactor(user.id)).toBeNull();
    expect(await store.saveTwoFactorSetup(user.id, "v1.first", NOW)).toBe(true);
    expect(await store.saveTwoFactorSetup(user.id, "v1.second", NOW)).toBe(true);
    expect(await store.getTwoFactor(user.id)).toMatchObject({ secretEncrypted: "v1.second", enabledAt: null, lastStep: 0 });
    // No step is claimed while it waits.
    expect(await store.useTwoFactorStep(user.id, 100, NOW)).toBe(false);

    const hashes = Array.from({ length: 10 }, (_, i) => `${i}`.padStart(64, "a"));
    const enabled = await Promise.all([store.enableTwoFactor(user.id, 100, hashes, NOW), other.enableTwoFactor(user.id, 100, hashes, NOW)]);
    expect(enabled.filter(Boolean)).toHaveLength(1);
    expect(await store.saveTwoFactorSetup(user.id, "v1.third", NOW)).toBe(false);
    expect(await store.getTwoFactor(user.id)).toMatchObject({ secretEncrypted: "v1.second", enabledAt: NOW, lastStep: 100 });
    expect(await store.countUnusedRecoveryCodes(user.id)).toBe(10);

    // The same code twice at the same moment: one wins. An older step never works after a newer one.
    const steps = await Promise.all([store.useTwoFactorStep(user.id, 101, NOW), other.useTwoFactorStep(user.id, 101, NOW)]);
    expect(steps.filter(Boolean)).toHaveLength(1);
    expect(await store.useTwoFactorStep(user.id, 100, NOW)).toBe(false);
    expect(await store.useTwoFactorStep(user.id, 103, NOW)).toBe(true);

    const codes = await Promise.all([store.useRecoveryCode(user.id, hashes[0]!, NOW), other.useRecoveryCode(user.id, hashes[0]!, NOW)]);
    expect(codes.filter(Boolean)).toHaveLength(1);
    expect(await store.useRecoveryCode(user.id, "f".repeat(64), NOW)).toBe(false);
    expect(await store.countUnusedRecoveryCodes(user.id)).toBe(9);
    await store.replaceRecoveryCodes(user.id, ["b".repeat(64)], NOW);
    expect(await store.countUnusedRecoveryCodes(user.id)).toBe(1);
    expect(await store.useRecoveryCode(user.id, hashes[1]!, NOW)).toBe(false);

    expect(await store.deleteTwoFactor(user.id)).toBe(true);
    expect(await store.deleteTwoFactor(user.id)).toBe(false);
    expect(await store.getTwoFactor(user.id)).toBeNull();
    expect(await store.countUnusedRecoveryCodes(user.id)).toBe(0);
  });

  it("never lets two payments at the same moment pass a coupon's use limit", async () => {
    const coupon: Coupon = {
      id: randomUUID(),
      code: `RACE${randomUUID().slice(0, 8).toUpperCase()}`,
      note: "",
      discount: { kind: "percent", percent: 20 },
      plans: null,
      periods: null,
      validFrom: null,
      validUntil: null,
      maxRedemptions: 2,
      maxPerClient: null,
      firstPaymentOnly: false,
      active: true,
      createdAt: NOW,
      updatedAt: NOW,
      createdBy: "admin@yallapp.test",
    };
    expect(await store.createCoupon(coupon)).toBe(true);
    const clients = await Promise.all(Array.from({ length: 6 }, () => newClient()));
    const attempt = (s: MysqlStore, clientId: string) => {
      const payment: PlanPayment = {
        id: randomUUID(),
        clientId,
        appId: null,
        plan: "pro",
        months: 12,
        amountCents: 384000,
        currency: "USD",
        status: "pending",
        tokenHash: randomUUID().replace(/-/g, "").padEnd(64, "0"),
        paymentId: null,
        createdAt: NOW,
        paidAt: null,
      };
      const redemption: CouponRedemption = {
        couponId: coupon.id,
        paymentId: payment.id,
        clientId,
        code: coupon.code,
        plan: "pro",
        fullCents: 480000,
        discountCents: 96000,
        currency: "USD",
        status: "pending",
        createdAt: NOW,
        redeemedAt: null,
      };
      return s.claimCouponRedemption(redemption, couponClaimLimits(coupon, NOW), payment);
    };
    // Six payments of six clients, three on each connection, all at once: exactly two get the coupon.
    const results = await Promise.all(clients.map(({ client }, i) => attempt(i % 2 ? other : store, client.id)));
    expect(results.filter(Boolean)).toHaveLength(2);
    const uses = await store.listCouponRedemptions({ couponId: coupon.id });
    expect(uses).toHaveLength(2);
    // Only the payments that got their use were recorded.
    for (const { client } of clients) {
      const payments = await store.listPlanPayments({ clientId: client.id, limit: 5 });
      expect(payments.length).toBe(uses.some((u) => u.clientId === client.id) ? 1 : 0);
    }

    // Per client: one use each, also when the same client pays twice at once.
    const perClient: Coupon = { ...coupon, id: randomUUID(), code: `${coupon.code}X`, maxRedemptions: null, maxPerClient: 1 };
    expect(await store.createCoupon(perClient)).toBe(true);
    const { client } = await newClient();
    const twice = await Promise.all([store, other].map((s) => {
      const payment: PlanPayment = { id: randomUUID(), clientId: client.id, appId: null, plan: "pro", months: 12, amountCents: 1, currency: "USD", status: "pending", tokenHash: randomUUID().replace(/-/g, "").padEnd(64, "1"), paymentId: null, createdAt: NOW, paidAt: null };
      return s.claimCouponRedemption(
        { couponId: perClient.id, paymentId: payment.id, clientId: client.id, code: perClient.code, plan: "pro", fullCents: 2, discountCents: 1, currency: "USD", status: "pending", createdAt: NOW, redeemedAt: null },
        couponClaimLimits(perClient, NOW),
        payment,
      );
    }));
    expect(twice.filter(Boolean)).toHaveLength(1);
    // A pending use older than the hold no longer counts: the place is free again.
    const later = new Date(NOW.getTime() + 2 * 3_600_000);
    expect(couponClaimLimits(perClient, later).pendingSince.getTime()).toBeGreaterThan(NOW.getTime());
  });
});
