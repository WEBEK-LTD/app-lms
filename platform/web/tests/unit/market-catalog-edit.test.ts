import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App, Restaurant } from "@/lib/data/types";
import { createProduct, deleteAisle, deleteDepartment, deleteProduct, orderShelves, productFormValues, saveAisle, saveDepartment, undoCatalogChange, undoStockMove, updateProduct, type CatalogScope } from "@/lib/market/catalog-edit";
import { readAmount } from "@/lib/market/catalog-import";
import { normalizeSearch, productSearchName, searchMatch } from "@/lib/market/search-name";
import { decodeProductCursor, encodeProductCursor, readCursorParam } from "@/lib/market/product-paging";
import { stockAmount, stockUnits } from "@/lib/market/stock";
import { perVendorTake, topK } from "@/lib/market/top-k";
import { refundWords, settlementDue } from "@/lib/market/settlement";
import { NOW } from "./helpers";

describe("115.24 search names", () => {
  it("folds Arabic letter forms, diacritics, Turkish i, case and Arabic-Indic or Persian digits", () => {
    expect(normalizeSearch("أَرُزّ")).toBe("ارز");
    expect(normalizeSearch("إسباجتي آمنة ٱلبيت")).toBe("اسباجتي امنه البيت");
    expect(normalizeSearch("مكرونة")).toBe(normalizeSearch("مكرونه"));
    expect(normalizeSearch("مستشفى")).toBe("مستشفي");
    expect(normalizeSearch("شاطئ مؤسسة")).toBe("شاطي موسسه");
    expect(normalizeSearch("ماء")).toBe("ما");
    expect(normalizeSearch("حـلـيـب")).toBe("حليب");
    expect(normalizeSearch("İSTANBUL ılık")).toBe("istanbul ilik");
    expect(normalizeSearch("Çay ŞEKER Ğ ü")).toBe("cay seker g u");
    expect(normalizeSearch("Crème brûlée")).toBe("creme brulee");
    expect(normalizeSearch("لبن ١ لتر")).toBe("لبن 1 لتر");
    expect(normalizeSearch("۱۲۳ Persian")).toBe("123 persian");
    expect(normalizeSearch("  Milk, 1L — (full) ")).toBe("milk 1l full");
    expect(normalizeSearch("!!!")).toBe("");
  });

  it("keeps a product's name, other languages' names and brand once, under 255 characters", () => {
    expect(productSearchName({ name: "Feta", names: { ar: "جبنة فيتا", en: "Feta" }, brand: "Domty" })).toBe("feta جبنه فيتا domty");
    expect(productSearchName({ name: "x".repeat(300) }).length).toBeLessThanOrEqual(255);
    expect(searchMatch("feta جبنه فيتا domty", "fet")).toBe("prefix");
    expect(searchMatch("feta جبنه فيتا domty", "جبن")).toBe("word");
    expect(searchMatch("feta جبنه فيتا domty", "eta")).toBeNull();
  });

  it("reads imported prices written with Arabic-Indic digits and marks", () => {
    expect(readAmount("٢٥٫٥٠", "EGP")).toBe(2550);
    expect(readAmount("١٬٢٣٤٫٥٠ ج.م", "EGP")).toBe(123450);
    expect(readAmount("۴۵", "EGP")).toBe(4500);
    expect(readAmount("1.234,50", "EGP")).toBe(123450);
    expect(readAmount("٣٫٢٥٠", "KWD")).toBe(3250);
  });

  it("pages by a cursor it can read back, and refuses one it can't", () => {
    const c = encodeProductCursor({ k: "n", n: "حليب 12", i: 99 });
    expect(decodeProductCursor(c)).toEqual({ k: "n", n: "حليب 12", i: 99 });
    expect(decodeProductCursor("")).toBeNull();
    expect(decodeProductCursor("not-json")).toBeNull();
    expect(decodeProductCursor(encodeProductCursor({ k: "s", s: 1, p: 3, i: -1 } as never))).toBeNull();
    expect(readCursorParam(null)).toBeUndefined();
    expect(readCursorParam("abc_-")).toBe("abc_-");
    expect(readCursorParam("a b")).toBe("");
  });

  it("counts stock in items, or in steps for items sold by weight", () => {
    expect(stockUnits({ unit: "item", step: 1 }, 3)).toBe(3);
    expect(stockUnits({ unit: "kg", step: 0.25 }, 1.5)).toBe(6);
    expect(stockUnits({ unit: "g", step: 100 }, 250)).toBe(2);
    expect(stockAmount({ unit: "kg", step: 0.25 }, 6)).toBe(1.5);
    expect(topK([5, 3, 9, 1, 7], (a, b) => a - b, 3)).toEqual([1, 3, 5]);
    expect(perVendorTake([{ vendorId: 1 }, { vendorId: 1 }, { vendorId: 2 }, { vendorId: 1 }], 2, 10)).toHaveLength(3);
  });
});

describe("115.24 editing a place's catalog, and the owner's undo", () => {
  async function setup() {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Souk", email: "edit@market.test", whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "food"), backend: "hosted" };
    await store.createApp(app);
    const vendor: Restaurant = await store.createRestaurant(
      { appId: app.id, name: "Fresh Basket", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: { address: "Maadi", details: null, lat: 29.96, lng: 31.25 }, phone: null, hours: [], prepMinutes: 15, minOrderCents: 0, maxKm: null, commissionBp: 800, active: true, position: 0, kind: "grocery" },
      { sections: [], nextId: 1 },
      NOW,
    );
    const place: CatalogScope = { store, appId: app.id, vendor, currency: "EGP", who: { by: "vendor", byName: "Rana" } };
    const owner: CatalogScope = { ...place, who: { by: "owner", byName: "Owner" } };
    return { store, app, vendor, place, owner };
  }

  it("checks a product's fields: names in each language, price, by weight with its step, least and most", async () => {
    const { place } = await setup();
    const bad = await createProduct(place, { name: "", price: "abc", sold_by: "weight", unit: "kg", step: "0", min: "0.3", max: "0.1", barcode: "?!", stock: "x" }, NOW);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(["barcode", "max", "min", "name", "price", "step", "stock"]);
    const steps = await createProduct(place, { name: "Cheese", price: "10", sold_by: "weight", unit: "kg", step: "0.25", min: "0.3", max: "2" }, NOW);
    expect(steps.ok ? null : steps.errors).toEqual({ min: "The least should be in steps of 0.25." });
    const items = await createProduct(place, { name: "Eggs", price: "10", sold_by: "unit", step: "1.5" }, NOW);
    expect(items.ok ? null : items.errors).toEqual({ step: "Items are sold in whole steps." });
    const ok = await createProduct(place, { name: "Cheese", name_ar: "جبنة", name_tr: "Peynir", price: "٢٠٠٫٥٠", was_price: "250", sold_by: "weight", unit: "kg", step: "0.25", min: "0.5", max: "3", stock: "2.5", in_stock: "on" }, NOW);
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.value).toMatchObject({ names: { ar: "جبنة", tr: "Peynir" }, price: 20050, wasPrice: 25000, unit: "kg", step: 0.25, minQuantity: 0.5, maxQuantity: 3, stock: 10, inStock: true });
    // Its form, in its unit.
    expect(productFormValues(ok.value, "EGP")).toMatchObject({ price: "200.50", stock: "2.5", sold_by: "weight", min: "0.5" });
    // The price before the discount must be more.
    const was = await updateProduct(place, ok.value.id, { was_price: "100" }, NOW);
    expect(was && !was.ok ? was.errors : null).toEqual({ was_price: "The price before the discount should be more than the price." });
  });

  it("lets the owner undo what the place changed, a created, changed or deleted product among them", async () => {
    const { store, app, place, owner } = await setup();
    const made = await createProduct(place, { name: "Milk", price: "30", stock: "5", sku: "M-1" }, NOW);
    if (!made.ok) throw new Error("made");
    const id = made.value.id;
    await updateProduct(place, id, { price: "45", stock: "9", name: "Full-fat milk" }, NOW);
    expect(await store.getMarketProduct(app.id, id)).toMatchObject({ price: 4500, stock: 9, name: "Full-fat milk" });
    const changes = await store.listMarketCatalogChanges(app.id, { by: "vendor", limit: 10 });
    const update = changes.find((c) => c.action === "update")!;
    expect(update.fields.sort()).toEqual(["name", "price", "stock"]);
    expect(await undoCatalogChange(owner, update.id, NOW)).toEqual({ ok: true });
    expect(await store.getMarketProduct(app.id, id)).toMatchObject({ price: 3000, stock: 5, name: "Milk" });
    // Its stock went back through the ledger.
    expect((await store.listMarketStockMoves(app.id, { productId: id, limit: 1 }))[0]).toMatchObject({ reason: "undo", before: 9, after: 5, by: "owner" });
    expect(await undoCatalogChange(owner, update.id, NOW)).toEqual({ ok: false, error: "This change was undone already." });
    // A deleted product comes back; then its creation undone takes it away.
    await deleteProduct(place, id, NOW);
    const deletion = (await store.listMarketCatalogChanges(app.id, { by: "vendor", limit: 10 })).find((c) => c.action === "delete")!;
    expect(await undoCatalogChange(owner, deletion.id, NOW)).toEqual({ ok: true });
    const back = (await store.listMarketProducts({ appId: app.id, vendorId: place.vendor.id, code: "M-1", page: 1, perPage: 1 })).items[0]!;
    expect(back).toMatchObject({ name: "Milk", price: 3000, stock: 5 });
    const made2 = await createProduct(place, { name: "Bread", price: "5" }, NOW);
    const creation = (await store.listMarketCatalogChanges(app.id, { by: "vendor", limit: 10 })).find((c) => c.action === "create" && c.entityId === (made2.ok ? made2.value.id : 0))!;
    expect(await undoCatalogChange(owner, creation.id, NOW)).toEqual({ ok: true });
    expect(await store.getMarketProduct(app.id, creation.entityId)).toBeNull();
    // The owner's own changes aren't listed as the place's.
    await createProduct(owner, { name: "Owner's", price: "1" }, NOW);
    expect((await store.listMarketCatalogChanges(app.id, { by: "vendor", limit: 20 })).some((c) => (c.after as { name?: string } | null)?.name === "Owner's")).toBe(false);
  });

  it("orders departments and aisles by drag or arrows, and undoes a deleted department with its aisles and products", async () => {
    const { store, app, vendor, place, owner } = await setup();
    const ids: number[] = [];
    for (const name of ["Fruit", "Dairy", "Bakery"]) {
      const d = await saveDepartment(place, { id: null, name }, NOW);
      if (d.ok) ids.push(d.value.id);
    }
    const names = async () => (await store.listMarketDepartments(app.id, vendor.id)).map((d) => d.name);
    expect(await names()).toEqual(["Fruit", "Dairy", "Bakery"]);
    expect(await orderShelves(place, { kind: "department" }, { id: ids[2]!, move: "up" }, NOW)).toBe(true);
    expect(await names()).toEqual(["Fruit", "Bakery", "Dairy"]);
    expect(await orderShelves(place, { kind: "department" }, { id: ids[0]!, move: "up" }, NOW)).toBe(false);
    expect(await orderShelves(place, { kind: "department" }, [ids[1]!, ids[0]!, ids[2]!], NOW)).toBe(true);
    expect(await names()).toEqual(["Dairy", "Fruit", "Bakery"]);
    expect(await orderShelves(place, { kind: "department" }, [ids[1]!, ids[1]!, ids[2]!], NOW)).toBe(false);
    // The last reorder undone.
    const reorder = (await store.listMarketCatalogChanges(app.id, { by: "vendor", limit: 20 })).find((c) => c.fields.includes("order"))!;
    expect(await undoCatalogChange(owner, reorder.id, NOW)).toEqual({ ok: true });
    expect(await names()).toEqual(["Fruit", "Bakery", "Dairy"]);

    const cheese = await saveAisle(place, { id: null, departmentId: ids[1]!, name: "Cheese" }, NOW);
    const yogurt = await saveAisle(place, { id: null, departmentId: ids[1]!, name: "Yogurt" }, NOW);
    if (!cheese.ok || !yogurt.ok) throw new Error("aisles");
    const product = await createProduct(place, { name: "Roumi", price: "10", department_id: String(ids[1]), aisle_id: String(cheese.value.id) }, NOW);
    if (!product.ok) throw new Error("product");
    expect(await orderShelves(place, { kind: "aisle", departmentId: ids[1]! }, [yogurt.value.id, cheese.value.id], NOW)).toBe(true);
    expect((await store.listMarketAisles(app.id, vendor.id, ids[1]!)).map((a) => a.name)).toEqual(["Yogurt", "Cheese"]);
    // An aisle can't go in another place's department.
    expect((await saveAisle(place, { id: null, departmentId: 9999, name: "Nowhere" }, NOW)).ok).toBe(false);

    await deleteDepartment(place, ids[1]!, NOW);
    expect(await store.getMarketProduct(app.id, product.value.id)).toMatchObject({ departmentId: null, aisleId: null });
    const gone = (await store.listMarketCatalogChanges(app.id, { by: "vendor", limit: 30 })).find((c) => c.entity === "department" && c.action === "delete")!;
    expect(await undoCatalogChange(owner, gone.id, NOW)).toEqual({ ok: true });
    const dairy = (await store.listMarketDepartments(app.id, vendor.id)).find((d) => d.name === "Dairy")!;
    const aisles = await store.listMarketAisles(app.id, vendor.id, dairy.id);
    expect(aisles.map((a) => a.name).sort()).toEqual(["Cheese", "Yogurt"]);
    expect(await store.getMarketProduct(app.id, product.value.id)).toMatchObject({ departmentId: dairy.id, aisleId: aisles.find((a) => a.name === "Cheese")!.id });
    // A deleted aisle back, its product in it again.
    await deleteAisle(place, aisles.find((a) => a.name === "Cheese")!.id, NOW);
    const aisleGone = (await store.listMarketCatalogChanges(app.id, { by: "vendor", limit: 40 })).find((c) => c.entity === "aisle" && c.action === "delete")!;
    expect(await undoCatalogChange(owner, aisleGone.id, NOW)).toEqual({ ok: true });
    expect((await store.getMarketProduct(app.id, product.value.id))!.aisleId).not.toBeNull();
  });

  it("undoes a hand change of stock only while the stock is still what it left", async () => {
    const { store, app, place, owner } = await setup();
    const made = await createProduct(place, { name: "Rice", price: "30", stock: "10" }, NOW);
    if (!made.ok) throw new Error("made");
    await updateProduct(place, made.value.id, { stock: "4" }, NOW);
    const move = (await store.listMarketStockMoves(app.id, { productId: made.value.id, limit: 1 }))[0]!;
    await store.takeMarketStock(app.id, 77, [{ lineId: 1, productId: made.value.id, units: 1 }], "order", { by: "customer", byName: null }, NOW);
    expect(await undoStockMove(owner, move.id, NOW)).toEqual({ ok: false, error: "The stock changed since. Set it by hand." });
    await store.returnMarketStock(app.id, 77, null, { by: "system", byName: null }, NOW);
    expect(await undoStockMove(owner, move.id, NOW)).toEqual({ ok: true });
    expect((await store.getMarketProduct(app.id, made.value.id))!.stock).toBe(10);
    expect(await undoStockMove(owner, move.id, NOW)).toEqual({ ok: false, error: "The stock changed since. Set it by hand." });
    const order = (await store.listMarketStockMoves(app.id, { orderId: 77, limit: 1 }))[0]!;
    expect((await undoStockMove(owner, order.id, NOW)).ok).toBe(false);
  });

  it("refuses restaurants, which have menus", async () => {
    const { store, app, place } = await setup();
    const kitchen = await store.createRestaurant({ ...place.vendor, kind: "restaurant", name: "Kitchen" }, { sections: [], nextId: 1 }, NOW);
    expect((await createProduct({ ...place, vendor: kitchen }, { name: "X", price: "1" }, NOW)).ok).toBe(false);
    expect(app.id).toBeTruthy();
  });
});

describe("115.29 what a weighed order gets back", () => {
  const money = (total: number, payNow: number, wallet: number, charged?: { total: number; payNow: number; wallet: number }) => ({ total, payNow, wallet, ...(charged ? { charged } : {}) }) as never;
  it("is the card's part and the wallet's part of what it came to less, said in the push in the customer's language", () => {
    const card = { paymentMethod: "card" as const, paymentStatus: "paid" as const, currency: "EGP", money: money(30000, 30000, 0, { total: 40000, payNow: 40000, wallet: 0 }) };
    expect(settlementDue(card)).toEqual({ toCard: 10000, toWallet: 0 });
    expect(refundWords(card, "en")).toBe("EGP 100.00");
    expect(refundWords(card, "ar")).toMatch(/100\.00/);
    // Part from the wallet: what went over it goes back to the wallet too.
    expect(settlementDue({ ...card, money: money(5000, 0, 5000, { total: 40000, payNow: 30000, wallet: 10000 }) })).toEqual({ toCard: 30000, toWallet: 5000 });
    // Not picked yet, cash, or still unpaid: nothing.
    expect(settlementDue({ ...card, money: money(40000, 40000, 0) })).toEqual({ toCard: 0, toWallet: 0 });
    expect(refundWords({ ...card, paymentMethod: "cash" }, "en")).toBe("");
    expect(settlementDue({ ...card, paymentStatus: "unpaid" })).toEqual({ toCard: 0, toWallet: 0 });
  });
});
