import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { beforeAll, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { newApp } from "@/lib/app/setup";
import { memberForHostedUser } from "@/lib/chat/service";
import { sha256Hex } from "@/lib/crypto/tokens";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_BOOKING_SETUP, DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder, type Client, type CourseSetup, type User } from "@/lib/data/types";
import { connectorFor } from "@/lib/hosted/connectors";
import { encodeJwt } from "@/lib/hosted/jwt";
import { scheduleAppNotification } from "@/lib/hosted/scheduled-notifications";
import { handleHosted } from "@/lib/hosted/service";
import type { OwnerDeps } from "@/lib/owner/http";
import { handleOwner, ROUTES } from "@/lib/owner/service";
import { inviteMember } from "@/lib/team/service";
import { PLAN_INFO } from "@/lib/plans";
import { teamInviteSchema } from "@/lib/validation";
import { KEY, NOW, days } from "./helpers";

/**
 * 79.3 Isolation between clients, route by route: every Owner API path that
 * names an object is called by one client with another client's object IDs
 * (on the caller's own app of the same kind, and on no app for the
 * account's own paths). None may answer with a 2xx, none may show the other
 * client's data, and the other client's data must stay as it was. A new
 * route with an ID this test doesn't know fails it until the ID is added.
 * The same for the hosted API (docs/api/openapi.yaml): a customer of one
 * client's app with the other client's IDs, another customer's things in the
 * same app, and a token of one app on another.
 */

const PASSWORD = "a-long-owner-password";
const SECRET = "test-signing-secret-0123456789abcdef0123456789";
/** In every name and text of the other client's data: no answer may contain it. */
const MARK = "THEIRS-7f3a";
const HOSTED_SECRET = "test-hosted-secret-0123456789abcdef";
const contract = parse(readFileSync(path.join(__dirname, "../../../../docs/api/openapi.yaml"), "utf8")) as {
  paths: Record<string, Record<string, { security?: unknown[] }>>;
};

function course(id: number, topicId: number): CourseSetup["courses"][number] {
  return {
    id,
    title: `${MARK} course`,
    description: "",
    imageAssetId: null,
    priceCents: 0,
    categoryIds: [],
    instructorName: null,
    level: null,
    active: true,
    createdAt: NOW.toISOString(),
    topics: [{ id: topicId, title: `${MARK} topic`, lessons: [{ id: topicId + 1, title: `${MARK} lesson`, videoUrl: null, text: `${MARK} text`, durationMinutes: 5, preview: false }] }],
  };
}

async function ownerOf(store: MemoryStore, email: string): Promise<{ user: User; client: Client }> {
  const { user, client } = await registerClient(store, { name: "Owner", email, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  await store.updateUser(user.id, { passwordHash: await hashPassword(PASSWORD) }, NOW);
  await activateClient(store, { clientId: client.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
  return { user: (await store.getUserById(user.id))!, client: (await store.getClientById(client.id))! };
}

async function addApp(store: MemoryStore, client: Client, app: Partial<App> & Pick<App, "appType">): Promise<App> {
  const full: App = { ...newApp(client.id, null, NOW, app.appType, app.vertical ?? null), backend: "hosted", websiteDoneAt: NOW, ...app };
  await store.createApp(full);
  if (!(await store.getLicenseForApp(client.id, full.id))) await activateClient(store, { clientId: client.id, appId: full.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
  return full;
}

/** One app of each kind the Owner API serves. */
type Kinds = Record<"shop" | "clinic" | "gym" | "school" | "news" | "estate" | "events" | "donations", App>;

async function appsOf(store: MemoryStore, client: Client, name: string, courses: CourseSetup["courses"]): Promise<Kinds> {
  return {
    shop: await addApp(store, client, { appType: "store", appName: `${name} shop`, connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } }),
    clinic: await addApp(store, client, { appType: "booking", vertical: "clinic", appName: `${name} clinic`, connector: { kind: "bookings" } }),
    gym: await addApp(store, client, { appType: "booking", vertical: "fitness", appName: `${name} gym`, connector: { kind: "bookings" }, bookingSetup: { ...DEFAULT_BOOKING_SETUP } }),
    school: await addApp(store, client, {
      appType: "lms",
      appName: `${name} school`,
      connector: { kind: "courses" },
      courseSetup: { currency: "TRY", categories: [], courses, nextId: 100 },
    }),
    news: await addApp(store, client, { appType: "news", appName: `${name} news`, connector: { kind: "articles" } }),
    estate: await addApp(store, client, { appType: "real_estate", appName: `${name} estate`, connector: { kind: "listings" } }),
    events: await addApp(store, client, { appType: "events", appName: `${name} events`, connector: { kind: "events" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } }),
    donations: await addApp(store, client, { appType: "donations", vertical: "charity", appName: `${name} charity`, connector: { kind: "campaigns" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } }),
  };
}

/** Which of the caller's apps a path is tried on, by its part after the app. */
function kindFor(pattern: string[]): keyof Kinds {
  const part = pattern[2] ?? "";
  if (part === "appointments") return "clinic";
  if (part === "members") return "gym";
  if (part === "courses" || part === "questions" || part === "reviews") return "school";
  if (part === "articles") return "news";
  if (part === "listings" || part === "inquiries") return "estate";
  return "shop";
}

/** Every row of the store that names one of these IDs, as text: what the other client has. */
function rowsOf(store: MemoryStore, ids: string[]): string {
  const rows: string[] = [];
  const collections = Object.values(store as unknown as Record<string, unknown>);
  for (const collection of collections) {
    const values = collection instanceof Map ? [...collection.values()] : Array.isArray(collection) ? collection : [];
    for (const row of values) {
      const text = JSON.stringify(row, (_k, v: unknown) => (v instanceof Map ? [...v.entries()] : v instanceof Set ? [...v] : v));
      if (text && ids.some((id) => text.includes(id))) rows.push(text);
    }
  }
  return rows.sort().join("\n");
}

describe("79.3 one client never reaches another's data through the Owner API", () => {
  const store = new MemoryStore();
  let mine: Kinds;
  let theirs: Kinds;
  let them: { user: User; client: Client };
  /** The other client's object of each path parameter. */
  const ids: Record<string, string> = {};
  /** The same for the hosted API's paths. */
  const hostedIds: Record<string, string> = {};
  /** Rows that are a customer's own in the other client's app (a device, a conversation). */
  let theirCustomerIds: string[] = [];

  const deps = (): OwnerDeps => ({
    store,
    now: NOW,
    ip: "198.51.100.7",
    signingSecret: SECRET,
    encryptionKey: KEY,
    baseUrl: "https://yallapp.test",
    paymentUrls: {},
    media: null,
    mail: async () => undefined,
  });

  async function call(method: string, path: string[], token: string | null, body: unknown = {}) {
    return handleOwner(deps(), { method, path, query: new URLSearchParams(), body, token, acceptLanguage: null });
  }

  async function signIn(email: string): Promise<string> {
    const result = await call("POST", ["auth", "sign-in"], null, { email, password: PASSWORD, device: { name: "Pixel 8", platform: "android" } });
    expect(result.status).toBe(200);
    return (result.body as { access_token: string }).access_token;
  }

  beforeAll(async () => {
    const me = await ownerOf(store, "mine@isolation.test");
    them = await ownerOf(store, "theirs@isolation.test");
    // The caller's apps hold nothing: an answer for one of the other client's IDs can only be theirs.
    mine = await appsOf(store, me.client, "Mine", [course(500, 501)]);
    theirs = await appsOf(store, them.client, MARK, [course(10, 11)]);
    ids.app_id = theirs.shop.id;
    ids.course_id = "10";
    ids.topic_id = "11";

    const customer = (await store.createHostedUser({ appId: theirs.shop.id, phone: "+905301112233", name: `${MARK} customer`, email: null, city: null, now: NOW }))!;
    const order = await store.createCatalogOrder({
      appId: theirs.shop.id,
      tokenHash: sha256Hex(`order-${randomUUID()}`),
      userId: customer.id,
      status: "pending",
      lines: [{ productId: 999, name: `${MARK} burger`, quantity: 1, unitCents: 25000, imageAssetId: null, digital: false }],
      subtotalCents: 25000,
      shippingCents: 0,
      totalCents: 25000,
      currency: "TRY",
      customer: { name: `${MARK} Mona`, phone: "+201001234567", email: "mona@example.com", city: "Cairo", address: "12 Tahrir St" },
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
      paymentProvider: "fawaterk",
      providerRef: "5001",
    } as Omit<CatalogOrder, "id">);
    await store.payCatalogOrder(theirs.shop.id, order.id, "PAY-1", NOW);
    ids.order_id = String(order.id);
    ids.product_id = String(
      (
        await store.createCatalogProduct(
          { appId: theirs.shop.id, name: `${MARK} wrap`, description: "", priceCents: 12000, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null, optionGroups: null },
          NOW,
        )
      ).id,
    );

    const patient = (await store.createHostedUser({ appId: theirs.clinic.id, phone: "+905301112277", name: `${MARK} patient`, email: null, city: null, now: NOW }))!;
    const booked = (await store.createBookingAppointment({
      appId: theirs.clinic.id,
      userId: patient.id,
      serviceId: 1,
      staffId: 1,
      serviceName: `${MARK} check-up`,
      staffName: "Dr. Selim",
      customerName: `${MARK} Ali`,
      customerPhone: "+905301112233",
      customerEmail: null,
      startAt: new Date(NOW.getTime() + 2 * 3_600_000),
      endAt: new Date(NOW.getTime() + 3 * 3_600_000),
      status: "pending",
      priceCents: 50000,
      currency: "TRY",
      notes: null,
      answers: [],
      createdAt: NOW,
      updatedAt: NOW,
    }))!;
    ids.appointment_id = String(booked.id);

    const athlete = (await store.createHostedUser({ appId: theirs.gym.id, phone: "+905301112244", name: `${MARK} athlete`, email: null, city: null, now: NOW }))!;
    const membership = await store.createMembership({
      appId: theirs.gym.id,
      userId: athlete.id,
      planId: 1,
      planName: `${MARK} monthly`,
      period: "month",
      creditsLeft: null,
      status: "active",
      startsAt: days(-3),
      endsAt: days(27),
      orderId: null,
      createdAt: days(-3),
      updatedAt: days(-3),
    });
    ids.membership_id = String(membership.id);

    const student = (await store.createHostedUser({ appId: theirs.school.id, phone: "+905301112255", name: `${MARK} student`, email: null, city: null, now: NOW }))!;
    const question = await store.createCourseQuestion({ appId: theirs.school.id, courseId: 10, userId: student.id, text: `${MARK} question`, status: "open", createdAt: NOW, updatedAt: NOW });
    const answer = await store.addCourseAnswer({ appId: theirs.school.id, questionId: question.id, userId: student.id, text: `${MARK} answer`, createdAt: NOW }, "open");
    const review = await store.saveCourseReview({ appId: theirs.school.id, courseId: 10, userId: student.id, rating: 2, text: `${MARK} review`, now: NOW });
    ids.question_id = String(question.id);
    ids.answer_id = String(answer.id);
    ids.review_id = String(review.id);

    ids.article_id = String(
      (
        await store.createArticle(
          { appId: theirs.news.id, title: `${MARK} article`, excerpt: null, body: `${MARK} body`, imageAssetId: null, author: null, categoryIds: [], featured: false, status: "published", publishedAt: NOW },
          NOW,
        )
      ).id,
    );

    const listing = await store.createListing(
      {
        appId: theirs.estate.id,
        reference: null,
        title: `${MARK} flat`,
        description: "",
        purpose: "sale",
        type: "apartment",
        priceCents: 100_000_00,
        currency: "EGP",
        pricePeriod: null,
        negotiable: false,
        city: "Cairo",
        district: null,
        address: null,
        latitude: null,
        longitude: null,
        area: null,
        bedrooms: null,
        bathrooms: null,
        floor: null,
        yearBuilt: null,
        furnished: null,
        features: [],
        imageAssetIds: [],
        videoUrl: null,
        featured: false,
        status: "published",
        publishedAt: NOW,
      },
      NOW,
    );
    const buyer = (await store.createHostedUser({ appId: theirs.estate.id, phone: "+905301112266", name: `${MARK} buyer`, email: null, city: null, now: NOW }))!;
    const inquiry = await store.createListingInquiry({ appId: theirs.estate.id, listingId: listing.id, userId: buyer.id, status: "open", createdAt: NOW, updatedAt: NOW });
    ids.listing_id = String(listing.id);
    ids.inquiry_id = String(inquiry.id);

    const mediaId = randomUUID();
    await store.createMediaFile({
      id: mediaId,
      appId: theirs.shop.id,
      kind: "pdf",
      name: `${MARK}.pdf`,
      contentType: "application/pdf",
      sizeBytes: 2048,
      storageKey: `${theirs.shop.id}/${mediaId}.pdf`,
      status: "ready",
      public: false,
      source: "library",
      createdAt: NOW,
      updatedAt: NOW,
    });
    ids.media_id = mediaId;

    const member = await memberForHostedUser(store, theirs.shop, { id: customer.id, name: `${MARK} chatter` }, NOW);
    const conversation = await store.ensureDirectConversation(theirs.shop.id, member.id, NOW);
    const { message } = await store.createChatMessage({
      appId: theirs.shop.id,
      conversationId: conversation.id,
      senderKind: "member",
      memberId: member.id,
      teamUserId: null,
      teamName: null,
      clientId: null,
      text: `${MARK} message`,
      mediaId: null,
      durationSeconds: null,
      deletedAt: null,
      createdAt: NOW,
    });
    const reportId = randomUUID();
    await store.createChatReport({
      id: reportId,
      appId: theirs.shop.id,
      messageId: message.id,
      conversationId: conversation.id,
      reporterId: member.id,
      reason: "spam",
      note: null,
      status: "open",
      outcome: null,
      closedBy: null,
      createdAt: NOW,
      closedAt: null,
    });
    ids.member_id = member.id;
    ids.conversation_id = conversation.id;
    ids.message_id = String(message.id);
    ids.report_id = reportId;

    const scheduled = await scheduleAppNotification({ store, now: NOW }, theirs.shop, { title: `${MARK} title`, body: `${MARK} body`, date: "2026-10-20", time: "14:00", createdBy: null });
    if (!scheduled.ok) throw new Error("scheduled");
    ids.scheduled_id = String(scheduled.notification.id);

    const invited = await inviteMember(
      { store, now: NOW, baseUrl: "https://yallapp.test", mail: async () => undefined, words: () => ({ role: (r) => r, date: (d) => d.toISOString().slice(0, 10) }) },
      {
        client: them.client,
        owner: them.user,
        apps: Object.values(theirs),
        inviter: them.user,
        lang: "en",
        values: { name: `${MARK} invitee`, email: "invitee@theirs.test", role: "staff", areas: ["orders"], appIds: null },
        parse: (input) => {
          const parsed = teamInviteSchema.safeParse(input);
          return parsed.success ? { ok: true, name: parsed.data.name, email: parsed.data.email } : { ok: false, errors: { email: "invalid" } };
        },
      },
    );
    if (!invited.ok) throw new Error("invite");
    ids.invitation_id = invited.invitation.id;
    const staff = await store.createUser({ email: "staff@theirs.test", name: `${MARK} staff`, passwordHash: null, now: NOW });
    await store.saveTeamMember({ clientId: them.client.id, userId: staff.id, role: "staff", areas: ["orders"], appIds: null, addedBy: them.user.email, createdAt: NOW, updatedAt: NOW });
    ids.user_id = staff.id;

    const deviceId = randomUUID();
    await store.createOwnerDevice({
      id: deviceId,
      userId: them.user.id,
      clientId: them.client.id,
      name: `${MARK} phone`,
      platform: "android",
      appVersion: null,
      language: null,
      refreshHash: sha256Hex(deviceId),
      refreshExpiresAt: days(60),
      sessionVersion: them.user.sessionVersion,
      pushToken: null,
      pushProvider: "fcm",
      pushPreferences: null,
      createdAt: NOW,
      lastSeenAt: NOW,
    });
    ids.device_id = deviceId;

    // The hosted API's: the customer's own things in the other client's apps.
    const customerDevice = randomUUID();
    await store.createHostedDevice({
      id: customerDevice,
      appId: theirs.shop.id,
      userId: customer.id,
      deviceId: "their-install",
      platform: "android",
      name: `${MARK} phone`,
      appVersion: "1.0.0",
      pushToken: null,
      pushPreferences: null,
      createdAt: NOW,
      lastSeenAt: NOW,
    });
    const event = await store.createEvent(
      {
        appId: theirs.events.id,
        title: `${MARK} concert`,
        description: "",
        category: "Concerts",
        imageAssetIds: [],
        startAt: days(5),
        endAt: days(6),
        venueName: null,
        venueAddress: null,
        latitude: null,
        longitude: null,
        onlineUrl: null,
        organiser: null,
        capacity: null,
        status: "published",
        publishedAt: NOW,
      },
      NOW,
    );
    const campaign = await store.createCampaign(
      {
        appId: theirs.donations.id,
        title: `${MARK} campaign`,
        summary: null,
        story: "",
        imageAssetIds: [],
        goalCents: 100_000_00,
        presetCents: [300_00],
        allowCustomAmount: true,
        minCents: 50_00,
        endsAt: null,
        status: "open",
        featured: false,
        publishedAt: NOW,
      },
      NOW,
    );
    Object.assign(hostedIds, {
      device_id: customerDevice,
      conversation_id: conversation.id,
      message_id: String(message.id),
      member_id: member.id,
      upload_id: randomUUID(),
      order_id: ids.order_id,
      course_id: "10",
      question_id: ids.question_id,
      lesson_id: "12",
      // Quizzes, services and classes: none on these apps (each path still answers nothing).
      quiz_id: "1",
      attempt_id: "1",
      service_id: "1",
      class_id: "1",
      product_id: ids.product_id,
      appointment_id: ids.appointment_id,
      listing_id: ids.listing_id,
      inquiry_id: ids.inquiry_id,
      article_id: ids.article_id,
      event_id: String(event.id),
      ticket_code: "ABCDEFGHJKLM",
      campaign_id: String(campaign.id),
    });
    theirCustomerIds = [customerDevice, conversation.id];
  });

  it("knows an object of the other client for every ID a path names", () => {
    const names = new Set(ROUTES.flatMap((r) => r.pattern.filter((p) => p.startsWith(":")).map((p) => p.slice(1))));
    expect([...names].filter((name) => !(name in ids))).toEqual([]);
  });

  it("answers no path with the other client's objects, and changes none of them", async () => {
    const token = await signIn("mine@isolation.test");
    const theirIds = [them.client.id, them.user.id, ...Object.values(theirs).map((a) => a.id)];
    const before = rowsOf(store, theirIds);
    let tried = 0;
    for (const route of ROUTES) {
      const names = route.pattern.filter((p) => p.startsWith(":")).map((p) => p.slice(1));
      // Paths without an object are the caller's own (and another client's app alone is refused: owner-api.test.ts › scope).
      if (names.length === 0 || (names.length === 1 && names[0] === "app_id")) continue;
      const mineApp = mine[kindFor(route.pattern)];
      // Their objects on the caller's own app, and the whole path of theirs.
      const variants = names.includes("app_id") ? [{ ...ids, app_id: mineApp.id }, { ...ids, app_id: theirs[kindFor(route.pattern)].id }] : [ids];
      for (const values of variants) {
        const path = route.pattern.map((p) => (p.startsWith(":") ? values[p.slice(1)]! : p));
        const result = await call(route.method, path, token, { status: "cancelled", text: `hello`, reply: "ok", hidden: true, active: false, featured: true, reason: "spam" });
        const where = `${route.method} /${path.join("/")}`;
        expect(result.status, where).toBeGreaterThanOrEqual(400);
        expect(JSON.stringify(result.body), where).not.toContain(MARK);
        tried++;
      }
    }
    expect(tried).toBeGreaterThan(60);
    expect(rowsOf(store, theirIds)).toBe(before);
  });

  // The hosted API

  /** Which app a hosted path is tried on, by its start. */
  function hostedKind(route: string): keyof Kinds {
    if (/^\/(me\/appointments|bookings\/services)/.test(route)) return "clinic";
    if (/^\/bookings\/classes/.test(route)) return "gym";
    if (/^\/(courses|lessons|quizzes|questions|me\/wishlist)/.test(route)) return "school";
    if (/^\/news/.test(route)) return "news";
    if (/^\/(listings|me\/favorites|me\/inquiries)/.test(route)) return "estate";
    if (/^\/(events|me\/tickets)/.test(route)) return "events";
    if (/^\/donations/.test(route)) return "donations";
    return "shop";
  }

  /** A signed-in customer of this app (a new one each time). */
  async function customerOf(app: App): Promise<string> {
    const user = (await store.createHostedUser({ appId: app.id, phone: `+9053${Math.floor(Math.random() * 1e8).toString().padStart(8, "0")}`, name: "Intruder", email: null, city: null, now: NOW }))!;
    const device = randomUUID();
    await store.createHostedDevice({ id: device, appId: app.id, userId: user.id, deviceId: device, platform: "android", name: "Pixel", appVersion: "1.0.0", pushToken: null, pushPreferences: null, createdAt: NOW, lastSeenAt: NOW });
    const iat = Math.floor(NOW.getTime() / 1000);
    return encodeJwt({ aud: app.id, sub: user.id, did: device, iat, exp: iat + 3600 }, HOSTED_SECRET);
  }

  async function hosted(app: App, method: string, route: string, token: string | null, body: unknown = {}) {
    const concrete = route.replace(/\{(\w+)\}/g, (_, name: string) => hostedIds[name]!);
    const assetUrl = (id: string) => `https://yallapp.test/a/${id}`;
    return handleHosted(
      {
        store,
        app,
        active: true,
        plan: PLAN_INFO.pro,
        now: NOW,
        ip: "203.0.113.9",
        secret: HOSTED_SECRET,
        sender: null,
        push: false,
        assetUrl,
        platformUrl: "https://yallapp.test",
        // As the route gives them: the app's connector and its chat.
        connector: connectorFor(app, KEY, { store, assetUrl, platformUrl: "https://yallapp.test", cardPayments: true, signingSecret: SECRET }),
        chat: { storage: null, chunkBytes: 1024 },
      },
      { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(), body, token },
    );
  }

  /** Every operation of a hosted path naming an object (pages and strings name none). */
  function hostedOperations(): { route: string; method: string; open: boolean }[] {
    const out: { route: string; method: string; open: boolean }[] = [];
    for (const [route, operations] of Object.entries(contract.paths)) {
      if (!route.includes("{") || route.startsWith("/pages/") || route.startsWith("/strings/")) continue;
      for (const [method, operation] of Object.entries(operations)) {
        if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
        out.push({ route, method: method.toUpperCase(), open: Array.isArray(operation.security) && operation.security.length === 0 });
      }
    }
    return out;
  }

  const BODY = { text: "hello", reason: "spam", seconds: 10, quantity: 1, rating: 5, message: "hi", name: "Intruder", phone: "+905301112299", answers: [] };

  it("hosted: knows an object of the other client for every ID a path names", () => {
    const names = new Set(hostedOperations().flatMap((o) => [...o.route.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!)));
    expect([...names].filter((name) => !(name in hostedIds))).toEqual([]);
  });

  it("hosted: a customer of one client's app gets nothing with the other client's IDs", async () => {
    const before = rowsOf(store, [them.client.id, ...Object.values(theirs).map((a) => a.id)]);
    let tried = 0;
    for (const op of hostedOperations()) {
      const app = mine[hostedKind(op.route)];
      const result = await hosted(app, op.method, op.route, await customerOf(app), BODY);
      const where = `${op.method} ${op.route} on the caller's app`;
      // Taking something off the customer's own list: what isn't there is already off it.
      if (op.method === "DELETE" && /^\/me\/(favorites|wishlist)\//.test(op.route)) expect(result.status === 204 || result.status >= 400, where).toBe(true);
      else expect(result.status, where).toBeGreaterThanOrEqual(400);
      expect(JSON.stringify(result.body ?? null), where).not.toContain(MARK);
      tried++;
    }
    expect(tried).toBeGreaterThan(40);
    expect(rowsOf(store, [them.client.id, ...Object.values(theirs).map((a) => a.id)])).toBe(before);
  });

  it("hosted: in the same app, one customer gets nothing of another's", async () => {
    const before = rowsOf(store, theirCustomerIds);
    let tried = 0;
    for (const op of hostedOperations()) {
      // A customer's own things: devices, orders, appointments, inquiries, tickets and chat.
      if (!/^\/(me\/(devices|orders|appointments|inquiries|tickets)|chat)\//.test(op.route)) continue;
      const app = theirs[hostedKind(op.route)];
      const result = await hosted(app, op.method, op.route, await customerOf(app), BODY);
      const where = `${op.method} ${op.route} by another customer`;
      // Blocking someone is the caller's own list (what they see), not the other person's.
      if (op.route === "/chat/members/{member_id}/block") expect(result.status === 204 || result.status >= 400, where).toBe(true);
      else expect(result.status, where).toBeGreaterThanOrEqual(400);
      expect(JSON.stringify(result.body ?? null), where).not.toContain(MARK);
      tried++;
    }
    expect(tried).toBeGreaterThan(10);
    expect(rowsOf(store, theirCustomerIds)).toBe(before);
  });

  it("hosted: a token of one app opens nothing in another", async () => {
    let tried = 0;
    for (const op of hostedOperations()) {
      if (op.open) continue;
      const kind = hostedKind(op.route);
      const result = await hosted(theirs[kind], op.method, op.route, await customerOf(mine[kind]), BODY);
      const where = `${op.method} ${op.route} with another app's token`;
      // Readable without signing in (a course's reviews): the token gets no more than no token.
      if (result.status < 400) expect(result, where).toEqual(await hosted(theirs[kind], op.method, op.route, null, BODY));
      else expect(JSON.stringify(result.body ?? null), where).not.toContain(MARK);
      tried++;
    }
    expect(tried).toBeGreaterThan(20);
  });
});

