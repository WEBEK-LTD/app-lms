/** How far the editor's draft has gone: being changed, saved, or refused. */
export type SaveStatus = "saved" | "saving" | "unsaved" | "invalid";

/**
 * App audit: what the bar says next to Publish. "pending" while the canvas
 * has changes the app doesn't show (not saved yet, or saved but not
 * published), "live" when the app shows what's on the canvas, null when the
 * app shows no Studio design yet (Studio isn't on the plan) and Publish says so.
 */
export function appShows(status: SaveStatus, unpublished: boolean, studioOnPlan: boolean): "pending" | "live" | null {
  if (status !== "saved" || unpublished) return "pending";
  return studioOnPlan ? "live" : null;
}
