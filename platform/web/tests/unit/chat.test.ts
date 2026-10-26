import { createHash, createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { chatAvailable, chatConfig, chatSessionKind } from "@/lib/chat/access";
import { ownerBlock, ownerClearConversation, ownerConversations, ownerDeleteMessage, ownerKeep, ownerKeepExpiring, ownerMessages, ownerReports, ownerResolveReport, ownerSend, saveChatSettings } from "@/lib/chat/owner";
import { messagePreview, notifySignature, pushChatMessage, recipientsOf } from "@/lib/chat/push";
import { runChatRetention } from "@/lib/chat/retention";
import type { ChatDeps } from "@/lib/chat/service";
import { MemoryStore } from "@/lib/data/memory";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import type { App, ChatConversation, ChatMember, ChatMessage, CourseSetup } from "@/lib/data/types";
import { forgetSiteMember, siteChatSession } from "@/lib/license/chat";
import { activateLicense, parseSiteInfo } from "@/lib/license/service";
import type { MediaStorage } from "@/lib/media/storage";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { PLAN_INFO, type PlanInfo } from "@/lib/plans";
import { chatStoreSuite } from "./chat-store-suite";
import { expectContract } from "./contract";
import { KEY, NOW, days, setupClient } from "./helpers";

/** 77 The chat on the hosted API, the business's side, pushes and retention, on the memory store. */

const DAY = 86_400_000;
const PLATFORM = "https://yallapp.test";
const assetUrl = (id: string) => `${PLATFORM}/api/v1/assets/${id}`;

/** The media server: what was uploaded and what was deleted. */
class FakeStorage implements MediaStorage {
  readonly mode = "host" as const;
  readonly files = new Map<string, number>();
  readonly deleted: string[] = [];
  link(op: string, key: string, ttlSeconds: number, params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return { url: `https://files.test/media/${op}/${key}${query ? `?${query}` : ""}`, expiresAt: new Date(NOW.getTime() + ttlSeconds * 1000) };
  }
  async stat(key: string) {
    const size = this.files.get(key);
    return { exists: size !== undefined, complete: size !== undefined, size: size ?? 0 };
  }
  async delete(key: string) {
    this.deleted.push(key);
    this.files.delete(key);
  }
  async deleteApp() {}
  async listApps() {
    return [];
  }
}

function academy(): CourseSetup {
  return {
    currency: "TRY",
    categories: [{ id: 1, name: "Languages" }],
    courses: [
      { id: 10, title: "Turkish for Beginners", description: "", imageAssetId: "img-tr", priceCents: 0, categoryIds: [1], instructorName: null, level: null, active: true, createdAt: "2026-10-01T10:00:00.000Z", topics: [] },
      { id: 20, title: "Business English", description: "", imageAssetId: null, priceCents: 0, categoryIds: [1], instructorName: null, level: null, active: true, createdAt: "2026-10-01T10:00:00.000Z", topics: [] },
    ],
    nextId: 30,
  };
}

describe("77 the chat's store (memory)", () => {
  const store = new MemoryStore();
  chatStoreSuite(() => store);
});

describe("77 who has chat", () => {
  const app = (backend: App["backend"], extra: Partial<App> = {}): App => ({ ...newApp("c", null, NOW, "lms"), backend, ...extra });

  it("hosted apps and Yallapp sign-in use the access token, WordPress the site's chat token, other own APIs none", () => {
    expect(chatSessionKind(app("hosted"))).toBe("access_token");
    expect(chatSessionKind(app("wordpress"))).toBe("site");
    expect(chatSessionKind(app("setup_requested"))).toBe("site");
    expect(chatSessionKind(app("custom_api"))).toBeNull();
    expect(chatSessionKind(app("custom_api", { hostedSettings: { ...app("hosted").hostedSettings, signInBy: "yallapp" } as App["hostedSettings"] }))).toBe("access_token");
  });

  it("only on plans with chat, and only while the owner leaves it on", () => {
    expect(chatAvailable(app("hosted"), PLAN_INFO.starter)).toBe(false);
    expect(chatAvailable(app("hosted"), PLAN_INFO.growth)).toBe(false);
    expect(chatAvailable(app("hosted"), PLAN_INFO.pro)).toBe(true);
    expect(chatAvailable(app("hosted"), PLAN_INFO.business)).toBe(true);
    expect(chatAvailable(app("hosted", { chatSettings: { enabled: false, courseGroups: false } }), PLAN_INFO.pro)).toBe(false);
    expect(chatConfig(app("hosted", { id: "a1", chatSettings: { enabled: true, courseGroups: true } }), PLAN_INFO.pro, `${PLATFORM}/`)).toEqual({
      base_url: `${PLATFORM}/api/app/a1`,
      session: "access_token",
      groups: true,
    });
    // Course groups are for academies only.
    expect(chatConfig({ ...app("hosted", { chatSettings: { enabled: true, courseGroups: true } }), appType: "booking" } as App, PLAN_INFO.pro, PLATFORM)?.groups).toBe(false);
  });

  it("signs a site's notification the way the plugin checks it", () => {
    // The same value wp-plugin/yallapp/tests/unit/ChatNotifyTest.php expects from Chat_Notify::sign().
    const json = '{"user_ids":[42,7],"title":"Ada Academy","body":"Your certificate is ready.","conversation_id":"0c2c6f0d-9a11-4d3c-9d5e-8a3f5a525b0b"}';
    expect(notifySignature("yall-7k2d-9qwe-4mnb", 1792000000, json)).toBe("4fdda9c85d5cc549d124dc7421dfc5524047827357bd9c14f709c7150eb67ed2");
  });

  it("a push says what a message without text sends, in the app's language", () => {
    expect(messagePreview({ text: "  Hello\n there " }, "image", "en")).toBe("Hello there");
    expect(messagePreview({ text: null }, "image", "en")).toBe("Photo");
    expect(messagePreview({ text: null }, "audio", "ar")).toBe("رسالة صوتية");
    expect(messagePreview({ text: null }, "pdf", "tr")).toBe("Dosya");
  });
});

describe("77 chat on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let plan: PlanInfo;
  let storage: FakeStorage;
  let told: { conversation: ChatConversation; message: ChatMessage; sender: ChatMember | null }[];
  let withChat: boolean;

  beforeEach(async () => {
    ({ store } = await setupClient({ plan: "pro" }));
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = {
      ...newApp(client.id, null, NOW, "lms"),
      backend: "hosted",
      appName: "Lale Academy",
      websiteDoneAt: NOW,
      connector: { kind: "courses" },
      courseSetup: academy(),
      chatSettings: { enabled: true, courseGroups: true },
    };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
    plan = PLAN_INFO.pro;
    storage = new FakeStorage();
    told = [];
    withChat = true;
  });

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    plan,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl,
    platformUrl: PLATFORM,
    connector: new CoursesConnector({ store, app, assetUrl, platformUrl: PLATFORM }),
    chat: withChat
      ? {
          storage,
          chunkBytes: 5 * 1024 * 1024,
          onMessage: async ({ conversation, message, sender: from }) => {
            told.push({ conversation, message, sender: from });
          },
        }
      : null,
  });

  const ownerDeps = (): ChatDeps => ({ store, now, storage, chunkBytes: 5 * 1024 * 1024, business: { name: "Lale Academy", imageUrl: null }, plan, onMessage: async () => undefined });

  async function call(method: string, route: string, options: { body?: unknown; token?: string | null; query?: Record<string, string>; params?: string[] } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), {
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
    });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string) {
    now = new Date(now.getTime() + 61_000);
    const device = { id: `install-${phone}`, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+90${phone}`)!, device } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device } });
    return registered.body as { access_token: string; user: { id: number } };
  }

  type Conversations = { items: { id: string; kind: string; title: string; unread_count: number; can_send: boolean; last_message: { text: string | null } | null }[]; unread_count: number };
  const conversations = async (token: string) => (await call("GET", "/chat/conversations", { token })).body as Conversations;

  it("tells the app about its chat in the config, only when it has chat", async () => {
    const config = await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } });
    expect((config.body as { chat?: unknown }).chat).toEqual({ base_url: `${PLATFORM}/api/app/${app.id}`, session: "access_token", groups: true });
    plan = PLAN_INFO.growth;
    expect((await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body).not.toHaveProperty("chat");
  });

  it("needs a signed-in person, a plan with chat and the owner's switch", async () => {
    expect((await call("GET", "/chat/conversations")).status).toBe(401);
    const { access_token } = await signUp("5321234567", "Deniz Aksoy");
    plan = PLAN_INFO.growth;
    const refused = await call("GET", "/chat/conversations", { token: access_token });
    expect(refused).toMatchObject({ status: 403, body: { code: "chat_not_available" } });
    plan = PLAN_INFO.pro;
    app = { ...app, chatSettings: { enabled: false, courseGroups: true } };
    expect((await call("GET", "/chat/conversations", { token: access_token })).status).toBe(403);
    app = { ...app, chatSettings: { enabled: true, courseGroups: true } };
    expect((await call("GET", "/chat/conversations", { token: access_token })).status).toBe(200);
    // While the app is paused, the chat is too.
    const paused = await handleHosted({ ...context(), active: false }, { method: "GET", path: ["chat", "conversations"], query: new URLSearchParams(), body: undefined, token: access_token });
    expect(paused.status).toBe(503);
  });

  it("a person writes to the business, the business answers as itself, and both read", async () => {
    const deniz = await signUp("5321234567", "Deniz Aksoy");
    const list = await conversations(deniz.access_token);
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toMatchObject({ kind: "direct", title: "Lale Academy", unread_count: 0, can_send: true, last_message: null });
    const direct = list.items[0]!.id;

    const sent = await call("POST", "/chat/conversations/{conversation_id}/messages", { token: deniz.access_token, params: [direct], body: { client_id: "client-0001", text: "Is there a class on Monday?" } });
    expect(sent.status).toBe(201);
    const first = sent.body as { id: string; sender: { kind: string; name: string }; mine: boolean };
    expect(first).toMatchObject({ sender: { kind: "member", name: "Deniz Aksoy" }, mine: true });
    // The same client_id again is the same message, not a second one.
    const again = await call("POST", "/chat/conversations/{conversation_id}/messages", { token: deniz.access_token, params: [direct], body: { client_id: "client-0001", text: "Is there a class on Monday?" } });
    expect((again.body as { id: string }).id).toBe(first.id);
    expect(told).toHaveLength(1);
    expect(told[0]!.sender?.name).toBe("Deniz Aksoy");

    const inbox = await ownerConversations(ownerDeps(), app, {});
    expect(inbox.unread_count).toBe(1);
    expect(inbox.items[0]).toMatchObject({ kind: "direct", title: "Deniz Aksoy", unread_count: 1 });

    now = new Date(now.getTime() + 60_000);
    const reply = await ownerSend(ownerDeps(), app, direct, { userId: "team-1", name: "Selin" }, { client_id: "dash-0001", text: "Yes, at 10:00." });
    expect(reply.ok && reply.value.view).toMatchObject({ sender: { kind: "business", name: "Lale Academy", team_member: "Selin" } });
    // The business read what it answered.
    expect((await ownerConversations(ownerDeps(), app, {})).unread_count).toBe(0);

    const news = await call("GET", "/chat/conversations/{conversation_id}/messages", { token: deniz.access_token, params: [direct], query: { after: first.id } });
    const items = (news.body as { items: { id: string; text: string; sender: { kind: string; name: string; member_id: string | null } }[]; poll_after_seconds: number }).items;
    expect(items).toHaveLength(1);
    // The person never sees who on the team wrote.
    expect(items[0]).toMatchObject({ text: "Yes, at 10:00.", sender: { kind: "business", name: "Lale Academy", member_id: null } });
    expect(JSON.stringify(news.body)).not.toContain("Selin");
    expect((news.body as { poll_after_seconds: number }).poll_after_seconds).toBe(3);

    expect(((await call("GET", "/chat/unread", { token: deniz.access_token })).body as { unread_count: number }).unread_count).toBe(1);
    expect((await call("POST", "/chat/conversations/{conversation_id}/read", { token: deniz.access_token, params: [direct], body: { message_id: items[0]!.id } })).status).toBe(204);
    expect(((await call("GET", "/chat/unread", { token: deniz.access_token })).body as { unread_count: number }).unread_count).toBe(0);
    // Deleting one's own message, for everyone.
    expect((await call("DELETE", "/chat/messages/{message_id}", { token: deniz.access_token, params: [items[0]!.id] })).status).toBe(403);
    expect((await call("DELETE", "/chat/messages/{message_id}", { token: deniz.access_token, params: [first.id] })).status).toBe(204);
    const page = await ownerMessages(ownerDeps(), app, direct, new URLSearchParams());
    expect(page.ok && page.value.items.map((m) => [m.deleted, m.text])).toEqual([
      [false, "Yes, at 10:00."],
      [true, null],
    ]);
  });

  it("course groups: the students of a course, blocking someone for oneself, reports the business deals with", async () => {
    const deniz = await signUp("5321234567", "Deniz Aksoy");
    const ece = await signUp("5329876543", "Ece Yıldız");
    for (const user of [deniz.user, ece.user]) await store.enrollInCourse({ appId: app.id, userId: user.id, courseId: 10, source: "free", enrolledAt: NOW });
    const groups = (await conversations(deniz.access_token)).items.filter((c) => c.kind === "group");
    expect(groups.map((g) => g.title)).toEqual(["Turkish for Beginners"]);
    const group = groups[0]!.id;
    expect((await conversations(ece.access_token)).items.find((c) => c.kind === "group")?.id).toBe(group);

    const members = await call("GET", "/chat/conversations/{conversation_id}/members", { token: deniz.access_token, params: [group] });
    expect((members.body as { items: { name: string; business: boolean }[] }).items.map((m) => [m.name, m.business])).toEqual([
      ["Lale Academy", true],
      ["Deniz Aksoy", false],
      ["Ece Yıldız", false],
    ]);
    // Never a phone number or an email address.
    expect(JSON.stringify(members.body)).not.toMatch(/5321234567|5329876543|@/);

    const rude = await call("POST", "/chat/conversations/{conversation_id}/messages", { token: deniz.access_token, params: [group], body: { client_id: "client-0101", text: "Buy cheap watches!" } });
    const rudeId = (rude.body as { id: string }).id;
    // Everyone in the group but the sender hears of it.
    const pushedTo = await recipientsOf(store, (await store.getChatConversation(app.id, group))!, (await store.getChatMessage(app.id, Number(rudeId)))!);
    expect(pushedTo.map((m) => m.name)).toEqual(["Ece Yıldız"]);

    const denizId = (members.body as { items: { id: string; name: string }[] }).items.find((m) => m.name === "Deniz Aksoy")!.id;
    expect((await call("PUT", "/chat/members/{member_id}/block", { token: ece.access_token, params: [denizId] })).status).toBe(204);
    const seen = await call("GET", "/chat/conversations/{conversation_id}/messages", { token: ece.access_token, params: [group] });
    expect((seen.body as { items: unknown[] }).items).toHaveLength(0);
    // Blocked people aren't pushed to the person who blocked them.
    expect(await recipientsOf(store, (await store.getChatConversation(app.id, group))!, (await store.getChatMessage(app.id, Number(rudeId)))!)).toEqual([]);

    expect((await call("POST", "/chat/messages/{message_id}/report", { token: ece.access_token, params: [rudeId], body: { reason: "spam" } })).status).toBe(204);
    expect((await call("POST", "/chat/messages/{message_id}/report", { token: ece.access_token, params: [rudeId], body: { reason: "spam" } })).status).toBe(204);
    const reports = await ownerReports(ownerDeps(), app, "open");
    expect(reports.items).toHaveLength(1);
    expect(reports.items[0]).toMatchObject({ reason: "spam", conversation_title: "Turkish for Beginners", reporter: { name: "Ece Yıldız" }, message: { text: "Buy cheap watches!", reported: true } });
    expect((await ownerConversations(ownerDeps(), app, {})).open_reports).toBe(1);

    expect((await ownerResolveReport(ownerDeps(), app, reports.items[0]!.id, "block_sender", "owner")).ok).toBe(true);
    expect((await ownerReports(ownerDeps(), app, "open")).items).toHaveLength(0);
    expect((await ownerReports(ownerDeps(), app, "closed")).items[0]).toMatchObject({ outcome: "blocked", message: { deleted: true } });
    const blocked = await call("POST", "/chat/conversations/{conversation_id}/messages", { token: deniz.access_token, params: [group], body: { client_id: "client-0102", text: "Hello?" } });
    expect(blocked).toMatchObject({ status: 403, body: { code: "chat_blocked" } });
    expect((await conversations(deniz.access_token)).items.every((c) => !c.can_send)).toBe(true);
    expect((await ownerBlock(ownerDeps(), app, denizId, false)).ok).toBe(true);
    expect((await call("POST", "/chat/conversations/{conversation_id}/messages", { token: deniz.access_token, params: [group], body: { client_id: "client-0103", text: "Sorry." } })).status).toBe(201);

    // Groups turned off: only the conversation with the business.
    app = { ...app, chatSettings: { enabled: true, courseGroups: false } };
    expect((await conversations(deniz.access_token)).items.map((c) => c.kind)).toEqual(["direct"]);
    expect((await call("GET", "/chat/conversations/{conversation_id}/messages", { token: deniz.access_token, params: [group] })).status).toBe(404);
  });

  it("files count in the app's storage, show in Media, and go with their message", async () => {
    const deniz = await signUp("5321234567", "Deniz Aksoy");
    const direct = (await conversations(deniz.access_token)).items[0]!.id;
    const tooBig = await call("POST", "/chat/uploads", { token: deniz.access_token, body: { name: "voice.m4a", size: 30 * 1024 * 1024, type: "audio/mp4" } });
    expect(tooBig).toMatchObject({ status: 413, body: { code: "too_big" } });
    const exe = await call("POST", "/chat/uploads", { token: deniz.access_token, body: { name: "run.exe", size: 100, type: "application/x-msdownload" } });
    expect(exe.status).toBe(400);

    const started = await call("POST", "/chat/uploads", { token: deniz.access_token, body: { name: "voice.m4a", size: 4000, type: "audio/mp4", duration_seconds: 7 } });
    expect(started.status).toBe(201);
    const upload = started.body as { id: string; kind: string };
    expect(upload.kind).toBe("audio");
    // Not sent before it's whole.
    const early = await call("POST", "/chat/conversations/{conversation_id}/messages", { token: deniz.access_token, params: [direct], body: { client_id: "client-0201", upload_id: upload.id } });
    expect(early.status).toBe(409);
    expect((await call("POST", "/chat/uploads/{upload_id}/complete", { token: deniz.access_token, params: [upload.id] })).status).toBe(409);
    const file = (await store.getMediaFile(app.id, upload.id))!;
    storage.files.set(file.storageKey, 4000);
    expect((await call("POST", "/chat/uploads/{upload_id}/complete", { token: deniz.access_token, params: [upload.id] })).status).toBe(204);
    const sent = await call("POST", "/chat/conversations/{conversation_id}/messages", { token: deniz.access_token, params: [direct], body: { client_id: "client-0202", upload_id: upload.id } });
    expect(sent.status).toBe(201);
    expect(sent.body).toMatchObject({ text: null, attachment: { kind: "audio", name: "voice.m4a", duration_seconds: 7 } });
    // Another person can't send someone else's upload.
    const ece = await signUp("5329876543", "Ece Yıldız");
    const eceDirect = (await conversations(ece.access_token)).items[0]!.id;
    expect((await call("POST", "/chat/conversations/{conversation_id}/messages", { token: ece.access_token, params: [eceDirect], body: { client_id: "client-0203", upload_id: upload.id } })).status).toBe(400);

    // In the business's Media library, marked as from the chat.
    expect(await store.getMediaFile(app.id, upload.id)).toMatchObject({ kind: "audio", source: "chat", status: "ready" });
    expect(await store.mediaUsage(app.id)).toBe(4000);

    const id = (sent.body as { id: string }).id;
    expect((await ownerDeleteMessage(ownerDeps(), app, id, "owner")).ok).toBe(true);
    expect(storage.deleted).toEqual([file.storageKey]);
    expect(await store.getMediaFile(app.id, upload.id)).toBeNull();
  });

  it("the business replies with a file from its Media library, which stays in the library", async () => {
    const deniz = await signUp("5321234567", "Deniz Aksoy");
    const direct = (await conversations(deniz.access_token)).items[0]!.id;
    const mediaId = "8a3f5a52-5b0b-4d3c-9d5e-0c2c6f0d9a11";
    await store.createMediaFile({ id: mediaId, appId: app.id, kind: "pdf", name: "Timetable.pdf", contentType: "application/pdf", sizeBytes: 2048, storageKey: `${app.id}/${mediaId}.pdf`, status: "ready", public: false, source: "library", createdAt: NOW, updatedAt: NOW });
    const reply = await ownerSend(ownerDeps(), app, direct, { userId: "team-1", name: "Selin" }, { client_id: "dash-0002", media_id: mediaId });
    expect(reply.ok).toBe(true);
    const messages = await call("GET", "/chat/conversations/{conversation_id}/messages", { token: deniz.access_token, params: [direct] });
    expect((messages.body as { items: { attachment: { kind: string; name: string } }[] }).items[0]!.attachment).toMatchObject({ kind: "file", name: "Timetable.pdf" });
    expect((await ownerDeleteMessage(ownerDeps(), app, reply.ok ? reply.value.view.id : "", "owner")).ok).toBe(true);
    expect(await store.getMediaFile(app.id, mediaId)).not.toBeNull();
  });

  it("deleting one's account deletes their chat; the business can clear a conversation", async () => {
    const deniz = await signUp("5321234567", "Deniz Aksoy");
    const direct = (await conversations(deniz.access_token)).items[0]!.id;
    await call("POST", "/chat/conversations/{conversation_id}/messages", { token: deniz.access_token, params: [direct], body: { client_id: "client-0301", text: "Hi" } });
    await ownerSend(ownerDeps(), app, direct, { userId: "team-1", name: "Selin" }, { client_id: "dash-0301", text: "Hello!" });
    expect((await ownerClearConversation(ownerDeps(), app, direct)).ok).toBe(true);
    expect((await store.listChatMessages(direct, { limit: 10 })).length).toBe(0);
    await call("POST", "/chat/conversations/{conversation_id}/messages", { token: deniz.access_token, params: [direct], body: { client_id: "client-0302", text: "Hi again" } });
    expect((await call("DELETE", "/me", { token: deniz.access_token })).status).toBe(204);
    expect(await store.findChatMember(app.id, "hosted", String(deniz.user.id))).toBeNull();
    expect(await store.getChatConversation(app.id, direct)).toBeNull();
  });

  it("without the chat's server parts, the app has no chat", async () => {
    withChat = false;
    const deniz = await signUp("5321234567", "Deniz Aksoy");
    expect((await call("GET", "/chat/conversations", { token: deniz.access_token })).status).toBe(403);
    expect((await call("GET", "/config", { query: { platform: "ios", app_version: "1.0.0" } })).body).not.toHaveProperty("chat");
  });

  it("the switches: course groups only for academies", async () => {
    expect((await saveChatSettings(store, app, { enabled: false }, NOW)).ok).toBe(true);
    expect((await store.getAppById(app.id))!.chatSettings).toEqual({ enabled: false, courseGroups: true });
    const gym = { ...app, appType: "booking" } as App;
    expect((await saveChatSettings(store, gym, { course_groups: true }, NOW)).ok).toBe(false);
    expect((await saveChatSettings(store, app, { enabled: "yes" }, NOW)).ok).toBe(false);
  });

  it("messages are kept a year; the business is told 30 days before and can keep them", async () => {
    const deniz = await signUp("5321234567", "Deniz Aksoy");
    const ece = await signUp("5329876543", "Ece Yıldız");
    const dDirect = (await conversations(deniz.access_token)).items[0]!.id;
    const eDirect = (await conversations(ece.access_token)).items[0]!.id;
    const write = (token: string, conversation: string, clientId: string, text: string) =>
      call("POST", "/chat/conversations/{conversation_id}/messages", { token, params: [conversation], body: { client_id: clientId, text } });

    // An upload of Deniz's: sent with the old message, it goes with it.
    const started = await call("POST", "/chat/uploads", { token: deniz.access_token, body: { name: "a.jpg", size: 100, type: "image/jpeg" } });
    const uploadId = (started.body as { id: string }).id;
    storage.files.set((await store.getMediaFile(app.id, uploadId))!.storageKey, 100);
    await call("POST", "/chat/uploads/{upload_id}/complete", { token: deniz.access_token, params: [uploadId] });
    await call("POST", "/chat/conversations/{conversation_id}/messages", { token: deniz.access_token, params: [dDirect], body: { client_id: "client-0400", upload_id: uploadId } });
    await write(deniz.access_token, dDirect, "client-0401", "Old question");
    await write(ece.access_token, eDirect, "client-0402", "Old question too");
    const sentAt = now;

    // 340 days on: within 30 days of the year, told once (dashboard, email).
    const mails: { key: string; to: string; values: Record<string, unknown> }[] = [];
    const deps = () => ({ store, now, baseUrl: PLATFORM, storage, mail: async (key: string, to: string, values: Record<string, unknown>) => void mails.push({ key, to, values }) });
    now = new Date(sentAt.getTime() + 340 * DAY);
    await ownerSend({ ...ownerDeps(), now }, app, dDirect, { userId: "team-1", name: "Selin" }, { client_id: "dash-0403", text: "A new answer" });
    let report = await runChatRetention(deps() as never);
    expect(report).toMatchObject({ conversations: 0, notices: 1 });
    expect(mails).toHaveLength(1);
    expect(mails[0]).toMatchObject({ key: "chat_expiring", values: { app_name: "Lale Academy", conversations: "2" } });
    const notices = await store.listOwnerNotices({ clientId: app.clientId, appId: app.id, open: true });
    expect(notices[0]).toMatchObject({ kind: "chat_expiring", linkLabel: "Keep messages", tone: "warn" });
    expect(notices[0]!.linkUrl).toContain("to=chat");
    const inbox = await ownerConversations(ownerDeps(), { ...app }, {});
    expect(inbox.expiring.conversations).toBe(2);
    // Not again the next day.
    now = new Date(now.getTime() + DAY);
    report = await runChatRetention(deps() as never);
    expect(report.notices).toBe(0);

    // Ece's conversation is kept; Deniz's isn't.
    expect((await ownerKeep({ store, now }, app, eDirect)).ok).toBe(true);
    expect((await ownerConversations({ ...ownerDeps(), now }, app, {})).expiring.conversations).toBe(1);

    now = new Date(sentAt.getTime() + 366 * DAY);
    report = await runChatRetention(deps() as never);
    expect(report).toMatchObject({ conversations: 1, filesDeleted: 1 });
    expect((await store.listChatMessages(dDirect, { limit: 10 })).map((m) => m.text)).toEqual(["A new answer"]);
    expect((await store.listChatMessages(eDirect, { limit: 10 })).map((m) => m.text)).toEqual(["Old question too"]);
    expect(await store.getMediaFile(app.id, uploadId)).toBeNull();

    // Keeping everything that would go resolves the notice: both, a year after Ece's was kept.
    expect(await ownerKeepExpiring({ store, now: new Date(sentAt.getTime() + 700 * DAY) }, app)).toBe(2);
    expect((await store.listOwnerNotices({ clientId: app.clientId, appId: app.id, open: true })).filter((n) => n.kind === "chat_expiring")).toHaveLength(0);
  });

  it("files never sent in a message and ended chat tokens are cleaned up", async () => {
    const deniz = await signUp("5321234567", "Deniz Aksoy");
    const started = await call("POST", "/chat/uploads", { token: deniz.access_token, body: { name: "a.jpg", size: 100, type: "image/jpeg" } });
    const uploadId = (started.body as { id: string }).id;
    const deps = (at: Date) => ({ store, now: at, baseUrl: PLATFORM, storage, mail: async () => undefined });
    expect((await runChatRetention(deps(new Date(now.getTime() + 60 * 60_000)) as never)).uploadsDeleted).toBe(0);
    expect((await runChatRetention(deps(new Date(now.getTime() + 25 * 60 * 60_000)) as never)).uploadsDeleted).toBe(1);
    expect(await store.getMediaFile(app.id, uploadId)).toBeNull();
  });
});

describe("77 chat for WordPress apps", () => {
  async function wordpress(planId: "pro" | "growth" = "pro") {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Ada", email: "ada@academy.test", whatsapp: "+905446731942", siteUrl: "https://academy.test", password: null }, NOW);
    const created: App = { ...newApp(client.id, "https://academy.test", NOW, "lms"), backend: "wordpress", appName: "Ada Academy", chatSettings: { enabled: true, courseGroups: true } };
    await store.createApp(created);
    const { licenseKey } = await activateClient(store, { clientId: client.id, appId: created.id, plan: planId, activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    const site = parseSiteInfo({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.4.9", wp_version: "6.8", lms: "tutor" });
    if (!site.ok) throw new Error("site");
    const activated = await activateLicense(store, site.value, NOW);
    expect(activated.status).toBe(200);
    return { store, licenseKey: licenseKey!, app: (await store.getAppById(created.id))!, activated };
  }
  const body = (licenseKey: string, extra: Record<string, unknown>) => ({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.4.9", wp_version: "6.8", lms: "tutor", ...extra });

  it("the license status carries the chat, on plans that have it", async () => {
    const pro = await wordpress("pro");
    expect(pro.activated.status === 200 && pro.activated.body).toMatchObject({ features: expect.arrayContaining(["chat"]) });
    const growth = await wordpress("growth");
    expect(growth.activated.status === 200 && growth.activated.body.chat).toBeNull();
  });

  it("a chat token for a person signed in on the site works on the hosted API's chat, with their course groups", async () => {
    const { store, licenseKey, app } = await wordpress();
    const user = { id: 42, name: "Deniz Aksoy", image_url: "https://academy.test/avatar.jpg" };
    const session = await siteChatSession(store, body(licenseKey, { user, courses: [{ id: 7, title: "Arabic 1", image_url: null }] }), { now: NOW, platformUrl: PLATFORM });
    expect(session.status).toBe(200);
    if (session.status !== 200) return;
    expect(session.body.base_url).toBe(`${PLATFORM}/api/app/${app.id}`);
    expect(new Date(session.body.expires_at).getTime() - NOW.getTime()).toBe(3600_000);

    const ctx: HostedContext = {
      store,
      app,
      active: true,
      plan: PLAN_INFO.pro,
      now: NOW,
      ip: "203.0.113.9",
      secret: "s",
      sender: null,
      push: false,
      assetUrl,
      platformUrl: PLATFORM,
      chat: { storage: null, chunkBytes: 1024 },
    };
    const list = await handleHosted(ctx, { method: "GET", path: ["chat", "conversations"], query: new URLSearchParams(), body: undefined, token: session.body.token });
    expectContract("GET", "/chat/conversations", list);
    expect((list.body as { items: { kind: string; title: string; course_id: string | null }[] }).items.map((c) => [c.kind, c.title, c.course_id])).toEqual([
      ["direct", "Ada Academy", null],
      ["group", "Arabic 1", "7"],
    ]);
    // The token is for this app only, and for an hour.
    expect((await handleHosted({ ...ctx, now: new Date(NOW.getTime() + 3601_000) }, { method: "GET", path: ["chat", "unread"], query: new URLSearchParams(), body: undefined, token: session.body.token })).status).toBe(401);
    // The site's other routes stay the plugin's.
    expect((await handleHosted(ctx, { method: "GET", path: ["me"], query: new URLSearchParams(), body: undefined, token: session.body.token })).status).toBe(404);

    // Left the course: out of its group.
    await siteChatSession(store, body(licenseKey, { user, courses: [] }), { now: NOW, platformUrl: PLATFORM });
    const after = await handleHosted(ctx, { method: "GET", path: ["chat", "conversations"], query: new URLSearchParams(), body: undefined, token: session.body.token });
    expect((after.body as { items: unknown[] }).items).toHaveLength(1);

    expect(await forgetSiteMember(store, body(licenseKey, { user_id: 42 }), { now: NOW, storage: null })).toEqual({ status: 204 });
    expect(await store.findChatMember(app.id, "wordpress", "42")).toBeNull();
    expect(await forgetSiteMember(store, body(licenseKey, { user_id: 42 }), { now: NOW, storage: null })).toEqual({ status: 204 });
  });

  it("refuses another site, a plan without chat and bad input", async () => {
    const { store, licenseKey } = await wordpress();
    const user = { id: 42, name: "Deniz" };
    expect(await siteChatSession(store, { ...body(licenseKey, { user }), site_url: "https://other.test" }, { now: NOW, platformUrl: PLATFORM })).toMatchObject({ status: 403, body: { code: "license_inactive" } });
    expect(await siteChatSession(store, body(licenseKey, { user: { id: 0, name: "" } }), { now: NOW, platformUrl: PLATFORM })).toMatchObject({ status: 400 });
    const growth = await wordpress("growth");
    expect(await siteChatSession(growth.store, body(growth.licenseKey, { user }), { now: NOW, platformUrl: PLATFORM })).toMatchObject({ status: 403, body: { code: "chat_not_available" } });
  });

  it("tells the site of a message for its people, signed with the license key", async () => {
    const { store, licenseKey, app } = await wordpress();
    const session = await siteChatSession(store, body(licenseKey, { user: { id: 42, name: "Deniz Aksoy" } }), { now: NOW, platformUrl: PLATFORM });
    if (session.status !== 200) throw new Error("session");
    const member = (await store.findChatMember(app.id, "wordpress", "42"))!;
    const conversation = await store.ensureDirectConversation(app.id, member.id, NOW);
    const { message } = await store.createChatMessage({ appId: app.id, conversationId: conversation.id, senderKind: "business", memberId: null, teamUserId: "u1", teamName: "Selin", clientId: "dash-0500", text: "Your certificate is ready.", mediaId: null, durationSeconds: null, deletedAt: null, createdAt: NOW });
    const requests: { url: string; body: string }[] = [];
    const fetcher = async (url: string, init?: RequestInit) => {
      requests.push({ url, body: String(init?.body) });
      return new Response(null, { status: 202 });
    };
    const outcome = await pushChatMessage(
      { store, now: NOW, key: KEY, businessName: "Ada Academy", owner: null, fetcher, testSiteUrl: "https://academy.test" },
      { app, conversation, message, sender: null },
    );
    expect(outcome.site).toBe("sent");
    expect(requests[0]!.url).toBe("https://academy.test/wp-json/yallapp/v1/chat/notify");
    const sent = JSON.parse(requests[0]!.body) as { timestamp: number; signature: string; notification: { user_ids: number[]; title: string; body: string; conversation_id: string } };
    expect(sent.notification).toEqual({ user_ids: [42], title: "Ada Academy", body: "Your certificate is ready.", conversation_id: conversation.id });
    // What the plugin checks: the HMAC of the notification exactly as sent.
    const raw = /"notification":(.*)\}$/s.exec(requests[0]!.body)![1]!;
    const digest = createHash("sha256").update(raw).digest("hex");
    expect(sent.signature).toBe(createHmac("sha256", licenseKey.toUpperCase()).update(`yallapp-chat-notify:${sent.timestamp}:${digest}`).digest("hex"));
    expect(notifySignature(licenseKey, sent.timestamp, raw)).toBe(sent.signature);
  });
});
