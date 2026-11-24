import { levelOf, type CommunityLevel } from "../levels";

/**
 * 231 A member's standing by their points ("Pro"): the same as their level,
 * from the one table (lib/community/levels.ts); area B's rankOf reads it too.
 */
export type MemberRank = CommunityLevel;

export function memberRank(points: number): MemberRank {
  return levelOf(points).level;
}
