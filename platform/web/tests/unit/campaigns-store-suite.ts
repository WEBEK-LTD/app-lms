import { generateKeyPairSync, randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { encrypt } from "@/lib/crypto/encryption";
import type { DataStore } from "@/lib/data/store";
import type { App, HostedDevice } from "@/lib/data/types";
import { campaignStats, runCampaigns, saveCampaign, stopCampaign, type CampaignInput } from "@/lib/hosted/campaigns";
import { SERVICE_ACCOUNT_CONTEXT } from "@/lib/hosted/notify";
import type { sendPush } from "@/lib/hosted/push";
import { days, KEY, NOW } from "./helpers";

export const PLATFORM = "https://yallapp.test";
const serviceAccount = JSON.stringify({
  type: "service_account",
  project_id: "cedar-news",
  client_email: "push@cedar-news.iam.gserviceaccount.com",
  private_key: generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
});

export interface Pushed {
  targets: unknown[];
  title: string;
  data: Record<string, string>;
  image?: string | null;
}

/** A hosted News app with an active plan, push on, and three people (two phones say Arabic). */
export async function campaignApp(s: DataStore) {
  const suffix = randomUUID().slice(0, 8);
  const { client } = await registerClient(s, { name: "Cedar News", email: `cedar-${suffix}@campaigns.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
  await activateClient(s, { clientId: client.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
  const base = newApp(client.id, null, NOW, "news");
  const app: App = { ...base, backend: "hosted", connector: { kind: "articles" }, firebaseServiceAccountEncrypted: encrypt(serviceAccount, KEY, `${SERVICE_ACCOUNT_CONTEXT}:${base.id}`) };
  await s.createApp(app);
  if (!(await s.getLicenseForApp(client.id, app.id))) await activateClient(s, { clientId: client.id, appId: app.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
  const digits = suffix.replace(/\D/g, "").padEnd(3, "7").slice(0, 3);
  const person = async (n: number) => (await s.createHostedUser({ appId: app.id, phone: `+90533${digits}${String(n).padStart(4, "0")}`, name: `Reader ${n}`, email: null, city: null, now: NOW }))!;
  const [arabic, turkish, quiet] = [await person(1), await person(2), await person(3)];
  const phone = (userId: number, extra: Partial<HostedDevice>) =>
    s.createHostedDevice({ id: randomUUID(), appId: app.id, userId, deviceId: randomUUID(), platform: "android", name: "Phone", appVersion: "1.0.0", pushToken: null, pushPreferences: null, language: null, country: null, createdAt: NOW, lastSeenAt: NOW, ...extra });
  await phone(arabic.id, { language: "ar", pushToken: `tok-ar-${suffix}` });
  await phone(turkish.id, { language: "tr", pushToken: `tok-tr-${suffix}` });
  // Arabic too, but this phone never allowed notifications.
  await phone(quiet.id, { language: "ar" });
  return { app, arabic, turkish, quiet };
}

export function pushRecorder() {
  const pushes: Pushed[] = [];
  const send = (async (_account, targets, message) => {
    pushes.push({ targets, title: message.title, data: message.data, image: message.image });
    return { sent: targets.length, invalidTokens: [] };
  }) as typeof sendPush;
  return { pushes, send };
}

export const input = (patch: Partial<CampaignInput> = {}): CampaignInput => ({
  title: "Weekend offers",
  body: "Everything in the shop is 20% off until Sunday.",
  open: "none",
  audience: {},
  when: "draft",
  ...patch,
});

/** 85.2 Campaigns, the same on every store. */
export function campaignsStoreSuite(store: () => DataStore) {
  it("sends to the audience only: their inboxes, their phones, with the picture and the page", async () => {
    const s = store();
    const { app, arabic, turkish, quiet } = await campaignApp(s);
    const { pushes, send } = pushRecorder();
    const deps = { store: s, key: KEY, now: NOW, platformUrl: PLATFORM, send };
    const license = await s.getLicenseForApp(app.clientId, app.id);
    const sent = await saveCampaign(
      deps,
      app,
      license,
      input({ when: "now", open: "page", page: "offers", imageUrl: `${PLATFORM}/m/abc123`, audience: { languages: ["ar"] } }),
      { by: "owner@cedar.test", pages: ["home", "offers"] },
    );
    expect(sent).toMatchObject({ ok: true, campaign: { status: "sent", createdBy: "owner@cedar.test" }, send: { recipients: 2, pushed: 1, failed: 0 } });
    if (!sent.ok) return;
    expect(sent.message).toBe("Sent. People: 2. Phones the push reached: 1.");
    // One push, to the one Arabic phone that allows them, opening the page with the picture.
    expect(pushes).toHaveLength(1);
    expect(JSON.stringify(pushes[0]!.targets)).toContain("tok-ar-");
    expect(pushes[0]!.data).toMatchObject({ type: "announcement", link: `${PLATFORM}/a/${app.id}/page/offers`, image_url: `${PLATFORM}/m/abc123` });
    expect(pushes[0]!.image).toBe(`${PLATFORM}/m/abc123`);
    const inbox = async (userId: number) => (await s.listHostedNotifications({ appId: app.id, userId, since: days(-1), page: 1, perPage: 20 })).items.map((n) => n.title);
    expect(await inbox(arabic.id)).toEqual(["Weekend offers"]);
    expect(await inbox(quiet.id)).toEqual(["Weekend offers"]);
    expect(await inbox(turkish.id)).toEqual([]);
    expect(await s.countHostedNotificationsAfter({ appId: app.id, userId: turkish.id, after: days(-1) })).toBe(0);
    expect(await s.countHostedNotificationsAfter({ appId: app.id, userId: quiet.id, after: days(-1) })).toBe(1);
    // Not one of the notifications "sent to everyone".
    expect(await s.listHostedBroadcasts(app.id, 10)).toEqual([]);
    const notification = (await s.listHostedNotifications({ appId: app.id, userId: arabic.id, since: days(-1), page: 1, perPage: 1 })).items[0]!;
    expect(notification).toMatchObject({ link: `${PLATFORM}/a/${app.id}/page/offers`, imageUrl: `${PLATFORM}/m/abc123`, targeted: true });

    // Everyone, not narrowed: one notification to the whole app, as before.
    const all = await saveCampaign(deps, app, license, input({ title: "Hello all", when: "now" }), { by: null, pages: [] });
    expect(all).toMatchObject({ ok: true, send: { recipients: 3, pushed: 2 } });
    expect(await inbox(turkish.id)).toEqual(["Hello all"]);
    expect((await s.listHostedBroadcasts(app.id, 10)).map((n) => n.title)).toEqual(["Hello all"]);

    // Opens come from the app's analytics, by notification.
    await s.addAnalyticsDaily(app.id, "2026-10-12", { metric: "push_open", key: `id:${notification.id}`, label: "announcement", value: 1 });
    const stats = await campaignStats(s, app, [sent.campaign], NOW);
    expect(stats.get(sent.campaign.id)).toMatchObject({ sends: 1, recipients: 2, pushed: 1, failed: 0, opened: 1 });
  });

  it("sends later and every week from the frequent job, each time once", async () => {
    const s = store();
    const { app } = await campaignApp(s);
    const { pushes, send } = pushRecorder();
    const license = await s.getLicenseForApp(app.clientId, app.id);
    const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);
    const deps = (now: Date) => ({ store: s, key: KEY, now, platformUrl: PLATFORM, send });
    // NOW is Monday 12 October 2026, 13:00 in Istanbul.
    const later = await saveCampaign(deps(NOW), app, license, input({ title: "Later", when: "later", date: "2026-10-12", time: "15:00" }), { by: null, pages: [] });
    expect(later).toMatchObject({ ok: true, campaign: { status: "scheduled", sendAt: new Date("2026-10-12T12:00:00.000Z") } });
    const weekly = await saveCampaign(deps(NOW), app, license, input({ title: "Weekly", when: "weekly", weekday: "1", time: "14:30" }), { by: null, pages: [] });
    expect(weekly).toMatchObject({ ok: true, campaign: { status: "scheduled", repeat: "weekly", weekday: 1, time: "14:30", sendAt: new Date("2026-10-12T11:30:00.000Z") } });
    if (!later.ok || !weekly.ok) return;

    expect(await runCampaigns(deps(at(10)))).toEqual({ sent: 0, waiting: 0, failed: 0 });
    // 14:30: the weekly one; twice at once sends it once.
    const [first, second] = await Promise.all([runCampaigns(deps(at(91))), runCampaigns(deps(at(91)))]);
    expect(first.sent + second.sent).toBe(1);
    expect(await s.getNotificationCampaign(app.id, weekly.campaign.id)).toMatchObject({ status: "scheduled", sendAt: new Date("2026-10-19T11:30:00.000Z"), lastSentAt: at(91) });
    // 15:00: the one sent later.
    expect(await runCampaigns(deps(at(121)))).toMatchObject({ sent: 1 });
    expect(await s.getNotificationCampaign(app.id, later.campaign.id)).toMatchObject({ status: "sent", sendAt: null });
    expect(pushes.map((p) => p.title)).toEqual(["Weekly", "Later"]);
    expect((await s.listCampaignSends(app.id, [later.campaign.id, weekly.campaign.id])).map((x) => x.campaignId)).toEqual([later.campaign.id, weekly.campaign.id]);

    // Stopped: it doesn't go out next week.
    expect(await stopCampaign(s, app, weekly.campaign.id, at(200))).toBe(true);
    expect(await s.getNotificationCampaign(app.id, weekly.campaign.id)).toMatchObject({ status: "stopped", sendAt: null });
    expect(await runCampaigns(deps(days(8)))).toMatchObject({ sent: 0 });
    expect(await s.deleteNotificationCampaign(app.id, weekly.campaign.id)).toBe(true);
    expect(await s.listCampaignSends(app.id, [weekly.campaign.id])).toEqual([]);
  });
}
