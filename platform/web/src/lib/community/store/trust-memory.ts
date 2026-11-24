import { MemoryTrustStore } from "../trust/store";
import type { CommunityTrustStore } from "./trust";

/** 231 Area C's data in memory (tests and local runs). */
export class MemoryCommunityTrustStore extends MemoryTrustStore implements CommunityTrustStore {}
