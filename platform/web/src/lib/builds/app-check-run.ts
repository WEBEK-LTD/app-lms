import { z } from "zod";
import { SCREENS as SHOT_SCREENS } from "../app/auto-screenshots";
import { sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, Build, BuildAppCheck, BuildAppIssue } from "../data/types";
import { BUILD_ISSUE_KINDS } from "../data/types";
import type { Layout, LayoutContent } from "../pages/types";
import { createPreviewToken, previewAppPath, previewKey } from "../preview/token";
import { checkLanguages } from "../studio/app-check";
import { raiseAlert, closeAlerts, type TeamMail } from "../watch/alerts";

/**
 * 182 The check after each client build (build-apps.yml › App check): the
 * app's own preview opened in Chromium at a phone's size, every screen its
 * navigation and Studio pages reach, in its main language at the standard
 * text size and in one more at 1.3, with Flutter's errors, overflows and the
 * requests that failed read from the browser (build/scripts/check_app.mjs).
 * It never holds or fails the build: the result is the build's `app_check`
 * stage and what it found, shown in Builds and to the team.
 */

/** A phone of 360 × 800 points: the narrowest common Android width (163's Samsung). */
export const CHECK_VIEWPORT = { width: 360, height: 800 } as const;
/** The larger text size of the second pass. */
export const CHECK_LARGE_SCALE = 1.3;
/** At most this many screens a pass, to keep the job in its time (each takes 3 to 4 seconds). */
export const CHECK_ROUTES_MAX = 40;
/** The preview link lasts the job's time and more. */
export const CHECK_PREVIEW_SECONDS = 2 * 3600;
/** A run not reported in this long is closed as failed. */
export const CHECK_STALE_MS = 2 * 3600_000;

/**
 * The passes: the main language at the standard size (what most customers
 * see) and one other language at 1.3 (Arabic when the app has it: right to
 * left at a larger size is where 163's overflows were), else the main
 * language at 1.3 too. Two passes keep the job within its budget whatever
 * the number of languages.
 */
export function checkPasses(layout: Pick<LayoutContent, "languages">): { lang: string; scale: number }[] {
  const [main, ...others] = checkLanguages(layout);
  const second = others.includes("ar") ? "ar" : (others[0] ?? main!);
  return [
    { lang: main!, scale: 1 },
    { lang: second, scale: CHECK_LARGE_SCALE },
  ];
}

/**
 * The screens a built-in screen action opens in the app, where the preview
 * has an address for it (mobile/lib/core/routing/paths.dart). Others are
 * reached only through the pages that open them.
 */
const SCREEN_ROUTES: Partial<Record<string, string>> = {
  courses: "/courses",
  my_courses: "/my-courses",
  account: "/account",
  settings: "/account/settings",
  notifications: "/notifications",
  cart: "/cart",
  orders: "/account/orders",
  services: "/services",
  appointments: "/appointments",
  classes: "/classes",
  memberships: "/memberships",
  events: "/events",
  campaigns: "/campaigns",
  restaurants: "/restaurants",
  ride: "/ride",
  messages: "/chat",
};

/** Every screen to open: Home, each page the app serves, the screens its tabs, More and menu open, the kind's main lists. */
export function checkRoutes(app: Pick<App, "appType">, layout: Pick<LayoutContent, "pages" | "tabs" | "menu"> & { more?: unknown }): string[] {
  const routes: string[] = ["/"];
  for (const page of layout.pages) if (page.slug !== "home") routes.push(`/page/${encodeURIComponent(page.slug)}`);
  const targets = [...(layout.tabs ?? []), ...((layout as { more?: { target?: { type?: string; screen?: string | null } }[] }).more ?? []), ...((layout.menu ?? []) as { target?: { type?: string; screen?: string | null } }[])];
  for (const t of targets as { target?: { type?: string; screen?: string | null } }[]) {
    const route = t.target?.type === "screen" && t.target.screen ? SCREEN_ROUTES[t.target.screen] : undefined;
    if (route) routes.push(route);
  }
  for (const plan of SHOT_SCREENS[app.appType] ?? []) if (!plan.route.includes("{")) routes.push(plan.route);
  return [...new Set(routes)].slice(0, CHECK_ROUTES_MAX);
}

/** docs/api/pipeline.yaml › AppCheckPlan. */
export interface AppCheckPlan {
  build_id: string;
  app_id: string;
  preview_url: string;
  storage: Record<string, string>;
  viewport: { width: number; height: number };
  passes: { lang: string; scale: number }[];
  routes: string[];
}

export type ClaimCheckResult = { ok: true; plan: AppCheckPlan } | { ok: false; code: "not_checkable" | "build_not_built"; message: string };

/** POST /builds/{id}/app-check/claim: the check of this build starts, with its preview link and what to open. */
export async function claimAppCheck(store: DataStore, build: Build, now: Date, platform: { url: string; signingSecret: string }): Promise<ClaimCheckResult> {
  const app = await store.getAppById(build.appId);
  if (!app || app.deletedAt || (build.variant ?? "app") !== "app") return { ok: false, code: "not_checkable", message: "Only the customers' app of an app that's still here is checked." };
  if (build.status === "queued" || build.status === "failed") return { ok: false, code: "build_not_built", message: "Only a build the pipeline made is checked." };
  const record = await store.getAppLayout(app.id);
  const layout: Layout | LayoutContent | null = record?.published ?? record?.draft ?? null;
  if (!layout) return { ok: false, code: "not_checkable", message: "The app has no pages yet." };
  const token = createPreviewToken({ appId: app.id, draft: !record?.published }, previewKey(platform.signingSecret), now, CHECK_PREVIEW_SECONDS);
  const passes = checkPasses(layout);
  await store.updateBuild(build.id, { stages: { ...build.stages, app_check: "running" }, appCheck: { status: "running", at: now.toISOString(), viewport: { ...CHECK_VIEWPORT }, passes: [], issues: [] } }, now);
  return {
    ok: true,
    plan: {
      build_id: build.id,
      app_id: app.id,
      // check=1: the preview reports Flutter's errors and overflows on the console (mobile/lib/core/preview/preview_check.dart).
      preview_url: `${platform.url.replace(/\/$/, "")}${previewAppPath(token)}&theme=light&os=android&check=1`,
      storage: { [`yallapp.preview.${app.id}.settings.guest_mode`]: "true" },
      viewport: { ...CHECK_VIEWPORT },
      passes,
      routes: checkRoutes(app, layout),
    },
  };
}

/** docs/api/pipeline.yaml › AppCheckResult. */
export const appCheckResultSchema = z
  .object({
    status: z.enum(["done", "failed"]),
    passes: z
      .array(z.object({ lang: z.string().regex(/^[a-z]{2,3}$/), scale: z.number().min(0.5).max(3), routes: z.number().int().min(0).max(1000) }).strict())
      .max(10)
      .default([]),
    issues: z
      .array(
        z
          .object({
            kind: z.enum(BUILD_ISSUE_KINDS),
            lang: z.string().regex(/^[a-z]{2,3}$/),
            scale: z.number().min(0.5).max(3),
            route: z.string().max(500),
            message: z.string().max(500),
          })
          .strict(),
      )
      .max(500)
      .default([]),
    message: z.string().max(2000).nullable().optional(),
    check_mode: z.boolean().optional(),
  })
  .strict();

export type AppCheckResultInput = z.infer<typeof appCheckResultSchema>;

/** The same issue seen on several screens or passes is one, kept once per screen (overflows of one row on each screen). */
export function distinctIssues(issues: readonly BuildAppIssue[]): BuildAppIssue[] {
  const seen = new Set<string>();
  const out: BuildAppIssue[] = [];
  for (const issue of issues) {
    const key = `${issue.kind}|${issue.lang}|${issue.scale}|${issue.route}|${issue.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(issue);
  }
  return out;
}

export const buildCheckAlertKey = (appId: string, issues: readonly BuildAppIssue[]) =>
  `app_check_build:${appId}:${sha256Hex([...new Set(issues.map((i) => `${i.kind}|${i.route}|${i.message}`))].sort().join("\n")).slice(0, 12)}`;

/** POST /builds/{id}/app-check: what the check found, kept on the build (accepted after it finished: the check never holds it). */
export async function saveAppCheckResult(store: DataStore, build: Build, input: AppCheckResultInput, now: Date, mail?: TeamMail | null): Promise<BuildAppCheck> {
  const issues = distinctIssues(input.issues);
  const result: BuildAppCheck = {
    status: input.status,
    at: now.toISOString(),
    viewport: build.appCheck?.viewport ?? { ...CHECK_VIEWPORT },
    passes: input.passes,
    issues,
    message: input.message ?? null,
    ...(input.check_mode !== undefined ? { checkMode: input.check_mode } : {}),
  };
  await store.updateBuild(build.id, { stages: { ...build.stages, app_check: input.status === "done" ? "done" : "failed" }, appCheck: result }, now);
  // The team: one alert per app and set of issues; the app's earlier one closes when the issues went.
  const prefix = `app_check_build:${build.appId}:`;
  const key = issues.length ? buildCheckAlertKey(build.appId, issues) : null;
  const open = await store.listTeamAlerts({ open: true, limit: 500 });
  await closeAlerts(store, open.filter((a) => a.key.startsWith(prefix) && a.key !== key).map((a) => a.key), now);
  if (key) {
    const app = await store.getAppById(build.appId);
    const name = app?.appName?.trim() || build.appId;
    await raiseAlert(
      store,
      {
        kind: "app_check",
        key,
        title: `${name} build #${build.number}: ${issues.length} ${issues.length === 1 ? "problem" : "problems"} on its screens`,
        detail: issues.slice(0, 30).map((i) => `${i.kind} [${i.lang} ${i.scale}] ${i.route}: ${i.message}`).join("\n"),
        link: `/admin/app-check?app=${build.appId}`,
      },
      now,
      mail,
    );
  }
  return result;
}

/** A check claimed but never reported (the job was cancelled or timed out): shown as not finished. */
export function appCheckShown(build: Pick<Build, "appCheck">, now: Date): BuildAppCheck | null {
  const check = build.appCheck ?? null;
  if (check?.status === "running" && now.getTime() - Date.parse(check.at) > CHECK_STALE_MS) return { ...check, status: "failed", message: "The check didn't report back in time." };
  return check;
}
