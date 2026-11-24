import type { QaStore } from "../qa/store";

/**
 * 231 Area B's data (Q&A, tutorials, search): questions, answers, replies,
 * votes, bookmarks, sections, tags, tutorials and the points they earn
 * (lib/db/community-schema.ts, Area B). The interface and both
 * implementations live in lib/community/qa (store.ts, memory.ts, mysql.ts).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CommunityQaStore extends QaStore {}
