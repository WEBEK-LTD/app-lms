import type { Build, ClientMilestone, MilestoneKind, ProductDay } from "../data/types";

/**
 * 78.2 Admin › Product: how clients get from signing up to a published, paid
 * app (from their milestones, lib/milestones), how builds go, and how many
 * clients keep a plan running (from the daily snapshots, `product_days`).
 * Pure functions over the data; months and days are UTC.
 */

const DAY_MS = 86_400_000;

export function monthOf(at: Date): string {
  return at.toISOString().slice(0, 7);
}

/** The last `count` months, oldest first, ending with now's. */
export function lastMonths(now: Date, count: number): string[] {
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(monthOf(d));
  }
  return months;
}

/** Each client's first time of each kind (over all their apps), and the sign-up's source. */
export function firstsByClient(milestones: ClientMilestone[]): Map<string, { firsts: Partial<Record<MilestoneKind, Date>>; renewals: number; source: ClientMilestone["source"] }> {
  const clients = new Map<string, { firsts: Partial<Record<MilestoneKind, Date>>; renewals: number; source: ClientMilestone["source"] }>();
  for (const m of milestones) {
    const entry = clients.get(m.clientId) ?? { firsts: {}, renewals: 0, source: null };
    const first = entry.firsts[m.kind];
    if (!first || m.at.getTime() < first.getTime()) entry.firsts[m.kind] = m.at;
    if (m.kind === "renewed") entry.renewals += 1;
    if (m.kind === "signed_up") entry.source = m.source;
    clients.set(m.clientId, entry);
  }
  return clients;
}

/** The funnel's columns, in order. */
export const FUNNEL = ["setup_done", "first_build", "build_ready", "store_live", "paid", "renewed"] as const satisfies readonly MilestoneKind[];
export type FunnelStep = (typeof FUNNEL)[number];

export const FUNNEL_LABEL: Record<FunnelStep, string> = {
  setup_done: "Setup done",
  first_build: "First build",
  build_ready: "A build worked",
  store_live: "Live in a store",
  paid: "Paid",
  renewed: "Renewed",
};

export interface CohortRow {
  /** YYYY-MM of the sign-ups. */
  month: string;
  signUps: number;
  /** How many of them reached each step, by now. */
  reached: Record<FunnelStep, number>;
}

/** Sign-ups by month and how many of each month got how far, for the last `months` months. */
export function cohorts(milestones: ClientMilestone[], now: Date, months = 12): CohortRow[] {
  const rows = new Map(lastMonths(now, months).map((month) => [month, { month, signUps: 0, reached: Object.fromEntries(FUNNEL.map((s) => [s, 0])) as Record<FunnelStep, number> }]));
  for (const { firsts } of firstsByClient(milestones).values()) {
    if (!firsts.signed_up) continue;
    const row = rows.get(monthOf(firsts.signed_up));
    if (!row) continue;
    row.signUps += 1;
    for (const step of FUNNEL) if (firsts[step]) row.reached[step] += 1;
  }
  return [...rows.values()];
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export const TIMED_STEPS = ["setup_done", "build_ready", "store_live", "paid"] as const satisfies readonly FunnelStep[];

/** From the sign-up to each step, in days: the median over the clients who signed up since `since` and got there, and how many did. */
export function timesToSteps(milestones: ClientMilestone[], since: Date): Record<(typeof TIMED_STEPS)[number], { days: number | null; clients: number }> {
  const spans = Object.fromEntries(TIMED_STEPS.map((s) => [s, [] as number[]])) as Record<(typeof TIMED_STEPS)[number], number[]>;
  for (const { firsts } of firstsByClient(milestones).values()) {
    const start = firsts.signed_up;
    if (!start || start.getTime() < since.getTime()) continue;
    for (const step of TIMED_STEPS) {
      const reached = firsts[step];
      if (reached) spans[step].push(Math.max(0, reached.getTime() - start.getTime()) / DAY_MS);
    }
  }
  return Object.fromEntries(TIMED_STEPS.map((s) => [s, { days: median(spans[s]) === null ? null : Math.round(median(spans[s])! * 10) / 10, clients: spans[s].length }])) as ReturnType<typeof timesToSteps>;
}

/** Where a sign-up came from, in a word: the campaign's source (and medium), our page, the website, or nothing known. */
export function sourceLabel(source: ClientMilestone["source"]): string {
  if (!source) return "Not known";
  if (source.utmSource) return source.utmMedium ? `${source.utmSource} / ${source.utmMedium}` : source.utmSource;
  if (source.from) return source.from === "demo" ? "Demo apps" : source.from === "team" ? "Added by the team" : `From: ${source.from}`;
  if (source.referrer) return source.referrer.replace(/^www\./, "");
  return "Not known";
}

/** Sign-ups since `since` by where they came from, with how many paid; largest first. */
export function signUpSources(milestones: ClientMilestone[], since: Date): { source: string; signUps: number; paid: number }[] {
  const counts = new Map<string, { source: string; signUps: number; paid: number }>();
  for (const { firsts, source } of firstsByClient(milestones).values()) {
    if (!firsts.signed_up || firsts.signed_up.getTime() < since.getTime()) continue;
    const label = sourceLabel(source);
    const row = counts.get(label) ?? { source: label, signUps: 0, paid: 0 };
    row.signUps += 1;
    if (firsts.paid) row.paid += 1;
    counts.set(label, row);
  }
  return [...counts.values()].sort((a, b) => b.signUps - a.signUps || a.source.localeCompare(b.source));
}

export interface BuildMonth {
  month: string;
  /** Finished builds (worked or failed) queued that month. */
  finished: number;
  ready: number;
  failed: number;
  /** Percent, one decimal; null with none finished. */
  successRate: number | null;
  /** How long a build that worked took, from its start, in minutes. */
  medianMinutes: number | null;
  android: { done: number; failed: number };
  ios: { done: number; failed: number };
  /** The stage each failed build failed at, most first ("before a stage": it stopped without one failing). */
  failedAt: { stage: string; count: number }[];
}

const STAGE_LABEL: Record<string, string> = {
  queued: "Queue",
  android: "Android build",
  ios: "iOS build",
  upload_play: "Google Play upload",
  upload_testflight: "TestFlight upload",
  upload_galaxy: "Galaxy Store upload",
  upload_appgallery: "AppGallery upload",
  upload_xiaomi: "Xiaomi upload",
};

export function stageLabel(stage: string): string {
  return STAGE_LABEL[stage] ?? stage;
}

/** Builds by the month they were queued, for the last `months` months. */
export function buildsByMonth(builds: Pick<Build, "status" | "stages" | "createdAt" | "startedAt" | "finishedAt">[], now: Date, months = 6): BuildMonth[] {
  return lastMonths(now, months).map((month) => {
    const of = builds.filter((b) => monthOf(b.createdAt) === month && (b.status === "ready" || b.status === "failed"));
    const ready = of.filter((b) => b.status === "ready");
    const failed = of.filter((b) => b.status === "failed");
    const minutes = ready.filter((b) => b.finishedAt).map((b) => (b.finishedAt!.getTime() - (b.startedAt ?? b.createdAt).getTime()) / 60_000);
    const failedAt = new Map<string, number>();
    for (const b of failed) {
      const stage = Object.entries(b.stages).find(([, status]) => status === "failed")?.[0];
      const label = stage ? stageLabel(stage) : "Before a stage";
      failedAt.set(label, (failedAt.get(label) ?? 0) + 1);
    }
    const platform = (key: "android" | "ios") => ({ done: of.filter((b) => b.stages[key] === "done").length, failed: of.filter((b) => b.stages[key] === "failed").length });
    const med = median(minutes);
    return {
      month,
      finished: of.length,
      ready: ready.length,
      failed: failed.length,
      successRate: of.length ? Math.round((ready.length / of.length) * 1000) / 10 : null,
      medianMinutes: med === null ? null : Math.round(med),
      android: platform("android"),
      ios: platform("ios"),
      failedAt: [...failedAt].map(([stage, count]) => ({ stage, count })).sort((a, b) => b.count - a.count || a.stage.localeCompare(b.stage)),
    };
  });
}

export interface PlanMonth {
  month: string;
  /** Clients with a plan running on the month's first snapshot. */
  atStart: number;
  /** Of those, without one on its last snapshot. */
  lost: number;
  /** Clients with a plan running at the end who had none at the start. */
  gained: number;
  atEnd: number;
  /** Lost over at the start, percent with one decimal; null when nobody had a plan at the start. */
  churn: number | null;
}

/** Clients keeping a plan running, month by month, from the daily snapshots (oldest first). */
export function plansByMonth(days: ProductDay[], now: Date, months = 12): PlanMonth[] {
  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
  return lastMonths(now, months)
    .map((month) => {
      const inMonth = sorted.filter((d) => d.day.startsWith(month));
      if (inMonth.length === 0) return null;
      const start = new Set(inMonth[0]!.activeClientIds);
      const end = new Set(inMonth[inMonth.length - 1]!.activeClientIds);
      const lost = [...start].filter((id) => !end.has(id)).length;
      return {
        month,
        atStart: start.size,
        lost,
        gained: [...end].filter((id) => !start.has(id)).length,
        atEnd: end.size,
        churn: start.size ? Math.round((lost / start.size) * 1000) / 10 : null,
      };
    })
    .filter((m): m is PlanMonth => m !== null);
}
