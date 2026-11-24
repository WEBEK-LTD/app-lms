import { MemoryQaStore } from "../qa/memory";
import type { CommunityQaStore } from "./qa";

/** 231 Area B's data in memory (tests and local runs). */
export class MemoryCommunityQaStore extends MemoryQaStore implements CommunityQaStore {}
