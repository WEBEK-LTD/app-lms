"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/admin/audit";
import { revealLicenseKey } from "@/lib/admin/clients";
import { checkConnection, type ConnectionStatus } from "@/lib/admin/connection";
import type { AdminPermission } from "@/lib/admin/permissions";
import { appLabel } from "@/lib/app/label";
import { queueBuild } from "@/lib/app/setup";
import { assetUrl } from "@/lib/assets";
import { createPasswordReset } from "@/lib/auth/reset";
import { requireAdmin } from "@/lib/auth/session";
import { startPipeline } from "@/lib/builds/dispatch";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { announce, NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX, serviceAccountOf } from "@/lib/hosted/notify";
import { emailLangOf, sendTemplate } from "@/lib/email/send";
import { localePath } from "@/i18n/paths";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { newId } from "@/lib/crypto/tokens";
import { effectivePlans } from "@/lib/entitlements";
import { packOffers } from "@/lib/media/packs";
import { resolveStorageNotices } from "@/lib/media/usage";
import { platformSetting } from "@/lib/settings/platform";
import { getPlans } from "@/lib/settings/platform";
import { featureOn, getSwitches } from "@/lib/switches";
import { formatDate } from "@/components/ui";

/**
 * Actions on a client's page in the admin (roadmap 11.2), each limited by
 * the team member's role and written to the audit log.
 */

const ID = /^[0-9a-f-]{36}$/i;

/**
 * The client of the form, and the app it acts on: the form's `appId` (one of
 * the client's apps), or their only app. `app` is null when it isn't one of
 * theirs, or they have several and none was named. `license` is that app's.
 */
async function clientFrom(formData: FormData, permission: AdminPermission) {
  const admin = await requireAdmin(permission);
  const clientId = String(formData.get("clientId") ?? "");
  const store = await getStore();
  const client = ID.test(clientId) ? await store.getClientById(clientId) : null;
  if (!client) redirect("/admin/clients");
  const [user, apps] = await Promise.all([store.getUserById(client.userId), store.listAppsByClient(client.id)]);
  const appId = String(formData.get("appId") ?? "");
  const app = appId ? (apps.find((a) => a.id === appId) ?? null) : apps.length === 1 ? apps[0]! : null;
  // Before the account's first app, the license given for it (app ID null).
  const license = app || (!appId && apps.length === 0) ? await store.getLicenseForApp(client.id, app?.id ?? null) : null;
  return { admin, store, client, user, app, apps, license };
}

/** " (App name)" in audit summaries of an account with several apps. */
const onApp = (app: { appName: string | null } | null, apps: unknown[]) => (app && apps.length > 1 ? ` (${appLabel(app)})` : "");

const back = (clientId: string, query: string): never => {
  revalidatePath(`/admin/clients/${clientId}`);
  redirect(`/admin/clients/${clientId}?${query}`);
};

/** Queues a build again with the same version, like the client's own "Start build". */
export async function rerunBuildAction(formData: FormData): Promise<void> {
  const { admin, store, client, user } = await clientFrom(formData, "builds.manage");
  const build = await store.getBuild(String(formData.get("buildId") ?? ""));
  // The build's own app, on that app's own plan.
  const app = build && build.clientId === client.id ? await store.getAppById(build.appId) : null;
  if (!app || !build) back(client.id, "done=rerun-failed");
  const license = await store.getLicenseForApp(client.id, app!.id);
  const result = await queueBuild(store, { client, app: app!, license, versionName: build!.versionName }, new Date(), assetUrl);
  if (!result.ok) back(client.id, `rerun=${result.reason}`);
  if (result.ok) {
    await startPipeline();
    await recordAudit({
      actor: admin,
      action: "build.rerun",
      target: { type: "build", id: result.build.id },
      clientId: client.id,
      summary: `Ran ${user?.name ?? "the client"}'s build #${build!.number} (${build!.versionName}) again as #${result.build.number} (${appLabel(app)})`,
    });
  }
  back(client.id, "done=rerun");
}

/** Signs an app customer out of every device. */
export async function signOutAppUserAction(formData: FormData): Promise<void> {
  const { admin, store, client, app, apps } = await clientFrom(formData, "clients.edit");
  const userId = Number(formData.get("userId"));
  const customer = app && Number.isSafeInteger(userId) ? await store.getHostedUser(app.id, userId) : null;
  if (!app || !customer) back(client.id, "");
  const devices = await store.listHostedDevices(app!.id, customer!.id);
  for (const device of devices) await store.deleteHostedDevice(app!.id, device.id);
  await recordAudit({
    actor: admin,
    action: "client.app_users",
    target: { type: "app", id: app!.id },
    clientId: client.id,
    summary: `Signed app user #${customer!.id} out of ${devices.length} ${devices.length === 1 ? "device" : "devices"}${onApp(app, apps)}`,
  });
  back(client.id, "done=signed-out#app-users");
}

/** Deletes an app customer with their devices, sign-ins and notifications. */
export async function deleteAppUserAction(formData: FormData): Promise<void> {
  const { admin, store, client, app, apps } = await clientFrom(formData, "clients.edit");
  const userId = Number(formData.get("userId"));
  const customer = app && Number.isSafeInteger(userId) ? await store.getHostedUser(app.id, userId) : null;
  if (!app || !customer) back(client.id, "");
  await store.deleteHostedUser(app!.id, customer!.id);
  await recordAudit({
    actor: admin,
    action: "client.app_users",
    target: { type: "app", id: app!.id },
    clientId: client.id,
    summary: `Deleted app user #${customer!.id} (${customer!.name})${onApp(app, apps)}`,
    before: { id: customer!.id, name: customer!.name, createdAt: customer!.createdAt },
  });
  back(client.id, "done=user-deleted#app-users");
}

/** A notification to everyone using the app, like the client sends from their dashboard. */
export async function sendClientNotificationAction(_: FormState, formData: FormData): Promise<FormState> {
  const { admin, store, client, app, apps, license } = await clientFrom(formData, "clients.edit");
  if (!app || app.backend !== "hosted") return { message: "Notifications are sent to apps on the hosted API." };
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const values = { title, body };
  const errors: Record<string, string> = {};
  if (!title) errors.title = "Enter a title.";
  else if (title.length > NOTIFICATION_TITLE_MAX) errors.title = `Keep the title to ${NOTIFICATION_TITLE_MAX} characters.`;
  if (!body) errors.body = "Enter a message.";
  else if (body.length > NOTIFICATION_BODY_MAX) errors.body = `Keep the message to ${NOTIFICATION_BODY_MAX} characters.`;
  if (Object.keys(errors).length) return { errors, values };
  const now = new Date();
  const limit = await hitRateLimit(store, RATE_LIMITS.hostedNotify, app.id, now);
  if (!limit.allowed) return { message: "This app sent many notifications in a short time. Try again in an hour.", values };
  const push = featureOn(await getSwitches(store), "push", license?.plan ?? null);
  const result = await announce({ store, app, title, body, account: push ? serviceAccountOf(app, encryptionKey()) : null, now });
  await recordAudit({
    actor: admin,
    action: "client.notification",
    target: { type: "app", id: app.id },
    clientId: client.id,
    summary: `Sent "${title}" to the app's users${onApp(app, apps)}`,
    after: { title, body, pushed: result.pushed },
  });
  revalidatePath(`/admin/clients/${client.id}`);
  if (!push) return { ok: true, message: "Added to the app users' inboxes. Push is switched off for this app's plan." };
  if (result.pushError) return { ok: true, message: `Added to the app users' inboxes. ${result.pushError}` };
  return { ok: true, message: `Sent. It's in the app users' inboxes and went to ${result.pushed} ${result.pushed === 1 ? "phone" : "phones"}.` };
}

/** The activation email with the license key, again. */
export async function resendLicenseEmailAction(formData: FormData): Promise<void> {
  const { admin, store, client, user, app, apps, license } = await clientFrom(formData, "clients.email");
  if (!user || !license) back(client.id, "");
  const plan = (await getPlans(store))[license!.plan].name;
  await sendTemplate("account_activated", user!.email, {
    name: user!.name,
    app_name: appLabel(app),
    plan,
    active_until: formatDate(license!.expiresAt),
    license_key: revealLicenseKey(license!, encryptionKey()),
    dashboard_url: `${appUrl()}/dashboard`,
    payment_line: "",
  }, { lang: emailLangOf(user!) }).catch((error: unknown) => console.error("[mail] license email failed", error));
  await recordAudit({ actor: admin, action: "client.email", target: { type: "client", id: client.id }, clientId: client.id, summary: `Emailed the license key to ${user!.email} again${onApp(app, apps)}` });
  back(client.id, "done=license-sent");
}

/** A link to set or reset the client's password, by email. */
export async function sendPasswordLinkAction(formData: FormData): Promise<void> {
  const { admin, store, client, user } = await clientFrom(formData, "clients.email");
  if (!user) back(client.id, "");
  const reset = await createPasswordReset(store, user!.email, new Date(), { adminEmails: [] });
  if (reset) {
    const lang = emailLangOf(reset.user);
    const link = `${appUrl()}${localePath(lang, `/reset-password?token=${encodeURIComponent(reset.token)}`)}`;
    await sendTemplate(reset.isNewAccount ? "password_set" : "password_reset", reset.user.email, { name: reset.user.name, link }, { lang }).catch((error: unknown) =>
      console.error("[mail] password link failed", error),
    );
  }
  await recordAudit({ actor: admin, action: "client.email", target: { type: "client", id: client.id }, clientId: client.id, summary: `Emailed a password link to ${user!.email}` });
  back(client.id, "done=password-sent");
}

export interface ConnectionCheckState {
  status: ConnectionStatus | null;
}

/** Asks the app's website or platform whether it answers now. Changes nothing. */
export async function checkConnectionAction(_: ConnectionCheckState, formData: FormData): Promise<ConnectionCheckState> {
  const { store, client, app } = await clientFrom(formData, "view");
  if (!app) return { status: { ok: false, message: "This client has no app yet.", problems: [] } };
  const limited = await hitRateLimit(store, RATE_LIMITS.apiCheck, client.id);
  if (!limited.allowed) return { status: { ok: false, message: "Too many checks. Try again in a few minutes.", problems: [] } };
  return { status: await checkConnection(store, app, encryptionKey()) };
}

// 51 Storage packs the team adds by hand (paid on WhatsApp) or removes.

/** Adds a storage pack to the app until a date (the plan's end by default). */
export async function addStoragePackAction(formData: FormData): Promise<void> {
  const { admin, store, client, app, apps, license } = await clientFrom(formData, "clients.license");
  if (!app) back(client.id, "done=storage-refused");
  const offer = packOffers((await platformSetting(store, "storagePacks", { fresh: true }))?.value).find((o) => o.id === String(formData.get("offer") ?? ""));
  const untilText = String(formData.get("until") ?? "");
  const until = /^\d{4}-\d{2}-\d{2}$/.test(untilText) ? new Date(`${untilText}T23:59:59.999Z`) : (license?.expiresAt ?? null);
  const now = new Date();
  if (!offer || !until || Number.isNaN(until.getTime()) || until.getTime() <= now.getTime()) back(client.id, "done=storage-refused");
  await store.createStoragePack({
    id: newId(),
    appId: app!.id,
    clientId: client.id,
    offer: offer!.id,
    gb: offer!.gb,
    activeUntil: until!,
    paymentId: null,
    createdAt: now,
    updatedAt: now,
    endedNoticeAt: null,
  });
  await resolveStorageNotices(store, app!, await effectivePlans(store), now);
  await recordAudit({
    actor: admin,
    action: "storage.add",
    target: { type: "app", id: app!.id },
    clientId: client.id,
    summary: `Added a +${offer!.gb} GB storage pack until ${until!.toISOString().slice(0, 10)}${onApp(app, apps)}`,
  });
  back(client.id, "done=storage-added");
}

export async function removeStoragePackAction(formData: FormData): Promise<void> {
  const { admin, store, client, app, apps } = await clientFrom(formData, "clients.license");
  const id = String(formData.get("packId") ?? "");
  if (!app || !ID.test(id)) back(client.id, "done=storage-refused");
  const pack = (await store.listStoragePacks(app!.id)).find((p) => p.id === id);
  if (!pack) back(client.id, "done=storage-refused");
  await store.deleteStoragePack(app!.id, id);
  await recordAudit({
    actor: admin,
    action: "storage.remove",
    target: { type: "app", id: app!.id },
    clientId: client.id,
    summary: `Removed a +${pack!.gb} GB storage pack${onApp(app, apps)}`,
  });
  back(client.id, "done=storage-removed");
}
