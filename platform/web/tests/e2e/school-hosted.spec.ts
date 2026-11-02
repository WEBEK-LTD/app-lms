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
  for (const link of ["Classes", "People", "Timetable", "Calendar", "Exams", "Attendance", "Check-in", "Staff", "Salaries", "Homework", "Grades", "Report cards", "Syllabus", "Progress", "Teachers' reports", "Report templates", "Behaviour", "Fees", "Permission slips", "Absence excuses", "News", "School settings", "University"]) {
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

test("113.3 Staff: a member of staff with their job and hours, and news for the staff only", async () => {
  await own.goto("/dashboard/school/people?role=staff");
  await expect(own).toHaveURL(/\/studio\/project\/school\/people\?role=staff$/);
  await own.getByLabel("Name", { exact: true }).fill("Samir Fawzy");
  await own.getByLabel("Mobile number").fill("+20 100 222 3366");
  await own.getByLabel("Job (optional)").fill("Nurse");
  await own.getByLabel("Department (optional)").fill("Clinic");
  await own.getByRole("checkbox", { name: "Sunday" }).check();
  await own.getByRole("checkbox", { name: "Monday" }).check();
  await own.getByLabel("Work starts").fill("09:00");
  await own.getByLabel("Work ends").fill("17:00");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Added. They sign in to the app with this number.")).toBeVisible();

  await own.goto("/dashboard/school/news");
  await own.getByLabel("For").selectOption({ label: "Teachers and staff only" });
  await own.getByLabel("Title").fill("Staff meeting");
  await own.getByLabel("Message").fill("Thursday at 2, in the library.");
  await own.getByRole("button", { name: "Post", exact: true }).click();
  await expect(own.getByText("Posted. Everyone it is for was told in the app.")).toBeVisible();

  await own.goto("/dashboard/school/staff");
  await expect(own).toHaveURL(/\/studio\/project\/school\/staff$/);
  await expect(own.getByRole("heading", { level: 1, name: "Staff" })).toBeVisible();
  const workers = own.getByRole("region", { name: "Who works here" });
  await expect(workers.getByRole("heading", { name: "Clinic" })).toBeVisible();
  await expect(workers.getByText(/Nurse · Staff · Sunday, Monday · 09:00–17:00|Nurse · Staff · Monday, Sunday · 09:00–17:00/)).toBeVisible();
  await expect(own.getByRole("region", { name: "Leave requests" }).getByText("No leave requests yet.")).toBeVisible();
  await expect(own.getByRole("region", { name: "Staff news" }).getByText("Staff meeting")).toBeVisible();
});

test("113.2 Check-in: settings, the gate's code, the board with a correction and the month's report", async ({ request }) => {
  await own.goto("/dashboard/school/checkin");
  await expect(own).toHaveURL(/\/studio\/project\/school\/checkin$/);
  await expect(own.getByText("Checking in from the app is off.")).toBeVisible();

  await own.goto("/dashboard/school/checkin/settings");
  await own.getByRole("checkbox", { name: "Students, teachers and staff check in and out in the app" }).check();
  await own.getByRole("radio", { name: "Either one" }).check();
  await own.getByLabel("Latitude").fill("30.0444");
  await own.getByLabel("Longitude").fill("31.2357");
  await own.getByLabel("Area (metres around it)").fill("150");
  // Every day, so today is a school day whatever day the test runs.
  for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) await own.getByRole("checkbox", { name: day, exact: true }).check();
  await own.getByRole("button", { name: "Save check-in settings" }).click();
  await expect(own.getByText("Saved. The app shows it the next time it opens.")).toBeVisible();
  await own.reload();
  await expect(own.getByLabel("Latitude")).toHaveValue("30.0444");

  // The gate's screen: six digits, new every 30 seconds.
  await own.goto("/dashboard/school/checkin/gate");
  await expect(own.getByRole("heading", { level: 1, name: "Gate screen" })).toBeVisible();
  await expect(own.locator("[data-gate-code]")).toHaveText(/^\d{3} \d{3}$/);
  await expect(own.getByRole("img", { name: "The gate's check-in code" })).toBeVisible();
  await expect(own.getByRole("button", { name: "Full screen" })).toBeVisible();

  // The board: Omar isn't in yet; the office corrects his day with a reason.
  await own.goto("/dashboard/school/checkin");
  await expect(own.getByText("Checking in from the app is off.")).toHaveCount(0);
  const omar = own.locator("li[data-person]", { hasText: "Omar Hassan" });
  await expect(omar).toContainText("Grade 5 A");
  await omar.getByText("Correct this day").click();
  await omar.getByRole("radio", { name: "Present" }).check();
  await omar.getByLabel("Came in").fill("07:45");
  await omar.getByLabel("Reason").fill("The phone was off");
  await omar.getByRole("button", { name: "Save the correction" }).click();
  await expect(own.getByText("Corrected. The reason is kept on the day's record.")).toBeVisible();
  await own.reload();
  const corrected = own.locator("li[data-person]", { hasText: "Omar Hassan" });
  await expect(corrected).toContainText("In 07:45 · office");
  await expect(corrected).toContainText("In");
  await corrected.getByText("Correct this day").click();
  await expect(corrected.getByText(/: In — → 07:45 \(The phone was off\)$/)).toBeVisible();
  await expect(own.locator("li[data-person]", { hasText: "Samir Fawzy" })).toContainText("Nurse · Clinic");

  // The month's report and its CSV file.
  await own.goto("/dashboard/school/checkin/report");
  const row = own.locator("tr", { hasText: "Omar Hassan" });
  await expect(row.locator("td").nth(2)).toHaveText("1");
  const csv = await own.request.get("/api/dashboard/school/checkins");
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const text = await csv.text();
  expect(text).toContain("Name,Role,Class or job,School days,Present,Late,Left early,Absent,Excused,On leave");
  expect(text).toMatch(/Omar Hassan,Student,Grade 5 A,1,1,0,0,0,0,0/);

  // Schools aren't on this plan: the app's check-in waits for it.
  const today = await request.get(`${api}/school/checkin`);
  expect(today.status()).toBe(403);
  expect((await today.json()).code).toBe("feature_disabled");
});

test("113.5 The syllabus written and imported; the class behind the plan, then a lesson covered", async () => {
  await own.goto("/dashboard/school/syllabus");
  await expect(own).toHaveURL(/\/studio\/project\/school\/syllabus$/);
  await expect(own.getByRole("heading", { level: 1, name: "Syllabus" })).toBeVisible();
  const syllabus = own.getByRole("region", { name: "Mathematics · Grade 5" });
  await expect(syllabus.getByText("No units yet.", { exact: false })).toBeVisible();
  await syllabus.getByLabel("Unit", { exact: true }).fill("Fractions");
  await syllabus.locator("details", { hasText: "Add a unit" }).getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Saved.", { exact: true })).toBeVisible();
  await own.reload();
  await expect(syllabus.getByText("Unit 1: Fractions")).toBeVisible();
  const addTopic = syllabus.locator("details", { hasText: "Add a lesson or topic" });
  await addTopic.getByLabel("Lesson or topic").fill("Halves");
  await addTopic.getByLabel("Planned from").fill("2025-09-07");
  await addTopic.getByLabel("To", { exact: true }).fill("2025-09-11");
  await addTopic.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Saved.", { exact: true })).toBeVisible();
  // A second lesson from a sheet.
  const sheet = own.getByRole("region", { name: "Import from a sheet" });
  await sheet.getByLabel("CSV file").setInputFiles({
    name: "syllabus.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("grade,subject,unit,topic,from,to\nGrade 5,Mathematics,Fractions,Quarters,2025-09-14,2025-09-18\nGrade 9,Mathematics,Algebra,Equations,2025-09-14,2025-09-18\n"),
  });
  await sheet.getByRole("button", { name: "Import" }).click();
  await expect(own.getByText("Imported: 1 added, 0 updated.")).toBeVisible();
  await expect(own.getByText("Line 3: none of your classes is in the grade Grade 9.")).toBeVisible();
  await own.reload();
  await expect(syllabus.locator("[data-topic]")).toHaveCount(2);

  await own.goto("/dashboard/school/progress");
  await expect(own.getByRole("heading", { level: 1, name: "Progress" })).toBeVisible();
  const row = own.locator('[data-row="Grade 5 A · Mathematics"]');
  await expect(row).toContainText("0 of 2 (0%)");
  await expect(row).toContainText("Behind the plan by 2 lessons");
  await row.getByRole("link", { name: "Grade 5 A" }).click();
  await expect(own.getByText("0 of 2 covered (0%); the plan says 100% by today.")).toBeVisible();
  const halves = own.locator('[data-topic="Halves"]');
  await halves.locator("summary", { hasText: "Mark covered" }).click();
  await halves.getByLabel("Note (optional)").fill("With paper folding.");
  await halves.locator('button[type="submit"]', { hasText: "Mark covered" }).click();
  // Its form goes once the lesson is covered (its "Saved." with it): the lesson says Covered.
  await expect(halves.getByText("Covered", { exact: true })).toBeVisible();
  await expect(halves).toContainText("covered on");
  await own.reload();
  await expect(own.getByText("Behind the plan by 1 lesson", { exact: true })).toBeVisible();
  await expect(halves).toContainText("With paper folding.");
});

test("113.5 Report templates and the teachers' reports", async () => {
  await own.goto("/dashboard/school/report-templates");
  await expect(own).toHaveURL(/\/studio\/project\/school\/report-templates$/);
  const students = own.getByRole("region", { name: "Reports on a student" });
  await students.getByRole("button", { name: "Add a ready-made student report" }).click();
  const template = students.locator('[data-template="Student report"]');
  await expect(template.locator("[data-field]")).toHaveCount(5);
  await expect(template.locator('[data-field="Behaviour"]')).toContainText("A rating from 1 to 5");
  await template.locator("summary", { hasText: "Add a field" }).click();
  await template.getByLabel("Label").fill("Homework");
  await template.getByLabel("Type").selectOption({ label: "A choice" });
  await template.getByLabel("Choices (for a choice)").fill("Always\nSometimes\nRarely");
  await template.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Added. Reports started from now on have it.")).toBeVisible();
  await own.reload();
  await expect(template.locator('[data-field="Homework"]')).toContainText("Always / Sometimes / Rarely");

  await own.goto("/dashboard/school/teacher-reports");
  await expect(own.getByRole("heading", { level: 1, name: "Teachers' reports" })).toBeVisible();
  await expect(own.getByText("Nothing to review. New reports show here when teachers send them.")).toBeVisible();
});

/** A day from today (UTC), as the date fields take it. */
const dayFromToday = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

test("113.8 Calendar: an event and a break, in the month and the list", async () => {
  await own.goto("/dashboard/school/calendar");
  await expect(own).toHaveURL(/\/studio\/project\/school\/calendar$/);
  await expect(own.getByRole("heading", { level: 1, name: "Calendar" })).toBeVisible();
  await expect(own.getByText("Nothing on the calendar this month.")).toBeVisible();
  await own.getByLabel("Title").fill("Science fair");
  await own.getByLabel("From", { exact: true }).fill(dayFromToday(2));
  await own.getByLabel("Starts", { exact: true }).fill("09:00");
  await own.getByLabel("Ends (optional)").fill("12:00");
  await own.getByLabel("Place (optional)").fill("The school hall");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Saved. It is on the calendar in the app.")).toBeVisible();

  await own.goto("/dashboard/school/calendar?view=list");
  await own.getByText("Add to the calendar").click();
  await own.getByLabel("What it is").selectOption({ label: "Holiday or break (no school)" });
  await own.getByLabel("Title").fill("Mid-term break");
  await own.getByLabel("From", { exact: true }).fill(dayFromToday(10));
  await own.getByLabel("To (optional)").fill(dayFromToday(14));
  await own.getByLabel("For", { exact: true }).selectOption({ label: "All of Grade 5" });
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Saved. It is on the calendar in the app.")).toBeVisible();
  await own.reload();
  const list = own.locator("[data-events]");
  await expect(list.locator("[data-event]")).toHaveCount(2);
  await expect(list).toContainText("Science fair");
  await expect(list).toContainText("09:00 to 12:00 · The school hall · The whole school");
  await expect(list).toContainText(`Mid-term break`);
  await expect(list).toContainText(`${dayFromToday(10)} to ${dayFromToday(14)} · All day · All of Grade 5`);
});

test("113.8 Exams: a draft, then published to the class", async () => {
  await own.goto("/dashboard/school/exams");
  await expect(own.getByRole("heading", { level: 1, name: "Exams" })).toBeVisible();
  await own.getByLabel("Class or grade").selectOption({ label: "Class Grade 5 A" });
  await own.getByLabel("Subject", { exact: true }).selectOption({ label: "Mathematics" });
  await own.getByLabel("Date", { exact: true }).fill(dayFromToday(7));
  await own.getByLabel("Minutes").fill("90");
  await own.getByLabel("Room (optional)").fill("B2");
  await own.getByLabel("What it covers and what to bring (optional)").fill("Units 1 to 3.");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Added as a draft. Publish the timetable when it is ready.")).toBeVisible();
  await own.reload();
  const exam = own.locator("[data-exams=upcoming] [data-exam]");
  await expect(exam).toContainText("Draft");
  await expect(exam).toContainText("Class Grade 5 A · 09:00 to 10:30 · 90 minutes · Room B2");
  await own.getByRole("region", { name: "Publish the draft" }).getByRole("button", { name: "Publish the draft" }).click();
  // The draft's Publish region goes once nothing is left to publish, and its message with it.
  await expect(own.getByRole("region", { name: "Publish the draft" })).toHaveCount(0);
  await own.reload();
  await expect(exam).toContainText("Published");
  await expect(own.getByRole("region", { name: "Publish the draft" })).toHaveCount(0);
});

test("113.8 Behaviour: the suggested categories, a merit from the school, the report and whom parents are told of", async () => {
  await own.goto("/dashboard/school/behaviour");
  await expect(own.getByRole("heading", { level: 1, name: "Behaviour" })).toBeVisible();
  const categories = own.locator("[data-categories]");
  await expect(categories).toContainText("Helping others");
  await expect(categories).toContainText("Positive · +2 points");
  await expect(categories).toContainText("Disrupting the class");
  await own.getByLabel("Student", { exact: true }).selectOption({ label: "Omar Hassan · Grade 5 A" });
  await own.getByLabel("Category", { exact: true }).selectOption({ label: "Helping others (+2)" });
  await own.getByLabel("Note (optional)").fill("Helped a classmate.");
  await own.getByRole("region", { name: "Write a merit or a note" }).getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Saved. The student's parents see it in the app.")).toBeVisible();
  await own.reload();
  const students = own.locator("[data-report=students]");
  await expect(students.locator("tr", { hasText: "Omar Hassan" })).toContainText("+2");
  await expect(own.locator("[data-notes]")).toContainText("Omar Hassan · Helping others (+2)");
  await expect(own.locator("[data-notes]")).toContainText("From the school");

  await own.getByRole("combobox", { name: "Parents are told" }).selectOption({ label: "Of negative notes only" });
  await own.getByRole("region", { name: "Parents are told" }).getByRole("button", { name: "Save" }).click();
  await expect(own.getByRole("region", { name: "Parents are told" }).getByText("Saved.", { exact: true })).toBeVisible();
  await own.reload();
  await expect(own.getByRole("combobox", { name: "Parents are told" })).toHaveValue("negative");
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

test("113.4 Permission slips for a class, absence excuses, and pick-up on the student's page and the day's board", async ({ request }) => {
  await own.goto("/dashboard/school/slips");
  await expect(own).toHaveURL(/\/studio\/project\/school\/slips$/);
  await expect(own.getByText("No slips yet.", { exact: false })).toBeVisible();
  const due = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
  await own.getByLabel("Title", { exact: true }).fill("Science museum trip");
  await own.getByLabel("Answers due by").fill(due);
  await own.getByLabel("For", { exact: true }).selectOption({ label: "Class Grade 5 A" });
  await own.getByLabel("Fee note (optional)").fill("E£150, paid at the office");
  await own.getByRole("button", { name: "Send", exact: true }).click();
  await expect(own.getByText("Sent. The parents were told in the app.")).toBeVisible();
  await own.reload();
  await expect(own.locator("[data-slips]")).toContainText("Yes 0 · No 0 · Not yet 1");
  await own.locator("[data-slips]").getByRole("link", { name: "Science museum trip" }).click();
  await expect(own).toHaveURL(/\/school\/slips\/\d+$/);
  await expect(own.getByRole("heading", { level: 1, name: "Science museum trip" })).toBeVisible();
  await expect(own.locator("[data-slip-answers]")).toContainText("Omar Hassan");
  await expect(own.locator("[data-slip-answers]")).toContainText("Not answered");

  await own.goto("/dashboard/school/excuses");
  await expect(own.getByRole("heading", { level: 1, name: "Absence excuses" })).toBeVisible();
  await expect(own.getByText("No excuses yet. They come from the parents in the app.")).toBeVisible();

  // The student's page: the office adds someone to the pick-up list and today's pick-up.
  await own.goto("/dashboard/school/people");
  await own.getByRole("link", { name: "Student's page" }).first().click();
  await expect(own).toHaveURL(/\/school\/people\/\d+$/);
  await expect(own.getByRole("heading", { level: 1, name: "Omar Hassan" })).toBeVisible();
  await expect(own.getByRole("region", { name: "Parents", exact: true })).toContainText("Hassan Ali");
  const list = own.getByRole("region", { name: "Pick-up", exact: true });
  await list.getByText("Add to the list").click();
  await list.getByLabel("Name", { exact: true }).fill("Mona Ali");
  await list.getByLabel("Relation (optional)").fill("Grandmother");
  await list.getByRole("button", { name: "Add", exact: true }).click();
  await expect(list.getByText("Added to the pick-up list.")).toBeVisible();
  await own.reload();
  await expect(own.locator("[data-pickup]")).toContainText("Mona Ali");
  await expect(own.locator("[data-pickup]")).toContainText("Grandmother");
  const notes = own.getByRole("region", { name: "One-day pick-up", exact: true });
  await notes.getByText("Add a note for a day").click();
  await notes.getByLabel("Name", { exact: true }).fill("Karim Ali");
  await notes.getByLabel("Relation (optional)").fill("Uncle");
  await notes.getByRole("button", { name: "Save", exact: true }).click();
  await expect(notes.getByText("Saved. It shows on the day's board.")).toBeVisible();

  await own.goto("/dashboard/school/checkin");
  await expect(own.locator("[data-pickup-board]")).toContainText("Omar Hassan");
  await expect(own.locator("[data-pickup-board]")).toContainText("Picks up: Karim Ali · Uncle");

  // Schools aren't on the plan: the app's Parent routes wait for it.
  const parent = await request.get(`${api}/parent/me`);
  expect(parent.status()).toBe(403);
  expect((await parent.json()).code).toBe("feature_disabled");
});

test("113.12 Salaries: a salary and an advance, the month's payslips with a bonus, locked, paid by hand, its PDF and CSV", async ({ request }) => {
  await own.goto("/dashboard/school/salaries");
  await expect(own).toHaveURL(/\/studio\/project\/school\/salaries$/);
  await expect(own.getByRole("heading", { level: 1, name: "Salaries" })).toBeVisible();
  await expect(own.getByText("Nothing is paid through Yallapp or any payment gateway.", { exact: false })).toBeVisible();
  const people = own.getByRole("region", { name: "Teachers and staff" });
  await expect(people.locator("li", { hasText: "Samir Fawzy" })).toContainText("No salary yet");

  // Samir's salary with an allowance, and an advance taken back from it.
  await people.getByRole("link", { name: "Samir Fawzy" }).click();
  await expect(own).toHaveURL(/\/school\/salaries\/people\/\d+$/);
  await own.getByLabel("Monthly salary").fill("6000");
  await own.getByLabel("Currency").selectOption("EGP");
  await own.getByLabel("Allowance 1").fill("Transport");
  await own.getByLabel("Amount 1").fill("500");
  await own.getByRole("button", { name: "Save", exact: true }).click();
  await expect(own.getByText("Saved. Drafts take it the next time the month's payslips are made.")).toBeVisible();
  const advances = own.getByRole("region", { name: "Advances" });
  await advances.getByLabel("Amount", { exact: true }).fill("1000");
  await advances.getByLabel("Taken back each month").fill("500");
  await advances.getByRole("button", { name: "Record the advance" }).click();
  await expect(advances.getByText(/^Recorded\. E£500\.00 is taken back each month from \d{4}-\d{2}\.$/)).toBeVisible();
  await own.reload();
  await expect(own.locator("[data-advances]")).toContainText("E£1,000.00 · Cash");
  await expect(own.locator("[data-advances]")).toContainText("left E£1,000.00");

  // The month's payslips: Samir's made from his salary and the advance.
  await own.goto("/dashboard/school/salaries");
  await own.getByRole("button", { name: "Make the month's payslips" }).click();
  await expect(own.getByText(/^Made 1, brought 0 up to date\./)).toBeVisible();
  await own.reload();
  const row = own.locator("tr[data-payslip]", { hasText: "Samir Fawzy" });
  await expect(row).toContainText("E£6,000.00");
  await expect(row).toContainText("Draft");
  await row.getByRole("link", { name: "Samir Fawzy" }).click();
  await expect(own).toHaveURL(/\/school\/salaries\/\d+$/);
  const payslipUrl = own.url();
  const sheet = own.locator("[data-sheet]");
  await expect(sheet).toContainText("Base salary");
  await expect(sheet).toContainText("+E£500.00");
  await expect(sheet.locator('[data-line="advance"]')).toContainText("−E£500.00");
  await own.getByText("Add a bonus or a deduction").click();
  await own.locator("#f-line-label").fill("Exam supervision");
  await own.locator("#f-line-amount").fill("400");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Added.")).toBeVisible();
  await own.reload();
  await expect(own.locator("[data-net]")).toContainText("E£6,400.00");

  // Locked: final, then paid in cash and written down here.
  await own.goto("/dashboard/school/salaries");
  await own.getByRole("button", { name: "Lock the month" }).click();
  // What locking answered stays shown, above the button that opens the month again.
  await expect(own.getByText(/^Locked\. \d+ payslips are final; each person sees theirs in the app\.$/)).toBeVisible();
  await expect(own.getByRole("button", { name: "Open the month again" })).toBeVisible();
  await expect(own.getByText(/^Locked by Nile School on \d{4}-\d{2}-\d{2}: the payslips are final and each person sees theirs in the app\./)).toBeVisible();
  await own.goto(payslipUrl);
  await expect(own.locator("#f-pay-amount-payslip")).toHaveValue("6400.00");
  await own.getByRole("button", { name: "Record as paid" }).click();
  // Paid in full: the payment form gives way to the payments, and says so.
  await expect(own.getByRole("button", { name: "Record as paid" })).toHaveCount(0);
  await expect(own.getByRole("status").filter({ hasText: "Paid in full. They see the payslip as paid in the app." })).toBeVisible();
  await own.reload();
  await expect(own.locator("[data-payments]")).toContainText("E£6,400.00 · Cash");
  await expect(own.locator("[data-payments]")).toContainText("Recorded by");

  const id = payslipUrl.match(/\/salaries\/(\d+)$/)![1];
  const pdf = await own.request.get(`/api/dashboard/school/salaries/${id}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");
  const csv = await own.request.get("/api/dashboard/school/salaries");
  expect(csv.status()).toBe(200);
  const text = await csv.text();
  expect(text).toContain("Payslip,Name,Role,Job,Department,Currency,Base,Allowances,Bonuses,Deductions,Advances taken back,Net,Paid,Left to pay,Status,Paid by,Paid on");
  expect(text).toMatch(/Samir Fawzy,Staff member,Nurse,Clinic,EGP,6000\.00,500\.00,400\.00,0\.00,500\.00,6400\.00,6400\.00,0\.00,Paid,Cash,\d{4}-\d{2}-\d{2}/);

  // Schools aren't on this plan: the app's payslips wait for it.
  const payslips = await request.get(`${api}/staff/payslips`);
  expect(payslips.status()).toBe(403);
  expect((await payslips.json()).code).toBe("feature_disabled");
});
