import { describe } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { studioMarketStoreSuite } from "./studio-market-store-suite";

/** 106.1 Studio Market's data on the memory store (the same suite runs on MySQL: studio-market-mysql.test.ts). */
describe("106.1 Studio Market on the memory store", () => {
  studioMarketStoreSuite(() => new MemoryStore());
});
