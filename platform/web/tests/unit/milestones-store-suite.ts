import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { ClientMilestone } from "@/lib/data/types";

/**
 * 78 The milestones' store methods, the same on the memory store and on MySQL
 * or MariaDB (migration 0053): each kind once per client and ref, in time
 * order, the sign-up's source kept, a deleted app's milestones kept and the
 * account's deletion taking them.
 */

const NOW = new Date("2026-10-22T09:00:00.000Z");
const HOUR = 3_600_000;

export function milestonesStoreSuite(store: () => DataStore) {
  async function client() {
    return registerClient(store(), { name: "Ada", email: `ada-${randomUUID()}@milestones.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  }
  const row = (clientId: string, kind: ClientMilestone["kind"], ref: string, at: Date, appId: string | null = null): ClientMilestone => ({ clientId, kind, ref, appId, at, source: null });

  it("keeps the first of each kind, in time order, with the sign-up's source", async () => {
    const s = store();
    const { client: c } = await client();
    const appId = randomUUID();
    const source = { utmSource: "instagram", utmMedium: "social", utmCampaign: "autumn", referrer: "instagram.com", from: null };
    expect(
      await s.addClientMilestones([
        { ...row(c.id, "signed_up", "", NOW), source },
        row(c.id, "first_build", appId, new Date(NOW.getTime() + 2 * HOUR), appId),
        row(c.id, "step_app_type", appId, new Date(NOW.getTime() + HOUR), appId),
      ]),
    ).toBe(3);
    // Again, later: the first stays.
    expect(await s.addClientMilestones([row(c.id, "first_build", appId, new Date(NOW.getTime() + 9 * HOUR), appId), row(c.id, "build_ready", appId, new Date(NOW.getTime() + 3 * HOUR), appId)])).toBe(1);
    expect(await s.addClientMilestones([])).toBe(0);
    const list = await s.listClientMilestones(c.id);
    expect(list.map((m) => m.kind)).toEqual(["signed_up", "step_app_type", "first_build", "build_ready"]);
    expect(list[0]).toEqual({ clientId: c.id, kind: "signed_up", ref: "", appId: null, at: NOW, source });
    expect(list[2]).toMatchObject({ appId, at: new Date(NOW.getTime() + 2 * HOUR), source: null });
  });

  it("keeps a renewal per payment and lists every client's from a date, by kind", async () => {
    const s = store();
    const { client: a } = await client();
    const { client: b } = await client();
    const since = new Date(NOW.getTime() + 100 * HOUR);
    await s.addClientMilestones([
      row(a.id, "paid", "", new Date(since.getTime() + HOUR)),
      row(a.id, "renewed", "pay-2", new Date(since.getTime() + 2 * HOUR)),
      row(a.id, "renewed", "pay-3", new Date(since.getTime() + 3 * HOUR)),
      row(b.id, "paid", "", new Date(since.getTime() - HOUR)),
      row(b.id, "signed_up", "", new Date(since.getTime() + 4 * HOUR)),
    ]);
    const renewals = (await s.listMilestones({ since, kinds: ["renewed"] })).filter((m) => m.clientId === a.id);
    expect(renewals.map((m) => m.ref)).toEqual(["pay-2", "pay-3"]);
    const mine = (await s.listMilestones({ since })).filter((m) => m.clientId === a.id || m.clientId === b.id);
    expect(mine.map((m) => `${m.clientId === a.id ? "a" : "b"}:${m.kind}`)).toEqual(["a:paid", "a:renewed", "a:renewed", "b:signed_up"]);
    expect(await s.listMilestones({ kinds: [] })).toEqual([]);
  });

  it("keeps a deleted app's milestones; the account's deletion takes them", async () => {
    const s = store();
    const { user, client: c } = await client();
    const app = newApp(c.id, null, NOW);
    await s.createApp(app);
    await s.addClientMilestones([row(c.id, "first_build", app.id, NOW, app.id)]);
    const deletionId = randomUUID();
    expect(
      await s.softDeleteApp({ id: deletionId, appId: app.id, clientId: c.id, appName: "Ada", reason: "owner", deletedBy: "ada@x.test", deletedAt: NOW, purgeAfter: NOW, status: "waiting", closedAt: null, closedBy: null, pendingBuilds: [] }),
    ).toBe(true);
    expect(await s.purgeDeletedApp(deletionId, "daily job", NOW, [])).toBe(true);
    expect((await s.listClientMilestones(c.id)).map((m) => m.kind)).toEqual(["first_build"]);
    expect(await s.deleteUserAccount(user.id)).toBe(true);
    expect(await s.listClientMilestones(c.id)).toEqual([]);
    // An account that doesn't exist (any more) gets none.
    expect(await s.addClientMilestones([row(c.id, "paid", "", NOW)])).toBe(0);
  });

  it("78.2 keeps one snapshot a day, oldest first", async () => {
    const s = store();
    const day = (iso: string, ids: string[]) => ({ day: iso, clients: 3, pending: 1, active: ids.length, expired: 0, suspended: 0, apps: 2, appsLive: 1, activeClientIds: ids });
    await s.saveProductDay(day("2031-03-02", ["b"]), NOW);
    await s.saveProductDay(day("2031-03-01", ["a"]), NOW);
    await s.saveProductDay(day("2031-03-02", ["b", "c"]), NOW);
    expect(await s.listProductDays("2031-03-01")).toEqual([day("2031-03-01", ["a"]), day("2031-03-02", ["b", "c"])]);
    expect(await s.listProductDays("2031-03-02")).toEqual([day("2031-03-02", ["b", "c"])]);
  });
}
