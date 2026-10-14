import type { DataStore } from "../data/store";
import type { App, OwnerNotice } from "../data/types";
import type { ApiCheckResult } from "./api-check";
import { appLabel } from "./label";

/**
 * 19 The API check when an owner saves their own API: the app is saved even
 * when the check fails, and a notice (on the overview, and on Builds &
 * downloads until it's fixed) lists what failed. A later check that passes,
 * or choosing another website, resolves it. Nothing is emailed: the owner
 * has just seen the result.
 */

/** The failing checks, one line each. */
export function failedChecks(result: ApiCheckResult): string[] {
  return result.checks.filter((c) => !c.ok).map((c) => (c.detail ? `${c.label}: ${c.detail}` : c.label));
}

/** Saves the result of a check: resolves the previous notice, and leaves a new one when it failed. */
export async function recordApiCheck(
  store: DataStore,
  app: Pick<App, "id" | "clientId" | "appName">,
  result: ApiCheckResult,
  now: Date,
  baseUrl: string,
): Promise<OwnerNotice | null> {
  await store.resolveOwnerNotices(app.id, ["api_check_failed"], now);
  if (result.ok) return null;
  const crossing = (await store.countOwnerNotices(app.id, "api_check_failed")) + 1;
  const failed = failedChecks(result).join(" · ");
  return store.createOwnerNotice({
    clientId: app.clientId,
    appId: app.id,
    kind: "api_check_failed",
    dedupeKey: `api_check_failed:${crossing}`,
    title: `${appLabel(app)}: your API didn't pass the check`,
    body: `${failed.length > 900 ? `${failed.slice(0, 900)}…` : failed}. Your app can't load its content until these pass.`,
    linkUrl: `${baseUrl.replace(/\/+$/, "")}/dashboard/setup?step=website`,
    linkLabel: "Check your API",
    tone: "warn",
    createdAt: now,
    emailedAt: null,
    dismissedAt: null,
    resolvedAt: null,
  });
}

/** The app no longer uses its own API, or it passed: no failed check to show. */
export async function resolveApiCheckNotices(store: DataStore, appId: string, now: Date): Promise<void> {
  await store.resolveOwnerNotices(appId, ["api_check_failed"], now);
}

/** The app's last check, when it failed and still applies (also when the owner closed it on the overview); else null. */
export async function failedApiCheck(store: DataStore, app: Pick<App, "id" | "clientId" | "backend">): Promise<OwnerNotice | null> {
  if (app.backend !== "custom_api") return null;
  const notices = await store.listOwnerNotices({ clientId: app.clientId, appId: app.id, limit: 20 });
  return notices.find((n) => n.kind === "api_check_failed" && n.resolvedAt === null) ?? null;
}
