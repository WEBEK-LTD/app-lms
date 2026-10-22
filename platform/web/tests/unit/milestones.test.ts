import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { DataStore } from "@/lib/data/store";
import type { App, Build, BuildStages, PlanPayment } from "@/lib/data/types";
import type { BuildConfig } from "@/lib/build-config/types";
import { DEMO_ACCOUNT } from "@/lib/demo/constants";
import { noteMilestones, recordAllMilestones, recordMilestones, recordSignUp } from "@/lib/milestones/record";
import { signupSourceFrom } from "@/lib/milestones/source";
import { newPublishingRequest } from "@/lib/publishing/steps";
import { milestonesStoreSuite } from "./milestones-store-suite";
import { days, NOW, setupClient } from "./helpers";

/**
 * 78.1 Milestones: each setup step and the setup done, the first build and
 * the first that worked, the first upload and the app live, the first payment
 * and each renewal, from what the data shows (older accounts too), kept as
 * the data changes; the sign-up's source; the demo apps' account left out.
 */

const HOUR = 3_600_000;
const at = (hours: number) => new Date(NOW.getTime() + hours * HOUR);

describe("78 milestones on the memory store", () => {
  const store = new MemoryStore();
  milestonesStoreSuite(() => store);
});

/** An app with every step done, each an hour after the one before. */
function readyApp(clientId: string): App {
  return {
    ...newApp(clientId, "https://academy.test", at(0)),
    appName: "Ada Academy",
    shortName: "Ada",
    iconAssetId: "icon-1",
    androidPackage: "com.ada.academy",
    iosBundleId: "com.ada.academy",
    storeTitle: "Ada Academy",
    publishingMode: "managed",
    appTypeDoneAt: at(1),
    websiteDoneAt: at(2),
    brandingDoneAt: at(3),
    listingDoneAt: at(4),
    publishingDoneAt: at(5),
  };
}

const STAGES: BuildStages = { queued: "done", android: "done", ios: "skipped", upload_play: "pending", upload_testflight: "skipped" };

async function build(store: DataStore, app: App, input: { at: Date; status: Build["status"]; finishedAt?: Date; uploaded?: boolean }): Promise<Build> {
  return store.createBuild({
    id: `build-${input.at.getTime()}`,
    clientId: app.clientId,
    appId: app.id,
    versionName: "1.0.0",
    status: input.status,
    stages: { ...STAGES, upload_play: input.uploaded ? "done" : "skipped" },
    config: {} as BuildConfig,
    storeListing: { storeTitle: "Ada", shortDescription: "", fullDescription: "", supportEmail: "a@a.test", privacyUrl: "https://a.test", phoneScreenshots: [], iphoneScreenshots: [] },
    autoPublish: false,
    artifacts: [],
    message: null,
    logUrl: null,
    createdAt: input.at,
    startedAt: input.at,
    finishedAt: input.finishedAt ?? null,
    updatedAt: input.finishedAt ?? input.at,
  });
}

function payment(clientId: string, appId: string | null, id: string, paidAt: Date, amountCents = 120_000, purpose: PlanPayment["purpose"] = "plan"): PlanPayment {
  return { id, clientId, appId, plan: "growth", months: 1, amountCents, currency: "TRY", status: "pending", tokenHash: `t-${id}`, paymentId: null, createdAt: paidAt, paidAt: null, purpose };
}

async function pay(store: DataStore, p: PlanPayment, paidAt: Date) {
  await store.createPlanPayment(p);
  await store.payPlanPayment(p.id, `iyz-${p.id}`, paidAt);
}

const kinds = async (store: DataStore, clientId: string) => Object.fromEntries((await store.listClientMilestones(clientId)).map((m) => [`${m.kind}${m.ref && m.kind === "renewed" ? `:${m.ref}` : ""}`, m.at.toISOString()]));

describe("78.1 milestones from what the data shows", () => {
  it("records each step, the setup, the builds, the store, the payments and a renewal, at the times they happened", async () => {
    const { store, client } = await setupClient({ plan: "growth" });
    const app = readyApp(client.id);
    await store.createApp(app);
    await build(store, app, { at: at(6), status: "failed", finishedAt: at(6.5) });
    await build(store, app, { at: at(7), status: "ready", finishedAt: at(8), uploaded: true });
    const request = newPublishingRequest(app, "managed", at(9));
    await store.savePublishingRequest({ ...request, android: { status: "live", note: null, storeUrl: "https://play.google.com/x", updatedAt: at(12) } });
    await store.addPublishingEvent({ appId: app.id, store: "android", status: "submitted", note: null, actorEmail: "team@yallapp.test", at: at(10) });
    await store.addPublishingEvent({ appId: app.id, store: "android", status: "live", note: null, actorEmail: "team@yallapp.test", at: at(12) });
    await pay(store, payment(client.id, app.id, "p1", at(13)), at(13));
    await pay(store, payment(client.id, app.id, "p2", days(30, at(13))), days(30, at(13)));
    // Neither a storage pack nor a coupon that took the whole price is a payment of the plan.
    await pay(store, payment(client.id, app.id, "p3", at(14), 5_000, "storage"), at(14));
    await pay(store, payment(client.id, app.id, "p4", at(15), 0), at(15));

    expect(await recordMilestones(store, client.id, days(40))).toBe(13);
    expect(await kinds(store, client.id)).toEqual({
      signed_up: NOW.toISOString(),
      step_app_type: at(1).toISOString(),
      step_website: at(2).toISOString(),
      step_branding: at(3).toISOString(),
      step_listing: at(4).toISOString(),
      step_publishing: at(5).toISOString(),
      setup_done: at(5).toISOString(),
      first_build: at(6).toISOString(),
      build_ready: at(8).toISOString(),
      store_upload: at(8).toISOString(),
      store_live: at(12).toISOString(),
      paid: at(13).toISOString(),
      "renewed:p2": days(30, at(13)).toISOString(),
    });
    // Nothing new the second time.
    expect(await recordMilestones(store, client.id, days(41))).toBe(0);
  });

  it("keeps the first time when a step is saved again, and leaves out what isn't done", async () => {
    const { store, client } = await setupClient({ plan: "growth" });
    const app: App = { ...readyApp(client.id), storeTitle: null };
    await store.createApp(app);
    await noteMilestones(store, client.id, at(6));
    let recorded = await kinds(store, client.id);
    expect(recorded.step_branding).toBe(at(3).toISOString());
    // The listing isn't complete (no store title): neither it nor the setup is done.
    expect(recorded.step_listing).toBeUndefined();
    expect(recorded.setup_done).toBeUndefined();

    await store.updateApp(app.id, { storeTitle: "Ada Academy", listingDoneAt: at(20), brandingDoneAt: at(21) }, at(21));
    await noteMilestones(store, client.id, at(22));
    recorded = await kinds(store, client.id);
    expect(recorded.step_branding).toBe(at(3).toISOString());
    expect(recorded.step_listing).toBe(at(20).toISOString());
    expect(recorded.setup_done).toBe(at(21).toISOString());
  });

  it("a step saved in the future of now counts as now", async () => {
    const { store, client } = await setupClient({ plan: "growth" });
    await store.createApp({ ...readyApp(client.id), appTypeDoneAt: at(50) });
    await recordMilestones(store, client.id, at(10));
    expect((await kinds(store, client.id)).step_app_type).toBe(at(10).toISOString());
  });

  it("a second app's first payment isn't a renewal; a payment before the first app counts as paid", async () => {
    const { store, client } = await setupClient({ plan: "growth" });
    await pay(store, payment(client.id, null, "early", at(1)), at(1));
    const first = readyApp(client.id);
    await store.createApp(first);
    const second: App = { ...readyApp(client.id), id: "second-app" };
    await store.createApp(second);
    await pay(store, payment(client.id, second.id, "second", at(5)), at(5));
    await recordMilestones(store, client.id, at(10));
    const recorded = await store.listClientMilestones(client.id);
    expect(recorded.filter((m) => m.kind === "paid")).toEqual([expect.objectContaining({ at: at(1) })]);
    expect(recorded.filter((m) => m.kind === "renewed")).toEqual([]);
  });

  it("the daily job fills every account (older ones too), not the demo apps' account, and keeps a deleted app's", async () => {
    const store = new MemoryStore();
    const { client: a } = await registerClient(store, { name: "A", email: "a@x.test", whatsapp: "+905440000001", siteUrl: "", password: null }, at(-48));
    const { client: b } = await registerClient(store, { name: "B", email: "b@x.test", whatsapp: "+905440000002", siteUrl: "", password: null }, at(-24));
    const { client: demo } = await registerClient(store, { name: DEMO_ACCOUNT.name, email: DEMO_ACCOUNT.email, whatsapp: "+905440000003", siteUrl: "", password: null }, at(-12));
    const app = newApp(a.id, null, at(-47));
    await store.createApp(app);
    await build(store, app, { at: at(-40), status: "ready", finishedAt: at(-39) });

    expect(await recordAllMilestones(store, NOW)).toEqual({ clients: 3, added: 5 });
    expect(Object.keys(await kinds(store, a.id))).toEqual(["signed_up", "step_app_type", "first_build", "build_ready"]);
    expect(Object.keys(await kinds(store, b.id))).toEqual(["signed_up"]);
    expect(await store.listClientMilestones(demo.id)).toEqual([]);
    expect(await recordMilestones(store, demo.id, NOW)).toBe(0);

    await store.softDeleteApp({ id: "del-1", appId: app.id, clientId: a.id, appName: "A", reason: "owner", deletedBy: "a@x.test", deletedAt: NOW, purgeAfter: NOW, status: "waiting", closedAt: null, closedBy: null, pendingBuilds: [] });
    await store.purgeDeletedApp("del-1", "daily job", NOW, []);
    expect(await recordAllMilestones(store, NOW)).toEqual({ clients: 3, added: 0 });
    expect(Object.keys(await kinds(store, a.id))).toContain("build_ready");
  });
});

describe("78.1 the sign-up's source", () => {
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [k, v] of Object.entries(fields)) data.set(k, v);
    return data;
  };

  it("takes the campaign, the website's host and `from`, checked", () => {
    expect(
      signupSourceFrom(form({ src_utm_source: " instagram ", src_utm_medium: "social", src_utm_campaign: "autumn<script>", src_ref: "WWW.Google.com", src_from: "Demo" })),
    ).toEqual({ utmSource: "instagram", utmMedium: "social", utmCampaign: "autumnscript", referrer: "www.google.com", from: "demo" });
    expect(signupSourceFrom(form({ src_utm_source: "x".repeat(300) }))?.utmSource).toHaveLength(100);
    // Not a host name, not a word: left out.
    expect(signupSourceFrom(form({ src_ref: "https://evil.test/path", src_from: "a b" }))).toBeNull();
    expect(signupSourceFrom(form({}))).toBeNull();
    expect(signupSourceFrom(form({ src_utm_source: "   " }))).toBeNull();
  });

  it("is kept with the sign-up, once", async () => {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "A", email: "a@x.test", whatsapp: "+905440000001", siteUrl: "", password: null }, NOW);
    const source = { utmSource: "newsletter", utmMedium: null, utmCampaign: null, referrer: null, from: null };
    await recordSignUp(store, client, source);
    await recordMilestones(store, client.id, NOW);
    expect(await store.listClientMilestones(client.id)).toEqual([{ clientId: client.id, kind: "signed_up", ref: "", appId: null, at: NOW, source }]);
  });
});
