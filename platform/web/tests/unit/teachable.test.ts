import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { platformConnector, platformConnectorConfig } from "@/lib/hosted/connectors/platforms";
import {
  cleanHtml,
  clearTeachableCache,
  normalizeSchool,
  TEACHABLE_PLATFORM,
  TeachableClient,
  TeachableConnector,
} from "@/lib/hosted/connectors/teachable";
import { ConnectorError } from "@/lib/hosted/connectors/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

const SCHOOL = "rose-academy.teachable.com";
const API_KEY = "tk_live_rose";
const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const STREAM = `https://vod-akm.play.hotmart.com/video/abc/hls/master.m3u8?hdnts=st%3D${1791799200}%7Eexp%3D${1791799200 + 500}%7Ehmac%3Dabc`;

// A school answering like Teachable's Public API (v1), for the requests the connector sends.

interface Lecture {
  id: number;
  name: string;
  is_published: boolean;
  position: number;
  attachments: Record<string, unknown>[];
}
interface Enrollment {
  course_id: number;
  enrolled_at: string;
  is_active_enrollment: boolean;
  completed_at: string | null;
  percent_complete: number;
}
interface User {
  id: number;
  name: string;
  email: string;
  src: string | null;
  courses: Enrollment[];
}

const lecture = (id: number, name: string, position: number, attachments: Record<string, unknown>[] = [], is_published = true): Lecture => ({
  id,
  name,
  is_published,
  position,
  attachments,
});

function school() {
  const courses: { id: number; name: string; heading: string | null; description: string | null; is_published: boolean; image_url: string | null }[] = [
    { id: 1001, name: "Turkish for Beginners", heading: "Speak from day one", description: "<p>Learn <b>Turkish</b>.</p><script>steal()</script>", is_published: true, image_url: "https://cdn.teachable.test/tr.png" },
    { id: 1002, name: "Business English", heading: "Meetings and e-mails", description: "Plain text.\n\nTwo paragraphs.", is_published: true, image_url: null },
    { id: 1003, name: "Draft", heading: null, description: null, is_published: false, image_url: null },
    { id: 1004, name: "Free Starter", heading: null, description: "", is_published: true, image_url: "not a url" },
  ];
  const lectures = new Map<number, Lecture>([
    [
      111,
      lecture(111, "Greetings", 1, [
        { id: 5001, kind: "text", position: 1, url: null, text: '<p>Merhaba!</p><script>alert(1)</script><p onclick="x()">Hi <a href="javascript:alert(1)">there</a></p>' },
        { id: 9001, kind: "video", position: 2, name: "Greetings video", url: "https://cdn.filepicker.io/greetings.mp4", text: null },
        { id: 5002, kind: "image", position: 3, name: "Hello card", url: "https://cdn.teachable.test/hello.png", file_size: 2048, file_extension: "png" },
        { id: 5003, kind: "pdf_embed", position: 4, name: "Word list", url: "https://cdn.teachable.test/words.pdf", file_size: 4096, file_extension: "pdf" },
        { id: 5004, kind: "embed", position: 5, text: '<iframe src="https://www.youtube.com/embed/abc" width="560" height="315" allowfullscreen></iframe>' },
        { id: 5005, kind: "quiz", position: 6, quiz: { id: 77 } },
        { id: 5006, kind: "native_comments", position: 7 },
      ]),
    ],
    [112, lecture(112, "Small talk", 2, [{ id: 9002, kind: "video", position: 1, name: "Intro clip", url: "https://cdn.filepicker.io/intro.mp4" }, { id: 5007, kind: "text", position: 0, text: "<p>Small talk</p>" }])],
    [113, lecture(113, "Hidden", 3, [], false)],
    [121, lecture(121, "Unpublished section lecture", 1)],
    [131, lecture(131, "Counting", 1, [{ id: 5008, kind: "text", position: 1, text: "<p>Bir, iki, üç.</p>" }])],
    [211, lecture(211, "Small talk at work", 1, [{ id: 5009, kind: "text", position: 1, text: "<p>Weather and weekends.</p>" }])],
    [212, lecture(212, "Closing a meeting", 2)],
    [411, lecture(411, "Welcome", 1)],
  ]);
  const details = new Map<number, Record<string, unknown>>([
    [
      1001,
      {
        lecture_sections: [
          { id: 13, name: "Numbers", is_published: true, position: 2, lectures: [{ id: 131, position: 1, is_published: true }] },
          {
            id: 11,
            name: "Hello",
            is_published: true,
            position: 1,
            lectures: [
              { id: 112, position: 2, is_published: true },
              { id: 111, position: 1, is_published: true },
              { id: 113, position: 3, is_published: false },
            ],
          },
          { id: 12, name: "Coming soon", is_published: false, position: 3, lectures: [{ id: 121, position: 1, is_published: true }] },
        ],
        author_bio: { name: "Selin Arslan", bio: "Teaches Turkish.", profile_image_url: "https://cdn.teachable.test/selin.jpg", user_id: 7 },
      },
    ],
    [
      1002,
      {
        lecture_sections: [{ id: 21, name: "Meetings", is_published: true, position: 1, lectures: [{ id: 211, position: 1, is_published: true }, { id: 212, position: 2, is_published: true }] }],
        author_bio: { name: "Mark Lee", bio: null, profile_image_url: null, user_id: 8 },
      },
    ],
    [1003, { lecture_sections: [] }],
    [1004, { lecture_sections: [{ id: 41, name: "Start", is_published: true, position: 1, lectures: [{ id: 411, position: 1, is_published: true }] }], author_bio: null }],
  ]);
  const plans = [
    { id: 3000, name: "Free", price: 0, currency: "USD", course_id: 1001, frequency: { type: "free" } },
    { id: 3002, name: "Premium", price: 60000, currency: "usd", course_id: 1002, frequency: { type: "one_time" } },
    { id: 3001, name: "Standard", price: 45000, currency: "usd", course_id: 1002, frequency: { type: "one_time" } },
  ];
  const users: User[] = [
    {
      id: 501,
      name: "Ada Lovelace",
      email: "ada@example.com",
      src: null,
      courses: [{ course_id: 1002, enrolled_at: "2026-09-01T10:00:00.000Z", is_active_enrollment: true, completed_at: null, percent_complete: 50 }],
    },
  ];
  const completed = new Map<string, Set<number>>([["501:1002", new Set([211])]]);
  const state = {
    down: false,
    pageSize: 2,
    calls: [] as string[],
    bodies: [] as { path: string; body: unknown }[],
    courses,
    lectures,
    details,
    plans,
    users,
    completed,
    rateLimited: false,
  };

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const page = <T,>(field: string, items: T[], url: URL) => {
    const n = Number(url.searchParams.get("page") ?? 1);
    const per = state.pageSize;
    const pages = Math.max(1, Math.ceil(items.length / per));
    return json({ [field]: items.slice((n - 1) * per, n * per), meta: { total: items.length, page: n, from: (n - 1) * per + 1, to: n * per, per_page: per, number_of_pages: pages } });
  };
  const publishedLectures = (courseId: number) =>
    ((state.details.get(courseId)?.lecture_sections ?? []) as { is_published: boolean; lectures: { id: number; is_published: boolean }[] }[])
      .filter((s) => s.is_published)
      .flatMap((s) => s.lectures.filter((l) => l.is_published).map((l) => l.id));

  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const path = url.pathname.replace(/^\/v1/, "");
    state.calls.push(`${method} ${path}`);
    if (state.down) throw new TypeError("fetch failed");
    if (url.origin !== "https://developers.teachable.com") return json({ error: "Not found" }, 404);
    if (new Headers(init?.headers).get("apikey") !== API_KEY) return json({ error: "Unauthorized" }, 401);
    if (state.rateLimited) return new Response("API rate limit exceeded", { status: 429, headers: { "RateLimit-Reset": "30" } });
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    if (body) state.bodies.push({ path: `${method} ${path}`, body });
    let m: RegExpExecArray | null;

    if (method === "GET" && path === "/courses") {
      // Lists the unpublished course too, as Teachable may despite the filter: the connector checks the flag.
      return page("courses", state.courses, url);
    }
    if (method === "GET" && (m = /^\/courses\/(\d+)$/.exec(path))) {
      const course = state.courses.find((c) => c.id === Number(m![1]));
      if (!course) return json({ error: "Not found" }, 404);
      return json({ course: { ...course, ...state.details.get(course.id) } });
    }
    if (method === "GET" && (m = /^\/courses\/(\d+)\/lectures\/(\d+)$/.exec(path))) {
      const found = state.lectures.get(Number(m[2]));
      return found ? json({ lecture: { ...found, lecture_section_id: 1 } }) : json({ error: "Not found" }, 404);
    }
    if (method === "GET" && (m = /^\/courses\/(\d+)\/lectures\/(\d+)\/videos\/(\d+)$/.exec(path))) {
      if (m[3] !== "9001") return json({ error: "Not found" }, 404);
      return json({
        video: {
          id: 9001,
          video_asset: { url: STREAM, content_type: "application/x-mpegURL" },
          status: "READY",
          url_thumbnail: "https://img-akm.play.hotmart.com/video/abc/thumbnail.jpg",
          media_type: "VIDEO",
          media_duration: 312,
        },
      });
    }
    if (method === "GET" && path === "/pricing_plans") return page("pricing_plans", state.plans, url);
    if (method === "GET" && path === "/users") {
      const email = url.searchParams.get("email");
      const found = state.users.filter((u) => !email || u.email === email.toLowerCase());
      return json({ users: found.map(({ id, name, email }) => ({ id, name, email })), meta: { total: found.length, page: 1, number_of_pages: 1 } });
    }
    if (method === "POST" && path === "/users") {
      if (state.users.some((u) => u.email === body.email)) return json({ error: "Email has already been taken" }, 422);
      const user: User = { id: 900 + state.users.length, name: body.name, email: body.email, src: body.src ?? null, courses: [] };
      state.users.push(user);
      return json({ id: user.id, name: user.name, email: user.email });
    }
    if (method === "GET" && (m = /^\/users\/(\d+)$/.exec(path))) {
      const user = state.users.find((u) => u.id === Number(m![1]));
      return user ? json({ user: { ...user, role: "student", tags: [] } }) : json({ error: "Not found" }, 404);
    }
    if (method === "POST" && path === "/enroll") {
      const user = state.users.find((u) => u.id === body.user_id);
      if (!user || !state.courses.some((c) => c.id === body.course_id)) return json({ error: "Not found" }, 404);
      if (user.courses.some((c) => c.course_id === body.course_id)) return json({ error: "Already enrolled" }, 422);
      user.courses.push({ course_id: body.course_id, enrolled_at: "2026-10-12T10:00:05.000Z", is_active_enrollment: true, completed_at: null, percent_complete: 0 });
      return new Response(null, { status: 204 });
    }
    if (method === "POST" && (m = /^\/courses\/(\d+)\/lectures\/(\d+)\/mark_complete$/.exec(path))) {
      const courseId = Number(m[1]);
      const user = state.users.find((u) => u.id === body.user_id);
      if (!user) return json({ error: "Not found" }, 404);
      const key = `${user.id}:${courseId}`;
      const done = state.completed.get(key) ?? new Set<number>();
      done.add(Number(m[2]));
      state.completed.set(key, done);
      const all = publishedLectures(courseId);
      const enrollment = user.courses.find((c) => c.course_id === courseId);
      if (enrollment) {
        enrollment.percent_complete = Math.round((all.filter((id) => done.has(id)).length / all.length) * 1000) / 10;
        if (enrollment.percent_complete >= 100) enrollment.completed_at = "2026-10-12T11:00:00.000Z";
      }
      return new Response(null, { status: 204 });
    }
    if (method === "GET" && (m = /^\/courses\/(\d+)\/progress$/.exec(path))) {
      const courseId = Number(m[1]);
      const userId = Number(url.searchParams.get("user_id"));
      const done = state.completed.get(`${userId}:${courseId}`) ?? new Set<number>();
      const sections = ((state.details.get(courseId)?.lecture_sections ?? []) as { id: number; name: string; lectures: { id: number }[] }[]).map((s) => ({
        id: s.id,
        name: s.name,
        lectures: s.lectures.map((l) => ({ id: l.id, name: state.lectures.get(l.id)?.name, is_completed: done.has(l.id), completed_at: done.has(l.id) ? "2026-10-12T10:30:00.000Z" : null })),
      }));
      return json({ course_progress: { id: 1, certificate: {}, completed_at: null, enrolled_at: null, lecture_sections: sections, percent_complete: 0 }, meta: { total: 0, page: 1, from: 1, to: 1, per_page: 0, number_of_pages: 1 } });
    }
    return json({ error: "Not found" }, 404);
  }) as typeof fetch;

  return { state, fetcher };
}

describe("Teachable school addresses", () => {
  it("turn what a client typed into the school's host", () => {
    expect(normalizeSchool("rose-academy")).toBe(SCHOOL);
    expect(normalizeSchool(" https://Rose-Academy.teachable.com/admin-app/courses ")).toBe(SCHOOL);
    expect(normalizeSchool("learn.rose.example/")).toBe("learn.rose.example");
    expect(normalizeSchool("sso.teachable.com")).toBeNull();
    expect(normalizeSchool("not a school")).toBeNull();
    expect(normalizeSchool("")).toBeNull();
    expect(TEACHABLE_PLATFORM.normalize({ school: "rose-academy", apiKey: ` ${API_KEY} ` })).toEqual({ values: { school: SCHOOL, apiKey: API_KEY } });
    expect(TEACHABLE_PLATFORM.normalize({ school: "teachable.com", apiKey: "two words" })).toEqual({
      errors: { school: expect.any(String), apiKey: expect.any(String) },
    });
    expect(TEACHABLE_PLATFORM).toMatchObject({ id: "teachable", name: "Teachable", appType: "lms" });
    expect(TEACHABLE_PLATFORM.fields.map((f) => [f.name, f.secret])).toEqual([
      ["school", false],
      ["apiKey", true],
    ]);
  });

  it("clean lesson HTML", () => {
    expect(cleanHtml('<p style="color:red" onmouseover="x()">A<img src="data:text/html;base64,xx" alt="b"></p><style>p{}</style>')).toBe('<p style="color:red">A<img alt="b"></p>');
    expect(cleanHtml('<a href=" jav&#x61;script:alert(1)">x</a><iframe srcdoc="<script>">')).toBe("<a>x</a><iframe>");
  });
});

describe("Teachable on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let server: ReturnType<typeof school>;
  let connector: TeachableConnector;

  beforeEach(async () => {
    clearTeachableCache();
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "lms");
    server = school();
    app = {
      ...base,
      backend: "hosted",
      appName: "Rose Academy",
      websiteDoneAt: NOW,
      connector: platformConnectorConfig(base.id, TEACHABLE_PLATFORM, { school: SCHOOL, apiKey: API_KEY }, KEY),
    };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
    connector = new TeachableConnector({ school: SCHOOL, apiKey: API_KEY }, { appId: app.id, store, fetcher: server.fetcher });
  });

  afterEach(() => {
    vi.useRealTimers();
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

  async function send(
    method: string,
    route: string,
    options: { body?: unknown; token?: string | null; query?: Record<string, string>; params?: string[] } = {},
  ): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    return handleHosted(context(), {
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
    });
  }

  async function call(...args: Parameters<typeof send>): Promise<HostedResult> {
    const result = await send(...args);
    expectContract(args[0], args[1], result);
    return result;
  }

  async function signUp(phone = "5321234567", name = "Deniz Aksoy") {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+90${phone}`)!, device: DEVICE } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: DEVICE } });
    return registered.body as { access_token: string; user: { id: number } };
  }

  it("is built from the saved keys, and checks them", async () => {
    const built = platformConnector(app, KEY, { store }, server.fetcher)!;
    expect(built).toBeInstanceOf(TeachableConnector);
    expect(await built.check()).toBe(SCHOOL);
    expect(server.state.calls).toContain("GET /courses");
    const wrong = new TeachableConnector({ school: SCHOOL, apiKey: "revoked" }, { appId: app.id, store, fetcher: server.fetcher });
    await expect(wrong.check()).rejects.toBeInstanceOf(ConnectorError);
  });

  it("adds the school to the config, never selling paid courses", async () => {
    const android = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as Record<string, Record<string, unknown>>;
    expect(android.features).toMatchObject({
      lms: "teachable",
      lms_version: "v1",
      pro: false,
      certificates: false,
      quizzes: false,
      wishlist: false,
      reviews: false,
      qna: false,
      orders: false,
    });
    // Paid courses are sold on the school's website only, on every platform.
    expect(android.purchases).toEqual({ enroll_button: false, free_enrollment: true });
    const ios = (await call("GET", "/config", { query: { platform: "ios", app_version: "1.0.0" } })).body as Record<string, Record<string, unknown>>;
    expect(ios.purchases).toEqual({ enroll_button: false, free_enrollment: true });
  });

  it("lists published courses with their prices, and caches the catalog", async () => {
    expect((await call("GET", "/categories")).body).toEqual({ items: [] });
    const all = (await call("GET", "/courses")).body as { total: number; items: { id: number; title: string; image_url: string | null }[] };
    expect(all.items.map((c) => c.title)).toEqual(["Free Starter", "Business English", "Turkish for Beginners"]);
    expect(all.items[0]!.image_url).toBeNull();
    expect(all).toMatchObject({ total: 3, total_pages: 1 });
    // Every page of the course list and the plans was read (two items per page here).
    expect(server.state.calls.filter((c) => c === "GET /courses")).toHaveLength(2);
    expect(server.state.calls.filter((c) => c === "GET /pricing_plans")).toHaveLength(2);

    expect((await call("GET", "/courses", { query: { price: "free" } })).body).toMatchObject({
      total: 2,
      items: [{ id: 1004, price: { is_free: true, amount: null } }, { id: 1001, price: { is_free: true }, lesson_count: 3, instructor: { id: 7, name: "Selin Arslan" } }],
    });
    expect((await call("GET", "/courses", { query: { price: "paid" } })).body).toMatchObject({
      total: 1,
      items: [{ id: 1002, price: { is_free: false, amount: "450.00", currency: "USD", formatted: "$450.00" }, lesson_count: 2 }],
    });
    expect((await call("GET", "/courses", { query: { orderby: "title" } })).body).toMatchObject({
      items: [{ title: "Business English" }, { title: "Free Starter" }, { title: "Turkish for Beginners" }],
    });
    expect((await call("GET", "/courses", { query: { search: "BUSINESS" } })).body).toMatchObject({ total: 1, items: [{ id: 1002 }] });
    expect((await call("GET", "/courses", { query: { category: "4" } })).body).toMatchObject({ total: 0, items: [] });
    expect((await call("GET", "/courses", { query: { per_page: "2", page: "2" } })).body).toMatchObject({ page: 2, total_pages: 2, items: [{ id: 1001 }] });
    // Cached for 10 minutes: one list, one plan list and one detail per course.
    expect(server.state.calls.filter((c) => c === "GET /courses")).toHaveLength(2);
    expect(server.state.calls.filter((c) => c === "GET /courses/1001")).toHaveLength(1);

    const home = (await call("GET", "/home")).body as { sections: { type: string; courses?: unknown[] }[] };
    expect(home.sections.map((s) => s.type)).toEqual(["latest_courses"]);
    expect(home.sections[0]!.courses).toHaveLength(3);
  });

  it("shows the course page's button for each case", async () => {
    const free = await call("GET", "/courses/{course_id}", { params: ["1001"], query: { platform: "ios" } });
    expect(free.body).toMatchObject({
      id: 1001,
      title: "Turkish for Beginners",
      purchase: { action: "enroll_free" },
      lesson_count: 3,
      description_html: "<p>Learn <b>Turkish</b>.</p>",
      instructor: { name: "Selin Arslan", avatar_url: "https://cdn.teachable.test/selin.jpg", bio: "Teaches Turkish." },
      categories: [],
    });
    const paid = await call("GET", "/courses/{course_id}", { params: ["1002"], query: { platform: "android" } });
    expect(paid.body).toMatchObject({ purchase: { action: "none" }, price: { is_free: false, formatted: "$450.00" }, description_html: "<p>Plain text.</p><p>Two paragraphs.</p>", instructor: { name: "Mark Lee" } });
    expect((await call("GET", "/courses/{course_id}", { params: ["1002"], query: { platform: "ios" } })).body).toMatchObject({ purchase: { action: "none" } });
    // No plans at all counts as free.
    expect((await call("GET", "/courses/{course_id}", { params: ["1004"], query: { platform: "ios" } })).body).toMatchObject({ purchase: { action: "enroll_free" } });
    expect((await call("GET", "/courses/{course_id}", { params: ["1003"], query: { platform: "android" } })).status).toBe(404);
    expect((await call("GET", "/courses/{course_id}", { params: ["9999"], query: { platform: "android" } })).status).toBe(404);
    expect((await call("GET", "/courses/{course_id}/curriculum", { params: ["1003"] })).status).toBe(404);
  });

  it("lists the published sections and lectures, locked until enrolling", async () => {
    const curriculum = await call("GET", "/courses/{course_id}/curriculum", { params: ["1001"] });
    expect(curriculum.body).toEqual({
      topics: [
        {
          id: 11,
          title: "Hello",
          items: [
            { id: 111, type: "lesson", title: "Greetings", duration_minutes: null, question_count: null, preview: false, locked: true, completed: false },
            { id: 112, type: "lesson", title: "Small talk", duration_minutes: null, question_count: null, preview: false, locked: true, completed: false },
          ],
        },
        { id: 13, title: "Numbers", items: [{ id: 131, type: "lesson", title: "Counting", duration_minutes: null, question_count: null, preview: false, locked: true, completed: false }] },
      ],
    });
    // Lecture titles are cached with the curriculum.
    await call("GET", "/courses/{course_id}/curriculum", { params: ["1001"] });
    expect(server.state.calls.filter((c) => c === "GET /courses/1001/lectures/111")).toHaveLength(1);
  });

  it("enrolls in free courses, opens lessons and tracks progress in Teachable", async () => {
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["111"] })).body).toMatchObject({ code: "not_enrolled" });
    expect((await call("POST", "/courses/{course_id}/enroll", { params: ["1001"] })).status).toBe(401);

    const { access_token: token, user } = await signUp();
    // The student has no e-mail: Teachable gets the stable address made from the user and app.
    const email = `u${user.id}.${app.id.slice(0, 8)}@students.yallapp.com.tr`;
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["111"], token })).body).toMatchObject({ code: "not_enrolled" });
    expect(server.state.users.at(-1)).toMatchObject({ email, name: "Deniz Aksoy", src: "yallapp" });
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["113"], token })).status).toBe(404);
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["121"], token })).status).toBe(404);

    expect((await call("POST", "/courses/{course_id}/enroll", { params: ["1002"], token })).body).toMatchObject({ code: "purchase_required" });
    const enrolled = await call("POST", "/courses/{course_id}/enroll", { params: ["1001"], token });
    expect(enrolled.body).toEqual({ course_id: 1001, enrolled_at: "2026-10-12T10:00:05.000Z" });
    const studentId = server.state.users.at(-1)!.id;
    expect(server.state.bodies).toContainEqual({ path: "POST /enroll", body: { user_id: studentId, course_id: 1001 } });
    expect((await call("POST", "/courses/{course_id}/enroll", { params: ["1001"], token })).status).toBe(200);
    expect(server.state.bodies.filter((b) => b.path === "POST /enroll")).toHaveLength(1);
    expect((await call("GET", "/courses/{course_id}", { params: ["1001"], token, query: { platform: "android" } })).body).toMatchObject({
      enrolled: true,
      purchase: { action: "continue" },
    });

    const lesson = (await call("GET", "/lessons/{lesson_id}", { params: ["111"], token })).body as Record<string, unknown>;
    expect(lesson).toMatchObject({
      id: 111,
      course_id: 1001,
      title: "Greetings",
      render_mode: "native",
      webview_url: null,
      embeds: [{ placeholder: "yallapp-embed-1", src: "https://www.youtube.com/embed/abc", provider: "youtube", width: "560", height: "315", aspect_ratio: 1.7778, allow_fullscreen: true }],
      video: {
        source: "upload",
        url: STREAM,
        expires_at: "2026-10-12T10:08:20.000Z",
        embed_html: null,
        duration_seconds: 312,
        poster_url: "https://img-akm.play.hotmart.com/video/abc/thumbnail.jpg",
      },
      attachments: [],
      completed: false,
      position_seconds: 0,
      previous_id: null,
      next_id: 112,
    });
    const html = lesson.html as string;
    expect(html).toContain("<p>Merhaba!</p>");
    expect(html).toContain('<p>Hi <a>there</a></p>');
    expect(html).toContain('<p><img src="https://cdn.teachable.test/hello.png" alt="Hello card"></p>');
    expect(html).toContain('<p><a href="https://cdn.teachable.test/words.pdf">Word list</a></p>');
    expect(html).toContain('<div data-yallapp-embed="yallapp-embed-1"></div>');
    expect(html).toContain(`<a href="https://${SCHOOL}/courses/1001/lectures/111">Take this quiz on the school's website</a>`);
    expect(html).not.toMatch(/script|onclick|javascript:|<iframe/);
    // The stream is signed and short-lived: it's asked for on every view.
    await call("GET", "/lessons/{lesson_id}", { params: ["111"], token });
    expect(server.state.calls.filter((c) => c === "GET /courses/1001/lectures/111/videos/9001")).toHaveLength(2);

    // Without a stream, the video is a link to the lecture on the school.
    const second = (await call("GET", "/lessons/{lesson_id}", { params: ["112"], token })).body as Record<string, unknown>;
    expect(second).toMatchObject({ previous_id: 111, next_id: 131, embeds: [] });
    expect(second.video).toBeUndefined();
    expect(second.html).toBe(`<p>Small talk</p>\n<p><a href="https://${SCHOOL}/courses/1001/lectures/112">Watch “Intro clip” on the school's website</a></p>`);

    expect((await call("PUT", "/lessons/{lesson_id}/progress", { params: ["111"], token, body: { position_seconds: 95, watched_percent: 20 } })).status).toBe(204);
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["111"], token })).body).toMatchObject({ position_seconds: 95, completed: false });
    expect((await call("PUT", "/lessons/{lesson_id}/progress", { params: ["211"], token, body: { position_seconds: 5, watched_percent: 1 } })).status).toBe(403);

    expect((await call("POST", "/lessons/{lesson_id}/complete", { params: ["111"], token })).body).toEqual({
      course_id: 1001,
      completed_items: 1,
      total_items: 3,
      percent: 33,
      course_completed: false,
    });
    expect(server.state.bodies).toContainEqual({ path: "POST /courses/1001/lectures/111/mark_complete", body: { user_id: studentId } });
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["111"], token })).body).toMatchObject({ completed: true });
    const curriculum = (await call("GET", "/courses/{course_id}/curriculum", { params: ["1001"], token })).body;
    expect(curriculum).toMatchObject({ topics: [{ items: [{ id: 111, locked: false, completed: true }, { id: 112, locked: false, completed: false }] }, {}] });

    const mine = (await call("GET", "/me/courses", { token })).body;
    expect(mine).toMatchObject({ total: 1, items: [{ course: { id: 1001, enrolled: true }, progress: { course_id: 1001, percent: 33, completed_items: 1, total_items: 3, course_completed: false } }] });
    const home = (await call("GET", "/home", { token })).body as { sections: Record<string, unknown>[] };
    expect(home.sections[0]).toMatchObject({ type: "continue_learning", course: { course: { id: 1001 }, next_item: { id: 112, title: "Small talk", locked: false } } });

    await call("POST", "/lessons/{lesson_id}/complete", { params: ["112"], token });
    expect((await call("POST", "/lessons/{lesson_id}/complete", { params: ["131"], token })).body).toMatchObject({ percent: 100, course_completed: true });
    expect((await call("GET", "/me/courses", { token, query: { status: "completed" } })).body).toMatchObject({ total: 1, items: [{ progress: { percent: 100, course_completed: true } }] });
    expect((await call("GET", "/me/courses", { token })).body).toMatchObject({ total: 0 });
    // Not in the contract (as with the plugin): an unknown status is refused.
    expect((await send("GET", "/me/courses", { token, query: { status: "all" } })).status).toBe(400);

    // Teachable doesn't make a second account for the same student.
    expect(server.state.calls.filter((c) => c === "POST /users")).toHaveLength(1);
  });

  it("never gives a student another student's Teachable account by the e-mail they typed", async () => {
    // Ada (ada@example.com) bought Business English on the school's website.
    const { access_token: token, user } = await signUp("5329876543", "Mallory");
    expect((await call("PATCH", "/me", { token, body: { email: "Ada@Example.com" } })).status).toBe(200);
    expect((await call("GET", "/me/courses", { token })).body).toMatchObject({ total: 0, items: [] });
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["211"], token })).body).toMatchObject({ code: "not_enrolled" });
    expect((await call("POST", "/lessons/{lesson_id}/complete", { params: ["212"], token })).body).toMatchObject({ code: "not_enrolled" });
    expect((await call("GET", "/courses/{course_id}", { params: ["1002"], token, query: { platform: "android" } })).body).toMatchObject({ enrolled: false });
    // Teachable was only ever asked for the student's own stable address.
    const email = `u${user.id}.${app.id.slice(0, 8)}@students.yallapp.com.tr`;
    expect(server.state.users.at(-1)).toMatchObject({ email, name: "Mallory", src: "yallapp" });
    expect(server.state.users.find((u) => u.id === 501)).toMatchObject({ email: "ada@example.com", courses: [{ course_id: 1002, percent_complete: 50 }] });
    expect(server.state.calls.filter((c) => c.startsWith("GET /users/"))).not.toContain("GET /users/501");
    expect(server.state.bodies.some((b) => JSON.stringify(b.body).toLowerCase().includes("ada@example.com"))).toBe(false);
  });

  it("doesn't sell courses in the app on any platform", async () => {
    expect((await call("POST", "/auth/checkout-link", { query: { platform: "android" }, body: { course_id: 1002 } })).status).toBe(401);
    const { access_token: token } = await signUp();
    for (const platform of ["android", "ios"]) {
      expect((await call("POST", "/auth/checkout-link", { query: { platform }, token, body: { course_id: 1002 } })).body).toEqual({
        code: "purchase_not_allowed",
        message: "This course is sold on the school's website.",
      });
    }
  });

  it("has no wishlist or certificates", async () => {
    expect((await call("GET", "/me/wishlist")).status).toBe(401);
    const { access_token: token } = await signUp();
    expect((await call("GET", "/me/wishlist", { token })).body).toEqual({ items: [] });
    expect((await call("GET", "/me/certificates", { token })).body).toEqual({ items: [] });
    expect((await call("PUT", "/me/wishlist/{course_id}", { params: ["1001"], token })).body).toMatchObject({ code: "feature_disabled" });
    expect((await send("GET", "/quizzes/5", { token })).status).toBe(404);
  });

  it("answers 503 when the school can't be reached", async () => {
    server.state.down = true;
    const courses = await send("GET", "/courses");
    // Unlike Store and Bookings routes, the contract lists no 503 for course routes, so the shape is checked here.
    expect(courses).toEqual({ status: 503, body: { code: "lms_unavailable", message: expect.stringMatching(/school can't be reached/) } });
    // The config doesn't need the school.
    expect((await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).status).toBe(200);
    server.state.down = false;
    expect((await call("GET", "/courses")).status).toBe(200);
  });

  it("keeps to Teachable's 100 requests a minute", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    // A course with 120 lectures: titles need one request each.
    server.state.courses.push({ id: 1005, name: "Big Course", heading: null, description: "", is_published: true, image_url: null });
    const ids = Array.from({ length: 120 }, (_, i) => 5000 + i);
    server.state.details.set(1005, { lecture_sections: [{ id: 51, name: "All", is_published: true, position: 1, lectures: ids.map((id, i) => ({ id, position: i, is_published: true })) }] });
    for (const [i, id] of ids.entries()) server.state.lectures.set(id, lecture(id, `Part ${i + 1}`, i));

    const titles = async () => {
      const body = (await call("GET", "/courses/{course_id}/curriculum", { params: ["1005"] })).body as { topics: { items: { title: string }[] }[] };
      return body.topics[0]!.items.map((item) => item.title);
    };
    const first = await titles();
    expect(server.state.calls.length).toBeLessThanOrEqual(100 - 25);
    expect(first[0]).toBe("Part 1");
    expect(first.at(-1)).toBe("Lesson 120");
    const loaded = first.filter((t) => t.startsWith("Part")).length;

    // Students' own actions still have requests left this minute.
    expect((await call("GET", "/courses/{course_id}", { params: ["1001"], query: { platform: "android" } })).status).toBe(200);

    // A minute later the rest of the titles load.
    vi.setSystemTime(new Date(NOW.getTime() + 61_000));
    const second = await titles();
    expect(second.filter((t) => t.startsWith("Part")).length).toBeGreaterThan(loaded);
    vi.setSystemTime(new Date(NOW.getTime() + 122_000));
    expect(await titles()).toEqual(ids.map((_, i) => `Part ${i + 1}`));
  });

  it("stops at the limit and waits when Teachable answers 429", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const client = new TeachableClient({ school: "limits.teachable.com", apiKey: API_KEY }, server.fetcher);
    for (let i = 0; i < 100; i++) await client.request("GET", "/pricing_plans");
    const before = server.state.calls.length;
    await expect(client.request("GET", "/pricing_plans")).rejects.toBeInstanceOf(ConnectorError);
    expect(server.state.calls.length).toBe(before);
    vi.setSystemTime(new Date(NOW.getTime() + 60_001));
    await client.request("GET", "/pricing_plans");

    server.state.rateLimited = true;
    await expect(client.request("GET", "/pricing_plans")).rejects.toBeInstanceOf(ConnectorError);
    server.state.rateLimited = false;
    // RateLimit-Reset said 30 seconds.
    await expect(client.request("GET", "/pricing_plans")).rejects.toBeInstanceOf(ConnectorError);
    vi.setSystemTime(new Date(NOW.getTime() + 60_001 + 30_001));
    await expect(client.request("GET", "/pricing_plans")).resolves.toMatchObject({ pricing_plans: expect.any(Array) });
  });
});
