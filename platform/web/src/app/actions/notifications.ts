"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClientContext, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { encrypt } from "@/lib/crypto/encryption";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { SERVICE_ACCOUNT_CONTEXT } from "@/lib/hosted/notify";
import { sendAppNotification } from "@/lib/hosted/send-notification";
import { parseServiceAccount } from "@/lib/hosted/push";
import { recordStaffChange } from "@/lib/admin/audit";

/** An active client whose app runs on the hosted API, or a redirect. */
async function requireHostedApp(): Promise<ClientContext & { app: App }> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.backend !== "hosted") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

export async function sendNotificationAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireHostedApp();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const values = { title, body };
  const result = await sendAppNotification({ store: await getStore(), key: encryptionKey(), now: new Date() }, context.app, context.license, { title, body });
  if (!result.ok) return result.errors ? { errors: result.errors, values } : { message: result.message, values };
  await recordStaffChange(context, `Sent "${title}" to the app's users`);
  revalidatePath("/dashboard/notifications");
  return { ok: true, message: result.message };
}

export async function saveServiceAccountAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireHostedApp();
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
  await recordStaffChange(await requireHostedApp(), `Saved the Firebase service account (project ${account.project_id})`);
  revalidatePath("/dashboard/notifications");
  return { ok: true, message: `Push is on for Firebase project ${account.project_id}.` };
}

export async function removeServiceAccountAction(): Promise<void> {
  const context = await requireHostedApp();
  const { app } = context;
  await (await getStore()).updateApp(app.id, { firebaseServiceAccountEncrypted: null }, new Date());
  await recordStaffChange(context, "Removed the Firebase service account");
  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/notifications");
}
