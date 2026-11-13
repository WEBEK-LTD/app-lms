import { describe } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { travelStoreSuite } from "./travel-store-suite";

describe("126 travel rows in the memory store", () => {
  const store = new MemoryStore();
  travelStoreSuite(() => store);
});
