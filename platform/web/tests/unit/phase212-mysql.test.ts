import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { App } from "@/lib/data/types";

/**
 * 212 On MySQL or MariaDB (migration 0152): a customer's wishlist kept once
 * per product (two phones at once), one review per product and customer
 * (edited, its reply and hiding kept), the photo filter and the ratings, a
 * wait for stock asked again waiting again, and a product's translations
 * and brand. Runs only with YALLAPP_TEST_DATABASE_URL (a database with the
 * migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-11-23T10:00:00Z");
const PHOTO = "0b6f2f4e-9a49-4f0a-9d3c-2f6f9d1e7a11";

describe.skipIf(!url)("212 the shop's features on MySQL", () => {
  const pools = Array.from({ length: 2 }, () => createPool({ url: url!, ssl: "disabled" }));
  const stores = pools.map((pool) => new MysqlStore(pool));
  afterAll(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });

  async function setup() {
    const store = stores[0]!;
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(store, { name: "Noun", email: `p212-${suffix}@shop.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", connector: { kind: "catalog" } };
    await store.createApp(app);
    const user = (await store.createHostedUser({ appId: app.id, phone: `+90532${Math.floor(Math.random() * 1e7)}`, name: "Ahmed Kamal", email: null, city: null, now: NOW }))!;
    return { store, app, user };
  }

  it("keeps a saved product once, counts it, and removes it", async () => {
    const { store, app, user } = await setup();
    const added = await Promise.all(stores.map((s) => s.addShopWishlist(app.id, user.id, 7, NOW)));
    expect(added.filter(Boolean)).toHaveLength(1);
    await store.addShopWishlist(app.id, user.id, 8, new Date(NOW.getTime() + 1000));
    expect((await store.listShopWishlist(app.id, user.id)).map((w) => w.productId)).toEqual([8, 7]);
    expect(await store.countShopWishlist(app.id)).toEqual(expect.arrayContaining([{ productId: 7, count: 1 }]));
    await store.removeShopWishlist(app.id, user.id, 7);
    expect((await store.listShopWishlist(app.id, user.id)).map((w) => w.productId)).toEqual([8]);
  });

  it("keeps one review per product and customer, its reply and hiding through an edit", async () => {
    const { store, app, user } = await setup();
    const first = await store.saveProductReview({ appId: app.id, productId: 5, userId: user.id, rating: 3, text: "Ok", photoIds: [], authorName: "Ahmed K.", now: NOW });
    await store.updateProductReview(app.id, first.id, { replyText: "Thanks", replyAt: NOW });
    const edited = await store.saveProductReview({ appId: app.id, productId: 5, userId: user.id, rating: 5, text: "Great", photoIds: [PHOTO], authorName: "Ahmed K.", now: new Date(NOW.getTime() + 1000) });
    expect(edited).toMatchObject({ id: first.id, rating: 5, text: "Great", photoIds: [PHOTO], replyText: "Thanks", hidden: false });
    expect((await store.listProductReviews({ appId: app.id, photos: true, offset: 0, limit: 10 })).total).toBe(1);
    expect(await store.countProductRatings(app.id, [5])).toEqual([{ productId: 5, rating: 5, count: 1 }]);
    await store.updateProductReview(app.id, first.id, { hidden: true });
    expect(await store.countProductRatings(app.id, [5])).toEqual([]);
    await store.deleteProductReview(app.id, first.id);
    expect(await store.getProductReviewOf(app.id, 5, user.id)).toBeNull();
  });

  it("waits for stock once per product and variation, again after being told", async () => {
    const { store, app, user } = await setup();
    const a = await store.saveStockAlert({ appId: app.id, productId: 9, variationId: 0, userId: user.id, productName: "Coat", createdAt: NOW });
    await store.saveStockAlert({ appId: app.id, productId: 9, variationId: 12, userId: user.id, productName: "Coat", createdAt: NOW });
    expect(await store.listAppsWithStockAlerts(1000)).toContain(app.id);
    await store.markStockAlertsNotified(app.id, [a.id], NOW);
    expect((await store.listStockAlerts({ appId: app.id, waiting: true })).map((x) => x.variationId)).toEqual([12]);
    const again = await store.saveStockAlert({ appId: app.id, productId: 9, variationId: 0, userId: user.id, productName: "Coat", createdAt: new Date(NOW.getTime() + 1000) });
    expect(again.id).toBe(a.id);
    expect(again.notifiedAt).toBeNull();
    await store.deleteStockAlert(app.id, user.id, 9, 12);
    expect((await store.listStockAlerts({ appId: app.id, waiting: true })).map((x) => x.variationId)).toEqual([0]);
  });

  it("keeps a product's translations and brand", async () => {
    const { store, app } = await setup();
    const p = await store.createCatalogProduct({ appId: app.id, name: "Shirt", description: "", priceCents: 100, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null, brand: "Noun", translations: { ar: { name: "قميص" } } }, NOW);
    expect(await store.getCatalogProduct(app.id, p.id)).toMatchObject({ brand: "Noun", translations: { ar: { name: "قميص" } } });
  });
});
