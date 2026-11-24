import { MemoryQaStore } from "@/lib/community/qa";
import { communityQaSuite } from "./community-qa-suite";

/** 231 The community's Q&A and tutorials, kept in memory (tests and the e2e server). */
communityQaSuite(async () => new MemoryQaStore());
