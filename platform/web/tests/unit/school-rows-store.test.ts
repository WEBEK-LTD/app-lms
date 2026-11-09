import { describe } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { schoolRowsStoreSuite } from "./school-rows-store-suite";

describe("a school's rows many at a time, in memory", () => {
  const store = new MemoryStore();
  schoolRowsStoreSuite(() => store);
});
