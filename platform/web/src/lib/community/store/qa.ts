import type { QaStore } from "../qa/store";
import type { AcademyStore } from "../academy/store";
import type { SocialStore } from "../social/store";

/**
 * 231 Area B's data (Q&A, tutorials, search): questions, answers, replies,
 * votes, bookmarks, sections, tags, tutorials and the points they earn
 * (lib/db/community-schema.ts, Area B). The interface and both
 * implementations live in lib/community/qa (store.ts, memory.ts, mysql.ts).
 * 232 And area B's posts, comments, likes, stories and showcase
 * (`social`, lib/community/social), on the same database; 233 the
 * Academy (`academy`, lib/community/academy).
 */
export interface CommunityQaStore extends QaStore {
  social: SocialStore;
  /** 233 The Academy (lib/community/academy). */
  academy: AcademyStore;
}
