import { describe } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { botStoreSuite } from "./bot-store-suite";

describe("the app-builder bot's storage in memory", () => {
  const store = new MemoryStore();
  botStoreSuite(() => store);
});
