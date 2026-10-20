import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { TeamInvitation } from "@/lib/data/types";
import { recordOrderStatus } from "@/lib/team/activity";
import { acceptInvitation, businessesOf, invitationForToken, inviteMember, removeMember, type TeamDeps } from "@/lib/team/service";
import { teamInviteSchema } from "@/lib/validation";
import { KEY } from "./helpers";

/**
 * 60 Team members on MySQL or MariaDB (migration 0044): members with their
 * areas and apps, invitations accepted once (two at the same moment: one
 * wins), the person's businesses, removal and the activity's pages.
 * Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-10-20T09:00:00.000Z");

describe.skipIf(!url)("60 team members on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });

  const deps: TeamDeps = {
    store,
    now: NOW,
    baseUrl: "https://yallapp.test",
    mail: async () => undefined,
    words: () => ({ role: (role) => role, date: (date) => date.toISOString() }),
  };

  async function business() {
    const { user, client } = await registerClient(store, { name: "Leyla", email: `owner-${randomUUID()}@mysql.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    await activateClient(store, { clientId: client.id, plan: "pro", activeUntil: new Date(NOW.getTime() + 30 * 86_400_000), paymentNote: "" }, KEY, NOW);
    const app = { ...newApp(client.id, null, NOW, "store", null), appName: "Moda Café" };
    await store.createApp(app);
    return { owner: user, client: (await store.getClientById(client.id))!, app };
  }

  it("invites, joins once (of two at once one wins), lists businesses and removes", async () => {
    const { owner, client, app } = await business();
    const email = `kerem-${randomUUID()}@mysql.test`;
    const invited = await inviteMember(deps, {
      client,
      owner,
      apps: [app],
      inviter: owner,
      lang: "ar",
      values: { name: "Kerem", email, role: "staff", areas: ["orders", "media"], appIds: [app.id] },
      parse: (input) => {
        const parsed = teamInviteSchema.parse(input);
        return { ok: true, name: parsed.name, email: parsed.email };
      },
    });
    if (!invited.ok) throw new Error("invite");
    const token = new URL(invited.link).searchParams.get("token")!;
    const open = await store.listOpenTeamInvitations(client.id);
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject<Partial<TeamInvitation>>({ email, role: "staff", areas: ["orders", "media"], appIds: [app.id], lang: "ar", acceptedAt: null });
    expect((await invitationForToken(store, token, NOW)).ok).toBe(true);

    const kerem = await store.createUser({ email, name: "Kerem", passwordHash: "x", now: NOW });
    const both = await Promise.all([acceptInvitation(store, token, kerem, NOW), acceptInvitation(store, token, kerem, NOW)]);
    expect(both.filter((r) => r.ok)).toHaveLength(1);
    expect(await store.listOpenTeamInvitations(client.id)).toEqual([]);
    expect(await store.getTeamMember(client.id, kerem.id)).toMatchObject({ role: "staff", areas: ["orders", "media"], appIds: [app.id], addedBy: owner.email });
    expect((await store.listTeamMembers(client.id)).map((r) => r.user.email)).toEqual([email]);
    expect((await businessesOf(store, kerem)).map((b) => [b.client.id, b.access.role])).toEqual([[client.id, "staff"]]);
    expect(await store.listMembershipsOfUser(kerem.id)).toHaveLength(1);

    // Changing what they can do keeps when they joined.
    await store.saveTeamMember({ ...(await store.getTeamMember(client.id, kerem.id))!, role: "manager", areas: [], appIds: null, updatedAt: new Date(NOW.getTime() + 1000) });
    expect(await store.getTeamMember(client.id, kerem.id)).toMatchObject({ role: "manager", areas: [], appIds: null, createdAt: NOW });

    await store.createOwnerDevice({
      id: randomUUID(),
      userId: kerem.id,
      clientId: client.id,
      name: "Pixel",
      platform: "android",
      appVersion: null,
      language: null,
      refreshHash: randomUUID().replace(/-/g, "").padEnd(64, "0"),
      refreshExpiresAt: new Date(NOW.getTime() + 86_400_000),
      sessionVersion: kerem.sessionVersion,
      pushToken: null,
      pushProvider: "fcm",
      pushPreferences: null,
      createdAt: NOW,
      lastSeenAt: NOW,
    });
    expect(await store.listOwnerDevicesOfClient(client.id)).toHaveLength(1);
    expect(await removeMember(store, { client, actor: owner, userId: kerem.id }, NOW)).toBe(true);
    expect(await store.getTeamMember(client.id, kerem.id)).toBeNull();
    expect(await store.listOwnerDevices(kerem.id)).toEqual([]);
    expect((await store.getUserById(kerem.id))!.sessionVersion).toBe(kerem.sessionVersion + 1);
    expect(await store.deleteTeamMember(client.id, kerem.id)).toBe(false);
  });

  it("keeps the activity newest first, by page and by person", async () => {
    const { owner, client, app } = await business();
    for (let i = 0; i < 5; i += 1) {
      await recordOrderStatus(store, { clientId: client.id, appId: app.id, actor: owner, orderId: i, to: "completed" }, new Date(NOW.getTime() + i * 1000));
    }
    const first = await store.listTeamActivity(client.id, { limit: 2 });
    expect(first.total).toBe(5);
    expect(first.items.map((a) => a.summary)).toEqual(["Order 1004: Completed", "Order 1003: Completed"]);
    expect((await store.listTeamActivity(client.id, { limit: 2, offset: 4 })).items.map((a) => a.targetId)).toEqual(["0"]);
    expect((await store.listTeamActivity(client.id, { limit: 10, actorId: randomUUID() })).total).toBe(0);
  });
});
