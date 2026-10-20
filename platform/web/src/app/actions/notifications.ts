"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorOf, clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { recordNotificationSent } from "@/lib/team/activity";
import type { TeamPermission } from "@/lib/team/permissions";
import { encrypt } from "@/lib/crypto/encryption";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { SERVICE_ACCOUNT_CONTEXT } from "@/lib/hosted/notify";
import { sendAppNotification } from "@/lib/hosted/send-notification";
import { cancelScheduledNotification, editScheduledNotification, scheduleAppNotification } from "@/lib/hosted/scheduled-notifications";
import { parseServiceAccount } from "@/lib/hosted/push";
import { recordStaffChange } from "@/lib/admin/audit";

/** An active client whose app runs on the hosted API, or a redirect. */
async function requireHostedApp(permission: TeamPermission): Promise<ClientContext & { app: App }> {
  const context = await clientFor(permission);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.backend !== "hosted") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

export async function sendNotificationAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireHostedApp("notifications");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  // 61 Send later: a date and time in the app's time zone; the frequent job sends it.
  if (formData.get("when") === "later") {
    const date = String(formData.get("date") ?? "").trim();
    const time = String(formData.get("time") ?? "").trim();
    const values = { title, body, when: "later", date, time };
    const result = await scheduleAppNotification({ store: await getStore(), now: new Date() }, context.app, { title, body, date, time, createdBy: actorOf(context).id });
    if (!result.ok) return result.errors ? { errors: result.errors, values } : { message: result.message, values };
    await recordStaffChange(context, `Scheduled "${title}" to the app's users for ${date} ${time}`);
    revalidatePath("/dashboard/notifications");
    return { ok: true, message: `Scheduled for ${date} at ${time}.` };
  }
  const values = { title, body };
  const result = await sendAppNotification({ store: await getStore(), key: encryptionKey(), now: new Date() }, context.app, context.license, { title, body });
  if (!result.ok) return result.errors ? { errors: result.errors, values } : { message: result.message, values };
  await recordStaffChange(context, `Sent "${title}" to the app's users`);
  await recordNotificationSent(await getStore(), { clientId: context.client.id, appId: context.app.id, actor: actorOf(context), title }, new Date());
  revalidatePath("/dashboard/notifications");
  return { ok: true, message: result.message };
}

export async function saveServiceAccountAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireHostedApp("settings");
  const file = formData.get("serviceAccount");
  if (!file || typeof file === "string" || file.size === 0) {
    return { errors: { serviceAccount: "Choose the JSON file you downloaded from Firebase." } };
  }
  if (file.size > 20_000) return { errors: { serviceAccount: "That file is too large for a service account key." } };
  const json = (await file.text()).trim();
  const account = parseServiceAccount(json);
  if (!account) {
    return {
      errors: {
        serviceAccount: "This isn't a service account key. In Firebase, open Project settings, Service accounts, and generate a new private key.",
      },
    };
  }
  const now = new Date();
  await (await getStore()).updateApp(
    app.id,
    { firebaseServiceAccountEncrypted: encrypt(json, encryptionKey(), `${SERVICE_ACCOUNT_CONTEXT}:${app.id}`) },
    now,
  );
  await recordStaffChange(await requireHostedApp("settings"), `Saved the Firebase service account (project ${account.project_id})`);
  revalidatePath("/dashboard/notifications");
  return { ok: true, message: `Push is on for Firebase project ${account.project_id}.` };
}

export async function removeServiceAccountAction(): Promise<void> {
  const context = await requireHostedApp("settings");
  const { app } = context;
  await (await getStore()).updateApp(app.id, { firebaseServiceAccountEncrypted: null }, new Date());
  await recordStaffChange(context, "Removed the Firebase service account");
  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/notifications");
}

/** 61 Changes a notification still waiting to be sent: its words, date or time. */
export async function editScheduledNotificationAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireHostedApp("notifications");
  const id = Number(formData.get("id"));
  const field = (name: string) => String(formData.get(name) ?? "").trim();
  const values = { title: field("title"), body: field("body"), date: field("date"), time: field("time") };
  const result = Number.isSafeInteger(id) ? await editScheduledNotification({ store: await getStore(), now: new Date() }, context.app, id, values) : null;
  if (!result) return { message: "This notification was already sent or cancelled.", values };
  if (!result.ok) return result.errors ? { errors: result.errors, values } : { message: result.message, values };
  await recordStaffChange(context, `Changed the notification "${values.title}" sent later, now for ${values.date} ${values.time}`);
  revalidatePath("/dashboard/notifications");
  return { ok: true, message: `Scheduled for ${values.date} at ${values.time}.`, values };
}

/** 61 Cancels a notification still waiting to be sent. */
export async function cancelScheduledNotificationAction(formData: FormData): Promise<void> {
  const context = await requireHostedApp("notifications");
  const id = Number(formData.get("id"));
  if (Number.isSafeInteger(id) && (await cancelScheduledNotification({ store: await getStore(), now: new Date() }, context.app, id)) === "cancelled") {
    await recordStaffChange(context, "Cancelled a notification sent later");
  }
  revalidatePath("/dashboard/notifications");
}
