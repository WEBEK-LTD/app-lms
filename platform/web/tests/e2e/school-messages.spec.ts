import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 113.6 Messages between a school's teachers and its families, as the school
 * allows them: a teacher with a department, the school's rules in School
 * settings › Messages, and the administration's side in Chat (writing to a
 * department's teachers, the teachers' conversations with families kept
 * private until a message is reported).
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Delta School", email: `school-msg-${suffix}@school.test`, password: "delta-school-strong-password-1" };
let own: Page;
let admin: Page;
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.213" };

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0213");
  await own.getByLabel("Your website (optional)").fill(`https://school-msg-${suffix}.school.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.schoolMessagesAdminEmail);
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

test("a School project on a Studio plan (its chat included)", async () => {
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: "A school for students, parents and teachers" }).check();
  await own.getByLabel("Project name").fill(client.name);
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);

  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  const plan = admin.getByRole("region", { name: client.name }).getByRole("region", { name: "Plan and license" });
  await plan.getByLabel("Plan").selectOption("studio_1");
  await plan.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
});

test("People: a teacher in a department", async () => {
  await own.goto("/dashboard/school/people?role=teacher");
  await own.getByLabel("Name", { exact: true }).fill("Mona Adel");
  await own.getByLabel("Mobile number").fill("+20 111 000 0213");
  await own.getByLabel("Department (optional)").fill("Sciences");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Added. They sign in to the app with this number.")).toBeVisible();
  await own.reload();
  await expect(own.getByText(/Sciences/).first()).toBeVisible();
});

test("School settings › Messages: whom teachers write to, who starts, the hours, a class at once", async () => {
  await own.goto("/dashboard/school/settings");
  const messages = own.getByRole("region", { name: "Messages" });
  await expect(messages.getByLabel("Teachers may write to", { exact: true })).toHaveValue("none");
  await messages.getByLabel("Teachers may write to", { exact: true }).selectOption({ label: "Parents" });
  await messages.getByLabel("Who may write first").selectOption({ label: "The teacher or the family" });
  await messages.getByLabel("Only at these hours, on these days").check();
  await messages.getByLabel("From", { exact: true }).fill("08:00");
  await messages.getByLabel("To", { exact: true }).fill("07:00");
  await messages.getByRole("button", { name: "Save messages" }).click();
  await expect(messages.getByText("The hours end after they start.")).toBeVisible();
  await messages.getByLabel("To", { exact: true }).fill("17:00");
  await messages.getByLabel("Sunday").check();
  await messages.getByLabel("Teachers may write to a whole class at once").check();
  await messages.getByRole("button", { name: "Save messages" }).click();
  await expect(messages.getByText("Saved. The app shows it the next time it opens.")).toBeVisible();
  await own.reload();
  await expect(own.getByRole("region", { name: "Messages" }).getByLabel("Teachers may write to", { exact: true })).toHaveValue("parents");
  await expect(own.getByRole("region", { name: "Messages" }).getByLabel("To", { exact: true })).toHaveValue("17:00");
  await expect(own.getByRole("region", { name: "Messages" }).getByLabel("Sunday")).toBeChecked();
  await expect(own.getByRole("region", { name: "Messages" }).getByLabel("The administration may read these conversations")).not.toBeChecked();
});

test("Chat: the administration writes to a department; the teachers' conversations with families stay private", async () => {
  await own.goto("/dashboard/chat?view=teachers");
  const views = own.getByRole("navigation", { name: "Show" });
  await expect(views.getByRole("link", { name: "Teachers", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(views.getByRole("link", { name: "Teachers and families" })).toBeVisible();
  const write = own.getByRole("region", { name: "Write to your teachers and staff" });
  await write.getByLabel("To", { exact: true }).selectOption({ label: "Department: Sciences" });
  await write.getByLabel("Message").fill("Staff meeting at 2 today.");
  await write.getByRole("button", { name: "Send" }).click();
  // Mona hasn't signed in to the app yet.
  await expect(write.getByText("None of them has signed in to the app yet: Mona Adel.")).toBeVisible();

  await views.getByRole("link", { name: "Teachers and families" }).click();
  await expect(own.getByText("These conversations are private: you see one here only when a message in it is reported.", { exact: false })).toBeVisible();
  await expect(own.getByText("No conversations to show.")).toBeVisible();
});
