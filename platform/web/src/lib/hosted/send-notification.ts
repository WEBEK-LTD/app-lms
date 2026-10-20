import type { DataStore } from "../data/store";
import type { App, License } from "../data/types";
import { appPlan } from "../entitlements";
import { hasFeature } from "../plans";
import { hitRateLimit, RATE_LIMITS } from "../rate-limit";
import { announce, NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX, serviceAccountOf } from "./notify";
import type { sendPush } from "./push";

/**
 * Dashboard › App notifications, and 58 the Owner API: one notification to
 * everyone who uses the app, with the same checks, the same limit (counted
 * together) and the same words. 61 Notifications sent later go out through
 * here too, from the frequent job.
 */

export type SendResult =
  | { ok: false; errors?: Record<string, string>; message?: string; limited?: boolean }
  | { ok: true; message: string; pushed: number; notificationId: number };

/** The title and message as written, trimmed, with what's wrong with them (61 also for sending later). */
export function checkNotificationText(input: { title: unknown; body: unknown }): { title: string; body: string; errors: Record<string, string> } {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const errors: Record<string, string> = {};
  if (!title) errors.title = "Enter a title.";
  else if (title.length > NOTIFICATION_TITLE_MAX) errors.title = `Keep the title to ${NOTIFICATION_TITLE_MAX} characters.`;
  if (!body) errors.body = "Enter a message.";
  else if (body.length > NOTIFICATION_BODY_MAX) errors.body = `Keep the message to ${NOTIFICATION_BODY_MAX} characters.`;
  return { title, body, errors };
}

export async function sendAppNotification(
  deps: { store: DataStore; key: Buffer; now: Date; send?: typeof sendPush },
  app: App,
  license: License | null,
  input: { title: unknown; body: unknown },
): Promise<SendResult> {
  const { title, body, errors } = checkNotificationText(input);
  if (Object.keys(errors).length) return { ok: false, errors };

  const { store, now } = deps;
  const limit = await hitRateLimit(store, RATE_LIMITS.hostedNotify, app.id, now);
  if (!limit.allowed) return { ok: false, limited: true, message: "You've sent many notifications in a short time. Try again in an hour." };

  // 13.1 Push comes with the app's plan (and its switches, 11.5); without it, notifications only go to the inboxes.
  const push = hasFeature(await appPlan(store, license, now), "push");
  const result = await announce({ store, app, title, body, account: push ? serviceAccountOf(app, deps.key) : null, now, send: deps.send });
  const notificationId = result.notification.id;
  if (!push) return { ok: true, pushed: 0, notificationId, message: "Added to your customers' inboxes. Push notifications aren't available right now." };
  if (result.pushError) return { ok: true, pushed: 0, notificationId, message: `Added to your customers' inboxes. ${result.pushError}` };
  return { ok: true, pushed: result.pushed, notificationId, message: `Sent. It's in your customers' inboxes and went to ${result.pushed} ${result.pushed === 1 ? "phone" : "phones"}.` };
}
