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
  for (const link of ["Classes", "People", "Timetable", "Attendance", "Homework", "Grades", "Report cards", "Fees", "News", "School settings"]) {
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
  await expect(own.getByText("Saved.", { exact: true })).toBeVisible();
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
  await expect(own.getByText("Saved.", { exact: true })).toBeVisible();
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

test("112.5 Report cards: the class over the term, and a student's report card", async () => {
  await own.goto("/dashboard/school/reports");
  await expect(own).toHaveURL(/\/studio\/project\/school\/reports$/);
  await expect(own.getByRole("heading", { level: 1, name: "Report cards" })).toBeVisible();
  await expect(own.getByText("First term 2026: 2026-09-27 to 2027-01-20")).toBeVisible();
  const omar = own.locator("tr", { hasText: "Omar Hassan" });
  await expect(omar).toContainText("1 absent");
  await omar.getByRole("link", { name: "Report card" }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Report card" })).toBeVisible();
  await expect(own.locator("[data-report-student]")).toHaveText("Omar Hassan");
  await expect(own.getByText("No scores in this period yet.")).toBeVisible();
  await expect(own.getByText(/Attendance: 0 present, 1 absent/)).toBeVisible();
  await expect(own.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();
});

test("113.10 Buses & routes: a route with its driver, a stop on the map and a student on it; the live map without buses", async ({ request }) => {
  await own.goto("/dashboard/school/people?role=teacher");
  await own.getByLabel("Name", { exact: true }).fill("Sami Driver");
  await own.getByLabel("Mobile number").fill("+20 100 222 3366");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Added. They sign in to the app with this number.")).toBeVisible();

  await own.goto("/dashboard/school/bus");
  await expect(own).toHaveURL(/\/studio\/project\/school\/bus$/);
  await expect(own.getByRole("navigation", { name: "Project dashboard" }).getByRole("link", { name: "Buses & routes", exact: true })).toBeVisible();
  await expect(own.getByText("No routes yet.", { exact: false })).toBeVisible();
  await own.getByLabel("Route name").fill("Route 1");
  await own.getByLabel("Bus plate").fill("abc 123");
  await own.getByLabel("Seats").fill("30");
  await own.getByLabel("Driver").selectOption({ label: "Sami Driver" });
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own).toHaveURL(/\/school\/bus\/\d+$/);
  await expect(own.getByRole("heading", { level: 1, name: "Route 1 · ABC 123" })).toBeVisible();

  const stops = own.getByRole("region", { name: "Stops", exact: true });
  await expect(stops.locator("[data-no-map]")).toBeVisible();
  await stops.getByLabel("Stop name").fill("Nile Street");
  await stops.getByLabel("Place on the map").fill("https://www.google.com/maps/@30.0444,31.2357,15z");
  await stops.getByLabel("Morning time").fill("07:10");
  await stops.getByLabel("Afternoon time").fill("14:40");
  await stops.getByRole("button", { name: "Add", exact: true }).click();
  await expect(stops.getByText("Saved.", { exact: true })).toBeVisible();
  await own.reload();
  await expect(own.locator("[data-bus-stops]")).toContainText("Nile Street");
  await expect(own.locator("[data-bus-stops]")).toContainText("Morning 07:10 · afternoon 14:40");

  const riders = own.getByRole("region", { name: "Students on the stops", exact: true });
  await riders.getByRole("checkbox", { name: /Omar Hassan/ }).check();
  await riders.getByLabel("Stop", { exact: true }).selectOption({ label: "1. Nile Street" });
  await riders.getByRole("button", { name: "Put them on the stop" }).click();
  await expect(riders.getByText("Saved. On Nile Street: 1.")).toBeVisible();
  await own.reload();
  await expect(own.getByRole("list", { name: "Students at Nile Street" })).toContainText("Omar Hassan · Morning");

  await own.goto("/dashboard/school/bus/live");
  await expect(own.getByRole("heading", { level: 1, name: "Buses on the map" })).toBeVisible();
  await expect(own.locator("[data-no-map]")).toBeVisible();
  await expect(own.getByText("No bus is on a trip right now.")).toBeVisible();

  // Schools aren't on the plan: the app's bus routes wait for it.
  const bus = await request.get(`${api}/school/bus/routes`);
  expect(bus.status()).toBe(403);
  expect((await bus.json()).code).toBe("feature_disabled");
});

test("113.11 Library: a book with its copies, lent at the desk by the student's code and taken back", async ({ request }) => {
  await own.goto("/dashboard/school/library");
  await expect(own).toHaveURL(/\/studio\/project\/school\/library$/);
  await expect(own.getByText("No books yet.", { exact: false })).toBeVisible();
  await own.getByLabel("Title", { exact: true }).fill("The Little Prince");
  await own.getByLabel("Author").fill("Antoine de Saint-Exupéry");
  await own.getByLabel("Category").fill("Stories");
  await own.getByLabel("Copies' codes").fill("LP-1\nLP-2");
  await own.getByRole("button", { name: "Add", exact: true }).first().click();
  await expect(own).toHaveURL(/\/school\/library\/\d+$/);
  await expect(own.locator("[data-copies]")).toContainText("LP-1");
  await expect(own.locator("[data-copies]")).toContainText("LP-2");
  await expect(own.locator("[data-copies]").getByText("On the shelf")).toHaveCount(2);

  await own.goto("/dashboard/school/library/desk");
  const lend = own.getByRole("region", { name: "Lend", exact: true });
  await lend.getByLabel("Student's code or name").fill("1023");
  await lend.getByLabel("Copy's code").fill("lp-1");
  await lend.getByRole("button", { name: "Lend", exact: true }).click();
  await expect(lend.getByText(/^Lent The Little Prince to Omar Hassan, due back on \d{4}-\d{2}-\d{2}\.$/)).toBeVisible();
  await own.reload();
  await expect(own.locator("[data-out]")).toContainText("The Little Prince");
  await expect(own.locator("[data-out]")).toContainText("Omar Hassan (1023)");

  const back = own.getByRole("region", { name: "Return", exact: true });
  await back.getByLabel("Copy's code").fill("LP-1");
  await back.getByRole("button", { name: "Take back" }).click();
  await expect(back.getByText("The Little Prince is back from Omar Hassan.")).toBeVisible();
  await own.reload();
  await expect(own.getByText("No books out.")).toBeVisible();

  const books = await request.get(`${api}/school/library/books`);
  expect(books.status()).toBe(403);
  expect((await books.json()).code).toBe("feature_disabled");
});
