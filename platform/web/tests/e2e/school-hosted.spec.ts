import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * A School app (roadmap 105.4), a Yallapp Studio project only: the school
 * makes it in Studio, the team activates it on a Studio plan without
 * schools, the school adds a class and a subject, a student and their
 * parent, a lesson, takes the day's attendance, adds a fee for the class and
 * posts news. Schools aren't on that plan, so the dashboard says so and the
 * app's school routes answer that the feature is off.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Nile School", email: `school-${suffix}@school.test`, password: "nile-school-strong-password-1" };
let own: Page;
let admin: Page;
let api = "";
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.199" };

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0199");
  await own.getByLabel("Your website (optional)").fill(`https://school-${suffix}.school.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.schoolAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
});

test.afterAll(async () => {
  await admin.close();
  await own.close();
});

test("the school makes a School project in Yallapp Studio, not among the regular apps", async () => {
  await own.goto("/dashboard/app-type?new=1");
  await expect(own.getByText("A school for students, parents and teachers", { exact: true })).toHaveCount(0);

  await own.goto("/studio/new");
  await own.getByRole("radio", { name: "A school for students, parents and teachers" }).check();
  const sources = own.getByRole("radiogroup", { name: "2 · Where does the content come from?" }).getByRole("radio");
  await expect(sources).toHaveText(["No website: everything from here"]);
  await own.getByLabel("Project name").fill(client.name);
  await own.getByRole("button", { name: "Next" }).click();
  // Its own three designs come first.
  await expect(own.getByRole("radio", { name: "School", exact: true })).toBeVisible();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  const nav = own.getByRole("navigation", { name: "Project dashboard" });
  for (const link of ["Classes", "People", "Timetable", "Attendance", "Homework", "Grades", "Fees", "News", "School settings"]) {
    await expect(nav.getByRole("link", { name: link, exact: true })).toBeVisible();
  }

  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
  expect(api).toMatch(/\/api\/app\/[0-9a-f-]{36}$/);

  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  const plan = admin.getByRole("region", { name: client.name }).getByRole("region", { name: "Plan and license" });
  await plan.getByLabel("Plan").selectOption("studio_1");
  await plan.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
});

test("Classes: not on the plan yet; a class and a subject added", async () => {
  await own.goto("/dashboard/school/classes");
  await expect(own).toHaveURL(/\/studio\/project\/school\/classes$/);
  await expect(own.getByText("Schools aren't included in this app's plan yet")).toBeVisible();
  await expect(own.getByText("No classes yet.", { exact: false })).toBeVisible();
  await own.getByLabel("Class name").fill("Grade 5 A");
  await own.getByLabel("Grade (optional)").fill("Grade 5");
  await own.getByRole("region", { name: "Classes" }).getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Saved.", { exact: true })).toBeVisible();
  await own.reload();
  await expect(own.getByText("Grade 5 A", { exact: true })).toBeVisible();
  await own.getByLabel("Subject", { exact: true }).last().fill("Mathematics");
  await own.getByRole("region", { name: "Subjects" }).getByRole("button", { name: "Add", exact: true }).click();
  await own.reload();
  await expect(own.getByRole("region", { name: "Subjects" }).getByLabel("Subject", { exact: true }).first()).toHaveValue("Mathematics");
});

test("People: a student in the class and their parent, linked by the student's code", async () => {
  await own.goto("/dashboard/school/people");
  await own.getByLabel("Name", { exact: true }).fill("Omar Hassan");
  await own.getByLabel("Mobile number").fill("+20 100 222 3344");
  await own.getByLabel("Class", { exact: true }).selectOption({ label: "Grade 5 A" });
  await own.getByLabel("Student code (optional)").fill("1023");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Added. They sign in to the app with this number.")).toBeVisible();

  await own.goto("/dashboard/school/people?role=parent");
  await own.getByLabel("Name", { exact: true }).fill("Hassan Ali");
  await own.getByLabel("Mobile number").fill("+20 100 222 3355");
  await own.getByLabel("Children").fill("1023");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Added. They sign in to the app with this number.")).toBeVisible();
  await own.reload();
  await expect(own.getByText("Children: Omar Hassan")).toBeVisible();
});

test("Timetable, attendance, a fee for the class and news", async () => {
  await own.goto("/dashboard/school/timetable");
  await own.getByLabel("Day").selectOption({ label: "Monday" });
  await own.getByLabel("Starts").fill("08:00");
  await own.getByLabel("Ends").fill("08:45");
  await own.getByLabel("Subject", { exact: true }).selectOption({ label: "Mathematics" });
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await own.reload();
  await expect(own.getByText("08:00–08:45")).toBeVisible();

  await own.goto("/dashboard/school/attendance");
  await own.getByRole("radio", { name: "Absent" }).check();
  await own.getByRole("button", { name: "Save attendance" }).click();
  await expect(own.getByText("Saved. Families of students absent or late were told in the app.")).toBeVisible();

  await own.goto("/dashboard/school/fees");
  await own.getByLabel("For").selectOption({ label: "Whole class: Grade 5 A" });
  await own.getByLabel("Fee", { exact: true }).fill("First term tuition");
  await own.getByLabel(/^Amount \(/).fill("4500");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Added for 1 student(s). Their families were told in the app.")).toBeVisible();
  await own.reload();
  await expect(own.getByText(/First term tuition · .*4,500\.00/)).toBeVisible();

  await own.goto("/dashboard/school/news");
  await own.getByLabel("Title").fill("Sports day");
  await own.getByLabel("Message").fill("Thursday, in sports clothes.");
  await own.getByRole("button", { name: "Post", exact: true }).click();
  await expect(own.getByText("Posted. Everyone it is for was told in the app.")).toBeVisible();
});

test("School settings are saved; the app's school routes wait for the plan", async ({ request }) => {
  await own.goto("/dashboard/school/settings");
  await own.getByLabel("Name", { exact: true }).fill("First term 2026");
  await own.getByLabel("Starts").fill("2026-09-27");
  await own.getByLabel("Ends").fill("2027-01-20");
  await own.getByRole("button", { name: "Save settings" }).click();
  await expect(own.getByText("Saved. The app shows it the next time it opens.")).toBeVisible();
  await own.reload();
  await expect(own.getByLabel("Name", { exact: true })).toHaveValue("First term 2026");

  const me = await request.get(`${api}/school/me`);
  expect(me.status()).toBe(403);
  expect((await me.json()).code).toBe("feature_disabled");
});
