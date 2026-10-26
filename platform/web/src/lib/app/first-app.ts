import type { AccountState } from "../license/status";
import { readyToSubmit, type ReadyItem } from "../publishing/readiness";
import { SETUP_STEPS, type SetupStep } from "./setup";

/**
 * 93.1 The guide through the first app, on the overview: the five setup
 * steps, then what turns them into an app on the stores — the plan
 * activated, a first build, what the stores check (88.1 Ready to submit)
 * and the app live on a store. Each step is done, the next one, waiting on
 * someone else (a build running, our team publishing) or still to do, with
 * where to do it. Shown until the app is live, or the owner hides it.
 */

export type GuideKey = SetupStep | "activate" | "build" | "ready" | "live";
export type GuideState = "done" | "next" | "waiting" | "todo";

export interface GuideStep {
  key: GuideKey;
  state: GuideState;
  href: string;
  /** For "ready": how many of the stores' checks still stop the review. */
  missing?: number;
}

export interface GuideInput {
  /** The setup steps' status (`stepStatus`). */
  status: Record<SetupStep, boolean>;
  /** The license: pending until the app is activated. */
  state: AccountState;
  /** A build is running now. */
  building: boolean;
  /** A build has finished, with files to download. */
  built: boolean;
  /** 88.1 What the stores check; null before the owner chooses who publishes the app. */
  ready: ReadyItem[] | null;
  /** Who publishes the app; null until chosen. */
  publishingMode: "self" | "managed" | null;
  /** A store shows the app. */
  live: boolean;
}

export interface Guide {
  steps: GuideStep[];
  done: number;
  total: number;
  /** Every step is done: the app is on a store. */
  complete: boolean;
}

const SETUP_HREF: Record<SetupStep, string> = {
  "app-type": "/dashboard/app-type",
  website: "/dashboard/setup?step=website",
  branding: "/dashboard/setup?step=branding",
  listing: "/dashboard/setup?step=listing",
  publishing: "/dashboard/setup?step=publishing",
};

export function firstAppGuide(input: GuideInput): Guide {
  const missing = input.ready ? input.ready.filter((item) => item.state === "missing").length : null;
  const raw: { key: GuideKey; done: boolean; waiting?: boolean; href: string; missing?: number }[] = [
    ...SETUP_STEPS.map((step) => ({ key: step, done: input.status[step], href: SETUP_HREF[step] })),
    { key: "activate", done: input.state === "active", href: "/dashboard/license" },
    { key: "build", done: input.built, waiting: input.building, href: "/dashboard/builds" },
    {
      key: "ready",
      done: input.ready !== null && readyToSubmit(input.ready),
      href: input.ready ? "/dashboard/publishing#h-ready" : "/dashboard/publishing",
      ...(missing !== null ? { missing } : {}),
    },
    // "Publish it for me": our team takes it from here; publishing themselves: their stores' review.
    { key: "live", done: input.live, waiting: input.publishingMode === "managed", href: "/dashboard/publishing" },
  ];
  let nextFound = false;
  const steps = raw.map(({ key, done, waiting, href, missing: count }): GuideStep => {
    const state: GuideState = done ? "done" : waiting ? "waiting" : nextFound ? "todo" : "next";
    if (!done && !waiting) nextFound = true;
    return { key, state, href, ...(count !== undefined ? { missing: count } : {}) };
  });
  const done = steps.filter((s) => s.state === "done").length;
  return { steps, done, total: steps.length, complete: done === steps.length };
}
