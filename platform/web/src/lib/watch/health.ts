import type { DataStore } from "../data/store";
import { JOB_LABEL, jobStates } from "./runs";
import type { WatchedJob } from "../data/types";

/**
 * 78.3 The deep health check (Admin › Watching): the database, the media
 * gate, the files host, email, the owners' push key, the build pipeline and
 * the scheduled jobs, each with a plain answer. What it reads from the
 * environment comes in `HealthDeps` (lib/watch/env.ts), so it is tested
 * without one.
 */

export interface HealthCheck {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface HealthDeps {
  store: DataStore;
  now: Date;
  fetcher?: typeof fetch;
  /** The media gate's address, or null when files are on this server (local runs). */
  mediaGate: string | null;
  /** The files host's address. */
  filesHost: string | null;
  email: boolean;
  /** OWNER_PUSH_FIREBASE_SERVICE_ACCOUNT: unset, set but not a key, or a key. */
  ownerPush: "unset" | "invalid" | "ok";
  pipelineToken: boolean;
  dispatchToken: boolean;
}

const TIMEOUT_MS = 5000;

async function reach(fetcher: typeof fetch, url: string): Promise<{ status: number; body: string } | { error: string }> {
  try {
    const response = await fetcher(url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "yallapp-health" } });
    return { status: response.status, body: (await response.text()).slice(0, 200) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

const when = (at: Date) => `${at.toISOString().slice(0, 16).replace("T", " ")} UTC`;

export async function deepHealth(deps: HealthDeps): Promise<HealthCheck[]> {
  const fetcher = deps.fetcher ?? fetch;
  const checks: HealthCheck[] = [];

  let last: Partial<Record<WatchedJob, Date>> = {};
  try {
    last = await deps.store.lastGoodJobRuns();
    checks.push({ key: "database", label: "Database", ok: true, detail: "Answers." });
  } catch (error) {
    checks.push({ key: "database", label: "Database", ok: false, detail: `Doesn't answer: ${error instanceof Error ? error.message : String(error)}` });
  }

  if (!deps.mediaGate) {
    checks.push({ key: "media", label: "Media gate", ok: true, detail: "Files are kept on this server (local runs)." });
  } else {
    const r = await reach(fetcher, `${deps.mediaGate}/ping`);
    const ok = "status" in r && r.status === 200 && r.body.startsWith("Yallapp media gate");
    checks.push({
      key: "media",
      label: "Media gate",
      ok,
      detail: ok ? `${("body" in r ? r.body : "").trim()} answers.` : "status" in r ? `Answered ${r.status}, not the gate.` : `Unreachable: ${r.error}`,
    });
  }

  if (deps.filesHost) {
    const r = await reach(fetcher, `${deps.filesHost}/`);
    const ok = "status" in r && r.status < 500;
    checks.push({ key: "files", label: "Files host (builds)", ok, detail: ok ? "Answers." : "status" in r ? `Answered ${r.status}.` : `Unreachable: ${r.error}` });
  }

  checks.push({ key: "email", label: "Email", ok: deps.email, detail: deps.email ? "SMTP is set." : "SMTP isn't set: no email reaches anyone (Admin › Settings)." });

  checks.push({
    key: "push",
    label: "Pushes to Yallapp Business",
    ok: deps.ownerPush === "ok",
    detail:
      deps.ownerPush === "ok"
        ? "The Firebase key is set."
        : deps.ownerPush === "invalid"
          ? "OWNER_PUSH_FIREBASE_SERVICE_ACCOUNT isn't a Firebase service account key."
          : "OWNER_PUSH_FIREBASE_SERVICE_ACCOUNT isn't set: owners get no pushes.",
  });

  const pipeline = jobStates(last, deps.now, ["pipeline"])[0]!;
  const pipelineProblems = [
    !deps.pipelineToken && "BUILD_PIPELINE_TOKEN isn't set: the pipeline can't take builds.",
    !deps.dispatchToken && "GITHUB_DISPATCH_TOKEN isn't set: builds wait for GitHub's hourly schedule, often hours late.",
    pipeline.late && `It last asked for builds ${when(pipeline.last!)}.`,
  ].filter((p): p is string => Boolean(p));
  checks.push({
    key: "pipeline",
    label: "Build pipeline",
    ok: pipelineProblems.length === 0,
    detail: pipelineProblems.length ? pipelineProblems.join(" ") : pipeline.last ? `Last asked for builds ${when(pipeline.last)}.` : "Set; it hasn't asked for builds since this was first recorded.",
  });

  for (const s of jobStates(last, deps.now, ["daily", "frequent", "webhooks"])) {
    checks.push({
      key: `job:${s.job}`,
      label: JOB_LABEL[s.job],
      ok: s.last !== null && !s.late,
      detail: s.last ? `${s.late ? "Late: last" : "Last"} good run ${when(s.last)}.` : "No run recorded yet.",
    });
  }
  return checks;
}
