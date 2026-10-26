import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { App } from "@/lib/data/types";

/**
 * 91.1 Coupons on MySQL or MariaDB: a code is once per app, and a coupon
 * with a number of uses is never used more than that, even when several
 * server instances count paid orders at the same moment. Runs only with
 * YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-10-26T10:00:00Z");

describe.skipIf(!url)("91.1 coupons on MySQL", () => {
  const pools = Array.from({ length: 4 }, () => createPool({ url: url!, ssl: "disabled" }));
  const stores = pools.map((pool) => new MysqlStore(pool));
  afterAll(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });

  it("keeps codes once per app and counts uses up to the limit", async () => {
    const store = stores[0]!;
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(store, { name: "Lale Flowers", email: `p91-${suffix}@flowers.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", connector: { kind: "catalog" } };
    await store.createApp(app);
    const other: App = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", connector: { kind: "catalog" } };
    await store.createApp(other);

    const input = { appId: app.id, code: "SPRING10", kind: "percent" as const, value: 10, minOrderCents: 30000, endsAt: new Date("2026-12-31T23:59:59Z"), maxUses: 2, active: true, createdAt: NOW };
    const coupon = (await store.createCatalogCoupon(input))!;
    expect(coupon).toMatchObject({ code: "SPRING10", usedCount: 0, maxUses: 2, minOrderCents: 30000 });
    // The same code again in the app is refused; another app may have it.
    expect(await store.createCatalogCoupon({ ...input, kind: "amount", value: 5000 })).toBeNull();
    expect(await store.createCatalogCoupon({ ...input, appId: other.id })).not.toBeNull();

    expect(await store.getCatalogCouponByCode(app.id, "SPRING10")).toMatchObject({ id: coupon.id, endsAt: input.endsAt });
    expect(await store.getCatalogCouponByCode(app.id, "NOPE")).toBeNull();

    // Four paid orders at once: two uses, never more.
    const used = await Promise.all(stores.map((s) => s.useCatalogCoupon(app.id, coupon.id)));
    expect(used.filter(Boolean)).toHaveLength(2);
    expect((await store.getCatalogCouponByCode(app.id, "SPRING10"))!.usedCount).toBe(2);
    // Another app's id does nothing.
    expect(await store.useCatalogCoupon(other.id, coupon.id)).toBe(false);

    await store.setCatalogCouponActive(app.id, coupon.id, false);
    expect((await store.listCatalogCoupons(app.id)).map((c) => [c.code, c.active])).toEqual([["SPRING10", false]]);
    await store.deleteCatalogCoupon(other.id, coupon.id);
    expect(await store.listCatalogCoupons(app.id)).toHaveLength(1);
    await store.deleteCatalogCoupon(app.id, coupon.id);
    expect(await store.listCatalogCoupons(app.id)).toEqual([]);
  });
});
