import { describe } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { marketCatalogStoreSuite } from "./market-catalog-store-suite";

describe("115.3 the marketplace's catalogs in memory", () => {
  const store = new MemoryStore();
  marketCatalogStoreSuite(() => store);
});
