/* eslint-disable @typescript-eslint/no-unused-vars -- stubs the other areas fill in */
import type { CommunityContext } from "./http";

/**
 * 231 The badges members hold now, for their names and profiles (area C
 * fills this from its badges: gold, green, blue, each with when it was
 * granted and, for green, the company and its app). Area A shows them:
 * `top_badge` (gold > green > blue) next to a name, every one on the profile.
 */
export interface HeldBadge {
  kind: "gold" | "green" | "blue";
  since: Date;
  companyName: string | null;
  appUrl: string | null;
}

export const BADGE_ORDER = ["gold", "green", "blue"] as const;

/** The badges each of the members holds now, highest first; a member without any isn't in the map. */
export async function heldBadges(_ctx: CommunityContext, _memberIds: readonly string[]): Promise<Map<string, HeldBadge[]>> {
  return new Map();
}

/** The one badge shown next to a name: the highest held. */
export function topBadge(badges: readonly HeldBadge[] | undefined): HeldBadge["kind"] | null {
  for (const kind of BADGE_ORDER) if (badges?.some((b) => b.kind === kind)) return kind;
  return null;
}
