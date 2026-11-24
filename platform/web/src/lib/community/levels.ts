/**
 * 231 A member's level by their points, shown beside their name ("Expert")
 * and as the side menu's bar toward the next one: the one table, read by
 * the API (MemberSummary.level, level_progress), `/config` (levels) and
 * area B's ranks (lib/community/qa/text.ts rankOf).
 */
export const LEVELS = [
  { key: "newcomer", minPoints: 0 },
  { key: "member", minPoints: 25 },
  { key: "contributor", minPoints: 250 },
  { key: "expert", minPoints: 1000 },
  { key: "pro", minPoints: 5000 },
] as const;

export type CommunityLevel = (typeof LEVELS)[number]["key"];

export interface LevelStanding {
  level: CommunityLevel;
  /** 0 to 1 of the way from this level's points to the next's; 1 at the top level. */
  progress: number;
  /** The next level and its points; null at the top. */
  next: { level: CommunityLevel; minPoints: number } | null;
}

export function levelOf(points: number): LevelStanding {
  const p = Math.max(0, Math.floor(points));
  let i = 0;
  while (i + 1 < LEVELS.length && p >= LEVELS[i + 1]!.minPoints) i++;
  const here = LEVELS[i]!;
  const next = LEVELS[i + 1] ?? null;
  if (!next) return { level: here.key, progress: 1, next: null };
  const progress = (p - here.minPoints) / (next.minPoints - here.minPoints);
  return { level: here.key, progress: Math.round(progress * 1000) / 1000, next: { level: next.key, minPoints: next.minPoints } };
}
