import type { BadgeKind } from "./data";
import type { CmWords } from "./words";

/** The order a member's badges rank in: only the highest shows beside their name. */
export const BADGE_ORDER: BadgeKind[] = ["gold", "green", "blue"];

export function highestBadge(kinds: BadgeKind[]): BadgeKind | null {
  return BADGE_ORDER.find((k) => kinds.includes(k)) ?? null;
}

const COLOR: Record<BadgeKind, string> = { gold: "#E5A019", green: "#18A56B", blue: "#3FA9F5" };

export function badgeName(w: CmWords, kind: BadgeKind): string {
  return kind === "gold" ? w.badgeGold : kind === "green" ? w.badgeGreen : w.badgeBlue;
}

/** The small verified mark beside a name, coloured by the badge. */
export function BadgeMark({ kind, w }: { kind: BadgeKind | null; w: CmWords }) {
  if (!kind) return null;
  return (
    <span className="ms f" style={{ fontSize: 16, color: COLOR[kind] }} title={badgeName(w, kind)} aria-label={badgeName(w, kind)} role="img">
      verified
    </span>
  );
}

/** A badge as a pill, for the profile's list. */
export function BadgePill({ kind, w }: { kind: BadgeKind; w: CmWords }) {
  return (
    <span className="pill" style={{ background: `${COLOR[kind]}1f`, color: COLOR[kind] }}>
      <span className="ms f" style={{ fontSize: 15 }} aria-hidden="true">verified</span>
      {badgeName(w, kind)}
    </span>
  );
}
