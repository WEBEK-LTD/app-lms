/**
 * 231 A member's standing by their points, shown beside their name
 * ("Expert"): area B owns the thresholds (lib/community/qa/text.ts rankOf)
 * and may point this at them; these are the same numbers.
 */
export type MemberRank = "newcomer" | "member" | "contributor" | "expert" | "pro";

export function memberRank(points: number): MemberRank {
  if (points >= 5000) return "pro";
  if (points >= 1000) return "expert";
  if (points >= 250) return "contributor";
  if (points >= 25) return "member";
  return "newcomer";
}
