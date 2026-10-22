import { describe, expect, it } from "vitest";
import { buildsByMonth, cohorts, lastMonths, median, plansByMonth, signUpSources, sourceLabel, timesToSteps } from "@/lib/admin/product";
import { recordProductDay } from "@/lib/admin/product-days";
import type { Build, ClientMilestone, MilestoneKind, ProductDay } from "@/lib/data/types";
import { MemoryStore } from "@/lib/data/memory";
import { registerClient } from "@/lib/auth/accounts";
import { activateClient } from "@/lib/admin/clients";
import { KEY } from "./helpers";

/** 78.2 Admin › Product's numbers: the funnel by sign-up month, the times, the sources, builds by month and clients with a plan running. */

const NOW = new Date("2026-10-22T09:00:00Z");
const DAY = 86_400_000;
const d = (iso: string) => new Date(`${iso}T12:00:00Z`);

function m(clientId: string, kind: MilestoneKind, at: Date, extra: Partial<ClientMilestone> = {}): ClientMilestone {
  return { clientId, kind, ref: kind === "signed_up" || kind === "paid" ? "" : "app", appId: null, at, source: null, ...extra };
}

const MILESTONES: ClientMilestone[] = [
  m("a", "signed_up", d("2026-09-01"), { source: { utmSource: "instagram", utmMedium: "social", utmCampaign: null, referrer: null, from: null } }),
  m("a", "setup_done", d("2026-09-03")),
  m("a", "first_build", d("2026-09-03")),
  m("a", "build_ready", d("2026-09-04")),
  m("a", "store_live", d("2026-09-11")),
  m("a", "paid", d("2026-09-05")),
  m("a", "renewed", d("2026-10-05"), { ref: "p2" }),
  m("b", "signed_up", d("2026-09-20"), { source: { utmSource: null, utmMedium: null, utmCampaign: null, referrer: "www.google.com", from: null } }),
  m("b", "setup_done", d("2026-09-21")),
  m("c", "signed_up", d("2026-10-02"), { source: { utmSource: null, utmMedium: null, utmCampaign: null, referrer: null, from: "demo" } }),
  m("c", "paid", d("2026-10-06")),
  // Two apps: the earlier counts.
  m("c", "setup_done", d("2026-10-04"), { ref: "app-2" }),
  m("c", "setup_done", d("2026-10-03"), { ref: "app-1" }),
  // Long ago: outside the 12 months.
  m("old", "signed_up", d("2025-01-10")),
];

describe("78.2 the funnel and the times", () => {
  it("lists the last months, oldest first", () => {
    expect(lastMonths(NOW, 3)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(lastMonths(new Date("2026-01-15T00:00:00Z"), 2)).toEqual(["2025-12", "2026-01"]);
  });

  it("counts each month's sign-ups and how far they got", () => {
    const rows = cohorts(MILESTONES, NOW, 3);
    expect(rows.map((r) => r.month)).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(rows[0]).toMatchObject({ signUps: 0 });
    expect(rows[1]).toEqual({ month: "2026-09", signUps: 2, reached: { setup_done: 2, first_build: 1, build_ready: 1, store_live: 1, paid: 1, renewed: 1 } });
    expect(rows[2]).toEqual({ month: "2026-10", signUps: 1, reached: { setup_done: 1, first_build: 0, build_ready: 0, store_live: 0, paid: 1, renewed: 0 } });
  });

  it("takes the median days from the sign-up, over those who got there", () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    const times = timesToSteps(MILESTONES, d("2025-11-01"));
    // a: 2 days, b: 1 day, c: 1 day (its first app).
    expect(times.setup_done).toEqual({ days: 1, clients: 3 });
    expect(times.build_ready).toEqual({ days: 3, clients: 1 });
    expect(times.store_live).toEqual({ days: 10, clients: 1 });
    // a: 4 days, c: 4 days.
    expect(times.paid).toEqual({ days: 4, clients: 2 });
  });

  it("names the sources and counts who paid", () => {
    expect(sourceLabel(null)).toBe("Not known");
    expect(sourceLabel({ utmSource: "news", utmMedium: null, utmCampaign: "x", referrer: "a.com", from: "demo" })).toBe("news");
    expect(sourceLabel({ utmSource: null, utmMedium: null, utmCampaign: null, referrer: null, from: "team" })).toBe("Added by the team");
    expect(sourceLabel({ utmSource: null, utmMedium: null, utmCampaign: null, referrer: null, from: "webinar" })).toBe("From: webinar");
    expect(signUpSources(MILESTONES, d("2026-09-15"))).toEqual([
      { source: "Demo apps", signUps: 1, paid: 1 },
      { source: "google.com", signUps: 1, paid: 0 },
    ]);
  });
});

describe("78.2 builds by month", () => {
  const STAGES = { queued: "done", android: "done", ios: "done", upload_play: "done", upload_testflight: "done" } as const;
  const build = (created: string, status: Build["status"], minutes: number, stages: Partial<Build["stages"]> = {}) => ({
    status,
    stages: { ...STAGES, ...stages } as Build["stages"],
    createdAt: new Date(`${created}T10:00:00Z`),
    startedAt: new Date(`${created}T10:05:00Z`),
    finishedAt: status === "ready" || status === "failed" ? new Date(new Date(`${created}T10:05:00Z`).getTime() + minutes * 60_000) : null,
  });

  it("counts what worked, how long it took, each platform and where the failed ones stopped", () => {
    const months = buildsByMonth(
      [
        build("2026-10-01", "ready", 20),
        build("2026-10-02", "ready", 30, { ios: "skipped", upload_testflight: "skipped" }),
        build("2026-10-03", "ready", 40),
        build("2026-10-04", "failed", 5, { ios: "failed", upload_play: "pending", upload_testflight: "pending" }),
        build("2026-10-05", "failed", 1, { android: "pending", ios: "pending", upload_play: "pending", upload_testflight: "pending" }),
        build("2026-10-06", "failed", 9, { ios: "failed", upload_play: "pending", upload_testflight: "pending" }),
        build("2026-10-07", "building", 0),
        build("2026-09-07", "ready", 12),
      ],
      NOW,
      2,
    );
    expect(months[0]).toMatchObject({ month: "2026-09", finished: 1, ready: 1, successRate: 100, medianMinutes: 12 });
    expect(months[1]).toEqual({
      month: "2026-10",
      finished: 6,
      ready: 3,
      failed: 3,
      successRate: 50,
      medianMinutes: 30,
      android: { done: 5, failed: 0 },
      ios: { done: 2, failed: 2 },
      failedAt: [
        { stage: "iOS build", count: 2 },
        { stage: "Before a stage", count: 1 },
      ],
    });
    expect(buildsByMonth([], NOW, 1)[0]).toMatchObject({ finished: 0, successRate: null, medianMinutes: null });
  });
});

describe("78.2 clients with a plan running", () => {
  const day = (iso: string, ids: string[]): ProductDay => ({ day: iso, clients: 9, pending: 0, active: ids.length, expired: 0, suspended: 0, apps: 0, appsLive: 0, activeClientIds: ids });

  it("compares each month's first and last snapshot", () => {
    const months = plansByMonth(
      [day("2026-09-30", ["a", "b", "c"]), day("2026-10-01", ["a", "b", "c", "d"]), day("2026-10-15", ["a", "b"]), day("2026-10-22", ["a", "e"]), day("2026-08-10", [])],
      NOW,
      3,
    );
    expect(months).toEqual([
      { month: "2026-08", atStart: 0, lost: 0, gained: 0, atEnd: 0, churn: null },
      { month: "2026-09", atStart: 3, lost: 0, gained: 0, atEnd: 3, churn: 0 },
      { month: "2026-10", atStart: 4, lost: 3, gained: 1, atEnd: 2, churn: 75 },
    ]);
  });

  it("the daily snapshot counts the clients, their state, the apps live, and not the demo account", async () => {
    const store = new MemoryStore();
    const { client: active } = await registerClient(store, { name: "A", email: "a@x.test", whatsapp: "+905440000001", siteUrl: "", password: null }, new Date(NOW.getTime() - 10 * DAY));
    await activateClient(store, { clientId: active.id, plan: "growth", activeUntil: new Date(NOW.getTime() + 30 * DAY), paymentNote: "card" }, KEY, NOW);
    await registerClient(store, { name: "B", email: "b@x.test", whatsapp: "+905440000002", siteUrl: "", password: null }, NOW);
    await store.addClientMilestones([
      { clientId: active.id, kind: "store_live", ref: "app-1", appId: "app-1", at: NOW, source: null },
    ]);
    const first = await recordProductDay(store, NOW);
    expect(first).toEqual({ day: "2026-10-22", clients: 2, pending: 1, active: 1, expired: 0, suspended: 0, apps: 0, appsLive: 1, activeClientIds: [active.id] });
    // Again the same day: replaced.
    await recordProductDay(store, new Date(NOW.getTime() + 3_600_000));
    expect(await store.listProductDays("2026-10-01")).toHaveLength(1);
    expect(await store.listProductDays("2026-10-23")).toEqual([]);
  });
});
