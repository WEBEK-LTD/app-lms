import type { StudioDemoId } from "@/lib/demo/constants";

/**
 * The home's "kinds of apps": Yallapp Studio's, each shown with its demo's
 * main Signature look (light and dark, site/look-shots.ts). A shop type's
 * main look is C, the other demos' A. The heading's count follows this list
 * (lib/content/site.ts, lib/content/site-lang.ts). The app editor's kinds
 * are a quiet line below them.
 */
export const HOME_STUDIO_KINDS: readonly { id: StudioDemoId; look: "a" | "c" }[] = [
  { id: "clothes", look: "c" },
  { id: "food", look: "a" },
  { id: "marketplace", look: "a" },
  { id: "delivery", look: "a" },
  { id: "rides", look: "a" },
  { id: "school", look: "a" },
  { id: "premium_academy", look: "a" },
  { id: "travel", look: "a" },
  { id: "flowers", look: "a" },
];
