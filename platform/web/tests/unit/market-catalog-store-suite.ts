import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, MarketProductInput, RestaurantInput } from "@/lib/data/types";
import { NOW } from "./helpers";

/** 115.3 The marketplace's vendors and catalogs, the same on every store (MemoryStore, and MySQL or MariaDB with migration 0113). */
export function marketCatalogStoreSuite(store: () => DataStore) {
  async function setup(s: DataStore) {
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(s, { name: "Souk Now", email: `souk-${suffix}@market.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "food"), backend: "hosted" };
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
      ...patch,
    });
    const product = (patch: Partial<Omit<MarketProductInput, "appId" | "vendorId">> = {}): Omit<MarketProductInput, "appId" | "vendorId"> => ({
      departmentId: null,
      aisleId: null,
      name: "Bananas",
      description: "Sweet, from Upper Egypt",
      brand: null,
      sku: null,
      barcode: null,
      imageAssetId: null,
      imageUrl: null,
      price: 3500,
      wasPrice: null,
      unit: "kg",
      step: 0.5,
      maxQuantity: 10,
      stock: null,
      inStock: true,
      tags: ["organic"],
      position: 0,
      ...patch,
    });
    return { app, vendorInput, product };
  }

  it("keeps a vendor's kind, delivery terms and marketplace fields, with 105.1's defaults", async () => {
    const s = store();
    const { app, vendorInput } = await setup(s);
    const old = await s.createRestaurant(vendorInput({ name: "Abou Tarek" }), { sections: [], nextId: 1 }, NOW);
    expect(await s.getRestaurant(app.id, old.id)).toMatchObject({ kind: "restaurant", delivery: null, commissionFixed: null, taxRateBp: null, paused: false, area: null });
    const delivery = { by: "vendor" as const, feeKind: "per_km" as const, fee: 1500, perKm: 300, freeOver: 30000, minItems: 2, maxItems: 40, pickup: true, scheduling: true };
    const grocery = await s.createRestaurant(vendorInput({ kind: "grocery", delivery, commissionFixed: 500, taxRateBp: 1400, area: "Maadi" }), { sections: [], nextId: 1 }, NOW);
    expect(await s.getRestaurant(app.id, grocery.id)).toMatchObject({ kind: "grocery", delivery, commissionFixed: 500, taxRateBp: 1400, area: "Maadi", paused: false });
    await s.updateRestaurant(app.id, grocery.id, { paused: true, delivery: { ...delivery, by: "app" } }, NOW);
    expect(await s.getRestaurant(app.id, grocery.id)).toMatchObject({ paused: true, delivery: { by: "app" } });
    const staff = await s.createRestaurantStaff({ appId: app.id, restaurantId: grocery.id, name: "Picker", phone: `+2010${suffixDigits()}`, email: null, active: true, role: "picker" }, NOW);
    expect(staff.ok && staff.staff.role).toBe("picker");
    const plain = await s.createRestaurantStaff({ appId: app.id, restaurantId: old.id, name: "Cashier", phone: `+2011${suffixDigits()}`, email: null, active: true }, NOW);
    expect(plain.ok && (await s.listRestaurantStaff(app.id, old.id))[0]!.role).toBe("manager");
  });

  it("keeps departments and aisles in order, only the vendor's own", async () => {
    const s = store();
    const { app, vendorInput } = await setup(s);
    const vendor = await s.createRestaurant(vendorInput({ kind: "grocery" }), { sections: [], nextId: 1 }, NOW);
    const other = await setup(s);
    const theirs = await s.createRestaurant(other.vendorInput({ kind: "grocery" }), { sections: [], nextId: 1 }, NOW);
    const fruit = (await s.saveMarketDepartment({ id: null, appId: app.id, vendorId: vendor.id, name: "Fruit & vegetables", imageAssetId: null, position: 1 }))!;
    const dairy = (await s.saveMarketDepartment({ id: null, appId: app.id, vendorId: vendor.id, name: "Dairy", imageAssetId: null, position: 0 }))!;
    expect((await s.listMarketDepartments(app.id, vendor.id)).map((d) => d.name)).toEqual(["Dairy", "Fruit & vegetables"]);
    // Another app's vendor, or a department of another vendor: refused.
    expect(await s.saveMarketDepartment({ id: null, appId: app.id, vendorId: theirs.id, name: "X", imageAssetId: null, position: 0 })).toBeNull();
    expect(await s.saveMarketDepartment({ id: fruit.id, appId: other.app.id, vendorId: theirs.id, name: "Stolen", imageAssetId: null, position: 0 })).toBeNull();
    const fresh = (await s.saveMarketAisle({ id: null, appId: app.id, vendorId: vendor.id, departmentId: fruit.id, name: "Fresh fruit", position: 0 }))!;
    expect(await s.saveMarketAisle({ id: null, appId: other.app.id, vendorId: theirs.id, departmentId: fruit.id, name: "X", position: 0 })).toBeNull();
    expect((await s.listMarketAisles(app.id, vendor.id, fruit.id)).map((a) => a.id)).toEqual([fresh.id]);
    const renamed = await s.saveMarketDepartment({ ...dairy, name: "Dairy & eggs" });
    expect(renamed?.name).toBe("Dairy & eggs");
    await s.deleteMarketDepartment(app.id, vendor.id, fruit.id);
    expect(await s.listMarketAisles(app.id, vendor.id)).toEqual([]);
  });

  it("lists products in stock first, searches them and finds them by code", async () => {
    const s = store();
    const { app, vendorInput, product } = await setup(s);
    const vendor = await s.createRestaurant(vendorInput({ kind: "grocery" }), { sections: [], nextId: 1 }, NOW);
    const dept = (await s.saveMarketDepartment({ id: null, appId: app.id, vendorId: vendor.id, name: "Fruit", imageAssetId: null, position: 0 }))!;
    const make = async (patch: Partial<MarketProductInput>) => {
      const made = await s.createMarketProduct({ ...product(), appId: app.id, vendorId: vendor.id, departmentId: dept.id, ...patch }, NOW);
      if (!made.ok) throw new Error(made.reason);
      return made.product;
    };
    const bananas = await make({ name: "Bananas", sku: "B-1", barcode: "6221000000017", position: 2 });
    await make({ name: "Apples", sku: "A-1", position: 1, inStock: false });
    await make({ name: "Oranges", sku: null, brand: "Nile Farms", position: 3 });
    const page = await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, page: 1, perPage: 10 });
    expect(page.total).toBe(3);
    expect(page.items.map((p) => p.name)).toEqual(["Bananas", "Oranges", "Apples"]);
    expect((await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, q: "nile", page: 1, perPage: 10 })).items.map((p) => p.name)).toEqual(["Oranges"]);
    expect((await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, code: "6221000000017", page: 1, perPage: 10 })).items[0]?.id).toBe(bananas.id);
    expect((await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, outOfStock: true, page: 1, perPage: 10 })).items.map((p) => p.name)).toEqual(["Apples"]);
    expect((await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, page: 2, perPage: 2 })).items.map((p) => p.name)).toEqual(["Apples"]);
    expect(await s.createMarketProduct({ ...product(), appId: app.id, vendorId: vendor.id, sku: "B-1" }, NOW)).toEqual({ ok: false, reason: "duplicate_sku" });
    expect(await s.updateMarketProduct(app.id, bananas.id, { sku: "A-1" }, NOW)).toEqual({ ok: false, reason: "duplicate_sku" });
    expect(await s.updateMarketProduct(app.id, bananas.id, { price: 3900, stock: 0, inStock: false }, NOW)).toEqual({ ok: true });
    expect(await s.getMarketProduct(app.id, bananas.id)).toMatchObject({ price: 3900, stock: 0, inStock: false, unit: "kg", step: 0.5, tags: ["organic"] });
    // Another app never reads or changes it.
    const other = await setup(s);
    expect(await s.getMarketProduct(other.app.id, bananas.id)).toBeNull();
    expect(await s.updateMarketProduct(other.app.id, bananas.id, { price: 1 }, NOW)).toEqual({ ok: false });
    await s.deleteMarketProduct(other.app.id, bananas.id);
    expect(await s.getMarketProduct(app.id, bananas.id)).not.toBeNull();
    await s.deleteMarketProduct(app.id, bananas.id);
    expect(await s.getMarketProduct(app.id, bananas.id)).toBeNull();
  });

  it("an import updates by SKU, else by barcode, and adds the rest", async () => {
    const s = store();
    const { app, vendorInput, product } = await setup(s);
    const vendor = await s.createRestaurant(vendorInput({ kind: "shop" }), { sections: [], nextId: 1 }, NOW);
    const first = await s.upsertMarketProducts(app.id, vendor.id, [product({ name: "Milk 1L", sku: "M-1", unit: "item", step: 1 }), product({ name: "Eggs x30", barcode: "6223000000011", unit: "item", step: 1 })], NOW);
    expect(first).toEqual({ created: 2, updated: 0 });
    const again = await s.upsertMarketProducts(
      app.id,
      vendor.id,
      [product({ name: "Milk 1L full cream", sku: "M-1", price: 4200, unit: "item", step: 1 }), product({ name: "Eggs x30 (white)", barcode: "6223000000011", unit: "item", step: 1 }), product({ name: "Bread", sku: "BR-1", unit: "item", step: 1 })],
      NOW,
    );
    expect(again).toEqual({ created: 1, updated: 2 });
    const names = (await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, page: 1, perPage: 10 })).items.map((p) => p.name).sort();
    expect(names).toEqual(["Bread", "Eggs x30 (white)", "Milk 1L full cream"]);
    // Not into another app's vendor.
    const other = await setup(s);
    expect(await s.upsertMarketProducts(other.app.id, vendor.id, [product({ name: "X" })], NOW)).toEqual({ created: 0, updated: 0 });
  });

  it("115 keeps products' photos, filters by them and lists the picture links still to fetch", async () => {
    const s = store();
    const { app, vendorInput, product } = await setup(s);
    const vendor = await s.createRestaurant(vendorInput({ kind: "grocery" }), { sections: [], nextId: 1 }, NOW);
    const make = async (patch: Partial<Omit<MarketProductInput, "appId" | "vendorId">>) => {
      const made = await s.createMarketProduct({ ...product(), appId: app.id, vendorId: vendor.id, ...patch }, NOW);
      if (!made.ok) throw new Error("product");
      return made.product.id;
    };
    const withPhoto = await make({ sku: "P-1", imageAssetId: "a1", galleryAssetIds: ["a2", "a3"] });
    const waiting = await make({ sku: "P-2", imageUrl: "https://cdn.example/p2.jpg" });
    const failed = await make({ sku: "P-3", imageUrl: "https://cdn.example/p3.jpg", photoError: "The picture link answered 404." });
    await make({ sku: "P-4" });
    const kept = await s.getMarketProduct(app.id, withPhoto);
    expect(kept?.galleryAssetIds).toEqual(["a2", "a3"]);
    expect((await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, withPhoto: true, page: 1, perPage: 10 })).items.map((p) => p.sku)).toEqual(["P-1"]);
    expect((await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, withoutPhoto: true, page: 1, perPage: 10 })).total).toBe(3);
    expect((await s.listMarketProductsAwaitingPhoto(10, { appId: app.id, vendorId: vendor.id })).map((p) => p.id)).toEqual([waiting]);
    await s.updateMarketProduct(app.id, waiting, { imageAssetId: "a4", photoError: null }, NOW);
    await s.updateMarketProduct(app.id, failed, { photoError: null }, NOW);
    expect((await s.listMarketProductsAwaitingPhoto(10, { appId: app.id, vendorId: vendor.id })).map((p) => p.id)).toEqual([failed]);
    await s.updateMarketProduct(app.id, withPhoto, { galleryAssetIds: null }, NOW);
    expect((await s.getMarketProduct(app.id, withPhoto))?.galleryAssetIds ?? null).toBeNull();
  });

  it("a vendor's catalog goes with it", async () => {
    const s = store();
    const { app, vendorInput, product } = await setup(s);
    const vendor = await s.createRestaurant(vendorInput({ kind: "grocery" }), { sections: [], nextId: 1 }, NOW);
    await s.saveMarketDepartment({ id: null, appId: app.id, vendorId: vendor.id, name: "Fruit", imageAssetId: null, position: 0 });
    await s.upsertMarketProducts(app.id, vendor.id, [product({ sku: "Z-1" })], NOW);
    await s.deleteRestaurant(app.id, vendor.id);
    expect(await s.listMarketDepartments(app.id, vendor.id)).toEqual([]);
    expect((await s.listMarketProducts({ appId: app.id, vendorId: vendor.id, page: 1, perPage: 10 })).total).toBe(0);
  });
}

let counter = 0;
function suffixDigits(): string {
  counter += 1;
  return `${Date.now() % 1_000_000}${counter}`.padStart(8, "0").slice(-8);
}
