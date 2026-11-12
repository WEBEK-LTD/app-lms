import { describe } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { learningTimeStoreSuite } from "./learning-time-store-suite";

describe("123 learning time on the memory store", () => {
  const store = new MemoryStore();
  learningTimeStoreSuite(() => store);
});
