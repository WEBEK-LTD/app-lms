import "server-only";
import type { DataStore } from "../data/store";
import type { TeamAlert } from "../data/types";
import { appUrl, buildPipelineToken, filesBaseUrl, githubDispatch, mediaBaseUrl, mediaMode, ownerPushCredentials, superAdminEmails } from "../env";
import { sendTemplate } from "../email/send";
import { parseServiceAccount } from "../hosted/push";
import { smtpConfigured } from "../mail";
import type { HealthDeps } from "./health";

/** 78.3 A new alert, emailed to the team (the super admins). */
export async function teamMail(alert: TeamAlert): Promise<void> {
  const values = { title: alert.title, detail: alert.detail, alert_url: `${appUrl()}${alert.link ?? "/admin/watching"}` };
  for (const to of superAdminEmails()) await sendTemplate("team_alert", to, values);
}

/** What the health check reads from the environment. */
export async function healthDeps(store: DataStore, now: Date): Promise<HealthDeps> {
  const push = ownerPushCredentials().serviceAccountJson;
  let gate: string | null = null;
  try {
    gate = mediaMode() === "host" ? mediaBaseUrl() : null;
  } catch {
    gate = null;
  }
  let files: string | null = null;
  try {
    files = filesBaseUrl();
  } catch {
    files = null;
  }
  let dispatch = false;
  try {
    dispatch = Boolean(githubDispatch());
  } catch {
    dispatch = false;
  }
  return {
    store,
    now,
    mediaGate: gate,
    filesHost: files,
    email: await smtpConfigured(store).catch(() => false),
    ownerPush: !push ? "unset" : parseServiceAccount(push) ? "ok" : "invalid",
    pipelineToken: Boolean(buildPipelineToken()),
    dispatchToken: dispatch,
  };
}

/** Whether GITHUB_DISPATCH_TOKEN is set (a waiting build's alert says what to do). */
export function dispatchSet(): boolean {
  try {
    return Boolean(githubDispatch());
  } catch {
    return false;
  }
}
