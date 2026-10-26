import type { Build, IntegrationKey, PublishingRequest } from "../data/types";
import { isStalled } from "../builds/view";
import type { Integration } from "../integrations";
import { requestStores, trackOf } from "../publishing/steps";
import type { ReadyItem } from "../publishing/readiness";

/**
 * 93.3 What needs the owner now, in one list on the overview (with its count
 * on the menu's Overview link): a connection that stopped working (80), the
 * last build that didn't finish or stopped, a store that turned the app
 * down (88.3), what the stores still miss once the owner chose who
 * publishes (88.1), and crashes above the usual (46, 78). Each has where to
 * fix it; the dashboard words them.
 */

export type ProblemKind = "integration" | "build" | "build_stalled" | "rejected" | "store_checks" | "crashes";

export interface Problem {
  kind: ProblemKind;
  /** The integration, the store, the build's number, how many checks or the crash-free share. */
  subject: string;
  href: string;
}

/** Crash-free sessions below this, over enough sessions to mean something, need a look. */
export const CRASH_FREE_MIN = 99;
export const CRASH_SESSIONS_MIN = 100;

export interface ProblemsInput {
  integrations: Integration[];
  /** The latest build, or null. */
  latest: Pick<Build, "number" | "status" | "createdAt" | "updatedAt"> | null;
  request: PublishingRequest | null;
  /** 88.1 What the stores check, once the owner chose who publishes; null before. */
  ready: ReadyItem[] | null;
  stability: { crashFree: number | null; sessions: number } | null;
  now: Date;
}

export function problemsOf(input: ProblemsInput): Problem[] {
  const out: Problem[] = [];
  for (const row of input.integrations) {
    if (row.state === "problem") out.push({ kind: "integration", subject: row.key satisfies IntegrationKey, href: "/dashboard/integrations" });
  }
  const latest = input.latest;
  if (latest?.status === "failed") out.push({ kind: "build", subject: String(latest.number), href: "/dashboard/builds" });
  else if (latest && isStalled(latest, input.now)) out.push({ kind: "build_stalled", subject: String(latest.number), href: "/dashboard/builds" });
  if (input.request) {
    for (const store of requestStores(input.request)) {
      if (trackOf(input.request, store).status === "rejected") out.push({ kind: "rejected", subject: store, href: "/dashboard/publishing" });
    }
  }
  const missing = input.ready?.filter((item) => item.state === "missing").length ?? 0;
  if (missing > 0) out.push({ kind: "store_checks", subject: String(missing), href: "/dashboard/publishing#h-ready" });
  const s = input.stability;
  if (s && s.crashFree !== null && s.sessions >= CRASH_SESSIONS_MIN && s.crashFree < CRASH_FREE_MIN) {
    out.push({ kind: "crashes", subject: String(s.crashFree), href: "/dashboard/stability" });
  }
  return out;
}
