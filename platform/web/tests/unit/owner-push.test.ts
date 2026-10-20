import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { newApp } from "@/lib/app/setup";
import { sha256Hex } from "@/lib/crypto/tokens";
import { MemoryStore } from "@/lib/data/memory";
import type { Announcement, App, Build, CatalogOrder, Client, OwnerDevice, User } from "@/lib/data/types";
import { noticeRefundDue } from "@/lib/events/holds";
import type { sendPush, ServiceAccount } from "@/lib/hosted/push";
import { pushAnnouncement, pushBuildFinished, pushNewOrder, pushNotice, pushToOwner, type OwnerPushDeps } from "@/lib/owner/push";
import { KEY, NOW, days } from "./helpers";

/** 58 Pushes to the owner's phone: who gets them, in which language, and from where they start. */

const ACCOUNT: ServiceAccount = { project_id: "yallapp-business", client_email: "push@yallapp-business.test", private_key: "-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----" };

describe("58 pushes to the owner's phone", () => {
  let store: MemoryStore;
  let user: User;
  let client: Client;
  let app: App;
  let sent: { targets: unknown[]; title: string; body: string; data: Record<string, string> }[];
  let invalid: string[];

  const send = (async (_account, targets, message) => {
    sent.push({ targets, ...message });
    return { sent: targets.length, invalidTokens: invalid };
  }) as typeof sendPush;
  const deps = (): OwnerPushDeps => ({ store, now: NOW, account: ACCOUNT, send });

  async function device(id: string, patch: Partial<OwnerDevice>): Promise<void> {
    await store.createOwnerDevice({
      id,
      userId: user.id,
      clientId: client.id,
      name: id,
      platform: "android",
      appVersion: null,
      language: null,
      refreshHash: sha256Hex(id),
      refreshExpiresAt: days(60),
      sessionVersion: user.sessionVersion,
      pushToken: `token-${id}`,
      pushProvider: "fcm",
      pushPreferences: null,
      createdAt: NOW,
      lastSeenAt: NOW,
      ...patch,
    });
  }

  beforeEach(async () => {
    store = new MemoryStore();
    sent = [];
    invalid = [];
    ({ user, client } = await registerClient(store, { name: "Leyla", email: "leyla@cafe.test", whatsapp: "+905446731942", siteUrl: "", password: null }, NOW));
    await activateClient(store, { clientId: client.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    app = { ...newApp(client.id, null, NOW, "store", "restaurant"), backend: "hosted", appName: "Moda Café", connector: { kind: "catalog" } };
    await store.createApp(app);
  });

  it("goes to each signed-in device that wants the kind, in the device's language when the person chose none", async () => {
    await device("11111111-1111-4111-8111-111111111111", { language: "tr" });
    await device("22222222-2222-4222-8222-222222222222", { language: "ar" });
    await device("33333333-3333-4333-8333-333333333333", { pushPreferences: { new_order: false } });
    await device("44444444-4444-4444-8444-444444444444", { pushToken: null });
    await device("55555555-5555-4555-8555-555555555555", { refreshExpiresAt: days(-1) });
    const order = { id: 42, totalCents: 125000, currency: "TRY" } as CatalogOrder;
    expect(await pushNewOrder(deps(), app, order)).toBe(2);
    expect(sent.map((s) => [s.targets, s.title, s.body]).sort()).toEqual([
      [["token-11111111-1111-4111-8111-111111111111"], "Yeni sipariş 1042", "Moda Café: ₺1,250.00"],
      [["token-22222222-2222-4222-8222-222222222222"], "طلب جديد 1042", "Moda Café: ₺1,250.00"],
    ]);
    expect(sent[0]!.data).toEqual({ type: "owner", kind: "new_order", app_id: app.id, order_id: "42" });
  });

  it("follows the dashboard language the person chose, forgets tokens the service refuses, and skips demo apps", async () => {
    await store.updateUser(user.id, { language: "ar" }, NOW);
    await device("11111111-1111-4111-8111-111111111111", { language: "tr" });
    invalid = ["token-11111111-1111-4111-8111-111111111111"];
    const build = { id: "b1", clientId: client.id, appId: app.id, number: 7, versionName: "1.2.0", status: "ready" } as Build;
    expect(await pushBuildFinished(deps(), app, build)).toBe(1);
    expect(sent[0]).toMatchObject({ title: "الإصدار 7 جاهز", data: { kind: "build_finished", build_id: "b1", update_key: "build:b1" } });
    expect((await store.getOwnerDevice("11111111-1111-4111-8111-111111111111"))!.pushToken).toBeNull();
    expect(await pushNewOrder(deps(), { ...app, demo: true } as App, { id: 1, totalCents: 1, currency: "TRY" } as CatalogOrder)).toBe(0);
  });

  it("stops after a password change, and without Yallapp Business's Firebase key only the capture sees it", async () => {
    await device("11111111-1111-4111-8111-111111111111", {});
    const captured: unknown[] = [];
    expect(await pushNotice({ store, now: NOW, account: null, capture: async (p) => void captured.push(p) }, { id: 9, clientId: client.id, appId: app.id, title: "Moda Café: refund order 1009", body: "Refund it.", linkUrl: null, linkLabel: null } as never)).toBe(0);
    expect(captured).toHaveLength(1);
    await store.updateUser(user.id, { sessionVersion: user.sessionVersion + 1 }, NOW);
    expect(await pushNotice(deps(), { id: 9, clientId: client.id, appId: app.id, title: "x", body: "y" } as never)).toBe(0);
    expect(sent).toEqual([]);
  });

  it("sends Yallapp's live updates in the language the team wrote", async () => {
    await store.updateUser(user.id, { language: "tr" }, NOW);
    await device("11111111-1111-4111-8111-111111111111", {});
    const announcement = { id: "a1", title: "New: Kitchen screen", body: "Try the **new** kitchen.", titleTr: "Yeni: Mutfak ekranı", bodyTr: "Yeni **mutfağı** deneyin.", titleAr: null, bodyAr: null, startsAt: days(-1), endsAt: null } as unknown as Announcement;
    expect(await pushAnnouncement(deps(), announcement, [client.id])).toBe(1);
    expect(sent[0]).toMatchObject({ title: "Yeni: Mutfak ekranı", body: "Yeni mutfağı deneyin.", data: { kind: "yallapp_updates", update_key: "announcement:a1" } });
    expect(await pushAnnouncement(deps(), { ...announcement, startsAt: days(2) }, [client.id])).toBe(0);
  });

  it("never fails what caused it", async () => {
    await device("11111111-1111-4111-8111-111111111111", {});
    const failing = (async () => {
      throw new Error("FCM is down");
    }) as typeof sendPush;
    expect(await pushToOwner({ store, now: NOW, account: ACCOUNT, send: failing }, client.id, "new_booking", () => ({ title: "t", body: "b" }), {})).toBe(0);
  });

  describe("from where the dashboard learns of things", () => {
    let dir: string;
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), "owner-push-"));
      process.env.YALLAPP_OWNER_PUSH_DIR = dir;
    });
    afterEach(() => {
      delete process.env.YALLAPP_OWNER_PUSH_DIR;
      rmSync(dir, { recursive: true, force: true });
    });

    it("a notice on the account (here: a ticket refund due) reaches the phone", async () => {
      await device("11111111-1111-4111-8111-111111111111", {});
      const order = { id: 9, appId: app.id } as CatalogOrder;
      const notice = await noticeRefundDue(store, app, order, NOW, "https://yallapp.test");
      expect(notice).not.toBeNull();
      const files = readdirSync(dir);
      expect(files).toHaveLength(1);
      const push = JSON.parse(readFileSync(join(dir, files[0]!), "utf8")) as { to: string[]; message: { title: string; data: Record<string, string> } };
      expect(push).toMatchObject({ to: ["11111111-1111-4111-8111-111111111111"], message: { title: "Moda Café: refund order 1009", data: { kind: "account_notices", update_key: `notice:${notice!.id}` } } });
      // Told once: the same notice isn't made, or pushed, again.
      await noticeRefundDue(store, app, order, NOW, "https://yallapp.test");
      expect(readdirSync(dir)).toHaveLength(1);
    });
  });
});
