import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App, HostedUser } from "@/lib/data/types";
import { platformDefinition, type PlatformConnector } from "@/lib/hosted/connectors/platforms";
import { clearThinkificCache, normalizeSubdomain, THINKIFIC_API, THINKIFIC_PLATFORM } from "@/lib/hosted/connectors/thinkific";
import { ConnectorError } from "@/lib/hosted/connectors/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const TOKEN = "thinkific-token";
const SSO_SECRET = "sso-signing-secret";

// A school answering Thinkific's Admin REST API (api/public/v1) as documented, for the calls the connector makes.

const usd = (id: number, price: string, extra: Record<string, unknown> = {}) => ({
  id,
  is_primary: true,
  payment_type: price === "0.0" ? "free" : "one-time",
  label: null,
  price,
  currency: "usd",
  price_name: null,
  ...extra,
});

const PRODUCTS = [
  { id: 1, created_at: "2026-10-01T10:00:00.000Z", productable_id: 10, productable_type: "Course", name: "Turkish for Beginners", slug: "turkish", description: null, card_image_url: "http://cdn.thinkific.test/turkish.jpg", position: 2, status: "published", hidden: false, private: false, has_certificate: true, price: 0, product_prices: [usd(11, "0.0")] },
  { id: 2, created_at: "2026-10-05T10:00:00.000Z", productable_id: 20, productable_type: "Course", name: "Business English", slug: "business", description: null, card_image_url: null, position: 1, status: "published", hidden: false, private: false, has_certificate: false, price: 49, product_prices: [usd(21, "49.0"), usd(22, "19.0", { is_primary: false, payment_type: "subscription", interval: "month", interval_count: 1 })] },
  { id: 3, created_at: "2026-10-06T10:00:00.000Z", productable_id: 30, productable_type: "Course", name: "Coaching", slug: "coaching", description: null, card_image_url: null, position: 3, status: "published", hidden: false, private: true, has_certificate: false, price: 0, product_prices: [usd(31, "0.0")] },
  { id: 4, created_at: "2026-10-07T10:00:00.000Z", productable_id: 40, productable_type: "Course", name: "Draft", slug: "draft", description: null, card_image_url: null, position: 4, status: "draft", hidden: false, private: false, has_certificate: false, price: 0, product_prices: [usd(41, "0.0")] },
  { id: 5, created_at: "2026-10-08T10:00:00.000Z", productable_id: 1, productable_type: "Bundle", name: "Everything", slug: "everything", description: null, card_image_url: null, position: 5, status: "published", hidden: false, private: false, has_certificate: false, price: 99, product_prices: [usd(51, "99.0")] },
];

const course = (id: number, name: string, productId: number, chapterIds: number[], extra: Record<string, unknown> = {}) => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  description: "",
  course_card_image_url: null,
  product_id: productId,
  instructor_id: 7,
  chapter_ids: chapterIds,
  reviews_enabled: false,
  ...extra,
});

const COURSES = [
  course(10, "Turkish for Beginners", 1, [100], { description: "<p>Speak from day one.</p><script>alert(1)</script>", course_card_image_url: "http://cdn.thinkific.test/turkish-card.jpg" }),
  course(20, "Business English", 2, [200], { description: "Meetings and e-mails.\n\nIn English." }),
  course(30, "Coaching", 3, [300]),
  course(40, "Draft", 4, []),
];

const CHAPTERS = [
  { id: 100, name: "Hello", position: 1, description: null, duration_in_seconds: 780, content_ids: [1001, 1002], course_id: 10 },
  { id: 200, name: "Meetings", position: 1, description: null, duration_in_seconds: null, content_ids: [2001], course_id: 20 },
  { id: 300, name: "Sessions", position: 1, description: null, duration_in_seconds: null, content_ids: [3001], course_id: 30 },
];

const take = (id: number) => `http://lale.thinkific.com/courses/take/course/lessons/${id}`;
const CONTENTS = [
  // Listed out of order: the connector sorts by position.
  { id: 1002, name: "Numbers quiz", position: 2, chapter_id: 100, contentable_type: "Quiz", free: false, take_url: take(1002) },
  { id: 1001, name: "Greetings", position: 1, chapter_id: 100, contentable_type: "Lesson", free: true, take_url: take(1001) },
  { id: 2001, name: "Small talk", position: 1, chapter_id: 200, contentable_type: "Lesson", free: false, take_url: take(2001) },
  { id: 3001, name: "Session one", position: 1, chapter_id: 300, contentable_type: "Lesson", free: false, take_url: take(3001) },
];

interface FakeUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  external_id: string | null;
}

interface FakeEnrollment {
  id: number;
  course_id: number;
  user_id: number;
  percentage_completed: number;
  completed: boolean;
  expired: boolean;
  activated_at: string | null;
  updated_at: string;
}

interface Call {
  method: string;
  path: string;
  query: URLSearchParams;
  body: Record<string, unknown> | null;
}

/** The fake answers at most 2 items a page, so the connector has to follow the pages. */
const SERVER_PAGE_MAX = 2;

function fakeSchool(options: { down?: boolean } = {}) {
  const calls: Call[] = [];
  const users: FakeUser[] = [{ id: 1, email: "owner@lale.test", first_name: "Lale", last_name: "Owner", external_id: null }];
  const enrollments: FakeEnrollment[] = [];
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const list = (items: unknown[], query: URLSearchParams) => {
    const page = Number(query.get("page") ?? 1);
    const limit = Math.min(Number(query.get("limit") ?? 25), SERVER_PAGE_MAX);
    const totalPages = Math.max(1, Math.ceil(items.length / limit));
    return json(200, {
      items: items.slice((page - 1) * limit, page * limit),
      meta: { pagination: { current_page: page, next_page: page < totalPages ? page + 1 : null, prev_page: page > 1 ? page - 1 : null, total_pages: totalPages, total_items: items.length } },
    });
  };
  const userJson = (u: FakeUser) => ({ id: u.id, email: u.email, first_name: u.first_name, last_name: u.last_name, full_name: `${u.first_name} ${u.last_name}`, roles: [] });
  const enrollmentJson = (e: FakeEnrollment) => {
    const course = COURSES.find((c) => c.id === e.course_id)!;
    const user = users.find((u) => u.id === e.user_id)!;
    return { ...e, user_email: user.email, user_name: `${user.first_name} ${user.last_name}`, course_name: course.name, is_free_trial: e.activated_at === null, started_at: null, completed_at: null, expiry_date: null };
  };

  const fetcher = (async (input: string, init: RequestInit) => {
    const url = new URL(input);
    expect(url.origin + url.pathname.slice(0, "/api/public/v1".length)).toBe(THINKIFIC_API);
    const headers = new Headers(init.headers);
    if (headers.get("authorization") !== `Bearer ${TOKEN}`) return json(401, { message: "Unauthorized" });
    expect(headers.get("x-auth-subdomain")).toBe("lale");
    if (options.down) return new Response("", { status: 503 });
    const path = url.pathname.slice("/api/public/v1".length);
    const method = init.method ?? "GET";
    const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    calls.push({ method, path, query: url.searchParams, body });
    const q = url.searchParams;
    let m: RegExpMatchArray | null;

    if (method === "GET" && path === "/products") return list(PRODUCTS, q);
    if (method === "GET" && path === "/courses") return list(COURSES, q);
    if (method === "GET" && (m = path.match(/^\/courses\/(\d+)\/chapters$/))) {
      // ChapterResponse has no course ID; the fake keeps one only to file chapters.
      return list(CHAPTERS.filter((c) => c.course_id === Number(m![1])).map((c) => Object.fromEntries(Object.entries(c).filter(([k]) => k !== "course_id"))), q);
    }
    if (method === "GET" && (m = path.match(/^\/chapters\/(\d+)\/contents$/))) return list(CONTENTS.filter((c) => c.chapter_id === Number(m![1])), q);
    if (method === "GET" && (m = path.match(/^\/contents\/(\d+)$/))) {
      const content = CONTENTS.find((c) => c.id === Number(m![1]));
      return content ? json(200, content) : json(404, { error: "Record not found." });
    }
    if (method === "GET" && path === "/instructors/7") return json(200, { id: 7, first_name: "Selin", last_name: "Arslan", bio: "Teaches Turkish.", avatar_url: "http://cdn.thinkific.test/selin.jpg", slug: "selin" });
    if (method === "GET" && path === "/users") {
      const email = q.get("query[email]");
      return list(users.filter((u) => !email || u.email === email).map(userJson), q);
    }
    if (method === "GET" && (m = path.match(/^\/users\/([^/]+)$/))) {
      const id = decodeURIComponent(m[1]!);
      const user = q.get("provider") === "SSO" ? users.find((u) => u.external_id === id) : users.find((u) => u.id === Number(id));
      return user ? json(200, userJson(user)) : json(404, { error: "Record not found." });
    }
    if (method === "POST" && path === "/users") {
      for (const field of ["first_name", "last_name", "email"]) if (!body?.[field]) return json(422, { errors: [{ [field]: "can't be blank" }] });
      if (users.some((u) => u.email === body!.email)) return json(422, { errors: [{ email: "has already been taken" }] });
      const user: FakeUser = { id: users.length + 1, email: String(body!.email), first_name: String(body!.first_name), last_name: String(body!.last_name), external_id: (body!.external_id as string) ?? null };
      users.push(user);
      return json(201, userJson(user));
    }
    if (method === "GET" && path === "/enrollments") {
      const userId = Number(q.get("query[user_id]"));
      return list(enrollments.filter((e) => e.user_id === userId).map(enrollmentJson), q);
    }
    if (method === "POST" && path === "/enrollments") {
      if (!COURSES.some((c) => c.id === body?.course_id)) return json(422, { errors: [{ course_id: "Course could not be found." }] });
      if (!users.some((u) => u.id === body?.user_id)) return json(422, { errors: [{ user_id: "User could not be found." }] });
      const enrollment: FakeEnrollment = {
        id: enrollments.length + 1,
        course_id: Number(body!.course_id),
        user_id: Number(body!.user_id),
        percentage_completed: 0,
        completed: false,
        expired: false,
        activated_at: (body!.activated_at as string) ?? null,
        updated_at: new Date().toISOString(),
      };
      enrollments.push(enrollment);
      return json(201, enrollmentJson(enrollment));
    }
    return json(404, { error: "Record not found." });
  }) as unknown as typeof fetch;
  return { fetcher, calls, users, enrollments };
}

function verifyJwt(token: string, secret: string): Record<string, unknown> {
  const [header, payload, signature] = token.split(".");
  expect(JSON.parse(Buffer.from(header!, "base64url").toString())).toEqual({ alg: "HS256", typ: "JWT" });
  expect(createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url")).toBe(signature);
  return JSON.parse(Buffer.from(payload!, "base64url").toString()) as Record<string, unknown>;
}

describe("Thinkific values", () => {
  it("turn what the client typed into the subdomain", () => {
    expect(normalizeSubdomain("lale")).toBe("lale");
    expect(normalizeSubdomain(" Lale.Thinkific.com ")).toBe("lale");
    expect(normalizeSubdomain("https://lale-academy.thinkific.com/manage/courses")).toBe("lale-academy");
    expect(normalizeSubdomain("academy.example.com")).toBeNull();
    expect(normalizeSubdomain("")).toBeNull();
    expect(THINKIFIC_PLATFORM.normalize({ subdomain: "https://lale.thinkific.com/", accessToken: " t ", ssoSecret: "" })).toEqual({
      values: { subdomain: "lale", accessToken: "t", ssoSecret: "" },
    });
    expect(THINKIFIC_PLATFORM.normalize({ subdomain: "learn.lale.com", accessToken: "t" })).toMatchObject({ errors: { subdomain: expect.any(String) } });
  });

  it("are registered as a course platform with a secret token and an optional SSO secret", () => {
    expect(platformDefinition("thinkific")).toBe(THINKIFIC_PLATFORM);
    expect(THINKIFIC_PLATFORM.appType).toBe("lms");
    expect(THINKIFIC_PLATFORM.fields.map((f) => [f.name, f.secret, f.optional ?? false])).toEqual([
      ["subdomain", false, false],
      ["accessToken", true, false],
      ["ssoSecret", true, true],
    ]);
  });
});

describe("Thinkific on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let school: ReturnType<typeof fakeSchool>;
  let connector: PlatformConnector;

  const create = (values: Record<string, string>, fetcher = school.fetcher) =>
    THINKIFIC_PLATFORM.create({ subdomain: "lale", accessToken: TOKEN, ssoSecret: "", ...values }, { appId: app.id, store, fetcher, saveSecrets: async () => {} });

  beforeEach(async () => {
    clearThinkificCache();
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "lms");
    app = { ...base, backend: "hosted", appName: "Lale Academy", websiteDoneAt: NOW };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
    school = fakeSchool();
    connector = create({});
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
    connector,
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

  const external = (userId: number) => `yallapp-${app.id.slice(0, 8)}-${userId}`;

  it("checks the token and names the school", async () => {
    expect(await connector.check()).toBe("lale.thinkific.com");
    await expect(create({ accessToken: "wrong" }).check()).rejects.toBeInstanceOf(ConnectorError);
  });

  it("adds Thinkific to the config, selling nothing from the app", async () => {
    const android = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as Record<string, Record<string, unknown>>;
    expect(android.features).toMatchObject({ lms: "thinkific", lms_version: "v1", pro: false, certificates: false, quizzes: false, wishlist: false, reviews: false, qna: false, orders: false });
    expect(android.purchases).toEqual({ enroll_button: false, free_enrollment: true });
    const ios = (await call("GET", "/config", { query: { platform: "ios", app_version: "1.0.0" } })).body as Record<string, Record<string, unknown>>;
    expect(ios.purchases).toEqual({ enroll_button: false, free_enrollment: true });
  });

  it("lists the published, public course products with their prices", async () => {
    expect((await call("GET", "/categories")).body).toEqual({ items: [] });
    const all = (await call("GET", "/courses")).body as { total: number; items: Record<string, unknown>[] };
    expect(all.total).toBe(2);
    expect(all.items.map((c) => c.title)).toEqual(["Business English", "Turkish for Beginners"]);
    expect(all.items[1]).toEqual({
      id: 10,
      title: "Turkish for Beginners",
      image_url: "https://cdn.thinkific.test/turkish-card.jpg",
      instructor: { id: 7, name: "Selin Arslan", avatar_url: "https://cdn.thinkific.test/selin.jpg", bio: "Teaches Turkish." },
      price: { is_free: true, amount: null, sale_amount: null, currency: null, formatted: null },
      lesson_count: 2,
      rating: null,
      rating_count: 0,
      enrolled: false,
      wishlisted: false,
    });
    expect(all.items[0]).toMatchObject({ price: { is_free: false, amount: "49.00", currency: "USD", formatted: "$49.00" }, lesson_count: 1 });
    expect((await call("GET", "/courses", { query: { price: "free" } })).body).toMatchObject({ total: 1, items: [{ id: 10 }] });
    expect((await call("GET", "/courses", { query: { price: "paid" } })).body).toMatchObject({ total: 1, items: [{ id: 20 }] });
    expect((await call("GET", "/courses", { query: { orderby: "title" } })).body).toMatchObject({ items: [{ id: 20 }, { id: 10 }] });
    expect((await call("GET", "/courses", { query: { orderby: "popular" } })).body).toMatchObject({ items: [{ id: 20 }, { id: 10 }] });
    expect((await call("GET", "/courses", { query: { search: "turk" } })).body).toMatchObject({ total: 1, items: [{ id: 10 }] });
    expect((await call("GET", "/courses", { query: { category: "3" } })).body).toMatchObject({ total: 0, items: [] });
    expect((await call("GET", "/courses", { query: { per_page: "1", page: "2" } })).body).toMatchObject({ page: 2, per_page: 1, total: 2, total_pages: 2, items: [{ id: 10 }] });
    // Private, draft and unknown courses aren't shown.
    for (const id of ["30", "40", "999", "abc"]) expect((await call("GET", "/courses/{course_id}", { params: [id], query: { platform: "android" } })).status).toBe(404);
    const home = (await call("GET", "/home")).body as { sections: { type: string; courses?: { id: number }[] }[] };
    expect(home.sections.map((s) => s.type)).toEqual(["latest_courses"]);
    expect(home.sections[0]!.courses!.map((c) => c.id)).toEqual([20, 10]);

    // Cached: a second listing asks Thinkific nothing.
    const before = school.calls.length;
    await call("GET", "/courses");
    expect(school.calls.length).toBe(before);
  });

  it("shows the course page's button for each case", async () => {
    const free = await call("GET", "/courses/{course_id}", { params: ["10"], query: { platform: "ios" } });
    expect(free.body).toMatchObject({
      purchase: { action: "enroll_free" },
      lesson_count: 2,
      duration_minutes: 13,
      has_certificate: true,
      description_html: "<p>Speak from day one.</p>",
      instructor: { name: "Selin Arslan" },
    });
    const paid = await call("GET", "/courses/{course_id}", { params: ["20"], query: { platform: "android" } });
    expect(paid.body).toMatchObject({ purchase: { action: "none" }, price: { is_free: false, formatted: "$49.00" }, description_html: "<p>Meetings and e-mails.</p><p>In English.</p>", duration_minutes: null });
    expect((await call("GET", "/courses/{course_id}", { params: ["20"], query: { platform: "ios" } })).body).toMatchObject({ purchase: { action: "none" } });
  });

  it("opens preview lessons to all and the rest after enrolling", async () => {
    const curriculum = (await call("GET", "/courses/{course_id}/curriculum", { params: ["10"] })).body;
    expect(curriculum).toEqual({
      topics: [
        {
          id: 100,
          title: "Hello",
          items: [
            { id: 1001, type: "lesson", title: "Greetings", duration_minutes: null, question_count: null, preview: true, locked: false, completed: false },
            { id: 1002, type: "lesson", title: "Numbers quiz", duration_minutes: null, question_count: null, preview: false, locked: true, completed: false },
          ],
        },
      ],
    });
    const preview = (await call("GET", "/lessons/{lesson_id}", { params: ["1001"] })).body;
    expect(preview).toMatchObject({
      id: 1001,
      course_id: 10,
      title: "Greetings",
      render_mode: "native",
      webview_url: null,
      completed: false,
      previous_id: null,
      next_id: 1002,
    });
    expect((preview as { html: string }).html).toBe(
      '<p><strong>Greetings</strong> opens in the school\'s course player.</p><p><a href="https://lale.thinkific.com/courses/take/course/lessons/1001">Open the lesson</a></p>',
    );
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["1002"] })).body).toMatchObject({ code: "not_enrolled" });
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["3001"] })).status).toBe(404);
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["9999"] })).status).toBe(404);

    const { access_token: token, user } = await signUp();
    // Reading doesn't create a Thinkific student.
    expect((await call("GET", "/courses/{course_id}", { params: ["10"], token, query: { platform: "android" } })).body).toMatchObject({ enrolled: false });
    expect(school.calls.some((c) => c.method === "POST")).toBe(false);

    expect((await call("POST", "/courses/{course_id}/enroll", { params: ["20"], token })).body).toMatchObject({ code: "purchase_required" });
    expect((await call("POST", "/courses/{course_id}/enroll", { params: ["30"], token })).status).toBe(404);
    const enrolled = await call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    expect(enrolled.body).toEqual({ course_id: 10, enrolled_at: new Date(now).toISOString() });
    // A student without an e-mail gets the address derived from the app and user, linked by the external ID.
    expect(school.users.at(-1)).toMatchObject({ email: `u${user.id}.${app.id.slice(0, 8)}@students.yallapp.com.tr`, first_name: "Deniz", last_name: "Aksoy", external_id: external(user.id) });
    expect(school.calls.find((c) => c.method === "POST" && c.path === "/users")!.body).toMatchObject({ provider: "SSO", send_welcome_email: false });
    expect(school.enrollments).toMatchObject([{ course_id: 10, user_id: school.users.at(-1)!.id, activated_at: now.toISOString() }]);
    // Enrolling again answers the same enrollment.
    expect((await call("POST", "/courses/{course_id}/enroll", { params: ["10"], token })).status).toBe(200);
    expect(school.enrollments).toHaveLength(1);

    expect((await call("GET", "/courses/{course_id}", { params: ["10"], token, query: { platform: "android" } })).body).toMatchObject({ enrolled: true, purchase: { action: "continue" } });
    expect((await call("GET", "/courses/{course_id}/curriculum", { params: ["10"], token })).body).toMatchObject({ topics: [{ items: [{ locked: false }, { locked: false }] }] });
    const quiz = (await call("GET", "/lessons/{lesson_id}", { params: ["1002"], token })).body as { html: string };
    expect(quiz).toMatchObject({ render_mode: "native", previous_id: 1001, next_id: null });
    expect(quiz.html).toContain(">Open the quiz</a>");

    expect((await call("PUT", "/lessons/{lesson_id}/progress", { params: ["1002"], token, body: { position_seconds: 95, watched_percent: 20 } })).status).toBe(204);
    expect((await call("PUT", "/lessons/{lesson_id}/progress", { params: ["2001"], token, body: { position_seconds: 95, watched_percent: 20 } })).status).toBe(403);
    expect((await call("POST", "/lessons/{lesson_id}/complete", { params: ["2001"], token })).status).toBe(403);

    // The student completes lessons in Thinkific's player; completing in the app reports Thinkific's progress.
    school.enrollments[0]!.percentage_completed = 0.5;
    expect((await call("POST", "/lessons/{lesson_id}/complete", { params: ["1001"], token })).body).toEqual({ course_id: 10, completed_items: 1, total_items: 2, percent: 50, course_completed: false });

    const mine = (await call("GET", "/me/courses", { token })).body;
    expect(mine).toMatchObject({ total: 1, items: [{ course: { id: 10, enrolled: true }, progress: { percent: 50 } }] });
    expect((await call("GET", "/me/courses", { token, query: { status: "completed" } })).body).toMatchObject({ total: 0 });
    const home = (await call("GET", "/home", { token })).body as { sections: { type: string }[] };
    expect(home.sections[0]).toMatchObject({ type: "continue_learning", course: { course: { id: 10 }, progress: { percent: 50 } } });

    Object.assign(school.enrollments[0]!, { percentage_completed: 1, completed: true });
    expect((await call("POST", "/lessons/{lesson_id}/complete", { params: ["1002"], token })).body).toEqual({ course_id: 10, completed_items: 2, total_items: 2, percent: 100, course_completed: true });
    expect((await call("GET", "/me/courses", { token, query: { status: "completed" } })).body).toMatchObject({ total: 1 });
    expect((await call("GET", "/courses/{course_id}/curriculum", { params: ["10"], token })).body).toMatchObject({ topics: [{ items: [{ completed: true }, { completed: true }] }] });
    expect((await call("GET", "/me/wishlist", { token })).body).toEqual({ items: [] });
    expect((await call("GET", "/me/certificates", { token })).body).toEqual({ items: [] });
    expect((await call("PUT", "/me/wishlist/{course_id}", { params: ["10"], token })).body).toMatchObject({ code: "feature_disabled" });
    expect((await call("GET", "/me/courses")).status).toBe(401);
  });

  it("shows a private course to a student the school enrolled in it", async () => {
    const { access_token: token, user } = await signUp();
    school.users.push({ id: 50, email: "deniz@example.com", first_name: "Deniz", last_name: "Aksoy", external_id: external(user.id) });
    school.enrollments.push({ id: 9, course_id: 30, user_id: 50, percentage_completed: 0, completed: false, expired: false, activated_at: NOW.toISOString(), updated_at: NOW.toISOString() });
    school.enrollments.push({ id: 10, course_id: 20, user_id: 50, percentage_completed: 0, completed: false, expired: true, activated_at: NOW.toISOString(), updated_at: NOW.toISOString() });
    expect((await call("GET", "/courses/{course_id}", { params: ["30"], token, query: { platform: "android" } })).body).toMatchObject({ enrolled: true, purchase: { action: "continue" } });
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["3001"], token })).body).toMatchObject({ course_id: 30, render_mode: "native" });
    expect((await call("GET", "/me/courses", { token })).body).toMatchObject({ total: 1, items: [{ course: { id: 30 } }] });
    // An expired enrollment doesn't count.
    expect((await call("GET", "/courses/{course_id}", { params: ["20"], token, query: { platform: "android" } })).body).toMatchObject({ enrolled: false, purchase: { action: "none" } });
    expect((await call("GET", "/courses", { token })).body).toMatchObject({ total: 2 });
  });

  it("sells nothing from the app", async () => {
    const { access_token: token } = await signUp();
    expect((await call("POST", "/auth/checkout-link", { query: { platform: "android" }, body: { course_id: 20 } })).status).toBe(401);
    for (const platform of ["android", "ios"]) {
      const link = await call("POST", "/auth/checkout-link", { query: { platform }, token, body: { course_id: 20 } });
      expect(link).toEqual({ status: 403, body: { code: "purchase_not_allowed", message: "This course is sold on the school's website." } });
    }
  });

  it("signs students in to lessons with the SSO secret", async () => {
    connector = create({ ssoSecret: SSO_SECRET });
    const { access_token: token, user } = await signUp();
    // Signed out, the preview link opens the player as it is.
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["1001"] })).body).toMatchObject({ render_mode: "native", webview_url: null });

    const lesson = (await call("GET", "/lessons/{lesson_id}", { params: ["1001"], token })).body as { render_mode: string; webview_url: string; html: string };
    expect(lesson.render_mode).toBe("webview");
    const url = new URL(lesson.webview_url);
    expect(url.origin + url.pathname).toBe("https://lale.thinkific.com/api/sso/v2/sso/jwt");
    expect(url.searchParams.get("return_to")).toBe("https://lale.thinkific.com/courses/take/course/lessons/1001");
    expect(url.searchParams.get("error_url")).toBe("https://lale.thinkific.com/courses/take/course/lessons/1001");
    expect(verifyJwt(url.searchParams.get("jwt")!, SSO_SECRET)).toEqual({
      email: `u${user.id}.${app.id.slice(0, 8)}@students.yallapp.com.tr`,
      first_name: "Deniz",
      last_name: "Aksoy",
      iat: Math.floor(now.getTime() / 1000),
      external_id: external(user.id),
    });
    expect(lesson.html).toContain(`href="${lesson.webview_url.replaceAll("&", "&amp;")}"`);
    // The SSO student is the REST student.
    expect(school.users.filter((u) => u.external_id === external(user.id))).toHaveLength(1);
  });

  it("never gives a user another student's account for the e-mail they set", async () => {
    connector = create({ ssoSecret: SSO_SECRET });
    // The victim's Thinkific account, enrolled in the paid course.
    school.users.push({ id: 60, email: "victim@example.com", first_name: "Ayse", last_name: "Yilmaz", external_id: null });
    school.enrollments.push({ id: 9, course_id: 20, user_id: 60, percentage_completed: 0.4, completed: false, expired: false, activated_at: NOW.toISOString(), updated_at: NOW.toISOString() });

    const { access_token: token, user } = await signUp();
    expect((await call("PATCH", "/me", { token, body: { email: "victim@example.com" } })).body).toMatchObject({ email: "victim@example.com" });

    // Nothing of the victim's shows, and nothing is looked up by that address.
    expect((await call("GET", "/courses/{course_id}", { params: ["20"], token, query: { platform: "android" } })).body).toMatchObject({ enrolled: false });
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["2001"], token })).body).toMatchObject({ code: "not_enrolled" });
    expect((await call("GET", "/me/courses", { token })).body).toMatchObject({ total: 0 });

    // Enrolling and SSO use the student's own account, with our address.
    await call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    const own = `u${user.id}.${app.id.slice(0, 8)}@students.yallapp.com.tr`;
    const student = school.users.at(-1)!;
    expect(student).toMatchObject({ email: own, external_id: external(user.id) });
    expect(student.id).not.toBe(60);
    expect(school.enrollments.at(-1)).toMatchObject({ course_id: 10, user_id: student.id });
    const lesson = (await call("GET", "/lessons/{lesson_id}", { params: ["1001"], token })).body as { webview_url: string };
    const claims = verifyJwt(new URL(lesson.webview_url).searchParams.get("jwt")!, SSO_SECRET);
    expect(claims).toMatchObject({ email: own, external_id: external(user.id) });
    expect(JSON.stringify(school.calls)).not.toContain("victim");
    expect(school.users.find((u) => u.id === 60)).toMatchObject({ email: "victim@example.com", external_id: null });
  });

  it("gives a user with a free e-mail our address too", async () => {
    const user: HostedUser = {
      id: 78,
      appId: app.id,
      phone: "+905321234567",
      name: "Mallory",
      email: "mallory@example.com",
      city: null,
      notificationsReadAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const result = await connector.handle({ method: "POST", path: ["courses", "10", "enroll"], query: new URLSearchParams(), body: null, user, now: NOW });
    expectContract("POST", "/courses/{course_id}/enroll", result!);
    expect(school.users.at(-1)).toMatchObject({ email: `u78.${app.id.slice(0, 8)}@students.yallapp.com.tr`, first_name: "Mallory", last_name: "-", external_id: external(78) });
  });

  it("says when the school can't be reached", async () => {
    connector = create({}, fakeSchool({ down: true }).fetcher);
    expect((await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).status).toBe(503);
    // The contract doesn't list 503 for the course endpoints yet; the plugin answers lms_unavailable the same way.
    const result = await connector.handle({ method: "GET", path: ["courses"], query: new URLSearchParams(), body: undefined, user: null, now: NOW });
    expect(result).toEqual({ status: 503, body: { code: "lms_unavailable", message: "Courses are not available right now. Please try again in a moment." } });
    await expect(connector.check()).rejects.toBeInstanceOf(ConnectorError);
  });

  it("keeps under Thinkific's rate limit", async () => {
    for (let i = 0; i < 120; i++) await connector.check();
    await expect(connector.check()).rejects.toThrow("rate limit");
    expect(await connector.handle({ method: "GET", path: ["courses"], query: new URLSearchParams(), body: undefined, user: null, now: NOW })).toMatchObject({ status: 503 });
  });

  it("answers null for routes it doesn't serve", async () => {
    expect(await connector.handle({ method: "GET", path: ["store", "products"], query: new URLSearchParams(), body: undefined, user: null, now: NOW })).toBeNull();
    expect(await connector.handle({ method: "GET", path: ["courses", "10", "reviews"], query: new URLSearchParams(), body: undefined, user: null, now: NOW })).toBeNull();
  });
});
