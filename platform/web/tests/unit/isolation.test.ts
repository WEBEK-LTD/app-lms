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
import { uniSettingsOf } from "@/lib/university/settings";
import { KEY, NOW, days } from "./helpers";
import { flightInput, hotelInput, roomInput } from "./travel-fixtures";

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
type Kinds = Record<"shop" | "clinic" | "gym" | "school" | "news" | "estate" | "events" | "donations" | "delivery" | "food" | "rides" | "k12" | "taxi" | "travel", App>;

async function appsOf(store: MemoryStore, client: Client, name: string, courses: CourseSetup["courses"]): Promise<Kinds> {
  return {
    shop: await addApp(store, client, { appType: "store", appName: `${name} shop`, connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } }),
    clinic: await addApp(store, client, { appType: "booking", vertical: "clinic", appName: `${name} clinic`, connector: { kind: "bookings" } }),
    gym: await addApp(store, client, { appType: "booking", vertical: "fitness", appName: `${name} gym`, connector: { kind: "bookings" }, bookingSetup: { ...DEFAULT_BOOKING_SETUP } }),
    // 105.3 An academy with many teachers (its courses are the school's courses).
    school: await addApp(store, client, {
      appType: "lms",
      vertical: "instructors",
      appName: `${name} school`,
      connector: { kind: "courses" },
      courseSetup: { currency: "TRY", categories: [], courses, nextId: 100 },
    }),
    news: await addApp(store, client, { appType: "news", appName: `${name} news`, connector: { kind: "articles" } }),
    estate: await addApp(store, client, { appType: "real_estate", appName: `${name} estate`, connector: { kind: "listings" } }),
    events: await addApp(store, client, { appType: "events", appName: `${name} events`, connector: { kind: "events" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } }),
    donations: await addApp(store, client, { appType: "donations", vertical: "charity", appName: `${name} charity`, connector: { kind: "campaigns" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } }),
    // 104 A delivery company.
    delivery: await addApp(store, client, { appType: "delivery", appName: `${name} delivery`, connector: { kind: "deliveries" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } }),
    // 105.1 A food delivery company.
    food: await addApp(store, client, { appType: "food", appName: `${name} food`, connector: { kind: "restaurants" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } }),
    // 105.2 A ride company.
    rides: await addApp(store, client, { appType: "rides", appName: `${name} rides`, connector: { kind: "rides" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } }),
    // 105.4 A school for students, parents and teachers.
    k12: await addApp(store, client, { appType: "school", appName: `${name} k12`, connector: { kind: "school" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } }),
    // 105.9 A live taxi company: the rides engine on the live map.
    taxi: await addApp(store, client, { appType: "rides", vertical: "taxi", appName: `${name} taxi`, connector: { kind: "rides" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } }),
    // 126 A travel company: hotels and flights.
    travel: await addApp(store, client, { appType: "travel", appName: `${name} travel`, connector: { kind: "travel" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } }),
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
    // 113.7 Their student's private note and bookmark on the lesson.
    const note = await store.createLessonNote({ appId: theirs.school.id, userId: student.id, courseId: 10, lessonId: 12, text: `${MARK} note`, positionSeconds: null, createdAt: NOW, updatedAt: NOW });
    await store.setLessonBookmark({ appId: theirs.school.id, userId: student.id, courseId: 10, lessonId: 12, on: true, now: NOW });
    ids.note_id = String(note.id);

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
    // 104 A shipment of the other client's delivery company.
    const shipment = await store.createShipment({
      appId: theirs.delivery.id,
      userId: null,
      senderName: `${MARK} sender`,
      senderPhone: "+201001112222",
      serviceId: null,
      serviceName: null,
      pickup: { address: `${MARK} pickup`, details: null, lat: null, lng: null },
      dropoff: { address: `${MARK} drop-off`, details: null, lat: null, lng: null },
      zoneId: null,
      zoneName: null,
      distanceKm: null,
      packageSize: "small",
      packageDescription: null,
      recipientName: `${MARK} recipient`,
      recipientPhone: "+201003334444",
      notes: null,
      priceCents: 50_00,
      currency: "EGP",
      paymentMethod: "cash",
      paymentStatus: "unpaid",
      orderId: null,
      status: "pending",
      courierId: null,
      courierName: null,
      timeline: [{ status: "pending", at: NOW.toISOString(), by: "customer" }],
      lang: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    // 105.1 A restaurant and a food order of the other client's food delivery company.
    const restaurant = await store.createRestaurant(
      {
        appId: theirs.food.id,
        name: `${MARK} kitchen`,
        description: null,
        logoAssetId: null,
        coverAssetId: null,
        cuisines: [],
        address: { address: `${MARK} street`, details: null, lat: null, lng: null },
        phone: null,
        hours: [],
        prepMinutes: 20,
        minOrderCents: 0,
        maxKm: null,
        commissionBp: 1000,
        active: true,
        position: 1,
      },
      { sections: [{ id: 1, name: `${MARK} mains`, dishes: [] }], nextId: 2 },
      NOW,
    );
    const foodOrder = await store.createFoodOrder({
      appId: theirs.food.id,
      restaurantId: restaurant.id,
      restaurantName: `${MARK} kitchen`,
      userId: null,
      customerName: `${MARK} customer`,
      customerPhone: "+201001112222",
      lines: [{ dishId: null, name: `${MARK} koshari`, quantity: 1, choices: [], note: null, unitCents: 50_00 }],
      subtotalCents: 50_00,
      deliveryFeeCents: 20_00,
      totalCents: 70_00,
      commissionCents: 5_00,
      currency: "EGP",
      paymentMethod: "cash",
      paymentStatus: "unpaid",
      orderId: null,
      status: "placed",
      dropoff: { address: `${MARK} drop-off`, details: null, lat: null, lng: null },
      zoneId: null,
      distanceKm: null,
      notes: null,
      readyAt: null,
      rejection: null,
      shipmentId: null,
      rating: null,
      timeline: [{ status: "placed", at: NOW.toISOString(), by: "customer" }],
      lang: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    // 105.3 A teacher of the other client's academy.
    const teacher = await store.createTeacher(
      { appId: theirs.school.id, name: `${MARK} teacher`, phone: "+201009998888", email: null, userId: null, photoAssetId: null, bio: `${MARK} bio`, subjects: [MARK], status: "active", shareBp: 5000, featured: false },
      NOW,
    );
    if (!teacher.ok) throw new Error("duplicate teacher");
    // 105.2 A ride of the other client's ride company.
    const ride = await store.createRide({
      appId: theirs.rides.id,
      userId: null,
      riderName: `${MARK} rider`,
      riderPhone: "+201001112222",
      vehicleTypeId: null,
      vehicleTypeName: `${MARK} economy`,
      vehicleTypeIcon: "directions_car",
      fares: { baseCents: 10_00, perKmCents: 5_00, perMinuteCents: 1_00, minCents: 20_00, waitPerMinuteCents: 1_00 },
      fareMode: "upfront",
      pickup: { address: `${MARK} pickup`, details: null, lat: 30.04, lng: 31.23 },
      dropoff: { address: `${MARK} drop-off`, details: null, lat: 30.05, lng: 31.22 },
      scheduledAt: null,
      estimateKm: 1.5,
      estimateMinutes: 4,
      quotedCents: 27_50,
      promoCode: null,
      discountCents: 0,
      previousFeeCents: 0,
      previousFeeRideId: null,
      finalCents: null,
      meterKm: 0,
      rideMinutes: null,
      waitMinutes: null,
      commissionBp: null,
      commissionCents: null,
      currency: "EGP",
      paymentMethod: "cash",
      paymentStatus: "unpaid",
      orderId: null,
      status: "searching",
      pin: null,
      notes: `${MARK} note`,
      driverId: null,
      driverName: null,
      offeredTo: null,
      offerExpiresAt: null,
      declinedBy: [],
      searchingSince: NOW,
      cancellation: null,
      feeCarriedTo: null,
      shareToken: null,
      rating: null,
      timeline: [{ status: "searching", at: NOW.toISOString(), by: "rider" }],
      lang: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    // 105.4 A class of the other client's school, its student and their homework, scores and fee.
    const k12 = theirs.k12.id;
    const theirClass = (await store.saveSchoolClass({ appId: k12, id: null, name: `${MARK} 5 A`, grade: null, homeroomTeacherId: null }, NOW))!;
    const theirSubject = await store.saveSchoolSubject({ appId: k12, id: null, name: `${MARK} maths` }, NOW);
    const theirStudent = await store.createSchoolPerson({ appId: k12, role: "student", name: `${MARK} student`, phone: "+201007776666", email: null, classId: theirClass.id, code: MARK, photoAssetId: null, active: true }, NOW);
    if (!theirSubject.ok || !theirStudent.ok) throw new Error("school");
    const homework = await store.createSchoolHomework({ appId: k12, classId: theirClass.id, subjectId: theirSubject.subject.id, teacherId: null, title: `${MARK} homework`, text: MARK, dueOn: "2026-10-20", files: [], createdAt: NOW });
    const assessment = await store.createSchoolAssessment({ appId: k12, classId: theirClass.id, subjectId: theirSubject.subject.id, teacherId: null, kind: "exam", title: `${MARK} exam`, date: "2026-10-20", maxScore: 100, createdAt: NOW });
    await store.saveSchoolScores(k12, assessment.id, [{ studentId: theirStudent.person.id, score: 90, note: MARK }], NOW);
    const fee = await store.createSchoolFee({ appId: k12, studentId: theirStudent.person.id, title: `${MARK} fee`, amountCents: 100_00, dueOn: null, status: "due", paidAt: null, paidBy: null, orderId: null, receiptCode: null, createdAt: NOW, updatedAt: NOW });
    // 113.5 Their syllabus topic, its progress, a template and a teacher's report (shared with the parents).
    const theirUnit = (await store.saveSchoolSyllabusUnit({ id: null, appId: k12, subjectId: theirSubject.subject.id, grade: `${MARK} 5 A`, title: `${MARK} unit` }, NOW))!;
    const theirTopic = (await store.saveSchoolSyllabusTopic({ id: null, appId: k12, unitId: theirUnit.id, title: `${MARK} topic`, startsOn: "2026-10-01", endsOn: "2026-10-05" }, NOW))!;
    await store.saveSchoolTopicProgress({ appId: k12, classId: theirClass.id, topicId: theirTopic.id, coveredOn: "2026-10-02", note: MARK, teacherId: null, updatedAt: NOW });
    const theirTemplate = (await store.saveSchoolReportTemplate({ id: null, appId: k12, kind: "student", name: `${MARK} template`, fields: [{ id: "f1", label: MARK, type: "text", options: [], required: false }] }, NOW))!;
    const theirReport = await store.createSchoolReport({
      appId: k12,
      kind: "student",
      templateId: theirTemplate.id,
      templateName: `${MARK} report`,
      fields: theirTemplate.fields,
      answers: { f1: MARK },
      teacherId: null,
      teacherName: MARK,
      studentId: theirStudent.person.id,
      classId: theirClass.id,
      subjectId: null,
      periodFrom: null,
      periodTo: null,
      status: "draft",
      comments: [],
      sentAt: null,
      readAt: null,
      reviewedAt: null,
      sharedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
    // 115 A marketplace order of the other client's, on its vendor, and a complaint about it.
    const theirMarketOrder = await store.createMarketOrder({
      appId: theirs.food.id, vendorId: restaurant.id, vendorName: `${MARK} kitchen`, vendorKind: "restaurant", userId: null, customerName: `${MARK} customer`, customerPhone: "+201001113333",
      fulfilment: "delivery", deliveryBy: "vendor", scheduledFor: null, lines: [], currency: "EGP", paymentMethod: "cash", paymentStatus: "unpaid", paymentRef: null, couponCode: null, status: "placed",
      money: { lines: [{ kind: "total", amount: 0 }], itemsBefore: 0, itemDiscounts: 0, items: 0, coupon: null, club: 0, delivery: 0, deliveryDiscount: 0, tax: 0, tip: 0, total: 0, wallet: 0, payNow: 0, split: { commission: 0, vendorEarns: 0, ownerEarns: 0, collectedBy: "vendor", dueToVendor: 0 } },
      dropoff: { address: `${MARK} drop-off`, details: null, lat: null, lng: null }, distanceKm: null, notes: MARK, pickupCode: null, prepMinutes: null, readyAt: null, rejection: null, shipmentId: null, rating: null,
      timeline: [{ status: "placed", at: NOW.toISOString(), by: "customer" }], completedAt: null, lang: null, createdAt: NOW, updatedAt: NOW,
    });
    const theirComplaint = await store.createMarketComplaint({
      appId: theirs.food.id, orderId: theirMarketOrder.id, vendorId: restaurant.id, userId: null, reason: "late", text: MARK, lineIds: [], photoAssetIds: [], status: "open", assignee: null, sharedWithVendor: false,
      messages: [{ id: 1, from: "customer", text: MARK, by: null, at: NOW.toISOString() }], notes: [], decision: null, answeredAt: null, createdAt: NOW, updatedAt: NOW,
    });
    // 113.2 Their student's day at the gate; 113.3 a member of their staff and their leave request.
    await store.saveSchoolCheckin({ appId: k12, personId: theirStudent.person.id, role: "student", date: "2026-10-20", inAt: NOW, inMethod: "qr", outAt: null, outMethod: null, late: false, leftEarly: false, mark: null, corrections: [{ at: NOW.toISOString(), by: MARK, reason: MARK, change: MARK }], updatedAt: NOW });
    const theirStaff = await store.createSchoolPerson({ appId: k12, role: "staff", name: `${MARK} nurse`, phone: "+201007775555", email: null, classId: null, code: null, photoAssetId: null, active: true, jobTitle: MARK }, NOW);
    if (!theirStaff.ok) throw new Error("staff");
    const leave = await store.createSchoolLeave({ appId: k12, personId: theirStaff.person.id, kind: "sick", startsOn: "2026-10-20", endsOn: "2026-10-21", note: MARK, file: null, status: "pending", answer: null, answeredBy: null, answeredAt: null, createdAt: NOW, updatedAt: NOW });
    // 113.12 Their staff member's salary, a final payslip and an advance.
    await store.saveSchoolSalary({ appId: k12, personId: theirStaff.person.id, monthlyCents: 5000_00, currency: "EGP", allowances: [{ name: MARK, cents: 100_00 }], note: MARK, updatedBy: MARK, updatedAt: NOW });
    const payslip = await store.createSchoolPayslip({ appId: k12, personId: theirStaff.person.id, month: "2026-10", personName: `${MARK} nurse`, role: "staff", jobTitle: MARK, department: null, currency: "EGP", baseCents: 5000_00, allowances: [], lines: [], attendance: null, netCents: 5000_00, status: "final", payments: [], paidCents: 0, note: MARK, finalAt: NOW, finalBy: MARK, createdAt: NOW, updatedAt: NOW });
    if (!payslip.ok) throw new Error("payslip");
    await store.createSchoolSalaryAdvance({ appId: k12, personId: theirStaff.person.id, personName: `${MARK} nurse`, currency: "EGP", amountCents: 1000_00, instalmentCents: 500_00, startsMonth: "2026-10", given: { id: "a", cents: 1000_00, method: "cash", paidOn: "2026-10-01", note: MARK, receiptAssetId: null, by: MARK, at: NOW.toISOString() }, repayments: [], createdAt: NOW, updatedAt: NOW });
    // 113.10 Their bus route, its stop, a trip running; 113.11 their book and a hold of it.
    const busRoute = (await store.saveSchoolBusRoute({ id: null, appId: k12, name: `${MARK} route`, plate: MARK, capacity: 20, driverId: null, supervisorId: null, active: true }, NOW))!;
    const busStop = (await store.saveSchoolBusStop({ id: null, appId: k12, routeId: busRoute.id, name: `${MARK} stop`, lat: 30.05, lng: 31.24, morningMinute: 420, afternoonMinute: null }))!;
    await store.setSchoolBusRiders(k12, [{ studentId: theirStudent.person.id, trip: "morning", stop: busStop }]);
    const busRun = (await store.startSchoolBusRun({ appId: k12, routeId: busRoute.id, trip: "morning", date: "2026-10-20", status: "running", startedAt: NOW, endedAt: null, startedBy: null, lat: 30.05, lng: 31.24, locatedAt: NOW, passedStopIds: [], toldStopIds: [] })).run;
    const book = await store.createSchoolBook({ appId: k12, title: `${MARK} book`, author: MARK, isbn: null, coverAssetId: null, shelf: MARK, category: MARK, language: null, description: MARK, file: null, createdAt: NOW, updatedAt: NOW });
    await store.createSchoolBookCopy({ appId: k12, bookId: book.id, code: MARK, note: null, createdAt: NOW });
    const bookHold = await store.createSchoolBookHold({ appId: k12, bookId: book.id, personId: theirStudent.person.id, status: "waiting", copyId: null, readyAt: null, expiresAt: null, createdAt: NOW, updatedAt: NOW });
    // 113.8 Their calendar, exams' timetable and a merit on their student.
    await store.saveSchoolEvent({ id: null, appId: k12, kind: "event", title: `${MARK} event`, notes: MARK, startsOn: "2026-10-12", endsOn: "2026-10-12", startMinute: null, endMinute: null, place: MARK, audience: "school", grade: null, classId: null }, NOW);
    const theirExam = (await store.saveSchoolExam({ id: null, appId: k12, classId: theirClass.id, grade: null, subjectId: theirSubject.subject.id, date: "2026-10-14", startMinute: 540, durationMinutes: 60, room: MARK, notes: MARK }, NOW))!;
    await store.publishSchoolExams(k12, [theirExam.id], NOW);
    // 113.4 A permission slip of theirs, answered; an excuse and a pick-up list of their student.
    const theirSlip = (await store.saveSchoolSlip({ id: null, appId: k12, title: `${MARK} slip`, details: MARK, dueOn: "2026-12-30", feeNote: MARK, audience: "school", grade: null, classId: null }, NOW))!;
    await store.saveSchoolSlipAnswer({ appId: k12, slipId: theirSlip.id, studentId: theirStudent.person.id, answer: "yes", signedName: MARK, parentId: null, answeredAt: NOW });
    const theirExcuse = await store.createSchoolExcuse({ appId: k12, studentId: theirStudent.person.id, parentId: null, startsOn: "2026-10-20", endsOn: "2026-10-20", reason: MARK, file: null, status: "pending", answer: null, answeredBy: null, answeredAt: null, createdAt: NOW, updatedAt: NOW });
    await store.saveSchoolPickup({ appId: k12, studentId: theirStudent.person.id, people: [{ name: MARK, relation: MARK, phone: null, photo: null }], updatedBy: MARK, updatedAt: NOW });
    await store.saveSchoolPickupNote({ appId: k12, studentId: theirStudent.person.id, date: "2026-10-12", name: MARK, relation: null, phone: null, note: MARK, writtenBy: MARK, createdAt: NOW });
    const theirNote = await store.createSchoolBehaviour({ appId: k12, studentId: theirStudent.person.id, classId: theirClass.id, categoryId: null, categoryName: `${MARK} category`, kind: "positive", points: 2, note: MARK, teacherId: null, createdAt: NOW });
    // 113.9 Both schools are universities: the other's term, course and section, its student enrolled and graded.
    for (const appId of [mine.k12.id, k12]) await store.saveUniSettings(appId, { ...uniSettingsOf(null), enabled: true });
    const theirTerm = (await store.saveUniTerm({ appId: k12, id: null, name: `${MARK} term`, academicYear: "2026/2027", startsOn: "2026-09-01", endsOn: "2027-01-15", registrationOpens: "2026-08-01", registrationCloses: "2026-12-01", dropUntil: "2026-12-01" }, NOW))!;
    const theirCourse = await store.saveUniCourse({ appId: k12, id: null, departmentId: null, code: "THEIRS1", title: `${MARK} course`, credits: 3, prerequisites: [], description: MARK }, NOW);
    if (!theirCourse.ok) throw new Error("course");
    const theirSection = (await store.saveUniSection({ appId: k12, id: null, termId: theirTerm.id, courseId: theirCourse.course.id, code: MARK, lecturerId: null, seats: 10, meetings: [], resultsPublishedAt: NOW }, NOW))!;
    await store.createUniEnrolment({ appId: k12, termId: theirTerm.id, sectionId: theirSection.id, courseId: theirCourse.course.id, studentId: theirStudent.person.id, status: "enrolled", addedBy: "office", addedAt: NOW, droppedAt: null, grade: "A", mark: 95, gradedAt: NOW, updatedAt: NOW });
    // 126 Their hotel, room and flight, a trip of their customer's and a price alert.
    const trip = theirs.travel.id;
    const theirHotel = await store.createTravelHotel({ ...hotelInput(trip), name: `${MARK} hotel` }, NOW);
    const theirRoom = await store.createTravelRoom({ ...roomInput(trip, theirHotel.id), name: `${MARK} room` }, NOW);
    const theirFlight = await store.createTravelFlight({ ...flightInput(trip), number: MARK.slice(0, 12) }, NOW);
    const traveller = (await store.createHostedUser({ appId: trip, phone: "+201004445555", name: `${MARK} traveller`, email: null, city: null, now: NOW }))!;
    const theirTrip = await store.createTravelBooking(
      {
        appId: trip, userId: traveller.id, reference: "T-THEIRS", kind: "stay", status: "confirmed",
        stay: { hotelId: theirHotel.id, hotelName: `${MARK} hotel`, roomId: theirRoom.id, roomName: MARK, rateId: "bb", rateName: MARK, board: "breakfast", checkIn: "2026-11-14", checkOut: "2026-11-15", guests: 2, rooms: 1, nights: [{ date: "2026-11-14", cents: 150_00 }], refundable: true, freeCancelUntil: "2026-11-12", taxBp: 0 },
        flight: null, transfer: null, travellers: [{ firstName: MARK, lastName: MARK }], contact: { name: MARK, email: null, phone: null }, requests: [], note: MARK,
        currency: "USD", lines: [{ kind: "nights", count: 1, unitCents: 150_00, cents: 150_00 }], totalCents: 150_00, paymentMethod: "at_hotel", paymentStatus: "unpaid", paidCents: 0, refundCents: 0,
        orderId: null, holdUntil: null, cancellation: null, changes: [], lang: "en", sample: false, createdAt: NOW, updatedAt: NOW,
      },
      () => null,
      NOW,
    );
    if (!theirTrip.ok) throw new Error("trip");
    const theirAlert = await store.createTravelAlert({ appId: trip, userId: traveller.id, kind: "flight", from: "CAI", to: "LXR", month: null, roundTrip: true, nights: 4, travellers: 1, maxCents: null, firstCents: null, lastCents: null, createdAt: NOW, updatedAt: NOW });
    Object.assign(hostedIds, {
      hotel_id: String(theirHotel.id),
      flight_id: String(theirFlight.id),
      booking_id: String(theirTrip.booking.id),
      alert_id: String(theirAlert.id),
      student_id: String(theirStudent.person.id),
      homework_id: String(homework.id),
      assessment_id: String(assessment.id),
      fee_id: String(fee.id),
      topic_id: String(theirTopic.id),
      report_id: String(theirReport.id),
      leave_id: String(leave.id),
      payslip_id: String(payslip.payslip.id),
      route_id: String(busRoute.id),
      run_id: String(busRun.id),
      book_id: String(book.id),
      hold_id: String(bookHold.id),
      slip_id: String(theirSlip.id),
      excuse_id: String(theirExcuse.id),
      // 113.8 A behaviour note shares `note_id` with 113.7's lesson notes: its paths get this one (see hosted()).
      behaviour_note_id: String(theirNote.id),
      teacher_id: String(teacher.teacher.id),
      ride_id: String(ride.id),
      // 105.9 Places are the map provider's, nobody's own: one that names nothing of the other client.
      place_id: "osm:N1",
      restaurant_id: String(restaurant.id),
      // Food orders are numbered apart from shop orders: their paths get this one (see hosted()).
      food_order_id: String(foodOrder.id),
      // 115 The other client's vendor, its marketplace order (market paths get this one, see hosted()) and a complaint.
      vendor_id: String(restaurant.id),
      market_order_id: String(theirMarketOrder.id),
      complaint_id: String(theirComplaint.id),
      device_id: customerDevice,
      conversation_id: conversation.id,
      message_id: String(message.id),
      member_id: member.id,
      upload_id: randomUUID(),
      order_id: ids.order_id,
      course_id: "10",
      // 113.1 Bundles: none on these apps (each path answers not found).
      bundle_id: "1",
      question_id: ids.question_id,
      lesson_id: "12",
      // Quizzes, services and classes: none on these apps (each path still answers nothing).
      quiz_id: "1",
      attempt_id: "1",
      // 112.5 Assignments and live classes: none on these apps either.
      assignment_id: "1",
      live_id: "1",
      submission_id: "1",
      // 113.7 Learning paths, notes and answers: none of these apps' own.
      path_id: "1",
      note_id: ids.note_id,
      answer_id: ids.answer_id,
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
      shipment_id: String(shipment.id),
      // 113.9
      section_id: String(theirSection.id),
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
    if (/^\/(courses|lessons|quizzes|questions|me\/wishlist|teachers|teacher|assignments|live-sessions|course-uploads|me\/live-sessions|learning-paths|notes|me\/achievements)\b/.test(route)) return "school";
    if (/^\/news/.test(route)) return "news";
    if (/^\/(listings|me\/favorites|me\/inquiries)/.test(route)) return "estate";
    if (/^\/(events|me\/tickets)/.test(route)) return "events";
    if (/^\/donations/.test(route)) return "donations";
    if (/^\/(delivery|courier|me\/shipments)/.test(route)) return "delivery";
    if (/^\/(food|restaurant|me\/food-orders)/.test(route)) return "food";
    if (/^\/(market|vendor|me\/(market-orders|complaints|wallet|club))\b/.test(route)) return "food";
    if (/^\/(rides|driver|me\/rides)/.test(route)) return "rides";
    if (/^\/(school|classroom|staff|parent)\//.test(route)) return "k12";
    if (/^\/taxi\//.test(route)) return "taxi";
    if (/^\/(travel|me\/travel)\//.test(route)) return "travel";
    return "shop";
  }

  /** A signed-in customer of this app (a new one each time). */
  async function customerOf(app: App): Promise<string> {
    const user = (await store.createHostedUser({ appId: app.id, phone: `+9053${Math.floor(Math.random() * 1e8).toString().padStart(8, "0")}`, name: "Intruder", email: null, city: null, now: NOW }))!;
    const device = randomUUID();
    await store.createHostedDevice({ id: device, appId: app.id, userId: user.id, deviceId: device, platform: "android", name: "Pixel", appVersion: "1.0.0", pushToken: null, pushPreferences: null, createdAt: NOW, lastSeenAt: NOW });
    // 105.4 At a school: its student, a parent and a teacher with a class of their own, so the paths go past who they are.
    if (app.connector?.kind === "school") {
      const klass = (await store.saveSchoolClass({ appId: app.id, id: null, name: "Mine", grade: null, homeroomTeacherId: null }, NOW))!;
      for (const role of ["student", "parent", "teacher", "staff"] as const) {
        const made = await store.createSchoolPerson({ appId: app.id, role, name: "Intruder", phone: user.phone, email: null, classId: role === "student" ? klass.id : null, code: null, photoAssetId: null, active: true }, NOW);
        if (made.ok && role === "teacher") await store.saveSchoolClass({ appId: app.id, id: klass.id, name: "Mine", grade: null, homeroomTeacherId: made.person.id }, NOW);
      }
    }
    const iat = Math.floor(NOW.getTime() / 1000);
    return encodeJwt({ aud: app.id, sub: user.id, did: device, iat, exp: iat + 3600 }, HOSTED_SECRET);
  }

  async function hosted(app: App, method: string, route: string, token: string | null, body: unknown = {}) {
    const food = hostedKind(route) === "food";
    const market = /^\/(market|vendor|me\/(market-orders|complaints|wallet|club))\b/.test(route);
    const concrete = route.replace(/\{(\w+)\}/g, (_, name: string) => hostedIds[market && name === "order_id" ? "market_order_id" : food && name === "order_id" ? "food_order_id" : name === "note_id" && route.startsWith("/classroom/behaviour") ? "behaviour_note_id" : name]!);
    const assetUrl = (id: string) => `https://yallapp.test/a/${id}`;
    return handleHosted(
      {
        store,
        app,
        active: true,
        // 105.3 With academies with many teachers, so their paths answer.
        plan: { ...PLAN_INFO.pro, features: [...PLAN_INFO.pro.features, "instructors", "school", "university"] },
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
      // Pages, their forms (99.4) and string packs are named by the app's own slugs, not other objects' IDs.
      if (!route.includes("{") || route.startsWith("/pages/") || route.startsWith("/forms/") || route.startsWith("/strings/")) continue;
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

