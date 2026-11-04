import { describe } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { marketExtrasStoreSuite } from "./market-extras-store-suite";

describe("115.3 coupons, the club, joining forms and the vendors' web sign-in in memory", () => {
  const store = new MemoryStore();
  marketExtrasStoreSuite(() => store);
});
