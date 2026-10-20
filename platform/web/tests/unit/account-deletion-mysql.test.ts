import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { requestAccountDeletion, type DeletionDeps } from "@/lib/account/deletion";
import { registerClient } from "@/lib/auth/accounts";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { AccountDeletionRequest } from "@/lib/data/types";

/**
 * 66 Requests to delete an account on MySQL or MariaDB (migration 0048): one
 * open request per client (two at the same moment: one wins), closing only
 * while open, a new request once the last is closed, and the lists.
 * Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-10-20T09:00:00.000Z");

describe.skipIf(!url)("66 account deletion requests on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });

  const request = (clientId: string, userId: string, patch: Partial<AccountDeletionRequest> = {}): AccountDeletionRequest => ({
    id: randomUUID(),
    clientId,
    userId,
    email: "ada@mysql.test",
    name: "Ada",
    lang: "ar",
    reason: null,
    status: "pending",
    requestedAt: NOW,
    closedAt: null,
    closedBy: null,
    teamNote: null,
    ...patch,
  });

  it("keeps one open request per client, closes it once, and takes a new one after", async () => {
    const { user, client } = await registerClient(store, { name: "Ada", email: `ada-${randomUUID()}@mysql.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    const first = request(client.id, user.id, { reason: "Closing." });
    // Two at the same moment: one wins.
    const results = await Promise.all([store.createAccountDeletionRequest(first), store.createAccountDeletionRequest(request(client.id, user.id))]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const open = await store.getOpenAccountDeletionRequest(client.id);
    expect(open?.status).toBe("pending");
    expect(await store.getAccountDeletionRequest(open!.id)).toEqual(open);

    const close = { status: "done" as const, closedAt: new Date(NOW.getTime() + 60_000), closedBy: "admin@yallapp.test", teamNote: "Deleted." };
    const twice = await Promise.all([store.closeAccountDeletionRequest(open!.id, close), store.closeAccountDeletionRequest(open!.id, { ...close, status: "cancelled" })]);
    expect(twice.filter(Boolean)).toHaveLength(1);
    expect(await store.getOpenAccountDeletionRequest(client.id)).toBeNull();
    const closed = await store.getAccountDeletionRequest(open!.id);
    expect(closed).toMatchObject({ closedBy: "admin@yallapp.test", teamNote: "Deleted.", closedAt: close.closedAt });
    expect(["done", "cancelled"]).toContain(closed!.status);

    // A new request once the last one is closed.
    const later = request(client.id, user.id, { requestedAt: new Date(NOW.getTime() + 120_000) });
    expect(await store.createAccountDeletionRequest(later)).toBe(true);
    const mine = (await store.listAccountDeletionRequests([], 500)).filter((r) => r.clientId === client.id);
    expect(mine.map((r) => r.id)).toEqual([later.id, open!.id]);
    expect((await store.listAccountDeletionRequests(["pending"], 500)).some((r) => r.id === later.id)).toBe(true);
    expect((await store.listAccountDeletionRequests([closed!.status], 500)).some((r) => r.id === open!.id)).toBe(true);
  });

  it("asks through the service: a second request returns the first", async () => {
    const password = "a long enough password 42";
    const { user, client } = await registerClient(store, { name: "Leyla", email: `leyla-${randomUUID()}@mysql.test`, whatsapp: "+905446731942", siteUrl: "", password }, NOW);
    const deps: DeletionDeps = { store, now: NOW, mail: async () => undefined, teamEmail: "info@yallapp.test", baseUrl: "https://yallapp.test" };
    const asker = { user, staff: null, member: null, client, apps: [], licenses: [] };
    const first = await requestAccountDeletion(deps, asker, { password, confirmEmail: user.email, reason: "", lang: "tr" });
    const again = await requestAccountDeletion(deps, asker, { password, confirmEmail: user.email, reason: "", lang: "tr" });
    expect(first).toMatchObject({ ok: true, created: true });
    expect(again).toMatchObject({ ok: true, created: false });
    if (!first.ok || !again.ok) throw new Error("refused");
    expect(again.request).toEqual(first.request);
  });
});
