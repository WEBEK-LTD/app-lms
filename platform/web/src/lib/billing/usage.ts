import { pagesLimitOf, type PlanInfo } from "../plans";

/**
 * 94.1 What an app uses of its plan's limits: its app users (hosted API), its
 * languages and its Media storage (with storage packs), each against the
 * limit (null: none); how long analytics are kept goes with them. The
 * License page shows them with what the plan includes and what it costs.
 */

export type UsageKey = "app_users" | "languages" | "storage" | "pages";

export interface UsageRow {
  key: UsageKey;
  used: number;
  limit: number | null;
}

export interface UsageInput {
  plan: (Pick<PlanInfo, "limits"> & Partial<Pick<PlanInfo, "features">>) | null;
  /** On the hosted API, where Yallapp keeps the app's users (a website keeps its own). */
  hosted: boolean;
  appUsers: number;
  /** The languages the app's pages are in (the default one included). */
  languages: number;
  storage: { usedBytes: number; limitBytes: number | null };
  /** 133 The app's pages (a Studio project's Studio pages), when its plan limits them. */
  pages?: { used: number; studio: boolean };
}

export function planUsage(input: UsageInput): UsageRow[] {
  // Without a plan there's nothing to measure against (its storage would read "0 B of 0 B, full"): the page asks to choose one.
  if (!input.plan) return [];
  const limits = input.plan.limits;
  return [
    ...(input.hosted ? [{ key: "app_users" as const, used: input.appUsers, limit: limits?.appUsers ?? null }] : []),
    { key: "languages", used: input.languages, limit: limits?.languages ?? null },
    { key: "storage", used: input.storage.usedBytes, limit: input.storage.limitBytes },
    // 133 Pages, when the plan (with its page add-ons) limits them.
    ...pagesRow(input),
  ];
}

function pagesRow(input: UsageInput): UsageRow[] {
  if (!input.plan || !input.pages) return [];
  const limit = input.pages.studio ? (input.plan.limits.studioPages ?? null) : typeof input.plan.limits.pages === "number" ? input.plan.limits.pages : input.plan.features ? pagesLimitOf({ features: input.plan.features, limits: input.plan.limits }) : null;
  return limit === null ? [] : [{ key: "pages", used: input.pages.used, limit }];
}

/** How full a limit is: under 80%, nearly (80% or more), or at or over it. */
export function usageLevel(row: UsageRow): "ok" | "near" | "full" {
  if (row.limit === null) return "ok";
  if (row.used >= row.limit) return "full";
  return row.limit > 0 && row.used / row.limit >= 0.8 ? "near" : "ok";
}
