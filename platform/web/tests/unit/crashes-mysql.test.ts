import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { App, CrashReportInput } from "@/lib/data/types";

/**
 * 46 Crash groups and the link targets on MySQL or MariaDB: batches with the
 * same new fingerprint arriving on several server instances at once make one
 * group with every report counted, and the runs add up per day. Runs only
 * with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-10-19T12:00:00.000Z");

describe.skipIf(!url)("46 crash reports on MySQL", () => {
  const pools = Array.from({ length: 4 }, () => createPool({ url: url!, ssl: "disabled" }));
  const stores = pools.map((pool) => new MysqlStore(pool));
  afterAll(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });

  const report = (fingerprint: string, version: string, at = NOW): CrashReportInput => ({
    fingerprint,
    title: "StateError: Bad state",
    stack: "#0 f (package:yallapp/a.dart)",
    library: null,
    screen: "/course/:id",
    fatal: false,
    platform: "android",
    version,
    os: "Android 14",
    at,
  });

  it("groups concurrent batches once, counts runs, resolves and opens again", async () => {
    const store = stores[0]!;
    const user = await store.createUser({ email: `crash-${randomUUID()}@yallapp.test`, name: "Crash", passwordHash: null, now: NOW });
    const client = await store.createClient({ userId: user.id, whatsapp: "+905321234567", siteUrl: "", now: NOW });
    const app: App = {
      ...newApp(client.id, null, NOW, "lms"),
      androidPackage: `com.crash${Date.now()}.app`,
      playSigningSha256: "AA:".repeat(31) + "AA",
      reviewPrompt: false,
    };
    await store.createApp(app);
    const fingerprint = randomUUID().replaceAll("-", "");
    await Promise.all(
      stores.map((s, i) => s.recordCrashReports(app.id, [report(fingerprint, `1.${i}.0 (${i})`)], { day: "2026-10-19", sessions: 10, crashed: 1 })),
    );
    const [issue] = await store.listCrashIssues({ appId: app.id, limit: 10 });
    expect(issue).toMatchObject({ fingerprint, count: 4, status: "open", platforms: ["android"] });
    expect(issue!.versions).toHaveLength(4);
    expect(await store.crashSessionTotals(app.id, "2026-10-01")).toEqual({ sessions: 40, crashed: 4 });
    expect(await store.crashSessionTotals(app.id, "2026-10-20")).toEqual({ sessions: 0, crashed: 0 });

    await store.setCrashIssueStatus(issue!.id, "resolved", NOW);
    await store.recordCrashReports(app.id, [report(fingerprint, "1.0.0 (0)", new Date(NOW.getTime() - 1000))], { day: "2026-10-19", sessions: 0, crashed: 0 });
    expect((await store.getCrashIssue(issue!.id))?.status).toBe("resolved");
    await store.recordCrashReports(app.id, [report(fingerprint, "1.4.0 (4)", new Date(NOW.getTime() + 1000))], { day: "2026-10-19", sessions: 0, crashed: 0 });
    expect(await store.getCrashIssue(issue!.id)).toMatchObject({ status: "open", count: 6, resolvedAt: null });

    const target = (await store.listAppLinkTargets()).find((t) => t.id === app.id);
    expect(target).toMatchObject({ androidPackage: app.androidPackage, playSigningSha256: app.playSigningSha256, appleTeamId: null });
    const saved = await store.getAppById(app.id);
    expect(saved?.reviewPrompt).toBe(false);
    expect(saved?.crashReports).toBe(true);
  });
});
