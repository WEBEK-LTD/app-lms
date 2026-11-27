import { describe } from "vitest";
import { MemoryAcademyStore } from "@/lib/community/academy/memory";
import { communityAcademySuite } from "./community-academy-suite";

/** 233 Yallapp Academy in memory. */
describe("233 community academy (memory)", () => {
  communityAcademySuite(async () => new MemoryAcademyStore());
});
