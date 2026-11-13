import type { StudioNode } from "@/lib/pages/types";

/**
 * 128 A `live_status` card in the editor's phone, as the app draws it
 * (lib/pages/types.ts `StudioLiveStatus`): an order on its way with sample
 * words, since the editor has no customer. The app draws the person's own
 * order: what it is, how far along it is and the minutes left.
 */

export interface LiveStatusWords {
  /** "Your kofta is on its way". */
  title: string;
  /** "min". */
  minutes: string;
}

export const LIVE_STATUS_WORDS_EN: LiveStatusWords = { title: "Your kofta is on its way", minutes: "min" };

/** Its icon when the owner chose none: a scooter for a meal, a bag for a marketplace's order. */
export function liveStatusIcon(node: Pick<StudioNode, "icon" | "live_status">): string {
  return node.icon ?? (node.live_status?.source === "market_order" ? "shopping_bag" : "two_wheeler");
}

export function LiveStatusCard({ node, color, words }: { node: StudioNode; color: string | null; words: LiveStatusWords }) {
  const ink = color ?? "#FFFFFF";
  return (
    <span data-studio-live="" style={{ display: "flex", alignItems: "center", gap: 12, color: ink }}>
      <span style={{ width: 40, height: 40, flex: "none", borderRadius: 12, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>
          {liveStatusIcon(node)}
        </span>
      </span>
      <span style={{ flex: "1 1 auto", minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{words.title}</span>
        <span style={{ display: "block", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.3)", marginTop: 7 }}>
          <span style={{ display: "block", width: "70%", height: 4, borderRadius: 2, background: ink }} />
        </span>
      </span>
      <span style={{ fontSize: 18, fontWeight: 800, flex: "none" }}>
        12<span style={{ fontSize: 11, fontWeight: 700 }}> {words.minutes}</span>
      </span>
    </span>
  );
}
