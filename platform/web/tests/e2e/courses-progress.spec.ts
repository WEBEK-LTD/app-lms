import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 90 An academy without a website, complete: a quiz after the lessons, a
 * certificate for students who finish (90.1), and each student's progress
 * and quiz results for the teacher, with the CSV file (90.2).
 */
test.describe.configure({ mode: "serial" });
// Its own address, so the sign-up and sign-in limits per IP don't reach the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.253" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Defne Academy", email: `defne-${suffix}@school.test`, password: "defne-strong-password-1" };
let own: Page;
let api = "";
let courseId = 0;

async function mailsTo(to: string): Promise<{ to: string; subject: string; sentAt: string }[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = (await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as { to: string; subject: string; sentAt: string }))).filter((m) => m.to === to);
  return mails.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

/** A student who signs in to the app by email. */
async function signUp(request: APIRequestContext, name: string, n: number): Promise<Record<string, string>> {
  const email = `${name.toLowerCase()}-${suffix}@example.com`;
  const ip = { "x-forwarded-for": `198.51.100.${140 + n}` };
  const device = { id: `e2e-academy-${suffix}-${n}`, platform: "android", name: "Pixel", app_version: "1.0.0" };
  const asked = (await (await request.post(`${api}/auth/email/request`, { data: { email }, headers: ip })).json()) as { request_id: string };
  const code = (await mailsTo(email)).at(-1)!.subject.slice(0, 6);
  const verified = (await (await request.post(`${api}/auth/otp/verify`, { data: { request_id: asked.request_id, code, device }, headers: ip })).json()) as { signup_token: string };
  const registered = await request.post(`${api}/auth/register`, { data: { signup_token: verified.signup_token, name, device }, headers: ip });
  expect(registered.status()).toBe(201);
  return { authorization: `Bearer ${((await registered.json()) as { access_token: string }).access_token}` };
}

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 90");
  await own.getByLabel("Your website (optional)").fill(`https://defne-${suffix}.school.test`);
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

test("90.1 the academy adds a lesson with a file, a quiz, a certificate and access for 30 days", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Academy", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();

  await own.getByRole("link", { name: "App sign-in" }).click();
  await own.getByText("Phone number or email address").click();
  await own.getByRole("button", { name: "Save sign-in methods" }).click();
  await expect(own.getByRole("status").first()).toContainText("Saved.");

  await own.goto("/dashboard/courses");
  const add = own.getByRole("region", { name: "Add a course" });
  await add.getByLabel("Title").fill("Turkish in a Week");
  await add.getByRole("button", { name: "Add course" }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Turkish in a Week" })).toBeVisible();
  courseId = Number(new URL(own.url()).pathname.split("/").pop());

  const details = own.getByRole("region", { name: "Details" });
  await details.getByLabel("Give a certificate to students who finish").check();
  await details.getByLabel("Access for (days)").fill("0");
  await details.getByRole("button", { name: "Save course" }).click();
  await expect(details.getByText("Enter 1 to 3650 days, or leave it empty for access that doesn't end.")).toBeVisible();
  await details.getByLabel("Access for (days)").fill("30");
  await details.getByRole("button", { name: "Save course" }).click();
  await expect(details.getByText("Saved “Turkish in a Week”.")).toBeVisible();

  const curriculum = own.getByRole("region", { name: "Sections and lessons" });
  await curriculum.getByLabel("New section").fill("Hello");
  await curriculum.getByRole("button", { name: "Add section" }).click();
  await expect(curriculum.getByRole("heading", { name: "Hello" })).toBeVisible();
  await curriculum.getByLabel("Lesson title").fill("Greetings");
  await curriculum.getByLabel("Text", { exact: true }).fill("Merhaba means hello.");
  await curriculum.getByLabel("Files").fill("Word list | https://cdn.example.com/words.pdf");
  await curriculum.getByRole("button", { name: "Add lesson" }).click();
  await expect(curriculum.getByText("Text · 1 file")).toBeVisible();

  await curriculum.getByText("Add a quiz to Hello").click();
  await curriculum.getByLabel("Quiz title").fill("Check yourself");
  await curriculum.getByLabel("Questions").fill("Q: Merhaba means\n* Hello");
  await curriculum.getByRole("button", { name: "Add quiz" }).click();
  await expect(curriculum.getByText("“Merhaba means” needs at least two answers.")).toBeVisible();
  await curriculum.getByLabel("Questions").fill("Q: Merhaba means\n* Hello\n- Goodbye");
  await curriculum.getByRole("button", { name: "Add quiz" }).click();
  await expect(curriculum.getByText("1 question · pass mark 70%")).toBeVisible();
});

test("90.1 a student learns, passes the quiz and gets the certificate", async ({ request, browser }) => {
  const student = await signUp(request, "Deniz", 0);
  const config = (await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json()) as { features: Record<string, unknown> };
  expect(config.features).toMatchObject({ quizzes: true, certificates: true });
  const enrolled = await (await request.post(`${api}/courses/${courseId}/enroll`, { headers: student })).json();
  expect(Date.parse(enrolled.access_ends_at) - Date.now()).toBeGreaterThan(29 * 86_400_000);

  const curriculum = await (await request.get(`${api}/courses/${courseId}/curriculum`, { headers: student })).json();
  const [lesson, quiz] = curriculum.topics[0].items as { id: number; type: string }[];
  expect([lesson!.type, quiz!.type]).toEqual(["lesson", "quiz"]);
  expect(await (await request.get(`${api}/lessons/${lesson!.id}`, { headers: student })).json()).toMatchObject({
    attachments: [{ name: "Word list", url: "https://cdn.example.com/words.pdf" }],
  });
  await request.post(`${api}/lessons/${lesson!.id}/complete`, { headers: student });

  const attempt = await (await request.post(`${api}/quizzes/${quiz!.id}/attempts`, { headers: student })).json();
  expect(JSON.stringify(attempt)).not.toContain("correct");
  const result = await (await request.post(`${api}/quizzes/${quiz!.id}/attempts/${attempt.id}/submit`, { headers: student, data: { answers: [{ question_id: attempt.questions[0].id, option_ids: ["a"] }] } })).json();
  expect(result).toMatchObject({ status: "passed", score_percent: 100 });

  const certificates = (await (await request.get(`${api}/me/certificates`, { headers: student })).json()).items as { url: string }[];
  expect(certificates).toHaveLength(1);
  // Anyone with the link sees it: the name only, never the email address.
  const visitor = await browser.newPage();
  await visitor.goto(certificates[0]!.url);
  await expect(visitor.getByRole("heading", { name: "Certificate of completion" })).toBeVisible();
  await expect(visitor.locator("[data-certificate-name]")).toHaveText("Deniz");
  await expect(visitor.locator("[data-certificate-course]")).toHaveText("Turkish in a Week");
  await expect(visitor.getByText("@example.com")).toHaveCount(0);
  // A changed code isn't a certificate.
  const forged = await visitor.goto(certificates[0]!.url.replace(/-[\w-]{16}$/, "-AAAAAAAAAAAAAAAA"));
  expect(forged?.status()).toBe(404);
  await visitor.close();

  await signUp(request, "Ece", 1).then((ece) => request.post(`${api}/courses/${courseId}/enroll`, { headers: ece }));
});

test("90.2 the teacher sees each student's progress and quiz results, and downloads them", async () => {
  await own.goto(`/dashboard/courses/${courseId}`);
  await own.getByRole("link", { name: "Progress and quiz results" }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Students' progress" })).toBeVisible();
  await expect(own.getByText("2 students · 1 started · 1 finished")).toBeVisible();
  const deniz = own.locator("tr", { hasText: "Deniz" });
  await expect(deniz).toContainText("100%");
  await expect(deniz).toContainText("Check yourself passed, 100%");
  const ece = own.locator("tr", { hasText: "Ece" });
  await expect(ece).toContainText("0%");
  await expect(ece).toContainText("not taken");
  await expect(ece).toContainText("Not started");
  await expect(own.getByRole("region", { name: "Quizzes" })).toContainText("1 took it · 1 passed · average best score 100%");

  const download = own.waitForEvent("download");
  await own.getByRole("link", { name: "Download CSV" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("students-turkish-in-a-week.csv");
  const text = await readFile((await file.path())!, "utf8");
  expect(text).toContain("Name,Phone,Email,Enrolled,How,Lessons completed,Progress (%),Finished,Last activity,Access ends,Check yourself");
  expect(text).toMatch(/Deniz,,deniz-[a-z0-9]+@example\.com,[\d-]+,Free,1\/1,100,/);
  expect(text).toContain("100% (passed)");

  // Another account can't read it.
  expect((await own.request.get(`/api/dashboard/courses/999999/progress`)).status()).toBe(404);
});
