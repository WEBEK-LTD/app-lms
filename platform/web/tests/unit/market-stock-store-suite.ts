import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, MarketOrderInput, MarketProductInput, RestaurantInput } from "@/lib/data/types";
import { expireUnpaidMarketOrders, UNPAID_MINUTES, UNPAID_NOTE } from "@/lib/market/expire";
import { runMarketFrequent } from "@/lib/market/daily";
import { priceOrder } from "@/lib/market/money";
import { NOW } from "./helpers";

type Row = Omit<MarketProductInput, "appId" | "vendorId">;

/**
 * 115.24 Stock, its ledger, search and keyset paging, the same on every store
 * (MemoryStore, and MySQL or MariaDB with the 115.24 migration).
 */
export function marketStockStoreSuite(store: () => DataStore, options: { big?: number } = {}) {
  async function setup(s: DataStore) {
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(s, { name: "Souk Now", email: `stock-${suffix}@market.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "food"), backend: "hosted", connector: { kind: "restaurants" } };
    await s.createApp(app);
    const vendorInput = (patch: Partial<RestaurantInput> = {}): RestaurantInput => ({
      appId: app.id,
      name: "Fresh Basket",
      description: null,
      logoAssetId: null,
      coverAssetId: null,
      cuisines: [],
      address: { address: "Maadi, Cairo", details: null, lat: 29.96, lng: 31.25 },
      phone: null,
      hours: [],
      prepMinutes: 15,
      minOrderCents: 0,
      maxKm: null,
      commissionBp: 800,
      active: true,
      position: 0,
      kind: "grocery",
      ...patch,
    });
    const vendor = await s.createRestaurant(vendorInput(), { sections: [], nextId: 1 }, NOW);
    const product = (patch: Partial<Row> = {}): Row => ({
      departmentId: null,
      aisleId: null,
      name: "Bananas",
      description: null,
      brand: null,
      sku: null,
      barcode: null,
      imageAssetId: null,
      imageUrl: null,
      price: 3500,
      wasPrice: null,
      unit: "item",
      step: 1,
      maxQuantity: null,
      stock: null,
      inStock: true,
      tags: [],
      position: 0,
      ...patch,
    });
    const make = async (patch: Partial<Row> = {}, vendorId = vendor.id) => {
      const r = await s.createMarketProduct({ ...product(patch), appId: app.id, vendorId }, NOW);
      if (!r.ok) throw new Error("product");
      return r.product;
    };
    return { app, vendor, vendorInput, product, make };
  }

  const who = { by: "customer" as const, byName: "Mona" };

  it("takes an order's counted stock all or none, never below 0, and gives it back once", async () => {
    const s = store();
    const { app, make } = await setup(s);
    const milk = await make({ name: "Milk", stock: 3 });
    const eggs = await make({ name: "Eggs", stock: 1 });
    const salt = await make({ name: "Salt", stock: null });
    // Eggs are short: nothing is taken, the milk included.
    const short = await s.takeMarketStock(app.id, 1001, [{ lineId: 1, productId: milk.id, units: 2 }, { lineId: 2, productId: eggs.id, units: 2 }], "order", who, NOW);
    expect(short).toEqual({ ok: false, productId: eggs.id, left: 1 });
    expect((await s.getMarketProduct(app.id, milk.id))!.stock).toBe(3);
    const taken = await s.takeMarketStock(app.id, 1001, [{ lineId: 1, productId: milk.id, units: 2 }, { lineId: 2, productId: eggs.id, units: 1 }, { lineId: 3, productId: salt.id, units: 5 }], "order", who, NOW);
    expect(taken.ok).toBe(true);
    expect((await s.getMarketProduct(app.id, milk.id))!.stock).toBe(1);
    // At 0 it's sold out by itself.
    expect(await s.getMarketProduct(app.id, eggs.id)).toMatchObject({ stock: 0, inStock: false });
    // Not counted: untouched, nothing in the ledger.
    expect((await s.getMarketProduct(app.id, salt.id))!.stock).toBeNull();
    // The same order and line again takes nothing more.
    expect(await s.takeMarketStock(app.id, 1001, [{ lineId: 1, productId: milk.id, units: 2 }], "order", who, NOW)).toEqual({ ok: true, moves: [] });
    const ledger = await s.listMarketStockMoves(app.id, { orderId: 1001, limit: 10 });
    expect(ledger.map((m) => [m.productId, m.reason, m.delta, m.before, m.after, m.by, m.byName]).sort()).toEqual(
      [
        [milk.id, "order", -2, 3, 1, "customer", "Mona"],
        [eggs.id, "order", -1, 1, 0, "customer", "Mona"],
      ].sort(),
    );
    // Back once: the eggs on sale again.
    const back = await s.returnMarketStock(app.id, 1001, null, { by: "vendor", byName: "Salma" }, NOW);
    expect(back).toHaveLength(2);
    expect(await s.returnMarketStock(app.id, 1001, null, { by: "vendor", byName: "Salma" }, NOW)).toEqual([]);
    expect(await s.getMarketProduct(app.id, eggs.id)).toMatchObject({ stock: 1, inStock: true });
    expect((await s.getMarketProduct(app.id, milk.id))!.stock).toBe(3);
  });

  it("gives one order the last one when several take it at the same time", async () => {
    const s = store();
    const { app, make } = await setup(s);
    const last = await make({ name: "Last loaf", stock: 1 });
    const results = await Promise.all([1, 2, 3, 4, 5].map((n) => s.takeMarketStock(app.id, 2000 + n, [{ lineId: 1, productId: last.id, units: 1 }], "order", who, NOW)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toHaveLength(4);
    expect(await s.getMarketProduct(app.id, last.id)).toMatchObject({ stock: 0, inStock: false });
    expect(await s.listMarketStockMoves(app.id, { productId: last.id, limit: 10 })).toHaveLength(1);
    // Two takes of 2 from 3: one of them.
    const three = await make({ name: "Three", stock: 3 });
    const pair = await Promise.all([3001, 3002].map((o) => s.takeMarketStock(app.id, o, [{ lineId: 1, productId: three.id, units: 2 }], "order", who, NOW)));
    expect(pair.filter((r) => r.ok)).toHaveLength(1);
    expect((await s.getMarketProduct(app.id, three.id))!.stock).toBe(1);
  });

  it("keeps the place's own stock changes in the ledger, with before and after", async () => {
    const s = store();
    const { app, vendor, make, product } = await setup(s);
    const p = await make({ name: "Rice", sku: "RICE", stock: null });
    const set = await s.setMarketStock(app.id, p.id, 12, "edit", { by: "vendor", byName: "Hany" }, NOW);
    expect(set?.move).toMatchObject({ reason: "edit", before: null, after: 12, delta: 12, by: "vendor", byName: "Hany" });
    expect((await s.setMarketStock(app.id, p.id, 12, "edit", { by: "vendor", byName: "Hany" }, NOW))?.move).toBeNull();
    await s.setMarketStock(app.id, p.id, 0, "edit", { by: "owner", byName: "Owner" }, NOW);
    expect(await s.getMarketProduct(app.id, p.id)).toMatchObject({ stock: 0, inStock: false });
    const undo = await s.setMarketStock(app.id, p.id, 12, "undo", { by: "owner", byName: "Owner" }, NOW, set!.move!.id);
    expect(undo?.move).toMatchObject({ reason: "undo", undoOf: set!.move!.id, before: 0, after: 12 });
    expect(await s.getMarketProduct(app.id, p.id)).toMatchObject({ stock: 12, inStock: true });
    const moves = await s.listMarketStockMoves(app.id, { vendorId: vendor.id, limit: 10 });
    expect(moves.map((m) => m.reason)).toEqual(["undo", "edit", "edit"]);
    expect(await s.getMarketStockMove(app.id, moves[0]!.id)).toMatchObject({ reason: "undo" });
    // An import that changes stock is in it too.
    expect(await s.upsertMarketProducts(app.id, vendor.id, [product({ name: "Rice", sku: "RICE", stock: 20 })], NOW)).toEqual({ created: 0, updated: 1 });
    expect((await s.listMarketStockMoves(app.id, { productId: p.id, limit: 1 }))[0]).toMatchObject({ reason: "import", before: 12, after: 20, delta: 8 });
    // Another app's product isn't this app's.
    const other = await setup(s);
    expect(await s.setMarketStock(other.app.id, p.id, 1, "edit", who, NOW)).toBeNull();
    expect(await s.takeMarketStock(other.app.id, 9, [{ lineId: 1, productId: p.id, units: 1 }], "order", who, NOW)).toEqual({ ok: true, moves: [] });
    expect((await s.getMarketProduct(app.id, p.id))!.stock).toBe(20);
  });

  it("searches names from their start then a word's, whatever the letters' forms, the case or the digits", async () => {
    const s = store();
    const { app, vendor, make } = await setup(s);
    await make({ name: "أرز مصري", names: { en: "Egyptian rice" } });
    await make({ name: "Basmati rice", brand: "Abu Kass" });
    await make({ name: "مكرونة إسباجتي" });
    await make({ name: "Çay İçecek", names: { tr: "Siyah çay" } });
    await make({ name: "Juice ١ لتر" });
    await make({ name: "Rice cakes" });
    const names = async (q: string) => (await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, q, page: 1, perPage: 20, cursor: "" })).items.map((p) => p.name);
    // "rice" from the start first (by name), then as a word.
    expect(await names("rice")).toEqual(["Rice cakes", "أرز مصري", "Basmati rice"]);
    // Alef with hamza typed bare, taa marbuta as haa.
    expect(await names("ارز")).toEqual(["أرز مصري"]);
    expect(await names("مكرونه")).toEqual(["مكرونة إسباجتي"]);
    expect(await names("اسباجتي")).toEqual(["مكرونة إسباجتي"]);
    // Turkish dotted and dotless i, any case; accents dropped.
    expect(await names("icecek")).toEqual(["Çay İçecek"]);
    expect(await names("CAY")).toEqual(["Çay İçecek"]);
    // Arabic-Indic digits typed either way.
    expect(await names("1 لتر")).toEqual(["Juice ١ لتر"]);
    expect(await names("abu")).toEqual(["Basmati rice"]);
    expect(await names("zzz")).toEqual([]);
    // A rename searches by the new name.
    const cakes = (await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, q: "rice cakes", page: 1, perPage: 5 })).items[0]!;
    await s.updateMarketProduct(app.id, cakes.id, { name: "Corn cakes" }, NOW);
    expect(await names("rice")).toEqual(["أرز مصري", "Basmati rice"]);
    // Page by number: counted.
    expect((await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, q: "rice", page: 1, perPage: 1 })).total).toBe(2);
  });

  it("pages a catalog by cursor: every product once, in the shelf's order, with nothing counted", async () => {
    const s = store();
    const { app, vendor, make, product } = await setup(s);
    const department = await s.saveMarketDepartment({ id: null, appId: app.id, vendorId: vendor.id, name: "Dairy", imageAssetId: null, position: 0 });
    const rows: Row[] = Array.from({ length: 95 }, (_, i) => product({ name: `Item ${String(i).padStart(3, "0")}`, sku: `S-${i}`, position: i % 7, inStock: i % 10 !== 0, departmentId: i % 2 ? department!.id : null }));
    await s.upsertMarketProducts(app.id, vendor.id, rows, NOW);
    await make({ name: "Item extra", position: 3 });
    const seen: number[] = [];
    let cursor = "";
    let pages = 0;
    for (;;) {
      const page = await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, page: 1, perPage: 20, cursor });
      expect(page.total).toBeNull();
      seen.push(...page.items.map((p) => p.id));
      pages += 1;
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    expect(pages).toBe(5);
    expect(new Set(seen).size).toBe(96);
    const byNumber = await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, page: 1, perPage: 100 });
    expect(byNumber.total).toBe(96);
    expect(seen).toEqual(byNumber.items.map((p) => p.id));
    // In stock first.
    const all = byNumber.items;
    expect(all.findIndex((p) => !p.inStock)).toBeGreaterThan(all.filter((p) => p.inStock).length - 1);
    // One department, and a search, by cursor too.
    let dairy = 0;
    cursor = "";
    for (;;) {
      const page = await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, departmentId: department!.id, page: 1, perPage: 10, cursor });
      dairy += page.items.length;
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    expect(dairy).toBe(47);
    const found: string[] = [];
    cursor = "";
    for (;;) {
      const page = await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, q: "item 0", page: 1, perPage: 7, cursor });
      found.push(...page.items.map((p) => p.name));
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    expect(found).toEqual(Array.from({ length: 95 }, (_, i) => `Item ${String(i).padStart(3, "0")}`).filter((n) => n.startsWith("Item 0")));
    // A cursor that can't be read starts again.
    expect((await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, page: 1, perPage: 5, cursor: "nonsense" })).items).toHaveLength(5);
  });

  it("searches many vendors in one go, a few of each, never another app's", async () => {
    const s = store();
    const { app, vendor, vendorInput, make } = await setup(s);
    const second = await s.createRestaurant(vendorInput({ name: "Corner" }), { sections: [], nextId: 1 }, NOW);
    for (let i = 0; i < 5; i++) await make({ name: `Tea ${i}` });
    for (let i = 0; i < 5; i++) await make({ name: `Green tea ${i}` }, second.id);
    await make({ name: "Tea sold out", stock: 0, inStock: false }, second.id);
    const other = await setup(s);
    await other.make({ name: "Tea elsewhere" });
    const hits = await s.searchMarketProducts({ appId: app.id, vendorIds: [vendor.id, second.id, other.vendor.id], q: "tea", perVendor: 3, limit: 30 });
    expect(hits.filter((p) => p.vendorId === vendor.id)).toHaveLength(3);
    expect(hits.filter((p) => p.vendorId === second.id)).toHaveLength(3);
    expect(hits.some((p) => p.name === "Tea elsewhere" || p.name === "Tea sold out")).toBe(false);
    // Names starting with it before names with it as a word.
    expect(hits[0]!.name.startsWith("Tea")).toBe(true);
    expect(await s.searchMarketProducts({ appId: app.id, vendorIds: [], q: "tea", perVendor: 3, limit: 30 })).toEqual([]);
  });

  it("keeps the catalog's changes for the owner, undone once", async () => {
    const s = store();
    const { app, vendor } = await setup(s);
    const change = await s.addMarketCatalogChange({ appId: app.id, vendorId: vendor.id, entity: "product", entityId: 7, action: "update", before: { price: 100 }, after: { price: 90 }, fields: ["price"], by: "vendor", byName: "Rana", createdAt: NOW });
    await s.addMarketCatalogChange({ appId: app.id, vendorId: vendor.id, entity: "department", entityId: 2, action: "create", before: null, after: { name: "Dairy" }, fields: [], by: "owner", byName: "Owner", createdAt: NOW });
    expect(await s.listMarketCatalogChanges(app.id, { vendorId: vendor.id, by: "vendor", limit: 10 })).toEqual([expect.objectContaining({ id: change.id, before: { price: 100 }, fields: ["price"], undoneAt: null })]);
    expect(await s.markMarketCatalogChangeUndone(app.id, change.id, NOW)).toBe(true);
    expect(await s.markMarketCatalogChangeUndone(app.id, change.id, NOW)).toBe(false);
    expect((await s.getMarketCatalogChange(app.id, change.id))!.undoneAt).toEqual(NOW);
    expect(await s.listMarketCatalogChanges(app.id, { vendorId: vendor.id, open: true, limit: 10 })).toHaveLength(1);
    const other = await setup(s);
    expect(await s.getMarketCatalogChange(other.app.id, change.id)).toBeNull();
    expect(await s.markMarketCatalogChangeUndone(other.app.id, change.id, NOW)).toBe(false);
  });


  it("hides what's out of stock from customers' lists, and shows it again once stocked", async () => {
    const s = store();
    const { app, vendor, make } = await setup(s);
    const counted = await make({ name: "Milk", stock: 2 });
    const off = await make({ name: "Milk powder", inStock: false });
    await make({ name: "Milk free", stock: null });
    const customers = async () => (await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, q: "milk", available: true, page: 1, perPage: 10, cursor: "" })).items.map((p) => p.name).sort();
    expect(await customers()).toEqual(["Milk", "Milk free"]);
    await s.takeMarketStock(app.id, 501, [{ lineId: 1, productId: counted.id, units: 2 }], "order", who, NOW);
    expect(await customers()).toEqual(["Milk free"]);
    // By number too, counted without them; the vendor's own list still has them all.
    expect((await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, available: true, page: 1, perPage: 10 })).total).toBe(1);
    expect((await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, page: 1, perPage: 10 })).total).toBe(3);
    expect(await s.searchMarketProducts({ appId: app.id, vendorIds: [vendor.id], q: "milk", perVendor: 5, limit: 10 })).toHaveLength(1);
    await s.returnMarketStock(app.id, 501, null, who, NOW);
    expect(await customers()).toEqual(["Milk", "Milk free"]);
    await s.updateMarketProduct(app.id, off.id, { inStock: true }, NOW);
    expect(await customers()).toEqual(["Milk", "Milk free", "Milk powder"]);
  });

  it("cancels online orders left unpaid, giving back their stock and coupon once, even when two runs overlap", async () => {
    const s = store();
    const { app, vendor, make } = await setup(s);
    const eggs = await make({ name: "Eggs", stock: 5 });
    const coupon = (await s.createMarketCoupon({ appId: app.id, code: `late${randomUUID().slice(0, 6)}`, title: "10% off", kind: "percent", value: 10, maxDiscount: null, minOrder: 0, currency: "EGP", paidBy: "owner", firstOrderOnly: false, vendorIds: [], vendorKinds: [], departmentIds: [], usesLimit: 1, perUserLimit: null, startsAt: null, endsAt: null, active: true, createdAt: NOW, updatedAt: NOW }))!;
    const order = (patch: Partial<MarketOrderInput>): MarketOrderInput => ({
      appId: app.id, vendorId: vendor.id, vendorName: vendor.name, vendorKind: "grocery", userId: 7, customerName: "Mariam", customerPhone: "+201001234567", fulfilment: "pickup", deliveryBy: null, scheduledFor: null,
      lines: [{ id: 1, productId: eggs.id, name: "Eggs", imageUrl: null, quantity: 2, unit: "item", choices: [], note: null, unitPrice: 3500, wasUnitPrice: null, total: 7000, ifMissing: "remove", substituteProductId: null, outcome: null, pickedQuantity: null, substitute: null }],
      money: priceOrder({ items: [{ unitPrice: 3500, quantity: 2 }], deliveryFee: 0, deliveryBy: null, commission: { kind: "percent", value: 8 }, collectedBy: "owner" }),
      currency: "EGP", paymentMethod: "card", paymentStatus: "unpaid", paymentRef: null, couponCode: coupon.code, status: "awaiting_payment", dropoff: null, distanceKm: null, notes: null, pickupCode: "1234", prepMinutes: null, readyAt: null, rejection: null, shipmentId: null, rating: null,
      timeline: [{ status: "awaiting_payment", at: NOW.toISOString(), by: "customer" }], completedAt: null, lang: "en", createdAt: NOW, updatedAt: NOW,
      ...patch,
    });
    const old = await s.createMarketOrder(order({}));
    const fresh = await s.createMarketOrder(order({ createdAt: new Date(NOW.getTime() + 25 * 60_000), couponCode: null }));
    await s.takeMarketStock(app.id, old.id, [{ lineId: 1, productId: eggs.id, units: 2 }], "order", who, NOW);
    await s.takeMarketStock(app.id, fresh.id, [{ lineId: 1, productId: eggs.id, units: 2 }], "order", who, NOW);
    expect((await s.useMarketCoupon({ appId: app.id, couponId: coupon.id, orderId: old.id, userId: 7, discount: 700, createdAt: NOW }, { usesLimit: 1, perUserLimit: null })).ok).toBe(true);
    expect((await s.getMarketProduct(app.id, eggs.id))!.stock).toBe(1);

    // Not yet: 29 minutes.
    expect(await expireUnpaidMarketOrders(s, app.id, new Date(NOW.getTime() + (UNPAID_MINUTES - 1) * 60_000))).toBe(0);
    const later = new Date(NOW.getTime() + (UNPAID_MINUTES + 1) * 60_000);
    const runs = await Promise.all([expireUnpaidMarketOrders(s, app.id, later), expireUnpaidMarketOrders(s, app.id, later)]);
    expect(runs[0]! + runs[1]!).toBe(1);
    expect(await s.getMarketOrder(app.id, old.id)).toMatchObject({ status: "cancelled", rejection: { reason: "other", note: UNPAID_NOTE } });
    expect((await s.getMarketOrder(app.id, old.id))!.timeline.at(-1)).toMatchObject({ status: "cancelled", by: "system" });
    // Its two eggs back once; the order made 25 minutes in still holds its own.
    expect((await s.getMarketProduct(app.id, eggs.id))!.stock).toBe(3);
    expect((await s.listMarketStockMoves(app.id, { orderId: old.id, limit: 5 })).filter((m) => m.reason === "return")).toHaveLength(1);
    expect(await s.getMarketOrder(app.id, fresh.id)).toMatchObject({ status: "awaiting_payment" });
    // The coupon's only use is free again.
    expect(await s.countMarketCouponUses(app.id, coupon.id)).toBe(0);
    expect(await expireUnpaidMarketOrders(s, app.id, later)).toBe(0);
    // The frequent job does it every 5 minutes: the order made 25 minutes in, once its 30 are up.
    const after = new Date(fresh.createdAt.getTime() + (UNPAID_MINUTES + 1) * 60_000);
    await runMarketFrequent(s, after);
    expect(await s.getMarketOrder(app.id, fresh.id)).toMatchObject({ status: "cancelled", rejection: { note: UNPAID_NOTE } });
    expect((await s.getMarketProduct(app.id, eggs.id))!.stock).toBe(5);
  });

  if (options.big) {
    const big = options.big;
    it(`stays fast on a catalog of ${big.toLocaleString("en")} products: a page, a search, a deep cursor`, async () => {
      const s = store();
      const { app, vendor, product } = await setup(s);
      const words = ["milk", "cheese", "rice", "tea", "juice", "bread", "حليب", "جبنة", "أرز", "çay"];
      const rows: Row[] = Array.from({ length: big }, (_, i) => product({ name: `${words[i % words.length]} ${i}`, sku: `B-${i}`, barcode: String(6220000000000 + i), position: i % 100, stock: i % 3 ? 10 : null }));
      for (let start = 0; start < rows.length; start += 5000) await s.upsertMarketProducts(app.id, vendor.id, rows.slice(start, start + 5000), NOW);
      const time = async <T,>(f: () => Promise<T>) => {
        const t0 = performance.now();
        const value = await f();
        return { value, ms: performance.now() - t0 };
      };
      const first = await time(() => s.listMarketProducts({ appId: app.id, vendorId: vendor.id, page: 1, perPage: 20, cursor: "" }));
      expect(first.value.items).toHaveLength(20);
      // Far down the catalog by cursor.
      let cursor = first.value.nextCursor!;
      for (let i = 0; i < 30; i++) cursor = (await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, page: 1, perPage: 50, cursor })).nextCursor!;
      const deep = await time(() => s.listMarketProducts({ appId: app.id, vendorId: vendor.id, page: 1, perPage: 20, cursor }));
      const search = await time(() => s.listMarketProducts({ appId: app.id, vendorId: vendor.id, q: "حليب", page: 1, perPage: 20, cursor: "" }));
      expect(search.value.items).toHaveLength(20);
      expect(search.value.items.every((p) => p.name.startsWith("حليب"))).toBe(true);
      const arabic = await time(() => s.listMarketProducts({ appId: app.id, vendorId: vendor.id, q: "ارز", page: 1, perPage: 20, cursor: "" }));
      expect(arabic.value.items[0]!.name.startsWith("أرز")).toBe(true);
      const code = await time(() => s.listMarketProducts({ appId: app.id, vendorId: vendor.id, code: String(6220000000000 + big - 1), page: 1, perPage: 1 }));
      expect(code.value.items[0]!.sku).toBe(`B-${big - 1}`);
      const across = await time(() => s.searchMarketProducts({ appId: app.id, vendorIds: [vendor.id], q: "tea", perVendor: 3, limit: 30 }));
      expect(across.value).toHaveLength(3);
      const counted = await time(() => s.listMarketProducts({ appId: app.id, vendorId: vendor.id, page: 1, perPage: 20 }));
      expect(counted.value.total).toBe(Math.min(big, 10_000));
      for (const [what, t] of Object.entries({ first, deep, search, arabic, code, across, counted })) expect(t.ms, `${what} took ${Math.round(t.ms)} ms`).toBeLessThan(400);
    }, 600_000);
  }
}
