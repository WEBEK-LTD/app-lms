import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { demoIdOf } from "../demo/constants";
import { DEMO_VISIT_DAYS } from "./types";

/**
 * A visitor signed in to a demo app with the demo number: kept for the
 * website's live activity card as the demo, the country the request came
 * from (lib/geo.ts, as the hosted API already reads it; the IP is never
 * kept) and the time. Nothing about the visitor or their phone. A failure
 * never stops the sign-in.
 */
export async function recordDemoVisit(store: DataStore, app: Pick<App, "appType" | "vertical" | "demo">, country: string | null | undefined, now: Date): Promise<void> {
  if (!app.demo) return;
  try {
    const code = typeof country === "string" && /^[A-Z]{2}$/.test(country) ? country : null;
    await store.addDemoVisit({ demo: demoIdOf(app), country: code, at: now });
  } catch (error) {
    console.error("[live-activity] the demo sign-in couldn't be recorded", error);
  }
}

/** The daily job: demo sign-ins older than DEMO_VISIT_DAYS go. How many. */
export function pruneDemoVisits(store: DataStore, now: Date): Promise<number> {
  return store.deleteDemoVisitsBefore(new Date(now.getTime() - DEMO_VISIT_DAYS * 86_400_000));
}
