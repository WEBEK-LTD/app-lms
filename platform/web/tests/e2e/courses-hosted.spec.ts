import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/** An academy without a website: courses, sections and lessons set in the dashboard (roadmap 8.6). */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Lale Academy", email: `lale-academy-${suffix}@school.test`, password: "academy-strong-password-1" };
let own: Page;
let api = "";
let lessonId = 0;

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 51");
  await own.getByLabel("Your website (optional)").fill(`https://lale-${suffix}.school.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await browser.newPage();
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.adminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();
});

test.afterAll(async () => {
  await own.close();
});

test("the academy adds a course with a lesson", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Academy", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await expect(own.getByText("add your courses, their sections and lessons")).toBeVisible();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();

  await own.getByRole("link", { name: "Courses", exact: true }).click();
  const add = own.getByRole("region", { name: "Add a course" });
  await add.getByLabel("Title").fill("Turkish for Beginners");
  await add.getByLabel("Description").fill("Speak from day one.");
  await add.getByLabel("Instructor").fill("Selin Arslan");
  await add.getByRole("button", { name: "Add course" }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Turkish for Beginners" })).toBeVisible();

  const curriculum = own.getByRole("region", { name: "Sections and lessons" });
  await curriculum.getByLabel("New section").fill("Hello");
  await curriculum.getByRole("button", { name: "Add section" }).click();
  await expect(curriculum.getByRole("heading", { name: "Hello" })).toBeVisible();
  await curriculum.getByLabel("Lesson title").fill("Greetings");
  await curriculum.getByRole("button", { name: "Add lesson" }).click();
  await expect(curriculum.getByText("Add a video address or some text.")).toBeVisible();
  await curriculum.getByLabel("Video address").fill("https://www.youtube.com/watch?v=abc123");
  await curriculum.getByLabel("Minutes").fill("8");
  await curriculum.getByLabel("Free preview for everyone").check();
  await curriculum.getByRole("button", { name: "Add lesson" }).click();
  await expect(curriculum.getByText("Video · 8 min · free preview")).toBeVisible();

  const details = own.getByRole("region", { name: "Details" });
  await details.getByLabel("Price (TRY)").fill("450");
  await details.getByRole("button", { name: "Save course" }).click();
  await expect(details.getByText("Saved “Turkish for Beginners”.")).toBeVisible();
  await own.getByRole("link", { name: "Courses", exact: true }).first().click();
  await expect(own.getByText("Paid courses can't be bought until you set up")).toBeVisible();
  await expect(own.getByRole("link", { name: /Turkish for Beginners/ })).toContainText("₺450.00 · 1 lessons · 0 students");
});

test("the app sees the course and its preview lesson", async ({ request }) => {
  const config = await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json();
  expect(config.features).toMatchObject({ lms: "yallapp" });
  expect(config.purchases).toEqual({ enroll_button: false, free_enrollment: true });
  const courses = await (await request.get(`${api}/courses`)).json();
  expect(courses).toMatchObject({ total: 1, items: [{ title: "Turkish for Beginners", price: { formatted: "₺450.00" }, lesson_count: 1, instructor: { name: "Selin Arslan" } }] });
  const id = courses.items[0].id;
  // Payments aren't set up: the course can't be bought yet.
  expect(await (await request.get(`${api}/courses/${id}?platform=android`)).json()).toMatchObject({ purchase: { action: "none" }, description_html: "<p>Speak from day one.</p>" });
  const curriculum = await (await request.get(`${api}/courses/${id}/curriculum`)).json();
  const lesson = curriculum.topics[0].items[0];
  lessonId = lesson.id;
  expect(lesson).toMatchObject({ title: "Greetings", preview: true, locked: false });
  expect(await (await request.get(`${api}/lessons/${lesson.id}`)).json()).toMatchObject({ video: { source: "youtube", url: "https://www.youtube.com/watch?v=abc123" } });
});

/**
 * 40 A stand-in for YouTube's IFrame Player API and its player (this machine can't reach YouTube): the player
 * draws a title bar, "Watch on YouTube" and a logo along its edges, like the real one.
 */
const fakeYouTubeApi = `
window.YT = { Player: function (el, opts) {
  var self = this, t = 0, timer = null;
  window.__youtube = { calls: [], src: el.src };
  function state(s) { opts.events.onStateChange({ data: s }); }
  this.getDuration = function () { return 480; };
  this.getCurrentTime = function () { return t; };
  this.getVideoLoadedFraction = function () { return 0.25; };
  this.getAvailablePlaybackRates = function () { return [0.5, 1, 1.5, 2]; };
  this.playVideo = function () { __youtube.calls.push("play"); state(1); timer = timer || setInterval(function () { t += 0.25; }, 250); };
  this.pauseVideo = function () { __youtube.calls.push("pause"); clearInterval(timer); timer = null; state(2); };
  this.seekTo = function (s) { __youtube.calls.push("seek:" + s); t = s; };
  this.setPlaybackRate = function () {};
  this.getOption = function () { return []; };
  setTimeout(function () { opts.events.onReady({ target: self }); state(5); }, 100);
} };
setTimeout(function () { window.onYouTubeIframeAPIReady(); }, 0);`;
const fakeYouTubePlayer = `<!doctype html><body style="margin:0;background:#000;height:100vh">
<div style="position:absolute;top:0;left:0;right:0;height:48px;background:#222;color:#fff">Channel · Greetings</div>
<a href="https://www.youtube.com/watch?v=abc123" target="_blank" style="position:absolute;bottom:8px;left:8px;color:#fff">Watch on YouTube</a>
<div style="position:absolute;bottom:8px;right:8px;background:red;color:#fff">YouTube</div></body>`;

test("the app preview plays the YouTube lesson in the app's own player", async ({ browser }) => {
  await own.goto("/dashboard/preview");
  const link = (await own.getByRole("img", { name: /QR code that opens the preview/ }).getAttribute("data-qr"))!;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route("https://www.youtube.com/iframe_api", (route) => route.fulfill({ contentType: "text/javascript", body: fakeYouTubeApi }));
  await context.route("https://www.youtube.com/embed/**", (route) => route.fulfill({ contentType: "text/html", body: fakeYouTubePlayer }));
  await context.route("https://i.ytimg.com/**", (route) => route.fulfill({ status: 404 }));
  const page = await context.newPage();
  const popups: string[] = [];
  page.on("popup", (p) => popups.push(p.url()));
  await page.goto(`${link}#/lesson/${lessonId}`);

  // The player page in a sandboxed frame: no popups, no leaving the app.
  const frame = page.locator('iframe[data-yallapp-frame="video-player"]');
  await expect(frame).toBeAttached({ timeout: 45_000 });
  expect(await frame.getAttribute("sandbox")).toBe("allow-scripts allow-same-origin allow-presentation");
  // Touches go to the app, never into the frame.
  expect(await frame.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  const player = page.frames().find((f) => f.url() === "about:srcdoc")!;
  await expect.poll(() => player.evaluate(() => (window as unknown as { __youtube?: unknown }).__youtube !== undefined)).toBe(true);
  const src = new URL(await player.evaluate(() => (window as unknown as { __youtube: { src: string } }).__youtube.src));
  expect(Object.fromEntries(src.searchParams)).toMatchObject({ controls: "0", rel: "0", iv_load_policy: "3", disablekb: "1", fs: "0", playsinline: "1", enablejsapi: "1" });
  expect(src.searchParams.get("origin")).toBe(new URL(link).origin);
  // Inside the frame, every point of the video is our transparent layer, so "Watch on YouTube" and the logo can't be tapped.
  expect(
    await player.evaluate(() => {
      const hits = new Set<string>();
      for (let x = 2; x < innerWidth; x += 20) for (let y = 2; y < innerHeight; y += 20) hits.add(document.elementFromPoint(x, y)?.id ?? "none");
      return [...hits];
    }),
  ).toEqual(["shield"]);

  // Our controls (found through Flutter's accessibility tree) take a real click over the frame and start the video
  // through the API.
  await page.locator("flt-semantics-placeholder").evaluate((el) => (el as HTMLElement).click());
  await page.getByRole("button", { name: "Play", exact: true }).click({ force: true });
  await expect.poll(() => player.evaluate(() => (window as unknown as { __youtube: { calls: string[] } }).__youtube.calls)).toContain("play");
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeAttached();
  // A tap on the picture opens nothing.
  const box = (await frame.boundingBox())!;
  await page.mouse.click(box.x + box.width - 20, box.y + box.height - 12);
  await page.mouse.click(box.x + 20, box.y + box.height - 12);
  await page.waitForTimeout(500);
  expect(popups).toEqual([]);
  expect(page.url()).toContain("/preview-app/");
  await context.close();
});
