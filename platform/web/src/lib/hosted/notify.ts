import { decrypt } from "../crypto/encryption";
import type { DataStore } from "../data/store";
import type { App, HostedNotification } from "../data/types";
import { parseServiceAccount, sendPush, type ServiceAccount } from "./push";

export const SERVICE_ACCOUNT_CONTEXT = "app:firebase-service-account";
export const NOTIFICATION_TITLE_MAX = 65;
export const NOTIFICATION_BODY_MAX = 240;

/** The app's Firebase service account, or null when none is saved (push is off). */
export function serviceAccountOf(app: App, key: Buffer): ServiceAccount | null {
  if (!app.firebaseServiceAccountEncrypted) return null;
  try {
    return parseServiceAccount(decrypt(app.firebaseServiceAccountEncrypted, key, `${SERVICE_ACCOUNT_CONTEXT}:${app.id}`));
  } catch {
    return null;
  }
}

export interface Announcement {
  notification: HostedNotification;
  /** Devices Firebase accepted the push for. */
  pushed: number;
  /** Why push wasn't sent, when it wasn't. */
  pushError: string | null;
}

/**
 * Adds a notification to every customer's inbox and pushes it to the devices
 * that allow announcements. The inbox keeps it even when push fails.
 */
export async function announce(input: {
  store: DataStore;
  app: App;
  title: string;
  body: string;
  account: ServiceAccount | null;
  now: Date;
  send?: typeof sendPush;
}): Promise<Announcement> {
  const notification = await input.store.createHostedNotification({
    appId: input.app.id,
    userId: null,
    title: input.title,
    body: input.body,
    createdAt: input.now,
  });
  if (!input.account) return { notification, pushed: 0, pushError: "Push is off: add your Firebase service account." };
  const devices = await input.store.listHostedPushDevices(input.app.id, null);
  const tokens = devices.filter((d) => d.pushPreferences?.announcements !== false).map((d) => d.pushToken!);
  try {
    const result = await (input.send ?? sendPush)(
      input.account,
      tokens,
      { title: input.title, body: input.body, data: { type: "announcement", notification_id: String(notification.id) } },
      { now: input.now },
    );
    for (const token of result.invalidTokens) await input.store.clearHostedPushToken(input.app.id, token);
    return { notification, pushed: result.sent, pushError: null };
  } catch (e) {
    return { notification, pushed: 0, pushError: e instanceof Error ? e.message : "Push failed." };
  }
}
