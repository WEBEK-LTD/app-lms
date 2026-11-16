import { describe } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { appTransferStoreSuite } from "./app-transfer-store-suite";

/** 132.112–132.114 Copying and moving an app on the memory store. */
describe("132 copying and moving an app (memory)", () => {
  let store: MemoryStore | null = null;
  appTransferStoreSuite(() => (store ??= new MemoryStore()));
});
