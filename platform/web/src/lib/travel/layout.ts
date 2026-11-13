import type { DataStore } from "../data/store";
import type { LayoutContent, LayoutTab } from "../pages/types";
import { travelTabs, type TravelMode } from "./settings";

/**
 * 126 A travel app's bottom tabs follow what Yallapp turned on: Explore
 * (Search for flights only) first, the mode's own tabs, then Account, as
 * the approved structure has them. When Admin changes the parts, the
 * project's tabs (draft and published) become the mode's, keeping each tab
 * the owner already designed for the same screen (its name, icon and Studio
 * page). The app does the same from `Config.travel.mode` on its next start.
 */

/** The screen a tab opens, directly or through the Studio page drawn around it. */
function screenOf(tab: LayoutTab, layout: Pick<LayoutContent, "pages">): string | null {
  if (tab.target.type === "screen") return tab.target.screen ?? null;
  if (tab.target.type === "page") return layout.pages.find((p) => p.slug === tab.target.page_slug)?.studio?.screen ?? null;
  return null;
}

export function travelLayoutTabs<T extends Pick<LayoutContent, "tabs" | "pages">>(layout: T, mode: TravelMode): LayoutTab[] {
  const tabs = layout.tabs;
  const home = tabs.find((t) => t.id === "home") ?? tabs[0];
  const account = tabs.find((t) => screenOf(t, layout) === "account");
  const wanted = travelTabs(mode);
  const middle = wanted.map((w) => tabs.find((t) => t !== home && t !== account && screenOf(t, layout) === screenOf(w, layout) && (w.id !== "bookings" || t.id === "bookings" || t.id === "trips")) ?? w);
  const named = home ? { ...home, label: mode === "flights" ? "Search" : "Explore", icon: mode === "flights" ? "search" : "travel_explore" } : null;
  return [...(named ? [named] : []), ...middle, ...(account ? [account] : [])];
}

/** Rewrites the project's tabs to the mode's; nothing when it has no layout yet. */
export async function applyTravelTabs(store: DataStore, appId: string, mode: TravelMode, now: Date): Promise<void> {
  const layout = await store.getAppLayout(appId);
  if (!layout) return;
  await store.saveAppLayout({
    ...layout,
    draft: { ...layout.draft, tabs: travelLayoutTabs(layout.draft, mode) },
    draftUpdatedAt: now,
    published: layout.published ? { ...layout.published, tabs: travelLayoutTabs(layout.published, mode) } : null,
  });
}
