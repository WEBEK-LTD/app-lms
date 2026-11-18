import { describe } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { marketStockStoreSuite } from "./market-stock-store-suite";

/** 115.24 Stock, its ledger, search and keyset paging on the MemoryStore, with a 50,000-product catalog. */
describe("115.24 stock, search and paging in memory", () => {
  marketStockStoreSuite(() => new MemoryStore(), { big: 50_000 });
});
