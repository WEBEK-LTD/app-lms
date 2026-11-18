import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { closeAlerts, raiseAlert, type TeamMail } from "../watch/alerts";
import type { AppCheckReport } from "./app-check";
import type { AppProblem } from "./app-check-rules";

/**
 * 182 What the app check found, for an app that isn't stopped by it: an
 * automatic build (87.4, 138's Yallapp releases) and the check after each
 * build (build/scripts/check_app.mjs). The team sees an alert in Admin ›
 * Watching, one per app and set of errors (`app_check:<app>:<errors>`), and
 * the owner gets one email when that set is new: seen again, the alert is
 * counted, nobody is emailed again. Once the errors are gone (or are others),
 * the app's earlier alert closes by itself.
 */

/** The alert key of an app's errors. */
export const appCheckAlertKey = (appId: string, errorsKey: string) => `app_check:${appId}:${errorsKey}`;

/** Emails the owner what the app check found (wired in lib/studio/app-check-env.ts). */
export type OwnerCheckMail = (app: App, problems: AppProblem[], where: "app" | "build") => Promise<void>;

export interface AppCheckAlertDeps {
  store: DataStore;
  now: Date;
  mail?: TeamMail | null;
  ownerMail?: OwnerCheckMail | null;
}

/** One line for the team per error: the rule, where, the language. */
export function teamLine(p: Pick<AppProblem, "rule" | "path" | "lang" | "values">): string {
  const values = Object.entries(p.values)
    .map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 80)}`)
    .join(" ");
  return `${p.rule}${p.lang ? ` [${p.lang}]` : ""}: ${p.path}${values ? ` (${values})` : ""}`;
}

/**
 * Tells the team and the owner of the app check's errors; closes the app's
 * earlier alert when they went. Returns "raised" when the set is new (the
 * owner was emailed), "seen" when it was already open, "clean" without errors.
 * Never throws.
 */
export async function tellAppCheck(deps: AppCheckAlertDeps, app: App, report: Pick<AppCheckReport, "problems" | "errorsKey">, where: "app" | "build" = "app"): Promise<"raised" | "seen" | "clean"> {
  const { store, now } = deps;
  const prefix = `app_check:${app.id}:`;
  const errors = report.problems.filter((p) => p.severity === "error");
  const key = errors.length ? appCheckAlertKey(app.id, report.errorsKey || "errors") : null;
  try {
    const open = await store.listTeamAlerts({ open: true, limit: 500 });
    await closeAlerts(store, open.filter((a) => a.key.startsWith(prefix) && a.key !== key).map((a) => a.key), now);
    if (!key) return "clean";
    const name = app.appName?.trim() || app.id;
    const alert = await raiseAlert(
      store,
      {
        kind: "app_check",
        key,
        title: `${name}: ${errors.length} ${errors.length === 1 ? "thing" : "things"} its customers see broken${where === "build" ? " (after a build)" : ""}`,
        detail: errors.slice(0, 40).map(teamLine).join("\n"),
        link: `/admin/app-check?app=${app.id}`,
      },
      now,
      deps.mail,
    );
    // Opened by this call: counted once, and made now (a database keeps whole seconds).
    const isNew = alert !== null && alert.count === 1 && Math.abs(alert.createdAt.getTime() - now.getTime()) < 5000;
    if (isNew && deps.ownerMail && !app.demo) {
      try {
        await deps.ownerMail(app, errors, where);
      } catch (error) {
        console.error("[app-check] owner email", error instanceof Error ? error.message : String(error));
      }
    }
    return isNew ? "raised" : "seen";
  } catch (error) {
    console.error("[app-check] alert", error instanceof Error ? error.message : String(error));
    return "seen";
  }
}
