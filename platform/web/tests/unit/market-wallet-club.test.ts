import { describe } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { marketWalletClubSuite } from "./market-wallet-club-suite";

describe("115.60–115.62 the wallet and the club in memory", () => {
  const store = new MemoryStore();
  marketWalletClubSuite(() => store);
});
