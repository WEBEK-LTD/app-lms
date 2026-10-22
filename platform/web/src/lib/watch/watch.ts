import type { DataStore } from "../data/store";
import type { App, Build, WatchedJob } from "../data/types";
import { isStalled } from "../builds/view";
import { closeAlerts, raiseAlert, type TeamMail } from "./alerts";
import { JOB_LABEL, jobStates } from "./runs";

/**
 * 78.3 What the team is told about without looking (lib/watch): builds that
 * wait for the pipeline or stopped, a scheduled job that didn't run, an app
 * whose crashes jump, and pushes that fail. The frequent job runs it every 5
 * minutes (and the daily job checks the frequent one); each problem opens one
 * alert, emailed once, and closes by itself when it goes.
 */

/** A queued build the pipeline hasn't taken in this long waits for it (it starts within a minute with GITHUB_DISPATCH_TOKEN). */
export const BUILD_WAITING_MS = 30 * 60_000;

/** A day's crashes count as a spike from this many crashed sessions… */
export const CRASH_SPIKE_MIN = 5;
/** …at this share of the day's sessions or more… */
export const CRASH_SPIKE_RATE = 0.05;
/** …and this many times the share of the 7 days before. */
export const CRASH_SPIKE_FACTOR = 3;

export interface WatchDeps {
  store: DataStore;
  now: Date;
  mail?: TeamMail | null;
  /** The jobs to check: the frequent job checks the others, the daily job the frequent one. */
  jobs: WatchedJob[];
  /** Whether GITHUB_DISPATCH_TOKEN is set (a waiting build's alert says what to do). */
  dispatch: boolean;
  /** Whether to look at the apps' crashes (the frequent job). */
  crashes?: boolean;
}

export interface WatchReport {
  alerts: number;
  closed: number;
}

function dayOf(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/** The builds alerts: one per build waiting for the pipeline or stopped; closed once it moves or ends. */
async function watchBuilds(deps: WatchDeps): Promise<WatchReport> {
  const { store, now } = deps;
  const [queued, building, previous] = await Promise.all([
    store.listBuilds({ status: "queued", limit: 200 }),
    store.listBuilds({ status: "building", limit: 200 }),
    store.listTeamAlerts({ open: true, limit: 500 }),
  ]);
  const apps = new Map<string, App | null>();
  const appOf = async (b: Build) => {
    if (!apps.has(b.appId)) apps.set(b.appId, await store.getAppById(b.appId));
    return apps.get(b.appId) ?? null;
  };
  const name = (app: App | null, b: Build) => `${app?.appName?.trim() || "An app"} #${b.number}`;
  const open: string[] = [];
  let alerts = 0;
  for (const b of [...queued, ...building]) {
    if (isStalled(b, now)) {
      const key = `build_stalled:${b.id}`;
      open.push(key);
      const app = await appOf(b);
      const since = b.status === "queued" ? b.createdAt : b.updatedAt;
      await raiseAlert(
        store,
        {
          kind: "build_stalled",
          key,
          title: `Build ${name(app, b)} stopped`,
          detail: `It has been ${b.status === "queued" ? "waiting" : "building"} with no report since ${since.toISOString().slice(0, 16).replace("T", " ")} UTC. Close it in the build queue (the client can then start it again), and look at the pipeline's run.`,
          link: "/admin/builds",
        },
        now,
        deps.mail,
      );
      alerts++;
    } else if (b.status === "queued" && now.getTime() - b.createdAt.getTime() > BUILD_WAITING_MS) {
      const key = `build_waiting:${b.id}`;
      open.push(key);
      const app = await appOf(b);
      const minutes = Math.round((now.getTime() - b.createdAt.getTime()) / 60_000);
      await raiseAlert(
        store,
        {
          kind: "build_waiting",
          key,
          title: `Build ${name(app, b)} waits for the pipeline`,
          detail:
            `It was queued ${minutes} minutes ago and the build pipeline hasn't taken it. ` +
            (deps.dispatch
              ? "The platform asks GitHub to start the pipeline at once: look at GitHub › Actions › Build client apps, or run it there."
              : "GITHUB_DISPATCH_TOKEN isn't set, so builds wait for GitHub's hourly schedule, which often runs hours late. Set it in Netlify (README), or run Build client apps in GitHub › Actions."),
          link: "/admin/builds",
        },
        now,
        deps.mail,
      );
      alerts++;
    }
  }
  const stale = previous.filter((a) => (a.kind === "build_waiting" || a.kind === "build_stalled") && !open.includes(a.key)).map((a) => a.key);
  return { alerts, closed: await closeAlerts(store, stale, now) };
}

/** A job with no good run for longer than expected; closed when it runs again. */
async function watchJobs(deps: WatchDeps): Promise<WatchReport> {
  const states = jobStates(await deps.store.lastGoodJobRuns(), deps.now, deps.jobs);
  let alerts = 0;
  const fine: string[] = [];
  for (const s of states) {
    const key = `job_missing:${s.job}`;
    if (!s.late) {
      fine.push(key);
      continue;
    }
    await raiseAlert(
      deps.store,
      {
        kind: "job_missing",
        key,
        title: `${JOB_LABEL[s.job]} hasn't run`,
        detail:
          `Its last good run was ${s.last!.toISOString().slice(0, 16).replace("T", " ")} UTC. ` +
          (s.job === "pipeline"
            ? "Look at GitHub › Actions › Build client apps (its secrets, BUILD_PIPELINE_TOKEN and PLATFORM_API_URL)."
            : "Look at Netlify › Functions (its log), and that INTERNAL_JOB_SECRET is set."),
        link: "/admin/watching",
      },
      deps.now,
      deps.mail,
    );
    alerts++;
  }
  return { alerts, closed: await closeAlerts(deps.store, fine, deps.now) };
}

/** An app whose share of crashed sessions today jumped: one alert per app and day. */
async function watchCrashes(deps: WatchDeps): Promise<WatchReport> {
  const { store, now } = deps;
  const today = dayOf(now);
  const weekAgo = dayOf(new Date(now.getTime() - 7 * 86_400_000));
  let alerts = 0;
  for (const app of await store.listApps()) {
    const day = await store.crashSessionTotals(app.id, today);
    if (day.crashed < CRASH_SPIKE_MIN || day.sessions === 0) continue;
    const week = await store.crashSessionTotals(app.id, weekAgo);
    const before = { sessions: week.sessions - day.sessions, crashed: week.crashed - day.crashed };
    const rate = day.crashed / day.sessions;
    const usual = before.sessions > 0 ? before.crashed / before.sessions : 0;
    if (rate < CRASH_SPIKE_RATE || rate < usual * CRASH_SPIKE_FACTOR) continue;
    await raiseAlert(
      store,
      {
        kind: "crash_spike",
        key: `crash_spike:${app.id}:${today}`,
        title: `${app.appName?.trim() || "An app"} crashes more today`,
        detail: `${day.crashed} of ${day.sessions} sessions crashed today (${Math.round(rate * 100)}%), against ${Math.round(usual * 1000) / 10}% in the 7 days before.`,
        link: `/admin/crashes?app=${app.id}`,
      },
      now,
      deps.mail,
    );
    alerts++;
  }
  return { alerts, closed: 0 };
}

/** The watch: builds, the jobs it checks and (in the frequent job) crashes. Each part's failure is logged and leaves the others. */
export async function runWatch(deps: WatchDeps): Promise<WatchReport> {
  const total: WatchReport = { alerts: 0, closed: 0 };
  const parts: [string, () => Promise<WatchReport>][] = [
    ["builds", () => watchBuilds(deps)],
    ["jobs", () => watchJobs(deps)],
    ...(deps.crashes ? ([["crashes", () => watchCrashes(deps)]] as [string, () => Promise<WatchReport>][]) : []),
  ];
  for (const [name, part] of parts) {
    try {
      const r = await part();
      total.alerts += r.alerts;
      total.closed += r.closed;
    } catch (error) {
      console.error(`[watch] ${name}`, error instanceof Error ? error.message : String(error));
    }
  }
  return total;
}

/** Scheduled notifications that failed in a run: one alert a day, counted again with each failure. */
export async function alertFailedScheduledPushes(store: DataStore, failed: number, now: Date, mail?: TeamMail | null): Promise<void> {
  if (failed <= 0) return;
  await raiseAlert(
    store,
    {
      kind: "push_failed",
      key: `push_failed:scheduled:${dayOf(now)}`,
      title: "Scheduled notifications failed",
      detail: `${failed} scheduled ${failed === 1 ? "notification" : "notifications"} couldn't be sent in the last run (their reasons are on each app's Notifications page).`,
      link: "/admin/watching",
    },
    now,
    mail,
  );
}
