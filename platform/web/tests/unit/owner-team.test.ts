import { beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { newApp } from "@/lib/app/setup";
import { DEFAULT_FULFILMENT } from "@/lib/catalog/fulfilment";
import { sha256Hex } from "@/lib/crypto/tokens";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type Build, type CatalogOrder, type Client, type User } from "@/lib/data/types";
import type { sendPush, ServiceAccount } from "@/lib/hosted/push";
import type { OwnerDeps } from "@/lib/owner/http";
import { pushBuildFinished, pushNewOrder, type OwnerPushDeps } from "@/lib/owner/push";
import { handleOwner } from "@/lib/owner/service";
import { expectOwnerContract } from "./owner-contract";
import { KEY, NOW, days } from "./helpers";

/**
 * 60 The Owner API for someone on an owner's team: `me` with their role and
 * areas per app, every boundary (403 `not_allowed`, 404 outside their apps),
 * the owner's Team paths, removal signing them out, switching business, and
 * pushes only for their areas. Checked against docs/api/owner.yaml.
 */

const SECRET = "test-signing-secret-0123456789abcdef0123456789";
const PASSWORD = "a-long-team-password";
const ACCOUNT: ServiceAccount = { project_id: "yallapp-business", client_email: "push@yallapp-business.test", private_key: "-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----" };

describe("60 the Owner API for team members", () => {
  let store: MemoryStore;
  let owner: User;
  let client: Client;
  let kitchen: App;
  let shop: App;
  let theirs: App;
  let staff: User;
  let mails: { to: string; values: Record<string, string>; lang: string }[];

  const deps = (): OwnerDeps => ({
    store,
    now: NOW,
    ip: `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
    signingSecret: SECRET,
    encryptionKey: KEY,
    baseUrl: "https://yallapp.test",
    paymentUrls: {},
    media: null,
    mail: async () => undefined,
    teamMail: async (to, values, lang) => void mails.push({ to, values, lang }),
    sendPush: (async (_a, targets) => ({ sent: targets.length, invalidTokens: [] })) as typeof sendPush,
  });

  async function call(method: string, route: string, options: { params?: Record<string, string | number>; token?: string; body?: unknown; check?: boolean } = {}) {
    const path = route.replace(/\{(\w+)\}/g, (_, name: string) => String(options.params?.[name] ?? `{${name}}`));
    const result = await handleOwner(deps(), { method, path: path.split("/").filter(Boolean), query: new URLSearchParams(), body: options.body, token: options.token ?? null, acceptLanguage: null });
    if (options.check !== false) expectOwnerContract(method, route, result);
    return result as { status: number; body: Record<string, unknown> };
  }

  async function signIn(email: string) {
    const result = await call("POST", "/auth/sign-in", { body: { email, password: PASSWORD, device: { name: "Pixel 8", platform: "android" } } });
    expect(result.status).toBe(200);
    return result.body as unknown as { access_token: string; refresh_token: string; device_id: string };
  }

  async function person(email: string, name: string): Promise<User> {
    const user = await store.createUser({ email, name, passwordHash: await hashPassword(PASSWORD), now: NOW });
    return user;
  }

  async function member(user: User, role: "manager" | "staff", areas: string[], appIds: string[] | null) {
    await store.saveTeamMember({ clientId: client.id, userId: user.id, role, areas, appIds, addedBy: owner.email, createdAt: NOW, updatedAt: NOW });
  }

  async function addApp(c: Client, app: Partial<App> & Pick<App, "appType">): Promise<App> {
    const full: App = { ...newApp(c.id, null, NOW, app.appType, app.vertical ?? null), backend: "hosted", websiteDoneAt: NOW, ...app };
    await store.createApp(full);
    if (!(await store.getLicenseForApp(c.id, full.id))) await activateClient(store, { clientId: c.id, appId: full.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    return full;
  }

  async function paidOrder(app: App): Promise<CatalogOrder> {
    const order = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: sha256Hex(`order-${Math.random()}`),
      userId: null,
      status: "pending",
      lines: [{ productId: 1, name: "Burger", quantity: 1, unitCents: 25000, imageAssetId: null, digital: false }],
      subtotalCents: 25000,
      shippingCents: 0,
      totalCents: 25000,
      currency: "TRY",
      customer: { name: "Mona", phone: "+201001234567", email: "mona@example.com", city: "Cairo", address: "12 Tahrir St" },
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    } as unknown as Omit<CatalogOrder, "id">);
    await store.payCatalogOrder(app.id, order.id, "PAY-1", NOW);
    return (await store.getCatalogOrder(app.id, order.id))!;
  }

  beforeEach(async () => {
    store = new MemoryStore();
    mails = [];
    ({ user: owner, client } = await registerClient(store, { name: "Leyla Kaya", email: "leyla@cafe.test", whatsapp: "+905446731942", siteUrl: "", password: null }, NOW));
    await store.updateUser(owner.id, { passwordHash: await hashPassword(PASSWORD) }, NOW);
    await activateClient(store, { clientId: client.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    client = (await store.getClientById(client.id))!;
    kitchen = await addApp(client, { appType: "store", vertical: "restaurant", appName: "Moda Café", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, fulfilment: DEFAULT_FULFILMENT } });
    shop = await addApp(client, { appType: "store", appName: "Leyla Shop", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } });
    const other = await registerClient(store, { name: "Omar", email: "omar@bakery.test", whatsapp: "+905446731944", siteUrl: "", password: null }, NOW);
    await activateClient(store, { clientId: other.client.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    theirs = await addApp((await store.getClientById(other.client.id))!, { appType: "store", appName: "Not yours", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } });
    staff = await person("kerem@cafe.test", "Kerem");
    await member(staff, "staff", ["orders"], [kitchen.id]);
  });

  it("gives a Staff member their role, areas and only their apps in `me`", async () => {
    const session = await signIn("kerem@cafe.test");
    const me = await call("GET", "/me", { token: session.access_token });
    expect(me.body.business).toMatchObject({ id: client.id, name: "Moda Café", role: "staff", state: "active" });
    expect(me.body.businesses).toHaveLength(1);
    const apps = me.body.apps as unknown as { id: string; features: Record<string, boolean>; access: Record<string, unknown> }[];
    expect(apps.map((a) => a.id)).toEqual([kitchen.id]);
    expect(apps[0]!.access).toEqual({ role: "staff", areas: ["orders"], license: false, team: false, settings: false });
    expect(apps[0]!.features).toMatchObject({ orders: true, kitchen: true, products: false, media: false, analytics: false, builds: false, app_users: false, notifications: false, preview: true });
  });

  it("lets Staff with Orders move an order, and refuses everything else", async () => {
    const { access_token: token } = await signIn("kerem@cafe.test");
    const order = await paidOrder(kitchen);
    expect((await call("GET", "/apps/{app_id}/orders", { token, params: { app_id: kitchen.id } })).status).toBe(200);
    const moved = await call("POST", "/apps/{app_id}/orders/{order_id}/status", { token, params: { app_id: kitchen.id, order_id: order.id }, body: { status: "completed" } });
    expect(moved.status).toBe(200);
    expect((await store.listTeamActivity(client.id, { limit: 5 })).items[0]).toMatchObject({ actorName: "Kerem", action: "order.status", summary: `Order ${1000 + order.id}: Completed` });
    for (const route of ["/apps/{app_id}/products", "/apps/{app_id}/analytics", "/apps/{app_id}/media", "/apps/{app_id}/license", "/apps/{app_id}/builds", "/apps/{app_id}/users", "/apps/{app_id}/notifications"]) {
      const refused = await call("GET", route, { token, params: { app_id: kitchen.id }, check: route !== "/apps/{app_id}/analytics" });
      expect(refused, route).toMatchObject({ status: 403, body: { code: "not_allowed", message: "Your role on this team doesn't allow this. Ask the owner." } });
    }
    expect((await call("GET", "/team", { token })).body).toMatchObject({ code: "not_allowed" });
    expect((await call("POST", "/team/invitations", { token, body: { name: "X", email: "x@cafe.test", role: "staff", areas: ["orders"] } })).status).toBe(403);
    // Another app of the business (not theirs) and another client's app: as if they didn't exist.
    expect((await call("GET", "/apps/{app_id}/orders", { token, params: { app_id: shop.id } })).status).toBe(404);
    expect((await call("GET", "/apps/{app_id}/license", { token, params: { app_id: shop.id } })).status).toBe(404);
    expect((await call("GET", "/apps/{app_id}/orders", { token, params: { app_id: theirs.id } })).status).toBe(404);
    // Today counts only what they have, and no notices of the account.
    await store.createOwnerNotice({ clientId: client.id, appId: kitchen.id, kind: "plan_ends_in_7_days", key: "x", title: "Plan ends", body: "Renew.", tone: "warn", linkUrl: null, linkLabel: null, createdAt: NOW, dismissedAt: null, resolvedAt: null } as never);
    await paidOrder(kitchen);
    const today = await call("GET", "/apps/{app_id}/today", { token, params: { app_id: kitchen.id } });
    expect(today.status).toBe(200);
    expect(Object.keys(today.body.counts as object).sort()).toEqual(["app_opens", "orders"]);
    expect((today.body.needs_you as { kind: string }[]).map((n) => n.kind)).toEqual(["orders_in_progress"]);
    // The owner sees the notice too.
    const owners = await call("GET", "/apps/{app_id}/today", { token: (await signIn("leyla@cafe.test")).access_token, params: { app_id: kitchen.id } });
    expect((owners.body.needs_you as { kind: string }[]).map((n) => n.kind)).toEqual(["orders_in_progress", "notice"]);
  });

  it("lets a manager work on everything but the license and the team", async () => {
    const boss = await person("manager@cafe.test", "Selin");
    await member(boss, "manager", [], null);
    const { access_token: token } = await signIn("manager@cafe.test");
    expect((await call("GET", "/apps/{app_id}/products", { token, params: { app_id: shop.id } })).status).toBe(200);
    expect((await call("GET", "/apps/{app_id}/builds", { token, params: { app_id: shop.id } })).status).toBe(200);
    expect((await call("GET", "/apps/{app_id}/license", { token, params: { app_id: shop.id } })).body).toMatchObject({ code: "not_allowed" });
    expect((await call("GET", "/team", { token })).status).toBe(403);
  });

  it("lets the owner run the team, and a removed member is signed out at once", async () => {
    const { access_token: token } = await signIn("leyla@cafe.test");
    const team = await call("GET", "/team", { token });
    expect((team.body.members as { email: string; role: string }[]).map((m) => [m.email, m.role])).toEqual([
      ["leyla@cafe.test", "owner"],
      ["kerem@cafe.test", "staff"],
    ]);
    const invited = await call("POST", "/team/invitations", { token, body: { name: "Deniz", email: "deniz@cafe.test", role: "manager", app_ids: null } });
    expect(invited).toMatchObject({ status: 201, body: { email: "deniz@cafe.test", role: "manager", expired: false } });
    expect(mails).toEqual([{ to: "deniz@cafe.test", lang: "en", values: expect.objectContaining({ inviter: "Leyla Kaya", role: "Manager", link: expect.stringContaining("/team/join?token=") }) }]);
    expect((await call("POST", "/team/invitations", { token, body: { name: "Deniz", email: "deniz@cafe.test", role: "manager" } })).body).toMatchObject({ code: "invalid_request", errors: { email: expect.any(String) } });
    expect((await call("POST", "/team/invitations/{invitation_id}/resend", { token, params: { invitation_id: invited.body.id as string } })).status).toBe(200);
    expect((await call("DELETE", "/team/invitations/{invitation_id}", { token, params: { invitation_id: invited.body.id as string } })).status).toBe(204);
    expect((await call("DELETE", "/team/invitations/{invitation_id}", { token, params: { invitation_id: invited.body.id as string } })).status).toBe(404);

    const kerem = await signIn("kerem@cafe.test");
    const changed = await call("PATCH", "/team/members/{user_id}", { token, params: { user_id: staff.id }, body: { role: "staff", areas: ["orders", "media"], app_ids: null } });
    expect(changed).toMatchObject({ status: 200, body: { areas: ["orders", "media"], app_ids: null } });
    // It applies at once.
    expect((await call("GET", "/apps/{app_id}/media", { token: kerem.access_token, params: { app_id: shop.id } })).status).not.toBe(403);
    expect((await call("PATCH", "/team/members/{user_id}", { token, params: { user_id: staff.id }, body: { role: "staff", areas: [] } })).status).toBe(400);

    expect((await call("DELETE", "/team/members/{user_id}", { token, params: { user_id: staff.id } })).status).toBe(204);
    expect((await call("GET", "/me", { token: kerem.access_token })).body).toMatchObject({ code: "invalid_token" });
    expect((await call("POST", "/auth/refresh", { body: { refresh_token: kerem.refresh_token } })).status).toBe(401);
    expect((await call("DELETE", "/team/members/{user_id}", { token, params: { user_id: staff.id } })).status).toBe(404);
    // Signing in again: no business left.
    expect((await call("POST", "/auth/sign-in", { body: { email: "kerem@cafe.test", password: PASSWORD, device: { name: "Pixel", platform: "android" } } })).body).toMatchObject({ code: "use_website" });
  });

  it("switches the device to another business the person works on", async () => {
    const own = await registerClient(store, { name: "Kerem's Bakery", email: "bakery@kerem.test", whatsapp: "+905446731945", siteUrl: "", password: null }, NOW);
    await store.updateUser(own.user.id, { passwordHash: await hashPassword(PASSWORD) }, NOW);
    await activateClient(store, { clientId: own.client.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    const bakery = await addApp((await store.getClientById(own.client.id))!, { appType: "store", appName: "Kerem Bakery", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } });
    await member(own.user, "staff", ["orders"], null);
    const { access_token: token } = await signIn("bakery@kerem.test");
    const me = await call("GET", "/me", { token });
    expect((me.body.business as { id: string }).id).toBe(own.client.id);
    expect((me.body.businesses as { id: string; role: string }[]).map((b) => [b.id, b.role])).toEqual([
      [own.client.id, "owner"],
      [client.id, "staff"],
    ]);
    const switched = await call("PUT", "/me/business", { token, body: { business_id: client.id } });
    expect((switched.body.business as { role: string }).role).toBe("staff");
    expect((switched.body.apps as { id: string }[]).map((a) => a.id).sort()).toEqual([kitchen.id, shop.id].sort());
    expect((await call("GET", "/apps/{app_id}/orders", { token, params: { app_id: bakery.id } })).status).toBe(404);
    expect((await call("PUT", "/me/business", { token, body: { business_id: theirs.clientId } })).status).toBe(404);
  });

  it("pushes to the phones of the people who have the push's area", async () => {
    const boss = await person("manager@cafe.test", "Selin");
    await member(boss, "manager", [], null);
    const media = await person("media@cafe.test", "Ece");
    await member(media, "staff", ["media"], null);
    const devices = new Map<string, string>();
    for (const email of ["leyla@cafe.test", "kerem@cafe.test", "manager@cafe.test", "media@cafe.test"]) {
      const session = await signIn(email);
      await call("PUT", "/me/push-token", { token: session.access_token, body: { token: `push-${email}` } });
      devices.set(session.device_id, email);
    }
    const sent: { targets: string[] }[] = [];
    const push: OwnerPushDeps = {
      store,
      now: NOW,
      account: ACCOUNT,
      send: (async (_a, targets) => {
        sent.push({ targets: targets as string[] });
        return { sent: targets.length, invalidTokens: [] };
      }) as typeof sendPush,
    };
    const tokens = () => sent.flatMap((s) => s.targets).sort();
    await pushNewOrder(push, kitchen, await paidOrder(kitchen));
    expect(tokens()).toEqual(["push-kerem@cafe.test", "push-leyla@cafe.test", "push-manager@cafe.test"]);
    // Kerem works on the café only: not the shop's orders.
    sent.length = 0;
    await pushNewOrder(push, shop, await paidOrder(shop));
    expect(tokens()).toEqual(["push-leyla@cafe.test", "push-manager@cafe.test"]);
    sent.length = 0;
    await pushBuildFinished(push, kitchen, { id: "b1", clientId: client.id, appId: kitchen.id, status: "ready", number: 3, versionName: "1.0.3" } as Build);
    expect(tokens()).toEqual(["push-leyla@cafe.test", "push-manager@cafe.test"]);
    // Removed: no more pushes.
    await store.deleteTeamMember(client.id, boss.id);
    sent.length = 0;
    await pushNewOrder(push, kitchen, await paidOrder(kitchen));
    expect(tokens()).toEqual(["push-kerem@cafe.test", "push-leyla@cafe.test"]);
    expect(devices.size).toBe(4);
  });
});
