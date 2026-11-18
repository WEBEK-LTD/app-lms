import { afterAll, describe, expect, it } from "vitest";
import { backfillSearchNames } from "@/lib/market/search-backfill";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { marketStockStoreSuite } from "./market-stock-store-suite";

/**
 * 115.24 Stock, its ledger, search and keyset paging on MySQL or MariaDB (the 115.24 migration), with a
 * 50,000-product catalog. Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("115.24 stock, search and paging on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });
  marketStockStoreSuite(() => store, { big: 50_000 });

  it("115.29 gives older products their search name in batches, picking up where it stopped", async () => {
    const [apps] = await pool.query("SELECT id FROM apps LIMIT 1");
    const appId = (apps as { id: string }[])[0]!.id;
    const vendor = await store.createRestaurant({ appId, name: "Backfill", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: { address: "Maadi", details: null, lat: 29.96, lng: 31.25 }, phone: null, hours: [], prepMinutes: 15, minOrderCents: 0, maxKm: null, commissionBp: 0, active: true, position: 0, kind: "grocery" }, { sections: [], nextId: 1 }, new Date());
    const rows = Array.from({ length: 1200 }, (_, i) => ({ departmentId: null, aisleId: null, name: `حليب ${i}`, description: null, brand: null, sku: `BF-${i}`, barcode: null, imageAssetId: null, imageUrl: null, price: 100, wasPrice: null, unit: "item" as const, step: 1, maxQuantity: null, stock: null, inStock: true, tags: [], position: i }));
    await store.upsertMarketProducts(appId, vendor.id, rows, new Date());
    // As the products saved before 115.24 were: no search name.
    await pool.query("UPDATE market_products SET search_name = '' WHERE vendor_id = ?", [vendor.id]);
    const blank = async () => Number(((await pool.query("SELECT COUNT(*) AS n FROM market_products WHERE search_name = ''"))[0] as { n: number }[])[0]!.n);
    expect(await blank()).toBe(1200);
    expect(await store.backfillMarketSearchNames(500)).toBe(500);
    expect(await backfillSearchNames(store, { budgetMs: 60_000 })).toBe(700);
    expect(await backfillSearchNames(store, { budgetMs: 60_000 })).toBe(0);
    expect(await blank()).toBe(0);
    const [named] = await pool.query("SELECT search_name FROM market_products WHERE vendor_id = ? AND sku = 'BF-7'", [vendor.id]);
    expect((named as { search_name: string }[])[0]!.search_name).toBe("حليب 7");
    await store.deleteRestaurant(appId, vendor.id);
  }, 120_000);
});
