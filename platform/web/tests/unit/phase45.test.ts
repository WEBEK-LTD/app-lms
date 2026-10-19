import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { downloadsChoice, downloadsFormValue, hostedDownloadsOn, isVideoFile, offersDownloads, parseDownloadsChoice } from "@/lib/courses/downloads";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_HOSTED_SETTINGS, type App, type CourseSetup } from "@/lib/data/types";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { PLAN_INFO, type PlanInfo } from "@/lib/plans";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-45", platform: "android", name: "Pixel 8", app_version: "1.0.0" };

function academy(): CourseSetup {
  return {
    currency: "TRY",
    categories: [],
    courses: [
      {
        id: 10,
        title: "Turkish for Beginners",
        description: "Speak from day one.",
        imageAssetId: null,
        priceCents: 0,
        categoryIds: [],
        instructorName: "Selin Arslan",
        level: null,
        active: true,
        createdAt: "2026-10-01T10:00:00.000Z",
        topics: [
          {
            id: 11,
            title: "Hello",
            lessons: [
              { id: 12, title: "Greetings", videoUrl: "https://cdn.lale.test/videos/greetings.mp4", text: "Merhaba!", durationMinutes: 8, preview: false },
              { id: 13, title: "Numbers", videoUrl: null, text: "Bir, iki, üç.", durationMinutes: 5, preview: false },
              { id: 14, title: "On YouTube", videoUrl: "https://www.youtube.com/watch?v=abc123", text: "", durationMinutes: 4, preview: false },
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
        categoryIds: [],
        instructorName: null,
        level: null,
        active: true,
        createdAt: "2026-10-05T10:00:00.000Z",
        topics: [{ id: 21, title: "Meetings", lessons: [{ id: 22, title: "Small talk", videoUrl: "https://cdn.lale.test/a.mp4", text: "", durationMinutes: 10, preview: false }] }],
      },
    ],
    nextId: 40,
  };
}

describe("offline downloads: the owner's choice and the plan (45)", () => {
  const base = { appType: "lms" as const, backend: "hosted" as const, connector: { kind: "courses" as const }, hostedSettings: null };

  it("comes with offline mode in the plan, on by default for courses managed in Yallapp", () => {
    expect(hostedDownloadsOn(base, PLAN_INFO.growth)).toBe(true);
    expect(hostedDownloadsOn(base, PLAN_INFO.starter)).toBe(false);
    expect(hostedDownloadsOn(base, null)).toBe(false);
    expect(hostedDownloadsOn({ ...base, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, offlineDownloads: false } }, PLAN_INFO.pro)).toBe(false);
    // Phase 41 lists "Offline mode" on Growth and up: the same flag.
    expect(["starter", "growth", "pro", "business"].map((p) => PLAN_INFO[p as keyof typeof PLAN_INFO].features.includes("offline_downloads"))).toEqual([false, true, true, true]);
  });

  it("reads and parses the Courses page's choice", () => {
    const wordpress = { appType: "lms" as const, backend: "wordpress" as const, connector: null, hostedSettings: null };
    expect(downloadsChoice(wordpress)).toBeNull();
    expect(downloadsFormValue(wordpress)).toBe("plugin");
    expect(downloadsFormValue(base)).toBe("on");
    expect(downloadsFormValue({ ...base, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, offlineDownloads: false } })).toBe("off");
    expect(parseDownloadsChoice("on", wordpress)).toBe(true);
    expect(parseDownloadsChoice("off", base)).toBe(false);
    expect(parseDownloadsChoice("plugin", wordpress)).toBeNull();
    // Courses managed in Yallapp have no plugin to follow.
    expect(parseDownloadsChoice("plugin", base)).toBeUndefined();
    expect(parseDownloadsChoice("maybe", wordpress)).toBeUndefined();
  });

  it("is offered to academies on WordPress or managed in Yallapp, not to connected schools or other app types", () => {
    expect(offersDownloads(base)).toBe(true);
    expect(offersDownloads({ appType: "lms", backend: "wordpress", connector: null })).toBe(true);
    expect(offersDownloads({ appType: "lms", backend: "hosted", connector: { kind: "platform", platform: "teachable", settings: {}, secretsEncrypted: "" } })).toBe(false);
    expect(offersDownloads({ appType: "store", backend: "wordpress", connector: null })).toBe(false);
  });

  it("saves video files, never video sites' pages", () => {
    expect(isVideoFile("https://cdn.lale.test/videos/greetings.mp4")).toBe(true);
    expect(isVideoFile("https://cdn.lale.test/a.MOV?token=1")).toBe(true);
    expect(isVideoFile("https://www.youtube.com/watch?v=abc")).toBe(false);
    expect(isVideoFile("https://vimeo.com/1234")).toBe(false);
    expect(isVideoFile("https://iframe.mediadelivery.net/embed/1/abc")).toBe(false);
    expect(isVideoFile("ftp://cdn.lale.test/a.mp4")).toBe(false);
    expect(isVideoFile("not a url")).toBe(false);
  });
});

describe("offline lessons and a finished course on the hosted API (45)", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let plan: PlanInfo | null;
  let downloads: boolean;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = { ...newApp(client.id, null, NOW, "lms"), backend: "hosted", appName: "Lale Academy", websiteDoneAt: NOW, connector: { kind: "courses" }, courseSetup: academy() };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
    plan = PLAN_INFO.growth;
    downloads = true;
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
    plan,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: new CoursesConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test", downloads }),
  });

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

  async function signUp() {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone: "5321234500" } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get("+905321234500")!, device: DEVICE } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name: "Deniz Aksoy", device: DEVICE } });
    return registered.body as { access_token: string; user: { id: number } };
  }

  const config = async () => (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { features: Record<string, unknown> };

  it("says in the config whether lessons can be saved: the plan and the owner's choice", async () => {
    expect((await config()).features).toMatchObject({ offline: true, downloads: true });
    plan = PLAN_INFO.starter;
    expect((await config()).features).toMatchObject({ offline: false, downloads: false });
    plan = PLAN_INFO.pro;
    downloads = false;
    expect((await config()).features).toMatchObject({ offline: true, downloads: false });
  });

  it("gives an enrolled student the lesson's video file; a video site's lesson needs the internet", async () => {
    const { access_token: token } = await signUp();
    expect((await call("POST", "/lessons/{lesson_id}/download", { params: ["12"] })).status).toBe(401);
    expect((await call("POST", "/lessons/{lesson_id}/download", { params: ["12"], token })).body).toMatchObject({ code: "not_enrolled" });
    await call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });

    expect((await call("GET", "/lessons/{lesson_id}", { params: ["12"], token })).body).toMatchObject({ offline: { available: true, reason: null } });
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["13"], token })).body).toMatchObject({ offline: { available: true } });
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["14"], token })).body).toMatchObject({ offline: { available: false, reason: "video_site" } });

    const saved = await call("POST", "/lessons/{lesson_id}/download", { params: ["12"], token });
    expect(saved.body).toMatchObject({
      lesson_id: 12,
      course_id: 10,
      files: [{ kind: "video", url: "https://cdn.lale.test/videos/greetings.mp4", source_url: null }],
      keep_days: 30,
    });
    expect(new Date((saved.body as { expires_at: string }).expires_at).getTime() - now.getTime()).toBe(15 * 60_000);
    // A text lesson has no files: the app keeps the lesson itself.
    expect((await call("POST", "/lessons/{lesson_id}/download", { params: ["13"], token })).body).toMatchObject({ files: [] });
    const site = await call("POST", "/lessons/{lesson_id}/download", { params: ["14"], token });
    expect(site.status).toBe(409);
    expect(site.body).toMatchObject({ code: "not_downloadable", details: { reason: "video_site" } });
    expect((await call("POST", "/lessons/{lesson_id}/download", { params: ["999"], token })).status).toBe(404);
  });

  it("refuses downloads when they're off, and the lesson says why", async () => {
    downloads = false;
    const { access_token: token } = await signUp();
    await call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    expect((await call("GET", "/lessons/{lesson_id}", { params: ["12"], token })).body).toMatchObject({ offline: { available: false, reason: "disabled" } });
    expect((await call("POST", "/lessons/{lesson_id}/download", { params: ["12"], token })).body).toMatchObject({ code: "feature_disabled" });
  });

  it("checks which saved lessons the student may keep: access ending refuses them", async () => {
    const { access_token: token } = await signUp();
    await call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    const check = (ids: unknown) => call("POST", "/me/downloads/check", { token, body: { lesson_ids: ids } });
    expect((await check([12, 13, 22, 999])).body).toEqual({ allowed: [12, 13], refused: [22, 999], downloads: true, keep_days: 30 });
    expect((await check("12")).status).toBe(400);
    expect((await check(Array.from({ length: 501 }, (_, i) => i))).status).toBe(400);
    expect((await call("POST", "/me/downloads/check", { body: { lesson_ids: [12] } })).status).toBe(401);

    // The owner hides the course: its lessons are refused.
    app = { ...app, courseSetup: { ...academy(), courses: academy().courses.map((c) => (c.id === 10 ? { ...c, active: false } : c)) } };
    expect((await check([12, 13])).body).toMatchObject({ allowed: [], refused: [12, 13] });
    // A lesson removed from the course too.
    app = { ...app, courseSetup: { ...academy(), courses: academy().courses.map((c) => (c.id === 10 ? { ...c, topics: [{ ...c.topics[0]!, lessons: c.topics[0]!.lessons.slice(1) }] } : c)) } };
    expect((await check([12, 13])).body).toMatchObject({ allowed: [13], refused: [12] });
    // Downloads turned off: everything goes.
    app = { ...app, courseSetup: academy() };
    downloads = false;
    expect((await check([12, 13])).body).toEqual({ allowed: [], refused: [12, 13], downloads: false, keep_days: 30 });
  });

  it("says a finished course is completed, with the date, on the course page and in My courses", async () => {
    const { access_token: token } = await signUp();
    expect((await call("GET", "/courses/{course_id}", { params: ["10"] })).body).not.toHaveProperty("progress");
    await call("POST", "/courses/{course_id}/enroll", { params: ["10"], token });
    expect((await call("GET", "/courses/{course_id}", { params: ["10"], token })).body).toMatchObject({
      progress: { course_completed: false, completed_at: null, percent: 0 },
      certificate_url: null,
    });
    for (const id of ["12", "13"]) await call("POST", "/lessons/{lesson_id}/complete", { params: [id], token });
    now = new Date(now.getTime() + 600_000);
    const last = await call("POST", "/lessons/{lesson_id}/complete", { params: ["14"], token });
    expect(last.body).toEqual({ course_id: 10, completed_items: 3, total_items: 3, percent: 100, course_completed: true, completed_at: now.toISOString() });
    expect((await call("GET", "/courses/{course_id}", { params: ["10"], token })).body).toMatchObject({
      purchase: { action: "continue" },
      progress: { course_completed: true, completed_at: now.toISOString() },
    });
    const completed = (await call("GET", "/me/courses", { token, query: { status: "completed" } })).body;
    expect(completed).toMatchObject({ total: 1, items: [{ course: { id: 10 }, progress: { course_completed: true, completed_at: now.toISOString() }, certificate_url: null }] });
    expect((await call("GET", "/me/courses", { token })).body).toMatchObject({ total: 0 });
  });
});
