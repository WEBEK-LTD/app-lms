import { MemoryQaStore } from "../qa/memory";
import { MemorySocialStore } from "../social/memory";
import type { CommunityQaStore } from "./qa";

/** 231 Area B's data in memory (tests and local runs); 232 its social part too. */
export class MemoryCommunityQaStore extends MemoryQaStore implements CommunityQaStore {
  readonly social = new MemorySocialStore();
}
