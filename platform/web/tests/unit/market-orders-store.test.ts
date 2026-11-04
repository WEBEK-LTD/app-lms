import { describe } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { marketOrdersStoreSuite } from "./market-orders-store-suite";

describe("115.3 the marketplace's orders, complaints and wallet in memory", () => {
  const store = new MemoryStore();
  marketOrdersStoreSuite(() => store);
});
