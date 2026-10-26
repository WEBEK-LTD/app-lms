import { dayOf } from "../analytics/days";
import { appZone } from "../analytics/zone";
import type { DataStore } from "../data/store";
import { siteApp, type Fail } from "./chat";
import { parseSiteInfo } from "./service";

/**
 * 85.4 POST /api/v1/campaigns/report (platform.yaml, reportCampaign): a
 * WordPress site says how a campaign's pushes went once its last batch is
 * sent. Once per send, and only for a send of the site's own app.
 * 86.3 The phones it reached count in Analytics like a notification sent
 * from the dashboard, under the site's notification ID that its opens carry.
 */

const count = (value: unknown): number | null => (typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 10_000_000 ? value : null);

export async function reportSiteCampaign(store: DataStore, body: unknown, now: Date): Promise<{ status: 204 } | Fail> {
  const site = parseSiteInfo(body);
  if (!site.ok) return { status: 400, body: { code: "invalid_request", message: site.result.body.message } };
  const fields = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const sendId = count(fields.send_id);
  const sent = count(fields.sent);
  const failed = count(fields.failed);
  if (!sendId || sent === null || failed === null) return { status: 400, body: { code: "invalid_request", message: "send_id, sent and failed must be whole numbers." } };
  const found = await siteApp(store, site.value, now);
  if (!found.ok) return found.result;
  const send = await store.reportCampaignSend(found.app.id, sendId, { pushed: sent, failed }, now);
  if (!send) return { status: 404, body: { code: "not_found", message: "This send isn't waiting for a report." } };
  if (sent > 0) {
    const campaign = await store.getNotificationCampaign(found.app.id, send.campaignId);
    const day = dayOf(send.sentAt, await appZone(store, found.app));
    await store.addAnalyticsDaily(found.app.id, day, { metric: "push_sent", key: String(send.notificationId), label: campaign?.title.slice(0, 120) ?? null, value: sent });
  }
  return { status: 204 };
}
