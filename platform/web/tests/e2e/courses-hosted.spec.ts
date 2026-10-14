import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/** An academy without a website: courses, sections and lessons set in the dashboard (roadmap 8.6). */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Lale Academy", email: `lale-academy-${suffix}@school.test`, password: "academy-strong-password-1" };
let own: Page;
let api = "";

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 51");
  await own.getByLabel("Your WordPress website").fill(`https://lale-${suffix}.school.test`);
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
  expect(lesson).toMatchObject({ title: "Greetings", preview: true, locked: false });
  expect(await (await request.get(`${api}/lessons/${lesson.id}`)).json()).toMatchObject({ video: { source: "youtube", url: "https://www.youtube.com/watch?v=abc123" } });
});
