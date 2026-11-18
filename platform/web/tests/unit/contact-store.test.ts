import { describe } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { contactStoreSuite } from "./contact-store-suite";

describe("184.3 the courier job's chat in memory", () => {
  const store = new MemoryStore();
  contactStoreSuite(() => store);
});
