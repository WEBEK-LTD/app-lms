import type { DataStore } from "../data/store";
import { lastRekeyState } from "../jobs/rekey";
import { JOB_LABEL, jobStates } from "./runs";
import type { WatchedJob } from "../data/types";

/**
 * 78.3 The deep health check (Admin › Watching): the database, the media
 * gate, the files host, email, the owners' push key, the build pipeline,
 * 79.2 the encryption keys and the scheduled jobs, each with a plain answer. What it reads from the
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
  /** 79.2 BUILD_PIPELINE_TOKEN is set but shorter than 32 characters. */
  pipelineTokenShort?: boolean;
  dispatchToken: boolean;
  /** 79.2 The current encryption key's ID and the old keys' (ENCRYPTION_KEY_OLD), or null when ENCRYPTION_KEY isn't usable. */
  keys?: { keyId: string; oldKeyIds: string[] } | null;
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
    deps.pipelineTokenShort && "BUILD_PIPELINE_TOKEN is shorter than 32 characters: make a new one (openssl rand -hex 32) and set it in Netlify and in GitHub's secrets.",
    !deps.dispatchToken && "GITHUB_DISPATCH_TOKEN isn't set: builds wait for GitHub's hourly schedule, often hours late.",
    pipeline.late && `It last asked for builds ${when(pipeline.last!)}.`,
  ].filter((p): p is string => Boolean(p));
  checks.push({
    key: "pipeline",
    label: "Build pipeline",
    ok: pipelineProblems.length === 0,
    detail: pipelineProblems.length ? pipelineProblems.join(" ") : pipeline.last ? `Last asked for builds ${when(pipeline.last)}.` : "Set; it hasn't asked for builds since this was first recorded.",
  });

  if (deps.keys !== undefined) checks.push(await keysCheck(deps.store, deps.keys));

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

/** 79.2 Whether every encrypted value is on the current key, from the rekey job's last run. */
async function keysCheck(store: DataStore, keys: { keyId: string; oldKeyIds: string[] } | null): Promise<HealthCheck> {
  const label = "Encryption keys";
  if (!keys) return { key: "keys", label, ok: false, detail: "ENCRYPTION_KEY isn't set or isn't 32 bytes." };
  const state = await lastRekeyState(store).catch(() => null);
  const current = state && state.keyId === keys.keyId && state.oldKeyIds.join(",") === [...keys.oldKeyIds].sort().join(",") ? state : null;
  const old = keys.oldKeyIds.length;
  const id = `The current key's ID is ${keys.keyId}.`;
  if (!current) return { key: "keys", label, ok: true, detail: `${id} The frequent job checks every stored value is on it.` };
  if (current.failed > 0)
    return {
      key: "keys",
      label,
      ok: false,
      detail: `${id} ${current.failed} stored values couldn't be moved to it (their context wasn't found)${old ? ": keep ENCRYPTION_KEY_OLD set" : ""}.`,
    };
  if (!current.done) return { key: "keys", label, ok: true, detail: `${id} Moving stored values to it: ${current.moved} so far.` };
  return {
    key: "keys",
    label,
    ok: true,
    detail: old ? `${id} Every stored value is on it (${current.moved} moved): ENCRYPTION_KEY_OLD can be removed.` : `${id} Every stored value is on it.`,
  };
}
