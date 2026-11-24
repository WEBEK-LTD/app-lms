import type { CommunityContext } from "../api/http";
import { trustDepsOf } from "./context";
import { refreshAutoBadges } from "./service";
import type { TrustStore } from "./store";

/**
 * 231 Yallapp Community's daily trust run (the platform's daily job): the
 * automatic badges follow their rules for every member who holds one (Blue
 * goes after 90 days without activity, Green when the paid plan lapses) and
 * for the members who may have come to qualify (the base lists them when it
 * can: enough points, or a linked Yallapp account). Between runs a badge
 * comes when something changes for the member (`badgeCheck`).
 */
interface Candidates {
  /** Members who may hold Blue or Green: enough points, or a linked Yallapp account (area A's store, when it has the list). */
  badgeCandidates?: (minPoints: number, offset: number, limit: number) => Promise<string[]>;
}

export async function runCommunityTrustDaily(ctx: Pick<CommunityContext, "deps" | "store" | "now">): Promise<{ checked: number; granted: number; revoked: number }> {
  const deps = trustDepsOf(ctx);
  const ids = new Set(await (ctx.store.trust as TrustStore).membersWithAutoBadges());
  const base = ctx.store.base as unknown as Candidates;
  if (base.badgeCandidates) {
    const minPoints = (await import("./service").then((s) => s.getSettings(deps))).blue_badge.min_points;
    for (let offset = 0; ; offset += 500) {
      const page = await base.badgeCandidates(minPoints, offset, 500);
      page.forEach((id) => ids.add(id));
      if (page.length < 500) break;
    }
  }
  let granted = 0;
  let revoked = 0;
  for (const id of ids) {
    const changes = await refreshAutoBadges(deps, id);
    granted += changes.granted.length;
    revoked += changes.revoked.length;
  }
  return { checked: ids.size, granted, revoked };
}

/** Area B (an answer accepted, a tutorial approved, points given) and area A call this when a member's numbers change: Blue and Green follow at once. */
export async function badgeCheck(ctx: Pick<CommunityContext, "deps" | "store" | "now">, memberId: string): Promise<void> {
  await refreshAutoBadges(trustDepsOf(ctx), memberId);
}
