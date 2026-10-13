"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClientContext, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { encrypt } from "@/lib/crypto/encryption";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import {
  announce,
  NOTIFICATION_BODY_MAX,
  NOTIFICATION_TITLE_MAX,
  SERVICE_ACCOUNT_CONTEXT,
  serviceAccountOf,
} from "@/lib/hosted/notify";
import { parseServiceAccount } from "@/lib/hosted/push";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/** An active client whose app runs on the hosted API, or a redirect. */
async function requireHostedApp(): Promise<ClientContext & { app: App }> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.backend !== "hosted") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

export async function sendNotificationAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireHostedApp();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const values = { title, body };
  const errors: Record<string, string> = {};
  if (!title) errors.title = "Enter a title.";
  else if (title.length > NOTIFICATION_TITLE_MAX) errors.title = `Keep the title to ${NOTIFICATION_TITLE_MAX} characters.`;
  if (!body) errors.body = "Enter a message.";
  else if (body.length > NOTIFICATION_BODY_MAX) errors.body = `Keep the message to ${NOTIFICATION_BODY_MAX} characters.`;
  if (Object.keys(errors).length) return { errors, values };

  const store = await getStore();
  const now = new Date();
  const limit = await hitRateLimit(store, RATE_LIMITS.hostedNotify, app.id, now);
  if (!limit.allowed) return { message: "You've sent many notifications in a short time. Try again in an hour.", values };

  const result = await announce({ store, app, title, body, account: serviceAccountOf(app, encryptionKey()), now });
  revalidatePath("/dashboard/notifications");
  if (result.pushError) {
    return { ok: true, message: `Added to your customers' inboxes. ${result.pushError}` };
  }
  return {
    ok: true,
    message: `Sent. It's in your customers' inboxes and went to ${result.pushed} ${result.pushed === 1 ? "phone" : "phones"}.`,
  };
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
  revalidatePath("/dashboard/notifications");
  return { ok: true, message: `Push is on for Firebase project ${account.project_id}.` };
}

export async function removeServiceAccountAction(): Promise<void> {
  const { app } = await requireHostedApp();
  await (await getStore()).updateApp(app.id, { firebaseServiceAccountEncrypted: null }, new Date());
  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/notifications");
}
