import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import type { DataStore } from "@/lib/data/store";

/**
 * 78.3 The watch's store methods, the same on the memory store and on MySQL
 * or MariaDB (migration 0055): job runs, the last good run per job, and team
 * alerts opened once per key, counted while open, closed and opened again.
 */

const NOW = new Date("2031-05-10T09:00:00.000Z");
const MIN = 60_000;

export function watchStoreSuite(store: () => DataStore) {
  it("records job runs, the last good one per job, and forgets old ones", async () => {
    const s = store();
    const a = await s.startJobRun("webhooks", new Date(NOW.getTime() - 10 * MIN));
    await s.finishJobRun(a, { finishedAt: new Date(NOW.getTime() - 9 * MIN), ok: true, summary: '{"tried":1}', error: null });
    const b = await s.startJobRun("webhooks", new Date(NOW.getTime() - 5 * MIN));
    await s.finishJobRun(b, { finishedAt: new Date(NOW.getTime() - 4 * MIN), ok: false, summary: null, error: "boom" });
    const c = await s.startJobRun("webhooks", new Date(NOW.getTime() - MIN));
    expect(b).toBeGreaterThan(a);

    const runs = (await s.listJobRuns({ job: "webhooks", limit: 10 })).filter((r) => [a, b, c].includes(r.id));
    expect(runs.map((r) => r.id)).toEqual([c, b, a]);
    expect(runs[0]).toMatchObject({ finishedAt: null, ok: null });
    expect(runs[1]).toMatchObject({ ok: false, error: "boom", summary: null });
    expect(runs[2]).toMatchObject({ ok: true, summary: '{"tried":1}', finishedAt: new Date(NOW.getTime() - 9 * MIN) });
    expect((await s.lastGoodJobRuns()).webhooks).toEqual(new Date(NOW.getTime() - 9 * MIN));

    expect(await s.deleteJobRunsBefore(new Date(NOW.getTime() - 2 * MIN))).toBeGreaterThanOrEqual(2);
    expect((await s.listJobRuns({ job: "webhooks", limit: 10 })).map((r) => r.id)).toContain(c);
    expect((await s.listJobRuns({ job: "webhooks", limit: 10 })).map((r) => r.id)).not.toContain(a);
  });

  it("opens an alert once per key, counts it, closes it, and opens it again", async () => {
    const s = store();
    const key = `build_waiting:${randomUUID()}`;
    const input = { kind: "build_waiting" as const, key, title: "Build waits", detail: "45 minutes", link: "/admin/builds" };
    const first = await s.raiseTeamAlert(input, NOW);
    expect(first.created).toBe(true);
    expect(first.alert).toMatchObject({ ...input, count: 1, createdAt: NOW, lastSeenAt: NOW, resolvedAt: null, emailedAt: null });
    const again = await s.raiseTeamAlert({ ...input, detail: "50 minutes" }, new Date(NOW.getTime() + 5 * MIN));
    expect(again.created).toBe(false);
    expect(again.alert).toMatchObject({ id: first.alert.id, count: 2, detail: "50 minutes", createdAt: NOW, lastSeenAt: new Date(NOW.getTime() + 5 * MIN) });

    await s.markTeamAlertEmailed(first.alert.id, NOW);
    const open = await s.listTeamAlerts({ open: true, limit: 500 });
    expect(open.find((a) => a.id === first.alert.id)).toMatchObject({ emailedAt: NOW });
    const count = await s.countOpenTeamAlerts();
    expect(count).toBeGreaterThanOrEqual(1);

    expect(await s.resolveTeamAlert(first.alert.id, "ada@yallapp.test", new Date(NOW.getTime() + 10 * MIN))).toBe(true);
    expect(await s.resolveTeamAlert(first.alert.id, "ada@yallapp.test", NOW)).toBe(false);
    expect(await s.countOpenTeamAlerts()).toBe(count - 1);
    const closed = await s.listTeamAlerts({ open: false, limit: 500 });
    expect(closed.find((a) => a.id === first.alert.id)).toMatchObject({ resolvedBy: "ada@yallapp.test" });

    // The same problem again: a new alert.
    const reopened = await s.raiseTeamAlert(input, new Date(NOW.getTime() + 20 * MIN));
    expect(reopened.created).toBe(true);
    expect(reopened.alert.id).not.toBe(first.alert.id);
  });

  it("closes a kind's alerts but those it keeps", async () => {
    const s = store();
    const tag = randomUUID().slice(0, 8);
    const raise = (key: string) => s.raiseTeamAlert({ kind: "crash_spike", key, title: key, detail: "x", link: null }, NOW);
    await raise(`crash_spike:${tag}:a`);
    await raise(`crash_spike:${tag}:b`);
    const other = await s.raiseTeamAlert({ kind: "job_missing", key: `job_missing:${tag}`, title: "x", detail: "x", link: null }, NOW);
    expect(await s.resolveTeamAlertsExcept("crash_spike", [`crash_spike:${tag}:b`], "watch", NOW)).toBeGreaterThanOrEqual(1);
    const open = (await s.listTeamAlerts({ open: true, limit: 500 })).map((a) => a.key);
    expect(open).toContain(`crash_spike:${tag}:b`);
    expect(open).not.toContain(`crash_spike:${tag}:a`);
    expect(open).toContain(other.alert.key);
  });
}
