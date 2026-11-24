import { rankOf } from "../qa/text";
import type { MemberRank } from "../qa/types";

/**
 * 231 A member's standing by their points, shown beside their name
 * ("Expert"): the Q&A's thresholds (lib/community/qa/text.ts rankOf:
 * 25, 250, 1000 and 5000 points).
 */
export type { MemberRank };

export function memberRank(points: number): MemberRank {
  return rankOf(points);
}
