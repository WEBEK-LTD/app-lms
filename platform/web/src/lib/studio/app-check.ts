import { sha256Hex } from "../crypto/tokens";
import type { App } from "../data/types";
import type { Pickable } from "../hosted/pages/pickable";
import type { LayoutContent } from "../pages/types";
import {
  categoryProblems,
  emptyListProblems,
  labelAloneProblems,
  missingPhotoProblems,
  pageLoadProblems,
  placeholderProblems,
  priceProblems,
  sampleDataProblems,
  sortedProblems,
  tapProblems,
  templateWordProblems,
  untranslatedProblems,
  type AppProblem,
  type CheckedApp,
  type CheckedPage,
} from "./app-check-rules";

/**
 * 182 The app check: one owner's real app, its draft (on Publish) or what's
 * published (before a build), read the way a phone reads it (`GET /pages`,
 * then each page it lists) in every language the app has, against the rules
 * of lib/studio/app-check-rules.ts. Errors stop Publish and a build the
 * owner starts; warnings ask first ("Publish anyway", "Build anyway").
 * Automatic builds are never stopped: they tell the team and the owner
 * (lib/studio/app-check-alerts.ts). Layout at a larger text size is checked
 * after each build, in a browser (build/scripts/check_app.mjs).
 */

/** The app check's answers to Publish and to a build (the dashboard's known texts, appCheck.known). */
export const APP_CHECK_TEXT = {
  blocked: "Your app has things to fix before it's published. See the list below.",
  confirm: "Your app has a few things to look at. Publish anyway, or fix them first.",
  buildBlocked: "Your app has things to fix before it's built. Fix them in Studio and publish, then build.",
  buildConfirm: "Your app has a few things to look at. Build anyway, or fix them first.",
} as const;

/** What answers the check's requests: the hosted API for this app, read-only, in a language. */
export type CheckServe = (path: string[], lang: string) => Promise<{ status: number; body?: unknown }>;

export interface AppCheckDeps {
  serve: CheckServe;
  /** The store's entries and categories, as Studio's inspector reads them. */
  pickable: () => Promise<Pickable>;
}

export interface AppCheckInput {
  app: Pick<App, "id" | "appType" | "vertical" | "backend" | "appName"> & Partial<Pick<App, "connector" | "demo">>;
  /** The layout checked: the draft on Publish, else the published one (its pages and languages). */
  layout: Pick<LayoutContent, "pages" | "languages">;
}

export interface AppCheckReport {
  /** ISO time of the check. */
  at: string;
  /** Whether the app's pages were read (an app whose pages its own site or API serves isn't checked here). */
  checked: boolean;
  /** The languages read, the main one first. */
  langs: string[];
  problems: AppProblem[];
  errors: number;
  warnings: number;
  /** The errors' fingerprint: the same set of errors, the same value (one alert and one email for each). */
  errorsKey: string;
  /** The warnings' fingerprint: Studio asks again only when they changed since "Publish anyway". */
  warningsKey: string;
}

/** The app's languages, its main one first. */
export function checkLanguages(layout: Pick<LayoutContent, "languages">): string[] {
  const main = layout.languages.default;
  return [main, ...layout.languages.available.filter((l) => l !== main)];
}

/** Whether the check can read this app's pages: Yallapp serves them (hosted). */
export function appCheckable(app: Pick<App, "backend">): boolean {
  return app.backend === "hosted";
}

/** The app as a phone in `lang` reads it; a page that doesn't load is kept with its answer. */
export async function readApp(serve: CheckServe, lang: string): Promise<CheckedApp | { lang: string; failed: number }> {
  const nav = await serve(["pages"], lang);
  if (nav.status !== 200) return { lang, failed: nav.status };
  const navigation = (nav.body ?? {}) as Record<string, unknown>;
  const pages: CheckedPage[] = [];
  for (const entry of (navigation.pages as { slug: string; screen?: string }[] | undefined) ?? []) {
    const result = await serve(["pages", entry.slug], lang);
    const body = (result.body ?? {}) as Record<string, unknown>;
    pages.push({ slug: entry.slug, screen: entry.screen ?? null, studio: result.status === 200 ? ((body.studio as CheckedPage["studio"]) ?? null) : null, result });
  }
  return { lang, navigation, pages };
}

/** The fingerprint of a severity's problems (rules, places and languages, not the words); empty without any. */
export function errorsKeyOf(problems: readonly AppProblem[], severity: AppProblem["severity"] = "error"): string {
  const keys = problems.filter((p) => p.severity === severity).map((p) => `${p.rule}|${p.page ?? ""}|${p.element ?? ""}|${p.lang ?? ""}`);
  return keys.length ? sha256Hex([...new Set(keys)].sort().join("\n")).slice(0, 16) : "";
}

/** Sums up problems found into a report. */
export function reportOf(problems: readonly AppProblem[], langs: string[], at: Date, checked = true): AppCheckReport {
  const sorted = sortedProblems(problems);
  return {
    at: at.toISOString(),
    checked,
    langs,
    problems: sorted,
    errors: sorted.filter((p) => p.severity === "error").length,
    warnings: sorted.filter((p) => p.severity === "warning").length,
    errorsKey: errorsKeyOf(sorted),
    warningsKey: errorsKeyOf(sorted, "warning"),
  };
}

/** Runs every rule on the app in each of its languages. */
export async function runAppCheck(deps: AppCheckDeps, input: AppCheckInput, now: Date): Promise<AppCheckReport> {
  const langs = checkLanguages(input.layout);
  if (!appCheckable(input.app)) return reportOf([], langs, now, false);
  const store = await deps.pickable();
  const problems: AppProblem[] = [];
  const read: CheckedApp[] = [];
  for (const lang of langs) {
    const app = await readApp(deps.serve, lang);
    if ("failed" in app) {
      problems.push({ severity: "error", rule: "page_load", lang, page: null, element: null, path: "GET /pages", values: { status: String(app.failed) } });
      continue;
    }
    read.push(app);
    problems.push(...pageLoadProblems(app), ...placeholderProblems(app), ...emptyListProblems(input.layout, app), ...priceProblems(app), ...templateWordProblems(input.app, app), ...sampleDataProblems(input.app, app), ...labelAloneProblems(input.layout, app), ...missingPhotoProblems(app));
  }
  const main = read.find((a) => a.lang === langs[0]);
  if (main) {
    // Taps and categories are the same in every language: read once, in the main one.
    problems.push(...tapProblems(input.app, main, store), ...categoryProblems(input.layout, main, store));
    for (const other of read) problems.push(...untranslatedProblems(main, other, input.app.appName));
  }
  return reportOf(problems, langs, now);
}

/** The errors of a report. */
export function checkErrors(report: Pick<AppCheckReport, "problems">): AppProblem[] {
  return report.problems.filter((p) => p.severity === "error");
}

export { fixHref } from "./app-check-links";
