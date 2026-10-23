import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { CAMPAIGN_LIMITS, CAMPAIGN_TEXTS, nextWeekly, runCampaigns, saveCampaign, sendCampaignNow } from "@/lib/hosted/campaigns";
import { PLAN_ENDED_MESSAGE } from "@/lib/hosted/send-notification";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { campaignApp, campaignsStoreSuite, input, PLATFORM, pushRecorder } from "./campaigns-store-suite";
import { days, KEY, NOW } from "./helpers";

/** 85.2 Notification campaigns: drafts, now, later, every week; a picture and what it opens; their numbers. */
describe("85.2 campaigns", () => {
  campaignsStoreSuite(() => new MemoryStore());

  it("checks what it opens, its picture, its audience and its time", async () => {
    const s = new MemoryStore();
    const { app } = await campaignApp(s);
    const deps = { store: s, key: KEY, now: NOW, platformUrl: PLATFORM };
    const save = (patch: Parameters<typeof input>[0]) => saveCampaign(deps, app, null, input(patch), { by: null, pages: ["home", "offers"] });
    expect(await save({ title: "", body: "" })).toMatchObject({ ok: false, errors: { title: "Enter a title.", body: "Enter a message." } });
    expect(await save({ open: "page", page: "missing" })).toMatchObject({ ok: false, errors: { page: CAMPAIGN_TEXTS.page } });
    expect(await save({ open: "link", url: "http://shop.test/sale" })).toMatchObject({ ok: false, errors: { url: CAMPAIGN_TEXTS.link } });
    expect(await save({ open: "link", url: "javascript:alert(1)" })).toMatchObject({ ok: false, errors: { url: CAMPAIGN_TEXTS.link } });
    expect(await save({ open: "link", url: "https://shop.example/sale" })).toMatchObject({ ok: true, campaign: { link: "https://shop.example/sale", status: "draft" } });
    // Pictures only from Yallapp's own address.
    expect(await save({ imageUrl: "https://elsewhere.test/m/x.png" })).toMatchObject({ ok: false, errors: { image: CAMPAIGN_TEXTS.image } });
    expect(await save({ imageUrl: `${PLATFORM}/admin/x` })).toMatchObject({ ok: false, errors: { image: CAMPAIGN_TEXTS.image } });
    expect(await save({ imageUrl: `${PLATFORM}/design-pictures/ocean-1.svg` })).toMatchObject({ ok: true });
    // A news app has no buyers.
    expect(await save({ audience: { who: "buyers" } })).toMatchObject({ ok: false, errors: { audience: CAMPAIGN_TEXTS.audience } });
    expect(await save({ when: "weekly", weekday: "9", time: "10:00" })).toMatchObject({ ok: false, errors: { send_at: CAMPAIGN_TEXTS.weekly } });
    expect(await save({ when: "later", date: "2026-10-11", time: "10:00" })).toMatchObject({ ok: false, errors: { send_at: "Choose a time later than now." } });
  });

  it("keeps a draft when sending can't happen now: nobody in the audience, the hour's limit", async () => {
    const s = new MemoryStore();
    const { app } = await campaignApp(s);
    const { pushes, send } = pushRecorder();
    const deps = { store: s, key: KEY, now: NOW, platformUrl: PLATFORM, send };
    const draft = await saveCampaign(deps, app, null, input({ audience: { countries: ["JP"] } }), { by: null, pages: [] });
    if (!draft.ok) throw new Error("not saved");
    expect(await sendCampaignNow(deps, app, null, draft.campaign)).toMatchObject({ ok: false, message: CAMPAIGN_TEXTS.nobody });
    expect((await s.getNotificationCampaign(app.id, draft.campaign.id))!.status).toBe("draft");
    const everyone = await saveCampaign(deps, app, null, input(), { by: null, pages: [] });
    if (!everyone.ok) throw new Error("not saved");
    for (let i = 0; i < RATE_LIMITS.hostedNotify.limit; i++) await hitRateLimit(s, RATE_LIMITS.hostedNotify, app.id, NOW);
    expect(await sendCampaignNow(deps, app, null, everyone.campaign)).toMatchObject({ ok: false, limited: true });
    expect(pushes).toEqual([]);
    // A weekly one waits for the hour to pass.
    const weekly = await saveCampaign(deps, app, null, input({ when: "weekly", weekday: "1", time: "13:30" }), { by: null, pages: [] });
    expect(weekly.ok).toBe(true);
    expect(await runCampaigns({ ...deps, now: new Date(NOW.getTime() + 31 * 60_000) })).toMatchObject({ sent: 0, waiting: 1 });
  });

  it("keeps up to 20 waiting, and sends nothing once the plan ended", async () => {
    const s = new MemoryStore();
    const { app } = await campaignApp(s);
    const deps = { store: s, key: KEY, now: NOW, platformUrl: PLATFORM };
    for (let i = 0; i < CAMPAIGN_LIMITS.waiting; i++) expect((await saveCampaign(deps, app, null, input({ when: "weekly", weekday: String(i % 7), time: "09:00" }), { by: null, pages: [] })).ok).toBe(true);
    expect(await saveCampaign(deps, app, null, input({ when: "later", date: "2026-10-13", time: "09:00" }), { by: null, pages: [] })).toMatchObject({ ok: false, message: CAMPAIGN_TEXTS.tooMany });
    // 40 days on, the plan of 30 days has ended: the waiting ones fail, nothing is sent.
    const later = days(40);
    expect(await saveCampaign({ ...deps, now: later }, app, null, input({ when: "now" }), { by: null, pages: [] })).toMatchObject({ ok: false, inactive: true, message: PLAN_ENDED_MESSAGE });
    const report = await runCampaigns({ ...deps, now: later });
    expect(report).toMatchObject({ sent: 0, failed: CAMPAIGN_LIMITS.waiting });
  });

  it("finds the next week's time in the app's zone, across a clock change", () => {
    const zone = "Europe/Berlin";
    // Sunday 25 October 2026 the clocks go back; Monday 10:00 is 09:00 UTC after it.
    expect(nextWeekly(1, "10:00", zone, new Date("2026-10-21T12:00:00Z")).toISOString()).toBe("2026-10-26T09:00:00.000Z");
    // The same day, later than now.
    expect(nextWeekly(3, "18:00", zone, new Date("2026-10-21T12:00:00Z")).toISOString()).toBe("2026-10-21T16:00:00.000Z");
    // The same day, earlier than now: next week.
    expect(nextWeekly(3, "08:00", zone, new Date("2026-10-21T12:00:00Z")).toISOString()).toBe("2026-10-28T07:00:00.000Z");
  });
});
