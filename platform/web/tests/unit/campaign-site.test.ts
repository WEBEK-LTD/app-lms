import { describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { CAMPAIGN_TEXTS, campaignStats, runCampaigns, saveCampaign } from "@/lib/hosted/campaigns";
import { reportSiteCampaign } from "@/lib/license/campaign-report";
import { CAMPAIGN_PATH, campaignSignature } from "@/lib/license/campaign-site";
import { activateLicense, parseSiteInfo } from "@/lib/license/service";
import { days, KEY, NOW } from "./helpers";

const PLATFORM = "https://yallapp.test";

interface Asked {
  url: string;
  body: string;
}

/** A WordPress academy whose site took its license, and a fake site that answers. */
async function wordpress(answer: (asked: Asked) => Response) {
  const store = new MemoryStore();
  const { client } = await registerClient(store, { name: "Ada", email: "ada@academy.test", whatsapp: "+905446731942", siteUrl: "https://academy.test", password: null }, NOW);
  const created: App = { ...newApp(client.id, "https://academy.test", NOW, "lms"), backend: "wordpress", appName: "Ada Academy" };
  await store.createApp(created);
  const { licenseKey } = await activateClient(store, { clientId: client.id, appId: created.id, plan: "growth", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
  const site = parseSiteInfo({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.4.12", wp_version: "6.8", lms: "tutor" });
  if (!site.ok) throw new Error("site");
  expect((await activateLicense(store, site.value, NOW)).status).toBe(200);
  const asked: Asked[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    const call = { url, body: String(init?.body ?? "") };
    asked.push(call);
    return answer(call);
  }) as typeof fetch;
  const deps = (now: Date = NOW) => ({ store, key: KEY, now, platformUrl: PLATFORM, site: { fetcher, resolve: async () => ["203.0.113.10"] } });
  const app = (await store.getAppById(created.id))!;
  const report = (extra: Record<string, unknown>) => ({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.4.12", wp_version: "6.8", lms: "tutor", ...extra });
  return { store, app, asked, deps, licenseKey: licenseKey!, report };
}

const input = (patch: Record<string, unknown> = {}) => ({ title: "Weekend sale", body: "Everything is 20% off until Sunday.", open: "page", page: "offers", audience: {}, when: "now", ...patch });

describe("85.4 campaigns of WordPress apps, through the site", () => {
  it("signs like the plugin checks", () => {
    // The same value wp-plugin/yallapp/tests/unit/CampaignRequestTest.php expects.
    const json = '{"send_id":42,"title":"Weekend sale","body":"Everything is 20% off until Sunday.","link":"https://academy.test/a/page/offers","image_url":"https://yallapp.com.tr/m/abc123"}';
    expect(campaignSignature("YALL-7K2D-9QWE-4MNB", 1792000000, json)).toBe("5d51b207cf109361788fd8b4eafc5533d9d317b5301223cb58fdbe33613a5518");
  });

  it("sends it to the site, signed, then the site reports the numbers once", async () => {
    const { store, app, asked, deps, licenseKey, report } = await wordpress(() => Response.json({ notification_id: 77, people: 120, batches: 1 }, { status: 202 }));
    const sent = await saveCampaign(deps(), app, null, input({ imageUrl: `${PLATFORM}/m/abc123` }), { by: null, pages: ["home", "offers"] });
    expect(sent).toMatchObject({ ok: true, campaign: { status: "sent" }, send: { notificationId: 77, recipients: 120, pushed: 0, reportedAt: null } });
    if (!sent.ok) return;
    expect(sent.message).toBe("Sent to your website: it's in everyone's inbox, and the push goes to 120 people's phones. The numbers show here once your website has sent it.");
    // To the site's own route, the campaign signed as sent; its page opens on the site's links.
    expect(asked[0]!.url).toBe(`https://academy.test${CAMPAIGN_PATH}`);
    const body = JSON.parse(asked[0]!.body) as { timestamp: number; signature: string; campaign: Record<string, unknown> };
    expect(body.campaign).toEqual({ send_id: sent.send!.id, title: "Weekend sale", body: "Everything is 20% off until Sunday.", link: "https://academy.test/a/page/offers", image_url: `${PLATFORM}/m/abc123` });
    const json = asked[0]!.body.slice(asked[0]!.body.indexOf('"campaign":') + 11, -1);
    expect(body.signature).toBe(campaignSignature(licenseKey, body.timestamp, json));
    expect((await campaignStats(store, app, [sent.campaign], NOW)).get(sent.campaign.id)).toMatchObject({ waiting: 1, recipients: 120 });

    // The report: once, for this app's send only.
    expect(await reportSiteCampaign(store, report({ send_id: sent.send!.id, sent: 110, failed: 4 }), NOW)).toEqual({ status: 204 });
    expect(await reportSiteCampaign(store, report({ send_id: sent.send!.id, sent: 1, failed: 0 }), NOW)).toMatchObject({ status: 404 });
    expect(await reportSiteCampaign(store, report({ send_id: 9999, sent: 1, failed: 0 }), NOW)).toMatchObject({ status: 404 });
    expect(await reportSiteCampaign(store, report({ send_id: sent.send!.id, sent: -1, failed: 0 }), NOW)).toMatchObject({ status: 400 });
    expect(await reportSiteCampaign(store, { ...report({ send_id: sent.send!.id, sent: 1, failed: 0 }), site_url: "https://other.test" }, NOW)).toMatchObject({ status: 403 });
    expect((await campaignStats(store, app, [sent.campaign], NOW)).get(sent.campaign.id)).toMatchObject({ waiting: 0, pushed: 110, failed: 4 });
  });

  it("goes to everyone, and keeps the draft when the site can't take it", async () => {
    let status = 404;
    const { store, app, asked, deps } = await wordpress(() => new Response("{}", { status }));
    expect(await saveCampaign(deps(), app, null, input({ audience: { languages: ["ar"] } }), { by: null, pages: ["offers"] })).toMatchObject({ ok: false, errors: { audience: CAMPAIGN_TEXTS.wordpressEveryone } });
    expect(asked).toHaveLength(0);
    // A plugin from before 0.4.12, then a site that's down: nothing sent, the draft stays to send again.
    const old = await saveCampaign(deps(), app, null, input(), { by: null, pages: ["offers"] });
    expect(old).toMatchObject({ ok: false, message: CAMPAIGN_TEXTS.siteOldPlugin, campaign: { status: "draft" } });
    status = 500;
    const draft = (await store.listNotificationCampaigns(app.id, 10))[0]!;
    expect(draft.status).toBe("draft");
    // Every week: a site that's down fails this week's and tries again next week.
    const weekly = await saveCampaign(deps(), app, null, input({ when: "weekly", weekday: "1", time: "14:00" }), { by: null, pages: ["offers"] });
    expect(weekly.ok).toBe(true);
    expect(await runCampaigns(deps(new Date(NOW.getTime() + 61 * 60_000)))).toMatchObject({ sent: 0, failed: 1 });
    if (!weekly.ok) return;
    expect(await store.getNotificationCampaign(app.id, weekly.campaign.id)).toMatchObject({ status: "scheduled", result: CAMPAIGN_TEXTS.siteFailed, sendAt: new Date("2026-10-19T11:00:00.000Z") });
    expect(await store.listCampaignSends(app.id, [draft.id, weekly.campaign.id])).toEqual([]);
  });

  it("with nobody to push to, there's nothing to wait for", async () => {
    const { store, app, deps } = await wordpress(() => Response.json({ notification_id: 5, people: 0, batches: 0 }, { status: 202 }));
    const sent = await saveCampaign(deps(), app, null, input({ open: "none" }), { by: null, pages: [] });
    expect(sent).toMatchObject({ ok: true, send: { recipients: 0, reportedAt: NOW } });
    if (sent.ok) expect((await campaignStats(store, app, [sent.campaign], NOW)).get(sent.campaign.id)!.waiting).toBe(0);
  });
});
