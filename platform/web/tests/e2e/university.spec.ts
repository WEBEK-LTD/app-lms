import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 113.9 A School project in university mode, on a Studio plan without
 * universities (the dashboard says so): the school turns it on,
 * adds a faculty and a department, a program, courses (one by hand, one
 * from a sheet), a student and a lecturer (People) and the student's
 * program and advisor, a term whose registration is open and a section of
 * it; the office enrols the student past the prerequisite, the section's
 * grade is given from a percent and published, and the transcript shows
 * the GPA, with its PDF.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Nile University", email: `university-${suffix}@university.test`, password: "nile-university-strong-password-1" };
let own: Page;
let admin: Page;
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.213" };
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0213");
  await own.getByLabel("Your website (optional)").fill(`https://university-${suffix}.university.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.universityAdminEmail);
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

test("a School project turns university mode on", async () => {
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: "A school for students, parents and teachers" }).check();
  await own.getByLabel("Project name").fill(client.name);
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  // The team puts the project on a Studio plan without universities.
  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  const plan = admin.getByRole("region", { name: client.name }).getByRole("region", { name: "Plan and license" });
  await plan.getByLabel("Plan").selectOption("studio_1");
  await plan.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await own.goto("/studio/project");
  await own.getByRole("navigation", { name: "Project dashboard" }).getByRole("link", { name: "University", exact: true }).click();
  await expect(own).toHaveURL(/\/studio\/project\/school\/university$/);
  await expect(own.getByText("Universities aren't included in this app's plan yet")).toBeVisible();
  await own.getByLabel("This school is a university").check();
  await own.getByRole("button", { name: "Save settings" }).click();
  await expect(own.getByText("Saved. The app shows it the next time it opens.")).toBeVisible();
  await own.reload();
  await expect(own.getByLabel("This school is a university")).toBeChecked();
  await expect(own.getByLabel("Grading scale")).toHaveValue(/^A 4 90\nA- 3\.7 85/);
});

test("faculties, departments, a program and courses", async () => {
  await own.goto("/dashboard/school/university/structure");
  const faculties = own.getByRole("region", { name: "Faculties" });
  await faculties.getByLabel("Name", { exact: true }).fill("Engineering");
  await faculties.getByRole("button", { name: "Add", exact: true }).click();
  await expect(faculties.getByText("Saved.", { exact: true })).toBeVisible();
  await own.reload();
  const departments = own.getByRole("region", { name: "Departments" });
  await departments.getByLabel("Name", { exact: true }).fill("Computer Science");
  await departments.getByLabel("Code (optional)").fill("CS");
  await departments.getByLabel("Faculty").selectOption({ label: "Engineering" });
  await departments.getByRole("button", { name: "Add", exact: true }).click();
  await expect(departments.getByText("Saved.", { exact: true })).toBeVisible();

  await own.goto("/dashboard/school/university/courses");
  await own.getByLabel("Course code").fill("cs101");
  await own.getByLabel("Title", { exact: true }).fill("Introduction to programming");
  await own.getByLabel("Credits", { exact: true }).fill("3");
  // The first course's form is in place on the page (later ones open from its button).
  await own.getByRole("region", { name: "Add a course" }).getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Saved.", { exact: true })).toBeVisible();
  await own.getByLabel("CSV file").setInputFiles({ name: "courses.csv", mimeType: "text/csv", buffer: Buffer.from("code,title,credits,department,prerequisites\nCS201,Data structures,3,CS,CS101\n") });
  await own.getByRole("button", { name: "Import" }).click();
  await expect(own.getByText("Imported: 1 added, 0 updated.")).toBeVisible();
  await own.reload();
  await expect(own.getByText("3 credits · Computer Science · After CS101")).toBeVisible();

  await own.goto("/dashboard/school/university/programs");
  await own.getByLabel("Program name").fill("Computer Science");
  await own.getByLabel("Department").selectOption({ label: "Computer Science · Engineering" });
  await own.getByLabel("Degree").fill("BSc");
  await own.getByLabel("Credits to graduate").fill("132");
  await own.getByLabel("Least credits a term").fill("3");
  await own.getByLabel("Study plan").fill("1 CS101\n1 CS201");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Saved.", { exact: true })).toBeVisible();
  await own.reload();
  await expect(own.getByText("BSc Computer Science", { exact: true })).toBeVisible();
  await expect(own.getByText(/132 credits in 4 years · 3 to 18 a term · 2 courses in the plan/)).toBeVisible();
});

test("a student and a lecturer, the student's program and advisor, a term and its section", async () => {
  await own.goto("/dashboard/school/people");
  await own.getByLabel("Name", { exact: true }).fill("Omar Hassan");
  await own.getByLabel("Mobile number").fill("+20 100 333 4411");
  await own.getByLabel("Student code (optional)").fill("U1023");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Added. They sign in to the app with this number.")).toBeVisible();
  await own.goto("/dashboard/school/people?role=teacher");
  await own.getByLabel("Name", { exact: true }).fill("Mona Adel");
  await own.getByLabel("Mobile number").fill("+20 100 333 4422");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Added. They sign in to the app with this number.")).toBeVisible();

  await own.goto("/dashboard/school/university/students");
  await own.getByRole("button", { name: "Edit Omar Hassan" }).click();
  await own.getByLabel("Program", { exact: true }).selectOption({ label: "BSc Computer Science" });
  await own.getByLabel("Advisor", { exact: true }).selectOption({ label: "Mona Adel" });
  await own.getByRole("button", { name: "Save", exact: true }).click();
  await expect(own.getByText("Saved.", { exact: true })).toBeVisible();
  await own.reload();
  await expect(own.getByText("Code U1023 · BSc Computer Science · Advisor: Mona Adel")).toBeVisible();

  await own.goto("/dashboard/school/university/terms");
  const terms = own.getByRole("region", { name: "Terms", exact: true });
  await terms.getByLabel("Term", { exact: true }).fill("Spring 2027");
  await terms.getByLabel("Academic year").fill("2026/2027");
  await terms.getByLabel("Term starts").fill(day(30));
  await terms.getByLabel("Term ends").fill(day(150));
  await terms.getByLabel("Registration opens").fill(day(-1));
  await terms.getByLabel("Registration closes").fill(day(10));
  await terms.getByLabel("Last day to drop").fill(day(20));
  await terms.getByRole("button", { name: "Add", exact: true }).click();
  await expect(terms.getByText("Saved.", { exact: true })).toBeVisible();
  await own.reload();
  const sections = own.getByRole("region", { name: "Sections of Spring 2027" });
  await sections.getByLabel("Course", { exact: true }).selectOption({ label: "CS201 Data structures" });
  await sections.getByLabel("Lecturer").selectOption({ label: "Mona Adel" });
  await sections.getByLabel("Weekly lectures").fill("1 09:00-10:30 B2\n3 09:00-10:30 B2");
  await sections.getByRole("button", { name: "Add", exact: true }).click();
  await expect(sections.getByText("Saved.", { exact: true })).toBeVisible();
  await own.reload();
  await expect(own.getByText(/Mona Adel · 0 of 40 seats · Monday 09:00–10:30 \(B2\)/)).toBeVisible();
  await expect(own.getByRole("region", { name: "The week of Spring 2027" }).getByText("CS201-01")).toHaveCount(2);
});

test("the office enrols the student past the prerequisite; the grade is published and on the transcript", async ({ request }) => {
  await own.goto("/dashboard/school/university/registration");
  await own.getByRole("link", { name: /Omar Hassan/ }).first().click();
  const panel = own.getByRole("region", { name: "Omar Hassan in Spring 2027" });
  await expect(panel.getByText("No sections yet.")).toBeVisible();
  await panel.getByLabel("Section", { exact: true }).selectOption({ index: 1 });
  await panel.getByRole("button", { name: "Add to the section" }).click();
  await expect(panel.getByRole("alert")).toHaveText("Pass CS101 first.");
  await panel.getByLabel("Section", { exact: true }).selectOption({ index: 1 });
  await panel.getByLabel("Past the rules").check();
  await panel.getByRole("button", { name: "Add to the section" }).click();
  await expect(own.getByText("Added. The student is enrolled.")).toBeVisible();
  await own.reload();
  await expect(own.getByRole("region", { name: "Omar Hassan in Spring 2027" }).getByText("Enrolled", { exact: true })).toBeVisible();

  await own.goto("/dashboard/school/university/results");
  await own.getByRole("link", { name: /CS201-01/ }).click();
  await own.getByLabel("Mark of Omar Hassan").fill("88");
  await own.getByRole("button", { name: "Save grades" }).click();
  await expect(own.getByText("Saved.", { exact: true })).toBeVisible();
  await own.reload();
  await expect(own.getByLabel("Grade of Omar Hassan")).toHaveValue("A-");
  await own.getByRole("button", { name: "Publish results" }).click();
  await expect(own.getByText("Published. The students were told in the app.")).toBeVisible();

  await own.goto("/dashboard/school/university/transcripts?q=U1023");
  await own.getByRole("link", { name: /Omar Hassan/ }).click();
  await expect(own.locator("[data-transcript-gpa]")).toHaveText("Cumulative GPA 3.70 · 3 of 132 credits");
  const href = await own.locator("[data-transcript-pdf]").getAttribute("href");
  const pdf = await request.get(href!);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
});
