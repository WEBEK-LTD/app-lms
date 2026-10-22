import { beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { newApp } from "@/lib/app/setup";
import { memberConversations, memberForHostedUser, memberReport, memberSend, type ChatDeps } from "@/lib/chat/service";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type ChatMember, type Client, type User } from "@/lib/data/types";
import type { OwnerDeps } from "@/lib/owner/http";
import { handleOwner } from "@/lib/owner/service";
import { expectOwnerContract } from "./owner-contract";
import { KEY, NOW, days } from "./helpers";

/**
 * 77 The chat in the Owner API (Yallapp Business): the inbox with what is
 * waiting, a conversation, replies as the business, deleting, keeping,
 * reports, stopping a person, the settings, and who may do each. Checked
 * against docs/api/owner.yaml.
 */

const SECRET = "test-signing-secret-0123456789abcdef0123456789";
const PASSWORD = "a-long-owner-password";

describe("77 the chat in the Owner API", () => {
  let store: MemoryStore;
  let owner: User;
  let client: Client;
  let shop: App;
  let ali: ChatMember;
  let conversationId: string;
  let pushed: { business: string; text: string | null }[];
  let refreshed: string[][];

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
    chatPushes: (_store, business) => async ({ message }) => void pushed.push({ business, text: message.text }),
    refreshSites: (ids) => void refreshed.push(ids),
  });

  const chatDeps = (app: App): ChatDeps => ({ store, now: NOW, storage: null, chunkBytes: 1024, business: { name: app.appName ?? "App", imageUrl: null }, plan: null });

  async function call(method: string, route: string, options: { params?: Record<string, string | number>; token?: string; body?: unknown; query?: Record<string, string>; check?: boolean } = {}) {
    const path = route.replace(/\{(\w+)\}/g, (_, name: string) => String(options.params?.[name] ?? `{${name}}`));
    const result = await handleOwner(deps(), { method, path: path.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null, acceptLanguage: null });
    if (options.check !== false) expectOwnerContract(method, route, result);
    return result as { status: number; body: Record<string, unknown> & { items?: Record<string, unknown>[] } };
  }

  async function signIn(email = "leyla@cafe.test") {
    const result = await call("POST", "/auth/sign-in", { body: { email, password: PASSWORD, device: { name: "Pixel 8", platform: "android" } } });
    expect(result.status).toBe(200);
    return (result.body as unknown as { access_token: string }).access_token;
  }

  async function addApp(c: Client, app: Partial<App> & Pick<App, "appType">, plan: "growth" | "pro" = "pro"): Promise<App> {
    const full: App = { ...newApp(c.id, null, NOW, app.appType, app.vertical ?? null), backend: "hosted", websiteDoneAt: NOW, ...app };
    await store.createApp(full);
    if (!(await store.getLicenseForApp(c.id, full.id))) await activateClient(store, { clientId: c.id, appId: full.id, plan, activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    return full;
  }

  beforeEach(async () => {
    store = new MemoryStore();
    pushed = [];
    refreshed = [];
    ({ user: owner, client } = await registerClient(store, { name: "Leyla Kaya", email: "leyla@cafe.test", whatsapp: "+905446731942", siteUrl: "", password: null }, NOW));
    await store.updateUser(owner.id, { passwordHash: await hashPassword(PASSWORD) }, NOW);
    await activateClient(store, { clientId: client.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    client = (await store.getClientById(client.id))!;
    shop = await addApp(client, { appType: "store", appName: "Leyla Shop", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } });
    // Ali writes from the app.
    ali = await memberForHostedUser(store, shop, { id: 7, name: "Ali Demir" }, NOW);
    const { items } = await memberConversations(chatDeps(shop), shop, ali);
    conversationId = items[0]!.id;
    const sent = await memberSend(chatDeps(shop), shop, ali, conversationId, { client_id: "ali-message-1", text: "Do you deliver to Kadıköy?" });
    expect(sent.ok).toBe(true);
  });

  it("says the app has chat in its features, and the inbox shows what is waiting", async () => {
    const token = await signIn();
    const app = await call("GET", "/apps/{app_id}", { token, params: { app_id: shop.id } });
    expect((app.body.features as Record<string, boolean>).chat).toBe(true);

    const inbox = await call("GET", "/apps/{app_id}/chat/conversations", { token, params: { app_id: shop.id } });
    expect(inbox.status).toBe(200);
    expect(inbox.body).toMatchObject({ unread_count: 1, open_reports: 0, expiring: { conversations: 0, delete_on: null } });
    expect(inbox.body.items![0]).toMatchObject({ id: conversationId, kind: "direct", title: "Ali Demir", unread_count: 1, member: { id: ali.id, name: "Ali Demir", blocked: false } });
    expect((await call("GET", "/apps/{app_id}/chat/conversations", { token, params: { app_id: shop.id }, query: { q: "nobody" } })).body.items).toEqual([]);
    expect((await call("GET", "/apps/{app_id}/chat/conversations", { token, params: { app_id: shop.id }, query: { kind: "everyone" } })).status).toBe(400);
  });

  it("reads a conversation, answers as the business and marks it read", async () => {
    const token = await signIn();
    const params = { app_id: shop.id, conversation_id: conversationId };
    const page = await call("GET", "/apps/{app_id}/chat/conversations/{conversation_id}/messages", { token, params });
    expect(page.body.items!.map((m) => m.text)).toEqual(["Do you deliver to Kadıköy?"]);

    const reply = await call("POST", "/apps/{app_id}/chat/conversations/{conversation_id}/messages", { token, params, body: { client_id: "owner-reply-0001", text: "Yes, every day until 9 pm." } });
    expect(reply.status).toBe(201);
    expect(reply.body).toMatchObject({ text: "Yes, every day until 9 pm.", sender: { kind: "business", name: "Leyla Shop", team_member: "Leyla Kaya" } });
    expect(pushed).toEqual([{ business: "Leyla Shop", text: "Yes, every day until 9 pm." }]);
    // The same client_id answers the same message, without a second push.
    const again = await call("POST", "/apps/{app_id}/chat/conversations/{conversation_id}/messages", { token, params, body: { client_id: "owner-reply-0001", text: "Yes, every day until 9 pm." } });
    expect(again.body.id).toBe(reply.body.id);
    expect(pushed).toHaveLength(1);
    expect((await call("POST", "/apps/{app_id}/chat/conversations/{conversation_id}/messages", { token, params, body: { client_id: "x" } })).status).toBe(400);

    const first = page.body.items![0]!.id as string;
    expect((await call("POST", "/apps/{app_id}/chat/conversations/{conversation_id}/read", { token, params, body: { message_id: first } })).status).toBe(204);
    expect((await call("GET", "/apps/{app_id}/chat/conversations", { token, params: { app_id: shop.id } })).body.unread_count).toBe(0);
  });

  it("deletes a message, keeps a conversation, clears it", async () => {
    const token = await signIn();
    const params = { app_id: shop.id, conversation_id: conversationId };
    const [message] = (await call("GET", "/apps/{app_id}/chat/conversations/{conversation_id}/messages", { token, params })).body.items!;
    expect((await call("DELETE", "/apps/{app_id}/chat/messages/{message_id}", { token, params: { app_id: shop.id, message_id: message!.id as string } })).status).toBe(204);
    const after = await call("GET", "/apps/{app_id}/chat/conversations/{conversation_id}/messages", { token, params });
    expect(after.body.items![0]).toMatchObject({ deleted: true, text: null });

    const kept = await call("POST", "/apps/{app_id}/chat/conversations/{conversation_id}/keep", { token, params });
    expect(kept.status).toBe(200);
    expect(kept.body.keep_until).toBe(days(365).toISOString().slice(0, 10));
    expect((await call("POST", "/apps/{app_id}/chat/keep", { token, params: { app_id: shop.id } })).body).toEqual({ kept: 0 });

    expect((await call("DELETE", "/apps/{app_id}/chat/conversations/{conversation_id}", { token, params })).status).toBe(204);
    expect((await call("GET", "/apps/{app_id}/chat/conversations/{conversation_id}/messages", { token, params })).body.items).toEqual([]);
  });

  it("deals with reports and stops a person from sending", async () => {
    const token = await signIn();
    const params = { app_id: shop.id, conversation_id: conversationId };
    const reply = await call("POST", "/apps/{app_id}/chat/conversations/{conversation_id}/messages", { token, params, body: { client_id: "owner-reply-0002", text: "Call us." } });
    expect((await memberReport(chatDeps(shop), shop, ali, reply.body.id as string, { reason: "spam" })).ok).toBe(true);

    const open = await call("GET", "/apps/{app_id}/chat/reports", { token, params: { app_id: shop.id } });
    expect(open.body.items).toHaveLength(1);
    expect(open.body.items![0]).toMatchObject({ reason: "spam", status: "open", reporter: { name: "Ali Demir" }, conversation_title: "Ali Demir" });
    expect((await call("GET", "/apps/{app_id}/chat/conversations", { token, params: { app_id: shop.id } })).body.open_reports).toBe(1);
    const report = open.body.items![0]!.id as string;
    expect((await call("POST", "/apps/{app_id}/chat/reports/{report_id}/resolve", { token, params: { app_id: shop.id, report_id: report }, body: { action: "ban" } })).status).toBe(400);
    expect((await call("POST", "/apps/{app_id}/chat/reports/{report_id}/resolve", { token, params: { app_id: shop.id, report_id: report }, body: { action: "dismiss" } })).status).toBe(204);
    const closed = await call("GET", "/apps/{app_id}/chat/reports", { token, params: { app_id: shop.id }, query: { status: "closed" } });
    expect(closed.body.items![0]).toMatchObject({ status: "closed", outcome: "dismissed" });

    expect((await call("PUT", "/apps/{app_id}/chat/members/{member_id}/block", { token, params: { app_id: shop.id, member_id: ali.id } })).status).toBe(204);
    const refused = await memberSend(chatDeps(shop), shop, (await store.getChatMember(shop.id, ali.id))!, conversationId, { client_id: "ali-message-2", text: "Hello?" });
    expect(refused).toMatchObject({ ok: false, code: "chat_blocked" });
    expect((await call("GET", "/apps/{app_id}/chat/conversations", { token, params: { app_id: shop.id } })).body.items![0]).toMatchObject({ member: { blocked: true } });
    expect((await call("DELETE", "/apps/{app_id}/chat/members/{member_id}/block", { token, params: { app_id: shop.id, member_id: ali.id } })).status).toBe(204);
    expect((await call("PUT", "/apps/{app_id}/chat/members/{member_id}/block", { token, params: { app_id: shop.id, member_id: "00000000-0000-4000-8000-000000000000" } })).status).toBe(404);
  });

  it("turns chat off and on; course groups are for academies; WordPress sites hear of it", async () => {
    const token = await signIn();
    const settings = await call("GET", "/apps/{app_id}/chat/settings", { token, params: { app_id: shop.id } });
    expect(settings.body).toEqual({ available: true, enabled: true, course_groups: null });
    expect((await call("PATCH", "/apps/{app_id}/chat/settings", { token, params: { app_id: shop.id }, body: { course_groups: true } })).status).toBe(400);
    const off = await call("PATCH", "/apps/{app_id}/chat/settings", { token, params: { app_id: shop.id }, body: { enabled: false } });
    expect(off.body).toEqual({ available: true, enabled: false, course_groups: null });
    expect(refreshed).toEqual([]);
    // Off: the chat's paths say the app hasn't it, the settings still answer.
    const inbox = await call("GET", "/apps/{app_id}/chat/conversations", { token, params: { app_id: shop.id } });
    expect(inbox).toMatchObject({ status: 404, body: { code: "not_available" } });
    expect(((await call("GET", "/apps/{app_id}", { token, params: { app_id: shop.id } })).body.features as Record<string, boolean>).chat).toBe(false);

    const academy = await addApp(client, { appType: "lms", appName: "Leyla Academy", backend: "wordpress" });
    const groups = await call("PATCH", "/apps/{app_id}/chat/settings", { token, params: { app_id: academy.id }, body: { course_groups: true } });
    expect(groups.body).toEqual({ available: true, enabled: true, course_groups: true });
    expect(refreshed).toEqual([[academy.id]]);
  });

  it("a plan without chat: not available, the settings say why", async () => {
    const token = await signIn();
    const growth = await addApp(client, { appType: "store", appName: "Small Shop", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } }, "growth");
    expect((await call("GET", "/apps/{app_id}/chat/conversations", { token, params: { app_id: growth.id } })).body).toMatchObject({ code: "not_available" });
    expect((await call("GET", "/apps/{app_id}/chat/settings", { token, params: { app_id: growth.id } })).body).toEqual({ available: false, enabled: true, course_groups: null });
    expect((await call("PATCH", "/apps/{app_id}/chat/settings", { token, params: { app_id: growth.id }, body: { enabled: false } })).status).toBe(404);
  });

  it("team members: Chat area for the chat, Settings for the switches", async () => {
    const kerem = await store.createUser({ email: "kerem@cafe.test", name: "Kerem", passwordHash: await hashPassword(PASSWORD), now: NOW });
    await store.saveTeamMember({ clientId: client.id, userId: kerem.id, role: "staff", areas: ["chat"], appIds: null, addedBy: owner.email, createdAt: NOW, updatedAt: NOW });
    const deniz = await store.createUser({ email: "deniz@cafe.test", name: "Deniz", passwordHash: await hashPassword(PASSWORD), now: NOW });
    await store.saveTeamMember({ clientId: client.id, userId: deniz.id, role: "staff", areas: ["orders"], appIds: null, addedBy: owner.email, createdAt: NOW, updatedAt: NOW });

    const withChat = await signIn("kerem@cafe.test");
    const params = { app_id: shop.id, conversation_id: conversationId };
    expect((await call("GET", "/apps/{app_id}/chat/conversations", { token: withChat, params: { app_id: shop.id } })).status).toBe(200);
    const reply = await call("POST", "/apps/{app_id}/chat/conversations/{conversation_id}/messages", { token: withChat, params, body: { client_id: "kerem-reply-01", text: "On its way." } });
    expect(reply.body.sender).toMatchObject({ kind: "business", name: "Leyla Shop", team_member: "Kerem" });
    expect((await call("GET", "/apps/{app_id}/chat/settings", { token: withChat, params: { app_id: shop.id } })).status).toBe(200);
    expect((await call("PATCH", "/apps/{app_id}/chat/settings", { token: withChat, params: { app_id: shop.id }, body: { enabled: false } })).status).toBe(403);

    const without = await signIn("deniz@cafe.test");
    expect(((await call("GET", "/apps/{app_id}", { token: without, params: { app_id: shop.id } })).body.features as Record<string, boolean>).chat).toBe(false);
    expect((await call("GET", "/apps/{app_id}/chat/conversations", { token: without, params: { app_id: shop.id } })).body).toMatchObject({ code: "not_available" });
    expect((await call("GET", "/apps/{app_id}/chat/settings", { token: without, params: { app_id: shop.id } })).status).toBe(404);
  });
});
