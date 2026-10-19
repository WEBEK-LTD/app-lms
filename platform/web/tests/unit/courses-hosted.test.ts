import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { enrollPaidCourses } from "@/lib/catalog/payment";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import { videoSource } from "@/lib/courses/setup";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CourseSetup } from "@/lib/data/types";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };

function academy(): CourseSetup {
  return {
    currency: "TRY",
    categories: [
      { id: 1, name: "Languages" },
      { id: 2, name: "Empty" },
    ],
    courses: [
      {
        id: 10,
        title: "Turkish for Beginners",
        description: "Speak from day one.",
        imageAssetId: "img-tr",
        priceCents: 0,
        categoryIds: [1],
        instructorName: "Selin Arslan",
        level: "Beginner",
        active: true,
        createdAt: "2026-10-01T10:00:00.000Z",
        topics: [
          {
            id: 11,
            title: "Hello",
            lessons: [
              { id: 12, title: "Greetings", videoUrl: "https://www.youtube.com/watch?v=abc123", text: "Merhaba!", durationMinutes: 8, preview: true },
              { id: 13, title: "Numbers", videoUrl: null, text: "Bir, iki, üç.", durationMinutes: 5, preview: false },
            ],
          },
        ],
      },
      {
        id: 20,
        title: "Business English",
        description: "",
        imageAssetId: null,
        priceCents: 45000,
        categoryIds: [1],
        instructorName: null,
        level: null,
        active: true,
        createdAt: "2026-10-05T10:00:00.000Z",
        topics: [{ id: 21, title: "Meetings", lessons: [{ id: 22, title: "Small talk", videoUrl: "https://vimeo.com/1234", text: "", durationMinutes: 10, preview: false }] }],
      },
      { id: 30, title: "Draft", description: "", imageAssetId: null, priceCents: 0, categoryIds: [2], instructorName: null, level: null, active: false, createdAt: "2026-10-06T10:00:00.000Z", topics: [] },
    ],
    nextId: 40,
  };
}

describe("lesson videos", () => {
  it("tells YouTube and Vimeo from other addresses", () => {
    expect(videoSource("https://youtu.be/abc")).toBe("youtube");
    expect(videoSource("https://m.youtube.com/watch?v=abc")).toBe("youtube");
    expect(videoSource("https://player.vimeo.com/video/1")).toBe("vimeo");
    expect(videoSource("https://cdn.example.com/a.mp4")).toBe("external");
  });
});

describe("courses on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "lms");
    app = {
      ...base,
      backend: "hosted",
      appName: "Lale Academy",
      websiteDoneAt: NOW,
      connector: { kind: "courses" },
      courseSetup: academy(),
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: encryptPaymentKeys(base.id, "api", "secret", true, KEY) },
    };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
  });

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: new CoursesConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" }),
  });

  async function call(
    method: string,
    route: string,
    options: { body?: unknown; token?: string | null; query?: Record<string, string>; params?: string[] } = {},
  ): Promise<HostedResult> {
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

  async function signUp() {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone: "5321234567" } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get("+905321234567")!, device: DEVICE } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name: "Deniz Aksoy", device: DEVICE } });
    return registered.body as { access_token: string; user: { id: number } };
  }

  it("adds the LMS to the config, never selling on iOS", async () => {
    const android = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as Record<string, Record<string, unknown>>;
    expect(android.features).toMatchObject({ lms: "yallapp", quizzes: false, wishlist: false, certificates: false });
    expect(android.purchases).toEqual({ enroll_button: true, free_enrollment: true });
    const ios = (await call("GET", "/config", { query: { platform: "ios", app_version: "1.0.0" } })).body as Record<string, Record<string, unknown>>;
    expect(ios.purchases).toEqual({ enroll_button: false, free_enrollment: true });
  });

  it("lists categories and courses", async () => {
    expect((await call("GET", "/categories")).body).toEqual({ items: [{ id: 1, name: "Languages", count: 2 }] });
    const all = (await call("GET", "/courses")).body as { items: { title: string }[] };
    expect(all.items.map((c) => c.title)).toEqual(["Business English", "Turkish for Beginners"]);
    expect((await call("GET", "/courses", { query: { price: "free" } })).body).toMatchObject({ total: 1, items: [{ title: "Turkish for Beginners", price: { is_free: true } }] });
    expect((await call("GET", "/courses", { query: { price: "paid" } })).body).toMatchObject({ items: [{ price: { is_free: false, formatted: "₺450.00", amount: "450.00" } }] });
    expect((await call("GET", "/courses", { query: { orderby: "title" } })).body).toMatchObject({ items: [{ title: "Business English" }, { title: "Turkish for Beginners" }] });
    expect((await call("GET", "/courses/{course_id}", { params: ["30"] })).status).toBe(404);
    const home = (await call("GET", "/home")).body as { sections: { type: string }[] };
    expect(home.sections.map((s) => s.type)).toEqual(["categories", "latest_courses"]);
  });

  it("shows the course page's button for each case", async () => {
    const free = await call("GET", "/courses/{course_id}", { params: ["10"], query: { platform: "ios" } });
    expect(free.body).toMatchObject({ purchase: { action: "enroll_free" }, lesson_count: 2, duration_minutes: 13, level: "Beginner", instructor: { name: "Selin Arslan" } });
    expect((await call("GET", "/courses/{course_id}", { params: ["20"], query: { platform: "android" } })).body).toMatchObject({ purchase: { action: "checkout" } });
    expect((await call("GET", "/courses/{course_id}", { params: ["20"], query: { platform: "ios" } })).body).toMatchObject({ purchase: { action: "none" } });
  });

  it("opens preview lessons to all and the rest after enrolling, and tracks progress", async () => {
    const curriculum = (await call("GET", "/courses/{course_id}/curriculum", { params: ["10"] })).body;
    expect(curriculum).toMatchObject({ topics: [{ title: "Hello", items: [{ id: 12, locked: false, preview: true }, { id: 13, locked: true }] }] });
    const preview = await call("GET", "/lessons/{lesson_id}", { params: ["12"] });
    expect(preview.body).toMatchObject({ html: "<p>Merhaba!</p>", video: { source: "youtube", url: "https://www.youtube.com/watch?v=abc123" }, next_id: 13 });
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["13"] })).status).toBe(403);

    const { access_token: token } = await signUp();
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["13"], token })).body).toMatchObject({ code: "not_enrolled" });
    expect((await call("POST", "/courses/{course_id}/enroll", { params: ["20"], token })).status).toBe(403);
    const enrolled = await call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    expect(enrolled.body).toMatchObject({ course_id: 10 });
    expect((await call("GET", "/courses/{course_id}", { params: ["10"], token })).body).toMatchObject({ enrolled: true, purchase: { action: "continue" } });

    expect((await call("PUT", "/lessons/{lesson_id}/progress", { params: ["12"], token, body: { position_seconds: 95, watched_percent: 20 } })).status).toBe(204);
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["12"], token })).body).toMatchObject({ position_seconds: 95, completed: false });
    expect((await call("POST", "/lessons/{lesson_id}/complete", { params: ["12"], token })).body).toEqual({ course_id: 10, completed_items: 1, total_items: 2, percent: 50, course_completed: false, completed_at: null });
    // Saving a position later doesn't undo completing.
    await call("PUT", "/lessons/{lesson_id}/progress", { params: ["12"], token, body: { position_seconds: 10, watched_percent: 5 } });
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["12"], token })).body).toMatchObject({ completed: true, position_seconds: 10 });

    const mine = (await call("GET", "/me/courses", { token })).body;
    expect(mine).toMatchObject({ total: 1, items: [{ course: { id: 10 }, progress: { percent: 50 }, next_item: { id: 13 } }] });
    const home = (await call("GET", "/home", { token })).body as { sections: { type: string }[] };
    expect(home.sections[0]).toMatchObject({ type: "continue_learning", course: { course: { id: 10 } } });
    await call("POST", "/lessons/{lesson_id}/complete", { params: ["13"], token });
    expect((await call("GET", "/me/courses", { token, query: { status: "completed" } })).body).toMatchObject({ total: 1 });
    expect((await call("GET", "/me/wishlist", { token })).body).toEqual({ items: [] });
  });

  it("sells a paid course on Android and enrols once paid", async () => {
    const { access_token: token, user } = await signUp();
    expect((await call("POST", "/auth/checkout-link", { query: { platform: "ios" }, token, body: { course_id: 20 } })).body).toMatchObject({ code: "purchase_not_allowed" });
    const link = await call("POST", "/auth/checkout-link", { query: { platform: "android" }, token, body: { course_id: 20 } });
    const url = (link.body as { url: string }).url;
    expect(url).toMatch(/^https:\/\/yallapp\.test\/pay\//);
    const order = (await store.getCatalogOrderByToken(sha256Hex(url.split("/").pop()!)))!;
    expect(order).toMatchObject({ userId: user.id, totalCents: 45000, lines: [{ productId: 20, name: "Business English", digital: true }] });

    await store.payCatalogOrder(app.id, order.id, "pay-1", now);
    await enrollPaidCourses(store, app, order, now);
    expect((await store.getCatalogOrder(app.id, order.id))!.status).toBe("completed");
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["22"], token })).body).toMatchObject({ video: { source: "vimeo" } });
    expect((await call("POST", "/auth/checkout-link", { query: { platform: "android" }, token, body: { course_id: 20 } })).status).toBe(403);
  });
});
