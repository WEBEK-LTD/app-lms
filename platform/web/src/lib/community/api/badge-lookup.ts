import { heldBadges as held } from "../trust/badges";
import type { TrustStore } from "../trust/store";
import type { CommunityContext } from "./http";

/**
 * 231 The badges members hold now, for their names and profiles (area C's
 * badges: gold, green, blue, each with when it was granted and, for green,
 * the company and its app). Area A shows them: `top_badge` (gold > green >
 * blue) next to a name, every one on the profile.
 */
export interface HeldBadge {
  kind: "gold" | "green" | "blue";
  since: Date;
  companyName: string | null;
  appUrl: string | null;
}

export const BADGE_ORDER = ["gold", "green", "blue"] as const;

/** The badges each of the members holds now, highest first; a member without any isn't in the map. */
export async function heldBadges(ctx: CommunityContext, memberIds: readonly string[]): Promise<Map<string, HeldBadge[]>> {
  const store = ctx.store.trust as TrustStore;
  const out = new Map<string, HeldBadge[]>();
  for (const id of new Set(memberIds)) {
    const now = held(await store.listMemberBadges(id), ctx.now).map((b) => ({
      kind: b.badge,
      since: b.grantedAt,
      companyName: b.badge === "green" ? (b.details?.companyName ?? null) : null,
      appUrl: b.badge === "green" ? (b.details?.appUrl ?? null) : null,
    }));
    if (now.length) out.set(id, now);
  }
  return out;
}

/** The one badge shown next to a name: the highest held. */
export function topBadge(badges: readonly HeldBadge[] | undefined): HeldBadge["kind"] | null {
  for (const kind of BADGE_ORDER) if (badges?.some((b) => b.kind === kind)) return kind;
  return null;
}
