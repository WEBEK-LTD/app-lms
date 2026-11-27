import { describe } from "vitest";
import { MemorySocialStore } from "@/lib/community/social/memory";
import { communitySocialSuite } from "./community-social-suite";

/** 232 Posts, comments, likes, stories and the showcase in memory. */
describe("232 community social (memory)", () => {
  communitySocialSuite(async () => new MemorySocialStore());
});
