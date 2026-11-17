import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { App, Build, BuildStages, PublishingAccount } from "@/lib/data/types";
import { accountCounts, moveAppAccount, newAccount, publishingEmailFor, type AccountDeps } from "@/lib/publishing/accounts";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";

/**
 * 138 The publishing accounts and the builds' release state on MySQL or
 * MariaDB, with no migration: an app's account is set in its `rollout` JSON
 * once, in one statement (`claimPublishingAccount`), keeping the rest of
 * that JSON; two claims at once give it one account; the team's move
 * replaces it. A build's `release` JSON keeps where it went on Google Play
 * and its App Review state.
 * Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date(Math.floor(Date.now() / 1000) * 1000);

describe.skipIf(!url)("138 publishing accounts on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });

  async function someApp(patch: Partial<App> = {}): Promise<App> {
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(store, { name: "Ada", email: `p138-${suffix}@academy.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "lms"), androidPackage: `com.p${suffix}.app`, ...patch };
    await store.createApp(app);
    return app;
  }

  it("gives an app its account once, keeping the rest of its rollout", async () => {
    // An app with nothing in `rollout` yet.
    const bare = await someApp();
    expect((await store.getAppById(bare.id))!.rollout ?? null).toBeNull();
    expect(await store.claimPublishingAccount(bare.id, "acc-a", NOW)).toEqual({ id: "acc-a", claimed: true });
    expect((await store.getAppById(bare.id))!.rollout).toEqual({ publishingAccount: { id: "acc-a", at: NOW.toISOString() } });
    // Never replaced by a later claim.
    expect(await store.claimPublishingAccount(bare.id, "acc-b", NOW)).toEqual({ id: "acc-a", claimed: false });

    // An app whose release is in progress: that stays as it was.
    const rollout = { android: { versionName: "1.2.0", versionCode: 12, fraction: 0.1, status: "inProgress" as const, at: NOW.toISOString() }, playDraftNotifiedAt: null };
    const released = await someApp({ rollout });
    expect(await store.claimPublishingAccount(released.id, "acc-b", NOW)).toEqual({ id: "acc-b", claimed: true });
    expect((await store.getAppById(released.id))!.rollout).toEqual({ ...rollout, publishingAccount: { id: "acc-b", at: NOW.toISOString() } });

    // An app that isn't there.
    expect(await store.claimPublishingAccount(randomUUID(), "acc-a", NOW)).toEqual({ id: null, claimed: false });
  });

  it("gives an app one account when several requests claim it at once", async () => {
    const app = await someApp();
    const claims = await Promise.all(["acc-1", "acc-2", "acc-3", "acc-4", "acc-5"].map((id) => store.claimPublishingAccount(app.id, id, NOW)));
    const winner = (await store.getAppById(app.id))!.rollout?.publishingAccount?.id;
    expect(winner).toBeTruthy();
    expect(claims.filter((c) => c.claimed)).toHaveLength(1);
    expect(claims.every((c) => c.id === winner)).toBe(true);
  });

  it("assigns through the pool, balances it, and the team's move sticks", async () => {
    const suffix = randomUUID().slice(0, 8);
    const accounts: PublishingAccount[] = [
      { ...newAccount(`publishing-a-${suffix}@yallapp.test`, NOW), id: `a-${suffix}`, limit: 1 },
      { ...newAccount(`publishing-b-${suffix}@yallapp.test`, NOW), id: `b-${suffix}`, limit: 5 },
    ];
    await store.setPlatformSetting("publishingAccounts", { accounts }, "team@yallapp.test", NOW);
    clearPlatformSettingsCache();
    const told: string[] = [];
    const deps: AccountDeps = { store, now: NOW, teamEmail: async () => "publishing-team@yallapp.test", assigned: async (app, account) => void told.push(`${app.id}:${account.id}`) };
    const one = await someApp();
    const two = await someApp();
    // Twice at once for the same app: one account, told once.
    const [first, again] = await Promise.all([publishingEmailFor(deps, one), publishingEmailFor(deps, one)]);
    expect(first.account?.id).toBe(again.account?.id);
    expect(told.filter((t) => t.startsWith(one.id))).toHaveLength(1);
    // The first account is full (limit 1): the next app goes to the other one.
    expect(first.account?.id).toBe(`a-${suffix}`);
    expect((await publishingEmailFor(deps, two)).account?.id).toBe(`b-${suffix}`);
    const counts = accountCounts(await store.listApps());
    expect([counts.get(`a-${suffix}`), counts.get(`b-${suffix}`)]).toEqual([1, 1]);

    // The team moves the first app; a later claim doesn't undo it.
    await moveAppAccount(store, one.id, `b-${suffix}`, NOW);
    expect((await store.getAppById(one.id))!.rollout?.publishingAccount?.id).toBe(`b-${suffix}`);
    expect(await store.claimPublishingAccount(one.id, `a-${suffix}`, NOW)).toEqual({ id: `b-${suffix}`, claimed: false });
    expect((await publishingEmailFor(deps, one)).email).toBe(`publishing-b-${suffix}@yallapp.test`);
    // Moved back to none: given again when next needed.
    await moveAppAccount(store, one.id, null, NOW);
    expect((await store.getAppById(one.id))!.rollout?.publishingAccount).toBeUndefined();
    expect((await publishingEmailFor(deps, one)).account?.id).toBe(`a-${suffix}`);
    await store.setPlatformSetting("publishingAccounts", null, "team@yallapp.test", NOW);
    clearPlatformSettingsCache();
  });

  it("keeps a build's Google Play release and App Review state", async () => {
    const app = await someApp();
    const created = await store.createBuild({
      id: randomUUID(),
      clientId: app.clientId,
      appId: app.id,
      versionName: "1.0.0",
      status: "ready",
      stages: { queued: "done", android: "done", ios: "done", upload_play: "done", upload_testflight: "done", app_review: "pending" } as BuildStages,
      config: {} as Build["config"],
      storeListing: { storeTitle: "", shortDescription: "", fullDescription: "", supportEmail: "", privacyUrl: "" },
      autoPublish: true,
      artifacts: [],
      message: null,
      logUrl: null,
      release: { androidRollout: 1, iosPhased: false, appRelease: 1 },
      createdAt: NOW,
      startedAt: NOW,
      finishedAt: NOW,
      updatedAt: NOW,
    });
    const release = {
      ...created.release!,
      play: { track: "production" as const, status: "draft" as const },
      appReview: { state: "blocked" as const, reason: "app_privacy" as const, detail: null, checkedAt: NOW.toISOString(), since: NOW.toISOString(), emailed: "app_privacy" as const },
    };
    await store.updateBuild(created.id, { release, stages: { ...created.stages, app_review: "pending" } }, NOW);
    const read = (await store.getBuild(created.id))!;
    expect(read.release).toEqual(release);
    expect(read.stages.app_review).toBe("pending");
    expect((await store.listBuilds({ status: "ready", limit: 500, newestFirst: true })).some((b) => b.id === created.id && b.release?.appReview?.reason === "app_privacy")).toBe(true);
  });
});
