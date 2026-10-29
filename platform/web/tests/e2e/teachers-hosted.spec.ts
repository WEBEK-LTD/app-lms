import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * An academy with many teachers (roadmap 105.3), a Yallapp Studio project
 * only: the academy makes it in Studio, the team activates it on a Studio plan
 * without teachers, the academy adds a teacher with their share, lets people
 * apply from the app, and finds no course to review and an empty statement.
 * Teachers aren't on that plan, so the dashboard says so and the app's
 * teachers' routes answer that the feature is off.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Nour Teachers", email: `teachers-${suffix}@teachers.test`, password: "nour-teachers-strong-password-1" };
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
  await own.getByLabel("Your website (optional)").fill(`https://teachers-${suffix}.teachers.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.teachersAdminEmail);
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

test("the academy makes an academy with many teachers in Yallapp Studio, not among the regular apps", async () => {
  await own.goto("/dashboard/app-type?new=1");
  await expect(own.getByText("An academy with many teachers", { exact: true })).toHaveCount(0);

  await own.goto("/studio/new");
  await own.getByRole("radio", { name: "An academy with many teachers" }).check();
  const sources = own.getByRole("radiogroup", { name: "2 · Where does the content come from?" }).getByRole("radio");
  await expect(sources).toHaveText(["No website: everything from here"]);
  await own.getByLabel("Project name").fill(client.name);
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  const nav = own.getByRole("navigation", { name: "Project dashboard" });
  for (const link of ["Courses", "Teachers", "Courses to review", "Teacher statements"]) {
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

test("Teachers: not on the plan yet; one added with their share; applications turned on", async () => {
  await own.goto("/dashboard/teachers");
  await expect(own).toHaveURL(/\/studio\/project\/teachers$/);
  await expect(own.getByText("Academies with many teachers aren't included in this app's plan yet")).toBeVisible();
  await expect(own.getByText("No teachers yet.")).toBeVisible();
  await own.getByLabel("Name", { exact: true }).fill("Salma Fathy");
  await own.getByLabel("Mobile number").fill("+20 100 111 0000");
  await own.getByLabel("Subjects").fill("Arabic, Grammar");
  await own.getByLabel("Teacher's share (%)").fill("70");
  await own.getByLabel("About the teacher").fill("Arabic grammar, simply.");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Added. They sign in to the app with this number and see the Teacher tab.")).toBeVisible();
  await own.reload();
  await expect(own.getByText("1 teacher", { exact: true })).toBeVisible();
  await expect(own.getByText("Salma Fathy", { exact: true })).toBeVisible();
  await expect(own.getByText(/70% share · 0 courses · No ratings yet/)).toBeVisible();

  await expect(own.getByText("People can't apply from the app: you add teachers here.")).toBeVisible();
  await own.getByRole("button", { name: "Let people apply" }).click();
  await expect(own.getByText("People can apply to teach from the app.")).toBeVisible();
  await expect(own.getByText("No applications waiting.")).toBeVisible();
});

test("Courses to review and statements are empty; the app's teachers' routes wait for the plan", async ({ request }) => {
  await own.goto("/dashboard/teachers/review");
  await expect(own.getByRole("heading", { name: "Courses to review", level: 1 })).toBeVisible();
  await expect(own.getByText("No courses are waiting for you.")).toBeVisible();

  await own.goto("/dashboard/teachers/statement?period=last_month");
  await expect(own.getByRole("heading", { name: "Teacher statements", level: 1 })).toBeVisible();
  await expect(own.getByRole("link", { name: "Last month" })).toHaveAttribute("aria-current", "page");
  await expect(own.getByText("No sales in this period.")).toBeVisible();

  const list = await request.get(`${api}/teachers`);
  expect(list.status()).toBe(403);
  expect((await list.json()).code).toBe("feature_disabled");
});
