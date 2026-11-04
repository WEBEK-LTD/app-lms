import { describe } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { mailingStoreSuite } from "./mailing-store-suite";

describe("114 email campaigns' storage in memory", () => {
  const store = new MemoryStore();
  mailingStoreSuite(() => store);
});
