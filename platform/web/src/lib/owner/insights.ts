import { isDay } from "../analytics/days";
import { loadReport, rangeFrom, type Kpis } from "../analytics/report";
import { appZone } from "../analytics/zone";
import { BUILD_STATUS_LABEL } from "../builds/view";
import { appPlan, effectivePlans } from "../entitlements";
import { artifactLinks } from "../files";
import { serviceAccountOf } from "../hosted/notify";
import { appIsActive } from "../license/status";
import { sendAppNotification } from "../hosted/send-notification";
import { cancelScheduledNotification, editScheduledNotification, LISTED_STATUSES, localSendAt, SCHEDULED_MAX, scheduleAppNotification, type ScheduleResult } from "../hosted/scheduled-notifications";
import type { ScheduledNotification } from "../data/types";
import { hasFeature, isPlan, PLAN_FEATURES } from "../plans";
import { draftPreviewSupported } from "../preview/config";
import { createPreviewToken, previewAppPath, previewKey, PREVIEW_TTL_SECONDS } from "../preview/token";
import { planSummary } from "./account";
import { bodyObject, intParam, invalid, notFound, OwnerError, rateLimited, type OwnerContext, type OwnerResult } from "./http";
import { storageJson } from "./library";
import { appScope } from "./sales";
import { recordNotificationSent } from "../team/activity";

/**
 * 58 How the app does and where it stands: Analytics (roadmap 44),
 * notifications to its users (Dashboard › App notifications), the preview
 * link, builds and publishing (read-only) and the plan (read-only; anything
 * to pay is on yallapp.com.tr).
 */

const kpisJson = (k: Kpis) => ({ installs: k.installs, active_avg: k.activeAvg, weekly: k.weekly, monthly: k.monthly, sessions: k.sessions });

export async function analytics(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "analytics");
  const { store, now } = ctx.deps;
  const q = ctx.req.query;
  const preset = q.get("range");
  if (preset !== null && !["7", "30", "90", "custom"].includes(preset)) throw invalid({ range: "The request isn't valid." });
  if (preset === "custom" && (!isDay(q.get("from")) || !isDay(q.get("to")))) throw invalid({ from: "The request isn't valid." });
  const zone = await appZone(store, app);
  const range = rangeFrom({ range: preset, from: q.get("from"), to: q.get("to") }, now, zone);
  const report = await loadReport(store, app.id, range, now, zone);
  const share = (rows: { key: string; label: string; value: number; share: number }[]) => rows.map((r) => ({ key: r.key, label: ctx.k(r.label), value: r.value, share: r.share }));
  return {
    status: 200,
    body: {
      range: { preset: range.preset, from: range.from, to: range.to, days: range.days },
      time_zone: zone,
      has_data: report.hasData,
      kpis: kpisJson(report.kpis),
      previous: kpisJson(report.previous),
      daily: report.daily.map((d) => ({ day: d.day, active: d.active, installs: d.installs, sessions: d.sessions })),
      retention: report.retention.map((r) => ({ days: r.days, cohort: r.cohort, returned: r.returned, rate: r.rate })),
      platforms: share(report.platforms),
      countries: share(report.countries),
      screens: share(report.screens),
    },
  };
}

export async function listNotifications(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, license } = appScope(ctx, params.app_id, "notifications");
  const { store, now, encryptionKey } = ctx.deps;
  const [plan, sent] = await Promise.all([appPlan(store, license, now), store.listHostedBroadcasts(app.id, 50)]);
  return {
    status: 200,
    body: {
      // What Dashboard › App notifications says: push comes with the plan and the app's Firebase key; 68 nothing goes out once the plan ended.
      push: appIsActive(license, ctx.client, now) && hasFeature(plan, "push") && serviceAccountOf(app, encryptionKey) !== null,
      items: sent.map((n) => ({ id: n.id, title: n.title, body: n.body, sent_at: n.createdAt.toISOString() })),
    },
  };
}

/** Dashboard › App notifications' rules, limit and words (lib/hosted/send-notification.ts). */
export async function sendNotification(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, license } = appScope(ctx, params.app_id, "notifications");
  const body = bodyObject(ctx.req.body);
  const { store, now, encryptionKey } = ctx.deps;
  const result = await sendAppNotification({ store, key: encryptionKey, now, send: ctx.deps.sendPush }, app, license, { title: body.title, body: body.body });
  if (!result.ok) {
    // 68 The app's plan has ended: nothing was sent (as Media uploads wait for an active plan).
    if (result.inactive) throw new OwnerError(403, "plan_not_active", result.message ?? "");
    if (result.limited) throw rateLimited(3600, result.message);
    throw invalid(result.errors);
  }
  // 60 Who sent it, on the dashboard's Team page.
  await recordNotificationSent(store, { clientId: ctx.client.id, appId: app.id, actor: ctx.user, title: typeof body.title === "string" ? body.title.trim() : "" }, now);
  return { status: 201, body: { message: ctx.k(result.message), pushed: result.pushed } };
}

// 61 Notifications sent later (lib/hosted/scheduled-notifications.ts)

function scheduledJson(ctx: OwnerContext, n: ScheduledNotification, zone: string) {
  const local = localSendAt(n, zone);
  return { id: n.id, title: n.title, body: n.body, send_at: n.sendAt.toISOString(), local_date: local.date, local_time: local.time, status: n.status, result: n.result ? ctx.k(n.result) : null };
}

export async function listScheduled(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "notifications");
  const { store } = ctx.deps;
  const [zone, items] = await Promise.all([appZone(store, app), store.listScheduledNotifications(app.id, [...LISTED_STATUSES])]);
  return { status: 200, body: { time_zone: zone, max: SCHEDULED_MAX, items: items.map((n) => scheduledJson(ctx, n, zone)) } };
}

async function scheduledAnswer(ctx: OwnerContext, app: Parameters<typeof appZone>[1], result: ScheduleResult | null, status: number): Promise<OwnerResult> {
  if (!result) throw notFound();
  if (!result.ok) {
    if (result.inactive) throw new OwnerError(403, "plan_not_active", result.message ?? "");
    if (result.errors) throw invalid(result.errors);
    throw new OwnerError(409, status === 201 ? "too_many_scheduled" : "already_sent", result.message ?? "The request isn't valid.");
  }
  return { status, body: scheduledJson(ctx, result.notification, await appZone(ctx.deps.store, app)) };
}

export async function schedule(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "notifications");
  const body = bodyObject(ctx.req.body);
  const result = await scheduleAppNotification({ store: ctx.deps.store, now: ctx.deps.now }, app, { title: body.title, body: body.body, date: body.date, time: body.time, createdBy: ctx.user.id });
  return scheduledAnswer(ctx, app, result, 201);
}

export async function editScheduled(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "notifications");
  const body = bodyObject(ctx.req.body);
  const result = await editScheduledNotification({ store: ctx.deps.store, now: ctx.deps.now }, app, intParam(params.scheduled_id), { title: body.title, body: body.body, date: body.date, time: body.time });
  return scheduledAnswer(ctx, app, result, 200);
}

export async function cancelScheduled(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "notifications");
  const done = await cancelScheduledNotification({ store: ctx.deps.store, now: ctx.deps.now }, app, intParam(params.scheduled_id));
  if (done === "gone") throw notFound();
  if (done === "too_late") throw new OwnerError(409, "already_sent", "This notification was already sent or cancelled.");
  return { status: 204 };
}

/** The dashboard's "Preview your app": a link for an hour. */
export async function preview(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "preview");
  const body = bodyObject(ctx.req.body);
  if (body.draft !== undefined && typeof body.draft !== "boolean") throw invalid({ draft: "The request isn't valid." });
  const draft = body.draft === true && draftPreviewSupported(app);
  const { now, signingSecret, baseUrl } = ctx.deps;
  const token = createPreviewToken({ appId: app.id, draft }, previewKey(signingSecret), now);
  return { status: 200, body: { url: `${baseUrl}${previewAppPath(token)}`, expires_at: new Date(now.getTime() + PREVIEW_TTL_SECONDS * 1000).toISOString() } };
}

export async function builds(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "builds");
  const { store, now } = ctx.deps;
  const [list, request] = await Promise.all([store.listBuildsByApp(app.id, 10), app.publishingMode === "managed" ? store.getPublishingRequest(app.id) : Promise.resolve(null)]);
  return {
    status: 200,
    body: {
      items: list.map((b) => ({
        id: b.id,
        number: b.number,
        version: b.versionName,
        status: b.status,
        status_label: ctx.k(BUILD_STATUS_LABEL[b.status]),
        message: b.message,
        created_at: b.createdAt.toISOString(),
        finished_at: b.finishedAt?.toISOString() ?? null,
        files: b.status === "ready" ? artifactLinks(b.artifacts, now).map((f) => ({ kind: f.kind, label: ctx.k(f.label), url: f.href })) : [],
      })),
      publishing: {
        mode: app.publishingMode ?? "self",
        stores: request
          ? [
              { store: "google_play", status: request.android.status, url: request.android.storeUrl },
              { store: "app_store", status: request.ios.status, url: request.ios.storeUrl },
            ]
          : [],
      },
    },
  };
}

/** Read-only: renewing, changing plans and storage packs are on yallapp.com.tr, never in the app. */
export async function license(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, license: own, state } = appScope(ctx, params.app_id);
  const { store, now, baseUrl } = ctx.deps;
  const plans = await effectivePlans(store);
  const plan = own && isPlan(own.plan) ? plans[own.plan] : null;
  const next = own?.nextPlan && own.nextPlanAt && isPlan(own.nextPlan) ? { id: own.nextPlan, name: plans[own.nextPlan].name, starts_at: own.nextPlanAt.toISOString() } : null;
  return {
    status: 200,
    body: {
      state,
      plan: planSummary(plans, own, now),
      next_plan: next,
      features: plan ? PLAN_FEATURES.filter((f) => plan.features.includes(f.id)).map((f) => ctx.k(f.label)) : [],
      storage: await storageJson(ctx, app),
      manage_url: `${baseUrl}/dashboard/open/${app.id}?to=license`,
    },
  };
}

