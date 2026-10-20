import { isLang } from "@/i18n/config";
import { contextFor } from "./auth";
import { appAreas } from "../app/areas";
import { appLabel } from "../app/label";
import { kindOf } from "../app/kinds";
import { contactFrom, DEFAULT_CONTACT } from "../contact";
import type { App, OwnerDevice, OwnerPushPreferences } from "../data/types";
import { OWNER_PUSH_KINDS } from "../data/types";
import { appState, clientAccountState, daysUntil, type AccountState } from "../license/status";
import { getPlans, platformSetting } from "../settings/platform";
import { isPlan, type Plan, type PlanInfo } from "../plans";
import { loadUpdates, markRead } from "../updates";
import { readerOf, itemWords } from "../updates-view";
import { bellWords, dashboardTextFor } from "../dashboard-words";
import { bodyObject, invalid, notFound, OwnerError, type OwnerContext, type OwnerResult } from "./http";
import { allowedAreas, areasOf, teamCan } from "../team/permissions";
import { businessName } from "../team/service";

/**
 * 58 The account: who is signed in, their apps (with what each has, as the
 * dashboard's menu), their language, devices and push choices, and the
 * dashboard's bell ("Updates from Yallapp") with the same read state.
 */

/** Pending and suspended accounts see their state and nothing else, as the dashboard sends them to its waiting page. */
export function requireActive(ctx: OwnerContext): void {
  if (ctx.client.status === "active") return;
  if (ctx.client.status === "suspended") throw new OwnerError(403, "account_suspended", "Your account is suspended. Message Yallapp on WhatsApp.");
  throw new OwnerError(403, "account_pending", "Your account is waiting for activation. We'll tell you as soon as it's active.");
}

export function planSummary(plans: Record<Plan, PlanInfo>, license: { plan: string; expiresAt: Date } | null, now: Date) {
  if (!license || !isPlan(license.plan)) return null;
  return { id: license.plan, name: plans[license.plan].name, expires_at: license.expiresAt.toISOString(), days_left: Math.max(0, daysUntil(license.expiresAt, now)) };
}

export function appStateOf(ctx: OwnerContext, app: App): AccountState {
  return appState(ctx.client, ctx.licenses.find((l) => l.appId === app.id) ?? null, ctx.deps.now);
}

/** `AppSummary` in docs/api/owner.yaml. */
export function appSummaryJson(ctx: OwnerContext, app: App, plans: Record<Plan, PlanInfo>) {
  // 60 What the app has and the person's role allows.
  const areas = allowedAreas(appAreas(app), ctx.access, app.id);
  const license = ctx.licenses.find((l) => l.appId === app.id) ?? null;
  const name = appLabel(app);
  return {
    id: app.id,
    name: ctx.k(name),
    type: app.appType,
    vertical: app.vertical ?? null,
    type_name: ctx.k(kindOf(app).name),
    backend: app.backend ?? null,
    state: appStateOf(ctx, app),
    icon_url: app.iconAssetId ? `${ctx.deps.baseUrl}/api/v1/assets/${app.iconAssetId}` : null,
    plan: planSummary(plans, license, ctx.deps.now),
    features: {
      orders: areas.orders,
      kitchen: areas.kitchen,
      appointments: areas.appointments,
      events: areas.events,
      check_in: areas.checkIn,
      donations: areas.donations,
      products: areas.products,
      courses: areas.courses,
      articles: areas.articles,
      listings: areas.listings,
      inquiries: areas.inquiries,
      app_users: areas.appUsers,
      notifications: areas.notifications,
      media: areas.media,
      analytics: areas.analytics,
      preview: areas.preview,
      builds: areas.builds,
    },
    access: {
      role: ctx.access.role,
      areas: areasOf(ctx.access),
      license: teamCan(ctx.access, "billing", app.id),
      team: teamCan(ctx.access, "team", app.id),
      settings: teamCan(ctx.access, "settings", app.id),
    },
  };
}

/** 60 `Business` in docs/api/owner.yaml. */
async function businessesJson(ctx: OwnerContext) {
  const { store, now } = ctx.deps;
  return Promise.all(
    ctx.businesses.map(async (b) => {
      const [apps, licenses] = await Promise.all([store.listAppsByClient(b.client.id), store.listLicensesByClient(b.client.id)]);
      const name = businessName(b.owner, apps.filter((a) => b.access.appIds === null || b.access.role === "owner" || b.access.appIds.includes(a.id)));
      return { id: b.client.id, name: name === "Untitled app" ? ctx.k(name) : name, role: b.access.role, state: clientAccountState(b.client, licenses, now) };
    }),
  );
}

export async function meJson(ctx: OwnerContext) {
  const { store, baseUrl } = ctx.deps;
  const active = ctx.client.status === "active";
  const [plans, contact] = await Promise.all([getPlans(store), platformSetting(store, "contact")]);
  const support = contactFrom(contact?.value ?? DEFAULT_CONTACT);
  const businesses = await businessesJson(ctx);
  return {
    user: { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email, language: isLang(ctx.user.language) ? ctx.user.language : null },
    business: businesses.find((b) => b.id === ctx.client.id) ?? null,
    businesses,
    account: {
      state: ctx.state,
      message: ctx.client.status === "suspended" ? ctx.k("Your account is suspended. Message Yallapp on WhatsApp.") : ctx.client.status === "pending" ? ctx.k("Your account is waiting for activation. We'll tell you as soon as it's active.") : null,
    },
    apps: active ? ctx.apps.map((app) => appSummaryJson(ctx, app, plans)) : [],
    links: { dashboard: `${baseUrl}/dashboard`, support_whatsapp: support.whatsappUrl, support_email: support.email },
  };
}

export async function getMe(ctx: OwnerContext): Promise<OwnerResult> {
  return { status: 200, body: await meJson(ctx) };
}

/** 60 `PUT /me/business`: this device works on another business the person is on; its pushes follow. */
export async function setBusiness(ctx: OwnerContext): Promise<OwnerResult> {
  const id = bodyObject(ctx.req.body).business_id;
  if (typeof id !== "string" || !id) throw invalid({ business_id: "The request isn't valid." });
  if (!ctx.businesses.some((b) => b.client.id === id)) throw notFound();
  await ctx.deps.store.updateOwnerDevice(ctx.device.id, { clientId: id });
  const device = { ...ctx.device, clientId: id };
  const client = ctx.businesses.find((b) => b.client.id === id)!.client;
  const next = await contextFor(ctx.deps, ctx.req, ctx.user, client, device);
  return { status: 200, body: await meJson(next) };
}

/** `PUT /me/language`: the dashboard's own choice (`users.language`). */
export async function setLanguage(ctx: OwnerContext): Promise<OwnerResult> {
  const body = bodyObject(ctx.req.body);
  const language = body.language;
  if (!("language" in body) || (language !== null && !isLang(language))) throw invalid({ language: "Choose English, Arabic or Turkish." });
  await ctx.deps.store.updateUser(ctx.user.id, { language: language as string | null }, ctx.deps.now);
  const user = { ...ctx.user, language: language as string | null };
  const lang = isLang(language) ? language : ctx.lang;
  const words = dashboardTextFor(lang);
  const next: OwnerContext = { ...ctx, user, lang, t: words.t, k: words.k };
  return { status: 200, body: await meJson(next) };
}

function deviceJson(device: OwnerDevice, current: string) {
  return {
    id: device.id,
    name: device.name,
    platform: device.platform,
    app_version: device.appVersion,
    created_at: device.createdAt.toISOString(),
    last_seen_at: device.lastSeenAt.toISOString(),
    current: device.id === current,
    push: Boolean(device.pushToken),
  };
}

export async function listDevices(ctx: OwnerContext): Promise<OwnerResult> {
  const devices = await ctx.deps.store.listOwnerDevices(ctx.user.id);
  return { status: 200, body: { items: devices.map((d) => deviceJson(d, ctx.device.id)) } };
}

export async function signOutDevice(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  if (!(await ctx.deps.store.deleteOwnerDevice(ctx.user.id, params.device_id ?? ""))) throw notFound();
  return { status: 204 };
}

export async function signOut(ctx: OwnerContext): Promise<OwnerResult> {
  await ctx.deps.store.deleteOwnerDevice(ctx.user.id, ctx.device.id);
  return { status: 204 };
}

export async function signOutAll(ctx: OwnerContext): Promise<OwnerResult> {
  await ctx.deps.store.deleteOwnerDevices(ctx.user.id);
  return { status: 204 };
}

export async function setPushToken(ctx: OwnerContext): Promise<OwnerResult> {
  const body = bodyObject(ctx.req.body);
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const provider = body.provider ?? "fcm";
  if (!token || token.length > 512 || /\s/.test(token)) throw invalid({ token: "Send the phone's push token." });
  if (provider !== "fcm" && provider !== "hms") throw invalid({ provider: "The request isn't valid." });
  // A token belongs to one phone: another device (another account signed in on it before) stops getting its pushes.
  await ctx.deps.store.clearOwnerPushToken(token, ctx.device.id);
  await ctx.deps.store.updateOwnerDevice(ctx.device.id, { pushToken: token, pushProvider: provider });
  return { status: 204 };
}

export async function deletePushToken(ctx: OwnerContext): Promise<OwnerResult> {
  await ctx.deps.store.updateOwnerDevice(ctx.device.id, { pushToken: null });
  return { status: 204 };
}

export function preferencesJson(saved: OwnerPushPreferences | null): Record<string, boolean> {
  return Object.fromEntries(OWNER_PUSH_KINDS.map((kind) => [kind, saved?.[kind] !== false]));
}

export async function getPushPreferences(ctx: OwnerContext): Promise<OwnerResult> {
  return { status: 200, body: preferencesJson(ctx.device.pushPreferences) };
}

export async function setPushPreferences(ctx: OwnerContext): Promise<OwnerResult> {
  const body = bodyObject(ctx.req.body);
  const next: OwnerPushPreferences = { ...(ctx.device.pushPreferences ?? {}) };
  for (const [kind, value] of Object.entries(body)) {
    if (!(OWNER_PUSH_KINDS as readonly string[]).includes(kind) || typeof value !== "boolean") throw invalid({ [kind]: "Send true or false for each kind of notification." });
    next[kind as keyof OwnerPushPreferences] = value;
  }
  await ctx.deps.store.updateOwnerDevice(ctx.device.id, { pushPreferences: next });
  return { status: 200, body: preferencesJson(next) };
}

// 57 The bell: "Updates from Yallapp"

async function updatesOf(ctx: OwnerContext) {
  // 60 The person reads for themselves, and sees what their role on the team allows.
  return loadUpdates(
    ctx.deps.store,
    readerOf({ user: ctx.user, staff: null, member: null, access: ctx.access, client: ctx.client, apps: ctx.apps, account: ctx.state, licenses: ctx.licenses }, ctx.lang),
    ctx.deps.now,
  );
}

export async function listUpdates(ctx: OwnerContext): Promise<OwnerResult> {
  const updates = await updatesOf(ctx);
  const words = bellWords(dashboardTextFor(ctx.lang));
  return {
    status: 200,
    body: {
      unread: updates.unread,
      items: updates.all.map((item) => {
        const text = itemWords(item, words);
        return {
          key: item.key,
          kind: item.kind,
          kind_label: words.kind(item.kind),
          title: text.title,
          body: text.body,
          summary: text.summary,
          link: item.linkUrl ? new URL(item.linkUrl, ctx.deps.baseUrl).toString() : null,
          link_label: text.linkLabel,
          app_name: item.app,
          at: item.at.toISOString(),
          unread: item.unread,
          current: item.current,
        };
      }),
    },
  };
}

export async function markUpdates(ctx: OwnerContext): Promise<OwnerResult> {
  const body = bodyObject(ctx.req.body);
  const keys = body.keys;
  if (keys !== undefined && (!Array.isArray(keys) || keys.length > 200)) throw invalid({ keys: "The request isn't valid." });
  const updates = await updatesOf(ctx);
  const wanted = body.all === true ? updates.current.map((item) => item.key) : ((keys as unknown[] | undefined) ?? []);
  // Only what is listed for this account; other keys are ignored.
  const listed = new Set(updates.all.map((item) => item.key));
  await markRead(ctx.deps.store, ctx.user.id, wanted.filter((key) => typeof key === "string" && listed.has(key)), ctx.deps.now);
  const after = await updatesOf(ctx);
  return { status: 200, body: { unread: after.unread } };
}

