import { keyContext } from "../builds/signing";
import { decrypt } from "../crypto/encryption";
import { dayOf } from "../analytics/days";
import { appZone } from "../analytics/zone";
import type { DataStore } from "../data/store";
import type { App, HostedNotification } from "../data/types";
import { parseServiceAccount, pushTarget, sendPush, type HmsCredentials, type ServiceAccount } from "./push";
import { raiseAlert } from "../watch/alerts";

export const SERVICE_ACCOUNT_CONTEXT = "app:firebase-service-account";
export const NOTIFICATION_TITLE_MAX = 65;
export const NOTIFICATION_BODY_MAX = 240;

/**
 * The app's Firebase service account, or null when none is saved (push is
 * off). 36 With Huawei Push Kit's app ID and app secret saved, it carries
 * them too, for the tokens of Huawei phones without Google Play.
 */
export function serviceAccountOf(app: App, key: Buffer): ServiceAccount | null {
  if (!app.firebaseServiceAccountEncrypted) return null;
  try {
    const account = parseServiceAccount(decrypt(app.firebaseServiceAccountEncrypted, key, `${SERVICE_ACCOUNT_CONTEXT}:${app.id}`));
    return account ? { ...account, hms: hmsCredentialsOf(app, key) } : null;
  } catch {
    return null;
  }
}

/** 36 Huawei Push Kit's credentials, or null when they aren't saved. */
export function hmsCredentialsOf(app: App, key: Buffer): HmsCredentials | null {
  if (!app.huaweiAppId || !app.huaweiPushSecretEncrypted) return null;
  try {
    return { app_id: app.huaweiAppId, app_secret: decrypt(app.huaweiPushSecretEncrypted, key, keyContext.huaweiPush(app.id)) };
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
 * 27 Tells each customer who had a spot that the business called a class
 * off: a notification in their inbox, and a push to their phones when push
 * is on. Their credits are already back. Returns the devices pushed to.
 */
export async function notifyClassCancelled(input: {
  store: DataStore;
  app: App;
  /** The class's name, its local day and time ("Morning yoga", "Mon 20 Oct, 07:30"). */
  className: string;
  when: string;
  userIds: number[];
  account: ServiceAccount | null;
  now: Date;
  send?: typeof sendPush;
}): Promise<{ notified: number; pushed: number }> {
  const title = `${input.className} is cancelled`.slice(0, NOTIFICATION_TITLE_MAX);
  const body = `${input.className} on ${input.when} is cancelled. Your spot is free and any class credit it used is back on your membership.`.slice(0, NOTIFICATION_BODY_MAX);
  let pushed = 0;
  const users = [...new Set(input.userIds)];
  for (const userId of users) {
    const notification = await input.store.createHostedNotification({ appId: input.app.id, userId, title, body, createdAt: input.now });
    if (!input.account) continue;
    const tokens = (await input.store.listHostedPushDevices(input.app.id, [userId])).map(pushTarget);
    if (tokens.length === 0) continue;
    try {
      const result = await (input.send ?? sendPush)(
        input.account,
        tokens,
        { title, body, data: { type: "announcement", notification_id: String(notification.id) } },
        { now: input.now },
      );
      for (const token of result.invalidTokens) await input.store.clearHostedPushToken(input.app.id, token);
      pushed += result.sent;
    } catch {
      // The inbox has it either way.
    }
  }
  return { notified: users.length, pushed };
}

/**
 * Adds a notification to every customer's inbox and pushes it to the devices
 * that allow announcements. The inbox keeps it even when push fails. 23 With
 * `articleId` it is breaking news: it opens the article and goes to devices
 * that allow news.
 */
export async function announce(input: {
  store: DataStore;
  app: App;
  title: string;
  body: string;
  account: ServiceAccount | null;
  now: Date;
  send?: typeof sendPush;
  articleId?: string | null;
}): Promise<Announcement> {
  const articleId = input.articleId ?? null;
  const notification = await input.store.createHostedNotification({
    appId: input.app.id,
    userId: null,
    title: input.title,
    body: input.body,
    ...(articleId ? { articleId } : {}),
    createdAt: input.now,
  });
  if (!input.account) return { notification, pushed: 0, pushError: "Push is off: add your Firebase service account." };
  const devices = await input.store.listHostedPushDevices(input.app.id, null);
  const tokens = devices.filter((d) => (articleId ? d.pushPreferences?.news : d.pushPreferences?.announcements) !== false).map(pushTarget);
  const data: Record<string, string> = articleId
    ? { type: "article", article_id: articleId, notification_id: String(notification.id) }
    : { type: "announcement", notification_id: String(notification.id) };
  try {
    const result = await (input.send ?? sendPush)(
      input.account,
      tokens,
      { title: input.title, body: input.body, data },
      { now: input.now },
    );
    for (const token of result.invalidTokens) await input.store.clearHostedPushToken(input.app.id, token);
    // 44 How many phones it went to, for its open rate in Analytics.
    if (result.sent > 0) {
      await input.store.addAnalyticsDaily(input.app.id, dayOf(input.now, await appZone(input.store, input.app)), { metric: "push_sent", key: String(notification.id), label: input.title.slice(0, 120), value: result.sent });
    }
    return { notification, pushed: result.sent, pushError: null };
  } catch (e) {
    const pushError = e instanceof Error ? e.message : "Push failed.";
    // 78.3 In the team's bell (not emailed: it is usually the app's own Firebase key, which its owner fixes).
    await raiseAlert(
      input.store,
      {
        kind: "push_failed",
        key: `push_failed:app:${input.app.id}:${input.now.toISOString().slice(0, 10)}`,
        title: `${input.app.appName?.trim() || "An app"}: notifications couldn't be pushed`,
        detail: `${pushError.slice(0, 300)}. The notification is in the app's inbox; the owner sees the reason in Dashboard › Notifications.`,
        link: `/admin/clients/${input.app.clientId}`,
      },
      input.now,
    );
    return { notification, pushed: 0, pushError };
  }
}

export interface CampaignUpdate {
  /** Donors whose inbox got the update. */
  donors: number;
  pushed: number;
  pushError: string | null;
}

/**
 * 29 A campaign update: to the inbox of each app user who gave to the
 * campaign, and pushed only to their phones that turned campaign updates on
 * (`NotificationPreferences.donations`, off unless the app says true). It
 * opens the campaign.
 */
export async function notifyCampaignDonors(input: {
  store: DataStore;
  app: App;
  campaignId: number;
  title: string;
  body: string;
  account: ServiceAccount | null;
  now: Date;
  send?: typeof sendPush;
}): Promise<CampaignUpdate> {
  const userIds = await input.store.listCampaignDonorUserIds(input.app.id, input.campaignId);
  if (userIds.length === 0) return { donors: 0, pushed: 0, pushError: null };
  for (const userId of userIds) {
    await input.store.createHostedNotification({
      appId: input.app.id,
      userId,
      title: input.title,
      body: input.body,
      campaignId: input.campaignId,
      createdAt: input.now,
    });
  }
  if (!input.account) return { donors: userIds.length, pushed: 0, pushError: "Push is off: add your Firebase service account." };
  const devices = await input.store.listHostedPushDevices(input.app.id, userIds);
  const tokens = devices.filter((d) => d.pushPreferences?.donations === true).map(pushTarget);
  if (tokens.length === 0) return { donors: userIds.length, pushed: 0, pushError: null };
  try {
    const result = await (input.send ?? sendPush)(
      input.account,
      tokens,
      { title: input.title, body: input.body, data: { type: "campaign_update", campaign_id: String(input.campaignId) } },
      { now: input.now },
    );
    for (const token of result.invalidTokens) await input.store.clearHostedPushToken(input.app.id, token);
    return { donors: userIds.length, pushed: result.sent, pushError: null };
  } catch (e) {
    return { donors: userIds.length, pushed: 0, pushError: e instanceof Error ? e.message : "Push failed." };
  }
}
